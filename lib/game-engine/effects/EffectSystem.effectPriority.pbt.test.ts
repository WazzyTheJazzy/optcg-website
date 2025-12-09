/**
 * Property-Based Test: Effect Resolution Priority
 * 
 * Feature: ai-battle-integration, Property 19: Effect Resolution Priority
 * Validates: Requirements 15.2
 * 
 * Property: For any set of simultaneously triggered effects, they should resolve 
 * in the correct priority order (active player's effects first, then opponent's effects).
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
 * Generate an effect definition with AUTO timing and ON_PLAY trigger
 */
const arbAutoOnPlayEffect = fc.record({
  id: fc.string(),
  label: fc.constant('[On Play]'),
  timingType: fc.constant(EffectTimingType.AUTO),
  triggerTiming: fc.constant(TriggerTiming.ON_PLAY),
  condition: fc.constant(null),
  cost: fc.constant(null),
  scriptId: fc.string(),
  oncePerTurn: fc.constant(false),
});

/**
 * Generate a CARD_PLAYED event
 */
const arbCardPlayedEvent: fc.Arbitrary<GameEvent> = fc.constant({
  type: GameEventType.CARD_PLAYED,
  playerId: PlayerId.PLAYER_1,
  cardId: null,
  data: {},
  timestamp: Date.now(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a minimal game state for testing
 */
function createMinimalGameState(
  player1Cards: CardInstance[],
  player2Cards: CardInstance[],
  activePlayer: PlayerId
): any {
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
    activePlayer,
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

describe('EffectSystem - Effect Resolution Priority (Property 19)', () => {
  describe('Property: Active player effects resolve before opponent effects', () => {
    it('should prioritize active player effects over opponent effects', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoOnPlayEffect, { minLength: 1, maxLength: 3 }),
          fc.array(arbAutoOnPlayEffect, { minLength: 1, maxLength: 3 }),
          fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
          arbCardPlayedEvent,
          (player1Effects, player2Effects, activePlayer, event) => {
            // Create cards for both players
            const player1Cards = player1Effects.map((effect, i) =>
              createCardWithEffect(effect, PlayerId.PLAYER_1, i)
            );
            const player2Cards = player2Effects.map((effect, i) =>
              createCardWithEffect(effect, PlayerId.PLAYER_2, i)
            );

            // Create game state
            const gameState = createMinimalGameState(player1Cards, player2Cards, activePlayer);
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack
            const effectStack = effectSystem.getEffectStack();

            // Verify that effects are ordered by priority
            // Active player effects should have higher priority
            const activePlayerEffects = effectStack.filter(
              entry => entry.effect.controller === activePlayer
            );
            const opponentEffects = effectStack.filter(
              entry => entry.effect.controller !== activePlayer
            );

            // All active player effects should come before opponent effects
            if (activePlayerEffects.length > 0 && opponentEffects.length > 0) {
              const lastActivePlayerIndex = effectStack.findIndex(
                entry => entry.effect.controller === activePlayer
              );
              const firstOpponentIndex = effectStack.findIndex(
                entry => entry.effect.controller !== activePlayer
              );

              // Find the last active player effect
              let lastActiveIndex = -1;
              for (let i = effectStack.length - 1; i >= 0; i--) {
                if (effectStack[i].effect.controller === activePlayer) {
                  lastActiveIndex = i;
                  break;
                }
              }

              // Find the first opponent effect
              let firstOpponentIdx = -1;
              for (let i = 0; i < effectStack.length; i++) {
                if (effectStack[i].effect.controller !== activePlayer) {
                  firstOpponentIdx = i;
                  break;
                }
              }

              // If both exist, active player effects should come first
              if (lastActiveIndex >= 0 && firstOpponentIdx >= 0) {
                expect(lastActiveIndex).toBeLessThan(firstOpponentIdx);
              }
            }

            // Verify priority values
            for (const entry of activePlayerEffects) {
              expect(entry.priority).toBe(1);
            }
            for (const entry of opponentEffects) {
              expect(entry.priority).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain priority order within same-priority effects', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoOnPlayEffect, { minLength: 2, maxLength: 5 }),
          fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
          arbCardPlayedEvent,
          (effects, activePlayer, event) => {
            // Create cards for the active player only
            const cards = effects.map((effect, i) =>
              createCardWithEffect(effect, activePlayer, i)
            );

            // Create game state
            const gameState = createMinimalGameState(
              activePlayer === PlayerId.PLAYER_1 ? cards : [],
              activePlayer === PlayerId.PLAYER_2 ? cards : [],
              activePlayer
            );
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack
            const effectStack = effectSystem.getEffectStack();

            // All effects should have the same priority (active player)
            for (const entry of effectStack) {
              expect(entry.priority).toBe(1);
            }

            // Verify all effects are present
            expect(effectStack.length).toBe(effects.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case with only opponent effects', () => {
      fc.assert(
        fc.property(
          fc.array(arbAutoOnPlayEffect, { minLength: 1, maxLength: 3 }),
          fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
          arbCardPlayedEvent,
          (effects, activePlayer, event) => {
            // Create cards for the opponent only
            const opponent = activePlayer === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
            const cards = effects.map((effect, i) =>
              createCardWithEffect(effect, opponent, i)
            );

            // Create game state
            const gameState = createMinimalGameState(
              opponent === PlayerId.PLAYER_1 ? cards : [],
              opponent === PlayerId.PLAYER_2 ? cards : [],
              activePlayer
            );
            const stateManager = new GameStateManager(gameState);
            const eventEmitter = new EventEmitter();
            const zoneManager = new ZoneManager(stateManager);
            const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

            // Trigger effects
            effectSystem.triggerEffects(event);

            // Get the effect stack
            const effectStack = effectSystem.getEffectStack();

            // All effects should have opponent priority
            for (const entry of effectStack) {
              expect(entry.priority).toBe(0);
            }

            // Verify all effects are present
            expect(effectStack.length).toBe(effects.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
