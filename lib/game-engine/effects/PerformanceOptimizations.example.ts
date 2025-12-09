/**
 * PerformanceOptimizations.example.ts
 * 
 * Examples demonstrating how to use the performance optimizations
 * in the effect system.
 */

import {
  OptimizedEffectParser,
  OptimizedEffectOperations,
  DEFAULT_PERFORMANCE_CONFIG,
  createOptimizedParser,
  measureEffectResolution,
  optimizeEffects,
} from './PerformanceOptimizations';
import { EffectCacheManager } from './EffectCache';
import { EffectBatcher } from './EffectBatcher';
import { Lazy, LazyList, memoize } from './LazyEvaluation';
import { PerformanceMonitor } from './PerformanceMonitor';

// ============================================================================
// Example 1: Basic Usage with Default Configuration
// ============================================================================

export function example1_BasicUsage() {
  console.log('=== Example 1: Basic Usage ===\n');

  // Create optimized operations with default config
  const ops = new OptimizedEffectOperations();

  // Parse effects with caching
  const parser = createOptimizedParser();
  const effects = parser.parseEffectText(
    '[On Play] Draw 1 card',
    'card-123'
  );

  console.log('Parsed effects:', effects);
  console.log('Cache stats:', parser.getCacheStats());
  console.log();
}

// ============================================================================
// Example 2: Custom Configuration for Production
// ============================================================================

export function example2_ProductionConfig() {
  console.log('=== Example 2: Production Configuration ===\n');

  // Production config: larger caches, no monitoring
  const productionConfig = {
    ...DEFAULT_PERFORMANCE_CONFIG,
    enableMonitoring: false,
    parsingCacheSize: 1000,  // Larger cache for more cards
    targetCacheSize: 500,    // More target filters
  };

  const ops = new OptimizedEffectOperations(productionConfig);

  console.log('Production config:', productionConfig);
  console.log();
}

// ============================================================================
// Example 3: Development with Monitoring
// ============================================================================

export function example3_DevelopmentMonitoring() {
  console.log('=== Example 3: Development with Monitoring ===\n');

  // Development config: monitoring enabled
  const devConfig = {
    ...DEFAULT_PERFORMANCE_CONFIG,
    enableMonitoring: true,
  };

  const ops = new OptimizedEffectOperations(devConfig);
  const monitor = ops.getMonitor();

  // Simulate some operations
  monitor.measure('parse-effect', () => {
    // Simulate parsing
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(i);
    }
  });

  monitor.measure('filter-targets', () => {
    // Simulate filtering
    for (let i = 0; i < 500; i++) {
      Math.sqrt(i);
    }
  });

  // Generate report
  console.log(monitor.generateReport());
  console.log();
}

// ============================================================================
// Example 4: Effect Batching
// ============================================================================

export function example4_EffectBatching() {
  console.log('=== Example 4: Effect Batching ===\n');

  // Create some mock effects
  const effects = [
    {
      effectDefinition: {
        effectType: 'DEAL_DAMAGE' as any,
        parameters: { value: 1 },
      },
    },
    {
      effectDefinition: {
        effectType: 'POWER_MODIFICATION' as any,
        parameters: { powerChange: 1000 },
      },
    },
    {
      effectDefinition: {
        effectType: 'DRAW_CARDS' as any,
        parameters: { cardCount: 2 },
      },
    },
    {
      effectDefinition: {
        effectType: 'POWER_MODIFICATION' as any,
        parameters: { powerChange: 500 },
      },
    },
  ] as any[];

  // Batch effects
  const batches = EffectBatcher.batchEffects(effects);
  console.log('Effect batches:', batches.length);
  for (const batch of batches) {
    console.log(`  ${batch.type}: ${batch.effects.length} effects, can batch: ${batch.canBatch}`);
  }

  // Optimize resolution order
  const optimized = EffectBatcher.optimizeResolutionOrder(effects);
  console.log('\nOptimized order:');
  for (const effect of optimized) {
    console.log(`  ${effect.effectDefinition.effectType}`);
  }

  // Estimate gain
  const gain = EffectBatcher.estimateBatchingGain(effects);
  console.log(`\nEstimated batching gain: ${gain}`);
  console.log();
}

// ============================================================================
// Example 5: Lazy Evaluation for AI
// ============================================================================

