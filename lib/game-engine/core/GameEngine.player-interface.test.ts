/**
 * GameEngine.player-interface.test.ts
 * 
 * Tests for Player interface integration with GameEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import { PlayerId, CardInstance, GameState, GameAction, ActionType, CounterAction, Target, EffectInstance, CardDefinition, CardCategory } from './types';

// Helper to create a mock deck for testing
function createMockDeck(): CardDefinition[] {
  const deck: CardDefinition[] = [];
  
  // Add 1 leader
  deck.push({
    id: 'OP01-001',
    name: 'Test Leader',
    category: CardCategory.LEADER,
    colors: ['Red'],
    baseCost: null,
    basePower: 5000,
    lifeValue: 5,
    effects: [],
    attributes: [],
    counterValue: null,
  });
  
  // Add 10 DON cards
  for (let i = 0; i < 10; i++) {
    deck.push({
      id: `DON-${i}`,
      name: 'DON!!',
      category: CardCategory.DON,
      colors: [],
      baseCost: null,
      basePower: null,
      lifeValue: null,
      effects: [],
      attributes: [],
      counterValue: null,
    });
  }
  
  // Add 50 character cards
  for (let i = 0; i < 50; i++) {
    deck.push({
      id: `OP01-${String(i + 2).padStart(3, '0')}`,
      name: `Test Character ${i}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      baseCost: 3,
      basePower: 4000,
      lifeValue: null,
      effects: [],
      attributes: [],
      counterValue: 1000,
    });
  }
  
  return deck;
}

// Mock Player implementation for testing
class MockPlayer implements import('./types').Player {
  readonly id: PlayerId;
  readonly type = 'human' as const;
  
  public actionToReturn: GameAction | null = null;
  public mulliganDecision: boolean = false;
  public blockerToReturn: CardInstance | null = null;
  public counterActionToReturn: CounterAction | null = null;
  
  constructor(id: PlayerId) {
    this.id = id;
  }
  
  async chooseAction(legalActions: GameAction[], state: GameState): Promise<GameAction> {
    // Return the action we set, or END_PHASE if none set
    if (this.actionToReturn) {
      return this.actionToReturn;
    }
    // Default to END_PHASE
    return {
      type: ActionType.END_PHASE,
      playerId: this.id,
      data: {},
      timestamp: Date.now(),
    };
  }
  
  async chooseMulligan(hand: CardInstance[], state: GameState): Promise<boolean> {
    return this.mulliganDecision;
  }
  
  async chooseBlocker(
    legalBlockers: CardInstance[],
    attacker: CardInstance,
    state: GameState
  ): Promise<CardInstance | null> {
    return this.blockerToReturn;
  }
  
  async chooseCounterAction(
    options: CounterAction[],
    state: GameState
  ): Promise<CounterAction | null> {
    return this.counterActionToReturn || { type: 'PASS' };
  }
  
  async chooseTarget(
    legalTargets: Target[],
    effect: EffectInstance,
    state: GameState
  ): Promise<Target> {
    return legalTargets[0];
  }
  
  async chooseValue(
    options: number[],
    effect: EffectInstance,
    state: GameState
  ): Promise<number> {
    return options[0];
  }
}

describe('GameEngine Player Interface Integration', () => {
  let engine: GameEngine;
  let player1: MockPlayer;
  let player2: MockPlayer;

  beforeEach(() => {
    engine = new GameEngine();
    player1 = new MockPlayer(PlayerId.PLAYER_1);
    player2 = new MockPlayer(PlayerId.PLAYER_2);
  });

  describe('setupGame with Player instances', () => {
    it('should accept Player instances in config', () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      expect(() => {
        engine.setupGame({
          deck1,
          deck2,
          player1,
          player2,
        });
      }).not.toThrow();

      expect(engine.isGameSetup()).toBe(true);
    });

    it('should store Player instances', () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      engine.setupGame({
        deck1,
        deck2,
        player1,
        player2,
      });

      expect(engine.getPlayer(PlayerId.PLAYER_1)).toBe(player1);
      expect(engine.getPlayer(PlayerId.PLAYER_2)).toBe(player2);
    });

    it('should work without Player instances (backward compatibility)', () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      expect(() => {
        engine.setupGame({
          deck1,
          deck2,
        });
      }).not.toThrow();

      expect(engine.isGameSetup()).toBe(true);
      expect(engine.getPlayer(PlayerId.PLAYER_1)).toBeUndefined();
      expect(engine.getPlayer(PlayerId.PLAYER_2)).toBeUndefined();
    });
  });

  describe('setupGameAsync with Player instances', () => {
    it('should query Player for mulligan decision', async () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      player1.mulliganDecision = true;
      player2.mulliganDecision = false;

      await engine.setupGameAsync({
        deck1,
        deck2,
        player1,
        player2,
      });

      expect(engine.isGameSetup()).toBe(true);
      
      // Verify game state was set up
      const state = engine.getState();
      expect(state.players.size).toBe(2);
    });
  });

  describe('Player interface routing', () => {
    it('should route chooseAction through Player interface', async () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      engine.setupGame({
        deck1,
        deck2,
        player1,
        player2,
      });

      const mockAction: GameAction = {
        type: ActionType.END_PHASE,
        playerId: PlayerId.PLAYER_1,
        data: {},
        timestamp: Date.now(),
      };

      player1.actionToReturn = mockAction;

      const result = await engine.requestPlayerDecision<GameAction>(
        PlayerId.PLAYER_1,
        'chooseAction',
        [],
        engine.getState()
      );

      expect(result).toEqual(mockAction);
    });

    it('should route chooseMulligan through Player interface', async () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      engine.setupGame({
        deck1,
        deck2,
        player1,
        player2,
      });

      player1.mulliganDecision = true;

      const result = await engine.requestPlayerDecision<boolean>(
        PlayerId.PLAYER_1,
        'chooseMulligan',
        [],
        engine.getState()
      );

      expect(result).toBe(true);
    });

    it('should throw error if Player not registered', async () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      engine.setupGame({
        deck1,
        deck2,
        // No players provided
      });

      await expect(
        engine.requestPlayerDecision<GameAction>(
          PlayerId.PLAYER_1,
          'chooseAction',
          [],
          engine.getState()
        )
      ).rejects.toThrow('No Player instance registered');
    });
  });

  describe('setPlayer and getPlayer', () => {
    it('should allow setting Player after setup', () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      engine.setupGame({
        deck1,
        deck2,
      });

      engine.setPlayer(PlayerId.PLAYER_1, player1);
      engine.setPlayer(PlayerId.PLAYER_2, player2);

      expect(engine.getPlayer(PlayerId.PLAYER_1)).toBe(player1);
      expect(engine.getPlayer(PlayerId.PLAYER_2)).toBe(player2);
    });

    it('should throw error if Player ID mismatch', () => {
      expect(() => {
        engine.setPlayer(PlayerId.PLAYER_2, player1); // player1 has id PLAYER_1
      }).toThrow('Player instance ID');
    });
  });

  describe('hasPlayer', () => {
    it('should return true if Player is set', () => {
      const deck1 = createMockDeck();
      const deck2 = createMockDeck();

      engine.setupGame({
        deck1,
        deck2,
        player1,
      });

      expect(engine.hasPlayer(PlayerId.PLAYER_1)).toBe(true);
      expect(engine.hasPlayer(PlayerId.PLAYER_2)).toBe(false);
    });
  });
});
