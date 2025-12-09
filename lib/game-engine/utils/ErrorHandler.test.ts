import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler } from './ErrorHandler';
import { EventEmitter } from '../rendering/EventEmitter';
import { GameEngineError, IllegalActionError } from './errors';

describe('ErrorHandler', () => {
  let eventEmitter: EventEmitter;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    errorHandler = new ErrorHandler(eventEmitter, {
      debugMode: false,
      logToConsole: false,
      maxErrorHistory: 10,
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const handler = new ErrorHandler(eventEmitter);
      expect(handler.isDebugMode()).toBe(false);
    });

    it('should initialize with custom options', () => {
      const handler = new ErrorHandler(eventEmitter, {
        debugMode: true,
        logToConsole: true,
        maxErrorHistory: 50,
      });
      expect(handler.isDebugMode()).toBe(true);
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug mode', () => {
      errorHandler.setDebugMode(true);
      expect(errorHandler.isDebugMode()).toBe(true);
    });

    it('should disable debug mode', () => {
      errorHandler.setDebugMode(true);
      errorHandler.setDebugMode(false);
      expect(errorHandler.isDebugMode()).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should handle GameEngineError', () => {
      const error = new GameEngineError('Test error', 'TEST_CODE');
      
      errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].error).toBe(error);
    });

    it('should convert regular Error to GameEngineError', () => {
      const error = new Error('Regular error');
      
      errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].error).toBeInstanceOf(GameEngineError);
      expect(history[0].error.message).toBe('Regular error');
    });

    it('should include context in error event', () => {
      const error = new GameEngineError('Test error', 'TEST_CODE');
      const context = { action: 'test', playerId: 'PLAYER_1' };
      
      errorHandler.handleError(error, context);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].context).toEqual(context);
    });

    it('should emit ERROR event', () => {
      const error = new GameEngineError('Test error', 'TEST_CODE');
      const handler = vi.fn();
      
      eventEmitter.on('ERROR', handler);
      errorHandler.handleError(error);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR',
          error,
        })
      );
    });

    it('should add timestamp to error event', () => {
      const error = new GameEngineError('Test error', 'TEST_CODE');
      
      errorHandler.handleError(error);
      
      const history = errorHandler.getErrorHistory();
      expect(history[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('getErrorHistory', () => {
    it('should return empty array initially', () => {
      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });

    it('should return all errors', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      errorHandler.handleError(new GameEngineError('Error 2', 'CODE2'));
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(2);
    });

    it('should limit history size', () => {
      const handler = new ErrorHandler(eventEmitter, { maxErrorHistory: 3 });
      
      handler.handleError(new GameEngineError('Error 1', 'CODE1'));
      handler.handleError(new GameEngineError('Error 2', 'CODE2'));
      handler.handleError(new GameEngineError('Error 3', 'CODE3'));
      handler.handleError(new GameEngineError('Error 4', 'CODE4'));
      
      const history = handler.getErrorHistory();
      expect(history).toHaveLength(3);
      expect(history[0].error.message).toBe('Error 2');
      expect(history[2].error.message).toBe('Error 4');
    });
  });

  describe('clearErrorHistory', () => {
    it('should clear all errors', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      errorHandler.handleError(new GameEngineError('Error 2', 'CODE2'));
      
      errorHandler.clearErrorHistory();
      
      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('getRecentErrors', () => {
    it('should return last N errors', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      errorHandler.handleError(new GameEngineError('Error 2', 'CODE2'));
      errorHandler.handleError(new GameEngineError('Error 3', 'CODE3'));
      
      const recent = errorHandler.getRecentErrors(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].error.message).toBe('Error 2');
      expect(recent[1].error.message).toBe('Error 3');
    });

    it('should return all errors if count exceeds history', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      
      const recent = errorHandler.getRecentErrors(10);
      expect(recent).toHaveLength(1);
    });
  });

  describe('getErrorsByCode', () => {
    it('should return errors with specific code', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      errorHandler.handleError(new GameEngineError('Error 2', 'CODE2'));
      errorHandler.handleError(new GameEngineError('Error 3', 'CODE1'));
      
      const errors = errorHandler.getErrorsByCode('CODE1');
      expect(errors).toHaveLength(2);
      expect(errors[0].error.message).toBe('Error 1');
      expect(errors[1].error.message).toBe('Error 3');
    });

    it('should return empty array if no errors match', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      
      const errors = errorHandler.getErrorsByCode('NONEXISTENT');
      expect(errors).toHaveLength(0);
    });
  });

  describe('hasErrorOccurred', () => {
    it('should return true if error code occurred', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      
      expect(errorHandler.hasErrorOccurred('CODE1')).toBe(true);
    });

    it('should return false if error code did not occur', () => {
      errorHandler.handleError(new GameEngineError('Error 1', 'CODE1'));
      
      expect(errorHandler.hasErrorOccurred('CODE2')).toBe(false);
    });
  });

  describe('wrapOperation', () => {
    it('should return result on success', () => {
      const result = errorHandler.wrapOperation(
        () => 42,
        'test operation'
      );
      
      expect(result).toBe(42);
    });

    it('should return null on error', () => {
      const result = errorHandler.wrapOperation(
        () => {
          throw new Error('Test error');
        },
        'test operation'
      );
      
      expect(result).toBeNull();
    });

    it('should handle error on failure', () => {
      errorHandler.wrapOperation(
        () => {
          throw new Error('Test error');
        },
        'test operation'
      );
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].context?.operationName).toBe('test operation');
    });
  });

  describe('wrapAsyncOperation', () => {
    it('should return result on success', async () => {
      const result = await errorHandler.wrapAsyncOperation(
        async () => 42,
        'test operation'
      );
      
      expect(result).toBe(42);
    });

    it('should return null on error', async () => {
      const result = await errorHandler.wrapAsyncOperation(
        async () => {
          throw new Error('Test error');
        },
        'test operation'
      );
      
      expect(result).toBeNull();
    });

    it('should handle error on failure', async () => {
      await errorHandler.wrapAsyncOperation(
        async () => {
          throw new Error('Test error');
        },
        'test operation'
      );
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].context?.operationName).toBe('test operation');
    });
  });
});
