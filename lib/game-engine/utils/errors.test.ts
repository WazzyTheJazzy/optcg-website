import { describe, it, expect } from 'vitest';
import {
  GameEngineError,
  IllegalActionError,
  InvalidStateError,
  RulesViolationError,
  CardDataError,
  EffectResolutionError,
  ZoneOperationError,
} from './errors';

describe('Error Classes', () => {
  describe('GameEngineError', () => {
    it('should create error with message and code', () => {
      const error = new GameEngineError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('GameEngineError');
    });

    it('should include context in error', () => {
      const context = { playerId: 'PLAYER_1', cardId: 'card-123' };
      const error = new GameEngineError('Test error', 'TEST_CODE', context);
      
      expect(error.context).toEqual(context);
    });

    it('should serialize to JSON', () => {
      const error = new GameEngineError('Test error', 'TEST_CODE', { key: 'value' });
      const json = error.toJSON();
      
      expect(json.name).toBe('GameEngineError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_CODE');
      expect(json.context).toEqual({ key: 'value' });
      expect(json.stack).toBeDefined();
    });
  });

  describe('IllegalActionError', () => {
    it('should create error with action and reason', () => {
      const error = new IllegalActionError('play card', 'Insufficient DON');
      
      expect(error.message).toBe('Illegal action: play card. Reason: Insufficient DON');
      expect(error.code).toBe('ILLEGAL_ACTION');
      expect(error.name).toBe('IllegalActionError');
      expect(error.context).toEqual({
        action: 'play card',
        reason: 'Insufficient DON',
      });
    });

    it('should include additional context', () => {
      const error = new IllegalActionError(
        'play card',
        'Insufficient DON',
        { requiredCost: 5, availableDon: 3 }
      );
      
      expect(error.context).toEqual({
        action: 'play card',
        reason: 'Insufficient DON',
        requiredCost: 5,
        availableDon: 3,
      });
    });
  });

  describe('InvalidStateError', () => {
    it('should create error with message', () => {
      const error = new InvalidStateError('Game state is corrupted');
      
      expect(error.message).toBe('Game state is corrupted');
      expect(error.code).toBe('INVALID_STATE');
      expect(error.name).toBe('InvalidStateError');
    });

    it('should include context', () => {
      const error = new InvalidStateError('Player not found', { playerId: 'PLAYER_1' });
      
      expect(error.context).toEqual({ playerId: 'PLAYER_1' });
    });
  });

  describe('RulesViolationError', () => {
    it('should create error with rule', () => {
      const error = new RulesViolationError('Character area is full');
      
      expect(error.message).toBe('Rules violation: Character area is full');
      expect(error.code).toBe('RULES_VIOLATION');
      expect(error.name).toBe('RulesViolationError');
      expect(error.context).toEqual({ rule: 'Character area is full' });
    });

    it('should include additional context', () => {
      const error = new RulesViolationError(
        'Character area is full',
        { currentCount: 5, maxCharacters: 5 }
      );
      
      expect(error.context).toEqual({
        rule: 'Character area is full',
        currentCount: 5,
        maxCharacters: 5,
      });
    });
  });

  describe('CardDataError', () => {
    it('should create error with message and card ID', () => {
      const error = new CardDataError('Card not found', 'card-123');
      
      expect(error.message).toBe('Card not found');
      expect(error.code).toBe('CARD_DATA_ERROR');
      expect(error.name).toBe('CardDataError');
      expect(error.context).toEqual({ cardId: 'card-123' });
    });
  });

  describe('EffectResolutionError', () => {
    it('should create error with effect ID and reason', () => {
      const error = new EffectResolutionError('effect-123', 'Invalid target');
      
      expect(error.message).toBe('Effect resolution failed: effect-123. Reason: Invalid target');
      expect(error.code).toBe('EFFECT_RESOLUTION_ERROR');
      expect(error.name).toBe('EffectResolutionError');
      expect(error.context).toEqual({
        effectId: 'effect-123',
        reason: 'Invalid target',
      });
    });
  });

  describe('ZoneOperationError', () => {
    it('should create error with operation, zone, and reason', () => {
      const error = new ZoneOperationError('move card', 'HAND', 'Zone is full');
      
      expect(error.message).toBe('Zone operation failed: move card in HAND. Reason: Zone is full');
      expect(error.code).toBe('ZONE_OPERATION_ERROR');
      expect(error.name).toBe('ZoneOperationError');
      expect(error.context).toEqual({
        operation: 'move card',
        zone: 'HAND',
        reason: 'Zone is full',
      });
    });
  });

  describe('Error inheritance', () => {
    it('should be instance of Error', () => {
      const error = new GameEngineError('Test', 'TEST');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instance of GameEngineError', () => {
      const error = new IllegalActionError('test', 'reason');
      expect(error).toBeInstanceOf(GameEngineError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should be catchable as GameEngineError', () => {
      try {
        throw new IllegalActionError('test', 'reason');
      } catch (error) {
        expect(error).toBeInstanceOf(GameEngineError);
        expect(error).toBeInstanceOf(IllegalActionError);
      }
    });
  });
});
