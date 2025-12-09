/**
 * PerformanceMonitor.ts
 * 
 * Performance monitoring and profiling for effect system operations.
 * Tracks timing, cache hit rates, and identifies bottlenecks.
 */

/**
 * Performance metric for a specific operation
 */
interface PerformanceMetric {
  name: string;
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}

/**
 * Performance sample for detailed analysis
 */
interface PerformanceSample {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Performance warning
 */
export interface PerformanceWarning {
  type: 'fps' | 'memory' | 'calls' | 'duration';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * Performance monitor for tracking effect system performance
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric>;
  private samples: PerformanceSample[];
  private activeTimers: Map<string, number>;
  private enabled: boolean;
  private maxSamples: number;
  private warningCallbacks: Array<(warning: PerformanceWarning) => void>;

  constructor(enabled: boolean = true, maxSamples: number = 1000) {
    this.metrics = new Map();
    this.samples = [];
    this.activeTimers = new Map();
    this.enabled = enabled;
    this.maxSamples = maxSamples;
    this.warningCallbacks = [];
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    if (!this.enabled) return;
    this.activeTimers.set(name, performance.now());
  }

  /**
   * End timing an operation and record the metric
   */
  endTimer(name: string, metadata?: Record<string, any>): number {
    if (!this.enabled) return 0;

    const startTime = this.activeTimers.get(name);
    if (startTime === undefined) {
      console.warn(`No active timer for ${name}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.activeTimers.delete(name);
    this.recordMetric(name, duration);
    this.recordSample(name, startTime, endTime, duration, metadata);
    this.checkThresholds(name, duration);

    return duration;
  }

  /**
   * Record a metric
   */
  private recordMetric(name: string, duration: number): void {
    let metric = this.metrics.get(name);

    if (!metric) {
      metric = {
        name,
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: -Infinity,
        avgTime: 0,
      };
      this.metrics.set(name, metric);
    }

    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;
  }

  /**
   * Record a performance sample
   */
  private recordSample(
    name: string,
    startTime: number,
    endTime: number,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const sample: PerformanceSample = {
      name,
      startTime,
      endTime,
      duration,
      metadata,
    };

    this.samples.push(sample);

    // Limit sample count
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Get metric for a specific operation
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get samples for a specific operation
   */
  getSamples(name: string, limit?: number): PerformanceSample[] {
    const filtered = this.samples.filter(s => s.name === name);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get all samples
   */
  getAllSamples(limit?: number): PerformanceSample[] {
    return limit ? this.samples.slice(-limit) : [...this.samples];
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(count: number = 10): PerformanceMetric[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, count);
  }

  /**
   * Get most frequent operations
   */
  getMostFrequentOperations(count: number = 10): PerformanceMetric[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  /**
   * Get operations exceeding threshold
   */
  getOperationsExceedingThreshold(thresholdMs: number): PerformanceMetric[] {
    return Array.from(this.metrics.values())
      .filter(m => m.avgTime > thresholdMs);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const lines: string[] = [];
    lines.push('=== Performance Report ===');
    lines.push('');

    // Summary
    const totalOperations = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.count, 0);
    const totalTime = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.totalTime, 0);

    lines.push(`Total Operations: ${totalOperations}`);
    lines.push(`Total Time: ${totalTime.toFixed(2)}ms`);
    lines.push(`Average Time per Operation: ${(totalTime / totalOperations).toFixed(2)}ms`);
    lines.push('');

    // Slowest operations
    lines.push('Slowest Operations (by average time):');
    const slowest = this.getSlowestOperations(5);
    for (const metric of slowest) {
      lines.push(
        `  ${metric.name}: ${metric.avgTime.toFixed(2)}ms avg ` +
        `(${metric.count} calls, ${metric.minTime.toFixed(2)}ms min, ${metric.maxTime.toFixed(2)}ms max)`
      );
    }
    lines.push('');

    // Most frequent operations
    lines.push('Most Frequent Operations:');
    const frequent = this.getMostFrequentOperations(5);
    for (const metric of frequent) {
      lines.push(
        `  ${metric.name}: ${metric.count} calls ` +
        `(${metric.avgTime.toFixed(2)}ms avg, ${metric.totalTime.toFixed(2)}ms total)`
      );
    }
    lines.push('');

    // Operations exceeding thresholds
    const exceeding = this.getOperationsExceedingThreshold(50);
    if (exceeding.length > 0) {
      lines.push('Operations Exceeding 50ms Threshold:');
      for (const metric of exceeding) {
        lines.push(
          `  ${metric.name}: ${metric.avgTime.toFixed(2)}ms avg ` +
          `(${metric.count} calls)`
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Clear all metrics and samples
   */
  clear(): void {
    this.metrics.clear();
    this.samples = [];
    this.activeTimers.clear();
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a callback for performance warnings
   */
  onWarning(callback: (warning: PerformanceWarning) => void): void {
    this.warningCallbacks.push(callback);
  }

  /**
   * Emit a performance warning
   */
  private emitWarning(warning: PerformanceWarning): void {
    this.warningCallbacks.forEach(callback => {
      try {
        callback(warning);
      } catch (error) {
        console.error('Error in performance warning callback:', error);
      }
    });
  }

  /**
   * Check thresholds and emit warnings if exceeded
   */
  private checkThresholds(name: string, duration: number): void {
    // Warn if operation takes longer than 100ms
    if (duration > 100) {
      this.emitWarning({
        type: 'duration',
        message: `Operation '${name}' exceeded duration threshold`,
        value: duration,
        threshold: 100,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Measure a function execution
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.enabled) {
      return fn();
    }

    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure an async function execution
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, { ...metadata, error: true });
      throw error;
    }
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor(
  process.env.NODE_ENV === 'development'
);

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return globalPerformanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
