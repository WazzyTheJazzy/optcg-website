/**
 * Performance Optimizer
 * 
 * Implements performance optimizations based on profiling results:
 * - Texture loading and caching optimization
 * - Shadow rendering optimization
 * - Memory management
 * - Adaptive quality settings
 */

import { TextureCache } from './TextureCache';

export interface OptimizationConfig {
  enableAdaptiveQuality: boolean;
  targetFPS: number;
  minFPS: number;
  shadowMapSizes: number[];
  textureResolutions: number[];
  maxCacheSize: number;
}

export interface QualitySettings {
  shadowMapSize: number;
  textureResolution: number;
  enableShadows: boolean;
  enableAntialiasing: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
}

const DEFAULT_CONFIG: OptimizationConfig = {
  enableAdaptiveQuality: true,
  targetFPS: 60,
  minFPS: 30,
  shadowMapSizes: [512, 1024, 2048, 4096],
  textureResolutions: [512, 1024, 2048],
  maxCacheSize: 100,
};

export class PerformanceOptimizer {
  private config: OptimizationConfig;
  private currentQuality: QualitySettings;
  private textureCache: TextureCache;
  private fpsHistory: number[] = [];
  private lastOptimizationTime: number = 0;
  private optimizationCooldown: number = 2000; // 2 seconds

  constructor(
    config: Partial<OptimizationConfig> = {},
    textureCache?: TextureCache
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.textureCache = textureCache || TextureCache.getInstance();
    
    // Start with high quality
    this.currentQuality = {
      shadowMapSize: 2048,
      textureResolution: 1024,
      enableShadows: true,
      enableAntialiasing: true,
      shadowQuality: 'high',
    };
  }

  /**
   * Get current quality settings
   */
  getQualitySettings(): QualitySettings {
    return { ...this.currentQuality };
  }

  /**
   * Update FPS and potentially adjust quality
   */
  updateFPS(fps: number): boolean {
    this.fpsHistory.push(fps);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    // Check if we should optimize
    const now = performance.now();
    if (now - this.lastOptimizationTime < this.optimizationCooldown) {
      return false;
    }

    if (!this.config.enableAdaptiveQuality) {
      return false;
    }

    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    
    // Adjust quality based on FPS
    let qualityChanged = false;

    if (avgFPS < this.config.minFPS) {
      // Critical performance - reduce quality aggressively
      qualityChanged = this.reduceQuality('aggressive');
    } else if (avgFPS < this.config.targetFPS * 0.8) {
      // Below target - reduce quality
      qualityChanged = this.reduceQuality('normal');
    } else if (avgFPS > this.config.targetFPS * 1.1 && avgFPS > 55) {
      // Above target with headroom - increase quality
      qualityChanged = this.increaseQuality();
    }

    if (qualityChanged) {
      this.lastOptimizationTime = now;
    }

    return qualityChanged;
  }

