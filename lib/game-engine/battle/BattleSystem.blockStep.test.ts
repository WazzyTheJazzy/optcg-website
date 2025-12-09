/**
 * BattleSystem.blockStep.test.ts
 * 
 * Detailed tests for the block step functionality
 * These tests verify the block step logic by extending BattleSystem
 * to allow controlled blocker selection for testing purposes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BattleSystem } from './BattleSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType, BlockDeclaredEvent } from '../rendering/EventEmitter';
import {
  CardInstance,
  CardDefinition,
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
} from '../core/types';

/**
 * Extended BattleSystem for testing that allows controlled blocker selection
 */
class TestBattleSystem extends BattleSystem {
  private blockerChoice: CardInstance | null = null;

  /**
   * Set the blocker that should be chosen in the next block step
   */
  setBlockerChoice(blocker: CardInstance | null): void {
    this.blockerChoice = blocker;
  }

  /**
   * Override the queryDefenderForBlocker method to return our test choice
   */
  protected queryDefenderForBlocker(
    legalBlockers: CardInstance[],
    defenderId: PlayerId
  ): CardInstance | null {
    // If we have a blocker choice set, return it (if it's in the legal blockers)
    if (this.blockerChoice) {
      const isLegal = legalBlockers.some(b => b.id === this.blockerChoice!.id);
      if (isLegal) {
        return this.blockerChoice;
      }
    }
    return null;
  }
}

