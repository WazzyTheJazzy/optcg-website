# AI Not Running - Diagnosis

## Critical Finding from Console Log 12

**The AI action loop is NEVER being executed!**

From the console log, we can see:
```
Advancing to next phase...
🔄 Phase changed event received: Object
🧹 Clearing UI state on phase change from MAIN to END
```

The game went from MAIN phase directly to END phase without ANY of our `[MainPhase]` or `[GameEngine]` logs appearing.

## What This Means

The AI action loop code is not being called at all. This could be because:

1. **`triggerAIActionLoopIfNeeded()` is not being called** when entering MAIN phase
2. **The function returns `undefined`** (player not found or not AI type)
3. **The promise is not being awaited** so the game continues without waiting

## New Logging Added

### GameEngine.ts
Added comprehensive logging to track:
- When `triggerAIActionLoopIfNeeded()` is called
- Whether a player instance is found
- What the player type is
- When the AI action loop starts
- When `runMainPhaseWithCallback` is called
- When state updates happen
- When the action loop completes

### Expected Logs (If Working):
```
[GameEngine] triggerAIActionLoopIfNeeded called for PLAYER_2
[GameEngine] Player type: ai
[GameEngine] Starting AI action loop for PLAYER_2
[GameEngine] runAIActionLoop starting for PLAYER_2
[GameEngine] Calling runMainPhaseWithCallback
[MainPhase] runMainPhaseWithCallback called for PLAYER_2
[MainPhase] Starting action loop with callback
[MainPhase] Iteration 1: X legal actions available for PLAYER_2
...
```

### Problem Scenarios:

#### Scenario 1: Function Not Called
```
(No logs at all)
```
**Diagnosis**: `triggerAIActionLoopIfNeeded()` is never being called when entering MAIN phase.
**Fix**: Check `advancePhase()` to ensure it calls this function.

#### Scenario 2: No Player Found
```
[GameEngine] triggerAIActionLoopIfNeeded called for PLAYER_2
[GameEngine] No player instance found for PLAYER_2
```
**Diagnosis**: The player instance was not registered with GameEngine.
**Fix**: Check game setup to ensure AI player is registered.

#### Scenario 3: Wrong Player Type
```
[GameEngine] triggerAIActionLoopIfNeeded called for PLAYER_2
[GameEngine] Player type: human
[GameEngine] Player is not AI, skipping action loop
```
**Diagnosis**: The player is registered as human instead of AI.
**Fix**: Check AI player creation in game setup.

#### Scenario 4: Promise Not Awaited
```
[GameEngine] triggerAIActionLoopIfNeeded called for PLAYER_2
[GameEngine] Player type: ai
[GameEngine] Starting AI action loop for PLAYER_2
(Then phase changes before AI finishes)
```
**Diagnosis**: The promise is returned but not awaited.
**Fix**: Ensure `advancePhase()` awaits the promise.

## What to Test

1. **Start a new game with AI opponent**
2. **Let it reach the AI's MAIN phase**
3. **Check console for `[GameEngine]` logs**
4. **Determine which scenario we're in**

## Most Likely Issue

Based on the complete absence of logs, the most likely issue is **Scenario 1**: The function is never being called. This would happen if:

- `advancePhase()` doesn't call `triggerAIActionLoopIfNeeded()` for MAIN phase
- The code path for AI players is different than expected
- There's an error earlier that prevents the function from being reached

## Files Modified
- `lib/game-engine/core/GameEngine.ts` - Added extensive logging
- `lib/game-engine/phases/MainPhase.ts` - Already has logging from previous changes
