/**
 * Effect Parser
 * 
 * Parses card effect text into structured EffectDefinition objects.
 * Handles extraction of labels, timing, conditions, costs, and parameters.
 */

import {
  CardCategory,
  Color,
  EffectTimingType,
  ModifierDuration,
  TriggerTiming,
  ZoneId,
} from '../core/types';
import {
  EffectDefinition,
  EffectParameters,
  EffectType,
  SearchCriteria,
  TargetFilter,
  TargetType,
} from './types';

/**
 * Parser for converting card effect text into structured effect definitions
 */
export class EffectParser {
  /**
   * Parse effect text from a card into structured effect definitions
   * 
   * @param effectText - The raw effect text from the card
   * @param cardId - The ID of the card this effect belongs to
   * @returns Array of parsed effect definitions
   */
  parseEffectText(effectText: string, cardId: string): EffectDefinition[] {
    if (!effectText || effectText.trim() === '') {
      return [];
    }

    const effects: EffectDefinition[] = [];
    
    // Split by effect labels to handle multiple effects on one card
    const effectSegments = this.splitByLabels(effectText);
    
    for (let i = 0; i < effectSegments.length; i++) {
      const segment = effectSegments[i];
      try {
        const effect = this.parseEffectSegment(segment, cardId, i);
        if (effect) {
          effects.push(effect);
        }
      } catch (error) {
        console.warn(`Failed to parse effect segment for card ${cardId}:`, segment, error);
      }
    }
    
    return effects;
  }

  /**
   * Split effect text by effect labels
   */
  private splitByLabels(effectText: string): string[] {
    // Match main effect labels (not modifiers like [Once Per Turn])
    const labelPattern = /\[(On Play|When Attacking|When Attacked|On K\.O\.|Activate: Main|DON!! x\d+|End of Your Turn|Start of Your Turn|Blocker|Rush|Double Attack|Banish)\]/gi;
    
    const segments: string[] = [];
    let currentSegment = '';
    let lastIndex = 0;
    
    const matches = Array.from(effectText.matchAll(labelPattern));
    
    if (matches.length === 0) {
      // No labels found, treat entire text as one effect
      return [effectText];
    }
    
    for (const match of matches) {
      if (match.index !== undefined) {
        // Add text before this label to current segment
        if (match.index > lastIndex) {
          currentSegment += effectText.substring(lastIndex, match.index);
        }
        
        // Start new segment with this label
        if (currentSegment.trim()) {
          segments.push(currentSegment.trim());
        }
        currentSegment = match[0];
        lastIndex = match.index + match[0].length;
      }
    }
    
    // Add remaining text to last segment
    if (lastIndex < effectText.length) {
      currentSegment += effectText.substring(lastIndex);
    }
    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }
    
