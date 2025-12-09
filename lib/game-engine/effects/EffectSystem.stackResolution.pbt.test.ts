/**
 * Property-Based Test: Effect Stack Sequential Resolution
 * 
 * Feature: ai-battle-integration, Property 37: Effect Stack Sequential Resolution
 * Validates: Requirements 23.3
 * 
 * Property: For any effect stack with multiple effects, effects should resolve 
 * one at a time in LIFO order (within priority levels).
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
  GameEventType,
} from '../core/types';

describe('Property 37: Effect Stack Sequential Resolution', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;
  let resolvedEffects: string[];

  beforeEach(() => {
    // Create minimal game state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    
    // Track resolved effects
    resolvedEffects = [];
    
    // Create effect system with mock scripts that track resolution
    const scriptRegistry = new Map();
    effectSystem = new EffectSystem(
      stateManager,
      eventEmitter,
      zoneManager,
      scriptRegistry
    );
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

  it('should resolve effects one at a time in LIFO order within same priority', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 10 }),
        (effectIds) => {
          // Reset tracking
          resolvedEffects = [];
          
          // Create a new effect system for each test
          const scriptRegistry = new Map();
          effectIds.forEach(id => {
            scriptRegistry.set(`script-${id}`, () => {
              resolvedEffects.push(`effect-${id}`);
            });
          });
          
          const testEffectSystem = new EffectSystem(
            stateManager,
            eventEmitter,
            zoneManager,
            scriptRegistry
          );

          // Add effects to stack with same priority (LIFO within priority)
          const samePriority = 1;
          effectIds.forEach(id => {
            const effect = createEffectInstance(String(id));
            testEffectSystem.pushEffect(effect, samePriority);
          });

          // Resolve the stack
          testEffectSystem.resolveStack();

          // Verify all effects resolved
          expect(resolvedEffects.length).toBe(effectIds.length);

          // Verify LIFO order: last added should resolve first
          const expectedOrder = [...effectIds].reverse().map(id => `effect-${id}`);
          expect(resolvedEffects).toEqual(expectedOrder);

          // Verify stack is empty after resolution
          expect(testEffectSystem.getEffectStack().length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should resolve effects one at a time with priority ordering', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            priority: fc.integer({ min: 0, max: 5 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (effectSpecs) => {
          // Reset tracking
          resolvedEffects = [];
          
          // Create a new effect system for each test
          const scriptRegistry = new Map();
          effectSpecs.forEach(spec => {
            scriptRegistry.set(`script-${spec.id}`, () => {
              resolvedEffects.push(`effect-${spec.id}`);
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

          // Resolve the stack
          testEffectSystem.resolveStack();

          // Verify all effects resolved
          expect(resolvedEffects.length).toBe(effectSpecs.length);

          // Verify priority ordering: higher priority resolves first
          // Within same priority, LIFO order (last added resolves first)
          const sortedSpecs = [...effectSpecs].sort((a, b) => {
            if (a.priority !== b.priority) {
              return b.priority - a.priority; // Higher priority first
            }
            // For same priority, maintain insertion order (will be reversed by LIFO)
            return 0;
          });

          // Group by priority to verify LIFO within each priority level
          const priorityGroups = new Map<number, number[]>();
          effectSpecs.forEach(spec => {
            if (!priorityGroups.has(spec.priority)) {
              priorityGroups.set(spec.priority, []);
            }
            priorityGroups.get(spec.priority)!.push(spec.id);
          });

          // Build expected order: highest priority first, LIFO within each priority
          const expectedOrder: string[] = [];
          const priorities = Array.from(priorityGroups.keys()).sort((a, b) => b - a);
          priorities.forEach(priority => {
            const idsInPriority = priorityGroups.get(priority)!;
            // LIFO: reverse the order they were added
            expectedOrder.push(...idsInPriority.reverse().map(id => `effect-${id}`));
          });

          expect(resolvedEffects).toEqual(expectedOrder);

          // Verify stack is empty after resolution
          expect(testEffectSystem.getEffectStack().length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should resolve effects sequentially, not in parallel', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (numEffects) => {
          // Track resolution order with timestamps
          const resolutionLog: Array<{ id: string; timestamp: number }> = [];
          
          // Create effect system with scripts that log timestamps
          const scriptRegistry = new Map();
          for (let i = 1; i <= numEffects; i++) {
            scriptRegistry.set(`script-${i}`, () => {
              resolutionLog.push({ id: `effect-${i}`, timestamp: Date.now() });
              // Small delay to ensure sequential execution
              const start = Date.now();
              while (Date.now() - start < 1) {
                // Busy wait
              }
            });
          }
          
          const testEffectSystem = new EffectSystem(
            stateManager,
            eventEmitter,
            zoneManager,
            scriptRegistry
          );

          // Add effects to stack
          for (let i = 1; i <= numEffects; i++) {
            const effect = createEffectInstance(String(i));
            testEffectSystem.pushEffect(effect, 1);
          }

          // Resolve the stack
          testEffectSystem.resolveStack();

          // Verify all effects resolved
          expect(resolutionLog.length).toBe(numEffects);

          // Verify timestamps are sequential (each effect completes before next starts)
          for (let i = 1; i < resolutionLog.length; i++) {
            expect(resolutionLog[i].timestamp).toBeGreaterThanOrEqual(
              resolutionLog[i - 1].timestamp
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
