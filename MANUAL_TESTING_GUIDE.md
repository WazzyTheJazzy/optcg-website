# Manual Testing Guide - Main Phase UI Interactions

This guide provides step-by-step instructions for manually testing all main phase UI interactions.

## Prerequisites

1. Start the development server: `npm run dev`
2. Navigate to the game page: `http://localhost:3000/game`
3. Open browser console (F12) to see detailed logs
4. The game should initialize with both players having cards in hand

## Test 1: Card Selection Backend (Task 14.1)

**Objective:** Verify that clicking cards updates the selectedCardId state and logs appear in console.

### Steps:
1. Click "Next Phase" buttons until you reach Main Phase
2. Click on a card in your hand (bottom of screen)
3. Check console for log: `Card selected: [cardId]`
4. Click the same card again
5. Check console for log: `Card deselected`
6. Click a different card
7. Check console for log showing the new card ID

### Expected Results:
- ✅ Console shows "Card clicked:" with card ID
- ✅ Console shows "Card selected:" when selecting a card
- ✅ Console shows "Card deselected" when clicking same card
- ✅ Console shows new card ID when switching selection
- ✅ selectedCardId state updates (visible in React DevTools)

### Requirements Verified: 1.1, 1.2, 1.3

---

## Test 2: Card Selection Visual (Task 14.2)

**Objective:** Verify that selected cards show yellow highlight and highlight switches correctly.

### Steps:
1. Ensure you're in Main Phase
2. Click on a card in your hand
3. Observe the card - it should have a yellow glow/highlight
4. Click on a different card in your hand
5. Observe that the highlight moves to the new card
6. Click the currently selected card again
7. Observe that the highlight disappears

### Expected Results:
- ✅ Selected card displays yellow highlight/glow
- ✅ Only one card is highlighted at a time
- ✅ Highlight switches when selecting different card
- ✅ Highlight disappears when deselecting
- ✅ Visual feedback is clear and immediate

### Requirements Verified: 1.4, 1.5

---

## Test 3-5: Play Card Tests (Task 14.3)

**Objective:** Verify that engine.playCard() works, cost validation prevents illegal plays, and DON payment works correctly.

### Test 3A: Verify engine.playCard() Method Exists

#### Steps:
1. Open browser console
2. Type: `window.engine` (if exposed) or check console logs
3. Look for logs showing "GameBoard.handleCardMove: Playing card"

#### Expected Results:
- ✅ engine.playCard() method is called (visible in console logs)
- ✅ No errors about missing methods

### Test 3B: Cost Validation Prevents Illegal Plays

#### Steps:
1. Ensure you're in Main Phase
2. Look at your hand and identify a card with cost > available DON
3. Try to drag that card to the character area
4. Observe the error message

#### Expected Results:
- ✅ Error toast appears: "Insufficient DON! Need X DON but only have Y active DON"
- ✅ Card is NOT played
- ✅ Card returns to hand
- ✅ Console shows cost validation check

### Test 3C: DON Payment Rests Correct Number of DON

#### Steps:
1. Note the number of active (upright) DON cards in your cost area
2. Select a card with cost 2 or 3
3. Drag it to the character area
4. Observe the DON cards in your cost area
5. Count how many DON cards became rested (sideways)

#### Expected Results:
- ✅ Card is played successfully
- ✅ Correct number of DON cards become rested (equal to card cost)
- ✅ Card appears in character area
- ✅ Success toast appears
- ✅ Console shows "Card played successfully"

### Test 3D: Character Area Limit

#### Steps:
1. Play cards until you have 5 characters in the character area
2. Try to play a 6th character card
3. Observe the error message

#### Expected Results:
- ✅ Error toast appears: "Character area is full (5/5)"
- ✅ 6th card is NOT played
- ✅ Card remains in hand

### Requirements Verified: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

---

## Test 6-9: Attack Tests (Task 14.4)

**Objective:** Verify that engine.declareAttack() works, active characters can attack, rested characters cannot, and battle resolution works.

### Test 6A: Verify engine.declareAttack() Method Exists

#### Steps:
1. Play a character card (it will be active/upright)
2. Click on the character
3. Click "Attack" button in the action panel
4. Check console for "startAttackMode" logs

