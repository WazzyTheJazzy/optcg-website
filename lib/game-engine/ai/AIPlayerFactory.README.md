# AI Player Factory

Factory functions and utilities for creating AI players with various configurations.

## Overview

The AI Player Factory provides easy-to-use functions for creating AI opponents with different difficulty levels, play styles, and configurations. It simplifies the process of setting up AI players for games.

## Quick Start

### Basic Usage

```typescript
import { createAIPlayer, createEasyAI, createMediumAI, createHardAI } from '@/lib/game-engine/ai';
import { PlayerId } from '@/lib/game-engine/core/types';

// Create a medium difficulty AI with balanced play style (default)
const ai = createAIPlayer(PlayerId.PLAYER_2);

// Create an easy AI for beginners
const easyAI = createEasyAI(PlayerId.PLAYER_2);

// Create a hard AI for experienced players
const hardAI = createHardAI(PlayerId.PLAYER_2);
```

### Custom Play Styles

```typescript
import { createAIPlayer } from '@/lib/game-engine/ai';

// Create an aggressive AI that prioritizes attacking
const aggressiveAI = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'aggressive');

// Create a defensive AI that focuses on board control
const defensiveAI = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive');

// Create a balanced AI that adapts to game state
const balancedAI = createAIPlayer(PlayerId.PLAYER_2, 'hard', 'balanced');
```

### Using Presets

```typescript
import { createAIFromPreset, AI_PRESETS } from '@/lib/game-engine/ai';

// Create a tutorial AI for learning the game
const tutorialAI = createAIFromPreset(PlayerId.PLAYER_2, 'TUTORIAL');

// Create a competitive AI for practice
const competitiveAI = createAIFromPreset(PlayerId.PLAYER_2, 'COMPETITIVE');

// Create a quick-play AI with faster thinking time
const quickAI = createAIFromPreset(PlayerId.PLAYER_2, 'QUICK_PLAY');

// Create an aggressive AI
const aggroAI = createAIFromPreset(PlayerId.PLAYER_2, 'AGGRO');

// Create a defensive control AI
const controlAI = createAIFromPreset(PlayerId.PLAYER_2, 'CONTROL');
```

### Custom Configuration

```typescript
import { createCustomAIPlayer, createCustomConfig } from '@/lib/game-engine/ai';
import type { AIPlayerConfig } from '@/lib/game-engine/ai';

// Create a fully custom configuration
const customConfig: AIPlayerConfig = {
  difficulty: 'hard',
  playStyle: 'aggressive',
  thinkingTime: {
    min: 500,
    max: 2000,
  },
  randomness: 0.1,
};

const customAI = createCustomAIPlayer(PlayerId.PLAYER_2, customConfig);

// Or modify a default configuration
const modifiedConfig = createCustomConfig('medium', {
  thinkingTime: { min: 300, max: 800 },
  randomness: 0.2,
});

const modifiedAI = createCustomAIPlayer(PlayerId.PLAYER_2, modifiedConfig);
```

## API Reference

### Factory Functions

#### `createAIPlayer(playerId, difficulty?, playStyle?, eventEmitter?)`

Create an AI player with specified difficulty and play style.

**Parameters:**
- `playerId: PlayerId` - The player ID for the AI
- `difficulty?: DifficultyLevel` - Difficulty level (default: 'medium')
- `playStyle?: PlayStyle` - Play style (default: 'balanced')
- `eventEmitter?: EventEmitter` - Optional event emitter for AI action events

**Returns:** `AIPlayer`

#### `createEasyAI(playerId, playStyle?, eventEmitter?)`

Create an easy difficulty AI opponent.

**Parameters:**
- `playerId: PlayerId` - The player ID for the AI
- `playStyle?: PlayStyle` - Play style (default: 'balanced')
- `eventEmitter?: EventEmitter` - Optional event emitter

**Returns:** `AIPlayer`

#### `createMediumAI(playerId, playStyle?, eventEmitter?)`

Create a medium difficulty AI opponent.

