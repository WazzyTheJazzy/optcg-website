/**
 * DiscardCardsResolver.ts
 * 
 * Resolver for discard cards effects. Discards X cards from the player's hand
 * and moves them to the trash zone. Handles player choice for which cards to discard.
 */

import { GameState, ZoneId } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';
import { GameStateManager } from '../../core/GameState';

/**
 * Resolver for DISCARD_CARDS effect type
 * 
 * Implements the card discard mechanic:
 * 1. Discard X cards from hand
 * 2. Prompt player to choose cards to discard
 * 3. Move cards from hand to trash
 */
export class DiscardCardsResolver implements EffectResolver {
  /**
   * Resolve a discard cards effect
   * 
   * @param effect - The effect instance containing discard parameters
   * @param state - The current game state
   * @returns Updated game state with cards moved to trash
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { cardCount, minTargets, maxTargets } = effect.definition.parameters;

    // Validate parameters
    if (!cardCount || cardCount <= 0) {
      console.warn('Discard cards effect missing or invalid cardCount parameter');
      return state;
    }

    // Get the controller's hand
    const stateManager = new GameStateManager(state);
    const controller = effect.controller;
    const player = stateManager.getPlayer(controller);
    
    if (!player) {
      console.warn(`Discard cards effect: player ${controller} not found`);
      return state;
    }

    const hand = player.zones.hand;
    
    // Handle empty hand - effect fizzles but doesn't error
    if (hand.length === 0) {
      console.log('Discard cards effect: hand is empty, no cards to discard');
      return state;
    }

    // Determine how many cards to actually discard
    // Use minTargets/maxTargets if specified, otherwise use cardCount
    const minDiscard = minTargets !== undefined ? minTargets : cardCount;
    const maxDiscard = maxTargets !== undefined ? maxTargets : cardCount;
    
    // Limit by hand size
    const actualMaxDiscard = Math.min(maxDiscard, hand.length);
    const actualMinDiscard = Math.min(minDiscard, hand.length);
    
    // For now, automatically choose cards to discard
    // In a full implementation, the player would choose these cards through
    // the effect targeting system before the effect is resolved
    const cardsToDiscard = this.autoSelectCardsToDiscard(
      hand,
      actualMinDiscard,
      actualMaxDiscard
    );

    // Move each card from hand to trash
    let updatedStateManager = stateManager;
    for (const card of cardsToDiscard) {
      updatedStateManager = updatedStateManager.moveCard(card.id, ZoneId.TRASH);
    }

    // Log the discard action
    console.log(
      `Discard cards effect: ${controller} discarded ${cardsToDiscard.length} card(s)`
    );

    return updatedStateManager.getState();
  }

  /**
   * Validate that a discard cards effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    const { cardCount } = effect.definition.parameters;
    
    // Must have a valid cardCount
    if (!cardCount || cardCount <= 0) {
      return false;
    }

    // Effect can resolve even if hand is empty (it just fizzles)
    return true;
  }

  /**
   * Automatically select cards to discard from hand
   * 
   * In a full implementation, the player would choose these cards through
   * the effect targeting system before the effect is resolved. For now,
   * we automatically select cards from the hand.
   * 
   * Strategy: Discard lowest cost cards first (to preserve high-value cards)
   * 
   * @param hand - Cards in hand
   * @param minDiscard - Minimum number of cards to discard
   * @param maxDiscard - Maximum number of cards to discard
   * @returns Array of cards to discard
   */
  private autoSelectCardsToDiscard(
    hand: any[],
    minDiscard: number,
    maxDiscard: number
  ): any[] {
    // Sort hand by cost (ascending) to discard lowest cost cards first
    const sortedHand = [...hand].sort((a, b) => {
      const costA = a.definition?.baseCost || 0;
      const costB = b.definition?.baseCost || 0;
      return costA - costB;
    });

    // Select the number of cards to discard (prefer minimum to keep more cards)
    const numToDiscard = minDiscard;
    
    return sortedHand.slice(0, numToDiscard);
  }
}
