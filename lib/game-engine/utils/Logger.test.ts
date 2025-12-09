/**
 * Logger.test.ts
 * 
 * Tests for the logging system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, LogLevel, createLogger } from './Logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger({
      minLevel: LogLevel.DEBUG,
      enableConsole: false, // Disable console output during tests
    });
  });

  describe('Basic Logging', () => {
    it('should log messages at different levels', () => {
      logger.debug('TEST', 'Debug message');
      logger.info('TEST', 'Info message');
      logger.warn('TEST', 'Warning message');
      logger.error('TEST', 'Error message');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(4);
      expect(entries[0].level).toBe(LogLevel.DEBUG);
      expect(entries[1].level).toBe(LogLevel.INFO);
      expect(entries[2].level).toBe(LogLevel.WARN);
      expect(entries[3].level).toBe(LogLevel.ERROR);
    });

    it('should include timestamps', () => {
      const before = Date.now();
      logger.info('TEST', 'Test message');
      const after = Date.now();

      const entries = logger.getEntries();
      expect(entries[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(entries[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should include category and message', () => {
      logger.info('ACTION', 'Player played card');

      const entries = logger.getEntries();
      expect(entries[0].category).toBe('ACTION');
      expect(entries[0].message).toBe('Player played card');
    });

    it('should include optional data', () => {
      logger.info('ACTION', 'Player played card', {
        playerId: 'PLAYER_1',
        cardId: 'card-123',
      });

      const entries = logger.getEntries();
      expect(entries[0].data).toEqual({
        playerId: 'PLAYER_1',
        cardId: 'card-123',
      });
    });
  });

  describe('Log Level Filtering', () => {
    it('should filter logs below minimum level', () => {
      const logger = createLogger({
        minLevel: LogLevel.WARN,
        enableConsole: false,
      });

      logger.debug('TEST', 'Debug message');
      logger.info('TEST', 'Info message');
      logger.warn('TEST', 'Warning message');
      logger.error('TEST', 'Error message');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe(LogLevel.WARN);
      expect(entries[1].level).toBe(LogLevel.ERROR);
    });

    it('should allow changing minimum level', () => {
      logger.setMinLevel(LogLevel.ERROR);

      logger.debug('TEST', 'Debug message');
      logger.info('TEST', 'Info message');
      logger.warn('TEST', 'Warning message');
      logger.error('TEST', 'Error message');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('Category Filtering', () => {
    it('should filter by enabled categories', () => {
      const logger = createLogger({
        minLevel: LogLevel.DEBUG,
        enableConsole: false,
        categories: ['ACTION', 'EFFECT'],
      });

      logger.info('ACTION', 'Action message');
      logger.info('EFFECT', 'Effect message');
      logger.info('BATTLE', 'Battle message');
      logger.info('PHASE', 'Phase message');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].category).toBe('ACTION');
      expect(entries[1].category).toBe('EFFECT');
    });

    it('should allow all categories when null', () => {
      logger.setCategories(null);

      logger.info('ACTION', 'Action message');
      logger.info('EFFECT', 'Effect message');
      logger.info('BATTLE', 'Battle message');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(3);
    });
  });

  describe('Log Queries', () => {
    beforeEach(() => {
      logger.debug('ACTION', 'Debug action');
      logger.info('ACTION', 'Info action');
      logger.warn('EFFECT', 'Warning effect');
      logger.error('BATTLE', 'Error battle');
    });

    it('should get entries by level', () => {
      const infoEntries = logger.getEntriesByLevel(LogLevel.INFO);
      expect(infoEntries).toHaveLength(1);
      expect(infoEntries[0].message).toBe('Info action');
    });

    it('should get entries by category', () => {
      const actionEntries = logger.getEntriesByCategory('ACTION');
      expect(actionEntries).toHaveLength(2);
      expect(actionEntries[0].message).toBe('Debug action');
      expect(actionEntries[1].message).toBe('Info action');
    });

    it('should get entries in time range', () => {
      const entries = logger.getEntries();
      const startTime = entries[1].timestamp;
      const endTime = entries[2].timestamp;

      const rangeEntries = logger.getEntriesInRange(startTime, endTime);
      // Should include entries at startTime and endTime (inclusive range)
      expect(rangeEntries.length).toBeGreaterThanOrEqual(2);
      expect(rangeEntries.every(e => e.timestamp >= startTime && e.timestamp <= endTime)).toBe(true);
    });
  });

  describe('Log Management', () => {
    it('should limit entries to max size', () => {
      const logger = createLogger({
        minLevel: LogLevel.DEBUG,
        enableConsole: false,
        maxEntries: 5,
      });

      for (let i = 0; i < 10; i++) {
        logger.info('TEST', `Message ${i}`);
      }

      const entries = logger.getEntries();
      expect(entries).toHaveLength(5);
      // Should keep the most recent entries
      expect(entries[0].message).toBe('Message 5');
      expect(entries[4].message).toBe('Message 9');
    });

    it('should clear all entries', () => {
      logger.info('TEST', 'Message 1');
      logger.info('TEST', 'Message 2');

      expect(logger.getEntries()).toHaveLength(2);

      logger.clear();

      expect(logger.getEntries()).toHaveLength(0);
    });
  });

  describe('Log Export', () => {
    beforeEach(() => {
      logger.info('ACTION', 'Player played card', { cardId: 'card-123' });
      logger.warn('EFFECT', 'Effect failed');
    });

    it('should export as JSON', () => {
      const json = logger.exportJSON();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].category).toBe('ACTION');
      expect(parsed[0].message).toBe('Player played card');
    });

    it('should export as CSV', () => {
      const csv = logger.exportCSV();
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Timestamp,Level,Category,Message,Data');
      expect(lines).toHaveLength(3); // Header + 2 entries
      expect(lines[1]).toContain('INFO');
      expect(lines[1]).toContain('ACTION');
    });

    it('should export as text', () => {
      const text = logger.exportText();
      const lines = text.split('\n');

      expect(lines.length).toBeGreaterThan(0);
      expect(text).toContain('[INFO]');
      expect(text).toContain('[ACTION]');
      expect(text).toContain('Player played card');
    });
  });

  describe('Log Statistics', () => {
    beforeEach(() => {
      logger.debug('ACTION', 'Debug action');
      logger.info('ACTION', 'Info action');
      logger.info('EFFECT', 'Info effect');
      logger.warn('EFFECT', 'Warning effect');
      logger.error('BATTLE', 'Error battle');
    });

    it('should provide statistics', () => {
      const stats = logger.getStats();

      expect(stats.totalEntries).toBe(5);
      expect(stats.byLevel['DEBUG']).toBe(1);
      expect(stats.byLevel['INFO']).toBe(2);
      expect(stats.byLevel['WARN']).toBe(1);
      expect(stats.byLevel['ERROR']).toBe(1);
      expect(stats.byCategory['ACTION']).toBe(2);
      expect(stats.byCategory['EFFECT']).toBe(2);
      expect(stats.byCategory['BATTLE']).toBe(1);
      expect(stats.oldestTimestamp).toBeDefined();
      expect(stats.newestTimestamp).toBeDefined();
    });
  });
});
