/**
 * PerformanceOptimizer - Performance optimization utilities for AI decision-making
 * 
 * This module provides performance optimizations including:
 * - Action pruning to filter obviously bad moves
 * - State evaluation caching
 * - Optimized simulation
 * - Time-limited evaluation with early termination
 */

import {
  GameState,
  PlayerId,
  GameAction,
  CardInstance,
  ActionType,
  CardState,
  Phase,
} from '../core/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Cache entry for state evaluations
 */
interface CacheEntry {
  score: number;
  timestamp: number;
  accessCount: number;
}

/**
 * Performance metrics for profiling
 */
export interface PerformanceMetrics {
  totalEvaluations: number;
  cacheHits: number;
  cacheMisses: number;
  prunedActions: number;
  evaluationTimeMs: number;
  averageEvaluationTimeMs: number;
}

/**
 * Configuration for performance optimization
 */
export interface OptimizationConfig {
  enableCaching: boolean;
  enablePruning: boolean;
  enableTimeLimit: boolean;
  cacheMaxSize: number;
  cacheMaxAge: number; // milliseconds
  timeLimitMs: number;
  pruningThreshold: number; // Score threshold for pruning
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enableCaching: true,
  enablePruning: true,
  enableTimeLimit: true,
  cacheMaxSize: 1000,
  cacheMaxAge: 5000, // 5 seconds
  timeLimitMs: 3000, // 3 seconds
  pruningThreshold: -50, // Prune actions with score below -50
};

// ============================================================================
// State Hash Generator
// ============================================================================

/**
 * Generate a hash key for a game state for caching purposes
 * Uses relevant state information to create a unique identifier
 */
export function generateStateHash(state: GameState, playerId: PlayerId): string {
  const player = state.players.get(playerId);
  const opponent = state.players.get(
    playerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1
  );

  if (!player || !opponent) return '';

  // Create hash from relevant state information
  const parts: string[] = [
    state.phase,
    state.turnNumber.toString(),
    player.zones.life.length.toString(),
    opponent.zones.life.length.toString(),
    player.zones.hand.length.toString(),
    opponent.zones.hand.length.toString(),
    player.zones.characterArea.length.toString(),
    opponent.zones.characterArea.length.toString(),
    player.zones.costArea.filter(d => d.state === CardState.ACTIVE).length.toString(),
  ];

  // Add character powers for more specific hashing
  const playerCharPowers = player.zones.characterArea
    .map(c => (c.definition.basePower || 0) + c.givenDon.length * 1000)
    .sort((a, b) => b - a)
    .slice(0, 3) // Top 3 characters
    .join(',');
  
  const opponentCharPowers = opponent.zones.characterArea
    .map(c => (c.definition.basePower || 0) + c.givenDon.length * 1000)
    .sort((a, b) => b - a)
    .slice(0, 3)
    .join(',');

  parts.push(playerCharPowers, opponentCharPowers);

  return parts.join('|');
}

/**
 * Generate a hash key for an action for caching purposes
 */
export function generateActionHash(action: GameAction): string {
  const parts: string[] = [
    action.type,
    action.playerId,
  ];

  // Add action-specific data
  const actionAny = action as any;
  if (actionAny.cardId) parts.push(actionAny.cardId);
  if (actionAny.attackerId) parts.push(actionAny.attackerId);
  if (actionAny.targetId) parts.push(actionAny.targetId);
  if (actionAny.donId) parts.push(actionAny.donId);
  if (actionAny.targetCardId) parts.push(actionAny.targetCardId);

  return parts.join('|');
}

// ============================================================================
// Evaluation Cache
// ============================================================================

/**
 * Cache for storing evaluation results to avoid redundant computations
 */
export class EvaluationCache {
  private cache: Map<string, CacheEntry>;
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;

  constructor(config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG) {
    this.cache = new Map();
    this.config = config;
    this.metrics = {
      totalEvaluations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      prunedActions: 0,
      evaluationTimeMs: 0,
      averageEvaluationTimeMs: 0,
    };
  }

