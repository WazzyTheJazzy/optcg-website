/**
 * Performance Profiler for Game Engine
 * 
 * Provides comprehensive performance profiling capabilities including:
 * - Frame rate monitoring
 * - Memory usage tracking
 * - Texture loading performance
 * - Shadow rendering performance
 * - Bottleneck identification
 */

export interface PerformanceMetrics {
  fps: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    percentUsed: number;
  };
  rendering: {
    drawCalls: number;
    triangles: number;
    textures: number;
    programs: number;
  };
  textures: {
    loadTime: Map<string, number>;
    cacheHits: number;
    cacheMisses: number;
    totalLoaded: number;
  };
  shadows: {
    enabled: boolean;
    mapSize: number;
    renderTime: number;
  };
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  type: 'fps' | 'memory' | 'texture' | 'shadow' | 'drawcalls';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  metric: number;
  threshold: number;
}

export interface ProfilerConfig {
  targetFPS: number;
  memoryWarningThreshold: number; // percentage
  memoryCriticalThreshold: number; // percentage
  maxDrawCalls: number;
  maxTextureLoadTime: number; // ms
  enableDetailedProfiling: boolean;
}

const DEFAULT_CONFIG: ProfilerConfig = {
  targetFPS: 60,
  memoryWarningThreshold: 70,
  memoryCriticalThreshold: 85,
  maxDrawCalls: 1000,
  maxTextureLoadTime: 100,
  enableDetailedProfiling: true,
};

export class PerformanceProfiler {
  private config: ProfilerConfig;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameTimes: number[] = [];
  private textureLoadTimes: Map<string, number> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private shadowRenderTime: number = 0;
  private isRunning: boolean = false;
  private startTime: number = 0;

  constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start profiling session
   */
  start(): void {
    this.isRunning = true;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
    this.textureLoadTimes.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.shadowRenderTime = 0;
    this.lastFrameTime = performance.now();
  }

  /**
   * Stop profiling session
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Record a frame render
   */
  recordFrame(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.frameTimes.push(frameTime);
    this.frameCount++;
    this.lastFrameTime = now;

    // Keep only last 120 frames (2 seconds at 60fps)
    if (this.frameTimes.length > 120) {
      this.frameTimes.shift();
    }
  }

  /**
   * Record texture load time
   */
  recordTextureLoad(textureId: string, loadTime: number): void {
    if (!this.isRunning) return;
    this.textureLoadTimes.set(textureId, loadTime);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    if (!this.isRunning) return;
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    if (!this.isRunning) return;
    this.cacheMisses++;
  }

  /**
   * Record shadow render time
   */
  recordShadowRenderTime(time: number): void {
    if (!this.isRunning) return;
    this.shadowRenderTime = time;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(renderer?: any): PerformanceMetrics {
    const fps = this.calculateFPS();
    const memory = this.getMemoryUsage();
    const rendering = this.getRenderingInfo(renderer);
    const textures = this.getTextureMetrics();
    const shadows = this.getShadowMetrics();
    const bottlenecks = this.identifyBottlenecks(fps, memory, textures, shadows, rendering);

    return {
      fps,
      memory,
      rendering,
      textures,
      shadows,
      bottlenecks,
    };
  }

  /**
   * Calculate FPS metrics
   */
  private calculateFPS(): PerformanceMetrics['fps'] {
    if (this.frameTimes.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    const currentFrameTime = this.frameTimes[this.frameTimes.length - 1];
    const currentFPS = 1000 / currentFrameTime;

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const averageFPS = 1000 / avgFrameTime;

    const minFrameTime = Math.min(...this.frameTimes);
    const maxFPS = 1000 / minFrameTime;

    const maxFrameTime = Math.max(...this.frameTimes);
    const minFPS = 1000 / maxFrameTime;

    return {
      current: Math.round(currentFPS),
      average: Math.round(averageFPS),
      min: Math.round(minFPS),
      max: Math.round(maxFPS),
    };
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): PerformanceMetrics['memory'] {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        percentUsed: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }

    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      percentUsed: 0,
    };
  }

  /**
   * Get rendering info from Three.js renderer
   */
  private getRenderingInfo(renderer?: any): PerformanceMetrics['rendering'] {
    if (!renderer || !renderer.info) {
      return {
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        programs: 0,
      };
    }

    const info = renderer.info;
    return {
      drawCalls: info.render?.calls || 0,
      triangles: info.render?.triangles || 0,
      textures: info.memory?.textures || 0,
      programs: info.programs?.length || 0,
    };
  }

  /**
   * Get texture metrics
   */
  private getTextureMetrics(): PerformanceMetrics['textures'] {
    return {
      loadTime: new Map(this.textureLoadTimes),
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      totalLoaded: this.textureLoadTimes.size,
    };
  }

