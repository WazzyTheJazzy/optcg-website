/**
 * AIPlayer.test.ts
 * 
 * Comprehensive unit tests for AIPlayer implementation
 * Tests all Player interface methods, thinking simulation, randomness,
 * error handling, and timeout mechanisms.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIPlayer, createAIPlayer, createCustomAIPlayer } from './AIPlayer';
import {
  PlayerId,
  PlayerType,
  GameState,
  GameAction,
  ActionType,
  CardInstance,
  CounterAction,
  Target,
  TargetType,
  EffectInstance,
  CardCategory,
  CardState,
  ZoneId,
} from '../core/types';
import { AIPlayerConfig } from './types';
import { createInitialGameState } from '../core/GameState';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test game action
 */
function createTestAction(type: ActionType = ActionType.PASS_PRIORITY): GameAction {
  return {
    type,
    playerId: PlayerId.PLAYER_1,
    data: {},
    timestamp: Date.now(),
  };
}

/**
 * Create multiple test actions
 */
function createTestActions(count: number): GameAction[] {
  return Array.from({ length: count }, (_, i) => ({
    type: ActionType.PASS_PRIORITY,
    playerId: PlayerId.PLAYER_1,
    data: { index: i },
    timestamp: Date.now() + i,
  }));
}

/**
 * Create a test card instance
 */
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

/**
 * Create a test effect instance
 */
function createTestEffect(): EffectInstance {
  return {
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
    source: createTestCard('source-1'),
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map(),
    context: null,
  };
}

/**
 * Measure execution time
 */
async function measureTime(fn: () => Promise<any>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

// ============================================================================
// AIPlayer Core Tests
// ============================================================================

describe('AIPlayer - Core Functionality', () => {
  let aiPlayer: AIPlayer;
  let gameState: GameState;

  beforeEach(() => {
    aiPlayer = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    gameState = createInitialGameState();
  });

  describe('Constructor and Factory', () => {
    it('should create AIPlayer with correct properties', () => {
      expect(aiPlayer.id).toBe(PlayerId.PLAYER_1);
      expect(aiPlayer.type).toBe(PlayerType.AI);
    });

    it('should create AIPlayer with default config using factory', () => {
      const easy = createAIPlayer(PlayerId.PLAYER_1, 'easy');
      const medium = createAIPlayer(PlayerId.PLAYER_1, 'medium');
      const hard = createAIPlayer(PlayerId.PLAYER_1, 'hard');

      expect(easy.id).toBe(PlayerId.PLAYER_1);
      expect(medium.id).toBe(PlayerId.PLAYER_1);
      expect(hard.id).toBe(PlayerId.PLAYER_1);
    });

    it('should create AIPlayer with custom config', () => {
      const config: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'aggressive',
        thinkingTime: { min: 100, max: 200 },
        randomness: 0.5,
      };

      const custom = createCustomAIPlayer(PlayerId.PLAYER_2, config);
      expect(custom.id).toBe(PlayerId.PLAYER_2);
    });

    it('should accept optional EventEmitter', () => {
      const emitter = new EventEmitter();
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced', emitter);
      expect(ai).toBeDefined();
    });
  });
});

// ============================================================================
// Player Interface Methods Tests
// ============================================================================

