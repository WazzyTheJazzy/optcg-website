/**
 * MainPhase.ts
 * 
 * Implements the Main Phase logic:
 * - Trigger START_OF_MAIN auto effects
 * - Implement action loop that queries player for actions until they pass
 * - Define Action types: PlayCard, ActivateEffect, GiveDon, Attack, EndMain
 * - Route actions to appropriate handlers
 * - Resolve pending triggers after each action
 */

import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import { BattleSystem } from '../battle/BattleSystem';
import { EffectSystem } from '../effects/EffectSystem';
import { handlePlayCard as handlePlayCardImpl } from './CardPlayHandler';
import { handleGiveDon as handleGiveDonImpl } from './DonHandler';
import {
  PlayerId,
  ActionType,
  GameAction,
  TriggerTiming,
  EffectTimingType,
  CardInstance,
  CardState,
  ZoneId,
  Phase,
} from '../core/types';

// ============================================================================
// Action Type Definitions
// ============================================================================

/**
 * Base interface for all main phase actions
 */
export interface MainPhaseAction {
  type: ActionType;
  playerId: PlayerId;
}

/**
 * Action to play a card from hand
 */
export interface PlayCardAction extends MainPhaseAction {
  type: ActionType.PLAY_CARD;
  cardId: string;
  targets?: string[]; // Optional target card IDs for effects
}

/**
 * Action to activate an effect on a card
 */
export interface ActivateEffectAction extends MainPhaseAction {
  type: ActionType.ACTIVATE_EFFECT;
  cardId: string;
  effectId: string;
  targets?: string[];
}

/**
 * Action to give DON to a character or leader
 */
export interface GiveDonAction extends MainPhaseAction {
  type: ActionType.GIVE_DON;
  donId: string;
  targetCardId: string;
}

/**
 * Action to end the main phase
 */
export interface EndMainAction extends MainPhaseAction {
  type: ActionType.END_PHASE;
}

/**
 * Union type of all main phase actions
 */
export type MainPhaseActionUnion =
  | PlayCardAction
  | ActivateEffectAction
  | GiveDonAction
  | import('../core/types').AttackAction
  | EndMainAction;

// ============================================================================
// Player Input Interface (DEPRECATED - Use Player interface from types.ts)
// ============================================================================

/**
 * Interface for querying player for actions
 * This will be implemented by AI, network, or UI layer
 * @deprecated Use Player interface from types.ts instead
 */
export interface PlayerInputProvider {
  /**
   * Query the player for their next action
   * @param playerId - The player to query
   * @param availableActions - List of available action types
   * @param state - Current game state for decision making
   * @returns The chosen action or null to pass
   */
  getNextAction(
    playerId: PlayerId,
    availableActions: ActionType[],
    state: GameStateManager
  ): Promise<MainPhaseActionUnion | null>;
}

// ============================================================================
// Action Handler Results
// ============================================================================

export interface ActionResult {
  success: boolean;
  error?: string;
  newState: GameStateManager;
}

// ============================================================================
// Main Phase Execution
// ============================================================================

/**
 * Execute the Main Phase
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for activating effects
 * @param player - Optional Player instance for action loop
 * @returns Updated game state manager (or Promise if player is provided)
 */
export function runMainPhase(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager,
  effectSystem: EffectSystem,
  player?: import('../core/types').Player
): GameStateManager | Promise<GameStateManager> {
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();

  // 1. Trigger START_OF_MAIN auto effects
  currentState = triggerStartOfMainEffects(currentState, activePlayer);

  // 2. Resolve any pending triggers from START_OF_MAIN effects
  currentState = resolvePendingTriggers(currentState);

  // 3. Run action loop if player is available
  if (player) {
    return runActionLoop(currentState, rules, eventEmitter, zoneManager, effectSystem, player);
  }

  return currentState;
}

/**
 * Execute the Main Phase with a callback after each action
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for activating effects
 * @param player - Player instance for action loop
 * @param onStateUpdate - Callback called after each action with the new state
 * @returns Updated game state manager
 */
