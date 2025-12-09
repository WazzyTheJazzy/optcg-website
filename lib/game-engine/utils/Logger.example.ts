/**
 * Logger.example.ts
 * 
 * Example usage of the logging system
 */

import { GameEngine } from '../core/GameEngine';
import { LogLevel } from './Logger';
import { PlayerId } from '../core/types';

/**
 * Example: Basic logging setup
 */
export function exampleBasicLogging() {
  const engine = new GameEngine();

  // Set log level to DEBUG to see all logs
  engine.setLogLevel(LogLevel.DEBUG);

  // Enable console output
  engine.setConsoleLogging(true);

  console.log('Logging is now configured!');
  console.log('All game actions, effects, and AI decisions will be logged.');
}

/**
 * Example: Filtering logs by level
 */
export function exampleLogLevelFiltering() {
  const engine = new GameEngine();

  // Only log warnings and errors
  engine.setLogLevel(LogLevel.WARN);

  console.log('Only warnings and errors will be logged.');
}

/**
 * Example: Exporting logs
 */
export function exampleExportLogs() {
  const engine = new GameEngine();

  // ... play some game ...

  // Export logs as JSON
  const jsonLogs = engine.exportLogsJSON();
  console.log('JSON logs:', jsonLogs);

  // Export logs as CSV
  const csvLogs = engine.exportLogsCSV();
  console.log('CSV logs:', csvLogs);

  // Export logs as plain text
  const textLogs = engine.exportLogsText();
  console.log('Text logs:', textLogs);
}

/**
 * Example: Viewing log statistics
 */
export function exampleLogStatistics() {
  const engine = new GameEngine();

  // ... play some game ...

  // Get statistics
  const stats = engine.getLogStats();
  console.log('Total log entries:', stats.totalEntries);
  console.log('Entries by level:', stats.byLevel);
  console.log('Entries by category:', stats.byCategory);
  console.log('Time range:', {
    oldest: stats.oldestTimestamp ? new Date(stats.oldestTimestamp) : null,
    newest: stats.newestTimestamp ? new Date(stats.newestTimestamp) : null,
  });
}

/**
 * Example: Analyzing AI decisions
 */
export function exampleAnalyzeAIDecisions() {
  const engine = new GameEngine();

  // ... play a game with AI ...

  // Get all log entries
  const entries = engine.getLogEntries();

  // Filter for AI decision logs
  const aiDecisions = entries.filter(e => e.category === 'AI_DECISION');

  console.log(`Found ${aiDecisions.length} AI decisions`);

  // Analyze action evaluations
  const actionEvaluations = aiDecisions.filter(e => 
    e.message.includes('AI evaluated action')
  );

  console.log('Action evaluations:');
  for (const entry of actionEvaluations) {
    console.log(`  ${entry.data?.actionType}: score ${entry.data?.score}`);
  }

  // Analyze selected actions
  const selectedActions = aiDecisions.filter(e => 
    e.message.includes('AI selected action')
  );

  console.log('Selected actions:');
  for (const entry of selectedActions) {
    console.log(`  ${entry.data?.selectedActionType} (score: ${entry.data?.evaluationScore})`);
  }
}

/**
 * Example: Debugging effect resolution
 */
export function exampleDebugEffects() {
  const engine = new GameEngine();

  // ... play a game ...

  // Get all log entries
  const entries = engine.getLogEntries();

  // Filter for effect logs
  const effectLogs = entries.filter(e => e.category === 'EFFECT');

  console.log(`Found ${effectLogs.length} effect events`);

  // Group by effect type
  const byType: Record<string, any[]> = {};
  for (const entry of effectLogs) {
    const type = entry.data?.effectType || 'unknown';
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(entry);
  }

  console.log('Effects by type:');
  for (const [type, logs] of Object.entries(byType)) {
    console.log(`  ${type}: ${logs.length} occurrences`);
  }

  // Find failed effects
  const failedEffects = effectLogs.filter(e => 
    e.message.includes('resolved') && e.data?.success === false
  );

  if (failedEffects.length > 0) {
    console.log('Failed effects:');
    for (const entry of failedEffects) {
      console.log(`  ${entry.data?.sourceCardName}: ${entry.data?.effectType}`);
    }
  }
}

/**
 * Example: Performance analysis
 */
