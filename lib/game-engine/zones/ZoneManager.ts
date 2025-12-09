/**
 * ZoneManager.ts
 * 
 * Handles all card zone transitions for the One Piece TCG Engine.
 * Manages card movement between zones, enforces zone limits, and emits events.
 */

import { GameStateManager } from '../core/GameState';
import { EventEmitter, GameEventType, CardMovedEvent } from '../rendering/EventEmitter';
import {
  ZoneId,
  PlayerId,
  CardInstance,
  DonInstance,
  CardState,
} from '../core/types';

/**
 * Error thrown when a zone operation violates game rules
 */
export class ZoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZoneError';
  }
}

/**
 * ZoneManager handles all card zone transitions
 */
export class ZoneManager {
  private stateManager: GameStateManager;
  private eventEmitter: EventEmitter;

  // Zone limits
  private static readonly MAX_CHARACTER_AREA = 5;
  private static readonly MAX_STAGE_AREA = 1;
  private static readonly MAX_LEADER_AREA = 1;

  constructor(stateManager: GameStateManager, eventEmitter: EventEmitter) {
    this.stateManager = stateManager;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Move a card from its current zone to a new zone
   * @param cardId - The card instance ID to move
   * @param toZone - The destination zone
   * @param toIndex - Optional index in destination zone (defaults to end)
   * @returns Updated GameStateManager
   * @throws ZoneError if the move violates zone limits
   */
  moveCard(cardId: string, toZone: ZoneId, toIndex?: number): GameStateManager {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new ZoneError(`Card ${cardId} not found`);
    }

    const fromZone = card.zone;
    const owner = card.owner;
    
    console.log(`🔄 ZoneManager.moveCard: Moving ${card.definition.name} from ${fromZone} to ${toZone}`);

    // Validate zone limits before moving
    this.validateZoneLimit(owner, toZone, card);

    // Get the from index before moving
    const fromIndex = this.getCardIndexInZone(owner, fromZone, cardId);

    // Update state with new zone
    const newStateManager = this.stateManager.moveCard(cardId, toZone, toIndex);
    console.log(`✅ ZoneManager.moveCard: State updated, card now in ${toZone}`);

    // Determine the actual toIndex after move
    const actualToIndex = toIndex ?? this.getZoneSize(owner, toZone, newStateManager) - 1;

    // Update the state manager reference
    this.stateManager = newStateManager;
    console.log(`📝 ZoneManager.moveCard: State manager reference updated`);
    
    // Verify the card is actually in the new zone
    const verifyCard = this.stateManager.getCard(cardId);
    console.log(`🔍 ZoneManager.moveCard: Verification - card is now in zone: ${verifyCard?.zone}, expected: ${toZone}`);

    // Store event data to be emitted later by GameEngine
    // This ensures the event is emitted AFTER GameEngine updates its state
    const event: CardMovedEvent = {
      type: GameEventType.CARD_MOVED,
      cardId,
      playerId: owner,
      fromZone,
      toZone,
      fromIndex,
      toIndex: actualToIndex,
      timestamp: Date.now(),
    };
    
    // Emit the event immediately - but note that listeners will read from GameEngine's state
    // which should be updated by the time this returns
    console.log(`📢 ZoneManager.moveCard: Emitting CARD_MOVED event`);
    this.eventEmitter.emit(event);
    console.log(`✨ ZoneManager.moveCard: Complete`);

    return newStateManager;
  }

  /**
   * Move a DON card from its current zone to a new zone
   * @param donId - The DON instance ID to move
   * @param toZone - The destination zone (DON_DECK or COST_AREA)
   * @param targetCardId - Optional card ID if giving DON to a card
   * @returns Updated GameStateManager
   * @throws ZoneError if the move is invalid
   */
  moveDon(donId: string, toZone: ZoneId, targetCardId?: string): GameStateManager {
    const don = this.stateManager.getDon(donId);
    if (!don) {
      throw new ZoneError(`DON ${donId} not found`);
    }

    // Validate DON can only move to DON_DECK or COST_AREA (or to a card)
    if (!targetCardId && toZone !== ZoneId.DON_DECK && toZone !== ZoneId.COST_AREA) {
      throw new ZoneError(`DON can only move to DON_DECK or COST_AREA, not ${toZone}`);
    }

    const fromZone = don.zone;
    const owner = don.owner;
    const fromIndex = this.getDonIndexInZone(owner, fromZone, donId);

    // Update state
    const newStateManager = this.stateManager.moveDon(donId, toZone, targetCardId);

    // Update the state manager reference BEFORE emitting event
    // This ensures event handlers read the updated state
    this.stateManager = newStateManager;

    // Emit CARD_MOVED event for DON
    const event: CardMovedEvent = {
      type: GameEventType.CARD_MOVED,
      cardId: donId,
      playerId: owner,
      fromZone,
      toZone: targetCardId ? ZoneId.CHARACTER_AREA : toZone, // If given to card, show as CHARACTER_AREA
      fromIndex,
      toIndex: targetCardId ? undefined : this.getZoneSize(owner, toZone, newStateManager) - 1,
      timestamp: Date.now(),
    };
    this.eventEmitter.emit(event);

    return newStateManager;
  }

