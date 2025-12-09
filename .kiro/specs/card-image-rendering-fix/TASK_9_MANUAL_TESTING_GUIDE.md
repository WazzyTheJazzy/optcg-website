# Task 9: Manual Performance Testing Guide

## Overview

This guide provides step-by-step instructions for manually verifying the performance characteristics of the card image rendering system in a browser environment.

## Prerequisites

- Development server running (`npm run dev`)
- Browser with DevTools (Chrome, Firefox, or Edge recommended)
- Game loaded with multiple cards visible

## Test 1: Image Load Times

### Objective
Verify that images load within acceptable timeframes (Requirements 7.3, 7.5).

### Steps

1. **Open Browser DevTools**
   - Press F12 or right-click → Inspect
   - Go to Console tab

2. **Clear Console and Cache**
   ```javascript
   console.clear();
   ```
   - Also clear browser cache (Ctrl+Shift+Delete)

3. **Load the Game**
   - Navigate to `/game` page
   - Watch console for load logs

4. **Measure Load Times**
   - Look for logs like: `✅ CardImageLoader: Texture loaded successfully`
   - Note the timestamps between "Load request" and "Texture loaded"
   
5. **Expected Results**
   - Local images: < 2000ms
   - External images (via proxy): < 5000ms
   - Placeholders: < 100ms

### Example Console Output
```
📥 CardImageLoader: Load request { imageUrl: '/cards/OP01-001.png', timestamp: 1234567890 }
✅ CardImageLoader: Texture loaded successfully { imageUrl: '/cards/OP01-001.png', timestamp: 1234567950 }
// Load time: 60ms ✅
```

## Test 2: Cache Hit Rate

### Objective
Verify that duplicate cards reuse cached textures (Requirement 7.3).

### Steps

1. **Monitor Cache Behavior**
   - Watch console for cache hit/miss logs
   - Look for: `💾 CardImageLoader: Cache hit`

2. **Test with Duplicate Cards**
   - Load a game with multiple copies of the same card
   - First instance should show "Cache miss"
   - Subsequent instances should show "Cache hit"

3. **Measure Cache Performance**
   - Run this in console:
   ```javascript
   // Get loader instance
   const loader = window.__cardImageLoader__;
   
   // Check cache stats
   const stats = loader.getCacheStats();
   console.log('Cache Stats:', stats);
   ```

4. **Expected Results**
   - Cache hit rate > 90% for duplicate cards
   - Cache hits should be near-instant (< 1ms)

### Example Console Output
```
🔍 CardImageLoader: Cache miss { imageUrl: '/cards/OP01-001.png' }
✅ CardImageLoader: Texture loaded successfully
💾 CardImageLoader: Cache hit { imageUrl: '/cards/OP01-001.png' }
💾 CardImageLoader: Cache hit { imageUrl: '/cards/OP01-001.png' }
// Cache hit rate: 66% (2/3) ✅
```

## Test 3: Memory Usage

### Objective
Verify that memory is managed correctly and no leaks occur.

### Steps

1. **Open Memory Profiler**
   - DevTools → Performance tab
   - Or DevTools → Memory tab

2. **Take Initial Snapshot**
   - Click "Take snapshot" or "Record"
   - Note initial memory usage

3. **Play the Game**
   - Play for 5-10 minutes
   - Move cards around
   - Draw cards, play cards, etc.

4. **Take Final Snapshot**
   - Take another snapshot
   - Compare memory usage

5. **Check for Leaks**
   - Memory should stabilize after initial load
   - No continuous growth over time
   - Textures should be released when cards are removed

### Expected Results
- Memory usage stabilizes after initial card load
- No continuous memory growth during gameplay
- Texture count in cache stays reasonable (< 100 by default)

### Memory Profiling Commands
```javascript
// Check current cache size
const loader = window.__cardImageLoader__;
console.log('Cache size:', loader.getCacheSize());

// Get detailed cache stats
const stats = loader.getCacheStats();
console.log('Cache entries:', stats.entries.length);
console.log('Max cache size:', stats.maxSize);

// Check reference counts
stats.entries.forEach(entry => {
  console.log(`${entry.url}: refCount=${entry.refCount}`);
});
```

## Test 4: Memory Leak Detection

### Objective
Verify no memory leaks during extended gameplay.

### Steps

1. **Enable Memory Timeline**
   - DevTools → Performance tab
   - Check "Memory" checkbox
   - Click Record

