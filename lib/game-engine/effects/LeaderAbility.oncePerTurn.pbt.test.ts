/**
 * Property-Based Test: Once Per Turn Restriction
 * 
 * Feature: ai-battle-integration, Property 48: Once Per Turn Restriction
 * Validates: Requirements 32.2
 * 
 * Property: For any effect with [Once Per Turn], it should only be activatable 
 * once per turn.
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

describe('Property 48: Once Per Turn Restriction', () => {
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
   * Arbitrary for generating a leader with a [Once Per Turn] ability
   */
  const leaderWithOncePerTurnArb = fc.record({
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
        id: `${data.id}-once-per-turn`,
        sourceCardId: data.id,
        label: '[Activate: Main] [Once Per Turn]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: `${data.id}-script`,
        oncePerTurn: true,
      } as EffectDefinition,
    ],
    keywords: [],
    text: '[Activate: Main] [Once Per Turn] Give up to 1 of your Characters +2000 power during this turn.',
  }));

  it('should allow first activation of once-per-turn effect', () => {
    fc.assert(
      fc.property(
        leaderWithOncePerTurnArb,
        fc.integer({ min: 1, max: 10 }),
        (leaderDef, turnNumber) => {
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
          state.phase = Phase.MAIN;
          state.activePlayer = playerId;
          state.turnNumber = turnNumber;
          
          const playerState = state.players.get(playerId)!;
          playerState.zones.leaderArea = leader;

          const effectId = leader.definition.effects[0].id;

          // First activation should succeed
          let firstActivationSucceeded = false;
          
          try {
            testEffectSystem.activateEffect(leader.id, effectId, [], new Map());
            firstActivationSucceeded = true;
          } catch (error) {
            console.error('First activation failed:', error);
            firstActivationSucceeded = false;
          }

          // Property: First activation should succeed
          expect(firstActivationSucceeded).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent second activation of once-per-turn effect in same turn', () => {
    fc.assert(
      fc.property(
        leaderWithOncePerTurnArb,
        fc.integer({ min: 1, max: 10 }),
        (leaderDef, turnNumber) => {
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
          state.phase = Phase.MAIN;
          state.activePlayer = playerId;
          state.turnNumber = turnNumber;
          
          const playerState = state.players.get(playerId)!;
          playerState.zones.leaderArea = leader;

          const effectId = leader.definition.effects[0].id;

          // First activation
          try {
            testEffectSystem.activateEffect(leader.id, effectId, [], new Map());
          } catch (error) {
            // If first activation fails, skip this test case
            return true;
          }

          // Try second activation in the same turn
          let secondActivationSucceeded = false;
          
          try {
            testEffectSystem.activateEffect(leader.id, effectId, [], new Map());
            secondActivationSucceeded = true;
          } catch (error) {
            // Expected to fail
            secondActivationSucceeded = false;
          }

          // Property: Second activation should fail
          expect(secondActivationSucceeded).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow activation again in a new turn', () => {
    fc.assert(
      fc.property(
        leaderWithOncePerTurnArb,
        fc.integer({ min: 1, max: 10 }),
        (leaderDef, initialTurn) => {
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
          state.phase = Phase.MAIN;
          state.activePlayer = playerId;
          state.turnNumber = initialTurn;
          
          const playerState = state.players.get(playerId)!;
          playerState.zones.leaderArea = leader;

          const effectId = leader.definition.effects[0].id;

          // First activation in turn N
          try {
            testEffectSystem.activateEffect(leader.id, effectId, [], new Map());
          } catch (error) {
            // If first activation fails, skip this test case
            return true;
          }

          // Advance to next turn - must create new state with updated turn number
          // and update the state manager properly (respects immutable state pattern)
          const updatedState = {
            ...testStateManager.getState(),
            turnNumber: initialTurn + 1,
          };
          
          // Create a new state manager with the updated state
          const newStateManager = new GameStateManager(updatedState);
          const newEventEmitter = new EventEmitter();
          const newZoneManager = new ZoneManager(newStateManager, newEventEmitter);
          const newEffectSystem = new EffectSystem(newStateManager, newEventEmitter, newZoneManager);
          
          // Re-register the script in the new effect system
          newEffectSystem.registerScript(`${leaderDef.id}-script`, () => {
            // Dummy script that does nothing
          });
          
          // The flag stores the turn number when the effect was used
          // Since we advanced to a new turn, the check should pass
          // (stored turn !== current turn means it can be used again)

          // Try activation in turn N+1
          let secondTurnActivationSucceeded = false;
          
          try {
            newEffectSystem.activateEffect(leader.id, effectId, [], new Map());
            secondTurnActivationSucceeded = true;
          } catch (error) {
            console.error('Second turn activation failed:', error);
            secondTurnActivationSucceeded = false;
          }

          // Property: Activation should succeed in new turn
          expect(secondTurnActivationSucceeded).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
