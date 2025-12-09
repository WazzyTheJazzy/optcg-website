import { EventEmitter } from '../rendering/EventEmitter';
import { GameEngineError } from './errors';

export interface ErrorEvent {
  error: GameEngineError;
  timestamp: number;
  context?: Record<string, any>;
}

export interface ErrorHandlerOptions {
  debugMode?: boolean;
  logToConsole?: boolean;
  maxErrorHistory?: number;
}

/**
 * Centralized error handling for the game engine
 */
export class ErrorHandler {
  private eventEmitter: EventEmitter;
  private debugMode: boolean;
  private logToConsole: boolean;
  private errorHistory: ErrorEvent[] = [];
  private maxErrorHistory: number;

  constructor(eventEmitter: EventEmitter, options: ErrorHandlerOptions = {}) {
    this.eventEmitter = eventEmitter;
    this.debugMode = options.debugMode ?? false;
    this.logToConsole = options.logToConsole ?? true;
    this.maxErrorHistory = options.maxErrorHistory ?? 100;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Get current debug mode status
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Handle an error that occurred during game execution
   */
  handleError(error: Error, context?: Record<string, any>): void {
    // Convert to GameEngineError if it's not already
    const gameError = error instanceof GameEngineError
      ? error
      : new GameEngineError(error.message, 'UNKNOWN_ERROR', { originalError: error.name });

    // Create error event
    const errorEvent: ErrorEvent = {
      error: gameError,
      timestamp: Date.now(),
      context,
    };

    // Add to history
    this.addToHistory(errorEvent);

    // Log to console if enabled
    if (this.logToConsole) {
      this.logError(errorEvent);
    }

    // Emit error event for UI
    this.eventEmitter.emit({
      type: 'ERROR' as const,
      timestamp: Date.now(),
      error: gameError,
      context,
    } as any);
  }

  /**
   * Log error to console with appropriate formatting
   */
  private logError(errorEvent: ErrorEvent): void {
    const { error, context } = errorEvent;

    if (this.debugMode) {
      console.group(`🔴 ${error.name}: ${error.message}`);
      console.error('Code:', error.code);
      if (error.context) {
        console.error('Error Context:', error.context);
      }
      if (context) {
        console.error('Additional Context:', context);
      }
      console.error('Stack:', error.stack);
      console.groupEnd();
    } else {
      console.error(`${error.name}: ${error.message}`);
    }
  }

  /**
   * Add error to history with size limit
   */
  private addToHistory(errorEvent: ErrorEvent): void {
    this.errorHistory.push(errorEvent);

    // Trim history if it exceeds max size
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): readonly ErrorEvent[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get recent errors (last N errors)
   */
  getRecentErrors(count: number = 10): readonly ErrorEvent[] {
    return this.errorHistory.slice(-count);
  }

  /**
   * Get errors by code
   */
  getErrorsByCode(code: string): readonly ErrorEvent[] {
    return this.errorHistory.filter(event => event.error.code === code);
  }

  /**
   * Check if a specific error code has occurred
   */
  hasErrorOccurred(code: string): boolean {
    return this.errorHistory.some(event => event.error.code === code);
  }

  /**
   * Wrap an operation with error handling
   */
  wrapOperation<T>(
    operation: () => T,
    operationName: string,
    context?: Record<string, any>
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.handleError(
        error as Error,
        { operationName, ...context }
      );
      return null;
    }
  }

  /**
   * Wrap an async operation with error handling
   */
  async wrapAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(
        error as Error,
        { operationName, ...context }
      );
      return null;
    }
  }
}
