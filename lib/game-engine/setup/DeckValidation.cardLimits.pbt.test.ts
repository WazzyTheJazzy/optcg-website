/**
 * DeckValidation.cardLimits.pbt.test.ts
 * 
 * Property-based tests for card limit validation
 * 
 * Feature: ai-battle-integration, Property 51: Card Limit Validation
 * Validates: Requirements 37.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { validateDeck } from './GameSetup';
import { RulesContext } from '../rules/RulesContext';
import { CardDefinition, CardCategory } from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Property 51: Card Limit Validation
 * 
 * For any deck, no card (except DON) should appear more than 4 times.
 * 
 * This property ensures that:
 * 1. Decks with at most 4 copies of each card are valid
 * 2. Decks with more than 4 copies of any card are rejected
 * 3. DON cards are exempt from this limit
 */

describe('Property 51: Card Limit Validation', () => {
  let rules: RulesContext;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
  });

  /**
   * Helper to create a card definition
   */
  function createCard(id: string, category: CardCategory, name?: string): CardDefinition {
    return {
      id,
      name: name || `Card ${id}`,
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
   * Helper to create a deck with specified card copies
   */
  function createDeckWithCopies(cardCopies: Map<string, number>): CardDefinition[] {
    const deck: CardDefinition[] = [];

    // Add leader
    deck.push(createCard('leader', CardCategory.LEADER));

    // Add cards according to copy counts
    let cardIndex = 0;
    for (const [cardId, count] of cardCopies.entries()) {
      for (let i = 0; i < count; i++) {
        deck.push(createCard(cardId, CardCategory.CHARACTER, `Card ${cardId}`));
        cardIndex++;
      }
    }

    // Fill remaining slots to reach 50 cards
    while (cardIndex < 50) {
      deck.push(createCard(`filler-${cardIndex}`, CardCategory.CHARACTER));
      cardIndex++;
    }

    // Add DON cards
    for (let i = 0; i < 10; i++) {
      deck.push(createCard(`don-${i}`, CardCategory.DON));
    }

    return deck;
  }

  it('should accept decks with at most 4 copies of each card', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            cardId: fc.string({ minLength: 1, maxLength: 10 }),
            copies: fc.integer({ min: 1, max: 4 })
          }),
          { minLength: 1, maxLength: 12 } // Up to 12 different cards with 4 copies each = 48 cards
        ),
        (cardSpecs) => {
          const cardCopies = new Map<string, number>();
          let totalCards = 0;

          // Build card copy map
          for (const spec of cardSpecs) {
            if (totalCards + spec.copies <= 50) {
              cardCopies.set(spec.cardId, spec.copies);
              totalCards += spec.copies;
            }
          }

          // Skip if we don't have enough cards
          if (totalCards === 0) {
            return;
          }

          const deck = createDeckWithCopies(cardCopies);
          const result = validateDeck(deck, rules);
          
          // Should be valid since all cards have at most 4 copies
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject decks with more than 4 copies of any card', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }), // Card ID
        fc.integer({ min: 5, max: 10 }), // Number of copies (5-10)
        (cardId, copies) => {
          const cardCopies = new Map<string, number>();
          cardCopies.set(cardId, copies);

          const deck = createDeckWithCopies(cardCopies);
          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => 
            e.includes(`appears ${copies} times`) && e.includes('max 4 copies')
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow unlimited DON cards', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 20 }), // Number of DON cards
        (donCount) => {
          const deck: CardDefinition[] = [];

          // Add leader
          deck.push(createCard('leader', CardCategory.LEADER));

          // Add 50 main deck cards
          for (let i = 0; i < 50; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER));
          }

          // Add DON cards (all with same ID to test unlimited copies)
          for (let i = 0; i < donCount; i++) {
            deck.push(createCard('don-card', CardCategory.DON));
          }

          const result = validateDeck(deck, rules);
          
          // Should fail due to wrong DON count, but NOT due to card limit
          expect(result.errors.every(e => !e.includes('max 4 copies'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect multiple cards exceeding the limit', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            cardId: fc.string({ minLength: 1, maxLength: 10 }),
            copies: fc.integer({ min: 5, max: 8 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (cardSpecs) => {
          const cardCopies = new Map<string, number>();
          let totalCards = 0;

          // Build card copy map
          for (const spec of cardSpecs) {
            if (totalCards + spec.copies <= 50) {
              cardCopies.set(spec.cardId, spec.copies);
              totalCards += spec.copies;
            }
          }

          // Skip if we don't have at least 2 cards
          if (cardCopies.size < 2) {
            return;
          }

          const deck = createDeckWithCopies(cardCopies);
          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          
          // Count how many cards exceed the limit
          const exceedingCards = Array.from(cardCopies.values()).filter(count => count > 4);
          
          // Should have error for each card exceeding the limit
          const limitErrors = result.errors.filter(e => e.includes('max 4 copies'));
          expect(limitErrors.length).toBe(exceedingCards.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate card limits independently of deck size', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 40, max: 60 }), // Varying deck sizes
        (cardId, copies, deckSize) => {
          const deck: CardDefinition[] = [];

          // Add leader
          deck.push(createCard('leader', CardCategory.LEADER));

          // Add copies of the test card
          for (let i = 0; i < Math.min(copies, deckSize); i++) {
            deck.push(createCard(cardId, CardCategory.CHARACTER, `Test Card`));
          }

          // Fill remaining slots
          for (let i = copies; i < deckSize; i++) {
            deck.push(createCard(`filler-${i}`, CardCategory.CHARACTER));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON));
          }

          const result = validateDeck(deck, rules);
          
          // Check if card limit error exists
          const hasCardLimitError = result.errors.some(e => 
            e.includes('max 4 copies')
          );

          // Should have card limit error only if copies > 4
          if (copies > 4) {
            expect(hasCardLimitError).toBe(true);
          } else {
            expect(hasCardLimitError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
