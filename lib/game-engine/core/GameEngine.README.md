# GameEngine

The main orchestrator for the One Piece TCG Engine. This class wires together all subsystems and provides the primary API for game interaction.

## Overview

`GameEngine` is the entry point for using the One Piece TCG Engine. It manages:
- Game lifecycle (setup, turn execution, game completion)
- Action handling (playing cards, activating effects, giving DON, declaring attacks)
- State queries (getting game state, checking legal actions)
- Event emission (subscribing to game events)

## Architecture

The GameEngine coordinates the following subsystems:

- **GameStateManager**: Immutable state container
- **RulesContext**: Rules JSON wrapper
- **BattleSystem**: Combat resolution
- **EffectSystem**: Effect resolution and script execution
- **PhaseManager**: Turn phase orchestration
- **ZoneManager**: Card zone transitions
- **TriggerQueue**: Auto trigger management
- **LoopGuard**: Infinite loop detection
- **EventEmitter**: Game event system

## Usage

### Basic Setup

```typescript
import { GameEngine } from './lib/game-engine/core/GameEngine';
import { PlayerId } from './lib/game-engine/core/types';

// Create engine instance
const engine = new GameEngine();

// Setup game with two decks
engine.setupGame({
  deck1: player1Deck,
  deck2: player2Deck,
  firstPlayerChoice: PlayerId.PLAYER_1,
});

// Run the complete game
const winner = engine.runGame();
console.log(`Winner: ${winner}`);
```

### Manual Turn Execution

```typescript
// Setup game
engine.setupGame({ deck1, deck2 });

// Run turns manually
while (!engine.getState().gameOver) {
  engine.runTurn();
  
  // Check game state between turns
  const state = engine.getState();
  console.log(`Turn ${state.turnNumber}, Active: ${state.activePlayer}`);
}
```

### Action Handling

```typescript
// Play a card from hand
const success = engine.playCard(
  PlayerId.PLAYER_1,
  cardId,
  targets
);

// Activate an effect
engine.activateEffect(
  PlayerId.PLAYER_1,
  cardId,
  effectId,
  targets,
  values
);

// Give DON to a character
engine.giveDon(
  PlayerId.PLAYER_1,
  donId,
  targetCardId
);

// Declare an attack
engine.declareAttack(
  PlayerId.PLAYER_1,
  attackerId,
  targetId
);
```

### State Queries

```typescript
// Get current game state
const state = engine.getState();

// Check if action is legal
const canPlay = engine.canPerformAction(PlayerId.PLAYER_1, {
  type: ActionType.PLAY_CARD,
  playerId: PlayerId.PLAYER_1,
  data: { cardId: 'card-123' },
});

// Get all legal actions for a player
const legalActions = engine.getLegalActions(PlayerId.PLAYER_1);
```

### Event Subscription

```typescript
// Subscribe to turn start events
engine.on('TURN_START', (event) => {
  console.log(`Turn ${event.turnNumber} started`);
});

// Subscribe to attack events
engine.on('ATTACK_DECLARED', (event) => {
  console.log(`${event.attackerId} attacks ${event.targetId}`);
});

// Subscribe to game over events
engine.on('GAME_OVER', (event) => {
  console.log(`Game over! Winner: ${event.winner}`);
});

// Unsubscribe from events
const handler = (event) => { /* ... */ };
engine.on('PHASE_CHANGED', handler);
engine.off('PHASE_CHANGED', handler);
```

## API Reference

### Constructor

```typescript
constructor(rules?: RulesContext, scriptRegistry?: EffectScriptRegistry)
```

Creates a new GameEngine instance with optional custom rules and effect scripts.

### Game Lifecycle Methods

#### `setupGame(config: GameSetupConfig): void`

Setup a new game with the provided decks and configuration.

**Parameters:**
- `config.deck1`: Array of card definitions for player 1
- `config.deck2`: Array of card definitions for player 2
- `config.firstPlayerChoice`: Optional explicit first player choice
- `config.player1Mulligan`: Whether player 1 takes a mulligan
- `config.player2Mulligan`: Whether player 2 takes a mulligan
- `config.randomSeed`: Optional seed for deterministic randomness

