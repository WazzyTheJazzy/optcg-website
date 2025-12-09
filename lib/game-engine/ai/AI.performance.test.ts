/**
 * AI.performance.test.ts
 * 
 * Performance tests for AI system
 * Tests decision times, memory usage, and evaluation performance
 * 
 * Requirements: 11.1, 11.2, 11.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { createAIPlayer } from './AIPlayer';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import { AIDecisionSystem } from './AIDecisionSystem';
import {
  CardDefinition,
  CardCategory,
  PlayerId,
  GameAction,
  ActionType,
  CardInstance,
  CardState,
  ZoneId,
} from '../core/types';
import { createInitialGameState } from '../core/GameState';
import { DifficultyLevel } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

function createLeader(id: string, lifeValue: number): CardDefinition {
  return {
    id,
    name: `Leader ${id}`,
    category: CardCategory.LEADER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: null,
    lifeValue,
    counterValue: null,
    rarity: 'L',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createCharacter(
  id: string,
  power: number,
  cost: number,
  keywords: string[] = []
): CardDefinition {
  return {
    id,
    name: `Character ${id}`,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: power,
    baseCost: cost,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords,
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: id,
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createDon(id: string): CardDefinition {
  return {
    id,
    name: 'DON!!',
    category: CardCategory.DON,
    colors: [],
    typeTags: [],
    attributes: [],
    basePower: null,
    baseCost: null,
    lifeValue: null,
    counterValue: null,
    rarity: 'DON',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'DON',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createValidDeck(leaderId: string = 'leader-1', lifeValue: number = 5): CardDefinition[] {
  const deck: CardDefinition[] = [];
  deck.push(createLeader(leaderId, lifeValue));

  for (let i = 0; i < 50; i++) {
    const cost = (i % 5) + 1;
    const power = cost * 1000;
    deck.push(createCharacter(`char-${leaderId}-${i}`, power, cost));
  }

  for (let i = 0; i < 10; i++) {
    deck.push(createDon(`don-${leaderId}-${i}`));
  }

  return deck;
}

function createTestAction(type: ActionType = ActionType.PASS_PRIORITY): GameAction {
  return {
    type,
    playerId: PlayerId.PLAYER_1,
    data: {},
    timestamp: Date.now(),
  };
}

function createTestActions(count: number): GameAction[] {
  return Array.from({ length: count }, (_, i) => ({
    type: i % 2 === 0 ? ActionType.PASS_PRIORITY : ActionType.END_PHASE,
    playerId: PlayerId.PLAYER_1,
    data: { index: i },
    timestamp: Date.now() + i,
  }));
}

function createTestCard(id: string, power: number = 5000): CardInstance {
  return {
    id,
    definition: {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['RED'],
      typeTags: [],
      attributes: [],
      basePower: power,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

async function measureTime(fn: () => Promise<any>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  return 0;
}

// ============================================================================
// Performance Test: Simple Action Decision Time
// ============================================================================

describe('AI Performance - Simple Action Decision Time', () => {
  let gameState: any;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  it('should make simple decisions in under 2 seconds (easy)', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');
    const actions = createTestActions(3); // Simple: 3 options

    const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

    // Requirement 11.1: Simple decisions < 2 seconds
    expect(elapsed).toBeLessThan(2000);
  });

  it('should make simple decisions in under 2 seconds (medium)', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    const actions = createTestActions(3);

    const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

    expect(elapsed).toBeLessThan(2000);
  });

  it('should make simple decisions in under 2 seconds (hard)', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'hard');
    const actions = createTestActions(3);

    const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

    expect(elapsed).toBeLessThan(2000);
  });

  it('should make pass priority decision quickly', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    const actions = [createTestAction(ActionType.PASS_PRIORITY)];

    const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

    // Single simple action should be very fast
    expect(elapsed).toBeLessThan(1500);
  });

  it('should make mulligan decision quickly', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    const hand = [createTestCard('card1'), createTestCard('card2')];

    const elapsed = await measureTime(() => ai.chooseMulligan(hand, gameState));

    // Mulligan is a simple decision
    expect(elapsed).toBeLessThan(2000);
  });
});

// ============================================================================
// Performance Test: Complex Action Decision Time
// ============================================================================

describe('AI Performance - Complex Action Decision Time', () => {
  let gameState: any;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  it('should make complex decisions in under 5 seconds (easy)', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');
    const actions = createTestActions(20); // Complex: 20 options

    const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

    // Requirement 11.2: Complex decisions < 5 seconds
    expect(elapsed).toBeLessThan(5000);
  });

  it('should make complex decisions in under 5 seconds (medium)', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    const actions = createTestActions(20);

    const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

    expect(elapsed).toBeLessThan(5000);
  });

  it('should make complex decisions in under 5 seconds (hard)', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'hard');
    const actions = createTestActions(20);

    const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

    expect(elapsed).toBeLessThan(5000);
  });

  it('should handle many blocker options efficiently', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    const blockers = Array.from({ length: 10 }, (_, i) => createTestCard(`blocker${i}`));
    const attacker = createTestCard('attacker');

    const elapsed = await measureTime(() => ai.chooseBlocker(blockers, attacker, gameState));

    expect(elapsed).toBeLessThan(5000);
  });

  it('should handle many target options efficiently', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    const targets = Array.from({ length: 15 }, (_, i) => ({
      type: 'CARD' as const,
      cardId: `card${i}`,
    }));
    const effect = {
      effectDefinition: {
        id: 'effect-1',
        label: '[On Play]',
        timingType: 'AUTO' as any,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'test-script',
        oncePerTurn: false,
      },
      source: createTestCard('source'),
      controller: PlayerId.PLAYER_1,
      targets: [],
      values: new Map(),
      context: null,
    };

    const elapsed = await measureTime(() => ai.chooseTarget(targets, effect, gameState));

    expect(elapsed).toBeLessThan(5000);
  });
});

// ============================================================================
// Performance Test: Memory Usage During Long Games
// ============================================================================

describe('AI Performance - Memory Usage', () => {
  it('should not leak memory during extended gameplay', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');
    const gameState = createInitialGameState();
    const actions = createTestActions(10);

    const initialMemory = getMemoryUsage();

    // Make many decisions to test memory usage
    for (let i = 0; i < 20; i++) {
      await ai.chooseAction(actions, gameState);
    }

    const finalMemory = getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (< 20MB for 20 decisions)
    if (initialMemory > 0) {
      expect(memoryIncrease).toBeLessThan(20);
    }
  }, 30000); // 30 second timeout

  it('should handle multiple sequential decision batches without memory buildup', async () => {
    const memorySnapshots: number[] = [];
    const gameState = createInitialGameState();
    const actions = createTestActions(10);

    for (let batch = 0; batch < 3; batch++) {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');

      // Make decisions
      for (let i = 0; i < 5; i++) {
        await ai.chooseAction(actions, gameState);
      }

      memorySnapshots.push(getMemoryUsage());
    }

    // Memory should not grow significantly across batches
    if (memorySnapshots[0] > 0) {
      const firstBatchMemory = memorySnapshots[0];
      const lastBatchMemory = memorySnapshots[memorySnapshots.length - 1];
      const growth = lastBatchMemory - firstBatchMemory;

      // Memory growth across 3 batches should be reasonable (< 15MB)
      expect(growth).toBeLessThan(15);
    }
  }, 60000); // 60 second timeout
});

// ============================================================================
// Performance Test: Evaluation Performance with Complex Board States
// ============================================================================

describe('AI Performance - Complex Board State Evaluation', () => {
  let evaluator: ActionEvaluator;
  let strategy: StrategyManager;
  let decisionSystem: AIDecisionSystem;
  let gameState: any;

  beforeEach(() => {
    strategy = new StrategyManager();
    strategy.setStrategy('balanced', 'medium');
    evaluator = new ActionEvaluator(strategy.getWeights());
    decisionSystem = new AIDecisionSystem(evaluator, strategy);
    gameState = createInitialGameState();
  });

  it('should evaluate actions quickly with empty board', async () => {
    const actions = createTestActions(10);
    const context = {
      state: gameState,
      playerId: PlayerId.PLAYER_1,
      config: {
        difficulty: 'medium' as DifficultyLevel,
        playStyle: 'balanced' as const,
        thinkingTime: { min: 100, max: 200 },
        randomness: 0.15,
      },
    };

    const start = Date.now();
    const result = decisionSystem.selectAction(actions, context);
    const elapsed = Date.now() - start;

    expect(result).toBeDefined();
    expect(elapsed).toBeLessThan(1000);
  });

  it('should evaluate actions efficiently with complex board state', async () => {
    // Create complex board state with many cards
    const complexState = { ...gameState };
    
    // Add multiple characters to both players
    const player1Cards: CardInstance[] = [];
    const player2Cards: CardInstance[] = [];

    for (let i = 0; i < 10; i++) {
      player1Cards.push(createTestCard(`p1-char${i}`, 3000 + i * 500));
      player2Cards.push(createTestCard(`p2-char${i}`, 3000 + i * 500));
    }

    // Simulate complex board
    complexState.players = new Map([
      [PlayerId.PLAYER_1, {
        ...complexState.players.get(PlayerId.PLAYER_1),
        zones: {
          ...complexState.players.get(PlayerId.PLAYER_1)?.zones,
          characterArea: player1Cards,
        },
      }],
      [PlayerId.PLAYER_2, {
        ...complexState.players.get(PlayerId.PLAYER_2),
        zones: {
          ...complexState.players.get(PlayerId.PLAYER_2)?.zones,
          characterArea: player2Cards,
        },
      }],
    ]);

    const actions = createTestActions(15);
    const context = {
      state: complexState,
      playerId: PlayerId.PLAYER_1,
      config: {
        difficulty: 'hard' as DifficultyLevel,
        playStyle: 'balanced' as const,
        thinkingTime: { min: 100, max: 200 },
        randomness: 0.05,
      },
    };

    const start = Date.now();
    const result = decisionSystem.selectAction(actions, context);
    const elapsed = Date.now() - start;

    expect(result).toBeDefined();
    // Complex board evaluation should still be fast
    expect(elapsed).toBeLessThan(3000);
  });

  it('should evaluate board control factor quickly', () => {
    const start = Date.now();
    const score = evaluator.evaluateBoardControl(gameState, PlayerId.PLAYER_1);
    const elapsed = Date.now() - start;

    expect(typeof score).toBe('number');
    expect(elapsed).toBeLessThan(100);
  });

  it('should evaluate life differential quickly', () => {
    const start = Date.now();
    const score = evaluator.evaluateLifeDifferential(gameState, PlayerId.PLAYER_1);
    const elapsed = Date.now() - start;

    expect(typeof score).toBe('number');
    expect(elapsed).toBeLessThan(100);
  });

  it('should evaluate card advantage quickly', () => {
    const start = Date.now();
    const score = evaluator.evaluateCardAdvantage(gameState, PlayerId.PLAYER_1);
    const elapsed = Date.now() - start;

    expect(typeof score).toBe('number');
    expect(elapsed).toBeLessThan(100);
  });

  it('should handle rapid successive evaluations', () => {
    const iterations = 100;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      evaluator.evaluateBoardControl(gameState, PlayerId.PLAYER_1);
      evaluator.evaluateLifeDifferential(gameState, PlayerId.PLAYER_1);
      evaluator.evaluateCardAdvantage(gameState, PlayerId.PLAYER_1);
    }

    const elapsed = Date.now() - start;

    // 100 iterations of 3 evaluations should complete quickly
    expect(elapsed).toBeLessThan(1000);
  });
});

// ============================================================================
// Performance Test: Decision Time Consistency
// ============================================================================

describe('AI Performance - Decision Time Consistency', () => {
  let gameState: any;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  it('should have consistent decision times across multiple calls', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    const actions = createTestActions(5);
    const times: number[] = [];

    for (let i = 0; i < 5; i++) {
      const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));
      times.push(elapsed);
    }

    // All times should be within reasonable bounds
    times.forEach(time => {
      expect(time).toBeLessThan(3000);
      expect(time).toBeGreaterThan(0);
    });

    // Calculate variance - times should be relatively consistent
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // Standard deviation should be reasonable (not wildly inconsistent)
    expect(stdDev).toBeLessThan(avg * 2);
  }, 10000); // Increase timeout for multiple sequential calls

  it('should scale decision time with complexity', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');

    const simpleActions = createTestActions(2);
    const complexActions = createTestActions(15);

    const simpleTime = await measureTime(() => ai.chooseAction(simpleActions, gameState));
    const complexTime = await measureTime(() => ai.chooseAction(complexActions, gameState));

    // Complex decisions should take at least as long as simple ones
    expect(complexTime).toBeGreaterThanOrEqual(simpleTime * 0.8);

    // Both should be within limits
    expect(simpleTime).toBeLessThan(2000);
    expect(complexTime).toBeLessThan(5000);
  });
});

// ============================================================================
// Performance Test: Throughput
// ============================================================================

describe('AI Performance - Throughput', () => {
  it('should handle high decision throughput', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');
    const gameState = createInitialGameState();
    const actions = createTestActions(10);

    const start = Date.now();
    const decisionCount = 20;

    // Make many rapid decisions
    for (let i = 0; i < decisionCount; i++) {
      await ai.chooseAction(actions, gameState);
    }

    const elapsed = Date.now() - start;

    // Should complete 20 decisions in reasonable time
    // Requirement 11.5: Performance is critical
    expect(elapsed).toBeLessThan(30000); // 30 seconds for 20 decisions

    // Calculate decisions per second
    const decisionsPerSecond = (decisionCount / elapsed) * 1000;
    
    // Should be able to make at least 0.5 decisions per second
    expect(decisionsPerSecond).toBeGreaterThan(0.5);
  }, 40000); // 40 second timeout
});
