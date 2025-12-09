/**
 * Property-Based Test: Trigger Identification
 * 
 * Feature: ai-battle-integration, Property 18: Trigger Identification
 * Validates: Requirements 15.1
 * 
 * Property: For any game event, all effects with matching trigger conditions 
 * should be identified and queued for resolution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
  oncePerTurn: fc.boolean(),
});

/**
 * Generate a card definition with effects
 */
const arbCardDefinitionWithEffects = (effects: EffectDefinition[]) =>
  fc.record({
    id: fc.string(),
    name: fc.string(),
    category: fc.constantFrom(...Object.values(CardCategory)),
    colors: fc.array(fc.string(), { minLength: 1, maxLength: 2 }),
    typeTags: fc.array(fc.string()),
    attributes: fc.array(fc.string()),
    basePower: fc.option(fc.nat(10000), { nil: null }),
    baseCost: fc.option(fc.nat(10), { nil: null }),
    lifeValue: fc.constant(null),
    counterValue: fc.option(fc.nat(2000), { nil: null }),
    rarity: fc.string(),
    keywords: fc.array(fc.string()),
    effects: fc.constant(effects),
    imageUrl: fc.string(),
    metadata: fc.record({
      setCode: fc.string(),
      cardNumber: fc.string(),
      isAltArt: fc.boolean(),
      isPromo: fc.boolean(),
    }),
  });

/**
 * Generate a card instance
 */
const arbCardInstance = (definition: CardDefinition, zone: ZoneId) =>
  fc.record({
    id: fc.uuid(),
    definition: fc.constant(definition),
    owner: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
    controller: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
    zone: fc.constant(zone),
    state: fc.constantFrom(...Object.values(CardState)),
    givenDon: fc.constant([]),
    modifiers: fc.constant([]),
    flags: fc.constant(new Map()),
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
 * Distributes cards intelligently across zones to avoid conflicts
 */
function createMinimalGameState(cards: CardInstance[]): any {
  const player1Cards = cards.filter(c => c.controller === PlayerId.PLAYER_1);
  const player2Cards = cards.filter(c => c.controller === PlayerId.PLAYER_2);

  const createPlayerState = (playerId: PlayerId, playerCards: CardInstance[]) => {
    // For single-card zones (leader, stage), only take the first card
    const leaderCards = playerCards.filter(c => c.zone === ZoneId.LEADER_AREA);
    const stageCards = playerCards.filter(c => c.zone === ZoneId.STAGE_AREA);
    
    return {
      id: playerId,
      zones: {
        deck: playerCards.filter(c => c.zone === ZoneId.DECK),
        hand: playerCards.filter(c => c.zone === ZoneId.HAND),
        trash: playerCards.filter(c => c.zone === ZoneId.TRASH),
        life: playerCards.filter(c => c.zone === ZoneId.LIFE),
        donDeck: [],
        costArea: [],
        leaderArea: leaderCards.length > 0 ? leaderCards[0] : null,
        characterArea: playerCards.filter(c => c.zone === ZoneId.CHARACTER_AREA),
        stageArea: stageCards.length > 0 ? stageCards[0] : null,
      },
      flags: new Map(),
    };
  };

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

// ============================================================================
// Property Tests
// ============================================================================

describe('EffectSystem - Trigger Identification (Property 18)', () => {
  describe('Property: All effects with matching trigger conditions should be identified', () => {
    it('should identify all AUTO effects that match the event trigger timing', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoEffectDefinition, { minLength: 1, maxLength: 5 }),
          arbGameEvent,
          (effectDefs, event) => {
            // Create card instances with the generated effects
            // Use CHARACTER_AREA for all cards since it can hold multiple cards
            const cardInstances: CardInstance[] = effectDefs.map((effectDef, index) => {
              const cardDef: CardDefinition = {
                id: `card-${index}`,
                name: `Test Card ${index}`,
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
                id: `instance-${index}`,
                definition: cardDef,
                owner: PlayerId.PLAYER_1,
                controller: PlayerId.PLAYER_1,
                zone: ZoneId.CHARACTER_AREA,
                state: CardState.ACTIVE,
                givenDon: [],
                modifiers: [],
                flags: new Map(),
              };
            });

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

            // Count how many effects should have triggered
            const expectedTriggers = effectDefs.filter(effectDef =>
              shouldEffectTrigger(effectDef, event)
            );

            // Verify that all expected effects are in the stack
            expect(effectStack.length).toBe(expectedTriggers.length);

            // Verify each expected effect is present
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

    it('should not trigger ACTIVATE or PERMANENT effects automatically', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              label: fc.string(),
              timingType: fc.constantFrom(EffectTimingType.ACTIVATE, EffectTimingType.PERMANENT),
              triggerTiming: fc.constant(null),
              condition: fc.constant(null),
              cost: fc.constant(null),
              scriptId: fc.string(),
              oncePerTurn: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          arbGameEvent,
          (effectDefs, event) => {
            // Create card instances with the generated effects
            // Use CHARACTER_AREA for all cards since it can hold multiple cards
            const cardInstances: CardInstance[] = effectDefs.map((effectDef, index) => {
              const cardDef: CardDefinition = {
                id: `card-${index}`,
                name: `Test Card ${index}`,
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
                id: `instance-${index}`,
                definition: cardDef,
                owner: PlayerId.PLAYER_1,
                controller: PlayerId.PLAYER_1,
                zone: ZoneId.CHARACTER_AREA,
                state: CardState.ACTIVE,
                givenDon: [],
                modifiers: [],
                flags: new Map(),
              };
            });

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

            // No effects should have triggered (ACTIVATE and PERMANENT don't auto-trigger)
            expect(effectStack.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect once-per-turn restrictions when identifying triggers', () => {
      fc.assert(
        fc.property(
          arbAutoEffectDefinition,
          arbGameEvent,
          fc.nat(10),
          (effectDef, event, turnNumber) => {
            // Make the effect once-per-turn
            const oncePerTurnEffect = { ...effectDef, oncePerTurn: true };

            // Create card definition
            const cardDef: CardDefinition = {
              id: 'card-1',
              name: 'Test Card',
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
              effects: [oncePerTurnEffect],
              imageUrl: '',
              metadata: {
                setCode: 'TEST',
                cardNumber: '1',
                isAltArt: false,
                isPromo: false,
              },
            };

            // Create card instance
            const cardInstance: CardInstance = {
              id: 'instance-1',
              definition: cardDef,
              owner: PlayerId.PLAYER_1,
              controller: PlayerId.PLAYER_1,
              zone: ZoneId.CHARACTER_AREA,
              state: CardState.ACTIVE,
              givenDon: [],
              modifiers: [],
              flags: new Map(),
            };

            // Mark the effect as already used this turn
            cardInstance.flags.set(`effect_${oncePerTurnEffect.id}_used_turn`, turnNumber);

            // Create game state
            const gameState = createMinimalGameState([cardInstance]);
            gameState.turnNumber = turnNumber;
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack
            const effectStack = effectSystem.getEffectStack();

            // Effect should not trigger if it was already used this turn
            if (shouldEffectTrigger(oncePerTurnEffect, event)) {
              expect(effectStack.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
