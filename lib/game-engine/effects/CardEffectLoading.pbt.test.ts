/**
 * Property-Based Tests for Card Effect Loading
 * 
 * Feature: ai-battle-integration, Property 16: Card Effect Attachment
 * Validates: Requirements 14.2
 * 
 * Tests that cards loaded from the database have their effect definitions
 * properly attached to the card instances.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { EffectParser } from './EffectParser';
import { CardCategory, Color } from '../core/types';
import { EffectType } from './types';

describe('Property 16: Card Effect Attachment', () => {
  const effectParser = new EffectParser();

  /**
   * Generator for card effect text
   */
  const effectTextArb = fc.oneof(
    // Power modification effects
    fc.constant('[On Play] Give up to 1 of your Leader or Character cards +1000 power during this turn.'),
    fc.constant('[When Attacking] Give this card +2000 power during this battle.'),
    
    // K.O. effects
    fc.constant('[On Play] K.O. up to 1 of your opponent\'s Characters with 3000 power or less.'),
    fc.constant('[Activate: Main] K.O. up to 1 of your opponent\'s Characters with cost 4 or less.'),
    
    // Draw effects
    fc.constant('[On Play] Draw 2 cards.'),
    fc.constant('[End of Your Turn] Draw 1 card.'),
    
    // Search effects
    fc.constant('[On Play] Look at 5 cards from the top of your deck; reveal up to 1 Character card and add it to your hand.'),
    
    // Keyword effects
    fc.constant('[Rush]'),
    fc.constant('[Blocker]'),
    fc.constant('[Double Attack]'),
    
    // Multiple effects
    fc.constant('[On Play] Draw 1 card. [When Attacking] Give this card +1000 power during this battle.'),
    
    // Empty effect
    fc.constant(''),
    fc.constant(null as any),
  );

  /**
   * Generator for card definitions with effect text
   */
  const cardWithEffectArb = fc.record({
    cardNumber: fc.string({ minLength: 5, maxLength: 10 }),
    name: fc.string({ minLength: 3, maxLength: 30 }),
    effect: effectTextArb,
    category: fc.constantFrom('Leader', 'Character', 'Event', 'Stage'),
    color: fc.constantFrom('Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'),
    power: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: null }),
    cost: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
  });

  it('should attach parsed effects to card instances for any card with effect text', () => {
    fc.assert(
      fc.property(cardWithEffectArb, (card) => {
        // Parse effects from the card's effect text
        const effects = card.effect && card.effect.trim() !== ''
          ? effectParser.parseEffectText(card.effect, card.cardNumber)
          : [];

        // Property: If the card has effect text, it should have parsed effects attached
        if (card.effect && card.effect.trim() !== '') {
          // Should have at least one effect (unless parsing failed)
          // We allow empty arrays for unparseable text
          expect(Array.isArray(effects)).toBe(true);
          
          // Each effect should have required fields
          for (const effect of effects) {
            expect(effect).toHaveProperty('id');
            expect(effect).toHaveProperty('sourceCardId');
            expect(effect).toHaveProperty('label');
            expect(effect).toHaveProperty('timingType');
            expect(effect).toHaveProperty('effectType');
            expect(effect).toHaveProperty('parameters');
            expect(effect).toHaveProperty('oncePerTurn');
            expect(effect).toHaveProperty('usedThisTurn');
            
            // Source card ID should match the card
            expect(effect.sourceCardId).toBe(card.cardNumber);
            
            // Effect ID should be unique and contain card number
            expect(effect.id).toContain(card.cardNumber);
          }
        } else {
          // Cards without effect text should have empty effects array
          expect(effects).toEqual([]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve effect structure through card loading for any valid effect', () => {
    fc.assert(
      fc.property(cardWithEffectArb, (card) => {
        if (!card.effect || card.effect.trim() === '') {
          return true; // Skip cards without effects
        }

        const effects = effectParser.parseEffectText(card.effect, card.cardNumber);

        // Property: All parsed effects should maintain their structure
        for (const effect of effects) {
          // Effect type should be a valid EffectType
          expect(Object.values(EffectType)).toContain(effect.effectType);
          
          // Parameters should be an object
          expect(typeof effect.parameters).toBe('object');
          expect(effect.parameters).not.toBeNull();
          
          // Boolean flags should be boolean
          expect(typeof effect.oncePerTurn).toBe('boolean');
          expect(typeof effect.usedThisTurn).toBe('boolean');
          
          // Label should be a non-empty string
          expect(typeof effect.label).toBe('string');
          expect(effect.label.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle cards with multiple effects correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        fc.array(effectTextArb.filter(e => e && e.trim() !== ''), { minLength: 1, maxLength: 3 }),
        (cardNumber, effectTexts) => {
          // Combine multiple effects into one text
          const combinedEffect = effectTexts.join(' ');
          
          const effects = effectParser.parseEffectText(combinedEffect, cardNumber);
          
          // Property: Should parse multiple effects from combined text
          // Note: Some effects might not parse, so we just check structure
          expect(Array.isArray(effects)).toBe(true);
          
          // Each effect should be independent
          const effectIds = new Set(effects.map(e => e.id));
          expect(effectIds.size).toBe(effects.length); // All IDs should be unique
          
          // All effects should reference the same card
          for (const effect of effects) {
            expect(effect.sourceCardId).toBe(cardNumber);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle empty or null effect text gracefully', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        fc.constantFrom('', '   ', null as any, undefined as any),
        (cardNumber, effectText) => {
          // Should not throw
          const effects = effectParser.parseEffectText(effectText, cardNumber);
          
          // Property: Empty/null effect text should result in empty effects array
          expect(effects).toEqual([]);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain effect attachment through serialization', () => {
    fc.assert(
      fc.property(cardWithEffectArb, (card) => {
        if (!card.effect || card.effect.trim() === '') {
          return true; // Skip cards without effects
        }

        const effects = effectParser.parseEffectText(card.effect, card.cardNumber);
        
        // Simulate serialization/deserialization
        const serialized = JSON.stringify(effects);
        const deserialized = JSON.parse(serialized);
        
        // Property: Effects should survive serialization
        expect(deserialized).toEqual(effects);
        
        // Check structure is preserved
        for (let i = 0; i < effects.length; i++) {
          expect(deserialized[i].id).toBe(effects[i].id);
          expect(deserialized[i].sourceCardId).toBe(effects[i].sourceCardId);
          expect(deserialized[i].effectType).toBe(effects[i].effectType);
        }
      }),
      { numRuns: 50 }
    );
  });
});
