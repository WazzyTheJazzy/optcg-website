# Manual Testing Guide - Card Image Rendering Diagnostic

## Purpose
This guide will help you manually test the card image rendering and capture diagnostic logs to identify the root cause of the blank card issue.

## Prerequisites
- Development server running on http://localhost:3000
- Modern web browser (Chrome, Firefox, or Edge recommended)
- Browser DevTools available

## Testing Steps

### 1. Open the Game Page

1. Open your web browser
2. Navigate to: `http://localhost:3000/game`
3. Wait for the page to fully load

### 2. Open Browser DevTools

**Chrome/Edge:**
- Press `F12` or `Ctrl+Shift+I` (Windows)
- Or right-click anywhere and select "Inspect"

**Firefox:**
- Press `F12` or `Ctrl+Shift+I` (Windows)
- Or right-click anywhere and select "Inspect Element"

### 3. Navigate to Console Tab

1. Click on the "Console" tab in DevTools
2. Clear any existing logs by clicking the 🚫 clear button
3. Refresh the page (`F5` or `Ctrl+R`)

### 4. Look for Diagnostic Logs

Search for logs with these emoji prefixes:

#### CardMesh Logs (Expected)
- 🖼️ `CardMesh: Loading texture` - Initial texture load request
- ✅ `CardMesh: Texture loaded successfully` - Successful load
- ❌ `CardMesh: Texture load failed` - Load failure
- 🎨 `CardMesh: Applying texture to material` - Material application

#### CardImageLoader Logs (Expected)
- 📥 `CardImageLoader: Load request` - Load request received
- 💾 `CardImageLoader: Cache hit` - Texture found in cache
- 🔗 `CardImageLoader: URL routing` - URL routing decision
- ✅ `CardImageLoader: Texture loaded successfully` - Successful load
- ❌ `CardImageLoader: Load failed` - Load failure

#### Image Proxy Logs (Expected for external URLs)
- 🌐 `Image Proxy: Request received` - Proxy request
- ✅ `Image Proxy: Fetch successful` - Successful fetch
- ❌ `Image Proxy: Fetch failed` - Fetch failure

### 5. Check for Errors

Look for any red error messages in the console. Common errors to look for:
- CORS errors
- Network errors
- JavaScript errors
- Three.js errors
- React errors

### 6. Inspect Network Tab

1. Click on the "Network" tab in DevTools
2. Filter by "Img" to see image requests
3. Look for:
   - Image requests to `/api/image-proxy`
   - Image requests to external URLs
   - Failed requests (red status codes)
   - CORS errors

### 7. Inspect 3D Scene

1. Check if the canvas element is visible on the page
2. Look for colored rectangles where cards should be
3. Try to interact with the game (if possible)

### 8. Use React DevTools (Optional)

If you have React DevTools installed:
1. Click on the "Components" tab
2. Search for "CardMesh" components
3. Inspect their props:
   - Check `cardState.metadata.imageUrl`
   - Check `cardTexture` state
   - Check `isLoading` state
   - Check `loadError` state

### 9. Run Diagnostic Script

Copy and paste this script into the browser console:

```javascript
// Diagnostic script to check game state and card data
console.log('=== DIAGNOSTIC SCRIPT START ===');

// Check if game engine is available
if (window.gameEngine) {
  console.log('✅ Game engine found');
  
  const state = window.gameEngine.getState();
  console.log('Game state:', {
    phase: state.phase,
    turnNumber: state.turnNumber,
    activePlayer: state.activePlayer,
  });
  
  // Check player 1 cards
  const p1Hand = state.zones.player1.hand;
  const p1Field = state.zones.player1.characterArea;
  const p1Leader = state.zones.player1.leaderArea;
  
  console.log('Player 1 cards:', {
    handCount: p1Hand.length,
    fieldCount: p1Field.length,
    hasLeader: !!p1Leader,
  });
  
  // Check if cards have imageUrl
  if (p1Hand.length > 0) {
    const sampleCard = p1Hand[0];
    console.log('Sample card from hand:', {
      id: sampleCard.id,
      name: sampleCard.definition.name,
      imageUrl: sampleCard.definition.imageUrl,
      hasImageUrl: !!sampleCard.definition.imageUrl,
    });
  }
  
  if (p1Leader) {
    console.log('Leader card:', {
      id: p1Leader.id,
      name: p1Leader.definition.name,
      imageUrl: p1Leader.definition.imageUrl,
      hasImageUrl: !!p1Leader.definition.imageUrl,
    });
  }
  
  // Count cards with/without imageUrl
  const allCards = [
    ...p1Hand,
    ...p1Field,
    ...(p1Leader ? [p1Leader] : []),
  ];
  
  const withImageUrl = allCards.filter(c => c.definition.imageUrl).length;
  const withoutImageUrl = allCards.filter(c => !c.definition.imageUrl).length;
  
  console.log('Image URL statistics:', {
    total: allCards.length,
    withImageUrl,
    withoutImageUrl,
  });
} else {
  console.log('❌ Game engine not found on window object');
}

console.log('=== DIAGNOSTIC SCRIPT END ===');
```

