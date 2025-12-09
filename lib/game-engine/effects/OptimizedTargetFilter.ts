/**
 * OptimizedTargetFilter.ts
 * 
 * Optimized target filtering with early exit conditions and lazy evaluation.
 * Reduces unnecessary iterations and comparisons.
 */

import { CardInstance, PlayerId, ZoneId, CardCategory, Color, CardState } from '../core/types';
import { Target, TargetFilter, TargetType } from './types';
import { GameStateManager } from '../core/GameState';

/**
 * Optimized target filter that uses early exits and lazy evaluation
 */
export class OptimizedTargetFilter {
  /**
   * Get legal targets with optimized filtering
   * Uses early exit conditions and lazy evaluation to minimize work
   */
  static getLegalTargets(
    filter: TargetFilter,
    controller: PlayerId,
    stateManager: GameStateManager
  ): Target[] {
    const state = stateManager.getState();
    const legalTargets: Target[] = [];

    // Early exit: if no zones specified, return empty
    if (!filter.zone || (Array.isArray(filter.zone) && filter.zone.length === 0)) {
      return legalTargets;
    }

    // Determine which players to check based on controller filter
    const playersToCheck = this.getPlayersToCheck(filter, controller);
    
    // Get zones to check
    const zonesToCheck = Array.isArray(filter.zone) ? filter.zone : [filter.zone];

    // Optimize: if looking for specific category, skip zones that can't contain it
    const optimizedZones = this.optimizeZonesForCategory(zonesToCheck, filter.category);

    // Check each player's zones
    for (const playerId of playersToCheck) {
      const player = state.players.get(playerId);
      if (!player) continue;

      for (const zoneId of optimizedZones) {
        const cardsInZone = this.getCardsInZone(player.zones, zoneId);
        
        // Early exit: if zone is empty, skip
        if (cardsInZone.length === 0) continue;

        // Filter cards with optimized checks
        for (const card of cardsInZone) {
          // Use short-circuit evaluation for fast rejection
          if (this.doesCardMatchFilterOptimized(card, filter)) {
            legalTargets.push({
              type: TargetType.CARD,
              cardId: card.id,
            });
          }
        }
      }
    }

    return legalTargets;
  }

  /**
   * Determine which players to check based on controller filter
   */
  private static getPlayersToCheck(filter: TargetFilter, controller: PlayerId): PlayerId[] {
    const playersToCheck: PlayerId[] = [];
    
    if (filter.controller === 'self' || filter.controller === 'any') {
      playersToCheck.push(controller);
    }
    if (filter.controller === 'opponent' || filter.controller === 'any') {
      const opponent = controller === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
      playersToCheck.push(opponent);
    }
    
    return playersToCheck;
  }

  /**
   * Optimize zones to check based on category filter
   * Skips zones that can't contain the requested category
   */
  private static optimizeZonesForCategory(
    zones: ZoneId[],
    category: CardCategory | CardCategory[] | undefined
  ): ZoneId[] {
    if (!category) return zones;

    const categories = Array.isArray(category) ? category : [category];
    const optimizedZones: ZoneId[] = [];

    for (const zone of zones) {
      // Skip zones that can't contain the requested category
      if (categories.includes(CardCategory.LEADER) && zone !== ZoneId.LEADER_AREA) {
        continue;
      }
      if (categories.includes(CardCategory.STAGE) && zone !== ZoneId.STAGE_AREA) {
        continue;
      }
      if (categories.includes(CardCategory.CHARACTER) && 
          zone !== ZoneId.CHARACTER_AREA && 
          zone !== ZoneId.HAND && 
          zone !== ZoneId.DECK && 
          zone !== ZoneId.TRASH) {
        continue;
      }
      
      optimizedZones.push(zone);
    }

    return optimizedZones.length > 0 ? optimizedZones : zones;
  }

  /**
   * Get cards in a specific zone
   */
  private static getCardsInZone(zones: any, zoneId: ZoneId): CardInstance[] {
    switch (zoneId) {
      case ZoneId.HAND:
        return zones.hand || [];
      case ZoneId.DECK:
        return zones.deck || [];
      case ZoneId.TRASH:
        return zones.trash || [];
      case ZoneId.LIFE:
        return zones.life || [];
      case ZoneId.CHARACTER_AREA:
        return zones.characterArea || [];
      case ZoneId.LEADER_AREA:
        return zones.leaderArea ? [zones.leaderArea] : [];
      case ZoneId.STAGE_AREA:
        return zones.stageArea ? [zones.stageArea] : [];
      case ZoneId.COST_AREA:
        return zones.costArea || [];
      default:
        return [];
    }
  }

  /**
   * Optimized card matching with early exits
   * Checks most restrictive filters first for fast rejection
   */
  private static doesCardMatchFilterOptimized(
    card: CardInstance,
    filter: TargetFilter
  ): boolean {
    // Check category first (most restrictive)
    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      if (!categories.includes(card.definition.category)) {
        return false;
      }
    }

    // Check exact cost/power matches (fast rejection)
    if (filter.costRange?.exact !== undefined) {
      if ((card.definition.baseCost || 0) !== filter.costRange.exact) {
        return false;
      }
    }
    if (filter.powerRange?.exact !== undefined) {
      if ((card.definition.basePower || 0) !== filter.powerRange.exact) {
        return false;
      }
    }

