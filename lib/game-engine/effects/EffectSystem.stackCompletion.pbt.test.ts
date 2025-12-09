/**
 * Property-Based Test: Effect Stack Completion
 * 
 * Feature: ai-battle-integration, Property 38: Effect Stack Completion
 * Validates: Requirements 23.5
 * 
 * Property: For any effect resolution sequence, the effect stack should be 
 * empty when resolution completes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { EffectSystem } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  EffectDefinition,
  EffectInstance,
  CardInstance,
  PlayerId,
  CardCategory,
  Color,
  CardState,
  ZoneId,
  EffectTimingType,
} from '../core/types';

describe('Property 38: Effect Stack Completion', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;

  beforeEach(() => {
    // Create minimal game state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
  });

  /**
   * Create an effect instance for testing
   */
  const createEffectInstance = (id: string): EffectInstance => {
    return {
      effectDefinition: {
        id: `effect-${id}`,
        label: '[Test]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: `script-${id}`,
        oncePerTurn: false,
      } as EffectDefinition,
      source: {
        id: `card-${id}`,
        definitionId: `def-${id}`,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        flags: new Map(),
        definition: {
          id: `def-${id}`,
          name: `Test Card ${id}`,
          category: CardCategory.CHARACTER,
          colors: [Color.RED],
          baseCost: 3,
          basePower: 3000,
          effects: [],
          keywords: [],
          typeTags: [],
          attributes: [],
        },
      } as CardInstance,
      controller: PlayerId.PLAYER_1,
      targets: [],
      values: new Map(),
      context: null,
    };
  };

  it('should have empty stack after resolving any number of effects', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 20 }),
        (effectIds) => {
          // Create effect system with simple scripts
          const scriptRegistry = new Map();
          effectIds.forEach(id => {
            scriptRegistry.set(`script-${id}`, () => {
              // Simple no-op effect
            });
          });
          
          const testEffectSystem = new EffectSystem(
            stateManager,
            eventEmitter,
            zoneManager,
            scriptRegistry
          );

          // Add effects to stack
          effectIds.forEach(id => {
            const effect = createEffectInstance(String(id));
            testEffectSystem.pushEffect(effect, 1);
          });

          // Verify stack has effects before resolution
          if (effectIds.length > 0) {
            expect(testEffectSystem.getEffectStack().length).toBe(effectIds.length);
          }

          // Resolve the stack
          testEffectSystem.resolveStack();

          // Verify stack is empty after resolution
          expect(testEffectSystem.getEffectStack().length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have empty stack after resolving effects with various priorities', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            priority: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (effectSpecs) => {
          // Create effect system with simple scripts
          const scriptRegistry = new Map();
          effectSpecs.forEach(spec => {
            scriptRegistry.set(`script-${spec.id}`, () => {
              // Simple no-op effect
            });
          });
          
          const testEffectSystem = new EffectSystem(
            stateManager,
            eventEmitter,
            zoneManager,
            scriptRegistry
          );

          // Add effects to stack with various priorities
          effectSpecs.forEach(spec => {
            const effect = createEffectInstance(String(spec.id));
            testEffectSystem.pushEffect(effect, spec.priority);
          });

          // Verify stack has effects before resolution
          if (effectSpecs.length > 0) {
            expect(testEffectSystem.getEffectStack().length).toBe(effectSpecs.length);
          }

          // Resolve the stack
          testEffectSystem.resolveStack();

          // Verify stack is empty after resolution
          expect(testEffectSystem.getEffectStack().length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have empty stack even when effects fail', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            shouldFail: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (effectSpecs) => {
          // Create effect system with scripts that may throw errors
          const scriptRegistry = new Map();
          effectSpecs.forEach(spec => {
            scriptRegistry.set(`script-${spec.id}`, () => {
              if (spec.shouldFail) {
                throw new Error(`Effect ${spec.id} failed`);
              }
            });
          });
          
          const testEffectSystem = new EffectSystem(
            stateManager,
            eventEmitter,
            zoneManager,
            scriptRegistry
          );

          // Add effects to stack
          effectSpecs.forEach(spec => {
            const effect = createEffectInstance(String(spec.id));
            testEffectSystem.pushEffect(effect, 1);
          });

          // Verify stack has effects before resolution
          expect(testEffectSystem.getEffectStack().length).toBe(effectSpecs.length);

          // Resolve the stack (should handle errors gracefully)
          testEffectSystem.resolveStack();

          // Verify stack is empty after resolution even with failures
          expect(testEffectSystem.getEffectStack().length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have empty stack after multiple resolution cycles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 }),
          { minLength: 1, maxLength: 5 }
        ),
        (resolutionCycles) => {
          // Create effect system with simple scripts
          const allIds = resolutionCycles.flat();
          const scriptRegistry = new Map();
          allIds.forEach(id => {
            scriptRegistry.set(`script-${id}`, () => {
              // Simple no-op effect
            });
          });
          
          const testEffectSystem = new EffectSystem(
            stateManager,
            eventEmitter,
            zoneManager,
            scriptRegistry
          );

          // Perform multiple resolution cycles
          for (const cycleIds of resolutionCycles) {
            // Add effects to stack
            cycleIds.forEach(id => {
              const effect = createEffectInstance(String(id));
              testEffectSystem.pushEffect(effect, 1);
            });

            // Verify stack has effects
            expect(testEffectSystem.getEffectStack().length).toBe(cycleIds.length);

            // Resolve the stack
            testEffectSystem.resolveStack();

            // Verify stack is empty after this cycle
            expect(testEffectSystem.getEffectStack().length).toBe(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain empty stack invariant across operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({ type: fc.constant('add' as const), id: fc.integer({ min: 1, max: 100 }) }),
            fc.record({ type: fc.constant('resolve' as const) }),
            fc.record({ type: fc.constant('clear' as const) })
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (operations) => {
          // Create effect system with simple scripts
          const scriptRegistry = new Map();
          for (let i = 1; i <= 100; i++) {
            scriptRegistry.set(`script-${i}`, () => {
              // Simple no-op effect
            });
          }
          
          const testEffectSystem = new EffectSystem(
            stateManager,
            eventEmitter,
            zoneManager,
            scriptRegistry
          );

          // Perform operations
          for (const op of operations) {
            if (op.type === 'add') {
              const effect = createEffectInstance(String(op.id));
              testEffectSystem.pushEffect(effect, 1);
            } else if (op.type === 'resolve') {
              testEffectSystem.resolveStack();
              // After resolve, stack should be empty
              expect(testEffectSystem.getEffectStack().length).toBe(0);
            } else if (op.type === 'clear') {
              testEffectSystem.clearEffectStack();
              // After clear, stack should be empty
              expect(testEffectSystem.getEffectStack().length).toBe(0);
            }
          }

          // Final resolution to ensure stack is empty
          testEffectSystem.resolveStack();
          expect(testEffectSystem.getEffectStack().length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
