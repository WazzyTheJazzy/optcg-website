/**
 * ModifierManager.ts
 * 
 * Manages modifiers on cards in the One Piece TCG Engine.
 * Handles adding, removing, and expiring modifiers based on duration.
 * Supports modifier durations: permanent, until end of turn, until end of battle, until start of next turn.
 */

import { GameStateManager } from '../core/GameState';
import {
  Modifier,
  ModifierType,
  ModifierDuration,
  CardInstance,
  PlayerId,
  ZoneId,
} from '../core/types';

/**
 * Error thrown when a modifier operation fails
 */
export class ModifierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModifierError';
  }
}

/**
 * ModifierManager class for tracking and applying modifiers
 */
export class ModifierManager {
  private stateManager: GameStateManager;

  constructor(stateManager: GameStateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Add a modifier to a card
   * 
   * @param cardId - The card ID to add the modifier to
   * @param type - The type of modifier (POWER, COST, KEYWORD, ATTRIBUTE)
   * @param value - The modifier value (number for POWER/COST, string for KEYWORD/ATTRIBUTE)
   * @param duration - How long the modifier lasts
   * @param source - The card ID that created this modifier
   * @returns Updated state manager
   * @throws ModifierError if card not found
   */
  addModifier(
    cardId: string,
    type: ModifierType,
    value: number | string,
    duration: ModifierDuration,
    source: string
  ): GameStateManager {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ModifierError(`Cannot add modifier: card ${cardId} not found`);
    }

    // Create the modifier
    const modifier: Modifier = {
      id: `modifier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      value,
      duration,
      source,
      timestamp: Date.now(),
    };

    // Add modifier to card
    const updatedModifiers = [...card.modifiers, modifier];
    this.stateManager = this.stateManager.updateCard(cardId, {
      modifiers: updatedModifiers,
    });

    return this.stateManager;
  }

  /**
   * Remove a specific modifier from a card
   * 
   * @param cardId - The card ID to remove the modifier from
   * @param modifierId - The modifier ID to remove
   * @returns Updated state manager
   * @throws ModifierError if card not found
   */
  removeModifier(cardId: string, modifierId: string): GameStateManager {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ModifierError(`Cannot remove modifier: card ${cardId} not found`);
    }

    // Filter out the modifier
    const updatedModifiers = card.modifiers.filter(m => m.id !== modifierId);
    
    // Only update if something changed
    if (updatedModifiers.length !== card.modifiers.length) {
      this.stateManager = this.stateManager.updateCard(cardId, {
        modifiers: updatedModifiers,
      });
    }

    return this.stateManager;
  }

  /**
   * Remove all modifiers from a card that match a filter
   * 
   * @param cardId - The card ID to remove modifiers from
   * @param filter - Filter function to determine which modifiers to remove
   * @returns Updated state manager
   * @throws ModifierError if card not found
   */
  removeModifiersWhere(
    cardId: string,
    filter: (modifier: Modifier) => boolean
  ): GameStateManager {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ModifierError(`Cannot remove modifiers: card ${cardId} not found`);
    }

    // Filter out matching modifiers
    const updatedModifiers = card.modifiers.filter(m => !filter(m));
    
    // Only update if something changed
    if (updatedModifiers.length !== card.modifiers.length) {
      this.stateManager = this.stateManager.updateCard(cardId, {
        modifiers: updatedModifiers,
      });
    }

    return this.stateManager;
  }

  /**
   * Expire modifiers at the end of a turn
   * Removes modifiers with UNTIL_END_OF_TURN and DURING_THIS_TURN durations
   * 
   * @param playerId - Optional player ID to only expire modifiers for that player's cards
   * @returns Updated state manager
   */
  expireEndOfTurnModifiers(playerId?: PlayerId): GameStateManager {
    const allCards = this.getAllCards(playerId);

    for (const card of allCards) {
      const hasExpiredModifiers = card.modifiers.some(
        m => m.duration === ModifierDuration.UNTIL_END_OF_TURN ||
             m.duration === ModifierDuration.DURING_THIS_TURN
      );

      if (hasExpiredModifiers) {
        this.stateManager = this.removeModifiersWhere(
          card.id,
          m => m.duration === ModifierDuration.UNTIL_END_OF_TURN ||
               m.duration === ModifierDuration.DURING_THIS_TURN
        );
      }
    }

    return this.stateManager;
  }

  /**
   * Expire modifiers at the end of a battle
   * Removes modifiers with UNTIL_END_OF_BATTLE duration
   * 
   * @returns Updated state manager
   */
  expireEndOfBattleModifiers(): GameStateManager {
    const allCards = this.getAllCards();

    for (const card of allCards) {
      const hasExpiredModifiers = card.modifiers.some(
        m => m.duration === ModifierDuration.UNTIL_END_OF_BATTLE
      );

      if (hasExpiredModifiers) {
        this.stateManager = this.removeModifiersWhere(
          card.id,
          m => m.duration === ModifierDuration.UNTIL_END_OF_BATTLE
        );
      }
    }

    return this.stateManager;
  }

  /**
   * Expire modifiers at the start of the next turn
   * Removes modifiers with UNTIL_START_OF_NEXT_TURN duration
   * 
   * @param playerId - The player whose turn is starting
   * @returns Updated state manager
   */
  expireStartOfTurnModifiers(playerId: PlayerId): GameStateManager {
    const allCards = this.getAllCards();

    for (const card of allCards) {
      // Only expire modifiers on cards owned by the player whose turn is starting
      if (card.owner === playerId) {
        const hasExpiredModifiers = card.modifiers.some(
          m => m.duration === ModifierDuration.UNTIL_START_OF_NEXT_TURN
        );

        if (hasExpiredModifiers) {
          this.stateManager = this.removeModifiersWhere(
            card.id,
            m => m.duration === ModifierDuration.UNTIL_START_OF_NEXT_TURN
          );
        }
      }
    }

    return this.stateManager;
  }

  /**
   * Get all modifiers on a card
   * 
   * @param cardId - The card ID
   * @returns Array of modifiers
   * @throws ModifierError if card not found
   */
  getModifiers(cardId: string): Modifier[] {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ModifierError(`Cannot get modifiers: card ${cardId} not found`);
    }
    return [...card.modifiers];
  }

  /**
   * Get modifiers of a specific type on a card
   * 
   * @param cardId - The card ID
   * @param type - The modifier type to filter by
   * @returns Array of modifiers of the specified type
   * @throws ModifierError if card not found
   */
  getModifiersByType(cardId: string, type: ModifierType): Modifier[] {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ModifierError(`Cannot get modifiers: card ${cardId} not found`);
    }
    return card.modifiers.filter(m => m.type === type);
  }

  /**
   * Check if a card has any modifiers
   * 
   * @param cardId - The card ID
   * @returns True if the card has any modifiers
   * @throws ModifierError if card not found
   */
  hasModifiers(cardId: string): boolean {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ModifierError(`Cannot check modifiers: card ${cardId} not found`);
    }
    return card.modifiers.length > 0;
  }

  /**
   * Clear all modifiers from a card
   * 
   * @param cardId - The card ID
   * @returns Updated state manager
   * @throws ModifierError if card not found
   */
  clearModifiers(cardId: string): GameStateManager {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ModifierError(`Cannot clear modifiers: card ${cardId} not found`);
    }

    if (card.modifiers.length > 0) {
      this.stateManager = this.stateManager.updateCard(cardId, {
        modifiers: [],
      });
    }

    return this.stateManager;
  }

  /**
   * Clear modifiers from a card when it leaves the field
   * 
   * A card "leaves the field" when it moves from a field zone (CHARACTER_AREA, 
   * LEADER_AREA, STAGE_AREA) to a non-field zone (HAND, DECK, TRASH, LIFE, etc.)
   * 
   * @param cardId - The card ID
   * @param fromZone - The zone the card is leaving
   * @param toZone - The zone the card is moving to
   * @returns Updated state manager
   */
  clearModifiersOnZoneChange(
    cardId: string,
    fromZone: ZoneId,
    toZone: ZoneId
  ): GameStateManager {
    const fieldZones = [ZoneId.CHARACTER_AREA, ZoneId.LEADER_AREA, ZoneId.STAGE_AREA];
    
    // Check if card is leaving the field
    const leavingField = fieldZones.includes(fromZone) && !fieldZones.includes(toZone);
    
    if (leavingField) {
      // Clear all modifiers from the card
      this.stateManager = this.clearModifiers(cardId);
    }
    
    return this.stateManager;
  }

  /**
   * Update the state manager reference
   * 
   * @param stateManager - The new state manager
   */
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
  }

  /**
   * Get the current state manager
   * 
   * @returns The current state manager
   */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get all cards in the game, optionally filtered by player
   * 
   * @param playerId - Optional player ID to filter by
   * @returns Array of all card instances
   */
  private getAllCards(playerId?: PlayerId): CardInstance[] {
    const cards: CardInstance[] = [];
    const state = this.stateManager.getState();

    const players = playerId 
      ? [state.players.get(playerId)!]
      : Array.from(state.players.values());

    for (const player of players) {
      if (!player) continue;

      // Add cards from all zones
      cards.push(...player.zones.deck);
      cards.push(...player.zones.hand);
      cards.push(...player.zones.trash);
      cards.push(...player.zones.life);
      cards.push(...player.zones.characterArea);
      
      if (player.zones.leaderArea) {
        cards.push(player.zones.leaderArea);
      }
      
      if (player.zones.stageArea) {
        cards.push(player.zones.stageArea);
      }
    }

    return cards;
  }
}
