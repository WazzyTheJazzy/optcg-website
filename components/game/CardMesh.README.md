# CardMesh Component

## Overview

The `CardMesh` component is a Three.js-based React component that renders individual One Piece TCG cards in 3D space. It handles card geometry, textures, state visualization, overlays, and user interactions.

## Features

### 1. Card Geometry
- **Rounded Corners**: Cards have realistic rounded corners using a custom shape geometry
- **3D Extrusion**: Cards have thickness and beveled edges for a realistic appearance
- **Standard Dimensions**: Based on real One Piece TCG card dimensions (63mm x 88mm)

### 2. Card Textures
- **Dynamic Loading**: Card images are loaded from URLs specified in card metadata (`imageUrl`)
- **Automatic Caching**: Textures are cached using CardImageLoader for performance
- **Fallback Support**: Generates placeholder textures when images fail to load
- **External URL Support**: Routes external URLs through image proxy to avoid CORS issues
- **Face-Up/Face-Down**: Cards automatically show face-up or face-down based on zone
- **Material Quality**: Uses PBR materials with appropriate roughness and metalness

### 3. State Visualization
- **ACTIVE State**: Card displayed at 0° rotation
- **RESTED State**: Card rotated 90° around Z-axis
- **Smooth Transitions**: Rotation changes are smooth and animated

### 4. Overlays
- **Power Display**: Shows current power in top-left corner (red text)
- **Cost Display**: Shows current cost in top-right corner (blue text)
- **DON Counter**: Shows number of given DON cards in bottom-right (purple badge)
- **Special Indicators**: Visual rings for alt art (cyan) and promo (gold) cards

### 5. Hover Effects
- **Elevation**: Hovered cards lift slightly above the board
- **Highlight**: Yellow glow effect on hover
- **Smooth Animation**: Uses frame-based interpolation for smooth movement

### 6. Click Interactions
- **Event Callbacks**: Supports click, hover, and unhover events
- **Card Selection**: Can be used to implement card selection and targeting

### 7. Zone-Based Positioning
- **Automatic Layout**: Cards position themselves based on zone layout configuration
- **Stacking**: Supports vertical stacking for deck/trash zones
- **Spreading**: Supports horizontal spreading for hand/character zones
- **Centering**: Automatically centers cards within their zone

## Usage

### Basic Usage

```tsx
import { CardMesh } from '@/components/game/CardMesh';
import { CardVisualState } from '@/lib/game-engine/rendering/RenderingInterface';

function MyScene() {
  const cardState: CardVisualState = {
    id: 'card-1',
    position: { zone: ZoneId.CHARACTER_AREA, index: 0 },
    state: CardState.ACTIVE,
    power: 5000,
    cost: 4,
    givenDonCount: 2,
    metadata: {
      isAltArt: false,
      isPromo: false,
      isLeader: false,
      rarity: 'R',
      colors: ['Red'],
      category: CardCategory.CHARACTER,
      name: 'Monkey D. Luffy',
      imageUrl: '/cards/op01-001.png', // Local image path
    },
  };

  return (
    <Canvas>
      <CardMesh
        cardState={cardState}
        zonePosition={[0, 0, 0]}
        zoneRotation={[0, 0, 0]}
        indexInZone={0}
        spacing={2}
        stackOffset={0}
        onInteract={(cardId, action) => {
          console.log(`Card ${cardId} ${action}`);
        }}
      />
    </Canvas>
  );
}
```

### Image Loading Examples

#### Local Image (Direct Load)
```tsx
const cardState: CardVisualState = {
  // ... other properties
  metadata: {
    // ... other metadata
    imageUrl: '/cards/op01-001.png', // Loaded directly from public folder
  },
};
```

#### External Image (Proxied)
```tsx
const cardState: CardVisualState = {
  // ... other properties
  metadata: {
    // ... other metadata
    imageUrl: 'https://example.com/cards/op01-001.png', // Automatically routed through proxy
  },
};
```

#### Missing Image (Placeholder)
```tsx
const cardState: CardVisualState = {
  // ... other properties
  metadata: {
    // ... other metadata
    imageUrl: '', // Empty or missing - generates placeholder
  },
};
```

### Rendering Multiple Cards

```tsx
import { CardZoneRenderer } from '@/components/game/CardMesh';

function MyZone() {
  const cards: CardVisualState[] = [
    // ... array of card states
  ];

  return (
    <Canvas>
      <CardZoneRenderer
        cards={cards}
        zonePosition={[0, 0, -2]}
        zoneRotation={[0, 0, 0]}
        spacing={2}
        stackOffset={0}
        onCardInteract={(cardId, action) => {
          console.log(`Card ${cardId} ${action}`);
        }}
      />
    </Canvas>
  );
}
```

