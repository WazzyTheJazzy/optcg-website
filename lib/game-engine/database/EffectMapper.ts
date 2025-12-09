/**
 * EffectMapper.ts
 * 
 * Parses card effect text and maps it to effect script IDs and timing information.
 */

import {
  EffectDefinition,
  EffectTimingType,
  TriggerTiming,
  ConditionExpr,
  CostExpr,
} from '../core/types';

/**
 * Pattern for matching effect text to script IDs
 */
interface EffectPattern {
  pattern: RegExp;
  scriptId: string | ((match: RegExpMatchArray) => string);
}

/**
 * Maps card effect text to EffectDefinition objects
 */
export class EffectMapper {
  private effectPatterns: EffectPattern[];

  constructor() {
    this.effectPatterns = this.initializeEffectPatterns();
  }

  /**
   * Parse effect text and create EffectDefinition array
   * @param effectText - The card's effect text
   * @returns Array of EffectDefinition objects
   */
  parseEffects(effectText: string | null): EffectDefinition[] {
    if (!effectText || effectText.trim().length === 0) {
      return [];
    }

    const effects: EffectDefinition[] = [];
    
    // Split by effect labels to handle multiple effects
    const effectSegments = this.splitByEffectLabels(effectText);

    for (const segment of effectSegments) {
      const label = this.extractEffectLabel(segment);
      if (!label) {
        continue;
      }

      const timing = this.mapLabelToTiming(label);
      const scriptId = this.mapEffectToScriptId(segment, label);
      const condition = this.parseCondition(segment);
      const cost = this.parseCost(segment);
      const oncePerTurn = this.isOncePerTurn(segment);

      const effectDef: EffectDefinition = {
        id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label,
        timingType: timing.timingType,
        triggerTiming: timing.triggerTiming,
        condition,
        cost,
        scriptId,
        oncePerTurn,
      };

      effects.push(effectDef);
    }

    return effects;
  }

