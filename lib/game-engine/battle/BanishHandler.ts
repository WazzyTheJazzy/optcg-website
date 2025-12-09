/**
 * BanishHandler.ts
 * 
 * Handles Banish mechanics for the One Piece TCG Engine.
 * Banish removes cards from the game permanently, placing them in the
 * banished zone where they cannot be retrieved or interacted with.
 */

import {
  CardInstance,
  ZoneId,
} from '../core/types';
import { GameStateManager } from '../core/GameState';

/**
 * Banish a card by moving it to the banished zone permanently
 * 
 * Process:
 * 1. Move card to banished zone
 * 2. Remove all modifiers from the card
 * 
 * Note: Unlike K.O., banished cards do NOT trigger "On K.O." effects.
 * Banish is a permanent removal from the game.
 * 
 * @param card - The card to banish
 * @param stateManager - The current game state manager
 * @returns Updated state manager with card banished
 */
export function banishCard(
  card: CardInstance,
  stateManager: GameStateManager
): GameStateManager {
  // Move card to banished zone
  // This permanently removes it from the game
  const updatedStateManager = stateManager.moveCard(card.id, ZoneId.BANISHED);

  // Clear all modifiers from the banished card
  // Banished cards are frozen in their final state
  const banishedCard = updatedStateManager.getCard(card.id);
  if (banishedCard) {
    return updatedStateManager.updateCard(card.id, {
      modifiers: [],
    });
  }

  return updatedStateManager;
}

/**
 * Check if a card should be banished instead of going to trash
 * 
 * This checks if the card has the Banish keyword or if there's an
 * active effect that causes it to be banished.
 * 
 * @param card - The card to check
 * @returns True if the card should be banished
 */
export function shouldBanish(card: CardInstance): boolean {
  // Check for Banish keyword in definition
  if (card.definition.keywords.includes('Banish')) {
    return true;
  }

  // Check for Banish keyword added by modifiers
  const hasBanishModifier = card.modifiers.some(
    modifier => modifier.type === 'KEYWORD' && modifier.value === 'Banish'
  );

  return hasBanishModifier;
}
