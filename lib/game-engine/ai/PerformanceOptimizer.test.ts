/**
 * Tests for PerformanceOptimizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PerformanceOptimizer,
  EvaluationCache,
  ActionPruner,
  TimeLimitedEvaluator,
  OptimizedStateSimulator,
  generateStateHash,
  generateActionHash,
  DEFAULT_OPTIMIZATION_CONFIG,
} from './PerformanceOptimizer';
import {
  GameState,
  PlayerId,
  GameAction,
  ActionType,
  Phase,
  CardState,
  CardCategory,
} from '../core/types';
import { createMockGameState, createMockCard, createMockAction } from './test-utils';

describe('PerformanceOptimizer', () => {
  describe('generateStateHash', () => {
    it('should generate consistent hash for same state', () => {
      const state = createMockGameState();
      const hash1 = generateStateHash(state, PlayerId.PLAYER_1);
      const hash2 = generateStateHash(state, PlayerId.PLAYER_1);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
    });

    it('should generate different hash for different states', () => {
      const state1 = createMockGameState();
      const state2 = createMockGameState();
      
      // Modify state2
      const player2 = state2.players.get(PlayerId.PLAYER_1);
      if (player2) {
        player2.zones.life = player2.zones.life.slice(0, 3); // Different life total
      }
      
      const hash1 = generateStateHash(state1, PlayerId.PLAYER_1);
      const hash2 = generateStateHash(state2, PlayerId.PLAYER_1);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateActionHash', () => {
    it('should generate consistent hash for same action', () => {
      const action = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: 'card-1',
      });
      
      const hash1 = generateActionHash(action);
      const hash2 = generateActionHash(action);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
    });

    it('should generate different hash for different actions', () => {
      const action1 = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: 'card-1',
      });
      const action2 = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: 'card-2',
      });
      
      const hash1 = generateActionHash(action1);
      const hash2 = generateActionHash(action2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('EvaluationCache', () => {
    let cache: EvaluationCache;
    let state: GameState;
    let action: GameAction;

    beforeEach(() => {
      cache = new EvaluationCache();
      state = createMockGameState();
      action = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: 'card-1',
      });
    });

    it('should return null for cache miss', () => {
      const result = cache.get(state, action, PlayerId.PLAYER_1);
      expect(result).toBeNull();
    });

    it('should return cached value for cache hit', () => {
      cache.set(state, action, PlayerId.PLAYER_1, 42);
      const result = cache.get(state, action, PlayerId.PLAYER_1);
      
      expect(result).toBe(42);
    });

    it('should track cache hits and misses', () => {
      cache.get(state, action, PlayerId.PLAYER_1); // Miss
      cache.set(state, action, PlayerId.PLAYER_1, 42);
      cache.get(state, action, PlayerId.PLAYER_1); // Hit
      cache.get(state, action, PlayerId.PLAYER_1); // Hit
      
      const metrics = cache.getMetrics();
      expect(metrics.cacheHits).toBe(2);
      expect(metrics.cacheMisses).toBe(1);
    });

    it('should clear cache', () => {
      cache.set(state, action, PlayerId.PLAYER_1, 42);
      cache.clear();
      
      const result = cache.get(state, action, PlayerId.PLAYER_1);
      expect(result).toBeNull();
    });

    it('should reset metrics', () => {
      cache.get(state, action, PlayerId.PLAYER_1);
      cache.resetMetrics();
      
      const metrics = cache.getMetrics();
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });

    it('should respect cache disabled config', () => {
      const disabledCache = new EvaluationCache({
        ...DEFAULT_OPTIMIZATION_CONFIG,
        enableCaching: false,
      });
      
      disabledCache.set(state, action, PlayerId.PLAYER_1, 42);
      const result = disabledCache.get(state, action, PlayerId.PLAYER_1);
      
      expect(result).toBeNull();
    });
  });

  describe('ActionPruner', () => {
    let pruner: ActionPruner;
    let state: GameState;

    beforeEach(() => {
      pruner = new ActionPruner();
      state = createMockGameState();
    });

    it('should not prune when few actions available', () => {
      const actions = [
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-1' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-2' }),
      ];
      
      const pruned = pruner.pruneActions(actions, state, PlayerId.PLAYER_1);
      expect(pruned.length).toBe(2);
    });

    it('should prune unaffordable cards', () => {
      const player = state.players.get(PlayerId.PLAYER_1);
      if (!player) throw new Error('Player not found');

      // Add affordable cards to hand
      const affordableCard1 = createMockCard('affordable-1', {
        baseCost: 2,
        basePower: 2000,
      });
      const affordableCard2 = createMockCard('affordable-2', {
        baseCost: 3,
        basePower: 3000,
      });
      const affordableCard3 = createMockCard('affordable-3', {
        baseCost: 2,
        basePower: 2000,
      });
      const affordableCard4 = createMockCard('affordable-4', {
        baseCost: 3,
        basePower: 3000,
      });
      
      // Add expensive card to hand
      const expensiveCard = createMockCard('expensive-1', {
        baseCost: 10,
        basePower: 10000,
      });
      
      player.zones.hand.push(affordableCard1, affordableCard2, affordableCard3, affordableCard4, expensiveCard);

      // Player only has 3 DON
      player.zones.costArea = [
        createMockCard('don-1', { category: CardCategory.DON }) as any,
        createMockCard('don-2', { category: CardCategory.DON }) as any,
        createMockCard('don-3', { category: CardCategory.DON }) as any,
      ];

      // Create actions for all cards
      const actions = [
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'expensive-1' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'affordable-1' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'affordable-2' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'affordable-3' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'affordable-4' }),
      ];
      
      const pruned = pruner.pruneActions(actions, state, PlayerId.PLAYER_1);
      
      // Should prune the expensive card since we have 4 affordable options
      expect(pruned.length).toBeLessThan(actions.length);
      expect(pruned.some(a => a.data.cardId === 'expensive-1')).toBe(false);
      
      // Should keep the affordable cards
      expect(pruned.some(a => a.data.cardId === 'affordable-1')).toBe(true);
    });

    it('should keep Rush cards', () => {
      const player = state.players.get(PlayerId.PLAYER_1);
      if (!player) throw new Error('Player not found');

      const rushCard = createMockCard('rush-1', {
        baseCost: 3,
        basePower: 3000,
        keywords: ['Rush'],
      });
      player.zones.hand.push(rushCard);

      const actions = [
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'rush-1' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-1' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-2' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-3' }),
      ];
      
      const pruned = pruner.pruneActions(actions, state, PlayerId.PLAYER_1);
      
      // Should keep the Rush card
      expect(pruned.some(a => a.data.cardId === 'rush-1')).toBe(true);
    });

    it('should respect pruning disabled config', () => {
      const disabledPruner = new ActionPruner({
        ...DEFAULT_OPTIMIZATION_CONFIG,
        enablePruning: false,
      });
      
      const actions = [
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-1' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-2' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-3' }),
        createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, { cardId: 'card-4' }),
      ];
      
      const pruned = disabledPruner.pruneActions(actions, state, PlayerId.PLAYER_1);
      expect(pruned.length).toBe(actions.length);
    });
  });

  describe('TimeLimitedEvaluator', () => {
    let timeLimiter: TimeLimitedEvaluator;

    beforeEach(() => {
      timeLimiter = new TimeLimitedEvaluator({
        ...DEFAULT_OPTIMIZATION_CONFIG,
        timeLimitMs: 100, // Short time limit for testing
      });
    });

    it('should track elapsed time', () => {
      timeLimiter.startTiming();
      const elapsed = timeLimiter.getElapsedTime();
      
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate all options when time permits', () => {
      const options = [1, 2, 3, 4, 5];
      const evaluateFn = (n: number) => n * 10;
      
      const results = timeLimiter.evaluateWithTimeLimit(options, evaluateFn);
      
      expect(results.length).toBe(5);
      expect(results[0].score).toBe(10);
      expect(results[4].score).toBe(50);
    });

    it('should respect time limit disabled config', () => {
      const noLimitEvaluator = new TimeLimitedEvaluator({
        ...DEFAULT_OPTIMIZATION_CONFIG,
        enableTimeLimit: false,
      });
      
      noLimitEvaluator.startTiming();
      expect(noLimitEvaluator.isTimeExceeded()).toBe(false);
    });
  });

  describe('OptimizedStateSimulator', () => {
    let simulator: OptimizedStateSimulator;
    let state: GameState;

    beforeEach(() => {
      simulator = new OptimizedStateSimulator();
      state = createMockGameState();
    });

    it('should create lightweight state copy', () => {
      const copy = simulator.createLightweightStateCopy(state);
      
      expect(copy).toBeDefined();
      expect(copy.players.size).toBe(state.players.size);
      expect(copy.phase).toBe(state.phase);
    });

    it('should simulate play card changes', () => {
      const player = state.players.get(PlayerId.PLAYER_1);
      if (!player) throw new Error('Player not found');

      const initialHandSize = player.zones.hand.length;
      const initialBoardSize = player.zones.characterArea.length;

      const action = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: player.zones.hand[0].id,
      });

      const changes = simulator.simulateRelevantChanges(state, action);
      
      expect(changes.players).toBeDefined();
      
      const updatedPlayer = changes.players?.get(PlayerId.PLAYER_1);
      expect(updatedPlayer).toBeDefined();
    });

    it('should simulate give DON changes', () => {
      const player = state.players.get(PlayerId.PLAYER_1);
      if (!player) throw new Error('Player not found');

      const don = player.zones.costArea[0];
      const target = player.zones.characterArea[0];

      const action = createMockAction(ActionType.GIVE_DON, PlayerId.PLAYER_1, {
        donId: don.id,
        targetCardId: target.id,
      });

      const changes = simulator.simulateRelevantChanges(state, action);
      
      expect(changes.players).toBeDefined();
    });

    it('should simulate declare attack changes', () => {
      const player = state.players.get(PlayerId.PLAYER_1);
      if (!player) throw new Error('Player not found');

      const attacker = player.zones.characterArea[0];
      attacker.state = CardState.ACTIVE; // Make sure it's active

      const action = createMockAction(ActionType.DECLARE_ATTACK, PlayerId.PLAYER_1, {
        attackerId: attacker.id,
        targetId: 'leader',
      });

      const changes = simulator.simulateRelevantChanges(state, action);
      
      expect(changes.players).toBeDefined();
    });
  });

  describe('PerformanceOptimizer (Integration)', () => {
    let optimizer: PerformanceOptimizer;

    beforeEach(() => {
      optimizer = new PerformanceOptimizer();
    });

    it('should provide access to all optimization components', () => {
      expect(optimizer.getCache()).toBeInstanceOf(EvaluationCache);
      expect(optimizer.getPruner()).toBeInstanceOf(ActionPruner);
      expect(optimizer.getTimeLimiter()).toBeInstanceOf(TimeLimitedEvaluator);
      expect(optimizer.getSimulator()).toBeInstanceOf(OptimizedStateSimulator);
    });

    it('should track performance metrics', () => {
      const metrics = optimizer.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalEvaluations).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });

    it('should reset metrics', () => {
      const cache = optimizer.getCache();
      const state = createMockGameState();
      const action = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: 'card-1',
      });

      cache.get(state, action, PlayerId.PLAYER_1); // Generate some metrics
      optimizer.resetMetrics();
      
      const metrics = optimizer.getMetrics();
      expect(metrics.cacheMisses).toBe(0);
    });

    it('should clear caches', () => {
      const cache = optimizer.getCache();
      const state = createMockGameState();
      const action = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: 'card-1',
      });

      cache.set(state, action, PlayerId.PLAYER_1, 42);
      optimizer.clearCaches();
      
      const result = cache.get(state, action, PlayerId.PLAYER_1);
      expect(result).toBeNull();
    });

    it('should update configuration', () => {
      optimizer.updateConfig({
        enableCaching: false,
        enablePruning: false,
      });
      
      // Verify new components are created with updated config
      const cache = optimizer.getCache();
      const state = createMockGameState();
      const action = createMockAction(ActionType.PLAY_CARD, PlayerId.PLAYER_1, {
        cardId: 'card-1',
      });

      cache.set(state, action, PlayerId.PLAYER_1, 42);
      const result = cache.get(state, action, PlayerId.PLAYER_1);
      
      expect(result).toBeNull(); // Caching is disabled
    });
  });
});
