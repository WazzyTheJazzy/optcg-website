# AI Opponent System

A comprehensive AI opponent system for the One Piece TCG game engine that enables players to practice against computer-controlled opponents with varying difficulty levels and play styles.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Components](#components)
  - [Player Interface](#player-interface)
  - [HumanPlayer](#humanplayer)
  - [AIPlayer](#aiplayer)
  - [ActionEvaluator](#actionevaluator)
  - [AIDecisionSystem](#aidecisionsystem)
  - [StrategyManager](#strategymanager)
- [Configuration](#configuration)
- [Evaluation Factors](#evaluation-factors)
- [Strategy Profiles](#strategy-profiles)
- [Usage Examples](#usage-examples)
- [Debugging and Testing](#debugging-and-testing)
- [Performance](#performance)
- [Error Handling](#error-handling)

## Overview

The AI Opponent System provides intelligent computer-controlled opponents for the One Piece TCG game engine. The system uses a scoring-based evaluation approach to analyze potential actions and select optimal plays based on configurable difficulty levels and play styles.

### Key Features

- **Multiple Difficulty Levels**: Easy, Medium, and Hard AI opponents
- **Configurable Play Styles**: Aggressive, Defensive, and Balanced strategies
- **Intelligent Decision-Making**: Evaluates actions based on board control, resource efficiency, life totals, card advantage, and tempo
- **Realistic Thinking Time**: Simulates human-like decision delays
- **Comprehensive Error Handling**: Graceful fallbacks ensure games never crash
- **Event System**: Emits events for AI actions to enable UI visualization
- **Deterministic Testing**: Supports fixed random seeds for reproducible behavior

## Architecture

The AI system follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Engine                           │
│  (Existing: GameEngine, PhaseManager, BattleSystem, etc.)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Player Interface
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐            ┌────────▼────────┐
│  Human Player   │            │   AI Player     │
│   Controller    │            │   Controller    │
└─────────────────┘            └────────┬────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
           ┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
           │  AI Decision    │ │    Action      │ │   Strategy     │
           │     System      │ │   Evaluator    │ │    Manager     │
           └─────────────────┘ └────────────────┘ └────────────────┘
```

### Component Responsibilities

1. **Player Interface**: Abstract interface that both human and AI players implement
2. **HumanPlayer**: Implements player interface using UI callbacks for human input
3. **AIPlayer**: Implements player interface using automated decision algorithms
4. **AIDecisionSystem**: Core decision-making logic that selects actions based on game state
5. **ActionEvaluator**: Scores potential actions using heuristics and game state analysis
6. **StrategyManager**: Manages play style configurations and adjusts evaluation weights

## Quick Start

### Creating an AI Opponent

```typescript
import { createAIPlayer } from './lib/game-engine/ai/AIPlayerFactory';
import { PlayerId } from './lib/game-engine/core/types';

// Create an easy AI opponent with balanced play style
const aiPlayer = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced');

// Create a hard AI opponent with aggressive play style
const hardAI = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'aggressive');

// Use in game engine
const gameEngine = new GameEngine(humanPlayer, aiPlayer);
```

### Creating a Human Player

```typescript
import { createHumanPlayer } from './lib/game-engine/ai/HumanPlayer';

const humanPlayer = createHumanPlayer(PlayerId.PLAYER_1, {
  onChooseAction: async (legalActions, state) => {
    return await showActionMenu(legalActions);
  },
  onChooseMulligan: async (hand, state) => {
    return await showMulliganDialog(hand);
  },
  // ... other callbacks
});
```

## Components

### Player Interface

The Player interface provides a unified abstraction for player decision-making:

```typescript
interface Player {
  readonly id: PlayerId;
  readonly type: 'human' | 'ai';
  
  // Decision methods called by game engine
  chooseAction(legalActions: Action[], state: GameState): Promise<Action>;
  chooseMulligan(hand: CardInstance[], state: GameState): Promise<boolean>;
  chooseBlocker(legalBlockers: CardInstance[], attacker: CardInstance, state: GameState): Promise<CardInstance | null>;
  chooseCounterAction(options: CounterOption[], state: GameState): Promise<CounterOption | null>;
  chooseTarget(legalTargets: Target[], effect: EffectInstance, state: GameState): Promise<Target>;
  chooseValue(options: number[], effect: EffectInstance, state: GameState): Promise<number>;
}
```

### HumanPlayer

The `HumanPlayer` class implements the Player interface for human players using a callback system.

#### Features

- **Callback-based decisions**: All player decisions are made through callback functions
- **Fallback behavior**: Provides sensible defaults when callbacks are not set
- **Dynamic callback updates**: Callbacks can be updated at runtime
- **Backward compatibility**: Maintains compatibility with existing game flow

#### Usage Example

```typescript
const player = createHumanPlayer(PlayerId.PLAYER_1, {
  onChooseAction: async (legalActions, state) => {
    const choice = await showActionMenu(legalActions);
    return choice;
  },
  
  onChooseMulligan: async (hand, state) => {
    const shouldMulligan = await showMulliganDialog(hand);
    return shouldMulligan;
  },
  
  onChooseBlocker: async (legalBlockers, attacker, state) => {
    const blocker = await showBlockerSelection(legalBlockers, attacker);
    return blocker; // or null to not block
  },
  
  onChooseCounterAction: async (options, state) => {
    const counterAction = await showCounterMenu(options);
    return counterAction; // or null to pass
  },
  
  onChooseTarget: async (legalTargets, effect, state) => {
    const target = await showTargetSelection(legalTargets, effect);
    return target;
  },
  
  onChooseValue: async (options, effect, state) => {
    const value = await showValueSelection(options, effect);
    return value;
  },
});
```

### AIPlayer

The `AIPlayer` class implements the Player interface for computer-controlled opponents.

#### Features

- **Intelligent Decision-Making**: Uses evaluation algorithms to select optimal actions
- **Configurable Difficulty**: Easy, Medium, and Hard difficulty levels
- **Play Style Customization**: Aggressive, Defensive, and Balanced strategies
- **Realistic Thinking Time**: Simulates human-like decision delays
- **Error Handling**: Graceful fallbacks ensure games never crash
- **Event Emission**: Emits events for AI actions to enable UI visualization

#### Configuration

```typescript
interface AIPlayerConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  playStyle: 'aggressive' | 'defensive' | 'balanced';
  thinkingTime: {
    min: number; // Minimum delay in ms
    max: number; // Maximum delay in ms
  };
  randomness: number; // 0-1, amount of random variation in decisions
}
```

#### Usage Example

```typescript
import { createAIPlayer, createCustomAIPlayer } from './lib/game-engine/ai/AIPlayerFactory';

// Simple creation with defaults
const easyAI = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced');
const hardAI = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'aggressive');

// Custom configuration
const customAI = createCustomAIPlayer(PlayerId.PLAYER_2, {
  difficulty: 'medium',
  playStyle: 'defensive',
  thinkingTime: { min: 1000, max: 3000 },
  randomness: 0.2
});
```

### ActionEvaluator

The `ActionEvaluator` class scores potential actions based on multiple evaluation factors.

#### Evaluation Factors

The evaluator considers five key factors when scoring actions:

1. **Board Control** (-100 to 100): Number and power of characters on field
2. **Resource Efficiency** (-100 to 100): DON usage and card cost effectiveness
3. **Life Differential** (-100 to 100): Comparison of life totals between players
4. **Card Advantage** (-100 to 100): Hand size and deck size comparison
5. **Tempo** (-100 to 100): Action speed and board impact

#### Usage Example

```typescript
import { ActionEvaluator } from './lib/game-engine/ai/ActionEvaluator';

const weights = {
  boardControl: 0.25,
  resourceEfficiency: 0.20,
  lifeDifferential: 0.25,
  cardAdvantage: 0.15,
  tempo: 0.15
};

const evaluator = new ActionEvaluator(weights);

// Evaluate an action
const score = evaluator.evaluateAction(action, gameState, playerId);

// Evaluate specific action types
const playScore = evaluator.evaluatePlayCard(card, gameState, playerId);
const attackScore = evaluator.evaluateAttack(attacker, target, gameState, playerId);
const donScore = evaluator.evaluateGiveDon(don, target, gameState, playerId);
```

### AIDecisionSystem

The `AIDecisionSystem` class contains the core decision-making logic.

#### Features

- **Action Selection**: Evaluates all legal actions and selects the highest-scoring option
- **Mulligan Evaluation**: Analyzes opening hand quality
- **Blocker Selection**: Determines optimal blocking decisions
- **Counter Evaluation**: Assesses counter card value vs damage prevented
- **Target Selection**: Scores potential targets for effects
- **Difficulty Modifiers**: Applies randomness based on difficulty level

#### Usage Example

```typescript
import { AIDecisionSystem } from './lib/game-engine/ai/AIDecisionSystem';
import { ActionEvaluator } from './lib/game-engine/ai/ActionEvaluator';
import { StrategyManager } from './lib/game-engine/ai/StrategyManager';

const evaluator = new ActionEvaluator(weights);
const strategy = new StrategyManager();
const decisionSystem = new AIDecisionSystem(evaluator, strategy);

// Select best action
const context = { state: gameState, playerId, config };
const bestAction = decisionSystem.selectAction(legalActions, context);

// Evaluate mulligan
const shouldMulligan = decisionSystem.evaluateMulligan(hand, context);

// Select blocker
const blocker = decisionSystem.selectBlocker(legalBlockers, attacker, context);
```

### StrategyManager

The `StrategyManager` class manages play style configurations and dynamically adjusts strategies.

#### Strategy Profiles

Three predefined strategy profiles are available:

1. **Aggressive**: Prioritizes life damage and tempo
2. **Defensive**: Prioritizes board control and card advantage
3. **Balanced**: Equal weighting across all factors

#### Dynamic Adjustment

The strategy manager dynamically adjusts weights based on game state:

- **Life Advantage**: Becomes more aggressive when ahead
- **Life Disadvantage**: Becomes more defensive when behind
- **Resource Availability**: Adjusts based on DON and hand size

#### Usage Example

```typescript
import { StrategyManager } from './lib/game-engine/ai/StrategyManager';

const strategy = new StrategyManager();

// Set initial strategy
strategy.setStrategy('aggressive', 'hard');

// Get current weights
const weights = strategy.getWeights();

// Dynamically adjust for game state
strategy.adjustForGameState(gameState, playerId);
```

## Configuration

### Difficulty Levels

#### Easy
- **Randomness**: 30% chance of suboptimal decisions
- **Thinking Time**: 500-1500ms
- **Behavior**: Makes obvious mistakes, misses optimal plays

#### Medium
- **Randomness**: 15% chance of suboptimal decisions
- **Thinking Time**: 800-2000ms
- **Behavior**: Near-optimal play with occasional mistakes

#### Hard
- **Randomness**: 5% chance of suboptimal decisions
- **Thinking Time**: 1000-3000ms
- **Behavior**: Consistently makes optimal decisions

### Default Configurations

```typescript
const DEFAULT_CONFIGS = {
  easy: {
    difficulty: 'easy',
    playStyle: 'balanced',
    thinkingTime: { min: 500, max: 1500 },
    randomness: 0.3
  },
  medium: {
    difficulty: 'medium',
    playStyle: 'balanced',
    thinkingTime: { min: 800, max: 2000 },
    randomness: 0.15
  },
  hard: {
    difficulty: 'hard',
    playStyle: 'balanced',
    thinkingTime: { min: 1000, max: 3000 },
    randomness: 0.05
  }
};
```

## Evaluation Factors

### Board Control

Evaluates the number and power of characters on the field.

**Calculation**:
- Count characters controlled by each player
- Sum total power of characters
- Compare AI's board presence to opponent's
- Score: -100 (opponent dominates) to +100 (AI dominates)

### Resource Efficiency

Evaluates DON usage and card cost effectiveness.

**Calculation**:
- Calculate DON usage efficiency (power gained per DON spent)
- Evaluate card cost vs impact
- Consider remaining resources for future plays
- Score: -100 (inefficient) to +100 (highly efficient)

### Life Differential

Compares life totals between players.

**Calculation**:
- Calculate life difference (AI life - opponent life)
- Normalize to -100 to +100 scale
- Prioritize actions that increase life differential
- Score: -100 (far behind) to +100 (far ahead)

### Card Advantage

Compares hand sizes and deck sizes.

**Calculation**:
- Compare hand sizes (AI hand - opponent hand)
- Compare deck sizes (AI deck - opponent deck)
- Weight hand advantage more heavily than deck advantage
- Score: -100 (significant disadvantage) to +100 (significant advantage)

### Tempo

Evaluates action speed and board impact.

**Calculation**:
- Evaluate immediate board impact
- Consider action timing (early game vs late game)
- Prioritize actions that maintain or gain tempo
- Score: -100 (tempo loss) to +100 (tempo gain)

## Strategy Profiles

### Aggressive Strategy

Prioritizes dealing damage and maintaining tempo.

**Weights**:
```typescript
{
  boardControl: 0.25,
  resourceEfficiency: 0.15,
  lifeDifferential: 0.35,  // High priority
  cardAdvantage: 0.10,
  tempo: 0.15
}
```

**Behavior**:
- Attacks leader frequently
- Plays cards with Rush keyword
- Takes calculated risks for damage
- Prioritizes life damage over board control

### Defensive Strategy

Prioritizes board control and resource management.

**Weights**:
```typescript
{
  boardControl: 0.30,      // High priority
  resourceEfficiency: 0.20, // High priority
  lifeDifferential: 0.20,
  cardAdvantage: 0.20,     // High priority
  tempo: 0.10
}
```

**Behavior**:
- Removes opponent's threats
- Maintains strong board presence
- Uses blockers and counters effectively
- Prioritizes card advantage

### Balanced Strategy

Equal weighting across all factors.

**Weights**:
```typescript
{
  boardControl: 0.25,
  resourceEfficiency: 0.20,
  lifeDifferential: 0.25,
  cardAdvantage: 0.15,
  tempo: 0.15
}
```

**Behavior**:
- Adapts to game state
- Makes well-rounded decisions
- Balances offense and defense
- Suitable for most situations

## Usage Examples

### Basic AI vs Human Game

```typescript
import { GameEngine } from './lib/game-engine/core/GameEngine';
import { createHumanPlayer } from './lib/game-engine/ai/HumanPlayer';
import { createAIPlayer } from './lib/game-engine/ai/AIPlayerFactory';
import { PlayerId } from './lib/game-engine/core/types';

// Create players
const humanPlayer = createHumanPlayer(PlayerId.PLAYER_1, {
  onChooseAction: async (actions, state) => {
    return await showActionMenu(actions);
  },
  // ... other callbacks
});

const aiPlayer = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced');

// Create game
const game = new GameEngine(humanPlayer, aiPlayer);

// Start game
await game.startGame(deck1, deck2);
```

### AI vs AI Game (Testing)

```typescript
import { createAIPlayer } from './lib/game-engine/ai/AIPlayerFactory';

// Create two AI players
const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'hard', 'aggressive');
const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'defensive');

// Create game
const game = new GameEngine(ai1, ai2);

// Start game
await game.startGame(deck1, deck2);

// Game will play automatically to completion
```

### Custom AI Configuration

```typescript
import { createCustomAIPlayer } from './lib/game-engine/ai/AIPlayerFactory';

const customAI = createCustomAIPlayer(PlayerId.PLAYER_2, {
  difficulty: 'medium',
  playStyle: 'aggressive',
  thinkingTime: {
    min: 500,   // Faster decisions
    max: 1500
  },
  randomness: 0.25  // More variation
});
```

### Listening to AI Events

```typescript
import { GameEngine } from './lib/game-engine/core/GameEngine';

const game = new GameEngine(humanPlayer, aiPlayer);

// Listen for AI thinking events
game.on('AI_THINKING_START', (data) => {
  console.log('AI is thinking...');
  showThinkingIndicator();
});

game.on('AI_THINKING_END', (data) => {
  console.log('AI finished thinking');
  hideThinkingIndicator();
});

// Listen for AI action selection
game.on('AI_ACTION_SELECTED', (data) => {
  console.log('AI selected action:', data.action);
  console.log('Evaluation score:', data.score);
  showAIDecision(data);
});
```

## Debugging and Testing

### Debug Mode

Enable debug mode to see detailed AI decision information:

```typescript
import { AIDebugger } from './lib/game-engine/ai/AIDebugger';

// Enable debug mode
const debugger = AIDebugger.getInstance();
debugger.enable();

// Set log level
debugger.setLogLevel('verbose'); // 'none', 'basic', 'verbose'

// AI will now log all decisions and evaluations
```

### Deterministic Mode

Use deterministic mode for reproducible testing:

```typescript
import { AIDebugger } from './lib/game-engine/ai/AIDebugger';

// Enable deterministic mode with fixed seed
const debugger = AIDebugger.getInstance();
debugger.enableDeterministicMode(12345);

// AI will make the same decisions every time with this seed
```

### Metrics Tracking

Track AI performance metrics:

```typescript
import { AIDebugger } from './lib/game-engine/ai/AIDebugger';

const debugger = AIDebugger.getInstance();

// Get metrics
const metrics = debugger.getMetrics();
console.log('Average decision time:', metrics.averageDecisionTime);
console.log('Total decisions:', metrics.totalDecisions);
console.log('Average evaluation score:', metrics.averageEvaluationScore);

// Reset metrics
debugger.resetMetrics();
```

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest';
import { createAIPlayer } from './lib/game-engine/ai/AIPlayerFactory';

describe('AI Player', () => {
  it('should make legal moves', async () => {
    const ai = createAIPlayer(PlayerId.PLAYER_1, 'easy', 'balanced');
    const action = await ai.chooseAction(legalActions, gameState);
    expect(legalActions).toContain(action);
  });
});
```

## Performance

### Performance Targets

- **Simple decisions** (pass, end phase): < 100ms
- **Card play decisions**: < 1000ms
- **Attack decisions**: < 1500ms
- **Complex decisions** (multiple options): < 3000ms
- **Memory usage**: < 50MB additional per AI player

### Optimization Strategies

1. **Action Pruning**: Filters obviously bad actions before evaluation
2. **Shallow Simulation**: Only simulates relevant state changes
3. **Caching**: Caches evaluation results for identical game states
4. **Time Limits**: Implements time-limited evaluation with anytime algorithms
5. **Lazy Evaluation**: Only evaluates actions as needed

### Performance Monitoring

```typescript
import { AIDebugger } from './lib/game-engine/ai/AIDebugger';

const debugger = AIDebugger.getInstance();
debugger.enable();

// Monitor decision times
game.on('AI_ACTION_SELECTED', (data) => {
  console.log('Decision time:', data.decisionTime, 'ms');
});

// Get performance metrics
const metrics = debugger.getMetrics();
console.log('Average decision time:', metrics.averageDecisionTime);
console.log('Max decision time:', metrics.maxDecisionTime);
```

## Error Handling

### Error Types

The AI system defines specific error types for different failure scenarios:

```typescript
class AIDecisionError extends Error {
  constructor(message: string, public context: DecisionContext);
}

class AIEvaluationError extends AIDecisionError {}
class AITimeoutError extends AIDecisionError {}
class AIInvalidActionError extends AIDecisionError {}
```

### Error Recovery

The AI system implements graceful error recovery:

1. **Invalid Action Detection**: Validates all AI-selected actions before execution
2. **Fallback Mechanism**: If evaluation fails, selects random legal action
3. **Timeout Handling**: If decision takes too long, selects first legal action
4. **Logging**: Logs all errors with context for debugging
5. **Graceful Degradation**: Never crashes the game; always provides a valid action

### Error Handling Example

```typescript
try {
  const action = await aiPlayer.chooseAction(legalActions, gameState);
} catch (error) {
  if (error instanceof AITimeoutError) {
    console.error('AI timed out, using fallback');
    // Game engine will use fallback action
  } else if (error instanceof AIEvaluationError) {
    console.error('AI evaluation failed:', error.message);
    // Game engine will use random legal action
  }
}
```

## Advanced Topics

### Custom Evaluation Weights

Create custom evaluation weights for specific strategies:

```typescript
import { ActionEvaluator } from './lib/game-engine/ai/ActionEvaluator';

const customWeights = {
  boardControl: 0.40,      // Heavily prioritize board control
  resourceEfficiency: 0.25,
  lifeDifferential: 0.15,
  cardAdvantage: 0.15,
  tempo: 0.05
};

const evaluator = new ActionEvaluator(customWeights);
```

### Dynamic Strategy Adjustment

Implement custom strategy adjustment logic:

```typescript
import { StrategyManager } from './lib/game-engine/ai/StrategyManager';

const strategy = new StrategyManager();

// Adjust strategy based on game state
const adjustStrategy = (state: GameState, playerId: PlayerId) => {
  const myLife = state.players[playerId].life;
  const opponentLife = state.players[getOpponentId(playerId)].life;
  
  if (myLife < 3) {
    // Desperate situation - go all in
    strategy.setStrategy('aggressive', 'hard');
  } else if (myLife > opponentLife + 5) {
    // Comfortable lead - play safe
    strategy.setStrategy('defensive', 'hard');
  } else {
    // Even game - stay balanced
    strategy.setStrategy('balanced', 'hard');
  }
};
```

## Future Enhancements

Planned improvements for the AI system:

1. **Machine Learning**: Train AI using reinforcement learning
2. **Deck-Specific Strategies**: Adapt AI behavior based on deck archetype
3. **Opponent Modeling**: Learn and adapt to human player patterns
4. **Advanced Lookahead**: Implement minimax or Monte Carlo tree search
5. **Personality Profiles**: Create distinct AI personalities with different play styles
6. **Difficulty Scaling**: Dynamic difficulty adjustment based on player performance

## Contributing

When contributing to the AI system:

1. **Add Tests**: All new features must include unit tests
2. **Document Changes**: Update this README with new features
3. **Performance**: Ensure decisions stay within performance targets
4. **Error Handling**: Implement graceful error recovery
5. **Type Safety**: Maintain full TypeScript type coverage

## License

This AI system is part of the One Piece TCG game engine project.

## Support

For issues, questions, or contributions, please refer to the main project documentation.
