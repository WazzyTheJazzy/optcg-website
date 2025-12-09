/**
 * CardCache.ts
 * 
 * In-memory cache for CardDefinition objects to improve performance.
 */

import { CardDefinition } from '../core/types';

/**
 * In-memory cache for card definitions
 */
export class CardCache {
  private cache: Map<string, CardDefinition>;
  private cardNumberIndex: Map<string, string>; // cardNumber -> cardId

  constructor() {
    this.cache = new Map();
    this.cardNumberIndex = new Map();
  }

  /**
   * Store a card definition in the cache
   * @param cardId - The card's database ID
   * @param definition - The card definition
   */
  set(cardId: string, definition: CardDefinition): void {
    this.cache.set(cardId, definition);
    this.cardNumberIndex.set(definition.metadata.cardNumber, cardId);
  }

  /**
   * Get a card definition by database ID
   * @param cardId - The card's database ID
   * @returns The card definition or undefined if not cached
   */
  get(cardId: string): CardDefinition | undefined {
    return this.cache.get(cardId);
  }

  /**
   * Get a card definition by card number (e.g., "OP01-001")
   * @param cardNumber - The card number
   * @returns The card definition or undefined if not cached
   */
  getByNumber(cardNumber: string): CardDefinition | undefined {
    const cardId = this.cardNumberIndex.get(cardNumber);
    if (!cardId) {
      return undefined;
    }
    return this.cache.get(cardId);
  }

  /**
   * Check if a card is cached by database ID
   * @param cardId - The card's database ID
   * @returns True if the card is cached
   */
  has(cardId: string): boolean {
    return this.cache.has(cardId);
  }

  /**
   * Check if a card is cached by card number
   * @param cardNumber - The card number
   * @returns True if the card is cached
   */
  hasByNumber(cardNumber: string): boolean {
    return this.cardNumberIndex.has(cardNumber);
  }

  /**
   * Remove a card from the cache
   * @param cardId - The card's database ID
   * @returns True if the card was removed
   */
  delete(cardId: string): boolean {
    const definition = this.cache.get(cardId);
    if (definition) {
      this.cardNumberIndex.delete(definition.metadata.cardNumber);
    }
    return this.cache.delete(cardId);
  }

  /**
   * Clear all cached cards
   */
  clear(): void {
    this.cache.clear();
    this.cardNumberIndex.clear();
  }

  /**
   * Get the number of cached cards
   * @returns The cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all cached card IDs
   * @returns Array of card IDs
   */
  getAllIds(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all cached card definitions
   * @returns Array of card definitions
   */
  getAllDefinitions(): CardDefinition[] {
    return Array.from(this.cache.values());
  }
}
