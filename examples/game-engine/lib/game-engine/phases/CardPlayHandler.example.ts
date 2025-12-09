/**
 * CardPlayHandler.example.ts
 * 
 * Example usage of the card playing system
 */

import { handlePlayCard } from './CardPlayHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  CardDefinition,
  CardInstance,
  DonInstance,
  EffectTimingType,
  TriggerTiming,
} from '../core/types';

/**
 * Example: Playing a character card from hand
 */
export function examplePlayCharacter() {
  console.log('=== Example: Playing a Character Card ===\n');

  // 1. Set up initial game state
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // 2. Create a character card definition
  const characterDef: CardDefinition = {
    id: 'OP01-001',
    name: 'Monkey D. Luffy',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Strike'],
    basePower: 5000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'SR',
    keywords: ['Rush'],
    effects: [
      {
        id: 'on-play-draw',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'draw-1-card',
        oncePerTurn: false,
      },
    ],
    imageUrl: '/cards/OP01-001.jpg',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  // 3. Create a card instance in hand
  const characterCard: CardInstance = {
    id: 'card-instance-1',
    definition: characterDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // 4. Add card to player's hand
  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...player1.zones,
      hand: [characterCard],
    },
  });

  // 5. Add DON to cost area (5 active DON)
  const activeDon: DonInstance[] = Array.from({ length: 5 }, (_, i) => ({
    id: `don-${i}`,
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  }));

  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...stateManager.getPlayer(PlayerId.PLAYER_1)!.zones,
      costArea: activeDon,
    },
  });

  console.log('Before playing card:');
  console.log(`- Hand size: ${stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.hand.length}`);
  console.log(`- Character area size: ${stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.characterArea.length}`);
  console.log(`- Active DON: ${stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.costArea.filter(d => d.state === CardState.ACTIVE).length}`);

  // 6. Update zone manager with current state
  zoneManager.updateStateManager(stateManager);

  // 7. Play the card
  const result = handlePlayCard(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    characterCard.id
  );

  if (result.success) {
    console.log('\n✓ Card played successfully!\n');

    const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1)!;
    console.log('After playing card:');
    console.log(`- Hand size: ${updatedPlayer.zones.hand.length}`);
    console.log(`- Character area size: ${updatedPlayer.zones.characterArea.length}`);
    console.log(`- Active DON: ${updatedPlayer.zones.costArea.filter(d => d.state === CardState.ACTIVE).length}`);
    console.log(`- Rested DON: ${updatedPlayer.zones.costArea.filter(d => d.state === CardState.RESTED).length}`);

    // Check if On Play trigger was enqueued
    const state = result.newState.getState();
    console.log(`- Pending triggers: ${state.pendingTriggers.length}`);
    if (state.pendingTriggers.length > 0) {
      console.log(`  - Trigger: ${state.pendingTriggers[0].effectDefinition.label}`);
    }
  } else {
    console.log(`\n✗ Failed to play card: ${result.error}`);
  }
}

/**
 * Example: Playing a stage card (replacing existing stage)
 */
export function examplePlayStage() {
  console.log('\n=== Example: Playing a Stage Card ===\n');

  // Set up initial state
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create existing stage
  const oldStageDef: CardDefinition = {
    id: 'OP01-STAGE-1',
    name: 'Going Merry',
    category: CardCategory.STAGE,
    colors: ['Red'],
    typeTags: ['Ship'],
    attributes: [],
    basePower: null,
    baseCost: 1,
    lifeValue: null,
    counterValue: null,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '/cards/stage-1.jpg',
    metadata: {
      setCode: 'OP01',
      cardNumber: 'STAGE-1',
      isAltArt: false,
      isPromo: false,
    },
  };

  const oldStage: CardInstance = {
    id: 'old-stage-instance',
    definition: oldStageDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.STAGE_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Create new stage in hand
  const newStageDef: CardDefinition = {
    id: 'OP01-STAGE-2',
    name: 'Thousand Sunny',
    category: CardCategory.STAGE,
    colors: ['Red'],
    typeTags: ['Ship'],
    attributes: [],
    basePower: null,
    baseCost: 2,
    lifeValue: null,
    counterValue: null,
    rarity: 'R',
    keywords: [],
    effects: [],
    imageUrl: '/cards/stage-2.jpg',
    metadata: {
      setCode: 'OP01',
      cardNumber: 'STAGE-2',
      isAltArt: false,
      isPromo: false,
    },
  };

  const newStage: CardInstance = {
    id: 'new-stage-instance',
    definition: newStageDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Set up player state
  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...player1.zones,
      hand: [newStage],
      stageArea: oldStage,
      costArea: Array.from({ length: 3 }, (_, i) => ({
        id: `don-${i}`,
        owner: PlayerId.PLAYER_1,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
      })),
    },
  });

  console.log('Before playing new stage:');
  console.log(`- Current stage: ${oldStage.definition.name}`);
  console.log(`- Trash size: ${stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.trash.length}`);

  zoneManager.updateStateManager(stateManager);

  // Play the new stage
  const result = handlePlayCard(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    newStage.id
  );

  if (result.success) {
    console.log('\n✓ New stage played successfully!\n');

    const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1)!;
    console.log('After playing new stage:');
    console.log(`- Current stage: ${updatedPlayer.zones.stageArea?.definition.name}`);
    console.log(`- Trash size: ${updatedPlayer.zones.trash.length}`);
    console.log(`- Old stage in trash: ${updatedPlayer.zones.trash.some(c => c.id === oldStage.id)}`);
  } else {
    console.log(`\n✗ Failed to play stage: ${result.error}`);
  }
}

