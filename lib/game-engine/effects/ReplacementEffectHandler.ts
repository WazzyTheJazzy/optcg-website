/**
 * ReplacementEffectHandler.ts
 * 
 * Handles replacement effects that modify costs and effect bodies before they are processed.
 * Replacement effects allow cards to change how other effects work.
 * 
 * Requirements: 15.1, 15.2, 15.3
 */

import { GameStateManager } from '../core/GameState';
import {
  EffectDefinition,
  EffectInstance,
  EffectContext,
  CardInstance,
  CostExpr,
  EffectTimingType,
  PlayerId,
} from '../core/types';

/**
 * Type for replacement effect functions that modify cost expressions
 */
export type CostReplacementFunction = (
  cost: CostExpr,
  context: EffectContext
) => CostExpr;

/**
 * Type for replacement effect functions that modify effect instances
 */
export type BodyReplacementFunction = (
  instance: EffectInstance,
  context: EffectContext
) => EffectInstance;

/**
 * Represents a registered replacement effect
 */
interface ReplacementEffect {
  id: string;
  source: CardInstance;
  priority: number; // Lower numbers apply first
  costReplacement?: CostReplacementFunction;
  bodyReplacement?: BodyReplacementFunction;
}

/**
 * ReplacementEffectHandler manages and applies replacement effects
 */
export class ReplacementEffectHandler {
  private stateManager: GameStateManager;
  private activeReplacements: ReplacementEffect[];

  constructor(stateManager: GameStateManager) {
    this.stateManager = stateManager;
    this.activeReplacements = [];
  }

  /**
   * Apply cost replacement effects to a cost expression
   * 
   * Requirement 15.1: WHEN an effect cost is being paid, THE Game Engine SHALL 
   * apply any active cost replacement effects before payment
   * 
   * @param cost - The original cost expression
   * @param context - The effect context
   * @returns The modified cost expression
   */
  applyCostReplacementEffects(
    cost: CostExpr,
    context: EffectContext
  ): CostExpr {
    // Get all active replacement effects that modify costs
    const costReplacements = this.getActiveCostReplacements(context);

    // Apply replacements in priority order (lower priority first)
    let modifiedCost = cost;
    for (const replacement of costReplacements) {
      if (replacement.costReplacement) {
        modifiedCost = replacement.costReplacement(modifiedCost, context);
      }
    }

    return modifiedCost;
  }

  /**
   * Apply body replacement effects to an effect instance
   * 
   * Requirement 15.2: WHEN an effect body is being resolved, THE Game Engine SHALL 
   * apply any active body replacement effects before execution
   * 
   * @param instance - The original effect instance
   * @param context - The effect context
   * @returns The modified effect instance
   */
  applyBodyReplacementEffects(
    instance: EffectInstance,
    context: EffectContext
  ): EffectInstance {
    // Get all active replacement effects that modify effect bodies
    const bodyReplacements = this.getActiveBodyReplacements(context);

    // Apply replacements in priority order (lower priority first)
    let modifiedInstance = instance;
    for (const replacement of bodyReplacements) {
      if (replacement.bodyReplacement) {
        modifiedInstance = replacement.bodyReplacement(modifiedInstance, context);
      }
    }

    return modifiedInstance;
  }

  /**
   * Register a replacement effect from a card
   * 
   * Requirement 15.3: THE Game Engine SHALL support REPLACEMENT timing type 
   * for effects that modify other effects
   * 
   * @param cardId - The card with the replacement effect
   * @param effectDef - The effect definition
   * @param priority - Priority for ordering (default 0)
   * @param costReplacement - Optional cost replacement function
   * @param bodyReplacement - Optional body replacement function
   */
  registerReplacementEffect(
    cardId: string,
    effectDef: EffectDefinition,
    priority: number = 0,
    costReplacement?: CostReplacementFunction,
    bodyReplacement?: BodyReplacementFunction
  ): void {
    // Validate effect is REPLACEMENT type
    if (effectDef.timingType !== EffectTimingType.REPLACEMENT) {
      throw new Error(
        `Cannot register non-REPLACEMENT effect ${effectDef.id} as replacement effect`
      );
    }

    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    // Create replacement effect entry
    const replacement: ReplacementEffect = {
      id: `${cardId}_${effectDef.id}`,
      source: card,
      priority,
      costReplacement,
      bodyReplacement,
    };

    // Add to active replacements
    this.activeReplacements.push(replacement);

    // Sort by priority (lower numbers first)
    this.activeReplacements.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Unregister a replacement effect
   * 
   * @param cardId - The card with the replacement effect
   * @param effectId - The effect definition ID
   */
  unregisterReplacementEffect(cardId: string, effectId: string): void {
    const replacementId = `${cardId}_${effectId}`;
    this.activeReplacements = this.activeReplacements.filter(
      r => r.id !== replacementId
    );
  }

  /**
   * Clear all replacement effects from a specific card
   * 
   * @param cardId - The card to clear replacements from
   */
  clearReplacementEffectsFromCard(cardId: string): void {
    this.activeReplacements = this.activeReplacements.filter(
      r => r.source.id !== cardId
    );
  }

  /**
   * Clear all replacement effects
   */
  clearAllReplacementEffects(): void {
    this.activeReplacements = [];
  }

  /**
   * Get all active replacement effects
   * 
   * @returns Array of active replacement effects
   */
  getActiveReplacementEffects(): ReplacementEffect[] {
    return [...this.activeReplacements];
  }

  /**
   * Get active cost replacement effects
   * Filters out replacements that don't have cost replacement functions
   * 
   * @param context - The effect context
   * @returns Array of cost replacement effects
   */
  private getActiveCostReplacements(context: EffectContext): ReplacementEffect[] {
    return this.activeReplacements.filter(r => {
      // Must have cost replacement function
      if (!r.costReplacement) return false;

      // Check if replacement effect is still valid (card still on field, etc)
      return this.isReplacementEffectActive(r, context);
    });
  }

  /**
   * Get active body replacement effects
   * Filters out replacements that don't have body replacement functions
   * 
   * @param context - The effect context
   * @returns Array of body replacement effects
   */
  private getActiveBodyReplacements(context: EffectContext): ReplacementEffect[] {
    return this.activeReplacements.filter(r => {
      // Must have body replacement function
      if (!r.bodyReplacement) return false;

      // Check if replacement effect is still valid (card still on field, etc)
      return this.isReplacementEffectActive(r, context);
    });
  }

  /**
   * Check if a replacement effect is currently active
   * 
   * @param replacement - The replacement effect to check
   * @param context - The effect context
   * @returns True if the replacement effect should be applied
   */
  private isReplacementEffectActive(
    replacement: ReplacementEffect,
    context: EffectContext
  ): boolean {
    // Get current state of the source card
    const currentCard = this.stateManager.getCard(replacement.source.id);
    if (!currentCard) {
      // Card no longer exists
      return false;
    }

    // Check if card is in a zone where its effects are active
    // Typically, replacement effects only work while the card is on the field
    const activeZones = [
      'LEADER_AREA',
      'CHARACTER_AREA',
      'STAGE_AREA',
    ];

    if (!activeZones.includes(currentCard.zone)) {
      return false;
    }

    // Additional checks could be added here:
    // - Check if effect has a condition that must be met
    // - Check if effect has been used this turn (for once-per-turn effects)
    // - Check controller/owner restrictions

    return true;
  }

  /**
   * Update the internal state manager reference
   * 
   * @param stateManager - The new state manager
   */
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
  }

  /**
   * Get the current state manager
   * 
   * @returns The current state manager
   */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }
}
