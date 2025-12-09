/**
 * deckLoader.ts
 * 
 * Helper functions for loading decks from the database for game initialization.
 */

import { CardDefinition } from '../core/types';
import { CardDatabaseService } from './CardDatabaseService';

/**
 * Load a deck from the database by card IDs
 * @param cardIds - Array of card IDs to load
 * @returns Promise resolving to array of CardDefinitions
 * @throws CardDataError if any card is not found
 */
export async function loadDeckFromDatabase(
  cardIds: string[]
): Promise<CardDefinition[]> {
  const service = CardDatabaseService.getInstance();
  return await service.getCardsByIds(cardIds);
}

/**
 * Load a deck from the database by card numbers
 * @param cardNumbers - Array of card numbers (e.g., ["OP01-001", "OP01-002"])
 * @returns Promise resolving to array of CardDefinitions
 * @throws CardDataError if any card is not found
 */
export async function loadDeckByCardNumbers(
  cardNumbers: string[]
): Promise<CardDefinition[]> {
  const service = CardDatabaseService.getInstance();
  const cards: CardDefinition[] = [];

  for (const cardNumber of cardNumbers) {
    const card = await service.getCardByNumber(cardNumber);
    cards.push(card);
  }

  return cards;
}

/**
 * Load a standard deck configuration from the database
 * @param config - Deck configuration with leader and main deck card IDs
 * @returns Promise resolving to complete deck as CardDefinitions
 */
export async function loadStandardDeck(config: {
  leaderId: string;
  mainDeckIds: string[];
  donCount?: number; // Default 10
}): Promise<CardDefinition[]> {
  const service = CardDatabaseService.getInstance();
  const deck: CardDefinition[] = [];

  // Load leader
  const leader = await service.getCardById(config.leaderId);
  deck.push(leader);

  // Load main deck cards
  const mainDeck = await service.getCardsByIds(config.mainDeckIds);
  deck.push(...mainDeck);

  // Add DON cards (these are typically not in the database, created programmatically)
  // DON cards will be handled by GameSetup as before

  return deck;
}
