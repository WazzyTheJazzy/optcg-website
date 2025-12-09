/**
 * Performance Integration Tests
 * 
 * Tests the complete performance profiling and optimization system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceProfiler } from './PerformanceProfiler';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { TextureCache } from './TextureCache';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('Performance Integration', () => {
  describe('Profiler + Optimizer Integration', () => {
    it('should profile and optimize based on low FPS', () => {
      const profiler = new PerformanceProfiler({ targetFPS: 60 });
      const optimizer = new PerformanceOptimizer({ targetFPS: 60, minFPS: 30 });

      profiler.start();

      // Simulate low FPS (30 FPS)
      for (let i = 0; i < 60; i++) {
        profiler.recordFrame();
        optimizer.updateFPS(30);
      }

      const metrics = profiler.getMetrics();
      const quality = optimizer.getQualitySettings();

      // Should detect FPS bottleneck
      expect(metrics.bottlenecks.some(b => b.type === 'fps')).toBe(true);

      // Should have reduced quality
      expect(quality.shadowMapSize).toBeLessThan(2048);
    });

    it('should handle texture loading performance', () => {
      const profiler = new PerformanceProfiler({ maxTextureLoadTime: 100 });
      const cache = TextureCache.getInstance();

      profiler.start();

      // Simulate slow texture loads
      profiler.recordTextureLoad('texture1', 150);
      profiler.recordTextureLoad('texture2', 200);
      profiler.recordTextureLoad('texture3', 80);

      const metrics = profiler.getMetrics();

      // Should detect slow texture loading
      const textureBottleneck = metrics.bottlenecks.find(b => b.type === 'texture');
      expect(textureBottleneck).toBeDefined();

      // Cache should help with subsequent loads
      profiler.recordCacheHit();
      profiler.recordCacheHit();
      profiler.recordCacheMiss();

      const updatedMetrics = profiler.getMetrics();
      expect(updatedMetrics.textures.cacheHits).toBe(2);
    });

    it('should optimize memory usage when high', () => {
      const optimizer = new PerformanceOptimizer({ maxCacheSize: 10 });
      const cache = TextureCache.getInstance();

      // Fill cache
      for (let i = 0; i < 15; i++) {
        cache.set(`texture${i}`, { id: `texture${i}` } as any);
      }

      // Optimize should clear cache when near limit
      optimizer.optimizeTextureCache();

      const stats = cache.getStats();
      expect(stats.size).toBeLessThan(15);
    });
  });

  describe('Complete Performance Workflow', () => {
    it('should profile, detect issues, and apply optimizations', () => {
      const profiler = new PerformanceProfiler({
        targetFPS: 60,
        memoryWarningThreshold: 70,
        maxTextureLoadTime: 100,
      });

      const optimizer = new PerformanceOptimizer({
        targetFPS: 60,
        minFPS: 30,
        enableAdaptiveQuality: true,
      });

      // Start profiling
      profiler.start();

      // Simulate game running with performance issues
      for (let i = 0; i < 120; i++) {
        // Simulate 45 FPS (below target but not critical)
        profiler.recordFrame();
        optimizer.updateFPS(45);
      }

      // Add some texture loads
      profiler.recordTextureLoad('card1', 50);
      profiler.recordTextureLoad('card2', 120); // Slow
      profiler.recordTextureLoad('don', 80);

      // Get metrics and recommendations
      const metrics = profiler.getMetrics();
      const report = profiler.generateReport();
      const recommendations = profiler.getOptimizationRecommendations();

      // Verify profiling detected issues
      expect(metrics.bottlenecks.length).toBeGreaterThan(0);
      expect(report).toContain('Performance Bottlenecks');
      expect(recommendations.length).toBeGreaterThan(0);

      // Verify optimizer adjusted quality
      const quality = optimizer.getQualitySettings();
      expect(quality.shadowMapSize).toBeLessThanOrEqual(2048);
    });

    it('should maintain good performance when no issues', () => {
      const profiler = new PerformanceProfiler({ targetFPS: 60 });
      const optimizer = new PerformanceOptimizer({ targetFPS: 60 });

      profiler.start();

      // Simulate good performance (60 FPS)
      for (let i = 0; i < 120; i++) {
        profiler.recordFrame();
        optimizer.updateFPS(60);
      }

      const metrics = profiler.getMetrics();
      const quality = optimizer.getQualitySettings();

      // Should have no critical bottlenecks
      const criticalBottlenecks = metrics.bottlenecks.filter(
        b => b.severity === 'critical'
      );
      expect(criticalBottlenecks.length).toBe(0);

      // Should maintain high quality
      expect(quality.enableShadows).toBe(true);
      expect(quality.shadowMapSize).toBeGreaterThanOrEqual(1024);
    });
  });

  describe('Performance Monitor Integration', () => {
    it('should work with PerformanceMonitor', () => {
      const monitor = new PerformanceMonitor();
      const profiler = new PerformanceProfiler();

      profiler.start();

      // Simulate some frames
      for (let i = 0; i < 60; i++) {
        monitor.update();
        profiler.recordFrame();
      }

      const monitorMetrics = monitor.getMetrics();
      const profilerMetrics = profiler.getMetrics();

      // Both should track similar FPS
      expect(Math.abs(monitorMetrics.fps - profilerMetrics.fps.average)).toBeLessThan(10);
    });
  });

  describe('Adaptive Quality System', () => {
    it('should reduce quality when FPS drops', () => {
      const optimizer = new PerformanceOptimizer({
        targetFPS: 60,
        minFPS: 30,
        enableAdaptiveQuality: true,
      });

      const initialQuality = optimizer.getQualitySettings();

      // Simulate FPS drop
      for (let i = 0; i < 60; i++) {
        optimizer.updateFPS(25); // Below minimum
      }

      // Wait for cooldown
      setTimeout(() => {
        const newQuality = optimizer.getQualitySettings();
        expect(newQuality.shadowMapSize).toBeLessThanOrEqual(initialQuality.shadowMapSize);
      }, 2100);
    });

    it('should increase quality when FPS is good', () => {
      const optimizer = new PerformanceOptimizer({
        targetFPS: 60,
        enableAdaptiveQuality: true,
      });

      // Start with reduced quality
      for (let i = 0; i < 60; i++) {
        optimizer.updateFPS(25);
      }

      const lowQuality = optimizer.getQualitySettings();

      // Simulate good FPS
      setTimeout(() => {
        for (let i = 0; i < 60; i++) {
          optimizer.updateFPS(70);
        }

        const improvedQuality = optimizer.getQualitySettings();
        expect(improvedQuality.shadowMapSize).toBeGreaterThanOrEqual(lowQuality.shadowMapSize);
      }, 2100);
    });
  });

  describe('Memory Optimization', () => {
    it('should clear cache when memory is high', () => {
      const optimizer = new PerformanceOptimizer({ maxCacheSize: 20 });
      const cache = TextureCache.getInstance();

      // Fill cache to 90%
      for (let i = 0; i < 18; i++) {
        cache.set(`texture${i}`, { id: `texture${i}` } as any);
      }

      const beforeSize = cache.getStats().size;

      // Trigger optimization
      optimizer.optimizeTextureCache();

      const afterSize = cache.getStats().size;
      expect(afterSize).toBeLessThan(beforeSize);
    });

    it('should apply aggressive optimizations for critical memory', () => {
      const optimizer = new PerformanceOptimizer();

      const result = optimizer.applyOptimizations(60, 90); // 90% memory usage

      expect(result.cacheCleared).toBe(true);
      expect(result.qualityChanged).toBe(true);
      expect(result.recommendations.some(r => r.includes('Critical'))).toBe(true);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate comprehensive performance report', () => {
      const profiler = new PerformanceProfiler();
      profiler.start();

      // Simulate various scenarios
      for (let i = 0; i < 60; i++) {
        profiler.recordFrame();
      }
      profiler.recordTextureLoad('texture1', 50);
      profiler.recordTextureLoad('texture2', 150);
      profiler.recordCacheHit();
      profiler.recordCacheMiss();
      profiler.recordShadowRenderTime(8);

      const report = profiler.generateReport();

      // Verify report contains all sections
      expect(report).toContain('Frame Rate');
      expect(report).toContain('Memory Usage');
      expect(report).toContain('Rendering');
      expect(report).toContain('Texture Performance');
      expect(report).toContain('Shadow Rendering');
    });

    it('should provide actionable recommendations', () => {
      const profiler = new PerformanceProfiler({ targetFPS: 60 });
      profiler.start();

      // Simulate poor performance
      for (let i = 0; i < 60; i++) {
        profiler.recordFrame();
      }
      profiler.recordTextureLoad('slow', 300);

      const recommendations = profiler.getOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => 
        r.includes('shadow') || r.includes('texture') || r.includes('quality')
      )).toBe(true);
    });
  });
});
