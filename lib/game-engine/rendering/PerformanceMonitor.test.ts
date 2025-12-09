/**
 * Performance Monitor Tests
 * 
 * Tests for the performance monitoring and optimization system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor, PerformanceOptimizer, getPerformanceMonitor } from './PerformanceMonitor';
import * as THREE from 'three';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let currentTime: number;
  
  beforeEach(() => {
    // Set up time mock BEFORE creating monitor
    currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
    monitor = new PerformanceMonitor();
  });
  
  describe('Metrics Tracking', () => {
    it('should track FPS over time', () => {
      // Simulate 60 FPS (16.67ms per frame)
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        monitor.update();
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.fps).toBeGreaterThan(55);
      expect(metrics.fps).toBeLessThan(65);
    });
    
    it('should calculate frame time correctly', () => {
      // Simulate consistent 16.67ms frames
      for (let i = 0; i < 10; i++) {
        currentTime += 16.67;
        monitor.update();
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.frameTime).toBeCloseTo(16.67, 1);
    });
    
    it('should track renderer memory usage', () => {
      const mockRenderer = {
        info: {
          memory: {
            geometries: 10,
            textures: 5,
          },
          programs: [1, 2, 3],
          render: {
            calls: 100,
            triangles: 5000,
            points: 0,
            lines: 0,
          },
        },
      } as unknown as THREE.WebGLRenderer;
      
      monitor.setRenderer(mockRenderer);
      monitor.update();
      
      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage?.geometries).toBe(10);
      expect(metrics.memoryUsage?.textures).toBe(5);
      expect(metrics.memoryUsage?.programs).toBe(3);
      expect(metrics.renderCalls).toBe(100);
      expect(metrics.triangles).toBe(5000);
    });
  });
  
  describe('Performance Status', () => {
    it('should return "good" status for 60 FPS', () => {
      // Simulate 60 FPS
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        monitor.update();
      }
      
      expect(monitor.getStatus()).toBe('good');
    });
    
    it('should return "warning" status for 40 FPS', () => {
      // Simulate 40 FPS (25ms per frame) - between critical (30) and warning (45)
      for (let i = 0; i < 60; i++) {
        currentTime += 25;
        monitor.update();
      }
      
      expect(monitor.getStatus()).toBe('warning');
    });
    
    it('should return "critical" status for 25 FPS', () => {
      // Simulate 25 FPS (40ms per frame)
      for (let i = 0; i < 60; i++) {
        currentTime += 40;
        monitor.update();
      }
      
      expect(monitor.getStatus()).toBe('critical');
    });
  });
  
  describe('Warning Callbacks', () => {
    it('should trigger warning callback when FPS drops below threshold', () => {
      const warningCallback = vi.fn();
      monitor.onWarning(warningCallback);
      
      // Simulate poor performance (30 FPS) - below warning threshold of 45
      for (let i = 0; i < 60; i++) {
        currentTime += 33.33;
        monitor.update();
      }
      
      expect(warningCallback).toHaveBeenCalled();
    });
    
    it('should not trigger warning callback for good performance', () => {
      const warningCallback = vi.fn();
      monitor.onWarning(warningCallback);
      
      // Simulate good performance (60 FPS) - above warning threshold of 45
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        monitor.update();
      }
      
      expect(warningCallback).not.toHaveBeenCalled();
    });
  });
  
  describe('Reset', () => {
    it('should reset tracking data', () => {
      // Add some data
      for (let i = 0; i < 10; i++) {
        currentTime += 16.67;
        monitor.update();
      }
      
      monitor.reset();
      
      // After reset, metrics should be based on empty data
      const metrics = monitor.getMetrics();
      // With no frames, we get NaN (0/0)
      expect(isNaN(metrics.fps)).toBe(true);
    });
  });
  
  describe('Report Generation', () => {
    it('should generate a performance report', () => {
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        monitor.update();
      }
      
      const report = monitor.getReport();
      expect(report).toContain('Performance Status');
      expect(report).toContain('FPS');
      expect(report).toContain('Frame Time');
    });
  });
});

describe('PerformanceOptimizer', () => {
  describe('Shadow Map Optimization', () => {
    it('should reduce shadow map size when FPS is low', () => {
      const currentFPS = 30;
      const targetFPS = 60;
      const currentSize = 2048;
      
      const optimizedSize = PerformanceOptimizer.optimizeShadowMapSize(
        currentFPS,
        targetFPS,
        currentSize
      );
      
      expect(optimizedSize).toBeLessThan(currentSize);
      expect(optimizedSize).toBe(1024);
    });
    
    it('should increase shadow map size when FPS is high', () => {
      const currentFPS = 60;
      const targetFPS = 60;
      const currentSize = 1024;
      
      const optimizedSize = PerformanceOptimizer.optimizeShadowMapSize(
        currentFPS,
        targetFPS,
        currentSize
      );
      
      expect(optimizedSize).toBeGreaterThan(currentSize);
      expect(optimizedSize).toBe(2048);
    });
    
    it('should not exceed maximum shadow map size', () => {
      const currentFPS = 60;
      const targetFPS = 60;
      const currentSize = 4096;
      
      const optimizedSize = PerformanceOptimizer.optimizeShadowMapSize(
        currentFPS,
        targetFPS,
        currentSize
      );
      
      expect(optimizedSize).toBe(4096);
    });
    
    it('should not go below minimum shadow map size', () => {
      const currentFPS = 20;
      const targetFPS = 60;
      const currentSize = 1024;
      
      const optimizedSize = PerformanceOptimizer.optimizeShadowMapSize(
        currentFPS,
        targetFPS,
        currentSize
      );
      
      expect(optimizedSize).toBe(1024);
    });
  });
  
  describe('LOD Recommendations', () => {
    it('should recommend LOD when FPS is low', () => {
      const currentFPS = 40;
      const targetFPS = 60;
      
      const shouldEnableLOD = PerformanceOptimizer.shouldEnableLOD(
        currentFPS,
        targetFPS
      );
      
      expect(shouldEnableLOD).toBe(true);
    });
    
    it('should not recommend LOD when FPS is good', () => {
      const currentFPS = 60;
      const targetFPS = 60;
      
      const shouldEnableLOD = PerformanceOptimizer.shouldEnableLOD(
        currentFPS,
        targetFPS
      );
      
      expect(shouldEnableLOD).toBe(false);
    });
  });
  
  describe('Texture Quality Recommendations', () => {
    it('should recommend high quality for good FPS', () => {
      const quality = PerformanceOptimizer.getRecommendedTextureQuality(60, 60);
      expect(quality).toBe('high');
    });
    
    it('should recommend medium quality for moderate FPS', () => {
      const quality = PerformanceOptimizer.getRecommendedTextureQuality(45, 60);
      expect(quality).toBe('medium');
    });
    
    it('should recommend low quality for poor FPS', () => {
      const quality = PerformanceOptimizer.getRecommendedTextureQuality(30, 60);
      expect(quality).toBe('low');
    });
  });
  
  describe('Anisotropy Optimization', () => {
    it('should use max anisotropy for good FPS', () => {
      const anisotropy = PerformanceOptimizer.getOptimalAnisotropy(60, 60, 16);
      expect(anisotropy).toBe(16);
    });
    
    it('should reduce anisotropy for moderate FPS', () => {
      const anisotropy = PerformanceOptimizer.getOptimalAnisotropy(45, 60, 16);
      expect(anisotropy).toBe(4);
    });
    
    it('should use minimal anisotropy for poor FPS', () => {
      const anisotropy = PerformanceOptimizer.getOptimalAnisotropy(30, 60, 16);
      expect(anisotropy).toBe(1);
    });
  });
});

describe('Global Performance Monitor', () => {
  it('should return singleton instance', () => {
    const monitor1 = getPerformanceMonitor();
    const monitor2 = getPerformanceMonitor();
    
    expect(monitor1).toBe(monitor2);
  });
});
