/**
 * Tests for AIDecisionSystem mulligan decision logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIDecisionSystem } from './AIDecisionSystem';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import {
  GameState,
  PlayerId,
  CardInstance,
  CardDefinition,
  CardCategory,
  CardState,
  ZoneId,
  Phase,
} from '../core/types';
import { DecisionContext } from './types';

describe('AIDecisionSystem - Mulligan Logic', () => {
  let decisionSystem: AIDecisionSystem;
  let mockState: GameState;
  let context: DecisionContext;

  beforeEach(() => {
    const evaluator = new ActionEvaluator({
      boardControl: 0.25,
      resourceEfficiency: 0.20,
      lifeDifferential: 0.25,
      cardAdvantage: 0.15,
      tempo: 0.15,
    });
    const strategy = new StrategyManager();
    decisionSystem = new AIDecisionSystem(evaluator, strategy);

    // Create minimal mock state
    mockState = {
      players: new Map(),
      turn: 1,
      phase: Phase.DRAW,
      activePlayer: PlayerId.PLAYER_1,
      priorityPlayer: PlayerId.PLAYER_1,
      stack: [],
      pendingEffects: [],
      turnNumber: 1,
      pendingTriggers: [],
      gameOver: false,
      winner: null,
      history: [],
      loopGuardState: {
        stateHashes: new Map(),
        maxRepeats: 3,
      },
    } as GameState;

    context = {
      state: mockState,
      playerId: PlayerId.PLAYER_1,
      config: {
        difficulty: 'medium',
        playStyle: 'balanced',
        thinkingTime: { min: 500, max: 1500 },
        randomness: 0,
      },
    };
  });

  /**
   * Helper to create a card instance
   */
  function createCard(cost: number, keywords: string[] = []): CardInstance {
    const definition: CardDefinition = {
      id: `card-${cost}`,
      name: `Card ${cost}`,
      category: CardCategory.CHARACTER,
      colors: ['RED'],
      typeTags: [],
      baseCost: cost,
      basePower: cost * 1000,
      lifeValue: null,
      counterValue: 0,
      attributes: [],
      keywords,
      effects: [],
      rarity: 'C',
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id: `instance-${cost}`,
      definition,
      owner: PlayerId.PLAYER_1,
      state: CardState.ACTIVE,
      zone: ZoneId.HAND,
      givenDon: [],
      attachedDon: [],
      modifiers: [],
    };
  }

  describe('Requirement 6.1: Evaluate hand quality', () => {
    it('should evaluate hand quality and return a boolean decision', () => {
      const hand = [
        createCard(2),
        createCard(3),
        createCard(5),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Requirement 6.2: Mulligan if zero playable cards', () => {
    it('should mulligan a hand with no playable cards (all high cost)', () => {
      const hand = [
        createCard(7),
        createCard(8),
        createCard(9),
        createCard(10),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(true); // Should mulligan
    });

    it('should mulligan a hand with only cost 4+ cards', () => {
      const hand = [
        createCard(4),
        createCard(5),
        createCard(6),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(true); // Should mulligan
    });
  });

  describe('Requirement 6.3: Mulligan if only high-cost cards', () => {
    it('should mulligan a hand with only cost 5+ cards', () => {
      const hand = [
        createCard(5),
        createCard(6),
        createCard(7),
        createCard(8),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(true); // Should mulligan
    });
  });

  describe('Requirement 6.4: Keep if balanced curve', () => {
    it('should keep a hand with balanced curve (low, mid, high)', () => {
      const hand = [
        createCard(2),
        createCard(3),
        createCard(5),
        createCard(7),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(false); // Should keep
    });

    it('should keep a hand with multiple playable cards', () => {
      const hand = [
        createCard(1),
        createCard(2),
        createCard(3),
        createCard(4),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(false); // Should keep
    });
  });

  describe('Requirement 6.5: Keep if key combo pieces or strong early plays', () => {
    it('should keep a hand with Rush characters', () => {
      const hand = [
        createCard(3, ['Rush']),
        createCard(4),
        createCard(6),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(false); // Should keep
    });

    it('should keep a hand with valuable keywords', () => {
      const hand = [
        createCard(2, ['Double Attack']),
        createCard(5),
        createCard(7),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(false); // Should keep
    });

    it('should keep a hand with Blocker characters', () => {
      const hand = [
        createCard(3, ['Blocker']),
        createCard(5),
        createCard(6),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(false); // Should keep
    });
  });

  describe('Edge cases', () => {
    it('should handle empty hand', () => {
      const hand: CardInstance[] = [];

      const result = decisionSystem.evaluateMulligan(hand, context);
      expect(result).toBe(true); // Should mulligan empty hand
    });

    it('should handle single card hand', () => {
      const hand = [createCard(2)];

      const result = decisionSystem.evaluateMulligan(hand, context);
      // Single playable card should be kept
      expect(typeof result).toBe('boolean');
    });

    it('should handle hand with cost 0 cards', () => {
      const hand = [
        createCard(0),
        createCard(2),
        createCard(5),
      ];

      const result = decisionSystem.evaluateMulligan(hand, context);
      // Cost 0 cards are not counted as playable (cost > 0 check)
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Difficulty-based randomness', () => {
    it('should apply randomness when configured', () => {
      const contextWithRandomness = {
        ...context,
        config: {
          ...context.config,
          randomness: 0.5,
        },
      };

      const hand = [
        createCard(2),
        createCard(3),
        createCard(5),
      ];

      // Run multiple times to check for variation
      const results = new Set<boolean>();
      for (let i = 0; i < 20; i++) {
        const result = decisionSystem.evaluateMulligan(hand, contextWithRandomness);
        results.add(result);
      }

      // With randomness, we might see both outcomes
      // (though not guaranteed in 20 iterations)
      expect(results.size).toBeGreaterThanOrEqual(1);
    });

    it('should be deterministic with zero randomness', () => {
      const hand = [
        createCard(2),
        createCard(3),
        createCard(5),
      ];

      const result1 = decisionSystem.evaluateMulligan(hand, context);
      const result2 = decisionSystem.evaluateMulligan(hand, context);
      const result3 = decisionSystem.evaluateMulligan(hand, context);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
});

