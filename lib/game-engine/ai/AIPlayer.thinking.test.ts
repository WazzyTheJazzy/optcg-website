/**
 * AIPlayer Thinking Time Simulation Tests
 * 
 * Tests for the thinking time simulation functionality that adds
 * realistic delays to AI decision-making.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIPlayer, createAIPlayer } from './AIPlayer';
import { GameState, GameAction, CardInstance, PlayerId } from '../core/types';
import { AIPlayerConfig } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal game state for testing
 */
function createTestGameState(): GameState {
  return {
    players: {
      player1: {
        id: 'player1' as PlayerId,
        life: 5,
        hand: [],
        deck: [],
        trash: [],
        leader: null as any,
        don: { active: [], rested: [] },
        field: [],
      },
      player2: {
        id: 'player2' as PlayerId,
        life: 5,
        hand: [],
        deck: [],
        trash: [],
        leader: null as any,
        don: { active: [], rested: [] },
        field: [],
      },
    },
    currentPlayer: 'player1' as PlayerId,
    phase: 'main',
    turn: 1,
    priority: 'player1' as PlayerId,
    stack: [],
    pendingEffects: [],
  } as GameState;
}

/**
 * Create test actions
 */
function createTestActions(count: number): GameAction[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'pass' as const,
    playerId: 'player1' as PlayerId,
    timestamp: Date.now() + i,
  }));
}

/**
 * Measure execution time of an async function
 */
