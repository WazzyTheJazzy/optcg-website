/**
 * AIDebugger - Debugging and logging utilities for AI system
 * 
 * This module provides comprehensive debugging capabilities including:
 * - Decision logging with evaluation scores
 * - Deterministic mode with fixed random seeds
 * - Metrics tracking (decision times, evaluation scores, action counts)
 * - Debug mode logging with detailed context
 */

import {
  GameState,
  PlayerId,
  GameAction,
  CardInstance,
  EffectInstance,
  Target,
  CounterAction,
} from '../core/types';
import {
  DecisionContext,
  EvaluationFactors,
  ScoredOption,
  AIPlayerConfig,
} from './types';

// ============================================================================
// Debug Configuration
// ============================================================================

/**
 * Configuration for AI debugging
 */
export interface AIDebugConfig {
  /** Enable debug logging */
  enabled: boolean;
  
  /** Enable deterministic mode with fixed random seed */
  deterministic: boolean;
  
  /** Random seed for deterministic mode */
  randomSeed?: number;
  
  /** Enable metrics tracking */
  trackMetrics: boolean;
  
  /** Log level for debug output */
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  
  /** Enable detailed evaluation logging */
  logEvaluations: boolean;
  
  /** Enable decision tree logging */
  logDecisionTree: boolean;
}

/**
 * Default debug configuration
 */
export const DEFAULT_DEBUG_CONFIG: AIDebugConfig = {
  enabled: false,
  deterministic: false,
  trackMetrics: true,
  logLevel: 'info',
  logEvaluations: false,
  logDecisionTree: false,
};

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Metrics for a single decision
 */
export interface DecisionMetrics {
  /** Type of decision */
  decisionType: string;
  
  /** Time taken to make decision (ms) */
  decisionTimeMs: number;
  
  /** Number of options evaluated */
  optionsCount: number;
  
  /** Score of selected option */
  selectedScore: number;
  
  /** Average score of all options */
  averageScore: number;
  
  /** Timestamp when decision was made */
  timestamp: number;
  
  /** Game turn number */
  turn: number;
  
  /** Player ID */
  playerId: PlayerId;
}

/**
 * Aggregated metrics for AI performance
 */
export interface AIMetrics {
  /** Total number of decisions made */
  totalDecisions: number;
  
  /** Decisions by type */
  decisionsByType: Map<string, number>;
  
  /** Average decision time by type (ms) */
  averageDecisionTime: Map<string, number>;
  
  /** Average evaluation score by type */
  averageEvaluationScore: Map<string, number>;
  
  /** Total thinking time (ms) */
  totalThinkingTime: number;
  
  /** Individual decision records */
  decisions: DecisionMetrics[];
  
  /** Start time of metrics tracking */
  startTime: number;
  
  /** End time of metrics tracking */
  endTime?: number;
}

/**
 * Evaluation log entry
 */
export interface EvaluationLog {
  /** Type of evaluation */
  evaluationType: string;
  
  /** Option being evaluated */
  option: any;
  
  /** Evaluation score */
  score: number;
  
  /** Evaluation factors breakdown */
  factors?: EvaluationFactors;
  
  /** Timestamp */
  timestamp: number;
  
  /** Additional context */
  context?: any;
}

// ============================================================================
// AIDebugger Class
// ============================================================================

/**
 * AI Debugger for logging and metrics tracking
 */
export class AIDebugger {
  private config: AIDebugConfig;
  private metrics: AIMetrics;
  private evaluationLogs: EvaluationLog[];
  private randomGenerator: SeededRandom | null;
  
  /**
   * Create a new AIDebugger
   * @param config - Debug configuration
   */
  constructor(config: Partial<AIDebugConfig> = {}) {
    this.config = { ...DEFAULT_DEBUG_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.evaluationLogs = [];
    this.randomGenerator = null;
    
    // Initialize deterministic mode if enabled
    if (this.config.deterministic) {
      const seed = this.config.randomSeed || Date.now();
      this.randomGenerator = new SeededRandom(seed);
      this.log('info', `Deterministic mode enabled with seed: ${seed}`);
    }
  }
  
  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): AIMetrics {
    return {
      totalDecisions: 0,
      decisionsByType: new Map(),
      averageDecisionTime: new Map(),
      averageEvaluationScore: new Map(),
      totalThinkingTime: 0,
      decisions: [],
      startTime: Date.now(),
    };
  }
  
