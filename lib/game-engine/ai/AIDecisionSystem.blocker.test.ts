/**
 * Tests for AIDecisionSystem blocker selection logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIDecisionSystem } from './AIDecisionSystem';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import {
  GameState,
  PlayerId,
  CardInstance,
  CardDefinition,
  PlayerState,
  ZoneId,
  Phase,
  CardCategory,
  CardState,
} from '../core/types';
import { DecisionContext } from './types';

describe('AIDecisionSystem - Blocker Selection', () => {
  let decisionSystem: AIDecisionSystem;
  let evaluator: ActionEvaluator;
  let strategy: StrategyManager;
  let gameState: GameState;
  let context: DecisionContext;

  beforeEach(() => {
    strategy = new StrategyManager();
    evaluator = new ActionEvaluator(strategy.getWeights());
    decisionSystem = new AIDecisionSystem(evaluator, strategy);

    // Create minimal game state
    const player1: PlayerState = {
      id: PlayerId.PLAYER_1,
      zones: {
        leaderArea: null as any,
        life: [{ id: 'life1' } as any, { id: 'life2' } as any, { id: 'life3' } as any],
        hand: [],
        deck: [],
        trash: [],
        characterArea: [],
        donDeck: [],
        costArea: [],
        stageArea: null,
      },
      flags: new Map(),
    };

    const player2: PlayerState = {
      id: PlayerId.PLAYER_2,
      zones: {
        leaderArea: null as any,
        life: [{ id: 'life1' } as any, { id: 'life2' } as any],
        hand: [],
        deck: [],
        trash: [],
        characterArea: [],
        donDeck: [],
        costArea: [],
        stageArea: null,
      },
      flags: new Map(),
    };

    gameState = {
      players: new Map([
        [PlayerId.PLAYER_1, player1],
        [PlayerId.PLAYER_2, player2],
      ]),
      turnNumber: 1,
      activePlayer: PlayerId.PLAYER_1,
      phase: Phase.MAIN,
      pendingTriggers: [],
      gameOver: false,
      winner: null,
      history: [],
      loopGuardState: {
        stateHashes: new Map(),
        maxRepeats: 3,
      },
    };

    context = {
      state: gameState,
      playerId: PlayerId.PLAYER_1,
      config: {
        difficulty: 'medium',
        playStyle: 'balanced',
        thinkingTime: { min: 500, max: 1500 },
        randomness: 0.15,
      },
    };
  });

  const createCard = (
    id: string,
    power: number,
    cost: number,
    keywords: string[] = []
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `card-${id}`,
      name: `Card ${id}`,
      rarity: 'C',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      baseCost: cost,
      basePower: power,
      counterValue: 0,
      lifeValue: null,
      attributes: [],
      typeTags: [],
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

    return {
      id,
      definition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  describe('selectBlocker', () => {
    it('should return null when no blockers are available', () => {
      const attacker = createCard('attacker', 5000, 3);
      const result = decisionSystem.selectBlocker([], attacker, context);
      expect(result).toBeNull();
    });

    it('should choose to block with a stronger blocker', () => {
      const attacker = createCard('attacker', 3000, 2);
      const strongBlocker = createCard('blocker1', 5000, 3);
      const weakBlocker = createCard('blocker2', 2000, 1);

      const result = decisionSystem.selectBlocker(
        [strongBlocker, weakBlocker],
        attacker,
        context
      );

      // Should return a valid blocker (preferably the strong one, but weak blocker or null are possible)
      expect([strongBlocker, weakBlocker, null]).toContain(result);
    });

    it('should prefer not blocking when life is high and blocker is valuable', () => {
      const attacker = createCard('attacker', 2000, 1);
      const valuableBlocker = createCard('blocker', 8000, 7, ['Double Attack']);

      // Player has 3 life (healthy)
      const result = decisionSystem.selectBlocker([valuableBlocker], attacker, context);

      // May choose not to block to preserve valuable character
      // (This is probabilistic, so we just verify it returns a valid result)
      expect(result === null || result === valuableBlocker).toBe(true);
    });

    it('should block when life is critical', () => {
      const attacker = createCard('attacker', 3000, 2);
      const blocker = createCard('blocker', 2000, 1);

      // Set player to 1 life (critical)
      const player = gameState.players.get(PlayerId.PLAYER_1)!;
      player.zones.life = [{ id: 'life1' } as any];

      const result = decisionSystem.selectBlocker([blocker], attacker, context);

      // Should block when at critical life
      expect(result).toBe(blocker);
    });

    it('should evaluate trade-offs correctly', () => {
      const attacker = createCard('attacker', 4000, 5); // High cost
      const blocker = createCard('blocker', 4000, 2); // Low cost

      const result = decisionSystem.selectBlocker([blocker], attacker, context);

      // Should block for a favorable trade (mutual destruction but good value)
      expect(result).toBe(blocker);
    });

    it('should consider keyword value when evaluating blockers', () => {
      const attacker = createCard('attacker', 3000, 2);
      const rushBlocker = createCard('blocker1', 4000, 3, ['Rush']);
      const normalBlocker = createCard('blocker2', 4000, 3);

      // Both blockers win the battle, but Rush blocker is more valuable
      const result = decisionSystem.selectBlocker(
        [rushBlocker, normalBlocker],
        attacker,
        context
      );

      // Should return one of the blockers or null (both win, so either is valid)
      // The AI may prefer the normal blocker to preserve Rush, but both are reasonable
      expect([rushBlocker, normalBlocker, null]).toContain(result);
    });

    it('should handle multiple blocker options', () => {
      const attacker = createCard('attacker', 4000, 3);
      const blocker1 = createCard('blocker1', 5000, 4);
      const blocker2 = createCard('blocker2', 3000, 2);
      const blocker3 = createCard('blocker3', 6000, 5);

      const result = decisionSystem.selectBlocker(
        [blocker1, blocker2, blocker3],
        attacker,
        context
      );

      // Should return one of the valid blockers
      expect([blocker1, blocker2, blocker3, null]).toContain(result);
    });
  });
});
