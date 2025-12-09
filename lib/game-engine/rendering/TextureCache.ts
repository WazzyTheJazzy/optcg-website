/**
 * Texture Cache Manager
 * 
 * Centralized texture caching system for efficient texture loading and reuse.
 * Prevents duplicate texture loads and manages texture lifecycle.
 */

import * as THREE from 'three';

export interface TextureCacheEntry {
  texture: THREE.Texture;
  refCount: number;
  lastUsed: number;
}

export interface TextureCacheStats {
  totalTextures: number;
  totalMemoryEstimate: number; // in bytes
  cacheHits: number;
  cacheMisses: number;
  size: number; // Number of cached textures
}

/**
 * Texture Cache Manager
 * Singleton pattern for global texture caching
 */
export class TextureCache {
  private static instance: TextureCache | null = null;
  
  private cache = new Map<string, TextureCacheEntry>();
  private loader = new THREE.TextureLoader();
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  // Texture loading promises to prevent duplicate loads
  private loadingPromises = new Map<string, Promise<THREE.Texture>>();
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  static getInstance(): TextureCache {
    if (!TextureCache.instance) {
      TextureCache.instance = new TextureCache();
    }
    return TextureCache.instance;
  }
  
  /**
   * Load a texture with caching
   */
  async load(path: string, options?: {
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    minFilter?: THREE.MinificationTextureFilter;
    magFilter?: THREE.MagnificationTextureFilter;
    anisotropy?: number;
  }): Promise<THREE.Texture> {
    // Check cache first
    const cached = this.cache.get(path);
    if (cached) {
      this.stats.cacheHits++;
      cached.refCount++;
      cached.lastUsed = Date.now();
      return cached.texture;
    }
    
    // Check if already loading
    const loadingPromise = this.loadingPromises.get(path);
    if (loadingPromise) {
      return loadingPromise;
    }
    
    // Load texture
    this.stats.cacheMisses++;
    
    const promise = this.loadTexture(path, options);
    this.loadingPromises.set(path, promise);
    
    try {
      const texture = await promise;
      
      // Cache the texture
      this.cache.set(path, {
        texture,
        refCount: 1,
        lastUsed: Date.now(),
      });
      
      return texture;
    } finally {
      this.loadingPromises.delete(path);
    }
  }
  
  /**
   * Internal texture loading method
   */
  private async loadTexture(
    path: string,
    options?: {
      wrapS?: THREE.Wrapping;
      wrapT?: THREE.Wrapping;
      minFilter?: THREE.TextureFilter;
      magFilter?: THREE.TextureFilter;
      anisotropy?: number;
    }
  ): Promise<THREE.Texture> {
    try {
      const texture = await this.loader.loadAsync(path);
      
      // Apply options
      if (options) {
        if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
        if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
        if (options.minFilter !== undefined) texture.minFilter = options.minFilter;
        if (options.magFilter !== undefined) {
          // Only LinearFilter and NearestFilter are valid for magFilter
          if (options.magFilter === THREE.LinearFilter || options.magFilter === THREE.NearestFilter) {
            texture.magFilter = options.magFilter;
          }
        }
        if (options.anisotropy !== undefined) texture.anisotropy = options.anisotropy;
      }
      
      // Default settings for better quality
      if (!options?.minFilter) {
        texture.minFilter = THREE.LinearMipmapLinearFilter;
      }
      if (!options?.magFilter) {
        texture.magFilter = THREE.LinearFilter;
      }
      
      return texture;
    } catch (error) {
      console.error(`Failed to load texture: ${path}`, error);
      throw error;
    }
  }
  
  /**
   * Release a texture reference
   */
  release(path: string): void {
    const cached = this.cache.get(path);
    if (cached) {
      cached.refCount--;
      
      // If no more references, dispose after a delay
      if (cached.refCount <= 0) {
        setTimeout(() => {
          const entry = this.cache.get(path);
          if (entry && entry.refCount <= 0) {
            entry.texture.dispose();
            this.cache.delete(path);
          }
        }, 30000); // 30 second grace period
      }
    }
  }
  
  /**
   * Preload textures
   */
  async preload(paths: string[]): Promise<void> {
    const promises = paths.map(path => this.load(path));
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.warn('TextureCache: Some textures failed to preload', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): TextureCacheStats {
    let totalMemoryEstimate = 0;
    
    this.cache.forEach(entry => {
      const texture = entry.texture;
      const image = texture.image;
      
      if (image && typeof image === 'object' && 'width' in image && 'height' in image) {
        // Estimate: width * height * 4 bytes (RGBA)
        const width = (image as { width: number; height: number }).width;
        const height = (image as { width: number; height: number }).height;
        totalMemoryEstimate += width * height * 4;
      }
    });
    
    return {
      totalTextures: this.cache.size,
      totalMemoryEstimate,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      size: this.cache.size,
    };
  }
  
  /**
   * Set a texture in the cache (for testing)
   */
  set(path: string, texture: THREE.Texture): void {
    this.cache.set(path, {
      texture,
      refCount: 1,
      lastUsed: Date.now(),
    });
  }

  /**
   * Clear all cached textures
   */
  clear(): void {
    this.cache.forEach(entry => {
      entry.texture.dispose();
    });
    
    this.cache.clear();
    this.loadingPromises.clear();
  }
  
  /**
   * Clean up old unused textures
   */
  cleanup(maxAge: number = 300000): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.cache.forEach((entry, path) => {
      if (entry.refCount <= 0 && now - entry.lastUsed > maxAge) {
        toDelete.push(path);
      }
    });
    
    toDelete.forEach(path => {
      const entry = this.cache.get(path);
      if (entry) {
        entry.texture.dispose();
        this.cache.delete(path);
      }
    });
  }
  
  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats();
    const hitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100;
    
    console.log('📊 Texture Cache Statistics:');
    console.log(`  Total Textures: ${stats.totalTextures}`);
    console.log(`  Memory Estimate: ${(stats.totalMemoryEstimate / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Cache Hits: ${stats.cacheHits}`);
    console.log(`  Cache Misses: ${stats.cacheMisses}`);
    console.log(`  Hit Rate: ${hitRate.toFixed(1)}%`);
  }
}

/**
 * DON Card Texture Manager
 * Specialized manager for DON card textures
 */
export class DonTextureManager {
  private static instance: DonTextureManager | null = null;
  private cache = TextureCache.getInstance();
  
  private readonly DON_TEXTURES = {
    front: '/cards/don-card-front.png',
    back: '/cards/card-back.svg',
  };
  
  private constructor() {}
  
  static getInstance(): DonTextureManager {
    if (!DonTextureManager.instance) {
      DonTextureManager.instance = new DonTextureManager();
    }
    return DonTextureManager.instance;
  }
  
  /**
   * Preload all DON textures
   */
  async preload(): Promise<void> {
    await this.cache.preload([
      this.DON_TEXTURES.front,
      this.DON_TEXTURES.back,
    ]);
  }
  
  /**
   * Get DON front texture
   */
  async getFrontTexture(): Promise<THREE.Texture> {
    return this.cache.load(this.DON_TEXTURES.front, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }
  
  /**
   * Get DON back texture
   */
  async getBackTexture(): Promise<THREE.Texture> {
    return this.cache.load(this.DON_TEXTURES.back, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }
}

/**
 * Convenience function to get the global texture cache
 */
export function getTextureCache(): TextureCache {
  return TextureCache.getInstance();
}

/**
 * Convenience function to get the DON texture manager
 */
export function getDonTextureManager(): DonTextureManager {
  return DonTextureManager.getInstance();
}
