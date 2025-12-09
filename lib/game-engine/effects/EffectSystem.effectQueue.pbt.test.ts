/**
 * Property-Based Test: Effect Queue Management
 * 
 * Feature: ai-battle-integration, Property 20: Effect Queue Management
 * Validates: Requirements 15.5
 * 
 * Property: For any triggered effect, it should be added to the effect queue 
 * and remain there until resolved.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { EffectSystem } from './EffectSystem';
import { GameStateManager } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  GameEvent,
  GameEventType,
  EffectDefinition,
  EffectTimingType,
  TriggerTiming,
  PlayerId,
  ZoneId,
  CardCategory,
  CardState,
  Phase,
  CardInstance,
  CardDefinition,
} from '../core/types';

// ============================================================================
// Arbitraries
// ============================================================================

/**
 * Generate a trigger timing value
 */
const arbTriggerTiming = fc.constantFrom(
  TriggerTiming.ON_PLAY,
  TriggerTiming.WHEN_ATTACKING,
  TriggerTiming.WHEN_ATTACKED,
  TriggerTiming.ON_KO,
  TriggerTiming.START_OF_TURN,
  TriggerTiming.END_OF_TURN,
  TriggerTiming.ON_BLOCK,
  TriggerTiming.COUNTER_STEP
);

/**
 * Generate an effect definition with AUTO timing
 */
const arbAutoEffectDefinition = fc.record({
  id: fc.string(),
  label: fc.string(),
  timingType: fc.constant(EffectTimingType.AUTO),
  triggerTiming: arbTriggerTiming,
  condition: fc.constant(null),
  cost: fc.constant(null),
  scriptId: fc.string(),
  oncePerTurn: fc.constant(false),
});

/**
 * Generate a game event type
 */
const arbGameEventType = fc.constantFrom(
  GameEventType.CARD_PLAYED,
  GameEventType.ATTACK_DECLARED,
  GameEventType.CARD_MOVED,
  GameEventType.TURN_START,
  GameEventType.TURN_END,
  GameEventType.BLOCK_DECLARED,
  GameEventType.COUNTER_STEP_START
);

/**
 * Generate a game event
 */
