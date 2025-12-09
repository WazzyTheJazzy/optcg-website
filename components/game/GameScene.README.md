# GameScene Component

The `GameScene` component is a Three.js-based React component that renders the One Piece TCG game board in 3D. It provides the visual layer for the game engine, handling scene setup, camera controls, lighting, and zone layouts.

## Features

- **3D Scene Setup**: Complete Three.js scene with camera, lights, and renderer
- **Zone Layouts**: Visual representation of all game zones for both players
- **Event Subscriptions**: Automatically updates visuals based on game state changes
- **Camera Controls**: Orbit controls for rotating, panning, and zooming
- **Window Resize Handling**: Responsive to window size changes
- **Interactive Zones**: Clickable zone markers with hover effects

## Usage

### Basic Setup

```tsx
import { GameScene } from '@/components/game/GameScene';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';
import { RulesContext } from '@/lib/game-engine/rules/RulesContext';
import rulesData from '@/lib/game-engine/rules/rules.json';

function MyGameComponent() {
  const rules = new RulesContext(rulesData);
  const engine = new GameEngine(rules);
  const renderingInterface = new RenderingInterface(engine);

  // Setup game with decks
  engine.setupGame(deck1, deck2);

  return (
    <GameScene
      engine={engine}
      renderingInterface={renderingInterface}
    />
  );
}
```

### With Event Handlers

```tsx
function MyGameComponent() {
  const handleCardClick = (cardId: string) => {
    console.log('Card clicked:', cardId);
    // Handle card interaction
  };

  const handleZoneClick = (playerId: PlayerId, zone: ZoneId) => {
    console.log('Zone clicked:', playerId, zone);
    // Handle zone interaction
  };

  return (
    <GameScene
      engine={engine}
      renderingInterface={renderingInterface}
      onCardClick={handleCardClick}
      onZoneClick={handleZoneClick}
    />
  );
}
```

## Props

### `GameSceneProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `engine` | `GameEngine` | Yes | The game engine instance |
| `renderingInterface` | `RenderingInterface` | Yes | The rendering interface for event subscriptions |
| `onCardClick` | `(cardId: string) => void` | No | Callback when a card is clicked |
| `onZoneClick` | `(playerId: PlayerId, zone: ZoneId) => void` | No | Callback when a zone is clicked |

## Zone Layouts

The component defines zone layouts for both players with the following structure:

### Player 1 (Bottom of Board)
- **Deck**: Left side, back row
- **Hand**: Center, back row (spread horizontally)
- **Trash**: Right side, back row
- **Life**: Left-center, back row
- **DON Deck**: Far left, mid-back row
- **Cost Area**: Far left, mid-front row
- **Leader Area**: Center, mid-back row
- **Character Area**: Center, mid-front row (up to 5 cards)
- **Stage Area**: Right-center, mid-back row

### Player 2 (Top of Board)
- Mirror layout of Player 1, rotated 180 degrees

## Camera Controls

The scene includes orbit controls with the following features:

- **Rotation**: Left-click and drag to rotate around the board
- **Pan**: Right-click and drag to pan the camera
- **Zoom**: Scroll wheel to zoom in/out
- **Limits**:
  - Min distance: 10 units
  - Max distance: 50 units
  - Max polar angle: ~82 degrees (prevents going below the board)
- **Damping**: Smooth camera movement with damping factor of 0.05

## Lighting

The scene uses multiple light sources for optimal card visibility:

1. **Ambient Light**: Overall illumination (intensity: 0.5)
2. **Directional Light 1**: Main light with shadows (position: [10, 10, 5], intensity: 1)
3. **Directional Light 2**: Fill light (position: [-10, 10, -5], intensity: 0.5)
4. **Point Light**: Top-down light for card visibility (position: [0, 15, 0], intensity: 0.5)

## Event Subscriptions

The component automatically subscribes to the following game events:

- `CARD_MOVED`: Updates when cards move between zones
- `CARD_STATE_CHANGED`: Updates when cards change state (ACTIVE/RESTED)
- `POWER_CHANGED`: Updates when card power changes
- `PHASE_CHANGED`: Updates when game phase changes
- `TURN_START`: Updates at the start of each turn
- `TURN_END`: Updates at the end of each turn
- `GAME_OVER`: Updates when the game ends

## Zone Configuration

Each zone has the following configuration:

```typescript
interface ZoneLayout {
  position: [number, number, number];  // 3D position
  rotation: [number, number, number];  // Rotation in radians
  maxCards: number;                    // Maximum cards in zone
  spacing: number;                     // Space between cards
  stackOffset: number;                 // Vertical offset for stacked cards
}
```

## Customization

### Changing Zone Positions

Modify the `ZONE_LAYOUTS` constant to adjust zone positions:

```typescript
const ZONE_LAYOUTS: Record<PlayerId, Record<ZoneId, ZoneLayout>> = {
  [PlayerId.PLAYER_1]: {
    [ZoneId.DECK]: {
      position: [-8, 0, -6],  // Change X, Y, Z coordinates
      // ... other properties
    },
    // ... other zones
  },
};
```

### Changing Camera Settings

Modify the camera props in the `Canvas` component:

```tsx
<Canvas
  camera={{
    position: [0, 20, 0],  // Camera position
    fov: 60,               // Field of view
    near: 0.1,             // Near clipping plane
    far: 1000,             // Far clipping plane
  }}
>
```

### Changing Lighting

Modify the light components in `SceneContent`:

```tsx
<ambientLight intensity={0.5} />
<directionalLight position={[10, 10, 5]} intensity={1} />
```

## Future Enhancements

The following features are planned for future implementation:

1. **Card Rendering**: Actual 3D card meshes (Task 36)
2. **Zone Rendering**: Enhanced zone visualization (Task 37)
3. **Animations**: Card movement and state change animations
4. **Special Effects**: Visual effects for card abilities
5. **UI Overlay**: In-scene UI elements for game information
6. **Card Interactions**: Drag-and-drop card playing

## Dependencies

- `react`: React framework
- `@react-three/fiber`: React renderer for Three.js
- `@react-three/drei`: Useful helpers for React Three Fiber
- `three`: Three.js 3D library
- Game Engine modules:
  - `GameEngine`: Core game logic
  - `RenderingInterface`: Event bridge
  - `types`: Type definitions

## Performance Considerations

- The scene uses shadow mapping for realistic lighting (may impact performance on lower-end devices)
- Zone markers use transparent materials (minimal performance impact)
- Event subscriptions are cleaned up on component unmount
- Window resize handler is properly removed on unmount

## Troubleshooting

### Scene Not Rendering

- Ensure Three.js and React Three Fiber are installed
- Check that the engine and renderingInterface are properly initialized
- Verify that the component is mounted in a client-side context (use `'use client'` directive)

### Camera Not Moving

- Check that OrbitControls is properly configured
- Ensure the canvas has proper dimensions (width and height)
- Verify that the camera limits are not too restrictive

### Events Not Firing

- Ensure the game engine is properly set up with `setupGame()`
- Check that event handlers are properly bound
- Verify that the renderingInterface is connected to the engine

## Related Components

- **CardMesh** (Task 36): 3D card representation
- **ZoneRenderer** (Task 37): Enhanced zone visualization
- **GameBoard** (Task 38): Complete board layout with UI

## Requirements Satisfied

This component satisfies the following requirements:

- **16.1**: Provides rendering interface for Three.js visualization
- **16.2**: Emits state change events for visual updates
- **16.3**: Maintains separation between game logic and rendering
- **16.4**: Provides card position and state data for rendering
- **16.5**: Supports querying visual state of cards and zones
