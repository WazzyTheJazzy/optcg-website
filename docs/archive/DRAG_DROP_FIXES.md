# Drag-Drop Card Placement Fixes

## Issue
Cards could be dragged but would snap back to their original position instead of staying on the board.

## Root Cause
Cards can only be played during the **MAIN phase** of the game. The game starts in REFRESH phase and needs to progress through several phases before reaching MAIN.

## Solution Applied

### 1. Phase Validation
Added checks to ensure cards can only be played during MAIN phase:
- Shows error message if trying to play during wrong phase
- Shows error if it's not the player's turn
- Provides helpful feedback about what to do

### 2. Visual Feedback
- **Continue Button**: Now shows "Click to reach Main Phase" hint when not in MAIN
- **Error Toast**: Red notification appears when invalid actions are attempted
- **Console Logging**: Detailed logs show why card placement failed

### 3. User Instructions
The game now clearly communicates:
- Current phase and turn number
- When cards can be played
- How to progress to the correct phase

## How to Play Cards

1. **Start the game** at `/game`
2. **Click "Continue"** button repeatedly until you reach "Main Phase"
3. **Drag cards** from your hand to the board
4. Cards will now **stay in place** when dropped in valid zones

## Valid Drop Zones
- **Character Area**: For character cards
- **Stage Area**: For stage cards

## Error Messages You Might See

| Message | Meaning | Solution |
|---------|---------|----------|
| "Cannot play cards during REFRESH phase" | Wrong phase | Click "Continue" to advance |
| "It's not your turn!" | Opponent's turn | Wait for your turn |
| "Cannot play this card. You may not have enough DON..." | Insufficient resources or wrong card type | Check DON count or card type |

## Technical Details

### Files Modified
- `components/game/GameBoard.tsx`:
  - Added `handleError` function
  - Added `errorMessage` state
  - Added phase validation in `handleCardMove`
  - Added error toast UI
  - Enhanced Continue button with hints

### Game Flow
```
REFRESH → DRAW → DON → MAIN → END
                         ↑
                    Play cards here!
```

### What Happens When You Drag a Card

1. **Drag Start**: Card elevates and glows green
2. **Drag Over Zone**: Valid zones highlight
3. **Drop**: 
   - ✅ If MAIN phase + your turn + valid card → Card plays and stays
   - ❌ Otherwise → Error message shows, card returns to hand

## Testing

To test the drag-drop:
1. Visit `/game`
2. Click "Continue" 3-4 times to reach MAIN phase
3. Drag a card from hand to Character Area
4. Card should animate and stay in place
5. Board state updates automatically

## Next Steps

To make card playing easier for testing:
- [ ] Add "Skip to Main Phase" button
- [ ] Add "Test Mode" that bypasses phase restrictions
- [ ] Show DON cost on cards
- [ ] Highlight playable cards in hand
- [ ] Add drag preview showing if drop is valid

## Known Limitations

- Cards require sufficient DON to play (game rule)
- Only works during MAIN phase (game rule)
- Only works on your turn (game rule)
- Character cards go to Character Area, Stage cards to Stage Area

The drag-drop system is working correctly - it just follows the actual game rules!
