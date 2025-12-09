# Rendering Interface Stale State Fix

## Issue
Cards appeared on board then snapped back to hand because RenderingInterface was reading stale state.

## Root Cause (Found via Console Logs)
```
🔄 ZoneManager.moveCard: Moving Card OP01-013 (Alt) from HAND to CHARACTER_AREA
✅ ZoneManager.moveCard: State updated, card now in CHARACTER_AREA
📝 ZoneManager.moveCard: State manager reference updated
📢 ZoneManager.moveCard: Emitting CARD_MOVED event
🔔 GameBoard.updateBoardState: Event triggered, fetching new board state
🎮 GameBoard: Board state fetched: {p1CharacterArea: 0, ...}  <-- WRONG!
```

Even though ZoneManager updated its state, the RenderingInterface showed 0 cards in character area.

**The Problem**: RenderingInterface maintained its own copy of GameStateManager that was never updated when the engine's state changed.

## Solution
Changed RenderingInterface to read directly from the GameEngine instead of maintaining a stale copy.

### Changes Made

**lib/game-engine/rendering/RenderingInterface.ts**
- Removed `private stateManager: GameStateManager` property
- Added `private engine: GameEngine` property
- Added `getStateManager()` helper that reads fresh state from engine
- Replaced all `this.stateManager` with `this.getStateManager()`
- Removed event listener that tried to update stale copy

**lib/game-engine/core/GameEngine.ts**
- Added comment noting RenderingInterface reads directly from engine

## Impact
- RenderingInterface always reads current state
- No more stale state copies
- Cards stay where they're played
- UI correctly reflects all state changes immediately
