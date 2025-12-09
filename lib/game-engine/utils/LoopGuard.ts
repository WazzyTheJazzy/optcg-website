/**
 * LoopGuard.ts
 * 
 * Detects infinite loops in game state by tracking state fingerprints.
 * When a state repeats too many times, applies official infinite loop resolution rules.
 */

import { GameState, PlayerId } from '../core/types';
import { RulesContext, LoopRules } from '../rules/RulesContext';
import crypto from 'crypto';

/**
 * Result of infinite loop detection and resolution
 */
export interface LoopResolutionResult {
  loopDetected: boolean;
  resolution: 'continue' | 'player1_must_stop' | 'player2_must_stop' | 'draw';
  stoppingPlayer: PlayerId | null;
}

/**
 * LoopGuard detects infinite loops by hashing relevant game state
 * and tracking how many times each state has been seen.
 */
export class LoopGuard {
  private rules: RulesContext;

  constructor(rules: RulesContext) {
    this.rules = rules;
  }

  /**
   * Check if the current state has repeated too many times
   * @param state - The current game state
   * @returns Loop resolution result
   */
  checkForLoop(state: GameState): LoopResolutionResult {
    const stateHash = this.hashRelevantState(state);
    const repeatCount = state.loopGuardState.stateHashes.get(stateHash) || 0;
    const maxRepeats = state.loopGuardState.maxRepeats;

    if (repeatCount >= maxRepeats) {
      // Loop detected - apply resolution rules
      return this.resolveInfiniteLoopByRules(state);
    }

    return {
      loopDetected: false,
      resolution: 'continue',
      stoppingPlayer: null,
    };
  }

