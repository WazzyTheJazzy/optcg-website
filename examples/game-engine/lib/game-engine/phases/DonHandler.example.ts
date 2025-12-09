/**
 * DonHandler.example.ts
 * 
 * Example usage of the DON giving system
 */

import { handleGiveDon, canGiveDon, computeCurrentPower } from './DonHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter, GameEventType, PowerChangedEvent, CardMovedEvent } from '../rendering/EventEmitter';
import {
  PlayerId,
  CardInstance,
  DonInstance,
  ZoneId,
  CardState,
  CardCategory,
  CardDefinition,
} from '../core/types';

// ============================================================================
// Example 1: Basic DON Giving
// ============================================================================

function example1_BasicDonGiving() {
  console.log('=== Example 1: Basic DON Giving ===\n');

  // Initialize game state
  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create a character card definition
  const characterDef: CardDefinition = {
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
    keywords: ['Rush'],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  // Create character instance in character area
  const character: CardInstance = {
    id: 'char-1',
    definition: characterDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Add character to player's character area
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.characterArea.push(character);
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

  // Create DON instances in cost area
  const don1: DonInstance = {
    id: 'don-1',
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  };

  const don2: DonInstance = {
    id: 'don-2',
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  };

  player.zones.costArea.push(don1, don2);
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

  // Check initial power
  const initialPower = computeCurrentPower(character);
  console.log(`Initial character power: ${initialPower}`);

  // Give first DON to character
  console.log('\nGiving first DON to character...');
  const result1 = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'don-1',
    'char-1'
  );

  if (result1.success) {
    stateManager = result1.newState;
    const updatedChar = stateManager.getCard('char-1')!;
    const newPower = computeCurrentPower(updatedChar);
    console.log(`✓ DON given successfully`);
    console.log(`  New power: ${newPower} (+${newPower - initialPower})`);
    console.log(`  Given DON count: ${updatedChar.givenDon.length}`);
  }

  // Give second DON to character
  console.log('\nGiving second DON to character...');
  const result2 = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'don-2',
    'char-1'
  );

  if (result2.success) {
    stateManager = result2.newState;
    const updatedChar = stateManager.getCard('char-1')!;
    const finalPower = computeCurrentPower(updatedChar);
    console.log(`✓ DON given successfully`);
    console.log(`  Final power: ${finalPower}`);
    console.log(`  Given DON count: ${updatedChar.givenDon.length}`);
  }

  console.log('\n');
}

// ============================================================================
// Example 2: Validation and Error Handling
// ============================================================================

function example2_ValidationAndErrors() {
  console.log('=== Example 2: Validation and Error Handling ===\n');

  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create a character in hand (not on field)
  const characterDef: CardDefinition = {
    id: 'OP01-002',
    name: 'Roronoa Zoro',
    category: CardCategory.CHARACTER,
    colors: ['Green'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Slash'],
    basePower: 6000,
    baseCost: 5,
    lifeValue: null,
    counterValue: 2000,
    rarity: 'SR',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
  };

  const character: CardInstance = {
    id: 'char-2',
    definition: characterDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND, // In hand, not on field
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.hand.push(character);

  // Create a rested DON
  const restedDon: DonInstance = {
    id: 'don-3',
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.RESTED,
  };

  player.zones.costArea.push(restedDon);
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

  // Test 1: Try to give rested DON
  console.log('Test 1: Attempting to give rested DON...');
  const canGive1 = canGiveDon(stateManager, PlayerId.PLAYER_1, 'don-3', 'char-2');
  console.log(`  canGiveDon result: ${canGive1}`);

  const result1 = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'don-3',
    'char-2'
  );
  console.log(`  ✗ Failed as expected: ${result1.error}\n`);

  // Test 2: Try to give DON to card not on field
  const activeDon: DonInstance = {
    id: 'don-4',
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  };

  player.zones.costArea.push(activeDon);
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

  console.log('Test 2: Attempting to give DON to card in hand...');
  const canGive2 = canGiveDon(stateManager, PlayerId.PLAYER_1, 'don-4', 'char-2');
  console.log(`  canGiveDon result: ${canGive2}`);

  const result2 = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'don-4',
    'char-2'
  );
  console.log(`  ✗ Failed as expected: ${result2.error}\n`);

  // Test 3: Try to give non-existent DON
  console.log('Test 3: Attempting to give non-existent DON...');
  const canGive3 = canGiveDon(stateManager, PlayerId.PLAYER_1, 'non-existent', 'char-2');
  console.log(`  canGiveDon result: ${canGive3}`);

  const result3 = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'non-existent',
    'char-2'
  );
  console.log(`  ✗ Failed as expected: ${result3.error}\n`);
}

