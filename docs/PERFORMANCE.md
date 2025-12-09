# Performance Guide

> Comprehensive guide to performance optimization and monitoring for the One Piece TCG game
> Last updated: November 23, 2025

---

## Overview

The One Piece TCG game is optimized to maintain 60 FPS on modern hardware while delivering high-quality 3D graphics. This document covers performance targets, optimization strategies, monitoring tools, and troubleshooting.

---

## Performance Targets

### Frame Rate
- **Target:** 60 FPS (16.67ms per frame)
- **Minimum:** 58 FPS acceptable
- **Typical:** 58-60 FPS on modern hardware

### Resource Usage
- **Memory:** <200MB total
- **Texture Memory:** <100MB
- **Draw Calls:** <100 per frame
- **Triangles:** <50,000 per frame

### Load Times
- **Initial Load:** <3 seconds
- **Texture Loading:** <1 second
- **Game Setup:** <500ms

---

## Performance Monitoring

### PerformanceMonitor Service

**Location:** `lib/game-engine/rendering/PerformanceMonitor.ts`

Real-time performance tracking for the 3D rendering system:

```typescript
import { PerformanceMonitor } from '@/lib/game-engine/rendering/PerformanceMonitor';

// Create monitor
const monitor = new PerformanceMonitor(renderer);

// Start monitoring
monitor.startMonitoring();

// Get current metrics
const metrics = monitor.getMetrics();
console.log(`FPS: ${metrics.fps}`);
console.log(`Frame Time: ${metrics.frameTime}ms`);
console.log(`Draw Calls: ${metrics.drawCalls}`);
console.log(`Memory: ${metrics.memoryUsage}MB`);

// Stop monitoring
monitor.stopMonitoring();
```

### Metrics Explained

#### FPS (Frames Per Second)
- **What it measures:** How many frames are rendered per second
- **Target:** 60 FPS
- **Good:** 58-60 FPS
- **Acceptable:** 50-58 FPS
- **Poor:** <50 FPS

#### Frame Time
- **What it measures:** Time to render one frame in milliseconds
- **Target:** <16.67ms (for 60 FPS)
- **Good:** 12-16ms
- **Acceptable:** 16-20ms
- **Poor:** >20ms

#### Draw Calls
- **What it measures:** Number of draw operations per frame
- **Target:** <100
- **Good:** 60-80
- **Acceptable:** 80-100
- **Poor:** >100

#### Triangle Count
- **What it measures:** Total triangles rendered per frame
- **Target:** <50,000
- **Good:** 30,000-40,000
- **Acceptable:** 40,000-50,000
- **Poor:** >50,000

#### Memory Usage
- **What it measures:** Estimated GPU memory usage in MB
- **Target:** <200MB
- **Good:** 120-150MB
- **Acceptable:** 150-200MB
- **Poor:** >200MB

### Browser DevTools

#### Performance Tab
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with game for 5-10 seconds
5. Stop recording
6. Analyze frame rate and bottlenecks

#### Memory Tab
1. Open DevTools (F12)
2. Go to Memory tab
3. Take heap snapshot
4. Interact with game
5. Take another snapshot
6. Compare to find memory leaks

---

## Optimization Strategies

### 1. Texture Optimization

#### Texture Caching

**Service:** `lib/game-engine/rendering/TextureCache.ts`

Load textures once and reuse them:

```typescript
// ❌ Bad: Loading texture multiple times
cards.forEach(card => {
  const texture = textureLoader.load(card.imageUrl);
  // Creates 50+ texture instances = high memory usage
});

// ✅ Good: Load once, reuse
const texture = await TextureCache.load(imageUrl);
cards.forEach(card => {
  mesh.material.map = texture; // Reuse same texture
});
```

**Benefits:**
- Reduces memory usage by 80%
- Faster rendering
- Fewer GPU uploads

#### Texture Resolution

Use appropriate resolution for each use case:

```typescript
// Card textures
const CARD_TEXTURE_SIZE = 1024; // 1024x1024 for main cards

// DON card textures
const DON_TEXTURE_SIZE = 1024; // 1024x1024 for DON cards

// Table textures
const TABLE_TEXTURE_SIZE = 2048; // 2048x2048 for large surface

// Thumbnail textures (if needed)
const THUMBNAIL_SIZE = 256; // 256x256 for small previews
```

