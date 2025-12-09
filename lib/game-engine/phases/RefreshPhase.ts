/**
 * RefreshPhase.ts
 * 
 * Implements the Refresh Phase logic:
 * - Expire effects with "until start of your next turn" duration
 * - Trigger START_OF_TURN auto effects
 * - Return all given DON cards to cost area as rested
 * - Set all rested cards and DON to active state
 */

import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { CardState, ZoneId, PlayerId, ModifierDuration, GameEventType } from '../core/types';

/**
 * Execute the Refresh Phase
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
export function runRefreshPhase(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();

  // 1. Expire effects with "until start of your next turn" duration
  currentState = expireStartOfTurnEffects(currentState, activePlayer);

  // 2. Trigger START_OF_TURN auto effects
  // TODO: This will be implemented when the effect system is complete
  // For now, we just note that triggers should be enqueued here

  // 3. Return all given DON cards to cost area as rested
  currentState = returnGivenDonToCostArea(currentState, activePlayer, eventEmitter);

  // 4. Set all rested cards and DON to active state
  currentState = activateAllRestedCards(currentState, activePlayer, eventEmitter);

  return currentState;
}

/**
 * Expire effects with "until start of your next turn" duration
 * @param stateManager - The current game state manager
 * @param activePlayer - The active player ID
 * @returns Updated game state manager
 */
function expireStartOfTurnEffects(
  stateManager: GameStateManager,
  activePlayer: PlayerId
): GameStateManager {
  let currentState = stateManager;
  const state = currentState.getState();

  // Iterate through all players
  for (const [playerId, player] of state.players.entries()) {
    // Only expire "until start of your next turn" effects for the active player
    if (playerId !== activePlayer) continue;

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
          modifier => modifier.duration !== ModifierDuration.UNTIL_START_OF_NEXT_TURN
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

/**
 * Return all given DON cards from characters/leader to cost area as rested
 * @param stateManager - The current game state manager
 * @param activePlayer - The active player ID
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
function returnGivenDonToCostArea(
  stateManager: GameStateManager,
  activePlayer: PlayerId,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(activePlayer);

  if (!player) return currentState;

  // Check all cards that can have given DON
  const cardsWithDon = [
    ...player.zones.characterArea,
    player.zones.leaderArea,
  ].filter((card): card is NonNullable<typeof card> => card !== null && card !== undefined);

  for (const card of cardsWithDon) {
    if (card.givenDon.length > 0) {
      // Collect DON IDs to move (need to do this before modifying state)
      const donIds = card.givenDon.map(don => don.id);

      // Move each given DON back to cost area as rested
      for (const donId of donIds) {
        // Move DON to cost area
        currentState = currentState.moveDon(donId, ZoneId.COST_AREA);

        // Get the moved DON and update its state to rested
        const movedDon = currentState.getDon(donId);
        if (movedDon && movedDon.state !== CardState.RESTED) {
          // Update DON state through the player state
          const updatedPlayer = currentState.getPlayer(activePlayer);
          if (updatedPlayer) {
            const costAreaIndex = updatedPlayer.zones.costArea.findIndex(d => d.id === donId);
            if (costAreaIndex !== -1) {
              // Create updated cost area with rested DON
              const updatedCostArea = [...updatedPlayer.zones.costArea];
              updatedCostArea[costAreaIndex] = {
                ...updatedCostArea[costAreaIndex],
                state: CardState.RESTED,
              };

              // Update player with new cost area
              currentState = currentState.updatePlayer(activePlayer, {
                zones: {
                  ...updatedPlayer.zones,
                  costArea: updatedCostArea,
                },
              });

              // Emit event for DON state change
              eventEmitter.emit({
                type: GameEventType.CARD_STATE_CHANGED,
                cardId: donId,
                playerId: activePlayer,
                oldState: movedDon.state,
                newState: CardState.RESTED,
                timestamp: Date.now(),
              });
            }
          }
        }
      }
    }
  }

  return currentState;
}

/**
 * Set all rested cards and DON to active state for the active player
 * @param stateManager - The current game state manager
 * @param activePlayer - The active player ID
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
function activateAllRestedCards(
  stateManager: GameStateManager,
  activePlayer: PlayerId,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(activePlayer);

  if (!player) return currentState;

  // Activate all rested cards in character area
  for (const card of player.zones.characterArea) {
    if (card.state === CardState.RESTED) {
      currentState = currentState.updateCard(card.id, { state: CardState.ACTIVE });
      
      // Emit event for card state change
      eventEmitter.emit({
        type: GameEventType.CARD_STATE_CHANGED,
        cardId: card.id,
        playerId: activePlayer,
        oldState: CardState.RESTED,
        newState: CardState.ACTIVE,
        timestamp: Date.now(),
      });
    }
  }

  // Activate leader if rested
  if (player.zones.leaderArea && player.zones.leaderArea.state === CardState.RESTED) {
    const leaderId = player.zones.leaderArea.id;
    currentState = currentState.updateCard(leaderId, {
      state: CardState.ACTIVE,
    });

    // Emit event for leader state change
    eventEmitter.emit({
      type: GameEventType.CARD_STATE_CHANGED,
      cardId: leaderId,
      playerId: activePlayer,
      oldState: CardState.RESTED,
      newState: CardState.ACTIVE,
      timestamp: Date.now(),
    });
  }

  // Activate stage if rested
  if (player.zones.stageArea && player.zones.stageArea.state === CardState.RESTED) {
    const stageId = player.zones.stageArea.id;
    currentState = currentState.updateCard(stageId, {
      state: CardState.ACTIVE,
    });

    // Emit event for stage state change
    eventEmitter.emit({
      type: GameEventType.CARD_STATE_CHANGED,
      cardId: stageId,
      playerId: activePlayer,
      oldState: CardState.RESTED,
      newState: CardState.ACTIVE,
      timestamp: Date.now(),
    });
  }

  // Activate all rested DON in cost area
  const updatedPlayer = currentState.getPlayer(activePlayer);
  if (updatedPlayer) {
    const updatedCostArea = updatedPlayer.zones.costArea.map(don => {
      if (don.state === CardState.RESTED) {
        // Emit event for DON state change
        eventEmitter.emit({
          type: GameEventType.CARD_STATE_CHANGED,
          cardId: don.id,
          playerId: activePlayer,
          oldState: CardState.RESTED,
          newState: CardState.ACTIVE,
          timestamp: Date.now(),
        });

        return { ...don, state: CardState.ACTIVE };
      }
      return don;
    });

    // Update player with activated DON
    if (updatedCostArea.some((don, idx) => don !== updatedPlayer.zones.costArea[idx])) {
      currentState = currentState.updatePlayer(activePlayer, {
        zones: {
          ...updatedPlayer.zones,
          costArea: updatedCostArea,
        },
      });
    }
  }

  return currentState;
}
