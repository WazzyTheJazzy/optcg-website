# Manual Testing Script for Card Image Rendering

This document provides step-by-step manual testing procedures to verify the card image rendering system works correctly in a browser environment.

## Prerequisites

1. Start the development server: `npm run dev`
2. Open the game in a browser: `http://localhost:3000/game`
3. Open browser DevTools (F12)

---

## Test 7.1: Local Images

### Test 1.1: Verify cards load from /cards/ directory

**Steps:**
1. Start a new game
2. Look at the cards on the board
3. Open the Network tab in DevTools
4. Filter by "png" or "cards"

**Expected Results:**
- ✅ Cards display actual artwork (not placeholders)
- ✅ Network tab shows requests to `/cards/OP01-XXX.png`
- ✅ Images load successfully (200 status)
- ✅ No CORS errors in console

**Console Verification:**
```javascript
// Run in browser console
const loader = window.__CARD_IMAGE_LOADER__;
if (loader) {
  console.log('Cache size:', loader.cache?.size || 'N/A');
  console.log('Loader instance:', loader);
}
```

---

### Test 1.2: Check placeholder fallback for missing files

**Steps:**
1. Open browser console
2. Run the following code to test placeholder generation:

```javascript
// Test placeholder fallback
const testMissingImage = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  const texture = await loader.loadTexture({
    imageUrl: '/cards/NONEXISTENT-999.png',
    fallbackData: {
      name: 'Missing Card Test',
      category: 'CHARACTER',
      power: 3000,
      cost: 4,
    },
  });
  
  console.log('Texture created:', texture);
  console.log('Is placeholder (canvas):', texture.image instanceof HTMLCanvasElement);
  console.log('Image dimensions:', texture.image.width, 'x', texture.image.height);
};

testMissingImage();
```

**Expected Results:**
- ✅ Texture is created successfully
- ✅ `Is placeholder (canvas): true`
- ✅ Console shows "Card image fallback" warning
- ✅ Placeholder shows card name and stats

---

## Test 7.2: External Images

### Test 2.1: Verify external URLs route through proxy

**Steps:**
1. Open browser console
2. Run the following code:

```javascript
// Test external URL routing
const testExternalImage = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  console.log('Testing external URL...');
  
  const texture = await loader.loadTexture({
    imageUrl: 'https://images.onepiece-cardgame.com/images/cardlist/card/OP01-001.png',
    fallbackData: {
      name: 'External Test',
      category: 'LEADER',
      power: 5000,
      cost: 0,
    },
  });
  
  console.log('External image loaded:', texture);
};

testExternalImage();
```

**Expected Results:**
- ✅ Network tab shows request to `/api/image-proxy?url=https%3A%2F%2F...`
- ✅ Proxy request returns 200 status
- ✅ Image loads successfully or falls back to placeholder
- ✅ No CORS errors

---

### Test 2.2: Check CORS handling

**Steps:**
1. Open Network tab
2. Run the external image test above
3. Click on the `/api/image-proxy` request
4. Check the Response Headers

**Expected Results:**
- ✅ `Access-Control-Allow-Origin: *` header present
- ✅ `Cache-Control: public, max-age=86400` header present
- ✅ `Content-Type: image/png` or similar

---

### Test 2.3: Verify cache headers work

**Steps:**
1. Load the same external image twice
2. Check Network tab

**Expected Results:**
- ✅ First request: Full load from proxy
- ✅ Second request: Served from browser cache (or 304 Not Modified)
- ✅ Faster load time on second request

---

## Test 7.3: Error Scenarios

### Test 3.1: Missing imageUrl

```javascript
// Test missing imageUrl
const testMissingUrl = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  const texture = await loader.loadTexture({
    imageUrl: '',
    fallbackData: {
      name: 'No URL Card',
      category: 'CHARACTER',
      power: 1500,
      cost: 2,
    },
  });
  
  console.log('Missing URL handled:', texture);
  console.log('Is placeholder:', texture.image instanceof HTMLCanvasElement);
};

testMissingUrl();
```

**Expected Results:**
- ✅ Placeholder is generated
- ✅ Console shows "Card image fallback" with reason "MISSING_URL"
- ✅ No errors thrown

