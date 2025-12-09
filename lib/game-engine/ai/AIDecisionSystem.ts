/**
 * AIDecisionSystem - Core AI decision-making logic
 * 
 * This class coordinates AI decision-making by evaluating options using the
 * ActionEvaluator and applying difficulty-based randomness to select actions.
 */

import {
  GameState,
  PlayerId,
  GameAction,
  CardInstance,
  EffectInstance,
  Target,
  CounterAction,
  CardState,
  ActionType,
  Phase,
  CardCategory,
} from '../core/types';
import {
  DecisionContext,
  ScoredOption,
  EvaluationFunction,
} from './types';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import { AIEvaluationError, logAIError } from './errors';
import { PerformanceOptimizer } from './PerformanceOptimizer';

/**
 * AIDecisionSystem handles all AI decision-making logic
 */
export class AIDecisionSystem {
  private evaluator: ActionEvaluator;
  private strategy: StrategyManager;
  private optimizer: PerformanceOptimizer;

  /**
   * Create a new AIDecisionSystem
   * 
   * @param evaluator - ActionEvaluator for scoring actions
   * @param strategy - StrategyManager for strategy configuration
   * @param optimizer - Optional PerformanceOptimizer for performance enhancements
   */
  constructor(
    evaluator: ActionEvaluator,
    strategy: StrategyManager,
    optimizer?: PerformanceOptimizer
  ) {
    this.evaluator = evaluator;
    this.strategy = strategy;
    this.optimizer = optimizer || new PerformanceOptimizer();
  }

