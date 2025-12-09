/**
 * EffectResolver.pbt.test.ts
 * 
 * Property-based tests for effect resolution using EffectResolverRegistry
 * 
 * Feature: ai-battle-integration, Property 21: Effect State Modification
 * Validates: Requirements 16.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { EffectResolver, EffectResolverRegistry } from './EffectResolver';
import { createInitialGameState } from '../core/GameState';
import {
  EffectInstance,
  EffectDefinition,
  EffectType,
  EffectParameters,
  Target,
  TargetType,
} from './types';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  CardDefinition,
  CardInstance,
  Color,
  ModifierDuration,
  GameState,
} from '../core/types';

/**
 * Property 21: Effect State Modification
 * 
 * For any resolved effect, the game state should reflect the changes specified by the effect.
 * 
 * This property ensures that:
 * 1. Resolvers correctly modify game state according to effect parameters
 * 2. State changes are consistent and deterministic
 * 3. Invalid effects are rejected without modifying state
 * 4. Registry correctly routes effects to appropriate resolvers
 */

describe('Property 21: Effect State Modification', () => {
  let registry: EffectResolverRegistry;
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
    effectType: EffectType,
    parameters: EffectParameters
  ): EffectDefinition => {
    return {
      id,
      sourceCardId,
      label: '[Test]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      condition: null,
      cost: null,
      effectType,
      parameters,
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

  beforeEach(() => {
    registry = new EffectResolverRegistry();
    initialState = createInitialGameState();
  });

  // ============================================================================
  // Mock Resolver Implementations
  // ============================================================================

  /**
   * Mock resolver that adds a marker to the state to prove it was called
   */
  class MockPowerModificationResolver implements EffectResolver {
    resolve(effect: EffectInstance, state: GameState): GameState {
      // Add a marker to prove this resolver was called
      // Using 'any' to add test metadata that doesn't exist on GameState
      const newState = { ...state } as any;
      if (!newState.metadata) {
        newState.metadata = {};
      }
      newState.metadata.lastResolvedEffect = effect.id;
      newState.metadata.lastResolvedType = effect.definition.effectType;
      newState.metadata.powerChange = effect.definition.parameters.powerChange;
      return newState as GameState;
    }

    canResolve(effect: EffectInstance, state: GameState): boolean {
      // Can resolve if power change is specified
      return effect.definition.parameters.powerChange !== undefined;
    }
  }

  /**
   * Mock resolver that always fails validation
   */
  class MockFailingResolver implements EffectResolver {
    resolve(effect: EffectInstance, state: GameState): GameState {
      throw new Error('This resolver should never be called');
    }

    canResolve(effect: EffectInstance, state: GameState): boolean {
      return false;
    }
  }

  /**
   * Mock resolver that modifies state in a trackable way
   */
  class MockTrackableResolver implements EffectResolver {
    private resolutionCount = 0;

    resolve(effect: EffectInstance, state: GameState): GameState {
      this.resolutionCount++;
      // Using 'any' to add test metadata that doesn't exist on GameState
      const newState = { ...state } as any;
      if (!newState.metadata) {
        newState.metadata = {};
      }
      newState.metadata.resolutionCount = this.resolutionCount;
      newState.metadata.lastEffectId = effect.id;
      return newState as GameState;
    }

    canResolve(effect: EffectInstance, state: GameState): boolean {
      return true;
    }

    getResolutionCount(): number {
      return this.resolutionCount;
    }
  }

  // ============================================================================
  // Arbitraries for generating test data
  // ============================================================================

  const effectTypeArb = fc.constantFrom(
    EffectType.POWER_MODIFICATION,
    EffectType.KO_CHARACTER,
    EffectType.DRAW_CARDS,
    EffectType.REST_CHARACTER
  );

  const powerChangeArb = fc.integer({ min: -5000, max: 5000 });

  const effectParametersArb = fc.record({
    powerChange: fc.option(powerChangeArb, { nil: undefined }),
    maxPower: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
    cardCount: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  });

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 21.1: Registry correctly registers and retrieves resolvers', () => {
    fc.assert(
      fc.property(
        effectTypeArb,
        (effectType) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          const resolver = new MockPowerModificationResolver();
          
          // Register the resolver
          testRegistry.register(effectType, resolver);

          // Should be able to retrieve it
          const retrieved = testRegistry.getResolver(effectType);
          expect(retrieved).toBe(resolver);

          // Should report as having the resolver
          expect(testRegistry.hasResolver(effectType)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.2: Registry prevents duplicate registration', () => {
    fc.assert(
      fc.property(
        effectTypeArb,
        (effectType) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          const resolver1 = new MockPowerModificationResolver();
          const resolver2 = new MockPowerModificationResolver();

          // First registration should succeed
          testRegistry.register(effectType, resolver1);

          // Second registration should throw
          expect(() => {
            testRegistry.register(effectType, resolver2);
          }).toThrow();

          // Original resolver should still be registered
          expect(testRegistry.getResolver(effectType)).toBe(resolver1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.3: Registry correctly unregisters resolvers', () => {
    fc.assert(
      fc.property(
        effectTypeArb,
        (effectType) => {
          const resolver = new MockPowerModificationResolver();

          // Register and then unregister
          registry.register(effectType, resolver);
          const unregistered = registry.unregister(effectType);

          // Should report successful unregistration
          expect(unregistered).toBe(true);

          // Should no longer have the resolver
          expect(registry.hasResolver(effectType)).toBe(false);
          expect(registry.getResolver(effectType)).toBe(null);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.4: Resolving an effect calls the correct resolver', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        powerChangeArb,
        (effectId, powerChange) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          const resolver = new MockPowerModificationResolver();
          testRegistry.register(EffectType.POWER_MODIFICATION, resolver);

          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const effectDef = createEffectDefinition(
            effectId,
            card.id,
            EffectType.POWER_MODIFICATION,
            { powerChange }
          );
          const effectInstance = createEffectInstance(
            `instance-${effectId}`,
            effectDef,
            card.id,
            PlayerId.PLAYER_1
          );

          const resultState = testRegistry.resolve(effectInstance, initialState);

          // The resolver should have been called and modified the state
          const resultWithMetadata = resultState as any;
          expect(resultWithMetadata.metadata?.lastResolvedEffect).toBe(effectInstance.id);
          expect(resultWithMetadata.metadata?.lastResolvedType).toBe(EffectType.POWER_MODIFICATION);
          expect(resultWithMetadata.metadata?.powerChange).toBe(powerChange);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21.5: Resolving without a registered resolver throws error', () => {
    fc.assert(
      fc.property(
        effectTypeArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        (effectType, effectId) => {
          // Don't register any resolver
          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const effectDef = createEffectDefinition(
            effectId,
            card.id,
            effectType,
            {}
          );
          const effectInstance = createEffectInstance(
            `instance-${effectId}`,
            effectDef,
            card.id,
            PlayerId.PLAYER_1
          );

          // Should throw when trying to resolve
          expect(() => {
            registry.resolve(effectInstance, initialState);
          }).toThrow(/No resolver registered/);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.6: Effects that fail validation are not resolved', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (effectId) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          const resolver = new MockFailingResolver();
          testRegistry.register(EffectType.POWER_MODIFICATION, resolver);

          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const effectDef = createEffectDefinition(
            effectId,
            card.id,
            EffectType.POWER_MODIFICATION,
            { powerChange: 1000 }
          );
          const effectInstance = createEffectInstance(
            `instance-${effectId}`,
            effectDef,
            card.id,
            PlayerId.PLAYER_1
          );

          // Should throw when validation fails
          expect(() => {
            testRegistry.resolve(effectInstance, initialState);
          }).toThrow(/cannot be resolved/);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.7: Multiple effects resolve independently', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
        (effectIds) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          const resolver = new MockTrackableResolver();
          testRegistry.register(EffectType.POWER_MODIFICATION, resolver);

          let currentState = initialState;

          // Resolve each effect in sequence
          for (const effectId of effectIds) {
            const card = createTestCard(`card-${effectId}`, PlayerId.PLAYER_1);
            const effectDef = createEffectDefinition(
              effectId,
              card.id,
              EffectType.POWER_MODIFICATION,
              { powerChange: 1000 }
            );
            const effectInstance = createEffectInstance(
              `instance-${effectId}`,
              effectDef,
              card.id,
              PlayerId.PLAYER_1
            );

            currentState = testRegistry.resolve(effectInstance, currentState);
          }

          // The resolver should have been called once for each effect
          expect(resolver.getResolutionCount()).toBe(effectIds.length);

          // The last effect ID should be recorded
          const stateWithMetadata = currentState as any;
          expect(stateWithMetadata.metadata?.lastEffectId).toBe(`instance-${effectIds[effectIds.length - 1]}`);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.8: Registry size reflects number of registered resolvers', () => {
    fc.assert(
      fc.property(
        fc.array(effectTypeArb, { minLength: 1, maxLength: 4 }),
        (effectTypes) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          
          // Use Set to get unique effect types
          const uniqueTypes = Array.from(new Set(effectTypes));

          // Register a resolver for each unique type
          for (const effectType of uniqueTypes) {
            testRegistry.register(effectType, new MockPowerModificationResolver());
          }

          // Size should match number of unique types
          expect(testRegistry.size()).toBe(uniqueTypes.length);
          expect(testRegistry.getRegisteredTypes().length).toBe(uniqueTypes.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.9: Clearing registry removes all resolvers', () => {
    fc.assert(
      fc.property(
        fc.array(effectTypeArb, { minLength: 1, maxLength: 4 }),
        (effectTypes) => {
          // Register resolvers
          const uniqueTypes = Array.from(new Set(effectTypes));
          for (const effectType of uniqueTypes) {
            try {
              registry.register(effectType, new MockPowerModificationResolver());
            } catch {
              // Ignore duplicate registration errors
            }
          }

          // Clear the registry
          registry.clear();

          // Should have no resolvers
          expect(registry.size()).toBe(0);
          expect(registry.getRegisteredTypes().length).toBe(0);

          // None of the types should have resolvers
          for (const effectType of uniqueTypes) {
            expect(registry.hasResolver(effectType)).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 21.10: canResolve correctly validates effects', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.boolean(),
        (effectId, shouldPass) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          
          // Register resolver that validates based on powerChange presence
          const resolver = new MockPowerModificationResolver();
          testRegistry.register(EffectType.POWER_MODIFICATION, resolver);

          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const effectDef = createEffectDefinition(
            effectId,
            card.id,
            EffectType.POWER_MODIFICATION,
            shouldPass ? { powerChange: 1000 } : {}
          );
          const effectInstance = createEffectInstance(
            `instance-${effectId}`,
            effectDef,
            card.id,
            PlayerId.PLAYER_1
          );

          const canResolve = testRegistry.canResolve(effectInstance, initialState);

          // Should match whether powerChange is present
          expect(canResolve).toBe(shouldPass);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21.11: State modifications are deterministic', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        powerChangeArb,
        (effectId, powerChange) => {
          // Create a fresh registry for each test iteration
          const testRegistry = new EffectResolverRegistry();
          const resolver = new MockPowerModificationResolver();
          testRegistry.register(EffectType.POWER_MODIFICATION, resolver);

          const card = createTestCard('card1', PlayerId.PLAYER_1);
          const effectDef = createEffectDefinition(
            effectId,
            card.id,
            EffectType.POWER_MODIFICATION,
            { powerChange }
          );
          const effectInstance = createEffectInstance(
            `instance-${effectId}`,
            effectDef,
            card.id,
            PlayerId.PLAYER_1
          );

          // Resolve the same effect multiple times with the same initial state
          const result1 = testRegistry.resolve(effectInstance, initialState) as any;
          const result2 = testRegistry.resolve(effectInstance, initialState) as any;
          const result3 = testRegistry.resolve(effectInstance, initialState) as any;

          // All results should be identical
          expect(result1.metadata?.lastResolvedEffect).toBe(result2.metadata?.lastResolvedEffect);
          expect(result2.metadata?.lastResolvedEffect).toBe(result3.metadata?.lastResolvedEffect);
          expect(result1.metadata?.powerChange).toBe(result2.metadata?.powerChange);
          expect(result2.metadata?.powerChange).toBe(result3.metadata?.powerChange);
        }
      ),
      { numRuns: 100 }
    );
  });
});
