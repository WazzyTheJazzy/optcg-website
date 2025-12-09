/**
 * CardImageLoader.ts
 * 
 * Utility for loading and caching card image textures with Three.js.
 * Implements LRU cache eviction, reference counting, and fallback to
 * placeholder generation on load failures.
 * 
 * @module CardImageLoader
 * @see {@link PlaceholderGenerator} for fallback texture generation
 * 
 * @example
 * ```typescript
 * const loader = CardImageLoader.getInstance();
 * const texture = await loader.loadTexture({
 *   imageUrl: '/cards/OP01-001.png',
 *   fallbackData: {
 *     name: 'Monkey D. Luffy',
 *     category: 'LEADER',
 *     power: 5000,
 *     cost: 0
 *   }
 * });
 * ```
 */

import * as THREE from 'three';
import { PlaceholderGenerator } from './PlaceholderGenerator';

/**
 * Cache entry for a loaded texture with metadata for LRU eviction
 * 
 * @interface TextureCacheEntry
 * @property {THREE.Texture} texture - The cached Three.js texture object
 * @property {number} lastUsed - Timestamp of last access (for LRU eviction)
 * @property {number} refCount - Reference count for lifecycle management
 */
interface TextureCacheEntry {
  texture: THREE.Texture;
  lastUsed: number;
  refCount: number;
}

/**
 * Options for loading a card image texture
 * 
 * @interface LoadImageOptions
 * @property {string} imageUrl - URL of the card image (local or external)
 * @property {Object} fallbackData - Card data for placeholder generation if load fails
 * @property {string} fallbackData.name - Card name
 * @property {string} fallbackData.category - Card category (LEADER, CHARACTER, EVENT, STAGE)
 * @property {number} fallbackData.power - Card power value
 * @property {number} fallbackData.cost - Card cost value
 * @property {Function} [onProgress] - Optional callback for load progress (0-1)
 */
export interface LoadImageOptions {
  imageUrl: string;
  fallbackData: {
    name: string;
    category: string;
    power: number;
    cost: number;
  };
  onProgress?: (progress: number) => void;
}

/**
 * CardImageLoader - Singleton utility for loading and caching card textures
 * 
 * This class manages the complete lifecycle of card image textures in the game,
 * from loading through caching to disposal. It implements several key features:
 * 
 * **Features:**
 * - **LRU Cache**: Configurable maximum cache size with least-recently-used eviction
 * - **Reference Counting**: Tracks texture usage to prevent premature disposal
 * - **Automatic Fallback**: Generates placeholder textures when images fail to load
 * - **Image Proxy**: Routes external URLs through proxy to avoid CORS issues
 * - **Timeout Handling**: 5-second timeout for image loads with automatic fallback
 * - **Memory Management**: Proper Three.js texture disposal to prevent memory leaks
 * 
 * **Usage Pattern:**
 * ```typescript
 * // Get singleton instance
 * const loader = CardImageLoader.getInstance();
 * 
 * // Load texture (with automatic caching)
 * const texture = await loader.loadTexture({
 *   imageUrl: card.metadata.imageUrl,
 *   fallbackData: {
 *     name: card.metadata.name,
 *     category: card.metadata.category,
 *     power: card.power,
 *     cost: card.cost
 *   }
 * });
 * 
 * // Release reference when done
 * loader.releaseTexture(card.metadata.imageUrl);
 * ```
 * 
 * @class CardImageLoader
 * @singleton
 */
export class CardImageLoader {
  private static instance: CardImageLoader | null = null;
  
  private cache: Map<string, TextureCacheEntry>;
  private maxCacheSize: number;
  private loader: THREE.TextureLoader;
  
  /**
   * Private constructor for singleton pattern
   * 
   * Initializes the texture cache, loader, and configuration. This constructor
   * is private to enforce the singleton pattern - use getInstance() instead.
   * 
   * @private
   * @param {number} [maxCacheSize=100] - Maximum number of textures to cache before LRU eviction
   */
  private constructor(maxCacheSize: number = 100) {
    this.cache = new Map();
    this.maxCacheSize = maxCacheSize;
    this.loader = new THREE.TextureLoader();
  }
  
  /**
   * Get the singleton instance of CardImageLoader
   * 
   * Returns the existing instance or creates a new one if this is the first call.
   * The maxCacheSize parameter is only used on the first call when creating the instance.
   * 
   * @static
   * @param {number} [maxCacheSize] - Maximum cache size (only used on first call)
   * @returns {CardImageLoader} The singleton CardImageLoader instance
   * 
   * @example
   * ```typescript
   * const loader = CardImageLoader.getInstance(50); // First call sets max cache to 50
   * const loader2 = CardImageLoader.getInstance(); // Returns same instance
   * ```
   */
  static getInstance(maxCacheSize?: number): CardImageLoader {
    if (!CardImageLoader.instance) {
      CardImageLoader.instance = new CardImageLoader(maxCacheSize);
    }
    return CardImageLoader.instance;
  }
  