describe('AIPlayer - Player Interface Methods', () => {
  let aiPlayer: AIPlayer;
  let gameState: GameState;

  beforeEach(() => {
    aiPlayer = createAIPlayer(PlayerId.PLAYER_1, 'easy');
    gameState = createInitialGameState();
  });

  describe('chooseAction', () => {
    it('should return a valid action from legal actions', async () => {
      const actions = createTestActions(3);
      const result = await aiPlayer.chooseAction(actions, gameState);

      expect(result).toBeDefined();
      expect(actions).toContain(result);
    });

    it('should handle single action', async () => {
      const actions = [createTestAction()];
      const result = await aiPlayer.chooseAction(actions, gameState);

      expect(result).toBe(actions[0]);
    });

    it('should handle multiple actions', async () => {
      const actions = createTestActions(10);
      const result = await aiPlayer.chooseAction(actions, gameState);

      expect(actions).toContain(result);
    });

    it('should throw error when no actions provided', async () => {
      await expect(
        aiPlayer.chooseAction([], gameState)
      ).rejects.toThrow('No legal actions provided');
    });
  });

  describe('chooseMulligan', () => {
    it('should return boolean decision', async () => {
      const hand: CardInstance[] = [];
      const result = await aiPlayer.chooseMulligan(hand, gameState);

      expect(typeof result).toBe('boolean');
    });

    it('should handle empty hand', async () => {
      const result = await aiPlayer.chooseMulligan([], gameState);
      expect(typeof result).toBe('boolean');
    });

    it('should handle hand with cards', async () => {
      const hand = [
        createTestCard('card1'),
        createTestCard('card2'),
        createTestCard('card3'),
      ];
      const result = await aiPlayer.chooseMulligan(hand, gameState);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('chooseBlocker', () => {
    it('should return valid blocker or null', async () => {
      const blockers = [createTestCard('blocker1'), createTestCard('blocker2')];
      const attacker = createTestCard('attacker');

      const result = await aiPlayer.chooseBlocker(blockers, attacker, gameState);

      expect(result === null || blockers.includes(result)).toBe(true);
    });

    it('should handle no blockers available', async () => {
      const attacker = createTestCard('attacker');
      const result = await aiPlayer.chooseBlocker([], attacker, gameState);

      expect(result).toBeNull();
    });

    it('should handle single blocker', async () => {
      const blockers = [createTestCard('blocker1')];
      const attacker = createTestCard('attacker');

      const result = await aiPlayer.chooseBlocker(blockers, attacker, gameState);
      expect(result === null || result === blockers[0]).toBe(true);
    });
  });

  describe('chooseCounterAction', () => {
    it('should return valid counter action or null', async () => {
      const options: CounterAction[] = [
        { type: 'USE_COUNTER_CARD', cardId: 'counter1' },
        { type: 'PASS' },
      ];

      const result = await aiPlayer.chooseCounterAction(options, gameState);
      expect(result === null || options.includes(result)).toBe(true);
    });

    it('should handle no counter options', async () => {
      const result = await aiPlayer.chooseCounterAction([], gameState);
      expect(result).toBeNull();
    });

    it('should handle only pass option', async () => {
      const options: CounterAction[] = [{ type: 'PASS' }];
      const result = await aiPlayer.chooseCounterAction(options, gameState);
      expect(result === null || result === options[0]).toBe(true);
    });
  });

  describe('chooseTarget', () => {
    it('should return valid target from legal targets', async () => {
      const targets: Target[] = [
        { type: TargetType.PLAYER, playerId: PlayerId.PLAYER_2 },
        { type: TargetType.CARD, cardId: 'card1' },
      ];
      const effect = createTestEffect();

      const result = await aiPlayer.chooseTarget(targets, effect, gameState);
      expect(targets).toContain(result);
    });

    it('should throw error when no targets provided', async () => {
      const effect = createTestEffect();

      await expect(
        aiPlayer.chooseTarget([], effect, gameState)
      ).rejects.toThrow('No legal targets provided');
    });

    it('should handle single target', async () => {
      const targets: Target[] = [
        { type: TargetType.PLAYER, playerId: PlayerId.PLAYER_2 },
      ];
      const effect = createTestEffect();

      const result = await aiPlayer.chooseTarget(targets, effect, gameState);
      expect(result).toBe(targets[0]);
    });
  });

  describe('chooseValue', () => {
    it('should return valid value from options', async () => {
      const options = [1, 2, 3, 4, 5];
      const effect = createTestEffect();

      const result = await aiPlayer.chooseValue(options, effect, gameState);
      expect(options).toContain(result);
    });

    it('should throw error when no options provided', async () => {
      const effect = createTestEffect();

      await expect(
        aiPlayer.chooseValue([], effect, gameState)
      ).rejects.toThrow('No value options provided');
    });

    it('should handle single value', async () => {
      const options = [42];
      const effect = createTestEffect();

      const result = await aiPlayer.chooseValue(options, effect, gameState);
      expect(result).toBe(42);
    });
  });
});

// ============================================================================
// Thinking Time Simulation Tests
// ============================================================================

describe('AIPlayer - Thinking Time Simulation', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  describe('Basic Delays', () => {
    it('should add appropriate delay for easy difficulty', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');
      const actions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

      // Easy: min=500ms
      expect(elapsed).toBeGreaterThanOrEqual(450);
    });

    it('should add appropriate delay for medium difficulty', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
      const actions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

      // Medium: min=800ms
      expect(elapsed).toBeGreaterThanOrEqual(750);
    });

    it('should add appropriate delay for hard difficulty', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'hard');
      const actions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

      // Hard: min=1000ms
      expect(elapsed).toBeGreaterThanOrEqual(950);
    });
  });

  describe('Complexity-Based Delays', () => {
    it('should take less time for simple decisions', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
      const simpleActions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(simpleActions, gameState));

      expect(elapsed).toBeLessThan(1500);
    });

    it('should take more time for complex decisions', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
      const complexActions = createTestActions(15);

      const elapsed = await measureTime(() => ai.chooseAction(complexActions, gameState));

      expect(elapsed).toBeGreaterThan(1000);
    });
  });

  describe('Custom Thinking Time', () => {
    it('should respect custom min/max delays', async () => {
      const config: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'balanced',
        thinkingTime: { min: 200, max: 400 },
        randomness: 0.3,
      };
      const ai = createCustomAIPlayer(PlayerId.PLAYER_1, config);
      const actions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));

      expect(elapsed).toBeGreaterThanOrEqual(150);
      expect(elapsed).toBeLessThan(500);
    });
  });
});