  /**
   * Select the best action from a list of legal actions
   * 
   * @param actions - Array of legal actions to choose from
   * @param context - Decision context with game state and configuration
   * @returns The selected action
   */
  selectAction(actions: GameAction[], context: DecisionContext): GameAction {
    if (actions.length === 0) {
      throw new AIEvaluationError(
        'No actions available to select from',
        'UNKNOWN',
        context
      );
    }

    if (actions.length === 1) {
      return actions[0];
    }

    try {
      // Update strategy based on current game state
      this.strategy.adjustForGameState(context.state, context.playerId);

      // PERFORMANCE OPTIMIZATION: Prune obviously bad actions
      const pruner = this.optimizer.getPruner();
      const prunedActions = pruner.pruneActions(actions, context.state, context.playerId);
      
      // Track pruned actions count
      const prunedCount = actions.length - prunedActions.length;
      for (let i = 0; i < prunedCount; i++) {
        this.optimizer.getCache().incrementPrunedActions();
      }

      // Apply card play priority logic if we have multiple PLAY_CARD actions
      const playCardActions = prunedActions.filter(a => a.type === ActionType.PLAY_CARD);
      if (playCardActions.length > 1) {
        const orderedActions = this.orderCardPlayActions(playCardActions, context);
        // If we have a clear priority order, prefer the first action
        if (orderedActions.length > 0) {
          return orderedActions[0];
        }
      }

      // PERFORMANCE OPTIMIZATION: Use cached evaluations and time-limited evaluation
      const cache = this.optimizer.getCache();
      const timeLimiter = this.optimizer.getTimeLimiter();
      
      // Evaluate each action with caching and time limits
      const evaluateFn = (action: GameAction): number => {
        try {
          // Check cache first
          const cachedScore = cache.get(context.state, action, context.playerId);
          if (cachedScore !== null) {
            return cachedScore;
          }

          // Evaluate and cache the result
          const startTime = Date.now();
          const score = this.evaluator.evaluateAction(action, context.state, context.playerId);
          const evalTime = Date.now() - startTime;
          
          cache.set(context.state, action, context.playerId, score);
          cache.updateEvaluationMetrics(evalTime);
          
          return score;
        } catch (error) {
          // Log evaluation error but continue with neutral score
          logAIError(
            error instanceof Error ? error : new Error(String(error)),
            { actionType: action.type, method: 'evaluateAction' }
          );
          return 0; // Neutral score for failed evaluation
        }
      };

      // Rank actions with time limit
      const rankedActions = timeLimiter.evaluateWithTimeLimit(prunedActions, evaluateFn);
      
      // Sort by score (highest first)
      rankedActions.sort((a, b) => b.score - a.score);

      // Apply difficulty modifier to introduce randomness
      const selectedAction = this.applyDifficultyModifier(
        rankedActions,
        context.config.difficulty,
        context.config.randomness
      );

      return selectedAction.option;
    } catch (error) {
      // If evaluation completely fails, log and return random action
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { method: 'selectAction', actionsCount: actions.length }
      );

      // Fallback to random action
      const randomIndex = Math.floor(Math.random() * actions.length);
      return actions[randomIndex];
    }
  }

  /**
   * Get performance metrics from the optimizer
   */
  getPerformanceMetrics() {
    return this.optimizer.getMetrics();
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    this.optimizer.resetMetrics();
  }

  /**
   * Clear performance caches
   */
  clearPerformanceCaches() {
    this.optimizer.clearCaches();
  }

  /**
   * Order card play actions based on strategic priorities
   * Implements card play priority logic:
   * 1. Prioritize cards with Rush keyword that can attack immediately
   * 2. Prioritize cards with valuable "On Play" effects
   * 3. Play low-cost cards before high-cost cards for flexibility
   * 4. Reserve resources for reactive plays when appropriate
   * 
   * @param playCardActions - Array of PLAY_CARD actions
   * @param context - Decision context
   * @returns Ordered array of actions (highest priority first)
   */
  private orderCardPlayActions(
    playCardActions: GameAction[],
    context: DecisionContext
  ): GameAction[] {
    const player = context.state.players.get(context.playerId);
    if (!player) return playCardActions;

    // Get available DON for resource management
    const availableDon = player.zones.costArea.filter(
      d => d.state === CardState.ACTIVE
    ).length;

    // Score each card play action with priority factors
    const scoredActions = playCardActions.map(action => {
      const cardId = (action as any).cardId;
      const card = player.zones.hand.find(c => c.id === cardId);
      
      if (!card) {
        return { action, priorityScore: 0, baseScore: 0 };
      }

      // Calculate base evaluation score
      const baseScore = this.evaluator.evaluateAction(action, context.state, context.playerId);

      // Calculate priority score based on strategic factors
      let priorityScore = 0;
      const cost = card.definition.baseCost || 0;
      const hasRush = card.definition.keywords.includes('Rush');
      const hasOnPlay = card.definition.effects.some(
        effect => effect.triggerTiming === 'ON_PLAY'
      );
      const hasDoubleAttack = card.definition.keywords.includes('Double Attack');

      // 1. HIGHEST PRIORITY: Rush cards that can attack immediately
      if (hasRush) {
        priorityScore += 100;
        
        // Extra priority if opponent is low on life (can deal lethal)
        const opponent = context.state.players.get(this.getOpponentId(context.playerId));
        if (opponent && opponent.zones.life.length <= 2) {
          priorityScore += 50; // Could win the game
        }
        
        // Extra priority for Rush + Double Attack combo
        if (hasDoubleAttack) {
          priorityScore += 30;
        }
      }

      // 2. HIGH PRIORITY: Cards with valuable "On Play" effects
      if (hasOnPlay) {
        priorityScore += 60;
        
        // Extra priority if hand is small (likely card draw effects)
        if (player.zones.hand.length <= 2) {
          priorityScore += 20;
        }
        
        // Extra priority if effect is likely removal or disruption
        const effectLabels = card.definition.effects
          .map(e => e.label.toLowerCase())
          .join(' ');
        
        if (effectLabels.includes('k.o') || effectLabels.includes('return') || 
            effectLabels.includes('trash')) {
          priorityScore += 25; // Removal effects are valuable
        }
        
        if (effectLabels.includes('draw') || effectLabels.includes('search')) {
          priorityScore += 20; // Card advantage effects
        }
      }

      // 3. MEDIUM PRIORITY: Low-cost cards for flexibility
      // Play low-cost cards first to maintain resource flexibility
      if (cost <= 3) {
        priorityScore += 40;
        
        // Extra priority if we have many cards to play
        if (playCardActions.length >= 3) {
          priorityScore += 15; // Build board efficiently
        }
      } else if (cost <= 5) {
        priorityScore += 20; // Medium-cost cards
      } else if (cost >= 7) {
        // High-cost cards have lower priority unless they're game-winning
        priorityScore -= 10;
        
        // But prioritize if we have excess resources
        if (availableDon - cost >= 3) {
          priorityScore += 15; // Can afford it with resources to spare
        }
      }

      // 4. Resource reservation considerations
      // Penalize plays that leave us with no resources for reactive plays
      const donAfterPlay = availableDon - cost;
      
      if (donAfterPlay === 0) {
        priorityScore -= 30; // Using all resources is risky
      } else if (donAfterPlay === 1) {
        priorityScore -= 15; // Limited resources left
      } else if (donAfterPlay >= 3) {
        priorityScore += 10; // Good to have resources left
      }

      // 5. Timing considerations - prefer proactive plays early
      if (context.state.phase === Phase.MAIN) {
        // Early in turn, prefer setting up board
        if (card.definition.category === CardCategory.CHARACTER) {
          priorityScore += 15;
        }
      }

      // 6. Board space considerations
      const boardSpace = 5 - player.zones.characterArea.length;
      if (card.definition.category === CardCategory.CHARACTER) {
        if (boardSpace === 0) {
          priorityScore = -1000; // Can't play if board is full
        } else if (boardSpace === 1) {
          // Last board slot - only use for high-value characters
          if (hasRush || hasOnPlay || (card.definition.basePower || 0) >= 7000) {
            priorityScore += 5; // Worth using last slot
          } else {
            priorityScore -= 25; // Save space for better cards
          }
        }
      }

      // 7. Combo considerations - play enablers before payoffs
      // If we have multiple cards, prefer playing cards that enable others
      if (playCardActions.length >= 2) {
        // Prefer playing DON-generating or card-drawing effects first
        const effectLabels = card.definition.effects
          .map(e => e.label.toLowerCase())
          .join(' ');
        
        if (effectLabels.includes('don') && !effectLabels.includes('cost')) {
          priorityScore += 25; // DON generation enables more plays
        }
        
        if (effectLabels.includes('draw')) {
          priorityScore += 20; // Card draw gives more options
        }
      }

      // 8. Defensive considerations when low on life
      const playerLife = player.zones.life.length;
      if (playerLife <= 2) {
        // Prioritize blockers and defensive cards
        if (card.definition.keywords.includes('Blocker')) {
          priorityScore += 40;
        }
        
        // Prioritize removal effects
        const effectLabels = card.definition.effects
          .map(e => e.label.toLowerCase())
          .join(' ');
        
        if (effectLabels.includes('k.o') || effectLabels.includes('return')) {
          priorityScore += 35;
        }
      }

      // 9. Aggressive considerations when opponent is low on life
      const opponent = context.state.players.get(this.getOpponentId(context.playerId));
      if (opponent && opponent.zones.life.length <= 3) {
        // Prioritize aggressive cards
        if (hasRush || hasDoubleAttack) {
          priorityScore += 30;
        }
        
        // Prioritize power-boosting effects
        const effectLabels = card.definition.effects
          .map(e => e.label.toLowerCase())
          .join(' ');
        
        if (effectLabels.includes('+') || effectLabels.includes('power')) {
          priorityScore += 25;
        }
      }

      return {
        action,
        priorityScore,
        baseScore,
      };
    });

    // Sort by priority score first, then by base score
    scoredActions.sort((a, b) => {
      if (Math.abs(a.priorityScore - b.priorityScore) > 10) {
        return b.priorityScore - a.priorityScore; // Higher priority first
      }
      return b.baseScore - a.baseScore; // Then by base evaluation score
    });

    // Return ordered actions
    return scoredActions.map(sa => sa.action);
  }

  /**
   * Evaluate whether to mulligan the opening hand
   * 
   * @param hand - The opening hand cards
   * @param context - Decision context
   * @returns True to mulligan, false to keep
   */
  evaluateMulligan(hand: CardInstance[], context: DecisionContext): boolean {
    try {
      let score = 0;

      // 1. Count playable cards in first 3 turns (cost <= 3)
      const playableCards = hand.filter(card => {
        const cost = card.definition.baseCost || 0;
        return cost <= 3 && cost > 0;
      });
      score += playableCards.length * 20;

      // 2. Count mid-cost cards (cost 4-6)
      const midCostCards = hand.filter(card => {
        const cost = card.definition.baseCost || 0;
        return cost >= 4 && cost <= 6;
      });
      score += midCostCards.length * 10;

      // 3. Count high-cost cards (cost 7+)
      const highCostCards = hand.filter(card => {
        const cost = card.definition.baseCost || 0;
        return cost >= 7;
      });
      score += highCostCards.length * 5;

      // 4. Check for curve balance
      const hasCurve = playableCards.length > 0 && 
                       (midCostCards.length > 0 || highCostCards.length > 0);
      if (hasCurve) {
        score += 15;
      }

      // 5. Penalty for no playable cards
      if (playableCards.length === 0) {
        score -= 30;
      }

      // 6. Bonus for cards with valuable keywords
      const keywordBonus = hand.reduce((bonus, card) => {
        if (card.definition.keywords.includes('Rush')) bonus += 10;
        if (card.definition.keywords.includes('Blocker')) bonus += 5;
        if (card.definition.keywords.includes('Double Attack')) bonus += 8;
        return bonus;
      }, 0);
      score += keywordBonus;

      // 7. Check for "On Play" effects
      const onPlayEffects = hand.filter(card =>
        card.definition.effects.some(effect => effect.triggerTiming === 'ON_PLAY')
      );
      score += onPlayEffects.length * 8;

      // Decision threshold: mulligan if score is below 30
      const shouldMulligan = score < 30;

      // Apply difficulty-based randomness
      if (context.config.randomness > 0) {
        const randomFactor = Math.random();
        if (randomFactor < context.config.randomness * 0.3) {
          // Occasionally make suboptimal mulligan decisions
          return !shouldMulligan;
        }
      }

      return shouldMulligan;
    } catch (error) {
      // Log error and fallback to keeping hand
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { method: 'evaluateMulligan', handSize: hand.length }
      );

      // Fallback: keep hand (safer default)
      return false;
    }
  }

  /**
   * Select the best blocker from available blockers
   * 
   * @param blockers - Array of cards that can block
   * @param attacker - The attacking card
   * @param context - Decision context
   * @returns The selected blocker or null to not block
   */
  selectBlocker(
    blockers: CardInstance[],
    attacker: CardInstance,
    context: DecisionContext
  ): CardInstance | null {
    if (blockers.length === 0) {
      return null;
    }

    try {
      // Evaluate each blocker option
      const evaluateFn: EvaluationFunction<CardInstance | null> = (blocker) => {
        try {
          if (blocker === null) {
            // Score for not blocking (taking damage)
            return this.evaluateNotBlocking(attacker, context);
          }
          return this.evaluateBlockerChoice(blocker, attacker, context);
        } catch (error) {
          // Log evaluation error but continue with neutral score
          logAIError(
            error instanceof Error ? error : new Error(String(error)),
            { method: 'evaluateBlocker', blockerId: blocker?.id }
          );
          return 0; // Neutral score for failed evaluation
        }
      };

      // Include null option (not blocking)
      const options: (CardInstance | null)[] = [...blockers, null];

      // Rank all options
      const rankedOptions = this.rankOptions(options, evaluateFn, context);

      // Apply difficulty modifier
      const selected = this.applyDifficultyModifier(
        rankedOptions,
        context.config.difficulty,
        context.config.randomness
      );

      return selected.option;
    } catch (error) {
      // Log error and fallback to not blocking
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { method: 'selectBlocker', blockersCount: blockers.length }
      );

      // Fallback: don't block
      return null;
    }
  }

  /**
   * Select a counter action during the counter step
   * 
   * @param options - Array of available counter options
   * @param context - Decision context
   * @returns The selected counter action or null to pass
   */
  selectCounterAction(
    options: CounterAction[],
    context: DecisionContext
  ): CounterAction | null {
    if (options.length === 0) {
      return null;
    }

    try {
      // Evaluate each counter option
      const evaluateFn: EvaluationFunction<CounterAction> = (option) => {
        try {
          return this.evaluateCounterOption(option, context);
        } catch (error) {
          // Log evaluation error but continue with neutral score
          logAIError(
            error instanceof Error ? error : new Error(String(error)),
            { method: 'evaluateCounterOption', optionType: option.type }
          );
          return 0; // Neutral score for failed evaluation
        }
      };

      // Rank all options
      const rankedOptions = this.rankOptions(options, evaluateFn, context);

      // Apply difficulty modifier to select from ranked options
      const selected = this.applyDifficultyModifier(
        rankedOptions,
        context.config.difficulty,
        context.config.randomness
      );

      // If selected option is PASS or has negative score, return null
      if (selected.option.type === 'PASS' || selected.score < 0) {
        return null;
      }

      return selected.option;
    } catch (error) {
      // Log error and fallback to not countering
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { method: 'selectCounterAction', optionsCount: options.length }
      );

      // Fallback: don't counter
      return null;
    }
  }

  /**
   * Select a target from available targets
   * 
   * @param targets - Array of legal targets
   * @param effect - The effect requiring a target
   * @param context - Decision context
   * @returns The selected target
   */
  selectTarget(
    targets: Target[],
    effect: EffectInstance,
    context: DecisionContext
  ): Target {
    if (targets.length === 0) {
      throw new AIEvaluationError(
        'No targets available to select from',
        'SELECT_TARGET',
        context
      );
    }

    if (targets.length === 1) {
      return targets[0];
    }

    try {
      // Evaluate each target
      const evaluateFn: EvaluationFunction<Target> = (target) => {
        try {
          return this.evaluateTargetChoice(target, effect, context);
        } catch (error) {
          // Log evaluation error but continue with neutral score
          logAIError(
            error instanceof Error ? error : new Error(String(error)),
            { method: 'evaluateTargetChoice', targetType: target.type }
          );
          return 0; // Neutral score for failed evaluation
        }
      };

      // Rank all targets
      const rankedTargets = this.rankOptions(targets, evaluateFn, context);

      // Apply difficulty modifier
      const selected = this.applyDifficultyModifier(
        rankedTargets,
        context.config.difficulty,
        context.config.randomness
      );

      return selected.option;
    } catch (error) {
      // Log error and fallback to first target
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { method: 'selectTarget', targetsCount: targets.length }
      );

      // Fallback: select first target
      return targets[0];
    }
  }

  /**
   * Select a numeric value from available options
   * 
   * @param options - Array of valid numeric options
   * @param effect - The effect requiring a value
   * @param context - Decision context
   * @returns The selected value
   */
  selectValue(
    options: number[],
    effect: EffectInstance,
    context: DecisionContext
  ): number {
    if (options.length === 0) {
      throw new AIEvaluationError(
        'No value options available to select from',
        'SELECT_VALUE',
        context
      );
    }

    if (options.length === 1) {
      return options[0];
    }

    try {
      // Evaluate each value option
      const evaluateFn: EvaluationFunction<number> = (value) => {
        try {
          return this.evaluateValueChoice(value, effect, context);
        } catch (error) {
          // Log evaluation error but continue with neutral score
          logAIError(
            error instanceof Error ? error : new Error(String(error)),
            { method: 'evaluateValueChoice', value }
          );
          return 0; // Neutral score for failed evaluation
        }
      };

      // Rank all values
      const rankedValues = this.rankOptions(options, evaluateFn, context);

      // Apply difficulty modifier
      const selected = this.applyDifficultyModifier(
        rankedValues,
        context.config.difficulty,
        context.config.randomness
      );

      return selected.option;
    } catch (error) {
      // Log error and fallback to first value
      logAIError(
        error instanceof Error ? error : new Error(String(error)),
        { method: 'selectValue', optionsCount: options.length }
      );

      // Fallback: select first value
      return options[0];
    }
  }

  /**
   * Rank options by evaluating and sorting them by score
   * 
   * @param options - Array of options to rank
   * @param evaluateFn - Function to evaluate each option
   * @param context - Decision context
   * @returns Array of scored options sorted by score (highest first)
   */
  private rankOptions<T>(
    options: T[],
    evaluateFn: EvaluationFunction<T>,
    context: DecisionContext
  ): ScoredOption<T>[] {
    // Evaluate each option
    const scoredOptions: ScoredOption<T>[] = options.map(option => ({
      option,
      score: evaluateFn(option, context),
    }));

    // Sort by score (highest first)
    scoredOptions.sort((a, b) => b.score - a.score);

    return scoredOptions;
  }

  /**
   * Apply difficulty modifier to select from ranked options
   * Introduces randomness based on difficulty level
   * 
   * @param rankedOptions - Array of options sorted by score
   * @param difficulty - Difficulty level
   * @param randomness - Randomness factor (0-1)
   * @returns Selected option
   */
  private applyDifficultyModifier<T>(
    rankedOptions: ScoredOption<T>[],
    difficulty: string,
    randomness: number
  ): ScoredOption<T> {
    if (rankedOptions.length === 0) {
      throw new Error('No options to select from');
    }

    // For hard difficulty with low randomness, always pick the best
    if (difficulty === 'hard' && randomness <= 0.1) {
      return rankedOptions[0];
    }

    // Calculate selection probabilities based on difficulty
    const probabilities = this.calculateSelectionProbabilities(
      rankedOptions,
      randomness
    );

    // Select based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;

    for (let i = 0; i < rankedOptions.length; i++) {
      cumulativeProbability += probabilities[i];
      if (random <= cumulativeProbability) {
        return rankedOptions[i];
      }
    }

    // Fallback to best option
    return rankedOptions[0];
  }

  /**
   * Calculate selection probabilities for ranked options
   * Higher-ranked options get higher probabilities
   * 
   * @param rankedOptions - Array of options sorted by score
   * @param randomness - Randomness factor (0-1)
   * @returns Array of probabilities (sum to 1.0)
   */
  private calculateSelectionProbabilities<T>(
    rankedOptions: ScoredOption<T>[],
    randomness: number
  ): number[] {
    const n = rankedOptions.length;
    
    // Base probabilities using exponential decay
    // Higher randomness = flatter distribution
    const decay = 1.0 - randomness * 0.7; // 0.3 to 1.0
    const probabilities: number[] = [];
    
    for (let i = 0; i < n; i++) {
      probabilities.push(Math.pow(decay, i));
    }

    // Normalize to sum to 1.0
    const sum = probabilities.reduce((a, b) => a + b, 0);
    return probabilities.map(p => p / sum);
  }

  /**
   * Evaluate the option of not blocking
   * 
   * @param attacker - The attacking card
   * @param context - Decision context
   * @returns Score for not blocking
   */
  private evaluateNotBlocking(attacker: CardInstance, context: DecisionContext): number {
    const player = context.state.players.get(context.playerId);
    if (!player) return -100;

    const playerLife = player.zones.life.length;
    
    // If we're at 1 life, blocking is critical
    if (playerLife === 1) {
      return -100; // Very bad to not block
    }

    // If we have plenty of life, taking damage might be acceptable
    if (playerLife >= 4) {
      return -20; // Moderate penalty
    }

    // Low life, should probably block
    return -50;
  }

  /**
   * Evaluate a blocker choice
   * 
   * @param blocker - The potential blocker
   * @param attacker - The attacking card
   * @param context - Decision context
   * @returns Score for using this blocker
   */
  private evaluateBlockerChoice(
    blocker: CardInstance,
    attacker: CardInstance,
    context: DecisionContext
  ): number {
    let score = 0;

    const blockerPower = this.getCardPower(blocker);
    const attackerPower = this.getCardPower(attacker);
    const blockerCost = blocker.definition.baseCost || 0;
    const attackerCost = attacker.definition.baseCost || 0;

    // 1. Battle outcome
    if (blockerPower > attackerPower) {
      // We win the battle
      score += 40;
      score += attackerCost * 5; // Value of removing the attacker
    } else if (blockerPower === attackerPower) {
      // Mutual destruction
      score += 20;
      if (attackerCost > blockerCost) {
        score += 15; // Good trade
      } else {
        score -= 10; // Bad trade
      }
    } else {
      // We lose the blocker
      score -= blockerCost * 5;
      if (attackerCost > blockerCost * 2) {
        score += 10; // Worth sacrificing for high-value removal
      }
    }

    // 2. Life considerations
    const player = context.state.players.get(context.playerId);
    if (player) {
      const playerLife = player.zones.life.length;
      if (playerLife <= 2) {
        score += 30; // Blocking is more valuable when low on life
      }
    }

    // 3. Blocker value
    if (blocker.definition.keywords.includes('Double Attack')) {
      score -= 15; // Losing a Double Attack character is costly
    }
    if (blocker.definition.keywords.includes('Rush')) {
      score -= 10; // Losing a Rush character is costly
    }

    return score;
  }

  /**
   * Evaluate a counter option
   * 
   * @param option - The counter option
   * @param context - Decision context
   * @returns Score for using this counter
   */
  private evaluateCounterOption(option: CounterAction, context: DecisionContext): number {
    if (option.type === 'PASS') {
      return 0; // Baseline for not countering
    }

    let score = 0;
    const player = context.state.players.get(context.playerId);
    if (!player) return 0;

    // Find the counter card
    const counterCard = player.zones.hand.find(c => c.id === option.cardId);
    if (!counterCard) return 0;

    const counterValue = counterCard.definition.counterValue || 0;
    const cardCost = counterCard.definition.baseCost || 0;

    // 1. Base counter value - higher counter values are better
    score += counterValue / 30; // Scale counter value to reasonable range

    // 2. Life considerations - critical when low on life
    const playerLife = player.zones.life.length;
    if (playerLife === 1) {
      score += 60; // Critical to counter when at 1 life
    } else if (playerLife === 2) {
      score += 30; // Important to counter when low
    } else if (playerLife >= 5) {
      score -= 20; // Much less important when healthy
    }

    // 3. Card cost consideration - using a card has opportunity cost
    score -= cardCost * 5;

    // 4. Hand size consideration - more costly when hand is small
    const handSize = player.zones.hand.length;
    if (handSize <= 2) {
      score -= 20; // More costly when hand is small
    } else if (handSize >= 6) {
      score += 10; // Less costly when hand is large
    }

    // 5. Bonus for protecting valuable defenders
    // Check if we have valuable characters that might be under attack
    const valuableCharacters = player.zones.characterArea.filter(c =>
      c.definition.keywords.includes('Double Attack') ||
      c.definition.keywords.includes('Rush') ||
      (c.definition.baseCost || 0) >= 5
    );
    if (valuableCharacters.length > 0) {
      score += 15; // Bonus for protecting valuable characters
    }

    return score;
  }

  /**
   * Find the defender in the current battle
   * Looks for a character being attacked or the leader
   */
  private findDefenderInBattle(context: DecisionContext): CardInstance | null {
    const player = context.state.players.get(context.playerId);
    if (!player) return null;

    // Check if leader is being attacked (leader is always in leader area)
    if (player.zones.leaderArea) {
      return player.zones.leaderArea;
    }

    // Check for rested characters that might be under attack
    const restedCharacters = player.zones.characterArea.filter(
      c => c.state === CardState.RESTED
    );
    
    // Return the first rested character as a heuristic
    // In a real implementation, the battle context would specify which card is being attacked
    return restedCharacters[0] || null;
  }

  /**
   * Find the attacker in the current battle
   * Looks for an active opponent character
   */
  private findAttackerInBattle(context: DecisionContext): CardInstance | null {
    const opponentId = this.getOpponentId(context.playerId);
    const opponent = context.state.players.get(opponentId);
    if (!opponent) return null;

    // Look for active characters that could be attacking
    const activeCharacters = opponent.zones.characterArea.filter(
      c => c.state === CardState.ACTIVE
    );

    // Return the strongest active character as a heuristic
    // In a real implementation, the battle context would specify which card is attacking
    if (activeCharacters.length > 0) {
      return activeCharacters.reduce((strongest, current) => {
        const strongestPower = this.getCardPower(strongest);
        const currentPower = this.getCardPower(current);
        return currentPower > strongestPower ? current : strongest;
      });
    }

    return null;
  }

  /**
   * Evaluate a target choice for an effect
   * 
   * @param target - The potential target
   * @param effect - The effect being resolved
   * @param context - Decision context
   * @returns Score for targeting this option
   */
  private evaluateTargetChoice(
    target: Target,
    effect: EffectInstance,
    context: DecisionContext
  ): number {
    let score = 0;

    // Get effect label to determine effect type
    const effectLabel = effect.effectDefinition.label?.toLowerCase() || '';

    // For removal effects, target opponent's strongest character
    if (effectLabel.includes('k.o') || effectLabel.includes('return') || 
        effectLabel.includes('trash')) {
      if (target.type === 'CARD' && target.cardId) {
        const opponent = context.state.players.get(this.getOpponentId(context.playerId));
        if (opponent) {
          const targetCard = opponent.zones.characterArea.find(c => c.id === target.cardId);
          if (targetCard) {
            const power = this.getCardPower(targetCard);
            score += power / 100; // Higher power = better target
            
            // Bonus for valuable keywords
            if (targetCard.definition.keywords.includes('Double Attack')) score += 20;
            if (targetCard.definition.keywords.includes('Rush')) score += 15;
            if (targetCard.definition.keywords.includes('Blocker')) score += 10;
          }
        }
      }
    }

    // For buff effects, target our strongest or most valuable character
    if (effectLabel.includes('+') || effectLabel.includes('power')) {
      if (target.type === 'CARD' && target.cardId) {
        const player = context.state.players.get(context.playerId);
        if (player) {
          const targetCard = player.zones.characterArea.find(c => c.id === target.cardId);
          if (targetCard) {
            const power = this.getCardPower(targetCard);
            score += power / 100;
            
            // Bonus for characters that can attack
            if (targetCard.state === 'ACTIVE') score += 25;
            
            // Bonus for valuable keywords
            if (targetCard.definition.keywords.includes('Double Attack')) score += 20;
            if (targetCard.definition.keywords.includes('Rush')) score += 15;
          }
        }
      }
    }

    return score;
  }

  /**
   * Evaluate a numeric value choice for an effect
   * 
   * @param value - The potential value
   * @param effect - The effect being resolved
   * @param context - Decision context
   * @returns Score for choosing this value
   */
  private evaluateValueChoice(
    value: number,
    effect: EffectInstance,
    context: DecisionContext
  ): number {
    // Get effect label to determine effect type
    const effectLabel = effect.effectDefinition.label?.toLowerCase() || '';

    // For most effects, higher values are better
    let score = value * 10;

    // For damage effects, higher is better
    if (effectLabel.includes('damage')) {
      score += value * 15;
    }

    // For draw effects, higher is better but with diminishing returns
    if (effectLabel.includes('draw')) {
      const player = context.state.players.get(context.playerId);
      if (player) {
        const handSize = player.zones.hand.length;
        if (handSize >= 5) {
          score -= value * 5; // Less valuable when hand is full
        }
      }
    }

    return score;
  }

  /**
   * Get the opponent's player ID
   */
  private getOpponentId(playerId: PlayerId): PlayerId {
    return playerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
  }

  /**
   * Get the effective power of a card (base power + DON bonuses)
   */
  private getCardPower(card: CardInstance): number {
    const basePower = card.definition.basePower || 0;
    const donBonus = card.givenDon.length * 1000;
    return basePower + donBonus;
  }
}
