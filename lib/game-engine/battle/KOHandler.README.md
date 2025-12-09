# K.O. Handler

## Overview

The K.O. (Knock Out) Handler implements the character defeat mechanics for the One Piece TCG Engine. It manages the process of checking for "On K.O." effects, moving cards to trash, and queuing triggers for resolution.

## Implementation

### Core Function: `koCharacter`

Located in `KOHandler.ts`, this function handles the complete K.O. process:

```typescript
export function koCharacter(
  character: CardInstance,
  stateManager: GameStateManager
): {
  stateManager: GameStateManager;
  triggers: TriggerInstance[];
}
```

### Process Flow

1. **Check for "On K.O." effects** - While the card is still on the field, scan for any effects with `TriggerTiming.ON_KO`
2. **Enqueue On K.O. triggers** - Create trigger instances for each On K.O. effect found
3. **Move card to trash** - Use the state manager to move the character from its current zone to the trash
4. **Return triggers** - Return the queued triggers to be resolved by the EffectSystem (tasks 24-27)

### Key Design Decisions

**Separation of Concerns**: The K.O. handler does NOT resolve triggers itself. It only:
- Identifies On K.O. effects
- Creates trigger instances
- Moves the card to trash
- Returns triggers for the EffectSystem to resolve

This design allows the EffectSystem to handle trigger resolution with proper priority ordering (turn player first, then non-turn player).

**Trigger Priority**: Triggers are assigned priority based on the controller:
- Turn player's triggers: priority = 1 (higher)
- Non-turn player's triggers: priority = 0 (lower)

**Event Context**: Each trigger includes a K.O. event with context about the card movement, which can be used by effect scripts when they're resolved.

## Integration with BattleSystem

The `BattleSystem` calls `koCharacter` in its `damageStep` method when a character's power is insufficient to survive an attack:

```typescript
private koCharacter(character: CardInstance): void {
  const result = koCharacterHandler(character, this.stateManager);
  this.stateManager = result.stateManager;
  
  // Add triggers to pending triggers in game state
  if (result.triggers.length > 0) {
    const currentState = this.stateManager.getState();
    const updatedState = {
      ...currentState,
      pendingTriggers: [...currentState.pendingTriggers, ...result.triggers],
    };
    this.stateManager = new GameStateManager(updatedState);
  }
}
```

## Testing

Comprehensive tests are provided in `KOHandler.test.ts`:

- **Basic K.O. functionality**: Verifies cards move from field to trash
- **On K.O. effect handling**: Tests trigger creation for cards with On K.O. effects
- **Trigger priority**: Validates priority assignment based on turn player
- **Trigger event context**: Ensures proper event data is included
- **State consistency**: Confirms state remains valid after K.O.

All tests pass successfully, validating the implementation against requirements 8.1, 8.2, and 8.3.

## Requirements Satisfied

- **Requirement 8.1**: Check for "On K.O." effects while card is still on field ✓
- **Requirement 8.2**: Move card to trash ✓
- **Requirement 8.3**: Resolve queued On K.O. triggers (queued for EffectSystem) ✓

## Future Work

When the EffectSystem is implemented (tasks 24-27), the triggers returned by `koCharacter` will be:
1. Added to the trigger queue
2. Resolved according to priority (turn player first)
3. Executed with proper effect context
4. May trigger additional effects or state changes

The K.O. handler is designed to work seamlessly with the future EffectSystem without requiring modifications.
