/**
 * Effect System Type Definitions
 * 
 * This module defines the core types for the card effect system,
 * including effect definitions, instances, parameters, and targeting.
 */

import {
  CardCategory,
  CardState,
  Color,
  ConditionExpr,
  CostExpr,
  EffectTimingType,
  ModifierDuration,
  PlayerId,
  TriggerTiming,
  ZoneId,
} from '../core/types';

// ============================================================================
// Effect Type Enum
// ============================================================================

/**
 * Enumeration of all supported effect types in the game
 */
export enum EffectType {
  // Power modification effects
  POWER_MODIFICATION = 'POWER_MODIFICATION',
  
  // Character removal effects
  KO_CHARACTER = 'KO_CHARACTER',
  BOUNCE_CHARACTER = 'BOUNCE_CHARACTER',
  BANISH_CHARACTER = 'BANISH_CHARACTER',
  
  // Deck manipulation effects
  SEARCH_DECK = 'SEARCH_DECK',
  LOOK_AT_CARDS = 'LOOK_AT_CARDS',
  REVEAL_CARDS = 'REVEAL_CARDS',
  
  // Card draw and discard effects
  DRAW_CARDS = 'DRAW_CARDS',
  DISCARD_CARDS = 'DISCARD_CARDS',
  TRASH_CARDS = 'TRASH_CARDS',
  
  // Keyword and ability effects
  GRANT_KEYWORD = 'GRANT_KEYWORD',
  
  // DON management effects
  ATTACH_DON = 'ATTACH_DON',
  REST_DON = 'REST_DON',
  ACTIVATE_DON = 'ACTIVATE_DON',
  
  // Character state effects
  REST_CHARACTER = 'REST_CHARACTER',
  ACTIVATE_CHARACTER = 'ACTIVATE_CHARACTER',
  
  // Damage effects
  DEAL_DAMAGE = 'DEAL_DAMAGE',
  
  // Zone movement effects
  MOVE_CARD = 'MOVE_CARD',
  
  // Composite effects (multiple effects in sequence)
  COMPOSITE = 'COMPOSITE',
}

// ============================================================================
// Target Types
// ============================================================================

/**
 * Types of targets that effects can affect
 */
export enum TargetType {
  CARD = 'CARD',
  PLAYER = 'PLAYER',
  ZONE = 'ZONE',
  VALUE = 'VALUE',
}

/**
 * Represents a target for an effect
 */
export interface Target {
  type: TargetType;
  cardId?: string;
  playerId?: PlayerId;
  zoneId?: ZoneId;
  value?: any;
}

// ============================================================================
// Effect Definition
// ============================================================================

/**
 * Defines a card effect with all its properties and requirements
 */
export interface EffectDefinition {
  /** Unique identifier for this effect */
  id: string;
  
  /** ID of the card this effect belongs to */
  sourceCardId: string;
  
  /** Effect label from card text (e.g., "[On Play]", "[When Attacking]") */
  label: string;
  
  /** Timing type: AUTO (triggers), ACTIVATE (player choice), or PERMANENT */
  timingType: EffectTimingType;
  
  /** When this effect triggers (for AUTO effects) */
  triggerTiming: TriggerTiming | null;
  
  /** Condition that must be met for effect to apply */
  condition: ConditionExpr | null;
  
  /** Cost that must be paid to activate effect */
  cost: CostExpr | null;
  
  /** Type of effect (determines how it's resolved) */
  effectType: EffectType;
  
  /** Parameters specific to this effect type */
  parameters: EffectParameters;
  
  /** Whether this effect can only be used once per turn */
  oncePerTurn: boolean;
  
  /** Whether this effect has been used this turn */
  usedThisTurn: boolean;
}

// ============================================================================
// Effect Parameters
// ============================================================================

/**
 * Parameters for effect resolution, varies by effect type
 */
export interface EffectParameters {
  // Power modification parameters
  /** Amount to modify power by (positive or negative) */
  powerChange?: number;
  
  // K.O. / Bounce parameters
  /** Maximum power of characters that can be targeted */
  maxPower?: number;
  /** Maximum cost of characters that can be targeted */
  maxCost?: number;
  
  // Search / Look parameters
  /** Number of cards to look at or search */
  cardCount?: number;
  /** Criteria for searching/filtering cards */
  searchCriteria?: SearchCriteria;
  
  // Keyword grant parameters
  /** Keyword to grant (e.g., "Rush", "Blocker", "Double Attack") */
  keyword?: string;
  
  // Targeting parameters
  /** Type of target required */
  targetType?: TargetType;
  /** Number of targets required */
  targetCount?: number;
  /** Maximum number of targets (for "up to X" effects) */
  maxTargets?: number;
  /** Minimum number of targets */
  minTargets?: number;
  /** Filter for determining legal targets */
  targetFilter?: TargetFilter;
  
  // Duration parameters
  /** How long the effect lasts */
  duration?: ModifierDuration;
  
