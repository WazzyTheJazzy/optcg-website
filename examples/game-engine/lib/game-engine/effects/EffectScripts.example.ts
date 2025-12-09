/**
 * EffectScripts.example.ts
 * 
 * Example usage of the Effect Scripts system
 */

import {
  EffectScriptRegistry,
  EffectScriptExecutor,
  EffectScriptContext,
} from './EffectScripts';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { DamageCalculator } from '../battle/DamageCalculator';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardCategory,
  ModifierDuration,
  TargetType,
} from '../core/types';

// ============================================================================
// Example 1: Setting up the Effect Scripts system
// ============================================================================

function setupEffectScriptSystem() {
  // Create initial game state
  const initialState = createInitialGameState();
  const stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);
  const damageCalculator = new DamageCalculator();

  // Create registry and executor
  const registry = new EffectScriptRegistry();
  const executor = new EffectScriptExecutor(
    stateManager,
    zoneManager,
    damageCalculator,
    eventEmitter,
    registry
  );

  return { executor, registry, stateManager };
}

// ============================================================================
// Example 2: Registering Common Effect Scripts
// ============================================================================

function registerCommonEffects(registry: EffectScriptRegistry) {
  // Draw cards effect
  registry.register('draw_1', (ctx: EffectScriptContext) => {
    ctx.drawCards(ctx.controller, 1);
  });

  registry.register('draw_2', (ctx: EffectScriptContext) => {
    ctx.drawCards(ctx.controller, 2);
  });

  // Power boost effects
  registry.register('power_boost_1000_eot', (ctx: EffectScriptContext) => {
    ctx.modifyPower(ctx.source.id, 1000, ModifierDuration.UNTIL_END_OF_TURN);
  });

  registry.register('power_boost_2000_eot', (ctx: EffectScriptContext) => {
    ctx.modifyPower(ctx.source.id, 2000, ModifierDuration.UNTIL_END_OF_TURN);
  });

  registry.register('power_boost_3000_battle', (ctx: EffectScriptContext) => {
    ctx.modifyPower(ctx.source.id, 3000, ModifierDuration.UNTIL_END_OF_BATTLE);
  });

  // Cost reduction effects
  registry.register('cost_reduce_1', (ctx: EffectScriptContext) => {
    ctx.modifyCost(ctx.source.id, -1, ModifierDuration.PERMANENT);
  });

  registry.register('cost_reduce_2', (ctx: EffectScriptContext) => {
    ctx.modifyCost(ctx.source.id, -2, ModifierDuration.PERMANENT);
  });

  // Rest/Activate effects
  registry.register('rest_self', (ctx: EffectScriptContext) => {
    ctx.restCard(ctx.source.id);
  });

  registry.register('activate_self', (ctx: EffectScriptContext) => {
    ctx.activateCard(ctx.source.id);
  });
}

// ============================================================================
// Example 3: Character-Specific Effects
// ============================================================================

function registerCharacterEffects(registry: EffectScriptRegistry) {
  // Monkey D. Luffy - On Play: Draw 2 cards
  registry.register('luffy_on_play', (ctx: EffectScriptContext) => {
    ctx.drawCards(ctx.controller, 2);
  });

  // Roronoa Zoro - When Attacking: This character gains +2000 power
  registry.register('zoro_when_attacking', (ctx: EffectScriptContext) => {
    ctx.modifyPower(ctx.source.id, 2000, ModifierDuration.UNTIL_END_OF_BATTLE);
  });

  // Nami - On Play: Search your deck for a card with cost 3 or less, add it to hand
  registry.register('nami_on_play', (ctx: EffectScriptContext) => {
    const cards = ctx.searchZone(ctx.controller, ZoneId.DECK, {
      maxCost: 3,
    });

    if (cards.length > 0) {
      // Add first matching card to hand
      ctx.moveCard(cards[0].id, ZoneId.HAND);
    }
  });

  // Sanji - Activate: Rest this character, then draw 1 card
  registry.register('sanji_activate', (ctx: EffectScriptContext) => {
    ctx.restCard(ctx.source.id);
    ctx.drawCards(ctx.controller, 1);
  });

  // Usopp - On Play: Search your deck for a red character, add it to hand
  registry.register('usopp_on_play', (ctx: EffectScriptContext) => {
    const cards = ctx.searchZone(ctx.controller, ZoneId.DECK, {
      colors: ['Red'],
      category: CardCategory.CHARACTER,
    });

    if (cards.length > 0) {
      ctx.moveCard(cards[0].id, ZoneId.HAND);
    }
  });

  // Chopper - On K.O.: Add this card to your hand instead of trash
  registry.register('chopper_on_ko', (ctx: EffectScriptContext) => {
    // Card is already in trash at this point, move it to hand
    ctx.moveCard(ctx.source.id, ZoneId.HAND);
  });
}

// ============================================================================
// Example 4: Event Card Effects
// ============================================================================

function registerEventEffects(registry: EffectScriptRegistry) {
  // Gum-Gum Pistol - K.O. target character with 5000 power or less
  registry.register('gum_gum_pistol', (ctx: EffectScriptContext) => {
    if (ctx.targets.length > 0 && ctx.targets[0].cardId) {
      const targetCard = ctx.state.players
        .get(PlayerId.PLAYER_1)
        ?.zones.characterArea.find((c) => c.id === ctx.targets[0].cardId);

      if (targetCard) {
        ctx.koCard(targetCard.id);
      }
    }
  });

  // Three Sword Style - Give target character +3000 power until end of turn
  registry.register('three_sword_style', (ctx: EffectScriptContext) => {
    if (ctx.targets.length > 0 && ctx.targets[0].cardId) {
      ctx.modifyPower(
        ctx.targets[0].cardId,
        3000,
        ModifierDuration.UNTIL_END_OF_TURN
      );
    }
  });

  // Diable Jambe - Rest target character
  registry.register('diable_jambe', (ctx: EffectScriptContext) => {
    if (ctx.targets.length > 0 && ctx.targets[0].cardId) {
      ctx.restCard(ctx.targets[0].cardId);
    }
  });
}

