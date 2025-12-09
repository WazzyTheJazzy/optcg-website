/**
 * EffectScripts.ts
 * 
 * Effect script execution system for the One Piece TCG Engine.
 * Provides EffectContext interface with helper methods for effect scripts.
 * Manages script registry and execution.
 */

import { GameStateManager } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { DamageCalculator } from '../battle/DamageCalculator';
import { koCharacter } from '../battle/KOHandler';
import { banishCard as banishCardHandler } from '../battle/BanishHandler';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  EffectContext,
  CardInstance,
  PlayerId,
  ZoneId,
  CardState,
  ModifierDuration,
  ModifierType,
  Modifier,
  CardFilter,
  TargetType,
  CardCategory,
} from '../core/types';

/**
 * Error thrown when an effect script operation fails
 */
export class EffectScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EffectScriptError';
  }
}

/**
 * Type for effect script functions
 */
export type EffectScript = (context: EffectScriptContext) => void;

/**
 * Extended effect context with helper methods for script execution
 */
export interface EffectScriptContext extends EffectContext {
  // Helper methods
  moveCard: (cardId: string, toZone: ZoneId) => void;
  modifyPower: (cardId: string, amount: number, duration: ModifierDuration) => void;
  modifyCost: (cardId: string, amount: number, duration: ModifierDuration) => void;
  drawCards: (playerId: PlayerId, count: number) => void;
  searchZone: (playerId: PlayerId, zone: ZoneId, filter: CardFilter) => CardInstance[];
  koCard: (cardId: string) => void;
  banishCard: (cardId: string) => void;
  restCard: (cardId: string) => void;
  activateCard: (cardId: string) => void;
}

/**
 * Registry mapping script IDs to effect script functions
 */
export class EffectScriptRegistry {
  private scripts: Map<string, EffectScript> = new Map();

  /**
   * Register an effect script
   * 
   * @param scriptId - The unique script ID
   * @param script - The script function
   */
  register(scriptId: string, script: EffectScript): void {
    if (this.scripts.has(scriptId)) {
      throw new EffectScriptError(`Script ${scriptId} is already registered`);
    }
    this.scripts.set(scriptId, script);
  }

  /**
   * Get an effect script by ID
   * 
   * @param scriptId - The script ID
   * @returns The script function or undefined if not found
   */
  get(scriptId: string): EffectScript | undefined {
    return this.scripts.get(scriptId);
  }

  /**
   * Check if a script is registered
   * 
   * @param scriptId - The script ID
   * @returns True if the script exists
   */
  has(scriptId: string): boolean {
    return this.scripts.has(scriptId);
  }

  /**
   * Unregister an effect script
   * 
   * @param scriptId - The script ID
   * @returns True if the script was removed
   */
  unregister(scriptId: string): boolean {
    return this.scripts.delete(scriptId);
  }

  /**
   * Get all registered script IDs
   * 
   * @returns Array of script IDs
   */
  getAllScriptIds(): string[] {
    return Array.from(this.scripts.keys());
  }

  /**
   * Clear all registered scripts
   */
  clear(): void {
    this.scripts.clear();
  }
}

/**
 * Effect script executor that provides helper methods and manages script execution
 */
export class EffectScriptExecutor {
  private stateManager: GameStateManager;
  private zoneManager: ZoneManager;
  private damageCalculator: DamageCalculator;
  private eventEmitter: EventEmitter;
  private registry: EffectScriptRegistry;

  constructor(
    stateManager: GameStateManager,
    zoneManager: ZoneManager,
    damageCalculator: DamageCalculator,
    eventEmitter: EventEmitter,
    registry?: EffectScriptRegistry
  ) {
    this.stateManager = stateManager;
    this.zoneManager = zoneManager;
    this.damageCalculator = damageCalculator;
    this.eventEmitter = eventEmitter;
    this.registry = registry || new EffectScriptRegistry();
  }

