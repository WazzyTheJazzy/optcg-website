# Zone Management System

The Zone Management system handles all card and DON movement between game zones in the One Piece TCG Engine.

## Overview

The `ZoneManager` class is responsible for:
- Moving cards between zones
- Moving DON cards between zones or giving them to cards
- Enforcing zone limits (character area max 5, stage area max 1)
- Emitting CARD_MOVED events for rendering
- Adding and removing cards from zones

## Usage

### Basic Setup

```typescript
import { ZoneManager } from './zones/ZoneManager';
import { GameStateManager, createInitialGameState } from './core/GameState';
import { EventEmitter } from './rendering/EventEmitter';

const initialState = createInitialGameState();
const stateManager = new GameStateManager(initialState);
const eventEmitter = new EventEmitter();
const zoneManager = new ZoneManager(stateManager, eventEmitter);
```

### Moving Cards

```typescript
// Move a card from deck to hand
const newStateManager = zoneManager.moveCard('card-id', ZoneId.HAND);

// Move a card to a specific index
const newStateManager = zoneManager.moveCard('card-id', ZoneId.HAND, 2);
```

### Moving DON Cards

```typescript
// Move DON from don deck to cost area
const newStateManager = zoneManager.moveDon('don-id', ZoneId.COST_AREA);

// Give DON to a character
const newStateManager = zoneManager.moveDon('don-id', ZoneId.CHARACTER_AREA, 'character-id');
```

### Adding and Removing Cards

```typescript
// Add a card to a zone
const newStateManager = zoneManager.addToZone(
  PlayerId.PLAYER_1,
  cardInstance,
  ZoneId.HAND
);

// Remove a card from a zone
const { stateManager: newStateManager, card } = zoneManager.removeFromZone(
  PlayerId.PLAYER_1,
  'card-id',
  ZoneId.HAND
);
```

### Querying Zone Contents

```typescript
// Get all cards in a zone
const handCards = zoneManager.getZoneContents(PlayerId.PLAYER_1, ZoneId.HAND);
```

## Zone Limits

The ZoneManager enforces the following limits:

- **Character Area**: Maximum 5 cards per player
- **Stage Area**: Maximum 1 card per player
- **Leader Area**: Maximum 1 card per player
- **Other zones**: No limits

Attempting to move a card to a full zone will throw a `ZoneError`.

## Event Emission

All zone operations emit `CARD_MOVED` events with the following structure:

```typescript
interface CardMovedEvent {
  type: GameEventType.CARD_MOVED;
  cardId: string;
  playerId: PlayerId;
  fromZone: ZoneId;
  toZone: ZoneId;
  fromIndex?: number;
  toIndex?: number;
  timestamp: number;
}
```

Subscribe to these events to update the visual representation:

```typescript
eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
  console.log(`Card ${event.cardId} moved from ${event.fromZone} to ${event.toZone}`);
  // Update Three.js scene...
});
```

## Error Handling

The ZoneManager throws `ZoneError` in the following cases:

- Moving a non-existent card
- Moving a card to a full zone (character/stage/leader area)
- Moving DON to an invalid zone (must be DON_DECK or COST_AREA)
- Removing a card that doesn't exist in the specified zone

```typescript
try {
  zoneManager.moveCard('card-id', ZoneId.CHARACTER_AREA);
} catch (error) {
  if (error instanceof ZoneError) {
    console.error('Zone operation failed:', error.message);
  }
}
```

## State Management

The ZoneManager maintains an internal reference to the GameStateManager. After operations that return a new state manager, you should update the reference:

```typescript
const newStateManager = zoneManager.moveCard('card-id', ZoneId.HAND);
zoneManager.updateStateManager(newStateManager);
```

Alternatively, create a new ZoneManager instance with the updated state manager.

## Testing

Run the test suite with:

```bash
npx tsx lib/game-engine/zones/ZoneManager.test.ts
```

The test suite covers:
- Card movement between zones
- DON movement and giving
- Zone limit enforcement
- Event emission
- Error handling
- Adding and removing cards
- Zone content queries

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 1.3**: Support for all official zones
- **Requirement 1.5**: Enforce character area limit of 5 cards
- **Requirement 6.6**: Handle DON card movement between zones and giving to cards

## Integration

The ZoneManager integrates with:

- **GameStateManager**: For state queries and updates
- **EventEmitter**: For emitting CARD_MOVED events
- **RenderingInterface**: Events are consumed by the rendering layer

## Future Enhancements

Potential future enhancements:
- Batch zone operations for efficiency
- Zone transition animations
- Undo/redo support for zone operations
- Zone-specific validation rules
