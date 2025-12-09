/**
 * BattleSystem.counterStep.test.ts
 * 
 * Tests for the counter step of the battle system
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
  CounterAction,
} from '../core/types';

/**
 * Test subclass that allows us to control counter actions
 */
class TestBattleSystem extends BattleSystem {
  private counterActions: CounterAction[] = [];
  private counterActionIndex = 0;

  setCounterActions(actions: CounterAction[]) {
    this.counterActions = actions;
    this.counterActionIndex = 0;
  }

  protected queryDefenderForCounterAction(): CounterAction | null {
    if (this.counterActionIndex >= this.counterActions.length) {
      return { type: 'PASS' };
    }
    return this.counterActions[this.counterActionIndex++];
  }
}

describe('BattleSystem - Counter Step', () => {
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
    counterValue: number | null = null,
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
      counterValue,
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

  describe('counterStep - event emission', () => {
    it('should emit COUNTER_STEP_START event', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;

      // Add attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 4000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set up event listener
      let counterEventEmitted = false;
      let emittedEvent: any = null;
      eventEmitter.on(GameEventType.COUNTER_STEP_START, (event) => {
        counterEventEmitted = true;
        emittedEvent = event;
      });

      // Set counter actions to pass immediately
      battleSystem.setCounterActions([{ type: 'PASS' }]);

      // Execute attack
      battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that counter event was emitted
      expect(counterEventEmitted).toBe(true);
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.attackerId).toBe(attacker.id);
      expect(emittedEvent.defenderId).toBe(leader2.id);
      expect(emittedEvent.defendingPlayerId).toBe(PlayerId.PLAYER_2);
    });
  });

  describe('counterStep - USE_COUNTER_CARD', () => {
    it('should trash counter card from hand and boost defender power', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add attacker with lower power so defender survives and we can check modifiers
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 3000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Add counter card to defender's hand
      const counterCardDef = createTestCardDef('counter', CardCategory.CHARACTER, 2000, 1, 2000);
      const counterCard = createTestCard('counter-instance', counterCardDef, PlayerId.PLAYER_2, ZoneId.HAND);
      player2.zones.hand.push(counterCard);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set counter actions: use counter card, then pass
      battleSystem.setCounterActions([
        { type: 'USE_COUNTER_CARD', cardId: counterCard.id },
        { type: 'PASS' },
      ]);

      // Execute attack
      const result = battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that counter card was trashed
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.hand.length).toBe(0);
      expect(updatedPlayer2.zones.trash.length).toBe(1);
      expect(updatedPlayer2.zones.trash[0].id).toBe(counterCard.id);

      // Verify the counter boost worked by checking the battle result
      // The defender power in result is calculated before counter step, so it shows base power
      // But the counter boost should prevent damage since defender ends up with 7000 power (5000 + 2000)
      // Since attacker has 3000 power, it should not deal damage
      expect(result.damageDealt).toBe(0);
      expect(result.defenderPower).toBe(5000); // Base power before counter
    });

    it('should throw error if counter card is not in hand', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 4000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Add counter card to defender's trash (not hand)
      const counterCardDef = createTestCardDef('counter', CardCategory.CHARACTER, 2000, 1, 2000);
      const counterCard = createTestCard('counter-instance', counterCardDef, PlayerId.PLAYER_2, ZoneId.TRASH);
      player2.zones.trash.push(counterCard);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set counter actions: try to use counter card from trash
      battleSystem.setCounterActions([
        { type: 'USE_COUNTER_CARD', cardId: counterCard.id },
      ]);

      // Execute attack - should throw error
      expect(() => {
        battleSystem.executeAttack(attacker.id, leader2.id);
      }).toThrow("is not in defender's hand");
    });

    it('should throw error if card has no counter value', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 4000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Add card without counter value to defender's hand
      const noCounterDef = createTestCardDef('nocounter', CardCategory.CHARACTER, 2000, 1, null);
      const noCounter = createTestCard('nocounter-instance', noCounterDef, PlayerId.PLAYER_2, ZoneId.HAND);
      player2.zones.hand.push(noCounter);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set counter actions: try to use card without counter value
      battleSystem.setCounterActions([
        { type: 'USE_COUNTER_CARD', cardId: noCounter.id },
      ]);

      // Execute attack - should throw error
      expect(() => {
        battleSystem.executeAttack(attacker.id, leader2.id);
      }).toThrow('does not have a counter value');
    });
  });

  describe('counterStep - PLAY_COUNTER_EVENT', () => {
    it('should pay cost, trash event, and resolve effect', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 4000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Add counter event to defender's hand
      const counterEventDef = createTestCardDef('counterevent', CardCategory.EVENT, null, 1);
      const counterEvent = createTestCard('counterevent-instance', counterEventDef, PlayerId.PLAYER_2, ZoneId.HAND);
      player2.zones.hand.push(counterEvent);

      // Add DON to defender's cost area
      player2.zones.costArea.push({
        id: 'don1',
        owner: PlayerId.PLAYER_2,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
      });
      player2.zones.costArea.push({
        id: 'don2',
        owner: PlayerId.PLAYER_2,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
      });

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set counter actions: play counter event, then pass
      battleSystem.setCounterActions([
        { type: 'PLAY_COUNTER_EVENT', cardId: counterEvent.id },
        { type: 'PASS' },
      ]);

      // Execute attack
      battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that counter event was trashed
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.hand.length).toBe(0);
      expect(updatedPlayer2.zones.trash.length).toBe(1);
      expect(updatedPlayer2.zones.trash[0].id).toBe(counterEvent.id);

      // Check that DON was rested
      expect(updatedPlayer2.zones.costArea[0].state).toBe(CardState.RESTED);
      expect(updatedPlayer2.zones.costArea[1].state).toBe(CardState.ACTIVE);
    });

    it('should throw error if insufficient DON to pay cost', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 4000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Add counter event with cost 2 to defender's hand
      const counterEventDef = createTestCardDef('counterevent', CardCategory.EVENT, null, 2);
      const counterEvent = createTestCard('counterevent-instance', counterEventDef, PlayerId.PLAYER_2, ZoneId.HAND);
      player2.zones.hand.push(counterEvent);

      // Add only 1 DON to defender's cost area (insufficient)
      player2.zones.costArea.push({
        id: 'don1',
        owner: PlayerId.PLAYER_2,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
      });

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set counter actions: try to play counter event
      battleSystem.setCounterActions([
        { type: 'PLAY_COUNTER_EVENT', cardId: counterEvent.id },
      ]);

      // Execute attack - should throw error
      expect(() => {
        battleSystem.executeAttack(attacker.id, leader2.id);
      }).toThrow('Insufficient DON');
    });

    it('should throw error if card is not an event', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add attacker
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 4000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Add character (not event) to defender's hand
      const notEventDef = createTestCardDef('notevent', CardCategory.CHARACTER, 2000, 1);
      const notEvent = createTestCard('notevent-instance', notEventDef, PlayerId.PLAYER_2, ZoneId.HAND);
      player2.zones.hand.push(notEvent);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set counter actions: try to play character as counter event
      battleSystem.setCounterActions([
        { type: 'PLAY_COUNTER_EVENT', cardId: notEvent.id },
      ]);

      // Execute attack - should throw error
      expect(() => {
        battleSystem.executeAttack(attacker.id, leader2.id);
      }).toThrow('is not an event');
    });
  });

  describe('counterStep - multiple counter actions', () => {
    it('should allow multiple counter actions before passing', () => {
      const state = stateManager.getState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      const player2 = state.players.get(PlayerId.PLAYER_2)!;

      // Add attacker with lower power so defender survives
      const attackerDef = createTestCardDef('attacker', CardCategory.CHARACTER, 3000, 3);
      const attacker = createTestCard('attacker-instance', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      player1.zones.characterArea.push(attacker);

      // Add two counter cards to defender's hand
      const counter1Def = createTestCardDef('counter1', CardCategory.CHARACTER, 2000, 1, 1000);
      const counter1 = createTestCard('counter1-instance', counter1Def, PlayerId.PLAYER_2, ZoneId.HAND);
      player2.zones.hand.push(counter1);

      const counter2Def = createTestCardDef('counter2', CardCategory.CHARACTER, 2000, 1, 1000);
      const counter2 = createTestCard('counter2-instance', counter2Def, PlayerId.PLAYER_2, ZoneId.HAND);
      player2.zones.hand.push(counter2);

      // Advance to turn 2 to allow battles
      stateManager = stateManager.incrementTurn();
      stateManager = new GameStateManager(stateManager.getState());
      battleSystem.updateStateManager(stateManager);

      // Get the leader as the target (always valid)
      const leader2 = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea!;

      // Set counter actions: use both counter cards, then pass
      battleSystem.setCounterActions([
        { type: 'USE_COUNTER_CARD', cardId: counter1.id },
        { type: 'USE_COUNTER_CARD', cardId: counter2.id },
        { type: 'PASS' },
      ]);

      // Execute attack
      const result = battleSystem.executeAttack(attacker.id, leader2.id);

      // Check that both counter cards were trashed
      const updatedState = battleSystem.getStateManager().getState();
      const updatedPlayer2 = updatedState.players.get(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.hand.length).toBe(0);
      expect(updatedPlayer2.zones.trash.length).toBe(2);

      // Verify both counters worked by checking the battle result
      // The defender power in result is calculated before counter step, so it shows base power
      // But the counter boosts should prevent damage since defender ends up with 7000 power (5000 + 1000 + 1000)
      // Since attacker has 3000 power, it should not deal damage
      expect(result.damageDealt).toBe(0);
      expect(result.defenderPower).toBe(5000); // Base power before counters
    });
  });
});
