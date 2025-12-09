# Task 8: Manual Testing Instructions

## Overview

All code fixes have been implemented (Tasks 1-7). Task 8 requires manual browser testing to verify that cards display actual images instead of blank colored rectangles.

## Quick Start

1. **Open your browser** (Chrome, Edge, or Firefox)
2. **Navigate to:** http://localhost:3000/game
3. **Open DevTools:** Press F12 or right-click → Inspect
4. **Go to Console tab**
5. **Observe the game board and console logs**

## What to Look For

### ✅ SUCCESS INDICATORS

**Visual:**
- Cards in your hand show actual card artwork
- Leader card shows actual card artwork
- Cards in character area show actual card artwork
- Cards in deck show card backs (face-down)
- NO blank colored rectangles

**Console Logs (with emoji prefixes):**
```
🖼️ CardMesh: Loading texture
✅ CardMesh: Texture loaded successfully
🔧 CardMesh: Manually updating material.map
✅ CardMesh: Material.map updated and needsUpdate set
🎯 Task 6: showFaceUp calculation
🔍 Task 6: Texture application verification
```

### ❌ FAILURE INDICATORS

**Visual:**
- Cards appear as blank colored rectangles
- Cards show placeholder text instead of images
- Cards don't render at all

**Console Errors:**
```
❌ CardMesh: Texture load failed
❌ CardImageLoader: Load failed
❌ Image Proxy: Fetch failed
⚠️ Task 6: Texture missing but card should be face-up
```

## Detailed Test Checklist

### Test 1: Basic Image Display
- [ ] Open http://localhost:3000/game
- [ ] Wait for game to load (5-10 seconds)
- [ ] Check if cards in hand show actual images
- [ ] Check if leader card shows actual image
- [ ] Check if deck cards show card backs

**If cards show images:** ✅ Test PASSED - Continue to Test 2
**If cards are blank:** ❌ Test FAILED - Check console for errors

### Test 2: Console Log Verification
- [ ] Open DevTools Console (F12)
- [ ] Look for 🖼️ emoji logs (texture loading)
- [ ] Look for ✅ emoji logs (successful loads)
- [ ] Count how many cards loaded successfully
- [ ] Check for any ❌ emoji logs (errors)

**Expected:** Multiple successful texture loads, no errors
**If errors found:** Note the error messages and card names

### Test 3: External URL Proxy Test
- [ ] In console, look for logs with "isExternal: true"
- [ ] Look for logs with "isProxied: true"
- [ ] Check Network tab for `/api/image-proxy` requests
- [ ] Verify proxy requests return 200 status

**Expected:** External URLs routed through proxy, no CORS errors

### Test 4: Cache Verification
- [ ] In console, look for "💾 Cache hit" logs
- [ ] Count cache hits vs cache misses
- [ ] Verify duplicate cards show cache hits

**Expected:** High cache hit rate (>80%) for duplicate cards

### Test 5: Performance Check
- [ ] Note the time from page load to images displayed
- [ ] Check if rendering is smooth (no lag)
- [ ] Open DevTools Performance tab
- [ ] Check memory usage (should be < 500MB)

**Expected:** Images load within 2-5 seconds, smooth 60 FPS

## Troubleshooting

### Problem: Cards are blank colored rectangles

**Possible Causes:**
1. Textures not loading
2. Textures not being applied to materials
3. Material configuration issue

**Debug Steps:**
1. Check console for 🖼️ logs - Are textures being requested?
2. Check console for ✅ logs - Are textures loading successfully?
3. Check console for 🔧 logs - Are textures being applied to materials?
4. Check console for ⚠️ warnings - Are there any unexpected states?

### Problem: Console shows "Texture load failed"

**Possible Causes:**
1. Image URL is invalid
2. Network error
3. CORS issue (external URLs)

**Debug Steps:**
1. Check the imageUrl in the error log
2. Try opening the URL directly in browser
3. Check if it's an external URL (should use proxy)
4. Check Network tab for failed requests