## Props

### CardMesh Props

| Prop | Type | Description |
|------|------|-------------|
| `cardState` | `CardVisualState` | The visual state of the card to render |
| `zonePosition` | `[number, number, number]` | Base position of the zone in 3D space |
| `zoneRotation` | `[number, number, number]` | Base rotation of the zone (Euler angles) |
| `indexInZone` | `number` | Index of this card within its zone |
| `spacing` | `number` | Horizontal spacing between cards in the zone |
| `stackOffset` | `number` | Vertical offset for stacked cards |
| `onInteract` | `(cardId: string, action: string) => void` | Optional callback for card interactions |

### CardZoneRenderer Props

| Prop | Type | Description |
|------|------|-------------|
| `cards` | `CardVisualState[]` | Array of card states to render |
| `zonePosition` | `[number, number, number]` | Base position of the zone |
| `zoneRotation` | `[number, number, number]` | Base rotation of the zone |
| `spacing` | `number` | Horizontal spacing between cards |
| `stackOffset` | `number` | Vertical offset for stacked cards |
| `onCardInteract` | `(cardId: string, action: string) => void` | Optional callback for card interactions |

## Zone Layout Patterns

### Deck/Trash (Stacked)
```tsx
<CardZoneRenderer
  cards={deckCards}
  zonePosition={[-8, 0, -6]}
  zoneRotation={[0, 0, 0]}
  spacing={0}
  stackOffset={0.01}  // Small vertical offset per card
/>
```

### Hand (Spread)
```tsx
<CardZoneRenderer
  cards={handCards}
  zonePosition={[0, 0, -8]}
  zoneRotation={[0, 0, 0]}
  spacing={1.5}  // Horizontal spacing between cards
  stackOffset={0}
/>
```

### Character Area (Grid)
```tsx
<CardZoneRenderer
  cards={characterCards}
  zonePosition={[0, 0, -2]}
  zoneRotation={[0, 0, 0]}
  spacing={2}  // Wider spacing for better visibility
  stackOffset={0}
/>
```

### Leader (Single)
```tsx
<CardMesh
  cardState={leaderCard}
  zonePosition={[0, 0, -4]}
  zoneRotation={[0, 0, 0]}
  indexInZone={0}
  spacing={0}
  stackOffset={0}
/>
```

## Face-Up Zones

Cards automatically display face-up in these zones:
- `HAND`
- `CHARACTER_AREA`
- `STAGE_AREA`
- `LEADER_AREA`
- `LIFE`
- `TRASH`
- `LIMBO`

Cards in other zones (DECK, DON_DECK, COST_AREA) display face-down.

## Interaction Events

The `onInteract` callback receives two parameters:
1. `cardId`: The unique ID of the card
2. `action`: One of:
   - `'click'`: User clicked the card
   - `'hover'`: User started hovering over the card
   - `'unhover'`: User stopped hovering over the card

Example:
```tsx
const handleCardInteract = (cardId: string, action: string) => {
  switch (action) {
    case 'click':
      selectCard(cardId);
      break;
    case 'hover':
      showCardPreview(cardId);
      break;
    case 'unhover':
      hideCardPreview();
      break;
  }
};
```

## Image Loading and Error Handling

### How Image Loading Works

CardMesh uses the `CardImageLoader` utility to load and cache card textures:

1. **Cache Check**: First checks if the texture is already cached
2. **URL Routing**: 
   - Local URLs (starting with `/`) are loaded directly
   - External URLs (starting with `http://` or `https://`) are routed through `/api/image-proxy`
3. **Loading**: Loads the texture with a 5-second timeout
4. **Fallback**: If loading fails, generates a placeholder texture with card information
5. **Caching**: Successfully loaded textures are cached (max 100 textures, LRU eviction)

### Error Handling Behavior

The component handles various error scenarios gracefully:

#### Missing imageUrl
```tsx
// If imageUrl is empty or missing
metadata: { imageUrl: '' }
// Result: Placeholder generated immediately with card info
```

#### Network Timeout
```tsx
// If image takes > 5 seconds to load
metadata: { imageUrl: 'https://slow-server.com/card.png' }
// Result: Placeholder generated after timeout with error indicator
```

#### CORS Error
```tsx
// If external URL blocks CORS
metadata: { imageUrl: 'https://example.com/card.png' }
// Result: Automatically retries through proxy, falls back to placeholder if proxy fails
```

#### Invalid URL
```tsx
// If URL is malformed or returns 404
metadata: { imageUrl: '/cards/nonexistent.png' }
// Result: Placeholder generated with error indicator
```

### Placeholder Appearance

