/**
 * DefeatChecker.test.ts
 * 
 * Tests for defeat condition checking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  runDefeatCheck,
  applyDefeatCheck,
  markPlayerDefeated,
  shouldDefeatForZeroLife,
} from './DefeatChecker';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { PlayerId, CardCategory, CardState, ZoneId } from '../core/types';

describe('DefeatChecker', () => {
  let stateManager: GameStateManager;

  beforeEach(() => {
    stateManager = new GameStateManager(createInitialGameState());
  });

  describe('runDefeatCheck', () => {
    it('should return no defeat when game is in progress', () => {
      // Give both players cards in their decks so they're not decked out
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      
      player1.zones.deck = [
        {
          id: 'card1',
          definition: {
            id: 'def1',
            name: 'Test Card',
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
          },
          owner: PlayerId.PLAYER_1,
          controller: PlayerId.PLAYER_1,
          zone: ZoneId.DECK,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        },
      ];
      
      player2.zones.deck = [
        {
          id: 'card2',
          definition: {
            id: 'def2',
            name: 'Test Card 2',
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
            metadata: {
              setCode: 'OP01',
              cardNumber: '002',
              isAltArt: false,
              isPromo: false,
            },
          },
          owner: PlayerId.PLAYER_2,
          controller: PlayerId.PLAYER_2,
          zone: ZoneId.DECK,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        },
      ];
      
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player1);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, player2);
      
      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(false);
      expect(result.winner).toBeNull();
      expect(result.reason).toBeNull();
    });

    it('should detect when player 1 has defeated flag set', () => {
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_1);
      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_2);
      expect(result.reason).toBe('Player 1 defeated');
    });

    it('should detect when player 2 has defeated flag set', () => {
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_2);
      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_1);
      expect(result.reason).toBe('Player 2 defeated');
    });

    it('should return draw when both players have defeated flag set', () => {
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_1);
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_2);
      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.reason).toBe('Both players defeated');
    });

    it('should detect when player 1 deck is empty', () => {
      // Player 2 has cards in deck, player 1 does not
      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      player2.zones.deck = [
        {
          id: 'card1',
          definition: {
            id: 'def1',
            name: 'Test Card',
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
          },
          owner: PlayerId.PLAYER_2,
          controller: PlayerId.PLAYER_2,
          zone: ZoneId.DECK,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        },
      ];

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, player2);

      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_2);
      expect(result.reason).toBe('Player 1 decked out');
    });

    it('should detect when player 2 deck is empty', () => {
      // Player 1 has cards in deck, player 2 does not
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.deck = [
        {
          id: 'card1',
          definition: {
            id: 'def1',
            name: 'Test Card',
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
          },
          owner: PlayerId.PLAYER_1,
          controller: PlayerId.PLAYER_1,
          zone: ZoneId.DECK,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        },
      ];

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player1);

      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_1);
      expect(result.reason).toBe('Player 2 decked out');
    });

    it('should return draw when both players decks are empty', () => {
      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.reason).toBe('Both players decked out');
    });

    it('should prioritize defeated flag over empty deck', () => {
      // Mark player 1 as defeated
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_1);

      // Both decks are empty (initial state)
      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_2);
      expect(result.reason).toBe('Player 1 defeated');
    });

    it('should return current state if game is already over', () => {
      stateManager = stateManager.setGameOver(PlayerId.PLAYER_1);
      const result = runDefeatCheck(stateManager);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_1);
      expect(result.reason).toBe('Game already over');
    });
  });

  describe('applyDefeatCheck', () => {
    it('should update game state when defeat check indicates game over', () => {
      const result = {
        gameOver: true,
        winner: PlayerId.PLAYER_1,
        reason: 'Test defeat',
      };

      stateManager = applyDefeatCheck(stateManager, result);

      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_1);
    });

    it('should not update game state when defeat check indicates no defeat', () => {
      const result = {
        gameOver: false,
        winner: null,
        reason: null,
      };

      const originalState = stateManager.getState();
      stateManager = applyDefeatCheck(stateManager, result);

      expect(stateManager.isGameOver()).toBe(false);
      expect(stateManager.getWinner()).toBeNull();
      expect(stateManager.getState()).toEqual(originalState);
    });

    it('should not update game state if already game over', () => {
      stateManager = stateManager.setGameOver(PlayerId.PLAYER_2);

      const result = {
        gameOver: true,
        winner: PlayerId.PLAYER_1,
        reason: 'Test defeat',
      };

      stateManager = applyDefeatCheck(stateManager, result);

      // Should keep original winner
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_2);
    });

    it('should handle draw scenario', () => {
      const result = {
        gameOver: true,
        winner: null,
        reason: 'Draw',
      };

      stateManager = applyDefeatCheck(stateManager, result);

      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBeNull();
    });
  });

  describe('markPlayerDefeated', () => {
    it('should set defeated flag for player 1', () => {
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_1);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      expect(player1?.flags.get('defeated')).toBe(true);
    });

    it('should set defeated flag for player 2', () => {
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_2);

      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);
      expect(player2?.flags.get('defeated')).toBe(true);
    });

    it('should not affect other player flags', () => {
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.flags.set('testFlag', 'testValue');
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player1);

      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_1);

      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      expect(updatedPlayer1?.flags.get('testFlag')).toBe('testValue');
      expect(updatedPlayer1?.flags.get('defeated')).toBe(true);
    });

    it('should return unchanged state if player not found', () => {
      const originalState = stateManager.getState();
      
      // Try to mark a non-existent player (this shouldn't happen in practice)
      const newStateManager = markPlayerDefeated(stateManager, 'INVALID_PLAYER' as PlayerId);

      expect(newStateManager.getState()).toEqual(originalState);
    });
  });

  describe('shouldDefeatForZeroLife', () => {
    it('should return true when player has zero life cards', () => {
      const result = shouldDefeatForZeroLife(stateManager, PlayerId.PLAYER_1);
      expect(result).toBe(true);
    });

    it('should return false when player has life cards', () => {
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.life = [
        {
          id: 'life1',
          definition: {
            id: 'def1',
            name: 'Life Card',
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
          },
          owner: PlayerId.PLAYER_1,
          controller: PlayerId.PLAYER_1,
          zone: ZoneId.LIFE,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        },
      ];

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player1);

      const result = shouldDefeatForZeroLife(stateManager, PlayerId.PLAYER_1);
      expect(result).toBe(false);
    });

    it('should return false if player not found', () => {
      const result = shouldDefeatForZeroLife(stateManager, 'INVALID_PLAYER' as PlayerId);
      expect(result).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete defeat flow with defeated flag', () => {
      // Mark player defeated
      stateManager = markPlayerDefeated(stateManager, PlayerId.PLAYER_1);

      // Run defeat check
      const result = runDefeatCheck(stateManager);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_2);

      // Apply defeat check
      stateManager = applyDefeatCheck(stateManager, result);
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_2);
    });

    it('should handle complete defeat flow with empty deck', () => {
      // Give player 2 a card so only player 1 is decked out
      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      player2.zones.deck = [
        {
          id: 'card1',
          definition: {
            id: 'def1',
            name: 'Test Card',
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
          },
          owner: PlayerId.PLAYER_2,
          controller: PlayerId.PLAYER_2,
          zone: ZoneId.DECK,
          state: CardState.NONE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        },
      ];
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, player2);

      // Run defeat check
      const result = runDefeatCheck(stateManager);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe(PlayerId.PLAYER_2);

      // Apply defeat check
      stateManager = applyDefeatCheck(stateManager, result);
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_2);
    });
  });
});