async function measureTime(fn: () => Promise<any>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

// ============================================================================
// Thinking Time Tests
// ============================================================================

describe('AIPlayer - Thinking Time Simulation', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  describe('Basic Thinking Time', () => {
    it('should add delay before making decisions', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'easy');
      const actions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(actions, state));

      // Should take at least the minimum thinking time (500ms for easy)
      expect(elapsed).toBeGreaterThanOrEqual(450); // Allow 50ms tolerance
    });

    it('should respect minimum delay configuration', async () => {
      const config: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'balanced',
        thinkingTime: { min: 300, max: 500 },
        randomness: 0.3,
      };
      const ai = new AIPlayer('player1' as PlayerId, config);
      const actions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(actions, state));

      expect(elapsed).toBeGreaterThanOrEqual(250); // Allow 50ms tolerance
    });

    it('should respect maximum delay configuration', async () => {
      const config: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'balanced',
        thinkingTime: { min: 100, max: 300 },
        randomness: 0.3,
      };
      const ai = new AIPlayer('player1' as PlayerId, config);
      const actions = createTestActions(20); // High complexity

      const elapsed = await measureTime(() => ai.chooseAction(actions, state));

      // Should not exceed max + tolerance
      expect(elapsed).toBeLessThan(400);
    });
  });

  describe('Complexity-Based Delays', () => {
    it('should take less time for simple decisions (few options)', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const simpleActions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(simpleActions, state));

      // Should be closer to minimum (800ms for medium)
      expect(elapsed).toBeGreaterThanOrEqual(750);
      expect(elapsed).toBeLessThan(1200); // Should not be near max (2000ms)
    });

    it('should take more time for complex decisions (many options)', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const complexActions = createTestActions(15);

      const elapsed = await measureTime(() => ai.chooseAction(complexActions, state));

      // Should be closer to maximum (2000ms for medium)
      expect(elapsed).toBeGreaterThan(1500);
    });

    it('should scale delay based on number of options', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');

      const time1 = await measureTime(() => ai.chooseAction(createTestActions(1), state));
      const time5 = await measureTime(() => ai.chooseAction(createTestActions(5), state));
      const time10 = await measureTime(() => ai.chooseAction(createTestActions(10), state));

      // More options should generally take more time
      expect(time5).toBeGreaterThan(time1);
      expect(time10).toBeGreaterThan(time5);
    });
  });

  describe('Difficulty-Based Delays', () => {
    it('should have shorter delays for easy difficulty', async () => {
      const easy = createAIPlayer('player1' as PlayerId, 'easy');
      const actions = createTestActions(5);

      const elapsed = await measureTime(() => easy.chooseAction(actions, state));

      // Easy: min=500, max=1500
      expect(elapsed).toBeGreaterThanOrEqual(450);
      expect(elapsed).toBeLessThan(1600);
    });

    it('should have medium delays for medium difficulty', async () => {
      const medium = createAIPlayer('player1' as PlayerId, 'medium');
      const actions = createTestActions(5);

      const elapsed = await measureTime(() => medium.chooseAction(actions, state));

      // Medium: min=800, max=2000
      expect(elapsed).toBeGreaterThanOrEqual(750);
      expect(elapsed).toBeLessThan(2100);
    });

    it('should have longer delays for hard difficulty', async () => {
      const hard = createAIPlayer('player1' as PlayerId, 'hard');
      const actions = createTestActions(5);

      const elapsed = await measureTime(() => hard.chooseAction(actions, state));

      // Hard: min=1000, max=3000
      expect(elapsed).toBeGreaterThanOrEqual(950);
      expect(elapsed).toBeLessThan(3100);
    });
  });

  describe('Different Decision Types', () => {
    it('should add thinking time to mulligan decisions', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const hand: CardInstance[] = [];

      const elapsed = await measureTime(() => ai.chooseMulligan(hand, state));

      expect(elapsed).toBeGreaterThanOrEqual(750);
    });

    it('should add thinking time to blocker decisions', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const blockers: CardInstance[] = [];
      const attacker = {} as CardInstance;

      const elapsed = await measureTime(() => ai.chooseBlocker(blockers, attacker, state));

      expect(elapsed).toBeGreaterThanOrEqual(750);
    });

    it('should add thinking time to counter decisions', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const options: any[] = [];

      const elapsed = await measureTime(() => ai.chooseCounterAction(options, state));

      expect(elapsed).toBeGreaterThanOrEqual(750);
    });

    it('should add thinking time to target selection', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const targets: any[] = [{ type: 'character', id: 'char1' }];
      const effect = {} as any;

      const elapsed = await measureTime(() => ai.chooseTarget(targets, effect, state));

      expect(elapsed).toBeGreaterThanOrEqual(750);
    });

    it('should add thinking time to value selection', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const options = [1, 2, 3];
      const effect = {} as any;

      const elapsed = await measureTime(() => ai.chooseValue(options, effect, state));

      expect(elapsed).toBeGreaterThanOrEqual(750);
    });
  });

  describe('Randomness in Delays', () => {
    it('should add random variation to delays', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const actions = createTestActions(5);

      // Make multiple decisions and check they have different timings
      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const elapsed = await measureTime(() => ai.chooseAction(actions, state));
        times.push(elapsed);
      }

      // Not all times should be exactly the same (allowing for some identical due to rounding)
      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBeGreaterThan(1);
    }, 10000); // Increase timeout for multiple iterations

    it('should keep variation within reasonable bounds', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const actions = createTestActions(5);

      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const elapsed = await measureTime(() => ai.chooseAction(actions, state));
        times.push(elapsed);
      }

      // All times should be within min/max bounds
      times.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(750); // min - tolerance
        expect(time).toBeLessThan(2100); // max + tolerance
      });
    }, 15000); // Increase timeout for multiple iterations
  });

  describe('Non-Blocking Behavior', () => {
    it('should not block other async operations', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'easy');
      const actions = createTestActions(1);

      let otherOperationCompleted = false;

      // Start AI decision
      const decisionPromise = ai.chooseAction(actions, state);

      // Start another async operation
      const otherPromise = new Promise<void>(resolve => {
        setTimeout(() => {
          otherOperationCompleted = true;
          resolve();
        }, 100);
      });

      // Wait for other operation
      await otherPromise;

      // Other operation should complete before AI decision
      expect(otherOperationCompleted).toBe(true);

      // Now wait for AI decision
      await decisionPromise;
    });

    it('should allow multiple AI decisions concurrently', async () => {
      const ai1 = createAIPlayer('player1' as PlayerId, 'easy');
      const ai2 = createAIPlayer('player2' as PlayerId, 'easy');
      const actions = createTestActions(1);

      const start = Date.now();

      // Start both decisions concurrently
      await Promise.all([
        ai1.chooseAction(actions, state),
        ai2.chooseAction(actions, state),
      ]);

      const elapsed = Date.now() - start;

      // Should take roughly the same time as one decision (not double)
      // Both should run concurrently
      expect(elapsed).toBeLessThan(1200); // Not 1000ms (2 * 500ms)
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero complexity gracefully', async () => {
      const config: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'balanced',
        thinkingTime: { min: 100, max: 500 },
        randomness: 0.3,
      };
      const ai = new AIPlayer('player1' as PlayerId, config);
      const actions = createTestActions(1);

      const elapsed = await measureTime(() => ai.chooseAction(actions, state));

      // Should still respect minimum delay
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should handle very high complexity', async () => {
      const ai = createAIPlayer('player1' as PlayerId, 'medium');
      const actions = createTestActions(100); // Very high complexity

      const elapsed = await measureTime(() => ai.chooseAction(actions, state));

      // Should cap at maximum delay
      expect(elapsed).toBeLessThan(2500);
    });

    it('should handle min === max configuration', async () => {
      const config: AIPlayerConfig = {
        difficulty: 'easy',
        playStyle: 'balanced',
        thinkingTime: { min: 500, max: 500 },
        randomness: 0.3,
      };
      const ai = new AIPlayer('player1' as PlayerId, config);
      const actions = createTestActions(5);

      const elapsed = await measureTime(() => ai.chooseAction(actions, state));

      // Should be close to the fixed delay
      expect(elapsed).toBeGreaterThanOrEqual(450);
      expect(elapsed).toBeLessThan(650);
    });
  });
});
