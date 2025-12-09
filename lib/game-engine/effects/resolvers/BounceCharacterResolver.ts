/**
 * BounceCharacterResolver.ts
 * 
 * Resolver for bounce character effects. Returns target characters to their
 * owner's hand, supporting cost and power filters.
 */

import { GameState, ZoneId, CardCategory, CardState } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';
import { GameStateManager } from '../../core/GameState';

/**
 * Resolver for BOUNCE_CHARACTER effect type
 * 
 * Returns target characters to their owner's hand. Validates that targets
 * match the specified criteria (maxPower, maxCost) before bouncing.
 */
export class BounceCharacterResolver implements EffectResolver {
  /**
   * Resolve a bounce character effect
   * 
   * @param effect - The effect instance containing targets and criteria
   * @param state - The current game state
   * @returns Updated game state with characters returned to hand
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { maxPower, maxCost } = effect.definition.parameters;

    if (!effect.targets || effect.targets.length === 0) {
      // No targets - effect fizzles but doesn't error
      return state;
    }

    // Create a state manager to handle the bounce operations
    let stateManager = new GameStateManager(state);

    // Bounce each target character
    for (const target of effect.targets) {
      if (target.type !== 'CARD' || !target.cardId) {
        continue;
      }

      // Find the card in the state
      const card = stateManager.getCard(target.cardId);
      if (!card) {
        console.warn(`Bounce target card not found: ${target.cardId}`);
        continue;
      }

      // Validate the card is a character
      if (card.definition.category !== CardCategory.CHARACTER) {
        console.warn(`Bounce target is not a character: ${target.cardId}`);
        continue;
      }

      // Validate the card is in the character area
      if (card.zone !== ZoneId.CHARACTER_AREA) {
        console.warn(`Bounce target is not in character area: ${target.cardId}`);
        continue;
      }

      // Validate power constraint if specified
      if (maxPower !== undefined) {
        const currentPower = this.calculateCurrentPower(card);
        if (currentPower > maxPower) {
          console.warn(`Bounce target power ${currentPower} exceeds maxPower ${maxPower}: ${target.cardId}`);
          continue;
        }
      }

      // Validate cost constraint if specified
      if (maxCost !== undefined) {
        const cardCost = card.definition.baseCost || 0;
        if (cardCost > maxCost) {
          console.warn(`Bounce target cost ${cardCost} exceeds maxCost ${maxCost}: ${target.cardId}`);
          continue;
        }
      }

      // Return the character to owner's hand
      // First, clear any modifiers and attached DON
      const cleanedCard = {
        ...card,
        modifiers: [],
        givenDon: [],
        state: CardState.NONE, // Cards in hand have no state
      };

      // Move the card to hand
      stateManager = stateManager.moveCard(card.id, ZoneId.HAND);
      
      // Update the card to clear modifiers and state
      stateManager = stateManager.updateCard(card.id, {
        modifiers: [],
        givenDon: [],
        state: CardState.NONE,
      });
    }

    // Get the updated state
    return stateManager.getState();
  }

  /**
   * Validate that a bounce character effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    // Bounce effects can always resolve (they just fizzle if no valid targets)
    return true;
  }

  /**
   * Calculate the current power of a card including modifiers
   * 
   * @param card - The card to calculate power for
   * @returns The current power value
   */
  private calculateCurrentPower(card: any): number {
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
}
