/**
 * Property-Based Tests for Card Effect Validation
 * 
 * Feature: ai-battle-integration, Property 17: Effect Definition Validation
 * Validates: Requirements 14.3
 * 
 * Tests that effect definitions are validated during loading and invalid
 * effects are detected and handled appropriately.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { EffectParser } from './EffectParser';
import { EffectTimingType, TriggerTiming } from '../core/types';
import { EffectType, EffectDefinition } from './types';

describe('Property 17: Effect Definition Validation', () => {
  const effectParser = new EffectParser();

  /**
   * Validator function for effect definitions
   */
  function validateEffectDefinition(effect: EffectDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields validation
    if (!effect.id || typeof effect.id !== 'string' || effect.id.trim() === '') {
      errors.push('Effect must have a non-empty id');
    }

    if (!effect.sourceCardId || typeof effect.sourceCardId !== 'string' || effect.sourceCardId.trim() === '') {
      errors.push('Effect must have a non-empty sourceCardId');
    }

    if (!effect.label || typeof effect.label !== 'string' || effect.label.trim() === '') {
      errors.push('Effect must have a non-empty label');
    }

    if (!effect.timingType || !Object.values(EffectTimingType).includes(effect.timingType)) {
      errors.push('Effect must have a valid timingType');
    }

    if (!effect.effectType || !Object.values(EffectType).includes(effect.effectType)) {
      errors.push('Effect must have a valid effectType');
    }

    if (!effect.parameters || typeof effect.parameters !== 'object') {
      errors.push('Effect must have a parameters object');
    }

    if (typeof effect.oncePerTurn !== 'boolean') {
      errors.push('Effect oncePerTurn must be a boolean');
    }

    if (typeof effect.usedThisTurn !== 'boolean') {
      errors.push('Effect usedThisTurn must be a boolean');
    }

    // Timing validation
    if (effect.timingType === EffectTimingType.AUTO) {
      if (!effect.triggerTiming || !Object.values(TriggerTiming).includes(effect.triggerTiming)) {
        errors.push('AUTO effects must have a valid triggerTiming');
      }
    }

    if (effect.timingType === EffectTimingType.ACTIVATE) {
      if (effect.triggerTiming !== null) {
        errors.push('ACTIVATE effects should not have a triggerTiming');
      }
    }

    // Parameters validation based on effect type
    if (effect.parameters) {
      if (effect.effectType === EffectType.POWER_MODIFICATION) {
        if (effect.parameters.powerChange === undefined) {
          errors.push('POWER_MODIFICATION effects must have powerChange parameter');
        }
      }

      if (effect.effectType === EffectType.DRAW_CARDS) {
        if (!effect.parameters.cardCount || effect.parameters.cardCount < 1) {
          errors.push('DRAW_CARDS effects must have cardCount >= 1');
        }
      }

      if (effect.effectType === EffectType.KO_CHARACTER) {
        if (!effect.parameters.maxPower && !effect.parameters.maxCost && !effect.parameters.targetFilter) {
          errors.push('KO_CHARACTER effects must have targeting criteria');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generator for valid effect text
   */
  const validEffectTextArb = fc.oneof(
    fc.constant('[On Play] Give up to 1 of your Leader or Character cards +1000 power during this turn.'),
    fc.constant('[When Attacking] Give this card +2000 power during this battle.'),
    fc.constant('[On Play] K.O. up to 1 of your opponent\'s Characters with 3000 power or less.'),
    fc.constant('[On Play] Draw 2 cards.'),
    fc.constant('[Rush]'),
    fc.constant('[Blocker]'),
  );

  /**
   * Generator for potentially invalid effect text
   */
  const invalidEffectTextArb = fc.oneof(
    fc.constant('This is not a valid effect'),
    fc.constant('[Unknown Label] Do something'),
    fc.constant('Give +1000 power'), // Missing label
    fc.constant('[On Play]'), // Label only, no body
  );

  it('should validate that all parsed effects have required fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        validEffectTextArb,
        (cardNumber, effectText) => {
          const effects = effectParser.parseEffectText(effectText, cardNumber);

          // Property: All parsed effects should be valid
          for (const effect of effects) {
            const validation = validateEffectDefinition(effect);
            
            if (!validation.valid) {
              console.log('Invalid effect:', effect);
              console.log('Validation errors:', validation.errors);
            }
            
            expect(validation.valid).toBe(true);
            expect(validation.errors).toEqual([]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect effects with missing required fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        validEffectTextArb,
        (cardNumber, effectText) => {
          const effects = effectParser.parseEffectText(effectText, cardNumber);

          for (const effect of effects) {
            // Create invalid versions by removing required fields
            const invalidEffects = [
              { ...effect, id: '' },
              { ...effect, sourceCardId: '' },
              { ...effect, label: '' },
              { ...effect, effectType: 'INVALID_TYPE' as any },
              { ...effect, parameters: null as any },
            ];

            // Property: Validation should detect missing/invalid fields
            for (const invalidEffect of invalidEffects) {
              const validation = validateEffectDefinition(invalidEffect);
              expect(validation.valid).toBe(false);
              expect(validation.errors.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate timing type and trigger timing consistency', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        validEffectTextArb,
        (cardNumber, effectText) => {
          const effects = effectParser.parseEffectText(effectText, cardNumber);

          for (const effect of effects) {
            // Property: AUTO effects must have trigger timing
            if (effect.timingType === EffectTimingType.AUTO) {
              expect(effect.triggerTiming).not.toBeNull();
              expect(Object.values(TriggerTiming)).toContain(effect.triggerTiming);
            }

            // Property: ACTIVATE effects should not have trigger timing
            if (effect.timingType === EffectTimingType.ACTIVATE) {
              expect(effect.triggerTiming).toBeNull();
            }

            // Property: PERMANENT effects should not have trigger timing
            if (effect.timingType === EffectTimingType.PERMANENT) {
              expect(effect.triggerTiming).toBeNull();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate effect parameters match effect type', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        validEffectTextArb,
        (cardNumber, effectText) => {
          const effects = effectParser.parseEffectText(effectText, cardNumber);

          for (const effect of effects) {
            // Property: Effect parameters should be appropriate for effect type
            switch (effect.effectType) {
              case EffectType.POWER_MODIFICATION:
                // Should have powerChange
                expect(effect.parameters.powerChange).toBeDefined();
                expect(typeof effect.parameters.powerChange).toBe('number');
                break;

              case EffectType.DRAW_CARDS:
                // Should have cardCount
                expect(effect.parameters.cardCount).toBeDefined();
                expect(typeof effect.parameters.cardCount).toBe('number');
                expect(effect.parameters.cardCount).toBeGreaterThan(0);
                break;

              case EffectType.KO_CHARACTER:
                // Should have some targeting criteria
                const hasTargeting = 
                  effect.parameters.maxPower !== undefined ||
                  effect.parameters.maxCost !== undefined ||
                  effect.parameters.targetFilter !== undefined;
                expect(hasTargeting).toBe(true);
                break;

              case EffectType.SEARCH_DECK:
                // Should have cardCount
                expect(effect.parameters.cardCount).toBeDefined();
                expect(typeof effect.parameters.cardCount).toBe('number');
                break;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle unparseable effect text gracefully', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        invalidEffectTextArb,
        (cardNumber, effectText) => {
          // Should not throw an error
          let effects: EffectDefinition[] = [];
          expect(() => {
            effects = effectParser.parseEffectText(effectText, cardNumber);
          }).not.toThrow();

          // Property: Unparseable text should result in empty array or
          // effects that still have valid structure (even if not meaningful)
          for (const effect of effects) {
            // If any effects were parsed, they should still be structurally valid
            expect(effect).toHaveProperty('id');
            expect(effect).toHaveProperty('sourceCardId');
            expect(effect).toHaveProperty('effectType');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate that effect IDs are unique within a card', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        fc.array(validEffectTextArb, { minLength: 2, maxLength: 4 }),
        (cardNumber, effectTexts) => {
          const combinedEffect = effectTexts.join(' ');
          const effects = effectParser.parseEffectText(combinedEffect, cardNumber);

          if (effects.length > 1) {
            // Property: All effect IDs should be unique
            const ids = effects.map(e => e.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate that sourceCardId matches the card for all effects', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        validEffectTextArb,
        (cardNumber, effectText) => {
          const effects = effectParser.parseEffectText(effectText, cardNumber);

          // Property: All effects should reference the correct source card
          for (const effect of effects) {
            expect(effect.sourceCardId).toBe(cardNumber);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate boolean flags are properly initialized', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        validEffectTextArb,
        (cardNumber, effectText) => {
          const effects = effectParser.parseEffectText(effectText, cardNumber);

          for (const effect of effects) {
            // Property: Boolean flags should be initialized correctly
            expect(typeof effect.oncePerTurn).toBe('boolean');
            expect(typeof effect.usedThisTurn).toBe('boolean');
            
            // usedThisTurn should always start as false
            expect(effect.usedThisTurn).toBe(false);
            
            // oncePerTurn should be true if text contains [Once Per Turn]
            if (effectText.toLowerCase().includes('[once per turn]')) {
              expect(effect.oncePerTurn).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