  /**
   * Get a cached evaluation result
   */
  get(state: GameState, action: GameAction, playerId: PlayerId): number | null {
    if (!this.config.enableCaching) return null;

    const key = this.generateCacheKey(state, action, playerId);
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }

    // Check if entry is expired
    const age = Date.now() - entry.timestamp;
    if (age > this.config.cacheMaxAge) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    // Update access count
    entry.accessCount++;
    this.metrics.cacheHits++;

    return entry.score;
  }

  /**
   * Store an evaluation result in the cache
   */
  set(state: GameState, action: GameAction, playerId: PlayerId, score: number): void {
    if (!this.config.enableCaching) return;

    // Check cache size limit
    if (this.cache.size >= this.config.cacheMaxSize) {
      this.evictOldEntries();
    }

    const key = this.generateCacheKey(state, action, playerId);
    this.cache.set(key, {
      score,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvaluations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      prunedActions: 0,
      evaluationTimeMs: 0,
      averageEvaluationTimeMs: 0,
    };
  }

  /**
   * Update evaluation metrics
   */
  updateEvaluationMetrics(timeMs: number): void {
    this.metrics.totalEvaluations++;
    this.metrics.evaluationTimeMs += timeMs;
    this.metrics.averageEvaluationTimeMs = 
      this.metrics.evaluationTimeMs / this.metrics.totalEvaluations;
  }

  /**
   * Increment pruned actions counter
   */
  incrementPrunedActions(): void {
    this.metrics.prunedActions++;
  }

  /**
   * Generate a cache key from state and action
   */
  private generateCacheKey(state: GameState, action: GameAction, playerId: PlayerId): string {
    const stateHash = generateStateHash(state, playerId);
    const actionHash = generateActionHash(action);
    return `${stateHash}:${actionHash}`;
  }

  /**
   * Evict old or least-used cache entries
   */
  private evictOldEntries(): void {
    // Remove oldest 25% of entries
    const entriesToRemove = Math.floor(this.cache.size * 0.25);
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries
    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}

// ============================================================================
// Action Pruner
// ============================================================================

/**
 * Prunes obviously bad actions to reduce evaluation overhead
 */
export class ActionPruner {
  private config: OptimizationConfig;

  constructor(config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG) {
    this.config = config;
  }

  /**
   * Prune actions that are obviously bad
   * Returns filtered list of actions worth evaluating
   */
  pruneActions(actions: GameAction[], state: GameState, playerId: PlayerId): GameAction[] {
    if (!this.config.enablePruning) return actions;
    if (actions.length <= 3) return actions; // Don't prune if few options

    const player = state.players.get(playerId);
    if (!player) return actions;

    const prunedActions: GameAction[] = [];

    for (const action of actions) {
      if (this.shouldKeepAction(action, state, player)) {
        prunedActions.push(action);
      }
    }

    // Always keep at least 3 actions to ensure we have options
    if (prunedActions.length < 3 && actions.length >= 3) {
      return actions.slice(0, 3);
    }

    return prunedActions.length > 0 ? prunedActions : actions;
  }

  /**
   * Determine if an action should be kept (not pruned)
   */
  private shouldKeepAction(action: GameAction, state: GameState, player: any): boolean {
    switch (action.type) {
      case ActionType.PLAY_CARD:
        return this.shouldKeepPlayCard(action, state, player);
      
      case ActionType.GIVE_DON:
        return this.shouldKeepGiveDon(action, state, player);
      
      case ActionType.DECLARE_ATTACK:
        return this.shouldKeepAttack(action, state, player);
      
      case ActionType.ACTIVATE_EFFECT:
        return this.shouldKeepActivateEffect(action, state, player);
      
      // Always keep other action types
      default:
        return true;
    }
  }

  /**
   * Check if a PLAY_CARD action should be kept
   */
  private shouldKeepPlayCard(action: GameAction, state: GameState, player: any): boolean {
    const cardId = (action as any).cardId;
    const card = player.zones.hand.find((c: CardInstance) => c.id === cardId);
    
    if (!card) return false;

    const cost = card.definition.baseCost || 0;
    const availableDon = player.zones.costArea.filter(
      (d: any) => d.state === CardState.ACTIVE
    ).length;

    // Prune if we can't afford the card
    if (cost > availableDon) return false;

    // Prune if board is full and it's a character
    if (card.definition.category === 'CHARACTER' && player.zones.characterArea.length >= 5) {
      return false;
    }

    // Prune if trying to play a stage when we already have one
    if (card.definition.category === 'STAGE' && player.zones.stageArea) {
      return false;
    }

    // Keep cards with high value keywords
    if (card.definition.keywords.includes('Rush') ||
        card.definition.keywords.includes('Double Attack') ||
        card.definition.keywords.includes('Blocker')) {
      return true;
    }

    // Keep cards with "On Play" effects
    if (card.definition.effects.some((e: any) => e.triggerTiming === 'ON_PLAY')) {
      return true;
    }

    // Keep cards with good power-to-cost ratio
    const power = card.definition.basePower || 0;
    if (cost > 0 && power / cost >= 1000) {
      return true;
    }

    // Keep low-cost cards (always useful)
    if (cost <= 3) return true;

    // Prune expensive cards with low power
    if (cost >= 7 && power < 7000) return false;

    return true;
  }

  /**
   * Check if a GIVE_DON action should be kept
   */
  private shouldKeepGiveDon(action: GameAction, state: GameState, player: any): boolean {
    const targetCardId = (action as any).targetCardId;
    
    const target = player.zones.characterArea.find((c: CardInstance) => c.id === targetCardId) ||
                  (player.zones.leaderArea?.id === targetCardId ? player.zones.leaderArea : null);
    
    if (!target) return false;

    // Prune if target already has 4+ DON (diminishing returns)
    if (target.givenDon.length >= 4) return false;

    // Keep if target can attack immediately
    if (target.state === CardState.ACTIVE && target.definition.category === 'CHARACTER') {
      return true;
    }

    // Keep if target has valuable keywords
    if (target.definition.keywords.includes('Double Attack') ||
        target.definition.keywords.includes('Rush') ||
        target.definition.keywords.includes('Blocker')) {
      return true;
    }

    // Keep if target has high base power
    if ((target.definition.basePower || 0) >= 6000) return true;

    // Prune giving DON to low-power characters with 2+ DON already
    if ((target.definition.basePower || 0) < 4000 && target.givenDon.length >= 2) {
      return false;
    }

    return true;
  }

  /**
   * Check if a DECLARE_ATTACK action should be kept
   */
  private shouldKeepAttack(action: GameAction, state: GameState, player: any): boolean {
    const attackerId = (action as any).attackerId;
    const targetId = (action as any).targetId;
    
    const attacker = player.zones.characterArea.find((c: CardInstance) => c.id === attackerId) ||
                    (player.zones.leaderArea?.id === attackerId ? player.zones.leaderArea : null);
    
    if (!attacker) return false;

    const attackerPower = (attacker.definition.basePower || 0) + attacker.givenDon.length * 1000;

    // Always keep attacks on leader
    if (targetId === 'leader') return true;

    // For character attacks, check if it's a reasonable trade
    const opponentId = player.id === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
    const opponent = state.players.get(opponentId);
    
    if (!opponent) return true;

    const targetCard = opponent.zones.characterArea.find((c: CardInstance) => c.id === targetId);
    if (!targetCard) return true;

    const targetPower = (targetCard.definition.basePower || 0) + targetCard.givenDon.length * 1000;

    // Prune attacks where we lose badly (attacker power < 50% of target power)
    if (attackerPower < targetPower * 0.5) {
      // Unless attacker is low-cost and target is high-value
      const attackerCost = attacker.definition.baseCost || 0;
      const targetCost = targetCard.definition.baseCost || 0;
      
      if (attackerCost <= 3 && targetCost >= 6) {
        return true; // Worth sacrificing cheap card for expensive one
      }
      
      return false;
    }

    return true;
  }

  /**
   * Check if an ACTIVATE_EFFECT action should be kept
   */
  private shouldKeepActivateEffect(action: GameAction, state: GameState, player: any): boolean {
    // Generally keep all effect activations as they're usually beneficial
    // More sophisticated pruning could analyze effect costs vs benefits
    return true;
  }
}

// ============================================================================
// Time-Limited Evaluator
// ============================================================================

/**
 * Wrapper for time-limited evaluation with early termination
 */
export class TimeLimitedEvaluator {
  private config: OptimizationConfig;
  private startTime: number = 0;

  constructor(config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG) {
    this.config = config;
  }

  /**
   * Start timing for evaluation
   */
  startTiming(): void {
    this.startTime = Date.now();
  }

  /**
   * Check if time limit has been exceeded
   */
  isTimeExceeded(): boolean {
    if (!this.config.enableTimeLimit) return false;
    return Date.now() - this.startTime > this.config.timeLimitMs;
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get remaining time in milliseconds
   */
  getRemainingTime(): number {
    const elapsed = this.getElapsedTime();
    return Math.max(0, this.config.timeLimitMs - elapsed);
  }

  /**
   * Evaluate actions with time limit
   * Returns early if time limit is exceeded
   */
  evaluateWithTimeLimit<T>(
    options: T[],
    evaluateFn: (option: T) => number
  ): Array<{ option: T; score: number }> {
    this.startTiming();
    const results: Array<{ option: T; score: number }> = [];

    for (const option of options) {
      // Check time limit before each evaluation
      if (this.isTimeExceeded()) {
        break;
      }

      const score = evaluateFn(option);
      results.push({ option, score });
    }

    // If we didn't evaluate all options, ensure we have at least some results
    if (results.length === 0 && options.length > 0) {
      // Fallback: return first option with neutral score
      results.push({ option: options[0], score: 0 });
    }

    return results;
  }
}

// ============================================================================
// Optimized State Simulator
// ============================================================================

/**
 * Optimized game state simulator that only computes relevant changes
 */
export class OptimizedStateSimulator {
  /**
   * Create a lightweight state copy with only relevant information
   * This is much faster than deep copying the entire state
   */
  createLightweightStateCopy(state: GameState): GameState {
    // Only copy the essential information needed for evaluation
    const lightweightState: GameState = {
      ...state,
      players: new Map(),
      // Don't copy history, pending triggers, or other heavy objects
      pendingTriggers: [],
      history: [],
      loopGuardState: { ...state.loopGuardState },
    };

    // Copy only essential player information
    state.players.forEach((playerState, playerId) => {
      lightweightState.players.set(playerId, {
        ...playerState,
        zones: {
          ...playerState.zones,
          // Only copy arrays that might change
          characterArea: [...playerState.zones.characterArea],
          costArea: [...playerState.zones.costArea],
          hand: [...playerState.zones.hand],
          life: [...playerState.zones.life],
          // Reference other arrays (won't change in simulation)
          deck: playerState.zones.deck,
          trash: playerState.zones.trash,
          donDeck: playerState.zones.donDeck,
        },
        flags: new Map(playerState.flags),
      });
    });

    return lightweightState;
  }

  /**
   * Simulate only the relevant state changes for an action
   * Much faster than full game logic simulation
   */
  simulateRelevantChanges(state: GameState, action: GameAction): Partial<GameState> {
    // Return only the changed parts of the state
    const changes: Partial<GameState> = {};

    switch (action.type) {
      case ActionType.PLAY_CARD:
        changes.players = this.simulatePlayCardChanges(state, action);
        break;
      
      case ActionType.GIVE_DON:
        changes.players = this.simulateGiveDonChanges(state, action);
        break;
      
      case ActionType.DECLARE_ATTACK:
        changes.players = this.simulateDeclareAttackChanges(state, action);
        break;
      
      default:
        // For other actions, return minimal changes
        changes.players = state.players;
        break;
    }

    return changes;
  }

  /**
   * Simulate PLAY_CARD changes
   */
  private simulatePlayCardChanges(state: GameState, action: GameAction): Map<PlayerId, any> {
    const players = new Map(state.players);
    const player = players.get(action.playerId);
    
    if (!player) return players;

    const cardId = (action as any).cardId;
    const cardIndex = player.zones.hand.findIndex((c: CardInstance) => c.id === cardId);
    
    if (cardIndex === -1) return players;

    const card = player.zones.hand[cardIndex];
    
    // Create updated player state
    const updatedPlayer = {
      ...player,
      zones: {
        ...player.zones,
        hand: player.zones.hand.filter((_: any, i: number) => i !== cardIndex),
        characterArea: card.definition.category === 'CHARACTER'
          ? [...player.zones.characterArea, card]
          : player.zones.characterArea,
      },
    };

    players.set(action.playerId, updatedPlayer);
    return players;
  }

  /**
   * Simulate GIVE_DON changes
   */
  private simulateGiveDonChanges(state: GameState, action: GameAction): Map<PlayerId, any> {
    const players = new Map(state.players);
    const player = players.get(action.playerId);
    
    if (!player) return players;

    const donId = (action as any).donId;
    const targetCardId = (action as any).targetCardId;
    const don = player.zones.costArea.find((d: any) => d.id === donId);
    const target = player.zones.characterArea.find((c: CardInstance) => c.id === targetCardId) ||
                  (player.zones.leaderArea?.id === targetCardId ? player.zones.leaderArea : null);
    
    if (!don || !target) return players;

    // Create updated target with DON
    const updatedTarget = {
      ...target,
      givenDon: [...target.givenDon, don],
    };

    // Update player state
    const updatedPlayer = {
      ...player,
      zones: {
        ...player.zones,
        characterArea: player.zones.characterArea.map((c: CardInstance) =>
          c.id === targetCardId ? updatedTarget : c
        ),
        leaderArea: player.zones.leaderArea?.id === targetCardId ? updatedTarget : player.zones.leaderArea,
      },
    };

    players.set(action.playerId, updatedPlayer);
    return players;
  }

  /**
   * Simulate DECLARE_ATTACK changes
   */
  private simulateDeclareAttackChanges(state: GameState, action: GameAction): Map<PlayerId, any> {
    const players = new Map(state.players);
    const player = players.get(action.playerId);
    
    if (!player) return players;

    const attackerId = (action as any).attackerId;
    const attacker = player.zones.characterArea.find((c: CardInstance) => c.id === attackerId) ||
                    (player.zones.leaderArea?.id === attackerId ? player.zones.leaderArea : null);
    
    if (!attacker) return players;

    // Create updated attacker (rested)
    const updatedAttacker = {
      ...attacker,
      state: CardState.RESTED,
    };

    // Update player state
    const updatedPlayer = {
      ...player,
      zones: {
        ...player.zones,
        characterArea: player.zones.characterArea.map((c: CardInstance) =>
          c.id === attackerId ? updatedAttacker : c
        ),
        leaderArea: player.zones.leaderArea?.id === attackerId ? updatedAttacker : player.zones.leaderArea,
      },
    };

    players.set(action.playerId, updatedPlayer);
    return players;
  }
}

// ============================================================================
// Performance Optimizer (Main Class)
// ============================================================================

/**
 * Main performance optimizer that coordinates all optimization strategies
 */
export class PerformanceOptimizer {
  private cache: EvaluationCache;
  private pruner: ActionPruner;
  private timeLimiter: TimeLimitedEvaluator;
  private simulator: OptimizedStateSimulator;
  private config: OptimizationConfig;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    this.cache = new EvaluationCache(this.config);
    this.pruner = new ActionPruner(this.config);
    this.timeLimiter = new TimeLimitedEvaluator(this.config);
    this.simulator = new OptimizedStateSimulator();
  }

  /**
   * Get the evaluation cache
   */
  getCache(): EvaluationCache {
    return this.cache;
  }

  /**
   * Get the action pruner
   */
  getPruner(): ActionPruner {
    return this.pruner;
  }

  /**
   * Get the time limiter
   */
  getTimeLimiter(): TimeLimitedEvaluator {
    return this.timeLimiter;
  }

  /**
   * Get the optimized simulator
   */
  getSimulator(): OptimizedStateSimulator {
    return this.simulator;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.cache.getMetrics();
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.cache.resetMetrics();
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    this.cache = new EvaluationCache(this.config);
    this.pruner = new ActionPruner(this.config);
    this.timeLimiter = new TimeLimitedEvaluator(this.config);
  }
}
