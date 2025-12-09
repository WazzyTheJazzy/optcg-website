/**
 * Utility exports for the game engine
 */

// Error classes
export {
  GameEngineError,
  IllegalActionError,
  InvalidStateError,
  RulesViolationError,
  CardDataError,
  EffectResolutionError,
  ZoneOperationError,
} from './errors';

// Error handler
export { ErrorHandler } from './ErrorHandler';
export type { ErrorHandlerOptions, ErrorEvent } from './ErrorHandler';

// Validation utilities
export { ValidationUtils } from './validation';

// State transactions
export {
  StateTransaction,
  executeWithTransaction,
  executeWithTransactionAsync,
} from './StateTransaction';

// Loop guard
export { LoopGuard } from './LoopGuard';
export type { LoopResolutionResult } from './LoopGuard';

// Defeat checker
export { runDefeatCheck } from './DefeatChecker';
export type { DefeatCheckResult } from './DefeatChecker';
