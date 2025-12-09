/**
 * EffectParser.pbt.test.ts
 * 
 * Property-based tests for effect parsing
 * 
 * Feature: ai-battle-integration, Property 15: Effect Parsing Correctness
 * Validates: Requirements 14.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { EffectParser } from './EffectParser';
import {
  EffectType,
  EffectDefinition,
  TargetType,
} from './types';
import {
  EffectTimingType,
  TriggerTiming,
  ModifierDuration,
  CardCategory,
  Color,
} from '../core/types';

/**
 * Property 15: Effect Parsing Correctness
 * 
 * For any valid effect text, parsing should produce a structured effect definition 
 * that captures the effect's behavior.
 * 
 * This property ensures that:
 * 1. Valid effect text is parsed without errors
 * 2. The parsed effect definition contains the correct timing type
 * 3. The parsed effect definition contains the correct trigger timing
 * 4. The parsed effect definition contains the correct effect type
 * 5. The parsed effect parameters match the effect text
 */

describe('Property 15: Effect Parsing Correctness', () => {
  const parser = new EffectParser();

  /**
   * Arbitrary generator for effect labels
   */
  const effectLabelArb = fc.oneof(
    fc.constant('[On Play]'),
    fc.constant('[When Attacking]'),
    fc.constant('[When Attacked]'),
    fc.constant('[On K.O.]'),
    fc.constant('[Activate: Main]'),
    fc.constant('[End of Your Turn]'),
    fc.constant('[Start of Your Turn]')
  );

  /**
   * Arbitrary generator for power modification effects
   */
  const powerModificationArb = fc.record({
    label: effectLabelArb,
    powerChange: fc.integer({ min: -5000, max: 5000 }).filter(n => n !== 0),
    targetCount: fc.integer({ min: 1, max: 3 }),
    controller: fc.oneof(fc.constant('your'), fc.constant("your opponent's")),
    duration: fc.oneof(
      fc.constant('during this turn'),
      fc.constant('during this battle'),
      fc.constant('')
    ),
  }).map(({ label, powerChange, targetCount, controller, duration }) => {
    const sign = powerChange > 0 ? '+' : '';
    const durationText = duration ? ` ${duration}` : '';
    const upTo = targetCount > 1 ? `up to ${targetCount}` : '1';
    return {
      text: `${label} Give ${upTo} of ${controller} Leader or Character cards ${sign}${powerChange} power${durationText}.`,
      expectedType: EffectType.POWER_MODIFICATION,
      expectedPowerChange: powerChange,
      expectedTargetCount: targetCount,
    };
  });

  /**
   * Arbitrary generator for K.O. effects
   */
  const koEffectArb = fc.record({
    label: effectLabelArb,
    maxPower: fc.integer({ min: 1000, max: 10000 }),
    targetCount: fc.integer({ min: 1, max: 3 }),
    controller: fc.oneof(fc.constant('your'), fc.constant("your opponent's")),
  }).map(({ label, maxPower, targetCount, controller }) => {
    const upTo = targetCount > 1 ? `up to ${targetCount}` : '1';
    return {
      text: `${label} K.O. ${upTo} of ${controller} Characters with ${maxPower} power or less.`,
      expectedType: EffectType.KO_CHARACTER,
      expectedMaxPower: maxPower,
      expectedTargetCount: targetCount,
    };
  });

  /**
   * Arbitrary generator for draw effects
   */
  const drawEffectArb = fc.record({
    label: effectLabelArb,
    cardCount: fc.integer({ min: 1, max: 5 }),
  }).map(({ label, cardCount }) => {
    return {
      text: `${label} Draw ${cardCount} card${cardCount > 1 ? 's' : ''}.`,
      expectedType: EffectType.DRAW_CARDS,
      expectedCardCount: cardCount,
    };
  });

  /**
   * Arbitrary generator for search effects
   */
  const searchEffectArb = fc.record({
    label: effectLabelArb,
    cardCount: fc.integer({ min: 1, max: 5 }),
    category: fc.oneof(
      fc.constant('Character'),
      fc.constant('Event'),
      fc.constant('Stage')
    ),
  }).map(({ label, cardCount, category }) => {
    return {
      text: `${label} Look at the top ${cardCount} cards of your deck and add 1 ${category} card to your hand.`,
      expectedType: EffectType.SEARCH_DECK,
      expectedCardCount: cardCount,
    };
  });

  /**
   * Test: Power modification effects are parsed correctly
   */
  it('should parse power modification effects correctly', () => {
    fc.assert(
      fc.property(powerModificationArb, (effect) => {
        const cardId = 'test-card-1';
        const results = parser.parseEffectText(effect.text, cardId);
        
        // Should parse at least one effect
        expect(results.length).toBeGreaterThan(0);
        
        const parsed = results[0];
        
        // Should have correct effect type
        expect(parsed.effectType).toBe(effect.expectedType);
        
        // Should have correct power change
        expect(parsed.parameters.powerChange).toBe(effect.expectedPowerChange);
        
        // Should have correct target count
        if (effect.expectedTargetCount > 1) {
          expect(parsed.parameters.maxTargets).toBe(effect.expectedTargetCount);
        }
        
        // Should have valid timing type
        expect([
          EffectTimingType.AUTO,
          EffectTimingType.ACTIVATE,
          EffectTimingType.PERMANENT,
        ]).toContain(parsed.timingType);
        
        // Should have correct source card ID
        expect(parsed.sourceCardId).toBe(cardId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test: K.O. effects are parsed correctly
   */
  it('should parse K.O. effects correctly', () => {
    fc.assert(
      fc.property(koEffectArb, (effect) => {
        const cardId = 'test-card-2';
        const results = parser.parseEffectText(effect.text, cardId);
        
        // Should parse at least one effect
        expect(results.length).toBeGreaterThan(0);
        
        const parsed = results[0];
        
        // Should have correct effect type
        expect(parsed.effectType).toBe(effect.expectedType);
        
        // Should have correct max power
        expect(parsed.parameters.maxPower).toBe(effect.expectedMaxPower);
        
        // Should have correct target count
        if (effect.expectedTargetCount > 1) {
          expect(parsed.parameters.maxTargets).toBe(effect.expectedTargetCount);
        }
        
        // Should have valid timing type
        expect([
          EffectTimingType.AUTO,
          EffectTimingType.ACTIVATE,
        ]).toContain(parsed.timingType);
        
        // Should have correct source card ID
        expect(parsed.sourceCardId).toBe(cardId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Draw effects are parsed correctly
   */
  it('should parse draw effects correctly', () => {
    fc.assert(
      fc.property(drawEffectArb, (effect) => {
        const cardId = 'test-card-3';
        const results = parser.parseEffectText(effect.text, cardId);
        
        // Should parse at least one effect
        expect(results.length).toBeGreaterThan(0);
        
        const parsed = results[0];
        
        // Should have correct effect type
        expect(parsed.effectType).toBe(effect.expectedType);
        
        // Should have correct card count
        expect(parsed.parameters.cardCount).toBe(effect.expectedCardCount);
        
        // Should have correct source card ID
        expect(parsed.sourceCardId).toBe(cardId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Search effects are parsed correctly
   */
  it('should parse search effects correctly', () => {
    fc.assert(
      fc.property(searchEffectArb, (effect) => {
        const cardId = 'test-card-4';
        const results = parser.parseEffectText(effect.text, cardId);
        
        // Should parse at least one effect
        expect(results.length).toBeGreaterThan(0);
        
        const parsed = results[0];
        
        // Should have correct effect type
        expect(parsed.effectType).toBe(effect.expectedType);
        
        // Should have correct card count
        expect(parsed.parameters.cardCount).toBe(effect.expectedCardCount);
        
        // Should have correct source card ID
        expect(parsed.sourceCardId).toBe(cardId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Effect labels are extracted correctly
   */
  it('should extract effect labels correctly', () => {
    fc.assert(
      fc.property(effectLabelArb, (label) => {
        const effectText = `${label} Draw 1 card.`;
        const cardId = 'test-card-5';
        const results = parser.parseEffectText(effectText, cardId);
        
        // Should parse at least one effect
        expect(results.length).toBeGreaterThan(0);
        
        const parsed = results[0];
        
        // Should have correct label
        expect(parsed.label).toBe(label);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test: Timing types are determined correctly
   */
  it('should determine timing types correctly', () => {
    const testCases = [
      { label: '[On Play]', expectedTiming: EffectTimingType.AUTO },
      { label: '[When Attacking]', expectedTiming: EffectTimingType.AUTO },
      { label: '[Activate: Main]', expectedTiming: EffectTimingType.ACTIVATE },
    ];

    for (const testCase of testCases) {
      const effectText = `${testCase.label} Draw 1 card.`;
      const results = parser.parseEffectText(effectText, 'test-card');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].timingType).toBe(testCase.expectedTiming);
    }
  });

  /**
   * Test: Trigger timings are determined correctly
   */
  it('should determine trigger timings correctly', () => {
    const testCases = [
      { label: '[On Play]', expectedTrigger: TriggerTiming.ON_PLAY },
      { label: '[When Attacking]', expectedTrigger: TriggerTiming.WHEN_ATTACKING },
      { label: '[When Attacked]', expectedTrigger: TriggerTiming.WHEN_ATTACKED },
      { label: '[On K.O.]', expectedTrigger: TriggerTiming.ON_KO },
      { label: '[Activate: Main]', expectedTrigger: null },
    ];

    for (const testCase of testCases) {
      const effectText = `${testCase.label} Draw 1 card.`;
      const results = parser.parseEffectText(effectText, 'test-card');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].triggerTiming).toBe(testCase.expectedTrigger);
    }
  });

  /**
   * Test: Empty effect text returns empty array
   */
  it('should return empty array for empty effect text', () => {
    const results = parser.parseEffectText('', 'test-card');
    expect(results).toEqual([]);
  });

  /**
   * Test: Multiple effects on one card are parsed separately
   */
  it('should parse multiple effects on one card separately', () => {
    const effectText = '[On Play] Draw 1 card. [When Attacking] Give this card +1000 power during this battle.';
    const results = parser.parseEffectText(effectText, 'test-card');
    
    // Should parse two effects
    expect(results.length).toBe(2);
    
    // First effect should be draw
    expect(results[0].effectType).toBe(EffectType.DRAW_CARDS);
    expect(results[0].triggerTiming).toBe(TriggerTiming.ON_PLAY);
    
    // Second effect should be power modification
    expect(results[1].effectType).toBe(EffectType.POWER_MODIFICATION);
    expect(results[1].triggerTiming).toBe(TriggerTiming.WHEN_ATTACKING);
  });

  /**
   * Test: Duration is parsed correctly
   */
  it('should parse duration correctly', () => {
    const testCases = [
      {
        text: '[On Play] Give 1 of your Characters +1000 power during this turn.',
        expectedDuration: ModifierDuration.UNTIL_END_OF_TURN,
      },
      {
        text: '[When Attacking] Give this card +1000 power during this battle.',
        expectedDuration: ModifierDuration.UNTIL_END_OF_BATTLE,
      },
      {
        text: '[On Play] Give 1 of your Characters +1000 power.',
        expectedDuration: ModifierDuration.PERMANENT,
      },
    ];

    for (const testCase of testCases) {
      const results = parser.parseEffectText(testCase.text, 'test-card');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].parameters.duration).toBe(testCase.expectedDuration);
    }
  });

  /**
   * Test: Target controller is parsed correctly
   */
  it('should parse target controller correctly', () => {
    const testCases = [
      {
        text: '[On Play] Give 1 of your Characters +1000 power.',
        expectedController: 'self',
      },
      {
        text: '[On Play] Give 1 of your opponent\'s Characters -1000 power.',
        expectedController: 'opponent',
      },
    ];

    for (const testCase of testCases) {
      const results = parser.parseEffectText(testCase.text, 'test-card');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].parameters.targetFilter?.controller).toBe(testCase.expectedController);
    }
  });

  /**
   * Test: "Once Per Turn" is detected correctly
   */
  it('should detect "Once Per Turn" correctly', () => {
    const effectText = '[Activate: Main] [Once Per Turn] Draw 1 card.';
    const results = parser.parseEffectText(effectText, 'test-card');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].oncePerTurn).toBe(true);
  });

  /**
   * Test: Parsing does not crash on malformed input
   */
  it('should not crash on malformed input', () => {
    fc.assert(
      fc.property(fc.string(), (randomText) => {
        const cardId = 'test-card';
        // Should not throw
        expect(() => parser.parseEffectText(randomText, cardId)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });
});
