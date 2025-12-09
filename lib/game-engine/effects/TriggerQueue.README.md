# TriggerQueue

The `TriggerQueue` manages automatic trigger resolution for the One Piece TCG Engine. It handles the queuing, priority ordering, and resolution of AUTO effects that trigger in response to game events.

## Overview

The TriggerQueue implements the official One Piece TCG trigger resolution rules:

1. **Turn Player Priority**: The active player's triggers always resolve before the non-active player's triggers
2. **Priority Ordering**: Within each player's triggers, higher priority triggers resolve first
3. **Recursive Resolution**: Newly created triggers during resolution are re-queued and resolved before the queue is considered empty

## Key Features

- **Automatic Trigger Management**: Handles all AUTO timing effects
- **Turn Player Priority**: Ensures turn player triggers resolve first
- **Priority Sorting**: Orders triggers by priority value within each player
- **Recursive Handling**: Processes newly created triggers during resolution
- **Error Resilience**: Continues processing even if individual triggers fail

## Usage

### Basic Usage

```typescript
import { TriggerQueue } from './TriggerQueue';
import { EffectSystem } from './EffectSystem';
import { GameStateManager } from '../core/GameState';

// Initialize
const triggerQueue = new TriggerQueue(stateManager, effectSystem);

// Enqueue a trigger
const trigger: TriggerInstance = {
  effectDefinition: effect,
  source: card,
  controller: PlayerId.PLAYER_1,
  event: gameEvent,
  priority: 0,
};
triggerQueue.enqueueTrigger(trigger);

// Resolve all pending triggers
triggerQueue.resolveAllPendingTriggers();
```

### Integration with Game Flow

The TriggerQueue should be called after any action that might create triggers:

```typescript
// After playing a card
cardPlayHandler.playCard(cardId);
triggerQueue.resolveAllPendingTriggers();

// After an attack
battleSystem.executeAttack(attackerId, targetId);
triggerQueue.resolveAllPendingTriggers();

// After phase transitions
phaseManager.advancePhase();
triggerQueue.resolveAllPendingTriggers();
```

## API Reference

### Constructor

```typescript
constructor(stateManager: GameStateManager, effectSystem: EffectSystem)
```

Creates a new TriggerQueue instance.

**Parameters:**
- `stateManager`: The game state manager
- `effectSystem`: The effect system for resolving triggers

### Methods

#### `enqueueTrigger(trigger: TriggerInstance): void`

Adds a trigger to the queue.

**Parameters:**
- `trigger`: The trigger instance to enqueue

**Example:**
```typescript
triggerQueue.enqueueTrigger({
  effectDefinition: onPlayEffect,
  source: characterCard,
  controller: PlayerId.PLAYER_1,
  event: cardMovedEvent,
  priority: 0,
});
```

#### `resolveAllPendingTriggers(): void`

Resolves all triggers in the queue, respecting turn player priority and handling newly created triggers.

**Resolution Order:**
1. Partition triggers by turn player
2. Sort each partition by priority (descending)
3. Resolve turn player triggers
4. Resolve non-turn player triggers
5. Check for new triggers and repeat if any exist

**Example:**
```typescript
// After an action that creates triggers
triggerQueue.resolveAllPendingTriggers();
```

#### `resolveSingleTrigger(trigger: TriggerInstance): void`

Resolves a single trigger through the effect system.

**Parameters:**
- `trigger`: The trigger instance to resolve

**Note:** This is typically called internally by `resolveAllPendingTriggers()`, but can be used directly for testing or special cases.

#### `getQueueSize(): number`

Returns the current number of triggers in the queue.

**Returns:** Number of triggers

**Example:**
```typescript
if (triggerQueue.getQueueSize() > 0) {
  console.log('Triggers pending resolution');
}
```

#### `clearQueue(): void`

Clears all triggers from the queue without resolving them.

**Warning:** This should rarely be used in normal game flow. It's primarily for cleanup or error recovery.

