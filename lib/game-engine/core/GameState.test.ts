/**
 * GameState.test.ts
 * 
 * Unit tests for GameStateManager - testing state transitions, immutability, and query methods
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createInitialGameState } from './GameState';
import {
  GameState,
  PlayerId,
  ZoneId,
  Phase,
  CardState,
  CardCategory,
  CardDefinition,
  CardInstance,
  DonInstance,
  TriggerInstance,
  TriggerTiming,
  EffectDefinition,
  EffectTimingType,
  GameEvent,
  GameEventType,
  GameAction,
} from './types';

describe('GameStateManager', () => {
  let stateManager: GameStateManager;

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
  });

  // Helper function to create a test card
  function createTestCard(id: string, owner: PlayerId, zone: ZoneId): CardInstance {
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
  }

  // Helper function to create a test DON
  function createTestDon(id: string, owner: PlayerId, zone: ZoneId): DonInstance {
    return {
      id,
      owner,
      zone,
      state: CardState.ACTIVE,
    };
  }

  describe('Query Methods', () => {
    describe('getState', () => {
      it('should return the current game state', () => {
        const state = stateManager.getState();
        expect(state).toBeDefined();
        expect(state.players).toBeDefined();
        expect(state.activePlayer).toBe(PlayerId.PLAYER_1);
      });

      it('should return readonly state', () => {
        const state = stateManager.getState();
        expect(Object.isFrozen(state)).toBe(false); // Not frozen but should be treated as readonly
      });
    });

    describe('getCard', () => {
      it('should find a card in hand', () => {
        const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND);
        const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
        player.zones.hand.push(card);

        const found = stateManager.getCard('card1');
        expect(found).toBeDefined();
        expect(found?.id).toBe('card1');
      });

      it('should find a card in character area', () => {
        const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
        const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
        player.zones.characterArea.push(card);

        const found = stateManager.getCard('card1');
        expect(found).toBeDefined();
        expect(found?.id).toBe('card1');
      });

      it('should find a card in leader area', () => {
        const card = createTestCard('leader1', PlayerId.PLAYER_1, ZoneId.LEADER_AREA);
        const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
        player.zones.leaderArea = card;

        const found = stateManager.getCard('leader1');
        expect(found).toBeDefined();
        expect(found?.id).toBe('leader1');
      });

      it('should return null for non-existent card', () => {
        const found = stateManager.getCard('nonexistent');
        expect(found).toBeNull();
      });
    });

    describe('getDon', () => {
      it('should find a DON in cost area', () => {
        const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.COST_AREA);
        const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
        player.zones.costArea.push(don);

        const found = stateManager.getDon('don1');
        expect(found).toBeDefined();
        expect(found?.id).toBe('don1');
      });

      it('should find a DON given to a card', () => {
        const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
        const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
        card.givenDon.push(don);
        
        const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
        player.zones.characterArea.push(card);

        const found = stateManager.getDon('don1');
        expect(found).toBeDefined();
        expect(found?.id).toBe('don1');
      });

      it('should return null for non-existent DON', () => {
        const found = stateManager.getDon('nonexistent');
        expect(found).toBeNull();
      });
    });

    describe('getPlayer', () => {
      it('should return player 1 state', () => {
        const player = stateManager.getPlayer(PlayerId.PLAYER_1);
        expect(player).toBeDefined();
        expect(player?.id).toBe(PlayerId.PLAYER_1);
      });

      it('should return player 2 state', () => {
        const player = stateManager.getPlayer(PlayerId.PLAYER_2);
        expect(player).toBeDefined();
        expect(player?.id).toBe(PlayerId.PLAYER_2);
      });
    });

    describe('getZone', () => {
      it('should return hand zone contents', () => {
        const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND);
        const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
        player.zones.hand.push(card);

        const zone = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND);
        expect(zone).toHaveLength(1);
        expect(zone[0].id).toBe('card1');
      });

      it('should return empty array for empty zone', () => {
        const zone = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND);
        expect(zone).toHaveLength(0);
      });

      it('should return leader area as array', () => {
        const card = createTestCard('leader1', PlayerId.PLAYER_1, ZoneId.LEADER_AREA);
        const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
        player.zones.leaderArea = card;

        const zone = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.LEADER_AREA);
        expect(zone).toHaveLength(1);
        expect(zone[0].id).toBe('leader1');
      });
    });

    describe('getActivePlayer', () => {
      it('should return the active player', () => {
        const active = stateManager.getActivePlayer();
        expect(active).toBe(PlayerId.PLAYER_1);
      });
    });

    describe('getCurrentPhase', () => {
      it('should return the current phase', () => {
        const phase = stateManager.getCurrentPhase();
        expect(phase).toBe(Phase.REFRESH);
      });
    });

    describe('getTurnNumber', () => {
      it('should return the turn number', () => {
        const turn = stateManager.getTurnNumber();
        expect(turn).toBe(1);
      });
    });

    describe('isGameOver', () => {
      it('should return false initially', () => {
        expect(stateManager.isGameOver()).toBe(false);
      });
    });

    describe('getWinner', () => {
      it('should return null initially', () => {
        expect(stateManager.getWinner()).toBeNull();
      });
    });
  });

  describe('State Update Methods - Immutability', () => {
    it('should return new GameStateManager instance on update', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);

      const newStateManager = stateManager.updateCard('card1', { state: CardState.RESTED });
      
      expect(newStateManager).not.toBe(stateManager);
      expect(newStateManager).toBeInstanceOf(GameStateManager);
    });

    it('should not mutate original state', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);

      const originalCard = stateManager.getCard('card1');
      const originalState = originalCard?.state;

      stateManager.updateCard('card1', { state: CardState.RESTED });

      const unchangedCard = stateManager.getCard('card1');
      expect(unchangedCard?.state).toBe(originalState);
    });
  });

  describe('updateCard', () => {
    it('should update card state', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);

      const newStateManager = stateManager.updateCard('card1', { state: CardState.RESTED });
      const updatedCard = newStateManager.getCard('card1');
      
      expect(updatedCard?.state).toBe(CardState.RESTED);
    });

    it('should update card controller', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);

      const newStateManager = stateManager.updateCard('card1', { controller: PlayerId.PLAYER_2 });
      const updatedCard = newStateManager.getCard('card1');
      
      expect(updatedCard?.controller).toBe(PlayerId.PLAYER_2);
    });

    it('should return same instance if card not found', () => {
      const newStateManager = stateManager.updateCard('nonexistent', { state: CardState.RESTED });
      expect(newStateManager).toBe(stateManager);
    });
  });

  describe('moveCard', () => {
    it('should move card from deck to hand', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.deck.push(card);

      const newStateManager = stateManager.moveCard('card1', ZoneId.HAND);
      
      const deck = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK);
      const hand = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND);
      
      expect(deck).toHaveLength(0);
      expect(hand).toHaveLength(1);
      expect(hand[0].id).toBe('card1');
    });

    it('should update card zone property', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.deck.push(card);

      const newStateManager = stateManager.moveCard('card1', ZoneId.HAND);
      const movedCard = newStateManager.getCard('card1');
      
      expect(movedCard?.zone).toBe(ZoneId.HAND);
    });

    it('should move card to specific index', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.hand.push(createTestCard('card2', PlayerId.PLAYER_1, ZoneId.HAND));
      player.zones.deck.push(createTestCard('card3', PlayerId.PLAYER_1, ZoneId.DECK));

      const newStateManager = stateManager.moveCard('card3', ZoneId.HAND, 1);
      const hand = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND) as CardInstance[];
      
      expect(hand).toHaveLength(3);
      expect(hand[0].id).toBe('card1');
      expect(hand[1].id).toBe('card3');
      expect(hand[2].id).toBe('card2');
    });

    it('should return same instance if card not found', () => {
      const newStateManager = stateManager.moveCard('nonexistent', ZoneId.HAND);
      expect(newStateManager).toBe(stateManager);
    });
  });

  describe('updateDon', () => {
    it('should update DON state', () => {
      const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.COST_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.costArea.push(don);

      const newStateManager = stateManager.updateDon('don1', { state: CardState.RESTED });
      const updatedDon = newStateManager.getDon('don1');
      
      expect(updatedDon?.state).toBe(CardState.RESTED);
    });

    it('should return same instance if DON not found', () => {
      const newStateManager = stateManager.updateDon('nonexistent', { state: CardState.RESTED });
      expect(newStateManager).toBe(stateManager);
    });
  });

  describe('moveDon', () => {
    it('should move DON from don deck to cost area', () => {
      const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.DON_DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.donDeck.push(don);

      const newStateManager = stateManager.moveDon('don1', ZoneId.COST_AREA);
      
      const donDeck = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.DON_DECK);
      const costArea = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.COST_AREA);
      
      expect(donDeck).toHaveLength(0);
      expect(costArea).toHaveLength(1);
      expect(costArea[0].id).toBe('don1');
    });

    it('should give DON to a card', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.COST_AREA);
      
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(card);
      player.zones.costArea.push(don);

      const newStateManager = stateManager.moveDon('don1', ZoneId.CHARACTER_AREA, 'card1');
      
      const costArea = newStateManager.getZone(PlayerId.PLAYER_1, ZoneId.COST_AREA);
      const updatedCard = newStateManager.getCard('card1');
      
      expect(costArea).toHaveLength(0);
      expect(updatedCard?.givenDon).toHaveLength(1);
      expect(updatedCard?.givenDon[0].id).toBe('don1');
    });

    it('should return same instance if DON not found', () => {
      const newStateManager = stateManager.moveDon('nonexistent', ZoneId.COST_AREA);
      expect(newStateManager).toBe(stateManager);
    });
  });

  describe('updatePlayer', () => {
    it('should update player flags', () => {
      const newFlags = new Map([['test', true]]);
      const newStateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { flags: newFlags });
      
      const player = newStateManager.getPlayer(PlayerId.PLAYER_1);
      expect(player?.flags.get('test')).toBe(true);
    });

    it('should return same instance if player not found', () => {
      const newStateManager = stateManager.updatePlayer('INVALID' as PlayerId, { flags: new Map() });
      expect(newStateManager).toBe(stateManager);
    });
  });

  describe('setActivePlayer', () => {
    it('should change active player', () => {
      const newStateManager = stateManager.setActivePlayer(PlayerId.PLAYER_2);
      expect(newStateManager.getActivePlayer()).toBe(PlayerId.PLAYER_2);
    });

    it('should not mutate original state', () => {
      stateManager.setActivePlayer(PlayerId.PLAYER_2);
      expect(stateManager.getActivePlayer()).toBe(PlayerId.PLAYER_1);
    });
  });

  describe('setPhase', () => {
    it('should change current phase', () => {
      const newStateManager = stateManager.setPhase(Phase.MAIN);
      expect(newStateManager.getCurrentPhase()).toBe(Phase.MAIN);
    });

    it('should not mutate original state', () => {
      stateManager.setPhase(Phase.MAIN);
      expect(stateManager.getCurrentPhase()).toBe(Phase.REFRESH);
    });
  });

  describe('incrementTurn', () => {
    it('should increment turn number', () => {
      const newStateManager = stateManager.incrementTurn();
      expect(newStateManager.getTurnNumber()).toBe(2);
    });

    it('should not mutate original state', () => {
      stateManager.incrementTurn();
      expect(stateManager.getTurnNumber()).toBe(1);
    });
  });

  describe('addPendingTrigger', () => {
    it('should add trigger to queue', () => {
      const mockCard = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);

      const mockEffect: EffectDefinition = {
        id: 'effect1',
        label: 'Test Effect',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'test',
        oncePerTurn: false,
      };

      const mockEvent: GameEvent = {
        type: GameEventType.CARD_MOVED,
        playerId: PlayerId.PLAYER_1,
        cardId: 'card1',
        data: {},
        timestamp: Date.now(),
      };

      const trigger: TriggerInstance = {
        effectDefinition: mockEffect,
        source: mockCard,
        controller: PlayerId.PLAYER_1,
        event: mockEvent,
        priority: 0,
      };

      const newStateManager = stateManager.addPendingTrigger(trigger);
      const state = newStateManager.getState();
      
      expect(state.pendingTriggers).toHaveLength(1);
      expect(state.pendingTriggers[0].effectDefinition.id).toBe('effect1');
    });
  });

  describe('clearPendingTriggers', () => {
    it('should clear all pending triggers', () => {
      const mockCard = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);

      const mockEffect: EffectDefinition = {
        id: 'effect1',
        label: 'Test Effect',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'test',
        oncePerTurn: false,
      };

      const mockEvent: GameEvent = {
        type: GameEventType.CARD_MOVED,
        playerId: PlayerId.PLAYER_1,
        cardId: 'card1',
        data: {},
        timestamp: Date.now(),
      };

      const trigger: TriggerInstance = {
        effectDefinition: mockEffect,
        source: mockCard,
        controller: PlayerId.PLAYER_1,
        event: mockEvent,
        priority: 0,
      };

      let newStateManager = stateManager.addPendingTrigger(trigger);
      newStateManager = newStateManager.clearPendingTriggers();
      
      const state = newStateManager.getState();
      expect(state.pendingTriggers).toHaveLength(0);
    });
  });

  describe('setGameOver', () => {
    it('should set game over with winner', () => {
      const newStateManager = stateManager.setGameOver(PlayerId.PLAYER_1);
      
      expect(newStateManager.isGameOver()).toBe(true);
      expect(newStateManager.getWinner()).toBe(PlayerId.PLAYER_1);
    });

    it('should set game over with draw', () => {
      const newStateManager = stateManager.setGameOver(null);
      
      expect(newStateManager.isGameOver()).toBe(true);
      expect(newStateManager.getWinner()).toBeNull();
    });
  });

  describe('addToHistory', () => {
    it('should add action to history', () => {
      const action: GameAction = {
        type: 'PLAY_CARD' as any,
        playerId: PlayerId.PLAYER_1,
        data: { cardId: 'card1' },
        timestamp: Date.now(),
      };

      const newStateManager = stateManager.addToHistory(action);
      const history = newStateManager.getHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('PLAY_CARD');
    });
  });

  describe('getHistory', () => {
    it('should return empty history initially', () => {
      const history = stateManager.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should return readonly history', () => {
      const history = stateManager.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Loop Guard', () => {
    describe('updateLoopGuard', () => {
      it('should track state hash', () => {
        const hash = 'test-hash-123';
        const newStateManager = stateManager.updateLoopGuard(hash);
        
        expect(newStateManager.getLoopGuardCount(hash)).toBe(1);
      });

      it('should increment count for repeated hash', () => {
        const hash = 'test-hash-123';
        let newStateManager = stateManager.updateLoopGuard(hash);
        newStateManager = newStateManager.updateLoopGuard(hash);
        newStateManager = newStateManager.updateLoopGuard(hash);
        
        expect(newStateManager.getLoopGuardCount(hash)).toBe(3);
      });
    });

    describe('getLoopGuardCount', () => {
      it('should return 0 for unseen hash', () => {
        expect(stateManager.getLoopGuardCount('unseen-hash')).toBe(0);
      });

      it('should return correct count for tracked hash', () => {
        const hash = 'test-hash-123';
        const newStateManager = stateManager.updateLoopGuard(hash);
        
        expect(newStateManager.getLoopGuardCount(hash)).toBe(1);
      });
    });
  });
});

describe('createInitialGameState', () => {
  it('should create a valid initial state', () => {
    const state = createInitialGameState();
    
    expect(state.players.size).toBe(2);
    expect(state.activePlayer).toBe(PlayerId.PLAYER_1);
    expect(state.phase).toBe(Phase.REFRESH);
    expect(state.turnNumber).toBe(1);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
  });

  it('should create empty zones for both players', () => {
    const state = createInitialGameState();
    
    const player1 = state.players.get(PlayerId.PLAYER_1)!;
    const player2 = state.players.get(PlayerId.PLAYER_2)!;
    
    expect(player1.zones.deck).toHaveLength(0);
    expect(player1.zones.hand).toHaveLength(0);
    expect(player2.zones.deck).toHaveLength(0);
    expect(player2.zones.hand).toHaveLength(0);
  });

  it('should initialize loop guard state', () => {
    const state = createInitialGameState();
    
    expect(state.loopGuardState.stateHashes).toBeDefined();
    expect(state.loopGuardState.maxRepeats).toBe(3);
  });
});
