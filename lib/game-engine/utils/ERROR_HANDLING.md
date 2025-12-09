# Error Handling System

## Overview

The One Piece TCG Engine implements a comprehensive error handling system that provides:

- **Type-safe error classes** for different error scenarios
- **Centralized error handling** through the ErrorHandler class
- **Atomic operations** with automatic rollback on failure
- **Event-driven error reporting** for UI integration
- **Debug mode** with verbose logging
- **Error history tracking** for debugging and analysis

## Architecture

### Error Class Hierarchy

```
Error (JavaScript built-in)
  └── GameEngineError (base class for all engine errors)
      ├── IllegalActionError (invalid player actions)
      ├── InvalidStateError (corrupted or invalid game state)
      ├── RulesViolationError (game rule violations)
      ├── CardDataError (invalid or missing card data)
      ├── EffectResolutionError (effect execution failures)
      └── ZoneOperationError (zone management failures)
```

### Components

1. **Error Classes** (`errors.ts`) - Type-safe error definitions
2. **ErrorHandler** (`ErrorHandler.ts`) - Centralized error management
3. **ValidationUtils** (`validation.ts`) - Pre-action validation
4. **StateTransaction** (`StateTransaction.ts`) - Atomic operations with rollback

## Error Classes

### GameEngineError

Base class for all game engine errors.

```typescript
class GameEngineError extends Error {
  constructor(
    message: string,
    code: string,
    context?: Record<string, any>
  )
}
```

**Properties:**
- `message`: Human-readable error description
- `code`: Machine-readable error code (e.g., 'ILLEGAL_ACTION')
- `context`: Additional contextual data about the error
- `name`: Error class name
- `stack`: Stack trace

**Methods:**
- `toJSON()`: Serialize error to JSON for logging/transmission

### IllegalActionError

Thrown when a player attempts an invalid action.

```typescript
class IllegalActionError extends GameEngineError {
  constructor(
    action: string,
    reason: string,
    context?: Record<string, any>
  )
}
```

**Example:**
```typescript
throw new IllegalActionError(
  'play card',
  'Insufficient DON to pay cost',
  { cardId: 'card-123', requiredCost: 5, availableDon: 3 }
);
```

### InvalidStateError

Thrown when the game state is invalid or corrupted.

```typescript
class InvalidStateError extends GameEngineError {
  constructor(
    message: string,
    context?: Record<string, any>
  )
}
```

**Example:**
```typescript
throw new InvalidStateError(
  'Player not found in game state',
  { playerId: 'PLAYER_1' }
);
```

### RulesViolationError

Thrown when a game rule is violated.

```typescript
class RulesViolationError extends GameEngineError {
  constructor(
    rule: string,
    context?: Record<string, any>
  )
}
```

**Example:**
```typescript
throw new RulesViolationError(
  'Character area is full (max 5)',
  { playerId: 'PLAYER_1', currentCount: 5, maxCharacters: 5 }
);
```

### CardDataError

Thrown when card data is invalid or missing.

```typescript
class CardDataError extends GameEngineError {
  constructor(
    message: string,
    cardId?: string,
    context?: Record<string, any>
  )
}
```

### EffectResolutionError

Thrown when an effect cannot be resolved.

```typescript
class EffectResolutionError extends GameEngineError {
  constructor(
    effectId: string,
    reason: string,
    context?: Record<string, any>
  )
}
```

### ZoneOperationError

Thrown when zone operations fail.

```typescript
class ZoneOperationError extends GameEngineError {
  constructor(
    operation: string,
    zone: string,
    reason: string,
    context?: Record<string, any>
  )
}
```

## ErrorHandler

Centralized error management with event emission and history tracking.

### Configuration

```typescript
interface ErrorHandlerOptions {
  debugMode?: boolean;        // Enable verbose logging (default: false)
  logToConsole?: boolean;     // Log errors to console (default: true)
  maxErrorHistory?: number;   // Max errors to keep in history (default: 100)
}

const errorHandler = new ErrorHandler(eventEmitter, {
  debugMode: true,
  logToConsole: true,
  maxErrorHistory: 50
});
```

### Methods

#### handleError

Process and log an error, emit event, and add to history.

```typescript
errorHandler.handleError(error: Error, context?: Record<string, any>): void
```

