/**
 * EffectResolver.ts
 * 
 * Defines the EffectResolver interface and EffectResolverRegistry for managing
 * effect resolution. Each effect type has a corresponding resolver that knows
 * how to apply that effect to the game state.
 */

import { GameState } from '../core/types';
import { EffectInstance, EffectType } from './types';

/**
 * Interface for effect resolvers
 * Each effect type should have a resolver that implements this interface
 */
export interface EffectResolver {
  /**
   * Resolve a specific effect instance
   * 
   * @param effect - The effect instance to resolve
   * @param state - The current game state
   * @returns The updated game state after applying the effect
   * @throws Error if the effect cannot be resolved
   */
  resolve(effect: EffectInstance, state: GameState): GameState;

  /**
   * Validate that an effect can be resolved
   * Checks preconditions without modifying state
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect can be resolved
   */
  canResolve(effect: EffectInstance, state: GameState): boolean;
}

/**
 * Registry for effect resolvers
 * Maps effect types to their corresponding resolver implementations
 */
export class EffectResolverRegistry {
  private resolvers: Map<EffectType, EffectResolver>;

  constructor() {
    this.resolvers = new Map();
  }

  /**
   * Register a resolver for an effect type
   * 
   * @param effectType - The effect type to register
   * @param resolver - The resolver implementation
   * @throws Error if a resolver is already registered for this type
   */
  register(effectType: EffectType, resolver: EffectResolver): void {
    if (this.resolvers.has(effectType)) {
      throw new Error(`Resolver already registered for effect type: ${effectType}`);
    }
    this.resolvers.set(effectType, resolver);
  }

  /**
   * Unregister a resolver for an effect type
   * Useful for testing or hot-reloading resolvers
   * 
   * @param effectType - The effect type to unregister
   * @returns True if a resolver was unregistered
   */
  unregister(effectType: EffectType): boolean {
    return this.resolvers.delete(effectType);
  }

  /**
   * Get the resolver for an effect type
   * 
   * @param effectType - The effect type to look up
   * @returns The resolver for this effect type, or null if not found
   */
  getResolver(effectType: EffectType): EffectResolver | null {
    return this.resolvers.get(effectType) || null;
  }

  /**
   * Check if a resolver is registered for an effect type
   * 
   * @param effectType - The effect type to check
   * @returns True if a resolver is registered
   */
  hasResolver(effectType: EffectType): boolean {
    return this.resolvers.has(effectType);
  }

  /**
   * Resolve an effect using the appropriate resolver
   * 
   * @param effect - The effect instance to resolve
   * @param state - The current game state
   * @returns The updated game state after applying the effect
   * @throws Error if no resolver is registered for the effect type
   * @throws Error if the effect cannot be resolved
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const effectType = effect.definition.effectType;
    const resolver = this.getResolver(effectType);

    if (!resolver) {
      throw new Error(`No resolver registered for effect type: ${effectType}`);
    }

    // Validate before resolving
    if (!resolver.canResolve(effect, state)) {
      throw new Error(
        `Effect cannot be resolved: ${effectType} (source: ${effect.sourceCardId})`
      );
    }

    // Resolve the effect
    return resolver.resolve(effect, state);
  }

  /**
   * Validate that an effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect can be resolved
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    const effectType = effect.definition.effectType;
    const resolver = this.getResolver(effectType);

    if (!resolver) {
      return false;
    }

    return resolver.canResolve(effect, state);
  }

  /**
   * Get all registered effect types
   * 
   * @returns Array of effect types that have registered resolvers
   */
  getRegisteredTypes(): EffectType[] {
    return Array.from(this.resolvers.keys());
  }

  /**
   * Clear all registered resolvers
   * Useful for testing
   */
  clear(): void {
    this.resolvers.clear();
  }

  /**
   * Get the number of registered resolvers
   * 
   * @returns The count of registered resolvers
   */
  size(): number {
    return this.resolvers.size;
  }
}
