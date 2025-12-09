/**
 * CardImageLoader.test.ts
 * 
 * Unit tests for CardImageLoader utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { CardImageLoader } from './CardImageLoader';
import { PlaceholderGenerator } from './PlaceholderGenerator';

// Mock Three.js TextureLoader
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  
  class MockTextureLoader {
    load = vi.fn();
  }
  
  return {
    ...actual,
    TextureLoader: MockTextureLoader,
  };
});

// Mock PlaceholderGenerator
vi.mock('./PlaceholderGenerator', () => ({
  PlaceholderGenerator: {
    generate: vi.fn(() => 'data:image/png;base64,placeholder'),
  },
}));

describe('CardImageLoader', () => {
  let loader: CardImageLoader;
  let mockTexture: THREE.Texture;
  let mockTextureLoader: any;
  
  beforeEach(() => {
    // Reset singleton
    CardImageLoader.resetInstance();
    
    // Create mock texture
    mockTexture = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      needsUpdate: false,
      dispose: vi.fn(),
    } as unknown as THREE.Texture;
    
    // Get the loader instance which will have the mocked TextureLoader
    loader = CardImageLoader.getInstance();
    
    // Setup the load function on the mocked loader
    mockTextureLoader = (loader as any).loader;
    mockTextureLoader.load = vi.fn((url, onLoad?, onProgress?, onError?) => {
      // Simulate successful load for most cases
      if (url.startsWith('data:') || url.startsWith('/valid')) {
        if (onLoad) {
          setTimeout(() => onLoad(mockTexture), 0);
        }
        return mockTexture;
      }
      // Simulate error for invalid URLs
      if (url.startsWith('/invalid')) {
        if (onError) {
          setTimeout(() => onError(new Error('Failed to load')), 0);
        }
        return mockTexture;
      }
      return mockTexture;
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    CardImageLoader.resetInstance();
  });
  
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CardImageLoader.getInstance();
      const instance2 = CardImageLoader.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    it('should create new instance after reset', () => {
      const instance1 = CardImageLoader.getInstance();
      CardImageLoader.resetInstance();
      const instance2 = CardImageLoader.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
    
    it('should accept maxCacheSize on first instantiation', () => {
      CardImageLoader.resetInstance();
      const instance = CardImageLoader.getInstance(50);
      
      expect(instance).toBeDefined();
    });
  });
  
  describe('loadTexture', () => {
    it('should load texture from valid URL', async () => {
      const texture = await loader.loadTexture({
        imageUrl: '/valid/image.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      expect(texture).toBeDefined();
      expect(texture.minFilter).toBe(THREE.LinearFilter);
      expect(texture.magFilter).toBe(THREE.LinearFilter);
      expect(texture.needsUpdate).toBe(true);
    });
    
    it('should fall back to placeholder for missing imageUrl', async () => {
      const texture = await loader.loadTexture({
        imageUrl: '',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      expect(texture).toBeDefined();
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
        showError: false,
      });
    });
    
    it('should fall back to placeholder on load error', async () => {
      const texture = await loader.loadTexture({
        imageUrl: '/invalid/image.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      expect(texture).toBeDefined();
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
        showError: true,
      });
    });
    
    it('should call onProgress callback during load', async () => {
      const onProgress = vi.fn();
      
      mockTextureLoader.load = vi.fn((url, onLoad, onProgressCb) => {
        onProgressCb({ lengthComputable: true, loaded: 50, total: 100 });
        setTimeout(() => onLoad(mockTexture), 0);
        return mockTexture;
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
        onProgress,
      });
      
      expect(onProgress).toHaveBeenCalledWith(0.5);
    });
  });
  
  describe('Texture Caching', () => {
    it('should cache loaded textures', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      expect(loader.getCacheSize()).toBe(1);
    });
    
    it('should return cached texture on second load', async () => {
      const texture1 = await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      // Clear mock calls
      mockTextureLoader.load.mockClear();
      
      const texture2 = await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      expect(texture1).toBe(texture2);
      expect(mockTextureLoader.load).not.toHaveBeenCalled();
    });
    
    it('should increment reference count on cache hit', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      const stats = loader.getCacheStats();
      const entry = stats.entries.find(e => e.url === '/valid/image1.png');
      
      expect(entry?.refCount).toBe(2);
    });
    
    it('should update lastUsed timestamp on cache hit', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      const stats1 = loader.getCacheStats();
      const entry1 = stats1.entries.find(e => e.url === '/valid/image1.png');
      const firstTime = entry1?.lastUsed || 0;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      const stats2 = loader.getCacheStats();
      const entry2 = stats2.entries.find(e => e.url === '/valid/image1.png');
      const secondTime = entry2?.lastUsed || 0;
      
      expect(secondTime).toBeGreaterThan(firstTime);
    });
  });
  
  describe('LRU Cache Eviction', () => {
    it('should evict oldest texture when cache is full', async () => {
      // Create loader with small cache
      CardImageLoader.resetInstance();
      loader = CardImageLoader.getInstance(3);
      
      // Re-setup mock for new loader instance
      mockTextureLoader = (loader as any).loader;
      mockTextureLoader.load = vi.fn((url, onLoad?, onProgress?, onError?) => {
        if (url.startsWith('data:') || url.startsWith('/valid')) {
          if (onLoad) {
            setTimeout(() => onLoad(mockTexture), 0);
          }
          return mockTexture;
        }
        if (url.startsWith('/invalid')) {
          if (onError) {
            setTimeout(() => onError(new Error('Failed to load')), 0);
          }
          return mockTexture;
        }
        return mockTexture;
      });
      
      // Load 3 textures
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: { name: 'Card 1', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image2.png',
        fallbackData: { name: 'Card 2', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image3.png',
        fallbackData: { name: 'Card 3', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      expect(loader.getCacheSize()).toBe(3);
      
      // Load 4th texture - should evict oldest
      await loader.loadTexture({
        imageUrl: '/valid/image4.png',
        fallbackData: { name: 'Card 4', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      expect(loader.getCacheSize()).toBe(3);
      expect(mockTexture.dispose).toHaveBeenCalled();
    });
    
    it('should evict least recently used texture', async () => {
      CardImageLoader.resetInstance();
      loader = CardImageLoader.getInstance(2);
      
      // Re-setup mock for new loader instance
      mockTextureLoader = (loader as any).loader;
      mockTextureLoader.load = vi.fn((url, onLoad?, onProgress?, onError?) => {
        if (url.startsWith('data:') || url.startsWith('/valid')) {
          if (onLoad) {
            setTimeout(() => onLoad(mockTexture), 0);
          }
          return mockTexture;
        }
        if (url.startsWith('/invalid')) {
          if (onError) {
            setTimeout(() => onError(new Error('Failed to load')), 0);
          }
          return mockTexture;
        }
        return mockTexture;
      });
      
      // Load 2 textures
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: { name: 'Card 1', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image2.png',
        fallbackData: { name: 'Card 2', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      // Access image1 again to update its lastUsed
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: { name: 'Card 1', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      // Load 3rd texture - should evict image2 (least recently used)
      await loader.loadTexture({
        imageUrl: '/valid/image3.png',
        fallbackData: { name: 'Card 3', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      const stats = loader.getCacheStats();
      const urls = stats.entries.map(e => e.url);
      
      expect(urls).toContain('/valid/image1.png');
      expect(urls).toContain('/valid/image3.png');
      expect(urls).not.toContain('/valid/image2.png');
    });
  });
  
  describe('Reference Counting', () => {
    it('should decrement reference count on release', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      let stats = loader.getCacheStats();
      let entry = stats.entries.find(e => e.url === '/valid/image1.png');
      expect(entry?.refCount).toBe(2);
      
      loader.releaseTexture('/valid/image1.png');
      
      stats = loader.getCacheStats();
      entry = stats.entries.find(e => e.url === '/valid/image1.png');
      expect(entry?.refCount).toBe(1);
    });
    
    it('should not go below 0 reference count', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      loader.releaseTexture('/valid/image1.png');
      loader.releaseTexture('/valid/image1.png');
      loader.releaseTexture('/valid/image1.png');
      
      const stats = loader.getCacheStats();
      const entry = stats.entries.find(e => e.url === '/valid/image1.png');
      expect(entry?.refCount).toBe(0);
    });
    
    it('should handle release of non-existent texture', () => {
      expect(() => {
        loader.releaseTexture('/nonexistent.png');
      }).not.toThrow();
    });
  });
  
  describe('getCachedTexture', () => {
    it('should return null for non-cached texture', () => {
      const texture = loader.getCachedTexture('/nonexistent.png');
      expect(texture).toBeNull();
    });
    
    it('should return cached texture', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
      });
      
      const texture = loader.getCachedTexture('/valid/image1.png');
      expect(texture).toBeDefined();
      expect(texture).toBe(mockTexture);
    });
  });
  
  describe('generatePlaceholder', () => {
    it('should generate placeholder texture', () => {
      const texture = loader.generatePlaceholder(
        {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
        false
      );
      
      expect(texture).toBeDefined();
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
        showError: false,
      });
    });
    
    it('should generate placeholder with error indicator', () => {
      const texture = loader.generatePlaceholder(
        {
          name: 'Test Card',
          category: 'CHARACTER',
          power: 5000,
          cost: 3,
        },
        true
      );
      
      expect(texture).toBeDefined();
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
        showError: true,
      });
    });
  });
  
  describe('clearCache', () => {
    it('should clear all cached textures', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: { name: 'Card 1', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image2.png',
        fallbackData: { name: 'Card 2', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      expect(loader.getCacheSize()).toBe(2);
      
      loader.clearCache();
      
      expect(loader.getCacheSize()).toBe(0);
    });
    
    it('should dispose all textures on clear', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: { name: 'Card 1', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      await loader.loadTexture({
        imageUrl: '/valid/image2.png',
        fallbackData: { name: 'Card 2', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      loader.clearCache();
      
      expect(mockTexture.dispose).toHaveBeenCalled();
    });
  });
  
  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      await loader.loadTexture({
        imageUrl: '/valid/image1.png',
        fallbackData: { name: 'Card 1', category: 'CHARACTER', power: 5000, cost: 3 },
      });
      
      const stats = loader.getCacheStats();
      
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(100);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].url).toBe('/valid/image1.png');
      expect(stats.entries[0].refCount).toBe(1);
      expect(stats.entries[0].lastUsed).toBeGreaterThan(0);
    });
  });
});
