/**
 * KOCharacterResolver.ts
 * 
 * Resolver for K.O. character effects. Handles knocking out characters that match
 * specified criteria (power, cost) and triggers ON_KO effects.
 */

import { GameState, ZoneId, CardCategory } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';
import { koCharacter } from '../../battle/KOHandler';
import { GameStateManager } from '../../core/GameState';

/**
 * Resolver for KO_CHARACTER effect type
 * 
 * K.O.s target characters matching the specified criteria (maxPower, maxCost).
 * Moves characters to trash and triggers ON_KO effects.
 */
export class KOCharacterResolver implements EffectResolver {
  /**
   * Resolve a K.O. character effect
   * 
   * @param effect - The effect instance containing targets and criteria
   * @param state - The current game state
   * @returns Updated game state with characters K.O.'d
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { maxPower, maxCost } = effect.definition.parameters;

    if (!effect.targets || effect.targets.length === 0) {
      // No targets - effect fizzles but doesn't error
      return state;
    }

    // Create a state manager to handle the K.O. operations
    let stateManager = new GameStateManager(state);
    
    // Track all triggers that need to be resolved
    const allTriggers: any[] = [];

    // K.O. each target character
    for (const target of effect.targets) {
      if (target.type !== 'CARD' || !target.cardId) {
        continue;
      }

      // Find the card in the state
      const card = stateManager.getCard(target.cardId);
      if (!card) {
        console.warn(`K.O. target card not found: ${target.cardId}`);
        continue;
      }

      // Validate the card is a character
      if (card.definition.category !== CardCategory.CHARACTER) {
        console.warn(`K.O. target is not a character: ${target.cardId}`);
        continue;
      }

      // Validate the card is in the character area
      if (card.zone !== ZoneId.CHARACTER_AREA) {
        console.warn(`K.O. target is not in character area: ${target.cardId}`);
        continue;
      }

      // Validate power constraint if specified
      if (maxPower !== undefined) {
        const currentPower = this.calculateCurrentPower(card);
        if (currentPower > maxPower) {
          console.warn(`K.O. target power ${currentPower} exceeds maxPower ${maxPower}: ${target.cardId}`);
          continue;
        }
      }

      // Validate cost constraint if specified
      if (maxCost !== undefined) {
        const cardCost = card.definition.baseCost || 0;
        if (cardCost > maxCost) {
          console.warn(`K.O. target cost ${cardCost} exceeds maxCost ${maxCost}: ${target.cardId}`);
          continue;
        }
      }

      // K.O. the character using the KOHandler
      const result = koCharacter(card, stateManager);
      stateManager = result.stateManager;
      allTriggers.push(...result.triggers);
    }

    // Get the updated state
    const newState = stateManager.getState();

    // Note: The triggers are collected but not resolved here.
    // In a full implementation, these would be passed to the EffectSystem
    // to be resolved with proper priority ordering.
    // For now, we just log them for debugging.
    if (allTriggers.length > 0) {
      console.log(`K.O. effect triggered ${allTriggers.length} ON_KO effects`);
    }

    return newState;
  }

  /**
   * Validate that a K.O. character effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    // K.O. effects can always resolve (they just fizzle if no valid targets)
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
