# Phase Control Fix - Manual Phase Advancement

## Problem
The "Continue" button was calling `engine.runTurn()` which runs through ALL phases automatically (REFRESH → DRAW → DON → MAIN → END), giving players no chance to play cards during the MAIN phase.

## Solution
Added a new `advancePhase()` method to GameEngine that advances one phase at a time, allowing players to interact during the MAIN phase.

## Changes Made

### 1. New Method: `GameEngine.advancePhase()`
**File:** `lib/game-engine/core/GameEngine.ts`

```typescript
advancePhase(): void
```

**What it does:**
- Advances to the next phase in the sequence
- When reaching the end of a turn, starts a new turn
- Emits proper phase change events
- Runs defeat checks after each phase

**Phase Sequence:**
```
REFRESH → DRAW → DON → MAIN → END → (new turn) → REFRESH → ...
```

### 2. Updated Continue Button
**File:** `components/game/GameBoard.tsx`

- Changed from `engine.runTurn()` to `engine.advancePhase()`
- Button now says "Next Phase" consistently
- Shows "✓ You can play cards now!" when in MAIN phase
- Shows "Click to reach Main Phase" when not in MAIN

## How to Play Now

1. **Start the game** at `/game`
2. **Click "Next Phase"** to advance through phases:
   - REFRESH Phase → Click
   - DRAW Phase → Click  
   - DON Phase → Click
   - **MAIN Phase** ← You can play cards here!
3. **Drag cards** from hand to board
4. **Click "Next Phase"** again to continue to END phase
5. Turn switches to opponent

## Testing

To test card playing:
1. Visit `/game`
2. Click "Next Phase" 3 times to reach MAIN Phase
3. You'll see "✓ You can play cards now!"
4. Drag a card from hand to Character Area
5. Card should stay in place! ✅

## Technical Details

### Phase Manager Integration
The new method uses PhaseManager's internal methods:
- `transitionToPhase()` - Changes the phase
- `executePhase()` - Runs phase logic

### Turn Transitions
When advancing from END phase:
1. Emits TURN_END event
2. Increments turn number
3. Switches active player
4. Transitions to REFRESH phase
5. Emits TURN_START event

### Error Handling
- Validates game is setup
- Validates game is not over
- Validates current phase is valid
- Throws GameEngineError on failures

## Files Modified

- `lib/game-engine/core/GameEngine.ts` - Added `advancePhase()` method
- `components/game/GameBoard.tsx` - Updated Continue button to use `advancePhase()`

## Benefits

✅ Players can now interact during MAIN phase
✅ Cards stay on board when played
✅ Proper turn-based gameplay
✅ Clear visual feedback about when to play cards
✅ Follows actual TCG game flow

The game now works as a proper turn-based card game!