export function example5_LazyEvaluation() {
  console.log('=== Example 5: Lazy Evaluation ===\n');

  // Simulate expensive AI evaluation
  const evaluateAction = (action: string) => {
    // Simulate expensive computation
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  };

  const actions = ['attack-1', 'attack-2', 'attack-3', 'play-card', 'give-don'];

  // Without lazy evaluation - evaluates all
  console.time('Without lazy evaluation');
  const allScores = actions.map(a => evaluateAction(a));
  console.timeEnd('Without lazy evaluation');
  console.log('Evaluated all actions:', allScores.length);

  // With lazy evaluation - only evaluates what's needed
  console.time('With lazy evaluation');
  const lazyScores = new LazyList(
    actions.map(a => new Lazy(() => evaluateAction(a)))
  );
  const top3 = lazyScores.take(3);
  console.timeEnd('With lazy evaluation');
  console.log('Evaluated only top 3:', top3.length);
  console.log('Computed count:', lazyScores.getComputedCount());
  console.log();
}

// ============================================================================
// Example 6: Function Memoization
// ============================================================================

export function example6_Memoization() {
  console.log('=== Example 6: Function Memoization ===\n');

  // Expensive function
  const fibonacci = (n: number): number => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  };

  // Memoized version
  const memoizedFib = memoize(fibonacci);

  // First call - slow
  console.time('First call (uncached)');
  const result1 = memoizedFib(30);
  console.timeEnd('First call (uncached)');
  console.log('Result:', result1);

  // Second call - fast
  console.time('Second call (cached)');
  const result2 = memoizedFib(30);
  console.timeEnd('Second call (cached)');
  console.log('Result:', result2);
  console.log();
}

// ============================================================================
// Example 7: Cache Management
// ============================================================================

export function example7_CacheManagement() {
  console.log('=== Example 7: Cache Management ===\n');

  const cacheManager = new EffectCacheManager(100, 50);

  // Use parsing cache
  const parsingCache = cacheManager.getParsingCache();
  parsingCache.set('card-1', '[On Play] Draw 1 card', [] as any);
  parsingCache.set('card-2', '[When Attacking] +1000 power', [] as any);

  // Check stats
  let stats = cacheManager.getStats();
  console.log('Initial cache stats:');
  console.log('  Parsing cache size:', stats.parsing.size);
  console.log('  Target cache size:', stats.targeting.size);

  // Clear all caches
  cacheManager.clearAll();

  stats = cacheManager.getStats();
  console.log('\nAfter clearing:');
  console.log('  Parsing cache size:', stats.parsing.size);
  console.log('  Target cache size:', stats.targeting.size);
  console.log();
}

// ============================================================================
// Example 8: Complete Integration
// ============================================================================

export function example8_CompleteIntegration() {
  console.log('=== Example 8: Complete Integration ===\n');

  // Create optimized operations
  const ops = new OptimizedEffectOperations({
    enableCaching: true,
    enableBatching: true,
    enableLazyEvaluation: true,
    enableMonitoring: true,
    parsingCacheSize: 500,
    targetCacheSize: 200,
  });

  // Simulate a game turn with effects
  console.log('Simulating game turn...');

  // 1. Parse card effects (with caching)
  const parser = createOptimizedParser();
  measureEffectResolution('parse-effects', () => {
    parser.parseEffectText('[On Play] Draw 2 cards', 'card-1');
    parser.parseEffectText('[When Attacking] +1000 power', 'card-2');
    parser.parseEffectText('[On Play] Draw 2 cards', 'card-1'); // Cache hit
  });

  // 2. Batch effects for resolution
  const effects = [
    {
      effectDefinition: {
        effectType: 'POWER_MODIFICATION' as any,
        parameters: { powerChange: 1000 },
      },
    },
    {
      effectDefinition: {
        effectType: 'POWER_MODIFICATION' as any,
        parameters: { powerChange: 500 },
      },
    },
    {
      effectDefinition: {
        effectType: 'DRAW_CARDS' as any,
        parameters: { cardCount: 2 },
      },
    },
  ] as any[];

  const batched = measureEffectResolution('batch-effects', () => {
    return ops.batchEffects(effects);
  });

  console.log('Batched effects:', batched.length);

  // 3. State change - invalidate caches
  ops.onStateChange();

  // 4. Generate performance report
  console.log('\n' + ops.generatePerformanceReport());
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  example1_BasicUsage();
  example2_ProductionConfig();
  example3_DevelopmentMonitoring();
  example4_EffectBatching();
  example5_LazyEvaluation();
  example6_Memoization();
  example7_CacheManagement();
  example8_CompleteIntegration();
}

// Uncomment to run examples
// runAllExamples();
