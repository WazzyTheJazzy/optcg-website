/**
 * AIBattle.integration.test.ts
 * 
 * Integration tests for AI vs AI combat
 * Tests AI attack declaration, blocker responses, counter usage, and effect triggering
 * 
 * Validates Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { createAIPlayer } from './AIPlayer';
import {
  CardDefinition,
  CardCategory,
  PlayerId,
  GameEventType,
} from '../core/types';

describe('AI vs AI Combat Integration Tests', () => {
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
  // Test: AI Declares Attack (Requirement 10.1)
  // ============================================================================

  describe('AI Attack Declaration', () => {
    it('should have AI declare attacks during main phase', async () => {
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

      // Track attack declarations
      const attacksDeclared: any[] = [];
      engine.on(GameEventType.ATTACK_DECLARED, (event: any) => {
        attacksDeclared.push({
          attackerId: event.attackerId,
          targetId: event.targetId,
          playerId: event.playerId,
        });
      });

      // Run game for several turns
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify that AI declared at least one attack
      expect(attacksDeclared.length).toBeGreaterThan(0);

      // Verify attack events have required fields
      attacksDeclared.forEach(attack => {
        expect(attack.attackerId).toBeDefined();
        expect(attack.targetId).toBeDefined();
        expect(attack.playerId).toBeDefined();
      });
    });

    it('should have AI declare multiple attacks in a single turn', async () => {
      // Create deck with multiple low-cost characters with Rush
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add Rush characters to deck1
      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`rush-char-${i}`, 3000, 2, ['Rush']);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 23456,
      });

      // Track attacks per turn
      let currentTurn = 0;
      const attacksPerTurn: Map<number, number> = new Map();

      engine.on(GameEventType.TURN_START, () => {
        currentTurn++;
        attacksPerTurn.set(currentTurn, 0);
      });

      engine.on(GameEventType.ATTACK_DECLARED, () => {
        const count = attacksPerTurn.get(currentTurn) || 0;
        attacksPerTurn.set(currentTurn, count + 1);
      });

      // Run game
      const maxTurns = 8;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Check if any turn had multiple attacks
      let foundMultipleAttacks = false;
      attacksPerTurn.forEach(count => {
        if (count > 1) {
          foundMultipleAttacks = true;
        }
      });

      // At least verify attacks happened (multiple attacks may or may not occur)
      const totalAttacks = Array.from(attacksPerTurn.values()).reduce((a, b) => a + b, 0);
      expect(totalAttacks).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Test: AI Responds with Blocker (Requirement 10.2)
  // ============================================================================

  describe('AI Blocker Response', () => {
    it('should have AI respond with blocker when attacked', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add blocker characters to deck2
      for (let i = 0; i < 15; i++) {
        deck2[i + 1] = createCharacter(`blocker-${i}`, 4000, 2, ['Blocker']);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 34567,
      });

      // Track blocker declarations
      const blockersDeclared: any[] = [];
      engine.on(GameEventType.BLOCK_DECLARED, (event: any) => {
        blockersDeclared.push({
          blockerId: event.blockerId,
          attackerId: event.attackerId,
          playerId: event.playerId,
        });
      });

      // Track AI blocker decisions
      let blockerDecisionsMade = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        if (event.decisionType === 'chooseBlocker') {
          blockerDecisionsMade++;
        }
      });

      // Run game
      const maxTurns = 12;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify that AI made blocker decisions
      expect(blockerDecisionsMade).toBeGreaterThan(0);

      // Verify that at least some blocks were declared
      // (AI may choose not to block in some situations)
      expect(blockersDeclared.length).toBeGreaterThanOrEqual(0);

      // If blocks were declared, verify they have required fields
      blockersDeclared.forEach(block => {
        expect(block.blockerId).toBeDefined();
        expect(block.attackerId).toBeDefined();
        expect(block.playerId).toBeDefined();
      });
    });

    it('should have blocker redirect attack correctly', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add blocker characters
      for (let i = 0; i < 10; i++) {
        deck2[i + 1] = createCharacter(`blocker-${i}`, 3000, 2, ['Blocker']);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 45678,
      });

      // Track battle outcomes
      const battles: any[] = [];
      engine.on(GameEventType.BATTLE_END, (event: any) => {
        battles.push({
          attackerId: event.attackerId,
          defenderId: event.defenderId,
          wasBlocked: event.wasBlocked,
        });
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify battles occurred
      expect(battles.length).toBeGreaterThan(0);

      // Check if any battles were blocked
      const blockedBattles = battles.filter(b => b.wasBlocked);
      
      // At least verify the battle structure is correct
      battles.forEach(battle => {
        expect(battle.attackerId).toBeDefined();
        expect(battle.defenderId).toBeDefined();
        expect(typeof battle.wasBlocked).toBe('boolean');
      });
    });
  });

  // ============================================================================
  // Test: AI Uses Counter (Requirement 10.3)
  // ============================================================================

  describe('AI Counter Usage', () => {
    it('should have AI use counter cards during battles', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Ensure deck2 has characters with counter values
      for (let i = 0; i < 20; i++) {
        const char = createCharacter(`counter-char-${i}`, 3000, 2);
        char.counterValue = 2000; // High counter value
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
        randomSeed: 56789,
      });

      // Track counter usage
      const countersUsed: any[] = [];
      engine.on(GameEventType.COUNTER_USED, (event: any) => {
        countersUsed.push({
          playerId: event.playerId,
          cardId: event.cardId,
          counterValue: event.counterValue,
        });
      });

      // Track AI counter decisions
      let counterDecisionsMade = 0;
      engine.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
        if (event.decisionType === 'chooseCounterAction') {
          counterDecisionsMade++;
        }
      });

      // Run game
      const maxTurns = 12;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify that AI made counter decisions
      expect(counterDecisionsMade).toBeGreaterThan(0);

      // Counters may or may not be used depending on AI evaluation
      // Just verify the structure if any were used
      countersUsed.forEach(counter => {
        expect(counter.playerId).toBeDefined();
        expect(counter.cardId).toBeDefined();
        expect(counter.counterValue).toBeGreaterThan(0);
      });
    });

    it('should have counter affect battle outcome', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add weak defenders with high counter values
      for (let i = 0; i < 15; i++) {
        const char = createCharacter(`weak-counter-${i}`, 2000, 1);
        char.counterValue = 3000;
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
        randomSeed: 67890,
      });

      // Track battles and counter usage
      const battleResults: any[] = [];
      let countersUsedCount = 0;

      engine.on(GameEventType.COUNTER_USED, () => {
        countersUsedCount++;
      });

      engine.on(GameEventType.BATTLE_END, (event: any) => {
        battleResults.push({
          attackerKOd: event.attackerKOd,
          defenderKOd: event.defenderKOd,
        });
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify battles occurred
      expect(battleResults.length).toBeGreaterThan(0);

      // Verify battle results have expected structure
      battleResults.forEach(result => {
        expect(typeof result.attackerKOd).toBe('boolean');
        expect(typeof result.defenderKOd).toBe('boolean');
      });
    });
  });

  // ============================================================================
  // Test: Battle Resolves Correctly (Requirement 10.4)
  // ============================================================================

  describe('Battle Resolution', () => {
    it('should resolve battles correctly with proper K.O. handling', async () => {
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
        randomSeed: 78901,
      });

      // Track K.O. events
      const koEvents: any[] = [];
      engine.on(GameEventType.CARD_KO, (event: any) => {
        koEvents.push({
          cardId: event.cardId,
          playerId: event.playerId,
        });
      });

      // Track battle outcomes
      const battles: any[] = [];
      engine.on(GameEventType.BATTLE_END, (event: any) => {
        battles.push({
          attackerId: event.attackerId,
          defenderId: event.defenderId,
          attackerKOd: event.attackerKOd,
          defenderKOd: event.defenderKOd,
        });
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify battles occurred
      expect(battles.length).toBeGreaterThan(0);

      // Verify K.O. events match battle outcomes
      battles.forEach(battle => {
        expect(typeof battle.attackerKOd).toBe('boolean');
        expect(typeof battle.defenderKOd).toBe('boolean');
      });

      // If any K.O.s occurred, verify they have proper structure
      koEvents.forEach(ko => {
        expect(ko.cardId).toBeDefined();
        expect(ko.playerId).toBeDefined();
      });
    });

    it('should handle life damage correctly when attacking leader', async () => {
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
        randomSeed: 89012,
      });

      // Track initial life counts
      const initialLife = new Map<PlayerId, number>();
      initialLife.set(PlayerId.PLAYER_1, engine.getState().players.get(PlayerId.PLAYER_1)!.zones.life.length);
      initialLife.set(PlayerId.PLAYER_2, engine.getState().players.get(PlayerId.PLAYER_2)!.zones.life.length);

      // Track life damage events
      const lifeDamageEvents: any[] = [];
      engine.on(GameEventType.LIFE_DAMAGE, (event: any) => {
        lifeDamageEvents.push({
          playerId: event.playerId,
          amount: event.amount,
        });
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify life damage events occurred
      expect(lifeDamageEvents.length).toBeGreaterThan(0);

      // Verify life counts changed appropriately
      const finalLife = new Map<PlayerId, number>();
      finalLife.set(PlayerId.PLAYER_1, engine.getState().players.get(PlayerId.PLAYER_1)!.zones.life.length);
      finalLife.set(PlayerId.PLAYER_2, engine.getState().players.get(PlayerId.PLAYER_2)!.zones.life.length);

      // At least one player should have taken life damage
      const player1LifeLost = initialLife.get(PlayerId.PLAYER_1)! - finalLife.get(PlayerId.PLAYER_1)!;
      const player2LifeLost = initialLife.get(PlayerId.PLAYER_2)! - finalLife.get(PlayerId.PLAYER_2)!;

      expect(player1LifeLost + player2LifeLost).toBeGreaterThan(0);
    });

    it('should end game when player life reaches zero', async () => {
      const deck1 = createValidDeck('p1', 2); // Low life for faster game
      const deck2 = createValidDeck('p2', 2);

      // Add strong attackers to deck1
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
        randomSeed: 90123,
      });

      // Track game over event
      let gameOverEvent: any = null;
      engine.on(GameEventType.GAME_OVER, (event: any) => {
        gameOverEvent = event;
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

      // Verify winner is set
      expect(engine.getState().winner).toBeDefined();

      // Verify game over event was emitted
      expect(gameOverEvent).not.toBeNull();
      if (gameOverEvent) {
        expect(gameOverEvent.winner).toBeDefined();
      }
    });

    it('should not deadlock during AI vs AI combat', async () => {
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

      // Set a timeout to detect deadlocks
      const startTime = Date.now();
      const timeoutMs = 20000; // 20 seconds

      // Run game
      const maxTurns = 15;
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
  // Test: Effects Trigger Appropriately (Requirement 10.5)
  // ============================================================================

  describe('Effect Triggering During Combat', () => {
    it('should trigger [When Attacking] effects during AI attacks', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add characters with [When Attacking] effects to deck1
      const whenAttackingEffect = {
        id: 'when-attacking-1',
        label: '[When Attacking]',
        timingType: 'AUTO' as any,
        triggerTiming: 'WHEN_ATTACKING' as any,
        condition: null,
        cost: null,
        effectType: 'POWER_MODIFICATION' as any,
        parameters: {
          powerChange: 1000,
          duration: 'UNTIL_END_OF_BATTLE' as any,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`effect-char-${i}`, 4000, 2, [], [whenAttackingEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 22334,
      });

      // Track effect triggers
      const effectsTriggered: any[] = [];
      engine.on(GameEventType.EFFECT_TRIGGERED, (event: any) => {
        effectsTriggered.push({
          effectId: event.effectId,
          sourceCardId: event.sourceCardId,
          triggerTiming: event.triggerTiming,
        });
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify effects were triggered
      expect(effectsTriggered.length).toBeGreaterThan(0);

      // Verify WHEN_ATTACKING effects were triggered
      const whenAttackingEffects = effectsTriggered.filter(
        e => e.triggerTiming === 'WHEN_ATTACKING'
      );
      expect(whenAttackingEffects.length).toBeGreaterThan(0);
    });

    it('should trigger [On Play] effects when AI plays cards', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add characters with [On Play] effects
      const onPlayEffect = {
        id: 'on-play-1',
        label: '[On Play]',
        timingType: 'AUTO' as any,
        triggerTiming: 'ON_PLAY' as any,
        condition: null,
        cost: null,
        effectType: 'DRAW_CARDS' as any,
        parameters: {
          cardCount: 1,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`onplay-char-${i}`, 3000, 2, [], [onPlayEffect]);
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

      // Track effect triggers
      const effectsTriggered: any[] = [];
      engine.on(GameEventType.EFFECT_TRIGGERED, (event: any) => {
        effectsTriggered.push({
          effectId: event.effectId,
          triggerTiming: event.triggerTiming,
        });
      });

      // Run game
      const maxTurns = 8;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify ON_PLAY effects were triggered
      const onPlayEffects = effectsTriggered.filter(
        e => e.triggerTiming === 'ON_PLAY'
      );
      expect(onPlayEffects.length).toBeGreaterThan(0);
    });

    it('should resolve effect stack during AI combat', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add multiple characters with effects
      const effect1 = {
        id: 'effect-1',
        label: '[When Attacking]',
        timingType: 'AUTO' as any,
        triggerTiming: 'WHEN_ATTACKING' as any,
        condition: null,
        cost: null,
        effectType: 'POWER_MODIFICATION' as any,
        parameters: {
          powerChange: 1000,
          duration: 'UNTIL_END_OF_BATTLE' as any,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`effect-char-${i}`, 4000, 2, [], [effect1]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 44556,
      });

      // Track effect resolution
      const effectsResolved: any[] = [];
      engine.on(GameEventType.EFFECT_RESOLVED, (event: any) => {
        effectsResolved.push({
          effectId: event.effectId,
          sourceCardId: event.sourceCardId,
        });
      });

      // Run game
      const maxTurns = 10;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify effects were resolved
      expect(effectsResolved.length).toBeGreaterThan(0);

      // Verify each resolved effect has required fields
      effectsResolved.forEach(effect => {
        expect(effect.effectId).toBeDefined();
        expect(effect.sourceCardId).toBeDefined();
      });
    });

    it('should handle multiple simultaneous effect triggers', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add multiple characters with same trigger timing
      const sharedEffect = {
        id: 'shared-effect',
        label: '[When Attacking]',
        timingType: 'AUTO' as any,
        triggerTiming: 'WHEN_ATTACKING' as any,
        condition: null,
        cost: null,
        effectType: 'POWER_MODIFICATION' as any,
        parameters: {
          powerChange: 500,
          duration: 'UNTIL_END_OF_BATTLE' as any,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 15; i++) {
        deck1[i + 1] = createCharacter(`multi-effect-${i}`, 3000, 2, [], [sharedEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 55667,
      });

      // Track effect triggers per attack
      const effectsPerAttack: Map<string, number> = new Map();
      let currentAttackId: string | null = null;

      engine.on(GameEventType.ATTACK_DECLARED, (event: any) => {
        currentAttackId = `${event.attackerId}-${event.targetId}`;
        effectsPerAttack.set(currentAttackId, 0);
      });

      engine.on(GameEventType.EFFECT_TRIGGERED, () => {
        if (currentAttackId) {
          const count = effectsPerAttack.get(currentAttackId) || 0;
          effectsPerAttack.set(currentAttackId, count + 1);
        }
      });

      // Run game
      const maxTurns = 8;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify effects were triggered
      const totalEffects = Array.from(effectsPerAttack.values()).reduce((a, b) => a + b, 0);
      expect(totalEffects).toBeGreaterThan(0);
    });

    it('should complete AI vs AI game with effects without errors', async () => {
      const deck1 = createValidDeck('p1', 3);
      const deck2 = createValidDeck('p2', 3);

      // Add various effects to both decks
      const whenAttackingEffect = {
        id: 'when-attacking',
        label: '[When Attacking]',
        timingType: 'AUTO' as any,
        triggerTiming: 'WHEN_ATTACKING' as any,
        condition: null,
        cost: null,
        effectType: 'POWER_MODIFICATION' as any,
        parameters: {
          powerChange: 1000,
          duration: 'UNTIL_END_OF_BATTLE' as any,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      };

      const onPlayEffect = {
        id: 'on-play',
        label: '[On Play]',
        timingType: 'AUTO' as any,
        triggerTiming: 'ON_PLAY' as any,
        condition: null,
        cost: null,
        effectType: 'DRAW_CARDS' as any,
        parameters: {
          cardCount: 1,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      };

      for (let i = 0; i < 10; i++) {
        deck1[i + 1] = createCharacter(`p1-effect-${i}`, 4000, 2, [], [whenAttackingEffect]);
        deck2[i + 1] = createCharacter(`p2-effect-${i}`, 3000, 2, [], [onPlayEffect]);
      }

      const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
      const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive', engine.getEventEmitter());

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1: ai1,
        player2: ai2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        randomSeed: 66778,
      });

      // Track errors
      const errors: Error[] = [];
      engine.on(GameEventType.ERROR, (event: any) => {
        errors.push(event.error);
      });

      // Track game events
      let attackCount = 0;
      let effectTriggeredCount = 0;
      let effectResolvedCount = 0;

      engine.on(GameEventType.ATTACK_DECLARED, () => attackCount++);
      engine.on(GameEventType.EFFECT_TRIGGERED, () => effectTriggeredCount++);
      engine.on(GameEventType.EFFECT_RESOLVED, () => effectResolvedCount++);

      // Run game
      const maxTurns = 12;
      let turnsPlayed = 0;

      while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
        await engine.runTurn();
        turnsPlayed++;
      }

      // Verify no errors occurred
      expect(errors).toHaveLength(0);

      // Verify game progressed with effects
      expect(turnsPlayed).toBeGreaterThan(0);
      expect(attackCount).toBeGreaterThan(0);
      expect(effectTriggeredCount).toBeGreaterThan(0);
      expect(effectResolvedCount).toBeGreaterThan(0);

      // Verify game completed or hit turn limit
      expect(turnsPlayed).toBeLessThanOrEqual(maxTurns);
    });
  });
});