### Problem: Console shows "Texture missing but card should be face-up"

**Possible Causes:**
1. Texture loading is slow
2. Texture failed to load
3. State synchronization issue

**Debug Steps:**
1. Wait a few more seconds for textures to load
2. Check if error persists after waiting
3. Check Network tab for pending requests
4. Refresh the page and try again

## Reporting Results

### If Tests PASS ✅

**Document:**
1. Take a screenshot of the game board showing card images
2. Copy a sample of console logs showing successful loads
3. Note the approximate load time
4. Note any warnings (even if images display)

**Report:**
- "All tests passed! Cards display actual images."
- Include screenshot
- Include console log sample
- Note any minor issues or warnings

### If Tests FAIL ❌

**Document:**
1. Take a screenshot of the blank cards
2. Copy ALL console errors
3. Copy a sample of console logs (even successful ones)
4. Note which test failed

**Report:**
- "Test X failed: [description]"
- Include screenshot
- Include full console output
- Include specific error messages
- Note which cards are affected

## Expected Console Output Sample

Here's what successful console output should look like:

```
🎮 Starting game initialization...
✅ Rules loaded
✅ Loaded 109 cards from set OP01
🖼️ CardMesh: Loading texture {
  cardId: "card-123",
  cardName: "Monkey D. Luffy",
  imageUrl: "https://onepiece-cardgame.dev/images/cards/OP01-001_f413e3_jp.jpg",
  zone: 1
}
📥 CardImageLoader: Load request {
  imageUrl: "https://...",
  isExternal: true
}
🔗 CardImageLoader: URL routing {
  originalUrl: "https://...",
  loadUrl: "/api/image-proxy?url=...",
  isProxied: true
}
🌐 Image Proxy: Request received { url: "https://..." }
✅ Image Proxy: Fetch successful { status: 200, contentType: "image/jpeg" }
✅ CardImageLoader: Texture loaded successfully {
  textureValid: true,
  textureUuid: "abc-123",
  textureImageSize: "512x716"
}
✅ CardMesh: Texture loaded successfully {
  cardName: "Monkey D. Luffy",
  textureValid: true
}
🎯 Task 6: showFaceUp calculation {
  zone: 1,
  zoneName: "HAND",
  isFaceUpZone: true
}
🔧 Task 6: Material update conditions check {
  materialRefExists: true,
  cardTextureExists: true,
  showFaceUp: true,
  allConditionsMet: true
}
🔧 CardMesh: Manually updating material.map {
  textureUuid: "abc-123"
}
✅ CardMesh: Material.map updated and needsUpdate set {
  newMapUuid: "abc-123",
  needsUpdate: true
}
```

## Next Steps After Testing

### If All Tests Pass
1. Mark Task 8 as complete
2. Proceed to Task 9 (Performance verification)
3. Consider Task 10 (Clean up diagnostic logging)

### If Tests Fail
1. Document the failure in detail
2. Analyze console logs to identify the issue
3. Review the specific component that's failing
4. Implement additional fixes as needed
5. Re-test after fixes

## Questions to Answer

After testing, please answer these questions:

1. **Do cards display actual images?** Yes / No
2. **Are there any console errors?** Yes / No
3. **Do external URLs work through proxy?** Yes / No / Unknown
4. **Do local URLs work directly?** Yes / No / Unknown
5. **Is cache working (duplicate cards)?** Yes / No / Unknown
6. **What is the approximate load time?** ___ seconds
7. **Is rendering smooth (60 FPS)?** Yes / No
8. **Are there any warnings in console?** Yes / No

## Contact

If you encounter any issues or have questions during testing, please provide:
- Screenshot of the game board
- Full console output (copy/paste)
- Description of what you expected vs what you saw
- Browser and version you're using

---

**Ready to test?** Open http://localhost:3000/game and follow the checklist above!
