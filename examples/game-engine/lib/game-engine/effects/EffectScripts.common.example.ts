/**
 * EffectScripts.common.example.ts
 * 
 * Examples demonstrating the use of common effect scripts
 * registered via registerCommonEffectScripts()
 */

import { GameStateManager } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { DamageCalculator } from '../battle/DamageCalculator';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  EffectScriptRegistry,
  EffectScriptExecutor,
  registerCommonEffectScripts,
} from './EffectScripts';
import {
  CardDefinition,
  CardCategory,
  EffectDefinition,
  EffectTimingType,
  TriggerTiming,
  PlayerId,
  ZoneId,
  CardState,
  TargetType,
  EffectContext,
  GameEvent,
  GameEventType,
} from '../core/types';

// ============================================================================
// Example 1: Using Draw Effect Scripts
// ============================================================================

function exampleDrawEffects() {
  console.log('=== Example 1: Draw Effects ===\n');

  // Create a card with "On Play: Draw 2 cards" effect
  const cardWithDrawEffect: CardDefinition = {
    id: 'OP01-001',
    name: 'Monkey D. Luffy',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Strike'],
    basePower: 5000,
    baseCost: 4,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'SR',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'draw_2', // Uses registered common script
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  console.log('Card:', cardWithDrawEffect.name);
  console.log('Effect:', cardWithDrawEffect.effects[0].label, 'Draw 2 cards');
  console.log('Script ID:', cardWithDrawEffect.effects[0].scriptId);
  console.log();
}

// ============================================================================
// Example 2: Using Power Boost Effect Scripts
// ============================================================================

function examplePowerBoostEffects() {
  console.log('=== Example 2: Power Boost Effects ===\n');

  // Card with permanent power boost
  const permanentBoostCard: CardDefinition = {
    id: 'OP01-002',
    name: 'Roronoa Zoro',
    category: CardCategory.CHARACTER,
    colors: ['Green'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Slash'],
    basePower: 5000,
    baseCost: 5,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'SR',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'power_boost_2000', // Permanent +2000 power
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
  };

  // Card with "When Attacking" power boost
  const whenAttackingBoostCard: CardDefinition = {
    id: 'OP01-003',
    name: 'Sanji',
    category: CardCategory.CHARACTER,
    colors: ['Blue'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Strike'],
    basePower: 4000,
    baseCost: 4,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[When Attacking]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.WHEN_ATTACKING,
        condition: null,
        cost: null,
        scriptId: 'when_attacking_power_boost_2000', // +2000 during battle
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '003',
      isAltArt: false,
      isPromo: false,
    },
  };

  console.log('Card 1:', permanentBoostCard.name);
  console.log('Effect: Permanent +2000 power to target');
  console.log('Script ID:', permanentBoostCard.effects[0].scriptId);
  console.log();

  console.log('Card 2:', whenAttackingBoostCard.name);
  console.log('Effect: +2000 power during battle');
  console.log('Script ID:', whenAttackingBoostCard.effects[0].scriptId);
  console.log();
}

// ============================================================================
// Example 3: Using Search Effect Scripts
// ============================================================================

function exampleSearchEffects() {
  console.log('=== Example 3: Search Effects ===\n');

  // Card that searches for a character
  const searchCharacterCard: CardDefinition = {
    id: 'OP01-004',
    name: 'Nami',
    category: CardCategory.CHARACTER,
    colors: ['Blue'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Special'],
    basePower: 3000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'search_deck_character', // Search deck for character
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '004',
      isAltArt: false,
      isPromo: false,
    },
  };

  // Card that searches by cost
  const searchByCostCard: CardDefinition = {
    id: 'OP01-005',
    name: 'Usopp',
    category: CardCategory.CHARACTER,
    colors: ['Yellow'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Ranged'],
    basePower: 2000,
    baseCost: 2,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'search_deck_cost_4_or_less', // Search for cost 4 or less
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '005',
      isAltArt: false,
      isPromo: false,
    },
  };

  console.log('Card 1:', searchCharacterCard.name);
  console.log('Effect: Search deck for a character card');
  console.log('Script ID:', searchCharacterCard.effects[0].scriptId);
  console.log();

  console.log('Card 2:', searchByCostCard.name);
  console.log('Effect: Search deck for a card with cost 4 or less');
  console.log('Script ID:', searchByCostCard.effects[0].scriptId);
  console.log();
}

// ============================================================================
// Example 4: Using K.O. Effect Scripts
// ============================================================================

function exampleKOEffects() {
  console.log('=== Example 4: K.O. Effects ===\n');

  // Card that K.O.s a target character
  const koTargetCard: CardDefinition = {
    id: 'OP01-006',
    name: 'Gum-Gum Pistol',
    category: CardCategory.EVENT,
    colors: ['Red'],
    typeTags: ['Straw Hat Crew'],
    attributes: [],
    basePower: null,
    baseCost: 3,
    lifeValue: null,
    counterValue: null,
    rarity: 'C',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'ko_target_character', // K.O. target character
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '006',
      isAltArt: false,
      isPromo: false,
    },
  };

  // Card that K.O.s based on cost
  const koByCostCard: CardDefinition = {
    id: 'OP01-007',
    name: 'Radical Beam',
    category: CardCategory.EVENT,
    colors: ['Yellow'],
    typeTags: [],
    attributes: [],
    basePower: null,
    baseCost: 4,
    lifeValue: null,
    counterValue: null,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'ko_cost_4_or_less', // K.O. character with cost 4 or less
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '007',
      isAltArt: false,
      isPromo: false,
    },
  };

  console.log('Card 1:', koTargetCard.name);
  console.log('Effect: K.O. target character');
  console.log('Script ID:', koTargetCard.effects[0].scriptId);
  console.log();

  console.log('Card 2:', koByCostCard.name);
  console.log('Effect: K.O. character with cost 4 or less');
  console.log('Script ID:', koByCostCard.effects[0].scriptId);
  console.log();
}