const arbGameEvent = fc.record({
  type: arbGameEventType,
  playerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2, null),
  cardId: fc.option(fc.string(), { nil: null }),
  data: fc.record({
    toZone: fc.option(fc.constantFrom(...Object.values(ZoneId)), { nil: undefined }),
  }),
  timestamp: fc.nat(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an effect should trigger on a given event
 */
function shouldEffectTrigger(effectDef: EffectDefinition, event: GameEvent): boolean {
  if (effectDef.timingType !== EffectTimingType.AUTO) {
    return false;
  }

  if (!effectDef.triggerTiming) {
    return false;
  }

  switch (effectDef.triggerTiming) {
    case TriggerTiming.ON_PLAY:
      return event.type === GameEventType.CARD_PLAYED;
    
    case TriggerTiming.WHEN_ATTACKING:
      return event.type === GameEventType.ATTACK_DECLARED;
    
    case TriggerTiming.WHEN_ATTACKED:
      return event.type === GameEventType.ATTACK_DECLARED;
    
    case TriggerTiming.ON_KO:
      return event.type === GameEventType.CARD_MOVED && 
             event.data?.toZone === ZoneId.TRASH;
    
    case TriggerTiming.START_OF_TURN:
      return event.type === GameEventType.TURN_START;
    
    case TriggerTiming.END_OF_TURN:
      return event.type === GameEventType.TURN_END;
    
    case TriggerTiming.ON_BLOCK:
      return event.type === GameEventType.BLOCK_DECLARED;
    
    case TriggerTiming.COUNTER_STEP:
      return event.type === GameEventType.COUNTER_STEP_START;
    
    default:
      return false;
  }
}

/**
 * Create a minimal game state for testing
 */
function createMinimalGameState(cards: CardInstance[]): any {
  const player1Cards = cards.filter(c => c.controller === PlayerId.PLAYER_1);
  const player2Cards = cards.filter(c => c.controller === PlayerId.PLAYER_2);

  const createPlayerState = (playerId: PlayerId, playerCards: CardInstance[]) => ({
    id: playerId,
    zones: {
      deck: playerCards.filter(c => c.zone === ZoneId.DECK),
      hand: playerCards.filter(c => c.zone === ZoneId.HAND),
      trash: playerCards.filter(c => c.zone === ZoneId.TRASH),
      life: playerCards.filter(c => c.zone === ZoneId.LIFE),
      donDeck: [],
      costArea: [],
      leaderArea: null,
      characterArea: playerCards.filter(c => c.zone === ZoneId.CHARACTER_AREA),
      stageArea: null,
    },
    flags: new Map(),
  });

  return {
    players: new Map([
      [PlayerId.PLAYER_1, createPlayerState(PlayerId.PLAYER_1, player1Cards)],
      [PlayerId.PLAYER_2, createPlayerState(PlayerId.PLAYER_2, player2Cards)],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.MAIN,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 4,
    },
    attackedThisTurn: new Set(),
  };
}

/**
 * Create a card instance with an effect
 */
function createCardWithEffect(
  effectDef: EffectDefinition,
  controller: PlayerId,
  index: number
): CardInstance {
  const cardDef: CardDefinition = {
    id: `card-${controller}-${index}`,
    name: `Test Card ${controller} ${index}`,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 1000,
    baseCost: 1,
    lifeValue: null,
    counterValue: null,
    rarity: 'C',
    keywords: [],
    effects: [effectDef],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: `${index}`,
      isAltArt: false,
      isPromo: false,
    },
  };

  return {
    id: `instance-${controller}-${index}`,
    definition: cardDef,
    owner: controller,
    controller,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

// ============================================================================
// Property Tests
// ============================================================================

describe('EffectSystem - Effect Queue Management (Property 20)', () => {
  describe('Property: Triggered effects are added to queue and remain until resolved', () => {
    it('should add all triggered effects to the queue', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoEffectDefinition, { minLength: 1, maxLength: 5 }),
          arbGameEvent,
          (effectDefs, event) => {
            // Create card instances with the generated effects
            const cardInstances: CardInstance[] = effectDefs.map((effectDef, index) =>
              createCardWithEffect(effectDef, PlayerId.PLAYER_1, index)
            );

            // Create game state
            const gameState = createMinimalGameState(cardInstances);
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Get initial stack size (should be empty)
            const initialStack = effectSystem.getEffectStack();
            expect(initialStack.length).toBe(0);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack after triggering
            const effectStack = effectSystem.getEffectStack();

            // Count how many effects should have triggered
            const expectedTriggers = effectDefs.filter(effectDef =>
              shouldEffectTrigger(effectDef, event)
            );

            // Verify that all expected effects are in the queue
            expect(effectStack.length).toBe(expectedTriggers.length);

            // Verify each expected effect is present in the queue
            for (const expectedEffect of expectedTriggers) {
              const found = effectStack.some(entry =>
                entry.effect.effectDefinition.id === expectedEffect.id
              );
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain effects in queue until explicitly cleared', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoEffectDefinition, { minLength: 1, maxLength: 3 }),
          arbGameEvent,
          (effectDefs, event) => {
            // Create card instances with the generated effects
            const cardInstances: CardInstance[] = effectDefs.map((effectDef, index) =>
              createCardWithEffect(effectDef, PlayerId.PLAYER_1, index)
            );

            // Create game state
            const gameState = createMinimalGameState(cardInstances);
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack
            const effectStack1 = effectSystem.getEffectStack();
            const initialCount = effectStack1.length;

            // Get the stack again without resolving - should be the same
            const effectStack2 = effectSystem.getEffectStack();
            expect(effectStack2.length).toBe(initialCount);

            // Verify the effects are the same
            for (let i = 0; i < initialCount; i++) {
              expect(effectStack2[i].effect.effectDefinition.id).toBe(
                effectStack1[i].effect.effectDefinition.id
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow clearing the effect queue', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoEffectDefinition, { minLength: 1, maxLength: 3 }),
          arbGameEvent,
          (effectDefs, event) => {
            // Create card instances with the generated effects
            const cardInstances: CardInstance[] = effectDefs.map((effectDef, index) =>
              createCardWithEffect(effectDef, PlayerId.PLAYER_1, index)
            );

            // Create game state
            const gameState = createMinimalGameState(cardInstances);
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack
            const effectStack = effectSystem.getEffectStack();
            const initialCount = effectStack.length;

            // Clear the stack
            effectSystem.clearEffectStack();

            // Verify the stack is now empty
            const clearedStack = effectSystem.getEffectStack();
            expect(clearedStack.length).toBe(0);

            // Verify we had effects before clearing (if any should have triggered)
            const expectedTriggers = effectDefs.filter(effectDef =>
              shouldEffectTrigger(effectDef, event)
            );
            if (expectedTriggers.length > 0) {
              expect(initialCount).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple trigger events accumulating effects', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoEffectDefinition, { minLength: 1, maxLength: 2 }),
          fc.array(arbGameEvent, { minLength: 2, maxLength: 3 }),
          (effectDefs, events) => {
            // Create card instances with the generated effects
            const cardInstances: CardInstance[] = effectDefs.map((effectDef, index) =>
              createCardWithEffect(effectDef, PlayerId.PLAYER_1, index)
            );

            // Create game state
            const gameState = createMinimalGameState(cardInstances);
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects for each event
            let totalExpectedTriggers = 0;
            for (const event of events) {
              effectSystem.triggerEffects(event);
              
              // Count expected triggers for this event
              const expectedForThisEvent = effectDefs.filter(effectDef =>
                shouldEffectTrigger(effectDef, event)
              );
              totalExpectedTriggers += expectedForThisEvent.length;
            }

            // Get the effect stack
            const effectStack = effectSystem.getEffectStack();

            // Verify that all effects from all events are in the queue
            expect(effectStack.length).toBe(totalExpectedTriggers);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve effect metadata in the queue', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoEffectDefinition, { minLength: 1, maxLength: 3 }),
          arbGameEvent,
          (effectDefs, event) => {
            // Create card instances with the generated effects
            const cardInstances: CardInstance[] = effectDefs.map((effectDef, index) =>
              createCardWithEffect(effectDef, PlayerId.PLAYER_1, index)
            );

            // Create game state
            const gameState = createMinimalGameState(cardInstances);
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack
            const effectStack = effectSystem.getEffectStack();

            // Verify each effect in the queue has proper metadata
            for (const entry of effectStack) {
              // Should have effect instance
              expect(entry.effect).toBeDefined();
              expect(entry.effect.effectDefinition).toBeDefined();
              expect(entry.effect.source).toBeDefined();
              expect(entry.effect.controller).toBeDefined();

              // Should have priority
              expect(entry.priority).toBeDefined();
              expect(typeof entry.priority).toBe('number');

              // Should have timestamp
              expect(entry.addedAt).toBeDefined();
              expect(typeof entry.addedAt).toBe('number');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
