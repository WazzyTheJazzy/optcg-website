/**
 * DeckValidation.leaderRequirement.pbt.test.ts
 * 
 * Property-based tests for leader requirement validation
 * 
 * Feature: ai-battle-integration, Property 52: Leader Requirement Validation
 * Validates: Requirements 37.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { validateDeck } from './GameSetup';
import { RulesContext } from '../rules/RulesContext';
import { CardDefinition, CardCategory } from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Property 52: Leader Requirement Validation
 * 
 * For any deck, it should have exactly one leader card.
 * 
 * This property ensures that:
 * 1. Decks with exactly 1 leader are valid
 * 2. Decks with 0 leaders are rejected
 * 3. Decks with more than 1 leader are rejected
 */

describe('Property 52: Leader Requirement Validation', () => {
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
   * Helper to create a deck with specified number of leaders
   */
  function createDeckWithLeaders(leaderCount: number): CardDefinition[] {
    const deck: CardDefinition[] = [];

    // Add leaders
    for (let i = 0; i < leaderCount; i++) {
      deck.push(createCard(`leader-${i}`, CardCategory.LEADER));
    }

    // Add 50 main deck cards
    for (let i = 0; i < 50; i++) {
      deck.push(createCard(`card-${i}`, CardCategory.CHARACTER));
    }

    // Add DON cards
    for (let i = 0; i < 10; i++) {
      deck.push(createCard(`don-${i}`, CardCategory.DON));
    }

    return deck;
  }

  it('should accept decks with exactly 1 leader', () => {
    fc.assert(
      fc.property(
        fc.constant(1), // Always 1 leader
        (leaderCount) => {
          const deck = createDeckWithLeaders(leaderCount);
          const result = validateDeck(deck, rules);
          
          // Should be valid (no leader-related errors)
          const hasLeaderError = result.errors.some(e => e.includes('leader'));
          expect(hasLeaderError).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject decks with 0 leaders', () => {
    fc.assert(
      fc.property(
        fc.constant(0), // No leaders
        (leaderCount) => {
          const deck = createDeckWithLeaders(leaderCount);
          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => 
            e.includes('exactly 1 leader') && e.includes('found 0')
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject decks with more than 1 leader', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // 2-10 leaders
        (leaderCount) => {
          const deck = createDeckWithLeaders(leaderCount);
          const result = validateDeck(deck, rules);
          
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => 
            e.includes('exactly 1 leader') && e.includes(`found ${leaderCount}`)
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate leader count independently of deck composition', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // Number of leaders
        fc.integer({ min: 40, max: 60 }), // Main deck size
        fc.integer({ min: 5, max: 15 }), // DON count
        (leaderCount, mainDeckSize, donCount) => {
          const deck: CardDefinition[] = [];

          // Add leaders
          for (let i = 0; i < leaderCount; i++) {
            deck.push(createCard(`leader-${i}`, CardCategory.LEADER));
          }

          // Add main deck cards
          for (let i = 0; i < mainDeckSize; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER));
          }

          // Add DON cards
          for (let i = 0; i < donCount; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON));
          }

          const result = validateDeck(deck, rules);
          
          // Check if leader error exists
          const hasLeaderError = result.errors.some(e => 
            e.includes('exactly 1 leader')
          );

          // Should have leader error only if leaderCount != 1
          if (leaderCount !== 1) {
            expect(hasLeaderError).toBe(true);
            expect(result.errors.some(e => e.includes(`found ${leaderCount}`))).toBe(true);
          } else {
            expect(hasLeaderError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate leader has life value', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // Whether leader has life value
        (hasLifeValue) => {
          const deck: CardDefinition[] = [];

          // Add leader with or without life value
          const leader = createCard('leader', CardCategory.LEADER);
          if (!hasLifeValue) {
            leader.lifeValue = null;
          }
          deck.push(leader);

          // Add 50 main deck cards
          for (let i = 0; i < 50; i++) {
            deck.push(createCard(`card-${i}`, CardCategory.CHARACTER));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON));
          }

          const result = validateDeck(deck, rules);
          
          // Check if life value error exists
          const hasLifeValueError = result.errors.some(e => 
            e.includes('life value')
          );

          if (!hasLifeValue) {
            expect(hasLifeValueError).toBe(true);
          } else {
            expect(hasLifeValueError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate leader requirement with various card categories', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.array(
          fc.constantFrom(CardCategory.CHARACTER, CardCategory.EVENT, CardCategory.STAGE),
          { minLength: 50, maxLength: 50 }
        ),
        (leaderCount, mainDeckCategories) => {
          const deck: CardDefinition[] = [];

          // Add leaders
          for (let i = 0; i < leaderCount; i++) {
            deck.push(createCard(`leader-${i}`, CardCategory.LEADER));
          }

          // Add main deck cards with various categories
          for (let i = 0; i < 50; i++) {
            const category = mainDeckCategories[i];
            deck.push(createCard(`card-${i}`, category));
          }

          // Add DON cards
          for (let i = 0; i < 10; i++) {
            deck.push(createCard(`don-${i}`, CardCategory.DON));
          }

          const result = validateDeck(deck, rules);
          
          // Check leader validation
          const hasLeaderError = result.errors.some(e => 
            e.includes('exactly 1 leader')
          );

          if (leaderCount !== 1) {
            expect(hasLeaderError).toBe(true);
          } else {
            expect(hasLeaderError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