export async function runMainPhaseWithCallback(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager,
  effectSystem: EffectSystem,
  player: import('../core/types').Player,
  onStateUpdate: (newState: GameStateManager) => void
): Promise<GameStateManager> {
  console.log('[MainPhase] runMainPhaseWithCallback called for', player.id);
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();

  // 1. Trigger START_OF_MAIN auto effects
  currentState = triggerStartOfMainEffects(currentState, activePlayer);

  // 2. Resolve any pending triggers from START_OF_MAIN effects
  currentState = resolvePendingTriggers(currentState);

  // 3. Run action loop with callback
  console.log('[MainPhase] Starting action loop with callback');
  return runActionLoopWithCallback(currentState, rules, eventEmitter, zoneManager, effectSystem, player, onStateUpdate);
}

/**
 * Trigger START_OF_MAIN auto effects
 * @param stateManager - The current game state manager
 * @param activePlayer - The active player ID
 * @returns Updated game state manager with triggers enqueued
 */
function triggerStartOfMainEffects(
  stateManager: GameStateManager,
  activePlayer: PlayerId
): GameStateManager {
  let currentState = stateManager;
  const state = currentState.getState();

  // Collect all cards that might have START_OF_MAIN effects
  for (const [playerId, player] of state.players.entries()) {
    const allCards = [
      ...player.zones.characterArea,
      player.zones.leaderArea,
      player.zones.stageArea,
    ].filter((card): card is CardInstance => card !== null && card !== undefined);

    for (const card of allCards) {
      // Check each effect on the card
      for (const effect of card.definition.effects) {
        // Only process AUTO effects with START_OF_MAIN timing
        if (
          effect.timingType === EffectTimingType.AUTO &&
          effect.triggerTiming === TriggerTiming.START_OF_MAIN
        ) {
          // Enqueue the trigger
          // Priority: active player's triggers resolve first
          const priority = playerId === activePlayer ? 0 : 1;

          currentState = currentState.addPendingTrigger({
            effectDefinition: effect,
            source: card,
            controller: playerId,
            event: {
              type: 'PHASE_CHANGED' as any, // Generic event for phase triggers
              playerId: activePlayer,
              cardId: null,
              data: { phase: 'MAIN' },
              timestamp: Date.now(),
            },
            priority,
          });
        }
      }
    }
  }

  return currentState;
}

/**
 * Resolve all pending triggers in the queue
 * @param stateManager - The current game state manager
 * @returns Updated game state manager after resolving triggers
 */
function resolvePendingTriggers(stateManager: GameStateManager): GameStateManager {
  let currentState = stateManager;
  const state = currentState.getState();

  // Sort triggers by priority (turn player first)
  const sortedTriggers = [...state.pendingTriggers].sort((a, b) => a.priority - b.priority);

  // Clear the pending triggers queue
  currentState = currentState.clearPendingTriggers();

  // Resolve each trigger
  // Note: This is a placeholder - actual effect resolution will be implemented
  // in the effect system tasks (tasks 24-27)
  for (const trigger of sortedTriggers) {
    // TODO: Call effect system to resolve trigger
    // For now, we just acknowledge that triggers would be resolved here
    console.log(`[MainPhase] Would resolve trigger: ${trigger.effectDefinition.label} from ${trigger.source.definition.name}`);
  }

  return currentState;
}

/**
 * Run the main phase action loop using Player interface with state update callback
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for activating effects
 * @param player - Player instance
 * @param onStateUpdate - Callback called after each action
 * @returns Updated game state manager after action loop completes
 */
