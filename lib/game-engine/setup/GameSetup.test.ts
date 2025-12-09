/**
 * GameSetup.test.ts
 * 
 * Tests for the game setup system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame, validateDeck, GameSetupConfig, GameSetupError } from './GameSetup';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  CardDefinition,
  CardCategory,
  PlayerId,
  ZoneId,
  TriggerTiming,
  EffectTimingType,
} from '../core/types';

describe('GameSetup', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    rules = new RulesContext();
    eventEmitter = new EventEmitter();
  });

  // Helper to create a test leader card
  function createLeader(lifeValue: number): CardDefinition {
    return {
      id: 'leader-001',
      name: 'Test Leader',
      category: CardCategory.LEADER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: null,
      lifeValue,
      counterValue: null,
      rarity: 'L',
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
  }

  // Helper to create a test character card
  function createCharacter(id: string, name: string): CardDefinition {
    return {
      id,
      name,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 4000,
      baseCost: 3,
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
    };
  }

  // Helper to create a DON card
  function createDon(id: string): CardDefinition {
    return {
      id,
      name: 'DON!!',
      category: CardCategory.DON,
      colors: [],
      typeTags: [],
      attributes: [],
      basePower: null,
      baseCost: null,
      lifeValue: null,
      counterValue: null,
      rarity: 'DON',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'DON',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };
  }

  // Helper to create a valid deck
  function createValidDeck(): CardDefinition[] {
    const deck: CardDefinition[] = [];
    
    // Add leader
    deck.push(createLeader(5));
    
    // Add 50 character cards
    for (let i = 0; i < 50; i++) {
      deck.push(createCharacter(`char-${i}`, `Character ${i}`));
    }
    
    // Add 10 DON cards
    for (let i = 0; i < 10; i++) {
      deck.push(createDon(`don-${i}`));
    }
    
    return deck;
  }

  describe('validateDeck', () => {
    it('should validate a correct deck', () => {
      const deck = createValidDeck();
      const result = validateDeck(deck, rules);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject deck with no leader', () => {
      const deck = createValidDeck().filter(c => c.category !== CardCategory.LEADER);
      const result = validateDeck(deck, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deck must have exactly 1 leader (found 0)');
    });

    it('should reject deck with multiple leaders', () => {
      const deck = createValidDeck();
      deck.push(createLeader(4));
      const result = validateDeck(deck, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deck must have exactly 1 leader (found 2)');
    });

    it('should reject deck with wrong number of DON cards', () => {
      const deck = createValidDeck().filter(c => c.category !== CardCategory.DON);
      // Add only 5 DON cards instead of 10
      for (let i = 0; i < 5; i++) {
        deck.push(createDon(`don-${i}`));
      }
      const result = validateDeck(deck, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DON cards'))).toBe(true);
    });

    it('should reject deck with wrong main deck size', () => {
      const deck: CardDefinition[] = [];
      deck.push(createLeader(5));
      
      // Add only 40 cards instead of 50
      for (let i = 0; i < 40; i++) {
        deck.push(createCharacter(`char-${i}`, `Character ${i}`));
      }
      
      for (let i = 0; i < 10; i++) {
        deck.push(createDon(`don-${i}`));
      }
      
      const result = validateDeck(deck, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Main deck'))).toBe(true);
    });

    it('should reject leader without life value', () => {
      const deck = createValidDeck();
      const leaderIndex = deck.findIndex(c => c.category === CardCategory.LEADER);
      deck[leaderIndex] = { ...deck[leaderIndex], lifeValue: null };
      
      const result = validateDeck(deck, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Leader card must have a life value');
    });
  });

  describe('setupGame', () => {
    it('should setup a game with valid decks', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      
      expect(result.stateManager).toBeDefined();
      expect(result.zoneManager).toBeDefined();
      expect(result.firstPlayer).toBe(PlayerId.PLAYER_1);
    });

    it('should throw error for invalid deck', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck().slice(0, 30); // Invalid deck
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
      };
      
      expect(() => setupGame(config, rules, eventEmitter)).toThrow(GameSetupError);
    });

    it('should place leaders in leader area', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      const state = result.stateManager.getState();
      
      const player1 = state.players.get(PlayerId.PLAYER_1);
      const player2 = state.players.get(PlayerId.PLAYER_2);
      
      expect(player1?.zones.leaderArea).toBeDefined();
      expect(player1?.zones.leaderArea?.definition.category).toBe(CardCategory.LEADER);
      expect(player2?.zones.leaderArea).toBeDefined();
      expect(player2?.zones.leaderArea?.definition.category).toBe(CardCategory.LEADER);
    });

    it('should place DON cards in DON deck', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      const state = result.stateManager.getState();
      
      const player1 = state.players.get(PlayerId.PLAYER_1);
      const player2 = state.players.get(PlayerId.PLAYER_2);
      
      expect(player1?.zones.donDeck).toHaveLength(10);
      expect(player2?.zones.donDeck).toHaveLength(10);
    });

    it('should draw 5 cards for each player', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      const state = result.stateManager.getState();
      
      const player1 = state.players.get(PlayerId.PLAYER_1);
      const player2 = state.players.get(PlayerId.PLAYER_2);
      
      expect(player1?.zones.hand).toHaveLength(5);
      expect(player2?.zones.hand).toHaveLength(5);
    });

    it('should place life cards based on leader life value', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      const state = result.stateManager.getState();
      
      const player1 = state.players.get(PlayerId.PLAYER_1);
      const player2 = state.players.get(PlayerId.PLAYER_2);
      
      // Leaders have 5 life
      expect(player1?.zones.life).toHaveLength(5);
      expect(player2?.zones.life).toHaveLength(5);
    });

    it('should handle mulligan for player 1', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        player1Mulligan: true,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      const state = result.stateManager.getState();
      
      const player1 = state.players.get(PlayerId.PLAYER_1);
      
      // Should still have 5 cards after mulligan
      expect(player1?.zones.hand).toHaveLength(5);
    });

    it('should set the first player correctly', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_2,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      
      expect(result.firstPlayer).toBe(PlayerId.PLAYER_2);
      expect(result.stateManager.getActivePlayer()).toBe(PlayerId.PLAYER_2);
    });

    it('should randomly select first player when not specified', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      
      expect([PlayerId.PLAYER_1, PlayerId.PLAYER_2]).toContain(result.firstPlayer);
    });

    it('should mark leaders with START_OF_GAME effects', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      // Add START_OF_GAME effect to leader
      const leaderIndex = deck1.findIndex(c => c.category === CardCategory.LEADER);
      deck1[leaderIndex] = {
        ...deck1[leaderIndex],
        effects: [
          {
            id: 'start-effect',
            label: '[Start of Game]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.START_OF_GAME,
            condition: null,
            cost: null,
            scriptId: 'draw-one',
            oncePerTurn: false,
          },
        ],
      };
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      const state = result.stateManager.getState();
      
      const player1 = state.players.get(PlayerId.PLAYER_1);
      const leader = player1?.zones.leaderArea;
      
      expect(leader?.flags.get('hasStartOfGameEffects')).toBe(true);
    });

    it('should have correct deck size after setup', () => {
      const deck1 = createValidDeck();
      const deck2 = createValidDeck();
      
      const config: GameSetupConfig = {
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      };
      
      const result = setupGame(config, rules, eventEmitter);
      const state = result.stateManager.getState();
      
      const player1 = state.players.get(PlayerId.PLAYER_1);
      const player2 = state.players.get(PlayerId.PLAYER_2);
      
      // Started with 50 cards, drew 5, placed 5 as life = 40 remaining
      expect(player1?.zones.deck).toHaveLength(40);
      expect(player2?.zones.deck).toHaveLength(40);
    });
  });
});
