# Card Play Handler

The Card Play Handler implements the card playing system for the One Piece TCG Engine. It handles playing cards from hand during the Main Phase, including cost payment, zone transitions, and triggering On Play effects.

## Overview

The card playing system is responsible for:
- Validating that a card can be played (in hand, player can afford cost)
- Paying the card's cost by resting DON in the cost area
- Moving the card to the appropriate zone based on its category
- Triggering On Play effects
- Enforcing zone limits (e.g., max 5 characters)

## Requirements Implemented

This module implements the following requirements from the design document:

- **Requirement 6.1**: Verify player has sufficient active DON to pay card cost
- **Requirement 6.2**: Rest required number of DON cards when paying cost
- **Requirement 6.3**: Move character to character area as active, trigger On Play effects
- **Requirement 6.4**: Trash existing stage, move new stage to stage area, trigger On Play effects
- **Requirement 6.5**: Resolve event effect and move to trash

## API

### `handlePlayCard`

Main function to handle playing a card from hand.

```typescript
function handlePlayCard(
  stateManager: GameStateManager,
  zoneManager: ZoneManager,
  eventEmitter: EventEmitter,
  playerId: PlayerId,
  cardId: string
): PlayCardResult
```

**Parameters:**
- `stateManager`: Current game state manager
- `zoneManager`: Zone manager for card movement
- `eventEmitter`: Event emitter for game events
- `playerId`: The player playing the card
- `cardId`: The card instance ID to play

**Returns:**
- `PlayCardResult`: Object containing:
  - `success`: Boolean indicating if the play was successful
  - `error`: Optional error message if play failed
  - `newState`: Updated game state manager

## Card Categories

### Character Cards

When a character card is played:
1. Validates character area is not full (max 5)
2. Pays cost by resting DON
3. Moves card from hand to character area
4. Sets card state to ACTIVE
5. Enqueues On Play triggers

### Stage Cards

When a stage card is played:
1. Pays cost by resting DON
2. If a stage already exists, moves it to trash
3. Moves new stage from hand to stage area
4. Sets card state to ACTIVE
5. Enqueues On Play triggers

### Event Cards

When an event card is played:
1. Pays cost by resting DON
2. Enqueues On Play triggers (effect resolution)
3. Moves card from hand to trash

## Cost Payment

The cost payment system:
- Counts active DON in the player's cost area
- Validates player has enough active DON
- Rests the required number of DON (changes state from ACTIVE to RESTED)
- Only rests active DON (already rested DON are not affected)

## Validation

The handler validates:
- Card exists in the game state
- Card is in the player's hand
- Player owns the card
- Player has enough active DON to pay the cost
- Zone limits are not exceeded (character area max 5)

## Error Handling

The handler returns a `PlayCardResult` with `success: false` and an error message if:
- Card is not found
- Card is not in hand
- Player doesn't own the card
- Player cannot afford the cost
- Character area is full
- Any other validation fails

## On Play Effects

When a card is played, the handler:
1. Searches the card's effects for AUTO effects with ON_PLAY trigger timing
2. Creates a trigger instance for each On Play effect
3. Adds triggers to the pending triggers queue
4. Sets priority based on active player (active player's triggers resolve first)

The actual effect resolution is handled by the Effect System (tasks 24-27).

## Integration with Main Phase

The Card Play Handler is integrated into the Main Phase action loop:

```typescript
// In MainPhase.ts
function handlePlayCard(
  stateManager: GameStateManager,
  action: PlayCardAction,
  rules: RulesContext,
  eventEmitter: EventEmitter,
  zoneManager: ZoneManager
): ActionResult {
  return handlePlayCardImpl(
    stateManager,
    zoneManager,
    eventEmitter,
    action.playerId,
    action.cardId
  );
}
```

## Examples

See `CardPlayHandler.example.ts` for complete usage examples:

### Playing a Character

```typescript
const result = handlePlayCard(
  stateManager,
  zoneManager,
  eventEmitter,
  PlayerId.PLAYER_1,
  characterCard.id
);

if (result.success) {
  // Card is now in character area
  // DON have been rested
  // On Play triggers are enqueued
}
```

### Playing a Stage (Replacing Existing)

```typescript
// If a stage already exists, it will be trashed
const result = handlePlayCard(
  stateManager,
  zoneManager,
  eventEmitter,
  PlayerId.PLAYER_1,
  newStage.id
);
```

### Playing an Event

```typescript
// Event is played and immediately moved to trash
const result = handlePlayCard(
  stateManager,
  zoneManager,
  eventEmitter,
  PlayerId.PLAYER_1,
  eventCard.id
);
```

## Testing

The module includes comprehensive tests in `CardPlayHandler.test.ts`:

- Playing character cards
- Playing stage cards (with replacement)
- Playing event cards
- Cost payment validation
- Zone limit enforcement
- Card validation (in hand, ownership, etc.)
- On Play trigger enqueueing

## Future Enhancements

The following features will be added in future tasks:

- **Task 14**: DON giving system (giving DON to characters/leaders)
- **Task 15**: Power and cost calculation with modifiers
- **Task 24-27**: Effect system for resolving On Play effects
- **Task 28**: Keyword system (Rush, Blocker, etc.)
- **Task 29**: Modifier system for temporary/permanent stat changes

## Dependencies

- `GameStateManager`: For state queries and updates
- `ZoneManager`: For card movement between zones
- `EventEmitter`: For emitting game events
- Core types from `types.ts`

## Notes

- The handler maintains immutability by returning new state managers
- All state changes are atomic (either fully succeed or fully fail)
- The zone manager's state reference must be updated before use
- Triggers are enqueued but not resolved (resolution happens in Effect System)
- Cost modifiers are not yet implemented (will be added in task 15)