  /**
   * Reduce quality settings
   */
  private reduceQuality(mode: 'normal' | 'aggressive'): boolean {
    let changed = false;

    if (mode === 'aggressive') {
      // Disable shadows first
      if (this.currentQuality.enableShadows) {
        this.currentQuality.enableShadows = false;
        changed = true;
      }
      
      // Reduce texture resolution
      const currentTexIdx = this.config.textureResolutions.indexOf(this.currentQuality.textureResolution);
      if (currentTexIdx > 0) {
        this.currentQuality.textureResolution = this.config.textureResolutions[currentTexIdx - 1];
        changed = true;
      }

      // Disable antialiasing
      if (this.currentQuality.enableAntialiasing) {
        this.currentQuality.enableAntialiasing = false;
        changed = true;
      }
    } else {
      // Normal mode - reduce shadow quality first
      if (this.currentQuality.shadowQuality === 'high') {
        this.currentQuality.shadowQuality = 'medium';
        this.currentQuality.shadowMapSize = 1024;
        changed = true;
      } else if (this.currentQuality.shadowQuality === 'medium') {
        this.currentQuality.shadowQuality = 'low';
        this.currentQuality.shadowMapSize = 512;
        changed = true;
      } else if (this.currentQuality.enableShadows) {
        this.currentQuality.enableShadows = false;
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Increase quality settings
   */
  private increaseQuality(): boolean {
    let changed = false;

    // Enable shadows if disabled
    if (!this.currentQuality.enableShadows) {
      this.currentQuality.enableShadows = true;
      this.currentQuality.shadowQuality = 'low';
      this.currentQuality.shadowMapSize = 512;
      changed = true;
    }
    // Increase shadow quality
    else if (this.currentQuality.shadowQuality === 'low') {
      this.currentQuality.shadowQuality = 'medium';
      this.currentQuality.shadowMapSize = 1024;
      changed = true;
    } else if (this.currentQuality.shadowQuality === 'medium') {
      this.currentQuality.shadowQuality = 'high';
      this.currentQuality.shadowMapSize = 2048;
      changed = true;
    }
    // Enable antialiasing
    else if (!this.currentQuality.enableAntialiasing) {
      this.currentQuality.enableAntialiasing = true;
      changed = true;
    }
    // Increase texture resolution
    else {
      const currentTexIdx = this.config.textureResolutions.indexOf(this.currentQuality.textureResolution);
      if (currentTexIdx < this.config.textureResolutions.length - 1) {
        this.currentQuality.textureResolution = this.config.textureResolutions[currentTexIdx + 1];
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Optimize texture cache
   */
  optimizeTextureCache(): void {
    // Clear least recently used textures if cache is full
    const stats = this.textureCache.getStats();
    if (stats.size >= this.config.maxCacheSize * 0.9) {
      // Cache is 90% full, clear some entries
      const entriesToClear = Math.floor(this.config.maxCacheSize * 0.2);
      this.textureCache.clear(); // Simple approach - clear all
    }
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(avgFPS: number, memoryPercent: number): string[] {
    const recommendations: string[] = [];

    if (avgFPS < this.config.targetFPS * 0.5) {
      recommendations.push('Critical: FPS is very low. Consider disabling shadows and reducing texture quality.');
    } else if (avgFPS < this.config.targetFPS * 0.8) {
      recommendations.push('Warning: FPS is below target. Consider reducing shadow quality.');
    }

    if (memoryPercent > 85) {
      recommendations.push('Critical: Memory usage is very high. Clear texture cache and reduce quality.');
    } else if (memoryPercent > 70) {
      recommendations.push('Warning: Memory usage is high. Consider clearing texture cache.');
    }

    if (this.currentQuality.shadowMapSize > 2048) {
      recommendations.push('Info: Shadow map size is very high. Consider reducing to 2048 for better performance.');
    }

    if (this.currentQuality.textureResolution > 1024) {
      recommendations.push('Info: Texture resolution is high. Consider reducing to 1024 for better performance.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is good. No optimizations needed.');
    }

    return recommendations;
  }

  /**
   * Apply optimizations based on current performance
   */
  applyOptimizations(avgFPS: number, memoryPercent: number): {
    qualityChanged: boolean;
    cacheCleared: boolean;
    recommendations: string[];
  } {
    let qualityChanged = false;
    let cacheCleared = false;

    // Handle critical memory
    if (memoryPercent > 85) {
      this.optimizeTextureCache();
      cacheCleared = true;
      qualityChanged = this.reduceQuality('aggressive');
    }
    // Handle critical FPS
    else if (avgFPS < this.config.minFPS) {
      qualityChanged = this.reduceQuality('aggressive');
    }
    // Handle low FPS
    else if (avgFPS < this.config.targetFPS * 0.8) {
      qualityChanged = this.reduceQuality('normal');
    }
    // Handle high memory
    else if (memoryPercent > 70) {
      this.optimizeTextureCache();
      cacheCleared = true;
    }
    // Try to increase quality if performance is good
    else if (avgFPS > this.config.targetFPS * 1.1) {
      qualityChanged = this.increaseQuality();
    }

    const recommendations = this.getRecommendations(avgFPS, memoryPercent);

    return {
      qualityChanged,
      cacheCleared,
      recommendations,
    };
  }

  /**
   * Reset to default quality
   */
  resetQuality(): void {
    this.currentQuality = {
      shadowMapSize: 2048,
      textureResolution: 1024,
      enableShadows: true,
      enableAntialiasing: true,
      shadowQuality: 'high',
    };
    this.fpsHistory = [];
  }

  /**
   * Get texture cache
   */
  getTextureCache(): TextureCache {
    return this.textureCache;
  }
}
