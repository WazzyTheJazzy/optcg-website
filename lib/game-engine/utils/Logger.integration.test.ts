/**
 * Logger.integration.test.ts
 * 
 * Integration tests demonstrating the logging system in action
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameLogger, createGameLogger } from './GameLogger';
import { createLogger, LogLevel } from './Logger';
import { PlayerId, ActionType } from '../core/types';

describe('Logging System Integration', () => {
  let gameLogger: GameLogger;

  beforeEach(() => {
    const logger = createLogger({
      minLevel: LogLevel.DEBUG,
      enableConsole: false,
    });
    gameLogger = createGameLogger(logger);
  });

  it('should track log statistics', () => {
    // Generate some logs
    gameLogger.getLogger().info('ACTION', 'Test action 1');
    gameLogger.getLogger().info('ACTION', 'Test action 2');
    gameLogger.getLogger().warn('EFFECT', 'Test warning');
    gameLogger.getLogger().error('ERROR', 'Test error');
    gameLogger.getLogger().debug('AI_DECISION', 'Test debug');

    const stats = gameLogger.getStats();
    
    expect(stats.totalEntries).toBe(5);
    expect(stats.byLevel['INFO']).toBe(2);
    expect(stats.byLevel['WARN']).toBe(1);
    expect(stats.byLevel['ERROR']).toBe(1);
    expect(stats.byLevel['DEBUG']).toBe(1);
    expect(stats.byCategory['ACTION']).toBe(2);
    expect(stats.byCategory['EFFECT']).toBe(1);
    expect(stats.byCategory['ERROR']).toBe(1);
    expect(stats.byCategory['AI_DECISION']).toBe(1);
  });

  it('should filter logs by level', () => {
    // Set to WARN level
    gameLogger.setLogLevel(LogLevel.WARN);
    
    // Try to log at different levels
    gameLogger.getLogger().debug('TEST', 'Debug message');
    gameLogger.getLogger().info('TEST', 'Info message');
    gameLogger.getLogger().warn('TEST', 'Warning message');
    gameLogger.getLogger().error('TEST', 'Error message');

    const entries = gameLogger.getEntries();
    
    // Should only have WARN and ERROR
    expect(entries).toHaveLength(2);
    expect(entries[0].level).toBe(LogLevel.WARN);
    expect(entries[1].level).toBe(LogLevel.ERROR);
  });

  it('should export logs in multiple formats', () => {
    // Generate some logs
    gameLogger.logAction({
      type: ActionType.PLAY_CARD,
      playerId: PlayerId.PLAYER_1,
      cardId: 'card-123',
      targets: [],
      timestamp: Date.now(),
    });
    
    gameLogger.logAIActionSelection(PlayerId.PLAYER_1, null, 5, 42.5);
    gameLogger.logAttackDeclared('attacker-1', 'target-1', 5000, 3000);

    // Export in different formats
    const jsonExport = gameLogger.exportJSON();
    const csvExport = gameLogger.exportCSV();
    const textExport = gameLogger.exportText();

    // Verify JSON export
    expect(jsonExport).toBeTruthy();
    const jsonParsed = JSON.parse(jsonExport);
    expect(Array.isArray(jsonParsed)).toBe(true);
    expect(jsonParsed.length).toBeGreaterThan(0);

    // Verify CSV export
    expect(csvExport).toBeTruthy();
    expect(csvExport).toContain('Timestamp,Level,Category,Message,Data');
    expect(csvExport.split('\n').length).toBeGreaterThan(1);

    // Verify text export
    expect(textExport).toBeTruthy();
    expect(textExport).toContain('[INFO]');
    expect(textExport).toContain('[ACTION]');
  });

  it('should log AI decisions with evaluation scores', () => {
    // Simulate AI decision logging
    const action = {
      type: ActionType.DECLARE_ATTACK,
      playerId: PlayerId.PLAYER_1,
      attackerId: 'attacker-1',
      targetId: 'target-1',
      timestamp: Date.now(),
    };
    
    gameLogger.logAIActionEvaluation(PlayerId.PLAYER_1, action, 75.5, {
      expectedDamage: 1,
      risk: 0.2,
    });
    
    gameLogger.logAIActionSelection(PlayerId.PLAYER_1, action, 10, 75.5);

    const entries = gameLogger.getEntries();
    const aiLogs = entries.filter(e => e.category === 'AI_DECISION');
    
    expect(aiLogs).toHaveLength(2);
    expect(aiLogs[0].data?.score).toBe(75.5);
    expect(aiLogs[1].data?.evaluationScore).toBe(75.5);
    expect(aiLogs[1].data?.availableActions).toBe(10);
  });

  it('should log battle events', () => {
    // Simulate battle logging
    gameLogger.logAttackDeclared('attacker-1', 'target-1', 5000, 3000);
    gameLogger.logBlockerDeclared('blocker-1', 'attacker-1', 4000);
    gameLogger.logCounterUsed('counter-card-1', 2000, 6000);
    gameLogger.logBattleResult('attacker-1', 'blocker-1', 5000, 6000, 'defender_wins');

    const entries = gameLogger.getEntries();
    const battleLogs = entries.filter(e => e.category === 'BATTLE');
    
    expect(battleLogs).toHaveLength(4);
    expect(battleLogs[0].message).toContain('Attack declared');
    expect(battleLogs[1].message).toContain('Blocker declared');
    expect(battleLogs[2].message).toContain('Counter used');
    expect(battleLogs[3].message).toContain('Battle result');
  });

  it('should log phase transitions', () => {
    // Simulate phase logging
    gameLogger.logTurnStart(1, PlayerId.PLAYER_1);
    gameLogger.logPhaseChange('REFRESH', 'DRAW', PlayerId.PLAYER_1, 1);
    gameLogger.logPhaseChange('DRAW', 'DON', PlayerId.PLAYER_1, 1);
    gameLogger.logPhaseChange('DON', 'MAIN', PlayerId.PLAYER_1, 1);
    gameLogger.logTurnEnd(1, PlayerId.PLAYER_1);

    const entries = gameLogger.getEntries();
    const phaseLogs = entries.filter(e => e.category === 'PHASE');
    
    expect(phaseLogs).toHaveLength(5);
    expect(phaseLogs[0].message).toContain('Turn 1 started');
    expect(phaseLogs[4].message).toContain('Turn 1 ended');
  });

  it('should log performance metrics', async () => {
    // Time an operation
    const result = await gameLogger.timeOperation('testOperation', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'success';
    });

    expect(result).toBe('success');

    const entries = gameLogger.getEntries();
    const perfLogs = entries.filter(e => e.category === 'PERFORMANCE');
    
    expect(perfLogs).toHaveLength(1);
    expect(perfLogs[0].data?.operation).toBe('testOperation');
    expect(perfLogs[0].data?.durationMs).toBeGreaterThan(0);
  });

  it('should clear logs', () => {
    // Generate some logs
    gameLogger.getLogger().info('TEST', 'Message 1');
    gameLogger.getLogger().info('TEST', 'Message 2');
    gameLogger.getLogger().info('TEST', 'Message 3');

    expect(gameLogger.getEntries()).toHaveLength(3);

    // Clear logs
    gameLogger.clear();

    expect(gameLogger.getEntries()).toHaveLength(0);
  });

  it('should handle large numbers of logs', () => {
    // Generate many logs
    for (let i = 0; i < 100; i++) {
      gameLogger.getLogger().info('TEST', `Message ${i}`);
    }

    const entries = gameLogger.getEntries();
    expect(entries).toHaveLength(100);

    const stats = gameLogger.getStats();
    expect(stats.totalEntries).toBe(100);
    expect(stats.byCategory['TEST']).toBe(100);
  });

  it('should maintain log order', () => {
    // Generate logs in sequence
    gameLogger.getLogger().info('TEST', 'First');
    gameLogger.getLogger().info('TEST', 'Second');
    gameLogger.getLogger().info('TEST', 'Third');

    const entries = gameLogger.getEntries();
    
    expect(entries[0].message).toBe('First');
    expect(entries[1].message).toBe('Second');
    expect(entries[2].message).toBe('Third');
    
    // Timestamps should be in order
    expect(entries[0].timestamp).toBeLessThanOrEqual(entries[1].timestamp);
    expect(entries[1].timestamp).toBeLessThanOrEqual(entries[2].timestamp);
  });

  it('should include structured data in logs', () => {
    // Log with structured data
    gameLogger.logAction({
      type: ActionType.PLAY_CARD,
      playerId: PlayerId.PLAYER_1,
      cardId: 'card-123',
      targets: [{ type: 'CARD', cardId: 'target-1' }],
      timestamp: Date.now(),
    });

    const entries = gameLogger.getEntries();
    const actionLog = entries.find(e => e.category === 'ACTION');
    
    expect(actionLog).toBeDefined();
    expect(actionLog?.data?.playerId).toBe(PlayerId.PLAYER_1);
    expect(actionLog?.data?.cardId).toBe('card-123');
    expect(actionLog?.data?.targets).toBeDefined();
    expect(Array.isArray(actionLog?.data?.targets)).toBe(true);
  });
});
