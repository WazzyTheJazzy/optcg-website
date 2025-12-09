/**
 * AIPlayerFactory.ts
 * 
 * Factory functions and utilities for creating AI players with various configurations.
 * Provides easy-to-use functions for creating AI opponents with different difficulty
 * levels and play styles.
 */

import { PlayerId } from '../core/types';
import { AIPlayer } from './AIPlayer';
import { HumanPlayer } from './HumanPlayer';
import {
  AIPlayerConfig,
  DifficultyLevel,
  PlayStyle,
  DEFAULT_AI_CONFIGS,
  STRATEGY_WEIGHTS,
  DEFAULT_STRATEGY_PROFILES,
} from './types';
import { EventEmitter } from '../rendering/EventEmitter';

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an AI player with specified difficulty and play style
 * 
 * @param playerId - The player ID for the AI
 * @param difficulty - Difficulty level (easy, medium, hard)
 * @param playStyle - Play style (aggressive, defensive, balanced)
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance
 * 
 * @example
 * ```typescript
 * // Create a hard difficulty aggressive AI
 * const ai = createAIPlayer('player2', 'hard', 'aggressive');
 * 
 * // Create a medium difficulty balanced AI with event emitter
 * const ai = createAIPlayer('player2', 'medium', 'balanced', eventEmitter);
 * ```
 */
export function createAIPlayer(
  playerId: PlayerId,
  difficulty: DifficultyLevel = 'medium',
  playStyle: PlayStyle = 'balanced',
  eventEmitter?: EventEmitter
): AIPlayer {
  const config = getDefaultConfig(difficulty, playStyle);
  return new AIPlayer(playerId, config, eventEmitter);
}

/**
 * Create an easy AI opponent
 * Makes suboptimal decisions 30% of the time with balanced play style
 * 
 * @param playerId - The player ID for the AI
 * @param playStyle - Optional play style (defaults to balanced)
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance configured for easy difficulty
 * 
 * @example
 * ```typescript
 * const easyAI = createEasyAI('player2');
 * const easyAggressiveAI = createEasyAI('player2', 'aggressive');
 * ```
 */
export function createEasyAI(
  playerId: PlayerId,
  playStyle: PlayStyle = 'balanced',
  eventEmitter?: EventEmitter
): AIPlayer {
  return createAIPlayer(playerId, 'easy', playStyle, eventEmitter);
}

/**
 * Create a medium difficulty AI opponent
 * Makes near-optimal decisions with occasional mistakes
 * 
 * @param playerId - The player ID for the AI
 * @param playStyle - Optional play style (defaults to balanced)
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance configured for medium difficulty
 * 
 * @example
 * ```typescript
 * const mediumAI = createMediumAI('player2');
 * const mediumDefensiveAI = createMediumAI('player2', 'defensive');
 * ```
 */
export function createMediumAI(
  playerId: PlayerId,
  playStyle: PlayStyle = 'balanced',
  eventEmitter?: EventEmitter
): AIPlayer {
  return createAIPlayer(playerId, 'medium', playStyle, eventEmitter);
}

/**
 * Create a hard difficulty AI opponent
 * Consistently makes optimal decisions based on available information
 * 
 * @param playerId - The player ID for the AI
 * @param playStyle - Optional play style (defaults to balanced)
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance configured for hard difficulty
 * 
 * @example
 * ```typescript
 * const hardAI = createHardAI('player2');
 * const hardAggressiveAI = createHardAI('player2', 'aggressive');
 * ```
 */
export function createHardAI(
  playerId: PlayerId,
  playStyle: PlayStyle = 'balanced',
  eventEmitter?: EventEmitter
): AIPlayer {
  return createAIPlayer(playerId, 'hard', playStyle, eventEmitter);
}

/**
 * Create an AI player with custom configuration
 * Allows full control over all AI parameters
 * 
 * @param playerId - The player ID for the AI
 * @param config - Custom AI configuration
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance with custom configuration
 * 
 * @example
 * ```typescript
 * const customConfig: AIPlayerConfig = {
 *   difficulty: 'hard',
 *   playStyle: 'aggressive',
 *   thinkingTime: { min: 500, max: 2000 },
 *   randomness: 0.1
 * };
 * const customAI = createCustomAIPlayer('player2', customConfig);
 * ```
 */
export function createCustomAIPlayer(
  playerId: PlayerId,
  config: AIPlayerConfig,
  eventEmitter?: EventEmitter
): AIPlayer {
  return new AIPlayer(playerId, config, eventEmitter);
}

// ============================================================================
// Configuration Utilities
// ============================================================================

/**
 * Get default configuration for a difficulty level and play style
 * 
 * @param difficulty - Difficulty level (easy, medium, hard)
 * @param playStyle - Optional play style (defaults to balanced)
 * @returns AI configuration object
 * 
 * @example
 * ```typescript
 * const config = getDefaultConfig('hard', 'aggressive');
 * const ai = new AIPlayer('player2', config);
 * ```
 */
