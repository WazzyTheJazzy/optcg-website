/**
 * StrategyManager.test.ts
 * 
 * Tests for the StrategyManager implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StrategyManager } from './StrategyManager';
import {
  PlayerId,
  GameState,
  Phase,
  CardState,
  ZoneId,
  CardCategory,
  PlayerState,
} from '../core/types';
import { PlayStyle, DifficultyLevel } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockPlayerState(
  id: PlayerId,
  lifeCount: number = 5,
  handSize: number = 5,
  donCount: number = 5,
  characterCount: number = 2
): PlayerState {
  const hand = Array.from({ length: handSize }, (_, i) => ({
    id: `hand-${i}`,
    definition: {
      id: `card-${i}`,
      name: `Card ${i}`,
      category: CardCategory.CHARACTER,
      colors: ['RED'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner: id,
    controller: id,
    zone: ZoneId.HAND,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  }));

  const life = Array.from({ length: lifeCount }, (_, i) => ({
    id: `life-${i}`,
    definition: {
      id: `life-card-${i}`,
      name: `Life Card ${i}`,
      category: CardCategory.CHARACTER,
      colors: ['RED'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner: id,
    controller: id,
    zone: ZoneId.LIFE,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  }));

  const costArea = Array.from({ length: donCount }, (_, i) => ({
    id: `don-${i}`,
    owner: id,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  }));

  const characterArea = Array.from({ length: characterCount }, (_, i) => ({
    id: `char-${i}`,
    definition: {
      id: `char-def-${i}`,
      name: `Character ${i}`,
      category: CardCategory.CHARACTER,
      colors: ['RED'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner: id,
    controller: id,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  }));

  return {
    id,
    zones: {
      deck: [],
      hand,
      trash: [],
      life,
      donDeck: [],
      costArea,
      characterArea,
      leaderArea: null,
      stageArea: null,
    },
    flags: new Map(),
  };
}

function createMockGameState(
  player1Life: number = 5,
  player2Life: number = 5,
  player1Hand: number = 5,
  player2Hand: number = 5,
  player1Don: number = 5,
  player2Don: number = 5,
  player1Board: number = 2,
  player2Board: number = 2
): GameState {
  const player1 = createMockPlayerState(PlayerId.PLAYER_1, player1Life, player1Hand, player1Don, player1Board);
  const player2 = createMockPlayerState(PlayerId.PLAYER_2, player2Life, player2Hand, player2Don, player2Board);

  return {
    players: new Map([
      [PlayerId.PLAYER_1, player1],
      [PlayerId.PLAYER_2, player2],
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

// ============================================================================
// Tests
// ============================================================================

describe('StrategyManager', () => {
  let manager: StrategyManager;

  beforeEach(() => {
    manager = new StrategyManager();
  });

  describe('constructor', () => {
    it('should initialize with balanced strategy', () => {
      const weights = manager.getWeights();
      
      expect(weights).toBeDefined();
      expect(weights.boardControl).toBeCloseTo(0.25);
      expect(weights.resourceEfficiency).toBeCloseTo(0.20);
      expect(weights.lifeDifferential).toBeCloseTo(0.25);
      expect(weights.cardAdvantage).toBeCloseTo(0.15);
      expect(weights.tempo).toBeCloseTo(0.15);
    });

    it('should have all weights sum to 1.0', () => {
      const weights = manager.getWeights();
      const sum = 
        weights.boardControl +
        weights.resourceEfficiency +
        weights.lifeDifferential +
        weights.cardAdvantage +
        weights.tempo;
      
      expect(sum).toBeCloseTo(1.0);
    });
  });

  describe('setStrategy', () => {
    it('should set aggressive strategy', () => {
      manager.setStrategy('aggressive', 'medium');
      const weights = manager.getWeights();
      
      // Aggressive should prioritize life differential
      expect(weights.lifeDifferential).toBeGreaterThan(weights.boardControl);
      expect(weights.lifeDifferential).toBeGreaterThan(weights.cardAdvantage);
    });

    it('should set defensive strategy', () => {
      manager.setStrategy('defensive', 'medium');
      const weights = manager.getWeights();
      
      // Defensive should prioritize board control and card advantage
      expect(weights.boardControl).toBeGreaterThan(weights.tempo);
      expect(weights.cardAdvantage).toBeGreaterThan(weights.tempo);
    });

    it('should set balanced strategy', () => {
      manager.setStrategy('balanced', 'medium');
      const weights = manager.getWeights();
      
      // Balanced should have relatively even distribution
      expect(weights.boardControl).toBeCloseTo(0.25, 1);
      expect(weights.lifeDifferential).toBeCloseTo(0.25, 1);
    });

    it('should throw error for unknown play style', () => {
      expect(() => {
        manager.setStrategy('unknown' as PlayStyle, 'medium');
      }).toThrow('Unknown play style');
    });

    it('should adjust weights for easy difficulty', () => {
      manager.setStrategy('aggressive', 'easy');
      const weights = manager.getWeights();
      
      // Easy difficulty should flatten weights (less specialized)
      const maxWeight = Math.max(
        weights.boardControl,
        weights.resourceEfficiency,
        weights.lifeDifferential,
        weights.cardAdvantage,
        weights.tempo
      );
      const minWeight = Math.min(
        weights.boardControl,
        weights.resourceEfficiency,
        weights.lifeDifferential,
        weights.cardAdvantage,
        weights.tempo
      );
      
      // Difference should be smaller for easy difficulty
      expect(maxWeight - minWeight).toBeLessThan(0.25);
    });

    it('should sharpen weights for hard difficulty', () => {
      manager.setStrategy('aggressive', 'hard');
      const weights = manager.getWeights();
      
      // Hard difficulty should amplify differences (more specialized)
      // Life differential should be even more dominant for aggressive
      expect(weights.lifeDifferential).toBeGreaterThan(0.35);
    });

    it('should maintain weight sum of 1.0 after difficulty adjustment', () => {
      const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
      const playStyles: PlayStyle[] = ['aggressive', 'defensive', 'balanced'];
      
      for (const difficulty of difficulties) {
        for (const playStyle of playStyles) {
          manager.setStrategy(playStyle, difficulty);
          const weights = manager.getWeights();
          const sum = 
            weights.boardControl +
            weights.resourceEfficiency +
            weights.lifeDifferential +
            weights.cardAdvantage +
            weights.tempo;
          
          expect(sum).toBeCloseTo(1.0, 5);
        }
      }
    });
  });

  describe('getWeights', () => {
    it('should return a copy of weights', () => {
      const weights1 = manager.getWeights();
      const weights2 = manager.getWeights();
      
      // Should be equal but not the same object
      expect(weights1).toEqual(weights2);
      expect(weights1).not.toBe(weights2);
    });

    it('should not allow external modification', () => {
      const weights = manager.getWeights();
      const originalBoardControl = weights.boardControl;
      
      weights.boardControl = 0.99;
      
      const newWeights = manager.getWeights();
      expect(newWeights.boardControl).toBe(originalBoardControl);
    });
  });

  describe('getCurrentProfile', () => {
    it('should return current strategy profile', () => {
      manager.setStrategy('aggressive', 'medium');
      const profile = manager.getCurrentProfile();
      
      expect(profile.name).toBe('Aggressive');
      expect(profile.aggressiveness).toBeGreaterThan(0.5);
      expect(profile.riskTolerance).toBeGreaterThan(0.5);
    });

    it('should return a copy of the profile', () => {
      const profile1 = manager.getCurrentProfile();
      const profile2 = manager.getCurrentProfile();
      
      expect(profile1).toEqual(profile2);
      expect(profile1).not.toBe(profile2);
    });
  });

  describe('adjustForGameState - life advantage', () => {
    it('should increase aggression with life advantage', () => {
      manager.setStrategy('balanced', 'medium');
      const initialWeights = manager.getWeights();
      
      // Create state with life advantage (5 vs 2)
      const state = createMockGameState(5, 2);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const adjustedWeights = manager.getWeights();
      
      // Should prioritize life differential and tempo more
      expect(adjustedWeights.lifeDifferential).toBeGreaterThan(initialWeights.lifeDifferential);
      expect(adjustedWeights.tempo).toBeGreaterThan(initialWeights.tempo);
    });

    it('should increase defense with life disadvantage', () => {
      manager.setStrategy('balanced', 'medium');
      const initialWeights = manager.getWeights();
      
      // Create state with life disadvantage (2 vs 5)
      const state = createMockGameState(2, 5);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const adjustedWeights = manager.getWeights();
      
      // Should prioritize board control and card advantage more
      expect(adjustedWeights.boardControl).toBeGreaterThan(initialWeights.boardControl);
      expect(adjustedWeights.cardAdvantage).toBeGreaterThan(initialWeights.cardAdvantage);
    });

    it('should maintain balanced strategy with equal life', () => {
      manager.setStrategy('balanced', 'medium');
      const initialWeights = manager.getWeights();
      
      // Create state with equal life (5 vs 5)
      const state = createMockGameState(5, 5);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const adjustedWeights = manager.getWeights();
      
      // Weights should be similar (small adjustments from other factors)
      expect(adjustedWeights.boardControl).toBeCloseTo(initialWeights.boardControl, 1);
      expect(adjustedWeights.lifeDifferential).toBeCloseTo(initialWeights.lifeDifferential, 1);
    });
  });

  describe('adjustForGameState - resources', () => {
    it('should adjust for abundant DON', () => {
      manager.setStrategy('balanced', 'medium');
      
      // Create state with abundant DON (10 DON)
      const state = createMockGameState(5, 5, 5, 5, 10, 5);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should prioritize tempo with abundant resources
      expect(weights.tempo).toBeGreaterThan(0.15);
    });

    it('should adjust for limited DON', () => {
      manager.setStrategy('balanced', 'medium');
      
      // Create state with limited DON (2 DON)
      const state = createMockGameState(5, 5, 5, 5, 2, 5);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should prioritize resource efficiency with limited resources
      expect(weights.resourceEfficiency).toBeGreaterThan(0.20);
    });

    it('should adjust for low hand size', () => {
      manager.setStrategy('balanced', 'medium');
      
      // Create state with low hand size (1 card)
      const state = createMockGameState(5, 5, 1, 5);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should prioritize card advantage when hand is low
      expect(weights.cardAdvantage).toBeGreaterThan(0.15);
    });

    it('should adjust for high hand size', () => {
      manager.setStrategy('balanced', 'medium');
      
      // Create state with high hand size (7 cards)
      const state = createMockGameState(5, 5, 7, 5);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should prioritize tempo when hand is full
      expect(weights.tempo).toBeGreaterThan(0.15);
    });
  });

  describe('adjustForGameState - board state', () => {
    it('should adjust for board advantage', () => {
      manager.setStrategy('balanced', 'medium');
      
      // Create state with board advantage (4 vs 1 characters)
      const state = createMockGameState(5, 5, 5, 5, 5, 5, 4, 1);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should prioritize tempo and life differential to press advantage
      expect(weights.tempo).toBeGreaterThan(0.15);
      expect(weights.lifeDifferential).toBeGreaterThan(0.25);
    });

    it('should adjust for board disadvantage', () => {
      manager.setStrategy('balanced', 'medium');
      
      // Create state with board disadvantage (1 vs 4 characters)
      const state = createMockGameState(5, 5, 5, 5, 5, 5, 1, 4);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should prioritize board control to stabilize
      expect(weights.boardControl).toBeGreaterThan(0.25);
    });

    it('should adjust when board is nearly full', () => {
      manager.setStrategy('balanced', 'medium');
      const initialWeights = manager.getWeights();
      
      // Create state with nearly full board (4 characters)
      const state = createMockGameState(5, 5, 5, 5, 5, 5, 4, 2);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should reduce board control priority when board is nearly full
      expect(weights.boardControl).toBeLessThan(initialWeights.boardControl);
      // Should increase tempo to use existing board
      expect(weights.tempo).toBeGreaterThan(initialWeights.tempo);
    });
  });

  describe('adjustForGameState - combined factors', () => {
    it('should handle multiple adjustments correctly', () => {
      manager.setStrategy('balanced', 'medium');
      
      // Create complex state: life advantage, low DON, board disadvantage
      const state = createMockGameState(5, 2, 5, 5, 2, 5, 1, 4);
      manager.adjustForGameState(state, PlayerId.PLAYER_1);
      
      const weights = manager.getWeights();
      
      // Should balance multiple priorities
      expect(weights.lifeDifferential).toBeGreaterThan(0.20); // Life advantage
      expect(weights.resourceEfficiency).toBeGreaterThan(0.15); // Low DON
      expect(weights.boardControl).toBeGreaterThan(0.20); // Board disadvantage
    });

    it('should maintain weight sum of 1.0 after adjustments', () => {
      const testCases = [
        createMockGameState(5, 2, 1, 7, 10, 2, 4, 1), // Extreme advantage
        createMockGameState(2, 5, 7, 1, 2, 10, 1, 4), // Extreme disadvantage
        createMockGameState(5, 5, 5, 5, 5, 5, 2, 2), // Balanced
      ];

      for (const state of testCases) {
        manager.setStrategy('balanced', 'medium');
        manager.adjustForGameState(state, PlayerId.PLAYER_1);
        
        const weights = manager.getWeights();
        const sum = 
          weights.boardControl +
          weights.resourceEfficiency +
          weights.lifeDifferential +
          weights.cardAdvantage +
          weights.tempo;
        
        expect(sum).toBeCloseTo(1.0, 5);
      }
    });
  });

  describe('strategy profiles', () => {
    it('should have distinct aggressive profile characteristics', () => {
      manager.setStrategy('aggressive', 'medium');
      const profile = manager.getCurrentProfile();
      
      expect(profile.name).toBe('Aggressive');
      expect(profile.aggressiveness).toBeGreaterThan(0.7);
      expect(profile.riskTolerance).toBeGreaterThan(0.6);
      expect(profile.weights.lifeDifferential).toBeGreaterThan(0.30);
    });

    it('should have distinct defensive profile characteristics', () => {
      manager.setStrategy('defensive', 'medium');
      const profile = manager.getCurrentProfile();
      
      expect(profile.name).toBe('Defensive');
      expect(profile.aggressiveness).toBeLessThan(0.4);
      expect(profile.riskTolerance).toBeLessThan(0.4);
      expect(profile.weights.boardControl).toBeGreaterThan(0.25);
    });

    it('should have distinct balanced profile characteristics', () => {
      manager.setStrategy('balanced', 'medium');
      const profile = manager.getCurrentProfile();
      
      expect(profile.name).toBe('Balanced');
      expect(profile.aggressiveness).toBeCloseTo(0.5, 1);
      expect(profile.riskTolerance).toBeCloseTo(0.5, 1);
    });
  });
});