  /**
   * Log a decision with metrics
   * @param decisionType - Type of decision
   * @param context - Decision context
   * @param options - Options that were evaluated
   * @param selected - Selected option
   * @param selectedScore - Score of selected option
   * @param decisionTimeMs - Time taken to make decision
   */
  logDecision<T>(
    decisionType: string,
    context: DecisionContext,
    options: T[],
    selected: T,
    selectedScore: number,
    decisionTimeMs: number
  ): void {
    if (!this.config.enabled && !this.config.trackMetrics) {
      return;
    }
    
    // Calculate average score
    const averageScore = selectedScore; // Simplified - would need all scores for true average
    
    // Create decision metrics
    const decisionMetrics: DecisionMetrics = {
      decisionType,
      decisionTimeMs,
      optionsCount: options.length,
      selectedScore,
      averageScore,
      timestamp: Date.now(),
      turn: context.state.turnNumber,
      playerId: context.playerId,
    };
    
    // Track metrics
    if (this.config.trackMetrics) {
      this.trackDecisionMetrics(decisionMetrics);
    }
    
    // Log decision
    if (this.config.enabled) {
      this.log('info', 
        `[AI Decision] ${decisionType} | ` +
        `Player: ${context.playerId} | ` +
        `Turn: ${context.state.turnNumber} | ` +
        `Options: ${options.length} | ` +
        `Score: ${selectedScore.toFixed(2)} | ` +
        `Time: ${decisionTimeMs}ms`
      );
      
      if (this.config.logDecisionTree && this.config.logLevel === 'verbose') {
        this.log('verbose', `  Selected: ${JSON.stringify(selected, null, 2)}`);
      }
    }
  }
  
  /**
   * Log an evaluation with score and factors
   * @param evaluationType - Type of evaluation
   * @param option - Option being evaluated
   * @param score - Evaluation score
   * @param factors - Optional evaluation factors breakdown
   * @param context - Optional additional context
   */
  logEvaluation(
    evaluationType: string,
    option: any,
    score: number,
    factors?: EvaluationFactors,
    context?: any
  ): void {
    if (!this.config.enabled || !this.config.logEvaluations) {
      return;
    }
    
    // Create evaluation log entry
    const logEntry: EvaluationLog = {
      evaluationType,
      option,
      score,
      factors,
      timestamp: Date.now(),
      context,
    };
    
    // Store evaluation log
    this.evaluationLogs.push(logEntry);
    
    // Log evaluation
    if (this.config.logLevel === 'debug' || this.config.logLevel === 'verbose') {
      this.log('debug',
        `[AI Evaluation] ${evaluationType} | ` +
        `Score: ${score.toFixed(2)}`
      );
      
      if (factors && this.config.logLevel === 'verbose') {
        this.log('verbose', `  Factors: ${JSON.stringify(factors, null, 2)}`);
      }
    }
  }
  
  /**
   * Log action selection with all scored options
   * @param decisionType - Type of decision
   * @param scoredOptions - All options with their scores
   * @param selected - Selected option
   */
  logActionSelection<T>(
    decisionType: string,
    scoredOptions: ScoredOption<T>[],
    selected: ScoredOption<T>
  ): void {
    if (!this.config.enabled || !this.config.logDecisionTree) {
      return;
    }
    
    this.log('debug', `[AI Action Selection] ${decisionType}`);
    
    if (this.config.logLevel === 'verbose') {
      // Log all options with scores
      scoredOptions.forEach((option, index) => {
        const isSelected = option === selected;
        const marker = isSelected ? '→' : ' ';
        this.log('verbose',
          `  ${marker} [${index + 1}] Score: ${option.score.toFixed(2)} | ` +
          `Option: ${this.formatOption(option.option)}`
        );
        
        if (option.factors) {
          this.log('verbose', `      Factors: ${this.formatFactors(option.factors)}`);
        }
      });
    }
  }
  
  /**
   * Log an error with context
   * @param error - Error that occurred
   * @param context - Error context
   */
  logError(error: Error, context?: any): void {
    if (!this.config.enabled) {
      return;
    }
    
    this.log('error',
      `[AI Error] ${error.message}`
    );
    
    if (context && (this.config.logLevel === 'debug' || this.config.logLevel === 'verbose')) {
      this.log('debug', `  Context: ${JSON.stringify(context, null, 2)}`);
    }
    
    if (this.config.logLevel === 'verbose') {
      this.log('verbose', `  Stack: ${error.stack}`);
    }
  }
  