  /**
   * Execute an effect script
   * 
   * @param scriptId - The script ID to execute
   * @param baseContext - The base effect context
   * @throws EffectScriptError if script not found or execution fails
   */
  executeScript(scriptId: string, baseContext: EffectContext): void {
    const script = this.registry.get(scriptId);
    if (!script) {
      throw new EffectScriptError(`Effect script ${scriptId} not found in registry`);
    }

    // Create extended context with helper methods
    const context = this.createScriptContext(baseContext);

    try {
      script(context);
    } catch (error) {
      throw new EffectScriptError(
        `Error executing effect script ${scriptId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create an extended script context with helper methods
   * 
   * @param baseContext - The base effect context
   * @returns Extended context with helper methods
   */
  private createScriptContext(baseContext: EffectContext): EffectScriptContext {
    return {
      ...baseContext,
      moveCard: (cardId: string, toZone: ZoneId) => this.moveCard(cardId, toZone),
      modifyPower: (cardId: string, amount: number, duration: ModifierDuration) =>
        this.modifyPower(cardId, amount, duration),
      modifyCost: (cardId: string, amount: number, duration: ModifierDuration) =>
        this.modifyCost(cardId, amount, duration),
      drawCards: (playerId: PlayerId, count: number) => this.drawCards(playerId, count),
      searchZone: (playerId: PlayerId, zone: ZoneId, filter: CardFilter) =>
        this.searchZone(playerId, zone, filter),
      koCard: (cardId: string) => this.koCard(cardId),
      banishCard: (cardId: string) => this.banishCard(cardId),
      restCard: (cardId: string) => this.restCard(cardId),
      activateCard: (cardId: string) => this.activateCard(cardId),
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Move a card to a different zone
   * 
   * @param cardId - The card ID to move
   * @param toZone - The destination zone
   * @throws EffectScriptError if card not found or move fails
   */
  private moveCard(cardId: string, toZone: ZoneId): void {
    try {
      this.stateManager = this.zoneManager.moveCard(cardId, toZone);
    } catch (error) {
      throw new EffectScriptError(
        `Failed to move card ${cardId} to ${toZone}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Modify a card's power
   * 
   * @param cardId - The card ID to modify
   * @param amount - The power change amount (can be negative)
   * @param duration - How long the modifier lasts
   * @throws EffectScriptError if card not found
   */
  private modifyPower(cardId: string, amount: number, duration: ModifierDuration): void {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new EffectScriptError(`Card ${cardId} not found`);
    }

    // Create power modifier
    const modifier: Modifier = {
      id: `modifier_${Date.now()}_${Math.random()}`,
      type: ModifierType.POWER,
      value: amount,
      duration,
      source: card.id,
      timestamp: Date.now(),
    };

    // Add modifier to card
    const updatedModifiers = [...card.modifiers, modifier];
    this.stateManager = this.stateManager.updateCard(cardId, {
      modifiers: updatedModifiers,
    });

    // Update zone manager's state reference
    this.zoneManager.updateStateManager(this.stateManager);
  }

  /**
   * Modify a card's cost
   * 
   * @param cardId - The card ID to modify
   * @param amount - The cost change amount (can be negative)
   * @param duration - How long the modifier lasts
   * @throws EffectScriptError if card not found
   */
  private modifyCost(cardId: string, amount: number, duration: ModifierDuration): void {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new EffectScriptError(`Card ${cardId} not found`);
    }

    // Create cost modifier
    const modifier: Modifier = {
      id: `modifier_${Date.now()}_${Math.random()}`,
      type: ModifierType.COST,
      value: amount,
      duration,
      source: card.id,
      timestamp: Date.now(),
    };

    // Add modifier to card
    const updatedModifiers = [...card.modifiers, modifier];
    this.stateManager = this.stateManager.updateCard(cardId, {
      modifiers: updatedModifiers,
    });

    // Update zone manager's state reference
    this.zoneManager.updateStateManager(this.stateManager);
  }

  /**
   * Draw cards for a player
   * 
   * @param playerId - The player drawing cards
   * @param count - Number of cards to draw
   * @throws EffectScriptError if player not found or deck is empty
   */
  private drawCards(playerId: PlayerId, count: number): void {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      throw new EffectScriptError(`Player ${playerId} not found`);
    }

    for (let i = 0; i < count; i++) {
      if (player.zones.deck.length === 0) {
        throw new EffectScriptError(`Player ${playerId} has no cards left in deck`);
      }

      // Get top card of deck
      const topCard = player.zones.deck[0];

      // Move card from deck to hand
      this.stateManager = this.zoneManager.moveCard(topCard.id, ZoneId.HAND);

      // Update player reference for next iteration
      const updatedPlayer = this.stateManager.getPlayer(playerId);
      if (!updatedPlayer) break;
      Object.assign(player, updatedPlayer);
    }
  }