#### Texture Compression

```typescript
// Enable texture compression
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.generateMipmaps = true;

// Use compressed formats when available
if (renderer.capabilities.isWebGL2) {
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
}
```

### 2. Geometry Optimization

#### Geometry Instancing

Reuse geometry for all cards:

```typescript
// ✅ Create geometry once
const cardGeometry = new THREE.PlaneGeometry(2.5, 3.5);

// Reuse for all cards
cards.forEach(card => {
  const mesh = new THREE.Mesh(
    cardGeometry, // Reuse same geometry
    new THREE.MeshStandardMaterial({ map: card.texture })
  );
  scene.add(mesh);
});

// Don't forget to dispose when done
// cardGeometry.dispose();
```

**Benefits:**
- Reduces memory by 90%
- Faster rendering
- Lower GPU memory usage

#### Simplified Geometry

Use simple geometry for cards:

```typescript
// Cards are flat planes, not complex 3D models
const cardGeometry = new THREE.PlaneGeometry(2.5, 3.5);
// Only 2 triangles per card!

// Avoid complex geometry
// ❌ const cardGeometry = new THREE.BoxGeometry(2.5, 0.1, 3.5, 10, 10, 10);
// This would be 600 triangles per card!
```

### 3. Shadow Optimization

#### Shadow Map Configuration

```typescript
// Renderer setup
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

// Directional light
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;  // Balance quality/performance
directionalLight.shadow.mapSize.height = 2048;

// Optimize shadow camera frustum
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 30; // Limited distance
```

#### Shadow Quality vs Performance

| Shadow Map Size | Quality | Performance | Use Case |
|----------------|---------|-------------|----------|
| 512x512 | Low | Excellent | Low-end devices |
| 1024x1024 | Medium | Good | Mobile devices |
| 2048x2048 | High | Good | Desktop (default) |
| 4096x4096 | Very High | Poor | High-end only |

#### Selective Shadow Casting

```typescript
// Only cards cast shadows
cardMesh.castShadow = true;
cardMesh.receiveShadow = false;

// Table receives shadows
tableMesh.receiveShadow = true;
tableMesh.castShadow = false;

// UI elements don't cast/receive shadows
uiElement.castShadow = false;
uiElement.receiveShadow = false;
```

### 4. Rendering Optimization

#### Frustum Culling

Automatically enabled by Three.js - don't render off-screen objects:

```typescript
// Three.js automatically culls objects outside camera view
// No action needed, but ensure objects have proper bounding boxes

// For custom objects, ensure frustumCulled is true (default)
mesh.frustumCulled = true;
```

#### Level of Detail (LOD)

Reduce detail for distant objects:

```typescript
const lod = new THREE.LOD();

// High detail mesh (close)
const highDetail = createHighDetailCard();
lod.addLevel(highDetail, 0);

// Medium detail mesh (medium distance)
const mediumDetail = createMediumDetailCard();
lod.addLevel(mediumDetail, 10);

// Low detail mesh (far)
const lowDetail = createLowDetailCard();
lod.addLevel(lowDetail, 20);

scene.add(lod);
```

#### Render Order

Optimize render order to reduce state changes:

```typescript
// Group objects by material to reduce state changes
cards.sort((a, b) => {
  if (a.material.id < b.material.id) return -1;
  if (a.material.id > b.material.id) return 1;
  return 0;
});

// Set render order explicitly
cardMesh.renderOrder = 1;
tableMesh.renderOrder = 0;
uiElement.renderOrder = 2;
```

### 5. Material Optimization

#### Material Reuse

```typescript
// ✅ Create material once, reuse
const cardMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.5,
  metalness: 0.1,
});

cards.forEach(card => {
  const mesh = new THREE.Mesh(
    cardGeometry,
    cardMaterial.clone() // Clone material, set different texture
  );
  mesh.material.map = card.texture;
});
```

#### Material Properties

```typescript
// Optimize material properties
const material = new THREE.MeshStandardMaterial({
  map: texture,
  roughness: 0.5,
  metalness: 0.1,
  
  // Disable features you don't need
  transparent: false,
  alphaTest: 0,
  depthWrite: true,
  depthTest: true,
  
  // Optimize for performance
  flatShading: false,
  side: THREE.FrontSide, // Only render front face
});
```

