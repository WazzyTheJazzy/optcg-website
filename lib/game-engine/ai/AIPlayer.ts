/**
 * AIPlayer.ts
 * 
 * AI Player controller that implements the Player interface.
 * Coordinates AI decision-making by delegating to AIDecisionSystem
 * and adding realistic thinking delays and randomness.
 */

import {
  Player,
  PlayerId,
  PlayerType,
  GameAction,
  GameState,
  CardInstance,
  CounterAction,
  Target,
  EffectInstance,
} from '../core/types';
import {
  AIPlayerConfig,
  DecisionContext,
  DEFAULT_AI_CONFIGS,
  DifficultyLevel,
  PlayStyle,
} from './types';
import { AIDecisionSystem } from './AIDecisionSystem';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import {
  AITimeoutError,
  AIInvalidActionError,
  logAIError,
} from './errors';
import {
  EventEmitter,
  GameEventType,
  AIThinkingStartEvent,
  AIThinkingEndEvent,
  AIActionSelectedEvent,
} from '../rendering/EventEmitter';

// ============================================================================
// AIPlayer Implementation
// ============================================================================

/**
 * AI Player implementation that makes automated decisions
 */
export class AIPlayer implements Player {
  readonly id: PlayerId;
  readonly type = PlayerType.AI;
  
  private config: AIPlayerConfig;
  private decisionSystem: AIDecisionSystem;
  private eventEmitter: EventEmitter | null;
  
  /**
   * Create a new AI player
   * @param id - The player ID
   * @param config - AI configuration (difficulty, play style, etc.)
   * @param eventEmitter - Optional event emitter for AI action events
   */
  constructor(id: PlayerId, config: AIPlayerConfig, eventEmitter?: EventEmitter) {
    this.id = id;
    this.config = config;
    this.eventEmitter = eventEmitter || null;
    
    // Initialize AI decision system
    const strategy = new StrategyManager();
    strategy.setStrategy(config.playStyle, config.difficulty);
    
    const evaluator = new ActionEvaluator(strategy.getWeights());
    this.decisionSystem = new AIDecisionSystem(evaluator, strategy);
  }
  
