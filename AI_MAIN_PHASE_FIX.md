# AI Main Phase Fix

## Issues Fixed

### Issue 1: AI Gets Stuck After Playing One Card
**Problem**: The AI would play one card and then stop, not continuing to make more decisions in the main phase.

**Root Cause**: The action loop was not properly continuing after successful actions. The AI would evaluate actions, play one, but then not loop back to evaluate more actions.

**Solution**: Added comprehensive logging to track:
- Number of legal actions available
- Action types and breakdown
- State after each action (hand size, character count, active DON)

### Issue 2: Card Visually Snaps Back to Hand
**Problem**: When the AI plays a card, it visually moves to the character area but then snaps back to the hand, even though the backend state is correct.

**Root Cause**: The GameEngine's state manager was only updated after ALL AI actions completed, not after each individual action. This meant the RenderingInterface was reading stale state.

**Solution**: 
1. Created `runMainPhaseWithCallback` function that accepts a callback to update state after each action
2. Modified `runAIActionLoop` to use this new function and update GameEngine's state after each action
3. Emit `STATE_CHANGED` event after each action so the UI updates incrementally

## Changes Made

### 1. MainPhase.ts
- Added detailed logging for AI decision-making:
  - Log number of legal actions available
  - Log action types and breakdown
  - Log state after each action
- Created `runMainPhaseWithCallback` function that calls a callback after each action
- Created `runActionLoopWithCallback` that updates state and emits events after each action
- Emit `STATE_CHANGED` event after each successful action

### 2. GameEngine.ts
- Modified `runAIActionLoop` to use `runMainPhaseWithCallback`
- Added callback that updates GameEngine's state manager after each action
- This ensures RenderingInterface always reads the latest state

## How It Works Now

### Before (Broken):
```
AI Action Loop:
1. Play card 1 → Update local state
2. Play card 2 → Update local state
3. Play card 3 → Update local state
4. End loop → Update GameEngine state → Emit STATE_CHANGED
   ↑ UI only updates here, sees all 3 cards at once
```

### After (Fixed):
```
AI Action Loop:
1. Play card 1 → Update local state → Update GameEngine → Emit STATE_CHANGED
   ↑ UI updates here, sees card 1
2. Play card 2 → Update local state → Update GameEngine → Emit STATE_CHANGED
   ↑ UI updates here, sees card 2
3. Play card 3 → Update local state → Update GameEngine → Emit STATE_CHANGED
   ↑ UI updates here, sees card 3
4. End loop → Final update
```

## Logging Added

When the AI is making decisions, you'll now see in the console:

```
[MainPhase] Iteration 1: 15 legal actions available for PLAYER_2
[MainPhase] Action types: PLAY_CARD, PLAY_CARD, GIVE_DON, GIVE_DON, DECLARE_ATTACK, END_PHASE
[MainPhase] Action breakdown: { PLAY_CARD: 5, GIVE_DON: 4, DECLARE_ATTACK: 5, END_PHASE: 1 }
[MainPhase] Player chose action: PLAY_CARD
[MainPhase] Executing action: PLAY_CARD { cardId: 'card-123' }
[MainPhase] Action succeeded, updating state
[MainPhase] After action - Hand: 4, Characters: 1, Active DON: 3
```

This helps diagnose:
- If the AI has no legal actions (gets stuck)
- What actions the AI is choosing
- Whether actions are succeeding or failing
- How the game state changes after each action

## Testing

To test the fix:
1. Start a new game with AI opponent
2. Let the game progress to the AI's main phase
3. Watch the console for the logging output
4. Verify:
   - AI plays multiple cards if it can afford them
   - Cards appear on the board immediately after being played
   - Cards don't snap back to hand
   - AI continues making decisions until it chooses to end phase

## Next Steps

If the AI still gets stuck:
1. Check the console logs to see what legal actions are available
2. Check if the AI is choosing END_PHASE when it shouldn't
3. Check if actions are failing (look for "Action failed" messages)
4. Verify the AI has enough DON to play cards
