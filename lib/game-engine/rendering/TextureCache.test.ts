/**
 * Texture Cache Tests
 * 
 * Tests for the texture caching system.
 * Note: These tests verify the cache logic without actually loading textures.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TextureCache, DonTextureManager, getTextureCache, getDonTextureManager } from './TextureCache';

describe('TextureCache', () => {
  let cache: TextureCache;
  
  beforeEach(() => {
    cache = TextureCache.getInstance();
    cache.clear(); // Start fresh
  });
  
  afterEach(() => {
    cache.clear();
  });
  
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const cache1 = TextureCache.getInstance();
      const cache2 = TextureCache.getInstance();
      
      expect(cache1).toBe(cache2);
    });
  });
  
  describe('Statistics', () => {
    it('should initialize with zero statistics', () => {
      const stats = cache.getStats();
      expect(stats.totalTextures).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.totalMemoryEstimate).toBe(0);
    });
  });
  
  describe('Cleanup', () => {
    it('should clear all textures', () => {
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.totalTextures).toBe(0);
    });
  });
});

describe('DonTextureManager', () => {
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const manager1 = DonTextureManager.getInstance();
      const manager2 = DonTextureManager.getInstance();
      
      expect(manager1).toBe(manager2);
    });
  });
});

describe('Global Functions', () => {
  it('should get global texture cache', () => {
    const cache = getTextureCache();
    expect(cache).toBeInstanceOf(TextureCache);
  });
  
  it('should get global DON texture manager', () => {
    const manager = getDonTextureManager();
    expect(manager).toBeInstanceOf(DonTextureManager);
  });
});
