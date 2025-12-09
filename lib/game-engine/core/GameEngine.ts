/**
 * GameEngine.ts
 * 
 * Main orchestrator for the One Piece TCG Engine.
 * Wires together all subsystems and provides the primary API for game interaction.
 * Manages game lifecycle, action handling, state queries, and event emission.
 */

import { GameStateManager, createInitialGameState } from './GameState';
import { RulesContext } from '../rules/RulesContext';
import { BattleSystem } from '../battle/BattleSystem';
import { EffectSystem, EffectScriptRegistry } from '../effects/EffectSystem';
import { PhaseManager } from '../phases/PhaseManager';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter, GameEventType, AnyGameEvent, EventHandler } from '../rendering/EventEmitter';
import { setupGame, GameSetupConfig, GameSetupError } from '../setup/GameSetup';
import { TriggerQueue } from '../effects/TriggerQueue';
import { LoopGuard } from '../utils/LoopGuard';
import { runDefeatCheck } from '../utils/DefeatChecker';
import { handlePlayCard } from '../phases/CardPlayHandler';
import { handleGiveDon } from '../phases/DonHandler';
import { ErrorHandler, ErrorHandlerOptions } from '../utils/ErrorHandler';
import { GameEngineError, IllegalActionError } from '../utils/errors';
import { ValidationUtils } from '../utils/validation';
import { executeWithTransaction } from '../utils/StateTransaction';
import { GameLogger, createGameLogger } from '../utils/GameLogger';
import { LogLevel } from '../utils/Logger';
import { ModifierManager } from '../battle/ModifierManager';
import {
  PlayerId,
  GameState,
  Target,
  ActionType,
  GameAction,
  ZoneId,
  Phase,
  Player,
  PlayerType,
} from './types';

/**
 * Action interface for player actions
 */
export interface Action {
  type: ActionType;
  playerId: PlayerId;
  data: Record<string, any>;
}

/**
 * GameEngine is the main orchestrator for the One Piece TCG Engine
 */
export class GameEngine {
  private stateManager: GameStateManager;
  private rules: RulesContext;
  private battleSystem: BattleSystem;
  private effectSystem: EffectSystem;
  private phaseManager: PhaseManager;
  private zoneManager: ZoneManager;
  private modifierManager: import('../battle/ModifierManager').ModifierManager;
  private eventEmitter: EventEmitter;
  private triggerQueue: TriggerQueue;
  private loopGuard: LoopGuard;
  private errorHandler: ErrorHandler;
  private gameLogger: GameLogger;
  private isSetup: boolean;
  private players: Map<PlayerId, Player>;

  /**
   * Create a new GameEngine instance
   * @param rules - Rules context (defaults to built-in rules)
   * @param scriptRegistry - Optional effect script registry
   * @param errorOptions - Optional error handler configuration
   */
  constructor(
    rules?: RulesContext,
    scriptRegistry?: EffectScriptRegistry,
    errorOptions?: ErrorHandlerOptions
  ) {
    // Initialize rules context
    this.rules = rules || new RulesContext();

    // Initialize event emitter
    this.eventEmitter = new EventEmitter();

    // Initialize error handler
    this.errorHandler = new ErrorHandler(this.eventEmitter, errorOptions);

    // Initialize game logger
    this.gameLogger = createGameLogger();

    // Initialize state manager with empty state
    this.stateManager = new GameStateManager(createInitialGameState());

    // Initialize zone manager
    this.zoneManager = new ZoneManager(this.stateManager, this.eventEmitter);

    // Initialize effect system
    this.effectSystem = new EffectSystem(
      this.stateManager,
      this.eventEmitter,
      this.zoneManager,
      scriptRegistry
    );

    // Initialize trigger queue
    this.triggerQueue = new TriggerQueue(
      this.stateManager,
      this.effectSystem
    );

    // Initialize battle system with effect system
    this.battleSystem = new BattleSystem(
      this.stateManager,
      this.rules,
      this.eventEmitter,
      this.effectSystem
    );

    // Initialize modifier manager
    this.modifierManager = new ModifierManager(this.stateManager);

    // Initialize phase manager
    this.phaseManager = new PhaseManager(this.rules, this.eventEmitter);
    this.phaseManager.setEffectSystem(this.effectSystem);
    this.phaseManager.setModifierManager(this.modifierManager);

    // Initialize loop guard
    this.loopGuard = new LoopGuard(this.rules);

    // Initialize empty player map
    this.players = new Map<PlayerId, Player>();

    // Mark as not setup
    this.isSetup = false;
  }

  // ============================================================================
  // Game Lifecycle Methods
  // ============================================================================