  /**
   * Search a zone for cards matching a filter
   * 
   * @param playerId - The player whose zone to search
   * @param zone - The zone to search
   * @param filter - The filter criteria
   * @returns Array of matching cards
   */
  private searchZone(playerId: PlayerId, zone: ZoneId, filter: CardFilter): CardInstance[] {
    const zoneContents = this.stateManager.getZone(playerId, zone) as CardInstance[];

    return zoneContents.filter(card => {
      // Check category
      if (filter.category && card.definition.category !== filter.category) {
        return false;
      }

      // Check colors (card must have at least one matching color)
      if (filter.colors && filter.colors.length > 0) {
        const hasMatchingColor = filter.colors.some(color =>
          card.definition.colors.includes(color)
        );
        if (!hasMatchingColor) return false;
      }

      // Check keywords (card must have all specified keywords)
      if (filter.keywords && filter.keywords.length > 0) {
        const hasAllKeywords = filter.keywords.every(keyword =>
          card.definition.keywords.includes(keyword)
        );
        if (!hasAllKeywords) return false;
      }

      // Check power range
      const currentPower = this.damageCalculator.computeCurrentPower(card);
      if (filter.minPower !== undefined && currentPower < filter.minPower) {
        return false;
      }
      if (filter.maxPower !== undefined && currentPower > filter.maxPower) {
        return false;
      }

      // Check cost range
      const currentCost = this.damageCalculator.getCurrentCost(card);
      if (filter.minCost !== undefined && currentCost < filter.minCost) {
        return false;
      }
      if (filter.maxCost !== undefined && currentCost > filter.maxCost) {
        return false;
      }

      return true;
    });
  }

  /**
   * K.O. a card (move to trash with proper trigger handling)
   * 
   * @param cardId - The card ID to K.O.
   * @throws EffectScriptError if card not found or K.O. fails
   */
  private koCard(cardId: string): void {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new EffectScriptError(`Card ${cardId} not found`);
    }

