# Main Phase Test-Driven Verification Plan

## Philosophy

**Test everything. Assume nothing.**

Each step:
1. Write a test
2. Verify it fails (or passes if logic exists)
3. Implement/fix
4. Verify it passes
5. Document results
6. Move to next step

---

## Test 1: Card Selection - Backend Logic

### Goal
Verify that clicking a card updates the selected card state.

### Test Steps
1. Open game in browser
2. Open DevTools console
3. Advance to Main Phase
4. Open console and type:
   ```javascript
   // Check if handleCardClick exists
   console.log('Testing card selection...');
   ```
5. Click any card in hand
6. Check console for logs

### Expected Results
- ✅ Console shows: "Selected card: [cardId]" or similar
- ✅ `selectedCardId` state updates

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
- Add console.log to handleCardClick
- Verify state updates
- Check if click events are wired up

---

## Test 2: Card Selection - Visual Feedback

### Goal
Verify that selected card shows visual highlight.

### Test Steps
1. Click a card in hand
2. Observe the card visually
3. Click another card
4. Observe both cards

### Expected Results
- ✅ First card highlights (yellow glow or border)
- ✅ Second card highlights, first card un-highlights
- ✅ Click same card again → deselects

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
- Pass `selectedCardId` to GameScene
- Pass to CardMesh as `isSelected` prop
- Add visual effect in CardMesh when `isSelected=true`

---

## Test 3: Play Card - Engine Method Exists

### Goal
Verify `engine.playCard()` method exists and is callable.

### Test Steps
1. Open browser console
2. Type:
   ```javascript
   // Access the engine (you may need to expose it for testing)
   // For now, just try to play a card via drag-drop
   console.log('Testing playCard...');
   ```
3. Drag a card from hand to character area
4. Check console logs

### Expected Results
- ✅ Console shows: "Playing card [cardId]"
- ✅ Console shows: "Play card result: true/false"
- ✅ If true: card moves to character area
- ✅ If false: error message appears

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
Check:
1. Does `engine.playCard()` exist?
2. Is it being called from `handleCardMove()`?
3. Does it return true/false?
4. Are errors being caught and logged?

---

## Test 4: Play Card - Cost Validation

### Goal
Verify that playing a card checks if you have enough DON.

### Test Steps
1. Advance to Main Phase
2. Note how many active DON you have (check UI)
3. Try to play a card that costs MORE than your DON
4. Observe result

### Expected Results
- ✅ Card does NOT play
- ✅ Error message: "Not enough DON" or similar
- ✅ Card stays in hand
- ✅ DON count unchanged

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
Check `CardPlayHandler.ts`:
- Does it validate DON cost?
- Does it check active DON count?
- Does it return false if insufficient?

---

## Test 5: Play Card - DON Payment

### Goal
Verify that playing a card rests the correct number of DON.

### Test Steps
1. Note active DON count (e.g., 3 active)
2. Play a 2-cost card
3. Check active DON count after

### Expected Results
- ✅ Card plays successfully
- ✅ Active DON count decreases by 2 (3 → 1)
- ✅ 2 DON cards are now rested
- ✅ Card appears in character area

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
Check `CardPlayHandler.ts`:
- Does it call `payDonCost()`?
- Does `payDonCost()` rest DON cards?
- Are DON states updating correctly?

---

## Test 6: Attack - Engine Method Exists

### Goal
Verify `engine.declareAttack()` method exists.

### Test Steps
1. Open browser console
2. Type:
   ```javascript
   // Try to call declareAttack (will fail without proper params)
   console.log(typeof window.engine?.declareAttack);
   ```
3. Check if method exists

### Expected Results
- ✅ Console shows: "function"
- ✅ Method is callable

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
- Check if `GameEngine.ts` has `declareAttack()` method
- Check if it's public (not private)
- Check if it's being called correctly

---

## Test 7: Attack - Can Attack with Active Character

### Goal
Verify that an active (untapped) character can attack.

### Test Steps
1. Play a character card (it should be active)
2. Try to attack with it (once we add UI)
3. For now, check in console:
   ```javascript
   // Check if character is active
   // Check if it can attack
   ```

### Expected Results
- ✅ Character is in ACTIVE state
- ✅ Can declare attack
- ✅ Attack resolves

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
Check `BattleSystem.ts`:
- Does it check if attacker is ACTIVE?
- Does it validate attacker can attack?
- Does it prevent RESTED characters from attacking?

---

## Test 8: Attack - Cannot Attack with Rested Character

### Goal
Verify that a rested (tapped) character cannot attack.

### Test Steps
1. Have a character that's already attacked (rested)
2. Try to attack with it again
3. Check result

### Expected Results
- ✅ Attack is rejected
- ✅ Error message: "Character is rested" or similar
- ✅ No battle occurs

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
- Add validation in `BattleSystem.declareAttack()`
- Check attacker state before allowing attack
- Return false if rested

