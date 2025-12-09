# Main Phase UI Assessment - Current State

## Summary

**Good News:** The game engine logic is complete and the basic UI framework exists!

**The Gap:** UI buttons and visual feedback for Main Phase actions are missing.

---

## ✅ What EXISTS (Backend - Game Engine)

### Engine Methods Available
```typescript
// In GameEngine
engine.playCard(playerId, cardId) // ✅ Exists
engine.declareAttack(playerId, attackerId, targetId) // ✅ Exists  
engine.advancePhase() // ✅ Exists

// In MainPhase
MainPhase.playCard() // ✅ Exists
MainPhase.declareAttack() // ✅ Exists

// In DonHandler  
DonHandler.attachDonToCharacter() // ✅ Exists

// In BattleSystem
BattleSystem.declareAttack() // ✅ Exists
BattleSystem.resolveBattle() // ✅ Exists
```

### UI Handlers in GameBoard
```typescript
handleCardClick(cardId) // ✅ Exists - selects card
handleCardMove(cardId, fromZone, toZone) // ✅ Exists - drag-drop
handlePlayCard() // ✅ Exists - calls engine.playCard()
handleDeclareAttack(targetId) // ✅ Exists - calls engine.declareAttack()
```

### Event System
```typescript
renderingInterface.onCardMoved() // ✅ Subscribed
renderingInterface.onCardStateChanged() // ✅ Subscribed
renderingInterface.onPhaseChanged() // ✅ Subscribed
```

---

## ❌ What's MISSING (Frontend - UI)

### 1. Card Selection Visual Feedback
**Status:** Handler exists, but NO visual highlight

**Current:**
```typescript
const handleCardClick = (cardId: string) => {
  setSelectedCardId(cardId); // ✅ State updates
  // ❌ But no visual feedback!
}
```

**Needed:**
- Highlight selected card (yellow glow)
- Show card info panel
- Deselect on second click

---

### 2. Action Buttons
**Status:** NO buttons for Main Phase actions

**Missing Buttons:**
- ❌ "Play Card" button
- ❌ "Attack" button  
- ❌ "Attach DON" button
- ❌ "Use Leader Ability" button
- ❌ "End Main Phase" button

**Current UI:**
- ✅ "Next Phase" button (works for all phases)
- ✅ Phase display
- ✅ Player info

---

### 3. Target Selection System
**Status:** NO way to select attack targets

**Needed:**
- Click attacker → highlight valid targets
- Click target → execute attack
- Visual feedback for valid/invalid targets

---

### 4. DON Attachment UI
**Status:** NO UI for attaching DON

**Needed:**
- Select character in play
- Select DON from cost area
- "Attach" button or drag-drop
- Visual feedback showing attached DON

---

### 5. Card Dragging from Hand
**Status:** Partially working

**Current:**
```typescript
handleCardMove(cardId, fromZone, toZone) {
  if (fromZone === HAND && toZone === CHARACTER_AREA) {
    engine.playCard(playerId, cardId); // ✅ Calls engine
  }
}
```

**Issues:**
- ❌ No visual feedback during drag
- ❌ No cost display
- ❌ No validation before drop
- ❌ No error messages

---

## 📊 Detailed Breakdown

### Card Click Flow

**Current:**
```
User clicks card
    ↓
handleCardClick(cardId)
    ↓
setSelectedCardId(cardId) ✅
    ↓
??? (No visual feedback) ❌
```

**Needed:**
```
User clicks card
    ↓
handleCardClick(cardId)
    ↓
setSelectedCardId(cardId) ✅
    ↓
Card highlights (yellow glow) ✅
    ↓
Show card info panel ✅
    ↓
Enable action buttons ✅
```

---

### Play Card Flow

**Current:**
```
User drags card from hand
    ↓
Drop on character area
    ↓
handleCardMove() ✅
    ↓
engine.playCard() ✅
    ↓
Card moves (if successful) ✅
```

**Issues:**
- No cost display
- No validation feedback
- No error messages
- No "undo" option

---

### Attack Flow

**Current:**
```
handleDeclareAttack(targetId) exists ✅
BUT no way to trigger it! ❌
```

**Needed:**
```
User clicks attacker
    ↓
Show "Attack" button
    ↓
User clicks "Attack"
    ↓
Highlight valid targets
    ↓
User clicks target
    ↓
handleDeclareAttack(targetId) ✅
    ↓
Battle resolves ✅
```

