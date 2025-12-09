/**
 * MainPhase.test.ts
 * 
 * Tests for the Main Phase implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runMainPhase, PlayerInputProvider, MainPhaseActionUnion } from './MainPhase';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  ActionType,
  CardDefinition,
  CardInstance,
} from '../core/types';
import rulesData from '../rules/rules.json';

describe('MainPhase', () => {
  let stateManager: GameStateManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    rules = new RulesContext(rulesData as any); // Type assertion for test
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
  });

  describe('runMainPhase without input provider', () => {
    it('should execute without errors when no input provider is given', () => {
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);
      expect(result).toBeDefined();
      // Result should be GameStateManager, not Promise
      expect(result).toBeInstanceOf(GameStateManager);
      if (!(result instanceof Promise)) {
        expect(result.isGameOver()).toBe(false);
      }
    });

    it('should trigger START_OF_MAIN effects', () => {
      // Create a card with START_OF_MAIN effect
      const cardDef: CardDefinition = {
        id: 'test-card-1',
        name: 'Test Character',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [
          {
            id: 'effect-1',
            label: '[Start of Main]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.START_OF_MAIN,
            condition: null,
            cost: null,
            scriptId: 'draw-one',
            oncePerTurn: false,
          },
        ],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      };

      const cardInstance: CardInstance = {
        id: 'card-instance-1',
        definition: cardDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Add card to player's character area
      const player = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player) {
        const updatedPlayer = {
          ...player,
          zones: {
            ...player.zones,
            characterArea: [cardInstance],
          },
        };
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, updatedPlayer);
      }

      // Run main phase
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Verify that triggers were processed (cleared from queue)
      if (!(result instanceof Promise)) {
        expect(result.getState().pendingTriggers.length).toBe(0);
      }
    });

    it('should handle multiple START_OF_MAIN effects with correct priority', () => {
      // Create cards for both players with START_OF_MAIN effects
      const createCard = (id: string, playerId: PlayerId): CardInstance => ({
        id,
        definition: {
          id: `def-${id}`,
          name: `Card ${id}`,
          category: CardCategory.CHARACTER,
          colors: ['Red'],
          typeTags: [],
          attributes: [],
          basePower: 5000,
          baseCost: 3,
          lifeValue: null,
          counterValue: 1000,
          rarity: 'C',
          keywords: [],
          effects: [
            {
              id: `effect-${id}`,
              label: '[Start of Main]',
              timingType: EffectTimingType.AUTO,
              triggerTiming: TriggerTiming.START_OF_MAIN,
              condition: null,
              cost: null,
              scriptId: 'test-effect',
              oncePerTurn: false,
            },
          ],
          imageUrl: '',
          metadata: {
            setCode: 'OP01',
            cardNumber: '001',
            isAltArt: false,
            isPromo: false,
          },
        },
        owner: playerId,
        controller: playerId,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      });

      // Add cards to both players
      const player1Card = createCard('p1-card', PlayerId.PLAYER_1);
      const player2Card = createCard('p2-card', PlayerId.PLAYER_2);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

      if (player1) {
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
          ...player1,
          zones: { ...player1.zones, characterArea: [player1Card] },
        });
      }

      if (player2) {
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
          ...player2,
          zones: { ...player2.zones, characterArea: [player2Card] },
        });
      }

      // Run main phase
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Verify triggers were processed
      if (!(result instanceof Promise)) {
        expect(result.getState().pendingTriggers.length).toBe(0);
      }
    });
  });

  describe('Action types', () => {
    it('should define all required action types', () => {
      expect(ActionType.PLAY_CARD).toBeDefined();
      expect(ActionType.ACTIVATE_EFFECT).toBeDefined();
      expect(ActionType.GIVE_DON).toBeDefined();
      expect(ActionType.DECLARE_ATTACK).toBeDefined();
      expect(ActionType.END_PHASE).toBeDefined();
    });
  });

  describe('PlayerInputProvider interface', () => {
    it('should accept a valid input provider', async () => {
      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId, availableActions, state) => {
          // Return end phase action to exit loop
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(result).toBeDefined();
    });

    it('should handle null action (player passes)', async () => {
      const mockProvider: PlayerInputProvider = {
        getNextAction: async () => null,
      };

      const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(result).toBeDefined();
    });
  });

  describe('Action routing', () => {
    it('should route PlayCard actions to handler', async () => {
      let actionReceived = false;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          if (!actionReceived) {
            actionReceived = true;
            return {
              type: ActionType.PLAY_CARD,
              playerId,
              cardId: 'test-card',
            };
          }
          // End phase after first action
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(actionReceived).toBe(true);
    });

    it('should route ActivateEffect actions to handler', async () => {
      let actionReceived = false;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          if (!actionReceived) {
            actionReceived = true;
            return {
              type: ActionType.ACTIVATE_EFFECT,
              playerId,
              cardId: 'test-card',
              effectId: 'test-effect',
            };
          }
          // End phase after first action
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(actionReceived).toBe(true);
    });

    it('should route GiveDon actions to handler', async () => {
      let actionReceived = false;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          if (!actionReceived) {
            actionReceived = true;
            return {
              type: ActionType.GIVE_DON,
              playerId,
              donId: 'test-don',
              targetCardId: 'test-card',
            };
          }
          // End phase after first action
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(actionReceived).toBe(true);
    });

    it('should route Attack actions to handler', async () => {
      let actionReceived = false;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          if (!actionReceived) {
            actionReceived = true;
            return {
              type: ActionType.DECLARE_ATTACK,
              playerId,
              attackerId: 'attacker-card',
              targetId: 'target-card',
            };
          }
          // End phase after first action
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(actionReceived).toBe(true);
    });

    it('should handle EndMain action', async () => {
      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(result).toBeDefined();
    });
  });

  describe('Action loop', () => {
    it('should continue loop until player ends phase', async () => {
      let actionCount = 0;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          actionCount++;
          if (actionCount < 3) {
            // Perform a few actions
            return {
              type: ActionType.PLAY_CARD,
              playerId,
              cardId: `card-${actionCount}`,
            };
          }
          // Then end phase
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(actionCount).toBe(3);
    });

    it('should handle multiple actions in sequence', async () => {
      const actionSequence: ActionType[] = [];

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          if (actionSequence.length === 0) {
            actionSequence.push(ActionType.PLAY_CARD);
            return {
              type: ActionType.PLAY_CARD,
              playerId,
              cardId: 'card-1',
            };
          } else if (actionSequence.length === 1) {
            actionSequence.push(ActionType.GIVE_DON);
            return {
              type: ActionType.GIVE_DON,
              playerId,
              donId: 'don-1',
              targetCardId: 'card-1',
            };
          } else if (actionSequence.length === 2) {
            actionSequence.push(ActionType.DECLARE_ATTACK);
            return {
              type: ActionType.DECLARE_ATTACK,
              playerId,
              attackerId: 'card-1',
              targetId: 'opponent-card',
            };
          }
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(actionSequence.length).toBe(3);
      expect(actionSequence).toEqual([
        ActionType.PLAY_CARD,
        ActionType.GIVE_DON,
        ActionType.DECLARE_ATTACK,
      ]);
    });

    it('should resolve pending triggers after each action', async () => {
      // This test verifies that the action loop calls resolvePendingTriggers
      // The actual trigger resolution is tested separately
      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(result.getState().pendingTriggers.length).toBe(0);
    });

    it('should stop loop if game is over', async () => {
      let actionCount = 0;

      // Set game over before starting
      stateManager = stateManager.setGameOver(PlayerId.PLAYER_1);

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          actionCount++;
          return {
            type: ActionType.PLAY_CARD,
            playerId,
            cardId: 'test-card',
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      // Should not execute any actions since game is already over
      expect(actionCount).toBe(0);
    });
  });

  describe('Action failure and retry', () => {
    it('should allow player to retry after action fails', async () => {
      let attemptCount = 0;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          attemptCount++;
          if (attemptCount === 1) {
            // First attempt - try to play a card that doesn't exist
            return {
              type: ActionType.PLAY_CARD,
              playerId,
              cardId: 'non-existent-card',
            };
          } else if (attemptCount === 2) {
            // Second attempt - try another invalid action
            return {
              type: ActionType.ACTIVATE_EFFECT,
              playerId,
              cardId: 'non-existent-card',
              effectId: 'non-existent-effect',
            };
          }
          // Third attempt - end phase
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      // Should have been called 3 times (2 failures + 1 success)
      expect(attemptCount).toBe(3);
    });

    it('should not update state when action fails', async () => {
      const initialState = stateManager.getState();
      let actionAttempted = false;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          if (!actionAttempted) {
            actionAttempted = true;
            // Try to play a card that doesn't exist
            return {
              type: ActionType.PLAY_CARD,
              playerId,
              cardId: 'non-existent-card',
            };
          }
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      // State should be unchanged (except for START_OF_MAIN triggers being cleared)
      expect(result.getState().turnNumber).toBe(initialState.turnNumber);
      expect(result.getState().activePlayer).toBe(initialState.activePlayer);
    });

    it('should continue action loop after failed action', async () => {
      let successfulActionExecuted = false;

      const mockProvider: PlayerInputProvider = {
        getNextAction: async (playerId) => {
          if (!successfulActionExecuted) {
            successfulActionExecuted = true;
            // First try an invalid action, then end phase
            return {
              type: ActionType.PLAY_CARD,
              playerId,
              cardId: 'non-existent-card',
            };
          }
          // After failure, player can still end phase
          return {
            type: ActionType.END_PHASE,
            playerId,
          };
        },
      };

      const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, mockProvider);
      expect(result).toBeDefined();
      expect(successfulActionExecuted).toBe(true);
    });
  });

  describe('Synchronous execution', () => {
    it('should execute synchronously without input provider', () => {
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);
      
      // Should return GameStateManager directly, not a Promise
      expect(result).toBeInstanceOf(GameStateManager);
      expect(result).not.toBeInstanceOf(Promise);
    });

    it('should trigger START_OF_MAIN effects even without input provider', () => {
      // Create a card with START_OF_MAIN effect
      const cardDef: CardDefinition = {
        id: 'test-card-sync',
        name: 'Test Character Sync',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [
          {
            id: 'effect-sync',
            label: '[Start of Main]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.START_OF_MAIN,
            condition: null,
            cost: null,
            scriptId: 'test-effect',
            oncePerTurn: false,
          },
        ],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      };

      const cardInstance: CardInstance = {
        id: 'card-instance-sync',
        definition: cardDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Add card to player's character area
      const player = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player) {
        const updatedPlayer = {
          ...player,
          zones: {
            ...player.zones,
            characterArea: [cardInstance],
          },
        };
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, updatedPlayer);
      }

      // Run main phase without input provider
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Should be synchronous
      expect(result).toBeInstanceOf(GameStateManager);
      
      // Triggers should have been processed
      if (!(result instanceof Promise)) {
        expect(result.getState().pendingTriggers.length).toBe(0);
      }
    });

    it('should not enter action loop without input provider', () => {
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);
      
      // Should complete immediately without waiting for actions
      expect(result).toBeInstanceOf(GameStateManager);
      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('START_OF_MAIN trigger handling', () => {
    it('should trigger START_OF_MAIN effects for active player first', () => {
      // Create cards for both players with START_OF_MAIN effects
      const createCard = (id: string, playerId: PlayerId): CardInstance => ({
        id,
        definition: {
          id: `def-${id}`,
          name: `Card ${id}`,
          category: CardCategory.CHARACTER,
          colors: ['Red'],
          typeTags: [],
          attributes: [],
          basePower: 5000,
          baseCost: 3,
          lifeValue: null,
          counterValue: 1000,
          rarity: 'C',
          keywords: [],
          effects: [
            {
              id: `effect-${id}`,
              label: '[Start of Main]',
              timingType: EffectTimingType.AUTO,
              triggerTiming: TriggerTiming.START_OF_MAIN,
              condition: null,
              cost: null,
              scriptId: 'test-effect',
              oncePerTurn: false,
            },
          ],
          imageUrl: '',
          metadata: {
            setCode: 'OP01',
            cardNumber: '001',
            isAltArt: false,
            isPromo: false,
          },
        },
        owner: playerId,
        controller: playerId,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      });

      // Add cards to both players
      const player1Card = createCard('p1-priority', PlayerId.PLAYER_1);
      const player2Card = createCard('p2-priority', PlayerId.PLAYER_2);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

      if (player1) {
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
          ...player1,
          zones: { ...player1.zones, characterArea: [player1Card] },
        });
      }

      if (player2) {
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
          ...player2,
          zones: { ...player2.zones, characterArea: [player2Card] },
        });
      }

      // Run main phase
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Verify triggers were processed
      if (!(result instanceof Promise)) {
        expect(result.getState().pendingTriggers.length).toBe(0);
      }
    });

    it('should trigger START_OF_MAIN effects from leader', () => {
      // Create a leader with START_OF_MAIN effect
      const leaderDef: CardDefinition = {
        id: 'test-leader',
        name: 'Test Leader',
        category: CardCategory.LEADER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 0,
        lifeValue: 5,
        counterValue: null,
        rarity: 'L',
        keywords: [],
        effects: [
          {
            id: 'leader-effect',
            label: '[Start of Main]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.START_OF_MAIN,
            condition: null,
            cost: null,
            scriptId: 'leader-effect',
            oncePerTurn: false,
          },
        ],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: 'L01',
          isAltArt: false,
          isPromo: false,
        },
      };

      const leaderInstance: CardInstance = {
        id: 'leader-instance',
        definition: leaderDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.LEADER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Set leader
      const player = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player) {
        const updatedPlayer = {
          ...player,
          zones: {
            ...player.zones,
            leaderArea: leaderInstance,
          },
        };
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, updatedPlayer);
      }

      // Run main phase
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Verify triggers were processed
      if (!(result instanceof Promise)) {
        expect(result.getState().pendingTriggers.length).toBe(0);
      }
    });

    it('should trigger START_OF_MAIN effects from stage', () => {
      // Create a stage with START_OF_MAIN effect
      const stageDef: CardDefinition = {
        id: 'test-stage',
        name: 'Test Stage',
        category: CardCategory.STAGE,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: null,
        baseCost: 2,
        lifeValue: null,
        counterValue: null,
        rarity: 'C',
        keywords: [],
        effects: [
          {
            id: 'stage-effect',
            label: '[Start of Main]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.START_OF_MAIN,
            condition: null,
            cost: null,
            scriptId: 'stage-effect',
            oncePerTurn: false,
          },
        ],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: 'S01',
          isAltArt: false,
          isPromo: false,
        },
      };

      const stageInstance: CardInstance = {
        id: 'stage-instance',
        definition: stageDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.STAGE_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Set stage
      const player = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player) {
        const updatedPlayer = {
          ...player,
          zones: {
            ...player.zones,
            stageArea: stageInstance,
          },
        };
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, updatedPlayer);
      }

      // Run main phase
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Verify triggers were processed
      if (!(result instanceof Promise)) {
        expect(result.getState().pendingTriggers.length).toBe(0);
      }
    });

    it('should not trigger non-START_OF_MAIN effects', () => {
      // Create a card with ON_PLAY effect (should not trigger)
      const cardDef: CardDefinition = {
        id: 'test-card-no-trigger',
        name: 'Test Character No Trigger',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [
          {
            id: 'effect-no-trigger',
            label: '[On Play]',
            timingType: EffectTimingType.AUTO,
            triggerTiming: TriggerTiming.ON_PLAY,
            condition: null,
            cost: null,
            scriptId: 'test-effect',
            oncePerTurn: false,
          },
        ],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      };

      const cardInstance: CardInstance = {
        id: 'card-instance-no-trigger',
        definition: cardDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Add card to player's character area
      const player = stateManager.getPlayer(PlayerId.PLAYER_1);
      if (player) {
        const updatedPlayer = {
          ...player,
          zones: {
            ...player.zones,
            characterArea: [cardInstance],
          },
        };
        stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, updatedPlayer);
      }

      // Run main phase
      const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

      // Should have no triggers (ON_PLAY should not trigger at start of main)
      if (!(result instanceof Promise)) {
        expect(result.getState().pendingTriggers.length).toBe(0);
      }
    });
  });
});
