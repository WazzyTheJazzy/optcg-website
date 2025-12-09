/**
 * Error Handling System Examples
 * 
 * This file demonstrates how to use the error handling system in the One Piece TCG Engine.
 */

import { GameEngine } from '../core/GameEngine';
import { PlayerId } from '../core/types';
import { createInitialGameState } from '../core/GameState';
import {
  GameEngineError,
  IllegalActionError,
  InvalidStateError,
  RulesViolationError,
} from './errors';
import { ValidationUtils } from './validation';
import { executeWithTransaction } from './StateTransaction';

// ============================================================================
// Example 1: Basic Error Handling
// ============================================================================

function example1_BasicErrorHandling() {
  console.log('\n=== Example 1: Basic Error Handling ===\n');

  const engine = new GameEngine();

  try {
    // Attempting to run game before setup will throw an error
    engine.runGame();
  } catch (error) {
    if (error instanceof GameEngineError) {
      console.log('Caught GameEngineError:');
      console.log('  Message:', error.message);
      console.log('  Code:', error.code);
      console.log('  Context:', error.context);
    }
  }
}

// ============================================================================
// Example 2: Debug Mode
// ============================================================================

function example2_DebugMode() {
  console.log('\n=== Example 2: Debug Mode ===\n');

  const engine = new GameEngine();

  // Enable debug mode for verbose error logging
  engine.setDebugMode(true);
  console.log('Debug mode enabled:', engine.isDebugMode());

  try {
    // This will log detailed error information to console
    engine.runGame();
  } catch (error) {
    console.log('Error caught (see detailed logs above)');
  }

  // Disable debug mode
  engine.setDebugMode(false);
  console.log('Debug mode disabled:', engine.isDebugMode());
}

// ============================================================================
// Example 3: Error History
// ============================================================================

function example3_ErrorHistory() {
  console.log('\n=== Example 3: Error History ===\n');

  const engine = new GameEngine();

  // Generate some errors
  const errors = [
    () => engine.runGame(), // NOT_SETUP error
    () => engine.runTurn(), // NOT_SETUP error
  ];

  errors.forEach((fn, i) => {
    try {
      fn();
    } catch (error) {
      console.log(`Error ${i + 1} caught`);
    }
  });

  // Get error history
  const history = engine.getErrorHistory();
  console.log('\nError History:');
  console.log(`  Total errors: ${history.length}`);

  history.forEach((event, i) => {
    console.log(`  ${i + 1}. ${event.error.code}: ${event.error.message}`);
  });

  // Get recent errors
  const recentErrors = engine.getRecentErrors(1);
  console.log('\nMost Recent Error:');
  console.log(`  ${recentErrors[0].error.code}: ${recentErrors[0].error.message}`);

  // Get errors by code
  const notSetupErrors = engine.getErrorsByCode('NOT_SETUP');
  console.log(`\nNOT_SETUP errors: ${notSetupErrors.length}`);

  // Check if specific error occurred
  console.log(`\nHas NOT_SETUP error occurred? ${engine.hasErrorOccurred('NOT_SETUP')}`);
  console.log(`Has ILLEGAL_ACTION error occurred? ${engine.hasErrorOccurred('ILLEGAL_ACTION')}`);

  // Clear error history
  engine.clearErrorHistory();
  console.log(`\nError history cleared. Total errors: ${engine.getErrorHistory().length}`);
}

// ============================================================================
// Example 4: Error Events
// ============================================================================

function example4_ErrorEvents() {
  console.log('\n=== Example 4: Error Events ===\n');

  const engine = new GameEngine();

  // Subscribe to error events
  const errorHandler = (event: any) => {
    console.log('Error event received:');
    console.log('  Type:', event.type);
    console.log('  Error:', event.error.message);
    console.log('  Code:', event.error.code);
    console.log('  Timestamp:', new Date(event.timestamp).toISOString());
  };

  engine.on('ERROR' as any, errorHandler);

  try {
    // This will emit an error event
    engine.runGame();
  } catch (error) {
    console.log('Error caught');
  }

  // Unsubscribe from error events
  engine.off('ERROR' as any, errorHandler);
}

