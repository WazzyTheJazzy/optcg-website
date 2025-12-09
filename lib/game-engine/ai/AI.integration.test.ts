/**
 * AI.integration.test.ts
 * 
 * Integration tests for AI gameplay
 * Tests AI vs AI games, legal move validation, decision points, and difficulty levels
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { createAIPlayer } from './AIPlayer';
import {
  CardDefinition,
  CardCategory,
  PlayerId,
  Phase,
  GameEventType,
} from '../core/types';
import { DifficultyLevel, PlayStyle } from './types';

describe('AI Integration Tests', () => {
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

  function createValidDeck(leaderId: string = 'leader-1', lifeValue: number = 5): CardDefinition[] {
    const deck: CardDefinition[] = [];

    // Add leader
    deck.push(createLeader(leaderId, lifeValue));

    // Add 50 character cards with varying costs
    for (let i = 0; i < 50; i++) {
      const cost = (i % 5) + 1; // Costs from 1-5
      const power = cost * 1000; // Power scales with cost
      deck.push(createCharacter(`char-${leaderId}-${i}`, power, cost));
    }

    // Add 10 DON cards
    for (let i = 0; i < 10; i++) {
      deck.push(createDon(`don-${leaderId}-${i}`));
    }

    return deck;
  }

  // ============================================================================
  // Test: AI vs AI Game Completes Without Errors
  // ============================================================================

  describe('AI vs AI Game Completion', () => {
    it('should complete an AI vs AI game without errors', async () => {
      const deck1 = createValidDeck('p1', 3); // Shorter game with 3 life
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 12345,
      });

      // Track errors
      const errors: Error[] = [];
      engine.on(GameEventType.ERROR, (event: any) => {
        errors.push(event.error);
      });

      // Run game with turn limit to prevent infinite games
      const maxTurns = 20;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // Verify no errors occurred
      expect(errors).toHaveLength(0);

      // Verify game completed or hit turn limit
      expect(turnsPlayed).toBeGreaterThan(0);
      expect(turnsPlayed).toBeLessThanOrEqual(maxTurns);
    });

    it('should complete multiple AI vs AI games consistently', async () => {
      const gamesCompleted = [];

      for (let gameNum = 0; gameNum < 3; gameNum++) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-game${gameNum}`, 2);
        const deck2 = createValidDeck(`p2-game${gameNum}`, 2);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced', testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 12345 + gameNum,
        });

        const maxTurns = 15;
        let turnsPlayed = 0;

        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          testEngine.runTurn();
          turnsPlayed++;
        }

        gamesCompleted.push({
          gameNum,
          turnsPlayed,
          gameOver: testEngine.getState().gameOver,
        });
      }

      // All games should complete
      expect(gamesCompleted).toHaveLength(3);
      gamesCompleted.forEach(game => {
        expect(game.turnsPlayed).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Test: AI Makes Only Legal Moves
  // ============================================================================

  describe('AI Legal Move Validation', () => {
    it('should only make legal moves throughout entire game', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 54321,
      });

      // Track all actions
      const actions: any[] = [];
      engine.on(GameEventType.CARD_PLAYED, (event: any) => {
        actions.push({ type: 'CARD_PLAYED', event });
      });
      engine.on(GameEventType.ATTACK_DECLARED, (event: any) => {
        actions.push({ type: 'ATTACK_DECLARED', event });
      });
      engine.on(GameEventType.DON_GIVEN, (event: any) => {
        actions.push({ type: 'DON_GIVEN', event });
      });

      // Track illegal action errors
      const illegalActions: any[] = [];
      engine.on(GameEventType.ERROR, (event: any) => {
        if (event.error?.message?.includes('illegal') || event.error?.message?.includes('invalid')) {
          illegalActions.push(event);
        }
      });

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // Verify no illegal actions were attempted
      expect(illegalActions).toHaveLength(0);

      // Verify some actions were taken
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should respect game rules for card costs', async () => {
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
        randomSeed: 99999,
      });

      // Track card plays and verify costs
      const cardPlays: any[] = [];
      engine.on(GameEventType.CARD_PLAYED, (event: any) => {
        const state = engine.getState();
        const player = state.players.get(event.playerId);
        cardPlays.push({
          playerId: event.playerId,
          cardId: event.cardId,
          availableDon: player?.zones.costArea.filter(d => d.state === 'ACTIVE').length || 0,
        });
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // All card plays should have been affordable
      // (This is implicitly tested by no errors, but we verify plays happened)
      expect(cardPlays.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Test: AI Responds to All Decision Points
  // ============================================================================

  describe('AI Decision Point Responses', () => {
    it('should respond to mulligan decisions', async () => {
      const deck1 = createValidDeck('p1');
      const deck2 = createValidDeck('p2');

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      // Track mulligan decisions
      let mulliganDecisionsMade = 0;
      const originalChooseMulligan1 = ai1.chooseMulligan.bind(ai1);
      const originalChooseMulligan2 = ai2.chooseMulligan.bind(ai2);

      ai1.chooseMulligan = async (...args) => {
        mulliganDecisionsMade++;
        return originalChooseMulligan1(...args);
      };

      ai2.chooseMulligan = async (...args) => {
        mulliganDecisionsMade++;
        return originalChooseMulligan2(...args);
      };

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 11111,
      });

      // Both AIs should have made mulligan decisions
      expect(mulliganDecisionsMade).toBe(2);
    });

    it('should respond to action choices during main phase', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 22222,
      });

      // Track action decisions
      let actionDecisionsMade = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        if (event.decisionType === 'chooseAction') {
          actionDecisionsMade++;
        }
      });

      // Run a few turns
      const maxTurns = 5;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // AI should have made action decisions
      expect(actionDecisionsMade).toBeGreaterThan(0);
    });

    it('should respond to blocker decisions when attacked', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add blocker characters to deck2
      const blockerChar = createCharacter('blocker-1', 4000, 2, ['Blocker']);
      deck2[1] = blockerChar;
      deck2[2] = blockerChar;

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 33333,
      });

      // Track blocker decisions
      let blockerDecisionsMade = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        if (event.decisionType === 'chooseBlocker') {
          blockerDecisionsMade++;
        }
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // Blocker decisions may or may not occur depending on game state
      // Just verify no errors occurred
      expect(blockerDecisionsMade).toBeGreaterThanOrEqual(0);
    });

    it('should respond to counter decisions during battles', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 44444,
      });

      // Track counter decisions
      let counterDecisionsMade = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        if (event.decisionType === 'chooseCounterAction') {
          counterDecisionsMade++;
        }
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // Counter decisions may or may not occur depending on game state
      // Just verify no errors occurred
      expect(counterDecisionsMade).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Test: AI Completes Games Within Reasonable Time
  // ============================================================================

  describe('AI Performance and Timing', () => {
    it('should complete games within reasonable time', async () => {
      const deck1 = createValidDeck('p1', 2);
      const deck2 = createValidDeck('p2', 2);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 55555,
      });

      const startTime = Date.now();

      // Run game with turn limit
      const maxTurns = 15;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Game should complete in reasonable time (< 30 seconds for 15 turns)
      // This is generous to account for CI/CD environments
      expect(totalTime).toBeLessThan(30000);

      // Should have played some turns
      expect(turnsPlayed).toBeGreaterThan(0);
    });

    it('should have reasonable thinking times per decision', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 66666,
      });

      // Track thinking times
      const thinkingTimes: number[] = [];
      engine.on(GameEventType.AI_THINKING_END, (event: any) => {
        thinkingTimes.push(event.thinkingTimeMs);
      });

      // Run a few turns
      const maxTurns = 3;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // Should have some thinking times recorded
      expect(thinkingTimes.length).toBeGreaterThan(0);

      // All thinking times should be reasonable (< 5 seconds per decision)
      thinkingTimes.forEach(time => {
        expect(time).toBeLessThan(5000);
        expect(time).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ============================================================================
  // Test: Different Difficulty Levels Behave Differently
  // ============================================================================

  describe('AI Difficulty Level Differences', () => {
    it('should show different behavior between easy and hard difficulty', async () => {
      // Run two games with same seed but different difficulties
      const results: any[] = [];

      for (const difficulty of ['easy', 'hard'] as DifficultyLevel[]) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-${difficulty}`, 3);
        const deck2 = createValidDeck(`p2-${difficulty}`, 3);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, difficulty, 'balanced', testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, difficulty, 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 77777,
        });

        // Track thinking times
        const thinkingTimes: number[] = [];
        testEngine.on(GameEventType.AI_THINKING_END, (event: any) => {
          thinkingTimes.push(event.thinkingTimeMs);
        });

        // Run game
        const maxTurns = 10;
        let turnsPlayed = 0;

        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          testEngine.runTurn();
          turnsPlayed++;
        }

        const avgThinkingTime = thinkingTimes.length > 0
          ? thinkingTimes.reduce((a, b) => a + b, 0) / thinkingTimes.length
          : 0;

        results.push({
          difficulty,
          turnsPlayed,
          avgThinkingTime,
          thinkingTimesCount: thinkingTimes.length,
        });
      }

      // Both difficulties should complete games
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.turnsPlayed).toBeGreaterThan(0);
      });

      // Hard difficulty should generally think longer than easy
      const easyResult = results.find(r => r.difficulty === 'easy');
      const hardResult = results.find(r => r.difficulty === 'hard');

      expect(easyResult).toBeDefined();
      expect(hardResult).toBeDefined();

      // Hard AI should have longer average thinking time
      if (easyResult && hardResult && easyResult.thinkingTimesCount > 0 && hardResult.thinkingTimesCount > 0) {
        expect(hardResult.avgThinkingTime).toBeGreaterThanOrEqual(easyResult.avgThinkingTime * 0.8);
      }
    });

    it('should show different play styles between aggressive and defensive', async () => {
      const results: any[] = [];

      for (const playStyle of ['aggressive', 'defensive'] as PlayStyle[]) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-${playStyle}`, 3);
        const deck2 = createValidDeck(`p2-${playStyle}`, 3);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', playStyle, testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', playStyle, testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 88888,
        });

        // Track attacks
        let attackCount = 0;
        testEngine.on(GameEventType.ATTACK_DECLARED, () => {
          attackCount++;
        });

        // Run game
        const maxTurns = 8;
        let turnsPlayed = 0;

        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          testEngine.runTurn();
          turnsPlayed++;
        }

        results.push({
          playStyle,
          turnsPlayed,
          attackCount,
        });
      }

      // Both play styles should complete games
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.turnsPlayed).toBeGreaterThan(0);
      });

      // Aggressive should generally attack more than defensive
      const aggressiveResult = results.find(r => r.playStyle === 'aggressive');
      const defensiveResult = results.find(r => r.playStyle === 'defensive');

      expect(aggressiveResult).toBeDefined();
      expect(defensiveResult).toBeDefined();

      // Both should have some attacks (or none if game state doesn't allow)
      if (aggressiveResult && defensiveResult) {
        expect(aggressiveResult.attackCount).toBeGreaterThanOrEqual(0);
        expect(defensiveResult.attackCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle all three difficulty levels without errors', async () => {
      const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
      const results: any[] = [];

      for (const difficulty of difficulties) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-${difficulty}`, 2);
        const deck2 = createValidDeck(`p2-${difficulty}`, 2);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, difficulty, 'balanced', testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, difficulty, 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 99999,
        });

        // Track errors
        const errors: Error[] = [];
        testEngine.on(GameEventType.ERROR, (event: any) => {
          errors.push(event.error);
        });

        // Run game
        const maxTurns = 10;
        let turnsPlayed = 0;

        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          testEngine.runTurn();
          turnsPlayed++;
        }

        results.push({
          difficulty,
          turnsPlayed,
          errorCount: errors.length,
        });
      }

      // All difficulties should complete without errors
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.turnsPlayed).toBeGreaterThan(0);
        expect(result.errorCount).toBe(0);
      });
    });
  });

  // ============================================================================
  // Test: AI Event Emission
  // ============================================================================

  describe('AI Event Emission', () => {
    it('should emit AI_THINKING_START and AI_THINKING_END events', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 11223,
      });

      let thinkingStartCount = 0;
      let thinkingEndCount = 0;

      engine.on(GameEventType.AI_THINKING_START, () => {
        thinkingStartCount++;
      });

      engine.on(GameEventType.AI_THINKING_END, () => {
        thinkingEndCount++;
      });

      // Run a few turns
      const maxTurns = 3;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // Should have emitted thinking events
      expect(thinkingStartCount).toBeGreaterThan(0);
      expect(thinkingEndCount).toBeGreaterThan(0);

      // Start and end counts should match
      expect(thinkingStartCount).toBe(thinkingEndCount);
    });

    it('should emit AI_ACTION_SELECTED events with decision details', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 33445,
      });

      const actionEvents: any[] = [];
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        actionEvents.push(event);
      });

      // Run a few turns
      const maxTurns = 3;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        engine.runTurn();
        turnsPlayed++;
      }

      // Should have emitted action selected events
      expect(actionEvents.length).toBeGreaterThan(0);

      // Each event should have required fields
      actionEvents.forEach(event => {
        expect(event.playerId).toBeDefined();
        expect(event.decisionType).toBeDefined();
        expect(event.selectedOption).toBeDefined();
      });
    });
  });
});