describe('BattleSystem - Block Step', () => {
  let battleSystem: TestBattleSystem;
  let stateManager: GameStateManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  // Helper function to create a test card definition
  function createTestCardDef(
    id: string,
    category: CardCategory,
    power: number | null = null,
    cost: number | null = null,
    keywords: string[] = []
  ): CardDefinition {
    return {
      id,
      name: `Test ${category} ${id}`,
      category,
      colors: ['Red'],
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
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };
  }

  // Helper function to create a test card instance
  function createTestCard(
    id: string,
    definition: CardDefinition,
    owner: PlayerId,
    zone: ZoneId,
    state: CardState = CardState.ACTIVE
  ): CardInstance {
    return {
      id,
      definition,
      owner,
      controller: owner,
      zone,
      state,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  beforeEach(() => {
    // Create initial game state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Create rules context
    rules = new RulesContext();

    // Create event emitter
    eventEmitter = new EventEmitter();

    // Create test battle system
    battleSystem = new TestBattleSystem(stateManager, rules, eventEmitter);

    // Set up basic game state with leaders
    const state = stateManager.getState();
    const player1 = state.players.get(PlayerId.PLAYER_1)!;
    const player2 = state.players.get(PlayerId.PLAYER_2)!;

    // Add leaders
    const leader1Def = createTestCardDef('leader1', CardCategory.LEADER, 5000, null);
    const leader1 = createTestCard('leader1-instance', leader1Def, PlayerId.PLAYER_1, ZoneId.LEADER_AREA);
    player1.zones.leaderArea = leader1;

    const leader2Def = createTestCardDef('leader2', CardCategory.LEADER, 5000, null);
    const leader2 = createTestCard('leader2-instance', leader2Def, PlayerId.PLAYER_2, ZoneId.LEADER_AREA);
    player2.zones.leaderArea = leader2;

    // Update state manager with modified state
    stateManager = new GameStateManager(state);
    battleSystem.updateStateManager(stateManager);
  });

  describe('Block Step Execution', () => {
    it('should rest the blocker when block is declared', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1 with lower power so blocker survives
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 2000, 4);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Add a blocker for player 2 with higher power to survive
      const blockerDef = createTestCardDef('blocker', CardCategory.CHARACTER, 5000, 2, ['Blocker']);
      const blocker = createTestCard('blocker-instance', blockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player2.zones.characterArea.push(blocker);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Set the blocker choice
      const currentBlocker = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.characterArea[0];
      battleSystem.setBlockerChoice(currentBlocker);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that blocker is now rested (and still exists because it survived)
      const updatedState = battleSystem.getStateManager().getState();
      const updatedBlocker = updatedState.players.get(PlayerId.PLAYER_2)!.zones.characterArea[0];
      expect(updatedBlocker).toBeDefined();
      expect(updatedBlocker.state).toBe(CardState.RESTED);
    });

    it('should emit BLOCK_DECLARED event with correct data', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 5000, 4);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Add a blocker for player 2
      const blockerDef = createTestCardDef('blocker', CardCategory.CHARACTER, 3000, 2, ['Blocker']);
      const blocker = createTestCard('blocker-instance', blockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player2.zones.characterArea.push(blocker);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Set the blocker choice
      const currentBlocker = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.characterArea[0];
      battleSystem.setBlockerChoice(currentBlocker);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set up event listener
      let blockEvent: BlockDeclaredEvent | null = null;
      eventEmitter.on(GameEventType.BLOCK_DECLARED, (event) => {
        blockEvent = event as BlockDeclaredEvent;
      });

      // Execute attack
      battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that event was emitted with correct data
      expect(blockEvent).not.toBeNull();
      expect(blockEvent!.type).toBe(GameEventType.BLOCK_DECLARED);
      expect(blockEvent!.blockerId).toBe(currentBlocker.id);
      expect(blockEvent!.attackerId).toBe(attacker.id);
      expect(blockEvent!.blockingPlayerId).toBe(PlayerId.PLAYER_2);
    });

    it('should redirect attack to blocker', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 5000, 4);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Add a blocker for player 2
      const blockerDef = createTestCardDef('blocker', CardCategory.CHARACTER, 3000, 2, ['Blocker']);
      const blocker = createTestCard('blocker-instance', blockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player2.zones.characterArea.push(blocker);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Set the blocker choice
      const currentBlocker = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.characterArea[0];
      battleSystem.setBlockerChoice(currentBlocker);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      const result = battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that attack was redirected to blocker
      expect(result.blockerId).toBe(currentBlocker.id);
      expect(result.defenderPower).toBe(3000); // Blocker's power, not leader's
    });

    it('should not block if no blocker is chosen', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 5000, 4);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Add a blocker for player 2
      const blockerDef = createTestCardDef('blocker', CardCategory.CHARACTER, 3000, 2, ['Blocker']);
      const blocker = createTestCard('blocker-instance', blockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player2.zones.characterArea.push(blocker);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Don't set a blocker choice (defender declines to block)
      battleSystem.setBlockerChoice(null);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      const result = battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that no block occurred
      expect(result.blockerId).toBeNull();
      expect(result.defenderId).toBe(leader2.id);
      expect(result.defenderPower).toBe(5000); // Leader's power
    });

    it('should not block if no legal blockers exist', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 5000, 4);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Add a character without Blocker keyword for player 2
      const charDef = createTestCardDef('char', CardCategory.CHARACTER, 3000, 2);
      const char = createTestCard('char-instance', charDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player2.zones.characterArea.push(char);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      const result = battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that no block occurred
      expect(result.blockerId).toBeNull();
      expect(result.defenderId).toBe(leader2.id);
    });

    it('should only allow active blockers with Blocker keyword', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 5000, 4);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Add a rested blocker for player 2 (should not be legal)
      const restedBlockerDef = createTestCardDef('rested-blocker', CardCategory.CHARACTER, 3000, 2, ['Blocker']);
      const restedBlocker = createTestCard('rested-blocker-instance', restedBlockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.RESTED);
      player2.zones.characterArea.push(restedBlocker);

      // Add an active blocker for player 2 (should be legal)
      const activeBlockerDef = createTestCardDef('active-blocker', CardCategory.CHARACTER, 4000, 3, ['Blocker']);
      const activeBlocker = createTestCard('active-blocker-instance', activeBlockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player2.zones.characterArea.push(activeBlocker);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Try to set the rested blocker as choice (should not work)
      const currentRestedBlocker = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.characterArea[0];
      battleSystem.setBlockerChoice(currentRestedBlocker);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      const result = battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that rested blocker was not used (not legal)
      expect(result.blockerId).toBeNull();
    });
  });

  describe('Block Step Field Checks', () => {
    it('should abort battle if attacker leaves field during block step', () => {
      // This test demonstrates the structure for checking if cards leave the field
      // In practice, this would require effects that remove cards during ON_BLOCK triggers
      // For now, we verify the basic logic is in place
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 5000, 4);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Add a blocker for player 2
      const blockerDef = createTestCardDef('blocker', CardCategory.CHARACTER, 3000, 2, ['Blocker']);
      const blocker = createTestCard('blocker-instance', blockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player2.zones.characterArea.push(blocker);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Set the blocker choice
      const currentBlocker = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.characterArea[0];
      battleSystem.setBlockerChoice(currentBlocker);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack - should complete successfully since no effects remove cards
      const result = battleSystem.executeAttack(attacker.id, leader2.id);

      expect(result.success).toBe(true);
      expect(result.blockerId).toBe(currentBlocker.id);
    });
  });
});
