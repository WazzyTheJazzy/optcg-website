/**
 * PerformanceOptimizations.ts
 * 
 * Integration module for all performance optimizations.
 * Provides a unified interface for using caching, batching, and lazy evaluation.
 */

import { EffectCacheManager, EffectParsingCache, TargetFilterCache } from './EffectCache';
import { EffectBatcher } from './EffectBatcher';
import { OptimizedTargetFilter } from './OptimizedTargetFilter';
import { PerformanceMonitor, globalPerformanceMonitor } from './PerformanceMonitor';
import { Lazy, LazyList, memoize } from './LazyEvaluation';
import { EffectParser } from './EffectParser';
import { EffectDefinition, EffectInstance, TargetFilter, Target } from './types';
import { GameStateManager } from '../core/GameState';
import { PlayerId } from '../core/types';

/**
 * Configuration for performance optimizations
 */
export interface PerformanceConfig {
  enableCaching: boolean;
  enableBatching: boolean;
  enableLazyEvaluation: boolean;
  enableMonitoring: boolean;
  parsingCacheSize: number;
  targetCacheSize: number;
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableCaching: true,
  enableBatching: true,
  enableLazyEvaluation: true,
  enableMonitoring: process.env.NODE_ENV === 'development',
  parsingCacheSize: 500,
  targetCacheSize: 200,
};

/**
 * Optimized effect parser with caching
 */
export class OptimizedEffectParser extends EffectParser {
  private cache: EffectParsingCache;
  private monitor: PerformanceMonitor;
  private config: PerformanceConfig;

  constructor(
    cache?: EffectParsingCache,
    monitor?: PerformanceMonitor,
    config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG
  ) {
    super();
    this.cache = cache || new EffectParsingCache(config.parsingCacheSize);
    this.monitor = monitor || globalPerformanceMonitor;
    this.config = config;
  }

  /**
   * Parse effect text with caching
   */
  override parseEffectText(effectText: string, cardId: string): EffectDefinition[] {
    if (!this.config.enableCaching) {
      return this.monitor.measure(
        'EffectParser.parseEffectText',
        () => super.parseEffectText(effectText, cardId)
      );
    }

    // Check cache first
    const cached = this.cache.get(cardId, effectText);
    if (cached) {
      return cached;
    }

    // Parse and cache
    const effects = this.monitor.measure(
      'EffectParser.parseEffectText',
      () => super.parseEffectText(effectText, cardId)
    );

    this.cache.set(cardId, effectText, effects);
    return effects;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Optimized effect system with all performance enhancements
 */
export class OptimizedEffectOperations {
  private cacheManager: EffectCacheManager;
  private monitor: PerformanceMonitor;
  private config: PerformanceConfig;
  private stateVersion: number;

  constructor(
    config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG,
    monitor?: PerformanceMonitor
  ) {
    this.config = config;
    this.cacheManager = new EffectCacheManager(
      config.parsingCacheSize,
      config.targetCacheSize
    );
    this.monitor = monitor || globalPerformanceMonitor;
    this.stateVersion = 0;
  }

  /**
   * Get legal targets with caching and optimization
   */
  getLegalTargets(
    filter: TargetFilter,
    controller: PlayerId,
    stateManager: GameStateManager
  ): Target[] {
    if (!this.config.enableCaching) {
      return this.monitor.measure(
        'OptimizedTargetFilter.getLegalTargets',
        () => OptimizedTargetFilter.getLegalTargets(filter, controller, stateManager)
      );
    }

    // Check cache
    const targetCache = this.cacheManager.getTargetCache();
    const cached = targetCache.get(filter, controller, this.stateVersion);
    if (cached) {
      return cached;
    }

    // Compute and cache
    const targets = this.monitor.measure(
      'OptimizedTargetFilter.getLegalTargets',
      () => OptimizedTargetFilter.getLegalTargets(filter, controller, stateManager)
    );

    targetCache.set(filter, controller, targets, this.stateVersion);
    return targets;
  }

  /**
   * Batch effects for optimized resolution
   */
  batchEffects(effects: EffectInstance[]): EffectInstance[] {
    if (!this.config.enableBatching || effects.length <= 1) {
      return effects;
    }

    return this.monitor.measure(
      'EffectBatcher.optimizeResolutionOrder',
      () => {
        // First optimize order
        const optimized = EffectBatcher.optimizeResolutionOrder(effects);
        
        // Then merge compatible effects
        return EffectBatcher.mergePowerModifications(optimized);
      }
    );
  }

  /**
   * Create lazy target list for deferred computation
   */
  createLazyTargets(
    filters: TargetFilter[],
    controller: PlayerId,
    stateManager: GameStateManager
  ): LazyList<Target[]> {
    if (!this.config.enableLazyEvaluation) {
      // Compute all immediately
      const targets = filters.map(filter =>
        this.getLegalTargets(filter, controller, stateManager)
      );
      return new LazyList(targets);
    }

    // Create lazy computations
    const lazyTargets = filters.map(filter =>
      new Lazy(() => this.getLegalTargets(filter, controller, stateManager))
    );

    return new LazyList(lazyTargets);
  }

  /**
   * Invalidate caches when state changes
   */
  onStateChange(): void {
    this.stateVersion++;
    this.cacheManager.getTargetCache().invalidate();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      caches: this.cacheManager.getStats(),
      monitor: {
        slowest: this.monitor.getSlowestOperations(5),
        frequent: this.monitor.getMostFrequentOperations(5),
      },
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const lines: string[] = [];
    
    lines.push('=== Effect System Performance Report ===');
    lines.push('');
    
    // Cache stats
    const cacheStats = this.cacheManager.getStats();
    lines.push('Cache Statistics:');
    lines.push(`  Parsing Cache: ${cacheStats.parsing.size} entries, ${(cacheStats.parsing.hitRate * 100).toFixed(1)}% hit rate`);
    lines.push(`  Target Cache: ${cacheStats.targeting.size} entries, ${(cacheStats.targeting.hitRate * 100).toFixed(1)}% hit rate`);
    lines.push('');
    
    // Performance metrics
    lines.push(this.monitor.generateReport());
    
    return lines.join('\n');
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.cacheManager.clearAll();
  }

  /**
   * Get cache manager
   */
  getCacheManager(): EffectCacheManager {
    return this.cacheManager;
  }

  /**
   * Get performance monitor
   */
  getMonitor(): PerformanceMonitor {
    return this.monitor;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.monitor.setEnabled(this.config.enableMonitoring);
  }
}

/**
 * Global optimized operations instance
 */
export const globalOptimizedOperations = new OptimizedEffectOperations();

/**
 * Utility function to create an optimized effect parser
 */
export function createOptimizedParser(
  config?: Partial<PerformanceConfig>
): OptimizedEffectParser {
  const fullConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  return new OptimizedEffectParser(
    new EffectParsingCache(fullConfig.parsingCacheSize),
    globalPerformanceMonitor,
    fullConfig
  );
}

/**
 * Utility function to measure effect resolution performance
 */
export function measureEffectResolution<T>(
  name: string,
  fn: () => T
): T {
  return globalPerformanceMonitor.measure(`EffectResolution.${name}`, fn);
}

/**
 * Utility function to batch and optimize effects
 */
export function optimizeEffects(effects: EffectInstance[]): EffectInstance[] {
  return globalOptimizedOperations.batchEffects(effects);
}
