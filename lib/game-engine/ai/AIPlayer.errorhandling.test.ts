/**
 * Tests for AIPlayer error handling and fallback mechanisms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIPlayer, createAIPlayer } from './AIPlayer';
import { PlayerId, Phase, GameState, ActionType, CardState } from '../core/types';
import { AIDecisionSystem } from './AIDecisionSystem';

describe('AIPlayer Error Handling', () => {
  let aiPlayer: AIPlayer;
  let mockState: GameState;

  beforeEach(() => {
    aiPlayer = createAIPlayer(PlayerId.PLAYER_1, 'medium');
    
    // Create a minimal mock game state
    mockState = {
      phase: Phase.MAIN,
      turnNumber: 1,
      activePlayer: PlayerId.PLAYER_1,
      players: new Map(),
      pendingTriggers: [],
      gameOver: false,
      winner: null,
      history: [],
      loopGuardState: {
        actionCounts: new Map(),
        maxActionsPerType: 100,
        totalActions: 0,
        maxTotalActions: 1000,
      },
    } as GameState;
  });

  describe('chooseAction error handling', () => {
    it('should throw error when no legal actions provided', async () => {
      await expect(
        aiPlayer.chooseAction([], mockState)
      ).rejects.toThrow('No legal actions provided');
    });

    it('should fallback to random action when evaluation fails', async () => {
      const legalActions = [
        { type: ActionType.PASS_PRIORITY, data: {} },
        { type: ActionType.END_PHASE, data: {} },
      ];

      // Spy on the decision system to make it throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectAction'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      // Should not throw, should return a fallback action
      const action = await aiPlayer.chooseAction(legalActions, mockState);
      
      expect(action).toBeDefined();
      expect(legalActions).toContain(action);
    });

    it('should validate selected action is in legal actions', async () => {
      const legalActions = [
        { type: ActionType.PASS_PRIORITY, data: {} },
      ];

      const invalidAction = { type: ActionType.END_PHASE, data: {} };

      // Mock decision system to return invalid action
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectAction'
      );
      decisionSystemSpy.mockReturnValue(invalidAction);

      // Should fallback to a legal action
      const action = await aiPlayer.chooseAction(legalActions, mockState);
      
      expect(action).toBeDefined();
      expect(legalActions).toContain(action);
    });

    it('should handle timeout and fallback', async () => {
      const legalActions = [
        { type: ActionType.PASS_PRIORITY, data: {} },
      ];

      // Mock decision system to take too long
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectAction'
      );
      decisionSystemSpy.mockImplementation(() => {
        return new Promise((resolve) => {
          // Never resolve - will timeout
          setTimeout(() => resolve(legalActions[0]), 100000);
        });
      });

      // Should timeout and fallback (with short timeout for testing)
      const action = await aiPlayer.chooseAction(legalActions, mockState);
      
      expect(action).toBeDefined();
      expect(legalActions).toContain(action);
    }, 10000); // Increase test timeout
  });

  describe('chooseMulligan error handling', () => {
    it('should fallback to keeping hand when evaluation fails', async () => {
      const hand = [
        {
          id: 'card1',
          definition: { baseCost: 3, keywords: [], effects: [] },
          state: CardState.ACTIVE,
        } as any,
      ];

      // Mock decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'evaluateMulligan'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      // Should not throw, should return false (keep hand)
      const shouldMulligan = await aiPlayer.chooseMulligan(hand, mockState);
      
      expect(shouldMulligan).toBe(false);
    });
  });

  describe('chooseBlocker error handling', () => {
    it('should fallback to not blocking when evaluation fails', async () => {
      const blockers = [
        {
          id: 'blocker1',
          definition: { basePower: 5000, keywords: ['Blocker'], effects: [] },
          state: CardState.ACTIVE,
        } as any,
      ];

      const attacker = {
        id: 'attacker1',
        definition: { basePower: 6000, keywords: [], effects: [] },
        state: CardState.ACTIVE,
      } as any;

      // Mock decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectBlocker'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      // Should not throw, should return null (don't block)
      const blocker = await aiPlayer.chooseBlocker(blockers, attacker, mockState);
      
      expect(blocker).toBeNull();
    });

    it('should validate selected blocker is in legal blockers', async () => {
      const blockers = [
        {
          id: 'blocker1',
          definition: { basePower: 5000, keywords: ['Blocker'], effects: [] },
          state: CardState.ACTIVE,
        } as any,
      ];

      const attacker = {
        id: 'attacker1',
        definition: { basePower: 6000, keywords: [], effects: [] },
        state: CardState.ACTIVE,
      } as any;

      const invalidBlocker = {
        id: 'invalid',
        definition: { basePower: 3000, keywords: [], effects: [] },
        state: CardState.ACTIVE,
      } as any;

      // Mock decision system to return invalid blocker
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectBlocker'
      );
      decisionSystemSpy.mockReturnValue(invalidBlocker);

      // Should fallback to null (don't block)
      const blocker = await aiPlayer.chooseBlocker(blockers, attacker, mockState);
      
      expect(blocker).toBeNull();
    });
  });

  describe('chooseCounterAction error handling', () => {
    it('should fallback to not countering when evaluation fails', async () => {
      const options = [
        { type: 'COUNTER', cardId: 'counter1' } as any,
        { type: 'PASS' } as any,
      ];

      // Mock decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectCounterAction'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      // Should not throw, should return null (don't counter)
      const counterAction = await aiPlayer.chooseCounterAction(options, mockState);
      
      expect(counterAction).toBeNull();
    });
  });

  describe('chooseTarget error handling', () => {
    it('should throw error when no legal targets provided', async () => {
      const effect = {
        effectDefinition: { label: 'Test Effect' },
        source: { id: 'source1' },
      } as any;

      await expect(
        aiPlayer.chooseTarget([], effect, mockState)
      ).rejects.toThrow('No legal targets provided');
    });

    it('should fallback to first target when evaluation fails', async () => {
      const targets = [
        { type: 'CARD', cardId: 'target1' } as any,
        { type: 'CARD', cardId: 'target2' } as any,
      ];

      const effect = {
        effectDefinition: { label: 'Test Effect' },
        source: { id: 'source1' },
      } as any;

      // Mock decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectTarget'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      // Should not throw, should return first target
      const target = await aiPlayer.chooseTarget(targets, effect, mockState);
      
      expect(target).toBe(targets[0]);
    });
  });

  describe('chooseValue error handling', () => {
    it('should throw error when no value options provided', async () => {
      const effect = {
        effectDefinition: { label: 'Test Effect' },
        source: { id: 'source1' },
      } as any;

      await expect(
        aiPlayer.chooseValue([], effect, mockState)
      ).rejects.toThrow('No value options provided');
    });

    it('should fallback to first value when evaluation fails', async () => {
      const options = [1, 2, 3];

      const effect = {
        effectDefinition: { label: 'Test Effect' },
        source: { id: 'source1' },
      } as any;

      // Mock decision system to throw
      const decisionSystemSpy = vi.spyOn(
        (aiPlayer as any).decisionSystem,
        'selectValue'
      );
      decisionSystemSpy.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      // Should not throw, should return first value
      const value = await aiPlayer.chooseValue(options, effect, mockState);
      
      expect(value).toBe(options[0]);
    });
  });
});