// ============================================================================
// Example 5: Validation Utilities
// ============================================================================

function example5_ValidationUtilities() {
  console.log('\n=== Example 5: Validation Utilities ===\n');

  // Create a mock game state for demonstration
  const mockState: any = {
    players: new Map([
      [PlayerId.PLAYER_1, {
        id: PlayerId.PLAYER_1,
        zones: {
          hand: [
            {
              id: 'card-1',
              owner: PlayerId.PLAYER_1,
              controller: PlayerId.PLAYER_1,
              zone: 'HAND',
              definition: { category: 'CHARACTER' },
            },
          ],
          characterArea: [],
          costArea: [
            { id: 'don-1', state: 'ACTIVE' },
            { id: 'don-2', state: 'ACTIVE' },
            { id: 'don-3', state: 'RESTED' },
          ],
        },
      }],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    gameOver: false,
  };

  // Example 1: Validate player exists
  try {
    ValidationUtils.validatePlayerExists(mockState, PlayerId.PLAYER_1);
    console.log('✓ Player 1 exists');
  } catch (error) {
    console.log('✗ Player validation failed');
  }

  // Example 2: Validate active player
  try {
    ValidationUtils.validateActivePlayer(mockState, PlayerId.PLAYER_1);
    console.log('✓ Player 1 is active');
  } catch (error) {
    console.log('✗ Active player validation failed');
  }

  try {
    ValidationUtils.validateActivePlayer(mockState, PlayerId.PLAYER_2);
    console.log('✓ Player 2 is active');
  } catch (error) {
    if (error instanceof IllegalActionError) {
      console.log('✗ Player 2 is not active (expected)');
    }
  }

  // Example 3: Validate card exists
  try {
    const card = ValidationUtils.validateCardExists(mockState, 'card-1');
    console.log('✓ Card found:', card.id);
  } catch (error) {
    console.log('✗ Card not found');
  }

  // Example 4: Validate can afford cost
  try {
    ValidationUtils.validateCanAffordCost(mockState, PlayerId.PLAYER_1, 2);
    console.log('✓ Player can afford cost of 2 (has 2 active DON)');
  } catch (error) {
    console.log('✗ Cannot afford cost');
  }

  try {
    ValidationUtils.validateCanAffordCost(mockState, PlayerId.PLAYER_1, 5);
    console.log('✓ Player can afford cost of 5');
  } catch (error) {
    if (error instanceof IllegalActionError) {
      console.log('✗ Cannot afford cost of 5 (only has 2 active DON, expected)');
    }
  }

  // Example 5: Validate character area not full
  try {
    ValidationUtils.validateCharacterAreaNotFull(mockState, PlayerId.PLAYER_1, 5);
    console.log('✓ Character area not full (0/5)');
  } catch (error) {
    console.log('✗ Character area is full');
  }

  // Example 6: Validate game not over
  try {
    ValidationUtils.validateGameNotOver(mockState);
    console.log('✓ Game is not over');
  } catch (error) {
    console.log('✗ Game is over');
  }
}

// ============================================================================
// Example 6: State Transactions
// ============================================================================

function example6_StateTransactions() {
  console.log('\n=== Example 6: State Transactions ===\n');

  // Create a real game state
  let state = createInitialGameState();

  console.log('Initial state turn:', state.turnNumber);

  // Successful transaction
  const result1 = executeWithTransaction(state, (s) => {
    s.turnNumber += 1;
    return s;
  });

  if (result1.success) {
    console.log('\n✓ Transaction 1 succeeded');
    console.log('  New turn number:', result1.state.turnNumber);
    state = result1.state;
  }

  // Failed transaction (will rollback)
  const result2 = executeWithTransaction(state, (s) => {
    s.turnNumber += 10;
    
    // Simulate an error
    throw new Error('Something went wrong!');
  });

  if (!result2.success) {
    console.log('\n✗ Transaction 2 failed (expected)');
    console.log('  Error:', result2.error?.message);
    console.log('  Turn number rolled back:', result2.state.turnNumber);
    console.log('  State unchanged:', result2.state.turnNumber === state.turnNumber);
  }
}

// ============================================================================
// Example 7: Custom Error Classes
// ============================================================================

function example7_CustomErrorClasses() {
  console.log('\n=== Example 7: Custom Error Classes ===\n');

  // IllegalActionError
  try {
    throw new IllegalActionError(
      'play card',
      'Insufficient DON to pay cost',
      { cardId: 'card-123', requiredCost: 5, availableDon: 3 }
    );
  } catch (error) {
    if (error instanceof IllegalActionError) {
      console.log('IllegalActionError:');
      console.log('  Message:', error.message);
      console.log('  Code:', error.code);
      console.log('  Context:', error.context);
    }
  }

  // InvalidStateError
  try {
    throw new InvalidStateError(
      'Player not found in game state',
      { playerId: 'PLAYER_1' }
    );
  } catch (error) {
    if (error instanceof InvalidStateError) {
      console.log('\nInvalidStateError:');
      console.log('  Message:', error.message);
      console.log('  Code:', error.code);
      console.log('  Context:', error.context);
    }
  }

  // RulesViolationError
  try {
    throw new RulesViolationError(
      'Character area is full (max 5)',
      { playerId: 'PLAYER_1', currentCount: 5, maxCharacters: 5 }
    );
  } catch (error) {
    if (error instanceof RulesViolationError) {
      console.log('\nRulesViolationError:');
      console.log('  Message:', error.message);
      console.log('  Code:', error.code);
      console.log('  Context:', error.context);
    }
  }

  // Error serialization
  const error = new GameEngineError(
    'Test error',
    'TEST_ERROR',
    { key: 'value' }
  );
  console.log('\nError JSON serialization:');
  console.log(JSON.stringify(error.toJSON(), null, 2));
}

// ============================================================================
// Example 8: Error Handler Wrapper Methods
// ============================================================================

function example8_ErrorHandlerWrappers() {
  console.log('\n=== Example 8: Error Handler Wrapper Methods ===\n');

  const engine = new GameEngine();
  const errorHandler = engine.getErrorHandler();

  // Wrap a successful operation
  const result1 = errorHandler.wrapOperation(
    () => {
      console.log('Executing successful operation...');
      return 42;
    },
    'successfulOperation',
    { context: 'example' }
  );

  console.log('Result 1:', result1); // 42

  // Wrap a failing operation
  const result2 = errorHandler.wrapOperation(
    () => {
      console.log('Executing failing operation...');
      throw new Error('Operation failed!');
    },
    'failingOperation',
    { context: 'example' }
  );

  console.log('Result 2:', result2); // null

  // Check error history
  console.log('\nError occurred?', errorHandler.hasErrorOccurred('UNKNOWN_ERROR'));
}

// ============================================================================
// Run All Examples
// ============================================================================

function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         One Piece TCG Engine - Error Handling Examples     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  example1_BasicErrorHandling();
  example2_DebugMode();
  example3_ErrorHistory();
  example4_ErrorEvents();
  example5_ValidationUtilities();
  example6_StateTransactions();
  example7_CustomErrorClasses();
  example8_ErrorHandlerWrappers();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Examples Complete!                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_BasicErrorHandling,
  example2_DebugMode,
  example3_ErrorHistory,
  example4_ErrorEvents,
  example5_ValidationUtilities,
  example6_StateTransactions,
  example7_CustomErrorClasses,
  example8_ErrorHandlerWrappers,
  runAllExamples,
};
