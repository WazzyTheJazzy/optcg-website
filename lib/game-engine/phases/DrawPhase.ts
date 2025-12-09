/**
 * DrawPhase.ts
 * 
 * Implements the Draw Phase logic:
 * - Draw 1 card for active player
 * - Skip draw on first turn for player going first
 * - Handle deck empty condition (triggers defeat)
 */

import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneId, PlayerId, GameEventType } from '../core/types';

/**
 * Execute the Draw Phase
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
export function runDrawPhase(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();
  const turnNumber = currentState.getTurnNumber();

  // Check if this is the first turn for the player going first
  const isFirstTurn = turnNumber === 1;
  const isPlayerGoingFirst = activePlayer === PlayerId.PLAYER_1;
  const shouldSkipDraw = isFirstTurn && isPlayerGoingFirst;

  // Skip draw on first turn for player going first
  if (shouldSkipDraw) {
    return currentState;
  }

  // Draw 1 card for active player
  currentState = drawCard(currentState, activePlayer, eventEmitter);

  return currentState;
}

/**
 * Draw a card from the deck to hand
 * @param stateManager - The current game state manager
 * @param playerId - The player drawing the card
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
function drawCard(
  stateManager: GameStateManager,
  playerId: PlayerId,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(playerId);

  if (!player) return currentState;

  // Check if deck is empty
  if (player.zones.deck.length === 0) {
    // Deck is empty - trigger defeat
    currentState = handleDeckOut(currentState, playerId, eventEmitter);
    return currentState;
  }

  // Get the top card of the deck
  const topCard = player.zones.deck[0];

  // Move card from deck to hand
  currentState = currentState.moveCard(topCard.id, ZoneId.HAND);

  // Emit card moved event
  eventEmitter.emit({
    type: GameEventType.CARD_MOVED,
    cardId: topCard.id,
    playerId: playerId,
    fromZone: ZoneId.DECK,
    toZone: ZoneId.HAND,
    fromIndex: 0,
    toIndex: currentState.getPlayer(playerId)!.zones.hand.length - 1,
    timestamp: Date.now(),
  });

  return currentState;
}

/**
 * Handle deck out condition (player loses)
 * @param stateManager - The current game state manager
 * @param playerId - The player who ran out of cards
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager with game over state
 */
function handleDeckOut(
  stateManager: GameStateManager,
  playerId: PlayerId,
  eventEmitter: EventEmitter
): GameStateManager {
  // Determine the winner (the other player)
  const winner = playerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;

  // Set game over state
  const newState = stateManager.setGameOver(winner);

  // Emit game over event
  eventEmitter.emit({
    type: GameEventType.GAME_OVER,
    winner: winner,
    reason: 'DECK_OUT',
    timestamp: Date.now(),
  });

  return newState;
}