  /**
   * Add a card to a specific zone
   * @param playerId - The player who owns the zone
   * @param card - The card instance to add
   * @param zone - The zone to add to
   * @param index - Optional index (defaults to end)
   * @returns Updated GameStateManager
   * @throws ZoneError if the add violates zone limits
   */
  addToZone(playerId: PlayerId, card: CardInstance, zone: ZoneId, index?: number): GameStateManager {
    // Validate zone limits
    this.validateZoneLimit(playerId, zone, card);

    // Update card's zone property
    const updatedCard = { ...card, zone };

    // Get current zone contents
    const currentZone = this.stateManager.getZone(playerId, zone) as CardInstance[];
    const toIndex = index ?? currentZone.length;

    // Add to zone by updating player state
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      throw new ZoneError(`Player ${playerId} not found`);
    }

    // Clone player zones and add card
    const newZones = { ...player.zones };
    switch (zone) {
      case ZoneId.DECK:
        newZones.deck = [...newZones.deck];
        newZones.deck.splice(toIndex, 0, updatedCard);
        break;
      case ZoneId.HAND:
        newZones.hand = [...newZones.hand];
        newZones.hand.splice(toIndex, 0, updatedCard);
        break;
      case ZoneId.TRASH:
        newZones.trash = [...newZones.trash];
        newZones.trash.splice(toIndex, 0, updatedCard);
        break;
      case ZoneId.LIFE:
        newZones.life = [...newZones.life];
        newZones.life.splice(toIndex, 0, updatedCard);
        break;
      case ZoneId.CHARACTER_AREA:
        newZones.characterArea = [...newZones.characterArea];
        newZones.characterArea.splice(toIndex, 0, updatedCard);
        break;
      case ZoneId.LEADER_AREA:
        newZones.leaderArea = updatedCard;
        break;
      case ZoneId.STAGE_AREA:
        newZones.stageArea = updatedCard;
        break;
      default:
        throw new ZoneError(`Cannot add card to zone ${zone}`);
    }

    const newStateManager = this.stateManager.updatePlayer(playerId, { zones: newZones });

    // Emit CARD_MOVED event (from nowhere to zone)
    const event: CardMovedEvent = {
      type: GameEventType.CARD_MOVED,
      cardId: card.id,
      playerId,
      fromZone: ZoneId.LIMBO,
      toZone: zone,
      fromIndex: -1,
      toIndex,
      timestamp: Date.now(),
    };
    this.eventEmitter.emit(event);

    // Update the state manager reference
    this.stateManager = newStateManager;