// ============================================================================
// Randomness Tests
// ============================================================================

describe('AIPlayer - Randomness and Variation', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  describe('Decision Variation', () => {
    it('should introduce variation based on difficulty', async () => {
      const easyConfig: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'balanced',
        thinkingTime: { min: 100, max: 200 },
        randomness: 0.3,
      };

      const hardConfig: AIPlayerConfig = {
        difficulty: 'hard',
        playStyle: 'balanced',
        thinkingTime: { min: 100, max: 200 },
        randomness: 0.05,
      };

      const easyAI = createCustomAIPlayer(PlayerId.PLAYER_1, easyConfig);
      const hardAI = createCustomAIPlayer(PlayerId.PLAYER_1, hardConfig);

      // Both should make valid decisions
      const actions = createTestActions(5);
      
      const easyResult = await easyAI.chooseAction(actions, gameState);
      const hardResult = await hardAI.chooseAction(actions, gameState);

      expect(actions).toContain(easyResult);
      expect(actions).toContain(hardResult);
    });

    it('should make consistent decisions with low randomness', async () => {
      const config: AIPlayerConfig = {
        difficulty: 'hard',
        playStyle: 'balanced',
        thinkingTime: { min: 100, max: 200 },
        randomness: 0.0,
      };

      const ai = createCustomAIPlayer(PlayerId.PLAYER_1, config);
      const actions = createTestActions(3);

      // Make multiple decisions - with zero randomness, should be deterministic
      const results: GameAction[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await ai.chooseAction(actions, gameState);
        results.push(result);
      }

      // All results should be valid
      results.forEach(result => {
        expect(actions).toContain(result);
      });
    }, 10000);
  });

  describe('Timing Variation', () => {
    it('should have varied timing across multiple decisions', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium');
      const actions = createTestActions(5);

      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const elapsed = await measureTime(() => ai.chooseAction(actions, gameState));
        times.push(elapsed);
      }

      // Times should vary (not all identical)
      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBeGreaterThan(1);
    }, 10000);
  });
});

// ============================================================================
// Error Handling and Fallback Tests
// ============================================================================

