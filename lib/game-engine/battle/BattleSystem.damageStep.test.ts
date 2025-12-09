/**
 * BattleSystem.damageStep.test.ts
 * 
 * Tests for the BattleSystem damage step functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleSystem } from './BattleSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  CardInstance,
  CardDefinition,
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
} from '../core/types';

// Test subclass to expose protected methods and override player input
class TestBattleSystem extends BattleSystem {
  // Expose damageStep for testing
  public testDamageStep(attacker: CardInstance, defender: CardInstance) {
    return (this as any).damageStep(attacker, defender);
  }

  // Override to prevent player input prompts
  protected queryDefenderForBlocker() {
    return null;
  }

  protected queryDefenderForCounterAction() {
    return { type: 'PASS' as const };
  }
}

describe('BattleSystem - Damage Step', () => {
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

    // Create battle system
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

  describe('Power Comparison', () => {
    it('should deal no damage when attacker power is less than defender power', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker with lower power
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 3000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Create defender with higher power
      const defenderDef = createTestCardDef('defender', CardCategory.CHARACTER, 5000, 4);
      const defender = createTestCard('defender-instance', defenderDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);
      player2.zones.characterArea.push(defender);

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, defender);

      expect(result.damageDealt).toBe(0);
      expect(result.defenderKOd).toBe(false);
    });

    it('should deal damage when attacker power equals defender power', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker and defender with equal power
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 5000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      const defenderDef = createTestCardDef('defender', CardCategory.CHARACTER, 5000, 4);
      const defender = createTestCard('defender-instance', defenderDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);
      player2.zones.characterArea.push(defender);

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, defender);

      expect(result.damageDealt).toBe(0);
      expect(result.defenderKOd).toBe(true);
      
      // Verify defender was moved to trash
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.characterArea).toHaveLength(0);
      expect(updatedPlayer2.zones.trash).toHaveLength(1);
      expect(updatedPlayer2.zones.trash[0].id).toBe('defender-instance');
    });

    it('should deal damage when attacker power is greater than defender power', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker with higher power
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 7000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Create defender with lower power
      const defenderDef = createTestCardDef('defender', CardCategory.CHARACTER, 5000, 4);
      const defender = createTestCard('defender-instance', defenderDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);
      player2.zones.characterArea.push(defender);

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, defender);

      expect(result.damageDealt).toBe(0);
      expect(result.defenderKOd).toBe(true);
      
      // Verify defender was moved to trash
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.characterArea).toHaveLength(0);
      expect(updatedPlayer2.zones.trash).toHaveLength(1);
      expect(updatedPlayer2.zones.trash[0].id).toBe('defender-instance');
    });
  });

  describe('Character Damage', () => {
    it('should K.O. character when attacker power is sufficient', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker with sufficient power
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 6000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Create defender character
      const defenderDef = createTestCardDef('defender', CardCategory.CHARACTER, 4000, 4);
      const defender = createTestCard('defender-instance', defenderDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);
      player2.zones.characterArea.push(defender);

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, defender);

      expect(result.defenderKOd).toBe(true);
      expect(result.damageDealt).toBe(0); // Characters don't deal "damage", they just K.O.
      
      // Verify defender was moved to trash
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.characterArea).toHaveLength(0);
      expect(updatedPlayer2.zones.trash).toHaveLength(1);
      expect(updatedPlayer2.zones.trash[0].id).toBe('defender-instance');
    });

    it('should not K.O. character when attacker power is insufficient', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker with insufficient power
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 3000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Create defender character with higher power
      const defenderDef = createTestCardDef('defender', CardCategory.CHARACTER, 5000, 4);
      const defender = createTestCard('defender-instance', defenderDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);
      player2.zones.characterArea.push(defender);

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, defender);

      expect(result.defenderKOd).toBe(false);
      expect(result.damageDealt).toBe(0);
    });
  });

  describe('Leader Damage', () => {
    it('should deal 1 damage to leader without Double Attack', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add life cards to player 2
      const lifeCard1Def = createTestCardDef('life1', CardCategory.CHARACTER, 3000, 2);
      const lifeCard1 = createTestCard('life1-instance', lifeCard1Def, PlayerId.PLAYER_2, ZoneId.LIFE);
      const lifeCard2Def = createTestCardDef('life2', CardCategory.CHARACTER, 4000, 3);
      const lifeCard2 = createTestCard('life2-instance', lifeCard2Def, PlayerId.PLAYER_2, ZoneId.LIFE);
      player2.zones.life = [lifeCard1, lifeCard2];

      // Create attacker without Double Attack
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 6000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Get leader as defender
      const leader = player2.zones.leaderArea!;

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, leader);

      expect(result.damageDealt).toBe(1);
      expect(result.defenderKOd).toBe(false);
      
      // Verify life card was moved to hand (dealLeaderDamage was called)
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.life.length).toBe(1); // One life card removed
      expect(updatedPlayer2.zones.hand.length).toBe(1); // One card added to hand
    });

    it('should deal 2 damage to leader with Double Attack', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add life cards to player 2
      const lifeCard1Def = createTestCardDef('life1', CardCategory.CHARACTER, 3000, 2);
      const lifeCard1 = createTestCard('life1-instance', lifeCard1Def, PlayerId.PLAYER_2, ZoneId.LIFE);
      const lifeCard2Def = createTestCardDef('life2', CardCategory.CHARACTER, 4000, 3);
      const lifeCard2 = createTestCard('life2-instance', lifeCard2Def, PlayerId.PLAYER_2, ZoneId.LIFE);
      const lifeCard3Def = createTestCardDef('life3', CardCategory.CHARACTER, 5000, 4);
      const lifeCard3 = createTestCard('life3-instance', lifeCard3Def, PlayerId.PLAYER_2, ZoneId.LIFE);
      player2.zones.life = [lifeCard1, lifeCard2, lifeCard3];

      // Create attacker with Double Attack
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 6000, 3, ['Double Attack']);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Get leader as defender
      const leader = player2.zones.leaderArea!;

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, leader);

      expect(result.damageDealt).toBe(2);
      expect(result.defenderKOd).toBe(false);
      
      // Verify 2 life cards were moved (dealLeaderDamage was called with 2 damage)
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.life.length).toBe(1); // Two life cards removed
      expect(updatedPlayer2.zones.hand.length).toBe(2); // Two cards added to hand
    });

    it('should not deal damage to leader when attacker power is less', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker with lower power than leader
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 3000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Get leader as defender (5000 power)
      const leader = player2.zones.leaderArea!;

      stateManager = new GameStateManager(state);
      battleSystem.updateStateManager(stateManager);

      // Execute damage step
      const result = battleSystem.testDamageStep(attacker, leader);

      expect(result.damageDealt).toBe(0);
      expect(result.defenderKOd).toBe(false);
    });
  });

  describe('Integration with executeAttack', () => {
    it('should include damage result in battle result', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 6000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Get leader as target
      const leader = player2.zones.leaderArea!;

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Execute full attack
      const result = battleSystem.executeAttack(attacker.id, leader.id);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(1);
      expect(result.defenderKOd).toBe(false);
    });

    it('should include K.O. result in battle result for character', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Create attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 6000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(attacker);

      // Create rested defender character
      const defenderDef = createTestCardDef('defender', CardCategory.CHARACTER, 4000, 4);
      const defender = createTestCard('defender-instance', defenderDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.RESTED);
      player2.zones.characterArea.push(defender);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Execute full attack
      const result = battleSystem.executeAttack(attacker.id, defender.id);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(0);
      expect(result.defenderKOd).toBe(true);
    });
  });
});
