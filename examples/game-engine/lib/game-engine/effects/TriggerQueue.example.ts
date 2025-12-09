/**
 * TriggerQueue.example.ts
 * 
 * Examples demonstrating how to use the TriggerQueue system
 */

import { TriggerQueue } from './TriggerQueue';
import { EffectSystem } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  TriggerInstance,
  PlayerId,
  CardInstance,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  GameEventType,
  EffectDefinition,
} from '../core/types';

// ============================================================================
// Example 1: Basic Trigger Resolution
// ============================================================================

function example1_BasicTriggerResolution() {
  console.log('=== Example 1: Basic Trigger Resolution ===\n');

  // Initialize game systems
  const stateManager = new GameStateManager(createInitialGameState());
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);
  const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  const triggerQueue = new TriggerQueue(stateManager, effectSystem);

  // Create a card with an ON_PLAY effect
  const card: CardInstance = {
    id: 'card-1',
    definition: {
      id: 'def-card-1',
      name: 'Monkey D. Luffy',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: ['Straw Hat Crew'],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'SR',
      keywords: [],
      effects: [],
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

  // Define an ON_PLAY effect
  const onPlayEffect: EffectDefinition = {
    id: 'effect-1',
    label: '[On Play]',
    timingType: EffectTimingType.AUTO,
    triggerTiming: TriggerTiming.ON_PLAY,
    condition: null,
    cost: null,
    scriptId: 'draw-one-card',
    oncePerTurn: false,
  };

  // Register the effect script
  effectSystem.registerScript('draw-one-card', (context) => {
    console.log(`${context.source.definition.name} ON_PLAY: Draw 1 card`);
    // In a real implementation, this would draw a card
  });

  // Create a trigger for the ON_PLAY effect
  const trigger: TriggerInstance = {
    effectDefinition: onPlayEffect,
    source: card,
    controller: PlayerId.PLAYER_1,
    event: {
      type: GameEventType.CARD_MOVED,
      playerId: PlayerId.PLAYER_1,
      cardId: card.id,
      data: { fromZone: ZoneId.HAND, toZone: ZoneId.CHARACTER_AREA },
      timestamp: Date.now(),
    },
    priority: 0,
  };

  // Enqueue and resolve the trigger
  console.log('Enqueueing trigger...');
  triggerQueue.enqueueTrigger(trigger);
  console.log(`Queue size: ${triggerQueue.getQueueSize()}\n`);

  console.log('Resolving triggers...');
  triggerQueue.resolveAllPendingTriggers();
  console.log(`Queue size after resolution: ${triggerQueue.getQueueSize()}\n`);
}

// ============================================================================
// Example 2: Turn Player Priority
// ============================================================================

function example2_TurnPlayerPriority() {
  console.log('=== Example 2: Turn Player Priority ===\n');

  // Initialize game systems
  const stateManager = new GameStateManager(createInitialGameState());
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);
  const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  const triggerQueue = new TriggerQueue(stateManager, effectSystem);

  // Create cards for both players
  const p1Card: CardInstance = {
    id: 'p1-card',
    definition: {
      id: 'def-p1',
      name: 'Player 1 Character',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: { setCode: 'OP01', cardNumber: '001', isAltArt: false, isPromo: false },
    },
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  const p2Card: CardInstance = {
    id: 'p2-card',
    definition: {
      id: 'def-p2',
      name: 'Player 2 Character',
      category: CardCategory.CHARACTER,
      colors: ['Blue'],
      typeTags: [],
      attributes: [],
      basePower: 4000,
      baseCost: 2,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: { setCode: 'OP01', cardNumber: '002', isAltArt: false, isPromo: false },
    },
    owner: PlayerId.PLAYER_2,
    controller: PlayerId.PLAYER_2,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Define effects
  const effect: EffectDefinition = {
    id: 'effect-1',
    label: '[When Attacking]',
    timingType: EffectTimingType.AUTO,
    triggerTiming: TriggerTiming.WHEN_ATTACKING,
    condition: null,
    cost: null,
    scriptId: 'power-boost',
    oncePerTurn: false,
  };

  // Register scripts
  effectSystem.registerScript('power-boost', (context) => {
    console.log(`${context.source.definition.name} (${context.controller}): +1000 power`);
  });

  // Create triggers
  const p1Trigger: TriggerInstance = {
    effectDefinition: effect,
    source: p1Card,
    controller: PlayerId.PLAYER_1,
    event: {
      type: GameEventType.ATTACK_DECLARED,
      playerId: PlayerId.PLAYER_1,
      cardId: p1Card.id,
      data: {},
      timestamp: Date.now(),
    },
    priority: 0,
  };

  const p2Trigger: TriggerInstance = {
    effectDefinition: effect,
    source: p2Card,
    controller: PlayerId.PLAYER_2,
    event: {
      type: GameEventType.ATTACK_DECLARED,
      playerId: PlayerId.PLAYER_2,
      cardId: p2Card.id,
      data: {},
      timestamp: Date.now(),
    },
    priority: 0,
  };

  // Enqueue triggers (non-turn player first)
  console.log('Enqueueing triggers (P2 first, then P1)...');
  triggerQueue.enqueueTrigger(p2Trigger);
  triggerQueue.enqueueTrigger(p1Trigger);
  console.log(`Queue size: ${triggerQueue.getQueueSize()}\n`);

  // Resolve - turn player (P1) should resolve first
  console.log('Resolving triggers (turn player P1 resolves first)...');
  triggerQueue.resolveAllPendingTriggers();
  console.log();
}

// ============================================================================
// Example 3: Priority Ordering
// ============================================================================

function example3_PriorityOrdering() {
  console.log('=== Example 3: Priority Ordering ===\n');

  // Initialize game systems
  const stateManager = new GameStateManager(createInitialGameState());
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);
  const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  const triggerQueue = new TriggerQueue(stateManager, effectSystem);

  // Create multiple cards for the same player
  const cards = [
    { id: 'card-1', name: 'Low Priority Card', priority: 1 },
    { id: 'card-2', name: 'High Priority Card', priority: 10 },
    { id: 'card-3', name: 'Medium Priority Card', priority: 5 },
  ];

  const effect: EffectDefinition = {
    id: 'effect-1',
    label: '[On Play]',
    timingType: EffectTimingType.AUTO,
    triggerTiming: TriggerTiming.ON_PLAY,
    condition: null,
    cost: null,
    scriptId: 'log-effect',
    oncePerTurn: false,
  };

  // Register script
  effectSystem.registerScript('log-effect', (context) => {
    console.log(`Resolving: ${context.source.definition.name}`);
  });

  // Create and enqueue triggers
  console.log('Enqueueing triggers in random order...');
  for (const cardData of cards) {
    const card: CardInstance = {
      id: cardData.id,
      definition: {
        id: `def-${cardData.id}`,
        name: cardData.name,
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [],
        imageUrl: '',
        metadata: { setCode: 'OP01', cardNumber: '001', isAltArt: false, isPromo: false },
      },
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    const trigger: TriggerInstance = {
      effectDefinition: effect,
      source: card,
      controller: PlayerId.PLAYER_1,
      event: {
        type: GameEventType.CARD_MOVED,
        playerId: PlayerId.PLAYER_1,
        cardId: card.id,
        data: {},
        timestamp: Date.now(),
      },
      priority: cardData.priority,
    };

    console.log(`  - ${cardData.name} (priority: ${cardData.priority})`);
    triggerQueue.enqueueTrigger(trigger);
  }

  console.log(`\nQueue size: ${triggerQueue.getQueueSize()}\n`);

  // Resolve - should resolve in priority order (high to low)
  console.log('Resolving triggers (highest priority first)...');
  triggerQueue.resolveAllPendingTriggers();
  console.log();
}

// ============================================================================
// Example 4: Recursive Trigger Creation
// ============================================================================

function example4_RecursiveTriggerCreation() {
  console.log('=== Example 4: Recursive Trigger Creation ===\n');

  // Initialize game systems
  let stateManager = new GameStateManager(createInitialGameState());
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);
  const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  const triggerQueue = new TriggerQueue(stateManager, effectSystem);

  // Create initial card
  const card1: CardInstance = {
    id: 'card-1',
    definition: {
      id: 'def-card-1',
      name: 'Card That Creates Trigger',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: { setCode: 'OP01', cardNumber: '001', isAltArt: false, isPromo: false },
    },
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  const effect1: EffectDefinition = {
    id: 'effect-1',
    label: '[On Play]',
    timingType: EffectTimingType.AUTO,
    triggerTiming: TriggerTiming.ON_PLAY,
    condition: null,
    cost: null,
    scriptId: 'create-new-trigger',
    oncePerTurn: false,
  };

  const effect2: EffectDefinition = {
    id: 'effect-2',
    label: '[On Play]',
    timingType: EffectTimingType.AUTO,
    triggerTiming: TriggerTiming.ON_PLAY,
    condition: null,
    cost: null,
    scriptId: 'simple-effect',
    oncePerTurn: false,
  };

  // Register script that creates a new trigger
  effectSystem.registerScript('create-new-trigger', (context) => {
    console.log('First effect: Creating a new trigger...');

    // Create a second card
    const card2: CardInstance = {
      id: 'card-2',
      definition: {
        id: 'def-card-2',
        name: 'Card Created By Effect',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 3000,
        baseCost: 2,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [],
        imageUrl: '',
        metadata: { setCode: 'OP01', cardNumber: '002', isAltArt: false, isPromo: false },
      },
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    // Create a new trigger
    const newTrigger: TriggerInstance = {
      effectDefinition: effect2,
      source: card2,
      controller: PlayerId.PLAYER_1,
      event: {
        type: GameEventType.CARD_MOVED,
        playerId: PlayerId.PLAYER_1,
        cardId: card2.id,
        data: {},
        timestamp: Date.now(),
      },
      priority: 0,
    };

    // Add to state's pending triggers
    const newStateManager = new GameStateManager(context.state);
    const withTrigger = newStateManager.addPendingTrigger(newTrigger);
    effectSystem.updateStateManager(withTrigger);
  });

  effectSystem.registerScript('simple-effect', () => {
    console.log('Second effect: Resolved from newly created trigger');
  });

  // Create initial trigger
  const trigger1: TriggerInstance = {
    effectDefinition: effect1,
    source: card1,
    controller: PlayerId.PLAYER_1,
    event: {
      type: GameEventType.CARD_MOVED,
      playerId: PlayerId.PLAYER_1,
      cardId: card1.id,
      data: {},
      timestamp: Date.now(),
    },
    priority: 0,
  };

  console.log('Enqueueing initial trigger...');
  triggerQueue.enqueueTrigger(trigger1);
  console.log(`Queue size: ${triggerQueue.getQueueSize()}\n`);

  console.log('Resolving triggers (will handle newly created trigger)...');
  triggerQueue.resolveAllPendingTriggers();
  console.log(`\nQueue size after resolution: ${triggerQueue.getQueueSize()}\n`);
}

// ============================================================================
// Run Examples
// ============================================================================

if (require.main === module) {
  example1_BasicTriggerResolution();
  console.log('\n' + '='.repeat(60) + '\n');
  
  example2_TurnPlayerPriority();
  console.log('\n' + '='.repeat(60) + '\n');
  
  example3_PriorityOrdering();
  console.log('\n' + '='.repeat(60) + '\n');
  
  example4_RecursiveTriggerCreation();
}

export {
  example1_BasicTriggerResolution,
  example2_TurnPlayerPriority,
  example3_PriorityOrdering,
  example4_RecursiveTriggerCreation,
};
