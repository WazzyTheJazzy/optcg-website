/**
 * EffectSystem.complexConditions.pbt.test.ts
 * 
 * Property-based tests for complex condition evaluation in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 32: Complex Condition Evaluation
 * Validates: Requirements 21.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { EffectSystem } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  CardDefinition,
  CardInstance,
  ConditionExpr,
  EffectContext,
  Color,
} from '../core/types';

/**
 * Property 32: Complex Condition Evaluation
 * 
 * For any effect with multiple conditions combined with AND/OR logic,
 * the effect should only apply when the combined condition evaluates to true.
 * 
 * This property ensures that:
 * 1. AND conditions require all operands to be true
 * 2. OR conditions require at least one operand to be true
 * 3. NOT conditions invert the operand result
 * 4. Nested conditions are evaluated correctly
 * 5. Complex boolean logic is handled properly
 */

describe('Property 32: Complex Condition Evaluation', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;

  // Helper to create a test card
  const createTestCard = (
    id: string,
    playerId: PlayerId,
    zone: ZoneId = ZoneId.CHARACTER_AREA,
    keywords: string[] = [],
    colors: Color[] = ['Red'],
    basePower: number = 5000
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors,
      typeTags: [],
      attributes: [],
      basePower,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords,
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition,
      owner: playerId,
      controller: playerId,
      zone,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  });

  // ============================================================================
  // Arbitraries for generating test data
  // ============================================================================

  // Generate a simple comparison condition with known result
  const comparisonConditionArb = fc.record({
    left: fc.integer({ min: 0, max: 10 }),
    right: fc.integer({ min: 0, max: 10 }),
    operator: fc.constantFrom('EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE'),
  }).map(({ left, right, operator }) => ({
    condition: {
      type: 'COMPARE' as const,
      operator,
      left,
      right,
    },
    expectedResult: (() => {
      switch (operator) {
        case 'EQ': return left === right;
        case 'NEQ': return left !== right;
        case 'GT': return left > right;
        case 'LT': return left < right;
        case 'GTE': return left >= right;
        case 'LTE': return left <= right;
        default: return false;
      }
    })(),
  }));

  // Generate a HAS_KEYWORD condition with known result
  const hasKeywordConditionArb = fc.record({
    keyword: fc.constantFrom('Rush', 'Blocker', 'DoubleAttack'),
    cardHasKeyword: fc.boolean(),
  }).map(({ keyword, cardHasKeyword }) => ({
    condition: {
      type: 'HAS_KEYWORD' as const,
      keyword,
    },
    cardKeywords: cardHasKeyword ? [keyword] : [],
    expectedResult: cardHasKeyword,
  }));

  // Generate a simple condition with known result
  const simpleConditionWithResultArb = fc.oneof(
    comparisonConditionArb,
    hasKeywordConditionArb
  );

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 32.1: AND with two conditions evaluates correctly', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        comparisonConditionArb,
        (cond1, cond2) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const andCondition: ConditionExpr = {
            type: 'AND',
            operands: [cond1.condition, cond2.condition],
          };

          const result = effectSystem.checkCondition(andCondition, context);
          const expected = cond1.expectedResult && cond2.expectedResult;

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.2: OR with two conditions evaluates correctly', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        comparisonConditionArb,
        (cond1, cond2) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const orCondition: ConditionExpr = {
            type: 'OR',
            operands: [cond1.condition, cond2.condition],
          };

          const result = effectSystem.checkCondition(orCondition, context);
          const expected = cond1.expectedResult || cond2.expectedResult;

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.3: AND with multiple conditions requires all to be true', () => {
    fc.assert(
      fc.property(
        fc.array(comparisonConditionArb, { minLength: 2, maxLength: 5 }),
        (conditions) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const andCondition: ConditionExpr = {
            type: 'AND',
            operands: conditions.map(c => c.condition),
          };

          const result = effectSystem.checkCondition(andCondition, context);
          const expected = conditions.every(c => c.expectedResult);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.4: OR with multiple conditions requires at least one to be true', () => {
    fc.assert(
      fc.property(
        fc.array(comparisonConditionArb, { minLength: 2, maxLength: 5 }),
        (conditions) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const orCondition: ConditionExpr = {
            type: 'OR',
            operands: conditions.map(c => c.condition),
          };

          const result = effectSystem.checkCondition(orCondition, context);
          const expected = conditions.some(c => c.expectedResult);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.5: Nested AND/OR conditions evaluate correctly', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        comparisonConditionArb,
        comparisonConditionArb,
        (cond1, cond2, cond3) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Create nested condition: (cond1 AND cond2) OR cond3
          const nestedCondition: ConditionExpr = {
            type: 'OR',
            operands: [
              {
                type: 'AND',
                operands: [cond1.condition, cond2.condition],
              },
              cond3.condition,
            ],
          };

          const result = effectSystem.checkCondition(nestedCondition, context);
          const expected = (cond1.expectedResult && cond2.expectedResult) || cond3.expectedResult;

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.6: NOT with AND condition evaluates correctly', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        comparisonConditionArb,
        (cond1, cond2) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Create NOT(cond1 AND cond2)
          const notAndCondition: ConditionExpr = {
            type: 'NOT',
            operands: [
              {
                type: 'AND',
                operands: [cond1.condition, cond2.condition],
              },
            ],
          };

          const result = effectSystem.checkCondition(notAndCondition, context);
          const expected = !(cond1.expectedResult && cond2.expectedResult);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.7: De Morgan\'s Law - NOT(A AND B) = (NOT A) OR (NOT B)', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        comparisonConditionArb,
        (cond1, cond2) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // NOT(A AND B)
          const notAndCondition: ConditionExpr = {
            type: 'NOT',
            operands: [
              {
                type: 'AND',
                operands: [cond1.condition, cond2.condition],
              },
            ],
          };

          // (NOT A) OR (NOT B)
          const orNotCondition: ConditionExpr = {
            type: 'OR',
            operands: [
              {
                type: 'NOT',
                operands: [cond1.condition],
              },
              {
                type: 'NOT',
                operands: [cond2.condition],
              },
            ],
          };

          const result1 = effectSystem.checkCondition(notAndCondition, context);
          const result2 = effectSystem.checkCondition(orNotCondition, context);

          // Both should give the same result
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.8: De Morgan\'s Law - NOT(A OR B) = (NOT A) AND (NOT B)', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        comparisonConditionArb,
        (cond1, cond2) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // NOT(A OR B)
          const notOrCondition: ConditionExpr = {
            type: 'NOT',
            operands: [
              {
                type: 'OR',
                operands: [cond1.condition, cond2.condition],
              },
            ],
          };

          // (NOT A) AND (NOT B)
          const andNotCondition: ConditionExpr = {
            type: 'AND',
            operands: [
              {
                type: 'NOT',
                operands: [cond1.condition],
              },
              {
                type: 'NOT',
                operands: [cond2.condition],
              },
            ],
          };

          const result1 = effectSystem.checkCondition(notOrCondition, context);
          const result2 = effectSystem.checkCondition(andNotCondition, context);

          // Both should give the same result
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.9: Complex nested conditions with mixed types', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        hasKeywordConditionArb,
        comparisonConditionArb,
        (cond1, cond2, cond3) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, cond2.cardKeywords);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Create complex condition: ((cond1 OR cond2) AND cond3)
          const complexCondition: ConditionExpr = {
            type: 'AND',
            operands: [
              {
                type: 'OR',
                operands: [cond1.condition, cond2.condition],
              },
              cond3.condition,
            ],
          };

          const result = effectSystem.checkCondition(complexCondition, context);
          const expected = (cond1.expectedResult || cond2.expectedResult) && cond3.expectedResult;

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32.10: Triple negation equals single negation', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        (cond) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // NOT(NOT(NOT(condition)))
          const tripleNot: ConditionExpr = {
            type: 'NOT',
            operands: [
              {
                type: 'NOT',
                operands: [
                  {
                    type: 'NOT',
                    operands: [cond.condition],
                  },
                ],
              },
            ],
          };

          // NOT(condition)
          const singleNot: ConditionExpr = {
            type: 'NOT',
            operands: [cond.condition],
          };

          const result1 = effectSystem.checkCondition(tripleNot, context);
          const result2 = effectSystem.checkCondition(singleNot, context);

          // Both should give the same result
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
