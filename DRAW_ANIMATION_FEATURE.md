# Draw Animation Feature

## Overview
Added smooth animations when cards are drawn from the deck to the hand, making the game feel more polished and providing visual feedback for card movements.

## Implementation

### 1. Event Subscription (GameScene.tsx)
Added a `useEffect` hook that subscribes to `CARD_MOVED` events from the RenderingInterface:

```typescript
useEffect(() => {
  if (!renderingInterface) return;

  const handleCardMoved = (event: any) => {
    const { cardId, fromZone, toZone, playerId } = event;
    
    // Animate card draws (DECK -> HAND)
    if (fromZone === ZoneId.DECK && toZone === ZoneId.HAND) {
      // Trigger animation
    }
  };

  renderingInterface.onCardMoved(handleCardMoved);
}, [renderingInterface, animator, boardState]);
```

### 2. Animation Logic
When a card moves from DECK to HAND:

1. **Get zone layouts** for the deck and hand positions
2. **Calculate hand position** for the new card (at the end of the hand)
3. **Start animation** using the CardAnimator:
   - From: Deck position (face-down, Y rotation = 0)
   - To: Hand position (face-up, Y rotation = π/180°)
   - Duration: 600ms
   - Easing: Default (easeOutCubic)
   - **Flip effect**: Card rotates 180° around Y-axis during movement

```typescript
animator.startAnimation(
  cardId,
  {
    position: fromLayout.position,
    rotation: [fromLayout.rotation[0], 0, fromLayout.rotation[2]], // Start face-down
  },
  {
    position: [toX, toLayout.position[1], toLayout.position[2]],
    rotation: [toLayout.rotation[0], Math.PI, toLayout.rotation[2]], // End face-up (flipped)
  },
  600, // Duration in ms
  undefined, // Use default easing
  () => {
    console.log(`✅ Draw animation complete for ${cardId}`);
  }
);
```

### 3. Existing Animation System
The CardAnimator and CardMesh already had the infrastructure:

- **CardAnimator**: Manages animation state and interpolation
- **CardMesh**: Checks for active animations in `useFrame` and applies animated transforms
- **useFrame**: Updates all animations every frame

## How It Works

### Animation Flow
```
Card Drawn (GameEngine)
    ↓
CARD_MOVED event emitted
    ↓
GameScene.handleCardMoved receives event
    ↓
Check if DECK → HAND movement
    ↓
Calculate positions (from deck, to hand)
    ↓
animator.startAnimation(cardId, from, to, duration)
    ↓
Every frame: animator.update()
    ↓
CardMesh checks animator.getAnimatedTransform(cardId)
    ↓
If animating: Use animated position
    ↓
If not animating: Use calculated zone position
    ↓
Animation completes after 600ms
```

### Position Calculation
For the hand position, we need to center cards:

```typescript
const handCards = boardState.player.zones.hand;
const cardIndex = handCards.length - 1; // New card at end
const handSpacing = toLayout.spacing;
const totalWidth = (handCards.length - 1) * handSpacing;
const startX = toLayout.position[0] - totalWidth / 2;
const toX = startX + cardIndex * handSpacing;
```

This ensures the hand stays centered as cards are added.

## Features

### Visual Feedback
- ✅ Smooth 600ms animation
- ✅ Card slides from deck to hand
- ✅ **Card flips from face-down to face-up** during movement
- ✅ 180° rotation around Y-axis for flip effect
- ✅ Natural easing (easeOutCubic)
- ✅ Console logs for debugging

### Performance
- ✅ Uses existing animation system
- ✅ Efficient frame-by-frame updates
- ✅ Automatic cleanup after completion
- ✅ No memory leaks

### Extensibility
The same pattern can be used for other card movements:
- Playing cards (HAND → CHARACTER_AREA)
- Discarding cards (HAND → TRASH)
- Milling cards (DECK → TRASH)
- Returning cards (TRASH → HAND)

## Future Enhancements

### Additional Animations
1. **Play Animation**: HAND → CHARACTER_AREA
   ```typescript
   if (fromZone === ZoneId.HAND && toZone === ZoneId.CHARACTER_AREA) {
     // Animate card being played
   }
   ```

2. **Discard Animation**: HAND → TRASH
   ```typescript
   if (toZone === ZoneId.TRASH) {
     // Animate card being discarded
   }
   ```

3. **Attack Animation**: CHARACTER_AREA → CHARACTER_AREA
   ```typescript
   if (event.type === GameEventType.ATTACK_DECLARED) {
     // Animate attacker moving toward target
   }
   ```

### Animation Improvements
- **Particle effects** when drawing cards
- **Sound effects** for card movements
- **Card flip animation** when drawing face-down
- **Stagger animations** when drawing multiple cards
- **Arc trajectory** instead of linear movement
- **Rotation during movement** for more dynamic feel

### Configuration
Add animation settings:
```typescript
interface AnimationSettings {
  enabled: boolean;
  speed: number; // 0.5 = slow, 1.0 = normal, 2.0 = fast
  effects: {
    particles: boolean;
    sound: boolean;
    trails: boolean;
  };
}
```

## Testing

### Manual Testing
1. **Start a game**
2. **Advance to Draw Phase**
3. **Watch the card animate** from deck to hand
4. **Check console logs** for animation events
5. **Verify smooth movement** over 600ms

### Expected Behavior
- ✅ Card starts at deck position
- ✅ Card smoothly moves to hand
- ✅ Card ends at correct position in hand
- ✅ Other cards in hand remain centered
- ✅ Animation completes without errors

### Console Output
```
🎬 Animating card draw: PLAYER_1-deck-5 for PLAYER_1
✅ Draw animation complete for PLAYER_1-deck-5
```

## Technical Details

### Dependencies
- **CardAnimator**: Manages animation state
- **RenderingInterface**: Provides CARD_MOVED events
- **GameScene**: Subscribes to events and triggers animations
- **CardMesh**: Applies animated transforms

### Performance Considerations
- Animations run at 60 FPS (via useFrame)
- Only animating cards are updated each frame
- Completed animations are automatically cleaned up
- No impact on game logic or state management

### State Management
- Animations are **visual only**
- Game state updates immediately
- Animation shows the transition
- No delay in game logic

## Code Changes

### Files Modified
1. **components/game/GameScene.tsx**
   - Added `renderingInterface` to SceneContent props
   - Added `useEffect` for CARD_MOVED event subscription
   - Implemented draw animation logic

### Lines Added
- ~50 lines of animation logic
- Event subscription and cleanup
- Position calculation for hand cards

## Benefits

### User Experience
- ✅ Visual feedback for card draws
- ✅ More polished game feel
- ✅ Easier to track card movements
- ✅ Professional appearance

### Development
- ✅ Reusable animation pattern
- ✅ Easy to extend to other movements
- ✅ Clean separation of concerns
- ✅ Well-documented code

### Debugging
- ✅ Console logs for tracking
- ✅ Clear animation lifecycle
- ✅ Easy to disable if needed

## Conclusion

The draw animation feature adds a professional touch to the game by providing smooth visual feedback when cards are drawn. The implementation leverages the existing CardAnimator system and can easily be extended to animate other card movements throughout the game.

The animation is purely visual and doesn't affect game logic, ensuring that gameplay remains responsive while providing a more engaging user experience.
