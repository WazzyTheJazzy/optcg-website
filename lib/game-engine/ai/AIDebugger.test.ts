/**
 * AIDebugger.test.ts
 * 
 * Tests for AI debugging and logging utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AIDebugger,
  AIDebugConfig,
  DecisionMetrics,
  AIMetrics,
  EvaluationLog,
  getGlobalDebugger,
  setGlobalDebugger,
  resetGlobalDebugger,
  createDeterministicDebugger,
  createVerboseDebugger,
  createProductionDebugger,
} from './AIDebugger';
import {
  DecisionContext,
  EvaluationFactors,
  ScoredOption,
} from './types';
import { GameState, PlayerId, ActionType, Phase } from '../core/types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockGameState(): GameState {
  return {
    turnNumber: 1,
    phase: Phase.MAIN,
    activePlayer: PlayerId.PLAYER_1,
    players: new Map(),
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    eventLog: [],
    history: [],
    loopGuardState: { actionCounts: new Map(), stateHashes: new Map(), maxRepeats: 3, resetOnPhaseChange: true },
  } as GameState;
}

function createMockContext(): DecisionContext {
  return {
    state: createMockGameState(),
    playerId: PlayerId.PLAYER_1,
    config: {
      difficulty: 'medium',
      playStyle: 'balanced',
      thinkingTime: { min: 500, max: 2000 },
      randomness: 0.15,
    },
  };
}

function createMockEvaluationFactors(): EvaluationFactors {
  return {
    boardControl: 10,
    resourceEfficiency: 5,
    lifeDifferential: -5,
    cardAdvantage: 0,
    tempo: 8,
  };
}

// ============================================================================
// AIDebugger Tests
// ============================================================================

describe('AIDebugger', () => {
  let aiDebugger: AIDebugger;
  let consoleSpy: any;

  beforeEach(() => {
    // Reset global aiDebugger
    resetGlobalDebugger();
    
    // Clear existing spies if they exist
    if (consoleSpy) {
      consoleSpy.log?.mockClear();
      consoleSpy.error?.mockClear();
      consoleSpy.warn?.mockClear();
      consoleSpy.debug?.mockClear();
    }
    
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  describe('Constructor and Configuration', () => {
    it('should create aiDebugger with default configuration', () => {
      aiDebugger = new AIDebugger();
      
      const metrics = aiDebugger.getMetrics();
      expect(metrics.totalDecisions).toBe(0);
      expect(metrics.decisions).toEqual([]);
    });

    it('should create aiDebugger with custom configuration', () => {
      const config: Partial<AIDebugConfig> = {
        enabled: true,
        logLevel: 'debug',
        trackMetrics: true,
      };
      
      aiDebugger = new AIDebugger(config);
      
      // aiDebugger should be created successfully
      expect(aiDebugger).toBeDefined();
    });

    it('should initialize deterministic mode with seed', () => {
      aiDebugger = new AIDebugger({
        deterministic: true,
        randomSeed: 12345,
        enabled: true,
      });
      
      // Should log deterministic mode initialization
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Deterministic mode enabled with seed: 12345')
      );
    });
  });

  describe('Decision Logging', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        enabled: true,
        trackMetrics: true,
        logLevel: 'info',
      });
    });

    it('should log decision with metrics', () => {
      const context = createMockContext();
      const options = ['option1', 'option2', 'option3'];
      const selected = 'option2';
      const score = 75.5;
      const timeMs = 150;
      
      aiDebugger.logDecision(
        'chooseAction',
        context,
        options,
        selected,
        score,
        timeMs
      );
      
      // Should log decision
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[AI Decision] chooseAction')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Options: 3')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Score: 75.50')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Time: 150ms')
      );
      
      // Should track metrics
      const metrics = aiDebugger.getMetrics();
      expect(metrics.totalDecisions).toBe(1);
      expect(metrics.decisionsByType.get('chooseAction')).toBe(1);
    });

    it('should not log when disabled', () => {
      aiDebugger = new AIDebugger({
        enabled: false,
        trackMetrics: false,
      });
      
      const context = createMockContext();
      aiDebugger.logDecision('test', context, [], 'option', 0, 0);
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log decision tree in verbose mode', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logLevel: 'verbose',
        logDecisionTree: true,
      });
      
      const context = createMockContext();
      const options = [{ type: 'PLAY_CARD' }];
      
      aiDebugger.logDecision('test', context, options, options[0], 50, 100);
      
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  describe('Evaluation Logging', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logEvaluations: true,
        logLevel: 'debug',
      });
    });

    it('should log evaluation with score', () => {
      const factors = createMockEvaluationFactors();
      
      aiDebugger.logEvaluation(
        'evaluateAction',
        { type: 'PLAY_CARD' },
        85.5,
        factors
      );
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('[AI Evaluation] evaluateAction')
      );
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Score: 85.50')
      );
      
      const logs = aiDebugger.getEvaluationLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].evaluationType).toBe('evaluateAction');
      expect(logs[0].score).toBe(85.5);
    });

    it('should log evaluation factors in verbose mode', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logEvaluations: true,
        logLevel: 'verbose',
      });
      
      const factors = createMockEvaluationFactors();
      
      aiDebugger.logEvaluation('test', {}, 50, factors);
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Factors:')
      );
    });

    it('should not log evaluations when disabled', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logEvaluations: false,
      });
      
      aiDebugger.logEvaluation('test', {}, 50);
      
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  describe('Action Selection Logging', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logDecisionTree: true,
        logLevel: 'verbose',
      });
    });

    it('should log action selection with scored options', () => {
      const scoredOptions: ScoredOption<string>[] = [
        { option: 'option1', score: 90 },
        { option: 'option2', score: 75 },
        { option: 'option3', score: 60 },
      ];
      
      aiDebugger.logActionSelection('test', scoredOptions, scoredOptions[0]);
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('[AI Action Selection] test')
      );
      
      // Should log all options
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Score: 90.00')
      );
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Score: 75.00')
      );
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Score: 60.00')
      );
    });

    it('should mark selected option', () => {
      const scoredOptions: ScoredOption<string>[] = [
        { option: 'option1', score: 90 },
        { option: 'option2', score: 75 },
      ];
      
      aiDebugger.logActionSelection('test', scoredOptions, scoredOptions[1]);
      
      // Selected option should have marker
      const calls = consoleSpy.debug.mock.calls;
      const selectedCall = calls.find((call: any[]) => 
        call[0].includes('option2') && call[0].includes('→')
      );
      expect(selectedCall).toBeDefined();
    });
  });

  describe('Error Logging', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logLevel: 'error',
      });
    });

    it('should log error with message', () => {
      const error = new Error('Test error');
      
      aiDebugger.logError(error);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[AI Error] Test error')
      );
    });

    it('should log error context in debug mode', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logLevel: 'debug',
      });
      
      const error = new Error('Test error');
      const context = { method: 'test', data: 'value' };
      
      aiDebugger.logError(error, context);
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Context:')
      );
    });

    it('should log stack trace in verbose mode', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logLevel: 'verbose',
      });
      
      const error = new Error('Test error');
      
      aiDebugger.logError(error);
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Stack:')
      );
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        trackMetrics: true,
      });
    });

    it('should track decision metrics', () => {
      const context = createMockContext();
      
      aiDebugger.logDecision('chooseAction', context, [], 'option', 75, 100);
      aiDebugger.logDecision('chooseAction', context, [], 'option', 80, 150);
      aiDebugger.logDecision('chooseMulligan', context, [], true, 50, 50);
      
      const metrics = aiDebugger.getMetrics();
      
      expect(metrics.totalDecisions).toBe(3);
      expect(metrics.decisionsByType.get('chooseAction')).toBe(2);
      expect(metrics.decisionsByType.get('chooseMulligan')).toBe(1);
      expect(metrics.totalThinkingTime).toBe(300);
    });

    it('should calculate average decision time by type', () => {
      const context = createMockContext();
      
      aiDebugger.logDecision('chooseAction', context, [], 'option', 75, 100);
      aiDebugger.logDecision('chooseAction', context, [], 'option', 80, 200);
      
      const metrics = aiDebugger.getMetrics();
      const avgTime = metrics.averageDecisionTime.get('chooseAction');
      
      expect(avgTime).toBe(150); // (100 + 200) / 2
    });

    it('should calculate average evaluation score by type', () => {
      const context = createMockContext();
      
      aiDebugger.logDecision('chooseAction', context, [], 'option', 60, 100);
      aiDebugger.logDecision('chooseAction', context, [], 'option', 80, 100);
      
      const metrics = aiDebugger.getMetrics();
      const avgScore = metrics.averageEvaluationScore.get('chooseAction');
      
      expect(avgScore).toBe(70); // (60 + 80) / 2
    });

    it('should store individual decision records', () => {
      const context = createMockContext();
      
      aiDebugger.logDecision('test', context, ['a', 'b'], 'a', 75, 100);
      
      const metrics = aiDebugger.getMetrics();
      
      expect(metrics.decisions).toHaveLength(1);
      expect(metrics.decisions[0].decisionType).toBe('test');
      expect(metrics.decisions[0].optionsCount).toBe(2);
      expect(metrics.decisions[0].selectedScore).toBe(75);
      expect(metrics.decisions[0].decisionTimeMs).toBe(100);
    });
  });

  describe('Deterministic Mode', () => {
    it('should generate deterministic random numbers', () => {
      const debugger1 = new AIDebugger({
        deterministic: true,
        randomSeed: 12345,
      });
      
      const debugger2 = new AIDebugger({
        deterministic: true,
        randomSeed: 12345,
      });
      
      // Same seed should produce same sequence
      const sequence1 = [
        debugger1.getRandom(),
        debugger1.getRandom(),
        debugger1.getRandom(),
      ];
      
      const sequence2 = [
        debugger2.getRandom(),
        debugger2.getRandom(),
        debugger2.getRandom(),
      ];
      
      expect(sequence1).toEqual(sequence2);
    });

    it('should generate different sequences with different seeds', () => {
      const debugger1 = new AIDebugger({
        deterministic: true,
        randomSeed: 12345,
      });
      
      const debugger2 = new AIDebugger({
        deterministic: true,
        randomSeed: 54321,
      });
      
      const value1 = debugger1.getRandom();
      const value2 = debugger2.getRandom();
      
      expect(value1).not.toBe(value2);
    });

    it('should use Math.random when not in deterministic mode', () => {
      aiDebugger = new AIDebugger({
        deterministic: false,
      });
      
      const value = aiDebugger.getRandom();
      
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  describe('Metrics Export', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        trackMetrics: true,
      });
    });

    it('should export metrics as JSON', () => {
      const context = createMockContext();
      aiDebugger.logDecision('test', context, [], 'option', 75, 100);
      
      const json = aiDebugger.exportMetrics();
      const parsed = JSON.parse(json);
      
      expect(parsed.totalDecisions).toBe(1);
      expect(parsed.decisionsByType.test).toBe(1);
    });

    it('should export evaluation logs as JSON', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logEvaluations: true,
        logLevel: 'debug',
      });
      
      aiDebugger.logEvaluation('test', { type: 'ACTION' }, 85);
      
      const json = aiDebugger.exportEvaluationLogs();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].evaluationType).toBe('test');
      expect(parsed[0].score).toBe(85);
    });
  });

  describe('Metrics Summary', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        trackMetrics: true,
      });
    });

    it('should print metrics summary', () => {
      const context = createMockContext();
      
      aiDebugger.logDecision('chooseAction', context, [], 'option', 75, 100);
      aiDebugger.logDecision('chooseMulligan', context, [], true, 50, 50);
      
      aiDebugger.printMetricsSummary();
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('=== AI Metrics Summary ===')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Total Decisions: 2')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Decisions by Type:')
      );
    });
  });

  describe('Reset', () => {
    beforeEach(() => {
      aiDebugger = new AIDebugger({
        enabled: true,
        trackMetrics: true,
        logEvaluations: true,
        logLevel: 'debug',
      });
    });

    it('should reset metrics and logs', () => {
      const context = createMockContext();
      
      aiDebugger.logDecision('test', context, [], 'option', 75, 100);
      aiDebugger.logEvaluation('test', {}, 50);
      
      expect(aiDebugger.getMetrics().totalDecisions).toBe(1);
      expect(aiDebugger.getEvaluationLogs()).toHaveLength(1);
      
      aiDebugger.reset();
      
      expect(aiDebugger.getMetrics().totalDecisions).toBe(0);
      expect(aiDebugger.getEvaluationLogs()).toHaveLength(0);
    });

    it('should log reset message when enabled', () => {
      aiDebugger.reset();
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[AI Debugger] Metrics and logs reset')
      );
    });
  });

  describe('Global aiDebugger', () => {
    it('should get global aiDebugger instance', () => {
      const debugger1 = getGlobalDebugger();
      const debugger2 = getGlobalDebugger();
      
      expect(debugger1).toBe(debugger2);
    });

    it('should set global aiDebugger instance', () => {
      const customDebugger = new AIDebugger({ enabled: true });
      
      setGlobalDebugger(customDebugger);
      
      const retrieved = getGlobalDebugger();
      expect(retrieved).toBe(customDebugger);
    });

    it('should reset global aiDebugger', () => {
      const aiDebugger = getGlobalDebugger();
      const context = createMockContext();
      
      aiDebugger.logDecision('test', context, [], 'option', 75, 100);
      
      resetGlobalDebugger();
      
      expect(aiDebugger.getMetrics().totalDecisions).toBe(0);
    });
  });

  describe('Factory Functions', () => {
    it('should create deterministic aiDebugger', () => {
      const aiDebugger = createDeterministicDebugger(12345);
      
      const value1 = aiDebugger.getRandom();
      const value2 = aiDebugger.getRandom();
      
      expect(value1).toBeGreaterThanOrEqual(0);
      expect(value1).toBeLessThan(1);
      expect(value2).toBeGreaterThanOrEqual(0);
      expect(value2).toBeLessThan(1);
      expect(value1).not.toBe(value2);
    });

    it('should create verbose aiDebugger', () => {
      const aiDebugger = createVerboseDebugger();
      
      expect(aiDebugger).toBeDefined();
      
      // Should log in verbose mode
      const context = createMockContext();
      aiDebugger.logDecision('test', context, [], 'option', 75, 100);
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should create production aiDebugger', () => {
      const aiDebugger = createProductionDebugger();
      
      expect(aiDebugger).toBeDefined();
      
      // Should not log in production mode
      const context = createMockContext();
      aiDebugger.logDecision('test', context, [], 'option', 75, 100);
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
      
      // But should still track metrics
      expect(aiDebugger.getMetrics().totalDecisions).toBe(1);
    });
  });

  describe('Log Levels', () => {
    it('should respect log level hierarchy', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logLevel: 'warn',
      });
      
      // Should log error
      aiDebugger.logError(new Error('test'));
      expect(consoleSpy.error).toHaveBeenCalled();
      
      // Should not log info
      consoleSpy.log.mockClear();
      const context = createMockContext();
      aiDebugger.logDecision('test', context, [], 'option', 75, 100);
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log all levels in verbose mode', () => {
      aiDebugger = new AIDebugger({
        enabled: true,
        logLevel: 'verbose',
        logEvaluations: true,
        logDecisionTree: true,
      });
      
      const context = createMockContext();
      
      aiDebugger.logError(new Error('test'));
      aiDebugger.logDecision('test', context, [], 'option', 75, 100);
      aiDebugger.logEvaluation('test', {}, 50);
      
      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });
});

