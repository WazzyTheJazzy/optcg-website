/**
 * DeckValidation.colorRestrictions.pbt.test.ts
 * 
 * Property-based tests for color restriction validation
 * 
 * Feature: ai-battle-integration, Property 53: Color Restriction Validation
 * Validates: Requirements 37.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { validateDeck } from './GameSetup';
import { RulesContext } from '../rules/RulesContext';
import { CardDefinition, CardCategory, Color } from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Property 53: Color Restriction Validation
 * 
 * For any deck, all cards should match the leader's color restrictions.
 * 
 * This property ensures that:
 * 1. Cards with colors matching the leader are valid
 * 2. Cards with colors not matching the leader are rejected
 * 3. Multi-color leaders allow cards of any of their colors
 * 4. Multi-color cards are valid if they share at least one color with the leader
 */

describe('Property 53: Color Restriction Validation', () => {
  let rules: RulesContext;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
  });

  /**
   * Helper to create a card definition with specific colors
   */
  function createCard(
    id: string,
    category: CardCategory,
    colors: string[]
  ): CardDefinition {
    return {
      id,
      name: `Card ${id}`,
      category,
      colors,
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
   * Arbitrary for generating colors
   */
  const colorArb = fc.constantFrom(
    Color.RED,
    Color.GREEN,
    Color.BLUE,
    Color.PURPLE,
    Color.BLACK,
    Color.YELLOW
  );

  it('should accept decks where all cards match leader color', () => {
    fc.assert(
      fc.property(
        colorArb, // Leader color
        (leaderColor) => {
          const deck: CardDefinition[] = [];

          // Add leader with single color
          deck.push(createCard('leader', CardCategory.LEADER, [leaderColor]));

          // Add 50 main deck cards with matching color
          for (let i = 0; i < 50; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER, [leaderColor]));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON, []));
          }

          const result = validateDeck(deck, rules);
          
          // Should not have color restriction errors
          const hasColorError = result.errors.some(e => 
            e.includes("don't match leader colors")
          );
          expect(hasColorError).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject decks with cards not matching leader color', () => {
    fc.assert(
      fc.property(
        colorArb, // Leader color
        colorArb, // Card color (different)
        (leaderColor, cardColor) => {
          // Skip if colors match
          if (leaderColor === cardColor) {
            return;
          }

          const deck: CardDefinition[] = [];

          // Add leader
          deck.push(createCard('leader', CardCategory.LEADER, [leaderColor]));

          // Add 49 matching cards
          for (let i = 0; i < 49; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER, [leaderColor]));
          }

          // Add 1 non-matching card
          deck.push(createCard('mismatch', CardCategory.CHARACTER, [cardColor]));

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON, []));
          }

          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => 
            e.includes("don't match leader colors") && e.includes('mismatch')
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept multi-color cards that share at least one color with leader', () => {
    fc.assert(
      fc.property(
        colorArb, // Leader color
        colorArb, // Second color for card
        (leaderColor, secondColor) => {
          const deck: CardDefinition[] = [];

          // Add leader
          deck.push(createCard('leader', CardCategory.LEADER, [leaderColor]));

          // Add 50 main deck cards with multiple colors (including leader color)
          for (let i = 0; i < 50; i++) {
            deck.push(
              createCard(`card-${i}`, CardCategory.CHARACTER, [leaderColor, secondColor])
            );
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON, []));
          }

          const result = validateDeck(deck, rules);
          
          // Should not have color restriction errors
          const hasColorError = result.errors.some(e => 
            e.includes("don't match leader colors")
          );
          expect(hasColorError).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support multi-color leaders', () => {
    fc.assert(
      fc.property(
        fc.array(colorArb, { minLength: 1, maxLength: 3 }), // Leader colors
        fc.array(colorArb, { minLength: 1, maxLength: 2 }), // Card colors
        (leaderColors, cardColors) => {
          // Remove duplicates
          const uniqueLeaderColors = Array.from(new Set(leaderColors));
          const uniqueCardColors = Array.from(new Set(cardColors));

          const deck: CardDefinition[] = [];

          // Add multi-color leader
          deck.push(createCard('leader', CardCategory.LEADER, uniqueLeaderColors));

          // Add 50 main deck cards
          for (let i = 0; i < 50; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER, uniqueCardColors));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON, []));
          }

          const result = validateDeck(deck, rules);
          
          // Check if card shares at least one color with leader
          const hasSharedColor = uniqueCardColors.some(cardColor =>
            uniqueLeaderColors.includes(cardColor)
          );

          const hasColorError = result.errors.some(e => 
            e.includes("don't match leader colors")
          );

          if (hasSharedColor) {
            // Should not have color errors
            expect(hasColorError).toBe(false);
          } else {
            // Should have color errors
            expect(hasColorError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate color restrictions independently of other validations', () => {
    fc.assert(
      fc.property(
        colorArb,
        colorArb,
        fc.integer({ min: 40, max: 60 }), // Deck size
        fc.integer({ min: 0, max: 2 }), // Leader count
        (leaderColor, cardColor, deckSize, leaderCount) => {
          // Skip if colors match
          if (leaderColor === cardColor) {
            return;
          }

          const deck: CardDefinition[] = [];

          // Add leaders
          for (let i = 0; i < leaderCount; i++) {
            deck.push(createCard(`leader-${i}`, CardCategory.LEADER, [leaderColor]));
          }

          // Add main deck cards with non-matching color
          for (let i = 0; i < deckSize; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER, [cardColor]));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON, []));
          }

          const result = validateDeck(deck, rules);
          
          // Check if color error exists
          const hasColorError = result.errors.some(e => 
            e.includes("don't match leader colors")
          );

          // Should have color error only if we have exactly 1 leader
          if (leaderCount === 1) {
            expect(hasColorError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle cards with no colors gracefully', () => {
    fc.assert(
      fc.property(
        colorArb, // Leader color
        fc.integer({ min: 0, max: 10 }), // Number of colorless cards
        (leaderColor, colorlessCount) => {
          const deck: CardDefinition[] = [];

          // Add leader
          deck.push(createCard('leader', CardCategory.LEADER, [leaderColor]));

          // Add colorless cards
          for (let i = 0; i < Math.min(colorlessCount, 50); i++) {
            deck.push(createCard(`colorless-${i}`, CardCategory.CHARACTER, []));
          }

          // Fill remaining with matching cards
          for (let i = colorlessCount; i < 50; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER, [leaderColor]));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON, []));
          }

          const result = validateDeck(deck, rules);
          
          // Colorless cards should not cause color errors (they're skipped)
          const hasColorError = result.errors.some(e => 
            e.includes("don't match leader colors")
          );
          expect(hasColorError).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should report all cards with color mismatches', () => {
    fc.assert(
      fc.property(
        colorArb, // Leader color
        fc.array(colorArb, { minLength: 1, maxLength: 5 }), // Different colors
        (leaderColor, otherColors) => {
          // Filter out leader color
          const mismatchColors = otherColors.filter(c => c !== leaderColor);
          
          // Skip if no mismatches
          if (mismatchColors.length === 0) {
            return;
          }

          const deck: CardDefinition[] = [];

          // Add leader
          deck.push(createCard('leader', CardCategory.LEADER, [leaderColor]));

          // Add matching cards
          const matchingCount = 50 - mismatchColors.length;
          for (let i = 0; i < matchingCount; i++) {
            deck.push(createCard(`match-${i}`, CardCategory.CHARACTER, [leaderColor]));
          }

          // Add one card for each mismatch color
          for (let i = 0; i < mismatchColors.length; i++) {
            deck.push(
              createCard(`mismatch-${i}`, CardCategory.CHARACTER, [mismatchColors[i]])
            );
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON, []));
          }

          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          
          // Should have error for each mismatched card
          const colorErrors = result.errors.filter(e => 
            e.includes("don't match leader colors")
          );
          expect(colorErrors.length).toBe(mismatchColors.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
