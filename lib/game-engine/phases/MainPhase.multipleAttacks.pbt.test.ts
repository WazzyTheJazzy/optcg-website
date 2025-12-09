/**
 * Property-Based Tests for Multiple Attacks Per Turn
 * 
 * Feature: ai-battle-integration, Property 11: Multiple Attacks Per Turn
 * Validates: Requirements 7.5
 * 
 * Property: For any main phase, multiple attack actions should be executable 
 * as long as different characters are attacking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import { getLegalActions } from './MainPhase';
import {
  PlayerId,
  CardInstance,
  CardCategory,
  CardState,
  ZoneId,
  Color,
  ActionType,
  Phase,
} from '../core/types';

/**
 * Helper to create a test card instance
 */
function createTestCard(
  id: string,
  owner: PlayerId,
  category: CardCategory,
  power: number,
  cost: number,
  state: CardState = CardState.ACTIVE
): CardInstance {
  return {
    id,
    definition: {
      id: `def-${id}`,
      name: `Card ${id}`,
      category,
      colors: [Color.RED],
      typeTags: [],
      attributes: [],
      basePower: power,
      baseCost: cost,
      lifeValue: category === CardCategory.LEADER ? 5 : null,
      counterValue: category === CardCategory.CHARACTER ? 1000 : null,
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
    owner,
    controller: owner,
    zone: category === CardCategory.LEADER ? ZoneId.LEADER_AREA : ZoneId.CHARACTER_AREA,
    state,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

/**
 * Arbitrary for generating a number of characters (1-5)
 */
const characterCountArb = fc.integer({ min: 1, max: 5 });

/**
 * Arbitrary for generating character power
 */
const powerArb = fc.integer({ min: 1000, max: 10000 });

/**
 * Arbitrary for generating character cost
 */
const costArb = fc.integer({ min: 1, max: 10 });

describe('MainPhase - Multiple Attacks Per Turn (Property 11)', () => {
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
  });

  it('Property 11: Multiple attack actions should be executable with different characters', () => {
    fc.assert(
      fc.property(
        characterCountArb,
        fc.array(powerArb, { minLength: 1, maxLength: 5 }),
        fc.array(costArb, { minLength: 1, maxLength: 5 }),
        (numCharacters, powers, costs) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Set to main phase
          stateManager = stateManager.setPhase(Phase.MAIN);
          stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

          // Create leaders for both players
          const player1Leader = createTestCard(
            'leader-p1',
            PlayerId.PLAYER_1,
            CardCategory.LEADER,
            5000,
            0,
            CardState.ACTIVE
          );
          const player2Leader = createTestCard(
            'leader-p2',
            PlayerId.PLAYER_2,
            CardCategory.LEADER,
            5000,
            0,
            CardState.ACTIVE
          );

          // Add leaders to state by modifying the state directly (since we need to set up test data)
          const state = stateManager.getState();
          const player1 = state.players.get(PlayerId.PLAYER_1)!;
          const player2 = state.players.get(PlayerId.PLAYER_2)!;
          player1.zones.leaderArea = player1Leader;
          player2.zones.leaderArea = player2Leader;

          // Create multiple active characters for player 1
          const characters: CardInstance[] = [];
          for (let i = 0; i < numCharacters; i++) {
            const power = powers[i % powers.length];
            const cost = costs[i % costs.length];
            const character = createTestCard(
              `char-p1-${i}`,
              PlayerId.PLAYER_1,
              CardCategory.CHARACTER,
              power,
              cost,
              CardState.ACTIVE
            );
            characters.push(character);
            player1.zones.characterArea.push(character);
          }

          // Create a new GameStateManager with the modified state
          stateManager = new GameStateManager(state);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          // Get initial legal actions
          const initialActions = getLegalActions(stateManager, PlayerId.PLAYER_1, zoneManager);
          const initialAttackActions = initialActions.filter(a => a.type === ActionType.DECLARE_ATTACK);

          // Each character should be able to attack the opponent's leader
          // So we expect numCharacters attack actions (one per character)
          expect(initialAttackActions.length).toBeGreaterThanOrEqual(numCharacters);

          // Simulate marking each character as having attacked
          let updatedState = stateManager;
          const attackedCharacters: string[] = [];

          for (const character of characters) {
            // Mark this character as having attacked
            updatedState = updatedState.markCardAttacked(character.id);
            attackedCharacters.push(character.id);

            // Create a new ZoneManager with the updated state
            const updatedZoneManager = new ZoneManager(updatedState, eventEmitter);

            // Get legal actions after marking this character as attacked
            const actionsAfterAttack = getLegalActions(updatedState, PlayerId.PLAYER_1, updatedZoneManager);
            const attackActionsAfterAttack = actionsAfterAttack.filter(a => a.type === ActionType.DECLARE_ATTACK);

            // The number of available attack actions should decrease by the number of targets
            // (since this character can no longer attack any target)
            // Each character can attack the leader, so we lose 1 attack action per character marked
            // Plus the leader itself can also attack (1 additional attack action)
            const expectedRemainingAttacks = (numCharacters - attackedCharacters.length) + 1; // +1 for leader
            expect(attackActionsAfterAttack.length).toBe(expectedRemainingAttacks);

            // Verify that the attacked character is not in the available attack actions
            const attackersInActions = new Set(
              attackActionsAfterAttack.map(a => (a as any).data?.attackerId).filter(Boolean)
            );
            expect(attackersInActions.has(character.id)).toBe(false);
          }

          // After all characters have attacked, there should still be attack actions for the leader
          // (unless we also mark the leader as having attacked)
          const finalZoneManager = new ZoneManager(updatedState, eventEmitter);
          const finalActions = getLegalActions(updatedState, PlayerId.PLAYER_1, finalZoneManager);
          const finalAttackActions = finalActions.filter(a => a.type === ActionType.DECLARE_ATTACK);
          
          // The leader can still attack, so we expect 1 attack action
          expect(finalAttackActions.length).toBe(1);
          
          // Verify it's the leader's attack
          const leaderAttack = finalAttackActions[0];
          expect((leaderAttack as any).data?.attackerId).toBe('leader-p1');

          // Property holds: Multiple different characters can attack in the same turn
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11 (Edge Case): Single character can only attack once', () => {
    fc.assert(
      fc.property(powerArb, costArb, (power, cost) => {
        // Create initial game state
        const initialState = createInitialGameState();
        let stateManager = new GameStateManager(initialState);

        // Set to main phase
        stateManager = stateManager.setPhase(Phase.MAIN);
        stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

        // Create leaders for both players
        const player1Leader = createTestCard(
          'leader-p1',
          PlayerId.PLAYER_1,
          CardCategory.LEADER,
          5000,
          0,
          CardState.ACTIVE
        );
        const player2Leader = createTestCard(
          'leader-p2',
          PlayerId.PLAYER_2,
          CardCategory.LEADER,
          5000,
          0,
          CardState.ACTIVE
        );

        // Add leaders to state
        const state = stateManager.getState();
        const player1 = state.players.get(PlayerId.PLAYER_1)!;
        const player2 = state.players.get(PlayerId.PLAYER_2)!;
        player1.zones.leaderArea = player1Leader;
        player2.zones.leaderArea = player2Leader;

        // Create one active character for player 1
        const character = createTestCard(
          'char-p1-0',
          PlayerId.PLAYER_1,
          CardCategory.CHARACTER,
          power,
          cost,
          CardState.ACTIVE
        );
        player1.zones.characterArea.push(character);

        stateManager = new GameStateManager(state);
        const zoneManager = new ZoneManager(stateManager, eventEmitter);

        // Get initial legal actions
        const initialActions = getLegalActions(stateManager, PlayerId.PLAYER_1, zoneManager);
        const initialAttackActions = initialActions.filter(a => a.type === ActionType.DECLARE_ATTACK);

        // Should have at least 1 attack action (character attacking leader)
        expect(initialAttackActions.length).toBeGreaterThanOrEqual(1);

        // Mark character as having attacked
        const updatedState = stateManager.markCardAttacked(character.id);

        // Create a new ZoneManager with the updated state
        const updatedZoneManager = new ZoneManager(updatedState, eventEmitter);

        // Get legal actions after attack
        const actionsAfterAttack = getLegalActions(updatedState, PlayerId.PLAYER_1, updatedZoneManager);
        const attackActionsAfterAttack = actionsAfterAttack.filter(a => a.type === ActionType.DECLARE_ATTACK);

        // Should have 1 attack action remaining (the leader can still attack)
        expect(attackActionsAfterAttack.length).toBe(1);
        
        // Verify the character cannot attack anymore
        const attackersInActions = new Set(
          attackActionsAfterAttack.map(a => (a as any).data?.attackerId).filter(Boolean)
        );
        expect(attackersInActions.has(character.id)).toBe(false);
        expect(attackersInActions.has('leader-p1')).toBe(true);

        // Property holds: A single character cannot attack twice
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11 (Verification): Attack tracking is cleared at turn end', () => {
    fc.assert(
      fc.property(characterCountArb, fc.array(powerArb, { minLength: 1, maxLength: 5 }), (numCharacters, powers) => {
        // Create initial game state
        const initialState = createInitialGameState();
        let stateManager = new GameStateManager(initialState);

        // Set to main phase
        stateManager = stateManager.setPhase(Phase.MAIN);
        stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

        // Create leaders
        const player1Leader = createTestCard(
          'leader-p1',
          PlayerId.PLAYER_1,
          CardCategory.LEADER,
          5000,
          0,
          CardState.ACTIVE
        );
        const player2Leader = createTestCard(
          'leader-p2',
          PlayerId.PLAYER_2,
          CardCategory.LEADER,
          5000,
          0,
          CardState.ACTIVE
        );

        // Add leaders to state
        const state = stateManager.getState();
        const player1 = state.players.get(PlayerId.PLAYER_1)!;
        const player2 = state.players.get(PlayerId.PLAYER_2)!;
        player1.zones.leaderArea = player1Leader;
        player2.zones.leaderArea = player2Leader;

        // Create multiple active characters for player 1
        for (let i = 0; i < numCharacters; i++) {
          const power = powers[i % powers.length];
          const character = createTestCard(
            `char-p1-${i}`,
            PlayerId.PLAYER_1,
            CardCategory.CHARACTER,
            power,
            3,
            CardState.ACTIVE
          );
          player1.zones.characterArea.push(character);
        }

        // Create a new GameStateManager with the modified state
        stateManager = new GameStateManager(state);

        // Mark characters as having attacked
        for (let i = 0; i < numCharacters; i++) {
          stateManager = stateManager.markCardAttacked(`char-p1-${i}`);
        }

        // Verify characters are marked as attacked
        for (let i = 0; i < numCharacters; i++) {
          expect(stateManager.hasCardAttackedThisTurn(`char-p1-${i}`)).toBe(true);
        }

        // Clear attack tracking (simulating turn end)
        stateManager = stateManager.clearAttackedThisTurn();

        // Verify all characters can attack again
        for (let i = 0; i < numCharacters; i++) {
          expect(stateManager.hasCardAttackedThisTurn(`char-p1-${i}`)).toBe(false);
        }

        // Property holds: Attack tracking is properly cleared
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
