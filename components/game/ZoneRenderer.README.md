# ZoneRenderer Component

## Overview

The `ZoneRenderer` component is a Three.js-based React component that renders game zones with boundaries, labels, and card layouts for the One Piece TCG engine. It handles different zone types (deck stack, hand fan, character grid, etc.) and updates when zone contents change via RenderingInterface events.

## Features

- **Zone Boundaries**: Visual boundaries for each zone with hover effects
- **Zone Labels**: Display zone names and card counts
- **Multiple Layout Types**: Support for stack, fan, grid, horizontal, and single card layouts
- **DON Card Support**: Specialized rendering for DON cards in DON zones
- **Interactive**: Click handlers for both zones and individual cards
- **Responsive**: Updates automatically when zone contents change

## Zone Layout Types

### STACK
Cards are stacked vertically with small offsets. Used for:
- Deck
- Trash
- DON Deck
- Limbo

### FAN
Cards are fanned out horizontally. Used for:
- Hand

### GRID
Cards arranged in a horizontal grid. Used for:
- Character Area

### HORIZONTAL
Cards in a horizontal line with spacing. Used for:
- Life
- Cost Area

### SINGLE
Single card slot. Used for:
- Leader Area
- Stage Area

## Usage

### Basic Zone Rendering

```tsx
import { ZoneRenderer, ZoneLayoutType } from '@/components/game/ZoneRenderer';
import { PlayerId, ZoneId } from '@/lib/game-engine/core/types';

function MyGameBoard() {
  const cards = [...]; // CardVisualState[]
  
  return (
    <ZoneRenderer
      playerId={PlayerId.PLAYER_1}
      zoneId={ZoneId.HAND}
      cards={cards}
      position={[0, 0, -8]}
      rotation={[0, 0, 0]}
      layout={ZoneLayoutType.FAN}
      onCardClick={(cardId) => console.log('Card clicked:', cardId)}
      onZoneClick={(playerId, zoneId) => console.log('Zone clicked:', playerId, zoneId)}
      showLabel={true}
      showBoundary={true}
    />
  );
}
```

### Rendering All Player Zones

```tsx
import { PlayerZonesRenderer } from '@/components/game/ZoneRenderer';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';

function MyGameBoard({ renderingInterface }: { renderingInterface: RenderingInterface }) {
  const boardState = renderingInterface.getBoardState();
  
  const zoneLayouts = {
    [ZoneId.DECK]: { position: [-8, 0, -6], rotation: [0, 0, 0] },
    [ZoneId.HAND]: { position: [0, 0, -8], rotation: [0, 0, 0] },
    // ... other zones
  };
  
  return (
    <PlayerZonesRenderer
      playerId={PlayerId.PLAYER_1}
      zones={boardState.player1.zones}
      zoneLayouts={zoneLayouts}
      onCardClick={(cardId) => console.log('Card clicked:', cardId)}
      onZoneClick={(playerId, zoneId) => console.log('Zone clicked:', playerId, zoneId)}
    />
  );
}
```

### DON Card Rendering

DON cards are automatically detected and rendered with a simplified representation:

```tsx
// DON zones are automatically handled
<ZoneRenderer
  playerId={PlayerId.PLAYER_1}
  zoneId={ZoneId.COST_AREA}
  cards={donCards} // DonVisualState[]
  position={[-10, 0, -2]}
  rotation={[0, 0, 0]}
  layout={ZoneLayoutType.HORIZONTAL}
/>
```

## Props

### ZoneRenderer Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `playerId` | `PlayerId` | Yes | The player who owns this zone |
| `zoneId` | `ZoneId` | Yes | The zone identifier |
| `cards` | `CardVisualState[] \| DonVisualState[]` | Yes | Cards in the zone |
| `position` | `[number, number, number]` | Yes | 3D position of the zone |
| `rotation` | `[number, number, number]` | Yes | 3D rotation of the zone |
| `layout` | `ZoneLayoutType` | Yes | Layout type for card positioning |
| `onCardClick` | `(cardId: string) => void` | No | Handler for card clicks |
| `onZoneClick` | `(playerId: PlayerId, zone: ZoneId) => void` | No | Handler for zone clicks |
| `showLabel` | `boolean` | No | Show zone label (default: true) |
| `showBoundary` | `boolean` | No | Show zone boundary (default: true) |

