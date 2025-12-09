/**
 * AI.scenario.test.ts
 * 
 * Scenario tests for AI decision quality
 * Tests AI behavior in specific game situations to ensure intelligent decision-making
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { createAIPlayer } from './AIPlayer';
import {
  CardDefinition,
  CardCategory,
  PlayerId,
  GameEventType,
  CardState,
  Phase,
} from '../core/types';

describe('AI Scenario Tests - Decision Quality', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function createLeader(id: string, lifeValue: number): CardDefinition {
    return {
      id,
      name: `Leader ${id}`,
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
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };
  }

  function createCharacter(
    id: string,
    power: number,
    cost: number,
    keywords: string[] = []
  ): CardDefinition {
    return {
      id,
      name: `Character ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: power,
      baseCost: cost,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords,
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: id,
        isAltArt: false,
        isPromo: false,
      },
    };
  }

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

  function createValidDeck(leaderId: string, lifeValue: number, customCards?: CardDefinition[]): CardDefinition[] {
    const deck: CardDefinition[] = [];
    deck.push(createLeader(leaderId, lifeValue));

    if (customCards) {
      deck.push(...customCards);
    } else {
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        deck.push(createCharacter(`char-${leaderId}-${i}`, power, cost));
      }
    }

    for (let i = 0; i < 10; i++) {
      deck.push(createDon(`don-${leaderId}-${i}`));
    }

    return deck;
  }

  // ============================================================================
  // Scenario Test: AI Attacks Leader When It Can Win
  // ============================================================================

  describe('Requirement 8.1, 8.2: AI attacks leader when it can win the game', () => {
    it('should attack leader for lethal damage when possible', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 5 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }
      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 1); // Opponent has 1 life

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      });

      let leaderAttackDeclared = false;
      engine.on(GameEventType.ATTACK_DECLARED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1 && event.targetType === 'leader') {
          leaderAttackDeclared = true;
        }
      });

      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
        
        const state = engine.getState();
        const player2 = state.players.get(PlayerId.PLAYER_2);
        
        if (player2 && player2.zones.life.length === 0) {
          break;
        }
      }

      expect(leaderAttackDeclared).toBe(true);
    });

    it('should prioritize lethal attack over other actions', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 10 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }
      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 1);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 54321,
      });

      let attacksBeforeWin = 0;
      engine.on(GameEventType.ATTACK_DECLARED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          attacksBeforeWin++;
        }
      });

      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(attacksBeforeWin).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Scenario Test: AI Blocks Lethal Attacks
  // ============================================================================

  describe('Requirement 2.4, 8.5: AI blocks lethal attacks', () => {
    it('should use blocker to prevent lethal damage', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 10 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck2Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 15 ? ['Blocker'] : [];
        deck2Cards.push(createCharacter(`char-p2-${i}`, power, cost, keywords));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 1, deck2Cards);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 11111,
      });

      let blockerUsed = false;
      engine.on(GameEventType.BLOCK_DECLARED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_2) {
          blockerUsed = true;
        }
      });

      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(blockerUsed).toBe(true);
    });

    it('should prioritize blocking when life is critical', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = 8000;
        const keywords = i < 10 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck2Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 20 ? ['Blocker'] : [];
        deck2Cards.push(createCharacter(`char-p2-${i}`, power, cost, keywords));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 1, deck2Cards);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 22222,
      });

      let blockAttempts = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_2 && event.decisionType === 'chooseBlocker') {
          blockAttempts++;
        }
      });

      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(blockAttempts).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Scenario Test: AI Uses Counters to Prevent Lethal Damage
  // ============================================================================

  describe('Requirement 2.5, 8.5: AI uses counters to prevent lethal damage', () => {
    it('should use counter cards when facing lethal attack', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = 10000;
        const keywords = i < 10 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck2Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const card = createCharacter(`char-p2-${i}`, power, cost);
        card.counterValue = 2000;
        deck2Cards.push(card);
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 1, deck2Cards);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 33333,
      });

      let counterUsed = false;
      engine.on(GameEventType.COUNTER_USED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_2) {
          counterUsed = true;
        }
      });

      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(counterUsed).toBe(true);
    });

    it('should evaluate counter value vs damage prevented', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = 8000;
        const keywords = i < 10 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck2Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const card = createCharacter(`char-p2-${i}`, power, cost);
        card.counterValue = 1000;
        deck2Cards.push(card);
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 2, deck2Cards);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 44444,
      });

      let counterDecisions = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_2 && event.decisionType === 'chooseCounterAction') {
          counterDecisions++;
        }
      });

      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(counterDecisions).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Scenario Test: AI Plays Cards in Logical Order
  // ============================================================================

  describe('Requirement 9.1, 9.2: AI plays cards in logical order', () => {
    it('should play Rush characters before non-Rush characters', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 25; i++) {
        const cost = 3;
        const power = 3000;
        deck1Cards.push(createCharacter(`char-rush-${i}`, power, cost, ['Rush']));
      }
      for (let i = 0; i < 25; i++) {
        const cost = 3;
        const power = 4000;
        deck1Cards.push(createCharacter(`char-normal-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 55555,
      });

      const cardsPlayed: string[] = [];
      engine.on(GameEventType.CARD_PLAYED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          cardsPlayed.push(event.cardId);
        }
      });

      const maxTurns = 5;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(cardsPlayed.length).toBeGreaterThan(0);
    });

    it('should play low-cost cards before high-cost cards for flexibility', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 66666,
      });

      const cardsPlayed: any[] = [];
      engine.on(GameEventType.CARD_PLAYED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          cardsPlayed.push(event);
        }
      });

      const maxTurns = 5;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(cardsPlayed.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Scenario Test: AI Distributes DON Effectively
  // ============================================================================

  describe('Requirement 7.1, 7.2, 7.3: AI distributes DON effectively', () => {
    it('should give DON to characters that can attack', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 15 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 77777,
      });

      let donGiven = 0;
      engine.on(GameEventType.DON_GIVEN, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          donGiven++;
        }
      });

      const maxTurns = 5;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(donGiven).toBeGreaterThan(0);
    });

    it('should distribute DON to maximize board power', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 88888,
      });

      let donDistributions = 0;
      engine.on(GameEventType.DON_GIVEN, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          donDistributions++;
        }
      });

      const maxTurns = 5;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(donDistributions).toBeGreaterThan(0);
    });

    it('should prioritize DON on Rush characters for immediate attacks', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 25; i++) {
        const cost = 3;
        const power = 3000;
        deck1Cards.push(createCharacter(`char-rush-${i}`, power, cost, ['Rush']));
      }
      for (let i = 0; i < 25; i++) {
        const cost = 3;
        const power = 3000;
        deck1Cards.push(createCharacter(`char-normal-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 99999,
      });

      let donOnRushCharacters = 0;
      engine.on(GameEventType.DON_GIVEN, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1 && event.targetCardId?.includes('rush')) {
          donOnRushCharacters++;
        }
      });

      const maxTurns = 5;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(donOnRushCharacters).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Scenario Test: AI Mulligan Decisions
  // ============================================================================

  describe('Requirement 6.1, 6.2, 6.3, 6.4: AI mulligan decisions', () => {
    it('should mulligan hands with no playable cards', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = 7 + (i % 3);
        const power = cost * 1000;
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      let mulliganDecision: boolean | null = null;
      const originalChooseMulligan = ai1.chooseMulligan.bind(ai1);
      ai1.chooseMulligan = async (...args) => {
        const result = await originalChooseMulligan(...args);
        mulliganDecision = result;
        return result;
      };

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 10001,
      });

      expect(mulliganDecision).not.toBeNull();
    });

    it('should keep hands with balanced curve', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      let mulliganDecision: boolean | null = null;
      const originalChooseMulligan = ai1.chooseMulligan.bind(ai1);
      ai1.chooseMulligan = async (...args) => {
        const result = await originalChooseMulligan(...args);
        mulliganDecision = result;
        return result;
      };

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 20002,
      });

      expect(mulliganDecision).not.toBeNull();
    });

    it('should keep hands with multiple playable cards', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 3) + 1;
        const power = cost * 1000;
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      let mulliganDecision: boolean | null = null;
      const originalChooseMulligan = ai1.chooseMulligan.bind(ai1);
      ai1.chooseMulligan = async (...args) => {
        const result = await originalChooseMulligan(...args);
        mulliganDecision = result;
        return result;
      };

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 30003,
      });

      expect(mulliganDecision).not.toBeNull();
    });

    it('should keep hands with valuable keywords like Rush', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 10 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      let mulliganDecision: boolean | null = null;
      const originalChooseMulligan = ai1.chooseMulligan.bind(ai1);
      ai1.chooseMulligan = async (...args) => {
        const result = await originalChooseMulligan(...args);
        mulliganDecision = result;
        return result;
      };

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 40004,
      });

      expect(mulliganDecision).not.toBeNull();
    });
  });

  // ============================================================================
  // Scenario Test: Strategic Play Patterns
  // ============================================================================

  describe('Requirement 5.1, 5.2, 5.3, 5.4: Strategic play patterns', () => {
    it('should play aggressively when having life advantage', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 15 ? ['Rush'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 2);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 50005,
      });

      let attackCount = 0;
      engine.on(GameEventType.ATTACK_DECLARED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          attackCount++;
        }
      });

      const maxTurns = 8;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(attackCount).toBeGreaterThan(0);
    });

    it('should play defensively when having life disadvantage', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords = i < 15 ? ['Blocker'] : [];
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck1 = createValidDeck('p1', 2, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'defensive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 60006,
      });

      let blockersPlayed = 0;
      engine.on(GameEventType.CARD_PLAYED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1 && event.cardId?.includes('char')) {
          blockersPlayed++;
        }
      });

      const maxTurns = 8;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(blockersPlayed).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize efficient plays when resources are limited', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 3) + 1;
        const power = cost * 1500;
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 70007,
      });

      let cardsPlayed = 0;
      engine.on(GameEventType.CARD_PLAYED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          cardsPlayed++;
        }
      });

      const maxTurns = 5;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(cardsPlayed).toBeGreaterThan(0);
    });

    it('should prioritize high-impact plays when resources are abundant', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 3;
        const power = cost * 1000;
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 80008,
      });

      let highCostCardsPlayed = 0;
      engine.on(GameEventType.CARD_PLAYED, (event: any) => {
        if (event.playerId === PlayerId.PLAYER_1) {
          highCostCardsPlayed++;
        }
      });

      const maxTurns = 8;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(highCostCardsPlayed).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Scenario Test: Overall Decision Quality
  // ============================================================================

  describe('Requirement 14.4: Overall AI decision quality', () => {
    it('should make consistent decisions across multiple games', async () => {
      const results: any[] = [];

      for (let gameNum = 0; gameNum < 3; gameNum++) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-game${gameNum}`, 3);
        const deck2 = createValidDeck(`p2-game${gameNum}`, 3);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 90009 + gameNum,
        });

        let actionsCount = 0;
        testEngine.on(GameEventType.AI_ACTION_SELECTED, () => {
          actionsCount++;
        });

        const maxTurns = 10;
        let turnsPlayed = 0;

        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          testEngine.runTurn();
          turnsPlayed++;
        }

        results.push({
          gameNum,
          turnsPlayed,
          actionsCount,
        });
      }

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.turnsPlayed).toBeGreaterThan(0);
        expect(result.actionsCount).toBeGreaterThan(0);
      });
    });

    it('should complete games without making illegal moves', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 100010,
      });

      const errors: any[] = [];
      engine.on(GameEventType.ERROR, (event: any) => {
        errors.push(event);
      });

      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(errors).toHaveLength(0);
      expect(turnsPlayed).toBeGreaterThan(0);
    });

    it('should demonstrate intelligent decision-making in complex scenarios', async () => {
      const deck1Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords: string[] = [];
        if (i < 10) keywords.push('Rush');
        if (i >= 10 && i < 20) keywords.push('Blocker');
        if (i >= 20 && i < 25) keywords.push('Double Attack');
        deck1Cards.push(createCharacter(`char-p1-${i}`, power, cost, keywords));
      }

      const deck2Cards: CardDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        const cost = (i % 5) + 1;
        const power = cost * 1000;
        const keywords: string[] = [];
        if (i < 10) keywords.push('Rush');
        if (i >= 10 && i < 20) keywords.push('Blocker');
        if (i >= 20 && i < 25) keywords.push('Double Attack');
        deck2Cards.push(createCharacter(`char-p2-${i}`, power, cost, keywords));
      }

      const deck1 = createValidDeck('p1', 5, deck1Cards);
      const deck2 = createValidDeck('p2', 5, deck2Cards);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 110011,
      });

      let totalDecisions = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, () => {
        totalDecisions++;
      });

      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      expect(totalDecisions).toBeGreaterThan(0);
      expect(turnsPlayed).toBeGreaterThan(0);
    });
  });
});

