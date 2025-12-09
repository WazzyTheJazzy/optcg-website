# AI Event System

The AI Player emits events through the EventEmitter system to provide visibility into AI decision-making. This enables UI feedback, debugging, and analytics.

## Event Types

### AI_THINKING_START
Emitted when the AI begins considering a decision.

**Event Data:**
- `playerId`: The AI player's ID
- `decisionType`: Type of decision (e.g., 'chooseAction', 'chooseMulligan', 'chooseBlocker')
- `optionsCount`: Number of options being considered
- `timestamp`: When the thinking started

### AI_THINKING_END
Emitted when the AI finishes considering a decision.

**Event Data:**
- `playerId`: The AI player's ID
- `decisionType`: Type of decision that was made
- `thinkingTimeMs`: Time spent thinking in milliseconds
- `timestamp`: When the thinking ended

### AI_ACTION_SELECTED
Emitted when the AI selects an action or option.

**Event Data:**
- `playerId`: The AI player's ID
- `decisionType`: Type of decision that was made
- `selectedOption`: The option that was selected
- `evaluationScore`: (Optional) Evaluation score for the selected option
- `allOptions`: (Optional) Array of all options that were considered
- `timestamp`: When the action was selected

## Usage Example

```typescript
import { GameEngine } from './core/GameEngine';
import { createAIPlayer } from './ai/AIPlayer';
import { PlayerId, GameEventType } from './core/types';

// Create game engine
const engine = new GameEngine();

// Get the event emitter from the engine
const eventEmitter = engine.getEventEmitter();

// Create AI player with event emitter
const aiPlayer = createAIPlayer(
  PlayerId.PLAYER_2,
  'medium',
  'balanced',
  eventEmitter
);

// Subscribe to AI events
eventEmitter.on(GameEventType.AI_THINKING_START, (event) => {
  console.log(`AI is thinking about ${event.decisionType}...`);
  console.log(`Considering ${event.optionsCount} options`);
});

eventEmitter.on(GameEventType.AI_THINKING_END, (event) => {
  console.log(`AI finished thinking in ${event.thinkingTimeMs}ms`);
});

eventEmitter.on(GameEventType.AI_ACTION_SELECTED, (event) => {
  console.log(`AI selected: ${JSON.stringify(event.selectedOption)}`);
  if (event.evaluationScore !== undefined) {
    console.log(`Evaluation score: ${event.evaluationScore}`);
  }
});

// Setup game with AI player
engine.setupGame({
  deck1: player1Deck,
  deck2: player2Deck,
  player1: humanPlayer,
  player2: aiPlayer,
});

// Run the game
engine.runGame();
```

## UI Integration

The AI events can be used to provide visual feedback in the UI:

```typescript
// Show thinking indicator
eventEmitter.on(GameEventType.AI_THINKING_START, (event) => {
  showThinkingIndicator(event.playerId);
});

// Hide thinking indicator
eventEmitter.on(GameEventType.AI_THINKING_END, (event) => {
  hideThinkingIndicator(event.playerId);
});

// Show AI decision
eventEmitter.on(GameEventType.AI_ACTION_SELECTED, (event) => {
  showAIDecision(event.decisionType, event.selectedOption);
});
```

## Debug Mode

For debugging and development, you can log all AI decisions:

```typescript
eventEmitter.on(GameEventType.AI_ACTION_SELECTED, (event) => {
  console.log('[AI Debug]', {
    player: event.playerId,
    decision: event.decisionType,
    selected: event.selectedOption,
    score: event.evaluationScore,
    options: event.allOptions,
    time: event.thinkingTimeMs,
  });
});
```

## Notes

- Events are only emitted if an EventEmitter is provided to the AIPlayer constructor
- If no EventEmitter is provided, the AI will function normally without emitting events
- Events are emitted even when the AI falls back to random/default choices due to errors
- All events include a timestamp for tracking and analysis
