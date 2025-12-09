# EffectSystem

The EffectSystem is the core orchestrator for effect resolution in the One Piece TCG Engine. It handles effect activation, condition checking, cost payment, and script execution.

## Overview

The EffectSystem provides a flexible framework for implementing card effects through:

- **Effect Activation**: Validates and activates ACTIVATE-type effects
- **Condition Evaluation**: Checks if effect conditions are met
- **Cost Payment**: Handles various cost types (REST_DON, TRASH_CARD, REST_CARD, COMPOSITE)
- **Script Execution**: Runs registered effect scripts with proper context
- **Once-Per-Turn Tracking**: Enforces once-per-turn restrictions on effects

## Architecture

```
EffectSystem
├── activateEffect()      - Main entry point for activating effects
├── resolveEffect()       - Resolves an effect instance
├── checkCondition()      - Evaluates condition expressions
├── payCost()            - Pays effect costs
└── executeScript()      - Runs effect scripts
```

## Usage

### Basic Setup

```typescript
import { EffectSystem } from './effects/EffectSystem';
import { GameStateManager } from './core/GameState';
import { EventEmitter } from './rendering/EventEmitter';
import { ZoneManager } from './zones/ZoneManager';

// Create dependencies
const stateManager = new GameStateManager(initialState);
const eventEmitter = new EventEmitter();
const zoneManager = new ZoneManager(stateManager, eventEmitter);

// Create effect system
const effectSystem = new EffectSystem(
  stateManager,
  eventEmitter,
  zoneManager
);
```

### Registering Effect Scripts

Effect scripts are TypeScript functions that implement card effects:

```typescript
import { EffectContext } from './core/types';

// Register a simple draw effect
effectSystem.registerScript('draw-2-cards', (context: EffectContext) => {
  const player = context.state.players.get(context.controller);
  if (!player) return;

  // Draw 2 cards
  for (let i = 0; i < 2; i++) {
    if (player.zones.deck.length > 0) {
      const card = player.zones.deck[0];
      // Move card from deck to hand
      // (actual implementation would use ZoneManager)
    }
  }
});
```

### Activating Effects

```typescript
// Activate an effect on a card
try {
  const success = effectSystem.activateEffect(
    'card-instance-id',
    'effect-id',
    targets,      // Optional targets
    values        // Optional values
  );
  
  if (success) {
    console.log('Effect activated successfully');
  }
} catch (error) {
  console.error('Failed to activate effect:', error);
}
```

## Condition Expressions

The EffectSystem supports various condition types:

### AND Condition
```typescript
{
  type: 'AND',
  operands: [
    { type: 'COMPARE', operator: 'GT', left: 'turn', right: 1 },
    { type: 'HAS_KEYWORD', keyword: 'Rush' }
  ]
}
```

### OR Condition
```typescript
{
  type: 'OR',
  operands: [
    { type: 'IS_COLOR', color: 'Red' },
    { type: 'IS_COLOR', color: 'Blue' }
  ]
}
```

### NOT Condition
```typescript
{
  type: 'NOT',
  operands: [
    { type: 'IN_ZONE', zone: ZoneId.HAND }
  ]
}
```

### COMPARE Condition
```typescript
{
  type: 'COMPARE',
  operator: 'GTE',  // EQ, NEQ, GT, LT, GTE, LTE
  left: 'source.power',
  right: 5000
}
```

### HAS_KEYWORD Condition
```typescript
{
  type: 'HAS_KEYWORD',
  keyword: 'Rush'
}
```

### IN_ZONE Condition
```typescript
{
  type: 'IN_ZONE',
  zone: ZoneId.CHARACTER_AREA
}
```

### IS_COLOR Condition
```typescript
{
  type: 'IS_COLOR',
  color: 'Red'
}
```

## Cost Expressions

The EffectSystem supports various cost types:

### REST_DON Cost
```typescript
{
  type: 'REST_DON',
  amount: 2  // Rest 2 DON from cost area
}
```

### TRASH_CARD Cost
```typescript
{
  type: 'TRASH_CARD',
  amount: 1  // Trash 1 card from hand
}
```

### REST_CARD Cost
```typescript
{
  type: 'REST_CARD',
  amount: 1  // Rest 1 character
}
```

### COMPOSITE Cost
```typescript
{
  type: 'COMPOSITE',
  costs: [
    { type: 'REST_DON', amount: 1 },
    { type: 'TRASH_CARD', amount: 1 }
  ]
}
```