### 6. Loading Optimization

#### Lazy Loading

Load non-critical assets after initial render:

```typescript
// Load critical assets first
async function loadCriticalAssets() {
  await loadDONTextures();
  await loadVisibleCardTextures();
  await loadTableTexture();
}

// Load non-critical assets in background
async function loadNonCriticalAssets() {
  setTimeout(async () => {
    await loadAllCardTextures();
    await loadEnvironmentTextures();
  }, 100);
}

// Usage
await loadCriticalAssets();
startGame();
loadNonCriticalAssets(); // Don't await
```

#### Progressive Loading

Load textures progressively:

```typescript
// Load low-res placeholder first
const placeholder = await loadTexture('/cards/placeholder-low.jpg');
mesh.material.map = placeholder;

// Load high-res texture in background
loadTexture('/cards/card-high.jpg').then(highRes => {
  mesh.material.map = highRes;
  mesh.material.needsUpdate = true;
  placeholder.dispose();
});
```

#### Preloading

Preload textures before they're needed:

```typescript
// Preload textures for next phase
async function preloadNextPhase() {
  const nextPhaseCards = getNextPhaseCards();
  await Promise.all(
    nextPhaseCards.map(card => TextureCache.load(card.imageUrl))
  );
}

// Call during current phase
preloadNextPhase();
```

---

## Performance Testing

### Automated Tests

**Location:** `components/game/VisualEnvironment.integration.test.tsx`

```typescript
describe('Performance', () => {
  it('maintains 60 FPS with all enhancements', async () => {
    const monitor = new PerformanceMonitor(renderer);
    monitor.startMonitoring();
    
    // Render for 1 second
    await renderFrames(60);
    
    const metrics = monitor.getMetrics();
    expect(metrics.fps).toBeGreaterThanOrEqual(58);
  });
  
  it('keeps memory usage under 200MB', () => {
    const metrics = monitor.getMetrics();
    expect(metrics.memoryUsage).toBeLessThan(200);
  });
  
  it('limits draw calls to 100', () => {
    const metrics = monitor.getMetrics();
    expect(metrics.drawCalls).toBeLessThan(100);
  });
});
```

### Manual Testing

#### Test Scenarios

1. **Full Game Load**
   - Load game with all cards
   - Measure initial load time
   - Check FPS during gameplay

2. **Phase Transitions**
   - Transition through all phases
   - Measure FPS during transitions
   - Check for frame drops

3. **Card Interactions**
   - Drag and drop cards
   - Play multiple cards
   - Measure FPS during interactions

4. **Extended Play**
   - Play for 10+ minutes
   - Monitor memory usage
   - Check for memory leaks

#### Performance Checklist

- [ ] Initial load <3 seconds
- [ ] FPS >58 during gameplay
- [ ] No frame drops during phase transitions
- [ ] Smooth card animations
- [ ] Memory usage stable over time
- [ ] No memory leaks after 10 minutes
- [ ] Shadows render correctly
- [ ] Textures load without errors

---

## Troubleshooting Performance Issues

### Low FPS

**Symptoms:** Frame rate below 50 FPS, stuttering, lag

**Diagnosis:**
```typescript
const metrics = monitor.getMetrics();
console.log('FPS:', metrics.fps);
console.log('Frame Time:', metrics.frameTime);
console.log('Draw Calls:', metrics.drawCalls);
console.log('Triangles:', metrics.triangles);
```

**Solutions:**

1. **Reduce Shadow Quality**
   ```typescript
   renderer.shadowMap.enabled = false; // Disable shadows
   // OR
   light.shadow.mapSize.width = 1024; // Lower resolution
   ```

2. **Simplify Background**
   ```typescript
   scene.background = new THREE.Color(0x1a1a2e); // Solid color
   ```

3. **Reduce Texture Resolution**
   ```typescript
   const CARD_TEXTURE_SIZE = 512; // Lower resolution
   ```

4. **Disable Post-Processing**
   ```typescript
   // Remove any post-processing effects
   ```

### High Memory Usage

**Symptoms:** Memory usage >200MB, browser warnings

**Diagnosis:**
```typescript
const metrics = monitor.getMetrics();
console.log('Memory:', metrics.memoryUsage);
console.log('Textures:', metrics.textures);
console.log('Geometries:', metrics.geometries);
```