describe('AIPlayer - Error Handling', () => {
  let aiPlayer: AIPlayer;
  let gameState: GameState;

  beforeEach(() => {
    aiPlayer = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    gameState = createInitialGameState();
  });

  describe('Invalid Input Handling', () => {
    it('should throw on empty action list', async () => {
      await expect(
        aiPlayer.chooseAction([], gameState)
      ).rejects.toThrow();
    });

    it('should throw on empty target list', async () => {
      const effect = createTestEffect();
      await expect(
        aiPlayer.chooseTarget([], effect, gameState)
      ).rejects.toThrow();
    });

    it('should throw on empty value options', async () => {
      const effect = createTestEffect();
      await expect(
        aiPlayer.chooseValue([], effect, gameState)
      ).rejects.toThrow();
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should fallback to random action on evaluation failure', async () => {
      const actions = createTestActions(3);

      // Mock the decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectAction'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      // Should not throw, should return a fallback action
      const result = await aiPlayer.chooseAction(actions, gameState);
      
      expect(result).toBeDefined();
      expect(actions).toContain(result);
    });

    it('should fallback to keeping hand on mulligan failure', async () => {
      const hand = [createTestCard('card1')];

      // Mock the decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'evaluateMulligan'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      const result = await aiPlayer.chooseMulligan(hand, gameState);
      expect(result).toBe(false); // Keep hand
    });

    it('should fallback to not blocking on blocker failure', async () => {
      const blockers = [createTestCard('blocker1')];
      const attacker = createTestCard('attacker');

      // Mock the decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectBlocker'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      const result = await aiPlayer.chooseBlocker(blockers, attacker, gameState);
      expect(result).toBeNull();
    });

    it('should fallback to not countering on counter failure', async () => {
      const options: CounterAction[] = [{ type: 'PASS' }];

      // Mock the decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectCounterAction'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      const result = await aiPlayer.chooseCounterAction(options, gameState);
      expect(result).toBeNull();
    });

    it('should fallback to first target on target failure', async () => {
      const targets: Target[] = [
        { type: TargetType.PLAYER, playerId: PlayerId.PLAYER_2 },
      ];
      const effect = createTestEffect();

      // Mock the decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectTarget'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      const result = await aiPlayer.chooseTarget(targets, effect, gameState);
      expect(result).toBe(targets[0]);
    });

    it('should fallback to first value on value failure', async () => {
      const options = [1, 2, 3];
      const effect = createTestEffect();

      // Mock the decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectValue'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      const result = await aiPlayer.chooseValue(options, effect, gameState);
      expect(result).toBe(1);
    });
  });

  describe('Invalid Action Validation', () => {
    it('should fallback when decision system returns invalid action', async () => {
      const actions = createTestActions(2);
      const invalidAction = createTestAction(ActionType.END_PHASE);

      // Mock decision system to return invalid action
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectAction'
      );
      decisionSystemSpy.mockReturnValue(invalidAction);

      const result = await aiPlayer.chooseAction(actions, gameState);
      
      // Should fallback to a valid action
      expect(actions).toContain(result);
    });

    it('should fallback when blocker is not in legal blockers', async () => {
      const blockers = [createTestCard('blocker1')];
      const attacker = createTestCard('attacker');
      const invalidBlocker = createTestCard('invalid');

      // Mock decision system to return invalid blocker
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectBlocker'
      );
      decisionSystemSpy.mockReturnValue(invalidBlocker);

      const result = await aiPlayer.chooseBlocker(blockers, attacker, gameState);
      expect(result).toBeNull(); // Fallback to not blocking
    });
  });
});

// ============================================================================
// Timeout Handling Tests
// ============================================================================

