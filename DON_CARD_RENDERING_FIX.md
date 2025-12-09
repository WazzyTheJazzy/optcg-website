# DON Card Rendering Fix

## Issue Identified

DON cards were not appearing on the game board because they were being filtered out and never rendered.

### Root Cause

1. **DON zones were filtered out** in GameScene.tsx with a comment saying "they need special rendering"
2. **No DON renderer existed** - the special rendering was never implemented
3. **DON cards have a different structure** than regular cards:
   - Regular cards: `CardVisualState` with `metadata` property
   - DON cards: `DonVisualState` without `metadata` (just id, zone, state, owner)

## Solution

Created a dedicated DON card renderer that handles the simpler DON card structure:

### New Component: DonMesh.tsx

- `DonMesh`: Renders a single DON card as a colored cylinder
  - Gold (#FFD700) when ACTIVE
  - Brown (#8B7355) when RESTED
- `DonZoneRenderer`: Renders all DON cards in a zone with proper spacing/stacking

### Changes Made

1. **components/game/DonMesh.tsx** (NEW)
   - Simple 3D cylinder geometry for DON cards
   - Color-coded by state (active/rested)
   - Supports both stacking (DON deck) and spreading (cost area)

2. **components/game/GameScene.tsx**
   - Added `DonZoneRenderer` import
   - Removed filter that was blocking DON zones
   - Added explicit DON rendering for both players:
     - DON deck (stacked)
     - Cost area (spread horizontally)

## DON Card Appearance

- **Shape**: Circular tokens (cylinders viewed from above)
- **Size**: 1.5 units diameter (smaller than regular cards)
- **Colors**:
  - Active DON: Gold/yellow
  - Rested DON: Brown
- **Layout**:
  - DON Deck: Stacked vertically at position [-10, 0, -4]
  - Cost Area: Spread horizontally at position [-10, 0, -2]

## Impact

- DON cards now visible on the board
- Players can see their DON deck and cost area
- Active vs rested DON are visually distinct
- Proper positioning for both players

## Testing

To verify the fix:
1. Start a game
2. Look at the left side of your board
3. You should see:
   - A stack of gold cylinders (DON deck) at the back left
   - Gold cylinders spread horizontally (cost area) in front of the DON deck
4. After DON phase, cost area should show 2 DON cards
5. After using DON to play cards, some should turn brown (rested)

Expected positions:
- Player 1 DON Deck: [-10, 0, -4]
- Player 1 Cost Area: [-10, 0, -2]
- Player 2 DON Deck: [-10, 0, 4]
- Player 2 Cost Area: [-10, 0, 2]