**Example:**
```typescript
try {
  // Some operation
} catch (error) {
  errorHandler.handleError(error as Error, {
    action: 'playCard',
    playerId: 'PLAYER_1',
    cardId: 'card-123'
  });
}
```

#### setDebugMode / isDebugMode

Control debug mode for verbose logging.

```typescript
errorHandler.setDebugMode(enabled: boolean): void
errorHandler.isDebugMode(): boolean
```

#### getErrorHistory

Get all errors in history.

```typescript
errorHandler.getErrorHistory(): readonly ErrorEvent[]
```

#### getRecentErrors

Get the N most recent errors.

```typescript
errorHandler.getRecentErrors(count: number = 10): readonly ErrorEvent[]
```

#### getErrorsByCode

Get all errors with a specific error code.

```typescript
errorHandler.getErrorsByCode(code: string): readonly ErrorEvent[]
```

#### hasErrorOccurred

Check if an error with a specific code has occurred.

```typescript
errorHandler.hasErrorOccurred(code: string): boolean
```

#### clearErrorHistory

Clear all errors from history.

```typescript
errorHandler.clearErrorHistory(): void
```

#### wrapOperation

Execute an operation with automatic error handling.

```typescript
const result = errorHandler.wrapOperation(
  () => someOperation(),
  'operationName',
  { additionalContext: 'value' }
);
// Returns result on success, null on error
```

#### wrapAsyncOperation

Execute an async operation with automatic error handling.

```typescript
const result = await errorHandler.wrapAsyncOperation(
  async () => await someAsyncOperation(),
  'operationName',
  { additionalContext: 'value' }
);
// Returns result on success, null on error
```

## ValidationUtils

Pre-action validation to prevent errors before state changes.

### Methods

#### validateCardExists

Validate that a card exists in the game state.

```typescript
ValidationUtils.validateCardExists(state: GameState, cardId: string): CardInstance
// Throws CardDataError if card not found
```

#### validatePlayerExists

Validate that a player exists in the game state.

```typescript
ValidationUtils.validatePlayerExists(state: GameState, playerId: PlayerId): void
// Throws InvalidStateError if player not found
```

#### validateActivePlayer

Validate that it's the specified player's turn.

```typescript
ValidationUtils.validateActivePlayer(state: GameState, playerId: PlayerId): void
// Throws IllegalActionError if not player's turn
```

#### validateCardInZone

Validate that a card is in a specific zone.

```typescript
ValidationUtils.validateCardInZone(card: CardInstance, expectedZone: ZoneId, action: string): void
// Throws IllegalActionError if card not in expected zone
```

#### validateCardOwner

Validate that a card is owned by a specific player.

```typescript
ValidationUtils.validateCardOwner(card: CardInstance, playerId: PlayerId, action: string): void
// Throws IllegalActionError if card not owned by player
```

#### validateCardController

Validate that a card is controlled by a specific player.

```typescript
ValidationUtils.validateCardController(card: CardInstance, playerId: PlayerId, action: string): void
// Throws IllegalActionError if card not controlled by player
```

#### validateCardCategory

Validate that a card is of a specific category.

```typescript
ValidationUtils.validateCardCategory(card: CardInstance, expectedCategory: CardCategory, action: string): void
// Throws IllegalActionError if card not of expected category
```

#### validateCanAffordCost

Validate that a player has enough resources to pay a cost.

```typescript
ValidationUtils.validateCanAffordCost(state: GameState, playerId: PlayerId, cost: number): void
// Throws IllegalActionError if insufficient resources
```

#### validateCharacterAreaNotFull

Validate that the character area is not full.

```typescript
ValidationUtils.validateCharacterAreaNotFull(state: GameState, playerId: PlayerId, maxCharacters: number = 5): void
// Throws RulesViolationError if character area is full
```

#### validateGameNotOver

Validate that the game is not over.

```typescript
ValidationUtils.validateGameNotOver(state: GameState): void
// Throws IllegalActionError if game is over
```

## StateTransaction

Atomic operations with automatic rollback on error.

### Usage

```typescript
import { executeWithTransaction } from './StateTransaction';

const result = executeWithTransaction(state, (state) => {
  // Perform state modifications
  // If any error is thrown, state will be rolled back
  return modifiedState;
});

if (result.success) {
  console.log('Operation succeeded:', result.result);
  state = result.state; // Use the new state
} else {
  console.error('Operation failed:', result.error);
  state = result.state; // State is rolled back to original
}
```

