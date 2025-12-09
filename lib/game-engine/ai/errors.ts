/**
 * AI Opponent System Error Classes
 * 
 * This module defines error types specific to the AI opponent system.
 * All AI errors extend the base GameEngineError for consistency.
 */

import { GameEngineError } from '../utils/errors';
import { DecisionContext } from './types';

// ============================================================================
// Base AI Error
// ============================================================================

/**
 * Base error class for all AI-related errors
 * Includes decision context for debugging
 */
export class AIDecisionError extends GameEngineError {
  constructor(
    message: string,
    public readonly decisionContext?: Partial<DecisionContext>,
    code: string = 'AI_DECISION_ERROR',
    context?: Record<string, any>
  ) {
    super(message, code, {
      ...context,
      decisionContext: decisionContext ? {
        playerId: decisionContext.playerId,
        phase: decisionContext.state?.phase,
        turnNumber: decisionContext.state?.turnNumber,
        difficulty: decisionContext.config?.difficulty,
        playStyle: decisionContext.config?.playStyle,
      } : undefined,
    });
    this.name = 'AIDecisionError';
  }
}

// ============================================================================
// Specific AI Error Types
// ============================================================================

/**
 * Error thrown when AI action evaluation fails
 * This occurs when the evaluation system cannot score an action
 */
export class AIEvaluationError extends AIDecisionError {
  constructor(
    message: string,
    public readonly actionType?: string,
    decisionContext?: Partial<DecisionContext>,
    context?: Record<string, any>
  ) {
    super(
      `AI evaluation failed: ${message}`,
      decisionContext,
      'AI_EVALUATION_ERROR',
      { actionType, ...context }
    );
    this.name = 'AIEvaluationError';
  }
}

/**
 * Error thrown when AI decision takes too long
 * This occurs when evaluation exceeds the configured timeout
 */
export class AITimeoutError extends AIDecisionError {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    decisionContext?: Partial<DecisionContext>,
    context?: Record<string, any>
  ) {
    super(
      `AI decision timeout: ${message}`,
      decisionContext,
      'AI_TIMEOUT_ERROR',
      { timeoutMs, ...context }
    );
    this.name = 'AITimeoutError';
  }
}

/**
 * Error thrown when AI selects an invalid action
 * This occurs when the selected action is not in the legal actions list
 */
export class AIInvalidActionError extends AIDecisionError {
  constructor(
    message: string,
    public readonly selectedAction?: any,
    public readonly legalActions?: any[],
    decisionContext?: Partial<DecisionContext>,
    context?: Record<string, any>
  ) {
    super(
      `AI selected invalid action: ${message}`,
      decisionContext,
      'AI_INVALID_ACTION_ERROR',
      { 
        selectedAction,
        legalActionsCount: legalActions?.length,
        ...context 
      }
    );
    this.name = 'AIInvalidActionError';
  }
}

// ============================================================================
// Error Logging Utilities
// ============================================================================

/**
 * Log an AI error with full context for debugging
 * 
 * @param error - The error to log
 * @param additionalContext - Additional context to include in the log
 */
export function logAIError(
  error: Error,
  additionalContext?: Record<string, any>
): void {
  const errorData: Record<string, any> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Include AI-specific context if available
  if (error instanceof AIDecisionError) {
    errorData.code = error.code;
    errorData.context = error.context;
    errorData.decisionContext = error.decisionContext;
  }

  // Include additional context
  if (additionalContext) {
    errorData.additionalContext = additionalContext;
  }

  // In production, this would go to a logging service
  // For now, errors are handled by the error handler system
}

/**
 * Create a safe error message for user display
 * Strips sensitive information and provides user-friendly text
 * 
 * @param error - The error to format
 * @returns User-friendly error message
 */
export function formatAIErrorForUser(error: Error): string {
  if (error instanceof AITimeoutError) {
    return 'AI is taking too long to decide. Using default action.';
  }
  
  if (error instanceof AIEvaluationError) {
    return 'AI encountered an evaluation error. Using fallback decision.';
  }
  
  if (error instanceof AIInvalidActionError) {
    return 'AI selected an invalid action. Using alternative action.';
  }
  
  if (error instanceof AIDecisionError) {
    return 'AI encountered a decision error. Using fallback action.';
  }
  
  return 'AI encountered an unexpected error. Using default action.';
}
