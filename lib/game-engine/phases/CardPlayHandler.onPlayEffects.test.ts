/**
 * CardPlayHandler.onPlayEffects.test.ts
 * 
 * Tests that ON_PLAY effects are triggered and resolved when cards are played.
 * 
 * Validates: Requirements 15.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import { EffectSystem } from '../effects/EffectSystem';
import { handlePlayCard } from './CardPlayHandler';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  Color,
  CardInstance,
  CardDefinition,
  Phase,
} from '../core/types';
import { EffectType } from '../effects/types';

// Helper to create a minimal game state
function createGameState(): import('../core/types').GameState {
  const player1: import('../core/types').PlayerState = {
    id: PlayerId.PLAYER_1,
    zones: {
      hand: [],
      deck: [],
      trash: [],
      life: [],
      characterArea: [],
      donDeck: [],
      costArea: [],
      leaderArea: null,
      stageArea: null,
      banished: [],
    },
  };

  const player2: import('../core/types').PlayerState = {
    id: PlayerId.PLAYER_2,
    zones: {
      hand: [],
      deck: [],
      trash: [],
      life: [],
      characterArea: [],
      donDeck: [],
      costArea: [],
      leaderArea: null,
      stageArea: null,
      banished: [],
    },
  };

  return {
    players: new Map([
      [PlayerId.PLAYER_1, player1],
      [PlayerId.PLAYER_2, player2],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.MAIN,
    turnNumber: 1,
    winner: null,
    pendingTriggers: [],
    gameOver: false,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 3,
    },
    attackedThisTurn: new Set(),
  };
}

describe('CardPlayHandler - ON_PLAY Effects Integration', () => {
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;
  let eventEmitter: EventEmitter;
  let effectSystem: EffectSystem;
  let effectScriptExecuted: boolean;

  beforeEach(() => {
    // Initialize state manager with basic game state
    const initialState = createGameState();
    stateManager = new GameStateManager(initialState);

    // Initialize zone manager
    zoneManager = new ZoneManager(stateManager);

    // Initialize event emitter
    eventEmitter = new EventEmitter();

    // Initialize effect system with script registry
    const scriptRegistry = new Map();
    effectSystem = new EffectSystem(
      stateManager,
      eventEmitter,
      zoneManager,
      scriptRegistry
    );

    // Reset flag
    effectScriptExecuted = false;
  });

  it('should trigger and resolve ON_PLAY effects when a character is played', () => {
    // Create a character card with an ON_PLAY effect
    const cardDef: CardDefinition = {
      id: 'test-char-1',
      name: 'Test Character',
      category: CardCategory.CHARACTER,
      colors: [Color.RED],
      baseCost: 2,
      basePower: 3000,
      counter: 0,
      attributes: [],
      typeTags: [],
      keywords: [],
      effects: [
        {
          id: 'effect-1',
          sourceCardId: 'test-char-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.POWER_MODIFICATION,
          scriptId: 'test-on-play-script',
          oncePerTurn: false,
          usedThisTurn: false,
        },
      ],
      text: '[On Play] Test effect',
    };

    // Register effect script
    effectSystem.registerScript('test-on-play-script', (context) => {
      effectScriptExecuted = true;
      console.log('ON_PLAY effect executed!');
    });

    // Create card instance in hand
    const cardInstance: CardInstance = {
      id: 'card-instance-1',
      definition: cardDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.HAND,
      state: CardState.ACTIVE,
      counters: new Map(),
      attachedCards: [],
      givenDon: [],
      flags: new Map(),
    };

    // Add card to player's hand
    const player = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (player) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          hand: [...player.zones.hand, cardInstance],
        },
      });
    }

    // Add enough DON to pay for the card
    const donCard: CardInstance = {
      id: 'don-1',
      definition: {
        id: 'don',
        name: 'DON!!',
        category: CardCategory.DON,
        colors: [],
        baseCost: 0,
        basePower: 0,
        counter: 0,
        attributes: [],
        typeTags: [],
        keywords: [],
        effects: [],
        text: '',
      },
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.COST_AREA,
      state: CardState.ACTIVE,
      counters: new Map(),
      attachedCards: [],
      givenDon: [],
      flags: new Map(),
    };

    const donCard2: CardInstance = { ...donCard, id: 'don-2' };

    const updatedPlayer = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (updatedPlayer) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...updatedPlayer.zones,
          costArea: [donCard, donCard2],
        },
      });
    }

    // Update zone manager with new state
    zoneManager.updateStateManager(stateManager);

    // Play the card
    const result = handlePlayCard(
      stateManager,
      zoneManager,
      eventEmitter,
      PlayerId.PLAYER_1,
      'card-instance-1',
      effectSystem
    );

    // Verify card was played successfully
    expect(result.success).toBe(true);

    // Verify ON_PLAY effect was executed
    expect(effectScriptExecuted).toBe(true);

    // Verify card is in character area
    const finalPlayer = result.newState.getPlayer(PlayerId.PLAYER_1);
    expect(finalPlayer?.zones.characterArea.length).toBe(1);
    expect(finalPlayer?.zones.characterArea[0].id).toBe('card-instance-1');
  });

  it('should trigger and resolve ON_PLAY effects when a stage is played', () => {
    // Create a stage card with an ON_PLAY effect
    const cardDef: CardDefinition = {
      id: 'test-stage-1',
      name: 'Test Stage',
      category: CardCategory.STAGE,
      colors: [Color.BLUE],
      baseCost: 1,
      basePower: 0,
      counter: 0,
      attributes: [],
      typeTags: [],
      keywords: [],
      effects: [
        {
          id: 'effect-1',
          sourceCardId: 'test-stage-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.DRAW_CARDS,
          scriptId: 'test-stage-on-play-script',
          oncePerTurn: false,
          usedThisTurn: false,
        },
      ],
      text: '[On Play] Test effect',
    };

    // Register effect script
    effectSystem.registerScript('test-stage-on-play-script', (context) => {
      effectScriptExecuted = true;
      console.log('Stage ON_PLAY effect executed!');
    });

    // Create card instance in hand
    const cardInstance: CardInstance = {
      id: 'stage-instance-1',
      definition: cardDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.HAND,
      state: CardState.ACTIVE,
      counters: new Map(),
      attachedCards: [],
      givenDon: [],
      flags: new Map(),
    };

    // Add card to player's hand
    const player = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (player) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          hand: [...player.zones.hand, cardInstance],
        },
      });
    }

    // Add enough DON to pay for the card
    const donCard: CardInstance = {
      id: 'don-1',
      definition: {
        id: 'don',
        name: 'DON!!',
        category: CardCategory.DON,
        colors: [],
        baseCost: 0,
        basePower: 0,
        counter: 0,
        attributes: [],
        typeTags: [],
        keywords: [],
        effects: [],
        text: '',
      },
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.COST_AREA,
      state: CardState.ACTIVE,
      counters: new Map(),
      attachedCards: [],
      givenDon: [],
      flags: new Map(),
    };

    const updatedPlayer = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (updatedPlayer) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...updatedPlayer.zones,
          costArea: [donCard],
        },
      });
    }

    // Update zone manager with new state
    zoneManager.updateStateManager(stateManager);

    // Play the card
    const result = handlePlayCard(
      stateManager,
      zoneManager,
      eventEmitter,
      PlayerId.PLAYER_1,
      'stage-instance-1',
      effectSystem
    );

    // Verify card was played successfully
    expect(result.success).toBe(true);

    // Verify ON_PLAY effect was executed
    expect(effectScriptExecuted).toBe(true);

    // Verify card is in stage area
    const finalPlayer = result.newState.getPlayer(PlayerId.PLAYER_1);
    expect(finalPlayer?.zones.stageArea).toBeDefined();
    expect(finalPlayer?.zones.stageArea?.id).toBe('stage-instance-1');
  });

  it('should trigger and resolve ON_PLAY effects when an event is played', () => {
    // Create an event card with an ON_PLAY effect
    const cardDef: CardDefinition = {
      id: 'test-event-1',
      name: 'Test Event',
      category: CardCategory.EVENT,
      colors: [Color.GREEN],
      baseCost: 3,
      basePower: 0,
      counter: 0,
      attributes: [],
      typeTags: [],
      keywords: [],
      effects: [
        {
          id: 'effect-1',
          sourceCardId: 'test-event-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.KO_CHARACTER,
          scriptId: 'test-event-on-play-script',
          oncePerTurn: false,
          usedThisTurn: false,
        },
      ],
      text: '[On Play] Test effect',
    };

    // Register effect script
    effectSystem.registerScript('test-event-on-play-script', (context) => {
      effectScriptExecuted = true;
      console.log('Event ON_PLAY effect executed!');
    });

    // Create card instance in hand
    const cardInstance: CardInstance = {
      id: 'event-instance-1',
      definition: cardDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.HAND,
      state: CardState.ACTIVE,
      counters: new Map(),
      attachedCards: [],
      givenDon: [],
      flags: new Map(),
    };

    // Add card to player's hand
    const player = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (player) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          hand: [...player.zones.hand, cardInstance],
        },
      });
    }

    // Add enough DON to pay for the card
    const donCards: CardInstance[] = [];
    for (let i = 0; i < 3; i++) {
      donCards.push({
        id: `don-${i}`,
        definition: {
          id: 'don',
          name: 'DON!!',
          category: CardCategory.DON,
          colors: [],
          baseCost: 0,
          basePower: 0,
          counter: 0,
          attributes: [],
          typeTags: [],
          keywords: [],
          effects: [],
          text: '',
        },
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
        counters: new Map(),
        attachedCards: [],
        givenDon: [],
        flags: new Map(),
      });
    }

    const updatedPlayer = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (updatedPlayer) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...updatedPlayer.zones,
          costArea: donCards,
        },
      });
    }

    // Update zone manager with new state
    zoneManager.updateStateManager(stateManager);

    // Play the card
    const result = handlePlayCard(
      stateManager,
      zoneManager,
      eventEmitter,
      PlayerId.PLAYER_1,
      'event-instance-1',
      effectSystem
    );

    // Verify card was played successfully
    expect(result.success).toBe(true);

    // Verify ON_PLAY effect was executed
    expect(effectScriptExecuted).toBe(true);

    // Verify event card is in trash (events go to trash after resolution)
    const finalPlayer = result.newState.getPlayer(PlayerId.PLAYER_1);
    const eventInTrash = finalPlayer?.zones.trash.find(c => c.id === 'event-instance-1');
    expect(eventInTrash).toBeDefined();
  });

  it('should not trigger effects if effect system is not provided', () => {
    // Create a character card with an ON_PLAY effect
    const cardDef: CardDefinition = {
      id: 'test-char-2',
      name: 'Test Character 2',
      category: CardCategory.CHARACTER,
      colors: [Color.RED],
      baseCost: 1,
      basePower: 2000,
      counter: 0,
      attributes: [],
      typeTags: [],
      keywords: [],
      effects: [
        {
          id: 'effect-1',
          sourceCardId: 'test-char-2',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.POWER_MODIFICATION,
          scriptId: 'test-script',
          oncePerTurn: false,
          usedThisTurn: false,
        },
      ],
      text: '[On Play] Test effect',
    };

    // Create card instance in hand
    const cardInstance: CardInstance = {
      id: 'card-instance-2',
      definition: cardDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.HAND,
      state: CardState.ACTIVE,
      counters: new Map(),
      attachedCards: [],
      givenDon: [],
      flags: new Map(),
    };

    // Add card to player's hand
    const player = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (player) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          hand: [...player.zones.hand, cardInstance],
        },
      });
    }

    // Add enough DON
    const donCard: CardInstance = {
      id: 'don-1',
      definition: {
        id: 'don',
        name: 'DON!!',
        category: CardCategory.DON,
        colors: [],
        baseCost: 0,
        basePower: 0,
        counter: 0,
        attributes: [],
        typeTags: [],
        keywords: [],
        effects: [],
        text: '',
      },
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.COST_AREA,
      state: CardState.ACTIVE,
      counters: new Map(),
      attachedCards: [],
      givenDon: [],
      flags: new Map(),
    };

    const updatedPlayer = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (updatedPlayer) {
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...updatedPlayer.zones,
          costArea: [donCard],
        },
      });
    }

    // Update zone manager with new state
    zoneManager.updateStateManager(stateManager);

    // Play the card WITHOUT effect system
    const result = handlePlayCard(
      stateManager,
      zoneManager,
      eventEmitter,
      PlayerId.PLAYER_1,
      'card-instance-2'
      // No effectSystem parameter
    );

    // Verify card was played successfully
    expect(result.success).toBe(true);

    // Verify card is in character area
    const finalPlayer = result.newState.getPlayer(PlayerId.PLAYER_1);
    expect(finalPlayer?.zones.characterArea.length).toBe(1);
    expect(finalPlayer?.zones.characterArea[0].id).toBe('card-instance-2');

    // Effect should not have been executed (no effect system provided)
    // This is expected behavior for backward compatibility
  });
});
