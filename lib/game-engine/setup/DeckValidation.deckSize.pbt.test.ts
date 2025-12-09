/**
 * DeckValidation.deckSize.pbt.test.ts
 * 
 * Property-based tests for deck size validation
 * 
 * Feature: ai-battle-integration, Property 50: Deck Size Validation
 * Validates: Requirements 37.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { validateDeck } from './GameSetup';
import { RulesContext } from '../rules/RulesContext';
import { CardDefinition, CardCategory } from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Property 50: Deck Size Validation
 * 
 * For any deck, it should contain exactly 50 cards (excluding the leader).
 * 
 * This property ensures that:
 * 1. Decks with exactly 50 cards (+ 1 leader + 10 DON) are valid
 * 2. Decks with fewer than 50 cards are rejected
 * 3. Decks with more than 50 cards are rejected
 */

describe('Property 50: Deck Size Validation', () => {
  let rules: RulesContext;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
  });

  /**
   * Helper to create a card definition
   */
  function createCard(id: string, category: CardCategory): CardDefinition {
    return {
      id,
      name: `Card ${id}`,
      category,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: category === CardCategory.CHARACTER ? 5000 : null,
      baseCost: category === CardCategory.CHARACTER ? 3 : null,
      lifeValue: category === CardCategory.LEADER ? 5 : null,
      counterValue: category === CardCategory.CHARACTER ? 1000 : null,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };
  }

  /**
   * Helper to create a valid deck with specified main deck size
   */
  function createDeckWithSize(mainDeckSize: number): CardDefinition[] {
    const deck: CardDefinition[] = [];

    // Add leader
    deck.push(createCard('leader', CardCategory.LEADER));

    // Add main deck cards
    for (let i = 0; i < mainDeckSize; i++) {
      deck.push(createCard(`card-${i}`, CardCategory.CHARACTER));
    }

    // Add DON cards
    for (let i = 0; i < 10; i++) {
      deck.push(createCard(`don-${i}`, CardCategory.DON));
    }

    return deck;
  }

  it('should accept decks with exactly 50 cards in main deck', () => {
    fc.assert(
      fc.property(
        fc.constant(50), // Always 50 cards
        (size) => {
          const deck = createDeckWithSize(size);
          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject decks with fewer than 50 cards in main deck', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 49 }), // 0 to 49 cards
        (size) => {
          const deck = createDeckWithSize(size);
          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('Main deck'))).toBe(true);
          expect(result.errors.some(e => e.includes(`found ${size}`))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject decks with more than 50 cards in main deck', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 100 }), // 51 to 100 cards
        (size) => {
          const deck = createDeckWithSize(size);
          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('Main deck'))).toBe(true);
          expect(result.errors.some(e => e.includes(`found ${size}`))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate deck size independently of card types', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.array(fc.constantFrom(CardCategory.CHARACTER, CardCategory.EVENT, CardCategory.STAGE), { minLength: 0, maxLength: 50 }),
        (totalSize, categories) => {
          const deck: CardDefinition[] = [];

          // Add leader
          deck.push(createCard('leader', CardCategory.LEADER));

          // Add main deck cards with various categories
          const mainDeckSize = Math.min(totalSize, categories.length);
          for (let i = 0; i < mainDeckSize; i++) {
            const category = categories[i] || CardCategory.CHARACTER;
            deck.push(createCard(`card-${i}`, category));
          }

          // Fill remaining slots if needed
          for (let i = mainDeckSize; i < totalSize; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON));
          }

          const result = validateDeck(deck, rules);
          
          // Should be valid only if exactly 50 cards
          if (totalSize === 50) {
            expect(result.valid).toBe(true);
          } else {
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Main deck'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