  /**
   * Create a hash fingerprint of the relevant game state
   * Only includes state that matters for loop detection:
   * - Card positions and states in public zones
   * - DON positions and states
   * - Active player and phase
   * - Turn number
   * 
   * Excludes:
   * - Hidden zones (deck, hand contents)
   * - Timestamps and IDs
   * - History
   * 
   * @param state - The game state to hash
   * @returns A hash string representing the state
   */
  hashRelevantState(state: GameState): string {
    const relevantData: any = {
      activePlayer: state.activePlayer,
      phase: state.phase,
      turnNumber: state.turnNumber,
      players: {},
    };

    // For each player, capture relevant zone information
    for (const [playerId, player] of state.players.entries()) {
      relevantData.players[playerId] = {
        // Public zones - capture card definitions and states
        leaderArea: player.zones.leaderArea ? {
          definitionId: player.zones.leaderArea.definition.id,
          state: player.zones.leaderArea.state,
          givenDonCount: player.zones.leaderArea.givenDon.length,
          modifiers: player.zones.leaderArea.modifiers.map(m => ({
            type: m.type,
            value: m.value,
            duration: m.duration,
          })),
        } : null,
        
        characterArea: player.zones.characterArea.map(card => ({
          definitionId: card.definition.id,
          state: card.state,
          givenDonCount: card.givenDon.length,
          modifiers: card.modifiers.map(m => ({
            type: m.type,
            value: m.value,
            duration: m.duration,
          })),
        })),
        
        stageArea: player.zones.stageArea ? {
          definitionId: player.zones.stageArea.definition.id,
          state: player.zones.stageArea.state,
        } : null,
        
        // DON state
        costArea: player.zones.costArea.map(don => ({
          state: don.state,
        })),
        
        // Zone sizes (for hidden zones)
        deckSize: player.zones.deck.length,
        handSize: player.zones.hand.length,
        trashSize: player.zones.trash.length,
        lifeSize: player.zones.life.length,
        donDeckSize: player.zones.donDeck.length,
      };
    }

    // Create a deterministic JSON string and hash it
    // Note: We don't sort keys because array order matters for game state
    const jsonString = JSON.stringify(relevantData);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Apply official infinite loop resolution rules
   * 
   * Rules from the official game:
   * 1. If both players can stop the loop: game continues (they must negotiate)
   * 2. If only one player can stop the loop: that player must take action to stop it
   * 3. If neither player can stop the loop: game is a draw
   * 
   * For this implementation, we determine "can stop" by checking if the active
   * player has any legal actions available. In a real implementation, this would
   * need more sophisticated analysis of the game tree.
   * 
   * @param state - The current game state
   * @returns Loop resolution result
   */
  resolveInfiniteLoopByRules(state: GameState): LoopResolutionResult {
    const loopRules = this.rules.getInfiniteLoopRules();
    
    // Simplified implementation: assume the active player can stop the loop
    // if they have any choice in their actions. In a full implementation,
    // this would require analyzing whether different choices lead to different states.
    
    // For now, we'll use a heuristic:
    // - If it's the main phase, the active player can likely stop by making different choices
    // - If it's an automatic phase, neither player can stop
    
    const activePlayer = state.activePlayer;
    const nonActivePlayer = activePlayer === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
    
    // Check if active player can stop (simplified heuristic)
    const activePlayerCanStop = this.canPlayerStopLoop(state, activePlayer);
    const nonActivePlayerCanStop = this.canPlayerStopLoop(state, nonActivePlayer);
    
    if (activePlayerCanStop && nonActivePlayerCanStop) {
      // Both can stop - game continues (bothCanStop: "game_continues")
      return {
        loopDetected: true,
        resolution: 'continue',
        stoppingPlayer: null,
      };
    } else if (activePlayerCanStop && !nonActivePlayerCanStop) {
      // Only active player can stop
      return {
        loopDetected: true,
        resolution: activePlayer === PlayerId.PLAYER_1 ? 'player1_must_stop' : 'player2_must_stop',
        stoppingPlayer: activePlayer,
      };
    } else if (!activePlayerCanStop && nonActivePlayerCanStop) {
      // Only non-active player can stop
      return {
        loopDetected: true,
        resolution: nonActivePlayer === PlayerId.PLAYER_1 ? 'player1_must_stop' : 'player2_must_stop',
        stoppingPlayer: nonActivePlayer,
      };
    } else {
      // Neither can stop - draw (neitherCanStop: "draw")
      return {
        loopDetected: true,
        resolution: 'draw',
        stoppingPlayer: null,
      };
    }
  }

  /**
   * Heuristic to determine if a player can stop the loop
   * 
   * A player can stop the loop if they have meaningful choices that could
   * lead to different game states. This is a simplified heuristic.
   * 
   * @param state - The current game state
   * @param playerId - The player to check
   * @returns True if the player can likely stop the loop
   */
  private canPlayerStopLoop(state: GameState, playerId: PlayerId): boolean {
    const player = state.players.get(playerId);
    if (!player) return false;
    
    // If it's this player's main phase, they have choices
    if (state.activePlayer === playerId && state.phase === 'MAIN') {
      // Check if they have cards in hand or active DON
      const hasCardsInHand = player.zones.hand.length > 0;
      const hasActiveDon = player.zones.costArea.some(don => don.state === 'ACTIVE');
      const hasActiveCharacters = player.zones.characterArea.some(card => card.state === 'ACTIVE');
      
      // If they have resources or units, they can make different choices
      return hasCardsInHand || hasActiveDon || hasActiveCharacters;
    }
    
    // During other phases or opponent's turn, limited ability to stop
    // Could have counter cards or trigger effects, but simplified for now
    return false;
  }

  /**
   * Update the loop guard state with the current state hash
   * This should be called after each significant game action
   * 
   * @param state - The current game state
   * @returns The state hash that was recorded
   */
  recordState(state: GameState): string {
    return this.hashRelevantState(state);
  }

  /**
   * Get the repeat count for the current state
   * @param state - The current game state
   * @returns Number of times this state has been seen
   */
  getRepeatCount(state: GameState): number {
    const stateHash = this.hashRelevantState(state);
    return state.loopGuardState.stateHashes.get(stateHash) || 0;
  }

  /**
   * Reset the loop guard (useful for testing or new games)
   * Note: This doesn't modify the state, just returns what the reset state should be
   * 
   * @returns A fresh LoopGuardState
   */
  createFreshLoopGuardState(): { stateHashes: Map<string, number>; maxRepeats: number } {
    const loopRules = this.rules.getInfiniteLoopRules();
    return {
      stateHashes: new Map(),
      maxRepeats: loopRules.maxRepeats,
    };
  }
}
