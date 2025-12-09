import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EventEmitter,
  GameEventType,
  CardMovedEvent,
  PhaseChangedEvent,
  GameOverEvent,
  AnyGameEvent,
} from './EventEmitter';
import { PlayerId, ZoneId, Phase, CardState } from '../core/types';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('Basic Event Emission', () => {
    it('should emit events to subscribed handlers', () => {
      const handler = vi.fn();
      emitter.on(GameEventType.CARD_MOVED, handler);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not call handlers for different event types', () => {
      const cardMovedHandler = vi.fn();
      const phaseChangedHandler = vi.fn();

      emitter.on(GameEventType.CARD_MOVED, cardMovedHandler);
      emitter.on(GameEventType.PHASE_CHANGED, phaseChangedHandler);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event);

      expect(cardMovedHandler).toHaveBeenCalledTimes(1);
      expect(phaseChangedHandler).not.toHaveBeenCalled();
    });

    it('should call multiple handlers for the same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      emitter.on(GameEventType.CARD_MOVED, handler1);
      emitter.on(GameEventType.CARD_MOVED, handler2);
      emitter.on(GameEventType.CARD_MOVED, handler3);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should add timestamp to events if not present', () => {
      const handler = vi.fn();
      emitter.on(GameEventType.CARD_MOVED, handler);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: 0,
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      const beforeEmit = Date.now();
      emitter.emit(event);
      const afterEmit = Date.now();

      expect(handler).toHaveBeenCalled();
      const emittedEvent = handler.mock.calls[0][0];
      expect(emittedEvent.timestamp).toBeGreaterThanOrEqual(beforeEmit);
      expect(emittedEvent.timestamp).toBeLessThanOrEqual(afterEmit);
    });
  });

  describe('Subscription Management', () => {
    it('should unsubscribe using off method', () => {
      const handler = vi.fn();
      emitter.on(GameEventType.CARD_MOVED, handler);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      emitter.off(GameEventType.CARD_MOVED, handler);
      emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should unsubscribe using subscription object', () => {
      const handler = vi.fn();
      const subscription = emitter.on(GameEventType.CARD_MOVED, handler);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle unsubscribing non-existent handler gracefully', () => {
      const handler = vi.fn();
      expect(() => {
        emitter.off(GameEventType.CARD_MOVED, handler);
      }).not.toThrow();
    });

    it('should clear all subscriptions', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on(GameEventType.CARD_MOVED, handler1);
      emitter.on(GameEventType.PHASE_CHANGED, handler2);

      emitter.clear();

      const event1: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      const event2: PhaseChangedEvent = {
        type: GameEventType.PHASE_CHANGED,
        timestamp: Date.now(),
        oldPhase: Phase.MAIN,
        newPhase: Phase.END,
        activePlayer: PlayerId.PLAYER_1,
      };

      emitter.emit(event1);
      emitter.emit(event2);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Event Filtering', () => {
    it('should filter events based on filter function', () => {
      const handler = vi.fn();
      const filter = (event: CardMovedEvent) => event.playerId === PlayerId.PLAYER_1;

      emitter.on(GameEventType.CARD_MOVED, handler, filter);

      const event1: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      const event2: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-2',
        playerId: PlayerId.PLAYER_2,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event1);
      emitter.emit(event2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event1);
    });

    it('should support complex filter conditions', () => {
      const handler = vi.fn();
      const filter = (event: CardMovedEvent) =>
        event.toZone === ZoneId.CHARACTER_AREA && event.fromZone === ZoneId.HAND;

      emitter.on(GameEventType.CARD_MOVED, handler, filter);

      const event1: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      const event2: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-2',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.DECK,
        toZone: ZoneId.HAND,
      };

      emitter.emit(event1);
      emitter.emit(event2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event1);
    });
  });

  describe('Wildcard Subscriptions', () => {
    it('should call wildcard handlers for all event types', () => {
      const handler = vi.fn();
      emitter.onAny(handler);

      const event1: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      const event2: PhaseChangedEvent = {
        type: GameEventType.PHASE_CHANGED,
        timestamp: Date.now(),
        oldPhase: Phase.MAIN,
        newPhase: Phase.END,
        activePlayer: PlayerId.PLAYER_1,
      };

      const event3: GameOverEvent = {
        type: GameEventType.GAME_OVER,
        timestamp: Date.now(),
        winner: PlayerId.PLAYER_1,
        reason: 'Deck out',
      };

      emitter.emit(event1);
      emitter.emit(event2);
      emitter.emit(event3);

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenNthCalledWith(1, event1);
      expect(handler).toHaveBeenNthCalledWith(2, event2);
      expect(handler).toHaveBeenNthCalledWith(3, event3);
    });

    it('should unsubscribe wildcard handlers', () => {
      const handler = vi.fn();
      const subscription = emitter.onAny(handler);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should filter wildcard subscriptions', () => {
      const handler = vi.fn();
      const filter = (event: AnyGameEvent) =>
        event.type === GameEventType.CARD_MOVED || event.type === GameEventType.PHASE_CHANGED;

      emitter.onAny(handler, filter);

      const event1: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      const event2: PhaseChangedEvent = {
        type: GameEventType.PHASE_CHANGED,
        timestamp: Date.now(),
        oldPhase: Phase.MAIN,
        newPhase: Phase.END,
        activePlayer: PlayerId.PLAYER_1,
      };

      const event3: GameOverEvent = {
        type: GameEventType.GAME_OVER,
        timestamp: Date.now(),
        winner: PlayerId.PLAYER_1,
        reason: 'Deck out',
      };

      emitter.emit(event1);
      emitter.emit(event2);
      emitter.emit(event3);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, event1);
      expect(handler).toHaveBeenNthCalledWith(2, event2);
    });
  });

  describe('Error Handling', () => {
    it('should catch and log errors in event handlers', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      emitter.on(GameEventType.CARD_MOVED, errorHandler);
      emitter.on(GameEventType.CARD_MOVED, normalHandler);

      const event: CardMovedEvent = {
        type: GameEventType.CARD_MOVED,
        timestamp: Date.now(),
        cardId: 'card-1',
        playerId: PlayerId.PLAYER_1,
        fromZone: ZoneId.HAND,
        toZone: ZoneId.CHARACTER_AREA,
      };

      emitter.emit(event);

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Subscription Queries', () => {
    it('should return correct subscription count', () => {
      expect(emitter.getSubscriptionCount(GameEventType.CARD_MOVED)).toBe(0);

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on(GameEventType.CARD_MOVED, handler1);
      expect(emitter.getSubscriptionCount(GameEventType.CARD_MOVED)).toBe(1);

      emitter.on(GameEventType.CARD_MOVED, handler2);
      expect(emitter.getSubscriptionCount(GameEventType.CARD_MOVED)).toBe(2);

      emitter.off(GameEventType.CARD_MOVED, handler1);
      expect(emitter.getSubscriptionCount(GameEventType.CARD_MOVED)).toBe(1);
    });

    it('should return correct wildcard subscription count', () => {
      expect(emitter.getWildcardSubscriptionCount()).toBe(0);

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.onAny(handler1);
      expect(emitter.getWildcardSubscriptionCount()).toBe(1);

      emitter.onAny(handler2);
      expect(emitter.getWildcardSubscriptionCount()).toBe(2);

      emitter.offAny(handler1);
      expect(emitter.getWildcardSubscriptionCount()).toBe(1);
    });

    it('should check if event type has subscriptions', () => {
      expect(emitter.hasSubscriptions(GameEventType.CARD_MOVED)).toBe(false);

      const handler = vi.fn();
      emitter.on(GameEventType.CARD_MOVED, handler);

      expect(emitter.hasSubscriptions(GameEventType.CARD_MOVED)).toBe(true);
      expect(emitter.hasSubscriptions(GameEventType.PHASE_CHANGED)).toBe(false);
    });

    it('should consider wildcard subscriptions in hasSubscriptions', () => {
      const handler = vi.fn();
      emitter.onAny(handler);

      expect(emitter.hasSubscriptions(GameEventType.CARD_MOVED)).toBe(true);
      expect(emitter.hasSubscriptions(GameEventType.PHASE_CHANGED)).toBe(true);
    });
  });

  describe('All Event Types', () => {
    it('should support all defined event types', () => {
      const handlers = {
        [GameEventType.CARD_MOVED]: vi.fn(),
        [GameEventType.CARD_STATE_CHANGED]: vi.fn(),
        [GameEventType.POWER_CHANGED]: vi.fn(),
        [GameEventType.ATTACK_DECLARED]: vi.fn(),
        [GameEventType.BLOCK_DECLARED]: vi.fn(),
        [GameEventType.COUNTER_STEP_START]: vi.fn(),
        [GameEventType.BATTLE_END]: vi.fn(),
        [GameEventType.PHASE_CHANGED]: vi.fn(),
        [GameEventType.TURN_START]: vi.fn(),
        [GameEventType.TURN_END]: vi.fn(),
        [GameEventType.GAME_OVER]: vi.fn(),
      };

      // Subscribe all handlers
      Object.entries(handlers).forEach(([type, handler]) => {
        emitter.on(type as GameEventType, handler);
      });

      // Emit each event type
      Object.keys(handlers).forEach((type) => {
        emitter.emit({
          type: type as GameEventType,
          timestamp: Date.now(),
        } as AnyGameEvent);
      });

      // Verify each handler was called exactly once
      Object.values(handlers).forEach((handler) => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });
});
