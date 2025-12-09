# AI Performance Optimization

This document describes the performance optimization features implemented in the AI system to improve decision-making speed and efficiency.

## Overview

The AI performance optimization system provides several strategies to reduce evaluation overhead and improve response times:

1. **Action Pruning** - Filters obviously bad moves before evaluation
2. **Evaluation Caching** - Caches evaluation results to avoid redundant computations
3. **Optimized Simulation** - Only computes relevant state changes during simulation
4. **Time-Limited Evaluation** - Implements early termination when time limits are exceeded
5. **Performance Profiling** - Tracks metrics for monitoring and optimization

## Components

### PerformanceOptimizer

The main coordinator class that manages all optimization strategies.

```typescript
import { PerformanceOptimizer } from './PerformanceOptimizer';

// Create optimizer with default configuration
const optimizer = new PerformanceOptimizer();

// Or with custom configuration
const optimizer = new PerformanceOptimizer({
  enableCaching: true,
  enablePruning: true,
  enableTimeLimit: true,
  cacheMaxSize: 1000,
  cacheMaxAge: 5000, // 5 seconds
  timeLimitMs: 3000, // 3 seconds
  pruningThreshold: -50,
});
```

### EvaluationCache

Caches evaluation results to avoid redundant computations for similar game states.

**Features:**
- Automatic cache eviction based on age and size limits
- Tracks cache hit/miss rates for performance monitoring
- Configurable cache size and entry lifetime

**Usage:**
```typescript
const cache = optimizer.getCache();

// Check cache before evaluation
const cachedScore = cache.get(state, action, playerId);
if (cachedScore !== null) {
  return cachedScore;
}

// Evaluate and cache result
const score = evaluateAction(action, state, playerId);
cache.set(state, action, playerId, score);
```

### ActionPruner

Filters obviously bad actions before evaluation to reduce computational overhead.

**Pruning Rules:**
- Removes unaffordable card plays (cost > available DON)
- Removes character plays when board is full
- Removes stage plays when stage already exists
- Keeps high-value actions (Rush, Double Attack, On Play effects)
- Removes over-invested DON assignments (4+ DON on one card)
- Removes very unfavorable attacks (attacker power < 50% of target)

**Usage:**
```typescript
const pruner = optimizer.getPruner();
const prunedActions = pruner.pruneActions(actions, state, playerId);
// Evaluate only the pruned actions
```

### TimeLimitedEvaluator

Implements time-limited evaluation with early termination to ensure responsive AI.

**Features:**
- Configurable time limits per decision
- Early termination when time limit is exceeded
- Ensures at least some options are evaluated before timeout

**Usage:**
```typescript
const timeLimiter = optimizer.getTimeLimiter();

const results = timeLimiter.evaluateWithTimeLimit(options, (option) => {
  return evaluateOption(option);
});
```

### OptimizedStateSimulator

Creates lightweight state copies and simulates only relevant changes.

**Optimizations:**
- Shallow copying of unchanged state
- Only simulates essential state changes
- Avoids deep copying of history and pending triggers
- References unchanged arrays instead of copying

**Usage:**
```typescript
const simulator = optimizer.getSimulator();

// Create lightweight copy
const lightweightState = simulator.createLightweightStateCopy(state);

// Simulate only relevant changes
const changes = simulator.simulateRelevantChanges(state, action);
```

## Performance Metrics

The optimizer tracks various performance metrics:

```typescript
const metrics = optimizer.getMetrics();

console.log('Performance Metrics:', {
  totalEvaluations: metrics.totalEvaluations,
  cacheHits: metrics.cacheHits,
  cacheMisses: metrics.cacheMisses,
  cacheHitRate: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses),
  prunedActions: metrics.prunedActions,
  averageEvaluationTimeMs: metrics.averageEvaluationTimeMs,
});
```

## Integration with AIDecisionSystem

The performance optimizer is automatically integrated into the AIDecisionSystem:

```typescript
import { AIDecisionSystem } from './AIDecisionSystem';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';

const evaluator = new ActionEvaluator(weights);
const strategy = new StrategyManager();
const optimizer = new PerformanceOptimizer();

const decisionSystem = new AIDecisionSystem(evaluator, strategy, optimizer);

// The decision system automatically uses:
// - Action pruning before evaluation
// - Evaluation caching during scoring
// - Time-limited evaluation for responsiveness
```

## Configuration Options

### OptimizationConfig

