/**
 * GameLogger.test.ts
 * 
 * Tests for the game-specific logging functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameLogger, createGameLogger, GameLogCategory } from './GameLogger';
import { createLogger, LogLevel } from './Logger';
import { PlayerId, ActionType, GameAction } from '../core/types';

describe('GameLogger', () => {
  let gameLogger: GameLogger;

  beforeEach(() => {
    const logger = createLogger({
      minLevel: LogLevel.DEBUG,
      enableConsole: false,
    });
    gameLogger = createGameLogger(logger);
  });

  describe('Action Logging', () => {
    it('should log game actions', () => {
      const action: GameAction = {
        type: ActionType.PLAY_CARD,
        playerId: PlayerId.PLAYER_1,
        cardId: 'card-123',
        targets: [],
        timestamp: Date.now(),
      };

      gameLogger.logAction(action);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.ACTION);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('PLAY_CARD');
      expect(entries[0].data?.playerId).toBe(PlayerId.PLAYER_1);
      expect(entries[0].data?.cardId).toBe('card-123');
    });

    it('should log action attempts', () => {
      gameLogger.logActionAttempt(PlayerId.PLAYER_1, ActionType.DECLARE_ATTACK, {
        attackerId: 'attacker-1',
        targetId: 'target-1',
      });

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.ACTION);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Action attempt');
      expect(entries[0].message).toContain('DECLARE_ATTACK');
    });

    it('should log action failures', () => {
      gameLogger.logActionFailure(
        PlayerId.PLAYER_1,
        ActionType.PLAY_CARD,
        'Insufficient DON',
        { cardId: 'card-123' }
      );

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.ACTION);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Action failed');
      expect(entries[0].message).toContain('Insufficient DON');
      expect(entries[0].data?.reason).toBe('Insufficient DON');
    });
  });

  describe('AI Decision Logging', () => {
    it('should log AI action selection', () => {
      const action: GameAction = {
        type: ActionType.DECLARE_ATTACK,
        playerId: PlayerId.PLAYER_1,
        attackerId: 'attacker-1',
        targetId: 'target-1',
        timestamp: Date.now(),
      };

      gameLogger.logAIActionSelection(PlayerId.PLAYER_1, action, 5, 75.5);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.AI_DECISION);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('AI selected action');
      expect(entries[0].message).toContain('DECLARE_ATTACK');
      expect(entries[0].data?.evaluationScore).toBe(75.5);
      expect(entries[0].data?.availableActions).toBe(5);
    });

    it('should log AI action evaluation', () => {
      const action: GameAction = {
        type: ActionType.PLAY_CARD,
        playerId: PlayerId.PLAYER_1,
        cardId: 'card-123',
        targets: [],
        timestamp: Date.now(),
      };

      gameLogger.logAIActionEvaluation(PlayerId.PLAYER_1, action, 42.3, {
        cardValue: 30,
        boardImpact: 12.3,
      });

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.AI_DECISION);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('AI evaluated action');
      expect(entries[0].message).toContain('42.3');
      expect(entries[0].data?.score).toBe(42.3);
    });

    it('should log AI blocker decisions', () => {
      gameLogger.logAIBlockerDecision(
        PlayerId.PLAYER_2,
        'attacker-1',
        'blocker-1',
        3,
        60.0
      );

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.AI_DECISION);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('AI chose blocker');
      expect(entries[0].data?.blockerId).toBe('blocker-1');
      expect(entries[0].data?.availableBlockers).toBe(3);
    });

    it('should log AI counter decisions', () => {
      gameLogger.logAICounterDecision(
        PlayerId.PLAYER_2,
        'card',
        'counter-card-1',
        45.0
      );

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.AI_DECISION);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('AI counter decision');
      expect(entries[0].data?.counterAction).toBe('card');
      expect(entries[0].data?.cardId).toBe('counter-card-1');
    });
  });

  describe('Battle Logging', () => {
    it('should log attack declarations', () => {
      gameLogger.logAttackDeclared('attacker-1', 'target-1', 5000, 3000);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.BATTLE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Attack declared');
      expect(entries[0].data?.attackerPower).toBe(5000);
      expect(entries[0].data?.targetPower).toBe(3000);
    });

    it('should log blocker declarations', () => {
      gameLogger.logBlockerDeclared('blocker-1', 'attacker-1', 4000);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.BATTLE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Blocker declared');
      expect(entries[0].data?.blockerId).toBe('blocker-1');
    });

    it('should log counter usage', () => {
      gameLogger.logCounterUsed('counter-card-1', 2000, 5000);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.BATTLE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Counter used');
      expect(entries[0].data?.counterValue).toBe(2000);
      expect(entries[0].data?.newPower).toBe(5000);
    });

    it('should log battle results', () => {
      gameLogger.logBattleResult(
        'attacker-1',
        'defender-1',
        5000,
        3000,
        'attacker_wins',
        'defender-1'
      );

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.BATTLE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Battle result');
      expect(entries[0].data?.result).toBe('attacker_wins');
      expect(entries[0].data?.koedCardId).toBe('defender-1');
    });
  });

  describe('Phase Logging', () => {
    it('should log phase changes', () => {
      gameLogger.logPhaseChange('MAIN', 'END', PlayerId.PLAYER_1, 5);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.PHASE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Phase change');
      expect(entries[0].data?.oldPhase).toBe('MAIN');
      expect(entries[0].data?.newPhase).toBe('END');
      expect(entries[0].data?.turnNumber).toBe(5);
    });

    it('should log turn start', () => {
      gameLogger.logTurnStart(3, PlayerId.PLAYER_2);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.PHASE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Turn 3 started');
      expect(entries[0].data?.activePlayer).toBe(PlayerId.PLAYER_2);
    });

    it('should log turn end', () => {
      gameLogger.logTurnEnd(3, PlayerId.PLAYER_2);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.PHASE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Turn 3 ended');
    });
  });

  describe('State Logging', () => {
    it('should log state snapshots', () => {
      gameLogger.logStateSnapshot(5, 'MAIN', PlayerId.PLAYER_1, 5, 4, 7, 6);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.STATE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('State snapshot');
      expect(entries[0].data?.turnNumber).toBe(5);
      expect(entries[0].data?.player1Life).toBe(5);
      expect(entries[0].data?.player2Hand).toBe(6);
    });

    it('should log game over', () => {
      gameLogger.logGameOver(PlayerId.PLAYER_1, 'Opponent ran out of life', 10);

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.STATE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Game over');
      expect(entries[0].data?.winner).toBe(PlayerId.PLAYER_1);
      expect(entries[0].data?.reason).toBe('Opponent ran out of life');
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics', () => {
      gameLogger.logPerformance('executeAttack', 15.5, { attackerId: 'attacker-1' });

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.PERFORMANCE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('executeAttack');
      expect(entries[0].message).toContain('15.50ms');
      expect(entries[0].data?.durationMs).toBe(15.5);
    });

    it('should time operations', async () => {
      const result = await gameLogger.timeOperation('testOperation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      expect(result).toBe('result');

      const entries = gameLogger.getEntriesByCategory(GameLogCategory.PERFORMANCE);
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('testOperation');
      expect(entries[0].data?.durationMs).toBeGreaterThan(0);
    });
  });

  describe('Export and Statistics', () => {
    beforeEach(() => {
      gameLogger.logAction({
        type: ActionType.PLAY_CARD,
        playerId: PlayerId.PLAYER_1,
        cardId: 'card-1',
        targets: [],
        timestamp: Date.now(),
      });
      gameLogger.logAIActionSelection(PlayerId.PLAYER_1, null, 0);
      gameLogger.logAttackDeclared('attacker-1', 'target-1', 5000, 3000);
    });

    it('should export logs', () => {
      const json = gameLogger.exportJSON();
      expect(json).toBeTruthy();
      expect(JSON.parse(json)).toHaveLength(3);

      const csv = gameLogger.exportCSV();
      expect(csv).toContain('Timestamp,Level,Category,Message,Data');

      const text = gameLogger.exportText();
      expect(text).toContain('[ACTION]');
      expect(text).toContain('[AI_DECISION]');
      expect(text).toContain('[BATTLE]');
    });

    it('should provide statistics', () => {
      const stats = gameLogger.getStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.byCategory['ACTION']).toBe(1);
      expect(stats.byCategory['AI_DECISION']).toBe(1);
      expect(stats.byCategory['BATTLE']).toBe(1);
    });
  });
});
