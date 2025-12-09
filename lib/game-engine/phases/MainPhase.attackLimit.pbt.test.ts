/**
 * Property-Based Tests for Character Attack Limit
 * 
 * Feature: ai-battle-integration, Property 45: Character Attack Limit
 * Validates: Requirements 30.3
 * 
 * Property: For any character, it should not be able to attack more than once per turn
 * (unless it has a special ability).
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
  state: CardState = CardState.ACTIVE,
  keywords: string[] = []
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
      keywords,
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
 * Arbitrary for generating character power
 */
const powerArb = fc.integer({ min: 1000, max: 10000 });

/**
 * Arbitrary for generating character cost
 */
const costArb = fc.integer({ min: 1, max: 10 });

describe('MainPhase - Character Attack Limit (Property 45)', () => {
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
  });

  it('Property 45: A character cannot attack more than once per turn', () => {
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

        // Find attack actions for this specific character
        const characterAttackActions = initialAttackActions.filter(
          a => (a as any).data?.attackerId === character.id
        );

        // Character should be able to attack (at least the leader)
        expect(characterAttackActions.length).toBeGreaterThanOrEqual(1);

        // Mark character as having attacked
        const updatedState = stateManager.markCardAttacked(character.id);
        const updatedZoneManager = new ZoneManager(updatedState, eventEmitter);

        // Get legal actions after attack
        const actionsAfterAttack = getLegalActions(updatedState, PlayerId.PLAYER_1, updatedZoneManager);
        const attackActionsAfterAttack = actionsAfterAttack.filter(a => a.type === ActionType.DECLARE_ATTACK);

        // Find attack actions for this specific character after it has attacked
        const characterAttackActionsAfter = attackActionsAfterAttack.filter(
          a => (a as any).data?.attackerId === character.id
        );

        // Character should NOT be able to attack again
        expect(characterAttackActionsAfter.length).toBe(0);

        // Property holds: Character cannot attack more than once per turn
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 45 (Verification): Multiple characters can each attack once', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.array(powerArb, { minLength: 2, maxLength: 5 }),
        fc.array(costArb, { minLength: 2, maxLength: 5 }),
        (numCharacters, powers, costs) => {
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

          stateManager = new GameStateManager(state);

          // Each character should be able to attack once
          let updatedState = stateManager;
          for (const character of characters) {
            const zoneManager = new ZoneManager(updatedState, eventEmitter);
            const actions = getLegalActions(updatedState, PlayerId.PLAYER_1, zoneManager);
            const characterAttacks = actions.filter(
              a => a.type === ActionType.DECLARE_ATTACK && (a as any).data?.attackerId === character.id
            );

            // Character should be able to attack
            expect(characterAttacks.length).toBeGreaterThanOrEqual(1);

            // Mark as attacked
            updatedState = updatedState.markCardAttacked(character.id);

            // Verify character cannot attack again
            const zoneManagerAfter = new ZoneManager(updatedState, eventEmitter);
            const actionsAfter = getLegalActions(updatedState, PlayerId.PLAYER_1, zoneManagerAfter);
            const characterAttacksAfter = actionsAfter.filter(
              a => a.type === ActionType.DECLARE_ATTACK && (a as any).data?.attackerId === character.id
            );

            // Character should NOT be able to attack again
            expect(characterAttacksAfter.length).toBe(0);
          }

          // Property holds: Each character can attack exactly once
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 45 (Edge Case): Rested character cannot attack even if not attacked yet', () => {
    fc.assert(
      fc.property(powerArb, costArb, (power, cost) => {
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

        // Create a RESTED character (cannot attack)
        const restedCharacter = createTestCard(
          'char-p1-rested',
          PlayerId.PLAYER_1,
          CardCategory.CHARACTER,
          power,
          cost,
          CardState.RESTED // RESTED state
        );
        player1.zones.characterArea.push(restedCharacter);

        stateManager = new GameStateManager(state);
        const zoneManager = new ZoneManager(stateManager, eventEmitter);

        // Get legal actions
        const actions = getLegalActions(stateManager, PlayerId.PLAYER_1, zoneManager);
        const restedCharacterAttacks = actions.filter(
          a => a.type === ActionType.DECLARE_ATTACK && (a as any).data?.attackerId === restedCharacter.id
        );

        // Rested character should NOT be able to attack (even though it hasn't attacked yet)
        expect(restedCharacterAttacks.length).toBe(0);

        // Verify the character is not marked as having attacked
        expect(stateManager.hasCardAttackedThisTurn(restedCharacter.id)).toBe(false);

        // Property holds: Rested characters cannot attack regardless of attack tracking
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 45 (Edge Case): Character with Rush keyword can attack when rested', () => {
    fc.assert(
      fc.property(powerArb, costArb, (power, cost) => {
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

        // Create a RESTED character with Rush keyword (can attack even when rested)
        const rushCharacter = createTestCard(
          'char-p1-rush',
          PlayerId.PLAYER_1,
          CardCategory.CHARACTER,
          power,
          cost,
          CardState.RESTED, // RESTED state
          ['Rush'] // Has Rush keyword
        );
        player1.zones.characterArea.push(rushCharacter);

        stateManager = new GameStateManager(state);
        const zoneManager = new ZoneManager(stateManager, eventEmitter);

        // Get legal actions
        const actions = getLegalActions(stateManager, PlayerId.PLAYER_1, zoneManager);
        const rushCharacterAttacks = actions.filter(
          a => a.type === ActionType.DECLARE_ATTACK && (a as any).data?.attackerId === rushCharacter.id
        );

        // Rush character SHOULD be able to attack even when rested
        expect(rushCharacterAttacks.length).toBeGreaterThanOrEqual(1);

        // Mark as attacked
        const updatedState = stateManager.markCardAttacked(rushCharacter.id);
        const updatedZoneManager = new ZoneManager(updatedState, eventEmitter);

        // Get legal actions after attack
        const actionsAfter = getLegalActions(updatedState, PlayerId.PLAYER_1, updatedZoneManager);
        const rushCharacterAttacksAfter = actionsAfter.filter(
          a => a.type === ActionType.DECLARE_ATTACK && (a as any).data?.attackerId === rushCharacter.id
        );

        // Rush character should NOT be able to attack again (even with Rush)
        expect(rushCharacterAttacksAfter.length).toBe(0);

        // Property holds: Rush allows attacking when rested, but still limited to once per turn
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
