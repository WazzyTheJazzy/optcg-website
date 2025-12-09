# One Piece TCG - Main Phase UI Interactions

This guide explains how to interact with the game during the Main Phase, including card selection, playing cards, attacking, and DON attachment.

## Table of Contents

1. [Overview](#overview)
2. [Card Selection](#card-selection)
3. [Playing Cards](#playing-cards)
4. [Attacking](#attacking)
5. [DON Attachment](#don-attachment)
6. [Keyboard Navigation](#keyboard-navigation)
7. [Accessibility Features](#accessibility-features)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Main Phase is where most of the strategic gameplay happens. During your Main Phase, you can:

- **Play cards** from your hand to the board
- **Attack** with your active characters
- **Attach DON** to characters to increase their power
- **Use abilities** (coming soon)

The game will automatically advance through non-interactive phases (Refresh, Draw, DON Phase) and pause at the Main Phase for your input.

### Phase Flow

```
Refresh Phase → Draw Phase → DON Phase → Main Phase → End Phase
     ↓              ↓            ↓            ↓           ↓
  (Auto)        (Auto)       (Auto)      (Manual)    (Manual)
```

---

## Card Selection

### How to Select Cards

**Mouse/Touch:**
- Click or tap on any card in your hand or on the board to select it
- The selected card will be highlighted with a **yellow glow**
- Click the same card again to deselect it

**Keyboard:**
- Press `Tab` to cycle through cards in your hand
- Press `Enter` to select/deselect the focused card
- Use `Arrow Left/Right` to navigate between all interactive cards

### Visual Feedback

- **Yellow Glow**: Card is selected
- **Blue Glow**: Card is focused (keyboard navigation)
- **Green Glow**: Card is a valid attack target
- **Dimmed**: Card is not a valid target during attack mode
- **Orange Glow**: Card is involved in a battle (temporary)

### What Happens When You Select a Card

When you select a card during the Main Phase, the **Action Panel** appears on the right side of the screen showing available actions:

- **Play Card** (if card is in hand and you have enough DON)
- **Attack** (if card is an active character)
- **Attach DON** (if card is a character/leader and you have active DON)

---

## Playing Cards

### Requirements

To play a card from your hand:

1. It must be your **Main Phase**
2. You must have enough **active DON** to pay the card's cost
3. The target zone must not be full (Character Area max: 5 cards)

### How to Play Cards

**Method 1: Using the Action Panel**
1. Select a card in your hand (click or tap)
2. Click the **"Play Card"** button in the Action Panel
3. The card will be played to the appropriate zone

**Method 2: Drag and Drop**
1. Click and hold a card in your hand
2. Drag it to the Character Area or Stage Area
3. Release to play the card

**Method 3: Keyboard**
1. Press `Tab` to focus a card in your hand
2. Press `Enter` to select it
3. Press `Space` to execute the primary action (Play Card)

### Cost Payment

When you play a card:
- The game automatically rests (taps) the required number of DON cards
- DON cards are rested from left to right in your Cost Area
- You'll see a success notification: "Card played successfully!"

### Visual Feedback

- **Success Animation**: Card smoothly moves from hand to board with a bounce effect
- **Success Toast**: Green notification at the top of the screen
- **DON Cards Rest**: DON cards rotate 90° to show they're used

### Error Messages

- **"Insufficient DON!"**: You don't have enough active DON to pay the cost
- **"Character area is full (5/5)"**: You already have 5 characters on the board
- **"Cannot play cards during [Phase]"**: You can only play cards during Main Phase

---

## Attacking

### Requirements

To attack with a character:

1. It must be your **Main Phase**
2. The character must be **active** (not rested)
3. The character must be in your **Character Area** or be your **Leader**

### How to Attack

**Step 1: Select Your Attacker**
- Click on an active character in your Character Area
- The Action Panel will show an **"Attack"** button

**Step 2: Enter Attack Mode**
- Click the **"Attack"** button
- Valid targets will be highlighted with a **green glow**
- Invalid targets will be dimmed

**Step 3: Select Your Target**
- Click on a valid target (opponent's leader or rested characters)
- The attack will be declared automatically

**Keyboard Alternative:**
1. Press `Tab` to focus your character
2. Press `Enter` to select it
3. Press `Space` to start attack mode
4. Use `Arrow Keys` to navigate to a target
5. Press `Enter` to attack
6. Press `Escape` to cancel attack mode

### Valid Attack Targets

You can attack:
- **Opponent's Leader** (always valid)
- **Opponent's Rested Characters** (characters that are tapped)

You cannot attack:
- **Opponent's Active Characters** (unless they have a special ability)
- **Your own cards**

### Battle Resolution

When you attack:

1. **Attacker Rests**: Your attacking character rotates 90° (becomes rested)
2. **Damage Calculation**: 
   - **vs Leader**: Deal 1 life damage (or 2 if attacker has Double Attack)
   - **vs Character**: Compare power values
3. **KO Check**: If a character's power drops to 0 or below, it's sent to trash
4. **Success Notification**: Shows the battle result with power values

### Visual Feedback

- **Battle Highlight**: Both attacker and defender glow orange during battle
- **Success Toast**: Shows damage dealt and power comparison
- **Attacker Rests**: Attacking character rotates 90°
- **KO Animation**: Defeated characters move to trash

### Error Messages

- **"Character is rested and cannot attack"**: The character is already tapped
- **"Invalid attack target"**: You clicked on a card that can't be attacked
- **"Cannot attack outside of Main Phase"**: Attacks only work during Main Phase

---

## DON Attachment

### What is DON Attachment?

DON cards can be attached to characters to permanently increase their power by **+1000**. This is different from using DON to pay costs.

### Requirements

To attach DON to a character:

1. It must be your **Main Phase**
2. You must have at least one **active DON** in your Cost Area
3. You must select a **character or leader** on the board

### How to Attach DON

**Step 1: Select Your Character**
- Click on a character in your Character Area or your Leader
- The Action Panel will show an **"Attach DON"** button

**Step 2: Enter DON Attach Mode**
- Click the **"Attach DON"** button
- You'll enter DON attachment mode

**Step 3: Select a DON Card**
- Click on an active DON card in your Cost Area
- The DON will be automatically attached to your selected character

**Keyboard Alternative:**
1. Select your character with `Tab` and `Enter`
2. Press `Space` to open the Action Panel
3. Navigate to "Attach DON" and press `Enter`
4. Select a DON card
5. Press `Escape` to cancel DON attach mode

### Effects of DON Attachment

When you attach DON:
- **Power Increase**: Character's power increases by **+1000**
- **Visual Indicator**: A purple badge appears on the character showing DON count
- **Permanent**: The DON stays attached until the character leaves play
- **Success Notification**: "DON attached to [Character]! Power +1000"

### Visual Feedback

- **DON Badge**: Purple circle in the bottom-right corner of the card
- **DON Count**: Number inside the badge shows how many DON are attached
- **Success Toast**: Green notification confirming the attachment
- **Power Update**: Character's power value updates immediately

### Error Messages

- **"No active DON cards available"**: All your DON are rested or you have none
- **"DON card is rested"**: You clicked on a rested DON (can't be attached)
- **"Cannot attach DON outside of Main Phase"**: DON attachment only works during Main Phase

---

## Keyboard Navigation

The game fully supports keyboard navigation for accessibility.

### Navigation Keys

| Key | Action |
|-----|--------|
| `Tab` | Cycle through cards in your hand (forward) |
| `Shift + Tab` | Cycle through cards in your hand (backward) |
| `Arrow Left/Right` | Navigate between all interactive cards |
| `Enter` | Select/deselect the focused card |
| `Space` | Execute the primary action for selected card |
| `Escape` | Cancel attack mode, DON attach mode, or deselect card |

### Keyboard Workflow Examples

**Playing a Card:**
```
Tab → Enter (select) → Space (play)
```

**Attacking:**
```
Tab → Enter (select attacker) → Space (start attack) → 
Arrow Keys (navigate to target) → Enter (attack)
```

**Attaching DON:**
```
Tab → Enter (select character) → Space (start DON attach) → 
Tab (focus DON) → Enter (attach)
```

**Canceling Actions:**
```
Escape (cancel any mode or deselect)
```

---

## Accessibility Features

### Screen Reader Support

The game includes comprehensive screen reader support:

- **Card Selection Announcements**: "Monkey D. Luffy selected. Cost 5, Power 6000"
- **Action Results**: "Card played successfully" or "Attack successful"
- **Error Messages**: "Error: Insufficient DON! Need 5 DON but only have 3 active DON"
- **Phase Changes**: "Phase changed to Main Phase"

### ARIA Labels

All interactive elements have descriptive ARIA labels:

- **Play Card Button**: "Play Monkey D. Luffy for 5 DON"
- **Attack Button**: "Attack with Roronoa Zoro, power 5000"
- **Attach DON Button**: "Attach DON to Nami, increases power by 1000"

### Visual Indicators

- **High Contrast**: Clear color coding for different states
- **Multiple Feedback Channels**: Visual, audio (screen reader), and text notifications
- **Focus Indicators**: Blue glow shows keyboard focus
- **Large Touch Targets**: All interactive elements are easy to click/tap

---

## Troubleshooting

### Common Issues

**Q: I can't play cards from my hand**
- A: Make sure it's your Main Phase (check the phase indicator at the top)
- A: Verify you have enough active DON to pay the card's cost
- A: Check if your Character Area is full (max 5 cards)

**Q: The "Attack" button doesn't appear**
- A: Make sure the selected character is active (not rested)
- A: Verify it's your Main Phase
- A: Check that the card is in your Character Area or is your Leader

**Q: I can't attack a character**
- A: You can only attack rested (tapped) characters
- A: You can always attack the opponent's leader
- A: Make sure you're not trying to attack your own cards

**Q: DON attachment isn't working**
- A: Verify you have active DON in your Cost Area
- A: Make sure the selected card is a character or leader
- A: Check that it's your Main Phase

**Q: The game won't advance to the next phase**
- A: Click the "End Main Phase" or "Next Phase" button at the top center
- A: The Main Phase requires manual advancement (it doesn't auto-advance)

**Q: Cards aren't responding to clicks**
- A: Make sure it's your turn (check the turn indicator)
- A: Verify you're in the correct phase
- A: Try refreshing the page if the issue persists

### Performance Tips

- **Reduce Hover Effects**: If the game feels slow, minimize mouse movement over cards
- **Use Keyboard Navigation**: Keyboard controls are often faster than mouse
- **Close Other Tabs**: Free up browser resources for better performance

### Getting Help

If you encounter issues not covered here:

1. Check the browser console for error messages (F12 → Console tab)
2. Review the `USAGE_EXAMPLES.md` file for advanced usage patterns
3. Check the component README files for technical details:
   - `GameBoard.README.md`
   - `ActionPanel.README.md`
   - `CardMesh.README.md`

---

## Quick Reference

### Main Phase Actions

| Action | Requirements | How To |
|--------|-------------|--------|
| **Play Card** | Card in hand, sufficient DON, zone not full | Select card → Click "Play Card" or drag to board |
| **Attack** | Active character, Main Phase | Select character → Click "Attack" → Select target |
| **Attach DON** | Character in play, active DON available | Select character → Click "Attach DON" → Select DON |

### Visual States

| Color | Meaning |
|-------|---------|
| Yellow Glow | Selected card |
| Blue Glow | Focused card (keyboard) |
| Green Glow | Valid attack target |
| Orange Glow | Card in battle |
| Dimmed | Invalid target |
| Purple Badge | DON attached |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate cards |
| `Enter` | Select/Deselect |
| `Space` | Execute action |
| `Escape` | Cancel/Deselect |
| `Arrow Keys` | Navigate all cards |

---

## Component Architecture

For developers working with the codebase:

```
GameBoard (Main Container)
├── GameScene (3D Rendering)
│   ├── CardMesh (Individual Cards)
│   ├── DonMesh (DON Cards)
│   └── ZoneRenderer (Zone Layouts)
├── ActionPanel (Action Buttons)
├── ErrorToast (Error Messages)
└── SuccessToast (Success Messages)
```

### Key Files

- `GameBoard.tsx` - Main game UI and interaction logic
- `GameScene.tsx` - 3D scene rendering with Three.js
- `CardMesh.tsx` - Individual card rendering and interactions
- `ActionPanel.tsx` - Action button panel and availability logic
- `ErrorToast.tsx` - Error notification component
- `SuccessToast.tsx` - Success notification component

### Related Documentation

- `USAGE_EXAMPLES.md` - Code examples for extending the system
- `GameBoard.README.md` - Technical details for GameBoard component
- `ActionPanel.README.md` - Technical details for ActionPanel component
- `CardMesh.README.md` - Technical details for CardMesh component

---

## Version History

- **v1.0** - Initial Main Phase UI implementation
  - Card selection with visual feedback
  - Play card functionality with drag-and-drop
  - Attack system with target highlighting
  - DON attachment system
  - Keyboard navigation support
  - Screen reader accessibility
  - Error and success notifications

---

## License

This is part of the One Piece TCG game implementation. See the main project README for license information.