### PlayerZonesRenderer Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `playerId` | `PlayerId` | Yes | The player ID |
| `zones` | `PlayerVisualState['zones']` | Yes | All zones for the player |
| `zoneLayouts` | `Record<ZoneId, { position, rotation }>` | Yes | Layout config for each zone |
| `onCardClick` | `(cardId: string) => void` | No | Handler for card clicks |
| `onZoneClick` | `(playerId: PlayerId, zone: ZoneId) => void` | No | Handler for zone clicks |

## Card Positioning

The component automatically calculates card positions based on the layout type:

- **STACK**: Cards offset vertically by `stackOffset` (default: 0.01 units)
- **FAN**: Cards spread horizontally with `spacing` between them (default: 1.5 units)
- **GRID**: Cards arranged in a grid with `spacing` between them (default: 2 units)
- **HORIZONTAL**: Cards in a line with `spacing` between them (default: 0.3 units)
- **SINGLE**: Single card at the base position

## Styling

### Zone Boundaries

Zone boundaries are semi-transparent boxes that highlight on hover:
- Default color: `#2a5c3a` (dark green)
- Hover color: `#4a7c59` (lighter green)
- Opacity: 0.3

### Zone Labels

Labels are rendered above each zone with:
- Zone name in white
- Card count in light gray
- Black outline for readability

### DON Cards

DON cards have a distinctive purple color:
- Default: `#9d4edd`
- Hover: `#b565ff`
- White "DON" text

## Integration with RenderingInterface

The ZoneRenderer automatically updates when zone contents change:

```tsx
import { useEffect, useState } from 'react';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';

function GameBoard({ renderingInterface }: { renderingInterface: RenderingInterface }) {
  const [boardState, setBoardState] = useState(renderingInterface.getBoardState());
  
  useEffect(() => {
    // Subscribe to events that affect zone contents
    const updateBoard = () => setBoardState(renderingInterface.getBoardState());
    
    renderingInterface.onCardMoved(updateBoard);
    renderingInterface.onCardStateChanged(updateBoard);
    renderingInterface.onPowerChanged(updateBoard);
    
    return () => {
      // Cleanup subscriptions
    };
  }, [renderingInterface]);
  
  // Render zones with updated board state
  return (
    <PlayerZonesRenderer
      playerId={PlayerId.PLAYER_1}
      zones={boardState.player1.zones}
      zoneLayouts={zoneLayouts}
    />
  );
}
```

## Performance Considerations

- Card positions are memoized and only recalculated when card count or layout changes
- Layout configurations are cached per zone type
- DON cards use simplified geometry for better performance
- Hover effects use smooth transitions without re-rendering

## Customization

### Custom Zone Layouts

You can override default layouts by providing custom configurations:

```tsx
const customLayout: ZoneLayoutConfig = {
  type: ZoneLayoutType.GRID,
  spacing: 3,
  stackOffset: 0,
  maxCards: 10,
  boundarySize: [15, 5],
};
```

### Custom Colors

Modify the component's material colors to match your theme:

```tsx
// In ZoneRenderer.tsx
<meshStandardMaterial
  color={hovered ? '#yourHoverColor' : '#yourDefaultColor'}
  transparent
  opacity={0.3}
/>
```

## Requirements Satisfied

This component satisfies the following requirements from the spec:

- **16.1**: Provides rendering interface for Three.js visualization
- **16.2**: Subscribes to RenderingInterface events for state updates
- **16.4**: Provides card position and state data for Three.js scene updates
- **16.5**: Supports querying current visual state of zones for rendering

## Related Components

- `CardMesh`: Renders individual cards within zones
- `GameScene`: Main scene container that uses ZoneRenderer
- `RenderingInterface`: Provides zone state and event subscriptions