    return newStateManager;
  }

  /**
   * Remove a card from a specific zone
   * @param playerId - The player who owns the zone
   * @param cardId - The card instance ID to remove
   * @param zone - The zone to remove from
   * @returns Updated GameStateManager and the removed card
   * @throws ZoneError if the card is not in the zone
   */
  removeFromZone(playerId: PlayerId, cardId: string, zone: ZoneId): { stateManager: GameStateManager; card: CardInstance } {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      throw new ZoneError(`Player ${playerId} not found`);
    }

    const fromIndex = this.getCardIndexInZone(playerId, zone, cardId);
    let removedCard: CardInstance | null = null;

    // Clone player zones and remove card
    const newZones = { ...player.zones };
    switch (zone) {
      case ZoneId.DECK:
        removedCard = newZones.deck[fromIndex];
        newZones.deck = newZones.deck.filter(c => c.id !== cardId);
        break;
      case ZoneId.HAND:
        removedCard = newZones.hand[fromIndex];
        newZones.hand = newZones.hand.filter(c => c.id !== cardId);
        break;
      case ZoneId.TRASH:
        removedCard = newZones.trash[fromIndex];
        newZones.trash = newZones.trash.filter(c => c.id !== cardId);
        break;
      case ZoneId.LIFE:
        removedCard = newZones.life[fromIndex];
        newZones.life = newZones.life.filter(c => c.id !== cardId);
        break;
      case ZoneId.CHARACTER_AREA:
        removedCard = newZones.characterArea[fromIndex];
        newZones.characterArea = newZones.characterArea.filter(c => c.id !== cardId);
        break;
      case ZoneId.LEADER_AREA:
        if (newZones.leaderArea?.id === cardId) {
          removedCard = newZones.leaderArea;
          newZones.leaderArea = null;
        }
        break;
      case ZoneId.STAGE_AREA:
        if (newZones.stageArea?.id === cardId) {
          removedCard = newZones.stageArea;
          newZones.stageArea = null;
        }
        break;
      default:
        throw new ZoneError(`Cannot remove card from zone ${zone}`);
    }

    if (!removedCard) {
      throw new ZoneError(`Card ${cardId} not found in zone ${zone}`);
    }

    const newStateManager = this.stateManager.updatePlayer(playerId, { zones: newZones });

    // Emit CARD_MOVED event (from zone to nowhere)
    const event: CardMovedEvent = {
      type: GameEventType.CARD_MOVED,
      cardId,
      playerId,
      fromZone: zone,
      toZone: ZoneId.LIMBO,
      fromIndex,
      toIndex: -1,
      timestamp: Date.now(),
    };
    this.eventEmitter.emit(event);

    // Update the state manager reference
    this.stateManager = newStateManager;

    return { stateManager: newStateManager, card: removedCard };
  }

  /**
   * Get the contents of a zone
   * @param playerId - The player who owns the zone
   * @param zone - The zone to query
   * @returns Array of cards or DON in the zone
   */
  getZoneContents(playerId: PlayerId, zone: ZoneId): (CardInstance | DonInstance)[] {
    return this.stateManager.getZone(playerId, zone);
  }

  /**
   * Get the size of a zone
   * @param playerId - The player who owns the zone
   * @param zone - The zone to query
   * @param stateManager - Optional state manager to use (defaults to current)
   * @returns Number of cards in the zone
   */
  private getZoneSize(playerId: PlayerId, zone: ZoneId, stateManager?: GameStateManager): number {
    const manager = stateManager || this.stateManager;
    return manager.getZone(playerId, zone).length;
  }

  /**
   * Validate that adding a card to a zone doesn't violate zone limits
   * @param playerId - The player who owns the zone
   * @param zone - The zone to validate
   * @param card - The card being added
   * @throws ZoneError if the zone limit would be exceeded
   */
  private validateZoneLimit(playerId: PlayerId, zone: ZoneId, card: CardInstance): void {
    const currentSize = this.getZoneSize(playerId, zone);

    switch (zone) {
      case ZoneId.CHARACTER_AREA:
        if (currentSize >= ZoneManager.MAX_CHARACTER_AREA) {
          throw new ZoneError(
            `Character area is full (max ${ZoneManager.MAX_CHARACTER_AREA})`
          );
        }
        break;
      case ZoneId.STAGE_AREA:
        if (currentSize >= ZoneManager.MAX_STAGE_AREA) {
          throw new ZoneError(
            `Stage area is full (max ${ZoneManager.MAX_STAGE_AREA})`
          );
        }
        break;
      case ZoneId.LEADER_AREA:
        if (currentSize >= ZoneManager.MAX_LEADER_AREA) {
          throw new ZoneError(
            `Leader area is full (max ${ZoneManager.MAX_LEADER_AREA})`
          );
        }
        break;
      // Other zones have no limits
    }
  }

  /**
   * Get the index of a card in a zone
   * @param playerId - The player who owns the zone
   * @param zone - The zone to search
   * @param cardId - The card ID to find
   * @returns The index of the card, or -1 if not found
   */
  private getCardIndexInZone(playerId: PlayerId, zone: ZoneId, cardId: string): number {
    const zoneContents = this.stateManager.getZone(playerId, zone) as CardInstance[];
    
    // For single-card zones, return 0 if the card matches
    if (zone === ZoneId.LEADER_AREA || zone === ZoneId.STAGE_AREA) {
      return zoneContents.length > 0 && zoneContents[0].id === cardId ? 0 : -1;
    }

    // For array zones, find the index
    return zoneContents.findIndex(c => c.id === cardId);
  }

  /**
   * Get the index of a DON in a zone
   * @param playerId - The player who owns the zone
   * @param zone - The zone to search
   * @param donId - The DON ID to find
   * @returns The index of the DON, or -1 if not found
   */
  private getDonIndexInZone(playerId: PlayerId, zone: ZoneId, donId: string): number {
    const zoneContents = this.stateManager.getZone(playerId, zone) as DonInstance[];
    return zoneContents.findIndex(d => d.id === donId);
  }

  /**
   * Update the internal state manager reference
   * This should be called after external state updates
   * @param stateManager - The new state manager
   */
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
  }
}
