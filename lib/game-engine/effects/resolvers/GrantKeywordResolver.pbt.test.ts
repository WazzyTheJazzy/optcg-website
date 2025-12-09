/**
 * GrantKeywordResolver.pbt.test.ts
 * 
 * Property-based tests for GrantKeywordResolver
 * 
 * Feature: ai-battle-integration, Property 49: Dynamic Keyword Grant
 * Validates: Requirements 33.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { GrantKeywordResolver } from './GrantKeywordResolver';
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
 * Property 49: Dynamic Keyword Grant
 * 
 * For any keyword grant effect, the keyword should be added to the target card
 * as a modifier with the specified duration.
 * 
 * This property ensures that:
 * 1. Keywords are granted to target cards via modifiers
 * 2. Keyword modifiers have the correct duration
 * 3. Multiple keywords can be granted to the same card
 * 4. Common keywords (Rush, Blocker, Double Attack) work correctly
 * 5. Keyword modifiers have proper metadata (source, timestamp)
 * 6. Keywords persist for the specified duration
 */

describe('Property 49: Dynamic Keyword Grant', () => {
  let resolver: GrantKeywordResolver;
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
    keyword: string,
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
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword,
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
    resolver = new GrantKeywordResolver();
    initialState = createInitialGameState();
  });

  // ============================================================================
  // Arbitraries for generating test data
  // ============================================================================

  const keywordArb = fc.constantFrom(
    'Rush',
    'Blocker',
    'Double Attack',
    'Banish',
    'Strike',
    'Counter',
    'Trigger'
  );

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

  it('Property 49.1: Keywords are granted as modifiers with correct type', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        keywordArb,
        durationArb,
        playerIdArb,
        (cardId, keyword, duration, playerId) => {
          // Create a card and add it to the state
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          // Create effect targeting this card
          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            keyword,
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

          // Modifier should be a KEYWORD type
          const modifier = resultCard!.modifiers[0];
          expect(modifier.type).toBe(ModifierType.KEYWORD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 49.2: Keyword modifiers have the correct keyword value', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        keywordArb,
        durationArb,
        playerIdArb,
        (cardId, keyword, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            keyword,
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
          expect(modifier.value).toBe(keyword);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 49.3: Keyword modifiers have the specified duration', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        keywordArb,
        durationArb,
        playerIdArb,
        (cardId, keyword, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            keyword,
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
          expect(modifier.duration).toBe(duration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 49.4: Multiple keywords can be granted to the same card', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        fc.array(keywordArb, { minLength: 2, maxLength: 4 }),
        durationArb,
        playerIdArb,
        (cardId, keywords, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          let currentState = addCardToState(initialState, card);

          // Apply multiple keyword grants
          for (let i = 0; i < keywords.length; i++) {
            const effectDef = createEffectDefinition(
              `effect-${i}`,
              `source-${i}`,
              keywords[i],
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
          expect(resultCard!.modifiers.length).toBe(keywords.length);

          // Each modifier should have the correct keyword
          for (let i = 0; i < keywords.length; i++) {
            const modifier = resultCard!.modifiers[i];
            expect(modifier.type).toBe(ModifierType.KEYWORD);
            expect(modifier.value).toBe(keywords[i]);
            expect(modifier.duration).toBe(duration);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 49.5: Keyword modifiers track their source card', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        cardIdArb,
        keywordArb,
        durationArb,
        playerIdArb,
        (targetCardId, sourceCardId, keyword, duration, playerId) => {
          fc.pre(targetCardId !== sourceCardId); // Ensure different IDs

          const card = createTestCard(targetCardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            sourceCardId,
            keyword,
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

  it('Property 49.6: Common keywords (Rush, Blocker, Double Attack) work correctly', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        fc.constantFrom('Rush', 'Blocker', 'Double Attack'),
        durationArb,
        playerIdArb,
        (cardId, keyword, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            keyword,
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
          expect(modifier.type).toBe(ModifierType.KEYWORD);
          expect(modifier.value).toBe(keyword);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 49.7: Effect with no targets does not crash', () => {
    fc.assert(
      fc.property(
        keywordArb,
        durationArb,
        playerIdArb,
        (keyword, duration, playerId) => {
          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            keyword,
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

  it('Property 49.8: Effect targeting non-existent card does not crash', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        keywordArb,
        durationArb,
        playerIdArb,
        (nonExistentCardId, keyword, duration, playerId) => {
          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            keyword,
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

  it('Property 49.9: Keyword modifiers have unique IDs', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        fc.array(keywordArb, { minLength: 2, maxLength: 4 }),
        durationArb,
        playerIdArb,
        (cardId, keywords, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          let currentState = addCardToState(initialState, card);

          // Apply multiple keyword grants
          for (let i = 0; i < keywords.length; i++) {
            const effectDef = createEffectDefinition(
              `effect-${i}`,
              `source-${i}`,
              keywords[i],
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

  it('Property 49.10: Keyword modifiers have timestamps', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        keywordArb,
        durationArb,
        playerIdArb,
        (cardId, keyword, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          const effectDef = createEffectDefinition(
            'effect-1',
            'source-card',
            keyword,
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

  it('Property 49.11: Resolver validates keyword parameter', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        durationArb,
        playerIdArb,
        (cardId, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          // Create effect without keyword parameter
          const effectDef: EffectDefinition = {
            id: 'effect-1',
            sourceCardId: 'source-card',
            label: '[Test]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.ON_PLAY,
            condition: null,
            cost: null,
            effectType: EffectType.GRANT_KEYWORD,
            parameters: {
              duration,
              // keyword is missing
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
          }).toThrow(/keyword/);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 49.12: Different durations can be applied to the same card', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        keywordArb,
        playerIdArb,
        (cardId, keyword, playerId) => {
          const card = createTestCard(cardId, playerId);
          let currentState = addCardToState(initialState, card);

          const durations = [
            ModifierDuration.PERMANENT,
            ModifierDuration.UNTIL_END_OF_TURN,
            ModifierDuration.UNTIL_END_OF_BATTLE,
          ];

          // Apply keyword grants with different durations
          for (let i = 0; i < durations.length; i++) {
            const effectDef = createEffectDefinition(
              `effect-${i}`,
              `source-${i}`,
              keyword,
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

  it('Property 49.13: Empty keyword string is rejected', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        durationArb,
        playerIdArb,
        (cardId, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          const stateWithCard = addCardToState(initialState, card);

          // Create effect with empty keyword
          const effectDef: EffectDefinition = {
            id: 'effect-1',
            sourceCardId: 'source-card',
            label: '[Test]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.ON_PLAY,
            condition: null,
            cost: null,
            effectType: EffectType.GRANT_KEYWORD,
            parameters: {
              keyword: '   ', // Empty/whitespace keyword
              duration,
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

          // canResolve should return false for empty keyword
          expect(resolver.canResolve(effectInstance, stateWithCard)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
