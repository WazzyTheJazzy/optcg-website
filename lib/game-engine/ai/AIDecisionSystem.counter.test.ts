/**
 * AIDecisionSystem Counter Action Selection Tests
 * 
 * Tests the AI's ability to make intelligent counter decisions during battle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIDecisionSystem } from './AIDecisionSystem';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import {
  GameState,
  PlayerId,
  CardInstance,
  CounterAction,
  CardCategory,
  ZoneId,
  CardState,
  Phase,
} from '../core/types';
import { DecisionContext, DEFAULT_AI_CONFIGS } from './types';

describe('AIDecisionSystem - Counter Action Selection', () => {
  let decisionSystem: AIDecisionSystem;
  let evaluator: ActionEvaluator;
  let strategy: StrategyManager;

  beforeEach(() => {
    strategy = new StrategyManager();
    evaluator = new ActionEvaluator(strategy.getWeights());
    decisionSystem = new AIDecisionSystem(evaluator, strategy);
  });

  function createMockCard(
    id: string,
    owner: PlayerId,
    zone: ZoneId,
    options: {
      power?: number;
      cost?: number;
      counterValue?: number;
      state?: CardState;
      keywords?: string[];
      category?: CardCategory;
    } = {}
  ): CardInstance {
    return {
      id,
      definition: {
        id: `def-${id}`,
        name: `Card ${id}`,
        category: options.category || CardCategory.CHARACTER,
        colors: ['RED'],
        typeTags: [],
        attributes: [],
        basePower: options.power || 3000,
        baseCost: options.cost || 3,
        lifeValue: null,
        counterValue: options.counterValue || null,
        rarity: 'C',
        keywords: options.keywords || [],
        effects: [],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      },
      owner,
      controller: owner,
      zone,
      state: options.state || CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  function createTestState(
    aiLife: number,
    aiHandSize: number,
    defenderPower: number,
    attackerPower: number
  ): GameState {
    const aiPlayer = PlayerId.PLAYER_1;
    const opponentPlayer = PlayerId.PLAYER_2;

    const lifeCards: CardInstance[] = [];
    for (let i = 0; i < aiLife; i++) {
      lifeCards.push(createMockCard(`life-${i}`, aiPlayer, ZoneId.LIFE));
    }

    const handCards: CardInstance[] = [];
    for (let i = 0; i < aiHandSize; i++) {
      handCards.push(createMockCard(`hand-${i}`, aiPlayer, ZoneId.HAND));
    }

    const defender = createMockCard('defender', aiPlayer, ZoneId.CHARACTER_AREA, {
      power: defenderPower,
      state: CardState.RESTED,
    });

    const attacker = createMockCard('attacker', opponentPlayer, ZoneId.CHARACTER_AREA, {
      power: attackerPower,
      state: CardState.ACTIVE,
    });

    const state: GameState = {
      players: new Map([
        [
          aiPlayer,
          {
            id: aiPlayer,
            zones: {
              deck: [],
              hand: handCards,
              trash: [],
              life: lifeCards,
              donDeck: [],
              costArea: [],
              leaderArea: createMockCard('ai-leader', aiPlayer, ZoneId.LEADER_AREA, { power: 5000 }),
              characterArea: [defender],
              stageArea: null,
            },
            flags: new Map(),
          },
        ],
        [
          opponentPlayer,
          {
            id: opponentPlayer,
            zones: {
              deck: [],
              hand: [],
              trash: [],
              life: [createMockCard('opp-life-1', opponentPlayer, ZoneId.LIFE)],
              donDeck: [],
              costArea: [],
              leaderArea: createMockCard('opp-leader', opponentPlayer, ZoneId.LEADER_AREA, { power: 5000 }),
              characterArea: [attacker],
              stageArea: null,
            },
            flags: new Map(),
          },
        ],
      ]),
      activePlayer: opponentPlayer,
      phase: Phase.MAIN,
      turnNumber: 2,
      pendingTriggers: [],
      gameOver: false,
      winner: null,
      history: [],
      loopGuardState: {
        stateHashes: new Map(),
        maxRepeats: 10,
      },
    };

    return state;
  }

  function createCounterCard(
    id: string,
    owner: PlayerId,
    counterValue: number,
    cost: number = 3
  ): CardInstance {
    return createMockCard(id, owner, ZoneId.HAND, {
      counterValue,
      cost,
    });
  }

  describe('selectCounterAction', () => {
    it('should return null when no counter options are available', () => {
      const state = createTestState(3, 3, 4000, 5000);
      const context: DecisionContext = {
        state,
        playerId: PlayerId.PLAYER_1,
        config: DEFAULT_AI_CONFIGS.medium,
      };

      const result = decisionSystem.selectCounterAction([], context);

      expect(result).toBeNull();
    });

    it('should prefer countering when at 1 life (critical situation)', () => {
      const state = createTestState(1, 3, 4000, 5000);
      const aiPlayer = state.players.get(PlayerId.PLAYER_1)!;
      
      const counterCard = createCounterCard('counter-1', PlayerId.PLAYER_1, 2000, 2);
      aiPlayer.zones.hand.push(counterCard);

      const context: DecisionContext = {
        state,
        playerId: PlayerId.PLAYER_1,
        config: DEFAULT_AI_CONFIGS.medium,
      };

      const option1: CounterAction = { type: 'USE_COUNTER_CARD', cardId: 'counter-1' };
      const option2: CounterAction = { type: 'PASS' };
      const options: CounterAction[] = [option1, option2];

      const result = decisionSystem.selectCounterAction(options, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('USE_COUNTER_CARD');
    });

    it('should use counter when it prevents losing the defender', () => {
      const state = createTestState(3, 4, 4000, 5000);
      const aiPlayer = state.players.get(PlayerId.PLAYER_1)!;
      
      const counterCard = createCounterCard('counter-1', PlayerId.PLAYER_1, 2000, 2);
      aiPlayer.zones.hand.push(counterCard);

      const context: DecisionContext = {
        state,
        playerId: PlayerId.PLAYER_1,
        config: DEFAULT_AI_CONFIGS.hard, // Use hard for deterministic behavior
      };

      const option1: CounterAction = { type: 'USE_COUNTER_CARD', cardId: 'counter-1' };
      const option2: CounterAction = { type: 'PASS' };
      const options: CounterAction[] = [option1, option2];

      const result = decisionSystem.selectCounterAction(options, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('USE_COUNTER_CARD');
    });

    it('should consider card cost when evaluating counter options', () => {
      const state = createTestState(4, 4, 4000, 5000);
      const aiPlayer = state.players.get(PlayerId.PLAYER_1)!;
      
      const expensiveCounter = createCounterCard('counter-expensive', PlayerId.PLAYER_1, 2000, 5);
      const cheapCounter = createCounterCard('counter-cheap', PlayerId.PLAYER_1, 2000, 2);
      aiPlayer.zones.hand.push(expensiveCounter, cheapCounter);

      const context: DecisionContext = {
        state,
        playerId: PlayerId.PLAYER_1,
        config: DEFAULT_AI_CONFIGS.hard,
      };

      const option1: CounterAction = { type: 'USE_COUNTER_CARD', cardId: 'counter-expensive' };
      const option2: CounterAction = { type: 'USE_COUNTER_CARD', cardId: 'counter-cheap' };
      const option3: CounterAction = { type: 'PASS' };
      const options: CounterAction[] = [option1, option2, option3];

      const result = decisionSystem.selectCounterAction(options, context);

      expect(result).not.toBeNull();
      if (result && result.type === 'USE_COUNTER_CARD') {
        expect(result.cardId).toBe('counter-cheap');
      }
    });

    it('should value countering more when defending valuable characters', () => {
      const state = createTestState(3, 4, 5000, 6000);
      const aiPlayer = state.players.get(PlayerId.PLAYER_1)!;
      
      const valuableDefender = createMockCard('valuable-defender', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, {
        power: 5000,
        cost: 5,
        state: CardState.RESTED,
        keywords: ['Double Attack'],
      });
      aiPlayer.zones.characterArea = [valuableDefender];

      const counterCard = createCounterCard('counter-1', PlayerId.PLAYER_1, 2000, 3);
      aiPlayer.zones.hand.push(counterCard);

      const context: DecisionContext = {
        state,
        playerId: PlayerId.PLAYER_1,
        config: DEFAULT_AI_CONFIGS.hard, // Use hard for deterministic behavior
      };

      const option1: CounterAction = { type: 'USE_COUNTER_CARD', cardId: 'counter-1' };
      const option2: CounterAction = { type: 'PASS' };
      const options: CounterAction[] = [option1, option2];

      const result = decisionSystem.selectCounterAction(options, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('USE_COUNTER_CARD');
    });

    it('should return null when best counter option has negative score', () => {
      const state = createTestState(5, 6, 4000, 5000);
      const aiPlayer = state.players.get(PlayerId.PLAYER_1)!;
      
      const badCounter = createCounterCard('counter-bad', PlayerId.PLAYER_1, 500, 7);
      aiPlayer.zones.hand.push(badCounter);

      const context: DecisionContext = {
        state,
        playerId: PlayerId.PLAYER_1,
        config: DEFAULT_AI_CONFIGS.hard,
      };

      const option1: CounterAction = { type: 'USE_COUNTER_CARD', cardId: 'counter-bad' };
      const options: CounterAction[] = [option1];

      const result = decisionSystem.selectCounterAction(options, context);

      expect(result).toBeNull();
    });
  });
});
