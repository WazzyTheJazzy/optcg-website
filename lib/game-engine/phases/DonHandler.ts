/**
 * DonHandler.ts
 * 
 * Handles giving DON cards to characters and leaders during the Main Phase.
 * Validates DON giving legality and updates card power calculations.
 * 
 * Requirements: 6.6
 */

import { GameStateManager } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter, GameEventType, PowerChangedEvent } from '../rendering/EventEmitter';
import {
  PlayerId,
  CardInstance,
  DonInstance,
  ZoneId,
  CardState,
  CardCategory,
} from '../core/types';

/**
 * Error thrown when a DON giving operation fails
 */
export class DonGivingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DonGivingError';
  }
}

/**
 * Result of a DON giving operation
 */
export interface GiveDonResult {
  success: boolean;
  error?: string;
  newState: GameStateManager;
}

/**
 * Handle giving a DON card to a character or leader
 * @param stateManager - The current game state manager
 * @param zoneManager - The zone manager
 * @param eventEmitter - The event emitter
 * @param playerId - The player giving the DON
 * @param donId - The DON instance ID to give
 * @param targetCardId - The target character or leader card ID
 * @returns Result of the give DON operation
 */
export function handleGiveDon(
  stateManager: GameStateManager,
  zoneManager: ZoneManager,
  eventEmitter: EventEmitter,
  playerId: PlayerId,
  donId: string,
  targetCardId: string
): GiveDonResult {
  try {
    // 1. Validate DON exists and is in cost area
    const don = stateManager.getDon(donId);
    if (!don) {
      return {
        success: false,
        error: `DON ${donId} not found`,
        newState: stateManager,
      };
    }

    if (don.zone !== ZoneId.COST_AREA) {
      return {
        success: false,
        error: `DON ${donId} is not in cost area (current zone: ${don.zone})`,
        newState: stateManager,
      };
    }

    if (don.owner !== playerId) {
      return {
        success: false,
        error: `DON ${donId} is not owned by player ${playerId}`,
        newState: stateManager,
      };
    }

    // 2. Validate DON is active
    if (don.state !== CardState.ACTIVE) {
      return {
        success: false,
        error: `DON ${donId} is not active (current state: ${don.state})`,
        newState: stateManager,
      };
    }

    // 3. Validate target card exists and is on field
    const targetCard = stateManager.getCard(targetCardId);
    if (!targetCard) {
      return {
        success: false,
        error: `Target card ${targetCardId} not found`,
        newState: stateManager,
      };
    }

    // 4. Validate target is character or leader
    const isCharacter = targetCard.definition.category === CardCategory.CHARACTER;
    const isLeader = targetCard.definition.category === CardCategory.LEADER;
    
    if (!isCharacter && !isLeader) {
      return {
        success: false,
        error: `Target card ${targetCardId} is not a character or leader (category: ${targetCard.definition.category})`,
        newState: stateManager,
      };
    }

    // 5. Validate target is on field (character area or leader area)
    const isOnField = 
      targetCard.zone === ZoneId.CHARACTER_AREA || 
      targetCard.zone === ZoneId.LEADER_AREA;
    
    if (!isOnField) {
      return {
        success: false,
        error: `Target card ${targetCardId} is not on field (current zone: ${targetCard.zone})`,
        newState: stateManager,
      };
    }

    // 6. Validate target is controlled by the player
    if (targetCard.controller !== playerId) {
      return {
        success: false,
        error: `Target card ${targetCardId} is not controlled by player ${playerId}`,
        newState: stateManager,
      };
    }

    // 7. Calculate old power before giving DON
    const oldPower = computeCurrentPower(targetCard);

    // 8. Move DON from cost area to under target card
    zoneManager.updateStateManager(stateManager);
    const newStateManager = zoneManager.moveDon(donId, ZoneId.COST_AREA, targetCardId);

    // 9. Calculate new power after giving DON
    const updatedTargetCard = newStateManager.getCard(targetCardId);
    if (!updatedTargetCard) {
      return {
        success: false,
        error: `Failed to retrieve updated target card ${targetCardId}`,
        newState: stateManager,
      };
    }
    
    const newPower = computeCurrentPower(updatedTargetCard);

    // 10. Emit POWER_CHANGED event
    const powerChangedEvent: PowerChangedEvent = {
      type: GameEventType.POWER_CHANGED,
      playerId,
      cardId: targetCardId,
      oldPower,
      newPower,
      reason: 'DON given',
      timestamp: Date.now(),
    };
    eventEmitter.emit(powerChangedEvent);

    return {
      success: true,
      newState: newStateManager,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      newState: stateManager,
    };
  }
}

/**
 * Compute the current power of a card
 * Includes base power + modifiers + given DON count
 * @param card - The card instance
 * @returns The current power value
 */
export function computeCurrentPower(card: CardInstance): number {
  // Start with base power
  let power = card.definition.basePower ?? 0;

  // Add power modifiers
  for (const modifier of card.modifiers) {
    if (modifier.type === 'POWER') {
      power += Number(modifier.value);
    }
  }

  // Add power from given DON (each DON adds 1000 power)
  power += card.givenDon.length * 1000;

  return power;
}

/**
 * Validate if a DON can be given to a target card
 * @param stateManager - The current game state manager
 * @param playerId - The player giving the DON
 * @param donId - The DON instance ID
 * @param targetCardId - The target card ID
 * @returns True if the DON can be given, false otherwise
 */
export function canGiveDon(
  stateManager: GameStateManager,
  playerId: PlayerId,
  donId: string,
  targetCardId: string
): boolean {
  const don = stateManager.getDon(donId);
  if (!don) return false;
  if (don.zone !== ZoneId.COST_AREA) return false;
  if (don.owner !== playerId) return false;
  if (don.state !== CardState.ACTIVE) return false;

  const targetCard = stateManager.getCard(targetCardId);
  if (!targetCard) return false;
  
  const isCharacter = targetCard.definition.category === CardCategory.CHARACTER;
  const isLeader = targetCard.definition.category === CardCategory.LEADER;
  if (!isCharacter && !isLeader) return false;

  const isOnField = 
    targetCard.zone === ZoneId.CHARACTER_AREA || 
    targetCard.zone === ZoneId.LEADER_AREA;
  if (!isOnField) return false;

  if (targetCard.controller !== playerId) return false;

  return true;
}