## Effect Context

Effect scripts receive an EffectContext with:

```typescript
interface EffectContext {
  state: GameState;           // Current game state
  source: CardInstance;       // Card with the effect
  controller: PlayerId;       // Player controlling the effect
  targets: Target[];          // Effect targets
  values: Map<string, any>;   // Additional values
  event: GameEvent | null;    // Triggering event (for AUTO effects)
}
```

## Effect Timing Types

- **ACTIVATE**: Manually activated effects (e.g., "[Activate: Main]")
- **AUTO**: Automatic triggers (e.g., "[On Play]", "[When Attacking]")
- **PERMANENT**: Continuous effects (e.g., "Your characters gain +1000 power")
- **REPLACEMENT**: Effects that modify other effects (e.g., cost reduction)

## Once-Per-Turn Restrictions

Effects with `oncePerTurn: true` can only be activated once per turn:

```typescript
const effectDef: EffectDefinition = {
  id: 'limited-effect',
  label: '[Activate: Main] [Once Per Turn]',
  timingType: EffectTimingType.ACTIVATE,
  triggerTiming: null,
  condition: null,
  cost: { type: 'REST_DON', amount: 1 },
  scriptId: 'draw-1-card',
  oncePerTurn: true  // Enforced by EffectSystem
};
```

## Error Handling

The EffectSystem throws `EffectError` for:

- Card not found
- Effect not found on card
- Wrong effect timing type
- Once-per-turn restriction violated
- Condition not met
- Cannot pay cost
- Script not found
- Script execution error

```typescript
try {
  effectSystem.activateEffect(cardId, effectId);
} catch (error) {
  if (error instanceof EffectError) {
    console.error('Effect error:', error.message);
  }
}
```

## State Management

The EffectSystem maintains an internal reference to the GameStateManager. After external state updates, call:

```typescript
effectSystem.updateStateManager(newStateManager);
```

This ensures the EffectSystem and ZoneManager stay synchronized.

## Integration with Other Systems

### With ZoneManager
The EffectSystem uses ZoneManager for card movement during cost payment:

```typescript
// TRASH_CARD cost moves cards from hand to trash
this.zoneManager.moveCard(cardId, ZoneId.TRASH);
```

### With EventEmitter
Effect activation and resolution can emit events for the rendering layer:

```typescript
// Events are emitted by ZoneManager during card movement
// Future: Direct effect events for animations
```

### With TriggerQueue (Future)
AUTO effects will be queued and resolved by TriggerQueue (Task 25):

```typescript
// When an AUTO effect triggers
triggerQueue.enqueueTrigger({
  effectDefinition: autoEffect,
  source: card,
  controller: playerId,
  event: triggeringEvent,
  priority: 0
});
```

## Testing

The EffectSystem includes comprehensive tests covering:

- Effect activation with various configurations
- Condition evaluation for all condition types
- Cost payment for all cost types
- Script registration and execution
- Once-per-turn restrictions
- Error handling

Run tests with:
```bash
npm test -- lib/game-engine/effects/EffectSystem.test.ts --run
```

## Future Enhancements

### Task 25: TriggerQueue
- Automatic trigger queuing and resolution
- Turn player priority handling
- Nested trigger resolution

### Task 26: Effect Scripts
- Helper methods for common operations
- Script registry with built-in effects
- Context utilities for card manipulation

### Task 27: Basic Effect Scripts
- Draw cards
- Search deck
- Power boost
- Cost reduction
- K.O. character
- Rest character

### Task 30: Replacement Effects
- Cost replacement effects
- Body replacement effects
- Multiple replacement effect ordering

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 7.3**: Effect activation with condition checking and cost payment
- **Requirement 7.4**: Effect resolution with script execution
- **Requirement 7.5**: Script-based effect system with context

## Design Decisions

### Script-Based Architecture
Effects are implemented as TypeScript functions rather than a DSL, providing:
- Full TypeScript type checking
- Better IDE support
- Easier debugging
- No custom parser needed

### Immutable State Updates
All state changes return new GameStateManager instances, enabling:
- Undo/replay functionality
- Time-travel debugging
- Easier testing

### Separation of Concerns
EffectSystem focuses on orchestration, delegating to:
- ZoneManager for card movement
- GameStateManager for state queries
- EventEmitter for event emission
- Script registry for effect implementation

This keeps the core system clean and maintainable.