#### Expected Results:
- ✅ Attack mode activates
- ✅ Valid targets are highlighted (opponent's leader and rested characters)
- ✅ Console shows "Attack mode started"

### Test 6B: Active Character Can Attack

#### Steps:
1. Select an active (upright) character
2. Click "Attack" button
3. Click on opponent's leader (or a rested opponent character)
4. Observe the battle resolution

#### Expected Results:
- ✅ Attack is declared successfully
- ✅ Attacker becomes rested (sideways)
- ✅ Damage is dealt to target
- ✅ Success toast shows attack details
- ✅ Console shows "Attack declared successfully"

### Test 6C: Rested Character Cannot Attack

#### Steps:
1. Select a rested (sideways) character
2. Try to click "Attack" button

#### Expected Results:
- ✅ Error toast appears: "Character is rested and cannot attack"
- ✅ Attack mode does NOT activate
- ✅ No valid targets are highlighted

### Test 6D: Battle Resolution Deals Damage Correctly

#### Steps:
1. Note the power of your attacking character
2. Note the power of the target (if attacking a character)
3. Declare an attack
4. Check console for battle event logs

#### Expected Results:
- ✅ Console shows "Battle event received"
- ✅ Console shows "Attacker became RESTED after attack"
- ✅ Console shows "Damage dealt to target"
- ✅ If attacking leader: 1 life damage dealt
- ✅ If attacking character: power comparison is correct
- ✅ If defender power ≤ 0: character is KO'd (moved to trash)

### Requirements Verified: 3.1, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9

---

## Test 10-11: DON Attachment Tests (Task 14.5)

**Objective:** Verify that DON attachment method exists and increases power by 1000.

### Test 10A: Verify DON Attachment Method Exists

#### Steps:
1. Play a character card
2. Click on the character
3. Click "Attach DON" button in the action panel
4. Click on an active DON card in your cost area
5. Check console for "DON attached" logs

#### Expected Results:
- ✅ DON attach mode activates
- ✅ Console shows "DON attach mode started"
- ✅ Clicking DON card triggers attachment
- ✅ Console shows "DON attached successfully"

### Test 10B: Attaching DON Increases Power by 1000

#### Steps:
1. Note the current power of a character (e.g., 5000)
2. Select the character
3. Click "Attach DON"
4. Click an active DON card
5. Check the character's power display
6. Check console for power change event

#### Expected Results:
- ✅ Character power increases by exactly 1000
- ✅ Success toast shows "Power +1000"
- ✅ Console shows "Power changed event received"
- ✅ Console shows "Power increased by 1000 (expected 1000)"
- ✅ Console shows "Verified: Character power increased by 1000"
- ✅ Visual indicator shows attached DON count (if implemented)

### Requirements Verified: 4.3, 4.4, 4.5

---

## Test 12: Phase Progression (Task 14.6)

**Objective:** Verify that Main Phase doesn't auto-advance and manual phase advancement works.

### Test 12A: Main Phase Doesn't Auto-Advance

#### Steps:
1. Click "Next Phase" until you reach Main Phase
2. Wait for 5 seconds without clicking anything
3. Observe the phase indicator

#### Expected Results:
- ✅ Phase stays on "Main Phase"
- ✅ Game does NOT automatically advance to End Phase
- ✅ "End Main Phase" button is visible
- ✅ Console does NOT show auto-advance logs

### Test 12B: Manual Phase Advancement Works

#### Steps:
1. Ensure you're in Main Phase
2. Click "End Main Phase" button
3. Observe the phase change

#### Expected Results:
- ✅ Phase advances to "End Phase"
- ✅ Console shows "Manual advance from MAIN phase"
- ✅ Console shows "Phase changed event received"
- ✅ Selected card is cleared
- ✅ Attack mode is exited (if active)
- ✅ DON attach mode is exited (if active)

### Requirements Verified: 7.1, 7.2, 7.3

---

## Test 13: End-to-End Flow (Task 14.7)

**Objective:** Verify complete gameplay flow from start to end of turn.

### Steps:
1. Start a new game
2. Click "Next Phase" through Refresh, Draw, and DON phases
3. Reach Main Phase
4. Play a character card from hand (drag to character area)
5. End Main Phase (click "End Main Phase")
6. Click through End Phase
7. Verify turn increments
8. On next turn, reach Main Phase again
9. Attack with the previously played character
10. End turn

### Expected Results:
- ✅ Game starts successfully
- ✅ Can advance through all phases
- ✅ Card plays successfully in Main Phase
- ✅ DON cards are rested when playing card
- ✅ Main Phase doesn't auto-advance
- ✅ Can manually end Main Phase
- ✅ Turn number increments correctly
- ✅ On next turn, DON cards refresh
- ✅ Character can attack (becomes rested)
- ✅ Turn ends successfully
- ✅ No errors in console
- ✅ All state updates are reflected in UI

### Requirements Verified: All

---

## Additional Tests

### Keyboard Navigation (Tasks 11.1, 11.2)

#### Steps:
1. Press Tab key to cycle through cards in hand
2. Press Enter to select focused card
3. Press Space to execute primary action
4. Press Escape to cancel selection/attack mode

#### Expected Results:
- ✅ Tab cycles through cards
- ✅ Enter selects/deselects card
- ✅ Space executes action
- ✅ Escape cancels modes

### Screen Reader Support (Tasks 12.1, 12.2)

#### Steps:
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate through the game
3. Select cards and perform actions
4. Listen for announcements

#### Expected Results:
- ✅ Action buttons have ARIA labels
- ✅ Card selection is announced
- ✅ Action results are announced
- ✅ Errors are announced

---

## Troubleshooting

### If cards don't appear:
- Check console for errors
- Verify game engine initialized: look for "Game setup complete" log
- Refresh the page

### If drag-and-drop doesn't work:
- Try clicking the card first, then using action panel
- Check if you're in Main Phase
- Verify it's your turn

### If attacks don't work:
- Verify character is active (upright, not sideways)
- Check if you're in Main Phase
- Ensure valid targets exist

### If DON attachment doesn't work:
- Verify you have active DON cards
- Check if character is in play
- Ensure you're in Main Phase

---

## Test Results Summary

Use this checklist to track your testing progress:

- [ ] Test 1: Card Selection Backend
- [ ] Test 2: Card Selection Visual
- [ ] Test 3A: engine.playCard() exists
- [ ] Test 3B: Cost validation works
- [ ] Test 3C: DON payment works
- [ ] Test 3D: Character area limit works
- [ ] Test 6A: engine.declareAttack() exists
- [ ] Test 6B: Active character can attack
- [ ] Test 6C: Rested character cannot attack
- [ ] Test 6D: Battle resolution works
- [ ] Test 10A: DON attachment method exists
- [ ] Test 10B: Power increases by 1000
- [ ] Test 12A: Main Phase doesn't auto-advance
- [ ] Test 12B: Manual phase advancement works
- [ ] Test 13: End-to-end flow works
- [ ] Keyboard navigation works
- [ ] Screen reader support works

---

## Notes

Record any issues or observations here:

```
[Your notes here]
```