export function getDefaultConfig(
  difficulty: DifficultyLevel,
  playStyle: PlayStyle = 'balanced'
): AIPlayerConfig {
  const baseConfig = DEFAULT_AI_CONFIGS[difficulty];
  
  return {
    ...baseConfig,
    playStyle,
  };
}

/**
 * Create a custom configuration by modifying a default configuration
 * 
 * @param difficulty - Base difficulty level
 * @param overrides - Partial configuration to override defaults
 * @returns AI configuration object with overrides applied
 * 
 * @example
 * ```typescript
 * // Create a hard AI with faster thinking time
 * const config = createCustomConfig('hard', {
 *   thinkingTime: { min: 300, max: 1000 }
 * });
 * ```
 */
export function createCustomConfig(
  difficulty: DifficultyLevel,
  overrides: Partial<AIPlayerConfig>
): AIPlayerConfig {
  const baseConfig = DEFAULT_AI_CONFIGS[difficulty];
  
  return {
    ...baseConfig,
    ...overrides,
    // Merge thinkingTime if partially provided
    thinkingTime: {
      ...baseConfig.thinkingTime,
      ...(overrides.thinkingTime || {}),
    },
  };
}

/**
 * Get all available difficulty levels
 * 
 * @returns Array of difficulty level strings
 * 
 * @example
 * ```typescript
 * const difficulties = getAvailableDifficulties();
 * // ['easy', 'medium', 'hard']
 * ```
 */
export function getAvailableDifficulties(): DifficultyLevel[] {
  return ['easy', 'medium', 'hard'];
}

/**
 * Get all available play styles
 * 
 * @returns Array of play style strings
 * 
 * @example
 * ```typescript
 * const styles = getAvailablePlayStyles();
 * // ['aggressive', 'defensive', 'balanced']
 * ```
 */
export function getAvailablePlayStyles(): PlayStyle[] {
  return ['aggressive', 'defensive', 'balanced'];
}

/**
 * Get description of a difficulty level
 * 
 * @param difficulty - Difficulty level
 * @returns Human-readable description of the difficulty
 * 
 * @example
 * ```typescript
 * const desc = getDifficultyDescription('hard');
 * // "Consistently makes optimal decisions..."
 * ```
 */
export function getDifficultyDescription(difficulty: DifficultyLevel): string {
  const descriptions: Record<DifficultyLevel, string> = {
    easy: 'Makes suboptimal decisions 30% of the time. Good for beginners learning the game.',
    medium: 'Makes near-optimal decisions with occasional mistakes. Provides a balanced challenge.',
    hard: 'Consistently makes optimal decisions based on available information. Challenging for experienced players.',
  };
  
  return descriptions[difficulty];
}

/**
 * Get description of a play style
 * 
 * @param playStyle - Play style
 * @returns Human-readable description of the play style
 * 
 * @example
 * ```typescript
 * const desc = getPlayStyleDescription('aggressive');
 * // "Prioritizes dealing damage..."
 * ```
 */
export function getPlayStyleDescription(playStyle: PlayStyle): string {
  const descriptions: Record<PlayStyle, string> = {
    aggressive: 'Prioritizes dealing damage and attacking the opponent. Takes more risks for potential rewards.',
    defensive: 'Focuses on board control and protecting life total. Plays more conservatively.',
    balanced: 'Balances offense and defense. Adapts strategy based on game state.',
  };
  
  return descriptions[playStyle];
}

/**
 * Validate AI configuration
 * Checks if configuration values are within acceptable ranges
 * 
 * @param config - AI configuration to validate
 * @returns True if configuration is valid
 * @throws Error if configuration is invalid
 * 
 * @example
 * ```typescript
 * const config = getDefaultConfig('medium');
 * validateConfig(config); // true
 * ```
 */
export function validateConfig(config: AIPlayerConfig): boolean {
  // Validate difficulty
  const validDifficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
  if (!validDifficulties.includes(config.difficulty)) {
    throw new Error(`Invalid difficulty: ${config.difficulty}. Must be one of: ${validDifficulties.join(', ')}`);
  }
  
  // Validate play style
  const validPlayStyles: PlayStyle[] = ['aggressive', 'defensive', 'balanced'];
  if (!validPlayStyles.includes(config.playStyle)) {
    throw new Error(`Invalid play style: ${config.playStyle}. Must be one of: ${validPlayStyles.join(', ')}`);
  }
  
  // Validate thinking time
  if (config.thinkingTime.min < 0) {
    throw new Error('Thinking time min must be non-negative');
  }
  if (config.thinkingTime.max < config.thinkingTime.min) {
    throw new Error('Thinking time max must be greater than or equal to min');
  }
  if (config.thinkingTime.max > 30000) {
    throw new Error('Thinking time max should not exceed 30 seconds');
  }
  
  // Validate randomness
  if (config.randomness < 0 || config.randomness > 1) {
    throw new Error('Randomness must be between 0 and 1');
  }
  
  return true;
}

