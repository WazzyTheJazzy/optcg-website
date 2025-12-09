/**
 * EventEmission.test.ts
 * 
 * Comprehensive tests to verify event emission consistency across all phases
 * This test file ensures that all phases emit appropriate events for state changes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runRefreshPhase } from './RefreshPhase';
import { runDrawPhase } from './DrawPhase';
import { runDonPhase } from './DonPhase';
import { runMainPhase } from './MainPhase';
import { runEndPhase } from './EndPhase';
import { PhaseManager } from './PhaseManager';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  ZoneId,
  CardState,
  CardCategory,
  CardDefinition,
  CardInstance,
  DonInstance,
  ModifierDuration,
  ModifierType,
  Phase,
} from '../core/types';

describe('Event Emission Consistency', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;

  beforeEach(() => {
    rules = new RulesContext();
    eventEmitter = new EventEmitter();

    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    zoneManager = new ZoneManager(stateManager, eventEmitter);

    // Add DON cards to don deck
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
    const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

    if (player1 && player2) {
      for (let i = 0; i < 10; i++) {
        const don1: DonInstance = {
          id: `don-p1-${i}`,
          owner: PlayerId.PLAYER_1,
          zone: ZoneId.DON_DECK,
          state: CardState.NONE,
        };
        player1.zones.donDeck.push(don1);

        const don2: DonInstance = {
          id: `don-p2-${i}`,
          owner: PlayerId.PLAYER_2,
          zone: ZoneId.DON_DECK,
          state: CardState.NONE,
        };
        player2.zones.donDeck.push(don2);
      }

      // Add cards to decks
      for (let i = 0; i < 5; i++) {
        const cardDef: CardDefinition = {
          id: `card-${i}`,
          name: `Test Card ${i}`,
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
          metadata: {
            setCode: 'TEST',
            cardNumber: `${i}`,
            isAltArt: false,
            isPromo: false,
          },
        };

        const card1: CardInstance = {
          id: `card-p1-${i}`,
          definition: cardDef,
          owner: PlayerId.PLAYER_1,
          controller: PlayerId.PLAYER_1,
          zone: ZoneId.DECK,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        };
        player1.zones.deck.push(card1);

        const card2: CardInstance = {
          id: `card-p2-${i}`,
          definition: cardDef,
          owner: PlayerId.PLAYER_2,
          controller: PlayerId.PLAYER_2,
          zone: ZoneId.DECK,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        };
        player2.zones.deck.push(card2);
      }
    }

    stateManager = new GameStateManager(stateManager.getState());
  });

  describe('RefreshPhase Event Emission', () => {
    it('should emit CARD_STATE_CHANGED events for all card activations', () => {
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // Create rested cards
      const char1 = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.RESTED);
      const leader = createTestCard('leader-1', PlayerId.PLAYER_1, ZoneId.LEADER_AREA, CardState.RESTED, CardCategory.LEADER);
      const don1 = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.RESTED);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(char1);
      player1.zones.leaderArea = leader;
      player1.zones.costArea.push(don1);
      stateManager = new GameStateManager(stateManager.getState());

      const stateChangedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_STATE_CHANGED, (event) => {
        stateChangedEvents.push(event);
      });

      runRefreshPhase(stateManager, rules, eventEmitter);

      // Should emit events for character, leader, and DON activation
      const activationEvents = stateChangedEvents.filter(e => 
        e.newState === CardState.ACTIVE && e.oldState === CardState.RESTED
      );
      expect(activationEvents.length).toBeGreaterThanOrEqual(3);
    });

    it('should emit CARD_STATE_CHANGED events for DON returned to cost area', () => {
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      const don1 = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      character.givenDon.push(don1);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      const stateChangedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_STATE_CHANGED, (event) => {
        stateChangedEvents.push(event);
      });

      runRefreshPhase(stateManager, rules, eventEmitter);

      // Should emit event for DON being set to rested when returned
      const donStateEvents = stateChangedEvents.filter(e => e.cardId === 'don-1');
      expect(donStateEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should not emit events when no state changes occur', () => {
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // All cards already active
      const char1 = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(char1);
      stateManager = new GameStateManager(stateManager.getState());

      const stateChangedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_STATE_CHANGED, (event) => {
        stateChangedEvents.push(event);
      });

      runRefreshPhase(stateManager, rules, eventEmitter);

      // No state changes, so no events (or only events for DON that were already active)
      expect(stateChangedEvents.length).toBe(0);
    });
  });

  describe('DrawPhase Event Emission', () => {
    it('should emit CARD_MOVED event when drawing a card', () => {
      stateManager = stateManager.incrementTurn(); // Turn 2 so draw happens

      const cardMovedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });

      runDrawPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(1);
      expect(cardMovedEvents[0].type).toBe(GameEventType.CARD_MOVED);
      expect(cardMovedEvents[0].fromZone).toBe(ZoneId.DECK);
      expect(cardMovedEvents[0].toZone).toBe(ZoneId.HAND);
    });

    it('should emit GAME_OVER event when deck is empty', () => {
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.deck = [];
      stateManager = new GameStateManager(stateManager.getState());
      stateManager = stateManager.incrementTurn(); // Turn 2 so draw happens

      const gameOverEvents: any[] = [];
      eventEmitter.on(GameEventType.GAME_OVER, (event) => {
        gameOverEvents.push(event);
      });

      runDrawPhase(stateManager, rules, eventEmitter);

      expect(gameOverEvents).toHaveLength(1);
      expect(gameOverEvents[0].type).toBe(GameEventType.GAME_OVER);
      expect(gameOverEvents[0].reason).toBe('DECK_OUT');
    });

    it('should not emit events when draw is skipped', () => {
      // Turn 1, Player 1 - draw is skipped
      const cardMovedEvents: any[] = [];
      const gameOverEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });
      eventEmitter.on(GameEventType.GAME_OVER, (event) => {
        gameOverEvents.push(event);
      });

      runDrawPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(0);
      expect(gameOverEvents).toHaveLength(0);
    });
  });

  describe('DonPhase Event Emission', () => {
    it('should emit CARD_MOVED events for each DON placed', () => {
      stateManager = stateManager.incrementTurn(); // Turn 2 so 2 DON are placed

      const cardMovedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });

      runDonPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(2);
      cardMovedEvents.forEach(event => {
        expect(event.type).toBe(GameEventType.CARD_MOVED);
        expect(event.fromZone).toBe(ZoneId.DON_DECK);
        expect(event.toZone).toBe(ZoneId.COST_AREA);
      });
    });

    it('should emit correct number of events based on turn', () => {
      // Turn 1, Player 1 - should place 1 DON
      const cardMovedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });

      runDonPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(1);
    });

    it('should not emit events when don deck is empty', () => {
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.donDeck = [];
      stateManager = new GameStateManager(stateManager.getState());

      const cardMovedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });

      runDonPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(0);
    });
  });

  describe('MainPhase Event Emission', () => {
    it('should not emit events when run without input provider', () => {
      const allEvents: any[] = [];
      
      // Listen to all event types
      Object.values(GameEventType).forEach(eventType => {
        eventEmitter.on(eventType, (event) => {
          allEvents.push({ eventType, ...event });
        });
      });

      runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Main phase without input provider should not emit any events
      // (START_OF_MAIN triggers are enqueued but not resolved)
      expect(allEvents).toHaveLength(0);
    });

    // Note: Event emission during action execution is tested in the respective handler tests
    // (CardPlayHandler, DonHandler, BattleSystem, etc.)
  });

  describe('EndPhase Event Emission', () => {
    it('should not emit events for modifier expiration', () => {
      // Add a character with temporary modifier
      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      character.modifiers = [
        {
          id: 'mod-1',
          type: ModifierType.POWER,
          value: 2000,
          duration: ModifierDuration.UNTIL_END_OF_TURN,
          source: 'effect-1',
          timestamp: Date.now(),
        },
      ];

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      const allEvents: any[] = [];
      Object.values(GameEventType).forEach(eventType => {
        eventEmitter.on(eventType, (event) => {
          allEvents.push({ eventType, ...event });
        });
      });

      runEndPhase(stateManager, rules, eventEmitter);

      // Modifier expiration does not emit events (it's a silent state change)
      // This is by design - modifiers are internal state
      expect(allEvents).toHaveLength(0);
    });

    // Note: END_OF_YOUR_TURN and END_OF_OPPONENT_TURN trigger events are tested
    // in the effect system tests
  });

  describe('PhaseManager Event Emission', () => {
    it('should emit PHASE_CHANGED events for all phase transitions', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const phaseChangedEvents: any[] = [];
      eventEmitter.on(GameEventType.PHASE_CHANGED, (event) => {
        phaseChangedEvents.push(event);
      });

      phaseManager.runTurn(stateManager);

      expect(phaseChangedEvents).toHaveLength(5);
      expect(phaseChangedEvents[0].newPhase).toBe(Phase.REFRESH);
      expect(phaseChangedEvents[1].newPhase).toBe(Phase.DRAW);
      expect(phaseChangedEvents[2].newPhase).toBe(Phase.DON_PHASE);
      expect(phaseChangedEvents[3].newPhase).toBe(Phase.MAIN);
      expect(phaseChangedEvents[4].newPhase).toBe(Phase.END);
    });

    it('should emit TURN_START event at beginning of turn', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const turnStartEvents: any[] = [];
      eventEmitter.on(GameEventType.TURN_START, (event) => {
        turnStartEvents.push(event);
      });

      phaseManager.runTurn(stateManager);

      expect(turnStartEvents).toHaveLength(1);
      expect(turnStartEvents[0].type).toBe(GameEventType.TURN_START);
      expect(turnStartEvents[0].turnNumber).toBe(1);
      expect(turnStartEvents[0].activePlayer).toBe(PlayerId.PLAYER_1);
    });

    it('should emit TURN_END event at end of turn', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const turnEndEvents: any[] = [];
      eventEmitter.on(GameEventType.TURN_END, (event) => {
        turnEndEvents.push(event);
      });

      phaseManager.runTurn(stateManager);

      expect(turnEndEvents).toHaveLength(1);
      expect(turnEndEvents[0].type).toBe(GameEventType.TURN_END);
      expect(turnEndEvents[0].turnNumber).toBe(1);
    });

    it('should emit events in correct order', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const eventOrder: string[] = [];
      eventEmitter.on(GameEventType.TURN_START, () => eventOrder.push('TURN_START'));
      eventEmitter.on(GameEventType.PHASE_CHANGED, () => eventOrder.push('PHASE_CHANGED'));
      eventEmitter.on(GameEventType.TURN_END, () => eventOrder.push('TURN_END'));

      phaseManager.runTurn(stateManager);

      // Should start with TURN_START, then PHASE_CHANGED events, then TURN_END
      expect(eventOrder[0]).toBe('TURN_START');
      expect(eventOrder[eventOrder.length - 1]).toBe('TURN_END');
      
      // All middle events should be PHASE_CHANGED
      const middleEvents = eventOrder.slice(1, -1);
      middleEvents.forEach(event => {
        expect(event).toBe('PHASE_CHANGED');
      });
    });

    it('should include all required properties in PHASE_CHANGED events', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const phaseChangedEvents: any[] = [];
      eventEmitter.on(GameEventType.PHASE_CHANGED, (event) => {
        phaseChangedEvents.push(event);
      });

      phaseManager.runTurn(stateManager);

      phaseChangedEvents.forEach(event => {
        expect(event.type).toBe(GameEventType.PHASE_CHANGED);
        expect(event.oldPhase).toBeDefined();
        expect(event.newPhase).toBeDefined();
        expect(event.activePlayer).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(typeof event.timestamp).toBe('number');
      });
    });

    it('should include all required properties in TURN_START events', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const turnStartEvents: any[] = [];
      eventEmitter.on(GameEventType.TURN_START, (event) => {
        turnStartEvents.push(event);
      });

      phaseManager.runTurn(stateManager);

      expect(turnStartEvents[0].type).toBe(GameEventType.TURN_START);
      expect(turnStartEvents[0].turnNumber).toBeDefined();
      expect(turnStartEvents[0].activePlayer).toBeDefined();
      expect(turnStartEvents[0].timestamp).toBeDefined();
      expect(typeof turnStartEvents[0].timestamp).toBe('number');
    });

    it('should include all required properties in TURN_END events', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const turnEndEvents: any[] = [];
      eventEmitter.on(GameEventType.TURN_END, (event) => {
        turnEndEvents.push(event);
      });

      phaseManager.runTurn(stateManager);

      expect(turnEndEvents[0].type).toBe(GameEventType.TURN_END);
      expect(turnEndEvents[0].turnNumber).toBeDefined();
      expect(turnEndEvents[0].activePlayer).toBeDefined();
      expect(turnEndEvents[0].timestamp).toBeDefined();
      expect(typeof turnEndEvents[0].timestamp).toBe('number');
    });
  });

  describe('Cross-Phase Event Consistency', () => {
    it('should emit events consistently across multiple turns', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const allEvents: any[] = [];
      Object.values(GameEventType).forEach(eventType => {
        eventEmitter.on(eventType, (event) => {
          allEvents.push({ eventType, ...event });
        });
      });

      // Run 3 turns
      stateManager = phaseManager.runTurn(stateManager);
      stateManager = phaseManager.runTurn(stateManager);
      stateManager = phaseManager.runTurn(stateManager);

      // Should have consistent event patterns for each turn
      const turnStartEvents = allEvents.filter(e => e.eventType === GameEventType.TURN_START);
      const turnEndEvents = allEvents.filter(e => e.eventType === GameEventType.TURN_END);
      const phaseChangedEvents = allEvents.filter(e => e.eventType === GameEventType.PHASE_CHANGED);

      expect(turnStartEvents).toHaveLength(3);
      expect(turnEndEvents).toHaveLength(3);
      expect(phaseChangedEvents).toHaveLength(15); // 5 phases * 3 turns
    });

    it('should emit CARD_MOVED events for zone transitions in all phases', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      const cardMovedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });

      // Run a turn - should have DON placement and card draw
      phaseManager.runTurn(stateManager);

      // Should have at least 1 event (DON placement in Don Phase)
      // Draw is skipped on turn 1 for player 1
      expect(cardMovedEvents.length).toBeGreaterThanOrEqual(1);
      
      cardMovedEvents.forEach(event => {
        expect(event.type).toBe(GameEventType.CARD_MOVED);
        expect(event.cardId).toBeDefined();
        expect(event.playerId).toBeDefined();
        expect(event.fromZone).toBeDefined();
        expect(event.toZone).toBeDefined();
        expect(event.timestamp).toBeDefined();
      });
    });

    it('should emit CARD_STATE_CHANGED events for state transitions in all phases', () => {
      const phaseManager = new PhaseManager(rules, eventEmitter);

      // Add a rested character to test Refresh Phase activation
      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.RESTED);
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      const stateChangedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_STATE_CHANGED, (event) => {
        stateChangedEvents.push(event);
      });

      phaseManager.runTurn(stateManager);

      // Should have at least 1 event (character activation in Refresh Phase)
      expect(stateChangedEvents.length).toBeGreaterThanOrEqual(1);
      
      stateChangedEvents.forEach(event => {
        expect(event.type).toBe(GameEventType.CARD_STATE_CHANGED);
        expect(event.cardId).toBeDefined();
        expect(event.playerId).toBeDefined();
        expect(event.oldState).toBeDefined();
        expect(event.newState).toBeDefined();
        expect(event.timestamp).toBeDefined();
      });
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createTestCard(
  id: string,
  owner: PlayerId,
  zone: ZoneId,
  state: CardState = CardState.NONE,
  category: CardCategory = CardCategory.CHARACTER
): CardInstance {
  const cardDef: CardDefinition = {
    id: `def-${id}`,
    name: `Test Card ${id}`,
    category,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 3000,
    baseCost: 2,
    lifeValue: category === CardCategory.LEADER ? 5 : null,
    counterValue: category === CardCategory.CHARACTER ? 1000 : null,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: id,
      isAltArt: false,
      isPromo: false,
    },
  };

  return {
    id,
    definition: cardDef,
    owner,
    controller: owner,
    zone,
    state,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createTestDon(
  id: string,
  owner: PlayerId,
  zone: ZoneId,
  state: CardState = CardState.NONE
): DonInstance {
  return {
    id,
    owner,
    zone,
    state,
  };
}