    try {
      const result = koCharacter(card, this.stateManager);
      this.stateManager = result.stateManager;
      
      // Update zone manager's state reference
      this.zoneManager.updateStateManager(this.stateManager);

      // Note: The triggers returned by koCharacter should be handled by the EffectSystem
      // For now, we just update the state. The trigger handling will be integrated
      // when this is called from within the EffectSystem context.
    } catch (error) {
      throw new EffectScriptError(
        `Failed to K.O. card ${cardId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Banish a card (remove from game permanently)
   * 
   * Banished cards are moved to the banished zone and cannot be retrieved.
   * Unlike K.O., banish does NOT trigger "On K.O." effects.
   * 
   * @param cardId - The card ID to banish
   * @throws EffectScriptError if card not found or banish fails
   */
  private banishCard(cardId: string): void {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new EffectScriptError(`Card ${cardId} not found`);
    }

    try {
      this.stateManager = banishCardHandler(card, this.stateManager);
      
      // Update zone manager's state reference
      this.zoneManager.updateStateManager(this.stateManager);
    } catch (error) {
      throw new EffectScriptError(
        `Failed to banish card ${cardId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Rest a card (set to RESTED state)
   * 
   * @param cardId - The card ID to rest
   * @throws EffectScriptError if card not found
   */
  private restCard(cardId: string): void {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new EffectScriptError(`Card ${cardId} not found`);
    }

    // Only rest if card is currently active
    if (card.state === CardState.ACTIVE) {
      this.stateManager = this.stateManager.updateCard(cardId, {
        state: CardState.RESTED,
      });

      // Update zone manager's state reference
      this.zoneManager.updateStateManager(this.stateManager);
    }
  }

  /**
   * Activate a card (set to ACTIVE state)
   * 
   * @param cardId - The card ID to activate
   * @throws EffectScriptError if card not found
   */
  private activateCard(cardId: string): void {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new EffectScriptError(`Card ${cardId} not found`);
    }

    // Only activate if card is currently rested
    if (card.state === CardState.RESTED) {
      this.stateManager = this.stateManager.updateCard(cardId, {
        state: CardState.ACTIVE,
      });

      // Update zone manager's state reference
      this.zoneManager.updateStateManager(this.stateManager);
    }
  }

  /**
   * Register an effect script
   * 
   * @param scriptId - The script ID
   * @param script - The script function
   */
  registerScript(scriptId: string, script: EffectScript): void {
    this.registry.register(scriptId, script);
  }

  /**
   * Get the script registry
   * 
   * @returns The effect script registry
   */
  getRegistry(): EffectScriptRegistry {
    return this.registry;
  }

  /**
   * Update the internal state manager reference
   * This should be called after external state updates
   * 
   * @param stateManager - The new state manager
   */
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
    this.zoneManager.updateStateManager(stateManager);
  }

  /**
   * Get the current state manager
   * 
   * @returns The current state manager
   */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }
}

// ============================================================================
// Common Effect Scripts
// ============================================================================

/**
 * Register all common effect scripts to a registry
 * 
 * @param registry - The registry to register scripts to
 */
export function registerCommonEffectScripts(registry: EffectScriptRegistry): void {
  // Draw effects
  registry.register('draw_1', drawCards(1));
  registry.register('draw_2', drawCards(2));
  registry.register('draw_3', drawCards(3));

  // Power boost effects
  registry.register('power_boost_1000', powerBoost(1000));
  registry.register('power_boost_2000', powerBoost(2000));
  registry.register('power_boost_3000', powerBoost(3000));
  registry.register('power_boost_1000_until_end_of_turn', powerBoostUntilEndOfTurn(1000));
  registry.register('power_boost_2000_until_end_of_turn', powerBoostUntilEndOfTurn(2000));
  registry.register('power_boost_1000_during_battle', powerBoostDuringBattle(1000));
  registry.register('power_boost_2000_during_battle', powerBoostDuringBattle(2000));

  // Cost reduction effects
  registry.register('cost_reduction_1', costReduction(1));
  registry.register('cost_reduction_2', costReduction(2));
  registry.register('cost_reduction_3', costReduction(3));

  // Search effects
  registry.register('search_deck_character', searchDeckForCharacter());
  registry.register('search_deck_event', searchDeckForEvent());
  registry.register('search_deck_stage', searchDeckForStage());
  registry.register('search_deck_cost_4_or_less', searchDeckByCost(4));
  registry.register('search_deck_cost_5_or_less', searchDeckByCost(5));

  // K.O. effects
  registry.register('ko_target_character', koTargetCharacter());
  registry.register('ko_rested_character', koRestedCharacter());
  registry.register('ko_cost_3_or_less', koCostOrLess(3));
  registry.register('ko_cost_4_or_less', koCostOrLess(4));

  // Rest/Activate effects
  registry.register('rest_target_character', restTargetCharacter());
  registry.register('rest_all_opponent_characters', restAllOpponentCharacters());
  registry.register('activate_target_character', activateTargetCharacter());

  // On K.O. effects
  registry.register('on_ko_search_deck', onKOSearchDeck());
  registry.register('on_ko_add_to_hand_from_trash', onKOAddToHandFromTrash());
  registry.register('on_ko_draw_1', drawCards(1));

  // When Attacking effects
  registry.register('when_attacking_power_boost_2000', powerBoostDuringBattle(2000));
  registry.register('when_attacking_draw_1', drawCards(1));
  registry.register('when_attacking_power_boost_1000', powerBoostDuringBattle(1000));
}