/**
 * Example: Playing an event card
 */
export function examplePlayEvent() {
  console.log('\n=== Example: Playing an Event Card ===\n');

  // Set up initial state
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create event card
  const eventDef: CardDefinition = {
    id: 'OP01-EVENT-1',
    name: 'Gum-Gum Red Hawk',
    category: CardCategory.EVENT,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: null,
    baseCost: 1,
    lifeValue: null,
    counterValue: null,
    rarity: 'C',
    keywords: [],
    effects: [
      {
        id: 'event-effect',
        label: '[Main]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'deal-damage',
        oncePerTurn: false,
      },
    ],
    imageUrl: '/cards/event-1.jpg',
    metadata: {
      setCode: 'OP01',
      cardNumber: 'EVENT-1',
      isAltArt: false,
      isPromo: false,
    },
  };

  const eventCard: CardInstance = {
    id: 'event-instance',
    definition: eventDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Set up player state
  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...player1.zones,
      hand: [eventCard],
      costArea: Array.from({ length: 2 }, (_, i) => ({
        id: `don-${i}`,
        owner: PlayerId.PLAYER_1,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
      })),
    },
  });

  console.log('Before playing event:');
  console.log(`- Hand size: ${stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.hand.length}`);
  console.log(`- Trash size: ${stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.trash.length}`);

  zoneManager.updateStateManager(stateManager);

  // Play the event
  const result = handlePlayCard(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    eventCard.id
  );

  if (result.success) {
    console.log('\n✓ Event played successfully!\n');

    const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1)!;
    console.log('After playing event:');
    console.log(`- Hand size: ${updatedPlayer.zones.hand.length}`);
    console.log(`- Trash size: ${updatedPlayer.zones.trash.length}`);
    console.log(`- Event in trash: ${updatedPlayer.zones.trash.some(c => c.id === eventCard.id)}`);

    // Check if effect trigger was enqueued
    const state = result.newState.getState();
    console.log(`- Pending triggers: ${state.pendingTriggers.length}`);
  } else {
    console.log(`\n✗ Failed to play event: ${result.error}`);
  }
}

/**
 * Example: Attempting to play a card without enough DON
 */
export function exampleInsufficientCost() {
  console.log('\n=== Example: Insufficient Cost ===\n');

  // Set up initial state
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create expensive card
  const expensiveCardDef: CardDefinition = {
    id: 'OP01-EXPENSIVE',
    name: 'Expensive Character',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 10000,
    baseCost: 7,
    lifeValue: null,
    counterValue: null,
    rarity: 'SR',
    keywords: [],
    effects: [],
    imageUrl: '/cards/expensive.jpg',
    metadata: {
      setCode: 'OP01',
      cardNumber: 'EXPENSIVE',
      isAltArt: false,
      isPromo: false,
    },
  };

  const expensiveCard: CardInstance = {
    id: 'expensive-instance',
    definition: expensiveCardDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Set up player with only 3 DON
  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
    zones: {
      ...player1.zones,
      hand: [expensiveCard],
      costArea: Array.from({ length: 3 }, (_, i) => ({
        id: `don-${i}`,
        owner: PlayerId.PLAYER_1,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
      })),
    },
  });

  console.log(`Card cost: ${expensiveCardDef.baseCost}`);
  console.log(`Available DON: ${stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.costArea.length}`);

  zoneManager.updateStateManager(stateManager);

  // Try to play the card
  const result = handlePlayCard(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    expensiveCard.id
  );

  if (!result.success) {
    console.log(`\n✗ Expected failure: ${result.error}`);
  }
}

// Run all examples
if (require.main === module) {
  examplePlayCharacter();
  examplePlayStage();
  examplePlayEvent();
  exampleInsufficientCost();
}