/**
 * Get configuration summary as a human-readable string
 * Useful for debugging and UI display
 * 
 * @param config - AI configuration
 * @returns Human-readable summary of the configuration
 * 
 * @example
 * ```typescript
 * const config = getDefaultConfig('hard', 'aggressive');
 * console.log(getConfigSummary(config));
 * // "Hard difficulty, Aggressive play style, 1000-3000ms thinking time, 5% randomness"
 * ```
 */
export function getConfigSummary(config: AIPlayerConfig): string {
  const difficultyLabel = config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1);
  const playStyleLabel = config.playStyle.charAt(0).toUpperCase() + config.playStyle.slice(1);
  const randomnessPercent = Math.round(config.randomness * 100);
  
  return `${difficultyLabel} difficulty, ${playStyleLabel} play style, ` +
         `${config.thinkingTime.min}-${config.thinkingTime.max}ms thinking time, ` +
         `${randomnessPercent}% randomness`;
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Preset configurations for common AI opponent types
 */
export const AI_PRESETS = {
  /**
   * Beginner-friendly AI for learning the game
   */
  TUTORIAL: {
    difficulty: 'easy' as DifficultyLevel,
    playStyle: 'balanced' as PlayStyle,
    thinkingTime: { min: 500, max: 1000 },
    randomness: 0.4,
  },
  
  /**
   * Quick AI for fast games (shorter thinking time)
   */
  QUICK_PLAY: {
    difficulty: 'medium' as DifficultyLevel,
    playStyle: 'balanced' as PlayStyle,
    thinkingTime: { min: 300, max: 800 },
    randomness: 0.15,
  },
  
  /**
   * Challenging AI for competitive practice
   */
  COMPETITIVE: {
    difficulty: 'hard' as DifficultyLevel,
    playStyle: 'balanced' as PlayStyle,
    thinkingTime: { min: 1000, max: 3000 },
    randomness: 0.05,
  },
  
  /**
   * Aggressive AI that prioritizes attacking
   */
  AGGRO: {
    difficulty: 'hard' as DifficultyLevel,
    playStyle: 'aggressive' as PlayStyle,
    thinkingTime: { min: 800, max: 2000 },
    randomness: 0.1,
  },
  
  /**
   * Defensive AI that focuses on board control
   */
  CONTROL: {
    difficulty: 'hard' as DifficultyLevel,
    playStyle: 'defensive' as PlayStyle,
    thinkingTime: { min: 1000, max: 2500 },
    randomness: 0.08,
  },
} as const;

/**
 * Create an AI player from a preset configuration
 * 
 * @param playerId - The player ID for the AI
 * @param presetName - Name of the preset configuration
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance with preset configuration
 * 
 * @example
 * ```typescript
 * const tutorialAI = createAIFromPreset('player2', 'TUTORIAL');
 * const competitiveAI = createAIFromPreset('player2', 'COMPETITIVE');
 * ```
 */
export function createAIFromPreset(
  playerId: PlayerId,
  presetName: keyof typeof AI_PRESETS,
  eventEmitter?: EventEmitter
): AIPlayer {
  const config = AI_PRESETS[presetName];
  return new AIPlayer(playerId, config, eventEmitter);
}

/**
 * Get all available preset names
 * 
 * @returns Array of preset configuration names
 * 
 * @example
 * ```typescript
 * const presets = getAvailablePresets();
 * // ['TUTORIAL', 'QUICK_PLAY', 'COMPETITIVE', 'AGGRO', 'CONTROL']
 * ```
 */
export function getAvailablePresets(): Array<keyof typeof AI_PRESETS> {
  return Object.keys(AI_PRESETS) as Array<keyof typeof AI_PRESETS>;
}

/**
 * Get description of a preset configuration
 * 
 * @param presetName - Name of the preset
 * @returns Human-readable description of the preset
 * 
 * @example
 * ```typescript
 * const desc = getPresetDescription('COMPETITIVE');
 * // "Challenging AI for competitive practice"
 * ```
 */
export function getPresetDescription(presetName: keyof typeof AI_PRESETS): string {
  const descriptions: Record<keyof typeof AI_PRESETS, string> = {
    TUTORIAL: 'Beginner-friendly AI for learning the game. Makes frequent mistakes and plays slowly.',
    QUICK_PLAY: 'Medium difficulty AI with faster thinking time for quick games.',
    COMPETITIVE: 'Challenging AI for competitive practice. Makes optimal decisions with realistic thinking time.',
    AGGRO: 'Aggressive AI that prioritizes attacking and dealing damage. High difficulty.',
    CONTROL: 'Defensive AI that focuses on board control and resource management. High difficulty.',
  };
  
  return descriptions[presetName];
}

// ============================================================================
// Exports
// ============================================================================

export {
  AIPlayer,
  HumanPlayer,
  DEFAULT_AI_CONFIGS,
  STRATEGY_WEIGHTS,
  DEFAULT_STRATEGY_PROFILES,
};

export type {
  AIPlayerConfig,
  DifficultyLevel,
  PlayStyle,
};