**Parameters:**
- `playerId: PlayerId` - The player ID for the AI
- `playStyle?: PlayStyle` - Play style (default: 'balanced')
- `eventEmitter?: EventEmitter` - Optional event emitter

**Returns:** `AIPlayer`

#### `createHardAI(playerId, playStyle?, eventEmitter?)`

Create a hard difficulty AI opponent.

**Parameters:**
- `playerId: PlayerId` - The player ID for the AI
- `playStyle?: PlayStyle` - Play style (default: 'balanced')
- `eventEmitter?: EventEmitter` - Optional event emitter

**Returns:** `AIPlayer`

#### `createCustomAIPlayer(playerId, config, eventEmitter?)`

Create an AI player with custom configuration.

**Parameters:**
- `playerId: PlayerId` - The player ID for the AI
- `config: AIPlayerConfig` - Custom AI configuration
- `eventEmitter?: EventEmitter` - Optional event emitter

**Returns:** `AIPlayer`

#### `createAIFromPreset(playerId, presetName, eventEmitter?)`

Create an AI player from a preset configuration.

**Parameters:**
- `playerId: PlayerId` - The player ID for the AI
- `presetName: keyof typeof AI_PRESETS` - Name of the preset
- `eventEmitter?: EventEmitter` - Optional event emitter

**Returns:** `AIPlayer`

### Configuration Utilities

#### `getDefaultConfig(difficulty, playStyle?)`

Get default configuration for a difficulty level and play style.

**Parameters:**
- `difficulty: DifficultyLevel` - Difficulty level
- `playStyle?: PlayStyle` - Play style (default: 'balanced')

**Returns:** `AIPlayerConfig`

#### `createCustomConfig(difficulty, overrides)`

Create a custom configuration by modifying a default configuration.

**Parameters:**
- `difficulty: DifficultyLevel` - Base difficulty level
- `overrides: Partial<AIPlayerConfig>` - Configuration overrides

**Returns:** `AIPlayerConfig`

#### `validateConfig(config)`

Validate AI configuration.

**Parameters:**
- `config: AIPlayerConfig` - Configuration to validate

**Returns:** `boolean` - True if valid

**Throws:** `Error` if configuration is invalid

#### `getConfigSummary(config)`

Get configuration summary as a human-readable string.

**Parameters:**
- `config: AIPlayerConfig` - Configuration to summarize

**Returns:** `string` - Human-readable summary

### Information Functions

#### `getAvailableDifficulties()`

Get all available difficulty levels.

**Returns:** `DifficultyLevel[]` - Array of difficulty levels

#### `getAvailablePlayStyles()`

Get all available play styles.

**Returns:** `PlayStyle[]` - Array of play styles

#### `getDifficultyDescription(difficulty)`

Get description of a difficulty level.

**Parameters:**
- `difficulty: DifficultyLevel` - Difficulty level

**Returns:** `string` - Human-readable description

#### `getPlayStyleDescription(playStyle)`

Get description of a play style.

**Parameters:**
- `playStyle: PlayStyle` - Play style

**Returns:** `string` - Human-readable description

#### `getAvailablePresets()`

Get all available preset names.

**Returns:** `Array<keyof typeof AI_PRESETS>` - Array of preset names

#### `getPresetDescription(presetName)`

Get description of a preset configuration.

**Parameters:**
- `presetName: keyof typeof AI_PRESETS` - Preset name

**Returns:** `string` - Human-readable description

## Configuration Options

### Difficulty Levels

- **easy**: Makes suboptimal decisions 30% of the time. Good for beginners.
- **medium**: Makes near-optimal decisions with occasional mistakes. Balanced challenge.
- **hard**: Consistently makes optimal decisions. Challenging for experienced players.

### Play Styles

- **aggressive**: Prioritizes dealing damage and attacking. Takes more risks.
- **defensive**: Focuses on board control and protecting life total. Plays conservatively.
- **balanced**: Balances offense and defense. Adapts to game state.

### Presets