---

## Test 9: Attack - Battle Resolution

### Goal
Verify that battle damage is calculated correctly.

### Test Steps
1. Attack opponent's leader with a 5000 power character
2. Check opponent's life count before and after
3. Verify damage dealt

### Expected Results
- ✅ Battle resolves
- ✅ Opponent takes 1 life damage
- ✅ Life card moves to trash
- ✅ Attacker becomes rested

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
Check `BattleSystem.ts`:
- Does `resolveBattle()` calculate damage?
- Does it deal damage to leader?
- Does it move life cards?
- Does it rest the attacker?

---

## Test 10: DON Attachment - Engine Method Exists

### Goal
Verify DON attachment logic exists.

### Test Steps
1. Check if `DonHandler.attachDonToCharacter()` exists
2. Check if it's callable from engine

### Expected Results
- ✅ Method exists
- ✅ Can be called

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
- Implement `attachDonToCharacter()` in `DonHandler.ts`
- Expose it through `GameEngine`

---

## Test 11: DON Attachment - Power Increase

### Goal
Verify that attaching DON increases character power by 1000.

### Test Steps
1. Note character's current power (e.g., 4000)
2. Attach 1 DON to character
3. Check character's new power

### Expected Results
- ✅ Power increases by 1000 (4000 → 5000)
- ✅ DON is attached to character
- ✅ DON count in cost area decreases

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
Check `DonHandler.ts`:
- Does it increase character power?
- Does it track attached DON?
- Does it update state correctly?

---

## Test 12: Phase Progression

### Goal
Verify that Main Phase doesn't auto-advance.

### Test Steps
1. Advance to Main Phase
2. Wait 10 seconds
3. Check if phase changes automatically

### Expected Results
- ✅ Phase stays on MAIN
- ✅ Doesn't auto-advance
- ✅ Waits for player to click "Next Phase"

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
Check `PhaseManager.ts`:
- Does it skip auto-execution for MAIN phase?
- Does it wait for manual advancement?

---

## Test 13: End-to-End Flow

### Goal
Verify complete turn flow works.

### Test Steps
1. Start game
2. Advance through phases to Main
3. Play a card
4. Attack with it
5. Advance to End phase
6. Start next turn

### Expected Results
- ✅ All phases advance correctly
- ✅ Card plays successfully
- ✅ Attack resolves
- ✅ Turn increments
- ✅ Next player's turn starts

### Actual Results
- [ ] PASS
- [ ] FAIL - Reason: _______________

### If FAIL: What to Fix
- Check phase progression
- Check turn management
- Check player switching

---

## Testing Checklist

### Before Each Test
- [ ] Game is loaded
- [ ] Console is open
- [ ] No errors in console
- [ ] Can see the game board

### During Each Test
- [ ] Document what you see
- [ ] Copy console logs
- [ ] Take screenshots if needed
- [ ] Note exact error messages

### After Each Test
- [ ] Mark PASS or FAIL
- [ ] Document reason for failure
- [ ] Identify what needs fixing
- [ ] Move to next test only if PASS

---

## Current Status Tracker

| Test # | Name | Status | Notes |
|--------|------|--------|-------|
| 1 | Card Selection Backend | ⏳ Not Tested | |
| 2 | Card Selection Visual | ⏳ Not Tested | |
| 3 | Play Card Method | ⏳ Not Tested | |
| 4 | Cost Validation | ⏳ Not Tested | |
| 5 | DON Payment | ⏳ Not Tested | |
| 6 | Attack Method | ⏳ Not Tested | |
| 7 | Attack Active Char | ⏳ Not Tested | |
| 8 | Attack Rested Char | ⏳ Not Tested | |
| 9 | Battle Resolution | ⏳ Not Tested | |
| 10 | DON Attach Method | ⏳ Not Tested | |
| 11 | DON Power Increase | ⏳ Not Tested | |
| 12 | Phase Progression | ⏳ Not Tested | |
| 13 | End-to-End Flow | ⏳ Not Tested | |

---

## Next Steps

1. **Start with Test 1** - Card Selection Backend
2. **Document results** in this file
3. **Fix any failures** before moving on
4. **Proceed to Test 2** only after Test 1 passes
5. **Repeat** for all tests

---

## How to Run Tests

### Manual Testing (Recommended for now)
1. Open game at `http://localhost:3000/game`
2. Open DevTools (F12)
3. Follow test steps above
4. Document results

### Automated Testing (Future)
- Write Jest tests for engine logic
- Write Playwright tests for UI interactions
- Run: `npm test`

---

## Ready to Start?

Let's begin with **Test 1: Card Selection Backend**.

Run the game, click a card, and tell me what you see in the console!
