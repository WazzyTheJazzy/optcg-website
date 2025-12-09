/**
 * PowerModificationResolver.pbt.test.ts
 * 
 * Property-based tests for PowerModificationResolver
 * 
 * Feature: ai-battle-integration, Property 22: Power Modifier Duration
 * Validates: Requirements 16.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PowerModificationResolver } from './PowerModificationResolver';
import { createInitialGameState } from '../../core/GameState';
import {
  EffectInstance,
  EffectDefinition,
  EffectType,
  Target,
  TargetType,
} from '../types';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  CardDefinition,
  CardInstance,
  ModifierDuration,
  ModifierType,
  GameState,
} from '../../core/types';

/**
 * Property 22: Power Modifier Duration
 * 
 * For any power modification effect, the modifier should persist for exactly 
 * the specified duration and then be removed.
 * 
 * This property ensures that:
 * 1. Modifiers are created with the correct duration
 * 2. Modifiers are applied to the correct target cards
 * 3. Positive and negative power changes work correctly
 * 4. Multiple modifiers can coexist on the same card
 * 5. Modifiers have proper metadata (source, timestamp)
 */

describe('Property 22: Power Modifier Duration', () => {
  let resolver: PowerModificationResolver;
  let initialState: GameState;

  // Helper to create a test card
  const createTestCard = (
    id: string,
    playerId: PlayerId,
    basePower: number = 5000,
    baseCost: number = 3,
    zone: ZoneId = ZoneId.CHARACTER_AREA
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower,
      baseCost,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
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

  // Helper to create an effect definition
  const createEffectDefinition = (
    id: string,
    sourceCardId: string,
    powerChange: number,
    duration: ModifierDuration
  ): EffectDefinition => {
    return {
      id,
      sourceCardId,
      label: '[Test]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      condition: null,
      cost: null,
      effectType: EffectType.POWER_MODIFICATION,
      parameters: {
        powerChange,
        duration,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };
  };

  // Helper to create an effect instance
  const createEffectInstance = (
    id: string,
    definition: EffectDefinition,
    sourceCardId: string,
    controller: PlayerId,
    targets: Target[] = []
  ): EffectInstance => {
    return {
      id,
      definition,
      sourceCardId,
      controller,
      targets,
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };
  };

  // Helper to add a card to the game state
  const addCardToState = (state: GameState, card: CardInstance): GameState => {
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    
    // Reconstruct the Map since JSON.parse doesn't preserve Maps
    const playersMap = new Map<PlayerId, any>();
    if (state.players instanceof Map) {
      state.players.forEach((player, id) => {
        playersMap.set(id, JSON.parse(JSON.stringify(player)));
      });
    }
    newState.players = playersMap;
    
    const player = newState.players.get(card.controller);
    if (!player) {
      throw new Error(`Player ${card.controller} not found in state`);
    }
    
    if (card.zone === ZoneId.LEADER_AREA) {
      player.zones.leaderArea = card;
    } else if (card.zone === ZoneId.CHARACTER_AREA) {
      if (!player.zones.characterArea) {
        player.zones.characterArea = [];
      }
      player.zones.characterArea.push(card);
    } else if (card.zone === ZoneId.HAND) {
      player.zones.hand.push(card);
    }
    
    return newState;
  };

  beforeEach(() => {
    resolver = new PowerModificationResolver();
    initialState = createInitialGameState();
  });

  // ============================================================================
  // Arbitraries for generating test data
  // ============================================================================

  const powerChangeArb = fc.integer({ min: -5000, max: 5000 });

  const durationArb = fc.constantFrom(
    ModifierDuration.PERMANENT,
    ModifierDuration.UNTIL_END_OF_TURN,
    ModifierDuration.UNTIL_END_OF_BATTLE,
    ModifierDuration.DURING_THIS_TURN
  );

  const playerIdArb = fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2);

  const cardIdArb = fc.string({ minLength: 5, maxLength: 20 });

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 22.1: Modifiers are created with the specified duration', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerChangeArb,
        durationArb,
        playerIdArb,
        (cardId, powerChange, duration, playerId) => {
          // Create a card and add it to the state
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          // Create effect targeting this card
          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            powerChange,
            duration
          );
          const target: Target = {
            type: TargetType.CARD,
            cardId: card.id,
          };
          const effectInstance = createEffectInstance(
            'instance-1',
            effectDef,
            'source-card',
            playerId,
            [target]
          );

          // Resolve the effect
          const resultState = resolver.resolve(effectInstance, stateWithCard);

          // Find the card in the result state
          const player = resultState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === cardId);

          // Card should exist and have a modifier
          expect(resultCard).toBeDefined();
          expect(resultCard!.modifiers.length).toBe(1);

          // Modifier should have the correct duration
          const modifier = resultCard!.modifiers[0];
          expect(modifier.duration).toBe(duration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22.2: Modifiers have correct power change value', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerChangeArb,
        durationArb,
        playerIdArb,
        (cardId, powerChange, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            powerChange,
            duration
          );
          const target: Target = {
            type: TargetType.CARD,
            cardId: card.id,
          };
          const effectInstance = createEffectInstance(
            'instance-1',
            effectDef,
            'source-card',
            playerId,
            [target]
          );

          const resultState = resolver.resolve(effectInstance, stateWithCard);

          const player = resultState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === cardId);

          expect(resultCard).toBeDefined();
          expect(resultCard!.modifiers.length).toBe(1);

          const modifier = resultCard!.modifiers[0];
          expect(modifier.type).toBe(ModifierType.POWER);
          expect(modifier.value).toBe(powerChange);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22.3: Modifiers track their source card', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        cardIdArb,
        powerChangeArb,
        durationArb,
        playerIdArb,
        (targetCardId, sourceCardId, powerChange, duration, playerId) => {
          fc.pre(targetCardId !== sourceCardId); // Ensure different IDs

          const card = createTestCard(targetCardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            sourceCardId,
            powerChange,
            duration
          );
          const target: Target = {
            type: TargetType.CARD,
            cardId: card.id,
          };
          const effectInstance = createEffectInstance(
            'instance-1',
            effectDef,
            sourceCardId,
            playerId,
            [target]
          );

          const resultState = resolver.resolve(effectInstance, stateWithCard);

          const player = resultState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === targetCardId);

          expect(resultCard).toBeDefined();
          expect(resultCard!.modifiers.length).toBe(1);

          const modifier = resultCard!.modifiers[0];
          expect(modifier.source).toBe(sourceCardId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22.4: Multiple modifiers can coexist on the same card', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        fc.array(powerChangeArb, { minLength: 2, maxLength: 5 }),
        durationArb,
        playerIdArb,
        (cardId, powerChanges, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          let currentState = addCardToState(initialState, card);

          // Apply multiple power modifications
          for (let i = 0; i < powerChanges.length; i++) {
            const effectDef = createEffectDefinition(
              `effect-${i}`,
              `source-${i}`,
              powerChanges[i],
              duration
            );
            const target: Target = {
              type: TargetType.CARD,
              cardId: card.id,
            };
            const effectInstance = createEffectInstance(
              `instance-${i}`,
              effectDef,
              `source-${i}`,
              playerId,
              [target]
            );

            currentState = resolver.resolve(effectInstance, currentState);
          }

          // Find the card in the final state
          const player = currentState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === cardId);

          expect(resultCard).toBeDefined();
          expect(resultCard!.modifiers.length).toBe(powerChanges.length);

          // Each modifier should have the correct value
          for (let i = 0; i < powerChanges.length; i++) {
            const modifier = resultCard!.modifiers[i];
            expect(modifier.value).toBe(powerChanges[i]);
            expect(modifier.duration).toBe(duration);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 22.5: Positive and negative power changes both work', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        fc.integer({ min: 1, max: 5000 }),
        durationArb,
        playerIdArb,
        (cardId, absolutePowerChange, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          let currentState = addCardToState(initialState, card);

          // Apply positive power change
          const positiveDef = createEffectDefinition(
            'effect-positive',
            'source-positive',
            absolutePowerChange,
            duration
          );
          const target: Target = {
            type: TargetType.CARD,
            cardId: card.id,
          };
          const positiveInstance = createEffectInstance(
            'instance-positive',
            positiveDef,
            'source-positive',
            playerId,
            [target]
          );

          currentState = resolver.resolve(positiveInstance, currentState);

          // Apply negative power change
          const negativeDef = createEffectDefinition(
            'effect-negative',
            'source-negative',
            -absolutePowerChange,
            duration
          );
          const negativeInstance = createEffectInstance(
            'instance-negative',
            negativeDef,
            'source-negative',
            playerId,
            [target]
          );

          currentState = resolver.resolve(negativeInstance, currentState);

          // Find the card in the final state
          const player = currentState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === cardId);

          expect(resultCard).toBeDefined();
          expect(resultCard!.modifiers.length).toBe(2);

          // Should have one positive and one negative modifier
          const positiveModifier = resultCard!.modifiers[0];
          const negativeModifier = resultCard!.modifiers[1];

          expect(positiveModifier.value).toBe(absolutePowerChange);
          expect(negativeModifier.value).toBe(-absolutePowerChange);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22.6: Effect with no targets does not crash', () => {
    fc.assert(
      fc.property(
        powerChangeArb,
        durationArb,
        playerIdArb,
        (powerChange, duration, playerId) => {
          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            powerChange,
            duration
          );
          const effectInstance = createEffectInstance(
            'instance-1',
            effectDef,
            'source-card',
            playerId,
            [] // No targets
          );

          // Should not crash, just return state unchanged
          const resultState = resolver.resolve(effectInstance, initialState);

          // State should be returned (possibly unchanged)
          expect(resultState).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 22.7: Effect targeting non-existent card does not crash', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerChangeArb,
        durationArb,
        playerIdArb,
        (nonExistentCardId, powerChange, duration, playerId) => {
          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            powerChange,
            duration
          );
          const target: Target = {
            type: TargetType.CARD,
            cardId: nonExistentCardId, // This card doesn't exist in the state
          };
          const effectInstance = createEffectInstance(
            'instance-1',
            effectDef,
            'source-card',
            playerId,
            [target]
          );

          // Should not crash, just log warning and continue
          const resultState = resolver.resolve(effectInstance, initialState);

          // State should be returned
          expect(resultState).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 22.8: Modifiers have unique IDs', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        fc.array(powerChangeArb, { minLength: 2, maxLength: 5 }),
        durationArb,
        playerIdArb,
        (cardId, powerChanges, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          let currentState = addCardToState(initialState, card);

          // Apply multiple power modifications
          for (let i = 0; i < powerChanges.length; i++) {
            const effectDef = createEffectDefinition(
              `effect-${i}`,
              `source-${i}`,
              powerChanges[i],
              duration
            );
            const target: Target = {
              type: TargetType.CARD,
              cardId: card.id,
            };
            const effectInstance = createEffectInstance(
              `instance-${i}`,
              effectDef,
              `source-${i}`,
              playerId,
              [target]
            );

            currentState = resolver.resolve(effectInstance, currentState);
          }

          // Find the card in the final state
          const player = currentState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === cardId);

          expect(resultCard).toBeDefined();

          // All modifier IDs should be unique
          const modifierIds = resultCard!.modifiers.map(m => m.id);
          const uniqueIds = new Set(modifierIds);
          expect(uniqueIds.size).toBe(modifierIds.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 22.9: Modifiers have timestamps', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerChangeArb,
        durationArb,
        playerIdArb,
        (cardId, powerChange, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            powerChange,
            duration
          );
          const target: Target = {
            type: TargetType.CARD,
            cardId: card.id,
          };
          const effectInstance = createEffectInstance(
            'instance-1',
            effectDef,
            'source-card',
            playerId,
            [target]
          );

          const beforeTime = Date.now();
          const resultState = resolver.resolve(effectInstance, stateWithCard);
          const afterTime = Date.now();

          const player = resultState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === cardId);

          expect(resultCard).toBeDefined();
          expect(resultCard!.modifiers.length).toBe(1);

          const modifier = resultCard!.modifiers[0];
          expect(modifier.timestamp).toBeGreaterThanOrEqual(beforeTime);
          expect(modifier.timestamp).toBeLessThanOrEqual(afterTime);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22.10: Resolver validates powerChange parameter', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        durationArb,
        playerIdArb,
        (cardId, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          // Create effect without powerChange parameter
          const effectDef: EffectDefinition = {
            id: 'effect-1',
            sourceCardId: 'source-card',
            label: '[Test]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.ON_PLAY,
            condition: null,
            cost: null,
            effectType: EffectType.POWER_MODIFICATION,
            parameters: {
              duration,
              // powerChange is missing
            },
            oncePerTurn: false,
            usedThisTurn: false,
          };

          const target: Target = {
            type: TargetType.CARD,
            cardId: card.id,
          };
          const effectInstance = createEffectInstance(
            'instance-1',
            effectDef,
            'source-card',
            playerId,
            [target]
          );

          // canResolve should return false
          expect(resolver.canResolve(effectInstance, stateWithCard)).toBe(false);

          // resolve should throw
          expect(() => {
            resolver.resolve(effectInstance, stateWithCard);
          }).toThrow(/powerChange/);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 22.11: Different durations can be applied to the same card', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerChangeArb,
        playerIdArb,
        (cardId, powerChange, playerId) => {
          const card = createTestCard(cardId, playerId);
          let currentState = addCardToState(initialState, card);

          const durations = [
            ModifierDuration.PERMANENT,
            ModifierDuration.UNTIL_END_OF_TURN,
            ModifierDuration.UNTIL_END_OF_BATTLE,
          ];

          // Apply modifiers with different durations
          for (let i = 0; i < durations.length; i++) {
            const effectDef = createEffectDefinition(
              `effect-${i}`,
              `source-${i}`,
              powerChange,
              durations[i]
            );
            const target: Target = {
              type: TargetType.CARD,
              cardId: card.id,
            };
            const effectInstance = createEffectInstance(
              `instance-${i}`,
              effectDef,
              `source-${i}`,
              playerId,
              [target]
            );

            currentState = resolver.resolve(effectInstance, currentState);
          }

          // Find the card in the final state
          const player = currentState.players.get(playerId);
          const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === cardId);

          expect(resultCard).toBeDefined();
          expect(resultCard!.modifiers.length).toBe(durations.length);

          // Each modifier should have a different duration
          const modifierDurations = resultCard!.modifiers.map(m => m.duration);
          expect(modifierDurations).toContain(ModifierDuration.PERMANENT);
          expect(modifierDurations).toContain(ModifierDuration.UNTIL_END_OF_TURN);
          expect(modifierDurations).toContain(ModifierDuration.UNTIL_END_OF_BATTLE);
        }
      ),
      { numRuns: 50 }
    );
  });
});
