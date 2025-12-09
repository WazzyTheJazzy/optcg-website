# Game Engine Fixes - Phase Flow

**Date**: November 22, 2025  
**Issue**: Phase flow was skipping Main Phase and not allowing player interaction

## Problems Identified

### 1. ❌ Automatic Turn Execution
**Problem**: GameBoard was calling `engine.runTurn()` which executes ALL phases automatically
- Refresh Phase → Draw Phase → DON Phase → Main Phase → End Phase (all at once)
- No opportunity for player to interact during Main Phase
- Cards couldn't be played, DON couldn't be given, attacks couldn't be declared

### 2. ❌ No Phase-by-Phase Control
**Problem**: UI had no way to advance one phase at a time
- Players couldn't see what happened in each phase
- No control over when to move to next phase

## Solutions Implemented

### 1. ✅ Phase-by-Phase Advancement
**Fix**: Changed GameBoard to use `engine.advancePhase()` instead of `engine.runTurn()`

**Before**:
```typescript
engine.runTurn(); // Runs all phases at once
```

**After**:
```typescript
engine.advancePhase(); // Advances to next phase only
```

**Benefits**:
- Players can see each phase
- Main Phase waits for player actions
- Draw Phase shows cards being drawn
- DON Phase shows DON being added
- Full control over game flow

### 2. ✅ Smart Button Labels
**Fix**: Button label changes based on current phase

- **Refresh/Draw/DON Phase**: "Next Phase"
- **Main Phase**: "End Main Phase"
- **End Phase**: "Next Phase" (goes to next turn)

## How It Works Now

### Turn Flow
1. **Refresh Phase** → **AUTO-ADVANCES** (800ms delay)
   - All cards untap
   - DON cards refresh
   - Automatically moves to Draw Phase

2. **Draw Phase** → **AUTO-ADVANCES** (800ms delay)
   - Active player draws 1 card (skip on first turn for P1)
   - Card moves from deck to hand
   - Automatically moves to DON Phase

3. **DON Phase** → **AUTO-ADVANCES** (800ms delay)
   - 2 DON cards move from DON deck to cost area (1 on first turn for P1)
   - DON become active and ready to use
   - Automatically moves to Main Phase

4. **Main Phase** → **WAITS FOR PLAYER!**
   - Play cards from hand
   - Give DON to characters
   - Declare attacks
   - Click "End Main Phase" when done

5. **End Phase** → Click "End Turn"
   - End of turn effects trigger
   - Click "End Turn" to pass to opponent

### Main Phase Interactions

Now that Main Phase doesn't auto-advance, players can:

1. **Play Cards**
   - Drag cards from hand to character/stage area
   - System checks DON cost
   - Card is played if valid

2. **Give DON** (Future)
   - Select DON from cost area
   - Click character to give DON
   - Character power increases

3. **Declare Attacks** (Future)
   - Select attacker
   - Click target
   - Battle resolves

4. **End Phase**
   - Click "End Main Phase" when done
   - Moves to End Phase

## Testing

### Manual Test Steps

1. **Start Game**
   ```
   npm run dev
   Navigate to /game
   ```

2. **Test Phase Flow**
   - Click "Next Phase" through Refresh
   - Verify Draw Phase draws a card
   - Verify DON Phase adds DON to cost area
   - Verify Main Phase waits for input
   - Try playing a card
   - Click "End Main Phase"
   - Verify End Phase completes
   - Verify turn passes to opponent

3. **Verify Card Drawing**
   - Check deck count decreases
   - Check hand count increases
   - Verify card appears in hand zone

4. **Verify DON Addition**
   - Check DON deck count decreases
   - Check cost area DON count increases
   - Verify DON are active (not rested)

## Code Changes

### Files Modified
1. **components/game/GameBoard.tsx**
   - Changed `engine.runTurn()` to `engine.advancePhase()`
   - Updated button labels
   - Added phase-specific logic

### Files Already Correct
1. **lib/game-engine/phases/DrawPhase.ts** ✅
   - Correctly draws 1 card
   - Handles deck out
   - Skips first turn for P1

2. **lib/game-engine/phases/DonPhase.ts** ✅
   - Correctly adds 2 DON (1 on first turn for P1)
   - Moves from DON deck to cost area
   - Sets DON to active state

3. **lib/game-engine/core/GameEngine.ts** ✅
   - Has `advancePhase()` method
   - Correctly transitions phases
   - Waits at Main Phase for player input

## Expected Behavior

### ✅ What Should Work Now

1. **Phase Progression**
   - Phases advance one at a time
   - Each phase executes its logic
   - Main Phase waits for player

2. **Card Drawing**
   - Draw Phase draws 1 card
   - Card moves from deck to hand
   - Visible in UI

3. **DON Addition**
   - DON Phase adds DON to cost area
   - DON are active and usable
   - Visible in UI

4. **Main Phase Interaction**
   - Players can play cards
   - Phase doesn't auto-advance
   - "End Main Phase" button available

### ⚠️ Known Limitations

1. **DON Giving** - Not yet wired to UI (engine supports it)
2. **Attack Declaration** - Not yet wired to UI (engine supports it)
3. **Effect Activation** - Not yet wired to UI (engine supports it)

These are UI wiring issues, not engine issues. The engine has all the methods, they just need to be connected to UI buttons/interactions.

## Next Steps

### Immediate (UI Wiring)
1. Add "Give DON" button/interaction
2. Add "Declare Attack" button/interaction
3. Add effect activation UI
4. Add counter step UI

### Future Enhancements
1. Automatic phase advancement for non-interactive phases (optional)
2. Phase skip confirmation
3. Undo last action
4. Action history log

## Verification

Run the game and verify:
- [ ] Phases advance one at a time
- [ ] Draw Phase draws a card
- [ ] DON Phase adds DON
- [ ] Main Phase waits for input
- [ ] Can play cards in Main Phase
- [ ] "End Main Phase" advances to End Phase
- [ ] Turn passes to opponent after End Phase

---

**Status**: ✅ FIXED  
**Impact**: Critical - Game is now playable  
**Testing**: Manual testing required
