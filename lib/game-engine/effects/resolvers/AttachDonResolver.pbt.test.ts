/**
 * AttachDonResolver.pbt.test.ts
 * 
 * Property-based tests for DON attachment effects.
 * 
 * **Feature: ai-battle-integration, Property 46: DON Power Bonus**
 * **Validates: Requirements 31.4**
 * 
 * Property: For any DON attached to a character, the character's power should increase by 1000.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { AttachDonResolver } from './AttachDonResolver';
import {
  GameState,
  PlayerId,
  CardCategory,
  ZoneId,
  CardState,
  CardInstance,
  DonInstance,
  EffectTimingType,
} from '../../core/types';
import { EffectInstance, EffectType, TargetType } from '../types';
import { createInitialGameState } from '../../core/GameState';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a test card instance
 */
function createTestCard(
  id: string,
  owner: PlayerId,
  category: CardCategory = CardCategory.CHARACTER,
  basePower: number = 5000,
  baseCost: number = 4
): CardInstance {
  return {
    id,
    definition: {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category,
      color: 'Red',
      baseCost,
      basePower,
      effects: [],
    },
    owner,
    controller: owner,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

/**
 * Create a test DON instance
 */
function createTestDon(id: string, owner: PlayerId, zone: ZoneId = ZoneId.COST_AREA): DonInstance {
  return {
    id,
    owner,
    zone,
  };
}

/**
 * Calculate the current power of a card including DON bonuses
 */
function calculateCardPower(card: CardInstance): number {
  let power = card.definition.basePower || 0;
  
  // Add power from modifiers
  if (card.modifiers && Array.isArray(card.modifiers)) {
    for (const modifier of card.modifiers) {
      if (modifier.type === 'POWER') {
        power += modifier.value;
      }
    }
  }
  
  // Add power from attached DON (1000 per DON)
  if (card.givenDon && Array.isArray(card.givenDon)) {
    power += card.givenDon.length * 1000;
  }
  
  return power;
}

/**
 * Find a card by ID in the game state
 */
function findCard(cardId: string, state: GameState): CardInstance | null {
  const players: any[] = state.players instanceof Map 
    ? Array.from(state.players.values())
    : Object.values(state.players);

  for (const player of players) {
    if (!player || !player.zones) continue;

    // Check leader area
    if (player.zones.leaderArea?.id === cardId) {
      return player.zones.leaderArea;
    }

    // Check all array zones
    const zones: any[] = [
      player.zones.deck,
      player.zones.hand,
      player.zones.trash,
      player.zones.life,
      player.zones.characterArea || [],
      player.zones.stageArea ? [player.zones.stageArea] : [],
    ];

    for (const zone of zones) {
      if (!zone) continue;
      if (Array.isArray(zone)) {
        const card = zone.find((c: any) => c.id === cardId);
        if (card) return card;
      }
    }
  }

  return null;
}

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('AttachDonResolver - Property-Based Tests', () => {
  let resolver: AttachDonResolver;
  let initialState: GameState;

  beforeEach(() => {
    resolver = new AttachDonResolver();
    initialState = createInitialGameState();
  });

  describe('Property 46: DON Power Bonus', () => {
    it('should increase character power by 1000 for each attached DON', () => {
      fc.assert(
        fc.property(
          // Generate random number of DON to attach (1-10)
          fc.integer({ min: 1, max: 10 }),
          // Generate random base power for character
          fc.integer({ min: 1000, max: 10000 }),
          (donCount, basePower) => {
            // Setup: Create a fresh state for this test run
            const testState = createInitialGameState();
            
            // Create a character with the specified base power
            const character = createTestCard('char1', PlayerId.PLAYER_1, CardCategory.CHARACTER, basePower);
            
            // Add character to player's character area
            const player1 = testState.players.get(PlayerId.PLAYER_1)!;
            player1.zones.characterArea.push(character);
            
            // Add DON to player's cost area
            for (let i = 0; i < donCount; i++) {
              const don = createTestDon(`don${i}`, PlayerId.PLAYER_1, ZoneId.COST_AREA);
              player1.zones.costArea.push(don);
            }
            
            // Calculate initial power
            const initialPower = calculateCardPower(character);
            expect(initialPower).toBe(basePower); // Should be just base power initially
            
            // Create effect instance to attach DON
            const effect: EffectInstance = {
              id: 'effect1',
              definition: {
                id: 'def1',
                sourceCardId: 'source1',
                label: '[On Play]',
                timingType: EffectTimingType.AUTO,
                triggerTiming: null,
                condition: null,
                cost: null,
                effectType: EffectType.ATTACH_DON,
                parameters: {
                  value: donCount, // Attach all DON
                },
                oncePerTurn: false,
                usedThisTurn: false,
              },
              sourceCardId: 'source1',
              controller: PlayerId.PLAYER_1,
              targets: [
                {
                  type: TargetType.CARD,
                  cardId: character.id,
                },
              ],
              chosenValues: new Map(),
              timestamp: Date.now(),
              resolved: false,
            };
            
            // Execute: Resolve the effect
            const newState = resolver.resolve(effect, testState);
            
            // Verify: Find the character in the new state
            const updatedCharacter = findCard(character.id, newState);
            expect(updatedCharacter).not.toBeNull();
            
            if (updatedCharacter) {
              // Calculate new power
              const newPower = calculateCardPower(updatedCharacter);
              
              // Property: Power should increase by exactly 1000 per DON attached
              const expectedPower = basePower + (donCount * 1000);
              expect(newPower).toBe(expectedPower);
              
              // Verify DON are actually attached
              expect(updatedCharacter.givenDon.length).toBe(donCount);
              
              // Verify DON were removed from cost area
              const updatedPlayer = newState.players.get(PlayerId.PLAYER_1)!;
              expect(updatedPlayer.zones.costArea.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain power bonus when multiple DON are attached sequentially', () => {
      fc.assert(
        fc.property(
          // Generate array of DON attachment counts (1-3 DON per attachment, 2-5 attachments)
          fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 2, maxLength: 5 }),
          // Generate random base power
          fc.integer({ min: 2000, max: 8000 }),
          (attachmentCounts, basePower) => {
            // Setup: Create a fresh state for this test run
            const testState = createInitialGameState();
            
            // Create a character
            const character = createTestCard('char1', PlayerId.PLAYER_1, CardCategory.CHARACTER, basePower);
            
            const player1 = testState.players.get(PlayerId.PLAYER_1)!;
            player1.zones.characterArea.push(character);
            
            // Calculate total DON needed
            const totalDon = attachmentCounts.reduce((sum, count) => sum + count, 0);
            
            // Add DON to cost area
            for (let i = 0; i < totalDon; i++) {
              const don = createTestDon(`don${i}`, PlayerId.PLAYER_1, ZoneId.COST_AREA);
              player1.zones.costArea.push(don);
            }
            
            let currentState = testState;
            let expectedDonCount = 0;
            
            // Execute: Attach DON in multiple batches
            for (const count of attachmentCounts) {
              const effect: EffectInstance = {
                id: `effect${expectedDonCount}`,
                definition: {
                  id: `def${expectedDonCount}`,
                  sourceCardId: 'source1',
                  label: '[On Play]',
                  timingType: EffectTimingType.AUTO,
                  triggerTiming: null,
                  condition: null,
                  cost: null,
                  effectType: EffectType.ATTACH_DON,
                  parameters: {
                    value: count,
                  },
                  oncePerTurn: false,
                  usedThisTurn: false,
                },
                sourceCardId: 'source1',
                controller: PlayerId.PLAYER_1,
                targets: [
                  {
                    type: TargetType.CARD,
                    cardId: character.id,
                  },
                ],
                chosenValues: new Map(),
                timestamp: Date.now(),
                resolved: false,
              };
              
              currentState = resolver.resolve(effect, currentState);
              expectedDonCount += count;
              
              // Verify after each attachment
              const updatedCharacter = findCard(character.id, currentState);
              expect(updatedCharacter).not.toBeNull();
              
              if (updatedCharacter) {
                const currentPower = calculateCardPower(updatedCharacter);
                const expectedPower = basePower + (expectedDonCount * 1000);
                
                // Property: Power should accumulate correctly with each attachment
                expect(currentPower).toBe(expectedPower);
                expect(updatedCharacter.givenDon.length).toBe(expectedDonCount);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle attaching DON to multiple characters independently', () => {
      fc.assert(
        fc.property(
          // Generate 2-4 characters with different DON counts
          fc.array(
            fc.record({
              basePower: fc.integer({ min: 2000, max: 8000 }),
              donCount: fc.integer({ min: 1, max: 5 }),
            }),
            { minLength: 2, maxLength: 4 }
          ),
          (characterConfigs) => {
            // Setup: Create a fresh state for this test run
            const testState = createInitialGameState();
            
            // Create multiple characters
            const characters: CardInstance[] = [];
            const player1 = testState.players.get(PlayerId.PLAYER_1)!;
            
            // Calculate total DON needed
            const totalDon = characterConfigs.reduce((sum, config) => sum + config.donCount, 0);
            
            // Add DON to cost area
            for (let i = 0; i < totalDon; i++) {
              const don = createTestDon(`don${i}`, PlayerId.PLAYER_1, ZoneId.COST_AREA);
              player1.zones.costArea.push(don);
            }
            
            // Create characters
            characterConfigs.forEach((config, index) => {
              const character = createTestCard(
                `char${index}`,
                PlayerId.PLAYER_1,
                CardCategory.CHARACTER,
                config.basePower
              );
              characters.push(character);
              player1.zones.characterArea.push(character);
            });
            
            let currentState = testState;
            
            // Execute: Attach DON to each character
            characterConfigs.forEach((config, index) => {
              const effect: EffectInstance = {
                id: `effect${index}`,
                definition: {
                  id: `def${index}`,
                  sourceCardId: 'source1',
                  label: '[On Play]',
                  timingType: EffectTimingType.AUTO,
                  triggerTiming: null,
                  condition: null,
                  cost: null,
                  effectType: EffectType.ATTACH_DON,
                  parameters: {
                    value: config.donCount,
                  },
                  oncePerTurn: false,
                  usedThisTurn: false,
                },
                sourceCardId: 'source1',
                controller: PlayerId.PLAYER_1,
                targets: [
                  {
                    type: TargetType.CARD,
                    cardId: characters[index].id,
                  },
                ],
                chosenValues: new Map(),
                timestamp: Date.now(),
                resolved: false,
              };
              
              currentState = resolver.resolve(effect, currentState);
            });
            
            // Verify: Each character should have correct power
            characterConfigs.forEach((config, index) => {
              const updatedCharacter = findCard(characters[index].id, currentState);
              expect(updatedCharacter).not.toBeNull();
              
              if (updatedCharacter) {
                const currentPower = calculateCardPower(updatedCharacter);
                const expectedPower = config.basePower + (config.donCount * 1000);
                
                // Property: Each character's power should be independent
                expect(currentPower).toBe(expectedPower);
                expect(updatedCharacter.givenDon.length).toBe(config.donCount);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not attach more DON than available in cost area', () => {
      fc.assert(
        fc.property(
          // Generate available DON count and requested DON count
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 3000, max: 7000 }),
          (availableDon, requestedDon, basePower) => {
            // Setup: Create a fresh state for this test run
            const testState = createInitialGameState();
            
            // Create a character
            const character = createTestCard('char1', PlayerId.PLAYER_1, CardCategory.CHARACTER, basePower);
            
            const player1 = testState.players.get(PlayerId.PLAYER_1)!;
            player1.zones.characterArea.push(character);
            
            // Add limited DON to cost area
            for (let i = 0; i < availableDon; i++) {
              const don = createTestDon(`don${i}`, PlayerId.PLAYER_1, ZoneId.COST_AREA);
              player1.zones.costArea.push(don);
            }
            
            // Create effect requesting more DON than available
            const effect: EffectInstance = {
              id: 'effect1',
              definition: {
                id: 'def1',
                sourceCardId: 'source1',
                label: '[On Play]',
                timingType: EffectTimingType.AUTO,
                triggerTiming: null,
                condition: null,
                cost: null,
                effectType: EffectType.ATTACH_DON,
                parameters: {
                  value: requestedDon,
                },
                oncePerTurn: false,
                usedThisTurn: false,
              },
              sourceCardId: 'source1',
              controller: PlayerId.PLAYER_1,
              targets: [
                {
                  type: TargetType.CARD,
                  cardId: character.id,
                },
              ],
              chosenValues: new Map(),
              timestamp: Date.now(),
              resolved: false,
            };
            
            // Execute
            const newState = resolver.resolve(effect, testState);
            
            // Verify: Should only attach available DON
            const updatedCharacter = findCard(character.id, newState);
            expect(updatedCharacter).not.toBeNull();
            
            if (updatedCharacter) {
              const actualAttached = Math.min(availableDon, requestedDon);
              const expectedPower = basePower + (actualAttached * 1000);
              const currentPower = calculateCardPower(updatedCharacter);
              
              // Property: Should attach min(available, requested) DON
              expect(currentPower).toBe(expectedPower);
              expect(updatedCharacter.givenDon.length).toBe(actualAttached);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
