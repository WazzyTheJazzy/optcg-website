/**
 * ActivateCharacterResolver.ts
 * 
 * Resolver for activate character effects. Changes target characters' state to ACTIVE.
 */

import { GameState, ZoneId, CardCategory, CardState } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';
import { GameStateManager } from '../../core/GameState';

/**
 * Resolver for ACTIVATE_CHARACTER effect type
 * 
 * Activates target characters by changing their state to ACTIVE.
 * Only affects characters in the character area.
 */
export class ActivateCharacterResolver implements EffectResolver {
  /**
   * Resolve an activate character effect
   * 
   * @param effect - The effect instance containing targets
   * @param state - The current game state
   * @returns Updated game state with characters activated
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    if (!effect.targets || effect.targets.length === 0) {
      // No targets - effect fizzles but doesn't error
      return state;
    }

    // Create a state manager to handle the activate operations
    let stateManager = new GameStateManager(state);

    // Activate each target character
    for (const target of effect.targets) {
      if (target.type !== 'CARD' || !target.cardId) {
        continue;
      }

      // Find the card in the state
      const card = stateManager.getCard(target.cardId);
      if (!card) {
        console.warn(`Activate target card not found: ${target.cardId}`);
        continue;
      }

      // Validate the card is a character
      if (card.definition.category !== CardCategory.CHARACTER) {
        console.warn(`Activate target is not a character: ${target.cardId}`);
        continue;
      }

      // Validate the card is in the character area
      if (card.zone !== ZoneId.CHARACTER_AREA) {
        console.warn(`Activate target is not in character area: ${target.cardId}`);
        continue;
      }

      // Check if already active (no need to activate again)
      if (card.state === CardState.ACTIVE) {
        console.log(`Character ${target.cardId} is already active`);
        continue;
      }

      // Activate the character by updating its state
      stateManager = stateManager.updateCard(card.id, {
        state: CardState.ACTIVE,
      });
    }

    // Get the updated state
    return stateManager.getState();
  }

  /**
   * Validate that an activate character effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    // Activate effects can always resolve (they just fizzle if no valid targets)
    return true;
  }
}
