/**
 * AI Opponent System Type Definitions
 * 
 * This module defines all types, interfaces, and configurations for the AI opponent system.
 * It includes difficulty levels, strategy profiles, evaluation weights, and decision contexts.
 */

import { GameState, PlayerId, GameAction, CardInstance, EffectInstance, Target, CounterAction } from '../core/types';

// ============================================================================
// AI Player Configuration
// ============================================================================

/**
 * Difficulty level for AI opponents
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Play style that determines AI strategy
 */
export type PlayStyle = 'aggressive' | 'defensive' | 'balanced';

/**
 * Configuration for AI player behavior
 */
export interface AIPlayerConfig {
  /** Difficulty level affecting decision quality */
  difficulty: DifficultyLevel;
  
  /** Play style affecting strategic priorities */
  playStyle: PlayStyle;
  
  /** Thinking time configuration for realistic delays */
  thinkingTime: {
    /** Minimum delay in milliseconds before making a decision */
    min: number;
    /** Maximum delay in milliseconds before making a decision */
    max: number;
  };
  
  /** Amount of randomness in decisions (0-1, higher = more random) */
  randomness: number;
}

// ============================================================================
// Evaluation System
// ============================================================================

/**
 * Weights for different evaluation factors
 * Each weight determines how much that factor influences the final score
 */
export interface EvaluationWeights {
  /** Weight for board control (number and power of characters) */
  boardControl: number;
  
  /** Weight for resource efficiency (DON usage and card costs) */
  resourceEfficiency: number;
  
  /** Weight for life differential (life advantage/disadvantage) */
  lifeDifferential: number;
  
  /** Weight for card advantage (hand size and deck size) */
  cardAdvantage: number;
  
  /** Weight for tempo (action speed and board impact) */
  tempo: number;
}

/**
 * Individual evaluation factors computed for a game state
 * Each factor is normalized to a -100 to 100 scale
 */
export interface EvaluationFactors {
  /** Board control score (-100 to 100) */
  boardControl: number;
  
  /** Resource efficiency score (-100 to 100) */
  resourceEfficiency: number;
  
  /** Life differential score (-100 to 100) */
  lifeDifferential: number;
  
  /** Card advantage score (-100 to 100) */
  cardAdvantage: number;
  
  /** Tempo score (-100 to 100) */
  tempo: number;
}

// ============================================================================
// Strategy System
// ============================================================================

/**
 * Strategy profile defining AI behavior patterns
 */
export interface StrategyProfile {
  /** Name of the strategy profile */
  name: string;
  
  /** Evaluation weights for this strategy */
  weights: EvaluationWeights;
  
  /** Aggressiveness level (0-1, affects attack vs defense priority) */
  aggressiveness: number;
  
  /** Risk tolerance (0-1, affects risky plays) */
  riskTolerance: number;
}

// ============================================================================
// Decision Context
// ============================================================================

/**
 * Context information passed to AI decision-making components
 */
export interface DecisionContext {
  /** Current game state */
  state: GameState;
  
  /** ID of the AI player making the decision */
  playerId: PlayerId;
  
  /** AI configuration */
  config: AIPlayerConfig;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default AI configurations for each difficulty level
 */
export const DEFAULT_AI_CONFIGS: Record<DifficultyLevel, AIPlayerConfig> = {
  easy: {
    difficulty: 'easy',
    playStyle: 'balanced',
    thinkingTime: {
      min: 500,
      max: 1500,
    },
    randomness: 0.3,
  },
  
  medium: {
    difficulty: 'medium',
    playStyle: 'balanced',
    thinkingTime: {
      min: 800,
      max: 2000,
    },
    randomness: 0.15,
  },
  
  hard: {
    difficulty: 'hard',
    playStyle: 'balanced',
    thinkingTime: {
      min: 1000,
      max: 3000,
    },
    randomness: 0.05,
  },
};

/**
 * Strategy weight profiles for different play styles
 */
export const STRATEGY_WEIGHTS: Record<PlayStyle, EvaluationWeights> = {
  aggressive: {
    boardControl: 0.25,
    resourceEfficiency: 0.15,
    lifeDifferential: 0.35,
    cardAdvantage: 0.10,
    tempo: 0.15,
  },
  
  defensive: {
    boardControl: 0.30,
    resourceEfficiency: 0.20,
    lifeDifferential: 0.20,
    cardAdvantage: 0.20,
    tempo: 0.10,
  },
  
  balanced: {
    boardControl: 0.25,
    resourceEfficiency: 0.20,
    lifeDifferential: 0.25,
    cardAdvantage: 0.15,
    tempo: 0.15,
  },
};

/**
 * Default strategy profiles
 */
export const DEFAULT_STRATEGY_PROFILES: Record<PlayStyle, StrategyProfile> = {
  aggressive: {
    name: 'Aggressive',
    weights: STRATEGY_WEIGHTS.aggressive,
    aggressiveness: 0.8,
    riskTolerance: 0.7,
  },
  
  defensive: {
    name: 'Defensive',
    weights: STRATEGY_WEIGHTS.defensive,
    aggressiveness: 0.3,
    riskTolerance: 0.3,
  },
  
  balanced: {
    name: 'Balanced',
    weights: STRATEGY_WEIGHTS.balanced,
    aggressiveness: 0.5,
    riskTolerance: 0.5,
  },
};

// ============================================================================
// Action Scoring
// ============================================================================

/**
 * Scored option for ranking decisions
 */
export interface ScoredOption<T> {
  /** The option being scored */
  option: T;
  
  /** Numeric score for this option */
  score: number;
  
  /** Optional breakdown of evaluation factors */
  factors?: EvaluationFactors;
}

// ============================================================================
// AI Events
// ============================================================================

/**
 * Event types emitted by the AI system
 */
export enum AIEventType {
  /** AI has started thinking about a decision */
  AI_THINKING_START = 'AI_THINKING_START',
  
  /** AI has finished thinking and made a decision */
  AI_THINKING_END = 'AI_THINKING_END',
  
  /** AI has selected an action */
  AI_ACTION_SELECTED = 'AI_ACTION_SELECTED',
  
  /** AI evaluation completed */
  AI_EVALUATION_COMPLETE = 'AI_EVALUATION_COMPLETE',
}

/**
 * Data for AI action selected event
 */
export interface AIActionSelectedData {
  /** Type of action selected */
  actionType: string;
  
  /** The selected option */
  selectedOption: any;
  
  /** Evaluation score for the selected option */
  score: number;
  
  /** Optional evaluation factors breakdown */
  factors?: EvaluationFactors;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Function type for evaluating an option
 */
export type EvaluationFunction<T> = (option: T, context: DecisionContext) => number;

/**
 * Function type for filtering options
 */
export type FilterFunction<T> = (option: T, context: DecisionContext) => boolean;