  /**
   * Choose an action from legal actions
   * Simulates thinking time and applies randomness based on difficulty
   */
  async chooseAction(
    legalActions: GameAction[],
    state: GameState
  ): Promise<GameAction> {
    // Validate input
    if (!legalActions || legalActions.length === 0) {
      const error = new AIInvalidActionError(
        'No legal actions provided',
        undefined,
        legalActions,
        { state, playerId: this.id, config: this.config }
      );
      logAIError(error, { method: 'chooseAction' });
      throw error;
    }

    // Create decision context
    const context: DecisionContext = {
      state,
      playerId: this.id,
      config: this.config,
    };

    // Emit thinking start event
    const thinkingStartTime = Date.now();
    this.emitThinkingStart('chooseAction', legalActions.length);

    try {
      // Simulate thinking
      await this.simulateThinking(legalActions.length);

      // Create timeout promise
      const timeoutMs = this.config.thinkingTime.max + 5000; // Extra buffer
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AITimeoutError(
            `Decision exceeded ${timeoutMs}ms timeout`,
            timeoutMs,
            context
          ));
        }, timeoutMs);
      });

      // Race between decision and timeout
      const decisionPromise = Promise.resolve(
        this.decisionSystem.selectAction(legalActions, context)
      );

      const action = await Promise.race([decisionPromise, timeoutPromise]);

      // Validate selected action is in legal actions
      if (!legalActions.includes(action)) {
        throw new AIInvalidActionError(
          'Selected action not in legal actions list',
          action,
          legalActions,
          context
        );
      }

      // Emit thinking end and action selected events
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseAction', thinkingTimeMs);
      this.emitActionSelected('chooseAction', action, undefined, legalActions);

      return action;
    } catch (error) {
      // Log the error with full context
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { 
          method: 'chooseAction',
          legalActionsCount: legalActions.length,
          playerId: this.id,
        }
      );

      // Emit thinking end even on error
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseAction', thinkingTimeMs);

      // Fallback strategy: select random legal action
      // This ensures the game can continue even if AI fails
      const fallbackIndex = Math.floor(Math.random() * legalActions.length);
      const fallbackAction = legalActions[fallbackIndex];

      console.warn(
        `[AI Fallback] Using random action due to error. ` +
        `Player: ${this.id}, Actions: ${legalActions.length}, ` +
        `Selected: ${fallbackIndex}`
      );

      // Emit action selected for fallback
      this.emitActionSelected('chooseAction', fallbackAction, undefined, legalActions);

      return fallbackAction;
    }
  }
  
  /**
   * Decide whether to mulligan the opening hand
   * Simulates thinking time and applies randomness
   */
  async chooseMulligan(
    hand: CardInstance[],
    state: GameState
  ): Promise<boolean> {
    // Create decision context
    const context: DecisionContext = {
      state,
      playerId: this.id,
      config: this.config,
    };

    // Emit thinking start event
    const thinkingStartTime = Date.now();
    this.emitThinkingStart('chooseMulligan', 2); // Keep or mulligan

    try {
      // Simulate thinking (mulligan is a quick decision)
      await this.simulateThinking(3);

      // Timeout for mulligan decision (shorter than action selection)
      const timeoutMs = 3000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AITimeoutError(
            `Mulligan decision exceeded ${timeoutMs}ms timeout`,
            timeoutMs,
            context
          ));
        }, timeoutMs);
      });

      const decisionPromise = Promise.resolve(
        this.decisionSystem.evaluateMulligan(hand, context)
      );

      const shouldMulligan = await Promise.race([decisionPromise, timeoutPromise]);

      // Emit thinking end and action selected events
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseMulligan', thinkingTimeMs);
      this.emitActionSelected('chooseMulligan', shouldMulligan, undefined, [true, false]);

      return shouldMulligan;
    } catch (error) {
      // Log the error
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { 
          method: 'chooseMulligan',
          handSize: hand.length,
          playerId: this.id,
        }
      );

      // Emit thinking end even on error
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseMulligan', thinkingTimeMs);

      // Fallback: keep the hand (safer default)
      console.warn(
        `[AI Fallback] Keeping hand due to error. ` +
        `Player: ${this.id}, Hand size: ${hand.length}`
      );

      // Emit action selected for fallback
      this.emitActionSelected('chooseMulligan', false, undefined, [true, false]);

      return false;
    }
  }
  
  /**
   * Choose a blocker from available blockers
   * Simulates thinking time and applies randomness
   */
  async chooseBlocker(
    legalBlockers: CardInstance[],
    attacker: CardInstance,
    state: GameState
  ): Promise<CardInstance | null> {
    // Create decision context
    const context: DecisionContext = {
      state,
      playerId: this.id,
      config: this.config,
    };

    // Emit thinking start event
    const thinkingStartTime = Date.now();
    this.emitThinkingStart('chooseBlocker', legalBlockers.length + 1); // +1 for "no block"

    try {
      // Simulate thinking
      await this.simulateThinking(legalBlockers.length + 1); // +1 for "no block" option

      // Timeout for blocker decision
      const timeoutMs = 4000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AITimeoutError(
            `Blocker decision exceeded ${timeoutMs}ms timeout`,
            timeoutMs,
            context
          ));
        }, timeoutMs);
      });

      const decisionPromise = Promise.resolve(
        this.decisionSystem.selectBlocker(legalBlockers, attacker, context)
      );

      const blocker = await Promise.race([decisionPromise, timeoutPromise]);

      // Validate blocker is in legal blockers (if not null)
      if (blocker !== null && !legalBlockers.includes(blocker)) {
        throw new AIInvalidActionError(
          'Selected blocker not in legal blockers list',
          blocker,
          legalBlockers,
          context
        );
      }

      // Emit thinking end and action selected events
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseBlocker', thinkingTimeMs);
      this.emitActionSelected('chooseBlocker', blocker, undefined, [...legalBlockers, null]);

      return blocker;
    } catch (error) {
      // Log the error
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { 
          method: 'chooseBlocker',
          legalBlockersCount: legalBlockers.length,
          attackerId: attacker.id,
          playerId: this.id,
        }
      );

      // Emit thinking end even on error
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseBlocker', thinkingTimeMs);

      // Fallback: don't block (safer default to avoid invalid state)
      console.warn(
        `[AI Fallback] Not blocking due to error. ` +
        `Player: ${this.id}, Blockers available: ${legalBlockers.length}`
      );

      // Emit action selected for fallback
      this.emitActionSelected('chooseBlocker', null, undefined, [...legalBlockers, null]);

      return null;
    }
  }
  
  /**
   * Choose a counter action during the counter step
   * Simulates thinking time and applies randomness
   */
  async chooseCounterAction(
    options: CounterAction[],
    state: GameState
  ): Promise<CounterAction | null> {
    // Create decision context
    const context: DecisionContext = {
      state,
      playerId: this.id,
      config: this.config,
    };

    // Emit thinking start event
    const thinkingStartTime = Date.now();
    this.emitThinkingStart('chooseCounterAction', options.length);

    try {
      // Simulate thinking
      await this.simulateThinking(options.length);

      // Timeout for counter decision
      const timeoutMs = 4000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AITimeoutError(
            `Counter decision exceeded ${timeoutMs}ms timeout`,
            timeoutMs,
            context
          ));
        }, timeoutMs);
      });

      const decisionPromise = Promise.resolve(
        this.decisionSystem.selectCounterAction(options, context)
      );

      const counterAction = await Promise.race([decisionPromise, timeoutPromise]);

      // Validate counter action is in options (if not null)
      if (counterAction !== null && !options.includes(counterAction)) {
        throw new AIInvalidActionError(
          'Selected counter action not in options list',
          counterAction,
          options,
          context
        );
      }

      // Emit thinking end and action selected events
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseCounterAction', thinkingTimeMs);
      this.emitActionSelected('chooseCounterAction', counterAction, undefined, options);

      return counterAction;
    } catch (error) {
      // Log the error
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { 
          method: 'chooseCounterAction',
          optionsCount: options.length,
          playerId: this.id,
        }
      );

      // Emit thinking end even on error
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseCounterAction', thinkingTimeMs);

      // Fallback: don't counter (safer default)
      console.warn(
        `[AI Fallback] Not countering due to error. ` +
        `Player: ${this.id}, Options: ${options.length}`
      );

      // Emit action selected for fallback
      this.emitActionSelected('chooseCounterAction', null, undefined, options);

      return null;
    }
  }
  
  /**
   * Choose a target for an effect
   * Simulates thinking time and applies randomness
   */
  async chooseTarget(
    legalTargets: Target[],
    effect: EffectInstance,
    state: GameState
  ): Promise<Target> {
    // Validate input
    if (!legalTargets || legalTargets.length === 0) {
      const error = new AIInvalidActionError(
        'No legal targets provided',
        undefined,
        legalTargets,
        { state, playerId: this.id, config: this.config }
      );
      logAIError(error, { 
        method: 'chooseTarget', 
        effectSource: effect.source.id 
      });
      throw error;
    }

    // Create decision context
    const context: DecisionContext = {
      state,
      playerId: this.id,
      config: this.config,
    };

    // Emit thinking start event
    const thinkingStartTime = Date.now();
    this.emitThinkingStart('chooseTarget', legalTargets.length);

    try {
      // Simulate thinking
      await this.simulateThinking(legalTargets.length);

      // Timeout for target selection
      const timeoutMs = 3000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AITimeoutError(
            `Target selection exceeded ${timeoutMs}ms timeout`,
            timeoutMs,
            context
          ));
        }, timeoutMs);
      });

      const decisionPromise = Promise.resolve(
        this.decisionSystem.selectTarget(legalTargets, effect, context)
      );

      const target = await Promise.race([decisionPromise, timeoutPromise]);

      // Validate target is in legal targets
      if (!legalTargets.includes(target)) {
        throw new AIInvalidActionError(
          'Selected target not in legal targets list',
          target,
          legalTargets,
          context
        );
      }

      // Emit thinking end and action selected events
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseTarget', thinkingTimeMs);
      this.emitActionSelected('chooseTarget', target, undefined, legalTargets);

      return target;
    } catch (error) {
      // Log the error
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { 
          method: 'chooseTarget',
          legalTargetsCount: legalTargets.length,
          effectSource: effect.source.id,
          playerId: this.id,
        }
      );

      // Emit thinking end even on error
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseTarget', thinkingTimeMs);

      // Fallback: select first legal target
      console.warn(
        `[AI Fallback] Using first target due to error. ` +
        `Player: ${this.id}, Targets: ${legalTargets.length}`
      );

      // Emit action selected for fallback
      this.emitActionSelected('chooseTarget', legalTargets[0], undefined, legalTargets);

      return legalTargets[0];
    }
  }
  
  /**
   * Choose a numeric value for an effect
   * Simulates thinking time and applies randomness
   */
  async chooseValue(
    options: number[],
    effect: EffectInstance,
    state: GameState
  ): Promise<number> {
    // Validate input
    if (!options || options.length === 0) {
      const error = new AIInvalidActionError(
        'No value options provided',
        undefined,
        options,
        { state, playerId: this.id, config: this.config }
      );
      logAIError(error, { 
        method: 'chooseValue', 
        effectSource: effect.source.id 
      });
      throw error;
    }

    // Create decision context
    const context: DecisionContext = {
      state,
      playerId: this.id,
      config: this.config,
    };

    // Emit thinking start event
    const thinkingStartTime = Date.now();
    this.emitThinkingStart('chooseValue', options.length);

    try {
      // Simulate thinking
      await this.simulateThinking(options.length);

      // Timeout for value selection
      const timeoutMs = 2000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AITimeoutError(
            `Value selection exceeded ${timeoutMs}ms timeout`,
            timeoutMs,
            context
          ));
        }, timeoutMs);
      });

      const decisionPromise = Promise.resolve(
        this.decisionSystem.selectValue(options, effect, context)
      );

      const value = await Promise.race([decisionPromise, timeoutPromise]);

      // Validate value is in options
      if (!options.includes(value)) {
        throw new AIInvalidActionError(
          'Selected value not in options list',
          value,
          options,
          context
        );
      }

      // Emit thinking end and action selected events
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseValue', thinkingTimeMs);
      this.emitActionSelected('chooseValue', value, undefined, options);

      return value;
    } catch (error) {
      // Log the error
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { 
          method: 'chooseValue',
          optionsCount: options.length,
          effectSource: effect.source.id,
          playerId: this.id,
        }
      );

      // Emit thinking end even on error
      const thinkingTimeMs = Date.now() - thinkingStartTime;
      this.emitThinkingEnd('chooseValue', thinkingTimeMs);

      // Fallback: select first option
      console.warn(
        `[AI Fallback] Using first value due to error. ` +
        `Player: ${this.id}, Options: ${options.length}`
      );

      // Emit action selected for fallback
      this.emitActionSelected('chooseValue', options[0], undefined, options);

      return options[0];
    }
  }
  
  /**
   * Simulate thinking time to make AI decisions feel realistic
   * Adds a delay based on decision complexity and configuration
   * 
   * @param complexity - Number of options being considered (affects delay)
   */
  private async simulateThinking(complexity: number): Promise<void> {
    // Skip thinking delays in test environment for faster test execution
    // This allows AI vs AI games to complete quickly in tests while
    // preserving realistic behavior in production
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return;
    }
    
    const { min, max } = this.config.thinkingTime;
    
    // Calculate delay based on complexity
    // More options = longer thinking time (up to max)
    const complexityFactor = Math.min(complexity / 10, 1.0);
    const baseDelay = min + (max - min) * complexityFactor;
    
    // Add small random variation (±20%)
    const variation = baseDelay * 0.2;
    const delay = baseDelay + (Math.random() * variation * 2 - variation);
    
    // Ensure delay is within configured bounds
    const finalDelay = Math.max(min, Math.min(max, delay));
    
    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, finalDelay));
  }
  
  /**
   * Apply randomness to introduce decision variation based on difficulty
   * This method is used internally by the decision system
   * 
   * @param options - Array of options to choose from
   * @param scores - Corresponding scores for each option
   * @returns The selected option with randomness applied
   */
  private applyRandomness<T>(options: T[], scores: number[]): T {
    if (options.length === 0) {
      throw new Error('No options to select from');
    }
    
    if (options.length === 1) {
      return options[0];
    }
    
    // For hard difficulty with low randomness, always pick the best
    if (this.config.difficulty === 'hard' && this.config.randomness <= 0.1) {
      const maxScore = Math.max(...scores);
      const bestIndex = scores.indexOf(maxScore);
      return options[bestIndex];
    }
    
    // Calculate selection probabilities based on scores and randomness
    const probabilities = this.calculateSelectionProbabilities(scores);
    
    // Select based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < options.length; i++) {
      cumulativeProbability += probabilities[i];
      if (random <= cumulativeProbability) {
        return options[i];
      }
    }
    
    // Fallback to best option
    const maxScore = Math.max(...scores);
    const bestIndex = scores.indexOf(maxScore);
    return options[bestIndex];
  }
  
  /**
   * Calculate selection probabilities for options based on their scores
   * Higher-scored options get higher probabilities
   * 
   * @param scores - Array of scores for each option
   * @returns Array of probabilities (sum to 1.0)
   */
  private calculateSelectionProbabilities(scores: number[]): number[] {
    const n = scores.length;
    
    // Sort indices by score (descending)
    const indices = scores.map((_, i) => i);
    indices.sort((a, b) => scores[b] - scores[a]);
    
    // Base probabilities using exponential decay
    // Higher randomness = flatter distribution
    const decay = 1.0 - this.config.randomness * 0.7; // 0.3 to 1.0
    const probabilities = new Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      const originalIndex = indices[i];
      probabilities[originalIndex] = Math.pow(decay, i);
    }
    
    // Normalize to sum to 1.0
    const sum = probabilities.reduce((a, b) => a + b, 0);
    return probabilities.map(p => p / sum);
  }

  /**
   * Emit AI_THINKING_START event
   * @param decisionType - Type of decision being made
   * @param optionsCount - Number of options being considered
   */
  private emitThinkingStart(decisionType: string, optionsCount: number): void {
    if (!this.eventEmitter) return;

    const event: AIThinkingStartEvent = {
      type: GameEventType.AI_THINKING_START,
      timestamp: Date.now(),
      playerId: this.id,
      decisionType,
      optionsCount,
    };

    this.eventEmitter.emit(event);
  }

  /**
   * Emit AI_THINKING_END event
   * @param decisionType - Type of decision that was made
   * @param thinkingTimeMs - Time spent thinking in milliseconds
   */
  private emitThinkingEnd(decisionType: string, thinkingTimeMs: number): void {
    if (!this.eventEmitter) return;

    const event: AIThinkingEndEvent = {
      type: GameEventType.AI_THINKING_END,
      timestamp: Date.now(),
      playerId: this.id,
      decisionType,
      thinkingTimeMs,
    };

    this.eventEmitter.emit(event);
  }

  /**
   * Emit AI_ACTION_SELECTED event
   * @param decisionType - Type of decision that was made
   * @param selectedOption - The option that was selected
   * @param evaluationScore - Optional evaluation score for the selected option
   * @param allOptions - Optional array of all options that were considered
   */
  private emitActionSelected(
    decisionType: string,
    selectedOption: any,
    evaluationScore?: number,
    allOptions?: any[]
  ): void {
    if (!this.eventEmitter) return;

    const event: AIActionSelectedEvent = {
      type: GameEventType.AI_ACTION_SELECTED,
      timestamp: Date.now(),
      playerId: this.id,
      decisionType,
      selectedOption,
      evaluationScore,
      allOptions,
    };

    this.eventEmitter.emit(event);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an AI player with default configuration for a difficulty level
 * @param id - The player ID
 * @param difficulty - Difficulty level (easy, medium, hard)
 * @param playStyle - Optional play style (defaults to balanced)
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance
 */
export function createAIPlayer(
  id: PlayerId,
  difficulty: DifficultyLevel = 'medium',
  playStyle?: PlayStyle,
  eventEmitter?: EventEmitter
): AIPlayer {
  const config = { ...DEFAULT_AI_CONFIGS[difficulty] };
  
  if (playStyle) {
    config.playStyle = playStyle;
  }
  
  return new AIPlayer(id, config, eventEmitter);
}

/**
 * Create an AI player with custom configuration
 * @param id - The player ID
 * @param config - Custom AI configuration
 * @param eventEmitter - Optional event emitter for AI action events
 * @returns A new AIPlayer instance
 */
export function createCustomAIPlayer(
  id: PlayerId,
  config: AIPlayerConfig,
  eventEmitter?: EventEmitter
): AIPlayer {
  return new AIPlayer(id, config, eventEmitter);
}
