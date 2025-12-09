# Card Rendering State Fix

## Problem
Cards played to the character area were not appearing on the board, even though the game engine confirmed they were played successfully.

## Root Cause
The issue was in how `RenderingInterface` accessed the game state:

1. **State Cloning**: Every time `RenderingInterface.getStateManager()` was called, it created a NEW `GameStateManager` with:
   ```typescript
   new GameStateManager(this.engine.getState())
   ```

2. **Deep Clone in Constructor**: The `GameStateManager` constructor deep clones the state:
   ```typescript
   constructor(initialState: GameState) {
     this.state = this.deepClone(initialState);
   }
   ```

3. **Multiple Calls**: Methods like `getBoardState()` called `getStateManager()` multiple times:
   - Once in `getBoardState()`
   - Once in `getPlayerVisualState()`  
   - Once in each `getZoneContents()` call
   
4. **Stale Snapshots**: Each new StateManager got a snapshot of the state from BEFORE the card was moved, because:
   - ZoneManager updated the engine's StateManager
   - RenderingInterface created a NEW StateManager with a deep clone
   - The clone captured the state before the update

## The Fix

### 1. Expose StateManager from GameEngine
Added a method to get the actual StateManager (not a copy):

```typescript
// lib/game-engine/core/GameEngine.ts
getStateManager(): GameStateManager {
  return this.stateManager;
}
```

### 2. Use Engine's StateManager Directly
Changed RenderingInterface to use the engine's StateManager:

```typescript
// lib/game-engine/rendering/RenderingInterface.ts
private getStateManager(): GameStateManager {
  return this.engine.getStateManager();  // Direct reference, not a copy
}
```

### 3. Reuse StateManager Across Method Calls
Updated methods to accept an optional StateManager parameter to avoid multiple calls:

```typescript
getBoardState(): BoardVisualState {
  const stateManager = this.getStateManager();  // Get once
  return {
    player1: this.getPlayerVisualState(PlayerId.PLAYER_1, stateManager),  // Reuse
    player2: this.getPlayerVisualState(PlayerId.PLAYER_2, stateManager),  // Reuse
    // ...
  };
}

private getPlayerVisualState(playerId: PlayerId, stateManager?: GameStateManager): PlayerVisualState {
  const sm = stateManager || this.getStateManager();
  // Use sm throughout...
}

getZoneContents(playerId: PlayerId, zone: ZoneId, stateManager?: GameStateManager): CardVisualState[] {
  const sm = stateManager || this.getStateManager();
  // Use sm throughout...
}
```

## Impact
- Cards now appear immediately when played
- No more stale state snapshots
- Rendering system sees updates in real-time
- Performance improvement (fewer deep clones)

## Testing
Test by:
1. Starting a game
2. Playing a character card from hand
3. Verify the card appears in the character area on the board

The card should now appear immediately after being played.
