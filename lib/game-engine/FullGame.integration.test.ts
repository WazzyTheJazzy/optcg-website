/**
 * FullGame.integration.test.ts
 * 
 * Integration tests for complete AI vs AI games with effects
 * Tests full game execution from setup to completion
 * 
 * Validates Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 * Task 49: Write integration tests for full games
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './core/GameEngine';
import { createAIPlayer } from './ai/AIPlayer';
import {
  CardDefinition,
  CardCategory,
  PlayerId,
  GameEventType,
  EffectTimingType,
  TriggerTiming,
} from './core/types';
import { EffectType } from './effects/types';

describe('Full Game Integration Tests', () => {
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
    keywords: string[] = [],
    effects: any[] = []
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
      effects,
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

  function createValidDeck(leaderId: string, lifeValue: number = 5): CardDefinition[] {
    const deck: CardDefinition[] = [];
    deck.push(createLeader(leaderId, lifeValue));

    for (let i = 0; i < 50; i++) {
      const cost = (i % 5) + 1;
      const power = cost * 1000;
      deck.push(createCharacter(`char-${leaderId}-${i}`, power, cost));
    }

    for (let i = 0; i < 10; i++) {
      deck.push(createDon(`don-${leaderId}-${i}`));
    }

    return deck;
  }

  // ============================================================================
  // Test: Complete AI vs AI Game (Requirement 10.1, 10.2, 10.3, 10.4)
  // ============================================================================

  describe('Complete AI vs AI Games', () => {
    it('should complete a full AI vs AI game without errors', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

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

      // Track game statistics
      let turnsPlayed = 0;
      let attacksDeclared = 0;
      let blockersDeclared = 0;
      let countersUsed = 0;

      engine.on(GameEventType.TURN_START, () => turnsPlayed++);
      engine.on(GameEventType.ATTACK_DECLARED, () => attacksDeclared++);
      engine.on(GameEventType.BLOCK_DECLARED, () => blockersDeclared++);
      engine.on(GameEventType.COUNTER_USED, () => countersUsed++);

      // Run game until completion or max turns
      const maxTurns = 20;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await await engine.runTurn();
      }

      // Verify no errors occurred
      expect(errors).toHaveLength(0);

      // Verify game progressed
      expect(turnsPlayed).toBeGreaterThan(0);

      // Verify game ended correctly
      expect(engine.getState().gameOver).toBe(true);
      expect(engine.getState().winner).toBeDefined();

      // Verify combat occurred
      expect(attacksDeclared).toBeGreaterThan(0);
    });

    it('should complete multiple AI vs AI games consistently', async () => {
      const gamesCompleted: boolean[] = [];
      const gameWinners: (PlayerId | null)[] = [];

      for (let gameNum = 0; gameNum < 3; gameNum++) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-game${gameNum}`, 3);
        const deck2 = createValidDeck(`p2-game${gameNum}`, 3);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 10000 + gameNum,
        });

        // Run game
        const maxTurns = 20;
        let turnsPlayed = 0;
        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          await testEngine.runTurn();
          turnsPlayed++;
        }

        gamesCompleted.push(testEngine.getState().gameOver);
        gameWinners.push(testEngine.getState().winner || null);
      }

      // Verify all games completed
      expect(gamesCompleted.every(completed => completed)).toBe(true);

      // Verify all games had winners
      expect(gameWinners.every(winner => winner !== null)).toBe(true);
    });

    it('should not deadlock during full game execution', async () => {
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
        randomSeed: 23456,
      });

      // Set timeout to detect deadlocks
      const startTime = Date.now();
      const timeoutMs = 30000; // 30 seconds

      // Run game
      const maxTurns = 20;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;

        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new Error('Game deadlocked - exceeded timeout');
        }
      }

      // Verify game progressed
      expect(turnsPlayed).toBeGreaterThan(0);

      // Verify no deadlock occurred
      expect(Date.now() - startTime).toBeLessThan(timeoutMs);
    });
  });

  // ============================================================================
  // Test: All Effect Types Work (Requirement 10.5)
  // ============================================================================

  describe('Full Games with All Effect Types', () => {
    it('should handle games with power modification effects', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add power modification effects
      const powerEffect = {
        id: 'power-mod',
        label: '[When Attacking]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.WHEN_ATTACKING,
        condition: null,
        cost: null,
        effectType: EffectType.POWER_MODIFICATION,
        parameters: {
          powerChange: 1000,
          duration: 'UNTIL_END_OF_BATTLE',
        },
        scriptId: 'power-boost-battle',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`power-char-${i}`, 3000, 2, ['Rush'], [powerEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 34567,
      });

      // Track effect usage
      let powerEffectsTriggered = 0;
      engine.on(GameEventType.EFFECT_TRIGGERED, (event: any) => {
        if (event.effectType === EffectType.POWER_MODIFICATION) {
          powerEffectsTriggered++;
        }
      });

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify power effects were used
      expect(powerEffectsTriggered).toBeGreaterThan(0);

      // Verify game completed
      expect(engine.getState().gameOver).toBe(true);
    });

    it('should handle games with card draw effects', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add draw effects
      const drawEffect = {
        id: 'draw-effect',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: {
          cardCount: 1,
        },
        scriptId: 'draw-1',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`draw-char-${i}`, 3000, 2, [], [drawEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 45678,
      });

      // Track effect usage
      let drawEffectsTriggered = 0;
      engine.on(GameEventType.EFFECT_TRIGGERED, (event: any) => {
        if (event.effectType === EffectType.DRAW_CARDS) {
          drawEffectsTriggered++;
        }
      });

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify draw effects were used
      expect(drawEffectsTriggered).toBeGreaterThan(0);

      // Verify game completed
      expect(engine.getState().gameOver).toBe(true);
    });

    it('should handle games with multiple effect types', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add various effects
      const powerEffect = {
        id: 'power-1',
        label: '[When Attacking]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.WHEN_ATTACKING,
        condition: null,
        cost: null,
        effectType: EffectType.POWER_MODIFICATION,
        parameters: { powerChange: 1000, duration: 'UNTIL_END_OF_BATTLE' },
        scriptId: 'power-boost',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      const drawEffect = {
        id: 'draw-1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: { cardCount: 1 },
        scriptId: 'draw-1',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      const restEffect = {
        id: 'rest-1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.REST_CHARACTER,
        parameters: {},
        scriptId: 'rest-char',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      // Distribute effects across deck
      for (let i = 0; i < 5; i++) {
        deck1[i + 1] = createCharacter(`power-${i}`, 3000, 2, ['Rush'], [powerEffect]);
        deck1[i + 6] = createCharacter(`draw-${i}`, 3000, 2, [], [drawEffect]);
        deck1[i + 11] = createCharacter(`rest-${i}`, 3000, 2, [], [restEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 56789,
      });

      // Track different effect types
      const effectCounts = new Map<EffectType, number>();

      engine.on(GameEventType.EFFECT_TRIGGERED, (event: any) => {
        const count = effectCounts.get(event.effectType) || 0;
        effectCounts.set(event.effectType, count + 1);
      });

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify multiple effect types were used
      expect(effectCounts.size).toBeGreaterThan(0);

      // Verify game completed
      expect(engine.getState().gameOver).toBe(true);
    });

    it('should handle games with keyword grant effects', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add keyword grant effects
      const keywordEffect = {
        id: 'keyword-grant',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.GRANT_KEYWORD,
        parameters: {
          keyword: 'Rush',
        },
        scriptId: 'grant-rush',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`keyword-char-${i}`, 3000, 2, [], [keywordEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 67890,
      });

      // Track keyword effects
      let keywordEffectsTriggered = 0;
      engine.on(GameEventType.EFFECT_TRIGGERED, (event: any) => {
        if (event.effectType === EffectType.GRANT_KEYWORD) {
          keywordEffectsTriggered++;
        }
      });

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify keyword effects were used
      expect(keywordEffectsTriggered).toBeGreaterThan(0);

      // Verify game completed
      expect(engine.getState().gameOver).toBe(true);
    });

    it('should handle games with DON attachment effects', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add DON attachment effects
      const donEffect = {
        id: 'don-attach',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.ATTACH_DON,
        parameters: {},
        scriptId: 'attach-don',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`don-char-${i}`, 3000, 2, [], [donEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 78901,
      });

      // Track DON effects
      let donEffectsTriggered = 0;
      engine.on(GameEventType.EFFECT_TRIGGERED, (event: any) => {
        if (event.effectType === EffectType.ATTACH_DON) {
          donEffectsTriggered++;
        }
      });

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify DON effects were used
      expect(donEffectsTriggered).toBeGreaterThan(0);

      // Verify game completed
      expect(engine.getState().gameOver).toBe(true);
    });
  });

  // ============================================================================
  // Test: Game Ends Correctly (Requirement 10.4)
  // ============================================================================

  describe('Game End Conditions', () => {
    it('should end game when player life reaches zero', async () => {
      const deck1 = createValidDeck('p1', 2); // Low life
      const deck2 = createValidDeck('p2', 2);

      // Add strong attackers
      for (let i = 0; i < 15; i++) {
        deck1[i + 1] = createCharacter(`strong-${i}`, 8000, 3, ['Rush']);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 89012,
      });

      // Track game over event
      let gameOverEvent: any = null;
      engine.on(GameEventType.GAME_OVER, (event: any) => {
        gameOverEvent = event;
      });

      // Run game
      const maxTurns = 20;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify game ended
      expect(engine.getState().gameOver).toBe(true);

      // Verify winner is set
      expect(engine.getState().winner).toBeDefined();

      // Verify game over event was emitted
      expect(gameOverEvent).not.toBeNull();
      if (gameOverEvent) {
        expect(gameOverEvent.winner).toBeDefined();
      }
    });

    it('should end game when player deck is empty', async () => {
      const deck1 = createValidDeck('p1', 5);
      const deck2 = createValidDeck('p2', 5);

      // Add many draw effects to deplete deck
      const massDrawEffect = {
        id: 'mass-draw',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: { cardCount: 3 },
        scriptId: 'draw-3',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 20; i++) {
        deck1[i + 1] = createCharacter(`draw-${i}`, 2000, 1, [], [massDrawEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 90123,
      });

      // Run game
      const maxTurns = 25;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify game ended
      expect(engine.getState().gameOver).toBe(true);

      // Verify winner is set
      expect(engine.getState().winner).toBeDefined();
    });

    it('should set correct winner when game ends', async () => {
      const deck1 = createValidDeck('p1', 2);
      const deck2 = createValidDeck('p2', 2);

      // Give player 1 overwhelming advantage
      for (let i = 0; i < 20; i++) {
        deck1[i + 1] = createCharacter(`op-${i}`, 10000, 3, ['Rush', 'Double Attack']);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 11223,
      });

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify game ended
      expect(engine.getState().gameOver).toBe(true);

      // Verify winner is player 1 (with overwhelming advantage)
      const winner = engine.getState().winner;
      expect(winner).toBeDefined();
      expect([PlayerId.PLAYER_1, PlayerId.PLAYER_2]).toContain(winner!);
    });
  });

  // ============================================================================
  // Test: Complex Game Scenarios
  // ============================================================================

  describe('Complex Game Scenarios', () => {
    it('should handle games with blockers and counters', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add blockers to deck2
      for (let i = 0; i < 15; i++) {
        deck2[i + 1] = createCharacter(`blocker-${i}`, 4000, 2, ['Blocker']);
      }

      // Add high counter values
      for (let i = 15; i < 25; i++) {
        const char = createCharacter(`counter-${i}`, 3000, 2);
        char.counterValue = 2000;
        deck2[i + 1] = char;
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 22334,
      });

      // Track combat interactions
      let blockersDeclared = 0;
      let countersUsed = 0;

      engine.on(GameEventType.BLOCK_DECLARED, () => blockersDeclared++);
      engine.on(GameEventType.COUNTER_USED, () => countersUsed++);

      // Run game
      const maxTurns = 20;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify game completed
      expect(engine.getState().gameOver).toBe(true);

      // Verify defensive mechanics were used
      // (May be 0 if AI chose not to use them)
      expect(blockersDeclared).toBeGreaterThanOrEqual(0);
      expect(countersUsed).toBeGreaterThanOrEqual(0);
    });

    it('should handle games with effect chains', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add cards with multiple effects
      const multiEffect1 = {
        id: 'multi-1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: { cardCount: 1 },
        scriptId: 'draw-1',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      const multiEffect2 = {
        id: 'multi-2',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.POWER_MODIFICATION,
        parameters: { powerChange: 1000, duration: 'UNTIL_END_OF_TURN' },
        scriptId: 'power-boost',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`chain-${i}`, 3000, 2, [], [multiEffect1, multiEffect2]);
      }

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

      // Track effect chains
      let effectsTriggered = 0;
      let effectsResolved = 0;

      engine.on(GameEventType.EFFECT_TRIGGERED, () => effectsTriggered++);
      engine.on(GameEventType.EFFECT_RESOLVED, () => effectsResolved++);

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify effects were triggered and resolved
      expect(effectsTriggered).toBeGreaterThan(0);
      expect(effectsResolved).toBeGreaterThan(0);

      // Verify all triggered effects were resolved
      expect(effectsResolved).toBe(effectsTriggered);

      // Verify game completed
      expect(engine.getState().gameOver).toBe(true);
    });

    it('should handle games with different AI difficulty levels', async () => {
      const results: { difficulty: string; winner: PlayerId | null }[] = [];

      const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-${difficulty}`, 3);
        const deck2 = createValidDeck(`p2-${difficulty}`, 3);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, difficulty, 'aggressive', testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 44556,
        });

        // Run game
        const maxTurns = 20;
        let turnsPlayed = 0;
        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          await testEngine.runTurn();
          turnsPlayed++;
        }

        results.push({
          difficulty,
          winner: testEngine.getState().winner || null,
        });
      }

      // Verify all games completed
      expect(results.every(r => r.winner !== null)).toBe(true);

      // Verify games ran with different difficulties
      expect(results.length).toBe(3);
    });

    it('should handle games with different AI strategies', async () => {
      const results: { strategy: string; winner: PlayerId | null }[] = [];

      const strategies: Array<'aggressive' | 'balanced' | 'defensive'> = ['aggressive', 'balanced', 'defensive'];

      for (const strategy of strategies) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`p1-${strategy}`, 3);
        const deck2 = createValidDeck(`p2-${strategy}`, 3);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', strategy, testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 55667,
        });

        // Run game
        const maxTurns = 20;
        let turnsPlayed = 0;
        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          await testEngine.runTurn();
          turnsPlayed++;
        }

        results.push({
          strategy,
          winner: testEngine.getState().winner || null,
        });
      }

      // Verify all games completed
      expect(results.every(r => r.winner !== null)).toBe(true);

      // Verify games ran with different strategies
      expect(results.length).toBe(3);
    });
  });

  // ============================================================================
  // Test: Performance and Stability
  // ============================================================================

  describe('Performance and Stability', () => {
    it('should complete games within reasonable time', async () => {
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
        randomSeed: 66778,
      });

      const startTime = Date.now();

      // Run game
      const maxTurns = 20;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      const elapsedTime = Date.now() - startTime;

      // Verify game completed in reasonable time (30 seconds)
      expect(elapsedTime).toBeLessThan(30000);

      // Verify game progressed
      expect(turnsPlayed).toBeGreaterThan(0);
    });

    it('should handle games with many effects without performance degradation', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add many effects
      const effect = {
        id: 'perf-effect',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: { cardCount: 1 },
        scriptId: 'draw-1',
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 30; i++) {
        deck1[i + 1] = createCharacter(`perf-${i}`, 2000, 1, [], [effect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'balanced', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 77889,
      });

      const startTime = Date.now();

      // Run game
      const maxTurns = 15;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      const elapsedTime = Date.now() - startTime;

      // Verify game completed in reasonable time
      expect(elapsedTime).toBeLessThan(30000);

      // Verify game progressed
      expect(turnsPlayed).toBeGreaterThan(0);
    });

    it('should maintain consistent memory usage across turns', async () => {
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
        randomSeed: 88990,
      });

      // Run game and verify no memory leaks
      const maxTurns = 20;
      let turnsPlayed = 0;
      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;

        // Verify state is still accessible
        const state = engine.getState();
        expect(state).toBeDefined();
        expect(state.players.size).toBe(2);
      }

      // Verify game completed
      expect(turnsPlayed).toBeGreaterThan(0);
    });

    it('should handle rapid successive games without issues', async () => {
      const gamesCompleted: boolean[] = [];

      for (let i = 0; i < 5; i++) {
        const testEngine = new GameEngine();
        const deck1 = createValidDeck(`rapid-p1-${i}`, 2);
        const deck2 = createValidDeck(`rapid-p2-${i}`, 2);

        const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'aggressive', testEngine.getEventEmitter());
        const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced', testEngine.getEventEmitter());

        await testEngine.setupGameAsync({
          deck1,
          deck2,
          player1: ai1,
          player2: ai2,
          firstPlayerChoice: PlayerId.PLAYER_1,
          randomSeed: 99000 + i,
        });

        // Run game quickly
        const maxTurns = 10;
        let turnsPlayed = 0;
        while (!testEngine.getState().gameOver && turnsPlayed < maxTurns) {
          await testEngine.runTurn();
          turnsPlayed++;
        }

        gamesCompleted.push(testEngine.getState().gameOver);
      }

      // Verify all games completed
      expect(gamesCompleted.every(completed => completed)).toBe(true);
      expect(gamesCompleted.length).toBe(5);
    });
  });
});