// ============================================================================
// Effect Script Factories
// ============================================================================

/**
 * Create a draw cards effect script
 * 
 * @param count - Number of cards to draw
 * @returns Effect script function
 */
function drawCards(count: number): EffectScript {
  return (context: EffectScriptContext) => {
    context.drawCards(context.controller, count);
  };
}

/**
 * Create a power boost effect script (permanent)
 * 
 * @param amount - Power boost amount
 * @returns Effect script function
 */
function powerBoost(amount: number): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for power boost');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for power boost');
    }
    context.modifyPower(target.cardId, amount, ModifierDuration.PERMANENT);
  };
}

/**
 * Create a power boost effect script (until end of turn)
 * 
 * @param amount - Power boost amount
 * @returns Effect script function
 */
function powerBoostUntilEndOfTurn(amount: number): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for power boost');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for power boost');
    }
    context.modifyPower(target.cardId, amount, ModifierDuration.UNTIL_END_OF_TURN);
  };
}

/**
 * Create a power boost effect script (during battle)
 * 
 * @param amount - Power boost amount
 * @returns Effect script function
 */
function powerBoostDuringBattle(amount: number): EffectScript {
  return (context: EffectScriptContext) => {
    // For "When Attacking" effects, boost the source card
    const targetCardId = context.source.id;
    context.modifyPower(targetCardId, amount, ModifierDuration.UNTIL_END_OF_BATTLE);
  };
}

/**
 * Create a cost reduction effect script
 * 
 * @param amount - Cost reduction amount
 * @returns Effect script function
 */
function costReduction(amount: number): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for cost reduction');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for cost reduction');
    }
    context.modifyCost(target.cardId, -amount, ModifierDuration.UNTIL_END_OF_TURN);
  };
}

/**
 * Create a search deck for character effect script
 * 
 * @returns Effect script function
 */
function searchDeckForCharacter(): EffectScript {
  return (context: EffectScriptContext) => {
    const results = context.searchZone(context.controller, ZoneId.DECK, {
      category: CardCategory.CHARACTER,
    });

    if (results.length > 0) {
      // Move first matching card to hand
      context.moveCard(results[0].id, ZoneId.HAND);
    }
  };
}

/**
 * Create a search deck for event effect script
 * 
 * @returns Effect script function
 */
function searchDeckForEvent(): EffectScript {
  return (context: EffectScriptContext) => {
    const results = context.searchZone(context.controller, ZoneId.DECK, {
      category: CardCategory.EVENT,
    });

    if (results.length > 0) {
      // Move first matching card to hand
      context.moveCard(results[0].id, ZoneId.HAND);
    }
  };
}

/**
 * Create a search deck for stage effect script
 * 
 * @returns Effect script function
 */
function searchDeckForStage(): EffectScript {
  return (context: EffectScriptContext) => {
    const results = context.searchZone(context.controller, ZoneId.DECK, {
      category: CardCategory.STAGE,
    });

    if (results.length > 0) {
      // Move first matching card to hand
      context.moveCard(results[0].id, ZoneId.HAND);
    }
  };
}

/**
 * Create a search deck by cost effect script
 * 
 * @param maxCost - Maximum cost of cards to search for
 * @returns Effect script function
 */
function searchDeckByCost(maxCost: number): EffectScript {
  return (context: EffectScriptContext) => {
    const results = context.searchZone(context.controller, ZoneId.DECK, {
      maxCost,
    });

    if (results.length > 0) {
      // Move first matching card to hand
      context.moveCard(results[0].id, ZoneId.HAND);
    }
  };
}

/**
 * Create a K.O. target character effect script
 * 
 * @returns Effect script function
 */
