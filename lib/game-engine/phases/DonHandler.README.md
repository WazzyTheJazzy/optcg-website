# DonHandler

Handles giving DON cards to characters and leaders during the Main Phase.

## Overview

The DON giving system allows players to attach active DON cards from their cost area to characters or leaders on the field. Each given DON increases the target card's power by 1000.

## Requirements

- **Requirement 6.6**: WHEN a player gives DON during main phase, THE Game Engine SHALL move an active DON from cost area to under the target character or leader

## Core Functions

### `handleGiveDon()`

Main function to handle giving a DON to a target card.

**Parameters:**
- `stateManager`: Current game state manager
- `zoneManager`: Zone manager for card movement
- `eventEmitter`: Event emitter for game events
- `playerId`: Player giving the DON
- `donId`: DON instance ID to give
- `targetCardId`: Target character or leader card ID

**Returns:** `GiveDonResult` with success status and updated state

**Validation:**
1. DON must exist and be in cost area
2. DON must be active (not rested)
3. DON must be owned by the player
4. Target must exist and be a character or leader
5. Target must be on field (character area or leader area)
6. Target must be controlled by the player

**Effects:**
- Moves DON from cost area to target card's `givenDon` array
- Updates target card's power calculation
- Emits `POWER_CHANGED` event

### `computeCurrentPower()`

Calculates the current power of a card including all modifiers and given DON.

**Formula:**
```
Current Power = Base Power + Power Modifiers + (Given DON Count × 1000)
```

**Parameters:**
- `card`: Card instance to calculate power for

**Returns:** Current power value as number

### `canGiveDon()`

Validates if a DON can be given to a target card without performing the action.

**Parameters:**
- `stateManager`: Current game state manager
- `playerId`: Player giving the DON
- `donId`: DON instance ID
- `targetCardId`: Target card ID

**Returns:** `true` if DON can be given, `false` otherwise

## Usage Example

```typescript
import { handleGiveDon, canGiveDon } from './DonHandler';

// Check if DON can be given
const canGive = canGiveDon(
  stateManager,
  PlayerId.PLAYER_1,
  'don-1',
  'character-1'
);

if (canGive) {
  // Give DON to character
  const result = handleGiveDon(
    stateManager,
    zoneManager,
    eventEmitter,
    PlayerId.PLAYER_1,
    'don-1',
    'character-1'
  );

  if (result.success) {
    // Update state
    stateManager = result.newState;
    
    // Character now has +1000 power
    const character = stateManager.getCard('character-1');
    const power = computeCurrentPower(character);
    console.log(`Character power: ${power}`);
  }
}
```

## Power Calculation

The power calculation system is central to the DON giving mechanic:

1. **Base Power**: From card definition (`basePower`)
2. **Modifiers**: Temporary or permanent power boosts/reductions
3. **Given DON**: Each DON in `givenDon` array adds 1000 power

Example:
- Character with 5000 base power
- +2000 power modifier from effect
- 2 given DON cards
- **Total Power**: 5000 + 2000 + (2 × 1000) = 9000

## Events

### POWER_CHANGED Event

Emitted when a DON is given to a card, changing its power.

**Event Data:**
```typescript
{
  type: GameEventType.POWER_CHANGED,
  playerId: PlayerId,
  cardId: string,
  data: {
    cardId: string,
    oldPower: number,
    newPower: number,
  },
  timestamp: number
}
```

## Error Handling

The handler returns a `GiveDonResult` object with:
- `success`: Boolean indicating if operation succeeded
- `error`: Optional error message if failed
- `newState`: Updated state (unchanged if failed)

Common errors:
- DON not found
- DON not in cost area
- DON not active
- Target not found
- Target not a character or leader
- Target not on field
- Target not controlled by player

## Integration

The DonHandler integrates with:
- **GameState**: For state queries and updates
- **ZoneManager**: For moving DON between zones
- **EventEmitter**: For emitting power change events
- **MainPhase**: Called during main phase action loop

## Testing

Comprehensive test coverage includes:
- Successful DON giving to characters and leaders
- All validation failure cases
- Power calculation with various combinations
- Event emission verification
- `canGiveDon` validation function

Run tests:
```bash
npx vitest run lib/game-engine/phases/DonHandler.test.ts
```

## Future Enhancements

Potential future additions:
- DON removal/return mechanics
- Special DON types with different power values
- Effects that trigger when DON is given
- Limits on DON per card
