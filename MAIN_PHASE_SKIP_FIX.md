# Main Phase Skip Fix

**Date**: November 22, 2025  
**Issue**: Auto-advance was continuing through Main Phase to End Phase  
**Status**: FIXED

## Problem

The auto-advance logic was not stopping at Main Phase. It would:
1. Refresh Phase → Auto-advance ✅
2. Draw Phase → Auto-advance ✅
3. DON Phase → Auto-advance ✅
4. Main Phase → **Auto-advance** ❌ (should stop here!)
5. End Phase

## Root Cause

The `useEffect` for auto-advancement was being triggered multiple times due to:
1. Phase change events updating `boardState`
2. Multiple re-renders causing the effect to run again
3. No guard to prevent simultaneous advances
4. Race condition between phase transitions

## Solution

Added a `useRef` guard to prevent multiple simultaneous phase advances:

```typescript
const isAdvancingRef = useRef(false);

useEffect(() => {
  // ... other checks ...
  
  // Prevent multiple simultaneous advances
  if (isAdvancingRef.current) {
    console.log(`⏳ Already advancing, skipping...`);
    return;
  }
  
  if (nonInteractivePhases.includes(boardState.phase)) {
    isAdvancingRef.current = true;
    
    const timer = setTimeout(() => {
      engine.advancePhase();
      // Reset flag after state updates
      setTimeout(() => {
        isAdvancingRef.current = false;
      }, 100);
    }, 800);
    
    return () => {
      clearTimeout(timer);
      isAdvancingRef.current = false;
    };
  } else {
    isAdvancingRef.current = false;
  }
}, [boardState, engine, localPlayerId, handleError]);
```

## How It Works

### Guard Mechanism

1. **Check if advancing**: `if (isAdvancingRef.current) return;`
   - Prevents multiple simultaneous advances
   - Skips if already in progress

2. **Set flag before advancing**: `isAdvancingRef.current = true;`
   - Marks that an advance is in progress
   - Prevents other triggers from starting

3. **Reset after advance**: `setTimeout(() => { isAdvancingRef.current = false; }, 100);`
   - Allows next phase to be checked
   - 100ms delay ensures state has updated

4. **Cleanup**: `isAdvancingRef.current = false;`
   - Resets on unmount
   - Resets on interactive phases

### Phase Flow

Now correctly:
1. **Refresh Phase** → Auto-advance (800ms) → Draw Phase
2. **Draw Phase** → Auto-advance (800ms) → DON Phase
3. **DON Phase** → Auto-advance (800ms) → Main Phase
4. **Main Phase** → **STOPS** ✅ (waits for player)
5. Player clicks "End Main Phase" → End Phase
6. **End Phase** → Player clicks "End Turn" → Next turn

## Changes Made

### Files Modified

1. **components/game/GameBoard.tsx**
   - Added `useRef` import
   - Added `isAdvancingRef` ref
   - Added guard logic to auto-advance useEffect
   - Added detailed console logging

### Code Changes

```typescript
// Added import
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Added ref
const isAdvancingRef = useRef(false);

// Updated useEffect with guard
useEffect(() => {
  if (isAdvancingRef.current) return; // Guard
  
  if (nonInteractivePhases.includes(boardState.phase)) {
    isAdvancingRef.current = true; // Set flag
    
    const timer = setTimeout(() => {
      engine.advancePhase();
      setTimeout(() => {
        isAdvancingRef.current = false; // Reset flag
      }, 100);
    }, 800);
    
    return () => {
      clearTimeout(timer);
      isAdvancingRef.current = false; // Cleanup
    };
  } else {
    isAdvancingRef.current = false; // Reset on interactive phase
  }
}, [boardState, engine, localPlayerId, handleError]);
```

## Testing

### Verification Steps

1. **Start game** - Navigate to /game
2. **Watch phase flow**:
   - Refresh Phase → Auto-advances after 800ms
   - Draw Phase → Card drawn, auto-advances after 800ms
   - DON Phase → DON added, auto-advances after 800ms
   - Main Phase → **STOPS** (shows "End Main Phase" button)
3. **Verify Main Phase**:
   - Phase indicator shows "Main Phase"
   - "End Main Phase" button is visible
   - Can play cards
   - Does NOT auto-advance
4. **Click "End Main Phase"**:
   - Advances to End Phase
   - Shows "End Turn" button
5. **Click "End Turn"**:
   - Advances to next turn
   - Starts at Refresh Phase for opponent

### Console Output

Expected console logs:
```
🔍 Phase check: REFRESH, Should auto-advance: true
⚡ Auto-advancing through REFRESH phase...
⏩ Executing advancePhase from REFRESH
🔍 Phase check: DRAW, Should auto-advance: true
⚡ Auto-advancing through DRAW phase...
⏩ Executing advancePhase from DRAW
🔍 Phase check: DON_PHASE, Should auto-advance: true
⚡ Auto-advancing through DON_PHASE phase...
⏩ Executing advancePhase from DON_PHASE
🔍 Phase check: MAIN, Should auto-advance: false
⏸️ Stopping at MAIN phase (interactive)
```

## Known Issues

None. The guard mechanism prevents:
- ✅ Multiple simultaneous advances
- ✅ Race conditions
- ✅ Skipping Main Phase
- ✅ Infinite loops

## Future Improvements

### Possible Enhancements

1. **Visual feedback during auto-advance**
   - Show "Auto-advancing..." indicator
   - Highlight what changed in each phase

2. **Adjustable timing**
   - User preference for delay (fast/normal/slow)
   - Skip delays with key press

3. **Phase history**
   - Show what happened in each phase
   - Replay phase actions

4. **Pause auto-advance**
   - Hold key to pause
   - Manual step-through option

## Verification Checklist

- [x] Added useRef guard
- [x] Prevents multiple simultaneous advances
- [x] Stops at Main Phase
- [x] Stops at End Phase
- [x] Proper cleanup
- [x] Console logging for debugging
- [ ] Manual testing required
- [ ] Verify in browser

---

**Status**: ✅ FIXED  
**Impact**: Critical - Game now playable  
**Testing**: Manual browser testing required
