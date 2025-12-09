/**
 * EffectSystem.conditions.pbt.test.ts
 * 
 * Property-based tests for effect condition evaluation in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 14: Effect Condition Evaluation
 * Validates: Requirements 13.5
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
  EffectTimingType,
  TriggerTiming,
  CardDefinition,
  CardInstance,
  EffectDefinition,
  ConditionExpr,
  EffectContext,
  Color,
} from '../core/types';

/**
 * Property 14: Effect Condition Evaluation
 * 
 * For any effect with conditions, the effect should only apply when all conditions are met.
 * 
 * This property ensures that:
 * 1. Effects with true conditions are allowed to activate
 * 2. Effects with false conditions are prevented from activating
 * 3. Complex conditions (AND, OR, NOT) are evaluated correctly
 * 4. Condition evaluation is consistent and deterministic
 */

describe('Property 14: Effect Condition Evaluation', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;

  // Helper to create a test card
  const createTestCard = (
    id: string,
    playerId: PlayerId,
    effects: EffectDefinition[] = [],
    keywords: string[] = [],
    colors: Color[] = ['Red'],
    basePower: number = 5000,
    baseCost: number = 3
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors,
      typeTags: [],
      attributes: [],
      basePower,
      baseCost,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords,
      effects,
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
      zone: ZoneId.HAND,
      state: CardState.NONE,
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

  // Generate a simple comparison condition
  const comparisonConditionArb = fc.record({
    type: fc.constant('COMPARE' as const),
    operator: fc.constantFrom('EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE'),
    left: fc.integer({ min: 0, max: 10 }),
    right: fc.integer({ min: 0, max: 10 }),
  });

  // Generate a HAS_KEYWORD condition
  const hasKeywordConditionArb = fc.record({
    type: fc.constant('HAS_KEYWORD' as const),
    keyword: fc.constantFrom('Rush', 'Blocker', 'DoubleAttack', 'Banish'),
  });

  // Generate an IN_ZONE condition
  const inZoneConditionArb = fc.record({
    type: fc.constant('IN_ZONE' as const),
    zone: fc.constantFrom(
      ZoneId.HAND,
      ZoneId.CHARACTER_AREA,
      ZoneId.LEADER_AREA,
      ZoneId.TRASH
    ),
  });

  // Generate an IS_COLOR condition
  const isColorConditionArb = fc.record({
    type: fc.constant('IS_COLOR' as const),
    color: fc.constantFrom('Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'),
  });

  // Generate a simple condition (leaf node)
  const simpleConditionArb = fc.oneof(
    comparisonConditionArb,
    hasKeywordConditionArb,
    inZoneConditionArb,
    isColorConditionArb
  );

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 14.1: Simple comparison conditions evaluate correctly', () => {
    fc.assert(
      fc.property(
        comparisonConditionArb,
        (condition) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const result = effectSystem.checkCondition(condition, context);

          // Manually evaluate the condition
          const left = condition.left;
          const right = condition.right;
          let expected = false;

          switch (condition.operator) {
            case 'EQ':
              expected = left === right;
              break;
            case 'NEQ':
              expected = left !== right;
              break;
            case 'GT':
              expected = left > right;
              break;
            case 'LT':
              expected = left < right;
              break;
            case 'GTE':
              expected = left >= right;
              break;
            case 'LTE':
              expected = left <= right;
              break;
          }

          // The result should match our manual evaluation
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14.2: HAS_KEYWORD conditions evaluate correctly', () => {
    fc.assert(
      fc.property(
        hasKeywordConditionArb,
        fc.array(fc.constantFrom('Rush', 'Blocker', 'DoubleAttack', 'Banish'), { maxLength: 3 }),
        (condition, cardKeywords) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1, [], cardKeywords);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const result = effectSystem.checkCondition(condition, context);

          // The result should be true if the card has the keyword
          const expected = cardKeywords.includes(condition.keyword);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14.3: IN_ZONE conditions evaluate correctly', () => {
    fc.assert(
      fc.property(
        inZoneConditionArb,
        fc.constantFrom(
          ZoneId.HAND,
          ZoneId.CHARACTER_AREA,
          ZoneId.LEADER_AREA,
          ZoneId.TRASH
        ),
        (condition, cardZone) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          card.zone = cardZone;

          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const result = effectSystem.checkCondition(condition, context);

          // The result should be true if the card is in the specified zone
          const expected = cardZone === condition.zone;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14.4: IS_COLOR conditions evaluate correctly', () => {
    fc.assert(
      fc.property(
        isColorConditionArb,
        fc.array(fc.constantFrom('Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'), { 
          minLength: 1, 
          maxLength: 2 
        }),
        (condition, cardColors) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1, [], [], cardColors as Color[]);

          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const result = effectSystem.checkCondition(condition, context);

          // The result should be true if the card has the specified color
          const expected = cardColors.includes(condition.color);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14.5: AND conditions require all operands to be true', () => {
    fc.assert(
      fc.property(
        fc.array(comparisonConditionArb, { minLength: 2, maxLength: 4 }),
        (operands) => {
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
            operands,
          };

          const result = effectSystem.checkCondition(andCondition, context);

          // Manually evaluate each operand
          const operandResults = operands.map(op => effectSystem.checkCondition(op, context));
          const expected = operandResults.every(r => r === true);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14.6: OR conditions require at least one operand to be true', () => {
    fc.assert(
      fc.property(
        fc.array(comparisonConditionArb, { minLength: 2, maxLength: 4 }),
        (operands) => {
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
            operands,
          };

          const result = effectSystem.checkCondition(orCondition, context);

          // Manually evaluate each operand
          const operandResults = operands.map(op => effectSystem.checkCondition(op, context));
          const expected = operandResults.some(r => r === true);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14.7: NOT conditions invert the operand result', () => {
    fc.assert(
      fc.property(
        simpleConditionArb,
        (operand) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          const notCondition: ConditionExpr = {
            type: 'NOT',
            operands: [operand],
          };

          const result = effectSystem.checkCondition(notCondition, context);

          // Manually evaluate the operand
          const operandResult = effectSystem.checkCondition(operand, context);
          const expected = !operandResult;

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14.8: Condition evaluation is deterministic', () => {
    fc.assert(
      fc.property(
        simpleConditionArb,
        (condition) => {
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Evaluate the same condition multiple times
          const result1 = effectSystem.checkCondition(condition, context);
          const result2 = effectSystem.checkCondition(condition, context);
          const result3 = effectSystem.checkCondition(condition, context);

          // All results should be identical
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });
});