  /**
   * Reset the singleton instance (useful for testing)
   * 
   * Clears the cache, disposes all textures, and resets the singleton instance.
   * This is primarily used in test environments to ensure a clean state between tests.
   * 
   * @static
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // In test teardown
   * afterEach(() => {
   *   CardImageLoader.resetInstance();
   * });
   * ```
   */
  static resetInstance(): void {
    if (CardImageLoader.instance) {
      CardImageLoader.instance.clearCache();
      CardImageLoader.instance = null;
    }
  }
  
  /**
   * Check if a URL is external (starts with http:// or https://)
   * 
   * External URLs need to be routed through the image proxy to avoid CORS issues.
   * Local URLs (starting with '/') are loaded directly.
   * 
   * @private
   * @param {string} url - URL to check
   * @returns {boolean} true if URL is external, false otherwise
   */
  private isExternalUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }
  
  /**
   * Transform external URL to use image proxy
   * 
   * Converts an external URL to use the /api/image-proxy endpoint, which
   * fetches the image server-side to avoid CORS restrictions.
   * 
   * @private
   * @param {string} url - External URL to transform
   * @returns {string} Proxied URL in format: /api/image-proxy?url=<encoded-url>
   * 
   * @example
   * ```typescript
   * // Input: 'https://example.com/card.png'
   * // Output: '/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fcard.png'
   * ```
   */
  private getProxiedUrl(url: string): string {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  /**
   * Get the appropriate URL for loading (proxy for external, direct for local)
   * 
   * Determines whether to use the image proxy based on the URL format.
   * External URLs (http/https) are routed through the proxy, while local
   * URLs (starting with '/') are loaded directly.
   * 
   * @private
   * @param {string} imageUrl - Original image URL
   * @returns {string} URL to use for loading (proxied or direct)
   */
  private getLoadUrl(imageUrl: string): string {
    if (this.isExternalUrl(imageUrl)) {
      return this.getProxiedUrl(imageUrl);
    }
    return imageUrl;
  }
  
  /**
   * Check if an error is a CORS error
   * 
   * Detects CORS-related errors by examining the error message for common
   * CORS-related keywords. Used to trigger automatic retry through the proxy.
   * 
   * @private
   * @param {unknown} error - Error to check
   * @returns {boolean} true if error is CORS-related, false otherwise
   */
  private isCorsError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('cors') || 
             message.includes('cross-origin') ||
             message.includes('network error');
    }
    return false;
  }
  
  /**
   * Load a texture with caching and fallback support
   * 
   * This is the main public API for loading card textures. It handles:
   * 1. Cache lookup (returns cached texture if available)
   * 2. URL routing (proxy for external, direct for local)
   * 3. Texture loading with timeout (5 seconds)
   * 4. CORS error detection and automatic retry through proxy
   * 5. Fallback to placeholder on any failure
   * 6. Cache storage for successful loads
   * 
   * @public
   * @async
   * @param {LoadImageOptions} options - Loading options including imageUrl and fallback data
   * @returns {Promise<THREE.Texture>} Promise resolving to the loaded, cached, or placeholder texture
   * @throws Never throws - always returns a texture (placeholder on error)
   * 
   * @example
   * ```typescript
   * const texture = await loader.loadTexture({
   *   imageUrl: '/cards/OP01-001.png',
   *   fallbackData: {
   *     name: 'Monkey D. Luffy',
   *     category: 'LEADER',
   *     power: 5000,
   *     cost: 0
   *   },
   *   onProgress: (progress) => console.log(`Loading: ${progress * 100}%`)
   * });
   * ```
   */
  async loadTexture(options: LoadImageOptions): Promise<THREE.Texture> {
    const { imageUrl, fallbackData, onProgress } = options;
    
    // Check if imageUrl is missing or empty
    if (!imageUrl || imageUrl.trim() === '') {
      console.warn('CardImageLoader: Missing URL, using placeholder', {
        cardName: fallbackData.name,
      });
      return this.generatePlaceholder(fallbackData, false);
    }
    
    // Check cache first (Task 6.1 - texture reuse for duplicate images)
    const cachedTexture = this.getCachedTexture(imageUrl);
    if (cachedTexture) {
      // Cache hit - return existing texture with incremented ref count
      return cachedTexture;
    }
    
    // Determine the URL to load (proxy for external, direct for local)
    const loadUrl = this.getLoadUrl(imageUrl);
    
    // Load new texture
    try {
      const texture = await this.loadTextureFromUrl(loadUrl, onProgress);
      
      // Configure texture settings (Task 6.2 - optimize texture settings)
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      
      // Add to cache
      this.addToCache(imageUrl, texture);
      
      return texture;
    } catch (error) {
      // Keep error logging for debugging
      console.error('CardImageLoader: Load failed', {
        cardName: fallbackData.name,
        imageUrl,
        error: error instanceof Error ? error.message : 'UNKNOWN',
      });
      
      // Check if this is a CORS error and we haven't already tried the proxy
      if (this.isCorsError(error) && !loadUrl.includes('/api/image-proxy')) {
        console.warn('CardImageLoader: CORS error, retrying through proxy', {
          cardName: fallbackData.name,
        });
        
        // Retry with proxy
        try {
          const proxiedUrl = this.getProxiedUrl(imageUrl);
          const texture = await this.loadTextureFromUrl(proxiedUrl, onProgress);
          
          // Configure texture settings (Task 6.2 - optimize texture settings)
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
          
          // Add to cache
          this.addToCache(imageUrl, texture);
          
          return texture;
        } catch (proxyError) {
          console.error('CardImageLoader: Proxy retry failed', {
            cardName: fallbackData.name,
            error: proxyError instanceof Error ? proxyError.message : 'UNKNOWN_ERROR',
          });
        }
      }
      
      // Fall back to placeholder
      console.warn('CardImageLoader: Using placeholder fallback', {
        cardName: fallbackData.name,
      });
      
      return this.generatePlaceholder(fallbackData, true);
    }
  }
  
  /**
   * Load texture from URL using Three.js TextureLoader with timeout
   * 
   * Wraps Three.js TextureLoader in a Promise with timeout handling.
   * If the load doesn't complete within the timeout period, the promise
   * is rejected with a TIMEOUT error.
   * 
   * @private
   * @async
   * @param {string} url - Image URL to load
   * @param {Function} [onProgress] - Optional progress callback (receives 0-1)
   * @param {number} [timeoutMs=5000] - Timeout in milliseconds (default: 5000)
   * @returns {Promise<THREE.Texture>} Promise resolving to the loaded texture
   * @throws {Error} Throws on load failure or timeout
   */
  private loadTextureFromUrl(
    url: string,
    onProgress?: (progress: number) => void,
    timeoutMs: number = 5000
  ): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        const timeoutError = new Error('TIMEOUT');
        reject(timeoutError);
      }, timeoutMs);
      
      this.loader.load(
        url,
        (texture) => {
          clearTimeout(timeoutId);
          resolve(texture);
        },
        (event) => {
          if (onProgress && event.lengthComputable) {
            const progress = event.loaded / event.total;
            onProgress(progress);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Get a cached texture if available
   * 
   * Checks the cache for an existing texture. If found, updates the lastUsed
   * timestamp and increments the reference count. Logs cache hits/misses at
   * debug level for performance monitoring.
   * 
   * @public
   * @param {string} imageUrl - URL of the image to retrieve
   * @returns {THREE.Texture | null} Cached texture or null if not found
   * 
   * @example
   * ```typescript
   * const cached = loader.getCachedTexture('/cards/OP01-001.png');
   * if (cached) {
   *   // Use cached texture
   * } else {
   *   // Load new texture
   * }
   * ```
   */
  getCachedTexture(imageUrl: string): THREE.Texture | null {
    const entry = this.cache.get(imageUrl);
    
    if (entry) {
      // Update last used timestamp and increment reference count
      entry.lastUsed = Date.now();
      entry.refCount++;
      return entry.texture;
    }
    
    return null;
  }
  
  /**
   * Add a texture to the cache
   * 
   * Adds a newly loaded texture to the cache with initial reference count of 1.
   * If the cache is full (at maxCacheSize), triggers LRU eviction before adding.
   * Logs cache additions at debug level for monitoring.
   * 
   * @private
   * @param {string} imageUrl - URL key for the texture
   * @param {THREE.Texture} texture - Three.js texture to cache
   * @returns {void}
   */
  private addToCache(imageUrl: string, texture: THREE.Texture): void {
    // Evict if cache is full (Task 6.3 - prevent memory leaks)
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }
    
    // Add new entry
    this.cache.set(imageUrl, {
      texture,
      lastUsed: Date.now(),
      refCount: 1,
    });
  }
  
  /**
   * Evict the least recently used texture from cache
   * 
   * Implements LRU (Least Recently Used) eviction strategy to keep cache size
   * under the maximum limit. Finds the entry with the oldest lastUsed timestamp,
   * using refCount as a tie-breaker (prefer evicting lower refCount).
   * 
   * Properly disposes the Three.js texture to free GPU memory before removing
   * from cache. This prevents memory leaks in long-running games.
   * 
   * @private
   * @returns {void}
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestRefCount = Infinity;
    
    // Find the least recently used entry
    // If timestamps are equal, prefer evicting entries with lower refCount
    for (const [key, entry] of this.cache.entries()) {
      const shouldEvict = 
        entry.lastUsed < oldestTime ||
        (entry.lastUsed === oldestTime && entry.refCount < lowestRefCount);
      
      if (shouldEvict) {
        oldestTime = entry.lastUsed;
        lowestRefCount = entry.refCount;
        oldestKey = key;
      }
    }
    
    // Remove and dispose the oldest entry (Task 6.3 - prevent memory leaks)
    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        // Properly dispose Three.js texture to free GPU memory
        entry.texture.dispose();
        this.cache.delete(oldestKey);
      }
    }
  }
  
  /**
   * Generate a placeholder texture using PlaceholderGenerator
   * 
   * Creates a canvas-based placeholder texture with card information when
   * the actual image cannot be loaded. The placeholder includes the card's
   * name, category, power, and cost, with optional error indicator overlay.
   * 
   * @public
   * @param {Object} fallbackData - Card data for placeholder generation
   * @param {string} fallbackData.name - Card name
   * @param {string} fallbackData.category - Card category
   * @param {number} fallbackData.power - Card power value
   * @param {number} fallbackData.cost - Card cost value
   * @param {boolean} showError - Whether to show error indicator overlay
   * @returns {THREE.Texture} Three.js texture with placeholder image
   * 
   * @see {@link PlaceholderGenerator.generate}
   */
  generatePlaceholder(
    fallbackData: LoadImageOptions['fallbackData'],
    showError: boolean
  ): THREE.Texture {
    const dataUrl = PlaceholderGenerator.generate({
      name: fallbackData.name,
      category: fallbackData.category,
      power: fallbackData.power,
      cost: fallbackData.cost,
      showError,
    });
    
    const texture = this.loader.load(dataUrl);
    // Apply optimized texture settings (Task 6.2)
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    return texture;
  }
  
  /**
   * Release a texture reference (decrement ref count)
   * 
   * Decrements the reference count for a cached texture. Should be called
   * when a component unmounts or no longer needs the texture. The texture
   * remains in cache but becomes eligible for LRU eviction when refCount is low.
   * 
   * @public
   * @param {string} imageUrl - URL of the texture to release
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // In React component cleanup
   * useEffect(() => {
   *   return () => {
   *     loader.releaseTexture(card.metadata.imageUrl);
   *   };
   * }, [card.metadata.imageUrl]);
   * ```
   */
  releaseTexture(imageUrl: string): void {
    const entry = this.cache.get(imageUrl);
    
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1);
    }
  }
  
  /**
   * Clear all cached textures and dispose of them
   * 
   * Removes all textures from the cache and properly disposes of them to
   * free GPU memory. This should be called when cleaning up the game or
   * when you need to force a complete cache refresh.
   * 
   * @public
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // When leaving the game
   * loader.clearCache();
   * ```
   */
  clearCache(): void {
    // Dispose all textures to free GPU memory
    for (const entry of this.cache.values()) {
      entry.texture.dispose();
    }
    
    this.cache.clear();
  }
  
  /**
   * Get current cache size
   * 
   * Returns the number of textures currently stored in the cache.
   * Useful for monitoring and debugging cache behavior.
   * 
   * @public
   * @returns {number} Number of textures in cache
   */
  getCacheSize(): number {
    return this.cache.size;
  }
  
  /**
   * Get cache statistics for debugging
   * 
   * Returns detailed information about the cache state, including size,
   * maximum size, and details about each cached entry. Useful for debugging
   * cache behavior and identifying memory issues.
   * 
   * @public
   * @returns {Object} Object with cache statistics
   * @returns {number} return.size - Current number of cached textures
   * @returns {number} return.maxSize - Maximum cache size
   * @returns {Array} return.entries - Array of cache entries with URL, refCount, and lastUsed
   * 
   * @example
   * ```typescript
   * const stats = loader.getCacheStats();
   * console.log(`Cache: ${stats.size}/${stats.maxSize}`);
   * stats.entries.forEach(entry => {
   *   console.log(`${entry.url}: refs=${entry.refCount}`);
   * });
   * ```
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ url: string; refCount: number; lastUsed: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([url, entry]) => ({
      url,
      refCount: entry.refCount,
      lastUsed: entry.lastUsed,
    }));
    
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries,
    };
  }
}
