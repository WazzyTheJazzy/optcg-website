/**
 * Performance Monitor
 * 
 * Utility for monitoring and tracking rendering performance metrics.
 * Tracks FPS, frame times, memory usage, and provides performance warnings.
 */

import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // in milliseconds
  memoryUsage?: {
    geometries: number;
    textures: number;
    programs: number;
  };
  renderCalls: number;
  triangles: number;
  points: number;
  lines: number;
}

export interface PerformanceThresholds {
  targetFPS: number;
  warningFPS: number;
  criticalFPS: number;
  maxFrameTime: number; // in milliseconds
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  targetFPS: 60,
  warningFPS: 45,
  criticalFPS: 30,
  maxFrameTime: 16.67, // ~60 FPS
};

/**
 * Performance Monitor class
 * Tracks rendering performance and provides metrics
 */
export class PerformanceMonitor {
  private frames: number[] = [];
  private maxSamples = 60; // Track last 60 frames
  private lastTime = performance.now();
  private thresholds: PerformanceThresholds;
  private renderer: THREE.WebGLRenderer | null = null;
  
  // Performance warnings
  private warningCallbacks: Array<(metrics: PerformanceMetrics) => void> = [];
  
  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }
  
  /**
   * Set the renderer for memory tracking
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }
  
  /**
   * Update performance metrics (call once per frame)
   */
  update(): void {
    const now = performance.now();
    const frameTime = now - this.lastTime;
    this.lastTime = now;
    
    // Store frame time
    this.frames.push(frameTime);
    
    // Keep only last N samples
    if (this.frames.length > this.maxSamples) {
      this.frames.shift();
    }
    
    // Check for performance issues
    const metrics = this.getMetrics();
    if (metrics.fps < this.thresholds.warningFPS) {
      this.triggerWarnings(metrics);
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Calculate average FPS from frame times
    const avgFrameTime = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    const fps = 1000 / avgFrameTime;
    
    // Get renderer info if available
    let memoryUsage: PerformanceMetrics['memoryUsage'];
    let renderCalls = 0;
    let triangles = 0;
    let points = 0;
    let lines = 0;
    
    if (this.renderer) {
      const info = this.renderer.info;
      memoryUsage = {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length || 0,
      };
      renderCalls = info.render.calls;
      triangles = info.render.triangles;
      points = info.render.points;
      lines = info.render.lines;
    }
    
    return {
      fps: Math.round(fps),
      frameTime: avgFrameTime,
      memoryUsage,
      renderCalls,
      triangles,
      points,
      lines,
    };
  }
  
  /**
   * Get performance status
   */
  getStatus(): 'good' | 'warning' | 'critical' {
    const metrics = this.getMetrics();
    
    if (metrics.fps >= this.thresholds.warningFPS) {
      return 'good';
    } else if (metrics.fps >= this.thresholds.criticalFPS) {
      return 'warning';
    } else {
      return 'critical';
    }
  }
  
  /**
   * Register a callback for performance warnings
   */
  onWarning(callback: (metrics: PerformanceMetrics) => void): void {
    this.warningCallbacks.push(callback);
  }
  
  /**
   * Trigger warning callbacks
   */
  private triggerWarnings(metrics: PerformanceMetrics): void {
    this.warningCallbacks.forEach(callback => callback(metrics));
  }
  
  /**
   * Reset performance tracking
   */
  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
  
  /**
   * Get performance report as string
   */
  getReport(): string {
    const metrics = this.getMetrics();
    const status = this.getStatus();
    
    let report = `Performance Status: ${status.toUpperCase()}\n`;
    report += `FPS: ${metrics.fps} (target: ${this.thresholds.targetFPS})\n`;
    report += `Frame Time: ${metrics.frameTime.toFixed(2)}ms\n`;
    report += `Render Calls: ${metrics.renderCalls}\n`;
    report += `Triangles: ${metrics.triangles}\n`;
    
    if (metrics.memoryUsage) {
      report += `\nMemory Usage:\n`;
      report += `  Geometries: ${metrics.memoryUsage.geometries}\n`;
      report += `  Textures: ${metrics.memoryUsage.textures}\n`;
      report += `  Programs: ${metrics.memoryUsage.programs}\n`;
    }
    
    return report;
  }
  
  /**
   * Log performance metrics to console
   */
  logMetrics(): void {
    console.log(this.getReport());
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create the global performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  /**
   * Optimize shadow map size based on performance
   */
  static optimizeShadowMapSize(
    currentFPS: number,
    targetFPS: number,
    currentSize: number
  ): number {
    if (currentFPS < targetFPS * 0.75) {
      // Performance is poor, reduce shadow map size
      return Math.max(1024, currentSize / 2);
    } else if (currentFPS > targetFPS * 0.95 && currentSize < 4096) {
      // Performance is good, can increase quality
      return Math.min(4096, currentSize * 2);
    }
    return currentSize;
  }
  
  /**
   * Determine if LOD should be enabled based on performance
   */
  static shouldEnableLOD(currentFPS: number, targetFPS: number): boolean {
    return currentFPS < targetFPS * 0.8;
  }
  
  /**
   * Get recommended texture quality based on performance
   */
  static getRecommendedTextureQuality(
    currentFPS: number,
    targetFPS: number
  ): 'high' | 'medium' | 'low' {
    if (currentFPS >= targetFPS * 0.9) {
      return 'high';
    } else if (currentFPS >= targetFPS * 0.7) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * Calculate optimal anisotropy level
   */
  static getOptimalAnisotropy(
    currentFPS: number,
    targetFPS: number,
    maxAnisotropy: number
  ): number {
    if (currentFPS >= targetFPS * 0.9) {
      return maxAnisotropy;
    } else if (currentFPS >= targetFPS * 0.7) {
      return Math.min(4, maxAnisotropy);
    } else {
      return 1;
    }
  }
}
