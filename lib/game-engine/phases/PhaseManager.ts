/**
 * PhaseManager.ts
 * 
 * Orchestrates turn phases and manages phase transitions.
 * Executes phases in sequence according to the rules context.
 */

import { GameStateManager } from '../core/GameState';
import { Phase, PlayerId, GameEventType } from '../core/types';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, PhaseChangedEvent } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import { EffectSystem } from '../effects/EffectSystem';
import { ModifierManager } from '../battle/ModifierManager';
import { runRefreshPhase } from './RefreshPhase';
import { runDrawPhase } from './DrawPhase';
import { runDonPhase } from './DonPhase';
import { runMainPhase } from './MainPhase';
import { runEndPhase } from './EndPhase';

/**
 * PhaseManager orchestrates the execution of turn phases
 */
export class PhaseManager {
  private zoneManager: ZoneManager | null = null;
  private effectSystem: EffectSystem | null = null;
  private modifierManager: ModifierManager | null = null;
  private players: Map<PlayerId, import('../core/types').Player> = new Map();

  constructor(
    private rules: RulesContext,
    private eventEmitter: EventEmitter
  ) {}

  /**
   * Initialize the zone manager with the current state
   */
  initializeZoneManager(stateManager: GameStateManager): void {
    this.zoneManager = new ZoneManager(stateManager, this.eventEmitter);
  }

  /**
   * Set the effect system
   * @param effectSystem - The effect system instance
   */
  setEffectSystem(effectSystem: EffectSystem): void {
    this.effectSystem = effectSystem;
  }

  /**
   * Set the modifier manager
   * @param modifierManager - The modifier manager instance
   */
  setModifierManager(modifierManager: ModifierManager): void {
    this.modifierManager = modifierManager;
  }

  /**
   * Set a Player instance for a player ID
   * @param playerId - The player ID
   * @param player - The Player instance
   */
  setPlayer(playerId: PlayerId, player: import('../core/types').Player): void {
    this.players.set(playerId, player);
  }

  /**
   * Get a Player instance for a player ID
   * @param playerId - The player ID
   * @returns The Player instance or undefined if not set
   */
  getPlayer(playerId: PlayerId): import('../core/types').Player | undefined {
    return this.players.get(playerId);
  }

  /**
   * Run a complete turn through all phases
   * @param stateManager - The current game state manager
   * @returns Updated game state manager after turn completion
   */
  runTurn(stateManager: GameStateManager): GameStateManager | Promise<GameStateManager> {
    let currentState = stateManager;
    const phaseSequence = this.rules.getPhaseSequence();
    
    // Check if any player is set (AI or Human with async decisions)
    const hasAsyncPlayers = this.players.size > 0;
    
    if (hasAsyncPlayers) {
      // Run async version
      return this.runTurnAsync(currentState, phaseSequence);
    }

    // Emit turn start event
    const turnStartEvent = {
      type: GameEventType.TURN_START,
      timestamp: Date.now(),
      turnNumber: currentState.getTurnNumber(),
      activePlayer: currentState.getActivePlayer(),
    };
    this.eventEmitter.emit(turnStartEvent);

    // Trigger START_OF_TURN effects
    if (this.effectSystem) {
      this.effectSystem.updateStateManager(currentState);
      this.effectSystem.triggerEffects(turnStartEvent as any);
      currentState = this.effectSystem.getStateManager();
    }

    // Clean up UNTIL_START_OF_NEXT_TURN modifiers
    if (this.modifierManager) {
      this.modifierManager.updateStateManager(currentState);
      currentState = this.modifierManager.expireStartOfTurnModifiers(currentState.getActivePlayer());
    }

    // Execute each phase in sequence
    for (const phase of phaseSequence) {
      const oldPhase = currentState.getCurrentPhase();
      
      // Transition to the phase (doesn't emit event yet)
      currentState = this.transitionToPhase(currentState, phase);
      
      // Emit phase changed event after state is updated
      this.emitPhaseChangedEvent(oldPhase, phase, currentState.getActivePlayer());

      // Execute the phase
      const result = this.executePhase(currentState, phase);
      currentState = result as GameStateManager; // Sync version

      // Check if game is over after each phase
      if (currentState.isGameOver()) {
        break;
      }
    }

    // Emit turn end event
    const turnEndEvent = {
      type: GameEventType.TURN_END,
      timestamp: Date.now(),
      turnNumber: currentState.getTurnNumber(),
      activePlayer: currentState.getActivePlayer(),
    };
    this.eventEmitter.emit(turnEndEvent);

    // Trigger END_OF_TURN effects
    if (this.effectSystem) {
      this.effectSystem.updateStateManager(currentState);
      this.effectSystem.triggerEffects(turnEndEvent as any);
      currentState = this.effectSystem.getStateManager();
    }

    // Clean up UNTIL_END_OF_TURN modifiers
    if (this.modifierManager) {
      this.modifierManager.updateStateManager(currentState);
      currentState = this.modifierManager.expireEndOfTurnModifiers();
    }

    // Clear attack tracking at end of turn
    currentState = currentState.clearAttackedThisTurn();

    // Increment turn number and switch active player
    currentState = currentState.incrementTurn();
    currentState = this.switchActivePlayer(currentState);

    return currentState;
  }

