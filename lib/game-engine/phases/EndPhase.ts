/**
 * EndPhase.ts
 * 
 * Implements the End Phase logic:
 * - Trigger END_OF_YOUR_TURN effects for active player
 * - Trigger END_OF_OPPONENT_TURN effects for non-active player
 * - Expire effects with "until end of turn" and "during this turn" durations
 */

import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  PlayerId,
  TriggerTiming,
  EffectTimingType,
  CardInstance,
  ModifierDuration,
} from '../core/types';

/**
 * Execute the End Phase
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
export function runEndPhase(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();
  const nonActivePlayer = activePlayer === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;

  // 1. Trigger END_OF_YOUR_TURN effects for active player
  currentState = triggerEndOfYourTurnEffects(currentState, activePlayer);

  // 2. Trigger END_OF_OPPONENT_TURN effects for non-active player
  currentState = triggerEndOfOpponentTurnEffects(currentState, nonActivePlayer, activePlayer);

  // 3. Resolve any pending triggers from end of turn effects
  currentState = resolvePendingTriggers(currentState);

  // 4. Expire effects with "until end of turn" and "during this turn" durations
  currentState = expireEndOfTurnEffects(currentState);

  return currentState;
}

/**
 * Trigger END_OF_YOUR_TURN effects for the active player
 * @param stateManager - The current game state manager
 * @param activePlayer - The active player ID
 * @returns Updated game state manager with triggers enqueued
 */
function triggerEndOfYourTurnEffects(
  stateManager: GameStateManager,
  activePlayer: PlayerId
): GameStateManager {
  let currentState = stateManager;
  const state = currentState.getState();

  // Collect all cards that might have END_OF_YOUR_TURN effects
  for (const [playerId, player] of state.players.entries()) {
    const allCards = [
      ...player.zones.characterArea,
      player.zones.leaderArea,
      player.zones.stageArea,
    ].filter((card): card is CardInstance => card !== null && card !== undefined);

    for (const card of allCards) {
      // Check each effect on the card
      for (const effect of card.definition.effects) {
        // Only process AUTO effects with END_OF_YOUR_TURN timing
        // These trigger only for the active player's cards
        if (
          effect.timingType === EffectTimingType.AUTO &&
          effect.triggerTiming === TriggerTiming.END_OF_YOUR_TURN &&
          playerId === activePlayer
        ) {
          // Enqueue the trigger
          // Priority: active player's triggers resolve first
          const priority = 0;

          currentState = currentState.addPendingTrigger({
            effectDefinition: effect,
            source: card,
            controller: playerId,
            event: {
              type: 'PHASE_CHANGED' as any, // Generic event for phase triggers
              playerId: activePlayer,
              cardId: null,
              data: { phase: 'END' },
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
 * Trigger END_OF_OPPONENT_TURN effects for the non-active player
 * @param stateManager - The current game state manager
 * @param nonActivePlayer - The non-active player ID
 * @param activePlayer - The active player ID
 * @returns Updated game state manager with triggers enqueued
 */
function triggerEndOfOpponentTurnEffects(
  stateManager: GameStateManager,
  nonActivePlayer: PlayerId,
  activePlayer: PlayerId
): GameStateManager {
  let currentState = stateManager;
  const state = currentState.getState();

  // Collect all cards that might have END_OF_OPPONENT_TURN effects
  for (const [playerId, player] of state.players.entries()) {
    const allCards = [
      ...player.zones.characterArea,
      player.zones.leaderArea,
      player.zones.stageArea,
    ].filter((card): card is CardInstance => card !== null && card !== undefined);

    for (const card of allCards) {
      // Check each effect on the card
      for (const effect of card.definition.effects) {
        // Only process AUTO effects with END_OF_OPPONENT_TURN timing
        // These trigger only for the non-active player's cards
        if (
          effect.timingType === EffectTimingType.AUTO &&
          effect.triggerTiming === TriggerTiming.END_OF_OPPONENT_TURN &&
          playerId === nonActivePlayer
        ) {
          // Enqueue the trigger
          // Priority: non-active player's triggers resolve after active player's
          const priority = 1;

          currentState = currentState.addPendingTrigger({
            effectDefinition: effect,
            source: card,
            controller: playerId,
            event: {
              type: 'PHASE_CHANGED' as any, // Generic event for phase triggers
              playerId: activePlayer,
              cardId: null,
              data: { phase: 'END', isOpponentTurn: true },
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

  // Sort triggers by priority (active player first, then non-active player)
  const sortedTriggers = [...state.pendingTriggers].sort((a, b) => a.priority - b.priority);

  // Clear the pending triggers queue
  currentState = currentState.clearPendingTriggers();

  // Resolve each trigger
  // Note: This is a placeholder - actual effect resolution will be implemented
  // in the effect system tasks (tasks 24-27)
  for (const trigger of sortedTriggers) {
    // TODO: Call effect system to resolve trigger
    // For now, we just acknowledge that triggers would be resolved here
    console.log(`[EndPhase] Would resolve trigger: ${trigger.effectDefinition.label} from ${trigger.source.definition.name}`);
  }

  return currentState;
}

/**
 * Expire effects with "until end of turn" and "during this turn" durations
 * @param stateManager - The current game state manager
 * @returns Updated game state manager
 */
function expireEndOfTurnEffects(stateManager: GameStateManager): GameStateManager {
  let currentState = stateManager;
  const state = currentState.getState();

  // Iterate through all players
  for (const [playerId, player] of state.players.entries()) {
    // Get all cards that might have modifiers
    const allCards = [
      ...player.zones.deck,
      ...player.zones.hand,
      ...player.zones.trash,
      ...player.zones.life,
      ...player.zones.characterArea,
      player.zones.leaderArea,
      player.zones.stageArea,
    ].filter((card): card is NonNullable<typeof card> => card !== null && card !== undefined);

    for (const card of allCards) {
      if (card.modifiers.length > 0) {
        // Filter out expired modifiers
        const remainingModifiers = card.modifiers.filter(
          modifier =>
            modifier.duration !== ModifierDuration.UNTIL_END_OF_TURN &&
            modifier.duration !== ModifierDuration.DURING_THIS_TURN
        );

        // Update card if modifiers changed
        if (remainingModifiers.length !== card.modifiers.length) {
          currentState = currentState.updateCard(card.id, {
            modifiers: remainingModifiers,
          });
        }
      }
    }
  }

  return currentState;
}