  /**
   * Split effect text by effect labels
   * @param effectText - The full effect text
   * @returns Array of effect segments
   */
  private splitByEffectLabels(effectText: string): string[] {
    // Match patterns like [On Play], [When Attacking], etc.
    const labelPattern = /\[([^\]]+)\]/g;
    const segments: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = labelPattern.exec(effectText)) !== null) {
      if (match.index > lastIndex) {
        // Include the label with its text
        const segment = effectText.substring(lastIndex, labelPattern.lastIndex);
        if (segment.trim()) {
          segments.push(segment.trim());
        }
      }
      lastIndex = labelPattern.lastIndex;
    }

    // Add remaining text if any
    if (lastIndex < effectText.length) {
      const remaining = effectText.substring(lastIndex).trim();
      if (remaining) {
        segments.push(remaining);
      }
    }

    // If no labels found, treat entire text as one effect
    if (segments.length === 0 && effectText.trim()) {
      segments.push(effectText.trim());
    }

    return segments;
  }

  /**
   * Extract effect label from text
   * @param text - Effect text segment
   * @returns Effect label or null
   */
  private extractEffectLabel(text: string): string | null {
    const match = text.match(/\[([^\]]+)\]/);
    return match ? `[${match[1]}]` : null;
  }

  /**
   * Map effect label to timing type and trigger timing
   * @param label - The effect label
   * @returns Timing information
   */
  private mapLabelToTiming(label: string): {
    timingType: EffectTimingType;
    triggerTiming: TriggerTiming | null;
  } {
    const labelLower = label.toLowerCase();

    // AUTO effects with specific triggers
    if (labelLower.includes('on play')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
      };
    }

    if (labelLower.includes('when attacking')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.WHEN_ATTACKING,
      };
    }

    if (labelLower.includes('on k.o') || labelLower.includes('on ko')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
      };
    }

    if (labelLower.includes('when attacked')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.WHEN_ATTACKED,
      };
    }

    if (labelLower.includes('on block')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_BLOCK,
      };
    }

    if (labelLower.includes('end of your turn')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
      };
    }

    if (labelLower.includes('end of opponent')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.END_OF_OPPONENT_TURN,
      };
    }

    if (labelLower.includes('start of your turn')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.START_OF_TURN,
      };
    }

    // ACTIVATE effects
    if (labelLower.includes('activate') || labelLower.includes('main')) {
      return {
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: TriggerTiming.START_OF_MAIN,
      };
    }

    // PERMANENT effects (keywords)
    if (
      labelLower.includes('blocker') ||
      labelLower.includes('rush') ||
      labelLower.includes('banish') ||
      labelLower.includes('double attack')
    ) {
      return {
        timingType: EffectTimingType.PERMANENT,
        triggerTiming: null,
      };
    }

    // TRIGGER effects
    if (labelLower.includes('trigger')) {
      return {
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.START_OF_GAME, // Placeholder
      };
    }

    // Default to AUTO with no specific timing
    return {
      timingType: EffectTimingType.AUTO,
      triggerTiming: null,
    };
  }

  /**
   * Map effect text to script ID
   * @param effectText - The effect text
   * @param label - The effect label
   * @returns Script ID
   */
  private mapEffectToScriptId(effectText: string, label: string): string {
    const textLower = effectText.toLowerCase();

    // Try to match against known patterns
    for (const pattern of this.effectPatterns) {
      const match = textLower.match(pattern.pattern);
      if (match) {
        if (typeof pattern.scriptId === 'function') {
          return pattern.scriptId(match);
        }
        return pattern.scriptId;
      }
    }

    // No match found - use placeholder and log warning
    console.warn(`No script mapping found for effect: ${effectText}`);
    return 'effect_placeholder';
  }

  /**
   * Parse condition from effect text
   * @param effectText - The effect text
   * @returns Condition expression or null
   */
  private parseCondition(effectText: string): ConditionExpr | null {
    // Basic condition parsing - can be expanded
    // For now, return null (conditions will be handled by scripts)
    return null;
  }

  /**
   * Parse cost from effect text
   * @param effectText - The effect text
   * @returns Cost expression or null
   */
  private parseCost(effectText: string): CostExpr | null {
    // Basic cost parsing - can be expanded
    // Look for DON!! costs, trash costs, etc.
    return null;
  }

  /**
   * Check if effect is once per turn
   * @param effectText - The effect text
   * @returns True if once per turn
   */
  private isOncePerTurn(effectText: string): boolean {
    const textLower = effectText.toLowerCase();
    return (
      textLower.includes('once per turn') ||
      textLower.includes('1/turn') ||
      textLower.includes('one per turn')
    );
  }

  /**
   * Initialize effect patterns for matching
   * @returns Array of effect patterns
   */
  private initializeEffectPatterns(): EffectPattern[] {
    return [
      // Draw effects
      {
        pattern: /draw (\d+) card/i,
        scriptId: (match) => `draw_${match[1]}`,
      },

      // Power boost effects
      {
        pattern: /(\d+) power.*until.*end.*turn/i,
        scriptId: (match) => `power_boost_${match[1]}_until_end_of_turn`,
      },
      {
        pattern: /(\d+) power.*during.*battle/i,
        scriptId: (match) => `power_boost_${match[1]}_during_battle`,
      },
      {
        pattern: /(\d+) power/i,
        scriptId: (match) => `power_boost_${match[1]}`,
      },

      // K.O. effects
      {
        pattern: /k\.?o\.?.*character.*cost (\d+) or less/i,
        scriptId: (match) => `ko_cost_${match[1]}_or_less`,
      },
      {
        pattern: /k\.?o\.?.*rested.*character/i,
        scriptId: () => 'ko_rested_character',
      },
      {
        pattern: /k\.?o\.?.*character/i,
        scriptId: () => 'ko_target_character',
      },

      // Rest effects
      {
        pattern: /rest.*all.*opponent.*character/i,
        scriptId: () => 'rest_all_opponent_characters',
      },
      {
        pattern: /rest.*character/i,
        scriptId: () => 'rest_target_character',
      },

      // Activate effects
      {
        pattern: /activate.*character/i,
        scriptId: () => 'activate_target_character',
      },

      // Search effects
      {
        pattern: /search.*deck.*character/i,
        scriptId: () => 'search_deck_character',
      },
      {
        pattern: /search.*deck.*event/i,
        scriptId: () => 'search_deck_event',
      },
      {
        pattern: /search.*deck.*stage/i,
        scriptId: () => 'search_deck_stage',
      },
      {
        pattern: /search.*deck.*cost (\d+) or less/i,
        scriptId: (match) => `search_deck_cost_${match[1]}_or_less`,
      },

      // Cost reduction
      {
        pattern: /cost.*(\d+) less/i,
        scriptId: (match) => `cost_reduction_${match[1]}`,
      },
      {
        pattern: /reduce.*cost.*(\d+)/i,
        scriptId: (match) => `cost_reduction_${match[1]}`,
      },
    ];
  }
}