  /**
   * Get shadow metrics
   */
  private getShadowMetrics(): PerformanceMetrics['shadows'] {
    return {
      enabled: this.shadowRenderTime > 0,
      mapSize: 2048, // Default from implementation
      renderTime: this.shadowRenderTime,
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    fps: PerformanceMetrics['fps'],
    memory: PerformanceMetrics['memory'],
    textures: PerformanceMetrics['textures'],
    shadows: PerformanceMetrics['shadows'],
    rendering: PerformanceMetrics['rendering']
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    // FPS bottleneck
    if (fps.average < this.config.targetFPS * 0.5) {
      bottlenecks.push({
        type: 'fps',
        severity: 'critical',
        description: `Average FPS (${fps.average}) is critically below target (${this.config.targetFPS})`,
        recommendation: 'Reduce shadow quality, texture resolution, or draw calls',
        metric: fps.average,
        threshold: this.config.targetFPS,
      });
    } else if (fps.average < this.config.targetFPS * 0.8) {
      bottlenecks.push({
        type: 'fps',
        severity: 'high',
        description: `Average FPS (${fps.average}) is below target (${this.config.targetFPS})`,
        recommendation: 'Consider optimizing shadow rendering or texture loading',
        metric: fps.average,
        threshold: this.config.targetFPS,
      });
    } else if (fps.average < this.config.targetFPS) {
      bottlenecks.push({
        type: 'fps',
        severity: 'medium',
        description: `Average FPS (${fps.average}) is slightly below target (${this.config.targetFPS})`,
        recommendation: 'Monitor for performance degradation',
        metric: fps.average,
        threshold: this.config.targetFPS,
      });
    }

    // Memory bottleneck
    if (memory.percentUsed > this.config.memoryCriticalThreshold) {
      bottlenecks.push({
        type: 'memory',
        severity: 'critical',
        description: `Memory usage (${memory.percentUsed.toFixed(1)}%) is critically high`,
        recommendation: 'Implement texture cleanup, reduce cache size, or optimize memory usage',
        metric: memory.percentUsed,
        threshold: this.config.memoryCriticalThreshold,
      });
    } else if (memory.percentUsed > this.config.memoryWarningThreshold) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        description: `Memory usage (${memory.percentUsed.toFixed(1)}%) is high`,
        recommendation: 'Monitor memory usage and consider implementing cleanup strategies',
        metric: memory.percentUsed,
        threshold: this.config.memoryWarningThreshold,
      });
    }

    // Texture loading bottleneck
    const slowTextures = Array.from(textures.loadTime.entries())
      .filter(([_, time]) => time > this.config.maxTextureLoadTime);
    
    if (slowTextures.length > 0) {
      const avgSlowTime = slowTextures.reduce((sum, [_, time]) => sum + time, 0) / slowTextures.length;
      bottlenecks.push({
        type: 'texture',
        severity: avgSlowTime > this.config.maxTextureLoadTime * 2 ? 'high' : 'medium',
        description: `${slowTextures.length} textures loaded slowly (avg: ${avgSlowTime.toFixed(0)}ms)`,
        recommendation: 'Optimize texture resolution, implement progressive loading, or preload textures',
        metric: avgSlowTime,
        threshold: this.config.maxTextureLoadTime,
      });
    }

    // Cache efficiency bottleneck
    const totalCacheAccess = textures.cacheHits + textures.cacheMisses;
    if (totalCacheAccess > 0) {
      const cacheHitRate = (textures.cacheHits / totalCacheAccess) * 100;
      if (cacheHitRate < 50) {
        bottlenecks.push({
          type: 'texture',
          severity: 'medium',
          description: `Low cache hit rate (${cacheHitRate.toFixed(1)}%)`,
          recommendation: 'Increase cache size or improve cache strategy',
          metric: cacheHitRate,
          threshold: 80,
        });
      }
    }

    // Draw calls bottleneck
    if (rendering.drawCalls > this.config.maxDrawCalls) {
      bottlenecks.push({
        type: 'drawcalls',
        severity: rendering.drawCalls > this.config.maxDrawCalls * 1.5 ? 'high' : 'medium',
        description: `High draw call count (${rendering.drawCalls})`,
        recommendation: 'Implement instanced rendering or batch similar objects',
        metric: rendering.drawCalls,
        threshold: this.config.maxDrawCalls,
      });
    }

    // Shadow rendering bottleneck
    if (shadows.enabled && shadows.renderTime > 5) {
      bottlenecks.push({
        type: 'shadow',
        severity: shadows.renderTime > 10 ? 'high' : 'medium',
        description: `Shadow rendering is slow (${shadows.renderTime.toFixed(1)}ms)`,
        recommendation: 'Reduce shadow map size, limit shadow distance, or disable shadows',
        metric: shadows.renderTime,
        threshold: 5,
      });
    }

    return bottlenecks;
  }

  /**
   * Generate performance report
   */
  generateReport(renderer?: any): string {
    const metrics = this.getMetrics(renderer);
    const duration = (performance.now() - this.startTime) / 1000;

    let report = '=== Performance Profile Report ===\n\n';
    
    // Duration
    report += `Profile Duration: ${duration.toFixed(2)}s\n`;
    report += `Total Frames: ${this.frameCount}\n\n`;

    // FPS
    report += '--- Frame Rate ---\n';
    report += `Current FPS: ${metrics.fps.current}\n`;
    report += `Average FPS: ${metrics.fps.average}\n`;
    report += `Min FPS: ${metrics.fps.min}\n`;
    report += `Max FPS: ${metrics.fps.max}\n`;
    report += `Target FPS: ${this.config.targetFPS}\n`;
    report += `Status: ${metrics.fps.average >= this.config.targetFPS ? '✓ GOOD' : '✗ BELOW TARGET'}\n\n`;

    // Memory
    report += '--- Memory Usage ---\n';
    report += `Used: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Total: ${(metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Limit: ${(metrics.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Percent Used: ${metrics.memory.percentUsed.toFixed(1)}%\n`;
    report += `Status: ${metrics.memory.percentUsed < this.config.memoryWarningThreshold ? '✓ GOOD' : '⚠ HIGH'}\n\n`;

    // Rendering
    report += '--- Rendering ---\n';
    report += `Draw Calls: ${metrics.rendering.drawCalls}\n`;
    report += `Triangles: ${metrics.rendering.triangles}\n`;
    report += `Textures: ${metrics.rendering.textures}\n`;
    report += `Programs: ${metrics.rendering.programs}\n\n`;

    // Textures
    report += '--- Texture Performance ---\n';
    report += `Total Loaded: ${metrics.textures.totalLoaded}\n`;
    report += `Cache Hits: ${metrics.textures.cacheHits}\n`;
    report += `Cache Misses: ${metrics.textures.cacheMisses}\n`;
    const totalAccess = metrics.textures.cacheHits + metrics.textures.cacheMisses;
    if (totalAccess > 0) {
      report += `Cache Hit Rate: ${((metrics.textures.cacheHits / totalAccess) * 100).toFixed(1)}%\n`;
    }
    
    if (metrics.textures.loadTime.size > 0) {
      const loadTimes = Array.from(metrics.textures.loadTime.values());
      const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);
      report += `Avg Load Time: ${avgLoadTime.toFixed(1)}ms\n`;
      report += `Max Load Time: ${maxLoadTime.toFixed(1)}ms\n`;
    }
    report += '\n';

    // Shadows
    report += '--- Shadow Rendering ---\n';
    report += `Enabled: ${metrics.shadows.enabled ? 'Yes' : 'No'}\n`;
    if (metrics.shadows.enabled) {
      report += `Map Size: ${metrics.shadows.mapSize}x${metrics.shadows.mapSize}\n`;
      report += `Render Time: ${metrics.shadows.renderTime.toFixed(1)}ms\n`;
    }
    report += '\n';

    // Bottlenecks
    if (metrics.bottlenecks.length > 0) {
      report += '--- Performance Bottlenecks ---\n';
      metrics.bottlenecks.forEach((bottleneck, index) => {
        const severityIcon = {
          low: 'ℹ',
          medium: '⚠',
          high: '⚠⚠',
          critical: '🔴',
        }[bottleneck.severity];
        
        report += `${index + 1}. ${severityIcon} [${bottleneck.severity.toUpperCase()}] ${bottleneck.type.toUpperCase()}\n`;
        report += `   ${bottleneck.description}\n`;
        report += `   Recommendation: ${bottleneck.recommendation}\n\n`;
      });
    } else {
      report += '--- Performance Status ---\n';
      report += '✓ No significant bottlenecks detected\n\n';
    }

    return report;
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(renderer?: any): string[] {
    const metrics = this.getMetrics(renderer);
    const recommendations: string[] = [];

    // Sort bottlenecks by severity
    const sortedBottlenecks = [...metrics.bottlenecks].sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    // Add recommendations from bottlenecks
    sortedBottlenecks.forEach(bottleneck => {
      recommendations.push(bottleneck.recommendation);
    });

    // Add general recommendations
    if (metrics.fps.average >= this.config.targetFPS && metrics.memory.percentUsed < this.config.memoryWarningThreshold) {
      recommendations.push('Performance is good - no immediate optimizations needed');
    }

    return recommendations;
  }
}
