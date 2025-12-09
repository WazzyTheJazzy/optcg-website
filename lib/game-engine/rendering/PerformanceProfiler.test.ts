import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceProfiler } from './PerformanceProfiler';

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  describe('Frame Recording', () => {
    it('should record frames and calculate FPS', () => {
      const startTime = 1000;
      let currentTime = startTime;
      
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
      
      profiler.start();
      
      // Simulate 60 FPS (16.67ms per frame)
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        profiler.recordFrame();
      }

      const metrics = profiler.getMetrics();
      expect(metrics.fps.average).toBeGreaterThan(50);
      expect(metrics.fps.average).toBeLessThan(70);
    });

    it('should track min and max FPS', () => {
      const startTime = 1000;
      let currentTime = startTime;
      
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
      
      profiler.start();
      
      // Simulate varying frame times
      const frameTimes = [16, 20, 10, 30, 15];
      frameTimes.forEach(frameTime => {
        currentTime += frameTime;
        profiler.recordFrame();
      });

      const metrics = profiler.getMetrics();
      expect(metrics.fps.min).toBeLessThan(metrics.fps.average);
      expect(metrics.fps.max).toBeGreaterThan(metrics.fps.average);
    });
  });

  describe('Texture Metrics', () => {
    it('should record texture load times', () => {
      profiler.start();
      profiler.recordTextureLoad('texture1', 50);
      profiler.recordTextureLoad('texture2', 100);

      const metrics = profiler.getMetrics();
      expect(metrics.textures.totalLoaded).toBe(2);
      expect(metrics.textures.loadTime.get('texture1')).toBe(50);
      expect(metrics.textures.loadTime.get('texture2')).toBe(100);
    });

    it('should track cache hits and misses', () => {
      profiler.start();
      profiler.recordCacheHit();
      profiler.recordCacheHit();
      profiler.recordCacheMiss();

      const metrics = profiler.getMetrics();
      expect(metrics.textures.cacheHits).toBe(2);
      expect(metrics.textures.cacheMisses).toBe(1);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should detect FPS bottleneck', () => {
      profiler = new PerformanceProfiler({ targetFPS: 60 });
      
      const startTime = 1000;
      let currentTime = startTime;
      
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
      
      profiler.start();
      
      // Simulate 25 FPS (40ms per frame) - below 50% of target
      for (let i = 0; i < 30; i++) {
        currentTime += 40;
        profiler.recordFrame();
      }

      const metrics = profiler.getMetrics();
      const fpsBottleneck = metrics.bottlenecks.find(b => b.type === 'fps');
      expect(fpsBottleneck).toBeDefined();
      expect(fpsBottleneck?.severity).toBe('critical');
    });

    it('should detect slow texture loading', () => {
      profiler = new PerformanceProfiler({ maxTextureLoadTime: 100 });
      profiler.start();
      profiler.recordTextureLoad('slow-texture', 250);

      const metrics = profiler.getMetrics();
      const textureBottleneck = metrics.bottlenecks.find(b => b.type === 'texture');
      expect(textureBottleneck).toBeDefined();
    });

    it('should detect low cache hit rate', () => {
      profiler.start();
      profiler.recordCacheHit();
      profiler.recordCacheMiss();
      profiler.recordCacheMiss();
      profiler.recordCacheMiss();

      const metrics = profiler.getMetrics();
      const cacheBottleneck = metrics.bottlenecks.find(
        b => b.type === 'texture' && b.description.includes('cache hit rate')
      );
      expect(cacheBottleneck).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', () => {
      profiler.start();
      profiler.recordFrame();
      profiler.recordTextureLoad('texture1', 50);
      profiler.recordCacheHit();

      const report = profiler.generateReport();
      expect(report).toContain('Performance Profile Report');
      expect(report).toContain('Frame Rate');
      expect(report).toContain('Memory Usage');
      expect(report).toContain('Texture Performance');
    });

    it('should include bottlenecks in report', () => {
      profiler = new PerformanceProfiler({ targetFPS: 60 });
      profiler.start();
      
      // Simulate poor performance
      for (let i = 0; i < 20; i++) {
        vi.spyOn(performance, 'now').mockReturnValue(i * 50);
        profiler.recordFrame();
      }

      const report = profiler.generateReport();
      expect(report).toContain('Performance Bottlenecks');
    });
  });

  describe('Optimization Recommendations', () => {
    it('should provide recommendations for bottlenecks', () => {
      profiler = new PerformanceProfiler({ targetFPS: 60 });
      
      const startTime = 1000;
      let currentTime = startTime;
      
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
      
      profiler.start();
      
      // Simulate poor FPS (25 FPS)
      for (let i = 0; i < 30; i++) {
        currentTime += 40;
        profiler.recordFrame();
      }

      const recommendations = profiler.getOptimizationRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => 
        r.toLowerCase().includes('shadow') || 
        r.toLowerCase().includes('texture') || 
        r.toLowerCase().includes('quality')
      )).toBe(true);
    });

    it('should indicate good performance when no issues', () => {
      profiler = new PerformanceProfiler({ targetFPS: 60 });
      
      const startTime = 1000;
      let currentTime = startTime;
      
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
      
      profiler.start();
      
      // Simulate good FPS (60 FPS)
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        profiler.recordFrame();
      }

      const recommendations = profiler.getOptimizationRecommendations();
      expect(recommendations.some(r => r.toLowerCase().includes('good') || r.toLowerCase().includes('no'))).toBe(true);
    });
  });
});
