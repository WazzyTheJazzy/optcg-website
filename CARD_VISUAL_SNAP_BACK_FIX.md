# Card Visual Snap-Back Fix

## Issue
Cards would appear on the board after being played, then visually snap back to the player's hand.

## Root Cause
Race condition in ZoneManager event emission - events were emitted BEFORE the state manager was updated.

**Sequence of events:**
1. User plays card
2. ZoneManager.moveCard() updates state to newStateManager
3. CARD_MOVED event is emitted
4. Event handler calls renderingInterface.getBoardState()
5. **Problem**: getBoardState() reads from this.stateManager which is still the OLD state
6. UI renders with old state (card in hand)
7. ZoneManager updates this.stateManager = newStateManager
8. Too late - UI already rendered with stale state

## Solution
Update state manager BEFORE emitting events, ensuring handlers always read current state.

## Changes Made
**lib/game-engine/zones/ZoneManager.ts**
- moveCard(): Moved `this.stateManager = newStateManager` before event emission
- moveDon(): Moved `this.stateManager = newStateManager` before event emission

## Impact
- Cards stay where they're played
- No visual glitches or snap-back animations
- UI always reflects current game state
- Consistent with phase transition fix applied earlier