  /**
   * Setup a new game with the provided decks and configuration (async version)
   * This version queries Player instances for mulligan decisions
   * @param config - Game setup configuration
   * @throws GameSetupError if setup fails
   */
  async setupGameAsync(config: GameSetupConfig): Promise<void> {
    const startTime = performance.now();
    try {
      this.gameLogger.getLogger().info('STATE', 'Setting up game (async)');
      
      const { setupGameAsync } = await import('../setup/GameSetup');
      const result = await setupGameAsync(config, this.rules, this.eventEmitter);

      // Update all subsystems with the new state
      this.stateManager = result.stateManager;
      this.zoneManager = result.zoneManager;
      this.updateAllSubsystems();

      // Store Player instances if provided
      if (config.player1) {
        this.players.set(PlayerId.PLAYER_1, config.player1);
        // Also set player in BattleSystem for blocker/counter decisions
        this.battleSystem.setPlayerForBlocker(PlayerId.PLAYER_1, config.player1);
        // Also set player in PhaseManager for main phase actions
        this.phaseManager.setPlayer(PlayerId.PLAYER_1, config.player1);
        this.gameLogger.getLogger().info('STATE', `Player 1 registered: ${config.player1.type}`);
      }
      if (config.player2) {
        this.players.set(PlayerId.PLAYER_2, config.player2);
        // Also set player in BattleSystem for blocker/counter decisions
        this.battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, config.player2);
        // Also set player in PhaseManager for main phase actions
        this.phaseManager.setPlayer(PlayerId.PLAYER_2, config.player2);
        this.gameLogger.getLogger().info('STATE', `Player 2 registered: ${config.player2.type}`);
      }

      // Mark as setup
      this.isSetup = true;
      
      const duration = performance.now() - startTime;
      this.gameLogger.logPerformance('setupGameAsync', duration);
      this.gameLogger.getLogger().info('STATE', 'Game setup complete');
    } catch (error) {
      this.gameLogger.getLogger().error('ERROR', 'Game setup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      this.errorHandler.handleError(error as Error, {
        action: 'setupGameAsync',
        config,
      });
      
