/**
 * HumanPlayer.ts
 * 
 * Implementation of the Player interface for human players.
 * Uses a callback system to allow the UI to provide player decisions.
 * Maintains backward compatibility with existing game flow.
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

// ============================================================================
// Callback Types
// ============================================================================

/**
 * Callback function for requesting an action choice from the UI
 */
export type ActionCallback = (
  legalActions: GameAction[],
  state: GameState
) => Promise<GameAction>;

/**
 * Callback function for requesting a mulligan decision from the UI
 */
export type MulliganCallback = (
  hand: CardInstance[],
  state: GameState
) => Promise<boolean>;

/**
 * Callback function for requesting a blocker choice from the UI
 */
export type BlockerCallback = (
  legalBlockers: CardInstance[],
  attacker: CardInstance,
  state: GameState
) => Promise<CardInstance | null>;

/**
 * Callback function for requesting a counter action choice from the UI
 */
export type CounterActionCallback = (
  options: CounterAction[],
  state: GameState
) => Promise<CounterAction | null>;

/**
 * Callback function for requesting a target choice from the UI
 */
export type TargetCallback = (
  legalTargets: Target[],
  effect: EffectInstance,
  state: GameState
) => Promise<Target>;

/**
 * Callback function for requesting a value choice from the UI
 */
export type ValueCallback = (
  options: number[],
  effect: EffectInstance,
  state: GameState
) => Promise<number>;

/**
 * Collection of all callback functions for human player decisions
 */
export interface HumanPlayerCallbacks {
  onChooseAction?: ActionCallback;
  onChooseMulligan?: MulliganCallback;
  onChooseBlocker?: BlockerCallback;
  onChooseCounterAction?: CounterActionCallback;
  onChooseTarget?: TargetCallback;
  onChooseValue?: ValueCallback;
}

// ============================================================================
// HumanPlayer Implementation
// ============================================================================

/**
 * Human player implementation that delegates decisions to UI callbacks
 */
export class HumanPlayer implements Player {
  readonly id: PlayerId;
  readonly type = PlayerType.HUMAN;
  
  private callbacks: HumanPlayerCallbacks;
  
  /**
   * Create a new human player
   * @param id - The player ID
   * @param callbacks - Callback functions for UI integration
   */
  constructor(id: PlayerId, callbacks: HumanPlayerCallbacks = {}) {
    this.id = id;
    this.callbacks = callbacks;
  }
  
  /**
   * Update the callback functions
   * Useful for dynamically changing UI handlers
   * @param callbacks - New callback functions (partial update)
   */
  setCallbacks(callbacks: Partial<HumanPlayerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  /**
   * Choose an action from legal actions
   * Delegates to the UI callback or returns the first action as fallback
   */
  async chooseAction(
    legalActions: GameAction[],
    state: GameState
  ): Promise<GameAction> {
    if (this.callbacks.onChooseAction) {
      return await this.callbacks.onChooseAction(legalActions, state);
    }
    
    // Fallback: return first legal action if no callback is set
    if (legalActions.length === 0) {
      throw new Error('No legal actions available');
    }
    
    return legalActions[0];
  }
  
  /**
   * Decide whether to mulligan the opening hand
   * Delegates to the UI callback or returns false (keep hand) as fallback
   */
  async chooseMulligan(
    hand: CardInstance[],
    state: GameState
  ): Promise<boolean> {
    if (this.callbacks.onChooseMulligan) {
      return await this.callbacks.onChooseMulligan(hand, state);
    }
    
    // Fallback: keep hand by default
    return false;
  }
  
  /**
   * Choose a blocker from available blockers
   * Delegates to the UI callback or returns null (no block) as fallback
   */
  async chooseBlocker(
    legalBlockers: CardInstance[],
    attacker: CardInstance,
    state: GameState
  ): Promise<CardInstance | null> {
    if (this.callbacks.onChooseBlocker) {
      return await this.callbacks.onChooseBlocker(legalBlockers, attacker, state);
    }
    
    // Fallback: don't block by default
    return null;
  }
  
  /**
   * Choose a counter action during the counter step
   * Delegates to the UI callback or returns null (pass) as fallback
   */
  async chooseCounterAction(
    options: CounterAction[],
    state: GameState
  ): Promise<CounterAction | null> {
    if (this.callbacks.onChooseCounterAction) {
      return await this.callbacks.onChooseCounterAction(options, state);
    }
    
    // Fallback: pass (don't use counter) by default
    return null;
  }
  
  /**
   * Choose a target for an effect
   * Delegates to the UI callback or returns the first target as fallback
   */
  async chooseTarget(
    legalTargets: Target[],
    effect: EffectInstance,
    state: GameState
  ): Promise<Target> {
    if (this.callbacks.onChooseTarget) {
      return await this.callbacks.onChooseTarget(legalTargets, effect, state);
    }
    
    // Fallback: return first legal target if no callback is set
    if (legalTargets.length === 0) {
      throw new Error('No legal targets available');
    }
    
    return legalTargets[0];
  }
  
  /**
   * Choose a numeric value for an effect
   * Delegates to the UI callback or returns the first option as fallback
   */
  async chooseValue(
    options: number[],
    effect: EffectInstance,
    state: GameState
  ): Promise<number> {
    if (this.callbacks.onChooseValue) {
      return await this.callbacks.onChooseValue(options, effect, state);
    }
    
    // Fallback: return first option if no callback is set
    if (options.length === 0) {
      throw new Error('No value options available');
    }
    
    return options[0];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a human player with callbacks
 * @param id - The player ID
 * @param callbacks - Callback functions for UI integration
 * @returns A new HumanPlayer instance
 */
export function createHumanPlayer(
  id: PlayerId,
  callbacks?: HumanPlayerCallbacks
): HumanPlayer {
  return new HumanPlayer(id, callbacks);
}
