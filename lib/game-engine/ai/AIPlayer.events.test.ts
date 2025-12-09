/**
 * AIPlayer.events.test.ts
 * 
 * Tests for AI Player event emission functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIPlayer, createAIPlayer } from './AIPlayer';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import {
  PlayerId,
  GameState,
  GameAction,
  ActionType,
  CardInstance,
  CounterAction,
  Target,
  TargetType,
  EffectInstance,
  Phase,
  ZoneId,
  CardCategory,
  CardState,
} from '../core/types';
import { createInitialGameState } from '../core/GameState';

describe('AIPlayer Event Emission', () => {
  let eventEmitter: EventEmitter;
  let aiPlayer: AIPlayer;
  let gameState: GameState;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    aiPlayer = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced', eventEmitter);
    gameState = createInitialGameState();
  });

  describe('chooseAction', () => {
    it('should emit AI_THINKING_START before making decision', async () => {
      const thinkingStartSpy = vi.fn();
      eventEmitter.on(GameEventType.AI_THINKING_START, thinkingStartSpy);

      const actions: GameAction[] = [
        {
          type: ActionType.PASS_PRIORITY,
          playerId: PlayerId.PLAYER_1,
          data: {},
          timestamp: Date.now(),
        },
      ];

      await aiPlayer.chooseAction(actions, gameState);

      expect(thinkingStartSpy).toHaveBeenCalledTimes(1);
      const event = thinkingStartSpy.mock.calls[0][0];
      expect(event.type).toBe(GameEventType.AI_THINKING_START);
      expect(event.playerId).toBe(PlayerId.PLAYER_1);
      expect(event.decisionType).toBe('chooseAction');
      expect(event.optionsCount).toBe(1);
    });

    it('should emit AI_THINKING_END after making decision', async () => {
      const thinkingEndSpy = vi.fn();
      eventEmitter.on(GameEventType.AI_THINKING_END, thinkingEndSpy);

      const actions: GameAction[] = [
        {
          type: ActionType.PASS_PRIORITY,
          playerId: PlayerId.PLAYER_1,
          data: {},
          timestamp: Date.now(),
        },
      ];

      await aiPlayer.chooseAction(actions, gameState);

      expect(thinkingEndSpy).toHaveBeenCalledTimes(1);
      const event = thinkingEndSpy.mock.calls[0][0];
      expect(event.type).toBe(GameEventType.AI_THINKING_END);
      expect(event.playerId).toBe(PlayerId.PLAYER_1);
      expect(event.decisionType).toBe('chooseAction');
      expect(event.thinkingTimeMs).toBeGreaterThan(0);
    });

    it('should emit AI_ACTION_SELECTED with selected action', async () => {
      const actionSelectedSpy = vi.fn();
      eventEmitter.on(GameEventType.AI_ACTION_SELECTED, actionSelectedSpy);

      const actions: GameAction[] = [
        {
          type: ActionType.PASS_PRIORITY,
          playerId: PlayerId.PLAYER_1,
          data: {},
          timestamp: Date.now(),
        },
      ];

      const result = await aiPlayer.chooseAction(actions, gameState);

      expect(actionSelectedSpy).toHaveBeenCalledTimes(1);
      const event = actionSelectedSpy.mock.calls[0][0];
      expect(event.type).toBe(GameEventType.AI_ACTION_SELECTED);
      expect(event.playerId).toBe(PlayerId.PLAYER_1);
      expect(event.decisionType).toBe('chooseAction');
      expect(event.selectedOption).toBe(result);
      expect(event.allOptions).toEqual(actions);
    });

    it('should emit all three events in correct order', async () => {
      const eventOrder: string[] = [];
      
      eventEmitter.on(GameEventType.AI_THINKING_START, () => {
        eventOrder.push('START');
      });
      eventEmitter.on(GameEventType.AI_THINKING_END, () => {
        eventOrder.push('END');
      });
      eventEmitter.on(GameEventType.AI_ACTION_SELECTED, () => {
        eventOrder.push('SELECTED');
      });

      const actions: GameAction[] = [
        {
          type: ActionType.PASS_PRIORITY,
          playerId: PlayerId.PLAYER_1,
          data: {},
          timestamp: Date.now(),
        },
      ];

      await aiPlayer.chooseAction(actions, gameState);

      expect(eventOrder).toEqual(['START', 'END', 'SELECTED']);
    });
  });

  describe('chooseMulligan', () => {
    it('should emit thinking events for mulligan decision', async () => {
      const thinkingStartSpy = vi.fn();
      const thinkingEndSpy = vi.fn();
      const actionSelectedSpy = vi.fn();

      eventEmitter.on(GameEventType.AI_THINKING_START, thinkingStartSpy);
      eventEmitter.on(GameEventType.AI_THINKING_END, thinkingEndSpy);
      eventEmitter.on(GameEventType.AI_ACTION_SELECTED, actionSelectedSpy);

      const hand: CardInstance[] = [];

      await aiPlayer.chooseMulligan(hand, gameState);

      expect(thinkingStartSpy).toHaveBeenCalledTimes(1);
      expect(thinkingEndSpy).toHaveBeenCalledTimes(1);
      expect(actionSelectedSpy).toHaveBeenCalledTimes(1);

      const startEvent = thinkingStartSpy.mock.calls[0][0];
      expect(startEvent.decisionType).toBe('chooseMulligan');
      expect(startEvent.optionsCount).toBe(2); // Keep or mulligan
    });
  });

  describe('chooseBlocker', () => {
    it('should emit thinking events for blocker decision', async () => {
      const thinkingStartSpy = vi.fn();
      const thinkingEndSpy = vi.fn();
      const actionSelectedSpy = vi.fn();

      eventEmitter.on(GameEventType.AI_THINKING_START, thinkingStartSpy);
      eventEmitter.on(GameEventType.AI_THINKING_END, thinkingEndSpy);
      eventEmitter.on(GameEventType.AI_ACTION_SELECTED, actionSelectedSpy);

      const blockers: CardInstance[] = [];
      const attacker: CardInstance = {
        id: 'attacker-1',
        definition: {
          id: 'card-1',
          name: 'Test Attacker',
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
        owner: PlayerId.PLAYER_2,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.RESTED,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      await aiPlayer.chooseBlocker(blockers, attacker, gameState);

      expect(thinkingStartSpy).toHaveBeenCalledTimes(1);
      expect(thinkingEndSpy).toHaveBeenCalledTimes(1);
      expect(actionSelectedSpy).toHaveBeenCalledTimes(1);

      const startEvent = thinkingStartSpy.mock.calls[0][0];
      expect(startEvent.decisionType).toBe('chooseBlocker');
      expect(startEvent.optionsCount).toBe(1); // No blockers + null option
    });
  });

  describe('chooseCounterAction', () => {
    it('should emit thinking events for counter decision', async () => {
      const thinkingStartSpy = vi.fn();
      const thinkingEndSpy = vi.fn();
      const actionSelectedSpy = vi.fn();

      eventEmitter.on(GameEventType.AI_THINKING_START, thinkingStartSpy);
      eventEmitter.on(GameEventType.AI_THINKING_END, thinkingEndSpy);
      eventEmitter.on(GameEventType.AI_ACTION_SELECTED, actionSelectedSpy);

      const options: CounterAction[] = [
        { type: 'PASS' },
      ];

      await aiPlayer.chooseCounterAction(options, gameState);

      expect(thinkingStartSpy).toHaveBeenCalledTimes(1);
      expect(thinkingEndSpy).toHaveBeenCalledTimes(1);
      expect(actionSelectedSpy).toHaveBeenCalledTimes(1);

      const startEvent = thinkingStartSpy.mock.calls[0][0];
      expect(startEvent.decisionType).toBe('chooseCounterAction');
    });
  });

  describe('chooseTarget', () => {
    it('should emit thinking events for target selection', async () => {
      const thinkingStartSpy = vi.fn();
      const thinkingEndSpy = vi.fn();
      const actionSelectedSpy = vi.fn();

      eventEmitter.on(GameEventType.AI_THINKING_START, thinkingStartSpy);
      eventEmitter.on(GameEventType.AI_THINKING_END, thinkingEndSpy);
      eventEmitter.on(GameEventType.AI_ACTION_SELECTED, actionSelectedSpy);

      const targets: Target[] = [
        { type: TargetType.PLAYER, playerId: PlayerId.PLAYER_2 },
      ];

      const effect: EffectInstance = {
        effectDefinition: {
          id: 'effect-1',
          label: '[On Play]',
          timingType: 'AUTO' as any,
          triggerTiming: null,
          condition: null,
          cost: null,
          scriptId: 'test-script',
          oncePerTurn: false,
        },
        source: {} as CardInstance,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        context: null,
      };

      await aiPlayer.chooseTarget(targets, effect, gameState);

      expect(thinkingStartSpy).toHaveBeenCalledTimes(1);
      expect(thinkingEndSpy).toHaveBeenCalledTimes(1);
      expect(actionSelectedSpy).toHaveBeenCalledTimes(1);

      const startEvent = thinkingStartSpy.mock.calls[0][0];
      expect(startEvent.decisionType).toBe('chooseTarget');
    });
  });

  describe('chooseValue', () => {
    it('should emit thinking events for value selection', async () => {
      const thinkingStartSpy = vi.fn();
      const thinkingEndSpy = vi.fn();
      const actionSelectedSpy = vi.fn();

      eventEmitter.on(GameEventType.AI_THINKING_START, thinkingStartSpy);
      eventEmitter.on(GameEventType.AI_THINKING_END, thinkingEndSpy);
      eventEmitter.on(GameEventType.AI_ACTION_SELECTED, actionSelectedSpy);

      const options = [1, 2, 3];

      const effect: EffectInstance = {
        effectDefinition: {
          id: 'effect-1',
          label: '[On Play]',
          timingType: 'AUTO' as any,
          triggerTiming: null,
          condition: null,
          cost: null,
          scriptId: 'test-script',
          oncePerTurn: false,
        },
        source: {} as CardInstance,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        context: null,
      };

      await aiPlayer.chooseValue(options, effect, gameState);

      expect(thinkingStartSpy).toHaveBeenCalledTimes(1);
      expect(thinkingEndSpy).toHaveBeenCalledTimes(1);
      expect(actionSelectedSpy).toHaveBeenCalledTimes(1);

      const startEvent = thinkingStartSpy.mock.calls[0][0];
      expect(startEvent.decisionType).toBe('chooseValue');
    });
  });

  describe('without EventEmitter', () => {
    it('should work without emitting events when no EventEmitter provided', async () => {
      const aiPlayerNoEvents = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced');

      const actions: GameAction[] = [
        {
          type: ActionType.PASS_PRIORITY,
          playerId: PlayerId.PLAYER_1,
          data: {},
          timestamp: Date.now(),
        },
      ];

      // Should not throw error
      const result = await aiPlayerNoEvents.chooseAction(actions, gameState);
      expect(result).toBeDefined();
    });
  });
});
