/**
 * Unit tests for ActionEvaluator
 * Tests evaluation of game actions and states for AI decision-making
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionEvaluator } from './ActionEvaluator';
import {
  GameState,
  PlayerId,
  CardInstance,
  DonInstance,
  CardState,
  Phase,
  CardCategory,
  ZoneId,
  ActionType,
  GameAction,
} from '../core/types';
import { EvaluationWeights } from './types';

// Helper function to create a minimal game state for testing
function createTestGameState(): GameState {
  const player1State = {
    id: PlayerId.PLAYER_1,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [],
      donDeck: [],
      costArea: [],
      leaderArea: null,
      characterArea: [],
      stageArea: null,
    },
    flags: new Map(),
  };

  const player2State = {
    id: PlayerId.PLAYER_2,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [],
      donDeck: [],
      costArea: [],
      leaderArea: null,
      characterArea: [],
      stageArea: null,
    },
    flags: new Map(),
  };

  return {
    players: new Map([
      [PlayerId.PLAYER_1, player1State],
      [PlayerId.PLAYER_2, player2State],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.MAIN,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 3,
    },
  };
}

// Helper to create a test card instance
function createTestCard(
  id: string,
  owner: PlayerId,
  category: CardCategory,
  power: number = 5000,
  cost: number = 5,
  keywords: string[] = []
): CardInstance {
  return {
    id,
    definition: {
      id: `card-def-${id}`,
      name: `Test Card ${id}`,
      category,
      colors: ['RED'],
      typeTags: [],
      attributes: [],
      basePower: power,
      baseCost: cost,
      lifeValue: null,
      counterValue: null,
      rarity: 'C',
      keywords,
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner,
    controller: owner,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

// Helper to create a DON instance
function createTestDon(id: string, owner: PlayerId, state: CardState = CardState.ACTIVE): DonInstance {
  return {
    id,
    owner,
    zone: ZoneId.COST_AREA,
    state,
  };
}

// Default balanced weights for testing
const balancedWeights: EvaluationWeights = {
  boardControl: 0.25,
  resourceEfficiency: 0.20,
  lifeDifferential: 0.25,
  cardAdvantage: 0.15,
  tempo: 0.15,
};

describe('ActionEvaluator', () => {
  let evaluator: ActionEvaluator;
  let state: GameState;

  beforeEach(() => {
    evaluator = new ActionEvaluator(balancedWeights);
    state = createTestGameState();
  });

  describe('evaluateBoardControl', () => {
    it('should return 0 when both players have no characters', () => {
      const score = evaluator.evaluateBoardControl(state, PlayerId.PLAYER_1);
      expect(score).toBe(0);
    });

    it('should return positive score when player has more characters', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000));
      player1.zones.characterArea.push(createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 4000));

      const score = evaluator.evaluateBoardControl(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(0);
    });

    it('should return negative score when opponent has more characters', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 6000));
      player2.zones.characterArea.push(createTestCard('c2', PlayerId.PLAYER_2, CardCategory.CHARACTER, 7000));

      const score = evaluator.evaluateBoardControl(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThan(0);
    });

    it('should consider total power of characters', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Player 1 has one strong character
      player1.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 10000));

      // Player 2 has two weak characters
      player2.zones.characterArea.push(createTestCard('c2', PlayerId.PLAYER_2, CardCategory.CHARACTER, 3000));
      player2.zones.characterArea.push(createTestCard('c3', PlayerId.PLAYER_2, CardCategory.CHARACTER, 3000));

      const score = evaluator.evaluateBoardControl(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(0); // Player 1 has more total power
    });

    it('should account for DON bonuses on characters', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const card = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      
      // Add 2 DON to the character (each DON adds 1000 power)
      card.givenDon.push(createTestDon('d1', PlayerId.PLAYER_1));
      card.givenDon.push(createTestDon('d2', PlayerId.PLAYER_1));
      
      player1.zones.characterArea.push(card);

      const score = evaluator.evaluateBoardControl(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(0);
    });

    it('should be capped at -100 to 100 range', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add many powerful characters
      for (let i = 0; i < 5; i++) {
        player1.zones.characterArea.push(createTestCard(`c${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER, 10000));
      }

      const score = evaluator.evaluateBoardControl(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(-100);
    });
  });

  describe('evaluateResourceEfficiency', () => {
    it('should return negative score when player has no DON', () => {
      const score = evaluator.evaluateResourceEfficiency(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThan(0); // No DON means poor resource efficiency
    });

    it('should favor DON attached to characters over unused DON', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add character with DON attached
      const card = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      card.givenDon.push(createTestDon('d1', PlayerId.PLAYER_1));
      card.givenDon.push(createTestDon('d2', PlayerId.PLAYER_1));
      player1.zones.characterArea.push(card);
      
      // Add some unused DON
      player1.zones.costArea.push(createTestDon('d3', PlayerId.PLAYER_1, CardState.ACTIVE));

      const score = evaluator.evaluateResourceEfficiency(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(-50); // Should be positive or near zero
    });

    it('should penalize having all DON unused', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add only unused DON
      player1.zones.costArea.push(createTestDon('d1', PlayerId.PLAYER_1, CardState.ACTIVE));
      player1.zones.costArea.push(createTestDon('d2', PlayerId.PLAYER_1, CardState.ACTIVE));
      player1.zones.costArea.push(createTestDon('d3', PlayerId.PLAYER_1, CardState.ACTIVE));

      const score = evaluator.evaluateResourceEfficiency(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThan(0);
    });

    it('should be capped at -100 to 100 range', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add many DON attached to characters
      const card = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      for (let i = 0; i < 10; i++) {
        card.givenDon.push(createTestDon(`d${i}`, PlayerId.PLAYER_1));
      }
      player1.zones.characterArea.push(card);

      const score = evaluator.evaluateResourceEfficiency(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(-100);
    });
  });

  describe('evaluateLifeDifferential', () => {
    it('should return 0 when both players have equal life', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Both have 5 life
      for (let i = 0; i < 5; i++) {
        player1.zones.life.push(createTestCard(`l1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
        player2.zones.life.push(createTestCard(`l2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateLifeDifferential(state, PlayerId.PLAYER_1);
      expect(score).toBe(0);
    });

    it('should return positive score when player has more life', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Player 1 has 5 life, Player 2 has 2 life
      for (let i = 0; i < 5; i++) {
        player1.zones.life.push(createTestCard(`l1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }
      for (let i = 0; i < 2; i++) {
        player2.zones.life.push(createTestCard(`l2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateLifeDifferential(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(0);
      expect(score).toBe(60); // (5 - 2) * 20 = 60
    });

    it('should return negative score when opponent has more life', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Player 1 has 2 life, Player 2 has 5 life
      for (let i = 0; i < 2; i++) {
        player1.zones.life.push(createTestCard(`l1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }
      for (let i = 0; i < 5; i++) {
        player2.zones.life.push(createTestCard(`l2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateLifeDifferential(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThan(0);
      expect(score).toBe(-60); // (2 - 5) * 20 = -60
    });

    it('should be capped at -100 to 100 range', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player 1 has 10 life, Player 2 has 0 life
      for (let i = 0; i < 10; i++) {
        player1.zones.life.push(createTestCard(`l1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateLifeDifferential(state, PlayerId.PLAYER_1);
      expect(score).toBe(100); // Capped at 100
    });
  });

  describe('evaluateCardAdvantage', () => {
    it('should return 0 when both players have equal cards', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Both have 5 cards in hand and 40 in deck
      for (let i = 0; i < 5; i++) {
        player1.zones.hand.push(createTestCard(`h1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
        player2.zones.hand.push(createTestCard(`h2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }
      for (let i = 0; i < 40; i++) {
        player1.zones.deck.push(createTestCard(`d1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
        player2.zones.deck.push(createTestCard(`d2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateCardAdvantage(state, PlayerId.PLAYER_1);
      expect(score).toBe(0);
    });

    it('should return positive score when player has more cards in hand', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Player 1 has 7 cards, Player 2 has 3 cards
      for (let i = 0; i < 7; i++) {
        player1.zones.hand.push(createTestCard(`h1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }
      for (let i = 0; i < 3; i++) {
        player2.zones.hand.push(createTestCard(`h2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateCardAdvantage(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(0);
    });

    it('should return negative score when opponent has more cards', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Player 1 has 2 cards, Player 2 has 6 cards
      for (let i = 0; i < 2; i++) {
        player1.zones.hand.push(createTestCard(`h1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }
      for (let i = 0; i < 6; i++) {
        player2.zones.hand.push(createTestCard(`h2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateCardAdvantage(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThan(0);
    });

    it('should consider deck size but weight it less than hand size', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Equal hands
      for (let i = 0; i < 5; i++) {
        player1.zones.hand.push(createTestCard(`h1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
        player2.zones.hand.push(createTestCard(`h2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }
      
      // Player 1 has more cards in deck
      for (let i = 0; i < 40; i++) {
        player1.zones.deck.push(createTestCard(`d1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }
      for (let i = 0; i < 20; i++) {
        player2.zones.deck.push(createTestCard(`d2-${i}`, PlayerId.PLAYER_2, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateCardAdvantage(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(30); // Should be small since deck difference is weighted less
    });

    it('should be capped at -100 to 100 range', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player 1 has many cards
      for (let i = 0; i < 20; i++) {
        player1.zones.hand.push(createTestCard(`h1-${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }

      const score = evaluator.evaluateCardAdvantage(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(-100);
    });
  });

  describe('evaluateTempo', () => {
    it('should return negative score when player has no active characters or DON', () => {
      const score = evaluator.evaluateTempo(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThan(0);
    });

    it('should return higher score when player has active characters and DON', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add active characters
      player1.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      player1.zones.characterArea.push(createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      
      // Add available DON
      player1.zones.costArea.push(createTestDon('d1', PlayerId.PLAYER_1, CardState.ACTIVE));
      player1.zones.costArea.push(createTestDon('d2', PlayerId.PLAYER_1, CardState.ACTIVE));

      const score = evaluator.evaluateTempo(state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(-50); // Should be better than having nothing
    });

    it('should not count rested characters as tempo', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add rested character
      const card = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER);
      card.state = CardState.RESTED;
      player1.zones.characterArea.push(card);

      const score = evaluator.evaluateTempo(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThan(0); // No active characters
    });

    it('should value active characters more than available DON', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Scenario 1: 2 active characters, no DON
      player1.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      player1.zones.characterArea.push(createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      const score1 = evaluator.evaluateTempo(state, PlayerId.PLAYER_1);
      
      // Scenario 2: No characters, 3 DON
      player1.zones.characterArea = [];
      player1.zones.costArea.push(createTestDon('d1', PlayerId.PLAYER_1, CardState.ACTIVE));
      player1.zones.costArea.push(createTestDon('d2', PlayerId.PLAYER_1, CardState.ACTIVE));
      player1.zones.costArea.push(createTestDon('d3', PlayerId.PLAYER_1, CardState.ACTIVE));
      const score2 = evaluator.evaluateTempo(state, PlayerId.PLAYER_1);
      
      expect(score1).toBeGreaterThan(score2); // Active characters worth more than DON
    });

    it('should be capped at -100 to 100 range', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add many active characters and DON
      for (let i = 0; i < 5; i++) {
        player1.zones.characterArea.push(createTestCard(`c${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }
      for (let i = 0; i < 10; i++) {
        player1.zones.costArea.push(createTestDon(`d${i}`, PlayerId.PLAYER_1, CardState.ACTIVE));
      }

      const score = evaluator.evaluateTempo(state, PlayerId.PLAYER_1);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(-100);
    });
  });

  describe('evaluatePlayCard', () => {
    it('should score cards based on power-to-cost ratio', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add DON so cards can be afforded
      for (let i = 0; i < 6; i++) {
        player1.zones.costArea.push(createTestDon(`d${i}`, PlayerId.PLAYER_1, CardState.ACTIVE));
      }
      
      // Efficient card: 5000 power for 3 cost
      const efficientCard = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 3);
      efficientCard.zone = ZoneId.HAND;
      
      // Inefficient card: 3000 power for 5 cost
      const inefficientCard = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 3000, 5);
      inefficientCard.zone = ZoneId.HAND;
      
      const score1 = evaluator.evaluatePlayCard(efficientCard, state, PlayerId.PLAYER_1);
      const score2 = evaluator.evaluatePlayCard(inefficientCard, state, PlayerId.PLAYER_1);
      
      expect(score1).toBeGreaterThan(score2);
    });

    it('should highly value Rush keyword cards', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add DON so cards can be afforded
      for (let i = 0; i < 6; i++) {
        player1.zones.costArea.push(createTestDon(`d${i}`, PlayerId.PLAYER_1, CardState.ACTIVE));
      }
      
      const rushCard = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5, ['Rush']);
      rushCard.zone = ZoneId.HAND;
      
      const normalCard = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5);
      normalCard.zone = ZoneId.HAND;
      
      const rushScore = evaluator.evaluatePlayCard(rushCard, state, PlayerId.PLAYER_1);
      const normalScore = evaluator.evaluatePlayCard(normalCard, state, PlayerId.PLAYER_1);
      
      expect(rushScore).toBeGreaterThan(normalScore);
      expect(rushScore - normalScore).toBeGreaterThanOrEqual(25); // Rush bonus
    });

    it('should value Rush even more when opponent is low on life', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Add DON so card can be afforded
      for (let i = 0; i < 6; i++) {
        player1.zones.costArea.push(createTestDon(`d${i}`, PlayerId.PLAYER_1, CardState.ACTIVE));
      }
      
      // Opponent has only 2 life
      player2.zones.life.push(createTestCard('l1', PlayerId.PLAYER_2, CardCategory.CHARACTER));
      player2.zones.life.push(createTestCard('l2', PlayerId.PLAYER_2, CardCategory.CHARACTER));
      
      const rushCard = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5, ['Rush']);
      rushCard.zone = ZoneId.HAND;
      
      const score = evaluator.evaluatePlayCard(rushCard, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(40); // High score for potential lethal
    });

    it('should value cards with On Play effects', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add DON so cards can be afforded
      for (let i = 0; i < 6; i++) {
        player1.zones.costArea.push(createTestDon(`d${i}`, PlayerId.PLAYER_1, CardState.ACTIVE));
      }
      
      const cardWithEffect = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5);
      cardWithEffect.zone = ZoneId.HAND;
      cardWithEffect.definition.effects = [{
        id: 'effect1',
        label: '[On Play]',
        timingType: 'AUTO' as any,
        triggerTiming: 'ON_PLAY' as any,
        condition: null,
        cost: null,
        scriptId: 'draw_card',
        oncePerTurn: false,
      }];
      
      const normalCard = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5);
      normalCard.zone = ZoneId.HAND;
      
      const effectScore = evaluator.evaluatePlayCard(cardWithEffect, state, PlayerId.PLAYER_1);
      const normalScore = evaluator.evaluatePlayCard(normalCard, state, PlayerId.PLAYER_1);
      
      expect(effectScore).toBeGreaterThan(normalScore);
    });

    it('should value Double Attack keyword', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add DON so cards can be afforded
      for (let i = 0; i < 6; i++) {
        player1.zones.costArea.push(createTestDon(`d${i}`, PlayerId.PLAYER_1, CardState.ACTIVE));
      }
      
      const doubleAttackCard = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5, ['Double Attack']);
      doubleAttackCard.zone = ZoneId.HAND;
      
      const normalCard = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5);
      normalCard.zone = ZoneId.HAND;
      
      const doubleScore = evaluator.evaluatePlayCard(doubleAttackCard, state, PlayerId.PLAYER_1);
      const normalScore = evaluator.evaluatePlayCard(normalCard, state, PlayerId.PLAYER_1);
      
      expect(doubleScore).toBeGreaterThan(normalScore);
    });

    it('should return -100 when board is full', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Fill the board (max 5 characters)
      for (let i = 0; i < 5; i++) {
        player1.zones.characterArea.push(createTestCard(`c${i}`, PlayerId.PLAYER_1, CardCategory.CHARACTER));
      }
      
      const card = createTestCard('c6', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5);
      card.zone = ZoneId.HAND;
      
      const score = evaluator.evaluatePlayCard(card, state, PlayerId.PLAYER_1);
      expect(score).toBe(-100);
    });

    it('should return -100 when player cannot afford the card', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player has only 2 DON
      player1.zones.costArea.push(createTestDon('d1', PlayerId.PLAYER_1, CardState.ACTIVE));
      player1.zones.costArea.push(createTestDon('d2', PlayerId.PLAYER_1, CardState.ACTIVE));
      
      // Card costs 5
      const expensiveCard = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 8000, 5);
      expensiveCard.zone = ZoneId.HAND;
      
      const score = evaluator.evaluatePlayCard(expensiveCard, state, PlayerId.PLAYER_1);
      expect(score).toBe(-100);
    });

    it('should prefer leaving some DON for reactive plays', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player has 5 DON
      for (let i = 0; i < 5; i++) {
        player1.zones.costArea.push(createTestDon(`d${i}`, PlayerId.PLAYER_1, CardState.ACTIVE));
      }
      
      // Card that uses all DON
      const expensiveCard = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 8000, 5);
      expensiveCard.zone = ZoneId.HAND;
      
      // Card that leaves DON
      const cheapCard = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 3);
      cheapCard.zone = ZoneId.HAND;
      
      const expensiveScore = evaluator.evaluatePlayCard(expensiveCard, state, PlayerId.PLAYER_1);
      const cheapScore = evaluator.evaluatePlayCard(cheapCard, state, PlayerId.PLAYER_1);
      
      // Cheap card should score higher due to leaving resources
      expect(cheapScore).toBeGreaterThan(expensiveScore - 10);
    });
  });

  describe('evaluateAttack', () => {
    it('should highly value attacking leader', () => {
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      
      const score = evaluator.evaluateAttack(attacker, 'leader', state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(30); // Base value for leader attack
    });

    it('should massively value lethal attacks on leader', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Opponent has only 1 life
      player2.zones.life.push(createTestCard('l1', PlayerId.PLAYER_2, CardCategory.CHARACTER));
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      
      const score = evaluator.evaluateAttack(attacker, 'leader', state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(100); // Winning attack
    });

    it('should value Double Attack on leader attacks', () => {
      const doubleAttacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5, ['Double Attack']);
      
      const score = evaluator.evaluateAttack(doubleAttacker, 'leader', state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(70); // High value for double damage
    });

    it('should reduce score when opponent has stronger blockers', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Add blocker that's stronger than attacker
      const blocker = createTestCard('b1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 8000, 5, ['Blocker']);
      player2.zones.characterArea.push(blocker);
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      
      const scoreWithBlocker = evaluator.evaluateAttack(attacker, 'leader', state, PlayerId.PLAYER_1);
      
      // Compare to no blocker scenario
      player2.zones.characterArea = [];
      const scoreNoBlocker = evaluator.evaluateAttack(attacker, 'leader', state, PlayerId.PLAYER_1);
      
      expect(scoreWithBlocker).toBeLessThan(scoreNoBlocker); // Reduced due to blocker threat
    });

    it('should value removing high-power characters', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      const strongTarget = createTestCard('t1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 8000);
      player2.zones.characterArea.push(strongTarget);
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 9000);
      
      const score = evaluator.evaluateAttack(attacker, strongTarget, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(20); // Value for removing strong character
    });

    it('should prefer winning battles over losing battles', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      const target = createTestCard('t1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 5000);
      player2.zones.characterArea.push(target);
      
      // Attacker that wins
      const strongAttacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 7000);
      const winScore = evaluator.evaluateAttack(strongAttacker, target, state, PlayerId.PLAYER_1);
      
      // Attacker that loses
      const weakAttacker = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 3000);
      const loseScore = evaluator.evaluateAttack(weakAttacker, target, state, PlayerId.PLAYER_1);
      
      expect(winScore).toBeGreaterThan(loseScore);
    });

    it('should value mutual destruction trades based on card value', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      const target = createTestCard('t1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 5000, 7); // Expensive
      player2.zones.characterArea.push(target);
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 3); // Cheap
      
      const score = evaluator.evaluateAttack(attacker, target, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(10); // Good trade
    });

    it('should value attacking rested characters', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      const restedTarget = createTestCard('t1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 5000);
      restedTarget.state = CardState.RESTED;
      player2.zones.characterArea.push(restedTarget);
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 6000);
      
      const score = evaluator.evaluateAttack(attacker, restedTarget, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(30); // Bonus for rested target
    });

    it('should value removing characters with DON investment', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      const target = createTestCard('t1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 5000);
      target.givenDon.push(createTestDon('d1', PlayerId.PLAYER_2));
      target.givenDon.push(createTestDon('d2', PlayerId.PLAYER_2));
      player2.zones.characterArea.push(target);
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 8000);
      
      const score = evaluator.evaluateAttack(attacker, target, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(25); // Value for removing DON investment
    });
  });

  describe('evaluateGiveDon', () => {
    it('should prioritize active characters over rested ones', () => {
      const activeChar = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      activeChar.state = CardState.ACTIVE;
      
      const restedChar = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      restedChar.state = CardState.RESTED;
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      const activeScore = evaluator.evaluateGiveDon(don, activeChar, state, PlayerId.PLAYER_1);
      const restedScore = evaluator.evaluateGiveDon(don, restedChar, state, PlayerId.PLAYER_1);
      
      expect(activeScore).toBeGreaterThan(restedScore);
    });

    it('should highly value DON on characters that can attack for lethal', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Opponent has 1 life
      player2.zones.life.push(createTestCard('l1', PlayerId.PLAYER_2, CardCategory.CHARACTER));
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      attacker.state = CardState.ACTIVE;
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      const score = evaluator.evaluateGiveDon(don, attacker, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(70); // High value for potential lethal
    });

    it('should value DON on Rush characters', () => {
      const rushChar = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5, ['Rush']);
      rushChar.state = CardState.ACTIVE;
      
      const normalChar = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      normalChar.state = CardState.ACTIVE;
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      const rushScore = evaluator.evaluateGiveDon(don, rushChar, state, PlayerId.PLAYER_1);
      const normalScore = evaluator.evaluateGiveDon(don, normalChar, state, PlayerId.PLAYER_1);
      
      expect(rushScore).toBeGreaterThan(normalScore);
    });

    it('should highly value DON on Double Attack characters', () => {
      const doubleChar = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5, ['Double Attack']);
      doubleChar.state = CardState.ACTIVE;
      
      const normalChar = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      normalChar.state = CardState.ACTIVE;
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      const doubleScore = evaluator.evaluateGiveDon(don, doubleChar, state, PlayerId.PLAYER_1);
      const normalScore = evaluator.evaluateGiveDon(don, normalChar, state, PlayerId.PLAYER_1);
      
      expect(doubleScore).toBeGreaterThan(normalScore);
    });

    it('should value DON that enables winning battles', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Opponent has a 6000 power character
      const opponentChar = createTestCard('t1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 6000);
      player2.zones.characterArea.push(opponentChar);
      
      // Our character has 5000 power, DON would make it 6000
      const ourChar = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      ourChar.state = CardState.ACTIVE;
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      const score = evaluator.evaluateGiveDon(don, ourChar, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(40); // Bonus for enabling battle win
    });

    it('should value DON on Blocker characters', () => {
      const blockerChar = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000, 5, ['Blocker']);
      
      const normalChar = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      const blockerScore = evaluator.evaluateGiveDon(don, blockerChar, state, PlayerId.PLAYER_1);
      const normalScore = evaluator.evaluateGiveDon(don, normalChar, state, PlayerId.PLAYER_1);
      
      expect(blockerScore).toBeGreaterThan(normalScore);
    });

    it('should value first DON on a character more than subsequent DON', () => {
      const char = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      char.state = CardState.ACTIVE;
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      // First DON
      const firstScore = evaluator.evaluateGiveDon(don, char, state, PlayerId.PLAYER_1);
      
      // Add DON to character
      char.givenDon.push(createTestDon('d2', PlayerId.PLAYER_1));
      char.givenDon.push(createTestDon('d3', PlayerId.PLAYER_1));
      
      // Third DON
      const thirdScore = evaluator.evaluateGiveDon(don, char, state, PlayerId.PLAYER_1);
      
      expect(firstScore).toBeGreaterThan(thirdScore);
    });

    it('should penalize over-investing in low-cost characters', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      const cheapChar = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 3000, 2);
      cheapChar.state = CardState.ACTIVE;
      cheapChar.givenDon.push(createTestDon('d1', PlayerId.PLAYER_1));
      cheapChar.givenDon.push(createTestDon('d2', PlayerId.PLAYER_1));
      player1.zones.characterArea.push(cheapChar);
      
      const don = createTestDon('d3', PlayerId.PLAYER_1);
      
      const score = evaluator.evaluateGiveDon(don, cheapChar, state, PlayerId.PLAYER_1);
      
      // Compare to first DON on same character
      const freshChar = createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER, 3000, 2);
      freshChar.state = CardState.ACTIVE;
      const firstDonScore = evaluator.evaluateGiveDon(don, freshChar, state, PlayerId.PLAYER_1);
      
      expect(score).toBeLessThan(firstDonScore); // Lower score for over-investment
    });

    it('should value DON on leader for defense when opponent can attack', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Create leader
      const leader = createTestCard('l1', PlayerId.PLAYER_1, CardCategory.LEADER, 5000);
      player1.zones.leaderArea = leader;
      
      // Opponent has active characters
      const opponentChar = createTestCard('t1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 6000);
      opponentChar.state = CardState.ACTIVE;
      player2.zones.characterArea.push(opponentChar);
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      
      const score = evaluator.evaluateGiveDon(don, leader, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(10); // Defensive value
    });
  });

  describe('evaluateActivateEffect', () => {
    it('should value draw effects when hand is low', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player has only 1 card in hand
      player1.zones.hand.push(createTestCard('h1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      
      const effect = { label: 'Draw 2 cards' };
      
      const score = evaluator.evaluateActivateEffect(effect, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(30); // High value when hand is low
    });

    it('should value removal effects when opponent has board presence', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Opponent has multiple characters
      player2.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_2, CardCategory.CHARACTER, 7000));
      player2.zones.characterArea.push(createTestCard('c2', PlayerId.PLAYER_2, CardCategory.CHARACTER, 6000));
      player2.zones.characterArea.push(createTestCard('c3', PlayerId.PLAYER_2, CardCategory.CHARACTER, 5000));
      
      const effect = { label: 'K.O. a character' };
      
      const score = evaluator.evaluateActivateEffect(effect, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(50); // High value for removal
    });

    it('should value power boost effects when we have active characters', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player has active characters
      player1.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      player1.zones.characterArea.push(createTestCard('c2', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      
      const effect = { label: '+2000 power' };
      
      const score = evaluator.evaluateActivateEffect(effect, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(20); // Value for power boost
    });

    it('should highly value life damage effects when opponent is low', () => {
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      
      // Opponent has 1 life
      player2.zones.life.push(createTestCard('l1', PlayerId.PLAYER_2, CardCategory.CHARACTER));
      
      const effect = { label: 'Deal 1 life damage to opponent' };
      
      const score = evaluator.evaluateActivateEffect(effect, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(100); // Winning effect
    });

    it('should value life gain effects when player is low on life', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player has 2 life
      player1.zones.life.push(createTestCard('l1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      player1.zones.life.push(createTestCard('l2', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      
      const effect = { label: 'Add 1 life' };
      
      const score = evaluator.evaluateActivateEffect(effect, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(30); // High value when low on life
    });

    it('should value search effects', () => {
      const effect = { label: 'Search your deck' };
      
      const score = evaluator.evaluateActivateEffect(effect, state, PlayerId.PLAYER_1);
      expect(score).toBeGreaterThan(20); // Card selection is valuable
    });

    it('should reduce score for effects with costs', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Player has small hand
      player1.zones.hand.push(createTestCard('h1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      player1.zones.hand.push(createTestCard('h2', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      
      const effectWithCost = { 
        label: 'Draw 2 cards',
        cost: { trash: 1 }
      };
      
      const effectNoCost = { label: 'Draw 2 cards' };
      
      const scoreWithCost = evaluator.evaluateActivateEffect(effectWithCost, state, PlayerId.PLAYER_1);
      const scoreNoCost = evaluator.evaluateActivateEffect(effectNoCost, state, PlayerId.PLAYER_1);
      
      expect(scoreWithCost).toBeLessThan(scoreNoCost);
    });

    it('should value once per turn effects higher', () => {
      const oncePerTurnEffect = { 
        label: 'Draw 1 card',
        oncePerTurn: true
      };
      
      const regularEffect = { 
        label: 'Draw 1 card',
        oncePerTurn: false
      };
      
      const onceScore = evaluator.evaluateActivateEffect(oncePerTurnEffect, state, PlayerId.PLAYER_1);
      const regularScore = evaluator.evaluateActivateEffect(regularEffect, state, PlayerId.PLAYER_1);
      
      expect(onceScore).toBeGreaterThan(regularScore);
    });
  });

  describe('simulateAction', () => {
    it('should create a copy of the game state', () => {
      const action: GameAction = {
        type: ActionType.PASS_PRIORITY,
        playerId: PlayerId.PLAYER_1,
        data: {},
        timestamp: Date.now(),
      };
      
      const simulated = evaluator.simulateAction(action, state);
      
      expect(simulated).not.toBe(state);
      expect(simulated.players).not.toBe(state.players);
    });

    it('should simulate playing a card from hand to character area', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      const card = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      card.zone = ZoneId.HAND;
      player1.zones.hand.push(card);
      
      const action: GameAction = {
        type: ActionType.PLAY_CARD,
        playerId: PlayerId.PLAYER_1,
        data: { cardId: 'c1' },
        timestamp: Date.now(),
      };
      
      const simulated = evaluator.simulateAction(action, state);
      const simulatedPlayer = simulated.players.get(PlayerId.PLAYER_1)!;
      
      expect(simulatedPlayer.zones.hand.length).toBe(0);
      expect(simulatedPlayer.zones.characterArea.length).toBe(1);
      expect(simulatedPlayer.zones.characterArea[0].id).toBe('c1');
    });

    it('should simulate giving DON to a character', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      const don = createTestDon('d1', PlayerId.PLAYER_1);
      player1.zones.costArea.push(don);
      
      const card = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      player1.zones.characterArea.push(card);
      
      const action: GameAction = {
        type: ActionType.GIVE_DON,
        playerId: PlayerId.PLAYER_1,
        data: { donId: 'd1', targetCardId: 'c1' },
        timestamp: Date.now(),
      };
      
      const simulated = evaluator.simulateAction(action, state);
      const simulatedPlayer = simulated.players.get(PlayerId.PLAYER_1)!;
      const simulatedCard = simulatedPlayer.zones.characterArea[0];
      
      expect(simulatedCard.givenDon.length).toBe(1);
      expect(simulatedCard.givenDon[0].id).toBe('d1');
    });

    it('should simulate declaring an attack by resting the attacker', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      const attacker = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      attacker.state = CardState.ACTIVE;
      player1.zones.characterArea.push(attacker);
      
      const action: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        data: { attackerId: 'c1', targetId: 'leader' },
        timestamp: Date.now(),
      };
      
      const simulated = evaluator.simulateAction(action, state);
      const simulatedPlayer = simulated.players.get(PlayerId.PLAYER_1)!;
      const simulatedAttacker = simulatedPlayer.zones.characterArea[0];
      
      expect(simulatedAttacker.state).toBe(CardState.RESTED);
    });

    it('should not modify the original state', () => {
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      const card = createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      card.zone = ZoneId.HAND;
      player1.zones.hand.push(card);
      
      const originalHandSize = player1.zones.hand.length;
      const originalCharAreaSize = player1.zones.characterArea.length;
      
      const action: GameAction = {
        type: ActionType.PLAY_CARD,
        playerId: PlayerId.PLAYER_1,
        data: { cardId: 'c1' },
        timestamp: Date.now(),
      };
      
      evaluator.simulateAction(action, state);
      
      // Original state should be unchanged
      expect(player1.zones.hand.length).toBe(originalHandSize);
      expect(player1.zones.characterArea.length).toBe(originalCharAreaSize);
    });
  });

  describe('compareStates', () => {
    it('should detect board control changes', () => {
      const before = createTestGameState();
      const after = createTestGameState();
      
      // Add character in after state
      const afterPlayer = after.players.get(PlayerId.PLAYER_1)!;
      afterPlayer.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000));
      
      const factors = evaluator.compareStates(before, after, PlayerId.PLAYER_1);
      
      expect(factors.boardControl).toBeGreaterThan(0);
    });

    it('should detect life differential changes', () => {
      const before = createTestGameState();
      const after = createTestGameState();
      
      // Add life to player in after state
      const afterPlayer = after.players.get(PlayerId.PLAYER_1)!;
      afterPlayer.zones.life.push(createTestCard('l1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      
      const factors = evaluator.compareStates(before, after, PlayerId.PLAYER_1);
      
      expect(factors.lifeDifferential).toBeGreaterThan(0);
    });

    it('should detect card advantage changes', () => {
      const before = createTestGameState();
      const after = createTestGameState();
      
      // Add cards to hand in after state
      const afterPlayer = after.players.get(PlayerId.PLAYER_1)!;
      afterPlayer.zones.hand.push(createTestCard('h1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      afterPlayer.zones.hand.push(createTestCard('h2', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      
      const factors = evaluator.compareStates(before, after, PlayerId.PLAYER_1);
      
      expect(factors.cardAdvantage).toBeGreaterThan(0);
    });

    it('should detect tempo changes', () => {
      const before = createTestGameState();
      const after = createTestGameState();
      
      // Add active character and DON in after state
      const afterPlayer = after.players.get(PlayerId.PLAYER_1)!;
      afterPlayer.zones.characterArea.push(createTestCard('c1', PlayerId.PLAYER_1, CardCategory.CHARACTER));
      afterPlayer.zones.costArea.push(createTestDon('d1', PlayerId.PLAYER_1, CardState.ACTIVE));
      
      const factors = evaluator.compareStates(before, after, PlayerId.PLAYER_1);
      
      expect(factors.tempo).toBeGreaterThan(0);
    });

    it('should return all factors in the result', () => {
      const before = createTestGameState();
      const after = createTestGameState();
      
      const factors = evaluator.compareStates(before, after, PlayerId.PLAYER_1);
      
      expect(factors).toHaveProperty('boardControl');
      expect(factors).toHaveProperty('resourceEfficiency');
      expect(factors).toHaveProperty('lifeDifferential');
      expect(factors).toHaveProperty('cardAdvantage');
      expect(factors).toHaveProperty('tempo');
    });
  });
});