export function examplePerformanceAnalysis() {
  const engine = new GameEngine();

  // ... play a game ...

  // Get all log entries
  const entries = engine.getLogEntries();

  // Filter for performance logs
  const perfLogs = entries.filter(e => e.category === 'PERFORMANCE');

  console.log(`Found ${perfLogs.length} performance measurements`);

  // Calculate statistics
  const operations: Record<string, number[]> = {};
  for (const entry of perfLogs) {
    const op = entry.data?.operation || 'unknown';
    const duration = entry.data?.durationMs || 0;
    if (!operations[op]) {
      operations[op] = [];
    }
    operations[op].push(duration);
  }

  console.log('Performance by operation:');
  for (const [op, durations] of Object.entries(operations)) {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    console.log(`  ${op}:`);
    console.log(`    Count: ${durations.length}`);
    console.log(`    Avg: ${avg.toFixed(2)}ms`);
    console.log(`    Min: ${min.toFixed(2)}ms`);
    console.log(`    Max: ${max.toFixed(2)}ms`);
  }
}

/**
 * Example: Battle analysis
 */
export function exampleBattleAnalysis() {
  const engine = new GameEngine();

  // ... play a game ...

  // Get all log entries
  const entries = engine.getLogEntries();

  // Filter for battle logs
  const battleLogs = entries.filter(e => e.category === 'BATTLE');

  console.log(`Found ${battleLogs.length} battle events`);

  // Count attack declarations
  const attacks = battleLogs.filter(e => e.message.includes('Attack declared'));
  console.log(`Total attacks: ${attacks.length}`);

  // Count blocks
  const blocks = battleLogs.filter(e => e.message.includes('Blocker declared'));
  console.log(`Total blocks: ${blocks.length}`);

  // Count counters
  const counters = battleLogs.filter(e => e.message.includes('Counter used'));
  console.log(`Total counters: ${counters.length}`);

  // Analyze battle results
  const results = battleLogs.filter(e => e.message.includes('Battle result'));
  const attackerWins = results.filter(e => e.data?.result === 'attacker_wins').length;
  const defenderWins = results.filter(e => e.data?.result === 'defender_wins').length;
  const ties = results.filter(e => e.data?.result === 'tie').length;

  console.log('Battle outcomes:');
  console.log(`  Attacker wins: ${attackerWins}`);
  console.log(`  Defender wins: ${defenderWins}`);
  console.log(`  Ties: ${ties}`);
}

/**
 * Example: Saving logs to file
 */
export async function exampleSaveLogsToFile() {
  const engine = new GameEngine();

  // ... play a game ...

  // Export logs
  const jsonLogs = engine.exportLogsJSON();
  const csvLogs = engine.exportLogsCSV();
  const textLogs = engine.exportLogsText();

  // In a Node.js environment, you could save to files:
  // const fs = require('fs');
  // fs.writeFileSync('game-logs.json', jsonLogs);
  // fs.writeFileSync('game-logs.csv', csvLogs);
  // fs.writeFileSync('game-logs.txt', textLogs);

  console.log('Logs exported and ready to save');
  console.log('JSON size:', jsonLogs.length, 'bytes');
  console.log('CSV size:', csvLogs.length, 'bytes');
  console.log('Text size:', textLogs.length, 'bytes');
}

/**
 * Example: Real-time log monitoring
 */
export function exampleRealTimeMonitoring() {
  const engine = new GameEngine();

  // Get the game logger
  const gameLogger = engine.getGameLogger();

  // Set up a timer to periodically check logs
  const monitorInterval = setInterval(() => {
    const stats = gameLogger.getStats();
    console.log(`[Monitor] Total entries: ${stats.totalEntries}`);
    
    // Get recent errors
    const recentEntries = gameLogger.getEntries().slice(-10);
    const recentErrors = recentEntries.filter(e => e.level === 3); // ERROR level
    
    if (recentErrors.length > 0) {
      console.log(`[Monitor] WARNING: ${recentErrors.length} recent errors detected!`);
      for (const error of recentErrors) {
        console.log(`  - ${error.message}`);
      }
    }
  }, 5000); // Check every 5 seconds

  // Clean up when done
  // clearInterval(monitorInterval);
}

/**
 * Example: Custom log filtering
 */
export function exampleCustomFiltering() {
  const engine = new GameEngine();

  // ... play a game ...

  // Get all log entries
  const entries = engine.getLogEntries();

  // Find all actions by a specific player
  const player1Actions = entries.filter(e => 
    e.category === 'ACTION' && e.data?.playerId === PlayerId.PLAYER_1
  );

  console.log(`Player 1 performed ${player1Actions.length} actions`);

  // Find all attacks that resulted in K.O.
  const koAttacks = entries.filter(e => 
    e.category === 'BATTLE' && 
    e.message.includes('Battle result') &&
    e.data?.koedCardId
  );

  console.log(`${koAttacks.length} attacks resulted in K.O.`);

  // Find all effects that modified power
  const powerModifications = entries.filter(e => 
    e.category === 'EFFECT' && 
    e.data?.effectType === 'POWER_MODIFICATION'
  );

  console.log(`${powerModifications.length} power modifications occurred`);
}
