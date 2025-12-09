/**
 * Base error class for all game engine errors
 */
export class GameEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'GameEngineError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when a player attempts an illegal action
 */
export class IllegalActionError extends GameEngineError {
  constructor(
    action: string,
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      `Illegal action: ${action}. Reason: ${reason}`,
      'ILLEGAL_ACTION',
      { action, reason, ...context }
    );
    this.name = 'IllegalActionError';
  }
}

/**
 * Error thrown when the game state is invalid or corrupted
 */
export class InvalidStateError extends GameEngineError {
  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, 'INVALID_STATE', context);
    this.name = 'InvalidStateError';
  }
}

/**
 * Error thrown when a game rule is violated
 */
export class RulesViolationError extends GameEngineError {
  constructor(
    rule: string,
    context?: Record<string, any>
  ) {
    super(
      `Rules violation: ${rule}`,
      'RULES_VIOLATION',
      { rule, ...context }
    );
    this.name = 'RulesViolationError';
  }
}

/**
 * Error thrown when card data is invalid or missing
 */
export class CardDataError extends GameEngineError {
  constructor(
    message: string,
    cardId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'CARD_DATA_ERROR', { cardId, ...context });
    this.name = 'CardDataError';
  }
}

/**
 * Error thrown when an effect cannot be resolved
 */
export class EffectResolutionError extends GameEngineError {
  constructor(
    effectId: string,
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      `Effect resolution failed: ${effectId}. Reason: ${reason}`,
      'EFFECT_RESOLUTION_ERROR',
      { effectId, reason, ...context }
    );
    this.name = 'EffectResolutionError';
  }
}

/**
 * Error thrown when zone operations fail
 */
export class ZoneOperationError extends GameEngineError {
  constructor(
    operation: string,
    zone: string,
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      `Zone operation failed: ${operation} in ${zone}. Reason: ${reason}`,
      'ZONE_OPERATION_ERROR',
      { operation, zone, reason, ...context }
    );
    this.name = 'ZoneOperationError';
  }
}
