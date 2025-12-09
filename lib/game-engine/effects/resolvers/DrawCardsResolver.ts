/**
 * DrawCardsResolver.ts
 * 
 * Resolver for draw cards effects. Draws X cards from the player's deck
 * and adds them to their hand. Handles empty deck scenarios gracefully.
 */

import { GameState, ZoneId } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';
import { GameStateManager } from '../../core/GameState';

/**
 * Resolver for DRAW_CARDS effect type
 * 
 * Implements the card draw mechanic:
 * 1. Draw X cards from the top of the deck
 * 2. Move cards from deck to hand
 * 3. Handle empty deck appropriately (draw as many as possible)
 */
export class DrawCardsResolver implements EffectResolver {
  /**
   * Resolve a draw cards effect
   * 
   * @param effect - The effect instance containing draw parameters
   * @param state - The current game state
   * @returns Updated game state with cards moved to hand
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { cardCount } = effect.definition.parameters;

    // Validate parameters
    if (!cardCount || cardCount <= 0) {
      console.warn('Draw cards effect missing or invalid cardCount parameter');
      return state;
    }

    // Get the controller's deck
    const stateManager = new GameStateManager(state);
    const controller = effect.controller;
    const player = stateManager.getPlayer(controller);
    
    if (!player) {
      console.warn(`Draw cards effect: player ${controller} not found`);
      return state;
    }

    const deck = player.zones.deck;
    
    // Handle empty deck - effect fizzles but doesn't error
    if (deck.length === 0) {
      console.log('Draw cards effect: deck is empty, no cards to draw');
      return state;
    }

    // Determine how many cards to actually draw (limited by deck size)
    const cardsToDraw = Math.min(cardCount, deck.length);
    
    // Get the top X cards from the deck
    const topCards = deck.slice(0, cardsToDraw);

    // Move each card from deck to hand
    let updatedStateManager = stateManager;
    for (const card of topCards) {
      updatedStateManager = updatedStateManager.moveCard(card.id, ZoneId.HAND);
    }

    // Log the draw action
    console.log(`Draw cards effect: ${controller} drew ${cardsToDraw} card(s)`);

    return updatedStateManager.getState();
  }

  /**
   * Validate that a draw cards effect can be resolved
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

    // Effect can resolve even if deck is empty (it just fizzles)
    return true;
  }
}
