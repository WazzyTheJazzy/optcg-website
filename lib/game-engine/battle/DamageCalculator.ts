/**
 * DamageCalculator.ts
 * 
 * Handles power and cost calculations for cards in the One Piece TCG Engine.
 * Computes current power based on base power, modifiers, and given DON cards.
 * Computes current cost based on base cost and modifiers (clamped to minimum 0).
 */

import {
  CardInstance,
  Modifier,
  ModifierType,
} from '../core/types';

/**
 * DamageCalculator class for computing card power and cost
 */
export class DamageCalculator {
  /**
   * Compute the current power of a card
   * 
   * Formula: base power + power modifiers + given DON count
   * 
   * @param card - The card instance to calculate power for
   * @returns The current power value
   */
  computeCurrentPower(card: CardInstance): number {
    // Start with base power (null means 0 for non-character cards)
    const basePower = card.definition.basePower ?? 0;

    // Sum all power modifiers
    const powerModifiers = card.modifiers
      .filter(m => m.type === ModifierType.POWER)
      .reduce((sum, modifier) => sum + (modifier.value as number), 0);

    // Count given DON cards (each DON adds +1000 power)
    const givenDonPower = card.givenDon.length * 1000;

    // Total power
    return basePower + powerModifiers + givenDonPower;
  }

  /**
   * Compute the current cost of a card
   * 
   * Formula: base cost + cost modifiers, clamped to minimum 0
   * 
   * @param card - The card instance to calculate cost for
   * @returns The current cost value (minimum 0)
   */
  getCurrentCost(card: CardInstance): number {
    // Start with base cost (null means 0 for cards without cost)
    const baseCost = card.definition.baseCost ?? 0;

    // Sum all cost modifiers
    const costModifiers = card.modifiers
      .filter(m => m.type === ModifierType.COST)
      .reduce((sum, modifier) => sum + (modifier.value as number), 0);

    // Total cost, clamped to minimum 0
    const totalCost = baseCost + costModifiers;
    return Math.max(0, totalCost);
  }

  /**
   * Get all power modifiers for a card
   * 
   * @param card - The card instance
   * @returns Array of power modifiers
   */
  getPowerModifiers(card: CardInstance): Modifier[] {
    return card.modifiers.filter(m => m.type === ModifierType.POWER);
  }

  /**
   * Get all cost modifiers for a card
   * 
   * @param card - The card instance
   * @returns Array of cost modifiers
   */
  getCostModifiers(card: CardInstance): Modifier[] {
    return card.modifiers.filter(m => m.type === ModifierType.COST);
  }

  /**
   * Calculate the total power modifier value for a card
   * 
   * @param card - The card instance
   * @returns The sum of all power modifiers
   */
  getTotalPowerModifier(card: CardInstance): number {
    return this.getPowerModifiers(card)
      .reduce((sum, modifier) => sum + (modifier.value as number), 0);
  }

  /**
   * Calculate the total cost modifier value for a card
   * 
   * @param card - The card instance
   * @returns The sum of all cost modifiers
   */
  getTotalCostModifier(card: CardInstance): number {
    return this.getCostModifiers(card)
      .reduce((sum, modifier) => sum + (modifier.value as number), 0);
  }
}