- **TUTORIAL**: Beginner-friendly AI for learning the game
- **QUICK_PLAY**: Medium difficulty with faster thinking time
- **COMPETITIVE**: Challenging AI for competitive practice
- **AGGRO**: Aggressive AI that prioritizes attacking
- **CONTROL**: Defensive AI that focuses on board control

## Integration with Game Engine

```typescript
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { createHardAI } from '@/lib/game-engine/ai';
import { createHumanPlayer } from '@/lib/game-engine/ai';
import { PlayerId } from '@/lib/game-engine/core/types';

// Create players
const humanPlayer = createHumanPlayer(PlayerId.PLAYER_1, {
  // UI callbacks for human player decisions
  onChooseAction: async (actions, state) => {
    // Show UI and wait for user input
    return await showActionUI(actions, state);
  },
  // ... other callbacks
});

const aiPlayer = createHardAI(PlayerId.PLAYER_2, 'aggressive');

// Initialize game engine with both players
const gameEngine = new GameEngine(
  humanPlayer,
  aiPlayer,
  player1Deck,
  player2Deck
);

// Start the game
await gameEngine.startGame();
```

## Event Handling

AI players emit events during decision-making that can be used for UI feedback:

```typescript
import { EventEmitter, GameEventType } from '@/lib/game-engine/rendering/EventEmitter';
import { createHardAI } from '@/lib/game-engine/ai';

const eventEmitter = new EventEmitter();

// Listen for AI thinking events
eventEmitter.on(GameEventType.AI_THINKING_START, (event) => {
  console.log(`AI is thinking about ${event.decisionType}...`);
  // Show thinking indicator in UI
});

eventEmitter.on(GameEventType.AI_THINKING_END, (event) => {
  console.log(`AI finished thinking (${event.thinkingTimeMs}ms)`);
  // Hide thinking indicator
});

eventEmitter.on(GameEventType.AI_ACTION_SELECTED, (event) => {
  console.log(`AI selected: ${event.decisionType}`, event.selectedOption);
  // Show AI decision in UI
});

// Create AI with event emitter
const ai = createHardAI(PlayerId.PLAYER_2, 'balanced', eventEmitter);
```

## Best Practices

1. **Use presets for common scenarios**: Presets provide well-tested configurations for typical use cases.

2. **Match difficulty to player skill**: Start with easy AI for new players and increase difficulty as they improve.

3. **Use event emitters for UI feedback**: Connect AI events to your UI to show thinking indicators and decisions.

4. **Validate custom configurations**: Always validate custom configurations to catch errors early.

5. **Consider thinking time**: Adjust thinking time based on your game's pacing needs. Shorter times for quick games, longer for more realistic AI behavior.

## Examples

### Dynamic Difficulty Selection

```typescript
import { createAIPlayer, getAvailableDifficulties } from '@/lib/game-engine/ai';

function createAIForPlayer(playerId: PlayerId, playerSkillLevel: number) {
  const difficulties = getAvailableDifficulties();
  const difficulty = difficulties[Math.min(playerSkillLevel, difficulties.length - 1)];
  
  return createAIPlayer(playerId, difficulty);
}
```

### Configuration UI

```typescript
import {
  getAvailableDifficulties,
  getAvailablePlayStyles,
  getDifficultyDescription,
  getPlayStyleDescription,
  createAIPlayer,
} from '@/lib/game-engine/ai';

function AIConfigurationUI() {
  const difficulties = getAvailableDifficulties();
  const playStyles = getAvailablePlayStyles();
  
  return (
    <div>
      <select name="difficulty">
        {difficulties.map(diff => (
          <option key={diff} value={diff} title={getDifficultyDescription(diff)}>
            {diff}
          </option>
        ))}
      </select>
      
      <select name="playStyle">
        {playStyles.map(style => (
          <option key={style} value={style} title={getPlayStyleDescription(style)}>
            {style}
          </option>
        ))}
      </select>
    </div>
  );
}
```

## See Also

- [AI System README](./README.md) - Overview of the AI system
- [AIPlayer](./AIPlayer.ts) - AI player implementation
- [HumanPlayer](./HumanPlayer.ts) - Human player implementation
- [Types](./types.ts) - Type definitions
