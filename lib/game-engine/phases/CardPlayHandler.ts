/**
 * CardPlayHandler.ts
 * 
 * Handles playing cards from hand during the Main Phase.
 * Validates card play legality, pays costs, and triggers On Play effects.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 15.1
 */

import { GameStateManager } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import { EffectSystem } from '../effects/EffectSystem';
import {
  PlayerId,
  CardInstance,
  ZoneId,
  CardCategory,
  CardState,
  TriggerTiming,
  EffectTimingType,
  GameEventType,
} from '../core/types';

/**
 * Error thrown when a card play operation fails
 */
export class CardPlayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardPlayError';
  }
}

/**
 * Result of a card play operation
 */
export interface PlayCardResult {
  success: boolean;
  error?: string;
  newState: GameStateManager;
}

/**
 * Handle playing a card from hand
 * @param stateManager - The current game state manager
 * @param zoneManager - The zone manager
 * @param eventEmitter - The event emitter
 * @param playerId - The player playing the card
 * @param cardId - The card instance ID to play
 * @param effectSystem - Optional effect system for triggering ON_PLAY effects
 * @returns Result of the play operation
 */
export function handlePlayCard(
  stateManager: GameStateManager,
  zoneManager: ZoneManager,
  eventEmitter: EventEmitter,
  playerId: PlayerId,
  cardId: string,
  effectSystem?: EffectSystem
): PlayCardResult {
  try {
    // 1. Validate card is in hand
    const card = stateManager.getCard(cardId);
    if (!card) {
      return {
        success: false,
        error: `Card ${cardId} not found`,
        newState: stateManager,
      };
    }

    if (card.zone !== ZoneId.HAND) {
      return {
        success: false,
        error: `Card ${cardId} is not in hand (current zone: ${card.zone})`,
        newState: stateManager,
      };
    }

    if (card.owner !== playerId) {
      return {
        success: false,
        error: `Card ${cardId} is not owned by player ${playerId}`,
        newState: stateManager,
      };
    }

    // 2. Validate player can afford cost
    const cost = card.definition.baseCost ?? 0;
    const canAfford = canAffordCost(stateManager, playerId, cost);
    if (!canAfford) {
      return {
        success: false,
        error: `Player ${playerId} cannot afford cost ${cost}`,
        newState: stateManager,
      };
    }

    // 3. Pay cost by resting DON
    let currentState = payCost(stateManager, playerId, cost);

    // 4. Handle card based on category
    switch (card.definition.category) {
      case CardCategory.CHARACTER:
        currentState = playCharacter(currentState, zoneManager, eventEmitter, card);
        break;
      case CardCategory.STAGE:
        currentState = playStage(currentState, zoneManager, eventEmitter, card);
        break;
      case CardCategory.EVENT:
        currentState = playEvent(currentState, zoneManager, eventEmitter, card);
        break;
      default:
        return {
          success: false,
          error: `Cannot play card of category ${card.definition.category}`,
          newState: stateManager,
        };
    }

    // 5. Trigger and resolve ON_PLAY effects if effect system is provided
    if (effectSystem) {
      // Update effect system with current state
      effectSystem.updateStateManager(currentState);
      
      // Create CARD_PLAYED event for effect system
      const cardPlayedEvent: import('../core/types').GameEvent = {
        type: GameEventType.CARD_PLAYED,
        playerId: playerId,
        cardId: cardId,
        data: {
          cardName: card.definition.name,
          category: card.definition.category,
        },
        timestamp: Date.now(),
      };
      
      // Trigger effects based on the CARD_PLAYED event
      effectSystem.triggerEffects(cardPlayedEvent);
      
      // Resolve all triggered effects before continuing
      effectSystem.resolveStack();
      
      // Get updated state from effect system
      currentState = effectSystem.getStateManager();
    }

    return {
      success: true,
      newState: currentState,
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
 * Check if a player can afford a cost
 * @param stateManager - The current game state manager
 * @param playerId - The player ID
 * @param cost - The cost amount
 * @returns True if player has enough active DON
 */
function canAffordCost(
  stateManager: GameStateManager,
  playerId: PlayerId,
  cost: number
): boolean {
  const player = stateManager.getPlayer(playerId);
  if (!player) return false;

  // Count active DON in cost area
  const activeDonCount = player.zones.costArea.filter(
    don => don.state === CardState.ACTIVE
  ).length;

  return activeDonCount >= cost;
}

/**
 * Pay a cost by resting DON in cost area
 * @param stateManager - The current game state manager
 * @param playerId - The player ID
 * @param cost - The cost amount
 * @returns Updated game state manager
 */
function payCost(
  stateManager: GameStateManager,
  playerId: PlayerId,
  cost: number
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(playerId);
  if (!player) return currentState;

  // Get active DON in cost area
  const activeDon = player.zones.costArea.filter(
    don => don.state === CardState.ACTIVE
  );

  // Rest the required number of DON
  for (let i = 0; i < cost && i < activeDon.length; i++) {
    const don = activeDon[i];
    const updatedDon = { ...don, state: CardState.RESTED };
    
    // Update the DON in the player's cost area
    const updatedCostArea = player.zones.costArea.map(d =>
      d.id === don.id ? updatedDon : d
    );
    
    currentState = currentState.updatePlayer(playerId, {
      zones: {
        ...player.zones,
        costArea: updatedCostArea,
      },
    });
    
    // Refresh player reference after update
    const updatedPlayer = currentState.getPlayer(playerId);
    if (updatedPlayer) {
      player.zones = updatedPlayer.zones;
    }
  }

  return currentState;
}

/**
 * Play a character card
 * @param stateManager - The current game state manager
 * @param zoneManager - The zone manager
 * @param eventEmitter - The event emitter
 * @param card - The character card to play
 * @returns Updated game state manager
 */
function playCharacter(
  stateManager: GameStateManager,
  zoneManager: ZoneManager,
  eventEmitter: EventEmitter,
  card: CardInstance
): GameStateManager {
  console.log(`🎴 CardPlayHandler.playCharacter: Playing ${card.definition.name}`);
  
  const player = stateManager.getPlayer(card.owner);
  if (!player) return stateManager;

  // Enforce 5-card character area limit
  if (player.zones.characterArea.length >= 5) {
    throw new CardPlayError('Character area is full (max 5 characters)');
  }

  console.log(`📍 CardPlayHandler.playCharacter: Character area has ${player.zones.characterArea.length} cards`);

  // Update zone manager's state reference
  zoneManager.updateStateManager(stateManager);
  console.log(`🔄 CardPlayHandler.playCharacter: Zone manager updated`);

  // Move card to character area as ACTIVE
  const newStateManager = zoneManager.moveCard(card.id, ZoneId.CHARACTER_AREA);
  console.log(`✅ CardPlayHandler.playCharacter: Card moved to CHARACTER_AREA`);
  
  // Update card state to ACTIVE
  const updatedStateManager = newStateManager.updateCard(card.id, {
    state: CardState.ACTIVE,
  });
  console.log(`⚡ CardPlayHandler.playCharacter: Card state set to ACTIVE`);
  console.log(`✨ CardPlayHandler.playCharacter: Complete`);

  return updatedStateManager;
}

/**
 * Play a stage card
 * @param stateManager - The current game state manager
 * @param zoneManager - The zone manager
 * @param eventEmitter - The event emitter
 * @param card - The stage card to play
 * @returns Updated game state manager
 */
function playStage(
  stateManager: GameStateManager,
  zoneManager: ZoneManager,
  eventEmitter: EventEmitter,
  card: CardInstance
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(card.owner);
  if (!player) return currentState;

  // Update zone manager's state reference
  zoneManager.updateStateManager(currentState);

  // Trash existing stage if present
  if (player.zones.stageArea) {
    const existingStageId = player.zones.stageArea.id;
    const newStateManager = zoneManager.moveCard(existingStageId, ZoneId.TRASH);
    currentState = newStateManager;
    zoneManager.updateStateManager(currentState);
  }

  // Move new stage to stage area as ACTIVE
  const newStateManager = zoneManager.moveCard(card.id, ZoneId.STAGE_AREA);
  currentState = newStateManager;

  // Update card state to ACTIVE
  currentState = currentState.updateCard(card.id, {
    state: CardState.ACTIVE,
  });

  return currentState;
}

/**
 * Play an event card
 * @param stateManager - The current game state manager
 * @param zoneManager - The zone manager
 * @param eventEmitter - The event emitter
 * @param card - The event card to play
 * @returns Updated game state manager
 */
function playEvent(
  stateManager: GameStateManager,
  zoneManager: ZoneManager,
  eventEmitter: EventEmitter,
  card: CardInstance
): GameStateManager {
  let currentState = stateManager;

  // Update zone manager's state reference
  zoneManager.updateStateManager(currentState);

  // Move event to trash (events are resolved immediately and then trashed)
  // The effect resolution will happen in handlePlayCard after this returns
  const newStateManager = zoneManager.moveCard(card.id, ZoneId.TRASH);
  currentState = newStateManager;

  return currentState;
}


