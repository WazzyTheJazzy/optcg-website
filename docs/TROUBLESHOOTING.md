# Troubleshooting - Changes Not Showing

## Issue
Code changes aren't appearing in the browser even after saving files.

## Common Causes

### 1. Browser Cache
**Problem:** Browser is using old cached JavaScript files

**Solution:**
- **Hard Refresh:**
  - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
  - Mac: `Cmd + Shift + R`
- **Or Clear Cache:**
  - Open DevTools (F12)
  - Right-click refresh button
  - Select "Empty Cache and Hard Reload"

### 2. Dev Server Not Recompiling
**Problem:** Next.js dev server didn't detect the file change

**Solution:**
1. Stop the dev server (`Ctrl + C`)
2. Clear the build cache:
   ```bash
   Remove-Item -Path .next -Recurse -Force
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```

### 3. TypeScript Not Compiling
**Problem:** TypeScript errors preventing compilation

**Solution:**
- Check terminal for compilation errors
- Look for red error messages
- Fix any TypeScript errors shown

### 4. Hot Module Replacement (HMR) Failed
**Problem:** HMR got confused and stopped updating

**Solution:**
- Full page refresh (F5)
- Or restart dev server

## How to Verify Changes Are Applied

### Check Console Logs
Open browser console (F12) and look for these logs when clicking "Next Phase":

```
🔄 Advancing from DRAW to DON
✅ Transitioned to DON
⚙️ Executing DON phase logic
✅ DON phase executed
📊 After phase advance: {phase: "DON", ...}
```

When reaching MAIN phase, you should see:
```
🔄 Advancing from DON to MAIN
✅ Transitioned to MAIN
⏸️ MAIN phase - waiting for player actions (not auto-executing)
📊 After phase advance: {phase: "MAIN", ...}
```

### Check Phase Display
The UI should show:
- Current phase name at top center
- "✓ You can play cards now!" when in MAIN phase
- Hand count should increase after DRAW phase

### Check Hand Cards
- After DRAW phase: Hand count should increase by 1
- Cards should be visible in hand zone
- You should be able to drag them

## Step-by-Step Debugging

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Hard refresh** the page (`Ctrl + Shift + R`)
4. **Click "Next Phase"** button
5. **Watch console** for log messages
6. **Check phase display** at top of screen

## What Should Happen

### REFRESH → DRAW
- Console: "Executing DRAW phase logic"
- Result: 1 card added to hand
- Hand count increases

### DRAW → DON  
- Console: "Executing DON phase logic"
- Result: DON cards added to cost area
- DON count increases

### DON → MAIN
- Console: "MAIN phase - waiting for player actions"
- Result: Phase stays at MAIN
- UI shows "✓ You can play cards now!"
- **You can drag cards**

### MAIN → END
- Console: "Executing END phase logic"
- Result: Turn ends
- Switches to opponent

## Still Not Working?

### Nuclear Option - Complete Reset

```bash
# Stop dev server (Ctrl + C)

# Clear everything
Remove-Item -Path .next -Recurse -Force
Remove-Item -Path node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue

# Restart
npm run dev
```

Then in browser:
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage"
4. Click "Clear site data"
5. Close and reopen browser
6. Visit `http://localhost:3000/game`

## Check These Files

Make sure these changes are present:

### lib/game-engine/core/GameEngine.ts
Look for this code around line 310:
```typescript
if (nextPhase !== Phase.MAIN) {
  this.stateManager = this.phaseManager['executePhase'](this.stateManager, nextPhase);
}
```

### components/game/GameBoard.tsx
Look for this code around line 340:
```typescript
onClick={() => {
  try {
    console.log('Advancing to next phase...');
    engine.advancePhase();
```

## Contact Points

If still having issues, check:
1. Terminal - any error messages?
2. Browser console - any errors?
3. Network tab - are files loading?
4. Is dev server running on correct port (3000)?

## Quick Test

Run this in browser console:
```javascript
console.log('Test log - if you see this, console is working');
```

If you don't see it, DevTools might not be open or console might be filtered.