---

## 🎯 Priority Fixes

### P0 - Critical (Can't play without these)
1. **Add "Attack" button** - Show when character is selected
2. **Add target selection** - Click to select attack target
3. **Visual feedback for selected card** - Highlight selected cards

### P1 - Important (Needed for good UX)
4. **Add action button panel** - Show available actions
5. **Add cost display** - Show DON cost when hovering cards
6. **Add error messages** - Show why actions fail

### P2 - Nice to Have
7. **Add DON attachment UI** - Drag DON to characters
8. **Add leader ability button** - Use leader powers
9. **Add card info panel** - Show full card details

---

## 🔧 Implementation Plan

### Step 1: Add Selected Card Highlight (30 min)
**Files:** `CardMesh.tsx`, `GameScene.tsx`

```typescript
// Pass selectedCardId to CardMesh
<CardMesh 
  isSelected={cardState.id === selectedCardId}
  // ... other props
/>

// In CardMesh, add glow effect
{isSelected && (
  <mesh>
    <meshBasicMaterial color="#ffff00" transparent opacity={0.3} />
  </mesh>
)}
```

---

### Step 2: Add Action Button Panel (1 hour)
**Files:** `GameBoard.tsx`

```typescript
// Add to UI overlay
{selectedCardId && boardState.phase === Phase.MAIN && (
  <div className="action-panel">
    {canAttack(selectedCardId) && (
      <button onClick={() => setAttackMode(true)}>
        Attack
      </button>
    )}
    {canPlayCard(selectedCardId) && (
      <button onClick={handlePlayCard}>
        Play Card
      </button>
    )}
  </div>
)}
```

---

### Step 3: Add Target Selection (1 hour)
**Files:** `GameBoard.tsx`, `GameScene.tsx`

```typescript
const [attackMode, setAttackMode] = useState(false);
const [validTargets, setValidTargets] = useState<string[]>([]);

// When attack button clicked
const startAttack = () => {
  setAttackMode(true);
  setValidTargets(getValidAttackTargets(selectedCardId));
};

// When target clicked
const selectTarget = (targetId: string) => {
  if (validTargets.includes(targetId)) {
    handleDeclareAttack(targetId);
    setAttackMode(false);
  }
};
```

---

### Step 4: Add Visual Feedback (30 min)
**Files:** `CardMesh.tsx`

```typescript
// Highlight valid targets
{attackMode && isValidTarget && (
  <mesh>
    <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
  </mesh>
)}

// Show cost on hover
{hovered && cardState.cost > 0 && (
  <Html>
    <div className="cost-badge">
      Cost: {cardState.cost}
    </div>
  </Html>
)}
```

---

## 📝 Testing Checklist

After implementing each step:

### Step 1 - Selection
- [ ] Click card in hand → card highlights
- [ ] Click again → card deselects
- [ ] Click different card → previous deselects, new highlights

### Step 2 - Action Buttons
- [ ] Select card → action panel appears
- [ ] Deselect card → action panel disappears
- [ ] Only show valid actions (e.g., "Attack" only for characters in play)

### Step 3 - Attacking
- [ ] Click "Attack" → valid targets highlight
- [ ] Click valid target → attack executes
- [ ] Click invalid target → nothing happens
- [ ] Battle resolves correctly

### Step 4 - Visual Feedback
- [ ] Hover card → see cost
- [ ] Valid targets glow green
- [ ] Selected card glows yellow
- [ ] Errors show toast message

---

## 🎮 Current Gameplay Status

### What Works
- ✅ Game loads with real cards
- ✅ Phases advance automatically
- ✅ Can reach Main Phase
- ✅ Drag-drop from hand works (backend)
- ✅ Engine methods all work

### What Doesn't Work
- ❌ Can't see which card is selected
- ❌ Can't attack (no UI)
- ❌ Can't attach DON (no UI)
- ❌ Can't see card costs
- ❌ Can't see valid actions

---

## 💡 Quick Win

**Fastest path to playable game:**

1. Add selected card highlight (30 min)
2. Add "Attack" button (30 min)
3. Add target selection (1 hour)

**Total: 2 hours to basic playable game!**

Then we can iterate and add:
- DON attachment
- Leader abilities
- Better visual feedback
- Card info panels

---

## Next Action

**Recommendation:** Start with Step 1 (Selected Card Highlight)

This gives immediate visual feedback and is the foundation for all other features.

Ready to implement?
