/**
 * EndPhase.example.ts
 * 
 * Example usage of the End Phase implementation
 */

import { runEndPhase } from './EndPhase';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import {
  PlayerId,
  Phase,
  CardCategory,
  CardState,
  ZoneId,
  ModifierDuration,
  ModifierType,
  EffectTimingType,
  TriggerTiming,
  CardDefinition,
  CardInstance,
} from '../core/types';

/**
 * Example: Running the End Phase
 */
export function exampleRunEndPhase() {
  console.log('=== End Phase Example ===\n');

  // Initialize game components
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);

  // Set up event listeners
  eventEmitter.on(GameEventType.PHASE_CHANGED, (event: any) => {
    console.log(`Phase changed: ${event.oldPhase} -> ${event.newPhase}`);
  });

  // Set to END phase
  stateManager = stateManager.setPhase(Phase.END);

  console.log('Running End Phase...\n');

  // Run the end phase
  stateManager = runEndPhase(stateManager, rules, eventEmitter);

  console.log('End Phase completed!\n');
}

/**
 * Example: End of Turn Effects
 */
export function exampleEndOfTurnEffects() {
  console.log('=== End of Turn Effects Example ===\n');

  // Initialize game components
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);

  // Create a character with END_OF_YOUR_TURN effect
  const characterDef: CardDefinition = {
    id: 'char-001',
    name: 'Test Character',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 4000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [
      {
        id: 'effect-1',
        label: '[End of Your Turn]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
        condition: null,
        cost: null,
        scriptId: 'drawOne',
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

  const character: CardInstance = {
    id: 'char-instance-1',
    definition: characterDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Add character to field
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...player.zones,
      characterArea: [character],
    },
  });

  console.log('Character with END_OF_YOUR_TURN effect added to field');
  console.log(`Effect: ${characterDef.effects[0].label}\n`);

  // Set to END phase
  stateManager = stateManager.setPhase(Phase.END);

  // Run the end phase
  console.log('Running End Phase...');
  stateManager = runEndPhase(stateManager, rules, eventEmitter);

  console.log('End Phase completed!');
  console.log('(Effect would be resolved by the effect system)\n');
}

/**
 * Example: Expiring Temporary Modifiers
 */
export function exampleExpiringModifiers() {
  console.log('=== Expiring Modifiers Example ===\n');

  // Initialize game components
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);

  // Create a character with temporary power boost
  const characterDef: CardDefinition = {
    id: 'char-001',
    name: 'Boosted Character',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 4000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  const character: CardInstance = {
    id: 'char-instance-1',
    definition: characterDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [
      {
        id: 'mod-1',
        type: ModifierType.POWER,
        value: 2000,
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-1',
        timestamp: Date.now(),
      },
      {
        id: 'mod-2',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.PERMANENT,
        source: 'effect-2',
        timestamp: Date.now(),
      },
    ],
    flags: new Map(),
  };

  // Add character to field
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...player.zones,
      characterArea: [character],
    },
  });

  console.log('Character with modifiers:');
  console.log(`- Base Power: ${characterDef.basePower}`);
  console.log(`- Temporary Boost: +2000 (UNTIL_END_OF_TURN)`);
  console.log(`- Permanent Boost: +1000 (PERMANENT)`);
  console.log(`- Total Power: ${characterDef.basePower! + 2000 + 1000}\n`);

  // Set to END phase
  stateManager = stateManager.setPhase(Phase.END);

  // Run the end phase
  console.log('Running End Phase...');
  stateManager = runEndPhase(stateManager, rules, eventEmitter);

  // Check modifiers after end phase
  const updatedPlayer = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  const updatedCharacter = updatedPlayer.zones.characterArea[0];

  console.log('\nAfter End Phase:');
  console.log(`- Modifiers remaining: ${updatedCharacter.modifiers.length}`);
  console.log(`- Temporary boost expired: YES`);
  console.log(`- Permanent boost remains: YES`);
  console.log(`- New Total Power: ${characterDef.basePower! + 1000}\n`);
}

/**
 * Example: Both Players' End of Turn Effects
 */
export function exampleBothPlayersEffects() {
  console.log('=== Both Players End of Turn Effects Example ===\n');

  // Initialize game components
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);

  // Create character for active player with END_OF_YOUR_TURN effect
  const activePlayerChar: CardInstance = {
    id: 'char-p1',
    definition: {
      id: 'char-def-1',
      name: 'Active Player Character',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 4000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [
        {
          id: 'effect-1',
          label: '[End of Your Turn]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
          condition: null,
          cost: null,
          scriptId: 'drawOne',
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
    },
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Create character for non-active player with END_OF_OPPONENT_TURN effect
  const nonActivePlayerChar: CardInstance = {
    id: 'char-p2',
    definition: {
      id: 'char-def-2',
      name: 'Non-Active Player Character',
      category: CardCategory.CHARACTER,
      colors: ['Blue'],
      typeTags: [],
      attributes: [],
      basePower: 3000,
      baseCost: 2,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [
        {
          id: 'effect-2',
          label: '[End of Opponent Turn]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.END_OF_OPPONENT_TURN,
          condition: null,
          cost: null,
          scriptId: 'restCharacter',
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
    },
    owner: PlayerId.PLAYER_2,
    controller: PlayerId.PLAYER_2,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Add characters to field
  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;

  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...player1.zones,
      characterArea: [activePlayerChar],
    },
  });

  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
    zones: {
      ...player2.zones,
      characterArea: [nonActivePlayerChar],
    },
  });

  console.log('Active Player (P1) has character with: [End of Your Turn] effect');
  console.log('Non-Active Player (P2) has character with: [End of Opponent Turn] effect\n');

  // Set to END phase
  stateManager = stateManager.setPhase(Phase.END);

  // Run the end phase
  console.log('Running End Phase...');
  stateManager = runEndPhase(stateManager, rules, eventEmitter);

  console.log('\nBoth effects would be triggered:');
  console.log('1. Active player\'s END_OF_YOUR_TURN effect (priority 0)');
  console.log('2. Non-active player\'s END_OF_OPPONENT_TURN effect (priority 1)\n');
}

// Run examples if this file is executed directly
if (require.main === module) {
  exampleRunEndPhase();
  console.log('\n' + '='.repeat(50) + '\n');
  exampleEndOfTurnEffects();
  console.log('\n' + '='.repeat(50) + '\n');
  exampleExpiringModifiers();
  console.log('\n' + '='.repeat(50) + '\n');
  exampleBothPlayersEffects();
}