// ============================================================================
// Example 5: Using Rest/Activate Effect Scripts
// ============================================================================

function exampleRestActivateEffects() {
  console.log('=== Example 5: Rest/Activate Effects ===\n');

  // Card that rests a target
  const restTargetCard: CardDefinition = {
    id: 'OP01-008',
    name: 'Nico Robin',
    category: CardCategory.CHARACTER,
    colors: ['Purple'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Special'],
    basePower: 4000,
    baseCost: 4,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'SR',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'rest_target_character', // Rest target character
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '008',
      isAltArt: false,
      isPromo: false,
    },
  };

  // Card that activates a target
  const activateTargetCard: CardDefinition = {
    id: 'OP01-009',
    name: 'Tony Tony Chopper',
    category: CardCategory.CHARACTER,
    colors: ['Green'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Special'],
    basePower: 3000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'activate_target_character', // Activate target character
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '009',
      isAltArt: false,
      isPromo: false,
    },
  };

  console.log('Card 1:', restTargetCard.name);
  console.log('Effect: Rest target character');
  console.log('Script ID:', restTargetCard.effects[0].scriptId);
  console.log();

  console.log('Card 2:', activateTargetCard.name);
  console.log('Effect: Activate target character');
  console.log('Script ID:', activateTargetCard.effects[0].scriptId);
  console.log();
}

// ============================================================================
// Example 6: Using On K.O. Effect Scripts
// ============================================================================

function exampleOnKOEffects() {
  console.log('=== Example 6: On K.O. Effects ===\n');

  // Card with On K.O. search effect
  const onKOSearchCard: CardDefinition = {
    id: 'OP01-010',
    name: 'Franky',
    category: CardCategory.CHARACTER,
    colors: ['Blue'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Strike'],
    basePower: 4000,
    baseCost: 4,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'on_ko_search_deck', // Search deck when K.O.'d
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '010',
      isAltArt: false,
      isPromo: false,
    },
  };

  // Card with On K.O. return to hand effect
  const onKOReturnCard: CardDefinition = {
    id: 'OP01-011',
    name: 'Brook',
    category: CardCategory.CHARACTER,
    colors: ['Purple'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Special'],
    basePower: 3000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'effect_1',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'on_ko_add_to_hand_from_trash', // Return to hand from trash
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '011',
      isAltArt: false,
      isPromo: false,
    },
  };

  console.log('Card 1:', onKOSearchCard.name);
  console.log('Effect: Search deck when K.O.\'d');
  console.log('Script ID:', onKOSearchCard.effects[0].scriptId);
  console.log();

  console.log('Card 2:', onKOReturnCard.name);
  console.log('Effect: Return to hand from trash when K.O.\'d');
  console.log('Script ID:', onKOReturnCard.effects[0].scriptId);
  console.log();
}

// ============================================================================
// Example 7: Registering and Using Common Scripts
// ============================================================================

function exampleRegisteringCommonScripts() {
  console.log('=== Example 7: Registering Common Scripts ===\n');

  // Create registry and register all common scripts
  const registry = new EffectScriptRegistry();
  registerCommonEffectScripts(registry);

  console.log('Registered common effect scripts:');
  const scriptIds = registry.getAllScriptIds();
  scriptIds.forEach((id, index) => {
    console.log(`${index + 1}. ${id}`);
  });
  console.log();
  console.log(`Total: ${scriptIds.length} scripts registered`);
  console.log();
}

// ============================================================================
// Run All Examples
// ============================================================================

function runAllExamples() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Common Effect Scripts Examples                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  exampleDrawEffects();
  examplePowerBoostEffects();
  exampleSearchEffects();
  exampleKOEffects();
  exampleRestActivateEffects();
  exampleOnKOEffects();
  exampleRegisteringCommonScripts();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Examples Complete                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  exampleDrawEffects,
  examplePowerBoostEffects,
  exampleSearchEffects,
  exampleKOEffects,
  exampleRestActivateEffects,
  exampleOnKOEffects,
  exampleRegisteringCommonScripts,
  runAllExamples,
};