describe('AIPlayer - Timeout Handling', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  describe('Decision Timeouts', () => {
    it('should timeout and fallback for slow action selection', async () => {
      const config: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'balanced',
        thinkingTime: { min: 100, max: 200 },
        randomness: 0.3,
      };
      const ai = createCustomAIPlayer(PlayerId.PLAYER_1, config);
      const actions = createTestActions(2);

      // Mock decision system to take too long
      const decisionSystemSpy = vi.spyOn(
        (ai as any).decisionSystem,
        'selectAction'
      );
      decisionSystemSpy.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(actions[0]), 100000); // Never resolves in time
        });
      });

      // Should timeout and fallback
      const result = await ai.chooseAction(actions, gameState);
      
      expect(result).toBeDefined();
      expect(actions).toContain(result);
    }, 10000);

    it('should complete before timeout for normal decisions', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');
      const actions = createTestActions(1);

      const start = Date.now();
      const result = await ai.chooseAction(actions, gameState);
      const elapsed = Date.now() - start;

      expect(result).toBeDefined();
      expect(elapsed).toBeLessThan(5000); // Well before timeout
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('AIPlayer - Integration', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  describe('Complete Decision Flow', () => {
    it('should handle complete game decision sequence', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy'); // Use easy for faster test

      // Mulligan decision
      const hand = [createTestCard('card1'), createTestCard('card2')];
      const mulliganResult = await ai.chooseMulligan(hand, gameState);
      expect(typeof mulliganResult).toBe('boolean');

      // Action selection
      const actions = createTestActions(3);
      const actionResult = await ai.chooseAction(actions, gameState);
      expect(actions).toContain(actionResult);

      // Blocker selection
      const blockers = [createTestCard('blocker1')];
      const attacker = createTestCard('attacker');
      const blockerResult = await ai.chooseBlocker(blockers, attacker, gameState);
      expect(blockerResult === null || blockers.includes(blockerResult)).toBe(true);

      // Counter selection
      const counterOptions: CounterAction[] = [{ type: 'PASS' }];
      const counterResult = await ai.chooseCounterAction(counterOptions, gameState);
      expect(counterResult === null || counterOptions.includes(counterResult)).toBe(true);

      // Target selection
      const targets: Target[] = [{ type: TargetType.PLAYER, playerId: PlayerId.PLAYER_2 }];
      const effect = createTestEffect();
      const targetResult = await ai.chooseTarget(targets, effect, gameState);
      expect(targets).toContain(targetResult);

      // Value selection
      const values = [1, 2, 3];
      const valueResult = await ai.chooseValue(values, effect, gameState);
      expect(values).toContain(valueResult);
    }, 10000); // Increase timeout for sequential operations

    it('should work with different difficulty levels', async () => {
      const difficulties = ['easy', 'medium', 'hard'] as const;
      const actions = createTestActions(3);

      for (const difficulty of difficulties) {
        const ai = createAIPlayer(PlayerId.PLAYER_1, difficulty);
        const result = await ai.chooseAction(actions, gameState);
        expect(actions).toContain(result);
      }
    });

    it('should work with different play styles', async () => {
      const playStyles = ['aggressive', 'defensive', 'balanced'] as const;
      const actions = createTestActions(3);

      for (const playStyle of playStyles) {
        const ai = createAIPlayer(PlayerId.PLAYER_1, 'medium', playStyle);
        const result = await ai.chooseAction(actions, gameState);
        expect(actions).toContain(result);
      }
    });
  });

  describe('Event Emission Integration', () => {
    it('should emit events when EventEmitter is provided', async () => {
      const emitter = new EventEmitter();
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced', emitter);

      const thinkingStartSpy = vi.fn();
      const thinkingEndSpy = vi.fn();
      const actionSelectedSpy = vi.fn();

      emitter.on(GameEventType.AI_THINKING_START, thinkingStartSpy);
      emitter.on(GameEventType.AI_THINKING_END, thinkingEndSpy);
      emitter.on(GameEventType.AI_ACTION_SELECTED, actionSelectedSpy);

      const actions = createTestActions(1);
      await ai.chooseAction(actions, gameState);

      expect(thinkingStartSpy).toHaveBeenCalled();
      expect(thinkingEndSpy).toHaveBeenCalled();
      expect(actionSelectedSpy).toHaveBeenCalled();
    });

    it('should work without EventEmitter', async () => {
      const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy');
      const actions = createTestActions(1);

      // Should not throw
      const result = await ai.chooseAction(actions, gameState);
      expect(result).toBeDefined();
    });
  });
});
