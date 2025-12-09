/**
 * EffectSystem.events.test.ts
 * 
 * Tests for effect event emission in the EffectSystem
 * Validates Requirements 23.1, 23.2, 23.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EffectSystem } from './EffectSystem';
import { GameStateManager } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  GameEventType,
  EffectTimingType,
  TriggerTiming,
  PlayerId,
  CardCategory,
  ZoneId,
  CardState,
  Phase,
  GameState,
  CardInstance,
  CardDefinition,
  PlayerState,
  EffectDefinition,
} from '../core/types';
import { EffectType, TargetType } from './types';

// Helper to create a minimal game state
function createGameState(): GameState {
  const player1: PlayerState = {
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
    },
  };

  const player2: PlayerState = {
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

describe('EffectSystem - Event Emission', () => {
  let effectSystem: EffectSystem;
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let emittedEvents: any[];

  beforeEach(() => {
    // Create mock state
    const mockState = createGameState();
    stateManager = new GameStateManager(mockState);
    
    // Create event emitter and capture events
    eventEmitter = new EventEmitter();
    emittedEvents = [];
    eventEmitter.onAny((event) => {
      emittedEvents.push(event);
    });
    
    // Create zone manager
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    
    // Create effect system
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  });

  describe('EFFECT_TRIGGERED event', () => {
    it('should emit EFFECT_TRIGGERED when an activated effect is activated', () => {
      // Create effect definition
      const effectDef: EffectDefinition = {
        id: 'effect-1',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        effectType: EffectType.DRAW_CARDS,
        scriptId: 'draw-script',
        condition: null,
        cost: null,
        oncePerTurn: false,
      };

      // Create card definition
      const cardDef: CardDefinition = {
        id: 'def-1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: null,
        rarity: 'C',
        keywords: [],
        effects: [effectDef],
        imageUrl: '',
        metadata: { setId: 'OP01', cardNumber: '001' },
      };

      // Create card instance
      const card: CardInstance = {
        id: 'card-1',
        definition: cardDef,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        modifiers: [],
        givenDon: [],
        flags: new Map(),
      };

      // Add card to state
      const state = stateManager.getState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);
      stateManager = new GameStateManager(state);
      effectSystem.updateStateManager(stateManager);

      // Register a dummy script
      effectSystem.registerScript('draw-script', () => {});

      // Clear events from setup
      emittedEvents = [];

      // Activate the effect
      effectSystem.activateEffect('card-1', 'effect-1');

      // Find EFFECT_TRIGGERED event
      const triggeredEvent = emittedEvents.find(e => e.type === GameEventType.EFFECT_TRIGGERED);
      
      expect(triggeredEvent).toBeDefined();
      expect(triggeredEvent!.data.effectId).toBe('effect-1');
      expect(triggeredEvent!.data.sourceCardId).toBe('card-1');
      expect(triggeredEvent!.data.sourceName).toBe('Test Card');
      expect(triggeredEvent!.data.controller).toBe(PlayerId.PLAYER_1);
      expect(triggeredEvent!.data.effectType).toBe(EffectType.DRAW_CARDS);
      expect(triggeredEvent!.data.label).toBe('[Activate: Main]');
    });

    it('should include targets and values in EFFECT_TRIGGERED', () => {
      // Create effect definition
      const effectDef: EffectDefinition = {
        id: 'effect-2',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        effectType: EffectType.POWER_MODIFICATION,
        scriptId: 'power-script',
        condition: null,
        cost: null,
        oncePerTurn: false,
      };

      // Create card definition
      const cardDef: CardDefinition = {
        id: 'def-2',
        name: 'Power Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: null,
        rarity: 'C',
        keywords: [],
        effects: [effectDef],
        imageUrl: '',
        metadata: { setId: 'OP01', cardNumber: '002' },
      };

      // Create card instance
      const card: CardInstance = {
        id: 'card-2',
        definition: cardDef,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        modifiers: [],
        givenDon: [],
        flags: new Map(),
      };

      // Add card to state
      const state = stateManager.getState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);
      stateManager = new GameStateManager(state);
      effectSystem.updateStateManager(stateManager);

      // Register a dummy script
      effectSystem.registerScript('power-script', () => {});

      // Clear events from setup
      emittedEvents = [];

      // Activate the effect with targets and values
      const targets = [{ type: TargetType.CARD, cardId: 'target-1' }];
      const values = new Map([['amount', 1000]]);
      effectSystem.activateEffect('card-2', 'effect-2', targets, values);

      // Find EFFECT_TRIGGERED event
      const triggeredEvent = emittedEvents.find(e => e.type === GameEventType.EFFECT_TRIGGERED);
      
      expect(triggeredEvent).toBeDefined();
      expect(triggeredEvent!.data.targets).toEqual(targets);
      expect(triggeredEvent!.data.values).toEqual({ amount: 1000 });
    });
  });

  describe('EFFECT_AWAITING_INPUT event', () => {
    it('should emit EFFECT_AWAITING_INPUT before resolving an effect', () => {
      // Create effect definition
      const effectDef: EffectDefinition = {
        id: 'effect-3',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        effectType: EffectType.KO_CHARACTER,
        scriptId: 'ko-script',
        condition: null,
        cost: null,
        oncePerTurn: false,
      };

      // Create card definition
      const cardDef: CardDefinition = {
        id: 'def-3',
        name: 'KO Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: null,
        rarity: 'C',
        keywords: [],
        effects: [effectDef],
        imageUrl: '',
        metadata: { setId: 'OP01', cardNumber: '003' },
      };

      // Create card instance
      const card: CardInstance = {
        id: 'card-3',
        definition: cardDef,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        modifiers: [],
        givenDon: [],
        flags: new Map(),
      };

      // Add card to state
      const state = stateManager.getState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);
      stateManager = new GameStateManager(state);
      effectSystem.updateStateManager(stateManager);

      // Register a dummy script
      effectSystem.registerScript('ko-script', () => {});

      // Clear events from setup
      emittedEvents = [];

      // Activate the effect
      effectSystem.activateEffect('card-3', 'effect-3');

      // Find EFFECT_AWAITING_INPUT event
      const awaitingEvent = emittedEvents.find(e => e.type === GameEventType.EFFECT_AWAITING_INPUT);
      
      expect(awaitingEvent).toBeDefined();
      expect(awaitingEvent!.data.effectId).toBe('effect-3');
      expect(awaitingEvent!.data.sourceCardId).toBe('card-3');
      expect(awaitingEvent!.data.sourceName).toBe('KO Card');
      expect(awaitingEvent!.data.controller).toBe(PlayerId.PLAYER_1);
      expect(awaitingEvent!.data.effectType).toBe(EffectType.KO_CHARACTER);
      expect(awaitingEvent!.data.label).toBe('[Activate: Main]');
    });
  });

  describe('EFFECT_RESOLVED event', () => {
    it('should emit EFFECT_RESOLVED after resolving an effect', () => {
      // Create effect definition
      const effectDef: EffectDefinition = {
        id: 'effect-4',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        effectType: EffectType.REST_CHARACTER,
        scriptId: 'rest-script',
        condition: null,
        cost: null,
        oncePerTurn: false,
      };

      // Create card definition
      const cardDef: CardDefinition = {
        id: 'def-4',
        name: 'Rest Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: null,
        rarity: 'C',
        keywords: [],
        effects: [effectDef],
        imageUrl: '',
        metadata: { setId: 'OP01', cardNumber: '004' },
      };

      // Create card instance
      const card: CardInstance = {
        id: 'card-4',
        definition: cardDef,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        modifiers: [],
        givenDon: [],
        flags: new Map(),
      };

      // Add card to state
      const state = stateManager.getState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);
      stateManager = new GameStateManager(state);
      effectSystem.updateStateManager(stateManager);

      // Register a dummy script
      effectSystem.registerScript('rest-script', () => {});

      // Clear events from setup
      emittedEvents = [];

      // Activate the effect
      effectSystem.activateEffect('card-4', 'effect-4');

      // Find EFFECT_RESOLVED event
      const resolvedEvent = emittedEvents.find(e => e.type === GameEventType.EFFECT_RESOLVED);
      
      expect(resolvedEvent).toBeDefined();
      expect(resolvedEvent!.data.effectId).toBe('effect-4');
      expect(resolvedEvent!.data.sourceCardId).toBe('card-4');
      expect(resolvedEvent!.data.sourceName).toBe('Rest Card');
      expect(resolvedEvent!.data.controller).toBe(PlayerId.PLAYER_1);
      expect(resolvedEvent!.data.effectType).toBe(EffectType.REST_CHARACTER);
    });

    it('should emit EFFECT_RESOLVED after EFFECT_AWAITING_INPUT', () => {
      // Create effect definition
      const effectDef: EffectDefinition = {
        id: 'effect-5',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        effectType: EffectType.ACTIVATE_CHARACTER,
        scriptId: 'activate-script',
        condition: null,
        cost: null,
        oncePerTurn: false,
      };

      // Create card definition
      const cardDef: CardDefinition = {
        id: 'def-5',
        name: 'Activate Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: null,
        rarity: 'C',
        keywords: [],
        effects: [effectDef],
        imageUrl: '',
        metadata: { setId: 'OP01', cardNumber: '005' },
      };

      // Create card instance
      const card: CardInstance = {
        id: 'card-5',
        definition: cardDef,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        modifiers: [],
        givenDon: [],
        flags: new Map(),
      };

      // Add card to state
      const state = stateManager.getState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);
      stateManager = new GameStateManager(state);
      effectSystem.updateStateManager(stateManager);

      // Register a dummy script
      effectSystem.registerScript('activate-script', () => {});

      // Clear events from setup
      emittedEvents = [];

      // Activate the effect
      effectSystem.activateEffect('card-5', 'effect-5');

      // Find event indices
      const awaitingIndex = emittedEvents.findIndex(e => e.type === GameEventType.EFFECT_AWAITING_INPUT);
      const resolvedIndex = emittedEvents.findIndex(e => e.type === GameEventType.EFFECT_RESOLVED);
      
      expect(awaitingIndex).toBeGreaterThanOrEqual(0);
      expect(resolvedIndex).toBeGreaterThanOrEqual(0);
      expect(resolvedIndex).toBeGreaterThan(awaitingIndex);
    });
  });

  describe('Event emission order', () => {
    it('should emit events in correct order: TRIGGERED -> AWAITING_INPUT -> RESOLVED', () => {
      // Create effect definition
      const effectDef: EffectDefinition = {
        id: 'effect-6',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        effectType: EffectType.SEARCH_DECK,
        scriptId: 'search-script',
        condition: null,
        cost: null,
        oncePerTurn: false,
      };

      // Create card definition
      const cardDef: CardDefinition = {
        id: 'def-6',
        name: 'Search Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: null,
        rarity: 'C',
        keywords: [],
        effects: [effectDef],
        imageUrl: '',
        metadata: { setId: 'OP01', cardNumber: '006' },
      };

      // Create card instance
      const card: CardInstance = {
        id: 'card-6',
        definition: cardDef,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        modifiers: [],
        givenDon: [],
        flags: new Map(),
      };

      // Add card to state
      const state = stateManager.getState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);
      stateManager = new GameStateManager(state);
      effectSystem.updateStateManager(stateManager);

      // Register a dummy script
      effectSystem.registerScript('search-script', () => {});

      // Clear events from setup
      emittedEvents = [];

      // Activate the effect
      effectSystem.activateEffect('card-6', 'effect-6');

      // Find event indices
      const triggeredIndex = emittedEvents.findIndex(e => e.type === GameEventType.EFFECT_TRIGGERED);
      const awaitingIndex = emittedEvents.findIndex(e => e.type === GameEventType.EFFECT_AWAITING_INPUT);
      const resolvedIndex = emittedEvents.findIndex(e => e.type === GameEventType.EFFECT_RESOLVED);
      
      expect(triggeredIndex).toBeGreaterThanOrEqual(0);
      expect(awaitingIndex).toBeGreaterThanOrEqual(0);
      expect(resolvedIndex).toBeGreaterThanOrEqual(0);
      
      // Verify order
      expect(awaitingIndex).toBeGreaterThan(triggeredIndex);
      expect(resolvedIndex).toBeGreaterThan(awaitingIndex);
    });
  });
});
