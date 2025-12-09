/**
 * DonPhase.ts
 * 
 * Implements the Don Phase logic:
 * - Place 2 DON from don deck to cost area as active (normal turns)
 * - Place 1 DON on first turn for player going first
 * - Handle empty don deck gracefully
 */

import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneId, PlayerId, CardState, GameEventType } from '../core/types';

/**
 * Execute the Don Phase
 * @param stateManager - The current game state manager
 * @param rules - The rules context
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
export function runDonPhase(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const activePlayer = currentState.getActivePlayer();
  const turnNumber = currentState.getTurnNumber();

  // Determine if this is the first player on their first turn
  const isFirstPlayer = activePlayer === PlayerId.PLAYER_1;
  
  // Get the number of DON to place from rules context
  const donToPlace = rules.getDonPerTurn(turnNumber, isFirstPlayer);

  // Place DON cards from don deck to cost area
  currentState = placeDonCards(currentState, activePlayer, donToPlace, eventEmitter);

  return currentState;
}

/**
 * Place DON cards from don deck to cost area as active
 * @param stateManager - The current game state manager
 * @param playerId - The player placing DON
 * @param count - Number of DON cards to place
 * @param eventEmitter - The event emitter
 * @returns Updated game state manager
 */
function placeDonCards(
  stateManager: GameStateManager,
  playerId: PlayerId,
  count: number,
  eventEmitter: EventEmitter
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(playerId);

  if (!player) return currentState;

  // Determine how many DON we can actually place (limited by don deck size)
  const availableDon = player.zones.donDeck.length;
  const actualCount = Math.min(count, availableDon);

  // Place each DON card
  for (let i = 0; i < actualCount; i++) {
    // Get the updated player state for each iteration
    const currentPlayer = currentState.getPlayer(playerId);
    if (!currentPlayer) break;
    
    // Get the top DON from the don deck
    const donToMove = currentPlayer.zones.donDeck[0];
    
    if (!donToMove) break; // Safety check

    // Move DON from don deck to cost area
    currentState = currentState.moveDon(donToMove.id, ZoneId.COST_AREA);

    // Get the moved DON and ensure it's active
    const movedDon = currentState.getDon(donToMove.id);
    if (movedDon && movedDon.state !== CardState.ACTIVE) {
      // Update DON state to active
      const updatedPlayer = currentState.getPlayer(playerId);
      if (updatedPlayer) {
        const costAreaIndex = updatedPlayer.zones.costArea.findIndex(d => d.id === donToMove.id);
        if (costAreaIndex !== -1) {
          // Create updated cost area with active DON
          const updatedCostArea = [...updatedPlayer.zones.costArea];
          updatedCostArea[costAreaIndex] = {
            ...updatedCostArea[costAreaIndex],
            state: CardState.ACTIVE,
          };

          // Update player with new cost area
          currentState = currentState.updatePlayer(playerId, {
            zones: {
              ...updatedPlayer.zones,
              costArea: updatedCostArea,
            },
          });
        }
      }
    }

    // Emit event for DON moved
    const updatedPlayer = currentState.getPlayer(playerId);
    if (updatedPlayer) {
      eventEmitter.emit({
        type: GameEventType.CARD_MOVED,
        cardId: donToMove.id,
        playerId: playerId,
        fromZone: ZoneId.DON_DECK,
        toZone: ZoneId.COST_AREA,
        fromIndex: 0,
        toIndex: updatedPlayer.zones.costArea.length - 1,
        timestamp: Date.now(),
      });
    }
  }

  return currentState;
}
