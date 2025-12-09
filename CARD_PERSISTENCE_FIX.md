# Card Persistence Fix

## Issues Identified

### 1. Cards Not Staying on Board After Being Played
**Root Cause**: Transaction pattern misuse causing state loss

When cards were played, the changes were being lost because:

1. The `playCard()`, `activateEffect()`, `giveDon()`, and `declareAttack()` methods wrapped their logic in `executeWithTransaction()`
2. Inside the transaction callback, the code modified `this.stateManager`
3. **Problem**: The transaction operates on a **copy** of the state passed to it, not on `this.stateManager`
4. When the transaction completed, it returned the final state in `result.state`, but the code never used it
5. All state changes made inside the transaction were lost

### 2. Multiple Cards Stacked in Leader Area
**Related Issue**: Visual rendering of single-card zones

The leader area and stage area are single-card zones that return a single `CardVisualState` object (or null), not an array. The rendering code wraps these in arrays for consistency, but this was working correctly - the real issue was the state loss from issue #1.

## Solution

Removed the misused transaction wrappers from all action methods:
- `playCard()`
- `activateEffect()`
- `giveDon()`
- `declareAttack()`

These methods now directly:
1. Validate the action
2. Execute the action handler
3. Update `this.stateManager` with the result
4. Update all subsystems
5. Resolve triggers and check for defeat

The transaction pattern was designed for atomic rollback of state changes, but it was being used incorrectly. The handlers already return success/failure results, so explicit transactions aren't needed at this level.

## Changes Made

### lib/game-engine/core/GameEngine.ts

Removed `executeWithTransaction()` wrappers from:
- `playCard()` (lines ~399-440)
- `activateEffect()` (lines ~478-520)
- `giveDon()` (lines ~544-586)
- `declareAttack()` (lines ~608-650)

Each method now directly executes its logic and updates the state manager with the results.

## Impact

- Cards now persist on the board after being played
- Character cards stay in the character area
- Stage cards stay in the stage area
- State changes are properly propagated to the rendering system
- UI correctly reflects the game state

## Testing

To verify the fix:
1. Start a game
2. Advance to MAIN phase
3. Drag a character card from hand to the character area
4. The card should remain visible on the board
5. The card should no longer be in your hand
6. Repeat with stage cards

Expected behavior:
- Cards stay where they're played
- No duplicate cards appear
- Game state persists across renders