2. **Perform Repeated Actions**
   - Draw and discard cards repeatedly (20+ times)
   - Move cards between zones
   - Play and remove cards

3. **Stop Recording**
   - Stop the performance recording
   - Analyze the memory timeline

4. **Check for Leaks**
   - Memory should have a sawtooth pattern (allocate → garbage collect)
   - No continuous upward trend
   - Memory should return to baseline after garbage collection

### Expected Results
- Sawtooth memory pattern (normal)
- No continuous upward trend (leak)
- Memory returns to baseline after GC

## Test 5: Performance Under Load

### Objective
Verify performance with many cards loaded simultaneously.

### Steps

1. **Load a Full Game**
   - Start a game with full decks (50+ cards each)
   - Ensure many cards are visible on screen

2. **Monitor Performance**
   - DevTools → Performance tab
   - Record for 30 seconds while interacting

3. **Check Metrics**
   - Frame rate should stay above 30 FPS
   - No significant frame drops
   - Smooth animations

4. **Check Console**
   - No timeout errors
   - No repeated load failures
   - Cache hits for duplicate cards

### Expected Results
- Smooth 30+ FPS gameplay
- No frame drops during card rendering
- Cache working efficiently

## Performance Benchmarks

### Automated Cache Performance Test

Run this in the browser console to get detailed performance metrics:

```javascript
// Performance test script
async function testCachePerformance() {
  const loader = window.__cardImageLoader__;
  
  console.log('🧪 Running Cache Performance Test...\n');
  
  // Test 1: Cache hit speed
  const testUrl = '/cards/OP01-001.png';
  const iterations = 1000;
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    loader.getCachedTexture(testUrl);
  }
  const duration = performance.now() - start;
  const avgTime = duration / iterations;
  
  console.log(`Cache Hit Performance:`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Total time: ${duration.toFixed(2)}ms`);
  console.log(`  Avg time: ${avgTime.toFixed(4)}ms`);
  console.log(`  Operations/sec: ${(1000 / avgTime).toFixed(0)}`);
  
  // Test 2: Cache stats
  const stats = loader.getCacheStats();
  console.log(`\nCache Statistics:`);
  console.log(`  Size: ${stats.size}/${stats.maxSize}`);
  console.log(`  Entries: ${stats.entries.length}`);
  
  // Test 3: Reference counts
  const refCounts = stats.entries.map(e => e.refCount);
  const totalRefs = refCounts.reduce((a, b) => a + b, 0);
  const avgRefs = totalRefs / refCounts.length || 0;
  
  console.log(`\nReference Counts:`);
  console.log(`  Total refs: ${totalRefs}`);
  console.log(`  Avg refs/texture: ${avgRefs.toFixed(2)}`);
  console.log(`  Max refs: ${Math.max(...refCounts, 0)}`);
  console.log(`  Min refs: ${Math.min(...refCounts, 0)}`);
  
  console.log('\n✅ Performance test complete');
}

// Run the test
testCachePerformance();
```

## Troubleshooting

### Slow Load Times

If images are loading slowly:
1. Check network tab for slow requests
2. Verify image proxy is working for external URLs
3. Check for network throttling in DevTools
4. Verify images are being cached (check for cache hits)

### High Memory Usage

If memory usage is high:
1. Check cache size: `loader.getCacheSize()`
2. Verify LRU eviction is working
3. Check for unreleased textures (high refCounts)
4. Clear cache manually: `loader.clearCache()`

### Cache Not Working

If cache hits are low:
1. Verify same URLs are being used
2. Check console for cache miss reasons
3. Verify cache isn't being cleared between loads
4. Check maxCacheSize setting

## Success Criteria

All tests pass if:
- ✅ Local images load in < 2000ms
- ✅ External images load in < 5000ms
- ✅ Cache hit rate > 90% for duplicates
- ✅ Memory usage stabilizes
- ✅ No memory leaks detected
- ✅ Smooth 30+ FPS gameplay
- ✅ No console errors

## Reporting Results

Document your findings:
1. Browser and version used
2. Load time measurements
3. Cache hit rate observed
4. Memory usage patterns
5. Any issues encountered

Example report:
```
Browser: Chrome 120.0
Local image load: 50-150ms ✅
External image load: 500-1500ms ✅
Cache hit rate: 98% ✅
Memory: Stable at ~150MB ✅
FPS: 60 FPS ✅
Issues: None
```
