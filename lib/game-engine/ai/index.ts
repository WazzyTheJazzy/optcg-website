/**
 * AI and Player System Exports
 * 
 * This module exports player implementations and related types
 */

export {
  HumanPlayer,
  createHumanPlayer,
  type HumanPlayerCallbacks,
  type ActionCallback,
  type MulliganCallback,
  type BlockerCallback,
  type CounterActionCallback,
  type TargetCallback,
  type ValueCallback,
} from './HumanPlayer';

export {
  AIPlayer,
  createAIPlayer,
  createEasyAI,
  createMediumAI,
  createHardAI,
  createCustomAIPlayer,
  createAIFromPreset,
  getDefaultConfig,
  createCustomConfig,
  getAvailableDifficulties,
  getAvailablePlayStyles,
  getDifficultyDescription,
  getPlayStyleDescription,
  validateConfig,
  getConfigSummary,
  getAvailablePresets,
  getPresetDescription,
  AI_PRESETS,
  DEFAULT_AI_CONFIGS,
  STRATEGY_WEIGHTS,
  DEFAULT_STRATEGY_PROFILES,
  type AIPlayerConfig,
  type DifficultyLevel,
  type PlayStyle,
} from './AIPlayerFactory';

export {
  type EvaluationWeights,
  type EvaluationFactors,
  type StrategyProfile,
  type DecisionContext,
  type ScoredOption,
  AIEventType,
  type AIActionSelectedData,
} from './types';
