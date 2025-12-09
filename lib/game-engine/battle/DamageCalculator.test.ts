/**
 * DamageCalculator.test.ts
 * 
 * Unit tests for the DamageCalculator class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DamageCalculator } from './DamageCalculator';
import {
  CardInstance,
  CardDefinition,
  CardCategory,
  PlayerId,
  ZoneId,
  CardState,
  ModifierType,
  ModifierDuration,
  Modifier,
  DonInstance,
} from '../core/types';

describe('DamageCalculator', () => {
  let calculator: DamageCalculator;

  beforeEach(() => {
    calculator = new DamageCalculator();
  });

  // Helper function to create a test card
  function createTestCard(overrides: Partial<CardDefinition> = {}): CardInstance {
    const definition: CardDefinition = {
      id: 'test-card-1',
      name: 'Test Character',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
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
      ...overrides,
    };

    return {
      id: 'instance-1',
      definition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  // Helper function to create a DON instance
  function createTestDon(id: string): DonInstance {
    return {
      id,
      owner: PlayerId.PLAYER_1,
      zone: ZoneId.COST_AREA,
      state: CardState.ACTIVE,
    };
  }

  // Helper function to create a modifier
  function createModifier(
    type: ModifierType,
    value: number,
    duration: ModifierDuration = ModifierDuration.PERMANENT
  ): Modifier {
    return {
      id: `modifier-${Math.random()}`,
      type,
      value,
      duration,
      source: 'test-source',
      timestamp: Date.now(),
    };
  }

  describe('computeCurrentPower', () => {
    it('should return base power for a card with no modifiers or DON', () => {
      const card = createTestCard({ basePower: 5000 });
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(5000);
    });

    it('should return 0 for a card with null base power', () => {
      const card = createTestCard({ basePower: null });
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(0);
    });

    it('should add power modifiers to base power', () => {
      const card = createTestCard({ basePower: 5000 });
      card.modifiers = [
        createModifier(ModifierType.POWER, 2000),
        createModifier(ModifierType.POWER, 1000),
      ];
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(8000); // 5000 + 2000 + 1000
    });

    it('should add given DON power (1000 per DON)', () => {
      const card = createTestCard({ basePower: 5000 });
      card.givenDon = [
        createTestDon('don-1'),
        createTestDon('don-2'),
        createTestDon('don-3'),
      ];
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(8000); // 5000 + (3 * 1000)
    });

    it('should combine base power, modifiers, and given DON', () => {
      const card = createTestCard({ basePower: 5000 });
      card.modifiers = [
        createModifier(ModifierType.POWER, 2000),
        createModifier(ModifierType.POWER, -1000),
      ];
      card.givenDon = [
        createTestDon('don-1'),
        createTestDon('don-2'),
      ];
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(8000); // 5000 + 2000 - 1000 + 2000
    });

    it('should handle negative power modifiers', () => {
      const card = createTestCard({ basePower: 5000 });
      card.modifiers = [
        createModifier(ModifierType.POWER, -3000),
      ];
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(2000); // 5000 - 3000
    });

    it('should allow power to go negative', () => {
      const card = createTestCard({ basePower: 5000 });
      card.modifiers = [
        createModifier(ModifierType.POWER, -6000),
      ];
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(-1000); // 5000 - 6000
    });

    it('should ignore non-power modifiers', () => {
      const card = createTestCard({ basePower: 5000 });
      card.modifiers = [
        createModifier(ModifierType.POWER, 2000),
        createModifier(ModifierType.COST, -1),
        createModifier(ModifierType.POWER, 1000),
      ];
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(8000); // 5000 + 2000 + 1000 (cost modifier ignored)
    });

    it('should handle temporary and permanent modifiers equally', () => {
      const card = createTestCard({ basePower: 5000 });
      card.modifiers = [
        createModifier(ModifierType.POWER, 1000, ModifierDuration.PERMANENT),
        createModifier(ModifierType.POWER, 2000, ModifierDuration.UNTIL_END_OF_TURN),
        createModifier(ModifierType.POWER, 500, ModifierDuration.UNTIL_END_OF_BATTLE),
      ];
      const power = calculator.computeCurrentPower(card);
      expect(power).toBe(8500); // 5000 + 1000 + 2000 + 500
    });
  });

  describe('getCurrentCost', () => {
    it('should return base cost for a card with no modifiers', () => {
      const card = createTestCard({ baseCost: 3 });
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(3);
    });

    it('should return 0 for a card with null base cost', () => {
      const card = createTestCard({ baseCost: null });
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(0);
    });

    it('should add cost modifiers to base cost', () => {
      const card = createTestCard({ baseCost: 5 });
      card.modifiers = [
        createModifier(ModifierType.COST, -2),
        createModifier(ModifierType.COST, -1),
      ];
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(2); // 5 - 2 - 1
    });

    it('should clamp cost to minimum 0', () => {
      const card = createTestCard({ baseCost: 3 });
      card.modifiers = [
        createModifier(ModifierType.COST, -5),
      ];
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(0); // 3 - 5 = -2, clamped to 0
    });

    it('should handle positive cost modifiers', () => {
      const card = createTestCard({ baseCost: 3 });
      card.modifiers = [
        createModifier(ModifierType.COST, 2),
      ];
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(5); // 3 + 2
    });

    it('should combine multiple cost modifiers', () => {
      const card = createTestCard({ baseCost: 5 });
      card.modifiers = [
        createModifier(ModifierType.COST, -2),
        createModifier(ModifierType.COST, 1),
        createModifier(ModifierType.COST, -1),
      ];
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(3); // 5 - 2 + 1 - 1
    });

    it('should ignore non-cost modifiers', () => {
      const card = createTestCard({ baseCost: 5 });
      card.modifiers = [
        createModifier(ModifierType.COST, -2),
        createModifier(ModifierType.POWER, 1000),
        createModifier(ModifierType.COST, -1),
      ];
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(2); // 5 - 2 - 1 (power modifier ignored)
    });

    it('should handle temporary and permanent modifiers equally', () => {
      const card = createTestCard({ baseCost: 5 });
      card.modifiers = [
        createModifier(ModifierType.COST, -1, ModifierDuration.PERMANENT),
        createModifier(ModifierType.COST, -2, ModifierDuration.UNTIL_END_OF_TURN),
      ];
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(2); // 5 - 1 - 2
    });

    it('should not be affected by given DON', () => {
      const card = createTestCard({ baseCost: 3 });
      card.givenDon = [
        createTestDon('don-1'),
        createTestDon('don-2'),
      ];
      const cost = calculator.getCurrentCost(card);
      expect(cost).toBe(3); // DON doesn't affect cost
    });
  });

  describe('getPowerModifiers', () => {
    it('should return only power modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.POWER, 1000),
        createModifier(ModifierType.COST, -1),
        createModifier(ModifierType.POWER, 2000),
      ];
      const powerMods = calculator.getPowerModifiers(card);
      expect(powerMods).toHaveLength(2);
      expect(powerMods.every(m => m.type === ModifierType.POWER)).toBe(true);
    });

    it('should return empty array if no power modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.COST, -1),
      ];
      const powerMods = calculator.getPowerModifiers(card);
      expect(powerMods).toHaveLength(0);
    });
  });

  describe('getCostModifiers', () => {
    it('should return only cost modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.COST, -1),
        createModifier(ModifierType.POWER, 1000),
        createModifier(ModifierType.COST, -2),
      ];
      const costMods = calculator.getCostModifiers(card);
      expect(costMods).toHaveLength(2);
      expect(costMods.every(m => m.type === ModifierType.COST)).toBe(true);
    });

    it('should return empty array if no cost modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.POWER, 1000),
      ];
      const costMods = calculator.getCostModifiers(card);
      expect(costMods).toHaveLength(0);
    });
  });

  describe('getTotalPowerModifier', () => {
    it('should sum all power modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.POWER, 1000),
        createModifier(ModifierType.POWER, 2000),
        createModifier(ModifierType.POWER, -500),
      ];
      const total = calculator.getTotalPowerModifier(card);
      expect(total).toBe(2500); // 1000 + 2000 - 500
    });

    it('should return 0 if no power modifiers', () => {
      const card = createTestCard();
      const total = calculator.getTotalPowerModifier(card);
      expect(total).toBe(0);
    });

    it('should ignore non-power modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.POWER, 1000),
        createModifier(ModifierType.COST, -2),
      ];
      const total = calculator.getTotalPowerModifier(card);
      expect(total).toBe(1000);
    });
  });

  describe('getTotalCostModifier', () => {
    it('should sum all cost modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.COST, -1),
        createModifier(ModifierType.COST, -2),
        createModifier(ModifierType.COST, 1),
      ];
      const total = calculator.getTotalCostModifier(card);
      expect(total).toBe(-2); // -1 - 2 + 1
    });

    it('should return 0 if no cost modifiers', () => {
      const card = createTestCard();
      const total = calculator.getTotalCostModifier(card);
      expect(total).toBe(0);
    });

    it('should ignore non-cost modifiers', () => {
      const card = createTestCard();
      card.modifiers = [
        createModifier(ModifierType.COST, -2),
        createModifier(ModifierType.POWER, 1000),
      ];
      const total = calculator.getTotalCostModifier(card);
      expect(total).toBe(-2);
    });
  });
});