## Expected Results

### If Everything is Working
You should see:
- Multiple 🖼️ logs for each card being loaded
- ✅ logs showing successful texture loads
- Card images displayed on the 3D board
- No errors in console

### If CardMesh is Not Rendering
You will see:
- No 🖼️ logs at all
- Game initialization logs only
- Colored rectangles instead of card images
- No CardImageLoader logs

### If Textures are Not Loading
You will see:
- 🖼️ logs showing load attempts
- ❌ logs showing load failures
- Error messages about image loading
- Network errors in Network tab

### If Textures are Not Applying
You will see:
- 🖼️ logs showing load attempts
- ✅ logs showing successful loads
- But no 🎨 logs showing material application
- Colored rectangles instead of card images

## Capture Results

### Take Screenshots
1. Screenshot of the Console tab showing all logs
2. Screenshot of the Network tab showing image requests
3. Screenshot of the game page showing the visual state

### Copy Console Output
1. Right-click in the Console tab
2. Select "Save as..." or copy all text
3. Save to a file named `console-output-manual-test.txt`

### Document Findings
Create a file named `MANUAL_TEST_RESULTS.md` with:
- What you observed
- Which logs appeared
- Which logs were missing
- Any errors you saw
- Screenshots or console output

## Common Issues and Solutions

### Issue: No logs appear at all
**Possible Cause**: Console is filtered
**Solution**: Check console filter settings, ensure "All levels" is selected

### Issue: Logs appear but are hard to read
**Possible Cause**: Too many logs
**Solution**: Use console filter to search for emoji (🖼️, ✅, ❌, etc.)

### Issue: Page doesn't load
**Possible Cause**: Development server not running
**Solution**: Check that `npm run dev` is running in terminal

### Issue: White screen or error page
**Possible Cause**: JavaScript error preventing page load
**Solution**: Check console for errors, fix any critical errors first

## Next Steps

After completing this manual test:
1. Document your findings in `MANUAL_TEST_RESULTS.md`
2. Update `ROOT_CAUSE_ANALYSIS.md` with actual findings
3. Identify the specific point of failure in the pipeline
4. Implement targeted fix based on root cause
5. Re-test to verify fix

## Questions to Answer

Based on your testing, answer these questions:

1. **Are CardMesh components rendering?**
   - [ ] Yes - I see 🖼️ logs
   - [ ] No - No 🖼️ logs appear

2. **Do cards have imageUrl in their metadata?**
   - [ ] Yes - Diagnostic script shows imageUrl
   - [ ] No - imageUrl is missing or null

3. **Are textures loading successfully?**
   - [ ] Yes - I see ✅ logs
   - [ ] No - I see ❌ logs or no logs

4. **Are textures being applied to materials?**
   - [ ] Yes - I see 🎨 logs
   - [ ] No - No 🎨 logs appear

5. **Are there any errors in the console?**
   - [ ] Yes - Document the errors
   - [ ] No - No errors

6. **Are image requests appearing in Network tab?**
   - [ ] Yes - Images are being requested
   - [ ] No - No image requests

7. **What do the cards look like visually?**
   - [ ] Colored rectangles (no images)
   - [ ] Placeholder with text
   - [ ] Actual card images
   - [ ] Nothing (cards not visible)

## Contact

If you need help with this testing process, please provide:
- Screenshots of console output
- Copy of console logs
- Description of what you observed
- Answers to the questions above