  /**
   * Run a complete turn through all phases (async version for AI/Human players)
   * @param stateManager - The current game state manager
   * @param phaseSequence - The sequence of phases to execute
   * @returns Promise resolving to updated game state manager after turn completion
   */
  private async runTurnAsync(
    stateManager: GameStateManager,
    phaseSequence: Phase[]
  ): Promise<GameStateManager> {
    let currentState = stateManager;

    // Emit turn start event
    const turnStartEvent = {
      type: GameEventType.TURN_START,
      timestamp: Date.now(),
      turnNumber: currentState.getTurnNumber(),
      activePlayer: currentState.getActivePlayer(),
    };
    this.eventEmitter.emit(turnStartEvent);

    // Trigger START_OF_TURN effects
    if (this.effectSystem) {
      this.effectSystem.updateStateManager(currentState);
      this.effectSystem.triggerEffects(turnStartEvent as any);
      currentState = this.effectSystem.getStateManager();
    }

    // Clean up UNTIL_START_OF_NEXT_TURN modifiers
    if (this.modifierManager) {
      this.modifierManager.updateStateManager(currentState);
      currentState = this.modifierManager.expireStartOfTurnModifiers(currentState.getActivePlayer());
    }

    // Execute each phase in sequence
    for (const phase of phaseSequence) {
      const oldPhase = currentState.getCurrentPhase();
      
      // Transition to the phase (doesn't emit event yet)
      currentState = this.transitionToPhase(currentState, phase);
      
      // Emit phase changed event after state is updated
      this.emitPhaseChangedEvent(oldPhase, phase, currentState.getActivePlayer());

      // Execute the phase (await if it returns a promise)
      const result = this.executePhase(currentState, phase);
      currentState = result instanceof Promise ? await result : result;

      // Check if game is over after each phase
      if (currentState.isGameOver()) {
        break;
      }
    }

    // Emit turn end event
    const turnEndEvent = {
      type: GameEventType.TURN_END,
      timestamp: Date.now(),
      turnNumber: currentState.getTurnNumber(),
      activePlayer: currentState.getActivePlayer(),
    };
    this.eventEmitter.emit(turnEndEvent);

    // Trigger END_OF_TURN effects
    if (this.effectSystem) {
      this.effectSystem.updateStateManager(currentState);
      this.effectSystem.triggerEffects(turnEndEvent as any);
      currentState = this.effectSystem.getStateManager();
    }

    // Clean up UNTIL_END_OF_TURN modifiers
    if (this.modifierManager) {
      this.modifierManager.updateStateManager(currentState);
      currentState = this.modifierManager.expireEndOfTurnModifiers();
    }

    // Clear attack tracking at end of turn
    currentState = currentState.clearAttackedThisTurn();

    // Increment turn number and switch active player
    currentState = currentState.incrementTurn();
    currentState = this.switchActivePlayer(currentState);

    return currentState;
  }

  /**
   * Transition to a new phase and emit phase changed event
   * @param stateManager - The current game state manager
   * @param newPhase - The phase to transition to
   * @returns Updated game state manager
   */
  private transitionToPhase(
    stateManager: GameStateManager,
    newPhase: Phase
  ): GameStateManager {
    const oldPhase = stateManager.getCurrentPhase();

    // Update state with new phase
    const newState = stateManager.setPhase(newPhase);

    // NOTE: Event emission is deferred to allow caller to update their state first
    // This prevents race conditions where event handlers read stale state
    // The event will be emitted by the caller after updating their state manager
    
    return newState;
  }

  /**
   * Emit phase changed event
   * Should be called AFTER the state manager has been updated
   * @param oldPhase - The previous phase
   * @param newPhase - The new phase
   * @param activePlayer - The active player
   */
  emitPhaseChangedEvent(oldPhase: Phase, newPhase: Phase, activePlayer: PlayerId): void {
    const event: PhaseChangedEvent = {
      type: GameEventType.PHASE_CHANGED,
      timestamp: Date.now(),
      oldPhase,
      newPhase,
      activePlayer,
    };
    this.eventEmitter.emit(event);
  }

  /**
   * Execute a specific phase
   * @param stateManager - The current game state manager
   * @param phase - The phase to execute
   * @returns Updated game state manager (or Promise for MAIN phase with players)
   */
  private executePhase(
    stateManager: GameStateManager,
    phase: Phase
  ): GameStateManager | Promise<GameStateManager> {
    switch (phase) {
      case Phase.REFRESH:
        return runRefreshPhase(stateManager, this.rules, this.eventEmitter);
      case Phase.DRAW:
        return runDrawPhase(stateManager, this.rules, this.eventEmitter);
      case Phase.DON_PHASE:
        return runDonPhase(stateManager, this.rules, this.eventEmitter);
      case Phase.MAIN:
        if (!this.zoneManager) {
          this.initializeZoneManager(stateManager);
        }
        // Get the active player's Player instance if available
        const activePlayer = stateManager.getActivePlayer();
        const player = this.players.get(activePlayer);
        // runMainPhase with player returns Promise, without player returns GameStateManager
        // Don't cast - return the actual result (Promise or GameStateManager)
        return runMainPhase(stateManager, this.rules, this.eventEmitter, this.zoneManager!, this.effectSystem!, player);
      case Phase.END:
        return runEndPhase(stateManager, this.rules, this.eventEmitter);
      default:
        console.warn(`Unknown phase: ${phase}`);
        return stateManager;
    }
  }

  /**
   * Switch the active player
   * @param stateManager - The current game state manager
   * @returns Updated game state manager with switched active player
   */
  private switchActivePlayer(stateManager: GameStateManager): GameStateManager {
    const currentActive = stateManager.getActivePlayer();
    const newActive =
      currentActive === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
    return stateManager.setActivePlayer(newActive);
  }
}
