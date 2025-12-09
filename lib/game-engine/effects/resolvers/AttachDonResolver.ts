/**
 * AttachDonResolver.ts
 * 
 * Resolver for DON attachment effects. Handles attaching DON from the cost area
 * to target characters, updating the character's givenDon array and applying
 * the power bonus (+1000 per DON).
 */

import { GameState, ZoneId, CardCategory, PlayerId } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';
import { GameStateManager } from '../../core/GameState';

/**
 * Resolver for ATTACH_DON effect type
 * 
 * Attaches DON from the cost area to target characters. Each attached DON
 * provides +1000 power to the character. The DON is moved from the cost area
 * to the character's givenDon array.
 */
export class AttachDonResolver implements EffectResolver {
  /**
   * Resolve a DON attachment effect
   * 
   * @param effect - The effect instance containing targets
   * @param state - The current game state
   * @returns Updated game state with DON attached to targets
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { value } = effect.definition.parameters;

    // Default to attaching 1 DON if not specified
    const donCount = value !== undefined ? value : 1;

    if (!effect.targets || effect.targets.length === 0) {
      // No targets - effect fizzles but doesn't error
      return state;
    }

    // Create a state manager to handle the DON operations
    let stateManager = new GameStateManager(state);

    // Attach DON to each target character
    for (const target of effect.targets) {
      if (target.type !== 'CARD' || !target.cardId) {
        continue;
      }

      // Find the card in the state
      const card = stateManager.getCard(target.cardId);
      if (!card) {
        console.warn(`DON attachment target card not found: ${target.cardId}`);
        continue;
      }

      // Validate the card is a character
      if (card.definition.category !== CardCategory.CHARACTER) {
        console.warn(`DON attachment target is not a character: ${target.cardId}`);
        continue;
      }

      // Validate the card is in the character area
      if (card.zone !== ZoneId.CHARACTER_AREA) {
        console.warn(`DON attachment target is not in character area: ${target.cardId}`);
        continue;
      }

      // Get the controller's cost area DON
      const controller = card.controller;
      const player = stateManager.getPlayer(controller);
      if (!player) {
        console.warn(`Player not found for DON attachment: ${controller}`);
        continue;
      }

      const costArea = player.zones.costArea;
      if (!costArea || costArea.length === 0) {
        console.warn(`No DON available in cost area for player: ${controller}`);
        continue;
      }

      // Attach the specified number of DON (or as many as available)
      const donToAttach = Math.min(donCount, costArea.length);
      
      for (let i = 0; i < donToAttach; i++) {
        // Get fresh reference to player and cost area after each move
        const currentPlayer = stateManager.getPlayer(controller);
        if (!currentPlayer) break;
        
        const currentCostArea = currentPlayer.zones.costArea;
        if (currentCostArea.length === 0) break;
        
        // Get the first DON from cost area
        const don = currentCostArea[0];
        if (!don) break;

        // Move DON from cost area to the character
        stateManager = stateManager.moveDon(don.id, ZoneId.CHARACTER_AREA, target.cardId);
      }
    }

    // Get the updated state
    const newState = stateManager.getState();

    return newState;
  }

  /**
   * Validate that a DON attachment effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    // DON attachment effects can always resolve (they just fizzle if no valid targets or DON)
    return true;
  }
}
