# Main Phase Interactive Fix

## Problem
When advancing to MAIN phase, the phase would immediately execute and skip to END phase because the phase execution logic includes an action loop that auto-passes when no actions are queued.

**What was happening:**
```
DRAW → DON → MAIN (executes action loop, no actions, passes) → END
```

**Result:** Players had no time to play cards!

## Root Cause
The `executePhase()` method for MAIN phase runs an action loop that:
1. Checks for queued actions
2. If none, assumes player passes
3. Ends the phase immediately

This works fine for AI or automated gameplay, but not for manual UI interaction where players need time to drag-drop cards.

## Solution
Modified `advancePhase()` to **skip execution** for MAIN phase - only transition to it, don't execute it.

### Code Change
**File:** `lib/game-engine/core/GameEngine.ts`

```typescript
// Move to next phase
const nextPhase = phaseSequence[currentIndex + 1];
this.stateManager = this.phaseManager['transitionToPhase'](this.stateManager, nextPhase);

// Only execute phase logic for non-interactive phases
// MAIN phase should wait for player actions, not auto-execute
if (nextPhase !== Phase.MAIN) {
  this.stateManager = this.phaseManager['executePhase'](this.stateManager, nextPhase);
}
```

## How It Works Now

### Automatic Phases (REFRESH, DRAW, DON, END)
These phases execute their logic immediately:
- **REFRESH**: Untaps cards
- **DRAW**: Draws a card
- **DON**: Adds DON cards to cost area
- **END**: Cleanup logic

### Interactive Phase (MAIN)
This phase only transitions but doesn't execute:
- Phase changes to MAIN
- UI shows "✓ You can play cards now!"
- Player can drag-drop cards
- Player clicks "Next Phase" when done
- Then advances to END phase

## Phase Flow

```
REFRESH (auto) 
  ↓
DRAW (auto - draws card)
  ↓  
DON (auto - adds DON)
  ↓
MAIN (WAITS - player plays cards)
  ↓ [player clicks Next Phase]
END (auto)
  ↓
[New Turn]
```

## Testing

1. Start game at `/game`
2. Click "Next Phase" to advance through:
   - REFRESH → DRAW (you should see a card drawn)
   - DRAW → DON (you should see DON added)
   - DON → MAIN (phase stays at MAIN!)
3. **MAIN phase persists** - you can now:
   - Drag cards from hand
   - Play multiple cards
   - Take your time
4. Click "Next Phase" when done
5. Advances to END phase

## Benefits

✅ **Cards are drawn** during DRAW phase
✅ **DON is added** during DON phase  
✅ **MAIN phase persists** for player interaction
✅ **Multiple cards** can be played in one turn
✅ **Player controls** when to end their turn

## Technical Details

### Why Not Execute MAIN?
The MAIN phase's `executePhase` includes:
```typescript
// Pseudo-code from MainPhase.ts
while (true) {
  const action = getNextAction(); // Returns null in UI context
  if (!action) break; // Immediately breaks, ending phase
  executeAction(action);
}
```

Since we're in a UI context with no action queue, it immediately breaks and ends the phase.

### The Fix
By skipping `executePhase` for MAIN, we:
1. Transition to MAIN phase (updates state.phase)
2. Don't run the action loop
3. Let UI handle actions via `engine.playCard()` calls
4. Player manually advances when done

### Other Phases
Other phases don't have action loops - they just execute their logic once:
- DRAW: `drawCard()`
- DON: `addDonToPool()`
- etc.

So they can safely auto-execute.

## Files Modified

- `lib/game-engine/core/GameEngine.ts`:
  - Added `Phase` import
  - Modified `advancePhase()` to skip execution for MAIN phase

## Result

The game now works as a proper interactive card game where:
- Automatic phases happen instantly
- MAIN phase waits for player input
- Players can play multiple cards per turn
- Turn progression is player-controlled

Perfect for drag-and-drop gameplay! 🎮