---

### Test 3.2: Invalid URLs

```javascript
// Test invalid URLs
const testInvalidUrls = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  const invalidUrls = [
    'not-a-url',
    'ftp://invalid-protocol.com/image.png',
    '://malformed',
  ];
  
  for (const url of invalidUrls) {
    console.log(`Testing invalid URL: ${url}`);
    const texture = await loader.loadTexture({
      imageUrl: url,
      fallbackData: {
        name: 'Invalid URL Test',
        category: 'CHARACTER',
        power: 1000,
        cost: 1,
      },
    });
    console.log('Result:', texture.image instanceof HTMLCanvasElement ? 'Placeholder' : 'Image');
  }
};

testInvalidUrls();
```

**Expected Results:**
- ✅ All invalid URLs fall back to placeholder
- ✅ Console shows appropriate error messages
- ✅ No crashes or unhandled errors

---

### Test 3.3: Network failures

**Steps:**
1. Open DevTools Network tab
2. Enable "Offline" mode
3. Run the external image test
4. Disable "Offline" mode

**Expected Results:**
- ✅ Placeholder is shown when offline
- ✅ Console shows network error
- ✅ Game continues to function
- ✅ Images load when back online

---

### Test 3.4: Timeout scenarios

```javascript
// Test timeout handling
const testTimeout = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  console.log('Testing timeout (will take 5+ seconds)...');
  
  // Use a slow-loading external URL
  const texture = await loader.loadTexture({
    imageUrl: 'https://httpstat.us/200?sleep=10000',
    fallbackData: {
      name: 'Timeout Test',
      category: 'CHARACTER',
      power: 2500,
      cost: 4,
    },
  });
  
  console.log('Timeout handled:', texture);
};

testTimeout();
```

**Expected Results:**
- ✅ Request times out after 5 seconds
- ✅ Console shows "Image load timeout" message
- ✅ Placeholder is generated
- ✅ No hanging requests

---

## Test 7.4: Performance Testing

### Test 4.1: Load game with 50+ cards

**Steps:**
1. Start a new game
2. Open Performance tab in DevTools
3. Start recording
4. Let the game load all cards
5. Stop recording

**Expected Results:**
- ✅ All cards load within 30 seconds
- ✅ No frame drops or stuttering
- ✅ Memory usage stays reasonable (< 500MB)
- ✅ No memory leaks over time

---

### Test 4.2: Verify cache effectiveness

```javascript
// Test cache performance
const testCachePerformance = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  const imageUrl = '/cards/OP01-001.png';
  const fallbackData = {
    name: 'Cache Test',
    category: 'LEADER',
    power: 5000,
    cost: 0,
  };
  
  // First load
  console.time('First load');
  await loader.loadTexture({ imageUrl, fallbackData });
  console.timeEnd('First load');
  
  // Second load (should be cached)
  console.time('Cached load');
  await loader.loadTexture({ imageUrl, fallbackData });
  console.timeEnd('Cached load');
  
  console.log('Cache size:', loader.cache?.size);
};

testCachePerformance();
```

**Expected Results:**
- ✅ First load: 50-200ms
- ✅ Cached load: < 5ms
- ✅ Significant performance improvement
- ✅ Cache size increases

---

### Test 4.3: Monitor memory usage

**Steps:**
1. Open Memory tab in DevTools
2. Take a heap snapshot
3. Load a game with many cards
4. Take another heap snapshot
5. Compare the two snapshots

**Expected Results:**
- ✅ Memory increases proportionally to cards loaded
- ✅ No detached DOM nodes
- ✅ Textures are properly disposed when cards are removed
- ✅ Cache doesn't grow unbounded (max 100 textures)

---

### Test 4.4: Check for memory leaks

```javascript
// Test memory leak prevention
const testMemoryLeaks = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  console.log('Testing memory leaks (10 iterations)...');
  
  for (let i = 0; i < 10; i++) {
    const texture = await loader.loadTexture({
      imageUrl: '/cards/OP01-002.png',
      fallbackData: {
        name: 'Memory Test',
        category: 'CHARACTER',
        power: 3000,
        cost: 3,
      },
    });
    
    // Release texture
    loader.releaseTexture('/cards/OP01-002.png');
    
    console.log(`Iteration ${i + 1} complete`);
  }
  
  console.log('Memory leak test complete');
  console.log('Cache size:', loader.cache?.size);
};

testMemoryLeaks();
```

