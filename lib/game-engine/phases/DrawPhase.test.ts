/**
 * DrawPhase.test.ts
 * 
 * Tests for the Draw Phase implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runDrawPhase } from './DrawPhase';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardState,
  CardCategory,
  CardDefinition,
  CardInstance,
} from '../core/types';

describe('DrawPhase', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;
  let stateManager: GameStateManager;

  beforeEach(() => {
    rules = new RulesContext();
    eventEmitter = new EventEmitter();

    // Create initial state with some cards in deck
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Add cards to both players' decks
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
    const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

    if (player1 && player2) {
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

  describe('runDrawPhase', () => {
    it('should skip draw on first turn for player 1', () => {
      // Turn 1, Player 1 is active
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const initialHandSize = player1?.zones.hand.length || 0;
      const initialDeckSize = player1?.zones.deck.length || 0;

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const finalHandSize = updatedPlayer1?.zones.hand.length || 0;
      const finalDeckSize = updatedPlayer1?.zones.deck.length || 0;

      // Should not draw on first turn
      expect(finalHandSize).toBe(initialHandSize);
      expect(finalDeckSize).toBe(initialDeckSize);
    });

    it('should draw card for player 2 on their first turn', () => {
      // Set active player to player 2
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_2);

      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);
      const initialHandSize = player2?.zones.hand.length || 0;
      const initialDeckSize = player2?.zones.deck.length || 0;

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      const updatedPlayer2 = stateManager.getPlayer(PlayerId.PLAYER_2);
      const finalHandSize = updatedPlayer2?.zones.hand.length || 0;
      const finalDeckSize = updatedPlayer2?.zones.deck.length || 0;

      // Should draw 1 card
      expect(finalHandSize).toBe(initialHandSize + 1);
      expect(finalDeckSize).toBe(initialDeckSize - 1);
    });

    it('should draw card on subsequent turns', () => {
      // Set to turn 2
      stateManager = stateManager.incrementTurn();

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const initialHandSize = player1?.zones.hand.length || 0;
      const initialDeckSize = player1?.zones.deck.length || 0;

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const finalHandSize = updatedPlayer1?.zones.hand.length || 0;
      const finalDeckSize = updatedPlayer1?.zones.deck.length || 0;

      // Should draw 1 card
      expect(finalHandSize).toBe(initialHandSize + 1);
      expect(finalDeckSize).toBe(initialDeckSize - 1);
    });

    it('should emit CARD_MOVED event when drawing', () => {
      // Set to turn 2 so draw happens
      stateManager = stateManager.incrementTurn();

      const cardMovedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(1);
      expect(cardMovedEvents[0].fromZone).toBe(ZoneId.DECK);
      expect(cardMovedEvents[0].toZone).toBe(ZoneId.HAND);
      expect(cardMovedEvents[0].playerId).toBe(PlayerId.PLAYER_1);
    });

    it('should move top card from deck to hand', () => {
      // Set to turn 2 so draw happens
      stateManager = stateManager.incrementTurn();

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const topCardId = player1?.zones.deck[0]?.id;

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const handCardIds = updatedPlayer1?.zones.hand.map(c => c.id) || [];

      // Top card should now be in hand
      expect(handCardIds).toContain(topCardId);
    });

    it('should trigger game over when deck is empty', () => {
      // Empty player 1's deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player1) {
        player1.zones.deck = [];
      }
      stateManager = new GameStateManager(stateManager.getState());

      // Set to turn 2 so draw happens
      stateManager = stateManager.incrementTurn();

      const gameOverEvents: any[] = [];
      eventEmitter.on(GameEventType.GAME_OVER, (event) => {
        gameOverEvents.push(event);
      });

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      // Game should be over
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_2);
      expect(gameOverEvents).toHaveLength(1);
      expect(gameOverEvents[0].reason).toBe('DECK_OUT');
    });

    it('should not draw or trigger game over on first turn with empty deck', () => {
      // Empty player 1's deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player1) {
        player1.zones.deck = [];
      }
      stateManager = new GameStateManager(stateManager.getState());

      // Turn 1, should skip draw
      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      // Game should not be over (draw was skipped)
      expect(stateManager.isGameOver()).toBe(false);
    });

    it('should only affect active player, not opponent', () => {
      // Set to turn 2 so draw happens
      stateManager = stateManager.incrementTurn();

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);
      const p1InitialHandSize = player1?.zones.hand.length || 0;
      const p1InitialDeckSize = player1?.zones.deck.length || 0;
      const p2InitialHandSize = player2?.zones.hand.length || 0;
      const p2InitialDeckSize = player2?.zones.deck.length || 0;

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const updatedPlayer2 = stateManager.getPlayer(PlayerId.PLAYER_2);

      // Player 1 (active) should draw
      expect(updatedPlayer1?.zones.hand.length).toBe(p1InitialHandSize + 1);
      expect(updatedPlayer1?.zones.deck.length).toBe(p1InitialDeckSize - 1);

      // Player 2 (non-active) should not be affected
      expect(updatedPlayer2?.zones.hand.length).toBe(p2InitialHandSize);
      expect(updatedPlayer2?.zones.deck.length).toBe(p2InitialDeckSize);
    });

    it('should emit CARD_MOVED event with correct properties', () => {
      // Set to turn 2 so draw happens
      stateManager = stateManager.incrementTurn();

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const topCardId = player1?.zones.deck[0]?.id;
      const initialHandSize = player1?.zones.hand.length || 0;

      const cardMovedEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(1);
      const event = cardMovedEvents[0];
      expect(event.type).toBe(GameEventType.CARD_MOVED);
      expect(event.cardId).toBe(topCardId);
      expect(event.playerId).toBe(PlayerId.PLAYER_1);
      expect(event.fromZone).toBe(ZoneId.DECK);
      expect(event.toZone).toBe(ZoneId.HAND);
      expect(event.fromIndex).toBe(0);
      expect(event.toIndex).toBe(initialHandSize);
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should emit GAME_OVER event with correct properties when deck is empty', () => {
      // Empty player 1's deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player1) {
        player1.zones.deck = [];
      }
      stateManager = new GameStateManager(stateManager.getState());

      // Set to turn 2 so draw happens
      stateManager = stateManager.incrementTurn();

      const gameOverEvents: any[] = [];
      eventEmitter.on(GameEventType.GAME_OVER, (event) => {
        gameOverEvents.push(event);
      });

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      expect(gameOverEvents).toHaveLength(1);
      const event = gameOverEvents[0];
      expect(event.type).toBe(GameEventType.GAME_OVER);
      expect(event.winner).toBe(PlayerId.PLAYER_2);
      expect(event.reason).toBe('DECK_OUT');
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should handle player 2 deck out correctly', () => {
      // Set active player to player 2 and empty their deck
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_2);
      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);
      if (player2) {
        player2.zones.deck = [];
      }
      stateManager = new GameStateManager(stateManager.getState());

      const gameOverEvents: any[] = [];
      eventEmitter.on(GameEventType.GAME_OVER, (event) => {
        gameOverEvents.push(event);
      });

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      // Player 1 should win
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_1);
      expect(gameOverEvents).toHaveLength(1);
      expect(gameOverEvents[0].winner).toBe(PlayerId.PLAYER_1);
    });

    it('should not emit events when draw is skipped on first turn', () => {
      const cardMovedEvents: any[] = [];
      const gameOverEvents: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        cardMovedEvents.push(event);
      });
      eventEmitter.on(GameEventType.GAME_OVER, (event) => {
        gameOverEvents.push(event);
      });

      // Turn 1, Player 1 - should skip draw
      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      expect(cardMovedEvents).toHaveLength(0);
      expect(gameOverEvents).toHaveLength(0);
    });

    it('should handle multiple turns correctly', () => {
      // Turn 2 - Player 1 draws
      stateManager = stateManager.incrementTurn();
      const p1BeforeDraw = stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.hand.length || 0;
      stateManager = runDrawPhase(stateManager, rules, eventEmitter);
      const p1AfterDraw = stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.hand.length || 0;
      expect(p1AfterDraw).toBe(p1BeforeDraw + 1);

      // Turn 3 - Player 2 draws
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_2);
      const p2BeforeDraw = stateManager.getPlayer(PlayerId.PLAYER_2)?.zones.hand.length || 0;
      stateManager = runDrawPhase(stateManager, rules, eventEmitter);
      const p2AfterDraw = stateManager.getPlayer(PlayerId.PLAYER_2)?.zones.hand.length || 0;
      expect(p2AfterDraw).toBe(p2BeforeDraw + 1);

      // Turn 4 - Player 1 draws again
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);
      const p1BeforeDraw2 = stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.hand.length || 0;
      stateManager = runDrawPhase(stateManager, rules, eventEmitter);
      const p1AfterDraw2 = stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.hand.length || 0;
      expect(p1AfterDraw2).toBe(p1BeforeDraw2 + 1);
    });

    it('should draw exactly one card per turn', () => {
      // Set to turn 2
      stateManager = stateManager.incrementTurn();

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const initialHandSize = player1?.zones.hand.length || 0;
      const initialDeckSize = player1?.zones.deck.length || 0;

      stateManager = runDrawPhase(stateManager, rules, eventEmitter);

      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const finalHandSize = updatedPlayer1?.zones.hand.length || 0;
      const finalDeckSize = updatedPlayer1?.zones.deck.length || 0;

      // Should draw exactly 1 card, not more
      expect(finalHandSize).toBe(initialHandSize + 1);
      expect(finalDeckSize).toBe(initialDeckSize - 1);
    });
  });
});
