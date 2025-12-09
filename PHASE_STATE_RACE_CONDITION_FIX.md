# Phase State Race Condition Fix

## Issue Identified

The game engine had a **race condition** where the UI would display stale phase information during phase transitions.

### Root Cause

When advancing phases, the following sequence occurred:

1. `GameEngine.advancePhase()` calls `PhaseManager.transitionToPhase()`
2. `transitionToPhase()` immediately emits a `PHASE_CHANGED` event
3. Event listeners (like `GameBoard`) receive the event and call `renderingInterface.getBoardState()`
4. **Problem**: At this point, `GameEngine.stateManager` hasn't been updated yet with the new state
5. The UI reads the OLD state (e.g., REFRESH) even though the engine is transitioning to a new phase (e.g., DRAW)

### Evidence from Console Log

```
GameBoard.tsx:438 Advancing to next phase...
GameEngine.ts:312 🔄 Advancing from REFRESH (index 0) to DRAW (index 1)
GameBoard.tsx:70 🎮 GameBoard: Board state updated: {phase: 'REFRESH', ...}  <-- STALE!
GameEngine.ts:319 ✅ Transitioned to DRAW
```

The GameBoard received a state update showing `phase: 'REFRESH'` AFTER the engine had already started transitioning to DRAW.

## Solution

Modified the event emission pattern to ensure state is updated before events are emitted:

### Changes Made

1. **PhaseManager.ts**:
   - Removed immediate event emission from `transitionToPhase()`
   - Added new `emitPhaseChangedEvent()` method that can be called after state updates
   - Updated `runTurn()` to emit events after state transitions

2. **GameEngine.ts**:
   - Updated `advancePhase()` to:
     1. Transition to new phase (updates state)
     2. Update all subsystems with new state
     3. **Then** emit the phase changed event
   - This ensures listeners always read the correct, updated state

### Key Principle

**Events should only be emitted AFTER the state they describe has been fully applied and propagated.**

This prevents race conditions where event handlers read stale state.

## Testing

To verify the fix works:

1. Start a game
2. Click "Next Phase" button
3. Check console logs - the phase in the board state update should match the phase the engine transitioned to
4. The UI should display the correct current phase

Expected log sequence:
```
GameBoard.tsx:438 Advancing to next phase...
GameEngine.ts:312 🔄 Advancing from REFRESH to DRAW
GameEngine.ts:319 ✅ Transitioned to DRAW
GameBoard.tsx:70 🎮 GameBoard: Board state updated: {phase: 'DRAW', ...}  <-- CORRECT!
```

## Impact

This fix ensures:
- UI always displays the correct game phase
- No visual glitches or confusion about which phase the game is in
- Event-driven architecture works correctly with proper state synchronization
- Foundation for reliable multiplayer synchronization in the future