// ============================================================================
// Example 3: Power Calculation with Modifiers
// ============================================================================

function example3_PowerCalculationWithModifiers() {
  console.log('=== Example 3: Power Calculation with Modifiers ===\n');

  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create a character with base power 4000
  const characterDef: CardDefinition = {
    id: 'OP01-003',
    name: 'Nami',
    category: CardCategory.CHARACTER,
    colors: ['Blue'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Special'],
    basePower: 4000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '003',
      isAltArt: false,
      isPromo: false,
    },
  };

  const character: CardInstance = {
    id: 'char-3',
    definition: characterDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [
      {
        id: 'mod-1',
        type: 'POWER' as any,
        value: 2000,
        duration: 'UNTIL_END_OF_TURN' as any,
        source: 'effect-1',
        timestamp: Date.now(),
      },
    ],
    flags: new Map(),
  };

  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.characterArea.push(character);

  // Add DON to cost area
  const don: DonInstance = {
    id: 'don-5',
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  };

  player.zones.costArea.push(don);
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

  // Calculate power before giving DON
  console.log('Power calculation breakdown:');
  console.log(`  Base power: ${characterDef.basePower}`);
  console.log(`  Power modifiers: +${character.modifiers[0].value}`);
  console.log(`  Given DON: ${character.givenDon.length} × 1000 = 0`);
  
  const powerBefore = computeCurrentPower(character);
  console.log(`  Total power: ${powerBefore}\n`);

  // Give DON to character
  console.log('Giving DON to character...');
  const result = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'don-5',
    'char-3'
  );

  if (result.success) {
    stateManager = result.newState;
    const updatedChar = stateManager.getCard('char-3')!;
    
    console.log('\nPower calculation after giving DON:');
    console.log(`  Base power: ${characterDef.basePower}`);
    console.log(`  Power modifiers: +${updatedChar.modifiers[0].value}`);
    console.log(`  Given DON: ${updatedChar.givenDon.length} × 1000 = ${updatedChar.givenDon.length * 1000}`);
    
    const powerAfter = computeCurrentPower(updatedChar);
    console.log(`  Total power: ${powerAfter}`);
    console.log(`  Power increase: +${powerAfter - powerBefore}\n`);
  }
}

// ============================================================================
// Example 4: Event Listening
// ============================================================================

function example4_EventListening() {
  console.log('=== Example 4: Event Listening ===\n');

  const initialState = createInitialGameState();
  let stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Listen for POWER_CHANGED events
  eventEmitter.on(GameEventType.POWER_CHANGED, (event) => {
    const powerEvent = event as PowerChangedEvent;
    console.log('📢 POWER_CHANGED event received:');
    console.log(`   Card ID: ${powerEvent.cardId}`);
    console.log(`   Old Power: ${powerEvent.oldPower}`);
    console.log(`   New Power: ${powerEvent.newPower}`);
    console.log(`   Change: ${powerEvent.newPower > powerEvent.oldPower ? '+' : ''}${powerEvent.newPower - powerEvent.oldPower}\n`);
  });

  // Listen for CARD_MOVED events (DON movement)
  eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
    const moveEvent = event as CardMovedEvent;
    console.log('📢 CARD_MOVED event received:');
    console.log(`   Card/DON ID: ${moveEvent.cardId}`);
    console.log(`   From: ${moveEvent.fromZone}`);
    console.log(`   To: ${moveEvent.toZone}\n`);
  });

  // Create character and DON
  const characterDef: CardDefinition = {
    id: 'OP01-004',
    name: 'Usopp',
    category: CardCategory.CHARACTER,
    colors: ['Yellow'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Ranged'],
    basePower: 3000,
    baseCost: 2,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '004',
      isAltArt: false,
      isPromo: false,
    },
  };

  const character: CardInstance = {
    id: 'char-4',
    definition: characterDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.characterArea.push(character);

  const don: DonInstance = {
    id: 'don-6',
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  };

  player.zones.costArea.push(don);
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

  // Give DON (this will trigger events)
  console.log('Giving DON to character (watch for events)...\n');
  const result = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'don-6',
    'char-4'
  );

  if (result.success) {
    console.log('✓ DON given successfully\n');
  }
}

// ============================================================================
// Run Examples
// ============================================================================

if (require.main === module) {
  example1_BasicDonGiving();
  example2_ValidationAndErrors();
  example3_PowerCalculationWithModifiers();
  example4_EventListening();
}

export {
  example1_BasicDonGiving,
  example2_ValidationAndErrors,
  example3_PowerCalculationWithModifiers,
  example4_EventListening,
};
