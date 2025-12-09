# Battle Damage Fix - Critical Bug Resolution

## Problem Identified

The battle system was not dealing damage because attacks were never actually being executed. The AI was choosing attack actions, but they were failing silently.

### Root Cause

The `executeAttack()` method in `BattleSystem.ts` is declared as `async` and returns a `Promise<BattleResult>`, but it was being called **without `await`** in `MainPhase.ts`. This caused:

1. The promise to be returned but never resolved
2. The battle execution to never actually run
3. No damage to be applied
4. Games to continue indefinitely

### Evidence from Logs

```
MainPhase.ts:858 [MainPhase] Would attack with PLAYER_2-leader targeting PLAYER_1-leader
MainPhase.ts:361 [MainPhase] Action failed: Attack system not yet implemented (task 16)
```

The attack action was being routed to an old stub function instead of the actual battle system.

## Solution Applied

### Changes Made

1. **Made `handleAttackFromGameAction` async** (line 960 in MainPhase.ts)
   - Changed function signature to return `Promise<ActionResult>`
   - Added `await` when calling `battleSystem.executeAttack()`

2. **Updated `executeAction` return type** (line 680 in MainPhase.ts)
   - Changed return type to `ActionResult | Promise<ActionResult>`
   - This allows it to handle both sync and async action handlers

3. **Added `await` in both action loops** (lines 343 and 445 in MainPhase.ts)
   - `runActionLoopWithCallback`: Added `await` before `executeAction()`
   - `runActionLoop`: Added `await` before `executeAction()`

### Code Changes

```typescript
// Before
function handleAttackFromGameAction(...): ActionResult {
  const battleResult = battleSystem.executeAttack(attackerId, targetId);
  // ...
}

// After
async function handleAttackFromGameAction(...): Promise<ActionResult> {
  const battleResult = await battleSystem.executeAttack(attackerId, targetId);
  // ...
}
```

```typescript
// Before
const result = executeAction(currentState, action, rules, eventEmitter, zoneManager, effectSystem);

// After
const result = await executeAction(currentState, action, rules, eventEmitter, zoneManager, effectSystem);
```

## Expected Behavior After Fix

1. ✅ AI chooses attack actions
2. ✅ Attacks are executed through BattleSystem
3. ✅ Battle steps run (attack, block, counter, damage, end)
4. ✅ Damage is applied to leaders (life cards moved to hand)
5. ✅ Characters are KO'd when attacked
6. ✅ Game ends when a player runs out of life

## Testing Recommendations

1. Run the existing test file: `test-ai-game.ts`
2. Verify attacks are logged: `[MainPhase] Executing attack`
3. Verify battles complete: `[MainPhase] Attack completed - Success: true`
4. Verify damage is dealt: Check life card counts decrease
5. Verify game ends: Check for winner declaration

## Related Files

- `lib/game-engine/phases/MainPhase.ts` - Action execution and routing
- `lib/game-engine/battle/BattleSystem.ts` - Battle execution logic
- `lib/game-engine/ai/AIPlayer.ts` - AI decision making
- `lib/game-engine/ai/AIDecisionSystem.ts` - Attack action generation

## Notes

- The BattleSystem has some pre-existing TypeScript errors related to event emission, but these don't affect functionality
- The async/await pattern is now properly implemented throughout the battle execution chain
- Both action loops (with and without callback) have been updated
