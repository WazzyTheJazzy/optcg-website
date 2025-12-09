# Main Phase Verification Plan

## Current Status

✅ **Working:**
- Game loads with real card data
- Phase progression (REFRESH → DRAW → DON → MAIN → END)
- Card rendering (gray placeholders)
- Board state management
- Player switching

❌ **Not Working:**
- Playing cards from hand
- Attacking with characters
- Attaching DON to characters
- Card interactions

## Step-by-Step Verification Plan

### Phase 1: Basic Main Phase Entry ✅
**Goal:** Verify Main Phase is reached and recognized

**Tests:**
1. Start game and advance through phases
2. Confirm Main Phase is reached
3. Check console for "MAIN phase detected" log
4. Verify phase doesn't auto-advance (waits for player)

**Expected Behavior:**
- Console shows: `⏸️ MAIN phase detected - NOT executing phase logic`
- "Advance Phase" button is visible
- Game waits for player input

**Status:** ✅ Already working (based on previous logs)

---

### Phase 2: Card Selection System 🔧
**Goal:** Implement card click/selection

**Implementation Needed:**
1. Add click handlers to cards in hand
2. Visual feedback for selected card (highlight)
3. Store selected card in state
4. Console log when card is selected

**Tests:**
- Click a card in hand
- Card should highlight
- Console shows: `Selected card: [card name]`

**Files to Modify:**
- `components/game/GameBoard.tsx` - Add selection state
- `components/game/CardMesh.tsx` - Add click handler
- `components/game/GameScene.tsx` - Pass click handlers

---

### Phase 3: Play Card from Hand 🔧
**Goal:** Drag card from hand to character area

**Implementation Needed:**
1. Enable drag-drop for cards in hand (during MAIN phase only)
2. Highlight valid drop zones (CHARACTER_AREA)
3. Call `MainPhase.playCard()` when dropped
4. Verify cost payment (rest DON cards)
5. Move card from HAND to CHARACTER_AREA

**Tests:**
- Drag card from hand to character area
- Check if DON cards are rested (pay cost)
- Verify card appears in character area
- Console shows: `Played card: [card name], Cost: [X]`

**Files to Modify:**
- `components/game/GameBoard.tsx` - Add playCard handler
- `lib/game-engine/phases/MainPhase.ts` - Verify playCard method
- `lib/game-engine/phases/CardPlayHandler.ts` - Check implementation

---

### Phase 4: DON Attachment 🔧
**Goal:** Attach DON cards to characters for +1000 power

**Implementation Needed:**
1. Add "Attach DON" button/action
2. Select a character in play
3. Select a DON card from cost area
4. Call `DonHandler.attachDonToCharacter()`
5. Update character power (+1000)

**Tests:**
- Click character in character area
- Click DON card in cost area
- Verify DON moves to character
- Check character power increases by 1000
- Console shows: `Attached DON to [character], Power: [old] → [new]`

**Files to Modify:**
- `components/game/GameBoard.tsx` - Add attachDon handler
- `lib/game-engine/phases/DonHandler.ts` - Verify attachDonToCharacter method
- UI: Add "Attach DON" button or drag-drop

---

### Phase 5: Attack Declaration 🔧
**Goal:** Declare attacks with characters

**Implementation Needed:**
1. Add "Attack" button for active characters
2. Select attacker (must be ACTIVE, not RESTED)
3. Select target (opponent's character or leader)
4. Call `BattleSystem.declareAttack()`
5. Resolve battle (damage calculation)

**Tests:**
- Click active character
- Click "Attack" button
- Select target (opponent's leader or character)
- Verify battle resolves
- Check damage dealt
- Console shows: `Attack: [attacker] → [target], Damage: [X]`

**Files to Modify:**
- `components/game/GameBoard.tsx` - Add attack handler
- `lib/game-engine/battle/BattleSystem.ts` - Verify declareAttack method
- UI: Add "Attack" button or click-to-attack

---

### Phase 6: Leader Ability Activation 🔧
**Goal:** Use leader abilities

**Implementation Needed:**
1. Add "Use Leader Ability" button
2. Check if ability can be used (cost, once per turn)
3. Pay cost (rest DON cards)
4. Execute ability effect
5. Mark as used this turn

**Tests:**
- Click leader card
- Click "Use Ability" button
- Verify cost is paid
- Check ability effect applies
- Verify can't use again this turn
- Console shows: `Leader ability used: [effect]`

**Files to Modify:**
- `components/game/GameBoard.tsx` - Add leader ability handler
- `lib/game-engine/effects/EffectSystem.ts` - Verify ability execution
- UI: Add "Use Ability" button

---

## Implementation Priority

### MVP (Minimum Viable Product)
1. **Card Selection** - Must have for any interaction
2. **Play Card from Hand** - Core gameplay mechanic
3. **Attack Declaration** - Win condition

### Nice to Have
4. **DON Attachment** - Strategic depth
5. **Leader Abilities** - Special powers

### Future
6. Event cards
7. Stage cards
8. Counter step
9. Block step

---

## Testing Checklist

### Before Starting
- [ ] Game loads successfully
- [ ] Can advance to Main Phase
- [ ] Console shows phase logs
- [ ] Cards are visible (even as gray boxes)

### Card Selection
- [ ] Can click cards in hand
- [ ] Selected card highlights
- [ ] Can deselect card
- [ ] Console logs selection

### Playing Cards
- [ ] Can drag card from hand
- [ ] Valid zones highlight
- [ ] Card moves to character area
- [ ] DON cards rest to pay cost
- [ ] Hand count decreases
- [ ] Character area count increases

### Attacking
- [ ] Can select attacker
- [ ] Can select target
- [ ] Battle resolves
- [ ] Damage is dealt
- [ ] Attacker becomes rested
- [ ] KO happens if power ≤ 0

### DON Attachment
- [ ] Can select character
- [ ] Can select DON card
- [ ] DON attaches to character
- [ ] Power increases by 1000
- [ ] Visual feedback shows attachment

---

## Success Criteria

**Main Phase is considered "working" when:**
1. ✅ Can play at least 1 card from hand
2. ✅ Can declare at least 1 attack
3. ✅ Battle resolves correctly
4. ✅ Game state updates properly
5. ✅ Can advance to END phase

**Bonus:**
- ✅ Can attach DON to characters
- ✅ Can use leader abilities
- ✅ Visual feedback for all actions

---

## Next Steps

1. **Start with Card Selection** (easiest, foundation for everything)
2. **Then Play Card** (most important mechanic)
3. **Then Attack** (win condition)
4. **Then DON Attachment** (strategic depth)
5. **Finally Leader Abilities** (special powers)

Each step builds on the previous one. We'll implement, test, and verify before moving to the next.

---

## Current Code Status

### What Exists
- ✅ `MainPhase.ts` - Has playCard, declareAttack methods
- ✅ `BattleSystem.ts` - Has full battle resolution
- ✅ `DonHandler.ts` - Has DON attachment logic
- ✅ `CardPlayHandler.ts` - Has card playing logic

### What's Missing
- ❌ UI handlers in GameBoard
- ❌ Click/drag event wiring
- ❌ Visual feedback for actions
- ❌ Action buttons (Attack, Use Ability, etc.)

### The Gap
The **game engine logic exists**, but the **UI isn't connected** to it. We need to wire up the UI to call the engine methods.

---

## Let's Start!

**First Task:** Implement Card Selection
- Add click handler to cards
- Add selection state
- Add visual highlight
- Test and verify

Ready to begin?
