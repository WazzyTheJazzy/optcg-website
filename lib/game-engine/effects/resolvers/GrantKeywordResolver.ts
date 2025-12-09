/**
 * GrantKeywordResolver.ts
 * 
 * Resolver for keyword grant effects. Grants keywords to target cards
 * with appropriate duration modifiers.
 */

import { GameState, Modifier, ModifierType, ModifierDuration } from '../../core/types';
import { EffectInstance } from '../types';
import { EffectResolver } from '../EffectResolver';

/**
 * Resolver for GRANT_KEYWORD effect type
 * 
 * Grants keywords to target cards by adding keyword modifiers with the
 * specified duration. Supports keywords like Rush, Blocker, Double Attack, etc.
 */
export class GrantKeywordResolver implements EffectResolver {
  /**
   * Resolve a keyword grant effect
   * 
   * @param effect - The effect instance containing targets and keyword to grant
   * @param state - The current game state
   * @returns Updated game state with keyword modifiers applied to targets
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { keyword, duration } = effect.definition.parameters;

    // Validate parameters
    if (!keyword) {
      throw new Error('Keyword grant effect missing keyword parameter');
    }

    if (!effect.targets || effect.targets.length === 0) {
      // No targets - effect fizzles but doesn't error
      return state;
    }

    // Create a copy of the state to modify
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    
    // Reconstruct the Map since JSON.parse doesn't preserve Maps
    if (state.players instanceof Map) {
      const playersMap = new Map();
      state.players.forEach((player, id) => {
        playersMap.set(id, JSON.parse(JSON.stringify(player)));
      });
      newState.players = playersMap as any;
    }

    // Apply keyword modifier to each target
    for (const target of effect.targets) {
      if (target.type !== 'CARD' || !target.cardId) {
        continue;
      }

      // Find the card in the state
      const card = this.findCard(target.cardId, newState);
      if (!card) {
        console.warn(`Keyword grant target card not found: ${target.cardId}`);
        continue;
      }

      // Create the keyword modifier
      const modifier: Modifier = {
        id: `modifier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: ModifierType.KEYWORD,
        value: keyword,
        duration: duration || ModifierDuration.PERMANENT,
        source: effect.sourceCardId,
        timestamp: Date.now(),
      };

      // Add modifier to the card
      card.modifiers.push(modifier);
    }

    return newState;
  }

  /**
   * Validate that a keyword grant effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    // Check that keyword parameter exists
    const { keyword } = effect.definition.parameters;
    if (!keyword) {
      return false;
    }

    // Keyword must be a string
    if (typeof keyword !== 'string') {
      return false;
    }

    // Keyword must not be empty
    if (keyword.trim().length === 0) {
      return false;
    }

    // Effect can resolve even with no targets (it just fizzles)
    return true;
  }

  /**
   * Find a card by ID in the game state
   * 
   * @param cardId - The card instance ID to find
   * @param state - The game state to search
   * @returns The card instance if found, null otherwise
   */
  private findCard(cardId: string, state: GameState): any | null {
    // Search in both players' zones
    const players: any[] = state.players instanceof Map 
      ? Array.from(state.players.values())
      : Object.values(state.players);

    for (const player of players) {
      if (!player || !player.zones) continue;

      // Check leader area
      if (player.zones.leaderArea?.id === cardId) {
        return player.zones.leaderArea;
      }

      // Check all array zones
      const zones: any[] = [
        player.zones.deck,
        player.zones.hand,
        player.zones.trash,
        player.zones.life,
        player.zones.characterArea || [],
        player.zones.stageArea ? [player.zones.stageArea] : [],
      ];

      for (const zone of zones) {
        if (!zone) continue;
        if (Array.isArray(zone)) {
          const card = zone.find((c: any) => c.id === cardId);
          if (card) return card;
        }
      }
    }

    return null;
  }
}
