# Main Phase Action Framework

## Overview

The Main Phase is the most complex phase in the One Piece TCG, where players can perform multiple actions including playing cards, activating effects, giving DON, and declaring attacks. This implementation provides a flexible action framework that supports both AI and human players.

## Architecture

### Action Types

The framework defines five main action types:

1. **PlayCard** - Play a card from hand
2. **ActivateEffect** - Activate an effect on a card
3. **GiveDon** - Give DON to a character or leader
4. **Attack** - Declare an attack
5. **EndMain** - End the main phase

### Action Flow

```
┌─────────────────────────────────────────┐
│         Start Main Phase                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Trigger START_OF_MAIN Effects         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Resolve Pending Triggers               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Action Loop (if input provider)       │
│   ┌─────────────────────────────────┐   │
│   │ 1. Get available actions        │   │
│   │ 2. Query player for action      │   │
│   │ 3. Execute action               │   │
│   │ 4. Resolve pending triggers     │   │
│   │ 5. Repeat until END_PHASE       │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         End Main Phase                  │
└─────────────────────────────────────────┘
```

## Usage

### Basic Usage (No Actions)

```typescript
import { runMainPhase } from './MainPhase';
import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';

const stateManager = new GameStateManager(initialState);
const rules = new RulesContext();
const eventEmitter = new EventEmitter();

// Run main phase without player input
// This will trigger START_OF_MAIN effects but won't execute actions
const result = runMainPhase(stateManager, rules, eventEmitter);
```

### With Player Input Provider

```typescript
import { PlayerInputProvider, MainPhaseActionUnion } from './MainPhase';
import { ActionType, PlayerId } from '../core/types';

// Implement a player input provider
class MyAI implements PlayerInputProvider {
  async getNextAction(
    playerId: PlayerId,
    availableActions: ActionType[],
    state: GameStateManager
  ): Promise<MainPhaseActionUnion | null> {
    // Your AI logic here
    // Return null to pass, or return an action
    return {
      type: ActionType.END_PHASE,
      playerId,
    };
  }
}

const ai = new MyAI();
const result = await runMainPhase(stateManager, rules, eventEmitter, ai);
```

## Action Handlers

Each action type is routed to a specific handler:

### PlayCard Handler
- **Status**: Placeholder (will be implemented in task 13)
- **Purpose**: Handle playing cards from hand
- **Validates**: Card in hand, sufficient cost
- **Effects**: Moves card to appropriate zone, triggers On Play effects

### ActivateEffect Handler
- **Status**: Placeholder (will be implemented in task 24)
- **Purpose**: Activate ACTIVATE-type effects
- **Validates**: Effect can be activated, costs can be paid
- **Effects**: Resolves effect, pays costs

### GiveDon Handler
- **Status**: Placeholder (will be implemented in task 14)
- **Purpose**: Give DON to characters/leaders
- **Validates**: DON is active, target is valid
- **Effects**: Moves DON to card, updates power

### Attack Handler
- **Status**: Placeholder (will be implemented in task 16)
- **Purpose**: Declare attacks
- **Validates**: Attacker can attack, target is valid
- **Effects**: Initiates battle system

## Player Input Provider Interface

The `PlayerInputProvider` interface allows different implementations for AI, network play, or UI:

```typescript
interface PlayerInputProvider {
  getNextAction(
    playerId: PlayerId,
    availableActions: ActionType[],
    state: GameStateManager
  ): Promise<MainPhaseActionUnion | null>;
}
```

### Implementation Examples

#### Simple AI (Always Pass)
```typescript
class PassingAI implements PlayerInputProvider {
  async getNextAction() {
    return null; // Pass
  }
}
```

#### Simple AI (End Phase)
```typescript
class EndPhaseAI implements PlayerInputProvider {
  async getNextAction(playerId) {
    return { type: ActionType.END_PHASE, playerId };
  }
}
```

#### UI Integration
```typescript
class UIPlayer implements PlayerInputProvider {
  async getNextAction(playerId, actions, state) {
    // Show UI to player
    // Wait for user input
    // Return chosen action
    return await this.waitForUserInput(actions);
  }
}
```

#### Network Player
```typescript
class NetworkPlayer implements PlayerInputProvider {
  async getNextAction(playerId, actions, state) {
    // Send available actions to remote player
    // Wait for response
    // Return received action
    return await this.receiveActionFromNetwork();
  }
}
```

## Available Actions Detection

The framework automatically detects which actions are available based on game state:

- **PLAY_CARD**: Player has cards in hand
- **ACTIVATE_EFFECT**: Player has cards with ACTIVATE effects (placeholder)
- **GIVE_DON**: Player has active DON in cost area
- **DECLARE_ATTACK**: Player has active characters or leader
- **END_PHASE**: Always available

## Trigger Resolution

After each action, the framework automatically resolves any pending triggers:

1. Triggers are sorted by priority (turn player first)
2. Each trigger is resolved in order
3. New triggers created during resolution are queued
4. Process continues until queue is empty

## Event Emission

The main phase emits events through the EventEmitter:

- Action execution events (from handlers)
- Trigger resolution events
- State change events

Subscribe to events to observe game state changes:

```typescript
eventEmitter.on('CARD_MOVED', (event) => {
  console.log('Card moved:', event);
});

eventEmitter.on('ATTACK_DECLARED', (event) => {
  console.log('Attack declared:', event);
});
```

## Future Enhancements

The following features will be added in future tasks:

1. **Task 13**: Implement card playing system
2. **Task 14**: Implement DON giving system
3. **Task 16**: Implement battle system
4. **Task 24**: Implement effect system
5. **Task 25**: Implement trigger queue with full resolution

## Testing

See `MainPhase.test.ts` for comprehensive tests covering:

- START_OF_MAIN effect triggering
- Action routing
- Player input provider integration
- Action loop execution
- Trigger resolution

## Examples

See `MainPhase.example.ts` for complete working examples of:

- Basic main phase execution
- AI player implementations
- UI integration patterns
- Event listening
- Network play patterns
