/**
 * EffectCache.ts
 * 
 * Caching layer for effect parsing and target filtering to improve performance.
 * Implements LRU cache with configurable size limits.
 */

import { EffectDefinition, TargetFilter, Target } from './types';
import { PlayerId } from '../core/types';

/**
 * Cache entry with timestamp for LRU eviction
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

/**
 * LRU Cache implementation
 */
class LRUCache<K, V> {
  private cache: Map<string, CacheEntry<V>>;
  private maxSize: number;
  private hits: number;
  private misses: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const keyStr = this.serializeKey(key);
    const entry = this.cache.get(keyStr);
    
    if (entry) {
      // Update access timestamp and count
      entry.timestamp = Date.now();
      entry.accessCount++;
      this.hits++;
      return entry.value;
    }
    
    this.misses++;
    return undefined;
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    const keyStr = this.serializeKey(key);
    
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(keyStr)) {
      this.evictLRU();
    }
    
    this.cache.set(keyStr, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(this.serializeKey(key));
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Serialize key to string for Map storage
   */
  private serializeKey(key: K): string {
    if (typeof key === 'string') {
      return key;
    }
    return JSON.stringify(key);
  }
}

/**
 * Effect parsing cache
 * Caches parsed effect definitions by card ID and effect text
 */
export class EffectParsingCache {
  private cache: LRUCache<string, EffectDefinition[]>;

  constructor(maxSize: number = 500) {
    this.cache = new LRUCache(maxSize);
  }

  /**
   * Get cached parsed effects for a card
   */
  get(cardId: string, effectText: string): EffectDefinition[] | undefined {
    const key = `${cardId}:${effectText}`;
    return this.cache.get(key);
  }

  /**
   * Cache parsed effects for a card
   */
  set(cardId: string, effectText: string, effects: EffectDefinition[]): void {
    const key = `${cardId}:${effectText}`;
    this.cache.set(key, effects);
  }

  /**
   * Check if effects are cached
   */
  has(cardId: string, effectText: string): boolean {
    const key = `${cardId}:${effectText}`;
    return this.cache.has(key);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Target filtering cache
 * Caches legal targets for effect filters
 */
export class TargetFilterCache {
  private cache: LRUCache<string, Target[]>;
  private stateVersion: number;

  constructor(maxSize: number = 200) {
    this.cache = new LRUCache(maxSize);
    this.stateVersion = 0;
  }

  /**
   * Get cached legal targets for a filter
   */
  get(filter: TargetFilter, controller: PlayerId, stateVersion: number): Target[] | undefined {
    // Invalidate cache if state version changed
    if (stateVersion !== this.stateVersion) {
      this.invalidate();
      this.stateVersion = stateVersion;
      return undefined;
    }
    
    const key = this.createKey(filter, controller);
    return this.cache.get(key);
  }

  /**
   * Cache legal targets for a filter
   */
  set(filter: TargetFilter, controller: PlayerId, targets: Target[], stateVersion: number): void {
    this.stateVersion = stateVersion;
    const key = this.createKey(filter, controller);
    this.cache.set(key, targets);
  }

  /**
   * Invalidate the cache (called when game state changes)
   */
  invalidate(): void {
    this.cache.clear();
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Create cache key from filter and controller
   */
  private createKey(filter: TargetFilter, controller: PlayerId): string {
    // Create a stable key from filter properties
    return JSON.stringify({
      controller: filter.controller,
      zone: filter.zone,
      category: filter.category,
      color: filter.color,
      costRange: filter.costRange,
      powerRange: filter.powerRange,
      state: filter.state,
      hasKeyword: filter.hasKeyword,
      lacksKeyword: filter.lacksKeyword,
      typeTags: filter.typeTags,
      attributes: filter.attributes,
      playerId: controller,
    });
  }
}

/**
 * Combined effect cache manager
 */
export class EffectCacheManager {
  private parsingCache: EffectParsingCache;
  private targetCache: TargetFilterCache;

  constructor(
    parsingCacheSize: number = 500,
    targetCacheSize: number = 200
  ) {
    this.parsingCache = new EffectParsingCache(parsingCacheSize);
    this.targetCache = new TargetFilterCache(targetCacheSize);
  }

  /**
   * Get the parsing cache
   */
  getParsingCache(): EffectParsingCache {
    return this.parsingCache;
  }

  /**
   * Get the target filter cache
   */
  getTargetCache(): TargetFilterCache {
    return this.targetCache;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.parsingCache.clear();
    this.targetCache.clear();
  }

  /**
   * Get combined cache statistics
   */
  getStats() {
    return {
      parsing: this.parsingCache.getStats(),
      targeting: this.targetCache.getStats(),
    };
  }
}