      if (error instanceof GameSetupError) {
        throw error;
      }
      throw new GameEngineError(
        `Game setup failed: ${error instanceof Error ? error.message : String(error)}`,
        'SETUP_ERROR'
      );
    }
  }

  /**
   * Setup a new game with the provided decks and configuration
   * @param config - Game setup configuration
   * @throws GameSetupError if setup fails
   */
  setupGame(config: GameSetupConfig): void {
    try {
      const result = setupGame(config, this.rules, this.eventEmitter);

      // Update all subsystems with the new state
      this.stateManager = result.stateManager;
      this.zoneManager = result.zoneManager;
      this.updateAllSubsystems();

      // Store Player instances if provided
      if (config.player1) {
        this.players.set(PlayerId.PLAYER_1, config.player1);
        // Also set player in BattleSystem for blocker/counter decisions
        this.battleSystem.setPlayerForBlocker(PlayerId.PLAYER_1, config.player1);
        // Also set player in PhaseManager for main phase actions
        this.phaseManager.setPlayer(PlayerId.PLAYER_1, config.player1);
      }
      if (config.player2) {
        this.players.set(PlayerId.PLAYER_2, config.player2);
        // Also set player in BattleSystem for blocker/counter decisions
        this.battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, config.player2);
        // Also set player in PhaseManager for main phase actions
        this.phaseManager.setPlayer(PlayerId.PLAYER_2, config.player2);
      }

      // Mark as setup
      this.isSetup = true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'setupGame',
        config,
      });
      
      if (error instanceof GameSetupError) {
        throw error;
      }
      throw new GameEngineError(
        `Game setup failed: ${error instanceof Error ? error.message : String(error)}`,
        'SETUP_ERROR'
      );
    }
  }

  /**
   * Run the complete game until it's over
   * @returns The winning player ID or null for a draw
   * @throws GameEngineError if game is not setup or execution fails
   */
  runGame(): PlayerId | null {
    try {
      if (!this.isSetup) {
        throw new GameEngineError('Game must be setup before running', 'NOT_SETUP');
      }

      // Run turns until game is over
      while (!this.stateManager.isGameOver()) {
        this.runTurn();

        // Check for infinite loops
        const loopResult = this.loopGuard.checkForLoop(this.stateManager.getState());

        if (loopResult.loopDetected) {
          // Apply infinite loop resolution based on rules
          if (loopResult.resolution === 'draw') {
            this.stateManager = this.stateManager.setGameOver(null); // Draw
          } else if (loopResult.stoppingPlayer) {
            // The player who can stop the loop loses
            const winner = loopResult.stoppingPlayer === PlayerId.PLAYER_1 
              ? PlayerId.PLAYER_2 
              : PlayerId.PLAYER_1;
            this.stateManager = this.stateManager.setGameOver(winner);
          }
          this.updateAllSubsystems();
          break;
        }

        // Update loop guard
        const stateHash = this.loopGuard.hashRelevantState(this.stateManager.getState());
        this.stateManager = this.stateManager.updateLoopGuard(stateHash);
        this.updateAllSubsystems();
      }

      // Emit game over event
      this.eventEmitter.emit({
        type: GameEventType.GAME_OVER,
        timestamp: Date.now(),
        winner: this.stateManager.getWinner(),
        reason: this.determineGameOverReason(),
      });

      return this.stateManager.getWinner();
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'runGame',
      });
      
      if (error instanceof GameEngineError) {
        throw error;
      }
      throw new GameEngineError(
        `Game execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'RUN_GAME_ERROR'
      );
    }
  }

  /**
   * Run a single turn
   * @throws GameEngineError if game is not setup or turn execution fails
   */
  runTurn(): void | Promise<void> {
    try {
      if (!this.isSetup) {
        throw new GameEngineError('Game must be setup before running turns', 'NOT_SETUP');
      }

      ValidationUtils.validateGameNotOver(this.stateManager.getState());

      // Execute the turn through the phase manager
      const result = this.phaseManager.runTurn(this.stateManager);
      
      // If result is a promise (AI players), handle async
      if (result instanceof Promise) {
        return result.then(newState => {
          this.stateManager = newState;
          this.updateAllSubsystems();

          // Run defeat check after turn
          const defeatResult = runDefeatCheck(this.stateManager);
          if (defeatResult.gameOver) {
            this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
            this.updateAllSubsystems();
          }
        }).catch(error => {
          this.errorHandler.handleError(error as Error, {
            action: 'runTurn',
            turnNumber: this.stateManager.getTurnNumber(),
          });
          
          if (error instanceof GameEngineError) {
            throw error;
          }
          throw new GameEngineError(
            `Turn execution failed: ${error instanceof Error ? error.message : String(error)}`,
            'RUN_TURN_ERROR'
          );
        });
      }
      
      // Synchronous path
      this.stateManager = result;
      this.updateAllSubsystems();

      // Run defeat check after turn
      const defeatResult = runDefeatCheck(this.stateManager);
      if (defeatResult.gameOver) {
        this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
        this.updateAllSubsystems();
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'runTurn',
        turnNumber: this.stateManager.getTurnNumber(),
      });
      
      if (error instanceof GameEngineError) {
        throw error;
      }
      throw new GameEngineError(
        `Turn execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'RUN_TURN_ERROR'
      );
    }
  }

  /**
   * Advance to the next phase (for manual phase control)
   * @throws GameEngineError if game is not setup
   */
  advancePhase(): void | Promise<void> {
    try {
      if (!this.isSetup) {
        throw new GameEngineError('Game must be setup before advancing phases', 'NOT_SETUP');
      }

      ValidationUtils.validateGameNotOver(this.stateManager.getState());

      const currentPhase = this.stateManager.getState().phase;
      const phaseSequence = this.rules.getPhaseSequence();
      const currentIndex = phaseSequence.indexOf(currentPhase);

      if (currentIndex === -1) {
        throw new GameEngineError(`Invalid current phase: ${currentPhase}`, 'INVALID_PHASE');
      }

      // If we're at the last phase, start a new turn
      if (currentIndex === phaseSequence.length - 1) {
        // Emit turn end
        this.eventEmitter.emit({
          type: GameEventType.TURN_END,
          timestamp: Date.now(),
          turnNumber: this.stateManager.getTurnNumber(),
          activePlayer: this.stateManager.getActivePlayer(),
        });

        // Clear attack tracking at end of turn
        this.stateManager = this.stateManager.clearAttackedThisTurn();

        // Increment turn and switch player
        this.stateManager = this.stateManager.incrementTurn();
        const currentPlayer = this.stateManager.getActivePlayer();
        const nextPlayer = currentPlayer === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
        this.stateManager = this.stateManager.setActivePlayer(nextPlayer);

        // Emit turn start
        this.eventEmitter.emit({
          type: GameEventType.TURN_START,
          timestamp: Date.now(),
          turnNumber: this.stateManager.getTurnNumber(),
          activePlayer: this.stateManager.getActivePlayer(),
        });

        // Execute all automatic phases until we reach MAIN phase
        for (let i = 0; i < phaseSequence.length; i++) {
          const phase = phaseSequence[i];
          const oldPhase = this.stateManager.getCurrentPhase();
          
          // Transition to the phase
          this.stateManager = this.phaseManager['transitionToPhase'](this.stateManager, phase);
          this.updateAllSubsystems();
          
          // Emit phase changed event
          this.phaseManager['emitPhaseChangedEvent'](oldPhase, phase, this.stateManager.getActivePlayer());
          
          // Execute phase if it's not MAIN
          if (phase !== Phase.MAIN) {
            const result = this.phaseManager['executePhase'](this.stateManager, phase);
            this.stateManager = result as GameStateManager;
            this.updateAllSubsystems();
          } else {
            // Reached MAIN phase, trigger AI if needed
            const aiPromise = this.triggerAIActionLoopIfNeeded();
            if (aiPromise) {
              // Return the promise so the caller can wait for AI to finish
              return aiPromise.then(() => {
                this.updateAllSubsystems();

                // Run defeat check
                const defeatResult = runDefeatCheck(this.stateManager);
                if (defeatResult.gameOver) {
                  this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
                  this.updateAllSubsystems();
                }
              });
            }
            break;
          }
        }
      } else {
        // Move to next phase
        const nextPhase = phaseSequence[currentIndex + 1];
        
        // Transition to new phase (doesn't emit event yet)
        this.stateManager = this.phaseManager['transitionToPhase'](this.stateManager, nextPhase);
        
        // Update subsystems with new phase BEFORE emitting event
        this.updateAllSubsystems();
        
        // Now emit the phase changed event so listeners get the correct state
        this.phaseManager['emitPhaseChangedEvent'](currentPhase, nextPhase, this.stateManager.getActivePlayer());
        
        // Only execute phase logic for non-interactive phases
        // MAIN phase should wait for player actions, not auto-execute
        if (nextPhase !== Phase.MAIN) {
          const result = this.phaseManager['executePhase'](this.stateManager, nextPhase);
          // Non-MAIN phases are always synchronous
          this.stateManager = result as GameStateManager;
        } else {
          // If the active player is an AI, trigger the AI action loop
          const aiPromise = this.triggerAIActionLoopIfNeeded();
          if (aiPromise) {
            // Return the promise so the caller can wait for AI to finish
            return aiPromise.then(() => {
              this.updateAllSubsystems();

              // Run defeat check
              const defeatResult = runDefeatCheck(this.stateManager);
              if (defeatResult.gameOver) {
                this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
                this.updateAllSubsystems();
              }
            });
          }
        }
      }

      this.updateAllSubsystems();

      // Run defeat check
      const defeatResult = runDefeatCheck(this.stateManager);
      if (defeatResult.gameOver) {
        this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
        this.updateAllSubsystems();
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'advancePhase',
        phase: this.stateManager.getState().phase,
      });

      if (error instanceof GameEngineError) {
        throw error;
      }
      throw new GameEngineError(
        `Phase advance failed: ${error instanceof Error ? error.message : String(error)}`,
        'ADVANCE_PHASE_ERROR'
      );
    }
  }

  /**
   * Trigger AI action loop if the active player is an AI
   * This is called when entering the MAIN phase
   * @returns Promise if AI is active, undefined otherwise
   */
  private triggerAIActionLoopIfNeeded(): Promise<void> | undefined {
    const activePlayer = this.stateManager.getActivePlayer();
    console.log('[GameEngine] triggerAIActionLoopIfNeeded called for', activePlayer);
    const player = this.players.get(activePlayer);
    
    if (!player) {
      console.log('[GameEngine] No player instance found for', activePlayer);
      return undefined;
    }
    
    console.log('[GameEngine] Player type:', player.type);
    
    if (player.type !== PlayerType.AI) {
      console.log('[GameEngine] Player is not AI, skipping action loop');
      return undefined;
    }
    
    console.log('[GameEngine] Starting AI action loop for', activePlayer);
    // Run the AI action loop asynchronously and return the promise
    return this.runAIActionLoop(player).catch(error => {
      this.errorHandler.handleError(error as Error, {
        action: 'runAIActionLoop',
        playerId: activePlayer,
      });
      // Re-throw so the caller knows there was an error
      throw error;
    });
  }

  /**
   * Run the AI action loop for the active player
   * @param player - The AI player instance
   */
  private async runAIActionLoop(player: Player): Promise<void> {
    console.log('[GameEngine] runAIActionLoop starting for', player.id);
    const { runMainPhaseWithCallback } = await import('../phases/MainPhase');
    const { ZoneManager } = await import('../zones/ZoneManager');
    
    // Initialize zone manager if needed
    if (!this.phaseManager['zoneManager']) {
      console.log('[GameEngine] Initializing zone manager');
      this.phaseManager.initializeZoneManager(this.stateManager);
    }
    
    try {
      console.log('[GameEngine] Calling runMainPhaseWithCallback');
      // Run the main phase with the AI player and a callback to update state after each action
      const result = await runMainPhaseWithCallback(
        this.stateManager,
        this.rules,
        this.eventEmitter,
        this.phaseManager['zoneManager']!,
        this.effectSystem,
        player,
        (newState) => {
          // Update GameEngine's state after each action
          console.log('[GameEngine] State update callback called');
          this.stateManager = newState;
          this.updateAllSubsystems();
        }
      );
      
      console.log('[GameEngine] runMainPhaseWithCallback completed');
      // Final update after all actions
      this.stateManager = result;
      this.updateAllSubsystems();
      
      // Emit final state changed event
      this.eventEmitter.emit({
        type: GameEventType.STATE_CHANGED,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[GameEngine] Error in runAIActionLoop:', error);
      throw error;
    }
  }

  // ============================================================================
  // Action Handler Methods
  // ============================================================================

  /**
   * Play a card from hand
   * @param playerId - The player playing the card
   * @param cardId - The card instance ID to play
   * @param targets - Optional targets for the card's effects
   * @returns True if the card was successfully played
   * @throws GameEngineError if the action is invalid
   */
  playCard(playerId: PlayerId, cardId: string, targets: Target[] = []): boolean {
    const startTime = performance.now();
    try {
      // Validate game state
      this.validateGameState();
      ValidationUtils.validateActivePlayer(this.stateManager.getState(), playerId);
      
      // Validate card exists
      const card = ValidationUtils.validateCardExists(this.stateManager.getState(), cardId);
      ValidationUtils.validateCardInZone(card, ZoneId.HAND, 'play card');
      ValidationUtils.validateCardController(card, playerId, 'play card');
      
      // Log action attempt
      this.gameLogger.logActionAttempt(playerId, ActionType.PLAY_CARD, {
        cardId,
        cardName: card.definition.name,
        targets,
      });
      
      // Record the action
      const action: GameAction = {
        type: ActionType.PLAY_CARD,
        playerId,
        cardId,
        timestamp: Date.now(),
      };
      this.recordAction(action);

      // Handle playing the card
      const playResult = handlePlayCard(
        this.stateManager,
        this.zoneManager,
        this.eventEmitter,
        playerId,
        cardId
      );

      if (!playResult.success) {
        this.gameLogger.logActionFailure(playerId, ActionType.PLAY_CARD, playResult.error || 'Failed to play card', {
          cardId,
          cardName: card.definition.name,
        });
        throw new IllegalActionError('play card', playResult.error || 'Failed to play card');
      }

      // Log successful action
      this.gameLogger.logAction(action);

      // Update state manager with the result FIRST
      this.stateManager = playResult.newState;
      
      // Update all subsystems so they have the latest state
      this.updateAllSubsystems();
      
      // NOW emit a state changed event so rendering can update
      // This ensures rendering reads the updated state
      this.eventEmitter.emit({
        type: GameEventType.STATE_CHANGED,
        timestamp: Date.now(),
      });

      // Resolve pending triggers
      this.resolvePendingTriggers();

      // Run defeat check
      const defeatResult = runDefeatCheck(this.stateManager);
      if (defeatResult.gameOver) {
        this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
        this.updateAllSubsystems();
      }

      const duration = performance.now() - startTime;
      this.gameLogger.logPerformance('playCard', duration, { cardId, cardName: card.definition.name });

      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'playCard',
        playerId,
        cardId,
        targets,
      });
      
      if (error instanceof GameEngineError) {
        throw error;
      }
      throw new GameEngineError(
        `Failed to play card: ${error instanceof Error ? error.message : String(error)}`,
        'PLAY_CARD_ERROR'
      );
    }
  }

  /**
   * Activate an effect on a card
   * @param playerId - The player activating the effect
   * @param cardId - The card with the effect
   * @param effectId - The effect definition ID
   * @param targets - Optional targets for the effect
   * @param values - Optional values for the effect
   * @returns True if the effect was successfully activated
   * @throws GameEngineError if the action is invalid
   */
  activateEffect(
    playerId: PlayerId,
    cardId: string,
    effectId: string,
    targets: Target[] = [],
    values: Map<string, any> = new Map()
  ): boolean {
    try {
      // Validate game state
      this.validateGameState();
      ValidationUtils.validateActivePlayer(this.stateManager.getState(), playerId);
      
      // Validate card exists
      const card = ValidationUtils.validateCardExists(this.stateManager.getState(), cardId);
      ValidationUtils.validateCardController(card, playerId, 'activate effect');

      // Record the action
      this.recordAction({
        type: ActionType.ACTIVATE_EFFECT,
        playerId,
        effectId,
        sourceCardId: cardId,
        timestamp: Date.now(),
      });

      // Activate the effect through the effect system
      const success = this.effectSystem.activateEffect(cardId, effectId, targets, values);

      if (success) {
        // Update state manager from effect system
        this.stateManager = this.effectSystem.getStateManager();
        this.updateAllSubsystems();

        // Resolve pending triggers
        this.resolvePendingTriggers();

        // Run defeat check
        const defeatResult = runDefeatCheck(this.stateManager);
        if (defeatResult.gameOver) {
          this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
          this.updateAllSubsystems();
        }
      }

      return success;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'activateEffect',
        playerId,
        cardId,
        effectId,
        targets,
      });
      
      if (error instanceof GameEngineError) {
        throw error;
      }
      throw new GameEngineError(
        `Failed to activate effect: ${error instanceof Error ? error.message : String(error)}`,
        'ACTIVATE_EFFECT_ERROR'
      );
    }
  }

  /**
   * Give a DON card to a character or leader
   * @param playerId - The player giving the DON
   * @param donId - The DON instance ID
   * @param targetCardId - The target card ID (character or leader)
   * @returns True if the DON was successfully given
   * @throws GameEngineError if the action is invalid
   */
  giveDon(playerId: PlayerId, donId: string, targetCardId: string): boolean {
    try {
      // Validate game state
      this.validateGameState();
      ValidationUtils.validateActivePlayer(this.stateManager.getState(), playerId);
      
      // Validate target card exists
      const targetCard = ValidationUtils.validateCardExists(this.stateManager.getState(), targetCardId);
      ValidationUtils.validateCardController(targetCard, playerId, 'give DON');

      // Record the action
      this.recordAction({
        type: ActionType.GIVE_DON,
        playerId,
        donId,
        targetCardId,
        timestamp: Date.now(),
      });

      // Handle giving DON
      const giveDonResult = handleGiveDon(
        this.stateManager,
        this.zoneManager,
        this.eventEmitter,
        playerId,
        donId,
        targetCardId
      );

      if (!giveDonResult.success) {
        throw new IllegalActionError('give DON', giveDonResult.error || 'Failed to give DON');
      }

      this.stateManager = giveDonResult.newState;
      this.updateAllSubsystems();

      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'giveDon',
        playerId,
        donId,
        targetCardId,
      });
      
      if (error instanceof GameEngineError) {
        throw error;
      }
      throw new GameEngineError(
        `Failed to give DON: ${error instanceof Error ? error.message : String(error)}`,
        'GIVE_DON_ERROR'
      );
    }
  }

  /**
   * Declare an attack
   * @param playerId - The player declaring the attack
   * @param attackerId - The attacking card ID
   * @param targetId - The target card ID
   * @returns True if the attack was successfully executed
   * @throws GameEngineError if the action is invalid
   */
  async declareAttack(playerId: PlayerId, attackerId: string, targetId: string): Promise<boolean> {
    const startTime = performance.now();
    try {
      // Validate game state
      this.validateGameState();
      ValidationUtils.validateActivePlayer(this.stateManager.getState(), playerId);
      
      // Validate attacker exists
      const attacker = ValidationUtils.validateCardExists(this.stateManager.getState(), attackerId);
      ValidationUtils.validateCardController(attacker, playerId, 'declare attack');
      
      // Validate target exists
      const target = ValidationUtils.validateCardExists(this.stateManager.getState(), targetId);

      // Log action attempt
      this.gameLogger.logActionAttempt(playerId, ActionType.DECLARE_ATTACK, {
        attackerId,
        attackerName: attacker.definition.name,
        targetId,
        targetName: target.definition.name,
      });

      // Record the action
      const action: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId,
        attackerId,
        targetId,
        timestamp: Date.now(),
      };
      this.recordAction(action);

      // Log attack declaration (using base power for logging)
      const attackerPower = attacker.definition.basePower || 0;
      const targetPower = target.definition.basePower || 0;
      this.gameLogger.logAttackDeclared(attackerId, targetId, attackerPower, targetPower);

      // Execute the attack through the battle system
      const battleResult = await this.battleSystem.executeAttack(attackerId, targetId);

      // Update state manager from battle system
      this.stateManager = this.battleSystem.getStateManager();
      this.updateAllSubsystems();

      // Resolve pending triggers
      this.resolvePendingTriggers();

      // Run defeat check
      const defeatResult = runDefeatCheck(this.stateManager);
      if (defeatResult.gameOver) {
        this.stateManager = this.stateManager.setGameOver(defeatResult.winner);
        this.updateAllSubsystems();
      }

      return battleResult.success;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'declareAttack',
        playerId,
        attackerId,
        targetId,
      });
      
      if (error instanceof GameEngineError) {
        throw error;
      }
      throw new GameEngineError(
        `Failed to declare attack: ${error instanceof Error ? error.message : String(error)}`,
        'DECLARE_ATTACK_ERROR'
      );
    }
  }

  // ============================================================================
  // State Query Methods
  // ============================================================================

  /**
   * Get the current game state (readonly)
   * @returns The current game state
   */
  getState(): Readonly<GameState> {
    return this.stateManager.getState();
  }

  /**
   * Get the state manager (for internal use by rendering system)
   * WARNING: This returns the actual state manager, not a copy.
   * Only use this when you need to read the current state without creating snapshots.
   * @returns The current state manager
   */
  getStateManager(): GameStateManager {
    // Debug: Log what state we're returning
    return this.stateManager;
  }

  /**
   * Check if a player can perform a specific action
   * @param playerId - The player attempting the action
   * @param action - The action to check
   * @returns True if the action is legal
   */
  canPerformAction(playerId: PlayerId, action: Action): boolean {
    // Basic validation
    if (this.stateManager.isGameOver()) {
      return false;
    }

    if (this.stateManager.getActivePlayer() !== playerId) {
      return false;
    }

    // Action-specific validation
    switch (action.type) {
      case ActionType.PLAY_CARD:
        return this.canPlayCard(playerId, (action as any).cardId);

      case ActionType.ACTIVATE_EFFECT:
        return this.canActivateEffect(playerId, (action as any).sourceCardId, (action as any).effectId);

      case ActionType.GIVE_DON:
        return this.canGiveDon(playerId, (action as any).donId, (action as any).targetCardId);

      case ActionType.DECLARE_ATTACK:
        return this.canDeclareAttack(playerId, (action as any).attackerId, (action as any).targetId);

      default:
        return false;
    }
  }

  /**
   * Get all legal actions for a player
   * @param playerId - The player to get actions for
   * @returns Array of legal actions
   */
  getLegalActions(playerId: PlayerId): Action[] {
    const actions: Action[] = [];

    // Can't perform actions if game is over or not active player
    if (this.stateManager.isGameOver() || this.stateManager.getActivePlayer() !== playerId) {
      return actions;
    }

    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      return actions;
    }

    // Get legal card plays from hand
    for (const card of player.zones.hand) {
      if (this.canPlayCard(playerId, card.id)) {
        actions.push({
          type: ActionType.PLAY_CARD,
          playerId,
          data: { cardId: card.id },
        });
      }
    }

    // Get legal DON gives
    for (const don of player.zones.costArea) {
      // Check each potential target
      const potentialTargets = [
        player.zones.leaderArea,
        ...player.zones.characterArea,
      ].filter(Boolean);

      for (const target of potentialTargets) {
        if (this.canGiveDon(playerId, don.id, target!.id)) {
          actions.push({
            type: ActionType.GIVE_DON,
            playerId,
            data: { donId: don.id, targetCardId: target!.id },
          });
        }
      }
    }

    // Get legal attacks
    const attackers = [
      player.zones.leaderArea,
      ...player.zones.characterArea,
    ].filter(Boolean);

    for (const attacker of attackers) {
      const legalTargets = this.battleSystem.getLegalTargets(attacker!.id);
      for (const target of legalTargets) {
        if (this.canDeclareAttack(playerId, attacker!.id, target.id)) {
          actions.push({
            type: ActionType.DECLARE_ATTACK,
            playerId,
            data: { attackerId: attacker!.id, targetId: target.id },
          });
        }
      }
    }

    return actions;
  }

  /**
   * Get legal attack targets for an attacker
   * @param attackerId - The attacking card ID
   * @returns Array of legal target card instances
   */
  getLegalAttackTargets(attackerId: string): string[] {
    try {
      // Validate card exists
      const attacker = this.stateManager.getCard(attackerId);
      if (!attacker) {
        return [];
      }

      // Get legal targets from battle system
      const targets = this.battleSystem.getLegalTargets(attackerId);
      return targets.map(t => t.id);
    } catch (error) {
      return [];
    }
  }

  // ============================================================================
  // Event System Methods
  // ============================================================================

  /**
   * Subscribe to a game event
   * @param eventType - The event type to listen for
   * @param handler - The handler function
   */
  on<T extends AnyGameEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    this.eventEmitter.on(eventType, handler);
  }

  /**
   * Unsubscribe from a game event
   * @param eventType - The event type to stop listening for
   * @param handler - The handler function to remove
   */
  off<T extends AnyGameEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    this.eventEmitter.off(eventType, handler);
  }

  /**
   * Emit a game event (for internal use)
   * @param event - The event to emit
   */
  private emit<T extends AnyGameEvent>(event: T): void {
    this.eventEmitter.emit(event);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Update all subsystems with the current state manager
   */
  private updateAllSubsystems(): void {
    this.zoneManager.updateStateManager(this.stateManager);
    this.effectSystem.updateStateManager(this.stateManager);
    this.triggerQueue.updateStateManager(this.stateManager);
    this.battleSystem.updateStateManager(this.stateManager);
    this.modifierManager.updateStateManager(this.stateManager);
    // RenderingInterface reads directly from engine, no update needed
  }

  /**
   * Resolve all pending triggers
   */
  private resolvePendingTriggers(): void {
    this.triggerQueue.resolveAllPendingTriggers();
    // TriggerQueue updates state internally, get the updated state
    this.stateManager = this.triggerQueue.getStateManager();
    this.updateAllSubsystems();
  }

  /**
   * Validate that the game is in a valid state for actions
   */
  private validateGameState(): void {
    if (!this.isSetup) {
      throw new GameEngineError('Game must be setup before performing actions', 'NOT_SETUP');
    }

    ValidationUtils.validateGameNotOver(this.stateManager.getState());
  }

  /**
   * Record a game action in history
   */
  private recordAction(action: GameAction): void {
    this.stateManager = this.stateManager.addToHistory(action);
  }

  /**
   * Check if a player can play a specific card
   */
  private canPlayCard(playerId: PlayerId, cardId: string): boolean {
    const card = this.stateManager.getCard(cardId);
    if (!card) return false;

    // Card must be in hand
    if (card.zone !== 'HAND') return false;

    // Card must be owned by player
    if (card.controller !== playerId) return false;

    // Check if player can afford the cost
    const cost = card.definition.baseCost ?? 0;
    const player = this.stateManager.getPlayer(playerId);
    if (!player) return false;

    const activeDon = player.zones.costArea.filter(d => d.state === 'ACTIVE');
    if (activeDon.length < cost) return false;

    // Check character area limit
    if (card.definition.category === 'CHARACTER') {
      if (player.zones.characterArea.length >= this.rules.getMaxCharacterArea()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a player can activate a specific effect
   */
  private canActivateEffect(playerId: PlayerId, cardId: string, effectId: string): boolean {
    const card = this.stateManager.getCard(cardId);
    if (!card) return false;

    // Card must be controlled by player
    if (card.controller !== playerId) return false;

    // Find the effect
    const effect = card.definition.effects.find(e => e.id === effectId);
    if (!effect) return false;

    // Effect must be ACTIVATE type
    if (effect.timingType !== 'ACTIVATE') return false;

    // Check once-per-turn restriction
    if (effect.oncePerTurn) {
      const usedThisTurn = card.flags.get(`effect_${effectId}_used_turn`) === this.stateManager.getTurnNumber();
      if (usedThisTurn) return false;
    }

    return true;
  }

  /**
   * Check if a player can give a DON to a target
   */
  private canGiveDon(playerId: PlayerId, donId: string, targetCardId: string): boolean {
    const don = this.stateManager.getDon(donId);
    if (!don) return false;

    // DON must be owned by player
    if (don.owner !== playerId) return false;

    // DON must be active in cost area
    if (don.zone !== 'COST_AREA' || don.state !== 'ACTIVE') return false;

    // Target must exist and be on field
    const target = this.stateManager.getCard(targetCardId);
    if (!target) return false;

    // Target must be controlled by player
    if (target.controller !== playerId) return false;

    // Target must be in character area or leader area
    if (target.zone !== 'CHARACTER_AREA' && target.zone !== 'LEADER_AREA') return false;

    return true;
  }

  /**
   * Check if a player can declare an attack
   */
  private canDeclareAttack(playerId: PlayerId, attackerId: string, targetId: string): boolean {
    return this.battleSystem.canAttack(attackerId, targetId);
  }

  /**
   * Determine the reason for game over
   */
  private determineGameOverReason(): string {
    const winner = this.stateManager.getWinner();
    if (!winner) {
      return 'Draw - Infinite loop detected';
    }

    const loser = winner === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
    const loserPlayer = this.stateManager.getPlayer(loser);

    if (!loserPlayer) {
      return 'Unknown';
    }

    // Check for empty deck
    if (loserPlayer.zones.deck.length === 0) {
      return `${loser} ran out of cards`;
    }

    // Check for empty life
    if (loserPlayer.zones.life.length === 0) {
      return `${loser} ran out of life`;
    }

    return 'Victory';
  }

  /**
   * Get the rules context
   * @returns The rules context
   */
  getRules(): RulesContext {
    return this.rules;
  }

  /**
   * Get the event emitter
   * @returns The event emitter
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * Check if the game is setup
   * @returns True if the game is setup
   */
  isGameSetup(): boolean {
    return this.isSetup;
  }

  /**
   * Get the error handler
   * @returns The error handler
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Enable or disable debug mode
   * @param enabled - Whether to enable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.errorHandler.setDebugMode(enabled);
  }

  /**
   * Check if debug mode is enabled
   * @returns True if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.errorHandler.isDebugMode();
  }

  /**
   * Get error history
   * @returns Array of error events
   */
  getErrorHistory(): readonly import('../utils/ErrorHandler').ErrorEvent[] {
    return this.errorHandler.getErrorHistory();
  }

  /**
   * Get recent errors
   * @param count - Number of recent errors to retrieve (default: 10)
   * @returns Array of recent error events
   */
  getRecentErrors(count: number = 10): readonly import('../utils/ErrorHandler').ErrorEvent[] {
    return this.errorHandler.getRecentErrors(count);
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHandler.clearErrorHistory();
  }

  /**
   * Get errors by code
   * @param code - Error code to filter by
   * @returns Array of error events with the specified code
   */
  getErrorsByCode(code: string): readonly import('../utils/ErrorHandler').ErrorEvent[] {
    return this.errorHandler.getErrorsByCode(code);
  }

  /**
   * Check if a specific error code has occurred
   * @param code - Error code to check
   * @returns True if the error has occurred
   */
  hasErrorOccurred(code: string): boolean {
    return this.errorHandler.hasErrorOccurred(code);
  }

  // ============================================================================
  // Player Interface Methods
  // ============================================================================

  /**
   * Set a Player instance for a player ID
   * @param playerId - The player ID
   * @param player - The Player instance
   */
  setPlayer(playerId: PlayerId, player: Player): void {
    if (player.id !== playerId) {
      throw new GameEngineError(
        `Player instance ID (${player.id}) does not match playerId (${playerId})`,
        'PLAYER_ID_MISMATCH'
      );
    }
    this.players.set(playerId, player);
  }

  /**
   * Get a Player instance for a player ID
   * @param playerId - The player ID
   * @returns The Player instance or undefined if not set
   */
  getPlayer(playerId: PlayerId): Player | undefined {
    return this.players.get(playerId);
  }

  /**
   * Check if a Player instance is set for a player ID
   * @param playerId - The player ID
   * @returns True if a Player instance is set
   */
  hasPlayer(playerId: PlayerId): boolean {
    return this.players.has(playerId);
  }

  // ============================================================================
  // Logging Methods
  // ============================================================================

  /**
   * Get the game logger
   * @returns The game logger instance
   */
  getGameLogger(): GameLogger {
    return this.gameLogger;
  }

  /**
   * Set the log level
   * @param level - The minimum log level to record
   */
  setLogLevel(level: LogLevel): void {
    this.gameLogger.setLogLevel(level);
  }

  /**
   * Enable or disable console logging
   * @param enabled - Whether to output logs to console
   */
  setConsoleLogging(enabled: boolean): void {
    this.gameLogger.setConsoleEnabled(enabled);
  }

  /**
   * Export logs as JSON
   * @returns JSON string of all log entries
   */
  exportLogsJSON(): string {
    return this.gameLogger.exportJSON();
  }

  /**
   * Export logs as CSV
   * @returns CSV string of all log entries
   */
  exportLogsCSV(): string {
    return this.gameLogger.exportCSV();
  }

  /**
   * Export logs as plain text
   * @returns Plain text string of all log entries
   */
  exportLogsText(): string {
    return this.gameLogger.exportText();
  }

  /**
   * Get log statistics
   * @returns Statistics about the logs
   */
  getLogStats() {
    return this.gameLogger.getStats();
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.gameLogger.clear();
  }

  /**
   * Get all log entries
   * @returns Array of all log entries
   */
  getLogEntries() {
    return this.gameLogger.getEntries();
  }

  /**
   * Route a decision request to the appropriate Player instance
   * This method provides a unified interface for all player decisions
   * @param playerId - The player making the decision
   * @param decisionType - The type of decision being made
   * @param args - Arguments for the decision method
   * @returns Promise resolving to the player's decision
   */
  async requestPlayerDecision<T>(
    playerId: PlayerId,
    decisionType: 'chooseAction' | 'chooseMulligan' | 'chooseBlocker' | 'chooseCounterAction' | 'chooseTarget' | 'chooseValue',
    ...args: any[]
  ): Promise<T> {
    const player = this.players.get(playerId);
    
    if (!player) {
      throw new GameEngineError(
        `No Player instance registered for ${playerId}`,
        'PLAYER_NOT_FOUND'
      );
    }

    try {
      // Route to the appropriate Player method
      switch (decisionType) {
        case 'chooseAction':
          return await player.chooseAction(args[0], args[1]) as T;
        case 'chooseMulligan':
          return await player.chooseMulligan(args[0], args[1]) as T;
        case 'chooseBlocker':
          return await player.chooseBlocker(args[0], args[1], args[2]) as T;
        case 'chooseCounterAction':
          return await player.chooseCounterAction(args[0], args[1]) as T;
        case 'chooseTarget':
          return await player.chooseTarget(args[0], args[1], args[2]) as T;
        case 'chooseValue':
          return await player.chooseValue(args[0], args[1], args[2]) as T;
        default:
          throw new GameEngineError(
            `Unknown decision type: ${decisionType}`,
            'UNKNOWN_DECISION_TYPE'
          );
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        action: 'requestPlayerDecision',
        playerId,
        decisionType,
      });
      throw error;
    }
  }
}
