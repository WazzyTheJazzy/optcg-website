/**
 * KOHandler.ts
 * 
 * Handles K.O. (Knock Out) mechanics for characters in the One Piece TCG Engine.
 * Manages the process of checking for On K.O. effects, moving cards to trash,
 * and resolving triggers. Also handles Banish keyword integration.
 */

import {
  CardInstance,
  TriggerTiming,
  TriggerInstance,
  GameEvent,
  GameEventType,
  ZoneId,
} from '../core/types';
import { GameStateManager } from '../core/GameState';
import { shouldBanish, banishCard } from './BanishHandler';

/**
 * K.O. a character by moving it to trash and handling On K.O. effects
 * 
 * Process:
 * 1. Check for "On K.O." effects while card is still on field
 * 2. Enqueue On K.O. triggers
 * 3. Move card to trash
 * 4. Return queued triggers (to be resolved by effect system)
 * 
 * Note: This function does NOT resolve the triggers itself. The triggers
 * are returned and should be resolved by the EffectSystem (tasks 24-27).
 * This separation allows the effect system to handle trigger resolution
 * with proper priority ordering and timing.
 * 
 * @param character - The character card to K.O.
 * @param stateManager - The current game state manager
 * @returns Object containing updated state manager and queued On K.O. triggers
 */
export function koCharacter(
  character: CardInstance,
  stateManager: GameStateManager
): {
  stateManager: GameStateManager;
  triggers: TriggerInstance[];
} {
  const triggers: TriggerInstance[] = [];

  // Step 1: Check for "On K.O." effects while card is still on field
  // Find all effects on the character with TriggerTiming.ON_KO
  const onKOEffects = character.definition.effects.filter(
    (effect) => effect.triggerTiming === TriggerTiming.ON_KO
  );

  // Step 2: Enqueue On K.O. triggers
  // Create trigger instances for each On K.O. effect
  // These will be resolved AFTER the card is in trash
  for (const effectDef of onKOEffects) {
    // Create a K.O. event for the trigger context
    const koEvent: GameEvent = {
      type: GameEventType.CARD_MOVED, // K.O. is represented as a card move to trash
      playerId: character.controller,
      cardId: character.id,
      data: {
        cardId: character.id,
        fromZone: character.zone,
        toZone: ZoneId.TRASH,
        reason: 'KO',
      },
      timestamp: Date.now(),
    };

    // Calculate priority based on controller
    // Turn player's triggers resolve first (higher priority)
    const activePlayer = stateManager.getState().activePlayer;
    const priority = character.controller === activePlayer ? 1 : 0;

    const trigger: TriggerInstance = {
      effectDefinition: effectDef,
      source: character,
      controller: character.controller,
      event: koEvent,
      priority,
    };

    triggers.push(trigger);
  }

  // Step 3: Move card to trash or banish it
  // Check if the card should be banished instead of going to trash
  let updatedStateManager: GameStateManager;
  
  if (shouldBanish(character)) {
    // Banish the card permanently - no On K.O. effects trigger
    updatedStateManager = banishCard(character, stateManager);
    // Clear triggers since banished cards don't trigger On K.O. effects
    triggers.length = 0;
  } else {
    // Use the state manager's moveCard method to move the character to trash
    updatedStateManager = stateManager.moveCard(character.id, ZoneId.TRASH);
  }

  // Step 4: Return updated state and triggers
  // The triggers will be resolved by the EffectSystem after this function returns
  // At that point, the card will already be in trash (or banished), which is correct for On K.O. effects
  return {
    stateManager: updatedStateManager,
    triggers,
  };
}
