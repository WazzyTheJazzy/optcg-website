# Game Setup Module

This module handles the initialization of a One Piece TCG game, including deck loading, validation, and all setup procedures.

## Features

### Deck Validation
- Validates deck composition (50 cards + 1 leader + 10 DON)
- Ensures leader has a life value
- Checks all required components are present

### Game Setup Process
1. **Deck Loading**: Loads both players' decks into the game state
2. **First Player Selection**: Random or explicit choice
3. **Deck Shuffling**: Randomizes deck order
4. **Opening Draw**: Each player draws 5 cards
5. **Mulligan**: Optional mulligan for either player
6. **Life Placement**: Places life cards based on leader's life value
7. **Start of Game Effects**: Marks leaders with START_OF_GAME effects for resolution

## Usage

```typescript
import { setupGame, GameSetupConfig } from './GameSetup';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';

const rules = new RulesContext();
const eventEmitter = new EventEmitter();

const config: GameSetupConfig = {
  deck1: [...], // Array of CardDefinition
  deck2: [...], // Array of CardDefinition
  firstPlayerChoice: PlayerId.PLAYER_1, // Optional
  player1Mulligan: false, // Optional
  player2Mulligan: false, // Optional
  randomSeed: 12345, // Optional, for deterministic tests
};

const result = setupGame(config, rules, eventEmitter);

// result contains:
// - stateManager: GameStateManager with initialized game state
// - zoneManager: ZoneManager for card movement
// - firstPlayer: PlayerId of the first player
```

## Deck Validation

```typescript
import { validateDeck } from './GameSetup';

const validation = validateDeck(deck, rules);

if (!validation.valid) {
  console.error('Deck errors:', validation.errors);
}
```

## Implementation Details

### Card Instance Creation
- Each card in the deck gets a unique instance ID
- Cards are placed in appropriate zones (deck, leader area, DON deck)
- Initial card state is set based on zone

### Mulligan System
- Returns all cards from hand to deck
- Shuffles the deck
- Draws 5 new cards

### Life Placement
- Takes cards from the top of the deck
- Moves them to the life zone
- Number of cards equals leader's life value

### Start of Game Effects
- Scans leader cards for START_OF_GAME trigger timing
- Marks leaders with a flag for effect resolution
- Actual effect resolution is handled by the EffectSystem

## Error Handling

The module throws `GameSetupError` for:
- Invalid deck composition
- Missing leaders or incorrect life values
- Insufficient cards for setup procedures
- Player not found errors

## Testing

The module includes comprehensive tests covering:
- Deck validation (valid and invalid cases)
- Game setup with various configurations
- Mulligan functionality
- Life placement
- First player selection
- Start of game effect marking

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **4.1**: Random first player selection with optional explicit choice
- **4.2**: Opening draw of 5 cards per player
- **4.3**: Mulligan system (return hand to deck, shuffle, draw 5)
- **4.4**: Life placement based on leader's life value
- **4.5**: Application of "Start of Game" leader effects (marking for resolution)

## Dependencies

- `GameStateManager`: For state management
- `RulesContext`: For game rules queries
- `EventEmitter`: For emitting game events
- `ZoneManager`: For card movement operations
