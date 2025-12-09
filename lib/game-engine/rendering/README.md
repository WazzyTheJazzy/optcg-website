# Rendering System

This module provides the bridge between the game engine and the Three.js visualization layer. It includes:

- **EventEmitter**: Type-safe event emission system for state changes
- **RenderingInterface**: Bridge between engine and Three.js with event subscriptions, state queries, and animation hooks

## Overview

The EventEmitter is the core component that manages event subscriptions and emissions. It supports:

- **Type-safe event handling**: All events are strongly typed
- **Event filtering**: Subscribe to specific events based on custom criteria
- **Wildcard subscriptions**: Listen to all event types
- **Subscription management**: Easy subscribe/unsubscribe with multiple patterns
- **Error handling**: Errors in handlers don't crash the emitter

## Event Types

The system supports the following game event types:

- `CARD_MOVED`: When a card moves between zones
- `CARD_STATE_CHANGED`: When a card changes state (ACTIVE/RESTED)
- `POWER_CHANGED`: When a card's power changes
- `ATTACK_DECLARED`: When an attack is declared
- `BLOCK_DECLARED`: When a blocker is declared
- `COUNTER_STEP_START`: When the counter step begins
- `BATTLE_END`: When a battle ends
- `PHASE_CHANGED`: When the game phase changes
- `TURN_START`: When a turn starts
- `TURN_END`: When a turn ends
- `GAME_OVER`: When the game ends

## Usage

### Basic Subscription

```typescript
import { EventEmitter, GameEventType } from './EventEmitter';

const emitter = new EventEmitter();

// Subscribe to card moved events
emitter.on(GameEventType.CARD_MOVED, (event) => {
  console.log(`Card ${event.cardId} moved to ${event.toZone}`);
});

// Emit an event
emitter.emit({
  type: GameEventType.CARD_MOVED,
  timestamp: Date.now(),
  cardId: 'card-123',
  playerId: PlayerId.PLAYER_1,
  fromZone: ZoneId.HAND,
  toZone: ZoneId.CHARACTER_AREA,
});
```

### Filtered Subscription

```typescript
// Only receive events for Player 1
emitter.on(
  GameEventType.CARD_MOVED,
  (event) => {
    console.log(`Player 1 moved card ${event.cardId}`);
  },
  (event) => event.playerId === PlayerId.PLAYER_1
);
```

### Wildcard Subscription

```typescript
// Listen to all event types
emitter.onAny((event) => {
  console.log(`Event: ${event.type}`);
});
```

### Unsubscribing

```typescript
// Method 1: Using the subscription object
const subscription = emitter.on(GameEventType.CARD_MOVED, handler);
subscription.unsubscribe();

// Method 2: Using the off method
emitter.on(GameEventType.CARD_MOVED, handler);
emitter.off(GameEventType.CARD_MOVED, handler);

// Method 3: Clear all subscriptions
emitter.clear();
```

### Subscription Queries

```typescript
// Check subscription count
const count = emitter.getSubscriptionCount(GameEventType.CARD_MOVED);

// Check wildcard subscription count
const wildcardCount = emitter.getWildcardSubscriptionCount();

// Check if event type has any subscriptions
const hasSubscriptions = emitter.hasSubscriptions(GameEventType.CARD_MOVED);
```

## Integration with Game Engine

The EventEmitter is designed to be integrated into the GameEngine class:

```typescript
class GameEngine {
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  // Expose event subscription methods
  on<T extends AnyGameEvent>(
    eventType: T['type'],
    handler: EventHandler<T>,
    filter?: EventFilter<T>
  ): EventSubscription {
    return this.eventEmitter.on(eventType, handler, filter);
  }

  // Internal: emit events when state changes
  private moveCard(cardId: string, toZone: ZoneId) {
    // ... move card logic ...
    
    this.eventEmitter.emit({
      type: GameEventType.CARD_MOVED,
      timestamp: Date.now(),
      cardId,
      playerId: this.currentPlayer,
      fromZone: oldZone,
      toZone,
    });
  }
}
```

## Integration with Three.js Rendering

The rendering layer can subscribe to events to update visuals:

```typescript
class GameRenderer {
  constructor(engine: GameEngine) {
    // Subscribe to card movement for animations
    engine.on(GameEventType.CARD_MOVED, (event) => {
      this.animateCardMovement(event.cardId, event.fromZone, event.toZone);
    });

    // Subscribe to state changes for visual updates
    engine.on(GameEventType.CARD_STATE_CHANGED, (event) => {
      this.updateCardRotation(event.cardId, event.newState);
    });

    // Subscribe to power changes for UI updates
    engine.on(GameEventType.POWER_CHANGED, (event) => {
      this.updatePowerDisplay(event.cardId, event.newPower);
    });
  }
}
```

## Error Handling

The EventEmitter catches and logs errors in event handlers to prevent one failing handler from affecting others:

```typescript
emitter.on(GameEventType.CARD_MOVED, (event) => {
  throw new Error('Handler error');
});

emitter.on(GameEventType.CARD_MOVED, (event) => {
  console.log('This handler still runs');
});

// Both handlers are called, error is logged but doesn't crash
emitter.emit(cardMovedEvent);
```

## Performance Considerations

- Event handlers are called synchronously
- Filters are evaluated for each event emission
- Wildcard subscriptions are called for every event type
- Consider using filters to reduce unnecessary handler calls
- Unsubscribe when handlers are no longer needed to prevent memory leaks

## Testing

See `EventEmitter.test.ts` for comprehensive test examples covering:
- Basic event emission
- Subscription management
- Event filtering
- Wildcard subscriptions
- Error handling
- Subscription queries

## Examples

See `EventEmitter.example.ts` for practical usage examples.

---

# RenderingInterface

The `RenderingInterface` is a bridge between the game engine and the Three.js visualization layer. It provides:

- **Event Subscriptions**: Subscribe to game events for reactive visual updates
- **State Queries**: Query current visual state of cards, zones, and the board
- **Animation Hooks**: Register animation callbacks for future animation system
- **Metadata Access**: Get card metadata for special visual effects

## Quick Start

```typescript
import { GameEngine } from '../core/GameEngine';
import { RenderingInterface } from './RenderingInterface';

// Create engine and rendering interface
const engine = new GameEngine();
const renderingInterface = new RenderingInterface(engine);

// Subscribe to events
renderingInterface.onCardMoved((event) => {
  console.log(`Card moved to ${event.toZone}`);
});

// Query state
const boardState = renderingInterface.getBoardState();
console.log(`Turn ${boardState.turnNumber}`);
```

## Key Features

### Event Subscriptions

- `onCardMoved()` - Card moves between zones
- `onCardStateChanged()` - Card becomes active/rested
- `onPowerChanged()` - Card power changes
- `onBattleEvent()` - Battle events (attack, block, counter, end)
- `onPhaseChanged()` - Game phase changes
- `onTurnStart()` / `onTurnEnd()` - Turn boundaries
- `onGameOver()` - Game ends

### State Queries

- `getCardVisualState(cardId)` - Get visual state of a specific card
- `getZoneContents(playerId, zone)` - Get all cards in a zone
- `getBoardState()` - Get complete board state
- `getCardMetadata(cardId)` - Get metadata for special effects

### Animation Hooks (Future)

- `registerAnimationHook(hook)` - Register an animation
- `waitForAnimation(animationId)` - Wait for animation to complete
- `waitForAllAnimations()` - Wait for all animations
- `unregisterAnimationHook(animationId)` - Remove an animation

## Documentation

See `RenderingInterface.README.md` for detailed documentation and `RenderingInterface.example.ts` for usage examples.
