/**
 * Property-Based Test: Leader Ability Activation Timing
 * 
 * Feature: ai-battle-integration, Property 47: Leader Ability Activation Timing
 * Validates: Requirements 32.1
 * 
 * Property: For any leader with an [Activate: Main] ability, the ability should 
 * only be activatable during the main phase.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import { EffectSystem } from './EffectSystem';
import {
  PlayerId,
  Phase,
  CardCategory,
  Color,
  CardState,
  ZoneId,
  EffectTimingType,
  CardDefinition,
  CardInstance,
  EffectDefinition,
} from '../core/types';

describe('Property 47: Leader Ability Activation Timing', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  });

  /**
   * Arbitrary for generating game phases
   */
  const phaseArb = fc.constantFrom(
    Phase.REFRESH,
    Phase.DRAW,
    Phase.DON,
    Phase.MAIN,
    Phase.END
  );

  /**
   * Arbitrary for generating a leader with an [Activate: Main] ability
   */
  const leaderWithActivateMainArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    cost: fc.constant(0),
    power: fc.integer({ min: 4000, max: 6000 }),
    life: fc.integer({ min: 4, max: 5 }),
  }).map((data): CardDefinition => ({
    id: data.id,
    name: data.name,
    category: CardCategory.LEADER,
    color: Color.RED,
    cost: data.cost,
    power: data.power,
    life: data.life,
    counter: 0,
    attributes: [],
    typeTags: [],
    effects: [
      {
        id: `${data.id}-activate-main`,
        sourceCardId: data.id,
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: `${data.id}-script`,
        oncePerTurn: false,
      } as EffectDefinition,
    ],
    keywords: [],
    text: '[Activate: Main] Give up to 1 of your Characters +1000 power during this turn.',
  }));

  it('should only allow leader ability activation during main phase', () => {
    fc.assert(
      fc.property(
        phaseArb,
        leaderWithActivateMainArb,
        (phase, leaderDef) => {
          const playerId = PlayerId.PLAYER_1;
          
          // Create fresh state manager for this test run
          const initialState = createInitialGameState();
          const testStateManager = new GameStateManager(initialState);
          const testEventEmitter = new EventEmitter();
          const testZoneManager = new ZoneManager(testStateManager, testEventEmitter);
          const testEffectSystem = new EffectSystem(testStateManager, testEventEmitter, testZoneManager);
          
          // Register a dummy script for the effect
          testEffectSystem.registerScript(`${leaderDef.id}-script`, () => {
            // Dummy script that does nothing
          });
          
          // Setup: Create a leader card instance
          const leader: CardInstance = {
            id: `leader-${playerId}`,
            definition: leaderDef,
            owner: playerId,
            controller: playerId,
            zone: ZoneId.LEADER_AREA,
            state: CardState.ACTIVE,
            givenDon: [],
            modifiers: [],
            flags: new Map(),
          };

          // Add leader to game state
          const state = testStateManager.getState();
          state.phase = phase;
          state.activePlayer = playerId;
          
          const playerState = state.players.get(playerId)!;
          playerState.zones.leaderArea = leader;

          const effectId = leader.definition.effects[0].id;

          // Try to activate the leader ability
          let canActivate = false;
          let activationError: Error | null = null;
          
          try {
            // Check if we can activate the effect
            canActivate = testEffectSystem.canActivateEffect(leader.id, effectId, playerId);
            
            if (canActivate) {
              // Try to actually activate it
              testEffectSystem.activateEffect(leader.id, effectId, [], new Map());
            }
          } catch (error) {
            activationError = error as Error;
          }

          // Property: Ability should only be activatable during MAIN phase
          if (phase === Phase.MAIN) {
            // During main phase, should be activatable (assuming no other restrictions)
            expect(canActivate).toBe(true);
            expect(activationError).toBeNull();
          } else {
            // During other phases, should NOT be activatable
            expect(canActivate).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject leader ability activation outside main phase', () => {
    fc.assert(
      fc.property(
        phaseArb.filter(p => p !== Phase.MAIN),
        leaderWithActivateMainArb,
        (phase, leaderDef) => {
          const playerId = PlayerId.PLAYER_1;
          
          // Create fresh state manager for this test run
          const initialState = createInitialGameState();
          const testStateManager = new GameStateManager(initialState);
          const testEventEmitter = new EventEmitter();
          const testZoneManager = new ZoneManager(testStateManager, testEventEmitter);
          const testEffectSystem = new EffectSystem(testStateManager, testEventEmitter, testZoneManager);
          
          // Register a dummy script for the effect
          testEffectSystem.registerScript(`${leaderDef.id}-script`, () => {
            // Dummy script that does nothing
          });
          
          // Setup: Create a leader card instance
          const leader: CardInstance = {
            id: `leader-${playerId}`,
            definition: leaderDef,
            owner: playerId,
            controller: playerId,
            zone: ZoneId.LEADER_AREA,
            state: CardState.ACTIVE,
            givenDon: [],
            modifiers: [],
            flags: new Map(),
          };

          // Add leader to game state
          const state = testStateManager.getState();
          state.phase = phase;
          state.activePlayer = playerId;
          
          const playerState = state.players.get(playerId)!;
          playerState.zones.leaderArea = leader;

          const effectId = leader.definition.effects[0].id;

          // Try to activate the leader ability
          let activationSucceeded = false;
          
          try {
            testEffectSystem.activateEffect(leader.id, effectId, [], new Map());
            activationSucceeded = true;
          } catch (error) {
            // Expected to fail
            activationSucceeded = false;
          }

          // Property: Activation should fail outside main phase
          expect(activationSucceeded).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