### Async Operations

```typescript
import { executeWithTransactionAsync } from './StateTransaction';

const result = await executeWithTransactionAsync(state, async (state) => {
  // Perform async state modifications
  return await modifyStateAsync(state);
});
```

## Integration with GameEngine

The GameEngine integrates all error handling components:

### Action Handlers

All action handlers follow this pattern:

```typescript
playCard(playerId: PlayerId, cardId: string, targets: Target[] = []): boolean {
  try {
    // 1. Validate game state
    this.validateGameState();
    ValidationUtils.validateActivePlayer(this.stateManager.getState(), playerId);
    
    // 2. Validate card exists
    const card = ValidationUtils.validateCardExists(this.stateManager.getState(), cardId);
    ValidationUtils.validateCardInZone(card, ZoneId.HAND, 'play card');
    ValidationUtils.validateCardController(card, playerId, 'play card');

    // 3. Execute within transaction for atomic rollback
    const result = executeWithTransaction(this.stateManager.getState(), (state) => {
      // Record the action
      this.recordAction({
        type: ActionType.PLAY_CARD,
        playerId,
        data: { cardId, targets },
        timestamp: Date.now(),
      });

      // Perform the action
      const playResult = handlePlayCard(
        this.stateManager,
        this.zoneManager,
        this.eventEmitter,
        playerId,
        cardId
      );

      if (!playResult.success) {
        throw new IllegalActionError('play card', playResult.error || 'Failed to play card');
      }

      this.stateManager = playResult.newState;
      this.updateAllSubsystems();

      return true;
    });

    if (!result.success) {
      throw result.error;
    }

    return result.result!;
  } catch (error) {
    // 4. Handle error through error handler
    this.errorHandler.handleError(error as Error, {
      action: 'playCard',
      playerId,
      cardId,
      targets,
    });
    
    // 5. Re-throw GameEngineError or wrap in GameEngineError
    if (error instanceof GameEngineError) {
      throw error;
    }
    throw new GameEngineError(
      `Failed to play card: ${error instanceof Error ? error.message : String(error)}`,
      'PLAY_CARD_ERROR'
    );
  }
}
```

### Debug Mode

Enable debug mode for verbose error logging:

```typescript
const engine = new GameEngine();
engine.setDebugMode(true);

// Now all errors will be logged with full context and stack traces
```

### Error History

Access error history for debugging:

```typescript
// Get all errors
const allErrors = engine.getErrorHistory();

// Get recent errors
const recentErrors = engine.getRecentErrors(5);

// Get errors by code
const illegalActions = engine.getErrorsByCode('ILLEGAL_ACTION');

// Check if specific error occurred
if (engine.hasErrorOccurred('RULES_VIOLATION')) {
  console.log('A rules violation occurred during the game');
}

// Clear error history
engine.clearErrorHistory();
```

### Error Events

Subscribe to error events for UI integration:

```typescript
engine.on('ERROR', (event) => {
  console.error('Game error:', event.error.message);
  
  // Display error to user
  showErrorNotification({
    title: event.error.name,
    message: event.error.message,
    code: event.error.code,
    context: event.error.context
  });
});
```

## Best Practices

### 1. Validate Before Modifying State

Always validate inputs and game state before making changes:

```typescript
// ✅ Good
ValidationUtils.validateActivePlayer(state, playerId);
ValidationUtils.validateCardExists(state, cardId);
// ... then modify state

// ❌ Bad
// Modify state first, then check if it was valid
```

### 2. Use Transactions for Complex Operations

Wrap multi-step operations in transactions:

```typescript
// ✅ Good
const result = executeWithTransaction(state, (state) => {
  // Multiple state modifications
  // If any step fails, all changes are rolled back
});

// ❌ Bad
// Make changes directly without transaction
// If something fails midway, state is corrupted
```

### 3. Provide Context in Errors

Always include relevant context when throwing errors:

```typescript
// ✅ Good
throw new IllegalActionError(
  'play card',
  'Insufficient DON',
  { cardId, requiredCost: 5, availableDon: 3 }
);

// ❌ Bad
throw new Error('Cannot play card');
```

### 4. Use Specific Error Classes

Use the most specific error class for the situation:

