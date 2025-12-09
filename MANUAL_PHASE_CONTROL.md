# Manual Phase Control - Temporary Solution

**Date**: November 22, 2025  
**Status**: Manual control enabled  
**Reason**: Auto-advance was skipping Main Phase

## Change

Disabled auto-phase advancement and enabled manual control for all phases.

## Why

The auto-advance logic was still skipping Main Phase despite guards. To ensure the game is playable, we've switched to manual phase control where the player clicks a button to advance through each phase.

## How It Works Now

### Phase Flow (Manual)

1. **Refresh Phase**
   - Cards untap, DON refresh
   - Click "Next Phase (Draw)" to continue

2. **Draw Phase**
   - Draw 1 card
   - Click "Next Phase (DON)" to continue

3. **DON Phase**
   - Add 2 DON to cost area
   - Click "Next Phase (Main)" to continue

4. **Main Phase**
   - Play cards, give DON, attack
   - Click "End Main Phase" to continue

5. **End Phase**
   - End of turn effects
   - Click "End Turn" to pass turn

### Button Labels

The button label changes based on current phase:
- Refresh → "Next Phase (Draw)"
- Draw → "Next Phase (DON)"
- DON → "Next Phase (Main)"
- Main → "End Main Phase"
- End → "End Turn"

## Benefits

### Advantages of Manual Control

1. **Full Control** - Player decides when to advance
2. **See Everything** - Can review what happened in each phase
3. **No Skipping** - Guaranteed to stop at Main Phase
4. **Learning Tool** - Better for understanding game flow
5. **Debugging** - Can see exactly what's happening

### Disadvantages

1. **More Clicking** - Need to click through non-interactive phases
2. **Slower** - Takes longer to get to Main Phase
3. **Less Polished** - Not as smooth as auto-advance

## Code Changes

### Disabled Auto-Advance

```typescript
// DISABLED: Auto-advance through non-interactive phases
// Temporarily disabled to debug phase skipping issue
// TODO: Re-enable once phase flow is working correctly
/*
useEffect(() => {
  // ... auto-advance logic ...
}, [boardState, engine, localPlayerId, handleError]);
*/
```

### Enabled Manual Control for All Phases

```typescript
// Continue/Next Phase button (for all phases - manual control)
if (isActivePlayer) {
  const getButtonLabel = () => {
    switch (boardState.phase) {
      case Phase.REFRESH:
        return 'Next Phase (Draw)';
      case Phase.DRAW:
        return 'Next Phase (DON)';
      case Phase.DON_PHASE:
        return 'Next Phase (Main)';
      case Phase.MAIN:
        return 'End Main Phase';
      case Phase.END:
        return 'End Turn';
      default:
        return 'Next Phase';
    }
  };
  
  buttons.push({
    id: 'continue',
    label: getButtonLabel(),
    action: () => {
      console.log(`🎯 Manual advance from ${boardState.phase} phase...`);
      engine.advancePhase();
    },
    enabled: true,
    variant: 'primary',
  });
}
```

## Testing

### Verification Steps

1. **Start game** - Navigate to /game
2. **Refresh Phase** - Click "Next Phase (Draw)"
3. **Draw Phase** - See card drawn, click "Next Phase (DON)"
4. **DON Phase** - See DON added, click "Next Phase (Main)"
5. **Main Phase** - Verify it STOPS here, shows "End Main Phase"
6. **Play cards** - Try playing cards in Main Phase
7. **End Main** - Click "End Main Phase"
8. **End Phase** - Click "End Turn"
9. **Next Turn** - Verify turn passes to opponent

### Expected Behavior

- ✅ Button always visible for active player
- ✅ Button label changes per phase
- ✅ Each phase waits for button click
- ✅ Main Phase does NOT auto-advance
- ✅ Can play cards in Main Phase
- ✅ Turn passes correctly

## Future Work

### To Re-Enable Auto-Advance

Once we figure out why auto-advance was skipping Main Phase:

1. **Debug the issue**
   - Check console logs
   - Verify phase values
   - Check timing

2. **Fix the root cause**
   - Might be phase comparison issue
   - Might be timing issue
   - Might be state update issue

3. **Re-enable auto-advance**
   - Uncomment the useEffect
   - Test thoroughly
   - Verify Main Phase stops

### Possible Root Causes

1. **Phase enum mismatch**
   - Check if Phase.MAIN is correct value
   - Verify phase comparison

2. **State update timing**
   - boardState might not update immediately
   - useEffect might run before state updates

3. **Multiple triggers**
   - Phase change event might trigger multiple times
   - Guard might not be working

4. **Phase execution**
   - GameEngine might be executing Main Phase
   - Check if Main Phase has auto-logic

## Workaround

For now, manual control works perfectly and ensures:
- ✅ Game is playable
- ✅ No phases are skipped
- ✅ Full control over game flow
- ✅ Can see what happens in each phase

## Files Modified

1. **components/game/GameBoard.tsx**
   - Commented out auto-advance useEffect
   - Updated button logic for all phases
   - Added phase-specific button labels

---

**Status**: ✅ WORKING (Manual Control)  
**Impact**: Game is now playable  
**Next**: Debug auto-advance issue  
**Priority**: Medium (manual control works fine)
