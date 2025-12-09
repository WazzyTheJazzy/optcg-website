/**
 * Tests for AI error handling
 */

import { describe, it, expect } from 'vitest';
import {
  AIDecisionError,
  AIEvaluationError,
  AITimeoutError,
  AIInvalidActionError,
  logAIError,
  formatAIErrorForUser,
} from './errors';
import { PlayerId, Phase } from '../core/types';
import { DecisionContext } from './types';

describe('AI Error Classes', () => {
  const mockContext: Partial<DecisionContext> = {
    playerId: PlayerId.PLAYER_1,
    state: {
      phase: Phase.MAIN,
      turnNumber: 3,
    } as any,
    config: {
      difficulty: 'medium',
      playStyle: 'balanced',
    } as any,
  };

  describe('AIDecisionError', () => {
    it('should create error with message and context', () => {
      const error = new AIDecisionError(
        'Test error',
        mockContext
      );

      expect(error.name).toBe('AIDecisionError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('AI_DECISION_ERROR');
      expect(error.decisionContext).toBeDefined();
    });

    it('should include decision context in error data', () => {
      const error = new AIDecisionError(
        'Test error',
        mockContext
      );

      expect(error.context?.decisionContext).toMatchObject({
        playerId: PlayerId.PLAYER_1,
        phase: Phase.MAIN,
        turnNumber: 3,
        difficulty: 'medium',
        playStyle: 'balanced',
      });
    });

    it('should handle missing context gracefully', () => {
      const error = new AIDecisionError('Test error');

      expect(error.name).toBe('AIDecisionError');
      expect(error.message).toBe('Test error');
      expect(error.decisionContext).toBeUndefined();
    });
  });

  describe('AIEvaluationError', () => {
    it('should create evaluation error with action type', () => {
      const error = new AIEvaluationError(
        'Evaluation failed',
        'PLAY_CARD',
        mockContext
      );

      expect(error.name).toBe('AIEvaluationError');
      expect(error.message).toBe('AI evaluation failed: Evaluation failed');
      expect(error.code).toBe('AI_EVALUATION_ERROR');
      expect(error.actionType).toBe('PLAY_CARD');
    });
  });

  describe('AITimeoutError', () => {
    it('should create timeout error with timeout value', () => {
      const error = new AITimeoutError(
        'Decision took too long',
        5000,
        mockContext
      );

      expect(error.name).toBe('AITimeoutError');
      expect(error.message).toBe('AI decision timeout: Decision took too long');
      expect(error.code).toBe('AI_TIMEOUT_ERROR');
      expect(error.timeoutMs).toBe(5000);
    });
  });

  describe('AIInvalidActionError', () => {
    it('should create invalid action error with action details', () => {
      const selectedAction = { type: 'PLAY_CARD', data: {} };
      const legalActions = [{ type: 'PASS', data: {} }];

      const error = new AIInvalidActionError(
        'Action not legal',
        selectedAction,
        legalActions,
        mockContext
      );

      expect(error.name).toBe('AIInvalidActionError');
      expect(error.message).toBe('AI selected invalid action: Action not legal');
      expect(error.code).toBe('AI_INVALID_ACTION_ERROR');
      expect(error.selectedAction).toEqual(selectedAction);
      expect(error.legalActions).toEqual(legalActions);
    });
  });

  describe('formatAIErrorForUser', () => {
    it('should format timeout error for user', () => {
      const error = new AITimeoutError('Too slow', 5000, mockContext);
      const message = formatAIErrorForUser(error);

      expect(message).toBe('AI is taking too long to decide. Using default action.');
    });

    it('should format evaluation error for user', () => {
      const error = new AIEvaluationError('Bad eval', 'ATTACK', mockContext);
      const message = formatAIErrorForUser(error);

      expect(message).toBe('AI encountered an evaluation error. Using fallback decision.');
    });

    it('should format invalid action error for user', () => {
      const error = new AIInvalidActionError('Invalid', {}, [], mockContext);
      const message = formatAIErrorForUser(error);

      expect(message).toBe('AI selected an invalid action. Using alternative action.');
    });

    it('should format generic AI error for user', () => {
      const error = new AIDecisionError('Generic error', mockContext);
      const message = formatAIErrorForUser(error);

      expect(message).toBe('AI encountered a decision error. Using fallback action.');
    });

    it('should format unknown error for user', () => {
      const error = new Error('Unknown error');
      const message = formatAIErrorForUser(error);

      expect(message).toBe('AI encountered an unexpected error. Using default action.');
    });
  });

  describe('logAIError', () => {
    it('should log error without throwing', () => {
      const error = new AIDecisionError('Test error', mockContext);

      // Should not throw
      expect(() => {
        logAIError(error);
      }).not.toThrow();
    });

    it('should log error with additional context', () => {
      const error = new AIEvaluationError('Test', 'ATTACK', mockContext);
      const additionalContext = { foo: 'bar', count: 42 };

      // Should not throw
      expect(() => {
        logAIError(error, additionalContext);
      }).not.toThrow();
    });

    it('should handle non-AI errors', () => {
      const error = new Error('Generic error');

      // Should not throw
      expect(() => {
        logAIError(error);
      }).not.toThrow();
    });
  });
});