**Throws:** `GameSetupError` if setup fails

#### `runGame(): PlayerId | null`

Run the complete game until it's over.

**Returns:** The winning player ID or null for a draw

**Throws:** `GameEngineError` if game is not setup

#### `runTurn(): void`

Run a single turn through all phases.

**Throws:** `GameEngineError` if game is not setup or is over

### Action Handler Methods

#### `playCard(playerId: PlayerId, cardId: string, targets?: Target[]): boolean`

Play a card from hand.

**Returns:** True if the card was successfully played

**Throws:** `GameEngineError` if the action is invalid

#### `activateEffect(playerId: PlayerId, cardId: string, effectId: string, targets?: Target[], values?: Map<string, any>): boolean`

Activate an effect on a card.

**Returns:** True if the effect was successfully activated

**Throws:** `GameEngineError` if the action is invalid

#### `giveDon(playerId: PlayerId, donId: string, targetCardId: string): boolean`

Give a DON card to a character or leader.

**Returns:** True if the DON was successfully given

**Throws:** `GameEngineError` if the action is invalid

#### `declareAttack(playerId: PlayerId, attackerId: string, targetId: string): boolean`

Declare an attack.

**Returns:** True if the attack was successfully executed

**Throws:** `GameEngineError` if the action is invalid

### State Query Methods

#### `getState(): Readonly<GameState>`

Get the current game state (readonly).

#### `canPerformAction(playerId: PlayerId, action: Action): boolean`

Check if a player can perform a specific action.

#### `getLegalActions(playerId: PlayerId): Action[]`

Get all legal actions for a player.

### Event System Methods

#### `on<T extends AnyGameEvent>(eventType: T['type'], handler: EventHandler<T>): void`

Subscribe to a game event.

#### `off<T extends AnyGameEvent>(eventType: T['type'], handler: EventHandler<T>): void`

Unsubscribe from a game event.

### Utility Methods

#### `getRules(): RulesContext`

Get the rules context.

#### `getEventEmitter(): EventEmitter`

Get the event emitter.

#### `isGameSetup(): boolean`

Check if the game is setup.

## Error Handling

The GameEngine throws specific errors for different failure scenarios:

- **GameEngineError**: General engine operation failures
- **GameSetupError**: Game setup failures (invalid decks, etc.)

All action methods validate:
1. Game is setup
2. Game is not over
3. Player is the active player
4. Action is legal

## Implementation Notes

### State Management

The GameEngine maintains immutable state through the GameStateManager. All state updates create new state objects, enabling:
- Undo/replay functionality
- Time-travel debugging
- Safe concurrent access

### Subsystem Coordination

After any state-changing operation, the engine:
1. Updates all subsystems with the new state
2. Resolves pending triggers
3. Runs defeat checks
4. Updates subsystems again if needed

### Loop Detection

The engine tracks repeated game states using the LoopGuard. When a state repeats too many times:
1. Apply official infinite loop resolution rules
2. Determine winner based on who can stop the loop
3. Force game over if unresolvable

### Event Emission

The engine emits events for all significant game actions:
- Turn start/end
- Phase changes
- Card movements
- Attacks and blocks
- Game over

These events enable:
- UI updates
- Animation triggers
- Game logging
- Replay systems

## Testing

The GameEngine includes comprehensive tests covering:
- Constructor and initialization
- Game setup with valid/invalid decks
- State queries
- Event subscription/unsubscription
- Action validation

Run tests with:
```bash
npx vitest run lib/game-engine/core/GameEngine.test.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **1.1**: Core game engine manages complete game state
- **3.1**: Turn structure execution through PhaseManager
- **11.1**: Rules context system for rule queries

## Related Components

- [GameState](./GameState.ts) - Immutable state container
- [RulesContext](../rules/RulesContext.ts) - Rules JSON wrapper
- [BattleSystem](../battle/BattleSystem.ts) - Combat resolution
- [EffectSystem](../effects/EffectSystem.ts) - Effect resolution
- [PhaseManager](../phases/PhaseManager.ts) - Turn phase orchestration
- [GameSetup](../setup/GameSetup.ts) - Game initialization
