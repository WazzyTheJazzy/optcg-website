# Performance Profiler

## Overview

The Performance Profiler provides comprehensive performance monitoring and bottleneck detection for the One Piece TCG game engine. It tracks frame rate, memory usage, texture loading, shadow rendering, and automatically identifies performance issues.

## Features

- **Frame Rate Monitoring**: Track current, average, min, and max FPS
- **Memory Usage Tracking**: Monitor JavaScript heap usage and detect memory issues
- **Texture Performance**: Track texture load times and cache efficiency
- **Shadow Rendering**: Monitor shadow rendering performance
- **Bottleneck Detection**: Automatically identify performance bottlenecks
- **Comprehensive Reporting**: Generate detailed performance reports
- **Optimization Recommendations**: Get actionable recommendations for improvements

## Usage

### Basic Usage

```typescript
import { PerformanceProfiler } from './PerformanceProfiler';

// Create profiler with default settings
const profiler = new PerformanceProfiler();

// Start profiling
profiler.start();

// In your render loop
function renderLoop() {
  // Record each frame
  profiler.recordFrame();
  
  // Your rendering code...
  
  requestAnimationFrame(renderLoop);
}

// Get metrics at any time
const metrics = profiler.getMetrics();
console.log(`Current FPS: ${metrics.fps.current}`);
console.log(`Average FPS: ${metrics.fps.average}`);

// Generate a report
const report = profiler.generateReport();
console.log(report);

// Get optimization recommendations
const recommendations = profiler.getOptimizationRecommendations();
recommendations.forEach(rec => console.log(rec));

// Stop profiling
profiler.stop();
```

### Custom Configuration

```typescript
const profiler = new PerformanceProfiler({
  targetFPS: 60,                    // Target frame rate
  memoryWarningThreshold: 70,       // Memory warning at 70%
  memoryCriticalThreshold: 85,      // Memory critical at 85%
  maxDrawCalls: 1000,               // Max draw calls per frame
  maxTextureLoadTime: 100,          // Max texture load time in ms
  enableDetailedProfiling: true,    // Enable detailed profiling
});
```

### Recording Texture Loads

```typescript
// Record texture load time
const startTime = performance.now();
const texture = await loadTexture('card-001.png');
const loadTime = performance.now() - startTime;

profiler.recordTextureLoad('card-001', loadTime);
```

### Recording Cache Performance

```typescript
// Record cache hit
if (cache.has(textureId)) {
  profiler.recordCacheHit();
  return cache.get(textureId);
}

// Record cache miss
profiler.recordCacheMiss();
const texture = await loadTexture(textureId);
cache.set(textureId, texture);
```

### Recording Shadow Rendering

```typescript
// Record shadow render time
const startTime = performance.now();
renderer.render(scene, camera);
const shadowTime = performance.now() - startTime;

profiler.recordShadowRenderTime(shadowTime);
```

### Integration with Three.js

```typescript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
const profiler = new PerformanceProfiler();

profiler.start();

function animate() {
  profiler.recordFrame();
  
  renderer.render(scene, camera);
  
  // Get metrics with renderer info
  const metrics = profiler.getMetrics(renderer);
  
  // Check for bottlenecks
  if (metrics.bottlenecks.length > 0) {
    console.warn('Performance bottlenecks detected:', metrics.bottlenecks);
  }
  
  requestAnimationFrame(animate);
}
```

## Performance Metrics

### FPS Metrics

```typescript
interface FPSMetrics {
  current: number;  // Current frame rate
  average: number;  // Average frame rate
  min: number;      // Minimum frame rate
  max: number;      // Maximum frame rate
}
```

### Memory Metrics

```typescript
interface MemoryMetrics {
  usedJSHeapSize: number;      // Used heap in bytes
  totalJSHeapSize: number;     // Total heap in bytes
  jsHeapSizeLimit: number;     // Heap limit in bytes
  percentUsed: number;         // Percentage of heap used
}
```

### Rendering Metrics

```typescript
interface RenderingMetrics {
  drawCalls: number;   // Number of draw calls per frame
  triangles: number;   // Number of triangles rendered
  textures: number;    // Number of textures loaded
  programs: number;    // Number of shader programs
}
```

### Texture Metrics

```typescript
interface TextureMetrics {
  loadTime: Map<string, number>;  // Load time for each texture
  cacheHits: number;              // Number of cache hits
  cacheMisses: number;            // Number of cache misses
  totalLoaded: number;            // Total textures loaded
}
```

## Bottleneck Detection

The profiler automatically detects performance bottlenecks:

### Bottleneck Types

- **fps**: Frame rate below target
- **memory**: Memory usage too high
- **texture**: Slow texture loading or low cache hit rate
- **shadow**: Shadow rendering too slow
- **drawcalls**: Too many draw calls per frame

### Severity Levels

- **low**: Minor issue, monitor
- **medium**: Noticeable issue, consider optimizing
- **high**: Significant issue, should optimize
- **critical**: Severe issue, must optimize immediately

### Example Bottleneck

```typescript
{
  type: 'fps',
  severity: 'critical',
  description: 'Average FPS (25) is critically below target (60)',
  recommendation: 'Reduce shadow quality, texture resolution, or draw calls',
  metric: 25,
  threshold: 60
}
```