  // Composite effect parameters
  /** Sub-effects for composite effects */
  subEffects?: EffectDefinition[];
  
  // Generic value parameters
  /** Generic numeric value for various effects */
  value?: number;
  /** Generic string value for various effects */
  stringValue?: string;
  /** Generic boolean value for various effects */
  booleanValue?: boolean;
}

// ============================================================================
// Search Criteria
// ============================================================================

/**
 * Criteria for searching or filtering cards
 */
export interface SearchCriteria {
  /** Card category filter */
  category?: CardCategory | CardCategory[];
  
  /** Card color filter */
  color?: Color | Color[];
  
  /** Cost range filter */
  cost?: {
    min?: number;
    max?: number;
    exact?: number;
  };
  
  /** Power range filter */
  power?: {
    min?: number;
    max?: number;
    exact?: number;
  };
  
  /** Type tags filter (e.g., "Straw Hat Crew", "Navy") */
  typeTags?: string[];
  
  /** Attributes filter (e.g., "Slash", "Ranged") */
  attributes?: string[];
  
  /** Keywords filter (e.g., "Rush", "Blocker") */
  keywords?: string[];
  
  /** Name filter (partial match) */
  nameContains?: string;
}

// ============================================================================
// Target Filter
// ============================================================================

/**
 * Filter for determining legal targets for an effect
 */
export interface TargetFilter {
  /** Controller filter: who controls the target */
  controller?: 'self' | 'opponent' | 'any';
  
  /** Zone filter: which zones to look in */
  zone?: ZoneId | ZoneId[];
  
  /** Category filter: which card categories are valid */
  category?: CardCategory | CardCategory[];
  
  /** Color filter: which colors are valid */
  color?: Color | Color[];
  
  /** Cost range filter */
  costRange?: {
    min?: number;
    max?: number;
    exact?: number;
  };
  
  /** Power range filter */
  powerRange?: {
    min?: number;
    max?: number;
    exact?: number;
  };
  
  /** State filter: which card states are valid */
  state?: CardState | CardState[];
  
  /** Keyword filter: target must have these keywords */
  hasKeyword?: string | string[];
  
  /** Keyword filter: target must not have these keywords */
  lacksKeyword?: string | string[];
  
  /** Type tags filter */
  typeTags?: string[];
  
  /** Attributes filter */
  attributes?: string[];
  
  /** Custom filter function (for complex conditions) */
  customFilter?: (cardId: string, state: any) => boolean;
}

// ============================================================================
// Effect Instance
// ============================================================================

/**
 * Represents an effect that is being resolved
 */
export interface EffectInstance {
  /** Unique identifier for this effect instance */
  id: string;
  
  /** The effect definition being resolved */
  definition: EffectDefinition;
  
  /** The card that is the source of this effect */
  sourceCardId: string;
  
  /** The player controlling this effect */
  controller: PlayerId;
  
  /** Chosen targets for this effect */
  targets: Target[];
  
  /** Chosen values for this effect (for effects that require choices) */
  chosenValues: Map<string, any>;
  
  /** Timestamp when this effect was created */
  timestamp: number;
  
  /** Whether this effect has been resolved */
  resolved: boolean;
  
  /** Priority for resolution order (higher = resolves first) */
  priority?: number;
}

// ============================================================================
// Effect Resolution Context
// ============================================================================

/**
 * Context information available during effect resolution
 */
export interface EffectResolutionContext {
  /** The effect instance being resolved */
  effect: EffectInstance;
  
  /** The current game state */
  state: any; // GameState - using any to avoid circular dependency
  
  /** The event that triggered this effect (if any) */
  triggeringEvent?: any; // GameEvent
  
  /** Additional context data */
  data?: Map<string, any>;
}

// ============================================================================
// Effect Stack Entry
// ============================================================================

/**
 * Represents an effect on the effect stack waiting to be resolved
 */
export interface EffectStackEntry {
  /** The effect instance */
  effect: EffectInstance;
  
  /** Priority for resolution order */
  priority: number;
  
  /** Timestamp when added to stack */
  addedAt: number;
}

// ============================================================================
// Effect Validation Result
// ============================================================================

/**
 * Result of validating whether an effect can be activated/resolved
 */
export interface EffectValidationResult {
  /** Whether the effect is valid */
  valid: boolean;
  
  /** Reason why the effect is invalid (if applicable) */
  reason?: string;
  
  /** Missing requirements (if applicable) */
  missingRequirements?: string[];
}

// ============================================================================
// Effect Resolution Result
// ============================================================================

/**
 * Result of resolving an effect
 */
export interface EffectResolutionResult {
  /** Whether the effect resolved successfully */
  success: boolean;
  
  /** The updated game state after resolution */
  state: any; // GameState
  
  /** Error message if resolution failed */
  error?: string;
  
  /** Additional data about the resolution */
  data?: Map<string, any>;
}
