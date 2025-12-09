# AI Main Phase Debugging Findings

## Issue Summary
The AI gets stuck in the main phase after the game starts. From the console log, we can see:

```
[MainPhase] Player chose action: END_PHASE
```

The AI immediately chose to END_PHASE without evaluating any other actions.

## Key Finding
**The logging we added for "available actions" never appeared in the console.** This means one of two things:

1. The `runActionLoopWithCallback` function is NOT being called (the regular `runActionLoop` is being called instead)
2. OR the AI is receiving an empty list of legal actions (only END_PHASE)

## Changes Made for Debugging

### 1. Added Function Entry Logging
Added logs to identify which function is being called:
- `runMainPhaseWithCallback` now logs: `[MainPhase] runMainPhaseWithCallback called for PLAYER_X`
- `runActionLoop` now logs: `[MainPhase] runActionLoop called (WITHOUT callback) for PLAYER_X`

This will tell us which code path is being executed.

### 2. Existing Action Logging
Both functions already log:
- Number of legal actions available
- Action types
- Action breakdown by type
- Which action the AI chose

## What to Test Next

1. **Start a new game with AI opponent**
2. **Watch the console for these specific logs:**

### Expected Logs (Good Path):
```
[MainPhase] runMainPhaseWithCallback called for PLAYER_2
[MainPhase] Starting action loop with callback
[MainPhase] Iteration 1: X legal actions available for PLAYER_2
[MainPhase] Action types: PLAY_CARD, GIVE_DON, DECLARE_ATTACK, END_PHASE
[MainPhase] Action breakdown: { PLAY_CARD: 5, GIVE_DON: 3, DECLARE_ATTACK: 2, END_PHASE: 1 }
[MainPhase] Player chose action: PLAY_CARD
```

### Problem Scenario 1 (Wrong Function):
```
[MainPhase] runActionLoop called (WITHOUT callback) for PLAYER_2
[MainPhase] Iteration 1: X legal actions available for PLAYER_2
...
```
**Diagnosis**: The GameEngine is calling the wrong function. Need to fix the import/call.

### Problem Scenario 2 (No Legal Actions):
```
[MainPhase] runMainPhaseWithCallback called for PLAYER_2
[MainPhase] Starting action loop with callback
[MainPhase] Iteration 1: 1 legal actions available for PLAYER_2
[MainPhase] Action types: END_PHASE
[MainPhase] Action breakdown: { END_PHASE: 1 }
[MainPhase] Player chose action: END_PHASE
```
**Diagnosis**: The AI has no legal actions except END_PHASE. Need to check why `getLegalActions` is not finding playable cards.

### Problem Scenario 3 (AI Choosing END_PHASE Despite Options):
```
[MainPhase] runMainPhaseWithCallback called for PLAYER_2
[MainPhase] Starting action loop with callback
[MainPhase] Iteration 1: 10 legal actions available for PLAYER_2
[MainPhase] Action types: PLAY_CARD, PLAY_CARD, GIVE_DON, END_PHASE
[MainPhase] Action breakdown: { PLAY_CARD: 5, GIVE_DON: 4, END_PHASE: 1 }
[MainPhase] Player chose action: END_PHASE
```
**Diagnosis**: The AI is evaluating actions but choosing END_PHASE anyway. Need to check AIDecisionSystem scoring logic.

## Possible Root Causes

### If Wrong Function is Called:
- GameEngine.runAIActionLoop is importing the wrong function
- The import statement needs to be fixed

### If No Legal Actions:
- `getLegalActions` is not finding playable cards
- Possible issues:
  - AI has no cards in hand
  - AI has no DON to play cards
  - Card costs are too high
  - Character area is full

### If AI Chooses END_PHASE Despite Options:
- AIDecisionSystem is scoring END_PHASE higher than other actions
- Possible issues:
  - ActionEvaluator is giving negative scores to all actions
  - Difficulty modifier is causing AI to choose randomly and hit END_PHASE
  - AI's strategy weights are misconfigured

## Next Steps

1. Run the game and capture the console logs
2. Look for the function entry logs to determine which scenario we're in
3. Based on the scenario, we can narrow down the fix:
   - **Scenario 1**: Fix the import in GameEngine
   - **Scenario 2**: Debug `getLegalActions` to see why it's not finding actions
   - **Scenario 3**: Debug AIDecisionSystem scoring to see why END_PHASE scores highest

## Files Modified
- `lib/game-engine/phases/MainPhase.ts` - Added function entry logging
- `lib/game-engine/core/GameEngine.ts` - Already modified to use callback version
