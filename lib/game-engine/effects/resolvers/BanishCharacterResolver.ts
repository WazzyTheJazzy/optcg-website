/**
 * BanishCharacterResolver.ts
 * 
 * Resolves effects that banish characters from the game permanently.
 * Banished cards are removed from the game and placed in the banished zone.
 */

import { EffectResolver } from '../EffectResolver';
import { EffectInstance } from '../types';
import { GameStateManager } from '../../core/GameState';
import { banishCard } from '../../battle/BanishHandler';
import { TargetType } from '../types';

/**
 * Resolver for effects that banish characters
 * 
 * Example effects:
 * - "Banish up to 1 of your opponent's Characters with 5000 power or less"
 * - "Banish target Character"
 */
export class BanishCharacterResolver implements EffectResolver {
  /**
   * Resolve a banish character effect
   * 
   * @param effect - The effect instance to resolve
   * @param stateManager - Current game state manager
   * @returns Updated game state manager
   */
  resolve(effect: EffectInstance, stateManager: GameStateManager): GameStateManager {
    let updatedStateManager = stateManager;

    // Get all card targets from the effect
    const cardTargets = effect.targets.filter(t => t.type === TargetType.CARD);

    // Banish each target card
    for (const target of cardTargets) {
      if (!target.cardId) {
        continue;
      }

      const card = updatedStateManager.getCard(target.cardId);
      if (!card) {
        continue;
      }

      // Banish the card
      updatedStateManager = banishCard(card, updatedStateManager);
    }

    return updatedStateManager;
  }

  /**
   * Check if a banish effect can be resolved
   * 
   * @param effect - The effect instance to check
   * @param stateManager - Current game state manager
   * @returns True if the effect can be resolved
   */
  canResolve(effect: EffectInstance, stateManager: GameStateManager): boolean {
    // Check if we have at least one valid card target
    const cardTargets = effect.targets.filter(t => t.type === TargetType.CARD);
    
    if (cardTargets.length === 0) {
      return false;
    }

    // Check if at least one target card exists
    for (const target of cardTargets) {
      if (target.cardId) {
        const card = stateManager.getCard(target.cardId);
        if (card) {
          return true;
        }
      }
    }

    return false;
  }
}
