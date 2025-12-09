/**
 * TriggerQueue.test.ts
 * 
 * Unit tests for the TriggerQueue system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerQueue } from './TriggerQueue';
import { EffectSystem } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  TriggerInstance,
  PlayerId,
  CardInstance,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  GameEventType,
  EffectDefinition,
} from '../core/types';

describe('TriggerQueue', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;
  let triggerQueue: TriggerQueue;

  // Helper to create a test card
  const createTestCard = (id: string, owner: PlayerId): CardInstance => ({
    id,
    definition: {
      id: `def-${id}`,
      name: `Test Card ${id}`,
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
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  });

  // Helper to create a test effect definition
  const createTestEffect = (id: string, timing: TriggerTiming): EffectDefinition => ({
    id,
    label: `[${timing}]`,
    timingType: EffectTimingType.AUTO,
    triggerTiming: timing,
    condition: null,
    cost: null,
    scriptId: `script-${id}`,
    oncePerTurn: false,
  });

  // Helper to create a test trigger
  const createTestTrigger = (
    card: CardInstance,
    effectDef: EffectDefinition,
    priority: number = 0
  ): TriggerInstance => ({
    effectDefinition: effectDef,
    source: card,
    controller: card.controller,
    event: {
      type: GameEventType.CARD_MOVED,
      playerId: card.controller,
      cardId: card.id,
      data: {},
      timestamp: Date.now(),
    },
    priority,
  });

  beforeEach(() => {
    // Initialize state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Initialize subsystems
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
    triggerQueue = new TriggerQueue(stateManager, effectSystem);
  });

  describe('enqueueTrigger', () => {
    it('should add a trigger to the queue', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const effect = createTestEffect('effect1', TriggerTiming.ON_PLAY);
      const trigger = createTestTrigger(card, effect);

      triggerQueue.enqueueTrigger(trigger);

      expect(triggerQueue.getQueueSize()).toBe(1);
    });

    it('should add multiple triggers to the queue', () => {
      const card1 = createTestCard('card1', PlayerId.PLAYER_1);
      const card2 = createTestCard('card2', PlayerId.PLAYER_2);
      const effect = createTestEffect('effect1', TriggerTiming.ON_PLAY);
      
      const trigger1 = createTestTrigger(card1, effect);
      const trigger2 = createTestTrigger(card2, effect);

      triggerQueue.enqueueTrigger(trigger1);
      triggerQueue.enqueueTrigger(trigger2);

      expect(triggerQueue.getQueueSize()).toBe(2);
    });
  });

  describe('resolveAllPendingTriggers', () => {
    it('should resolve turn player triggers before non-turn player triggers', () => {
      const resolutionOrder: string[] = [];

      // Create cards for both players
      const p1Card = createTestCard('p1-card', PlayerId.PLAYER_1);
      const p2Card = createTestCard('p2-card', PlayerId.PLAYER_2);

      // Create effects with scripts that track resolution order
      const p1Effect = createTestEffect('p1-effect', TriggerTiming.ON_PLAY);
      const p2Effect = createTestEffect('p2-effect', TriggerTiming.ON_PLAY);

      // Register scripts that track resolution
      effectSystem.registerScript('script-p1-effect', () => {
        resolutionOrder.push('p1');
      });
      effectSystem.registerScript('script-p2-effect', () => {
        resolutionOrder.push('p2');
      });

      // Create triggers
      const p1Trigger = createTestTrigger(p1Card, p1Effect);
      const p2Trigger = createTestTrigger(p2Card, p2Effect);

      // Enqueue in reverse order (non-turn player first)
      triggerQueue.enqueueTrigger(p2Trigger);
      triggerQueue.enqueueTrigger(p1Trigger);

      // Resolve all triggers
      triggerQueue.resolveAllPendingTriggers();

      // Turn player (PLAYER_1) should resolve first
      expect(resolutionOrder).toEqual(['p1', 'p2']);
      expect(triggerQueue.getQueueSize()).toBe(0);
    });

    it('should resolve triggers by priority within same player', () => {
      const resolutionOrder: string[] = [];

      // Create cards for same player
      const card1 = createTestCard('card1', PlayerId.PLAYER_1);
      const card2 = createTestCard('card2', PlayerId.PLAYER_1);

      // Create effects
      const effect1 = createTestEffect('effect1', TriggerTiming.ON_PLAY);
      const effect2 = createTestEffect('effect2', TriggerTiming.ON_PLAY);

      // Register scripts
      effectSystem.registerScript('script-effect1', () => {
        resolutionOrder.push('effect1');
      });
      effectSystem.registerScript('script-effect2', () => {
        resolutionOrder.push('effect2');
      });

      // Create triggers with different priorities
      const trigger1 = createTestTrigger(card1, effect1, 1); // Lower priority
      const trigger2 = createTestTrigger(card2, effect2, 5); // Higher priority

      // Enqueue in reverse priority order
      triggerQueue.enqueueTrigger(trigger1);
      triggerQueue.enqueueTrigger(trigger2);

      // Resolve all triggers
      triggerQueue.resolveAllPendingTriggers();

      // Higher priority should resolve first
      expect(resolutionOrder).toEqual(['effect2', 'effect1']);
    });

    it('should handle newly created triggers during resolution', () => {
      const resolutionOrder: string[] = [];

      // Create initial card
      const card1 = createTestCard('card1', PlayerId.PLAYER_1);
      const effect1 = createTestEffect('effect1', TriggerTiming.ON_PLAY);

      // Register script that creates a new trigger
      effectSystem.registerScript('script-effect1', (context) => {
        resolutionOrder.push('effect1');

        // Create a new trigger during resolution
        const card2 = createTestCard('card2', PlayerId.PLAYER_1);
        const effect2 = createTestEffect('effect2', TriggerTiming.ON_PLAY);
        const newTrigger = createTestTrigger(card2, effect2);

        // Add to state's pending triggers
        const updatedState = context.state;
        const newStateManager = new GameStateManager(updatedState);
        const withTrigger = newStateManager.addPendingTrigger(newTrigger);
        effectSystem.updateStateManager(withTrigger);
      });

      effectSystem.registerScript('script-effect2', () => {
        resolutionOrder.push('effect2');
      });

      // Create initial trigger
      const trigger1 = createTestTrigger(card1, effect1);
      triggerQueue.enqueueTrigger(trigger1);

      // Resolve all triggers
      triggerQueue.resolveAllPendingTriggers();

      // Both effects should have resolved
      expect(resolutionOrder).toEqual(['effect1', 'effect2']);
    });

    it('should clear queue after resolution', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const effect = createTestEffect('effect1', TriggerTiming.ON_PLAY);
      const trigger = createTestTrigger(card, effect);

      // Register a no-op script
      effectSystem.registerScript('script-effect1', () => {});

      triggerQueue.enqueueTrigger(trigger);
      expect(triggerQueue.getQueueSize()).toBe(1);

      triggerQueue.resolveAllPendingTriggers();

      expect(triggerQueue.getQueueSize()).toBe(0);
    });

    it('should handle empty queue gracefully', () => {
      expect(() => {
        triggerQueue.resolveAllPendingTriggers();
      }).not.toThrow();

      expect(triggerQueue.getQueueSize()).toBe(0);
    });
  });

  describe('resolveSingleTrigger', () => {
    it('should resolve a trigger through the effect system', () => {
      let scriptExecuted = false;

      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const effect = createTestEffect('effect1', TriggerTiming.ON_PLAY);

      // Register script
      effectSystem.registerScript('script-effect1', () => {
        scriptExecuted = true;
      });

      const trigger = createTestTrigger(card, effect);

      triggerQueue.resolveSingleTrigger(trigger);

      expect(scriptExecuted).toBe(true);
    });

    it('should handle errors during trigger resolution', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const effect = createTestEffect('effect1', TriggerTiming.ON_PLAY);

      // Register script that throws error
      effectSystem.registerScript('script-effect1', () => {
        throw new Error('Test error');
      });

      const trigger = createTestTrigger(card, effect);

      // Should not throw, but log error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        triggerQueue.resolveSingleTrigger(trigger);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('clearQueue', () => {
    it('should clear all triggers from the queue', () => {
      const card1 = createTestCard('card1', PlayerId.PLAYER_1);
      const card2 = createTestCard('card2', PlayerId.PLAYER_2);
      const effect = createTestEffect('effect1', TriggerTiming.ON_PLAY);

      const trigger1 = createTestTrigger(card1, effect);
      const trigger2 = createTestTrigger(card2, effect);

      triggerQueue.enqueueTrigger(trigger1);
      triggerQueue.enqueueTrigger(trigger2);

      expect(triggerQueue.getQueueSize()).toBe(2);

      triggerQueue.clearQueue();

      expect(triggerQueue.getQueueSize()).toBe(0);
    });
  });

  describe('updateStateManager', () => {
    it('should update the internal state manager reference', () => {
      const newState = createInitialGameState();
      const newStateManager = new GameStateManager(newState);

      triggerQueue.updateStateManager(newStateManager);

      // Verify by checking that we can still operate
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const effect = createTestEffect('effect1', TriggerTiming.ON_PLAY);
      const trigger = createTestTrigger(card, effect);

      expect(() => {
        triggerQueue.enqueueTrigger(trigger);
      }).not.toThrow();
    });
  });

  describe('integration with turn player priority', () => {
    it('should resolve complex multi-player trigger scenarios correctly', () => {
      const resolutionOrder: string[] = [];

      // Create multiple cards for both players
      const p1Card1 = createTestCard('p1-card1', PlayerId.PLAYER_1);
      const p1Card2 = createTestCard('p1-card2', PlayerId.PLAYER_1);
      const p2Card1 = createTestCard('p2-card1', PlayerId.PLAYER_2);
      const p2Card2 = createTestCard('p2-card2', PlayerId.PLAYER_2);

      // Create effects
      const p1Effect1 = createTestEffect('p1-effect1', TriggerTiming.ON_PLAY);
      const p1Effect2 = createTestEffect('p1-effect2', TriggerTiming.ON_PLAY);
      const p2Effect1 = createTestEffect('p2-effect1', TriggerTiming.ON_PLAY);
      const p2Effect2 = createTestEffect('p2-effect2', TriggerTiming.ON_PLAY);

      // Register scripts
      effectSystem.registerScript('script-p1-effect1', () => {
        resolutionOrder.push('p1-effect1');
      });
      effectSystem.registerScript('script-p1-effect2', () => {
        resolutionOrder.push('p1-effect2');
      });
      effectSystem.registerScript('script-p2-effect1', () => {
        resolutionOrder.push('p2-effect1');
      });
      effectSystem.registerScript('script-p2-effect2', () => {
        resolutionOrder.push('p2-effect2');
      });

      // Create triggers with priorities
      const p1Trigger1 = createTestTrigger(p1Card1, p1Effect1, 2);
      const p1Trigger2 = createTestTrigger(p1Card2, p1Effect2, 5);
      const p2Trigger1 = createTestTrigger(p2Card1, p2Effect1, 3);
      const p2Trigger2 = createTestTrigger(p2Card2, p2Effect2, 1);

      // Enqueue in random order
      triggerQueue.enqueueTrigger(p2Trigger1);
      triggerQueue.enqueueTrigger(p1Trigger1);
      triggerQueue.enqueueTrigger(p2Trigger2);
      triggerQueue.enqueueTrigger(p1Trigger2);

      // Resolve all triggers
      triggerQueue.resolveAllPendingTriggers();

      // Expected order:
      // 1. Turn player (P1) triggers by priority: p1-effect2 (5), p1-effect1 (2)
      // 2. Non-turn player (P2) triggers by priority: p2-effect1 (3), p2-effect2 (1)
      expect(resolutionOrder).toEqual([
        'p1-effect2',
        'p1-effect1',
        'p2-effect1',
        'p2-effect2',
      ]);
    });
  });
});