## Performance Report

Generate a comprehensive performance report:

```typescript
const report = profiler.generateReport(renderer);
console.log(report);
```

Example output:

```
=== Performance Profile Report ===

Profile Duration: 30.45s
Total Frames: 1827

--- Frame Rate ---
Current FPS: 60
Average FPS: 58
Min FPS: 45
Max FPS: 60
Target FPS: 60
Status: ✓ GOOD

--- Memory Usage ---
Used: 52.34 MB
Total: 68.12 MB
Limit: 128.00 MB
Percent Used: 40.9%
Status: ✓ GOOD

--- Rendering ---
Draw Calls: 125
Triangles: 8,450
Textures: 32
Programs: 4

--- Texture Performance ---
Total Loaded: 32
Cache Hits: 245
Cache Misses: 32
Cache Hit Rate: 88.4%
Avg Load Time: 45.2ms
Max Load Time: 120.5ms

--- Shadow Rendering ---
Enabled: Yes
Map Size: 2048x2048
Render Time: 3.2ms

--- Performance Status ---
✓ No significant bottlenecks detected
```

## Optimization Recommendations

Get actionable recommendations:

```typescript
const recommendations = profiler.getOptimizationRecommendations(renderer);
recommendations.forEach(rec => {
  console.log(`• ${rec}`);
});
```

Example recommendations:

```
• Reduce shadow quality, texture resolution, or draw calls
• Monitor memory usage and consider implementing cleanup strategies
• Optimize texture resolution, implement progressive loading, or preload textures
• Increase cache size or improve cache strategy
```

## Best Practices

### 1. Profile Regularly

```typescript
// Profile every 30 seconds
setInterval(() => {
  const metrics = profiler.getMetrics(renderer);
  
  if (metrics.bottlenecks.length > 0) {
    console.warn('Bottlenecks:', metrics.bottlenecks);
  }
}, 30000);
```

### 2. Monitor Critical Metrics

```typescript
function checkPerformance() {
  const metrics = profiler.getMetrics();
  
  // Check FPS
  if (metrics.fps.average < 30) {
    console.error('Critical: FPS too low!');
    // Take action...
  }
  
  // Check memory
  if (metrics.memory.percentUsed > 85) {
    console.error('Critical: Memory too high!');
    // Clear caches, reduce quality...
  }
}
```

### 3. Use with Optimizer

```typescript
import { PerformanceProfiler } from './PerformanceProfiler';
import { PerformanceOptimizer } from './PerformanceOptimizer';

const profiler = new PerformanceProfiler();
const optimizer = new PerformanceOptimizer();

profiler.start();

function renderLoop() {
  profiler.recordFrame();
  
  const metrics = profiler.getMetrics();
  
  // Let optimizer adjust quality based on FPS
  optimizer.updateFPS(metrics.fps.current);
  
  // Apply quality settings
  const quality = optimizer.getQualitySettings();
  renderer.shadowMap.enabled = quality.enableShadows;
  // ... apply other settings
  
  requestAnimationFrame(renderLoop);
}
```

### 4. Send Analytics

```typescript
// Send performance data to analytics
function sendPerformanceAnalytics() {
  const metrics = profiler.getMetrics();
  
  analytics.track('performance', {
    avgFPS: metrics.fps.average,
    minFPS: metrics.fps.min,
    memoryUsed: metrics.memory.percentUsed,
    bottleneckCount: metrics.bottlenecks.length,
    criticalBottlenecks: metrics.bottlenecks.filter(b => b.severity === 'critical').length,
  });
}

setInterval(sendPerformanceAnalytics, 60000); // Every minute
```

## Performance Targets

### Recommended Targets

- **Target FPS**: 60 FPS
- **Minimum FPS**: 30 FPS
- **Memory Warning**: 70% of heap
- **Memory Critical**: 85% of heap
- **Max Texture Load**: 100ms
- **Max Draw Calls**: 1000 per frame
- **Cache Hit Rate**: >80%

### Adjusting Targets

```typescript
const profiler = new PerformanceProfiler({
  targetFPS: 30,                    // Lower target for mobile
  memoryWarningThreshold: 60,       // More conservative on mobile
  maxTextureLoadTime: 200,          // Allow slower loads on mobile
});
```

## Troubleshooting

### Low FPS

1. Check bottlenecks: `metrics.bottlenecks`
2. Reduce shadow quality
3. Lower texture resolution
4. Reduce draw calls
5. Disable antialiasing

### High Memory Usage

1. Clear texture cache
2. Reduce cache size
3. Implement texture cleanup
4. Use lower resolution textures

### Slow Texture Loading

1. Preload common textures
2. Use progressive loading
3. Optimize texture resolution
4. Implement texture compression

### Low Cache Hit Rate

1. Increase cache size
2. Improve cache strategy
3. Preload frequently used textures

## See Also

- [PerformanceOptimizer](./PerformanceOptimizer.README.md) - Automatic performance optimization
- [TextureCache](./TextureCache.ts) - Texture caching system
- [PerformanceMonitor](./PerformanceMonitor.ts) - Basic performance monitoring
