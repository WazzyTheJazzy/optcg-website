/**
 * DealDamageResolver.ts
 * 
 * Resolver for deal damage effects. Deals X damage to target leader by moving
 * life cards from life zone to hand/trash. Handles trigger effects on life cards.
 */

import { GameState, ZoneId, CardCategory, PlayerId } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';
import { GameStateManager } from '../../core/GameState';
import { KeywordHandler } from '../../battle/KeywordHandler';
import { RulesContext } from '../../rules/RulesContext';

/**
 * Resolver for DEAL_DAMAGE effect type
 * 
 * Implements the damage dealing mechanic:
 * 1. Deal X damage to target leader
 * 2. Move life cards from life zone to hand/trash
 * 3. Handle trigger effects on life cards
 * 4. Check for game over conditions
 */
export class DealDamageResolver implements EffectResolver {
  private keywordHandler: KeywordHandler;

  constructor() {
    // Create a rules context for keyword handling
    const rules = new RulesContext();
    this.keywordHandler = new KeywordHandler(rules);
  }

  /**
   * Resolve a deal damage effect
   * 
   * @param effect - The effect instance containing damage parameters
   * @param state - The current game state
   * @returns Updated game state with damage applied
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { value } = effect.definition.parameters;

    // Validate parameters
    if (!value || value <= 0) {
      console.warn('Deal damage effect missing or invalid value parameter');
      return state;
    }

    // Validate targets
    if (!effect.targets || effect.targets.length === 0) {
      console.warn('Deal damage effect has no targets');
      return state;
    }

    // Get the target (should be a leader)
    const target = effect.targets[0];
    if (target.type !== 'CARD' || !target.cardId) {
      console.warn('Deal damage effect target is not a card');
      return state;
    }

    // Create a state manager to handle the damage operations
    let stateManager = new GameStateManager(state);
    
    // Get the target card
    const targetCard = stateManager.getCard(target.cardId);
    if (!targetCard) {
      console.warn(`Deal damage target card not found: ${target.cardId}`);
      return state;
    }

    // Validate the target is a leader
    if (targetCard.definition.category !== CardCategory.LEADER) {
      console.warn(`Deal damage target is not a leader: ${target.cardId}`);
      return state;
    }

    // Validate the target is in the leader area
    if (targetCard.zone !== ZoneId.LEADER_AREA) {
      console.warn(`Deal damage target is not in leader area: ${target.cardId}`);
      return state;
    }

    // Deal the damage and get updated state manager
    const updatedStateManager = this.dealLeaderDamage(
      targetCard.controller,
      value,
      stateManager
    );

    // Log the damage action
    const actualDamage = value - (updatedStateManager.getPlayer(targetCard.controller)?.zones.life.length || 0) + (stateManager.getPlayer(targetCard.controller)?.zones.life.length || 0);
    console.log(
      `Deal damage effect: ${actualDamage} damage dealt to ${targetCard.controller}'s leader`
    );

    return updatedStateManager.getState();
  }

  /**
   * Validate that a deal damage effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    const { value } = effect.definition.parameters;
    
    // Must have a valid damage value
    if (!value || value <= 0) {
      return false;
    }

    // Must have at least one target
    if (!effect.targets || effect.targets.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Deal damage to a leader by moving life cards to hand
   * 
   * For each point of damage:
   * 1. Check if life is empty (stop if so)
   * 2. Take top life card
   * 3. If life card has Trigger keyword: move to trash (simplified - full trigger resolution requires effect system)
   * 4. If no trigger: add to hand
   * 
   * Note: This is a simplified version for the effect system. The full battle system
   * implementation in BattleSystem.ts includes trigger activation queries and effect resolution.
   * When the effect system is fully integrated, trigger effects will be properly resolved.
   * 
   * @param playerId - The player taking damage
   * @param damageAmount - The amount of damage (number of life cards to take)
   * @param stateManager - The game state manager
   * @returns The updated game state manager
   */
  private dealLeaderDamage(
    playerId: PlayerId,
    damageAmount: number,
    stateManager: GameStateManager
  ): GameStateManager {
    let currentStateManager = stateManager;

    // Process each point of damage separately
    for (let i = 0; i < damageAmount; i++) {
      // Get current player state
      const currentPlayer = currentStateManager.getPlayer(playerId);
      if (!currentPlayer || currentPlayer.zones.life.length === 0) {
        // Player has no life cards remaining - mark as defeated
        console.log(`Player ${playerId} has no life cards remaining - marking as defeated`);
        const updatedFlags = new Map(currentPlayer?.flags || new Map());
        updatedFlags.set('defeated', true);
        if (currentPlayer) {
          currentStateManager = currentStateManager.updatePlayer(playerId, {
            flags: updatedFlags,
          });
        }
        return currentStateManager;
      }

      // Take the top life card (first card in life zone)
      const lifeCard = currentPlayer.zones.life[0];
      
      // Check if the life card has the Trigger keyword
      const hasTrigger = this.keywordHandler.hasTrigger(lifeCard);
      
      if (hasTrigger) {
        // Life card has trigger - move to trash
        // Note: In the full implementation with effect system integration,
        // this would:
        // 1. Query player whether to activate the trigger
        // 2. If activated: resolve trigger effect through effect system
        // 3. Effect system determines final destination (trash or hand)
        // 
        // For now, we simplify by moving directly to trash
        currentStateManager = currentStateManager.moveCard(lifeCard.id, ZoneId.TRASH);
        console.log(`Life card ${lifeCard.id} with Trigger moved to trash`);
      } else {
        // No trigger keyword - add directly to hand
        currentStateManager = currentStateManager.moveCard(lifeCard.id, ZoneId.HAND);
        console.log(`Life card ${lifeCard.id} moved to hand`);
      }
    }

    return currentStateManager;
  }
}
