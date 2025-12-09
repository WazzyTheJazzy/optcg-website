# End Phase Implementation

## Overview

The End Phase is the final phase of each turn in the One Piece TCG. It handles triggering end-of-turn effects and cleaning up temporary modifiers that expire at the end of the turn.

## Responsibilities

The End Phase performs the following operations in order:

1. **Trigger END_OF_YOUR_TURN effects** - Enqueue auto effects with `END_OF_YOUR_TURN` timing for the active player's cards
2. **Trigger END_OF_OPPONENT_TURN effects** - Enqueue auto effects with `END_OF_OPPONENT_TURN` timing for the non-active player's cards
3. **Resolve pending triggers** - Process all enqueued triggers (placeholder until effect system is implemented)
4. **Expire temporary modifiers** - Remove modifiers with `UNTIL_END_OF_TURN` and `DURING_THIS_TURN` durations

## Usage

```typescript
import { runEndPhase } from './EndPhase';
import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';

// Initialize components
const rules = new RulesContext();
const eventEmitter = new EventEmitter();
let stateManager = new GameStateManager(initialState);

// Run the end phase
stateManager = runEndPhase(stateManager, rules, eventEmitter);
```

## Effect Timing

### END_OF_YOUR_TURN

Effects with `END_OF_YOUR_TURN` timing trigger only for cards controlled by the **active player** (the player whose turn it is).

**Example:**
```
[End of Your Turn] Draw 1 card.
```

This effect would trigger during the active player's End Phase.

### END_OF_OPPONENT_TURN

Effects with `END_OF_OPPONENT_TURN` timing trigger only for cards controlled by the **non-active player** (the opponent).

**Example:**
```
[End of Opponent Turn] Rest 1 of your opponent's Characters.
```

This effect would trigger during the opponent's End Phase (when it's not your turn).

## Trigger Priority

When multiple effects trigger during the End Phase, they are resolved in the following order:

1. **Active player's triggers** (priority 0) - END_OF_YOUR_TURN effects
2. **Non-active player's triggers** (priority 1) - END_OF_OPPONENT_TURN effects

Within each priority group, triggers are resolved in the order they were enqueued.

## Modifier Expiration

The End Phase expires modifiers with the following durations:

- `UNTIL_END_OF_TURN` - Modifiers that last until the end of the current turn
- `DURING_THIS_TURN` - Modifiers that last during the current turn

Modifiers with other durations are **not** expired:

- `PERMANENT` - Never expires
- `UNTIL_END_OF_BATTLE` - Expires at the end of a battle
- `UNTIL_START_OF_NEXT_TURN` - Expires at the start of the next turn (in Refresh Phase)

## Implementation Details

### Function Signature

```typescript
export function runEndPhase(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter
): GameStateManager
```

### Parameters

- `stateManager` - The current game state manager
- `rules` - The rules context (for future use)
- `eventEmitter` - The event emitter for game events

### Return Value

Returns an updated `GameStateManager` with:
- Triggers enqueued for end-of-turn effects
- Temporary modifiers expired
- All state changes applied immutably

### State Changes

The End Phase modifies the game state by:

1. Adding triggers to the `pendingTriggers` queue
2. Removing expired modifiers from card instances
3. Maintaining immutability through the GameStateManager API

## Integration with PhaseManager

The End Phase is automatically executed by the PhaseManager as the last phase of each turn:

```typescript
// In PhaseManager.executePhase()
case Phase.END:
  return runEndPhase(stateManager, this.rules, this.eventEmitter);
```

After the End Phase completes, the PhaseManager:
1. Increments the turn number
2. Switches the active player
3. Begins the next turn with the Refresh Phase

## Examples

See `EndPhase.example.ts` for detailed usage examples including:

- Basic End Phase execution
- Triggering END_OF_YOUR_TURN effects
- Triggering END_OF_OPPONENT_TURN effects
- Expiring temporary modifiers
- Handling both players' effects

## Testing

See `EndPhase.test.ts` for comprehensive test coverage including:

- END_OF_YOUR_TURN trigger enqueueing
- END_OF_OPPONENT_TURN trigger enqueueing
- Modifier expiration for different durations
- Multiple cards with modifiers
- Edge cases and error conditions

## Future Enhancements

When the effect system is fully implemented (tasks 24-27), the placeholder trigger resolution will be replaced with actual effect execution:

```typescript
// Current placeholder
console.log(`[EndPhase] Would resolve trigger: ${trigger.effectDefinition.label}`);

// Future implementation
effectSystem.resolveTrigger(trigger, currentState);
```

## Related Files

- `EndPhase.ts` - Main implementation
- `EndPhase.test.ts` - Test suite
- `EndPhase.example.ts` - Usage examples
- `PhaseManager.ts` - Phase orchestration
- `../core/types.ts` - Type definitions
- `../core/GameState.ts` - State management

## Requirements

This implementation satisfies requirement **3.6** from the requirements document:

> **Requirement 3.6**: WHEN the End Phase begins, THE Game Engine SHALL trigger end-of-turn effects for both players and expire turn-duration effects

## Notes

- The End Phase does **not** check for defeat conditions - this is handled by the DefeatChecker (task 31)
- The End Phase does **not** handle turn switching - this is handled by the PhaseManager
- Effect resolution is currently a placeholder and will be implemented in the effect system tasks
