# Card Animation and Drag-Drop System

## Overview

The game now supports smooth card animations and interactive drag-and-drop functionality for placing cards on the board.

## Features

### 1. Card Animations

Cards smoothly animate when moving between zones using spring physics.

**CardAnimator** handles all card movement animations:
- Smooth transitions between positions
- Configurable easing functions (linear, cubic, spring, etc.)
- Automatic cleanup of completed animations

```typescript
// Example: Animate a card from hand to character area
animator.startAnimation(
  cardId,
  { position: [0, 0, -8], rotation: [0, 0, 0] },
  { position: [2, 0, -2], rotation: [0, 0, 0] },
  500, // duration in ms
  Easing.easeOutCubic
);
```

### 2. Drag and Drop

Players can drag cards from their hand and drop them onto valid zones.

**DragDropManager** handles all drag-drop logic:
- Raycasting to detect mouse position in 3D space
- Valid drop zone detection
- Snap-to-grid positioning
- Visual feedback for valid/invalid drops

**Features:**
- Cards in hand are draggable
- Valid drop zones highlight in green when hovering
- Cards snap to nearest valid position when dropped
- Orbit controls automatically disable while dragging

### 3. Visual Feedback

**Zone Highlighting:**
- Normal zones: Dark green with 30% opacity
- Valid drop targets: Brighter green with 40% opacity
- Hovered drop target: Bright green with 60% opacity

**Card Highlighting:**
- Hovered cards: Yellow glow, elevated 0.3 units
- Dragging cards: Green glow, elevated 1 unit

## Usage in GameBoard

```typescript
<GameScene
  engine={engine}
  renderingInterface={renderingInterface}
  boardState={boardState}
  onCardClick={(cardId) => console.log('Card clicked:', cardId)}
  onCardMove={(cardId, fromZone, toZone, toPlayerId) => {
    // Handle card movement
    console.log(`Card ${cardId} moved from ${fromZone} to ${toZone}`);
    // Update game state via engine
  }}
/>
```

## Implementation Details

### CardAnimator

Located in `lib/game-engine/rendering/CardAnimator.ts`

- Manages multiple simultaneous animations
- Updates on every frame via `useFrame` hook
- Supports callbacks on animation completion
- Provides various easing functions

### DragDropManager

Located in `lib/game-engine/rendering/DragDropManager.ts`

- Registers drop zones with bounds and snap positions
- Tracks current drag state
- Performs raycasting to ground plane
- Calculates nearest snap position

### Integration

The systems are integrated in:
- `GameScene.tsx` - Main scene setup and event handling
- `CardMesh.tsx` - Individual card rendering with drag support
- `ZoneRenderer.tsx` - Zone visualization with drop feedback

## Customization

### Easing Functions

Available easing functions in `CardAnimator`:
- `Easing.linear`
- `Easing.easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `Easing.easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `Easing.spring` - Bouncy spring effect

### Drop Zone Configuration

Modify `ZONE_LAYOUTS` in `GameScene.tsx` to adjust:
- Zone positions
- Zone sizes
- Snap positions
- Maximum cards per zone

### Valid Drop Zones

Currently, cards from hand can be dropped in:
- `CHARACTER_AREA`
- `STAGE_AREA`
- `TRASH`

Modify `handleDragStart` in `GameScene.tsx` to change valid zones based on game rules.

## Future Enhancements

- [ ] Card rotation during drag
- [ ] Multi-card selection and drag
- [ ] Animated card flipping (face up/down)
- [ ] Trail effects during movement
- [ ] Sound effects for card placement
- [ ] Undo/redo with animation replay
- [ ] Touch/mobile support for drag-drop