When a placeholder is generated, it includes:
- **Background Color**: Based on card category (LEADER=red, CHARACTER=blue, EVENT=green, STAGE=brown)
- **Card Name**: Displayed at top (truncated to 20 characters)
- **Category**: Displayed below name
- **Power**: Displayed in center (if > 0)
- **Cost**: Displayed in top-left circle (if > 0)
- **Error Indicator**: Red overlay with warning icon (if load failed)

### Debugging Image Issues

Check the browser console for structured log messages:

```javascript
// Cache hit
console.debug('Texture cache hit:', { imageUrl, refCount, cacheSize });

// Cache miss
console.debug('Texture cache miss:', { imageUrl, cacheSize });

// Fallback used
console.warn('Card image fallback:', {
  cardName: 'Monkey D. Luffy',
  imageUrl: '/cards/op01-001.png',
  reason: 'TIMEOUT' | 'CORS_ERROR' | 'LOAD_ERROR' | 'MISSING_URL',
  timestamp: 1234567890
});

// Proxy error
console.error('Image proxy error:', { url, error });
```

## Performance Considerations

1. **Texture Caching**: Card textures are cached using CardImageLoader (max 100 textures)
2. **LRU Eviction**: Least recently used textures are evicted when cache is full
3. **Reference Counting**: Textures are properly disposed when no longer needed
4. **Geometry Reuse**: Card geometry is memoized and reused across renders
5. **Material Optimization**: Materials are created once and reused
6. **Frame Updates**: Only hovered cards update position each frame
7. **Proxy Caching**: External images are cached for 24 hours by the proxy

## Future Enhancements

- [ ] Animation system for card movement between zones
- [ ] Particle effects for special cards
- [ ] Card flip animations
- [ ] Glow effects for active/selectable cards
- [ ] Card preview on hover (enlarged view)
- [ ] Sound effects for interactions

## Requirements Satisfied

This component satisfies the following requirements from the design document:

- **Requirement 16.1**: Provides 3D card representation for Three.js visualization
- **Requirement 16.4**: Implements card position and state data for scene updates
- **Requirement 17.1**: Provides hooks for animation events (hover, click)
- **Requirement 17.2**: Handles card state changes (ACTIVE/RESTED rotation)
- **Requirement 17.3**: Uses card metadata for special visual effects (alt art, promo)

## Related Components

- `GameScene`: Main scene component that uses CardMesh
- `ZoneRenderer`: Future component for zone-specific rendering
- `GameBoard`: Complete board layout component
- `CardImageLoader`: Utility for loading and caching card textures
- `PlaceholderGenerator`: Utility for generating fallback textures
- `/api/image-proxy`: API route for proxying external images

## API Reference

### CardImageLoader

The CardImageLoader utility is used internally by CardMesh for texture management:

```typescript
import { CardImageLoader } from '@/lib/game-engine/rendering/CardImageLoader';

// Get singleton instance
const loader = CardImageLoader.getInstance();

// Load texture (with automatic caching and fallback)
const texture = await loader.loadTexture({
  imageUrl: '/cards/op01-001.png',
  fallbackData: {
    name: 'Monkey D. Luffy',
    category: 'LEADER',
    power: 5000,
    cost: 0
  },
  onProgress: (progress) => console.log(`Loading: ${progress * 100}%`)
});

// Release texture reference (in component cleanup)
loader.releaseTexture('/cards/op01-001.png');

// Get cache statistics
const stats = loader.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize}`);
```

### PlaceholderGenerator

The PlaceholderGenerator creates fallback textures when images fail to load:

```typescript
import { PlaceholderGenerator } from '@/lib/game-engine/rendering/PlaceholderGenerator';

// Generate placeholder data URL
const dataUrl = PlaceholderGenerator.generate({
  name: 'Monkey D. Luffy',
  category: 'LEADER',
  power: 5000,
  cost: 0,
  width: 512,
  height: 716,
  showError: true // Show error indicator overlay
});

// Use with Three.js TextureLoader
const texture = textureLoader.load(dataUrl);
```

### Image Proxy API

The image proxy API is used automatically by CardImageLoader for external URLs:

```typescript
// Manual usage (not typically needed)
const externalUrl = 'https://example.com/cards/op01-001.png';
const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;

const response = await fetch(proxyUrl);
if (response.ok) {
  const blob = await response.blob();
  // Use blob...
}
```

**Query Parameters:**
- `url` (required): The external image URL to fetch

**Response Headers:**
- `Content-Type`: Image content type (e.g., 'image/jpeg', 'image/png')
- `Cache-Control`: 'public, max-age=86400' (24 hours)
- `Access-Control-Allow-Origin`: '*'

**Error Responses:**
- `400`: Missing, invalid, or unsafe URL
- `504`: Request timeout (10 seconds)
- `500`: Network or other errors
