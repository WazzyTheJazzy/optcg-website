/**
 * GameLogger.ts
 * 
 * Specialized logger for game engine events.
 * Provides structured logging for game actions, effects, and AI decisions.
 */

import { Logger, LogLevel, createLogger } from './Logger';
import { PlayerId, GameAction, ActionType } from '../core/types';
import { EffectInstance } from '../effects/types';

/**
 * Game logger categories
 */
export enum GameLogCategory {
  ACTION = 'ACTION',
  EFFECT = 'EFFECT',
  AI_DECISION = 'AI_DECISION',
  BATTLE = 'BATTLE',
  PHASE = 'PHASE',
  STATE = 'STATE',
  ERROR = 'ERROR',
  PERFORMANCE = 'PERFORMANCE',
}

/**
 * Game logger class with specialized methods for game events
 */
export class GameLogger {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger({
      minLevel: LogLevel.INFO,
      enableConsole: true,
    });
  }

  /**
   * Get the underlying logger
   */
  getLogger(): Logger {
    return this.logger;
  }

  // ============================================================================
  // Action Logging
  // ============================================================================

  /**
   * Log a game action
   */
  logAction(action: GameAction): void {
    this.logger.info(
      GameLogCategory.ACTION,
      `Action: ${action.type}`,
      {
        playerId: action.playerId,
        type: action.type,
        timestamp: action.timestamp,
        ...this.extractActionData(action),
      }
    );
  }

  /**
   * Log an action attempt (before validation)
   */
  logActionAttempt(playerId: PlayerId, actionType: ActionType, data: Record<string, any>): void {
    this.logger.debug(
      GameLogCategory.ACTION,
      `Action attempt: ${actionType}`,
      {
        playerId,
        actionType,
        ...data,
      }
    );
  }

  /**
   * Log an action failure
   */
  logActionFailure(playerId: PlayerId, actionType: ActionType, reason: string, data?: Record<string, any>): void {
    this.logger.warn(
      GameLogCategory.ACTION,
      `Action failed: ${actionType} - ${reason}`,
      {
        playerId,
        actionType,
        reason,
        ...data,
      }
    );
  }

  /**
   * Extract relevant data from an action
   */
  private extractActionData(action: GameAction): Record<string, any> {
    switch (action.type) {
      case ActionType.PLAY_CARD:
        return {
          cardId: action.cardId,
          targets: action.targets,
        };
      case ActionType.GIVE_DON:
        return {
          donId: action.donId,
          targetCardId: action.targetCardId,
        };
      case ActionType.DECLARE_ATTACK:
        return {
          attackerId: action.attackerId,
          targetId: action.targetId,
        };
      case ActionType.ACTIVATE_EFFECT:
        return {
          cardId: action.cardId,
          effectId: action.effectId,
          targets: action.targets,
        };
      case ActionType.PASS:
      case ActionType.END_PHASE:
        return {};
      default:
        return {};
    }
  }

  // ============================================================================
  // Effect Logging
  // ============================================================================

  /**
   * Log effect triggering
   */
  logEffectTriggered(effect: EffectInstance): void {
    this.logger.info(
      GameLogCategory.EFFECT,
      `Effect triggered: ${effect.definition.label}`,
      {
        effectId: effect.id,
        sourceCardId: effect.source.id,
        sourceCardName: effect.source.definition.name,
        effectType: effect.definition.effectType,
        controller: effect.controller,
        label: effect.definition.label,
      }
    );
  }

  /**
   * Log effect resolution
   */
  logEffectResolved(effect: EffectInstance, success: boolean, details?: Record<string, any>): void {
    this.logger.info(
      GameLogCategory.EFFECT,
      `Effect resolved: ${effect.definition.label} - ${success ? 'Success' : 'Failed'}`,
      {
        effectId: effect.id,
        sourceCardId: effect.source.id,
        sourceCardName: effect.source.definition.name,
        effectType: effect.definition.effectType,
        success,
        targets: effect.targets,
        ...details,
      }
    );
  }

  /**
   * Log effect awaiting input
   */
  logEffectAwaitingInput(effect: EffectInstance, inputType: string): void {
    this.logger.debug(
      GameLogCategory.EFFECT,
      `Effect awaiting input: ${inputType}`,
      {
        effectId: effect.id,
        sourceCardId: effect.source.id,
        inputType,
      }
    );
  }

  /**
   * Log effect stack state
   */
  logEffectStack(stackSize: number, topEffect?: EffectInstance): void {
    this.logger.debug(
      GameLogCategory.EFFECT,
      `Effect stack: ${stackSize} effects`,
      {
        stackSize,
        topEffectId: topEffect?.id,
        topEffectType: topEffect?.definition.effectType,
      }
    );
  }

  // ============================================================================
  // AI Decision Logging
  // ============================================================================

  /**
   * Log AI action selection
   */
  logAIActionSelection(
    playerId: PlayerId,
    selectedAction: GameAction | null,
    availableActions: number,
    evaluationScore?: number
  ): void {
    this.logger.info(
      GameLogCategory.AI_DECISION,
      selectedAction 
        ? `AI selected action: ${selectedAction.type}` 
        : 'AI passed (no actions)',
      {
        playerId,
        selectedActionType: selectedAction?.type,
        availableActions,
        evaluationScore,
        ...this.extractActionData(selectedAction || { type: ActionType.PASS, playerId, timestamp: Date.now() }),
      }
    );
  }

  /**
   * Log AI action evaluation
   */
  logAIActionEvaluation(
    playerId: PlayerId,
    action: GameAction,
    score: number,
    details?: Record<string, any>
  ): void {
    this.logger.debug(
      GameLogCategory.AI_DECISION,
      `AI evaluated action: ${action.type} (score: ${score.toFixed(2)})`,
      {
        playerId,
        actionType: action.type,
        score,
        ...details,
      }
    );
  }

  /**
   * Log AI blocker decision
   */
  logAIBlockerDecision(
    playerId: PlayerId,
    attackerId: string,
    blockerId: string | null,
    availableBlockers: number,
    evaluationScore?: number
  ): void {
    this.logger.info(
      GameLogCategory.AI_DECISION,
      blockerId 
        ? `AI chose blocker: ${blockerId}` 
        : 'AI chose not to block',
      {
        playerId,
        attackerId,
        blockerId,
        availableBlockers,
        evaluationScore,
      }
    );
  }

  /**
   * Log AI counter decision
   */
  logAICounterDecision(
    playerId: PlayerId,
    counterAction: 'none' | 'card' | 'event',
    cardId?: string,
    evaluationScore?: number
  ): void {
    this.logger.info(
      GameLogCategory.AI_DECISION,
      `AI counter decision: ${counterAction}`,
      {
        playerId,
        counterAction,
        cardId,
        evaluationScore,
      }
    );
  }

  /**
   * Log AI target selection
   */
  logAITargetSelection(
    playerId: PlayerId,
    effectId: string,
    selectedTargets: string[],
    availableTargets: number,
    evaluationScores?: number[]
  ): void {
    this.logger.info(
      GameLogCategory.AI_DECISION,
      `AI selected targets: ${selectedTargets.length} of ${availableTargets}`,
      {
        playerId,
        effectId,
        selectedTargets,
        availableTargets,
        evaluationScores,
      }
    );
  }

  // ============================================================================
  // Battle Logging
  // ============================================================================

  /**
   * Log attack declaration
   */
  logAttackDeclared(attackerId: string, targetId: string, attackerPower: number, targetPower: number): void {
    this.logger.info(
      GameLogCategory.BATTLE,
      `Attack declared: ${attackerId} -> ${targetId}`,
      {
        attackerId,
        targetId,
        attackerPower,
        targetPower,
      }
    );
  }

  /**
   * Log blocker declaration
   */
  logBlockerDeclared(blockerId: string, attackerId: string, blockerPower: number): void {
    this.logger.info(
      GameLogCategory.BATTLE,
      `Blocker declared: ${blockerId} blocks ${attackerId}`,
      {
        blockerId,
        attackerId,
        blockerPower,
      }
    );
  }

  /**
   * Log counter usage
   */
  logCounterUsed(cardId: string, counterValue: number, newPower: number): void {
    this.logger.info(
      GameLogCategory.BATTLE,
      `Counter used: ${cardId} (+${counterValue} power)`,
      {
        cardId,
        counterValue,
        newPower,
      }
    );
  }

  /**
   * Log battle result
   */
  logBattleResult(
    attackerId: string,
    defenderId: string,
    attackerPower: number,
    defenderPower: number,
    result: 'attacker_wins' | 'defender_wins' | 'tie',
    koedCardId?: string
  ): void {
    this.logger.info(
      GameLogCategory.BATTLE,
      `Battle result: ${result}`,
      {
        attackerId,
        defenderId,
        attackerPower,
        defenderPower,
        result,
        koedCardId,
      }
    );
  }

  // ============================================================================
  // Phase Logging
  // ============================================================================

  /**
   * Log phase change
   */
  logPhaseChange(oldPhase: string, newPhase: string, activePlayer: PlayerId, turnNumber: number): void {
    this.logger.info(
      GameLogCategory.PHASE,
      `Phase change: ${oldPhase} -> ${newPhase}`,
      {
        oldPhase,
        newPhase,
        activePlayer,
        turnNumber,
      }
    );
  }

  /**
   * Log turn start
   */
  logTurnStart(turnNumber: number, activePlayer: PlayerId): void {
    this.logger.info(
      GameLogCategory.PHASE,
      `Turn ${turnNumber} started`,
      {
        turnNumber,
        activePlayer,
      }
    );
  }

  /**
   * Log turn end
   */
  logTurnEnd(turnNumber: number, activePlayer: PlayerId): void {
    this.logger.info(
      GameLogCategory.PHASE,
      `Turn ${turnNumber} ended`,
      {
        turnNumber,
        activePlayer,
      }
    );
  }

  // ============================================================================
  // State Logging
  // ============================================================================

  /**
   * Log game state snapshot
   */
  logStateSnapshot(
    turnNumber: number,
    phase: string,
    activePlayer: PlayerId,
    player1Life: number,
    player2Life: number,
    player1Hand: number,
    player2Hand: number
  ): void {
    this.logger.debug(
      GameLogCategory.STATE,
      `State snapshot: Turn ${turnNumber}, ${phase}`,
      {
        turnNumber,
        phase,
        activePlayer,
        player1Life,
        player2Life,
        player1Hand,
        player2Hand,
      }
    );
  }

  /**
   * Log game over
   */
  logGameOver(winner: PlayerId | null, reason: string, turnNumber: number): void {
    this.logger.info(
      GameLogCategory.STATE,
      `Game over: ${winner ? `${winner} wins` : 'Draw'}`,
      {
        winner,
        reason,
        turnNumber,
      }
    );
  }

  // ============================================================================
  // Performance Logging
  // ============================================================================

  /**
   * Log performance metric
   */
  logPerformance(operation: string, durationMs: number, details?: Record<string, any>): void {
    this.logger.debug(
      GameLogCategory.PERFORMANCE,
      `${operation}: ${durationMs.toFixed(2)}ms`,
      {
        operation,
        durationMs,
        ...details,
      }
    );
  }

  /**
   * Time an operation and log the result
   */
  async timeOperation<T>(operation: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.logPerformance(operation, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logPerformance(operation, duration, { error: true });
      throw error;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logger.setMinLevel(level);
  }

  /**
   * Enable/disable console output
   */
  setConsoleEnabled(enabled: boolean): void {
    this.logger.setConsoleEnabled(enabled);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logger.clear();
  }

  /**
   * Export logs in various formats
   */
  exportJSON(): string {
    return this.logger.exportJSON();
  }

  exportCSV(): string {
    return this.logger.exportCSV();
  }

  exportText(): string {
    return this.logger.exportText();
  }

  /**
   * Get log statistics
   */
  getStats() {
    return this.logger.getStats();
  }

  /**
   * Get all log entries
   */
  getEntries() {
    return this.logger.getEntries();
  }

  /**
   * Get entries by category
   */
  getEntriesByCategory(category: GameLogCategory) {
    return this.logger.getEntriesByCategory(category);
  }
}

/**
 * Global game logger instance
 */
let globalGameLogger: GameLogger | null = null;

/**
 * Get the global game logger
 */
export function getGameLogger(): GameLogger {
  if (!globalGameLogger) {
    globalGameLogger = new GameLogger();
  }
  return globalGameLogger;
}

/**
 * Set the global game logger
 */
export function setGameLogger(logger: GameLogger): void {
  globalGameLogger = logger;
}

/**
 * Create a new game logger
 */
export function createGameLogger(logger?: Logger): GameLogger {
  return new GameLogger(logger);
}
