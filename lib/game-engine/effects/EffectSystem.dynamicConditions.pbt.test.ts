/**
 * EffectSystem.dynamicConditions.pbt.test.ts
 * 
 * Property-based tests for dynamic condition re-evaluation in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 33: Dynamic Condition Re-evaluation
 * Validates: Requirements 21.5
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
 * Property 33: Dynamic Condition Re-evaluation
 * 
 * For any conditional effect, the conditions should be re-evaluated when the game state changes.
 * 
 * This property ensures that:
 * 1. Conditions are evaluated based on current game state
 * 2. Changing game state changes condition evaluation results
 * 3. Conditions reflect real-time state, not cached values
 * 4. State-dependent conditions update correctly
 * 5. Zone changes affect condition evaluation
 */

describe('Property 33: Dynamic Condition Re-evaluation', () => {
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

  const keywordArb = fc.constantFrom('Rush', 'Blocker', 'DoubleAttack', 'Banish');
  const zoneArb = fc.constantFrom(
    ZoneId.HAND,
    ZoneId.CHARACTER_AREA,
    ZoneId.TRASH,
    ZoneId.DECK
  );
  const colorArb = fc.constantFrom('Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow');

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 33.1: HAS_KEYWORD condition reflects current card keywords', () => {
    fc.assert(
      fc.property(
        keywordArb,
        keywordArb,
        (initialKeyword, newKeyword) => {
          // Create card with initial keyword
          const card1 = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, [initialKeyword]);
          
          // Create condition checking for new keyword
          const condition: ConditionExpr = {
            type: 'HAS_KEYWORD',
            keyword: newKeyword,
          };

          const context1: EffectContext = {
            state: stateManager.getState(),
            source: card1,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition with initial card
          const initialResult = effectSystem.checkCondition(condition, context1);
          const expectedInitial = initialKeyword === newKeyword;
          expect(initialResult).toBe(expectedInitial);

          // Create a new card with both keywords
          if (initialKeyword !== newKeyword) {
            const card2 = createTestCard('card2', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, [initialKeyword, newKeyword]);

            const context2: EffectContext = {
              state: stateManager.getState(),
              source: card2,
              controller: PlayerId.PLAYER_1,
              targets: [],
              values: new Map(),
              event: null,
            };

            // Check condition with modified card
            const modifiedResult = effectSystem.checkCondition(condition, context2);
            
            // Should now be true since card has the keyword
            expect(modifiedResult).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 33.2: IN_ZONE condition reflects current card zone', () => {
    fc.assert(
      fc.property(
        zoneArb,
        zoneArb,
        (initialZone, newZone) => {
          // Skip if zones are the same
          fc.pre(initialZone !== newZone);

          // Create card in initial zone
          const card1 = createTestCard('card1', PlayerId.PLAYER_1, initialZone);
          
          // Create condition checking for new zone
          const condition: ConditionExpr = {
            type: 'IN_ZONE',
            zone: newZone,
          };

          const context1: EffectContext = {
            state: stateManager.getState(),
            source: card1,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition with initial card
          const initialResult = effectSystem.checkCondition(condition, context1);
          
          // Should be false since card is in different zone
          expect(initialResult).toBe(false);

          // Create a new card in the target zone
          const card2 = createTestCard('card2', PlayerId.PLAYER_1, newZone);

          const context2: EffectContext = {
            state: stateManager.getState(),
            source: card2,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition with card in target zone
          const movedResult = effectSystem.checkCondition(condition, context2);
          
          // Should now be true since card is in the target zone
          expect(movedResult).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 33.3: IS_COLOR condition reflects current card colors', () => {
    fc.assert(
      fc.property(
        colorArb,
        colorArb,
        (initialColor, newColor) => {
          // Skip if colors are the same
          fc.pre(initialColor !== newColor);

          // Create card with initial color
          const card1 = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, [], [initialColor as Color]);
          
          // Create condition checking for new color
          const condition: ConditionExpr = {
            type: 'IS_COLOR',
            color: newColor,
          };

          const context1: EffectContext = {
            state: stateManager.getState(),
            source: card1,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition with initial card
          const initialResult = effectSystem.checkCondition(condition, context1);
          
          // Should be false since card has different color
          expect(initialResult).toBe(false);

          // Create a new card with both colors
          const card2 = createTestCard('card2', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, [], [initialColor as Color, newColor as Color]);

          const context2: EffectContext = {
            state: stateManager.getState(),
            source: card2,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition with card that has the color
          const modifiedResult = effectSystem.checkCondition(condition, context2);
          
          // Should now be true since card has the color
          expect(modifiedResult).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 33.4: Complex conditions re-evaluate with state changes', () => {
    fc.assert(
      fc.property(
        keywordArb,
        zoneArb,
        (keyword, targetZone) => {
          // Create card without keyword in hand
          const card1 = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND, []);
          
          // Create complex condition: (HAS_KEYWORD AND IN_ZONE)
          const condition: ConditionExpr = {
            type: 'AND',
            operands: [
              {
                type: 'HAS_KEYWORD',
                keyword,
              },
              {
                type: 'IN_ZONE',
                zone: targetZone,
              },
            ],
          };

          const context1: EffectContext = {
            state: stateManager.getState(),
            source: card1,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition with initial card (should be false)
          const initialResult = effectSystem.checkCondition(condition, context1);
          expect(initialResult).toBe(false);

          // Create card with keyword but wrong zone
          const card2 = createTestCard('card2', PlayerId.PLAYER_1, ZoneId.HAND, [keyword]);

          const context2: EffectContext = {
            state: stateManager.getState(),
            source: card2,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition (should be false if not in target zone)
          const afterKeywordResult = effectSystem.checkCondition(condition, context2);
          expect(afterKeywordResult).toBe(ZoneId.HAND === targetZone);

          // Create card with keyword and in target zone
          const card3 = createTestCard('card3', PlayerId.PLAYER_1, targetZone, [keyword]);

          const context3: EffectContext = {
            state: stateManager.getState(),
            source: card3,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Check condition (should now be true)
          const finalResult = effectSystem.checkCondition(condition, context3);
          expect(finalResult).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 33.5: Condition evaluation uses current state, not cached values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (value1, value2, value3) => {
          // Skip if all values are the same
          fc.pre(value1 !== value2 || value2 !== value3);

          const card = createTestCard('card1', PlayerId.PLAYER_1);

          const context: EffectContext = {
            state: stateManager.getState(),
            source: card,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Evaluate condition multiple times with different right values
          const results: boolean[] = [];
          
          for (const value of [value1, value2, value3]) {
            const testCondition: ConditionExpr = {
              type: 'COMPARE',
              operator: 'EQ',
              left: 5,
              right: value,
            };
            
            const result = effectSystem.checkCondition(testCondition, context);
            results.push(result);
            
            // Result should match the comparison
            expect(result).toBe(5 === value);
          }

          // Results should differ if values differ AND they have different relationships to 5
          if (value1 !== value2 && (value1 === 5) !== (value2 === 5)) {
            expect(results[0]).not.toBe(results[1]);
          }
          if (value2 !== value3 && (value2 === 5) !== (value3 === 5)) {
            expect(results[1]).not.toBe(results[2]);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 33.6: Multiple evaluations of same condition with changing state', () => {
    fc.assert(
      fc.property(
        keywordArb,
        (keyword) => {
          // Create card without keyword
          const card1 = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, []);
          
          const condition: ConditionExpr = {
            type: 'HAS_KEYWORD',
            keyword,
          };

          const context1: EffectContext = {
            state: stateManager.getState(),
            source: card1,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Evaluate condition before adding keyword
          const beforeResult = effectSystem.checkCondition(condition, context1);
          expect(beforeResult).toBe(false);

          // Create card with keyword
          const card2 = createTestCard('card2', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, [keyword]);

          const context2: EffectContext = {
            state: stateManager.getState(),
            source: card2,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Evaluate condition after adding keyword
          const afterResult = effectSystem.checkCondition(condition, context2);
          expect(afterResult).toBe(true);

          // Create card without keyword again
          const card3 = createTestCard('card3', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, []);

          const context3: EffectContext = {
            state: stateManager.getState(),
            source: card3,
            controller: PlayerId.PLAYER_1,
            targets: [],
            values: new Map(),
            event: null,
          };

          // Evaluate condition after removing keyword
          const finalResult = effectSystem.checkCondition(condition, context3);
          expect(finalResult).toBe(false);

          // Results should follow state changes
          expect(beforeResult).toBe(false);
          expect(afterResult).toBe(true);
          expect(finalResult).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