function koTargetCharacter(): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for K.O.');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for K.O.');
    }
    context.koCard(target.cardId);
  };
}

/**
 * Create a K.O. rested character effect script
 * 
 * @returns Effect script function
 */
function koRestedCharacter(): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for K.O.');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for K.O.');
    }

    // Verify target is rested
    const card = context.state.players.get(context.controller)?.zones.characterArea.find(c => c.id === target.cardId);
    if (!card) {
      // Check opponent's character area
      const opponent = context.controller === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
      const opponentCard = context.state.players.get(opponent)?.zones.characterArea.find(c => c.id === target.cardId);
      if (!opponentCard || opponentCard.state !== CardState.RESTED) {
        throw new EffectScriptError('Target must be a rested character');
      }
    } else if (card.state !== CardState.RESTED) {
      throw new EffectScriptError('Target must be a rested character');
    }

    context.koCard(target.cardId);
  };
}

/**
 * Create a K.O. character with cost X or less effect script
 * 
 * @param maxCost - Maximum cost of character to K.O.
 * @returns Effect script function
 */
function koCostOrLess(maxCost: number): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for K.O.');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for K.O.');
    }

    // Verify target cost is within limit
    const card = context.state.players.get(context.controller)?.zones.characterArea.find(c => c.id === target.cardId);
    if (!card) {
      // Check opponent's character area
      const opponent = context.controller === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
      const opponentCard = context.state.players.get(opponent)?.zones.characterArea.find(c => c.id === target.cardId);
      if (!opponentCard) {
        throw new EffectScriptError('Target card not found');
      }
      if (opponentCard.definition.baseCost && opponentCard.definition.baseCost > maxCost) {
        throw new EffectScriptError(`Target cost must be ${maxCost} or less`);
      }
    } else {
      if (card.definition.baseCost && card.definition.baseCost > maxCost) {
        throw new EffectScriptError(`Target cost must be ${maxCost} or less`);
      }
    }

    context.koCard(target.cardId);
  };
}

/**
 * Create a rest target character effect script
 * 
 * @returns Effect script function
 */
function restTargetCharacter(): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for rest');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for rest');
    }
    context.restCard(target.cardId);
  };
}

/**
 * Create a rest all opponent characters effect script
 * 
 * @returns Effect script function
 */
function restAllOpponentCharacters(): EffectScript {
  return (context: EffectScriptContext) => {
    const opponent = context.controller === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
    const opponentCharacters = context.state.players.get(opponent)?.zones.characterArea || [];

    for (const character of opponentCharacters) {
      if (character.state === CardState.ACTIVE) {
        context.restCard(character.id);
      }
    }
  };
}

/**
 * Create an activate target character effect script
 * 
 * @returns Effect script function
 */
function activateTargetCharacter(): EffectScript {
  return (context: EffectScriptContext) => {
    if (context.targets.length === 0) {
      throw new EffectScriptError('No target specified for activate');
    }
    const target = context.targets[0];
    if (target.type !== TargetType.CARD || !target.cardId) {
      throw new EffectScriptError('Invalid target for activate');
    }
    context.activateCard(target.cardId);
  };
}

/**
 * Create an On K.O. search deck effect script
 * 
 * @returns Effect script function
 */
function onKOSearchDeck(): EffectScript {
  return (context: EffectScriptContext) => {
    // Search for any card in deck (typically would have more specific filter)
    const results = context.searchZone(context.controller, ZoneId.DECK, {});

    if (results.length > 0) {
      // Move first card to hand
      context.moveCard(results[0].id, ZoneId.HAND);
    }
  };
}

/**
 * Create an On K.O. add to hand from trash effect script
 * 
 * @returns Effect script function
 */
function onKOAddToHandFromTrash(): EffectScript {
  return (context: EffectScriptContext) => {
    // The source card should be in trash after K.O.
    // Move it back to hand
    if (context.source.zone === ZoneId.TRASH) {
      context.moveCard(context.source.id, ZoneId.HAND);
    }
  };
}
