/**
 * EffectSystem.costBeforeResolution.pbt.test.ts
 * 
 * Property-based tests for cost payment before effect resolution
 * 
 * Feature: ai-battle-integration, Property 36: Cost Before Effect Resolution
 * Validates: Requirements 22.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { EffectSystem } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  CardDefinition,
  CardInstance,
  EffectDefinition,
  EffectTimingType,
  Color,
} from '../core/types';
import { EffectType } from './types';

/**
 * Property 36: Cost Before Effect Resolution
 * 
 * For any effect with a cost, the cost should be paid before the effect resolves.
 * 
 * This property ensures that:
 * 1. If a cost cannot be paid, the effect does not resolve
 * 2. Cost payment happens before effect execution
 * 3. Failed cost payment prevents effect resolution
 * 4. Effect scripts only execute after successful cost payment
 */

describe('Property 36: Cost Before Effect Resolution', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;

  // Helper to create a test card with effects
  const createTestCardWithEffect = (
    id: string,
    playerId: PlayerId,
    effect: EffectDefinition,
    zone: ZoneId = ZoneId.CHARACTER_AREA
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'] as Color[],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [effect],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition,
      owner: playerId,
      controller: playerId,
      zone,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper to add DON to cost area
  const addDonToCostArea = (playerId: PlayerId, count: number, state: CardState = CardState.ACTIVE) => {
    const gameState = stateManager.getState();
    const player = gameState.players.get(playerId);
    if (!player) return;

    for (let i = 0; i < count; i++) {
      const don = createTestCardWithEffect(`don-${i}`, playerId, {} as EffectDefinition, ZoneId.COST_AREA);
      don.definition.category = CardCategory.DON;
      don.definition.effects = [];
      don.state = state;
      player.zones.costArea.push(don);
    }
    
    stateManager = new GameStateManager(gameState);
    effectSystem.updateStateManager(stateManager);
    zoneManager.updateStateManager(stateManager);
  };

  // Helper to add card to game state
  const addCardToState = (card: CardInstance) => {
    const gameState = stateManager.getState();
    const player = gameState.players.get(card.controller);
    if (!player) return;

    player.zones.characterArea.push(card);
    
    stateManager = new GameStateManager(gameState);
    effectSystem.updateStateManager(stateManager);
    zoneManager.updateStateManager(stateManager);
  };

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  });

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 36.1: Effect with unaffordable cost does not activate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (costAmount) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Don't add any DON, so cost cannot be paid

          // Create effect with cost
          const effect: EffectDefinition = {
            id: 'test-effect',
            sourceCardId: 'test-card',
            label: '[Activate: Main]',
            timingType: EffectTimingType.ACTIVATE,
            triggerTiming: null,
            condition: null,
            cost: {
              type: 'REST_DON',
              amount: costAmount,
            },
            effectType: EffectType.POWER_MODIFICATION,
            parameters: {
              powerChange: 1000,
            },
            oncePerTurn: false,
            usedThisTurn: false,
          };

          const card = createTestCardWithEffect('test-card', PlayerId.PLAYER_1, effect);
          addCardToState(card);

          // Try to activate effect (should fail due to cost)
          let activationFailed = false;
          try {
            effectSystem.activateEffect(card.id, effect.id);
          } catch (error) {
            activationFailed = true;
          }

          // Activation should fail
          expect(activationFailed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 36.2: Effect with affordable cost activates successfully', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (costAmount) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Add enough DON to pay cost
          addDonToCostArea(PlayerId.PLAYER_1, costAmount + 2, CardState.ACTIVE);

          // Track if effect was executed
          let effectExecuted = false;
          const scriptId = 'test-script';
          effectSystem.registerScript(scriptId, () => {
            effectExecuted = true;
          });

          // Create effect with cost
          const effect: EffectDefinition = {
            id: 'test-effect',
            sourceCardId: 'test-card',
            label: '[Activate: Main]',
            timingType: EffectTimingType.ACTIVATE,
            triggerTiming: null,
            condition: null,
            cost: {
              type: 'REST_DON',
              amount: costAmount,
            },
            effectType: EffectType.POWER_MODIFICATION,
            parameters: {
              powerChange: 1000,
            },
            oncePerTurn: false,
            usedThisTurn: false,
            scriptId,
          };

          const card = createTestCardWithEffect('test-card', PlayerId.PLAYER_1, effect);
          addCardToState(card);

          // Activate effect (should succeed)
          let activationSucceeded = false;
          try {
            effectSystem.activateEffect(card.id, effect.id);
            activationSucceeded = true;
          } catch (error) {
            // Activation failed
          }

          // Activation should succeed and effect should execute
          expect(activationSucceeded).toBe(true);
          expect(effectExecuted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 36.3: Cost is paid before effect script executes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (costAmount) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Add enough DON to pay cost
          addDonToCostArea(PlayerId.PLAYER_1, costAmount + 2, CardState.ACTIVE);

          // Count active DON before activation
          const playerBefore = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const activeDonBefore = playerBefore!.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;

          // Track active DON when effect executes
          let activeDonDuringEffect = 0;
          const scriptId = 'test-script';
          effectSystem.registerScript(scriptId, () => {
            const player = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
            activeDonDuringEffect = player!.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;
          });

          // Create effect with cost
          const effect: EffectDefinition = {
            id: 'test-effect',
            sourceCardId: 'test-card',
            label: '[Activate: Main]',
            timingType: EffectTimingType.ACTIVATE,
            triggerTiming: null,
            condition: null,
            cost: {
              type: 'REST_DON',
              amount: costAmount,
            },
            effectType: EffectType.POWER_MODIFICATION,
            parameters: {
              powerChange: 1000,
            },
            oncePerTurn: false,
            usedThisTurn: false,
            scriptId,
          };

          const card = createTestCardWithEffect('test-card', PlayerId.PLAYER_1, effect);
          addCardToState(card);

          // Activate effect
          effectSystem.activateEffect(card.id, effect.id);

          // When effect executed, cost should already be paid
          expect(activeDonDuringEffect).toBe(activeDonBefore - costAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 36.4: Failed cost payment prevents any state changes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (costAmount) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Don't add any DON, so cost cannot be paid

          // Track if effect was executed
          let effectExecuted = false;
          const scriptId = 'test-script';
          effectSystem.registerScript(scriptId, () => {
            effectExecuted = true;
          });

          // Create effect with cost
          const effect: EffectDefinition = {
            id: 'test-effect',
            sourceCardId: 'test-card',
            label: '[Activate: Main]',
            timingType: EffectTimingType.ACTIVATE,
            triggerTiming: null,
            condition: null,
            cost: {
              type: 'REST_DON',
              amount: costAmount,
            },
            effectType: EffectType.POWER_MODIFICATION,
            parameters: {
              powerChange: 1000,
            },
            oncePerTurn: false,
            usedThisTurn: false,
            scriptId,
          };

          const card = createTestCardWithEffect('test-card', PlayerId.PLAYER_1, effect);
          addCardToState(card);

          // Try to activate effect (should fail)
          try {
            effectSystem.activateEffect(card.id, effect.id);
          } catch (error) {
            // Expected to fail
          }

          // Effect should not have executed
          expect(effectExecuted).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 36.5: Zero-cost effects execute without payment', () => {
    // Reset state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

    // Don't add any resources

    // Track if effect was executed
    let effectExecuted = false;
    const scriptId = 'test-script';
    effectSystem.registerScript(scriptId, () => {
      effectExecuted = true;
    });

    // Create effect with zero cost
    const effect: EffectDefinition = {
      id: 'test-effect',
      sourceCardId: 'test-card',
      label: '[Activate: Main]',
      timingType: EffectTimingType.ACTIVATE,
      triggerTiming: null,
      condition: null,
      cost: {
        type: 'REST_DON',
        amount: 0,
      },
      effectType: EffectType.POWER_MODIFICATION,
      parameters: {
        powerChange: 1000,
      },
      oncePerTurn: false,
      usedThisTurn: false,
      scriptId,
    };

    const card = createTestCardWithEffect('test-card', PlayerId.PLAYER_1, effect);
    addCardToState(card);

    // Activate effect (should succeed even with no resources)
    effectSystem.activateEffect(card.id, effect.id);

    // Effect should have executed
    expect(effectExecuted).toBe(true);
  });
});
