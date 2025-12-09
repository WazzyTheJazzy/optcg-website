# State Management Architecture

## Overview
The game engine uses an immutable state pattern where state changes create new state objects rather than mutating existing ones.

## Core Principles

### 1. Single Source of Truth
**GameEngine** owns the authoritative `GameStateManager`.

```typescript
class GameEngine {
  private stateManager: GameStateManager;  // ← The ONE source of truth
  
  getStateManager(): GameStateManager {
    return this.stateManager;  // Direct reference, not a copy
  }
}
```

### 2. Immutable State Updates
State changes return NEW state managers:

```typescript
// WRONG - Mutating state
stateManager.state.players[0].zones.hand.push(card);

// CORRECT - Creating new state
const newStateManager = stateManager.moveCard(cardId, toZone);
```

### 3. Explicit Synchronization
After updating state, explicitly sync all subsystems:

```typescript
this.stateManager = newStateManager;  // Update engine's state
this.updateAllSubsystems();           // Sync all subsystems
```

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        GameEngine                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │         stateManager (Source of Truth)             │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           │ getStateManager()                │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              updateAllSubsystems()                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │ ZoneManager  │  │ EffectSystem │  │ Battle    │ │   │
│  │  │.updateState()│  │.updateState()│  │ System    │ │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           │ emit(STATE_CHANGED)              │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              RenderingInterface                      │   │
│  │         (reads via getStateManager())                │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  GameBoard (React)                   │   │
│  │            (updates UI with new state)               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## State Update Pattern

### Standard Flow
```typescript
// 1. Perform operation that returns new state
const result = handlePlayCard(
  this.stateManager,
  this.zoneManager,
  this.eventEmitter,
  playerId,
  cardId
);

// 2. Update engine's state FIRST
this.stateManager = result.newState;

// 3. Sync all subsystems
this.updateAllSubsystems();

// 4. Emit event for listeners
this.eventEmitter.emit({
  type: GameEventType.STATE_CHANGED,
  timestamp: Date.now(),
});

// 5. Handle side effects (triggers, defeat check, etc.)
this.resolvePendingTriggers();
```

### Why This Order Matters
1. **Update state first**: Ensures the source of truth is current
2. **Sync subsystems**: Ensures all systems see the same state
3. **Emit event**: Notifies listeners that state is ready to read
4. **Side effects**: Handle consequences of the state change

## Subsystem State Management

### ZoneManager
```typescript
class ZoneManager {
  private stateManager: GameStateManager;  // Local reference
  
  moveCard(cardId: string, toZone: ZoneId): GameStateManager {
    // Update local state
    const newStateManager = this.stateManager.moveCard(cardId, toZone);
    this.stateManager = newStateManager;
    
    // Emit specific event (optional)
    this.eventEmitter.emit({ type: GameEventType.CARD_MOVED, ... });
    
    // Return new state for caller to use
    return newStateManager;
  }
  
  // Called by GameEngine to sync state
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
  }
}
```

### RenderingInterface
```typescript
class RenderingInterface {
  private engine: GameEngine;
  
  // Read directly from engine (no copies)
  private getStateManager(): GameStateManager {
    return this.engine.getStateManager();
  }
  
  getBoardState(): BoardVisualState {
    // Get state once and reuse
    const stateManager = this.getStateManager();
    
    return {
      player1: this.getPlayerVisualState(PlayerId.PLAYER_1, stateManager),
      player2: this.getPlayerVisualState(PlayerId.PLAYER_2, stateManager),
      // ...
    };
  }
}
```

## Event System

### Event Types

#### Specific Events (During Operations)
Emitted during state changes, may fire before GameEngine syncs:
- `CARD_MOVED` - Card moved between zones
- `CARD_STATE_CHANGED` - Card active/rested state changed
- `POWER_CHANGED` - Card power modified
- `PHASE_CHANGED` - Game phase changed

#### General Event (After Sync)
Emitted after GameEngine updates and syncs all subsystems:
- `STATE_CHANGED` - State is fully updated and ready to read

### When to Use Which Event

**Use specific events when**:
- You need to know WHAT changed
- You want to react to specific actions
- You're implementing game logic