    return segments;
  }

  /**
   * Parse a single effect segment
   */
  private parseEffectSegment(
    segment: string,
    cardId: string,
    index: number
  ): EffectDefinition | null {
    const label = this.extractLabel(segment);
    if (!label) {
      return null;
    }

    // Skip [Once Per Turn] as it's a modifier, not a main effect label
    if (label.toLowerCase().includes('once per turn')) {
      return null;
    }

    // Skip keyword-only effects (they're stored in keywords array, not as effects)
    const lowerLabel = label.toLowerCase();
    if (lowerLabel === '[rush]' || 
        lowerLabel === '[blocker]' || 
        lowerLabel === '[double attack]' || 
        lowerLabel === '[banish]') {
      return null;
    }

    const timingType = this.determineTimingType(label);
    const triggerTiming = this.determineTriggerTiming(label);
    const oncePerTurn = segment.toLowerCase().includes('[once per turn]');
    
    // Extract the effect body (text after the label)
    const body = this.extractEffectBody(segment, label);
    
    // Skip if there's no body (label only)
    if (!body || body.trim() === '') {
      return null;
    }
    
    // Parse the effect body into type and parameters
    const { effectType, parameters } = this.parseEffectBody(body);
    
    // Parse condition if present
    const condition = this.parseCondition(body);
    
    // Parse cost if present
    const cost = this.parseCost(body);

    return {
      id: `${cardId}-effect-${index}`,
      sourceCardId: cardId,
      label,
      timingType,
      triggerTiming,
      condition,
      cost,
      effectType,
      parameters,
      oncePerTurn,
      usedThisTurn: false,
    };
  }

  /**
   * Extract effect label from text
   */
  private extractLabel(text: string): string {
    const labelMatch = text.match(/\[(On Play|When Attacking|When Attacked|On K\.O\.|Activate: Main|Once Per Turn|DON!! x\d+|End of Your Turn|Start of Your Turn|Blocker|Rush|Double Attack|Banish)\]/i);
    return labelMatch ? labelMatch[0] : '';
  }

  /**
   * Extract effect body (text after label)
   */
  private extractEffectBody(text: string, label: string): string {
    const labelIndex = text.indexOf(label);
    if (labelIndex === -1) {
      return text;
    }
    return text.substring(labelIndex + label.length).trim();
  }

  /**
   * Determine timing type from label
   */
  private determineTimingType(label: string): EffectTimingType {
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('activate')) {
      return EffectTimingType.ACTIVATE;
    }
    
    if (lowerLabel.includes('blocker') || 
        lowerLabel.includes('rush') || 
        lowerLabel.includes('double attack') ||
        lowerLabel.includes('banish')) {
      return EffectTimingType.PERMANENT;
    }
    
    return EffectTimingType.AUTO;
  }

  /**
   * Determine trigger timing from label
   */
  private determineTriggerTiming(label: string): TriggerTiming | null {
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('on play')) {
      return TriggerTiming.ON_PLAY;
    }
    if (lowerLabel.includes('when attacking')) {
      return TriggerTiming.WHEN_ATTACKING;
    }
    if (lowerLabel.includes('when attacked')) {
      return TriggerTiming.WHEN_ATTACKED;
    }
    if (lowerLabel.includes('on k.o')) {
      return TriggerTiming.ON_KO;
    }
    if (lowerLabel.includes('end of your turn')) {
      return TriggerTiming.END_OF_YOUR_TURN;
    }
    if (lowerLabel.includes('start of your turn')) {
      return TriggerTiming.START_OF_TURN;
    }
    
    // Activate effects don't have trigger timing
    return null;
  }

  /**
   * Parse effect body into effect type and parameters
   */
  private parseEffectBody(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    const lowerBody = body.toLowerCase();
    
    // Power modification effects
    if (lowerBody.includes('give') && (lowerBody.includes('power') || lowerBody.includes('+') || lowerBody.includes('-'))) {
      return this.parsePowerModification(body);
    }
    
    // K.O. effects
    if (lowerBody.includes('k.o.')) {
      return this.parseKOEffect(body);
    }
    
    // Bounce effects (return to hand)
    if (lowerBody.includes('return') && lowerBody.includes('hand')) {
      return this.parseBounceEffect(body);
    }
    
    // Search effects
    if (lowerBody.includes('search') || (lowerBody.includes('look at') && lowerBody.includes('deck'))) {
      return this.parseSearchEffect(body);
    }
    
    // Draw effects
    if (lowerBody.includes('draw')) {
      return this.parseDrawEffect(body);
    }
    
    // Discard effects
    if (lowerBody.includes('discard')) {
      return this.parseDiscardEffect(body);
    }
    
    // Trash effects
    if (lowerBody.includes('trash')) {
      return this.parseTrashEffect(body);
    }
    
    // Rest/Activate effects
    if (lowerBody.includes('rest') && lowerBody.includes('character')) {
      return this.parseRestEffect(body);
    }
    if (lowerBody.includes('activate') && lowerBody.includes('character')) {
      return this.parseActivateEffect(body);
    }
    
    // DON attachment effects
    if (lowerBody.includes('attach') && lowerBody.includes('don')) {
      return this.parseAttachDonEffect(body);
    }
    
    // Damage effects
    if (lowerBody.includes('deal') && lowerBody.includes('damage')) {
      return this.parseDamageEffect(body);
    }
    
    // Keyword grant effects
    if (lowerBody.includes('gain') && (lowerBody.includes('rush') || lowerBody.includes('blocker') || lowerBody.includes('double attack'))) {
      return this.parseKeywordGrantEffect(body);
    }
    
    // Default: unknown effect type
    console.warn('Unknown effect type for body:', body);
    return {
      effectType: EffectType.POWER_MODIFICATION,
      parameters: {},
    };
  }

  /**
   * Parse power modification effect
   */
  private parsePowerModification(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract power change amount
    const powerMatch = body.match(/([+-]\d+)\s*power/i);
    const powerChange = powerMatch ? parseInt(powerMatch[1]) : 0;
    
    // Extract duration
    const duration = this.parseDuration(body);
    
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.POWER_MODIFICATION,
      parameters: {
        powerChange,
        duration,
        ...targeting,
      },
    };
  }

  /**
   * Parse K.O. effect
   */
  private parseKOEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract power/cost limits
    const powerMatch = body.match(/(\d+)\s*power or less/i);
    const costMatch = body.match(/cost\s*(\d+)\s*or less/i);
    
    const maxPower = powerMatch ? parseInt(powerMatch[1]) : undefined;
    const maxCost = costMatch ? parseInt(costMatch[1]) : undefined;
    
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.KO_CHARACTER,
      parameters: {
        maxPower,
        maxCost,
        ...targeting,
      },
    };
  }

  /**
   * Parse bounce effect (return to hand)
   */
  private parseBounceEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract cost limit
    const costMatch = body.match(/cost\s*(\d+)\s*or less/i);
    const maxCost = costMatch ? parseInt(costMatch[1]) : undefined;
    
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.BOUNCE_CHARACTER,
      parameters: {
        maxCost,
        ...targeting,
      },
    };
  }

  /**
   * Parse search effect
   */
  private parseSearchEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract card count
    const countMatch = body.match(/top\s*(\d+)/i) || body.match(/(\d+)\s*card/i);
    const cardCount = countMatch ? parseInt(countMatch[1]) : 1;
    
    // Extract search criteria
    const searchCriteria = this.parseSearchCriteria(body);
    
    return {
      effectType: EffectType.SEARCH_DECK,
      parameters: {
        cardCount,
        searchCriteria,
      },
    };
  }

  /**
   * Parse draw effect
   */
  private parseDrawEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract card count
    const countMatch = body.match(/draw\s*(\d+)/i);
    const cardCount = countMatch ? parseInt(countMatch[1]) : 1;
    
    return {
      effectType: EffectType.DRAW_CARDS,
      parameters: {
        cardCount,
      },
    };
  }

  /**
   * Parse discard effect
   */
  private parseDiscardEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract card count
    const countMatch = body.match(/discard\s*(\d+)/i);
    const cardCount = countMatch ? parseInt(countMatch[1]) : 1;
    
    return {
      effectType: EffectType.DISCARD_CARDS,
      parameters: {
        cardCount,
      },
    };
  }

  /**
   * Parse trash effect
   */
  private parseTrashEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract card count
    const countMatch = body.match(/trash\s*(\d+)/i);
    const cardCount = countMatch ? parseInt(countMatch[1]) : 1;
    
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.TRASH_CARDS,
      parameters: {
        cardCount,
        ...targeting,
      },
    };
  }

  /**
   * Parse rest character effect
   */
  private parseRestEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.REST_CHARACTER,
      parameters: {
        ...targeting,
      },
    };
  }

  /**
   * Parse activate character effect
   */
  private parseActivateEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.ACTIVATE_CHARACTER,
      parameters: {
        ...targeting,
      },
    };
  }

  /**
   * Parse attach DON effect
   */
  private parseAttachDonEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract DON count
    const countMatch = body.match(/(\d+)\s*don/i);
    const cardCount = countMatch ? parseInt(countMatch[1]) : 1;
    
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.ATTACH_DON,
      parameters: {
        cardCount,
        ...targeting,
      },
    };
  }

  /**
   * Parse damage effect
   */
  private parseDamageEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract damage amount
    const damageMatch = body.match(/(\d+)\s*damage/i);
    const value = damageMatch ? parseInt(damageMatch[1]) : 1;
    
    return {
      effectType: EffectType.DEAL_DAMAGE,
      parameters: {
        value,
        targetType: TargetType.PLAYER,
      },
    };
  }

  /**
   * Parse keyword grant effect
   */
  private parseKeywordGrantEffect(body: string): {
    effectType: EffectType;
    parameters: EffectParameters;
  } {
    // Extract keyword
    let keyword = '';
    if (body.toLowerCase().includes('rush')) {
      keyword = 'Rush';
    } else if (body.toLowerCase().includes('blocker')) {
      keyword = 'Blocker';
    } else if (body.toLowerCase().includes('double attack')) {
      keyword = 'Double Attack';
    }
    
    // Extract duration
    const duration = this.parseDuration(body);
    
    // Extract targeting
    const targeting = this.parseTargeting(body);
    
    return {
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword,
        duration,
        ...targeting,
      },
    };
  }

  /**
   * Parse targeting information from effect text
   */
  private parseTargeting(body: string): Partial<EffectParameters> {
    const lowerBody = body.toLowerCase();
    
    // Determine target count
    let targetCount = 1;
    let maxTargets = 1;
    let minTargets = 1;
    
    const upToMatch = body.match(/up to\s*(\d+)/i);
    if (upToMatch) {
      maxTargets = parseInt(upToMatch[1]);
      minTargets = 0;
      targetCount = maxTargets;
    } else {
      const countMatch = body.match(/(\d+)\s*of\s*(your|opponent)/i);
      if (countMatch) {
        targetCount = parseInt(countMatch[1]);
        maxTargets = targetCount;
        minTargets = targetCount;
      }
    }
    
    // Build target filter
    const targetFilter: TargetFilter = {};
    
    // Controller
    if (lowerBody.includes('your opponent') || lowerBody.includes("opponent's")) {
      targetFilter.controller = 'opponent';
    } else if (lowerBody.includes('your') && !lowerBody.includes('your opponent')) {
      targetFilter.controller = 'self';
    }
    
    // Category
    const categories: CardCategory[] = [];
    if (lowerBody.includes('leader')) {
      categories.push(CardCategory.LEADER);
    }
    if (lowerBody.includes('character')) {
      categories.push(CardCategory.CHARACTER);
    }
    if (lowerBody.includes('stage')) {
      categories.push(CardCategory.STAGE);
    }
    if (lowerBody.includes('event')) {
      categories.push(CardCategory.EVENT);
    }
    if (categories.length > 0) {
      targetFilter.category = categories.length === 1 ? categories[0] : categories;
    }
    
    // Zone
    const zones: ZoneId[] = [];
    if (lowerBody.includes('hand')) {
      zones.push(ZoneId.HAND);
    }
    if (lowerBody.includes('deck')) {
      zones.push(ZoneId.DECK);
    }
    if (lowerBody.includes('trash')) {
      zones.push(ZoneId.TRASH);
    }
    // Default to character area if category is character and no zone specified
    if (categories.includes(CardCategory.CHARACTER) && zones.length === 0) {
      zones.push(ZoneId.CHARACTER_AREA);
    }
    if (categories.includes(CardCategory.LEADER) && zones.length === 0) {
      zones.push(ZoneId.LEADER_AREA);
    }
    if (zones.length > 0) {
      targetFilter.zone = zones.length === 1 ? zones[0] : zones;
    }
    
    // Color
    const colors: Color[] = [];
    if (lowerBody.includes('red')) {
      colors.push(Color.RED);
    }
    if (lowerBody.includes('green')) {
      colors.push(Color.GREEN);
    }
    if (lowerBody.includes('blue')) {
      colors.push(Color.BLUE);
    }
    if (lowerBody.includes('purple')) {
      colors.push(Color.PURPLE);
    }
    if (lowerBody.includes('black')) {
      colors.push(Color.BLACK);
    }
    if (lowerBody.includes('yellow')) {
      colors.push(Color.YELLOW);
    }
    if (colors.length > 0) {
      targetFilter.color = colors.length === 1 ? colors[0] : colors;
    }
    
    return {
      targetType: TargetType.CARD,
      targetCount,
      maxTargets,
      minTargets,
      targetFilter,
    };
  }

  /**
   * Parse search criteria from effect text
   */
  private parseSearchCriteria(body: string): SearchCriteria {
    const criteria: SearchCriteria = {};
    const lowerBody = body.toLowerCase();
    
    // Category
    if (lowerBody.includes('character')) {
      criteria.category = CardCategory.CHARACTER;
    } else if (lowerBody.includes('event')) {
      criteria.category = CardCategory.EVENT;
    } else if (lowerBody.includes('stage')) {
      criteria.category = CardCategory.STAGE;
    }
    
    // Color
    if (lowerBody.includes('red')) {
      criteria.color = Color.RED;
    } else if (lowerBody.includes('green')) {
      criteria.color = Color.GREEN;
    } else if (lowerBody.includes('blue')) {
      criteria.color = Color.BLUE;
    } else if (lowerBody.includes('purple')) {
      criteria.color = Color.PURPLE;
    } else if (lowerBody.includes('black')) {
      criteria.color = Color.BLACK;
    } else if (lowerBody.includes('yellow')) {
      criteria.color = Color.YELLOW;
    }
    
    // Cost
    const costMatch = body.match(/cost\s*(\d+)\s*or less/i);
    if (costMatch) {
      criteria.cost = { max: parseInt(costMatch[1]) };
    }
    
    // Power
    const powerMatch = body.match(/(\d+)\s*power or less/i);
    if (powerMatch) {
      criteria.power = { max: parseInt(powerMatch[1]) };
    }
    
    return criteria;
  }

  /**
   * Parse duration from effect text
   */
  private parseDuration(body: string): ModifierDuration {
    const lowerBody = body.toLowerCase();
    
    if (lowerBody.includes('during this battle') || lowerBody.includes('until end of battle')) {
      return ModifierDuration.UNTIL_END_OF_BATTLE;
    }
    if (lowerBody.includes('during this turn') || lowerBody.includes('until end of turn')) {
      return ModifierDuration.UNTIL_END_OF_TURN;
    }
    
    return ModifierDuration.PERMANENT;
  }

  /**
   * Parse condition from effect text
   */
  private parseCondition(body: string): any {
    // For now, return null - conditions will be implemented later
    // This would parse things like "If you have 5 or more DON"
    return null;
  }

  /**
   * Parse cost from effect text
   */
  private parseCost(body: string): any {
    // For now, return null - costs will be implemented later
    // This would parse things like "Rest 2 DON" or "Trash 1 card from hand"
    return null;
  }
}