**Solutions:**

1. **Dispose Unused Resources**
   ```typescript
   // Dispose textures
   texture.dispose();
   
   // Dispose geometries
   geometry.dispose();
   
   // Dispose materials
   material.dispose();
   ```

2. **Clear Texture Cache**
   ```typescript
   TextureCache.clear();
   ```

3. **Reduce Texture Count**
   ```typescript
   // Use texture atlasing
   // Reuse textures more aggressively
   ```

### Memory Leaks

**Symptoms:** Memory usage increases over time

**Diagnosis:**
1. Take heap snapshot in DevTools
2. Play game for 5 minutes
3. Take another snapshot
4. Compare snapshots

**Solutions:**

1. **Dispose Resources Properly**
   ```typescript
   // When removing card from scene
   scene.remove(cardMesh);
   cardMesh.geometry.dispose();
   cardMesh.material.dispose();
   if (cardMesh.material.map) {
     cardMesh.material.map.dispose();
   }
   ```

2. **Remove Event Listeners**
   ```typescript
   // Remove listeners when component unmounts
   useEffect(() => {
     const handler = () => {};
     element.addEventListener('click', handler);
     
     return () => {
       element.removeEventListener('click', handler);
     };
   }, []);
   ```

3. **Clear Intervals/Timeouts**
   ```typescript
   useEffect(() => {
     const interval = setInterval(() => {}, 1000);
     
     return () => {
       clearInterval(interval);
     };
   }, []);
   ```

### Texture Loading Issues

**Symptoms:** Textures not loading, solid color cards

**Diagnosis:**
```typescript
console.log('Texture cache stats:', TextureCache.getStats());
```

**Solutions:**

1. **Check File Paths**
   ```bash
   ls public/cards/
   ls public/textures/
   ```

2. **Verify CORS**
   ```typescript
   // Ensure textures are served from same origin
   // Or configure CORS headers
   ```

3. **Check Browser Console**
   ```
   Look for 404 errors or CORS errors
   ```

---

## Performance Best Practices

### Do's ✅

- ✅ Reuse geometries and materials
- ✅ Use texture caching
- ✅ Dispose resources when done
- ✅ Monitor performance regularly
- ✅ Test on target hardware
- ✅ Use appropriate texture resolutions
- ✅ Enable frustum culling
- ✅ Optimize shadow settings
- ✅ Use lazy loading for non-critical assets
- ✅ Profile before optimizing

### Don'ts ❌

- ❌ Create new geometry for each card
- ❌ Load same texture multiple times
- ❌ Forget to dispose resources
- ❌ Use unnecessarily high texture resolutions
- ❌ Enable shadows on all objects
- ❌ Use complex geometry for simple objects
- ❌ Load all assets at once
- ❌ Ignore performance metrics
- ❌ Optimize without profiling
- ❌ Use post-processing without testing

---

## Platform-Specific Considerations

### Desktop Browsers

**Chrome/Edge:**
- Best performance
- Full WebGL 2.0 support
- Hardware acceleration enabled by default

**Firefox:**
- Good performance
- Full WebGL 2.0 support
- May need to enable hardware acceleration

**Safari:**
- Good performance on macOS
- Some WebGL limitations
- Test shadow rendering

### Mobile Devices

**Optimizations for Mobile:**

1. **Reduce Shadow Quality**
   ```typescript
   const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
   if (isMobile) {
     renderer.shadowMap.enabled = false;
   }
   ```

2. **Lower Texture Resolution**
   ```typescript
   const TEXTURE_SIZE = isMobile ? 512 : 1024;
   ```

3. **Simplify Materials**
   ```typescript
   if (isMobile) {
     material.roughness = 1;
     material.metalness = 0;
   }
   ```

4. **Reduce Draw Distance**
   ```typescript
   camera.far = isMobile ? 50 : 100;
   ```

---

## Conclusion

Performance optimization is an ongoing process. Use the monitoring tools to identify bottlenecks, apply appropriate optimizations, and test regularly on target hardware. The goal is to maintain 60 FPS while delivering high-quality graphics.

For specific performance issues, refer to the troubleshooting section or check the component README files.

---

**Document Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** ✅ Complete
