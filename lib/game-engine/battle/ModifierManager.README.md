# ModifierManager

The `ModifierManager` class manages modifiers on cards in the One Piece TCG Engine. It handles adding, removing, and expiring modifiers based on their duration.

## Overview

Modifiers are temporary or permanent changes to card properties such as power, cost, keywords, or attributes. The ModifierManager provides a centralized system for managing these modifiers throughout the game lifecycle.

## Features

- **Add Modifiers**: Apply power, cost, keyword, or attribute modifiers to cards
- **Remove Modifiers**: Remove specific modifiers or filter-based removal
- **Expire Modifiers**: Automatically expire modifiers based on duration (end of turn, end of battle, start of next turn)
- **Query Modifiers**: Get all modifiers or filter by type
- **Clear Modifiers**: Remove all modifiers from a card

## Modifier Durations

The system supports the following modifier durations:

- `PERMANENT`: Never expires automatically
- `UNTIL_END_OF_TURN`: Expires at the end of the current turn
- `DURING_THIS_TURN`: Expires at the end of the current turn (same as UNTIL_END_OF_TURN)
- `UNTIL_END_OF_BATTLE`: Expires when the current battle ends
- `UNTIL_START_OF_NEXT_TURN`: Expires at the start of the owner's next turn

## Modifier Types

- `POWER`: Modifies card power (number value)
- `COST`: Modifies card cost (number value)
- `KEYWORD`: Adds or modifies keywords (string value)
- `ATTRIBUTE`: Adds or modifies attributes (string value)

## Usage

### Creating a ModifierManager

```typescript
import { ModifierManager } from './ModifierManager';
import { GameStateManager } from '../core/GameState';

const stateManager = new GameStateManager(initialState);
const modifierManager = new ModifierManager(stateManager);
```

### Adding Modifiers

```typescript
// Add a permanent power boost
const updatedManager = modifierManager.addModifier(
  'card-id',
  ModifierType.POWER,
  2000,
  ModifierDuration.PERMANENT,
  'source-card-id'
);

// Add a temporary cost reduction
const updatedManager = modifierManager.addModifier(
  'card-id',
  ModifierType.COST,
  -1,
  ModifierDuration.UNTIL_END_OF_TURN,
  'source-card-id'
);

// Add a keyword
const updatedManager = modifierManager.addModifier(
  'card-id',
  ModifierType.KEYWORD,
  'Rush',
  ModifierDuration.PERMANENT,
  'source-card-id'
);
```

### Removing Modifiers

```typescript
// Remove a specific modifier
const updatedManager = modifierManager.removeModifier('card-id', 'modifier-id');

// Remove modifiers matching a filter
const updatedManager = modifierManager.removeModifiersWhere(
  'card-id',
  m => m.type === ModifierType.POWER && m.value < 0
);

// Clear all modifiers
const updatedManager = modifierManager.clearModifiers('card-id');
```

### Expiring Modifiers

```typescript
// Expire modifiers at end of turn
const updatedManager = modifierManager.expireEndOfTurnModifiers();

// Expire modifiers at end of battle
const updatedManager = modifierManager.expireEndOfBattleModifiers();

// Expire modifiers at start of turn for a specific player
const updatedManager = modifierManager.expireStartOfTurnModifiers(PlayerId.PLAYER_1);
```

### Querying Modifiers

```typescript
// Get all modifiers on a card
const modifiers = modifierManager.getModifiers('card-id');

// Get modifiers of a specific type
const powerModifiers = modifierManager.getModifiersByType('card-id', ModifierType.POWER);

// Check if card has any modifiers
const hasModifiers = modifierManager.hasModifiers('card-id');
```

### Updating State Manager

After operations that return an updated state manager, you should update the ModifierManager's reference:

```typescript
let updatedManager = modifierManager.addModifier(
  'card-id',
  ModifierType.POWER,
  1000,
  ModifierDuration.PERMANENT,
  'source'
);

// Update the manager's state reference
modifierManager.updateStateManager(updatedManager);

// Now you can perform another operation
updatedManager = modifierManager.addModifier(
  'card-id',
  ModifierType.COST,
  -1,
  ModifierDuration.UNTIL_END_OF_TURN,
  'source'
);
```

## Integration with Game Engine

The ModifierManager should be integrated into the game engine's phase management:

### End Phase

```typescript
// In EndPhase.ts
const modifierManager = new ModifierManager(stateManager);
stateManager = modifierManager.expireEndOfTurnModifiers();
```

### Refresh Phase

```typescript
// In RefreshPhase.ts
const modifierManager = new ModifierManager(stateManager);
stateManager = modifierManager.expireStartOfTurnModifiers(activePlayer);
```

### Battle System

```typescript
// In BattleSystem.ts - endBattle method
const modifierManager = new ModifierManager(stateManager);
stateManager = modifierManager.expireEndOfBattleModifiers();
```

## Error Handling

The ModifierManager throws `ModifierError` when operations fail:

```typescript
try {
  modifierManager.addModifier(
    'non-existent-card',
    ModifierType.POWER,
    1000,
    ModifierDuration.PERMANENT,
    'source'
  );
} catch (error) {
  if (error instanceof ModifierError) {
    console.error('Modifier operation failed:', error.message);
  }
}
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **12.1**: Power calculation with modifiers (used by DamageCalculator)
- **12.2**: Cost calculation with modifiers (used by DamageCalculator)
- **12.3**: Counter card power boosts (temporary modifiers)
- **12.4**: Modifier expiration at appropriate times

## Related Components

- **DamageCalculator**: Uses modifiers to calculate current power and cost
- **EffectScripts**: Adds modifiers through helper methods
- **BattleSystem**: Expires battle-duration modifiers
- **PhaseManager**: Expires turn-duration modifiers
- **GameState**: Stores modifiers on card instances