// ============================================================================
// Example 5: Complex Multi-Step Effects
// ============================================================================

function registerComplexEffects(registry: EffectScriptRegistry) {
  // Search deck, add to hand, then shuffle
  registry.register('search_and_shuffle', (ctx: EffectScriptContext) => {
    // Search for a character
    const cards = ctx.searchZone(ctx.controller, ZoneId.DECK, {
      category: CardCategory.CHARACTER,
    });

    if (cards.length > 0) {
      // Add first card to hand
      ctx.moveCard(cards[0].id, ZoneId.HAND);
    }

    // Note: Shuffle would be implemented as a separate helper method
    // For now, this is a placeholder
  });

  // Draw cards equal to number of red characters you control
  registry.register('draw_per_red_character', (ctx: EffectScriptContext) => {
    const player = ctx.state.players.get(ctx.controller);
    if (!player) return;

    // Count red characters in character area
    const redCharacters = player.zones.characterArea.filter((card) =>
      card.definition.colors.includes('Red')
    );

    // Draw that many cards
    if (redCharacters.length > 0) {
      ctx.drawCards(ctx.controller, redCharacters.length);
    }
  });

  // K.O. all characters with 3000 power or less
  registry.register('ko_all_weak_characters', (ctx: EffectScriptContext) => {
    // Get opponent
    const opponent =
      ctx.controller === PlayerId.PLAYER_1
        ? PlayerId.PLAYER_2
        : PlayerId.PLAYER_1;
    const opponentPlayer = ctx.state.players.get(opponent);
    if (!opponentPlayer) return;

    // Find all characters with 3000 power or less
    const weakCharacters = ctx.searchZone(opponent, ZoneId.CHARACTER_AREA, {
      maxPower: 3000,
    });

    // K.O. each one
    for (const character of weakCharacters) {
      ctx.koCard(character.id);
    }
  });

  // Give all your red characters +1000 power
  registry.register('boost_all_red_characters', (ctx: EffectScriptContext) => {
    const player = ctx.state.players.get(ctx.controller);
    if (!player) return;

    // Find all red characters
    const redCharacters = player.zones.characterArea.filter((card) =>
      card.definition.colors.includes('Red')
    );

    // Boost each one
    for (const character of redCharacters) {
      ctx.modifyPower(
        character.id,
        1000,
        ModifierDuration.UNTIL_END_OF_TURN
      );
    }
  });
}

// ============================================================================
// Example 6: Using Values and Targets
// ============================================================================

function registerParameterizedEffects(registry: EffectScriptRegistry) {
  // Draw X cards (X is stored in values)
  registry.register('draw_x_cards', (ctx: EffectScriptContext) => {
    const x = ctx.values.get('x') as number;
    if (x && x > 0) {
      ctx.drawCards(ctx.controller, x);
    }
  });

  // Give target character +X power (X is stored in values)
  registry.register('boost_target_x', (ctx: EffectScriptContext) => {
    const x = ctx.values.get('x') as number;
    if (
      x &&
      x > 0 &&
      ctx.targets.length > 0 &&
      ctx.targets[0].cardId
    ) {
      ctx.modifyPower(
        ctx.targets[0].cardId,
        x,
        ModifierDuration.UNTIL_END_OF_TURN
      );
    }
  });

  // K.O. up to X target characters (X is stored in values)
  registry.register('ko_up_to_x_targets', (ctx: EffectScriptContext) => {
    const x = ctx.values.get('x') as number;
    if (!x || x <= 0) return;

    // K.O. up to X targets
    const targetsToKO = ctx.targets.slice(0, x);
    for (const target of targetsToKO) {
      if (target.type === TargetType.CARD && target.cardId) {
        ctx.koCard(target.cardId);
      }
    }
  });
}

// ============================================================================
// Example 7: Complete Setup and Usage
// ============================================================================

export function exampleUsage() {
  // Setup the system
  const { executor, registry, stateManager } = setupEffectScriptSystem();

  // Register all effects
  registerCommonEffects(registry);
  registerCharacterEffects(registry);
  registerEventEffects(registry);
  registerComplexEffects(registry);
  registerParameterizedEffects(registry);

  console.log('Effect Scripts System initialized');
  console.log(`Registered ${registry.getAllScriptIds().length} scripts`);

  // Example: List all registered scripts
  console.log('Available scripts:');
  for (const scriptId of registry.getAllScriptIds()) {
    console.log(`  - ${scriptId}`);
  }

  return { executor, registry, stateManager };
}

// ============================================================================
// Example 8: Error Handling
// ============================================================================

export function exampleErrorHandling() {
  const { executor, registry, stateManager } = setupEffectScriptSystem();

  // Register a script that might fail
  registry.register('risky_script', (ctx: EffectScriptContext) => {
    // This will throw if card doesn't exist
    ctx.moveCard('nonexistent_card', ZoneId.TRASH);
  });

  // Try to execute it
  try {
    const baseContext = {
      state: stateManager.getState(),
      source: {} as any, // Simplified for example
      controller: PlayerId.PLAYER_1,
      targets: [],
      values: new Map(),
      event: null,
    };

    executor.executeScript('risky_script', baseContext);
  } catch (error) {
    console.error('Script execution failed:', error);
    // Handle the error appropriately
  }
}
