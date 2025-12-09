# Phase System

This directory contains the implementation of the One Piece TCG turn phase system.

## Overview

The phase system orchestrates the execution of turn phases according to the official One Piece TCG rules. Each turn consists of five phases executed in sequence:

1. **Refresh Phase** - Untap cards and return given DON
2. **Draw Phase** - Draw a card
3. **Don Phase** - Place DON cards from don deck
4. **Main Phase** - Play cards, activate effects, attack
5. **End Phase** - Trigger end-of-turn effects

## Architecture

### PhaseManager

The `PhaseManager` class orchestrates turn execution:
- Queries the `RulesContext` for the phase sequence
- Transitions between phases and emits `PHASE_CHANGED` events
- Executes each phase in order
- Handles turn number increment and active player switching
- Emits `TURN_START` and `TURN_END` events

### Phase Functions

Each phase is implemented as a pure function that takes the current state and returns updated state:

```typescript
function runPhase(
  stateManager: GameStateManager,
  rules: RulesContext,
  eventEmitter: EventEmitter
): GameStateManager
```

This functional approach ensures:
- Immutability of game state
- Easy testing of individual phases
- Clear separation of concerns

## Phase Implementations

### RefreshPhase.ts

Implements the Refresh Phase:
- Expires effects with "until start of your next turn" duration (TODO: requires effect system)
- Triggers START_OF_TURN auto effects (TODO: requires effect system)
- Returns all given DON cards to cost area as rested
- Sets all rested cards and DON to active state for the active player

### DrawPhase.ts

Implements the Draw Phase:
- Draws 1 card for the active player
- Skips draw on first turn for the player going first
- Handles deck empty condition by ending the game

### DonPhase.ts

Implements the Don Phase:
- Places DON cards from don deck to cost area as active
- Places 2 DON on normal turns
- Places 1 DON on first turn for the player going first
- Handles empty don deck gracefully

### MainPhase.ts

Implements the Main Phase:
- Triggers START_OF_MAIN auto effects (TODO: requires effect system)
- Action loop for player actions (TODO: requires action handler system)
- Will support: PlayCard, ActivateEffect, GiveDon, Attack, EndMain actions

### EndPhase.ts

Implements the End Phase:
- Triggers END_OF_YOUR_TURN effects for active player (TODO: requires effect system)
- Triggers END_OF_OPPONENT_TURN effects for non-active player (TODO: requires effect system)
- Expires turn-duration effects (TODO: requires modifier system)

## Usage Example

```typescript
import { PhaseManager } from './PhaseManager';
import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';

// Initialize
const rules = new RulesContext();
const eventEmitter = new EventEmitter();
const phaseManager = new PhaseManager(rules, eventEmitter);

// Run a turn
let stateManager = new GameStateManager(initialState);
stateManager = phaseManager.runTurn(stateManager);
```

## Events Emitted

The phase system emits the following events:

- `TURN_START` - When a turn begins
- `PHASE_CHANGED` - When transitioning between phases
- `TURN_END` - When a turn completes
- `CARD_MOVED` - When cards move between zones (e.g., drawing, placing DON)
- `CARD_STATE_CHANGED` - When cards change state (e.g., resting, activating)

## Future Enhancements

Several phase implementations have TODO markers for features that depend on systems not yet implemented:

1. **Effect System Integration** - Triggering auto effects at phase boundaries
2. **Modifier System Integration** - Expiring time-based modifiers
3. **Action Handler System** - Processing player actions during main phase
4. **Player Input System** - Querying players for action choices

These will be implemented in subsequent tasks as the corresponding systems are built.

## Testing

Phase implementations should be tested with:
- Unit tests for individual phase functions
- Integration tests for complete turn flow
- Edge case tests (empty deck, empty don deck, first turn rules)
- Event emission verification

See the test files in the parent directory for examples.
