import { GameState, CardInstance, PlayerId, ZoneId, CardCategory } from '../core/types';
import { IllegalActionError, InvalidStateError, RulesViolationError, CardDataError } from './errors';

/**
 * Validation utilities for game engine operations
 */
export class ValidationUtils {
  /**
   * Validates that a card exists in the game state
   */
  static validateCardExists(state: GameState, cardId: string): CardInstance {
    // Search through all players' zones for the card
    for (const player of state.players.values()) {
      const zones = [
        player.zones.deck,
        player.zones.hand,
        player.zones.trash,
        player.zones.life,
        player.zones.characterArea,
      ];

      for (const zone of zones) {
        const card = zone.find(c => c.id === cardId);
        if (card) return card;
      }

      // Check leader area
      if (player.zones.leaderArea?.id === cardId) {
        return player.zones.leaderArea;
      }

      // Check stage area
      if (player.zones.stageArea?.id === cardId) {
        return player.zones.stageArea;
      }
    }

    throw new CardDataError(`Card not found: ${cardId}`, cardId);
  }

  /**
   * Validates that a player exists in the game state
   */
  static validatePlayerExists(state: GameState, playerId: PlayerId): void {
    if (!state.players.has(playerId)) {
      throw new InvalidStateError(`Player not found: ${playerId}`, { playerId });
    }
  }

  /**
   * Validates that it's the specified player's turn
   */
  static validateActivePlayer(state: GameState, playerId: PlayerId): void {
    if (state.activePlayer !== playerId) {
      throw new IllegalActionError(
        'action',
        'Not your turn',
        { activePlayer: state.activePlayer, attemptedPlayer: playerId }
      );
    }
  }

  /**
   * Validates that a card is in a specific zone
   */
  static validateCardInZone(card: CardInstance, expectedZone: ZoneId, action: string): void {
    if (card.zone !== expectedZone) {
      throw new IllegalActionError(
        action,
        `Card must be in ${expectedZone}, but is in ${card.zone}`,
        { cardId: card.id, expectedZone, actualZone: card.zone }
      );
    }
  }

  /**
   * Validates that a card is owned by a specific player
   */
  static validateCardOwner(card: CardInstance, playerId: PlayerId, action: string): void {
    if (card.owner !== playerId) {
      throw new IllegalActionError(
        action,
        'Card is not owned by this player',
        { cardId: card.id, owner: card.owner, attemptedPlayer: playerId }
      );
    }
  }

  /**
   * Validates that a card is controlled by a specific player
   */
  static validateCardController(card: CardInstance, playerId: PlayerId, action: string): void {
    if (card.controller !== playerId) {
      throw new IllegalActionError(
        action,
        'Card is not controlled by this player',
        { cardId: card.id, controller: card.controller, attemptedPlayer: playerId }
      );
    }
  }

  /**
   * Validates that a card is of a specific category
   */
  static validateCardCategory(card: CardInstance, expectedCategory: CardCategory, action: string): void {
    if (card.definition.category !== expectedCategory) {
      throw new IllegalActionError(
        action,
        `Card must be a ${expectedCategory}, but is a ${card.definition.category}`,
        { cardId: card.id, expectedCategory, actualCategory: card.definition.category }
      );
    }
  }

  /**
   * Validates that a player has enough resources (DON) to pay a cost
   */
  static validateCanAffordCost(state: GameState, playerId: PlayerId, cost: number): void {
    const player = state.players.get(playerId);
    if (!player) {
      throw new InvalidStateError(`Player not found: ${playerId}`, { playerId });
    }

    const activeDon = player.zones.costArea.filter(don => don.state === 'ACTIVE').length;
    if (activeDon < cost) {
      throw new IllegalActionError(
        'pay cost',
        `Insufficient DON: need ${cost}, have ${activeDon}`,
        { playerId, requiredCost: cost, availableDon: activeDon }
      );
    }
  }

  /**
   * Validates that the character area is not full
   */
  static validateCharacterAreaNotFull(state: GameState, playerId: PlayerId, maxCharacters: number = 5): void {
    const player = state.players.get(playerId);
    if (!player) {
      throw new InvalidStateError(`Player not found: ${playerId}`, { playerId });
    }

    if (player.zones.characterArea.length >= maxCharacters) {
      throw new RulesViolationError(
        `Character area is full (max ${maxCharacters})`,
        { playerId, currentCount: player.zones.characterArea.length, maxCharacters }
      );
    }
  }

  /**
   * Validates that the game is not over
   */
  static validateGameNotOver(state: GameState): void {
    if (state.gameOver) {
      throw new IllegalActionError(
        'action',
        'Game is already over',
        { winner: state.winner }
      );
    }
  }

  /**
   * Validates that a zone exists for a player
   */
  static validateZoneExists(state: GameState, playerId: PlayerId, zone: ZoneId): void {
    const player = state.players.get(playerId);
    if (!player) {
      throw new InvalidStateError(`Player not found: ${playerId}`, { playerId });
    }

    if (!(zone in player.zones)) {
      throw new InvalidStateError(`Zone not found: ${zone}`, { playerId, zone });
    }
  }

  /**
   * Validates that a card has a specific keyword
   */
  static validateHasKeyword(card: CardInstance, keyword: string, action: string): void {
    const hasKeyword = card.definition.keywords.includes(keyword) ||
      card.modifiers.some(mod => mod.type === 'KEYWORD' && mod.value === keyword);

    if (!hasKeyword) {
      throw new IllegalActionError(
        action,
        `Card does not have ${keyword} keyword`,
        { cardId: card.id, keyword }
      );
    }
  }

  /**
   * Validates that a target is valid for an effect
   */
  static validateTarget(
    state: GameState,
    targetId: string,
    validTargetIds: string[],
    action: string
  ): void {
    if (!validTargetIds.includes(targetId)) {
      throw new IllegalActionError(
        action,
        'Invalid target',
        { targetId, validTargets: validTargetIds }
      );
    }
  }

  /**
   * Validates that an array is not empty
   */
  static validateNotEmpty<T>(array: T[], itemName: string, context?: Record<string, any>): void {
    if (array.length === 0) {
      throw new InvalidStateError(`${itemName} is empty`, context);
    }
  }

  /**
   * Validates that a value is within a range
   */
  static validateRange(value: number, min: number, max: number, valueName: string): void {
    if (value < min || value > max) {
      throw new InvalidStateError(
        `${valueName} must be between ${min} and ${max}, got ${value}`,
        { value, min, max, valueName }
      );
    }
  }
}
