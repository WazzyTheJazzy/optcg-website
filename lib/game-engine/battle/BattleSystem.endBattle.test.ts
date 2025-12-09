/**
 * BattleSystem.endBattle.test.ts
 * 
 * Tests for the BattleSystem endBattle method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleSystem } from './BattleSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import {
  CardInstance,
  CardDefinition,
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  ModifierDuration,
  ModifierType,
} from '../core/types';

describe('BattleSystem - endBattle', () => {
  let battleSystem: BattleSystem;
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
    battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

    // Set up basic game state with leaders and characters
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

  describe('BATTLE_END event emission', () => {
    it('should emit BATTLE_END event when battle ends', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;

      // Add an active character for player 1
      const charDef = createTestCardDef('char1', CardCategory.CHARACTER, 6000, 3);
      const char = createTestCard('char1-instance', charDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(char);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set up event listener
      let battleEndEventEmitted = false;
      let emittedEvent: any = null;
      eventEmitter.on(GameEventType.BATTLE_END, (event) => {
        battleEndEventEmitted = true;
        emittedEvent = event;
      });

      // Execute attack
      battleSystem.executeAttack(char.id, leader2.id);

      // Check that BATTLE_END event was emitted
      expect(battleEndEventEmitted).toBe(true);
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.type).toBe(GameEventType.BATTLE_END);
      expect(emittedEvent.attackerId).toBe(char.id);
      expect(emittedEvent.defenderId).toBe(leader2.id);
      expect(emittedEvent.attackingPlayerId).toBe(PlayerId.PLAYER_1);
      expect(emittedEvent.defendingPlayerId).toBe(PlayerId.PLAYER_2);
    });

    it('should include damage dealt in BATTLE_END event', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;

      // Add an active character for player 1 with high power
      const charDef = createTestCardDef('char1', CardCategory.CHARACTER, 6000, 3);
      const char = createTestCard('char1-instance', charDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(char);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set up event listener
      let emittedEvent: any = null;
      eventEmitter.on(GameEventType.BATTLE_END, (event) => {
        emittedEvent = event;
      });

      // Execute attack
      battleSystem.executeAttack(char.id, leader2.id);

      // Check that damage dealt is included in event
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.damageDealt).toBe(1); // Should deal 1 damage to leader
    });

    it('should include 2 damage dealt for Double Attack in BATTLE_END event', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;

      // Add an active character with Double Attack for player 1
      const charDef = createTestCardDef('char1', CardCategory.CHARACTER, 6000, 3, ['Double Attack']);
      const char = createTestCard('char1-instance', charDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      player1.zones.characterArea.push(char);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set up event listener
      let emittedEvent: any = null;
      eventEmitter.on(GameEventType.BATTLE_END, (event) => {
        emittedEvent = event;
      });

      // Execute attack
      battleSystem.executeAttack(char.id, leader2.id);

      // Check that damage dealt is 2 for Double Attack
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.damageDealt).toBe(2);
    });
  });

  describe('Modifier expiration', () => {
    it('should expire UNTIL_END_OF_BATTLE modifiers after battle', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1
      const charDef = createTestCardDef('char1', CardCategory.CHARACTER, 4000, 3);
      const char = createTestCard('char1-instance', charDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      // Add a battle-duration modifier to the character
      const battleModifier = {
        id: 'battle-mod-1',
        type: ModifierType.POWER,
        value: 2000,
        duration: ModifierDuration.UNTIL_END_OF_BATTLE,
        source: 'test-source',
        timestamp: Date.now(),
      };
      char.modifiers.push(battleModifier);
      
      player1.zones.characterArea.push(char);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      battleSystem.executeAttack(char.id, leader2.id);

      // Check that battle modifier was removed
      const updatedState = battleSystem.getStateManager().getState();
      const updatedChar = updatedState.players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
      
      expect(updatedChar.modifiers).toHaveLength(0);
    });

    it('should not expire PERMANENT modifiers after battle', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;

      // Add an active character for player 1
      const charDef = createTestCardDef('char1', CardCategory.CHARACTER, 4000, 3);
      const char = createTestCard('char1-instance', charDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      // Add a permanent modifier to the character
      const permanentModifier = {
        id: 'perm-mod-1',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.PERMANENT,
        source: 'test-source',
        timestamp: Date.now(),
      };
      char.modifiers.push(permanentModifier);
      
      player1.zones.characterArea.push(char);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      battleSystem.executeAttack(char.id, leader2.id);

      // Check that permanent modifier was NOT removed
      const updatedState = battleSystem.getStateManager().getState();
      const updatedChar = updatedState.players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
      
      expect(updatedChar.modifiers).toHaveLength(1);
      expect(updatedChar.modifiers[0].id).toBe('perm-mod-1');
    });

    it('should not expire UNTIL_END_OF_TURN modifiers after battle', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;

      // Add an active character for player 1
      const charDef = createTestCardDef('char1', CardCategory.CHARACTER, 4000, 3);
      const char = createTestCard('char1-instance', charDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      // Add a turn-duration modifier to the character
      const turnModifier = {
        id: 'turn-mod-1',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'test-source',
        timestamp: Date.now(),
      };
      char.modifiers.push(turnModifier);
      
      player1.zones.characterArea.push(char);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      battleSystem.executeAttack(char.id, leader2.id);

      // Check that turn modifier was NOT removed
      const updatedState = battleSystem.getStateManager().getState();
      const updatedChar = updatedState.players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
      
      expect(updatedChar.modifiers).toHaveLength(1);
      expect(updatedChar.modifiers[0].id).toBe('turn-mod-1');
    });

    it('should expire battle modifiers from both attacker and defender', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add an active character for player 1 with battle modifier
      const char1Def = createTestCardDef('char1', CardCategory.CHARACTER, 4000, 3);
      const char1 = createTestCard('char1-instance', char1Def, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      const attackerModifier = {
        id: 'attacker-mod',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.UNTIL_END_OF_BATTLE,
        source: 'test-source',
        timestamp: Date.now(),
      };
      char1.modifiers.push(attackerModifier);
      
      player1.zones.characterArea.push(char1);

      // Add battle modifier to defender's leader
      const leader2 = player2.zones.leaderArea!;
      const defenderModifier = {
        id: 'defender-mod',
        type: ModifierType.POWER,
        value: 2000,
        duration: ModifierDuration.UNTIL_END_OF_BATTLE,
        source: 'test-source',
        timestamp: Date.now(),
      };
      leader2.modifiers.push(defenderModifier);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Execute attack
      battleSystem.executeAttack(char1.id, leader2.id);

      // Check that both battle modifiers were removed
      const updatedState = battleSystem.getStateManager().getState();
      const updatedChar = updatedState.players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
      const updatedLeader = updatedState.players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      expect(updatedChar.modifiers).toHaveLength(0);
      expect(updatedLeader.modifiers).toHaveLength(0);
    });

    it('should expire battle modifiers from all cards in play', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add multiple characters with battle modifiers
      const char1Def = createTestCardDef('char1', CardCategory.CHARACTER, 4000, 3);
      const char1 = createTestCard('char1-instance', char1Def, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      char1.modifiers.push({
        id: 'mod-1',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.UNTIL_END_OF_BATTLE,
        source: 'test',
        timestamp: Date.now(),
      });
      player1.zones.characterArea.push(char1);

      const char2Def = createTestCardDef('char2', CardCategory.CHARACTER, 3000, 2);
      const char2 = createTestCard('char2-instance', char2Def, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      char2.modifiers.push({
        id: 'mod-2',
        type: ModifierType.POWER,
        value: 500,
        duration: ModifierDuration.UNTIL_END_OF_BATTLE,
        source: 'test',
        timestamp: Date.now(),
      });
      player2.zones.characterArea.push(char2);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Execute attack
      battleSystem.executeAttack(char1.id, leader2.id);

      // Check that all battle modifiers were removed from all cards
      const updatedState = battleSystem.getStateManager().getState();
      const updatedChar1 = updatedState.players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
      const updatedChar2 = updatedState.players.get(PlayerId.PLAYER_2)!.zones.characterArea[0];
      
      expect(updatedChar1.modifiers).toHaveLength(0);
      expect(updatedChar2.modifiers).toHaveLength(0);
    });
  });
});
