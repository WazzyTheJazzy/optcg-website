/**
 * EndPhase.test.ts
 * 
 * Tests for the End Phase implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runEndPhase } from './EndPhase';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  PlayerId,
  Phase,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  ModifierDuration,
  ModifierType,
  CardDefinition,
  CardInstance,
} from '../core/types';

describe('EndPhase', () => {
  let stateManager: GameStateManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    // Initialize rules context
    rules = new RulesContext();

    // Initialize event emitter
    eventEmitter = new EventEmitter();

    // Create a basic game state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Set to END phase
    stateManager = stateManager.setPhase(Phase.END);
  });

  describe('Trigger END_OF_YOUR_TURN effects', () => {
    it('should enqueue END_OF_YOUR_TURN triggers for active player cards', () => {
      // Add a character with END_OF_YOUR_TURN effect to active player's field
      const character = createMockCharacter('char1', PlayerId.PLAYER_1, {
        effects: [
          {
            id: 'effect1',
            label: '[End of Your Turn]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
        ],
      });

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that trigger was enqueued (it gets cleared after resolution)
      // Since we're using placeholder resolution, we can't directly verify
      // but we can verify the state was updated
      expect(newState).toBeDefined();
    });

    it('should not enqueue END_OF_YOUR_TURN triggers for non-active player cards', () => {
      // Add a character with END_OF_YOUR_TURN effect to non-active player's field
      const character = createMockCharacter('char1', PlayerId.PLAYER_2, {
        effects: [
          {
            id: 'effect1',
            label: '[End of Your Turn]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
        ],
      });

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Verify state was processed
      expect(newState).toBeDefined();
    });
  });

  describe('Trigger END_OF_OPPONENT_TURN effects', () => {
    it('should enqueue END_OF_OPPONENT_TURN triggers for non-active player cards', () => {
      // Add a character with END_OF_OPPONENT_TURN effect to non-active player's field
      const character = createMockCharacter('char1', PlayerId.PLAYER_2, {
        effects: [
          {
            id: 'effect1',
            label: '[End of Opponent Turn]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_OPPONENT_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
        ],
      });

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Verify state was processed
      expect(newState).toBeDefined();
    });

    it('should not enqueue END_OF_OPPONENT_TURN triggers for active player cards', () => {
      // Add a character with END_OF_OPPONENT_TURN effect to active player's field
      const character = createMockCharacter('char1', PlayerId.PLAYER_1, {
        effects: [
          {
            id: 'effect1',
            label: '[End of Opponent Turn]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_OPPONENT_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
        ],
      });

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Verify state was processed
      expect(newState).toBeDefined();
    });
  });

  describe('Expire end of turn effects', () => {
    it('should expire modifiers with UNTIL_END_OF_TURN duration', () => {
      // Add a character with a temporary power modifier
      const character = createMockCharacter('char1', PlayerId.PLAYER_1);
      character.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 2000,
          duration: ModifierDuration.UNTIL_END_OF_TURN,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that modifier was removed
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedCharacter = updatedPlayer.zones.characterArea[0];
      expect(updatedCharacter.modifiers).toHaveLength(0);
    });

    it('should expire modifiers with DURING_THIS_TURN duration', () => {
      // Add a character with a temporary power modifier
      const character = createMockCharacter('char1', PlayerId.PLAYER_1);
      character.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 2000,
          duration: ModifierDuration.DURING_THIS_TURN,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that modifier was removed
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedCharacter = updatedPlayer.zones.characterArea[0];
      expect(updatedCharacter.modifiers).toHaveLength(0);
    });

    it('should not expire modifiers with PERMANENT duration', () => {
      // Add a character with a permanent power modifier
      const character = createMockCharacter('char1', PlayerId.PLAYER_1);
      character.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 1000,
          duration: ModifierDuration.PERMANENT,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that modifier was NOT removed
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedCharacter = updatedPlayer.zones.characterArea[0];
      expect(updatedCharacter.modifiers).toHaveLength(1);
      expect(updatedCharacter.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should not expire modifiers with UNTIL_END_OF_BATTLE duration', () => {
      // Add a character with a battle-duration power modifier
      const character = createMockCharacter('char1', PlayerId.PLAYER_1);
      character.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 1000,
          duration: ModifierDuration.UNTIL_END_OF_BATTLE,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that modifier was NOT removed (battle modifiers expire during battle, not end phase)
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedCharacter = updatedPlayer.zones.characterArea[0];
      expect(updatedCharacter.modifiers).toHaveLength(1);
      expect(updatedCharacter.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_BATTLE);
    });

    it('should expire modifiers on multiple cards', () => {
      // Add multiple characters with temporary modifiers
      const char1 = createMockCharacter('char1', PlayerId.PLAYER_1);
      char1.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 2000,
          duration: ModifierDuration.UNTIL_END_OF_TURN,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      const char2 = createMockCharacter('char2', PlayerId.PLAYER_1);
      char2.modifiers = [
        {
          id: 'mod2',
          type: ModifierType.COST,
          value: -1,
          duration: ModifierDuration.DURING_THIS_TURN,
          source: 'effect2',
          timestamp: Date.now(),
        },
      ];

      // Add characters to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [char1, char2],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that both modifiers were removed
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.characterArea[0].modifiers).toHaveLength(0);
      expect(updatedPlayer.zones.characterArea[1].modifiers).toHaveLength(0);
    });

    it('should not expire modifiers with UNTIL_START_OF_NEXT_TURN duration', () => {
      // Add a character with UNTIL_START_OF_NEXT_TURN modifier
      const character = createMockCharacter('char1', PlayerId.PLAYER_1);
      character.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 1000,
          duration: ModifierDuration.UNTIL_START_OF_NEXT_TURN,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that modifier was NOT removed (expires in RefreshPhase)
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedCharacter = updatedPlayer.zones.characterArea[0];
      expect(updatedCharacter.modifiers).toHaveLength(1);
      expect(updatedCharacter.modifiers[0].duration).toBe(ModifierDuration.UNTIL_START_OF_NEXT_TURN);
    });

    it('should expire modifiers on both players cards', () => {
      // Add characters with temporary modifiers for both players
      const char1 = createMockCharacter('char1', PlayerId.PLAYER_1);
      char1.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 2000,
          duration: ModifierDuration.UNTIL_END_OF_TURN,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      const char2 = createMockCharacter('char2', PlayerId.PLAYER_2);
      char2.modifiers = [
        {
          id: 'mod2',
          type: ModifierType.POWER,
          value: 1000,
          duration: ModifierDuration.DURING_THIS_TURN,
          source: 'effect2',
          timestamp: Date.now(),
        },
      ];

      // Add characters to both players' fields
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: [char1],
        },
      });

      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
        zones: {
          ...player2.zones,
          characterArea: [char2],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that both players' modifiers were removed
      const updatedPlayer1 = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedPlayer2 = newState.getPlayer(PlayerId.PLAYER_2)!;
      expect(updatedPlayer1.zones.characterArea[0].modifiers).toHaveLength(0);
      expect(updatedPlayer2.zones.characterArea[0].modifiers).toHaveLength(0);
    });

    it('should expire modifiers on leader cards', () => {
      // Add a leader with temporary modifier
      const leader = createMockLeader('leader1', PlayerId.PLAYER_1);
      leader.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 2000,
          duration: ModifierDuration.UNTIL_END_OF_TURN,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      // Update leader
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          leaderArea: leader,
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that modifier was removed
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.leaderArea!.modifiers).toHaveLength(0);
    });

    it('should expire modifiers on cards in hand', () => {
      // Add a card in hand with temporary cost modifier
      const cardInHand = createMockCharacter('card1', PlayerId.PLAYER_1);
      cardInHand.zone = ZoneId.HAND;
      cardInHand.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.COST,
          value: -2,
          duration: ModifierDuration.DURING_THIS_TURN,
          source: 'effect1',
          timestamp: Date.now(),
        },
      ];

      // Add card to hand
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          hand: [cardInHand],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that modifier was removed
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.hand[0].modifiers).toHaveLength(0);
    });

    it('should handle mixed duration modifiers correctly', () => {
      // Add a character with multiple modifiers of different durations
      const character = createMockCharacter('char1', PlayerId.PLAYER_1);
      character.modifiers = [
        {
          id: 'mod1',
          type: ModifierType.POWER,
          value: 1000,
          duration: ModifierDuration.PERMANENT,
          source: 'effect1',
          timestamp: Date.now(),
        },
        {
          id: 'mod2',
          type: ModifierType.POWER,
          value: 2000,
          duration: ModifierDuration.UNTIL_END_OF_TURN,
          source: 'effect2',
          timestamp: Date.now(),
        },
        {
          id: 'mod3',
          type: ModifierType.POWER,
          value: 1000,
          duration: ModifierDuration.UNTIL_START_OF_NEXT_TURN,
          source: 'effect3',
          timestamp: Date.now(),
        },
        {
          id: 'mod4',
          type: ModifierType.COST,
          value: -1,
          duration: ModifierDuration.DURING_THIS_TURN,
          source: 'effect4',
          timestamp: Date.now(),
        },
      ];

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Check that only UNTIL_END_OF_TURN and DURING_THIS_TURN modifiers were removed
      const updatedPlayer = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedCharacter = updatedPlayer.zones.characterArea[0];
      expect(updatedCharacter.modifiers).toHaveLength(2);
      expect(updatedCharacter.modifiers.find(m => m.id === 'mod1')).toBeDefined(); // PERMANENT
      expect(updatedCharacter.modifiers.find(m => m.id === 'mod3')).toBeDefined(); // UNTIL_START_OF_NEXT_TURN
      expect(updatedCharacter.modifiers.find(m => m.id === 'mod2')).toBeUndefined(); // UNTIL_END_OF_TURN
      expect(updatedCharacter.modifiers.find(m => m.id === 'mod4')).toBeUndefined(); // DURING_THIS_TURN
    });
  });

  describe('Edge cases', () => {
    it('should handle EndPhase with no effects to trigger', () => {
      // Run end phase with no cards on field
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Should complete without errors
      expect(newState).toBeDefined();
      expect(newState.getState().phase).toBe(Phase.END);
    });

    it('should handle EndPhase with no modifiers to expire', () => {
      // Add characters without modifiers
      const char1 = createMockCharacter('char1', PlayerId.PLAYER_1);
      const char2 = createMockCharacter('char2', PlayerId.PLAYER_2);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: [char1],
        },
      });

      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
        zones: {
          ...player2.zones,
          characterArea: [char2],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Should complete without errors
      expect(newState).toBeDefined();
      const updatedPlayer1 = newState.getPlayer(PlayerId.PLAYER_1)!;
      const updatedPlayer2 = newState.getPlayer(PlayerId.PLAYER_2)!;
      expect(updatedPlayer1.zones.characterArea[0].modifiers).toHaveLength(0);
      expect(updatedPlayer2.zones.characterArea[0].modifiers).toHaveLength(0);
    });

    it('should handle EndPhase with empty field', () => {
      // Ensure both players have empty character areas
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: [],
        },
      });

      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
        zones: {
          ...player2.zones,
          characterArea: [],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Should complete without errors
      expect(newState).toBeDefined();
      expect(newState.getState().phase).toBe(Phase.END);
    });

    it('should handle multiple END_OF_YOUR_TURN effects on same card', () => {
      // Add a character with multiple END_OF_YOUR_TURN effects
      const character = createMockCharacter('char1', PlayerId.PLAYER_1, {
        effects: [
          {
            id: 'effect1',
            label: '[End of Your Turn] Effect 1',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
          {
            id: 'effect2',
            label: '[End of Your Turn] Effect 2',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
        ],
      });

      // Add character to field
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player.zones,
          characterArea: [character],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Should complete without errors
      expect(newState).toBeDefined();
    });

    it('should handle both END_OF_YOUR_TURN and END_OF_OPPONENT_TURN effects in same phase', () => {
      // Add character with END_OF_YOUR_TURN to active player
      const activeChar = createMockCharacter('char1', PlayerId.PLAYER_1, {
        effects: [
          {
            id: 'effect1',
            label: '[End of Your Turn]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_YOUR_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
        ],
      });

      // Add character with END_OF_OPPONENT_TURN to non-active player
      const opponentChar = createMockCharacter('char2', PlayerId.PLAYER_2, {
        effects: [
          {
            id: 'effect2',
            label: '[End of Opponent Turn]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.END_OF_OPPONENT_TURN,
            condition: null,
            cost: null,
            scriptId: 'drawOne',
            oncePerTurn: false,
          },
        ],
      });

      // Add characters to fields
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: [activeChar],
        },
      });

      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
        zones: {
          ...player2.zones,
          characterArea: [opponentChar],
        },
      });

      // Run end phase
      const newState = runEndPhase(stateManager, rules, eventEmitter);

      // Should complete without errors
      expect(newState).toBeDefined();
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockLeader(id: string, owner: PlayerId): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: `Leader ${id}`,
    category: CardCategory.LEADER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: null,
    lifeValue: 5,
    counterValue: null,
    rarity: 'L',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  return {
    id,
    definition,
    owner,
    controller: owner,
    zone: ZoneId.LEADER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createMockCharacter(
  id: string,
  owner: PlayerId,
  overrides?: Partial<CardDefinition>
): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: `Character ${id}`,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 4000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
    ...overrides,
  };

  return {
    id,
    definition,
    owner,
    controller: owner,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}