#### `updateStateManager(stateManager: GameStateManager): void`

Updates the internal state manager reference after external state changes.

**Parameters:**
- `stateManager`: The new state manager

**Example:**
```typescript
stateManager = stateManager.incrementTurn();
triggerQueue.updateStateManager(stateManager);
```

#### `getStateManager(): GameStateManager`

Returns the current state manager.

**Returns:** The current GameStateManager instance

## Trigger Priority

Triggers have a `priority` field that determines resolution order within the same player's triggers:

- **Higher priority values resolve first**
- **Default priority is 0**
- **Priority only matters within the same player's triggers**

Example priority values:
```typescript
// High priority (resolves first)
const highPriorityTrigger = { ...trigger, priority: 10 };

// Normal priority
const normalTrigger = { ...trigger, priority: 0 };

// Low priority (resolves last)
const lowPriorityTrigger = { ...trigger, priority: -5 };
```

## Turn Player Priority Rules

The turn player priority rule ensures that the active player's triggers always resolve before the opponent's:

```typescript
// Given these triggers:
const p1Trigger = { controller: PlayerId.PLAYER_1, priority: 0 };
const p2Trigger = { controller: PlayerId.PLAYER_2, priority: 100 };

// If PLAYER_1 is the turn player:
// Resolution order: p1Trigger, then p2Trigger
// (Even though p2Trigger has higher priority)
```

## Recursive Trigger Resolution

When a trigger's effect creates new triggers, they are automatically handled:

```typescript
// Initial trigger creates a new trigger during resolution
effectSystem.registerScript('on-play-search', (context) => {
  // Search deck and play a card
  const foundCard = searchDeck(context);
  playCard(foundCard); // This creates a new ON_PLAY trigger
  
  // The new trigger is automatically added to state.pendingTriggers
  // and will be resolved before resolveAllPendingTriggers() completes
});
```

## Error Handling

The TriggerQueue handles errors gracefully:

```typescript
// If a trigger fails, it logs the error and continues
triggerQueue.resolveSingleTrigger(faultyTrigger);
// Other triggers still resolve normally
```

Errors are logged to the console but don't stop trigger resolution. This ensures game state remains consistent even if individual effects have bugs.

## Implementation Notes

### Target Selection

The current implementation includes a placeholder `chooseTargets()` method that returns empty targets. This is sufficient for effects that don't require targets. Future enhancements will add:

- Player choice prompts for manual target selection
- Automatic target selection based on effect definitions
- Target legality validation

### State Synchronization

The TriggerQueue maintains a reference to the GameStateManager and EffectSystem. After each trigger resolution, it updates its state reference to ensure consistency:

```typescript
// Internal synchronization after each trigger
this.stateManager = this.effectSystem.getStateManager();
```

### Performance Considerations

- Triggers are resolved one at a time to maintain proper game state
- Priority sorting is O(n log n) where n is the number of triggers
- Recursive resolution has a maximum depth equal to the number of triggers created

## Testing

The TriggerQueue includes comprehensive unit tests covering:

- Basic trigger enqueueing
- Turn player priority resolution
- Priority ordering within players
- Recursive trigger handling
- Error resilience
- Queue management operations

Run tests with:
```bash
npm test -- lib/game-engine/effects/TriggerQueue.test.ts
```

## Related Components

- **EffectSystem**: Resolves individual trigger effects
- **GameStateManager**: Manages game state and pending triggers
- **EventEmitter**: Emits events that create triggers
- **PhaseManager**: Calls trigger resolution after phase actions

## Future Enhancements

1. **Target Selection**: Implement full target selection logic
2. **Trigger Cancellation**: Support effects that cancel other triggers
3. **Trigger Inspection**: Allow players to view pending triggers
4. **Trigger History**: Track resolved triggers for replay/analysis
5. **Performance Optimization**: Batch similar triggers for efficiency