    // Check cost range
    if (filter.costRange) {
      const cost = card.definition.baseCost || 0;
      if (filter.costRange.min !== undefined && cost < filter.costRange.min) {
        return false;
      }
      if (filter.costRange.max !== undefined && cost > filter.costRange.max) {
        return false;
      }
    }

    // Check power range
    if (filter.powerRange) {
      const power = card.definition.basePower || 0;
      if (filter.powerRange.min !== undefined && power < filter.powerRange.min) {
        return false;
      }
      if (filter.powerRange.max !== undefined && power > filter.powerRange.max) {
        return false;
      }
    }

    // Check state
    if (filter.state) {
      const states = Array.isArray(filter.state) ? filter.state : [filter.state];
      if (!states.includes(card.state)) {
        return false;
      }
    }

    // Check color (common filter)
    if (filter.color) {
      const colors = Array.isArray(filter.color) ? filter.color : [filter.color];
      const hasMatchingColor = colors.some(color => card.definition.colors.includes(color));
      if (!hasMatchingColor) {
        return false;
      }
    }

    // Check keywords (less common)
    if (filter.hasKeyword) {
      const keywords = Array.isArray(filter.hasKeyword) ? filter.hasKeyword : [filter.hasKeyword];
      const hasAllKeywords = keywords.every(keyword => card.definition.keywords.includes(keyword));
      if (!hasAllKeywords) {
        return false;
      }
    }

    if (filter.lacksKeyword) {
      const keywords = Array.isArray(filter.lacksKeyword) ? filter.lacksKeyword : [filter.lacksKeyword];
      const hasAnyKeyword = keywords.some(keyword => card.definition.keywords.includes(keyword));
      if (hasAnyKeyword) {
        return false;
      }
    }

    // Check type tags (less common)
    if (filter.typeTags && filter.typeTags.length > 0) {
      const hasMatchingTag = filter.typeTags.some(tag => card.definition.typeTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check attributes (less common)
    if (filter.attributes && filter.attributes.length > 0) {
      const hasMatchingAttribute = filter.attributes.some(attr => card.definition.attributes.includes(attr));
      if (!hasMatchingAttribute) {
        return false;
      }
    }

    // Check custom filter last (most expensive)
    if (filter.customFilter) {
      // Note: custom filter requires state, which we don't have here
      // This would need to be handled by the caller
      return true; // Assume passes for now
    }

    return true;
  }

  /**
   * Batch filter multiple cards at once
   * More efficient than filtering one at a time
   */
  static batchFilterCards(
    cards: CardInstance[],
    filter: TargetFilter
  ): CardInstance[] {
    // Pre-compute filter values for efficiency
    const categories = filter.category ? 
      (Array.isArray(filter.category) ? filter.category : [filter.category]) : null;
    const colors = filter.color ?
      (Array.isArray(filter.color) ? filter.color : [filter.color]) : null;
    const states = filter.state ?
      (Array.isArray(filter.state) ? filter.state : [filter.state]) : null;
    const hasKeywords = filter.hasKeyword ?
      (Array.isArray(filter.hasKeyword) ? filter.hasKeyword : [filter.hasKeyword]) : null;
    const lacksKeywords = filter.lacksKeyword ?
      (Array.isArray(filter.lacksKeyword) ? filter.lacksKeyword : [filter.lacksKeyword]) : null;

    return cards.filter(card => {
      // Category check
      if (categories && !categories.includes(card.definition.category)) {
        return false;
      }

      // Cost range check
      if (filter.costRange) {
        const cost = card.definition.baseCost || 0;
        if (filter.costRange.exact !== undefined && cost !== filter.costRange.exact) return false;
        if (filter.costRange.min !== undefined && cost < filter.costRange.min) return false;
        if (filter.costRange.max !== undefined && cost > filter.costRange.max) return false;
      }

      // Power range check
      if (filter.powerRange) {
        const power = card.definition.basePower || 0;
        if (filter.powerRange.exact !== undefined && power !== filter.powerRange.exact) return false;
        if (filter.powerRange.min !== undefined && power < filter.powerRange.min) return false;
        if (filter.powerRange.max !== undefined && power > filter.powerRange.max) return false;
      }

      // State check
      if (states && !states.includes(card.state)) {
        return false;
      }

      // Color check
      if (colors) {
        const hasMatchingColor = colors.some(color => card.definition.colors.includes(color));
        if (!hasMatchingColor) return false;
      }

      // Keyword checks
      if (hasKeywords) {
        const hasAllKeywords = hasKeywords.every(keyword => card.definition.keywords.includes(keyword));
        if (!hasAllKeywords) return false;
      }

      if (lacksKeywords) {
        const hasAnyKeyword = lacksKeywords.some(keyword => card.definition.keywords.includes(keyword));
        if (hasAnyKeyword) return false;
      }

      // Type tags check
      if (filter.typeTags && filter.typeTags.length > 0) {
        const hasMatchingTag = filter.typeTags.some(tag => card.definition.typeTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Attributes check
      if (filter.attributes && filter.attributes.length > 0) {
        const hasMatchingAttribute = filter.attributes.some(attr => card.definition.attributes.includes(attr));
        if (!hasMatchingAttribute) return false;
      }

      return true;
    });
  }
}
