/**
 * PerformanceOptimizations.test.ts
 * 
 * Tests for performance optimization features including caching,
 * batching, lazy evaluation, and monitoring.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EffectParsingCache, TargetFilterCache, EffectCacheManager } from './EffectCache';
import { EffectBatcher } from './EffectBatcher';
import { OptimizedTargetFilter } from './OptimizedTargetFilter';
import { Lazy, LazyList, memoize } from './LazyEvaluation';
import { PerformanceMonitor } from './PerformanceMonitor';
import {
  OptimizedEffectParser,
  OptimizedEffectOperations,
  DEFAULT_PERFORMANCE_CONFIG,
} from './PerformanceOptimizations';
import { EffectType, TargetType } from './types';
import { CardCategory, Color, PlayerId, ZoneId, CardState, ModifierDuration } from '../core/types';

describe('EffectCache', () => {
  describe('EffectParsingCache', () => {
    let cache: EffectParsingCache;

    beforeEach(() => {
      cache = new EffectParsingCache(10);
    });

    it('should cache parsed effects', () => {
      const cardId = 'card-1';
      const effectText = '[On Play] Draw 1 card';
      const effects = [
        {
          id: 'effect-1',
          sourceCardId: cardId,
          label: '[On Play]',
          effectType: EffectType.DRAW_CARDS,
          parameters: { cardCount: 1 },
        } as any,
      ];

      cache.set(cardId, effectText, effects);
      const cached = cache.get(cardId, effectText);

      expect(cached).toEqual(effects);
    });

    it('should return undefined for cache miss', () => {
      const result = cache.get('card-1', '[On Play] Draw 1 card');
      expect(result).toBeUndefined();
    });

    it('should track cache statistics', () => {
      const cardId = 'card-1';
      const effectText = '[On Play] Draw 1 card';
      const effects = [] as any;

      cache.set(cardId, effectText, effects);
      cache.get(cardId, effectText); // Hit
      cache.get('card-2', effectText); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should clear cache', () => {
      cache.set('card-1', 'text', [] as any);
      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('TargetFilterCache', () => {
    let cache: TargetFilterCache;

    beforeEach(() => {
      cache = new TargetFilterCache(10);
    });

    it('should cache target results', () => {
      const filter = { controller: 'self' as const, zone: ZoneId.HAND };
      const targets = [{ type: TargetType.CARD, cardId: 'card-1' }];

      cache.set(filter, PlayerId.PLAYER_1, targets, 1);
      const cached = cache.get(filter, PlayerId.PLAYER_1, 1);

      expect(cached).toEqual(targets);
    });

    it('should invalidate cache on state version change', () => {
      const filter = { controller: 'self' as const, zone: ZoneId.HAND };
      const targets = [{ type: TargetType.CARD, cardId: 'card-1' }];

      cache.set(filter, PlayerId.PLAYER_1, targets, 1);
      const cached = cache.get(filter, PlayerId.PLAYER_1, 2); // Different version

      expect(cached).toBeUndefined();
    });

    it('should invalidate all entries', () => {
      const filter = { controller: 'self' as const, zone: ZoneId.HAND };
      const targets = [{ type: TargetType.CARD, cardId: 'card-1' }];

      cache.set(filter, PlayerId.PLAYER_1, targets, 1);
      cache.invalidate();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('EffectCacheManager', () => {
    it('should manage both caches', () => {
      const manager = new EffectCacheManager(10, 10);

      expect(manager.getParsingCache()).toBeDefined();
      expect(manager.getTargetCache()).toBeDefined();
    });

    it('should clear all caches', () => {
      const manager = new EffectCacheManager(10, 10);

      manager.getParsingCache().set('card-1', 'text', [] as any);
      manager.clearAll();

      const stats = manager.getStats();
      expect(stats.parsing.size).toBe(0);
      expect(stats.targeting.size).toBe(0);
    });
  });
});

describe('EffectBatcher', () => {
  it('should group effects by type', () => {
    const effects = [
      {
        effectDefinition: { effectType: EffectType.POWER_MODIFICATION },
      } as any,
      {
        effectDefinition: { effectType: EffectType.DRAW_CARDS },
      } as any,
      {
        effectDefinition: { effectType: EffectType.POWER_MODIFICATION },
      } as any,
    ];

    const batches = EffectBatcher.batchEffects(effects);

    expect(batches).toHaveLength(2);
    expect(batches.find(b => b.type === EffectType.POWER_MODIFICATION)?.effects).toHaveLength(2);
    expect(batches.find(b => b.type === EffectType.DRAW_CARDS)?.effects).toHaveLength(1);
  });

  it('should optimize resolution order', () => {
    const effects = [
      {
        effectDefinition: { effectType: EffectType.DEAL_DAMAGE },
      } as any,
      {
        effectDefinition: { effectType: EffectType.POWER_MODIFICATION },
      } as any,
      {
        effectDefinition: { effectType: EffectType.DRAW_CARDS },
      } as any,
    ];

    const optimized = EffectBatcher.optimizeResolutionOrder(effects);

    // Power modifications should come first
    expect(optimized[0].effectDefinition.effectType).toBe(EffectType.POWER_MODIFICATION);
    // Damage should come last
    expect(optimized[optimized.length - 1].effectDefinition.effectType).toBe(EffectType.DEAL_DAMAGE);
  });

  it('should merge compatible power modifications', () => {
    const effects = [
      {
        effectDefinition: {
          effectType: EffectType.POWER_MODIFICATION,
          parameters: { powerChange: 1000, duration: ModifierDuration.UNTIL_END_OF_TURN },
        },
        targets: [{ type: TargetType.CARD, cardId: 'card-1' }],
      } as any,
      {
        effectDefinition: {
          effectType: EffectType.POWER_MODIFICATION,
          parameters: { powerChange: 500, duration: ModifierDuration.UNTIL_END_OF_TURN },
        },
        targets: [{ type: TargetType.CARD, cardId: 'card-1' }],
      } as any,
    ];

    const merged = EffectBatcher.mergePowerModifications(effects);

    expect(merged).toHaveLength(1);
    expect(merged[0].effectDefinition.parameters.powerChange).toBe(1500);
  });

  it('should not merge power modifications with different durations', () => {
    const effects = [
      {
        effectDefinition: {
          effectType: EffectType.POWER_MODIFICATION,
          parameters: { powerChange: 1000, duration: ModifierDuration.UNTIL_END_OF_TURN },
        },
        targets: [{ type: TargetType.CARD, cardId: 'card-1' }],
      } as any,
      {
        effectDefinition: {
          effectType: EffectType.POWER_MODIFICATION,
          parameters: { powerChange: 500, duration: ModifierDuration.UNTIL_END_OF_BATTLE },
        },
        targets: [{ type: TargetType.CARD, cardId: 'card-1' }],
      } as any,
    ];

    const merged = EffectBatcher.mergePowerModifications(effects);

    expect(merged).toHaveLength(2);
  });
});

describe('LazyEvaluation', () => {
  describe('Lazy', () => {
    it('should compute value on first access', () => {
      let computeCount = 0;
      const lazy = new Lazy(() => {
        computeCount++;
        return 42;
      });

      expect(computeCount).toBe(0);
      expect(lazy.get()).toBe(42);
      expect(computeCount).toBe(1);
    });

    it('should cache computed value', () => {
      let computeCount = 0;
      const lazy = new Lazy(() => {
        computeCount++;
        return 42;
      });

      lazy.get();
      lazy.get();
      lazy.get();

      expect(computeCount).toBe(1);
    });

    it('should support map operation', () => {
      const lazy = new Lazy(() => 10);
      const mapped = lazy.map(x => x * 2);

      expect(mapped.get()).toBe(20);
    });
  });

  describe('LazyList', () => {
    it('should compute items on demand', () => {
      let computeCount = 0;
      const items = [
        new Lazy(() => {
          computeCount++;
          return 1;
        }),
        new Lazy(() => {
          computeCount++;
          return 2;
        }),
        new Lazy(() => {
          computeCount++;
          return 3;
        }),
      ];

      const list = new LazyList(items);

      expect(computeCount).toBe(0);
      expect(list.get(0)).toBe(1);
      expect(computeCount).toBe(1);
      expect(list.get(1)).toBe(2);
      expect(computeCount).toBe(2);
    });

    it('should support filter with lazy evaluation', () => {
      const items = [
        new Lazy(() => 1),
        new Lazy(() => 2),
        new Lazy(() => 3),
        new Lazy(() => 4),
      ];

      const list = new LazyList(items);
      const filtered = list.filter(x => x % 2 === 0);

      expect(filtered).toEqual([2, 4]);
    });

    it('should support take operation', () => {
      let computeCount = 0;
      const items = Array.from({ length: 10 }, (_, i) =>
        new Lazy(() => {
          computeCount++;
          return i;
        })
      );

      const list = new LazyList(items);
      const taken = list.take(3);

      expect(taken).toEqual([0, 1, 2]);
      expect(computeCount).toBe(3); // Only computed 3 items
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const fn = memoize((x: number) => {
        callCount++;
        return x * 2;
      });

      expect(fn(5)).toBe(10);
      expect(fn(5)).toBe(10);
      expect(fn(5)).toBe(10);

      expect(callCount).toBe(1);
    });

    it('should handle different arguments', () => {
      let callCount = 0;
      const fn = memoize((x: number) => {
        callCount++;
        return x * 2;
      });

      expect(fn(5)).toBe(10);
      expect(fn(10)).toBe(20);
      expect(fn(5)).toBe(10);

      expect(callCount).toBe(2);
    });
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(true, 100);
  });

  it('should track operation timing', () => {
    monitor.startTimer('test-op');
    // Simulate work
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(i);
    }
    const duration = monitor.endTimer('test-op');

    expect(duration).toBeGreaterThan(0);

    const metric = monitor.getMetric('test-op');
    expect(metric).toBeDefined();
    expect(metric!.count).toBe(1);
    expect(metric!.totalTime).toBeGreaterThan(0);
  });

  it('should track multiple operations', () => {
    monitor.startTimer('op1');
    monitor.endTimer('op1');

    monitor.startTimer('op2');
    monitor.endTimer('op2');

    monitor.startTimer('op1');
    monitor.endTimer('op1');

    const metrics = monitor.getAllMetrics();
    expect(metrics).toHaveLength(2);

    const op1Metric = monitor.getMetric('op1');
    expect(op1Metric!.count).toBe(2);
  });

  it('should measure function execution', () => {
    const result = monitor.measure('test-fn', () => {
      return 42;
    });

    expect(result).toBe(42);

    const metric = monitor.getMetric('test-fn');
    expect(metric).toBeDefined();
    expect(metric!.count).toBe(1);
  });

  it('should generate performance report', () => {
    monitor.startTimer('op1');
    monitor.endTimer('op1');

    monitor.startTimer('op2');
    monitor.endTimer('op2');

    const report = monitor.generateReport();

    expect(report).toContain('Performance Report');
    expect(report).toContain('Total Operations');
    expect(report).toContain('Slowest Operations');
  });

  it('should clear metrics', () => {
    monitor.startTimer('op1');
    monitor.endTimer('op1');

    monitor.clear();

    const metrics = monitor.getAllMetrics();
    expect(metrics).toHaveLength(0);
  });
});

describe('OptimizedEffectParser', () => {
  it('should cache parsed effects', () => {
    const parser = new OptimizedEffectParser();
    const effectText = '[On Play] Draw 1 card';
    const cardId = 'card-1';

    // First parse
    const effects1 = parser.parseEffectText(effectText, cardId);

    // Second parse (should hit cache)
    const effects2 = parser.parseEffectText(effectText, cardId);

    expect(effects1).toEqual(effects2);

    const stats = parser.getCacheStats();
    expect(stats.hits).toBeGreaterThan(0);
  });

  it('should respect caching configuration', () => {
    const parser = new OptimizedEffectParser(
      undefined,
      undefined,
      { ...DEFAULT_PERFORMANCE_CONFIG, enableCaching: false }
    );

    const effectText = '[On Play] Draw 1 card';
    parser.parseEffectText(effectText, 'card-1');
    parser.parseEffectText(effectText, 'card-1');

    const stats = parser.getCacheStats();
    expect(stats.hits).toBe(0); // No caching
  });
});

describe('OptimizedEffectOperations', () => {
  it('should batch effects when enabled', () => {
    const ops = new OptimizedEffectOperations({
      ...DEFAULT_PERFORMANCE_CONFIG,
      enableBatching: true,
    });

    const effects = [
      {
        effectDefinition: { effectType: EffectType.DEAL_DAMAGE },
      } as any,
      {
        effectDefinition: { effectType: EffectType.POWER_MODIFICATION },
      } as any,
    ];

    const batched = ops.batchEffects(effects);

    // Should be reordered (power mod first)
    expect(batched[0].effectDefinition.effectType).toBe(EffectType.POWER_MODIFICATION);
  });

  it('should not batch when disabled', () => {
    const ops = new OptimizedEffectOperations({
      ...DEFAULT_PERFORMANCE_CONFIG,
      enableBatching: false,
    });

    const effects = [
      {
        effectDefinition: { effectType: EffectType.DEAL_DAMAGE },
      } as any,
      {
        effectDefinition: { effectType: EffectType.POWER_MODIFICATION },
      } as any,
    ];

    const batched = ops.batchEffects(effects);

    // Should maintain original order
    expect(batched).toEqual(effects);
  });

  it('should invalidate caches on state change', () => {
    const ops = new OptimizedEffectOperations();

    ops.onStateChange();

    const stats = ops.getPerformanceStats();
    expect(stats.caches.targeting.size).toBe(0);
  });

  it('should generate performance report', () => {
    const ops = new OptimizedEffectOperations();

    const report = ops.generatePerformanceReport();

    expect(report).toContain('Performance Report');
    expect(report).toContain('Cache Statistics');
  });
});