**Use STATE_CHANGED when**:
- You need to read the complete current state
- You're updating UI/rendering
- You don't care what changed, just that something did

### Example: GameBoard
```typescript
useEffect(() => {
  // Listen for STATE_CHANGED to update UI
  renderingInterface.onStateChanged(() => {
    const newState = renderingInterface.getBoardState();
    setBoardState(newState);
  });
  
  // Can also listen to specific events for animations
  renderingInterface.onCardMoved((event) => {
    animateCardMovement(event.cardId, event.fromZone, event.toZone);
  });
}, []);
```

## Common Pitfalls

### ❌ Creating Multiple State Copies
```typescript
// WRONG - Each call creates a new snapshot
const state1 = new GameStateManager(engine.getState());
const state2 = new GameStateManager(engine.getState());
// state1 and state2 might be different!
```

### ✅ Reuse State Manager
```typescript
// CORRECT - Single source
const stateManager = engine.getStateManager();
const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);
```

### ❌ Emitting Events Too Early
```typescript
// WRONG - Event before state update
this.eventEmitter.emit({ type: GameEventType.STATE_CHANGED });
this.stateManager = newState;  // Too late!
```

### ✅ Update Then Emit
```typescript
// CORRECT - Update first, then notify
this.stateManager = newState;
this.updateAllSubsystems();
this.eventEmitter.emit({ type: GameEventType.STATE_CHANGED });
```

### ❌ Forgetting to Sync Subsystems
```typescript
// WRONG - Subsystems out of sync
this.stateManager = newState;
// Forgot to call updateAllSubsystems()!
this.eventEmitter.emit({ type: GameEventType.STATE_CHANGED });
```

### ✅ Always Sync
```typescript
// CORRECT - Explicit sync
this.stateManager = newState;
this.updateAllSubsystems();  // ← Don't forget!
this.eventEmitter.emit({ type: GameEventType.STATE_CHANGED });
```

## Testing State Management

### Test State Synchronization
```typescript
test('subsystems are synchronized after state update', () => {
  engine.playCard(playerId, cardId);
  
  const engineState = engine.getState();
  const zoneManagerState = engine['zoneManager']['stateManager'].getState();
  
  expect(zoneManagerState).toBe(engineState);  // Same reference
});
```

### Test Event Timing
```typescript
test('STATE_CHANGED fires after state is updated', () => {
  let stateWhenEventFired: GameState | null = null;
  
  renderingInterface.onStateChanged(() => {
    stateWhenEventFired = engine.getState();
  });
  
  engine.playCard(playerId, cardId);
  
  expect(stateWhenEventFired?.characterArea).toHaveLength(1);
});
```

### Test State Immutability
```typescript
test('state updates create new objects', () => {
  const stateBefore = engine.getState();
  
  engine.playCard(playerId, cardId);
  
  const stateAfter = engine.getState();
  expect(stateAfter).not.toBe(stateBefore);  // Different object
});
```

## Performance Considerations

### Minimize State Copies
```typescript
// SLOW - Creates multiple copies
for (const zone of zones) {
  const contents = this.getZoneContents(playerId, zone);  // Creates new StateManager each time
}

// FAST - Reuse state manager
const stateManager = this.getStateManager();
for (const zone of zones) {
  const contents = this.getZoneContents(playerId, zone, stateManager);  // Reuses same instance
}
```

### Batch Updates
```typescript
// SLOW - Multiple updates and events
for (const card of cards) {
  engine.playCard(playerId, card.id);  // Emits event each time
}

// FAST - Single batch operation
engine.playCards(playerId, cards.map(c => c.id));  // Single event
```

## Summary

1. **GameEngine owns the state** - Single source of truth
2. **Updates are immutable** - Create new state objects
3. **Sync explicitly** - Call `updateAllSubsystems()` after updates
4. **Events after sync** - Emit `STATE_CHANGED` after state is ready
5. **Read directly** - Use `getStateManager()`, don't create copies
6. **Test timing** - Verify state is correct when events fire

Following these patterns ensures state consistency across the entire system.