async function runActionLoopWithCallback(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager,
  effectSystem: EffectSystem,
  player: import('../core/types').Player,
  onStateUpdate: (newState: GameStateManager) => void
): Promise<GameStateManager> {
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();
  let continueLoop = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 1000; // Safety limit to prevent infinite loops

  while (continueLoop && !currentState.isGameOver() && iterationCount < MAX_ITERATIONS) {
    iterationCount++;

    // Get all legal actions for the active player
    const legalActions = getLegalActions(currentState, activePlayer, zoneManager, effectSystem);
    
    // Log available actions for debugging
    console.log(`[MainPhase] Iteration ${iterationCount}: ${legalActions.length} legal actions available for ${activePlayer}`);
    console.log(`[MainPhase] Action types:`, legalActions.map(a => a.type).join(', '));
    
    // Log specific action details
    const actionCounts = legalActions.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[MainPhase] Action breakdown:`, actionCounts);

    // Query player for next action using Player interface
    const action = await player.chooseAction(legalActions, currentState.getState());
    
    console.log(`[MainPhase] Player chose action:`, action ? action.type : 'null (pass)');

    // Check if game is over after getting action (action might have side effects)
    if (currentState.isGameOver()) {
      break;
    }

    // If player passes or chooses to end main phase, exit loop
    if (!action || action.type === ActionType.END_PHASE) {
      continueLoop = false;
      break;
    }

    // Execute the action (await if it returns a promise)
    console.log(`[MainPhase] Executing action:`, action.type);
    const result = await executeAction(currentState, action, rules, eventEmitter, zoneManager, effectSystem);

    if (result.success) {
      console.log(`[MainPhase] Action succeeded, updating state`);
      currentState = result.newState;

      // Resolve any pending triggers after the action
      currentState = resolvePendingTriggers(currentState);
      
      // Call the callback to update GameEngine's state
      onStateUpdate(currentState);
      
      // Emit state changed event after each action so UI updates incrementally
      eventEmitter.emit({
        type: 'STATE_CHANGED' as any,
        timestamp: Date.now(),
      });
      
      // Log state after action
      const player = currentState.getPlayer(activePlayer);
      if (player) {
        console.log(`[MainPhase] After action - Hand: ${player.zones.hand.length}, Characters: ${player.zones.characterArea.length}, Active DON: ${player.zones.costArea.filter(d => d.state === 'ACTIVE').length}`);
      }
    } else {
      // Action failed - log error but continue loop to allow player to try another action
      console.error(`[MainPhase] Action failed: ${result.error}`);
      // Don't exit loop - let the player try another action or choose to end phase
    }

    // Check if game is over after executing action
    if (currentState.isGameOver()) {
      break;
    }
  }

  if (iterationCount >= MAX_ITERATIONS) {
    console.warn('[MainPhase] Max iterations reached, exiting action loop');
  }

  return currentState;
}

/**
 * Run the main phase action loop using Player interface
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for activating effects
 * @param player - Player instance
 * @returns Updated game state manager after action loop completes
 */
async function runActionLoop(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager,
  effectSystem: EffectSystem,
  player: import('../core/types').Player
): Promise<GameStateManager> {
  console.log('[MainPhase] runActionLoop called (WITHOUT callback) for', player.id);
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();
  let continueLoop = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 1000; // Safety limit to prevent infinite loops

  while (continueLoop && !currentState.isGameOver() && iterationCount < MAX_ITERATIONS) {
    iterationCount++;

    // Get all legal actions for the active player
    const legalActions = getLegalActions(currentState, activePlayer, zoneManager, effectSystem);
    
    // Log available actions for debugging
    console.log(`[MainPhase] Iteration ${iterationCount}: ${legalActions.length} legal actions available for ${activePlayer}`);
    console.log(`[MainPhase] Action types:`, legalActions.map(a => a.type).join(', '));
    
    // Log specific action details
    const actionCounts = legalActions.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[MainPhase] Action breakdown:`, actionCounts);

    // Query player for next action using Player interface
    const action = await player.chooseAction(legalActions, currentState.getState());
    
    console.log(`[MainPhase] Player chose action:`, action ? action.type : 'null (pass)');

    // Check if game is over after getting action (action might have side effects)
    if (currentState.isGameOver()) {
      break;
    }

    // If player passes or chooses to end main phase, exit loop
    if (!action || action.type === ActionType.END_PHASE) {
      continueLoop = false;
      break;
    }

    // Execute the action (await if it returns a promise)
    console.log(`[MainPhase] Executing action:`, action.type);
    const result = await executeAction(currentState, action, rules, eventEmitter, zoneManager, effectSystem);

    if (result.success) {
      console.log(`[MainPhase] Action succeeded, updating state`);
      currentState = result.newState;

      // Resolve any pending triggers after the action
      currentState = resolvePendingTriggers(currentState);
      
      // Emit state changed event after each action so UI updates incrementally
      eventEmitter.emit({
        type: 'STATE_CHANGED' as any,
        timestamp: Date.now(),
      });
      
      // Log state after action
      const player = currentState.getPlayer(activePlayer);
      if (player) {
        console.log(`[MainPhase] After action - Hand: ${player.zones.hand.length}, Characters: ${player.zones.characterArea.length}, Active DON: ${player.zones.costArea.filter(d => d.state === 'ACTIVE').length}`);
      }
    } else {
      // Action failed - log error but continue loop to allow player to try another action
      console.error(`[MainPhase] Action failed: ${result.error}`);
      // Don't exit loop - let the player try another action or choose to end phase
    }

    // Check if game is over after executing action
    if (currentState.isGameOver()) {
      break;
    }
  }

  if (iterationCount >= MAX_ITERATIONS) {
    console.warn('[MainPhase] Max iterations reached, exiting action loop');
  }

  return currentState;
}