  /**
   * Log game state snapshot
   * @param state - Game state
   * @param playerId - Player ID
   * @param label - Optional label for the snapshot
   */
  logGameState(state: GameState, playerId: PlayerId, label?: string): void {
    if (!this.config.enabled || this.config.logLevel !== 'verbose') {
      return;
    }
    
    const player = state.players.get(playerId);
    if (!player) return;
    
    const opponent = state.players.get(
      playerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1
    );
    
    this.log('verbose', `[Game State${label ? ` - ${label}` : ''}]`);
    this.log('verbose', `  Turn: ${state.turnNumber} | Phase: ${state.phase}`);
    this.log('verbose', `  Player ${playerId}:`);
    this.log('verbose', `    Life: ${player.zones.life.length}`);
    this.log('verbose', `    Hand: ${player.zones.hand.length}`);
    this.log('verbose', `    Characters: ${player.zones.characterArea.length}`);
    this.log('verbose', `    DON: ${player.zones.costArea.length}`);
    
    if (opponent) {
      this.log('verbose', `  Opponent:`);
      this.log('verbose', `    Life: ${opponent.zones.life.length}`);
      this.log('verbose', `    Hand: ${opponent.zones.hand.length}`);
      this.log('verbose', `    Characters: ${opponent.zones.characterArea.length}`);
      this.log('verbose', `    DON: ${opponent.zones.costArea.length}`);
    }
  }
  
  /**
   * Get random number in deterministic mode
   * @returns Random number between 0 and 1
   */
  getRandom(): number {
    if (this.randomGenerator) {
      return this.randomGenerator.next();
    }
    return Math.random();
  }
  
  /**
   * Get current metrics
   * @returns Current AI metrics
   */
  getMetrics(): AIMetrics {
    return {
      ...this.metrics,
      endTime: Date.now(),
    };
  }
  
  /**
   * Get evaluation logs
   * @returns Array of evaluation logs
   */
  getEvaluationLogs(): EvaluationLog[] {
    return [...this.evaluationLogs];
  }
  
