# LoopGuard

The `LoopGuard` class detects infinite loops in game state by tracking state fingerprints and applying official One Piece TCG infinite loop resolution rules.

## Purpose

In card games, certain combinations of effects can create infinite loops where the game state repeats indefinitely. The LoopGuard prevents games from hanging by:

1. **Detecting loops**: Tracking game state hashes to identify when a state repeats too many times
2. **Resolving loops**: Applying official rules to determine how to break the loop

## How It Works

### State Hashing

The LoopGuard creates a "fingerprint" of the relevant game state by hashing:

- **Public zones**: Card positions, states, and modifiers in visible areas
- **DON state**: Position and state of all DON cards
- **Game phase**: Current phase and active player
- **Zone sizes**: Number of cards in hidden zones (deck, hand, life)

It **excludes**:
- Exact contents of hidden zones (deck order, hand contents)
- Timestamps and unique IDs
- Game history

This ensures that only meaningful state changes are tracked, while random variations (like shuffling) don't affect loop detection.

### Loop Detection

The LoopGuard tracks how many times each state hash has been seen. When a state repeats more than the configured maximum (default: 4 times from rules.json), a loop is detected.

### Loop Resolution

When a loop is detected, the LoopGuard applies official rules:

1. **Both players can stop**: Game continues (players must negotiate)
2. **One player can stop**: That player must take action to stop the loop
3. **Neither can stop**: Game ends in a draw

The current implementation uses a heuristic to determine "can stop":
- Active player during main phase with resources = can stop
- Other situations = cannot stop

## Usage

### Basic Usage

```typescript
import { LoopGuard } from './LoopGuard';
import { RulesContext } from '../rules/RulesContext';

const rules = new RulesContext();
const loopGuard = new LoopGuard(rules);

// Check for loop after each significant action
const result = loopGuard.checkForLoop(gameState);

if (result.loopDetected) {
  console.log(`Loop detected! Resolution: ${result.resolution}`);
  
  if (result.stoppingPlayer) {
    console.log(`Player ${result.stoppingPlayer} must stop the loop`);
  }
}
```

### Recording State

```typescript
// After each action, record the state
const stateHash = loopGuard.recordState(gameState);

// Update the game state's loop guard tracking
gameStateManager = gameStateManager.updateLoopGuard(stateHash);
```

### Checking Repeat Count

```typescript
// Check how many times current state has been seen
const repeatCount = loopGuard.getRepeatCount(gameState);
console.log(`This state has been seen ${repeatCount} times`);
```

### Creating Fresh State

```typescript
// For new games or testing
const freshLoopGuardState = loopGuard.createFreshLoopGuardState();
```

## Integration with Game Engine

The LoopGuard should be called:

1. **After each player action** (play card, attack, activate effect)
2. **After trigger resolution** (when auto effects resolve)
3. **At phase transitions** (when moving between phases)

Example integration:

```typescript
class GameEngine {
  private loopGuard: LoopGuard;
  
  executeAction(action: Action): void {
    // Execute the action
    this.performAction(action);
    
    // Check for loop
    const loopResult = this.loopGuard.checkForLoop(this.state);
    
    if (loopResult.loopDetected) {
      this.handleInfiniteLoop(loopResult);
    } else {
      // Record state for future loop detection
      const stateHash = this.loopGuard.recordState(this.state);
      this.stateManager = this.stateManager.updateLoopGuard(stateHash);
    }
  }
  
  private handleInfiniteLoop(result: LoopResolutionResult): void {
    switch (result.resolution) {
      case 'draw':
        this.stateManager = this.stateManager.setGameOver(null);
        break;
      case 'player1_must_stop':
      case 'player2_must_stop':
        // Force the stopping player to make a different choice
        this.enforceLoopBreaking(result.stoppingPlayer!);
        break;
      case 'continue':
        // Game continues, but warn players
        this.emitEvent('loopWarning', { result });
        break;
    }
  }
}
```

## Configuration

Loop detection behavior is configured in `rules.json`:

```json
{
  "infiniteLoopRules": {
    "maxRepeats": 4,
    "resolution": {
      "bothCanStop": "game_continues",
      "oneCanStop": "stopping_player_must_stop",
      "neitherCanStop": "draw"
    }
  }
}
```

- **maxRepeats**: How many times a state can repeat before loop is detected
- **resolution**: Rules for each scenario

## Performance Considerations

### Hash Computation

State hashing uses SHA-256 and is relatively fast, but should not be called excessively:

- ✅ Call after each player action
- ✅ Call after trigger resolution
- ❌ Don't call on every state query
- ❌ Don't call during animation/rendering

### Memory Usage

The LoopGuard stores a hash map of all seen states. In typical games:

- Each hash is 64 characters (32 bytes)
- Each count is a number (8 bytes)
- Total: ~40 bytes per unique state

A 100-turn game might see 500-1000 unique states = ~40KB memory usage.

For very long games, consider:
- Clearing old states (states from >10 turns ago)
- Using a sliding window of recent states
- Implementing state pruning

## Testing

The LoopGuard includes comprehensive tests:

```bash
npm test lib/game-engine/utils/LoopGuard.test.ts
```

Tests cover:
- State hashing consistency
- Loop detection accuracy
- Resolution rule application
- Edge cases and integration scenarios

## Future Enhancements

### Improved "Can Stop" Detection

The current heuristic for determining if a player can stop a loop is simplified. Future versions could:

- Analyze the game tree to see if different choices lead to different states
- Track which actions led to the loop
- Use machine learning to predict loop-breaking actions

### Automatic Loop Breaking

Instead of just detecting loops, the engine could:

- Automatically try alternative actions
- Suggest loop-breaking moves to players
- Implement backtracking to find non-looping paths

### Loop Prevention

Proactive measures to prevent loops:

- Warn players when approaching a loop
- Limit certain actions that commonly cause loops
- Implement "once per loop" restrictions on effects

## Related Components

- **GameState**: Stores the loop guard state
- **RulesContext**: Provides loop resolution rules
- **GameEngine**: Integrates loop detection into game flow
- **PhaseManager**: Calls loop detection at phase boundaries