**Expected Results:**
- ✅ All iterations complete without errors
- ✅ Cache size remains stable
- ✅ Memory doesn't grow unbounded
- ✅ No warnings about memory leaks

---

### Test 4.5: Concurrent loads

```javascript
// Test concurrent loading
const testConcurrentLoads = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  console.log('Testing concurrent loads...');
  
  const imageUrl = '/cards/OP01-003.png';
  const fallbackData = {
    name: 'Concurrent Test',
    category: 'CHARACTER',
    power: 2000,
    cost: 2,
  };
  
  // Start 10 concurrent loads
  const promises = Array.from({ length: 10 }, () =>
    loader.loadTexture({ imageUrl, fallbackData })
  );
  
  const results = await Promise.all(promises);
  
  console.log('All loads complete');
  console.log('Unique textures:', new Set(results).size);
  console.log('Expected: 1 (all should be the same cached texture)');
};

testConcurrentLoads();
```

**Expected Results:**
- ✅ All loads complete successfully
- ✅ Only 1 network request made
- ✅ All results reference the same cached texture
- ✅ No race conditions or errors

---

## Integration Test: CardMesh Workflow

```javascript
// Test complete CardMesh workflow
const testCardMeshWorkflow = async () => {
  const { CardImageLoader } = await import('/lib/game-engine/rendering/CardImageLoader.ts');
  const loader = CardImageLoader.getInstance();
  
  console.log('Simulating CardMesh lifecycle...');
  
  // Mount: Load texture
  console.log('1. Mounting CardMesh...');
  const texture = await loader.loadTexture({
    imageUrl: '/cards/OP01-001.png',
    fallbackData: {
      name: 'Luffy',
      category: 'LEADER',
      power: 5000,
      cost: 0,
    },
  });
  console.log('Texture loaded:', texture);
  
  // Use: Render with texture
  console.log('2. Using texture in rendering...');
  console.log('Image ready:', texture.image !== null);
  
  // Unmount: Release texture
  console.log('3. Unmounting CardMesh...');
  loader.releaseTexture('/cards/OP01-001.png');
  
  // Verify cache
  console.log('4. Checking cache...');
  const cached = loader.getCachedTexture('/cards/OP01-001.png');
  console.log('Texture still in cache:', cached !== null);
  
  console.log('CardMesh workflow test complete ✅');
};

testCardMeshWorkflow();
```

**Expected Results:**
- ✅ Texture loads successfully
- ✅ Image is ready for rendering
- ✅ Texture is released on unmount
- ✅ Texture remains in cache for reuse

---

## Summary Checklist

After completing all manual tests, verify:

- [ ] Local images load from /cards/ directory
- [ ] Missing images show placeholders
- [ ] External images route through proxy
- [ ] CORS headers are present
- [ ] Cache headers work correctly
- [ ] Missing imageUrl handled gracefully
- [ ] Invalid URLs fall back to placeholder
- [ ] Network failures don't crash the game
- [ ] Timeouts are handled properly
- [ ] 50+ cards load efficiently
- [ ] Cache improves performance
- [ ] No memory leaks detected
- [ ] Concurrent loads work correctly
- [ ] CardMesh lifecycle works as expected

---

## Troubleshooting

### Images not loading
- Check Network tab for 404 errors
- Verify image files exist in public/cards/
- Check console for error messages

### Placeholders not showing
- Verify PlaceholderGenerator is working
- Check for canvas context errors
- Look for fallback warnings in console

### Performance issues
- Check cache size (should be < 100)
- Monitor memory usage
- Look for memory leaks
- Verify LRU eviction is working

### Proxy not working
- Check /api/image-proxy route exists
- Verify CORS headers are set
- Test proxy endpoint directly

---

**Note**: All tests should be performed in a modern browser (Chrome, Firefox, Safari, Edge) with JavaScript enabled and DevTools open for monitoring.
