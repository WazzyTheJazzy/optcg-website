# Game Engine Logging System

## Overview

The game engine includes a comprehensive logging system that records all game actions, effect resolutions, AI decisions, battle events, and performance metrics. This system is designed to help with debugging, analysis, and understanding game behavior.

## Features

- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR
- **Structured Logging**: All logs include timestamps, categories, and optional data
- **Category Filtering**: Filter logs by category (ACTION, EFFECT, AI_DECISION, BATTLE, PHASE, STATE, PERFORMANCE)
- **Export Formats**: Export logs as JSON, CSV, or plain text
- **Performance Tracking**: Built-in performance measurement for operations
- **Statistics**: Get aggregate statistics about logged events
- **Memory Management**: Automatic log rotation with configurable limits

## Quick Start

### Basic Setup

```typescript
import { GameEngine } from './core/GameEngine';
import { LogLevel } from './utils/Logger';

// Create game engine (logging is enabled by default)
const engine = new GameEngine();

// Set log level (default is INFO)
engine.setLogLevel(LogLevel.DEBUG);

// Enable/disable console output
engine.setConsoleLogging(true);
```

### Exporting Logs

```typescript
// Export as JSON
const jsonLogs = engine.exportLogsJSON();

// Export as CSV
const csvLogs = engine.exportLogsCSV();

// Export as plain text
const textLogs = engine.exportLogsText();

// Save to file (Node.js)
const fs = require('fs');
fs.writeFileSync('game-logs.json', jsonLogs);
```

### Viewing Statistics

```typescript
const stats = engine.getLogStats();
console.log('Total entries:', stats.totalEntries);
console.log('By level:', stats.byLevel);
console.log('By category:', stats.byCategory);
```

## Log Categories

### ACTION
Logs all game actions performed by players:
- Card plays
- DON assignments
- Attack declarations
- Effect activations
- Pass actions

### EFFECT
Logs effect system events:
- Effect triggering
- Effect resolution
- Effect stack state
- Effect awaiting input

### AI_DECISION
Logs AI decision-making process:
- Action selection with evaluation scores
- Action evaluation for all available actions
- Blocker decisions
- Counter decisions
- Target selection

### BATTLE
Logs combat events:
- Attack declarations
- Blocker declarations
- Counter usage
- Battle results (including K.O.s)

### PHASE
Logs game phase transitions:
- Phase changes
- Turn start
- Turn end

### STATE
Logs game state changes:
- State snapshots
- Game over events

### PERFORMANCE
Logs performance metrics:
- Operation durations
- Timing information

### ERROR
Logs errors and exceptions:
- Validation failures
- System errors
- Recovery attempts

## Log Levels

### DEBUG (0)
Detailed information for debugging. Includes:
- Action attempts (before validation)
- Effect stack state
- State snapshots
- Performance measurements

### INFO (1)
General informational messages. Includes:
- Successful actions
- Effect resolutions
- AI decisions
- Battle events
- Phase changes

### WARN (2)
Warning messages for potentially problematic situations. Includes:
- Action failures
- Invalid states
- Recoverable errors

### ERROR (3)
Error messages for serious problems. Includes:
- Unrecoverable errors
- System failures
- Critical issues

## Advanced Usage

### Analyzing AI Decisions

```typescript
const entries = engine.getLogEntries();
const aiDecisions = entries.filter(e => e.category === 'AI_DECISION');

// Find all action evaluations
const evaluations = aiDecisions.filter(e => 
  e.message.includes('AI evaluated action')
);

// Analyze scores
for (const eval of evaluations) {
  console.log(`${eval.data.actionType}: ${eval.data.score}`);
}
```

### Debugging Effects

```typescript
const entries = engine.getLogEntries();
const effectLogs = entries.filter(e => e.category === 'EFFECT');

// Find failed effects
const failed = effectLogs.filter(e => 
  e.message.includes('resolved') && e.data.success === false
);

console.log('Failed effects:', failed.length);
```

### Performance Analysis

```typescript
const entries = engine.getLogEntries();
const perfLogs = entries.filter(e => e.category === 'PERFORMANCE');

// Calculate average duration for each operation
const operations = {};
for (const log of perfLogs) {
  const op = log.data.operation;
  if (!operations[op]) operations[op] = [];
  operations[op].push(log.data.durationMs);
}

for (const [op, durations] of Object.entries(operations)) {
  const avg = durations.reduce((a, b) => a + b) / durations.length;
  console.log(`${op}: ${avg.toFixed(2)}ms average`);
}
```

### Battle Analysis

```typescript
const entries = engine.getLogEntries();
const battleLogs = entries.filter(e => e.category === 'BATTLE');

// Count outcomes
const results = battleLogs.filter(e => e.message.includes('Battle result'));
const attackerWins = results.filter(e => e.data.result === 'attacker_wins').length;
const defenderWins = results.filter(e => e.data.result === 'defender_wins').length;

console.log(`Attacker wins: ${attackerWins}`);
console.log(`Defender wins: ${defenderWins}`);
```

### Custom Filtering