```typescript
interface OptimizationConfig {
  enableCaching: boolean;      // Enable/disable evaluation caching
  enablePruning: boolean;       // Enable/disable action pruning
  enableTimeLimit: boolean;     // Enable/disable time-limited evaluation
  cacheMaxSize: number;         // Maximum cache entries (default: 1000)
  cacheMaxAge: number;          // Cache entry lifetime in ms (default: 5000)
  timeLimitMs: number;          // Time limit per decision in ms (default: 3000)
  pruningThreshold: number;     // Score threshold for pruning (default: -50)
}
```

### Default Configuration

```typescript
const DEFAULT_OPTIMIZATION_CONFIG = {
  enableCaching: true,
  enablePruning: true,
  enableTimeLimit: true,
  cacheMaxSize: 1000,
  cacheMaxAge: 5000,
  timeLimitMs: 3000,
  pruningThreshold: -50,
};
```

## Performance Impact

Expected performance improvements:

1. **Action Pruning**: 20-40% reduction in evaluations for complex decisions
2. **Evaluation Caching**: 30-60% reduction in evaluation time for similar states
3. **Time-Limited Evaluation**: Guarantees response within configured time limit
4. **Optimized Simulation**: 40-70% faster state simulation

## Best Practices

### 1. Tune Configuration for Your Use Case

```typescript
// For fast, responsive AI (e.g., easy difficulty)
const fastConfig = {
  enableCaching: true,
  enablePruning: true,
  enableTimeLimit: true,
  timeLimitMs: 1000, // 1 second limit
  pruningThreshold: -30, // More aggressive pruning
};

// For thorough evaluation (e.g., hard difficulty)
const thoroughConfig = {
  enableCaching: true,
  enablePruning: false, // Evaluate all options
  enableTimeLimit: true,
  timeLimitMs: 5000, // 5 second limit
  pruningThreshold: -100, // Less aggressive pruning
};
```

### 2. Monitor Performance Metrics

```typescript
// Periodically check metrics
setInterval(() => {
  const metrics = optimizer.getMetrics();
  
  if (metrics.averageEvaluationTimeMs > 100) {
    console.warn('AI evaluation is slow, consider more aggressive pruning');
  }
  
  const hitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
  if (hitRate < 0.3) {
    console.warn('Low cache hit rate, consider increasing cache size');
  }
}, 60000); // Every minute
```

### 3. Clear Caches Between Games

```typescript
// Clear caches when starting a new game
optimizer.clearCaches();
optimizer.resetMetrics();
```

### 4. Adjust Time Limits Based on Complexity

```typescript
// Adjust time limit based on number of options
const baseTimeLimit = 2000;
const timePerOption = 100;
const adjustedTimeLimit = baseTimeLimit + (actions.length * timePerOption);

optimizer.updateConfig({
  timeLimitMs: Math.min(adjustedTimeLimit, 5000), // Cap at 5 seconds
});
```

## Troubleshooting

### High Cache Miss Rate

If cache hit rate is low (<30%):
- Increase `cacheMaxSize` to store more entries
- Increase `cacheMaxAge` to keep entries longer
- Check if game states are changing too frequently

### Slow Evaluation Times

If average evaluation time is high (>100ms):
- Enable or increase pruning aggressiveness
- Reduce `timeLimitMs` to force early termination
- Check for inefficient evaluation logic

### Too Many Actions Pruned

If too many actions are being pruned:
- Reduce `pruningThreshold` to be less aggressive
- Review pruning rules to ensure they're not too strict
- Disable pruning for critical decisions

## Testing

Run performance tests:

```bash
npm test -- PerformanceOptimizer.test.ts
```

Run performance benchmarks:

```bash
npm test -- AI.performance.test.ts
```

## Future Enhancements

Potential future optimizations:

1. **Parallel Evaluation** - Evaluate multiple actions concurrently
2. **Incremental Simulation** - Cache partial simulation results
3. **Adaptive Pruning** - Adjust pruning based on available time
4. **Machine Learning** - Learn which actions to prune based on outcomes
5. **Transposition Tables** - Share evaluations across similar positions

## References

- [ActionEvaluator.ts](./ActionEvaluator.ts) - Core evaluation logic
- [AIDecisionSystem.ts](./AIDecisionSystem.ts) - Decision-making coordinator
- [PerformanceOptimizer.ts](./PerformanceOptimizer.ts) - Performance optimization implementation
- [AI.performance.test.ts](./AI.performance.test.ts) - Performance benchmarks