/**
 * Get available action types for a player
 * @param stateManager - The current game state manager
 * @param playerId - The player ID
 * @returns Array of available action types
 * @deprecated Use getLegalActions instead
 */
function getAvailableActions(stateManager: GameStateManager, playerId: PlayerId): ActionType[] {
  const actions: ActionType[] = [];

  // Always can end phase
  actions.push(ActionType.END_PHASE);

  // Check if player can play cards (has cards in hand)
  const player = stateManager.getPlayer(playerId);
  if (player && player.zones.hand.length > 0) {
    actions.push(ActionType.PLAY_CARD);
  }

  // Check if player can activate effects
  // TODO: This requires checking for ACTIVATE effects on field cards
  // For now, we include it as potentially available
  actions.push(ActionType.ACTIVATE_EFFECT);

  // Check if player can give DON (has active DON in cost area)
  if (player && player.zones.costArea.some(don => don.state === 'ACTIVE')) {
    actions.push(ActionType.GIVE_DON);
  }

  // Check if player can attack (has active characters/leader)
  if (player) {
    const canAttack =
      player.zones.characterArea.some(card => card.state === 'ACTIVE') ||
      (player.zones.leaderArea && player.zones.leaderArea.state === 'ACTIVE');
    if (canAttack) {
      actions.push(ActionType.DECLARE_ATTACK);
    }
  }

  return actions;
}

/**
 * Get all legal actions for a player as GameAction objects
 * @param stateManager - The current game state manager
 * @param playerId - The player ID
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for checking activatable effects
 * @returns Array of legal GameAction objects
 */