  /**
   * Reset metrics and logs
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.evaluationLogs = [];
    
    if (this.config.enabled) {
      this.log('info', '[AI Debugger] Metrics and logs reset');
    }
  }
  
  /**
   * Export metrics as JSON
   * @returns JSON string of metrics
   */
  exportMetrics(): string {
    const metrics = this.getMetrics();
    
    // Convert Maps to objects for JSON serialization
    const exportData = {
      ...metrics,
      decisionsByType: Object.fromEntries(metrics.decisionsByType),
      averageDecisionTime: Object.fromEntries(metrics.averageDecisionTime),
      averageEvaluationScore: Object.fromEntries(metrics.averageEvaluationScore),
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Export evaluation logs as JSON
   * @returns JSON string of evaluation logs
   */
  exportEvaluationLogs(): string {
    return JSON.stringify(this.evaluationLogs, null, 2);
  }
  
  /**
   * Print metrics summary to console
   */
  printMetricsSummary(): void {
    const metrics = this.getMetrics();
    const duration = (metrics.endTime || Date.now()) - metrics.startTime;
    
    console.log('\n=== AI Metrics Summary ===');
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Total Decisions: ${metrics.totalDecisions}`);
    console.log(`Total Thinking Time: ${metrics.totalThinkingTime}ms`);
    console.log(`Average Decision Time: ${(metrics.totalThinkingTime / metrics.totalDecisions).toFixed(2)}ms`);
    
    console.log('\nDecisions by Type:');
    metrics.decisionsByType.forEach((count, type) => {
      const avgTime = metrics.averageDecisionTime.get(type) || 0;
      const avgScore = metrics.averageEvaluationScore.get(type) || 0;
      console.log(`  ${type}: ${count} decisions, avg ${avgTime.toFixed(2)}ms, avg score ${avgScore.toFixed(2)}`);
    });
    
    console.log('========================\n');
  }
  
  /**
   * Track decision metrics
   * @param decisionMetrics - Metrics for a decision
   */
  private trackDecisionMetrics(decisionMetrics: DecisionMetrics): void {
    // Update total decisions
    this.metrics.totalDecisions++;
    
    // Update decisions by type
    const typeCount = this.metrics.decisionsByType.get(decisionMetrics.decisionType) || 0;
    this.metrics.decisionsByType.set(decisionMetrics.decisionType, typeCount + 1);
    
    // Update average decision time
    const currentAvgTime = this.metrics.averageDecisionTime.get(decisionMetrics.decisionType) || 0;
    const newAvgTime = (currentAvgTime * typeCount + decisionMetrics.decisionTimeMs) / (typeCount + 1);
    this.metrics.averageDecisionTime.set(decisionMetrics.decisionType, newAvgTime);
    
    // Update average evaluation score
    const currentAvgScore = this.metrics.averageEvaluationScore.get(decisionMetrics.decisionType) || 0;
    const newAvgScore = (currentAvgScore * typeCount + decisionMetrics.selectedScore) / (typeCount + 1);
    this.metrics.averageEvaluationScore.set(decisionMetrics.decisionType, newAvgScore);
    
    // Update total thinking time
    this.metrics.totalThinkingTime += decisionMetrics.decisionTimeMs;
    
    // Store decision record
    this.metrics.decisions.push(decisionMetrics);
  }
  
  /**
   * Log a message at the specified level
   * @param level - Log level
   * @param message - Message to log
   */
  private log(level: string, message: string): void {
    if (!this.config.enabled) {
      return;
    }
    
    // Check if this level should be logged
    const levels = ['none', 'error', 'warn', 'info', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex > currentLevelIndex) {
      return;
    }
    
    // Format timestamp
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    
    // Log to console
    const prefix = `[${timestamp}] [AI]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'debug':
      case 'verbose':
        console.debug(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
  
  /**
   * Format an option for logging
   * @param option - Option to format
   * @returns Formatted string
   */
  private formatOption(option: any): string {
    if (typeof option === 'object' && option !== null) {
      if ('type' in option) {
        return `${option.type}`;
      }
      if ('id' in option) {
        return `ID: ${option.id}`;
      }
      return JSON.stringify(option).substring(0, 50);
    }
    return String(option);
  }
  
  /**
   * Format evaluation factors for logging
   * @param factors - Evaluation factors
   * @returns Formatted string
   */
  private formatFactors(factors: EvaluationFactors): string {
    return `BC:${factors.boardControl.toFixed(1)} ` +
           `RE:${factors.resourceEfficiency.toFixed(1)} ` +
           `LD:${factors.lifeDifferential.toFixed(1)} ` +
           `CA:${factors.cardAdvantage.toFixed(1)} ` +
           `T:${factors.tempo.toFixed(1)}`;
  }
}

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

/**
 * Seeded random number generator for deterministic mode
 * Uses a simple Linear Congruential Generator (LCG)
 */
class SeededRandom {
  private seed: number;
  
  /**
   * Create a new seeded random generator
   * @param seed - Initial seed value
   */
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) {
      this.seed += 2147483646;
    }
  }
  
  /**
   * Generate next random number
   * @returns Random number between 0 and 1
   */
  next(): number {
    // LCG parameters (from Numerical Recipes)
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  
  /**
   * Reset seed
   * @param seed - New seed value
   */
  reset(seed: number): void {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) {
      this.seed += 2147483646;
    }
  }
}

// ============================================================================
// Global Debugger Instance
// ============================================================================

/**
 * Global AI debugger instance
 * Can be configured and used across the AI system
 */
let globalDebugger: AIDebugger | null = null;

/**
 * Get the global AI debugger instance
 * Creates one if it doesn't exist
 * @param config - Optional configuration for new debugger
 * @returns Global debugger instance
 */
export function getGlobalDebugger(config?: Partial<AIDebugConfig>): AIDebugger {
  if (!globalDebugger) {
    globalDebugger = new AIDebugger(config);
  }
  return globalDebugger;
}

/**
 * Set the global AI debugger instance
 * @param aiDebugger - Debugger instance to set as global
 */
export function setGlobalDebugger(aiDebugger: AIDebugger): void {
  globalDebugger = aiDebugger;
}

/**
 * Reset the global AI debugger
 */
export function resetGlobalDebugger(): void {
  if (globalDebugger) {
    globalDebugger.reset();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a debugger for testing with deterministic mode
 * @param seed - Random seed
 * @returns Configured debugger
 */
export function createDeterministicDebugger(seed: number): AIDebugger {
  return new AIDebugger({
    enabled: true,
    deterministic: true,
    randomSeed: seed,
    trackMetrics: true,
    logLevel: 'info',
    logEvaluations: false,
    logDecisionTree: false,
  });
}

/**
 * Create a debugger for development with verbose logging
 * @returns Configured debugger
 */
export function createVerboseDebugger(): AIDebugger {
  return new AIDebugger({
    enabled: true,
    deterministic: false,
    trackMetrics: true,
    logLevel: 'verbose',
    logEvaluations: true,
    logDecisionTree: true,
  });
}

/**
 * Create a debugger for production with minimal logging
 * @returns Configured debugger
 */
export function createProductionDebugger(): AIDebugger {
  return new AIDebugger({
    enabled: false,
    deterministic: false,
    trackMetrics: true,
    logLevel: 'error',
    logEvaluations: false,
    logDecisionTree: false,
  });
}
