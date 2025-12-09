/**
 * EffectBatcher.ts
 * 
 * Batches similar effects for more efficient resolution.
 * Groups effects by type and resolves them together when possible.
 */

import { EffectInstance, EffectType } from './types';
import { GameStateManager } from '../core/GameState';

/**
 * Batch of similar effects that can be resolved together
 */
interface EffectBatch {
  type: EffectType;
  effects: EffectInstance[];
  canBatch: boolean;
}

/**
 * Effect batcher for optimizing effect resolution
 */
export class EffectBatcher {
  /**
   * Group effects into batches by type
   * Effects of the same type that don't interfere can be batched
   */
  static batchEffects(effects: EffectInstance[]): EffectBatch[] {
    const batches: Map<EffectType, EffectBatch> = new Map();

    for (const effect of effects) {
      const effectType = effect.definition.effectType;
      
      if (!batches.has(effectType)) {
        batches.set(effectType, {
          type: effectType,
          effects: [],
          canBatch: this.canBatchEffectType(effectType),
        });
      }

      batches.get(effectType)!.effects.push(effect);
    }

    return Array.from(batches.values());
  }

  /**
   * Determine if an effect type can be batched
   * Some effects must be resolved individually due to dependencies
   */
  private static canBatchEffectType(effectType: EffectType): boolean {
    switch (effectType) {
      // These can be batched - they're independent operations
      case EffectType.POWER_MODIFICATION:
      case EffectType.GRANT_KEYWORD:
      case EffectType.REST_CHARACTER:
      case EffectType.ACTIVATE_CHARACTER:
        return true;

      // These should not be batched - order matters or they have side effects
      case EffectType.KO_CHARACTER:
      case EffectType.BOUNCE_CHARACTER:
      case EffectType.DRAW_CARDS:
      case EffectType.DISCARD_CARDS:
      case EffectType.SEARCH_DECK:
      case EffectType.DEAL_DAMAGE:
      case EffectType.ATTACH_DON:
      case EffectType.TRASH_CARDS:
      case EffectType.LOOK_AT_CARDS:
      case EffectType.REVEAL_CARDS:
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if two effects can be batched together
   * Even within the same type, some effects may interfere
   */
  static canBatchTogether(effect1: EffectInstance, effect2: EffectInstance): boolean {
    // Must be same type
    if (effect1.effectDefinition.effectType !== effect2.effectDefinition.effectType) {
      return false;
    }

    // Must not target the same card (to avoid conflicts)
    const targets1 = new Set(effect1.targets.map(t => t.cardId).filter(Boolean));
    const targets2 = new Set(effect2.targets.map(t => t.cardId).filter(Boolean));
    
    for (const target of targets1) {
      if (targets2.has(target)) {
        return false; // Same target, can't batch
      }
    }

    return true;
  }

  /**
   * Optimize effect resolution order
   * Reorder effects to minimize state updates and maximize batching
   */
  static optimizeResolutionOrder(effects: EffectInstance[]): EffectInstance[] {
    // Group by type
    const byType = new Map<EffectType, EffectInstance[]>();
    
    for (const effect of effects) {
      const type = effect.effectDefinition.effectType;
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(effect);
    }

    // Resolve in optimal order:
    // 1. Power modifications (don't change board state)
    // 2. Keyword grants (don't change board state)
    // 3. Rest/Activate (change state but don't move cards)
    // 4. Card movement effects (K.O., bounce, etc.)
    // 5. Card draw/discard (change hand)
    // 6. Damage (can end game)

    const optimizedOrder: EffectInstance[] = [];
    const typeOrder = [
      EffectType.POWER_MODIFICATION,
      EffectType.GRANT_KEYWORD,
      EffectType.REST_CHARACTER,
      EffectType.ACTIVATE_CHARACTER,
      EffectType.ATTACH_DON,
      EffectType.KO_CHARACTER,
      EffectType.BOUNCE_CHARACTER,
      EffectType.TRASH_CARDS,
      EffectType.DRAW_CARDS,
      EffectType.DISCARD_CARDS,
      EffectType.SEARCH_DECK,
      EffectType.LOOK_AT_CARDS,
      EffectType.REVEAL_CARDS,
      EffectType.DEAL_DAMAGE,
    ];

    for (const type of typeOrder) {
      const effectsOfType = byType.get(type);
      if (effectsOfType) {
        optimizedOrder.push(...effectsOfType);
        byType.delete(type);
      }
    }

    // Add any remaining effects not in the order list
    for (const remaining of byType.values()) {
      optimizedOrder.push(...remaining);
    }

    return optimizedOrder;
  }

  /**
   * Merge compatible power modification effects
   * Combines multiple power mods on the same target into one
   */
  static mergePowerModifications(effects: EffectInstance[]): EffectInstance[] {
    const powerMods = effects.filter(
      e => e.effectDefinition.effectType === EffectType.POWER_MODIFICATION
    );
    const others = effects.filter(
      e => e.effectDefinition.effectType !== EffectType.POWER_MODIFICATION
    );

    if (powerMods.length <= 1) {
      return effects;
    }

    // Group by target
    const byTarget = new Map<string, EffectInstance[]>();
    
    for (const effect of powerMods) {
      const targetId = effect.targets[0]?.cardId;
      if (!targetId) continue;
      
      if (!byTarget.has(targetId)) {
        byTarget.set(targetId, []);
      }
      byTarget.get(targetId)!.push(effect);
    }

    // Merge effects on same target
    const merged: EffectInstance[] = [];
    
    for (const [targetId, targetEffects] of byTarget.entries()) {
      if (targetEffects.length === 1) {
        merged.push(targetEffects[0]);
        continue;
      }

      // Check if all have same duration
      const firstDuration = targetEffects[0].effectDefinition.parameters.duration;
      const sameDuration = targetEffects.every(
        e => e.effectDefinition.parameters.duration === firstDuration
      );

      if (!sameDuration) {
        // Can't merge different durations
        merged.push(...targetEffects);
        continue;
      }

      // Sum power changes
      const totalPowerChange = targetEffects.reduce(
        (sum, e) => sum + (e.effectDefinition.parameters.powerChange || 0),
        0
      );

      // Create merged effect
      const mergedEffect: EffectInstance = {
        ...targetEffects[0],
        effectDefinition: {
          ...targetEffects[0].effectDefinition,
          parameters: {
            ...targetEffects[0].effectDefinition.parameters,
            powerChange: totalPowerChange,
          },
        },
      };

      merged.push(mergedEffect);
    }

    return [...merged, ...others];
  }

  /**
   * Estimate performance gain from batching
   * Returns a score indicating how much batching will help
   */
  static estimateBatchingGain(effects: EffectInstance[]): number {
    if (effects.length <= 1) return 0;

    const batches = this.batchEffects(effects);
    let gain = 0;

    for (const batch of batches) {
      if (batch.canBatch && batch.effects.length > 1) {
        // Each batched effect saves some overhead
        gain += (batch.effects.length - 1) * 10;
      }
    }

    return gain;
  }
}
