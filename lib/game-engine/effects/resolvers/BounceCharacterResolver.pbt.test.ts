/**
 * BounceCharacterResolver.pbt.test.ts
 * 
 * Property-based tests for the BounceCharacterResolver.
 * 
 * **Feature: ai-battle-integration, Property 23: Card Zone Update on Effect**
 * **Validates: Requirements 16.5**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BounceCharacterResolver } from './BounceCharacterResolver';
import { EffectInstance, EffectType } from '../types';
import { 
  GameState, 
  PlayerId, 
  Phase, 
  ZoneId, 
  CardCategory, 
  CardState,
  Color,
  CardInstance,
  CardDefinition,
  ModifierType,
  ModifierDuration,
  EffectTimingType,
} from '../../core/types';

describe('BounceCharacterResolver - Property-Based Tests', () => {
  /**
   * Property 23: Card Zone Update on Effect
   * 
   * For any effect that moves cards, the affected cards should be in the 
   * correct zones after resolution.
   * 
   * This property tests that when a bounce effect is resolved:
   * 1. Target characters are moved from CHARACTER_AREA to HAND
   * 2. The cards are in the owner's hand zone
   * 3. The cards are no longer in the character area
   * 4. Modifiers and attached DON are cleared
   */
  it('Property 23: bounced characters should be in owner hand zone', () => {
    fc.assert(
      fc.property(
        // Generate a character in the character area with optional modifiers and DON
        fc.record({
          cardId: fc.string({ minLength: 5, maxLength: 20 }),
          ownerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
          basePower: fc.integer({ min: 1000, max: 10000 }),
          baseCost: fc.integer({ min: 1, max: 10 }),
          hasModifiers: fc.boolean(),
          modifierValue: fc.integer({ min: -3000, max: 3000 }),
          hasDon: fc.boolean(),
          donCount: fc.integer({ min: 0, max: 3 }),
        }),
        (testData) => {
          // Create a minimal game state with the character in play
          const characterCard: CardInstance = {
            id: testData.cardId,
            definition: {
              id: 'char-def-1',
              name: 'Test Character',
              category: CardCategory.CHARACTER,
              colors: [Color.RED],
              typeTags: [],
              attributes: [],
              basePower: testData.basePower,
              baseCost: testData.baseCost,
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
            } as CardDefinition,
            owner: testData.ownerId,
            controller: testData.ownerId,
            zone: ZoneId.CHARACTER_AREA,
            state: CardState.ACTIVE,
            modifiers: testData.hasModifiers ? [{
              id: 'mod-1',
              type: ModifierType.POWER,
              value: testData.modifierValue,
              duration: ModifierDuration.UNTIL_END_OF_TURN,
              source: 'effect-source',
              timestamp: Date.now(),
            }] : [],
            givenDon: testData.hasDon ? Array.from({ length: testData.donCount }, (_, i) => ({
              id: `don-${i}`,
              owner: testData.ownerId,
              zone: ZoneId.COST_AREA,
              state: CardState.RESTED,
            })) : [],
            flags: new Map(),
          };

          const state: GameState = {
            players: new Map([
              [PlayerId.PLAYER_1, {
                id: PlayerId.PLAYER_1,
                zones: {
                  deck: [],
                  hand: [],
                  trash: [],
                  life: [],
                  donDeck: [],
                  costArea: [],
                  leaderArea: null,
                  characterArea: testData.ownerId === PlayerId.PLAYER_1 ? [characterCard] : [],
                  stageArea: null,
                },
                flags: new Map(),
              }],
              [PlayerId.PLAYER_2, {
                id: PlayerId.PLAYER_2,
                zones: {
                  deck: [],
                  hand: [],
                  trash: [],
                  life: [],
                  donDeck: [],
                  costArea: [],
                  leaderArea: null,
                  characterArea: testData.ownerId === PlayerId.PLAYER_2 ? [characterCard] : [],
                  stageArea: null,
                },
                flags: new Map(),
              }],
            ]),
            activePlayer: PlayerId.PLAYER_1,
            phase: Phase.MAIN,
            turnNumber: 1,
            pendingTriggers: [],
            gameOver: false,
            winner: null,
            history: [],
            loopGuardState: {
              stateHashes: new Map(),
              maxRepeats: 3,
            },
            attackedThisTurn: new Set(),
          };

          // Create the bounce effect
          const effect: EffectInstance = {
            id: 'effect-1',
            definition: {
              id: 'effect-def-1',
              sourceCardId: 'source-card',
              label: '[On Play]',
              timingType: EffectTimingType.AUTO,
              triggerTiming: null,
              condition: null,
              cost: null,
              effectType: EffectType.BOUNCE_CHARACTER,
              parameters: {
                // No power/cost restrictions for this test
              },
              oncePerTurn: false,
              usedThisTurn: false,
            },
            sourceCardId: 'source-card',
            controller: testData.ownerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1,
            targets: [{
              type: 'CARD',
              cardId: testData.cardId,
            }],
            chosenValues: new Map(),
            timestamp: Date.now(),
            resolved: false,
          };

          // Resolve the bounce effect
          const resolver = new BounceCharacterResolver();
          const newState = resolver.resolve(effect, state);

          // Get the owner's zones
          const owner = newState.players.get(testData.ownerId);
          expect(owner).toBeDefined();

          // Property: The card should be in the owner's hand
          const cardInHand = owner!.zones.hand.find(c => c.id === testData.cardId);
          expect(cardInHand).toBeDefined();
          expect(cardInHand?.zone).toBe(ZoneId.HAND);

          // Property: The card should NOT be in the character area
          const cardInCharArea = owner!.zones.characterArea.find(c => c.id === testData.cardId);
          expect(cardInCharArea).toBeUndefined();

          // Property: The card should have no modifiers after bouncing
          expect(cardInHand?.modifiers).toHaveLength(0);

          // Property: The card should have no attached DON after bouncing
          expect(cardInHand?.givenDon).toHaveLength(0);

          // Property: The card should have state NONE (cards in hand have no state)
          expect(cardInHand?.state).toBe(CardState.NONE);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Bounce respects power constraints
   * 
   * For any bounce effect with maxPower constraint, only characters with
   * power <= maxPower should be bounced.
   */
  it('Property: bounce respects power constraints', () => {
    fc.assert(
      fc.property(
        fc.record({
          cardId: fc.string({ minLength: 5, maxLength: 20 }),
          ownerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
          basePower: fc.integer({ min: 1000, max: 10000 }),
          maxPower: fc.integer({ min: 1000, max: 10000 }),
        }),
        (testData) => {
          const characterCard: CardInstance = {
            id: testData.cardId,
            definition: {
              id: 'char-def-1',
              name: 'Test Character',
              category: CardCategory.CHARACTER,
              colors: [Color.RED],
              typeTags: [],
              attributes: [],
              basePower: testData.basePower,
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
            } as CardDefinition,
            owner: testData.ownerId,
            controller: testData.ownerId,
            zone: ZoneId.CHARACTER_AREA,
            state: CardState.ACTIVE,
            modifiers: [],
            givenDon: [],
            flags: new Map(),
          };

          const state: GameState = {
            players: new Map([
              [PlayerId.PLAYER_1, {
                id: PlayerId.PLAYER_1,
                zones: {
                  deck: [],
                  hand: [],
                  trash: [],
                  life: [],
                  donDeck: [],
                  costArea: [],
                  leaderArea: null,
                  characterArea: testData.ownerId === PlayerId.PLAYER_1 ? [characterCard] : [],
                  stageArea: null,
                },
                flags: new Map(),
              }],
              [PlayerId.PLAYER_2, {
                id: PlayerId.PLAYER_2,
                zones: {
                  deck: [],
                  hand: [],
                  trash: [],
                  life: [],
                  donDeck: [],
                  costArea: [],
                  leaderArea: null,
                  characterArea: testData.ownerId === PlayerId.PLAYER_2 ? [characterCard] : [],
                  stageArea: null,
                },
                flags: new Map(),
              }],
            ]),
            activePlayer: PlayerId.PLAYER_1,
            phase: Phase.MAIN,
            turnNumber: 1,
            pendingTriggers: [],
            gameOver: false,
            winner: null,
            history: [],
            loopGuardState: {
              stateHashes: new Map(),
              maxRepeats: 3,
            },
            attackedThisTurn: new Set(),
          };

          const effect: EffectInstance = {
            id: 'effect-1',
            definition: {
              id: 'effect-def-1',
              sourceCardId: 'source-card',
              label: '[On Play]',
              timingType: EffectTimingType.AUTO,
              triggerTiming: null,
              condition: null,
              cost: null,
              effectType: EffectType.BOUNCE_CHARACTER,
              parameters: {
                maxPower: testData.maxPower,
              },
              oncePerTurn: false,
              usedThisTurn: false,
            },
            sourceCardId: 'source-card',
            controller: testData.ownerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1,
            targets: [{
              type: 'CARD',
              cardId: testData.cardId,
            }],
            chosenValues: new Map(),
            timestamp: Date.now(),
            resolved: false,
          };

          const resolver = new BounceCharacterResolver();
          const newState = resolver.resolve(effect, state);

          const owner = newState.players.get(testData.ownerId);
          expect(owner).toBeDefined();

          // Property: If basePower <= maxPower, card should be in hand
          // If basePower > maxPower, card should still be in character area
          if (testData.basePower <= testData.maxPower) {
            const cardInHand = owner!.zones.hand.find(c => c.id === testData.cardId);
            expect(cardInHand).toBeDefined();
            
            const cardInCharArea = owner!.zones.characterArea.find(c => c.id === testData.cardId);
            expect(cardInCharArea).toBeUndefined();
          } else {
            const cardInCharArea = owner!.zones.characterArea.find(c => c.id === testData.cardId);
            expect(cardInCharArea).toBeDefined();
            
            const cardInHand = owner!.zones.hand.find(c => c.id === testData.cardId);
            expect(cardInHand).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Bounce respects cost constraints
   * 
   * For any bounce effect with maxCost constraint, only characters with
   * cost <= maxCost should be bounced.
   */
  it('Property: bounce respects cost constraints', () => {
    fc.assert(
      fc.property(
        fc.record({
          cardId: fc.string({ minLength: 5, maxLength: 20 }),
          ownerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
          baseCost: fc.integer({ min: 1, max: 10 }),
          maxCost: fc.integer({ min: 1, max: 10 }),
        }),
        (testData) => {
          const characterCard: CardInstance = {
            id: testData.cardId,
            definition: {
              id: 'char-def-1',
              name: 'Test Character',
              category: CardCategory.CHARACTER,
              colors: [Color.RED],
              typeTags: [],
              attributes: [],
              basePower: 5000,
              baseCost: testData.baseCost,
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
            } as CardDefinition,
            owner: testData.ownerId,
            controller: testData.ownerId,
            zone: ZoneId.CHARACTER_AREA,
            state: CardState.ACTIVE,
            modifiers: [],
            givenDon: [],
            flags: new Map(),
          };

          const state: GameState = {
            players: new Map([
              [PlayerId.PLAYER_1, {
                id: PlayerId.PLAYER_1,
                zones: {
                  deck: [],
                  hand: [],
                  trash: [],
                  life: [],
                  donDeck: [],
                  costArea: [],
                  leaderArea: null,
                  characterArea: testData.ownerId === PlayerId.PLAYER_1 ? [characterCard] : [],
                  stageArea: null,
                },
                flags: new Map(),
              }],
              [PlayerId.PLAYER_2, {
                id: PlayerId.PLAYER_2,
                zones: {
                  deck: [],
                  hand: [],
                  trash: [],
                  life: [],
                  donDeck: [],
                  costArea: [],
                  leaderArea: null,
                  characterArea: testData.ownerId === PlayerId.PLAYER_2 ? [characterCard] : [],
                  stageArea: null,
                },
                flags: new Map(),
              }],
            ]),
            activePlayer: PlayerId.PLAYER_1,
            phase: Phase.MAIN,
            turnNumber: 1,
            pendingTriggers: [],
            gameOver: false,
            winner: null,
            history: [],
            loopGuardState: {
              stateHashes: new Map(),
              maxRepeats: 3,
            },
            attackedThisTurn: new Set(),
          };

          const effect: EffectInstance = {
            id: 'effect-1',
            definition: {
              id: 'effect-def-1',
              sourceCardId: 'source-card',
              label: '[On Play]',
              timingType: EffectTimingType.AUTO,
              triggerTiming: null,
              condition: null,
              cost: null,
              effectType: EffectType.BOUNCE_CHARACTER,
              parameters: {
                maxCost: testData.maxCost,
              },
              oncePerTurn: false,
              usedThisTurn: false,
            },
            sourceCardId: 'source-card',
            controller: testData.ownerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1,
            targets: [{
              type: 'CARD',
              cardId: testData.cardId,
            }],
            chosenValues: new Map(),
            timestamp: Date.now(),
            resolved: false,
          };

          const resolver = new BounceCharacterResolver();
          const newState = resolver.resolve(effect, state);

          const owner = newState.players.get(testData.ownerId);
          expect(owner).toBeDefined();

          // Property: If baseCost <= maxCost, card should be in hand
          // If baseCost > maxCost, card should still be in character area
          if (testData.baseCost <= testData.maxCost) {
            const cardInHand = owner!.zones.hand.find(c => c.id === testData.cardId);
            expect(cardInHand).toBeDefined();
            
            const cardInCharArea = owner!.zones.characterArea.find(c => c.id === testData.cardId);
            expect(cardInCharArea).toBeUndefined();
          } else {
            const cardInCharArea = owner!.zones.characterArea.find(c => c.id === testData.cardId);
            expect(cardInCharArea).toBeDefined();
            
            const cardInHand = owner!.zones.hand.find(c => c.id === testData.cardId);
            expect(cardInHand).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
