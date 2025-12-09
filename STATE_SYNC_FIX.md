# State Synchronization Fix

## Problem
Cards played to the character area were not appearing on the board because the rendering system was reading stale state.

## Root Cause Analysis

### Issue 1: State Manager Cloning
- `RenderingInterface.getStateManager()` was creating NEW `GameStateManager` instances
- `GameStateManager` constructor deep clones the state
- This created snapshots of state from BEFORE updates were applied

### Issue 2: Event Timing
Even after fixing the cloning issue, there was still a timing problem:

1. `ZoneManager.moveCard()` updates its internal StateManager
2. `ZoneManager.moveCard()` emits `CARD_MOVED` event
3. GameBoard receives event and calls `getBoardState()`
4. `getBoardState()` reads from `GameEngine.getStateManager()`
5. **But GameEngine's StateManager hasn't been updated yet!**
6. GameEngine only updates its StateManager AFTER `handlePlayCard` returns

The event was emitted too early - before the GameEngine had a chance to update its state.

## The Solution

### Part 1: Direct StateManager Access
Changed `RenderingInterface` to use the engine's actual StateManager instead of creating copies:

```typescript
// lib/game-engine/core/GameEngine.ts
getStateManager(): GameStateManager {
  return this.stateManager;  // Direct reference
}

// lib/game-engine/rendering/RenderingInterface.ts
private getStateManager(): GameStateManager {
  return this.engine.getStateManager();  // No more cloning
}
```

### Part 2: Deferred State Change Event
Added a new `STATE_CHANGED` event that's emitted AFTER GameEngine updates its state:

```typescript
// In GameEngine.playCard():
this.stateManager = playResult.newState;  // Update state FIRST
this.updateAllSubsystems();               // Update subsystems
this.eventEmitter.emit({                  // THEN emit event
  type: GameEventType.STATE_CHANGED,
  timestamp: Date.now(),
});
```

### Part 3: Subscribe to STATE_CHANGED
Updated GameBoard to listen for the new event:

```typescript
renderingInterface.onStateChanged(updateBoardState);
```

## Event Flow (After Fix)

1. User plays a card
2. `GameEngine.playCard()` calls `handlePlayCard()`
3. `handlePlayCard()` calls `zoneManager.moveCard()`
4. `zoneManager.moveCard()` updates ZoneManager's StateManager and emits `CARD_MOVED`
5. `handlePlayCard()` returns new StateManager
6. **GameEngine updates its StateManager**: `this.stateManager = playResult.newState`
7. **GameEngine updates subsystems**: `this.updateAllSubsystems()`
8. **GameEngine emits STATE_CHANGED event**
9. GameBoard receives `STATE_CHANGED` and calls `getBoardState()`
10. `getBoardState()` reads from GameEngine's StateManager (which is now updated)
11. Card appears on the board!

## Files Changed

1. `lib/game-engine/core/types.ts` - Added `STATE_CHANGED` event type
2. `lib/game-engine/rendering/EventEmitter.ts` - Added `StateChangedEvent` interface
3. `lib/game-engine/core/GameEngine.ts`:
   - Added `getStateManager()` method
   - Emit `STATE_CHANGED` after state updates
4. `lib/game-engine/rendering/RenderingInterface.ts`:
   - Use engine's StateManager directly
   - Added `onStateChanged()` subscription method
5. `components/game/GameBoard.tsx` - Subscribe to `STATE_CHANGED` events

## Testing
1. Start a game
2. Play a character card from hand
3. Verify the card appears immediately in the character area
4. Check console logs to see the state synchronization working

The card should now appear immediately with the correct state.
