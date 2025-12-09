/**
 * Combat Decision Logic Tests
 * 
 * Tests for task 14: Implement combat decision logic
 * Verifies that attack evaluation properly considers:
 * - Expected value for attacking leader vs characters
 * - Blocker probability and counter risk
 * - Life damage prioritization
 * - Character removal value
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionEvaluator } from './ActionEvaluator';
import {
  GameState,
  PlayerId,
  CardInstance,
  CardState,
  CardCategory,
  GameAction,
  ActionType,
  Phase,
  ZoneId,
} from '../core/types';
import { EvaluationWeights } from './types';

describe('ActionEvaluator - Combat Decision Logic', () => {
  let evaluator: ActionEvaluator;
  let baseState: GameState;

  const createCard = (
    id: string,
    category: CardCategory,
    basePower: number,
    baseCost: number,
    keywords: string[] = [],
    state: CardState = CardState.ACTIVE
  ): CardInstance => ({
    id,
    definition: {
      id: `card-${id}`,
      name: `Card ${id}`,
      category,
      basePower,
      baseCost,
      lifeValue: null,
      counterValue: null,
      keywords,
      colors: [],
      typeTags: [],
      effects: [],
      attributes: [],
      rarity: 'C',
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
    zone: ZoneId.CHARACTER_AREA,
    state,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  });

  beforeEach(() => {
    // Balanced weights for testing
    const weights: EvaluationWeights = {
      boardControl: 0.25,
      resourceEfficiency: 0.20,
      lifeDifferential: 0.25,
      cardAdvantage: 0.15,
      tempo: 0.15,
    };

    evaluator = new ActionEvaluator(weights);

    // Create base game state
    baseState = {
      phase: Phase.MAIN,
      turnNumber: 1,
      activePlayer: PlayerId.PLAYER_1,
      gameOver: false,
      winner: null,
      players: new Map([
        [
          PlayerId.PLAYER_1,
          {
            id: PlayerId.PLAYER_1,
            zones: {
              deck: [],
              hand: [],
              trash: [],
              life: [createCard('life1', CardCategory.CHARACTER, 0, 0), createCard('life2', CardCategory.CHARACTER, 0, 0), createCard('life3', CardCategory.CHARACTER, 0, 0)],
              donDeck: [],
              costArea: [],
              characterArea: [],
              stageArea: null,
              leaderArea: createCard('leader1', CardCategory.LEADER, 5000, 0),
            },
            flags: new Map(),
          },
        ],
        [
          PlayerId.PLAYER_2,
          {
            id: PlayerId.PLAYER_2,
            zones: {
              deck: [],
              hand: [createCard('hand1', CardCategory.CHARACTER, 0, 0), createCard('hand2', CardCategory.CHARACTER, 0, 0)],
              trash: [],
              life: [createCard('life1', CardCategory.CHARACTER, 0, 0), createCard('life2', CardCategory.CHARACTER, 0, 0), createCard('life3', CardCategory.CHARACTER, 0, 0)],
              donDeck: [],
              costArea: [],
              characterArea: [],
              stageArea: null,
              leaderArea: createCard('leader2', CardCategory.LEADER, 5000, 0),
            },
            flags: new Map(),
          },
        ],
      ]),
      pendingTriggers: [],
      history: [],
      loopGuardState: {
        stateHashes: new Map(),
        maxRepeats: 100,
      },
    };
  });

  describe('Attack Target Evaluation', () => {
    it('should prioritize attacking leader when opponent is at low life', () => {
      // Setup: Opponent at 1 life
      const state = { ...baseState };
      const opponent = state.players.get(PlayerId.PLAYER_2)!;
      opponent.zones.life = [createCard('life1', CardCategory.CHARACTER, 0, 0)];

      const attacker = createCard('attacker1', CardCategory.CHARACTER, 5000, 3);
      state.players.get(PlayerId.PLAYER_1)!.zones.characterArea.push(attacker);

      // Create attack actions
      const attackLeader: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'leader' },
        timestamp: Date.now(),
      };

      const score = evaluator.evaluateAction(attackLeader, state, PlayerId.PLAYER_1);

      // Should have very high score for potential winning attack
      expect(score).toBeGreaterThan(50);
    });

    it('should evaluate character removal vs life damage', () => {
      // Setup: Opponent has a strong character
      const state = { ...baseState };
      const opponent = state.players.get(PlayerId.PLAYER_2)!;
      const strongCharacter = createCard('strong1', CardCategory.CHARACTER, 8000, 7, ['Double Attack']);
      opponent.zones.characterArea.push(strongCharacter);

      const attacker = createCard('attacker1', CardCategory.CHARACTER, 9000, 5);
      state.players.get(PlayerId.PLAYER_1)!.zones.characterArea.push(attacker);

      // Create attack actions
      const attackLeader: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'leader' },
        timestamp: Date.now(),
      };

      const attackCharacter: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'strong1' },
        timestamp: Date.now(),
      };

      const leaderScore = evaluator.evaluateAction(attackLeader, state, PlayerId.PLAYER_1);
      const characterScore = evaluator.evaluateAction(attackCharacter, state, PlayerId.PLAYER_1);

      // Both should be positive, but removing a dangerous character should be valuable
      expect(leaderScore).toBeGreaterThan(0);
      expect(characterScore).toBeGreaterThan(0);
    });

    it('should factor in blocker probability when attacking leader', () => {
      // Setup: Opponent has blockers
      const state = { ...baseState };
      const opponent = state.players.get(PlayerId.PLAYER_2)!;
      const blocker1 = createCard('blocker1', CardCategory.CHARACTER, 6000, 4, ['Blocker']);
      const blocker2 = createCard('blocker2', CardCategory.CHARACTER, 7000, 5, ['Blocker']);
      opponent.zones.characterArea.push(blocker1, blocker2);

      const attacker = createCard('attacker1', CardCategory.CHARACTER, 5000, 3);
      state.players.get(PlayerId.PLAYER_1)!.zones.characterArea.push(attacker);

      // Create attack action
      const attackLeader: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'leader' },
        timestamp: Date.now(),
      };

      const score = evaluator.evaluateAction(attackLeader, state, PlayerId.PLAYER_1);

      // Score should be reduced due to blocker risk
      // The attacker (5000 power) is weaker than both blockers
      // Score is still positive but reduced from base leader attack score (~35 base + bonuses)
      expect(score).toBeLessThan(50); // Reduced from higher scores without blocker risk
      expect(score).toBeGreaterThan(20); // Still positive, attacking is generally good
    });

    it('should factor in counter risk based on opponent hand size', () => {
      // Setup: Opponent has large hand (potential counters)
      const state = { ...baseState };
      const opponent = state.players.get(PlayerId.PLAYER_2)!;
      opponent.zones.hand = [
        createCard('hand1', CardCategory.CHARACTER, 0, 0),
        createCard('hand2', CardCategory.CHARACTER, 0, 0),
        createCard('hand3', CardCategory.CHARACTER, 0, 0),
        createCard('hand4', CardCategory.CHARACTER, 0, 0),
      ];

      const attacker = createCard('attacker1', CardCategory.CHARACTER, 5000, 3);
      state.players.get(PlayerId.PLAYER_1)!.zones.characterArea.push(attacker);

      // Create attack action
      const attackLeader: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'leader' },
        timestamp: Date.now(),
      };

      const scoreWithLargeHand = evaluator.evaluateAction(attackLeader, state, PlayerId.PLAYER_1);

      // Reduce opponent hand size
      opponent.zones.hand = [createCard('hand1', CardCategory.CHARACTER, 0, 0)];
      const scoreWithSmallHand = evaluator.evaluateAction(attackLeader, state, PlayerId.PLAYER_1);

      // Score should be higher when opponent has fewer cards (less counter risk)
      expect(scoreWithSmallHand).toBeGreaterThan(scoreWithLargeHand);
    });

    it('should prioritize life damage when advantageous', () => {
      // Setup: Opponent at 2 life, no blockers
      const state = { ...baseState };
      const opponent = state.players.get(PlayerId.PLAYER_2)!;
      opponent.zones.life = [
        createCard('life1', CardCategory.CHARACTER, 0, 0),
        createCard('life2', CardCategory.CHARACTER, 0, 0),
      ];

      const attacker = createCard('attacker1', CardCategory.CHARACTER, 6000, 4);
      state.players.get(PlayerId.PLAYER_1)!.zones.characterArea.push(attacker);

      // Add a weak opponent character
      const weakCharacter = createCard('weak1', CardCategory.CHARACTER, 3000, 2);
      opponent.zones.characterArea.push(weakCharacter);

      // Create attack actions
      const attackLeader: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'leader' },
        timestamp: Date.now(),
      };

      const attackCharacter: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'weak1' },
        timestamp: Date.now(),
      };

      const leaderScore = evaluator.evaluateAction(attackLeader, state, PlayerId.PLAYER_1);
      const characterScore = evaluator.evaluateAction(attackCharacter, state, PlayerId.PLAYER_1);

      // Attacking leader should be prioritized when opponent is low on life
      expect(leaderScore).toBeGreaterThan(characterScore);
    });

    it('should evaluate battle outcomes correctly', () => {
      // Setup: Test winning, losing, and mutual destruction scenarios
      const state = { ...baseState };
      const opponent = state.players.get(PlayerId.PLAYER_2)!;
      
      const weakTarget = createCard('weak1', CardCategory.CHARACTER, 3000, 2);
      const equalTarget = createCard('equal1', CardCategory.CHARACTER, 5000, 3);
      const strongTarget = createCard('strong1', CardCategory.CHARACTER, 7000, 5);
      opponent.zones.characterArea.push(weakTarget, equalTarget, strongTarget);

      const attacker = createCard('attacker1', CardCategory.CHARACTER, 5000, 3);
      state.players.get(PlayerId.PLAYER_1)!.zones.characterArea.push(attacker);

      // Create attack actions
      const attackWeak: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'weak1' },
        timestamp: Date.now(),
      };

      const attackEqual: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'equal1' },
        timestamp: Date.now(),
      };

      const attackStrong: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'strong1' },
        timestamp: Date.now(),
      };

      const weakScore = evaluator.evaluateAction(attackWeak, state, PlayerId.PLAYER_1);
      const equalScore = evaluator.evaluateAction(attackEqual, state, PlayerId.PLAYER_1);
      const strongScore = evaluator.evaluateAction(attackStrong, state, PlayerId.PLAYER_1);

      // Winning battle should score highest
      expect(weakScore).toBeGreaterThan(equalScore);
      // Mutual destruction should score higher than losing
      expect(equalScore).toBeGreaterThan(strongScore);
      // Losing battle should have negative or very low score
      expect(strongScore).toBeLessThan(weakScore);
    });
  });

  describe('Integration with Action Evaluation', () => {
    it('should properly route attack actions to combat evaluation', () => {
      const state = { ...baseState };
      const attacker = createCard('attacker1', CardCategory.CHARACTER, 5000, 3);
      state.players.get(PlayerId.PLAYER_1)!.zones.characterArea.push(attacker);

      const attackAction: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'attacker1', targetId: 'leader' },
        timestamp: Date.now(),
      };

      // Should not throw and should return a numeric score
      const score = evaluator.evaluateAction(attackAction, state, PlayerId.PLAYER_1);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0); // Attacking should generally be positive
    });
  });
});