```typescript
// ✅ Good
throw new RulesViolationError('Character area is full');

// ❌ Bad
throw new GameEngineError('Character area is full', 'ERROR');
```

### 5. Handle Errors at the Right Level

- **Low-level functions**: Throw errors, don't catch them
- **Mid-level functions**: Catch and re-throw with more context
- **High-level functions (GameEngine)**: Catch, log, and handle gracefully

```typescript
// Low-level (ZoneManager)
moveCard(cardId: string, toZone: ZoneId): void {
  if (!this.cardExists(cardId)) {
    throw new CardDataError('Card not found', cardId);
  }
  // ... move card
}

// High-level (GameEngine)
playCard(playerId: PlayerId, cardId: string): boolean {
  try {
    // ... operations that might throw
  } catch (error) {
    this.errorHandler.handleError(error as Error, { action: 'playCard' });
    throw error; // Re-throw for caller to handle
  }
}
```

### 6. Enable Debug Mode During Development

```typescript
if (process.env.NODE_ENV === 'development') {
  engine.setDebugMode(true);
}
```

### 7. Monitor Error Patterns

Regularly check error history for patterns:

```typescript
// Check for repeated errors
const errorCounts = new Map<string, number>();
for (const event of engine.getErrorHistory()) {
  const count = errorCounts.get(event.error.code) || 0;
  errorCounts.set(event.error.code, count + 1);
}

// Log error statistics
console.log('Error statistics:', Object.fromEntries(errorCounts));
```

## Error Codes Reference

| Code | Error Class | Description |
|------|-------------|-------------|
| `ILLEGAL_ACTION` | IllegalActionError | Player attempted an invalid action |
| `INVALID_STATE` | InvalidStateError | Game state is corrupted or invalid |
| `RULES_VIOLATION` | RulesViolationError | Game rule was violated |
| `CARD_DATA_ERROR` | CardDataError | Card data is invalid or missing |
| `EFFECT_RESOLUTION_ERROR` | EffectResolutionError | Effect could not be resolved |
| `ZONE_OPERATION_ERROR` | ZoneOperationError | Zone operation failed |
| `NOT_SETUP` | GameEngineError | Game not setup before action |
| `SETUP_ERROR` | GameEngineError | Game setup failed |
| `RUN_GAME_ERROR` | GameEngineError | Game execution failed |
| `RUN_TURN_ERROR` | GameEngineError | Turn execution failed |
| `PLAY_CARD_ERROR` | GameEngineError | Card play failed |
| `ACTIVATE_EFFECT_ERROR` | GameEngineError | Effect activation failed |
| `GIVE_DON_ERROR` | GameEngineError | DON giving failed |
| `DECLARE_ATTACK_ERROR` | GameEngineError | Attack declaration failed |

## Testing Error Handling

### Unit Tests

Test that errors are thrown correctly:

```typescript
it('should throw IllegalActionError when player is not active', () => {
  expect(() => {
    engine.playCard(PlayerId.PLAYER_2, cardId);
  }).toThrow(IllegalActionError);
});
```

### Integration Tests

Test that errors are handled and logged:

```typescript
it('should log error and emit event on failure', () => {
  const errorSpy = vi.fn();
  engine.on('ERROR', errorSpy);
  
  try {
    engine.playCard(PlayerId.PLAYER_2, 'invalid-card');
  } catch (error) {
    // Expected to throw
  }
  
  expect(errorSpy).toHaveBeenCalled();
  expect(engine.hasErrorOccurred('ILLEGAL_ACTION')).toBe(true);
});
```

### Error Recovery Tests

Test that state is rolled back on error:

```typescript
it('should rollback state on error', () => {
  const stateBefore = engine.getState();
  
  try {
    // Operation that will fail
    engine.playCard(playerId, invalidCardId);
  } catch (error) {
    // Expected to throw
  }
  
  const stateAfter = engine.getState();
  expect(stateAfter).toEqual(stateBefore); // State unchanged
});
```

## Conclusion

The error handling system provides:

- ✅ Type-safe error classes for different scenarios
- ✅ Centralized error management with history tracking
- ✅ Atomic operations with automatic rollback
- ✅ Event-driven error reporting for UI integration
- ✅ Debug mode for development
- ✅ Comprehensive validation utilities
- ✅ Best practices for error handling throughout the codebase

This ensures the game engine is robust, debuggable, and provides excellent error messages for both developers and users.