export function getLegalActions(
  stateManager: GameStateManager,
  playerId: PlayerId,
  zoneManager: ZoneManager,
  effectSystem?: EffectSystem
): import('../core/types').GameAction[] {
  const actions: import('../core/types').GameAction[] = [];
  const player = stateManager.getPlayer(playerId);
  
  if (!player) {
    return actions;
  }

  // Always can end phase
  actions.push({
    type: ActionType.END_PHASE,
    playerId,
    timestamp: Date.now(),
  });

  // Get legal card plays from hand
  for (const card of player.zones.hand) {
    // Check if player can afford the card
    const cost = card.definition.baseCost ?? 0;
    const activeDon = player.zones.costArea.filter(d => d.state === 'ACTIVE');
    if (activeDon.length >= cost) {
      actions.push({
        type: ActionType.PLAY_CARD,
        playerId,
        cardId: card.id,
        timestamp: Date.now(),
      });
    }
  }

  // Get legal effect activations (if effectSystem is provided)
  if (effectSystem) {
    // Check all cards in play for activatable effects
    const cardsInPlay = [
      player.zones.leaderArea,
      player.zones.stageArea,
      ...player.zones.characterArea,
    ].filter((card): card is CardInstance => card !== null && card !== undefined);

    for (const card of cardsInPlay) {
      // Check each effect on the card
      for (const effect of card.definition.effects) {
        // Only check ACTIVATE effects with [Activate: Main] timing
        if (
          effect.timingType === EffectTimingType.ACTIVATE &&
          effect.label &&
          effect.label.toLowerCase().includes('activate: main')
        ) {
          // Check if the effect can be activated
          if (effectSystem.canActivateEffect(card.id, effect.id, playerId)) {
            actions.push({
              type: ActionType.ACTIVATE_EFFECT,
              playerId,
              effectId: effect.id,
              sourceCardId: card.id,
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  }

  // Get legal DON gives
  const activeDon = player.zones.costArea.filter(don => don.state === 'ACTIVE');
  for (const don of activeDon) {
    // Check each potential target (leader and characters)
    const potentialTargets = [
      player.zones.leaderArea,
      ...player.zones.characterArea,
    ].filter(Boolean);

    for (const target of potentialTargets) {
      if (target) {
        actions.push({
          type: ActionType.GIVE_DON,
          playerId,
          donId: don.id,
          targetCardId: target.id,
          timestamp: Date.now(),
        });
      }
    }
  }

  // Get legal attacks
  // Include cards that are ACTIVE or have Rush keyword (Rush allows attacking when rested)
  const attackers = [
    player.zones.leaderArea,
    ...player.zones.characterArea,
  ].filter(card => {
    if (!card) return false;
    // Must be ACTIVE or have Rush keyword
    const canAttackBasedOnState = card.state === 'ACTIVE' || card.definition.keywords.includes('Rush');
    // Must not have attacked this turn already
    const hasNotAttackedYet = !stateManager.hasCardAttackedThisTurn(card.id);
    return canAttackBasedOnState && hasNotAttackedYet;
  });

  for (const attacker of attackers) {
    if (attacker) {
      // Get opponent
      const opponent = playerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
      const opponentPlayer = stateManager.getPlayer(opponent);
      
      if (opponentPlayer) {
        // Can always attack opponent's leader
        if (opponentPlayer.zones.leaderArea) {
          actions.push({
            type: ActionType.DECLARE_ATTACK,
            playerId,
            attackerId: attacker.id,
            targetId: opponentPlayer.zones.leaderArea.id,
            timestamp: Date.now(),
          });
        }
        
        // Can attack rested characters
        const restedCharacters = opponentPlayer.zones.characterArea.filter(
          card => card.state === 'RESTED'
        );
        for (const target of restedCharacters) {
          actions.push({
            type: ActionType.DECLARE_ATTACK,
            playerId,
            attackerId: attacker.id,
            targetId: target.id,
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  return actions;
}

/**
 * Execute a main phase action
 * @param stateManager - The current game state manager
 * @param action - The action to execute (GameAction)
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for activating effects
 * @returns Action result with success status and new state (or Promise for async actions)
 */
function executeAction(
  stateManager: GameStateManager,
  action: import('../core/types').GameAction,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager,
  effectSystem?: EffectSystem
): ActionResult | Promise<ActionResult> {
  // Route to appropriate handler based on action type
  switch (action.type) {
    case ActionType.PLAY_CARD:
      return handlePlayCardFromGameAction(stateManager, action, rules, eventEmitter, zoneManager, effectSystem);
    case ActionType.ACTIVATE_EFFECT:
      return handleActivateEffectFromGameAction(stateManager, action, rules, eventEmitter, effectSystem);
    case ActionType.GIVE_DON:
      return handleGiveDonFromGameAction(stateManager, action, rules, eventEmitter, zoneManager);
    case ActionType.DECLARE_ATTACK:
      return handleAttackFromGameAction(stateManager, action, rules, eventEmitter);
    case ActionType.END_PHASE:
      return { success: true, newState: stateManager };
    default:
      return {
        success: false,
        error: 'Unknown action type',
        newState: stateManager,
      };
  }
}

// ============================================================================
// Action Handlers (Placeholders for future implementation)
// ============================================================================

/**
 * Handle playing a card from hand
 * @param stateManager - The current game state manager
 * @param action - The play card action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for triggering effects
 * @returns Action result
 */
function handlePlayCard(
  stateManager: GameStateManager,
  action: PlayCardAction,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager,
  effectSystem?: EffectSystem
): ActionResult {
  return handlePlayCardImpl(
    stateManager,
    zoneManager,
    eventEmitter,
    action.playerId,
    action.cardId,
    effectSystem
  );
}

/**
 * Handle playing a card from GameAction
 * @param stateManager - The current game state manager
 * @param action - The game action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @param effectSystem - The effect system for triggering effects
 * @returns Action result
 */
function handlePlayCardFromGameAction(
  stateManager: GameStateManager,
  action: import('../core/types').GameAction,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager,
  effectSystem?: EffectSystem
): ActionResult {
  if (action.type !== ActionType.PLAY_CARD) {
    return { success: false, error: 'Invalid action type', newState: stateManager };
  }
  const cardId = action.cardId;
  return handlePlayCardImpl(
    stateManager,
    zoneManager,
    eventEmitter,
    action.playerId,
    cardId,
    effectSystem
  );
}

/**
 * Handle activating an effect
 * @param stateManager - The current game state manager
 * @param action - The activate effect action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Action result
 */
function handleActivateEffect(
  stateManager: GameStateManager,
  action: ActivateEffectAction,
  rules: RulesContext,
  eventEmitter: EventEmitter
): ActionResult {
  // TODO: This will be implemented in task 24 (Implement EffectSystem core)
  // For now, return a placeholder result
  console.log(`[MainPhase] Would activate effect: ${action.effectId} on card ${action.cardId}`);
  return {
    success: false,
    error: 'Effect activation not yet implemented (task 24)',
    newState: stateManager,
  };
}

/**
 * Handle activating an effect from GameAction
 * @param stateManager - The current game state manager
 * @param action - The game action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param effectSystem - The effect system for activating effects
 * @returns Action result
 */
function handleActivateEffectFromGameAction(
  stateManager: GameStateManager,
  action: import('../core/types').GameAction,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  effectSystem?: EffectSystem
): ActionResult {
  if (action.type !== ActionType.ACTIVATE_EFFECT) {
    return { success: false, error: 'Invalid action type', newState: stateManager };
  }
  
  const cardId = action.sourceCardId;
  const effectId = action.effectId;
  
  if (!effectSystem) {
    console.error(`[MainPhase] Effect system not available for effect activation`);
    return {
      success: false,
      error: 'Effect system not available',
      newState: stateManager,
    };
  }

  try {
    console.log(`[MainPhase] Activating effect: ${effectId} on card ${cardId}`);
    
    // Update effect system's state manager to match current state
    effectSystem.updateStateManager(stateManager);
    
    // Activate the effect through the effect system
    // Note: For now, we're not handling target selection or value choices
    // Those would need to be handled by the AI/Player interface
    const success = effectSystem.activateEffect(cardId, effectId, [], new Map());
    
    if (success) {
      // Get updated state from effect system
      const updatedState = effectSystem.getStateManager();
      
      console.log(`[MainPhase] Effect activated successfully`);
      
      return {
        success: true,
        newState: updatedState,
      };
    } else {
      console.error(`[MainPhase] Effect activation returned false`);
      return {
        success: false,
        error: 'Effect activation failed',
        newState: stateManager,
      };
    }
  } catch (error) {
    console.error(`[MainPhase] Effect activation error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown effect activation error',
      newState: stateManager,
    };
  }
}

/**
 * Handle giving DON to a character or leader
 * @param stateManager - The current game state manager
 * @param action - The give DON action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Action result
 */
function handleGiveDon(
  stateManager: GameStateManager,
  action: GiveDonAction,
  rules: RulesContext,
  eventEmitter: EventEmitter
): ActionResult {
  // TODO: This will be implemented in task 14 (Implement DON giving system)
  // For now, return a placeholder result
  console.log(`[MainPhase] Would give DON ${action.donId} to card ${action.targetCardId}`);
  return {
    success: false,
    error: 'DON giving not yet implemented (task 14)',
    newState: stateManager,
  };
}

/**
 * Handle giving DON from GameAction
 * @param stateManager - The current game state manager
 * @param action - The game action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @param zoneManager - The zone manager
 * @returns Action result
 */
function handleGiveDonFromGameAction(
  stateManager: GameStateManager,
  action: import('../core/types').GameAction,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager
): ActionResult {
  if (action.type !== ActionType.GIVE_DON) {
    return { success: false, error: 'Invalid action type', newState: stateManager };
  }
  
  const donId = action.donId;
  const targetCardId = action.targetCardId;
  
  return handleGiveDonImpl(
    stateManager,
    zoneManager,
    eventEmitter,
    action.playerId,
    donId,
    targetCardId
  );
}

/**
 * Handle declaring an attack
 * @param stateManager - The current game state manager
 * @param action - The attack action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Action result
 * @deprecated Use handleAttackFromGameAction instead
 */
function handleAttack(
  stateManager: GameStateManager,
  action: import('../core/types').AttackAction,
  rules: RulesContext,
  eventEmitter: EventEmitter
): ActionResult {
  // TODO: This will be implemented in task 16 (Implement BattleSystem core)
  // For now, return a placeholder result
  console.log(`[MainPhase] Would attack with ${action.attackerId} targeting ${action.targetId}`);
  return {
    success: false,
    error: 'Attack system not yet implemented (task 16)',
    newState: stateManager,
  };
}

/**
 * Handle declaring an attack from GameAction
 * @param stateManager - The current game state manager
 * @param action - The game action
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Action result
 */
async function handleAttackFromGameAction(
  stateManager: GameStateManager,
  action: import('../core/types').GameAction,
  rules: RulesContext,
  eventEmitter: EventEmitter
): Promise<ActionResult> {
  if (action.type !== ActionType.DECLARE_ATTACK) {
    return { success: false, error: 'Invalid action type', newState: stateManager };
  }
  
  const attackerId = action.attackerId;
  const targetId = action.targetId;
  
  try {
    console.log(`[MainPhase] Executing attack: ${attackerId} -> ${targetId}`);
    
    // Check if the attacker has already attacked this turn
    if (stateManager.hasCardAttackedThisTurn(attackerId)) {
      console.error(`[MainPhase] Card ${attackerId} has already attacked this turn`);
      return {
        success: false,
        error: 'Card has already attacked this turn',
        newState: stateManager,
      };
    }
    
    // Mark the attacker as having attacked this turn BEFORE executing the attack
    let updatedState = stateManager.markCardAttacked(attackerId);
    
    // Create BattleSystem instance with updated state
    const battleSystem = new BattleSystem(updatedState, rules, eventEmitter);
    
    // Execute the attack through BattleSystem (await the async call)
    const battleResult = await battleSystem.executeAttack(attackerId, targetId);
    
    // Get updated state from BattleSystem
    updatedState = battleSystem.getStateManager();
    
    console.log(`[MainPhase] Attack completed - Success: ${battleResult.success}, Damage: ${battleResult.damageDealt}, Defender KO'd: ${battleResult.defenderKOd}`);
    
    // Check if game is over after attack
    if (updatedState.isGameOver()) {
      console.log(`[MainPhase] Game over after attack - Winner: ${updatedState.getState().winner}`);
    }
    
    return {
      success: battleResult.success,
      newState: updatedState,
      error: battleResult.success ? undefined : 'Attack failed to complete',
    };
  } catch (error) {
    // Handle battle errors gracefully
    console.error(`[MainPhase] Attack execution error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown attack error',
      newState: stateManager,
    };
  }
}
