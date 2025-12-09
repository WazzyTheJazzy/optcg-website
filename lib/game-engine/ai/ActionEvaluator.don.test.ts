/**
 * Tests for DON management logic in ActionEvaluator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionEvaluator } from './ActionEvaluator';
import { STRATEGY_WEIGHTS } from './types';
import {
  GameState,
  PlayerId,
  CardInstance,
  CardState,
  CardCategory,
  Phase,
} from '../core/types';

describe('ActionEvaluator - DON Management', () => {
  let evaluator: ActionEvaluator;
  let baseState: GameState;

  beforeEach(() => {
    evaluator = new ActionEvaluator(STRATEGY_WEIGHTS.balanced);

    // Create a minimal game state for testing
    baseState = {
      phase: Phase.MAIN,
      activePlayer: PlayerId.PLAYER_1,
      turnNumber: 1,
      players: new Map([
        [
          PlayerId.PLAYER_1,
          {
            id: PlayerId.PLAYER_1,
            zones: {
              deck: [],
              hand: [],
              trash: [],
              life: [
                { id: 'life1', owner: PlayerId.PLAYER_1 } as any,
                { id: 'life2', owner: PlayerId.PLAYER_1 } as any,
                { id: 'life3', owner: PlayerId.PLAYER_1 } as any,
                { id: 'life4', owner: PlayerId.PLAYER_1 } as any,
                { id: 'life5', owner: PlayerId.PLAYER_1 } as any,
              ],
              donDeck: [],
              costArea: [
                { id: 'don1', owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE } as any,
                { id: 'don2', owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE } as any,
                { id: 'don3', owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE } as any,
              ],
              characterArea: [],
              leaderArea: {
                id: 'leader1',
                owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
                zone: 'LEADER_AREA' as any,
                givenDon: [],
                definition: {
                  id: 'OP01-001',
                  name: 'Test Leader',
                  category: CardCategory.LEADER,
                  basePower: 5000,
                  baseCost: 0,
                  keywords: [],
                  effects: [],
                } as any,
                modifiers: [],
                flags: new Map(),
              } as CardInstance,
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
              hand: [],
              trash: [],
              life: [
                { id: 'life1', owner: PlayerId.PLAYER_2 } as any,
                { id: 'life2', owner: PlayerId.PLAYER_2 } as any,
                { id: 'life3', owner: PlayerId.PLAYER_2 } as any,
              ],
              donDeck: [],
              costArea: [],
              characterArea: [],
              leaderArea: {
                id: 'leader2',
                owner: PlayerId.PLAYER_2, controller: PlayerId.PLAYER_2, state: CardState.ACTIVE,
                zone: 'LEADER_AREA' as any,
                givenDon: [],
                definition: {
                  id: 'OP01-002',
                  name: 'Opponent Leader',
                  category: CardCategory.LEADER,
                  basePower: 5000,
                  baseCost: 0,
                  keywords: [],
                  effects: [],
                } as any,
                modifiers: [],
                flags: new Map(),
              } as CardInstance,
            },
            flags: new Map(),
          },
        ],
      ]),
      pendingTriggers: [],
      history: [],
      loopGuardState: {
        counters: new Map(),
        maxIterations: 1000,
      },
    } as GameState;
  });

  describe('distributeDon', () => {
    it('should prioritize active characters over rested characters', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      
      // Add an active character and a rested character
      player.zones.characterArea = [
        {
          id: 'char1',
          owner: PlayerId.PLAYER_1,
          controller: PlayerId.PLAYER_1,
          state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-003',
            name: 'Active Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
        {
          id: 'char2',
          owner: PlayerId.PLAYER_1,
          controller: PlayerId.PLAYER_1,
          state: CardState.RESTED,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-004',
            name: 'Rested Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      // Should have at least one DON assignment
      expect(distribution.length).toBeGreaterThan(0);
      
      // First assignment should be to the active character
      expect(distribution[0].targetCardId).toBe('char1');
    });

    it('should prioritize Rush characters', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      
      player.zones.characterArea = [
        {
          id: 'char1',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-003',
            name: 'Normal Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
        {
          id: 'char2',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-005',
            name: 'Rush Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: ['Rush'],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      expect(distribution.length).toBeGreaterThan(0);
      
      // First assignment should be to Rush character (highest priority)
      expect(distribution[0].targetCardId).toBe('char2');
      expect(distribution[0].reason).toContain('Rush');
    });

    it('should prioritize DON for lethal damage', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      const opponent = baseState.players.get(PlayerId.PLAYER_2)!;
      
      // Opponent has only 1 life
      opponent.zones.life = [{ id: 'life1', owner: PlayerId.PLAYER_2 } as any];
      
      player.zones.characterArea = [
        {
          id: 'char1',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-003',
            name: 'Attacker',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      expect(distribution.length).toBeGreaterThan(0);
      
      // Should have high score due to lethal potential
      expect(distribution[0].score).toBeGreaterThan(80);
      expect(distribution[0].reason).toContain('lethal');
    });

    it('should give excess DON to leader for defense', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      const opponent = baseState.players.get(PlayerId.PLAYER_2)!;
      
      // Add opponent active character
      opponent.zones.characterArea = [
        {
          id: 'oppChar1',
          owner: PlayerId.PLAYER_2, controller: PlayerId.PLAYER_2, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-010',
            name: 'Opponent Attacker',
            category: CardCategory.CHARACTER,
            basePower: 6000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      // No characters for player, so DON should go to leader
      player.zones.characterArea = [];

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      expect(distribution.length).toBeGreaterThan(0);
      
      // Should assign to leader
      expect(distribution[0].targetCardId).toBe('leader1');
      expect(distribution[0].reason).toContain('leader');
    });

    it('should avoid over-investing in single character', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      
      player.zones.characterArea = [
        {
          id: 'char1',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [
            { id: 'existingDon1', owner: PlayerId.PLAYER_1 } as any,
            { id: 'existingDon2', owner: PlayerId.PLAYER_1 } as any,
            { id: 'existingDon3', owner: PlayerId.PLAYER_1 } as any,
          ],
          definition: {
            id: 'OP01-003',
            name: 'Over-invested Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
        {
          id: 'char2',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-004',
            name: 'Fresh Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      expect(distribution.length).toBeGreaterThan(0);
      
      // Should prefer the character without DON
      const freshCharAssignment = distribution.find(d => d.targetCardId === 'char2');
      expect(freshCharAssignment).toBeDefined();
      
      // Fresh character should have higher priority
      if (distribution.length > 1) {
        expect(distribution[0].targetCardId).toBe('char2');
      }
    });

    it('should reserve DON for high-value card plays', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      
      // Add a high-value card in hand
      player.zones.hand = [
        {
          id: 'handCard1',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'HAND' as any,
          givenDon: [],
          definition: {
            id: 'OP01-020',
            name: 'High Value Card',
            category: CardCategory.CHARACTER,
            basePower: 8000,
            baseCost: 3,
            keywords: ['Rush'],
            effects: [{ triggerTiming: 'ON_PLAY' } as any],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      player.zones.characterArea = [
        {
          id: 'char1',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-003',
            name: 'Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      // Should reserve some DON, so distribution should be limited
      expect(distribution.length).toBeLessThan(3);
    });

    it('should return empty array when no DON available', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      player.zones.costArea = []; // No DON available

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      expect(distribution).toEqual([]);
    });

    it('should return empty array when no targets available', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea = [];
      player.zones.leaderArea = undefined; // No leader

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      expect(distribution).toEqual([]);
    });

    it('should prioritize Double Attack characters', () => {
      const player = baseState.players.get(PlayerId.PLAYER_1)!;
      
      player.zones.characterArea = [
        {
          id: 'char1',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-003',
            name: 'Normal Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 4,
            keywords: [],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
        {
          id: 'char2',
          owner: PlayerId.PLAYER_1, controller: PlayerId.PLAYER_1, state: CardState.ACTIVE,
          zone: 'CHARACTER_AREA' as any,
          givenDon: [],
          definition: {
            id: 'OP01-006',
            name: 'Double Attack Character',
            category: CardCategory.CHARACTER,
            basePower: 5000,
            baseCost: 5,
            keywords: ['Double Attack'],
            effects: [],
          } as any,
          modifiers: [],
          flags: new Map(),
        } as CardInstance,
      ];

      const distribution = evaluator.distributeDon(baseState, PlayerId.PLAYER_1);

      expect(distribution.length).toBeGreaterThan(0);
      
      // First assignment should be to Double Attack character (highest priority)
      expect(distribution[0].targetCardId).toBe('char2');
      expect(distribution[0].reason).toContain('Double Attack');
    });
  });
});


