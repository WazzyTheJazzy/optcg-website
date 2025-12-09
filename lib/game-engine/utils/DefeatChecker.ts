/**
 * DefeatChecker.ts
 * 
 * Handles defeat condition checking for the One Piece TCG Engine.
 * Checks for:
 * - Players with defeated flag set
 * - Players with empty decks
 * - Players with zero life taking damage
 * 
 * Should be called after every action and trigger resolution.
 */

import { GameStateManager } from '../core/GameState';
import { PlayerId } from '../core/types';

/**
 * Result of a defeat check
 */
export interface DefeatCheckResult {
  gameOver: boolean;
  winner: PlayerId | null;
  reason: string | null;
}

/**
 * Run defeat check on the current game state
 * 
 * Checks all defeat conditions in order:
 * 1. Check if any player has defeated flag set
 * 2. Check if any player's deck is empty
 * 3. Check if any player has zero life (handled externally during damage)
 * 
 * @param stateManager - The current game state manager
 * @returns DefeatCheckResult indicating if game is over and who won
 */
export function runDefeatCheck(stateManager: GameStateManager): DefeatCheckResult {
  const state = stateManager.getState();

  // If game is already over, return current state
  if (state.gameOver) {
    return {
      gameOver: true,
      winner: state.winner,
      reason: 'Game already over',
    };
  }

  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
  const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

  if (!player1 || !player2) {
    return {
      gameOver: false,
      winner: null,
      reason: null,
    };
  }

  // Check if any player has defeated flag set
  const player1Defeated = player1.flags.get('defeated') === true;
  const player2Defeated = player2.flags.get('defeated') === true;

  if (player1Defeated && player2Defeated) {
    // Both players defeated - draw
    return {
      gameOver: true,
      winner: null,
      reason: 'Both players defeated',
    };
  }

  if (player1Defeated) {
    return {
      gameOver: true,
      winner: PlayerId.PLAYER_2,
      reason: 'Player 1 defeated',
    };
  }

  if (player2Defeated) {
    return {
      gameOver: true,
      winner: PlayerId.PLAYER_1,
      reason: 'Player 2 defeated',
    };
  }

  // Check if any player's deck is empty
  const player1DeckEmpty = player1.zones.deck.length === 0;
  const player2DeckEmpty = player2.zones.deck.length === 0;

  if (player1DeckEmpty && player2DeckEmpty) {
    // Both decks empty - draw
    return {
      gameOver: true,
      winner: null,
      reason: 'Both players decked out',
    };
  }

  if (player1DeckEmpty) {
    return {
      gameOver: true,
      winner: PlayerId.PLAYER_2,
      reason: 'Player 1 decked out',
    };
  }

  if (player2DeckEmpty) {
    return {
      gameOver: true,
      winner: PlayerId.PLAYER_1,
      reason: 'Player 2 decked out',
    };
  }

  // No defeat conditions met
  return {
    gameOver: false,
    winner: null,
    reason: null,
  };
}

/**
 * Apply defeat check result to game state
 * 
 * If the defeat check indicates game over, updates the state accordingly.
 * 
 * @param stateManager - The current game state manager
 * @param result - The defeat check result
 * @returns Updated game state manager
 */
export function applyDefeatCheck(
  stateManager: GameStateManager,
  result: DefeatCheckResult
): GameStateManager {
  if (result.gameOver && !stateManager.getState().gameOver) {
    return stateManager.setGameOver(result.winner);
  }
  return stateManager;
}

/**
 * Mark a player as defeated
 * 
 * Sets the defeated flag on a player. The defeat check will then
 * detect this and end the game.
 * 
 * @param stateManager - The current game state manager
 * @param playerId - The player to mark as defeated
 * @returns Updated game state manager
 */
export function markPlayerDefeated(
  stateManager: GameStateManager,
  playerId: PlayerId
): GameStateManager {
  const player = stateManager.getPlayer(playerId);
  if (!player) return stateManager;

  const updatedFlags = new Map(player.flags);
  updatedFlags.set('defeated', true);

  return stateManager.updatePlayer(playerId, {
    flags: updatedFlags,
  });
}

/**
 * Check if a player should be marked as defeated due to zero life
 * 
 * This is called when a player would take leader damage but has no life cards.
 * 
 * @param stateManager - The current game state manager
 * @param playerId - The player to check
 * @returns True if player should be defeated
 */
export function shouldDefeatForZeroLife(
  stateManager: GameStateManager,
  playerId: PlayerId
): boolean {
  const player = stateManager.getPlayer(playerId);
  if (!player) return false;

  return player.zones.life.length === 0;
}