```typescript
const entries = engine.getLogEntries();

// Filter by time range
const recentLogs = entries.filter(e => 
  e.timestamp > Date.now() - 60000 // Last minute
);

// Filter by player
const player1Actions = entries.filter(e => 
  e.category === 'ACTION' && e.data.playerId === 'PLAYER_1'
);

// Filter by card
const cardActions = entries.filter(e => 
  e.data.cardId === 'card-123'
);
```

## Configuration

### Log Level

```typescript
// Set minimum log level
engine.setLogLevel(LogLevel.DEBUG);  // Log everything
engine.setLogLevel(LogLevel.INFO);   // Log info and above (default)
engine.setLogLevel(LogLevel.WARN);   // Log warnings and errors only
engine.setLogLevel(LogLevel.ERROR);  // Log errors only
```

### Console Output

```typescript
// Enable console output
engine.setConsoleLogging(true);

// Disable console output (logs still recorded)
engine.setConsoleLogging(false);
```

### Memory Management

The logger automatically manages memory by limiting the number of stored entries. By default, it keeps the most recent 10,000 entries. Older entries are automatically removed.

To clear logs manually:

```typescript
engine.clearLogs();
```

## Best Practices

1. **Use appropriate log levels**: DEBUG for detailed tracing, INFO for normal events, WARN for issues, ERROR for failures

2. **Include relevant data**: Always include context data that will help with debugging

3. **Export logs regularly**: For long-running games, export logs periodically to avoid memory issues

4. **Analyze logs after games**: Use the statistics and filtering features to understand game behavior

5. **Disable console output in production**: Set `setConsoleLogging(false)` to improve performance

6. **Use performance logging**: Wrap expensive operations with performance logging to identify bottlenecks

## Examples

See `Logger.example.ts` for complete working examples of:
- Basic logging setup
- Log level filtering
- Exporting logs
- Viewing statistics
- Analyzing AI decisions
- Debugging effects
- Performance analysis
- Battle analysis
- Saving logs to files
- Real-time monitoring
- Custom filtering

## API Reference

### GameEngine Methods

- `setLogLevel(level: LogLevel)`: Set minimum log level
- `setConsoleLogging(enabled: boolean)`: Enable/disable console output
- `exportLogsJSON(): string`: Export logs as JSON
- `exportLogsCSV(): string`: Export logs as CSV
- `exportLogsText(): string`: Export logs as plain text
- `getLogStats()`: Get log statistics
- `clearLogs()`: Clear all logs
- `getLogEntries()`: Get all log entries
- `getGameLogger(): GameLogger`: Get the game logger instance

### GameLogger Methods

- `logAction(action: GameAction)`: Log a game action
- `logActionAttempt(playerId, actionType, data)`: Log an action attempt
- `logActionFailure(playerId, actionType, reason, data)`: Log an action failure
- `logEffectTriggered(effect)`: Log effect triggering
- `logEffectResolved(effect, success, details)`: Log effect resolution
- `logAIActionSelection(playerId, action, availableActions, score)`: Log AI action selection
- `logAIActionEvaluation(playerId, action, score, details)`: Log AI action evaluation
- `logAIBlockerDecision(playerId, attackerId, blockerId, availableBlockers, score)`: Log AI blocker decision
- `logAICounterDecision(playerId, counterAction, cardId, score)`: Log AI counter decision
- `logAttackDeclared(attackerId, targetId, attackerPower, targetPower)`: Log attack declaration
- `logBlockerDeclared(blockerId, attackerId, blockerPower)`: Log blocker declaration
- `logCounterUsed(cardId, counterValue, newPower)`: Log counter usage
- `logBattleResult(attackerId, defenderId, attackerPower, defenderPower, result, koedCardId)`: Log battle result
- `logPhaseChange(oldPhase, newPhase, activePlayer, turnNumber)`: Log phase change
- `logTurnStart(turnNumber, activePlayer)`: Log turn start
- `logTurnEnd(turnNumber, activePlayer)`: Log turn end
- `logStateSnapshot(turnNumber, phase, activePlayer, player1Life, player2Life, player1Hand, player2Hand)`: Log state snapshot
- `logGameOver(winner, reason, turnNumber)`: Log game over
- `logPerformance(operation, durationMs, details)`: Log performance metric
- `timeOperation<T>(operation, fn)`: Time an operation and log the result

## Troubleshooting

### Logs not appearing

1. Check log level: `engine.setLogLevel(LogLevel.DEBUG)`
2. Check console output: `engine.setConsoleLogging(true)`
3. Verify logging is enabled in the logger configuration

### Too many logs

1. Increase log level: `engine.setLogLevel(LogLevel.WARN)`
2. Filter by category when analyzing
3. Clear logs periodically: `engine.clearLogs()`

### Performance impact

1. Disable console output: `engine.setConsoleLogging(false)`
2. Increase minimum log level
3. Export and clear logs regularly

### Memory usage

The logger automatically limits entries to 10,000 by default. For longer games:
1. Export logs periodically
2. Clear logs after export
3. Increase log level to reduce volume
