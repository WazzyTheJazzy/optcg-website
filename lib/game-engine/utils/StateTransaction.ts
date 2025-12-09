import { GameState } from '../core/types';
import { InvalidStateError } from './errors';

/**
 * Represents a transaction that can be committed or rolled back
 */
export class StateTransaction {
  private originalState: GameState;
  private currentState: GameState;
  private committed: boolean = false;
  private rolledBack: boolean = false;

  constructor(state: GameState) {
    // Deep clone the state for rollback capability
    this.originalState = this.cloneState(state);
    this.currentState = state;
  }

  /**
   * Get the current state being modified
   */
  getState(): GameState {
    if (this.committed || this.rolledBack) {
      throw new InvalidStateError('Transaction has already been finalized');
    }
    return this.currentState;
  }

  /**
   * Commit the transaction, making changes permanent
   */
  commit(): GameState {
    if (this.committed) {
      throw new InvalidStateError('Transaction already committed');
    }
    if (this.rolledBack) {
      throw new InvalidStateError('Cannot commit a rolled back transaction');
    }

    this.committed = true;
    return this.currentState;
  }

  /**
   * Rollback the transaction, reverting all changes
   */
  rollback(): GameState {
    if (this.rolledBack) {
      throw new InvalidStateError('Transaction already rolled back');
    }
    if (this.committed) {
      throw new InvalidStateError('Cannot rollback a committed transaction');
    }

    this.rolledBack = true;
    return this.originalState;
  }

  /**
   * Check if transaction is finalized (committed or rolled back)
   */
  isFinalized(): boolean {
    return this.committed || this.rolledBack;
  }

  /**
   * Check if transaction was committed
   */
  isCommitted(): boolean {
    return this.committed;
  }

  /**
   * Check if transaction was rolled back
   */
  isRolledBack(): boolean {
    return this.rolledBack;
  }

  /**
   * Deep clone game state for rollback
   */
  private cloneState(state: GameState): GameState {
    // Create a deep copy of the state
    // Note: This is a simplified version. In production, you might want to use
    // a more sophisticated cloning strategy or immutable data structures
    return JSON.parse(JSON.stringify(state));
  }
}

/**
 * Execute an operation within a transaction with automatic rollback on error
 */
export function executeWithTransaction<T>(
  state: GameState,
  operation: (state: GameState) => T
): { success: boolean; result?: T; error?: Error; state: GameState } {
  const transaction = new StateTransaction(state);

  try {
    const result = operation(transaction.getState());
    const newState = transaction.commit();
    return { success: true, result, state: newState };
  } catch (error) {
    const rolledBackState = transaction.rollback();
    return { success: false, error: error as Error, state: rolledBackState };
  }
}

/**
 * Execute an async operation within a transaction with automatic rollback on error
 */
export async function executeWithTransactionAsync<T>(
  state: GameState,
  operation: (state: GameState) => Promise<T>
): Promise<{ success: boolean; result?: T; error?: Error; state: GameState }> {
  const transaction = new StateTransaction(state);

  try {
    const result = await operation(transaction.getState());
    const newState = transaction.commit();
    return { success: true, result, state: newState };
  } catch (error) {
    const rolledBackState = transaction.rollback();
    return { success: false, error: error as Error, state: rolledBackState };
  }
}
