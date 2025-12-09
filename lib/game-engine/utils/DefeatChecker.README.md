# DefeatChecker

The DefeatChecker module handles all defeat condition checking for the One Piece TCG Engine. It implements the official game rules for determining when a player has lost and when the game should end.

## Overview

The DefeatChecker is responsible for:
- Checking if any player has been marked as defeated
- Detecting when a player's deck is empty (deck out)
- Determining if a player should be defeated due to zero life
- Applying defeat results to the game state

## Defeat Conditions

According to the official One Piece TCG rules, a player loses when:

1. **Defeated Flag**: The player has been explicitly marked as defeated (usually due to taking damage with zero life)
2. **Deck Out**: The player's deck is empty
3. **Zero Life Damage**: The player takes leader damage when they have no life cards remaining

## Usage

### Basic Defeat Check

```typescript
import { runDefeatCheck, applyDefeatCheck } from './DefeatChecker';

// Run the defeat check
const result = runDefeatCheck(stateManager);

if (result.gameOver) {
  console.log(`Game Over! Winner: ${result.winner}`);
  console.log(`Reason: ${result.reason}`);
  
  // Apply the result to game state
  stateManager = applyDefeatCheck(stateManager, result);
}
```

### Marking a Player as Defeated

When a player takes damage with zero life:

```typescript
import { markPlayerDefeated, shouldDefeatForZeroLife } from './DefeatChecker';

// Check if player should be defeated
if (shouldDefeatForZeroLife(stateManager, playerId)) {
  // Mark them as defeated
  stateManager = markPlayerDefeated(stateManager, playerId);
  
  // Then run defeat check
  const result = runDefeatCheck(stateManager);
  stateManager = applyDefeatCheck(stateManager, result);
}
```

### Integration with Game Flow

The defeat check should be called after:
- Every player action (play card, attack, etc.)
- Every trigger resolution
- Every phase transition
- Any time game state changes

```typescript
// Example: After playing a card
function playCard(stateManager, playerId, cardId) {
  // ... play card logic ...
  
  // Check for defeat
  const defeatResult = runDefeatCheck(stateManager);
  stateManager = applyDefeatCheck(stateManager, defeatResult);
  
  if (defeatResult.gameOver) {
    return { stateManager, gameOver: true };
  }
  
  return { stateManager, gameOver: false };
}
```

## API Reference

### `runDefeatCheck(stateManager: GameStateManager): DefeatCheckResult`

Checks all defeat conditions and returns the result.

**Parameters:**
- `stateManager`: The current game state manager

**Returns:** `DefeatCheckResult` object with:
- `gameOver`: Boolean indicating if the game should end
- `winner`: The winning player ID or null for a draw
- `reason`: String describing why the game ended

**Defeat Check Priority:**
1. If game is already over, return current state
2. Check for defeated flags (both players = draw)
3. Check for empty decks (both empty = draw)

### `applyDefeatCheck(stateManager: GameStateManager, result: DefeatCheckResult): GameStateManager`

Applies a defeat check result to the game state.

**Parameters:**
- `stateManager`: The current game state manager
- `result`: The defeat check result to apply

**Returns:** Updated game state manager with game over status set if applicable

### `markPlayerDefeated(stateManager: GameStateManager, playerId: PlayerId): GameStateManager`

Marks a player as defeated by setting their defeated flag.

**Parameters:**
- `stateManager`: The current game state manager
- `playerId`: The player to mark as defeated

**Returns:** Updated game state manager with defeated flag set

### `shouldDefeatForZeroLife(stateManager: GameStateManager, playerId: PlayerId): boolean`

Checks if a player should be defeated due to having zero life cards.

**Parameters:**
- `stateManager`: The current game state manager
- `playerId`: The player to check

**Returns:** True if the player has zero life cards

## Draw Scenarios

The game can end in a draw when:
- Both players have the defeated flag set simultaneously
- Both players' decks are empty simultaneously

In these cases, `winner` will be `null` in the defeat check result.

## Implementation Notes

### Immutability

All functions return new state managers rather than modifying existing ones, maintaining the immutable state pattern used throughout the engine.

### Performance

The defeat check is lightweight and can be called frequently without performance concerns. It only checks:
- Two boolean flags (defeated)
- Two array lengths (deck sizes)

### Error Handling

If a player is not found (which shouldn't happen in normal operation), the functions gracefully return unchanged state rather than throwing errors.

## Testing

The DefeatChecker includes comprehensive tests covering:
- Individual defeat conditions
- Draw scenarios
- Priority of defeat conditions
- Integration with game state
- Edge cases (already game over, invalid players)

Run tests with:
```bash
npm test DefeatChecker.test.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 9.1**: Detects when a player's deck is empty and ends the game
- **Requirement 9.2**: Detects when a player takes damage with zero life and marks them defeated
- **Requirement 9.3**: Marks defeated players and ends the game with the other player as winner
- **Requirement 9.4**: Checks for defeat after every action and trigger resolution

## Related Modules

- **GameState**: Provides the state management interface
- **BattleSystem**: Calls defeat check after leader damage
- **PhaseManager**: Calls defeat check after each phase
- **EffectSystem**: Calls defeat check after trigger resolution
