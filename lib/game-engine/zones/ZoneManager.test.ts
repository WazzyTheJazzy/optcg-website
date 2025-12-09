/**
 * ZoneManager.test.ts
 * 
 * Unit tests for ZoneManager - testing card movement, zone limits, and event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneManager, ZoneError } from './ZoneManager';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter, GameEventType, CardMovedEvent } from '../rendering/EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardInstance,
  DonInstance,
  CardState,
  CardCategory,
  CardDefinition,
} from '../core/types';

describe('ZoneManager', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;

  // Helper to create a test card
  const createTestCard = (id: string, owner: PlayerId, zone: ZoneId): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
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
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition,
      owner,
      controller: owner,
      zone,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper to create a test DON
  const createTestDon = (id: string, owner: PlayerId, zone: ZoneId): DonInstance => {
    return {
      id,
      owner,
      zone,
      state: CardState.ACTIVE,
    };
  };

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
  });

  describe('moveCard', () => {
    it('should move card from deck to hand', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.deck.push(card);

      const events: CardMovedEvent[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event as CardMovedEvent);
      });

      const newStateManager = zoneManager.moveCard('card1', ZoneId.HAND);
      const hand = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND);
      const deck = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK);

      expect(hand).toHaveLength(1);
      expect(hand[0].id).toBe('card1');
      expect(deck).toHaveLength(0);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(GameEventType.CARD_MOVED);
      expect(events[0].cardId).toBe('card1');
      expect(events[0].fromZone).toBe(ZoneId.DECK);
      expect(events[0].toZone).toBe(ZoneId.HAND);
    });

    it('should throw error when moving non-existent card', () => {
      expect(() => {
        zoneManager.moveCard('nonexistent', ZoneId.HAND);
      }).toThrow(ZoneError);
    });

    it('should move card to specific index', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.hand.push(createTestCard('card2', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.hand.push(createTestCard('card3', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.deck.push(createTestCard('card4', PlayerId.PLAYER_1, ZoneId.DECK));

      const newStateManager = zoneManager.moveCard('card4', ZoneId.HAND, 1);
      const hand = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND) as CardInstance[];

      expect(hand).toHaveLength(4);
      expect(hand[0].id).toBe('card1');
      expect(hand[1].id).toBe('card4');
      expect(hand[2].id).toBe('card2');
      expect(hand[3].id).toBe('card3');
    });
  });

  describe('Zone Limits', () => {
    it('should enforce character area limit of 5', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      for (let i = 0; i < 5; i++) {
        const charCard = createTestCard(`char${i}`, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
        player.zones.characterArea.push(charCard);
      }

      const card6 = createTestCard('char6', PlayerId.PLAYER_1, ZoneId.HAND);
      player.zones.hand.push(card6);

      expect(() => {
        zoneManager.moveCard('char6', ZoneId.CHARACTER_AREA);
      }).toThrow(ZoneError);
      
      expect(() => {
        zoneManager.moveCard('char6', ZoneId.CHARACTER_AREA);
      }).toThrow('Character area is full');
    });

    it('should enforce stage area limit of 1', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const stage1 = createTestCard('stage1', PlayerId.PLAYER_1, ZoneId.STAGE_AREA);
      player.zones.stageArea = stage1;

      const stage2 = createTestCard('stage2', PlayerId.PLAYER_1, ZoneId.HAND);
      player.zones.hand.push(stage2);

      expect(() => {
        zoneManager.moveCard('stage2', ZoneId.STAGE_AREA);
      }).toThrow(ZoneError);
      
      expect(() => {
        zoneManager.moveCard('stage2', ZoneId.STAGE_AREA);
      }).toThrow('Stage area is full');
    });
  });

  describe('moveDon', () => {
    it('should move DON from don deck to cost area', () => {
      const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.DON_DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.donDeck.push(don);

      const events: CardMovedEvent[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event as CardMovedEvent);
      });

      const newStateManager = zoneManager.moveDon('don1', ZoneId.COST_AREA);
      const costArea = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.COST_AREA);
      const donDeck = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.DON_DECK);

      expect(costArea).toHaveLength(1);
      expect(costArea[0].id).toBe('don1');
      expect(donDeck).toHaveLength(0);
      expect(events).toHaveLength(1);
      expect(events[0].cardId).toBe('don1');
      expect(events[0].fromZone).toBe(ZoneId.DON_DECK);
      expect(events[0].toZone).toBe(ZoneId.COST_AREA);
    });

    it('should give DON to a character card', () => {
      const don = createTestDon('don2', PlayerId.PLAYER_1, ZoneId.COST_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.costArea.push(don);

      const charCard = createTestCard('char1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player.zones.characterArea.push(charCard);

      const newStateManager = zoneManager.moveDon('don2', ZoneId.CHARACTER_AREA, 'char1');
      const costArea = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.COST_AREA);
      const character = newStateManager.getCard('char1');

      expect(costArea).toHaveLength(0);
      expect(character).not.toBeNull();
      expect(character!.givenDon).toHaveLength(1);
      expect(character!.givenDon[0].id).toBe('don2');
    });

    it('should throw error when moving DON to invalid zone', () => {
      const don = createTestDon('don3', PlayerId.PLAYER_1, ZoneId.COST_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.costArea.push(don);

      expect(() => {
        zoneManager.moveDon('don3', ZoneId.HAND);
      }).toThrow(ZoneError);
      
      expect(() => {
        zoneManager.moveDon('don3', ZoneId.HAND);
      }).toThrow('DON can only move to DON_DECK or COST_AREA');
    });
  });

  describe('addToZone', () => {
    it('should add a card to a zone', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND);
      const events: CardMovedEvent[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event as CardMovedEvent);
      });

      const newStateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.HAND);
      const hand = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND);

      expect(hand).toHaveLength(1);
      expect(hand[0].id).toBe('card1');
      expect(events).toHaveLength(1);
      expect(events[0].fromZone).toBe(ZoneId.LIMBO);
      expect(events[0].toZone).toBe(ZoneId.HAND);
    });

    it('should add card at specific index', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.hand.push(createTestCard('card2', PlayerId.PLAYER_1, ZoneId.HAND));

      const card3 = createTestCard('card3', PlayerId.PLAYER_1, ZoneId.HAND);
      const newStateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card3, ZoneId.HAND, 1);
      const hand = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND) as CardInstance[];

      expect(hand).toHaveLength(3);
      expect(hand[0].id).toBe('card1');
      expect(hand[1].id).toBe('card3');
      expect(hand[2].id).toBe('card2');
    });
  });

  describe('removeFromZone', () => {
    it('should remove a card from a zone', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.hand.push(createTestCard('card2', PlayerId.PLAYER_1, ZoneId.HAND));

      const events: CardMovedEvent[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event as CardMovedEvent);
      });

      const result = zoneManager.removeFromZone(PlayerId.PLAYER_1, 'card1', ZoneId.HAND);
      const hand = result.stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND);

      expect(hand).toHaveLength(1);
      expect(hand[0].id).toBe('card2');
      expect(result.card.id).toBe('card1');
      expect(events).toHaveLength(1);
      expect(events[0].fromZone).toBe(ZoneId.HAND);
      expect(events[0].toZone).toBe(ZoneId.LIMBO);
    });

    it('should throw error when removing non-existent card', () => {
      expect(() => {
        zoneManager.removeFromZone(PlayerId.PLAYER_1, 'nonexistent', ZoneId.HAND);
      }).toThrow(ZoneError);
    });
  });

  describe('getZoneContents', () => {
    it('should return zone contents', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.hand.push(createTestCard('card2', PlayerId.PLAYER_1, ZoneId.HAND));

      const contents = zoneManager.getZoneContents(PlayerId.PLAYER_1, ZoneId.HAND);

      expect(contents).toHaveLength(2);
      expect(contents[0].id).toBe('card1');
      expect(contents[1].id).toBe('card2');
    });

    it('should return empty array for empty zone', () => {
      const contents = zoneManager.getZoneContents(PlayerId.PLAYER_1, ZoneId.HAND);
      expect(contents).toHaveLength(0);
    });
  });

  describe('updateStateManager', () => {
    it('should update state manager reference', () => {
      const newState = createInitialGameState();
      const newStateManager = new GameStateManager(newState);
      
      zoneManager.updateStateManager(newStateManager);
      const contents = zoneManager.getZoneContents(PlayerId.PLAYER_1, ZoneId.HAND);
      
      expect(contents).toBeDefined();
    });
  });

  describe('Event Emission', () => {
    it('should emit CARD_MOVED event when moving cards', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.deck.push(card);

      const events: CardMovedEvent[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event as CardMovedEvent);
      });

      zoneManager.moveCard('card1', ZoneId.HAND);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(GameEventType.CARD_MOVED);
      expect(events[0].cardId).toBe('card1');
      expect(events[0].playerId).toBe(PlayerId.PLAYER_1);
    });

    it('should emit CARD_MOVED event when moving DON', () => {
      const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.DON_DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.donDeck.push(don);

      const events: CardMovedEvent[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event as CardMovedEvent);
      });

      zoneManager.moveDon('don1', ZoneId.COST_AREA);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(GameEventType.CARD_MOVED);
      expect(events[0].cardId).toBe('don1');
    });
  });
});
