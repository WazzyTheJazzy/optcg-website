# Effect Scripts System

The Effect Scripts system provides a flexible, TypeScript-based approach to implementing card effects in the One Piece TCG Engine. Effect scripts are functions that receive a context object with helper methods to manipulate game state.

## Overview

Effect scripts are the implementation layer for card effects. Each effect definition in a card's data references a script ID, which maps to a TypeScript function that executes the effect's logic.

## Architecture

### Components

1. **EffectScript**: A function type that takes an `EffectScriptContext` and performs game state modifications
2. **EffectScriptContext**: An extended context object with helper methods for common operations
3. **EffectScriptRegistry**: A registry that maps script IDs to script functions
4. **EffectScriptExecutor**: The main executor that runs scripts with proper context and state management

## EffectScriptContext

The context object passed to effect scripts provides:

### Base Properties
- `state`: Current game state (readonly)
- `source`: The card that is the source of the effect
- `controller`: The player controlling the effect
- `targets`: Array of targets for the effect
- `values`: Map of additional values (e.g., chosen numbers, selected options)
- `event`: The game event that triggered this effect (for auto effects)

### Helper Methods

#### `moveCard(cardId: string, toZone: ZoneId): void`
Move a card to a different zone.

```typescript
// Example: Move a card from hand to trash
ctx.moveCard('card123', ZoneId.TRASH);
```

#### `modifyPower(cardId: string, amount: number, duration: ModifierDuration): void`
Modify a card's power. Amount can be positive (boost) or negative (reduction).

```typescript
// Example: Give +2000 power until end of turn
ctx.modifyPower('card123', 2000, ModifierDuration.UNTIL_END_OF_TURN);
```

#### `modifyCost(cardId: string, amount: number, duration: ModifierDuration): void`
Modify a card's cost. Amount can be positive (increase) or negative (reduction).

```typescript
// Example: Reduce cost by 1 permanently
ctx.modifyCost('card123', -1, ModifierDuration.PERMANENT);
```

#### `drawCards(playerId: PlayerId, count: number): void`
Draw cards for a player.

```typescript
// Example: Draw 2 cards
ctx.drawCards(PlayerId.PLAYER_1, 2);
```

#### `searchZone(playerId: PlayerId, zone: ZoneId, filter: CardFilter): CardInstance[]`
Search a zone for cards matching a filter.

```typescript
// Example: Search deck for red characters with 5000+ power
const cards = ctx.searchZone(PlayerId.PLAYER_1, ZoneId.DECK, {
  colors: ['Red'],
  category: CardCategory.CHARACTER,
  minPower: 5000,
});
```

#### `koCard(cardId: string): void`
K.O. a card (move to trash with proper trigger handling).

```typescript
// Example: K.O. a character
ctx.koCard('card123');
```

#### `restCard(cardId: string): void`
Rest a card (set to RESTED state).

```typescript
// Example: Rest a character
ctx.restCard('card123');
```

#### `activateCard(cardId: string): void`
Activate a card (set to ACTIVE state).

```typescript
// Example: Activate a rested character
ctx.activateCard('card123');
```

## Usage

### Registering Scripts

Scripts are registered with the `EffectScriptRegistry`:

```typescript
const registry = new EffectScriptRegistry();

// Register a simple draw effect
registry.register('draw_two_cards', (ctx) => {
  ctx.drawCards(ctx.controller, 2);
});

// Register a power boost effect
registry.register('power_boost_2000', (ctx) => {
  // Boost the source card's power
  ctx.modifyPower(ctx.source.id, 2000, ModifierDuration.UNTIL_END_OF_TURN);
});

// Register a search effect
registry.register('search_red_character', (ctx) => {
  const cards = ctx.searchZone(ctx.controller, ZoneId.DECK, {
    colors: ['Red'],
    category: CardCategory.CHARACTER,
  });
  
  // Move first matching card to hand
  if (cards.length > 0) {
    ctx.moveCard(cards[0].id, ZoneId.HAND);
  }
});
```

### Executing Scripts

Scripts are executed through the `EffectScriptExecutor`:

```typescript
const executor = new EffectScriptExecutor(
  stateManager,
  zoneManager,
  damageCalculator,
  eventEmitter,
  registry
);

// Execute a script
const baseContext: EffectContext = {
  state: stateManager.getState(),
  source: card,
  controller: PlayerId.PLAYER_1,
  targets: [],
  values: new Map(),
  event: null,
};

executor.executeScript('draw_two_cards', baseContext);
```

## Example Scripts

### On Play: Draw 2 Cards

```typescript
registry.register('on_play_draw_2', (ctx) => {
  ctx.drawCards(ctx.controller, 2);
});
```

### When Attacking: Power Boost

```typescript
registry.register('when_attacking_boost_2000', (ctx) => {
  ctx.modifyPower(ctx.source.id, 2000, ModifierDuration.UNTIL_END_OF_BATTLE);
});
```

### On Play: Search and Add to Hand

```typescript
registry.register('on_play_search_red_5cost', (ctx) => {
  // Search deck for red character with cost 5 or less
  const cards = ctx.searchZone(ctx.controller, ZoneId.DECK, {
    colors: ['Red'],
    category: CardCategory.CHARACTER,
    maxCost: 5,
  });
  
  if (cards.length > 0) {
    // Move first matching card to hand
    ctx.moveCard(cards[0].id, ZoneId.HAND);
  }
});
```

### On K.O.: Add to Hand

```typescript
registry.register('on_ko_add_to_hand', (ctx) => {
  // When this card is K.O.'d, add it to hand instead of trash
  // Note: The card is already in trash at this point
  ctx.moveCard(ctx.source.id, ZoneId.HAND);
});
```

### Activate: K.O. Opponent Character

```typescript
registry.register('activate_ko_opponent_character', (ctx) => {
  // Assuming first target is the character to K.O.
  if (ctx.targets.length > 0 && ctx.targets[0].cardId) {
    ctx.koCard(ctx.targets[0].cardId);
  }
});
```

### Activate: Rest Character and Draw

```typescript
registry.register('activate_rest_and_draw', (ctx) => {
  // Rest this character
  ctx.restCard(ctx.source.id);
  
  // Draw 1 card
  ctx.drawCards(ctx.controller, 1);
});
```

## Error Handling

All helper methods throw `EffectScriptError` if they fail:

```typescript
try {
  ctx.moveCard('nonexistent', ZoneId.TRASH);
} catch (error) {
  if (error instanceof EffectScriptError) {
    console.error('Effect script error:', error.message);
  }
}
```

The executor catches these errors and wraps them with context about which script failed.

## Integration with EffectSystem

The `EffectScriptExecutor` is designed to be used by the `EffectSystem`:

```typescript
class EffectSystem {
  private scriptExecutor: EffectScriptExecutor;
  
  resolveEffect(instance: EffectInstance): void {
    const context = this.createEffectContext(instance);
    this.scriptExecutor.executeScript(
      instance.effectDefinition.scriptId,
      context
    );
  }
}
```

## State Management

The executor maintains references to the state manager and other subsystems. After executing a script:

1. The executor's internal state is updated
2. The zone manager's state reference is updated
3. The updated state manager can be retrieved via `getStateManager()`

External systems should call `updateStateManager()` after making state changes:

```typescript
// After external state change
executor.updateStateManager(newStateManager);
```

## Best Practices

1. **Keep scripts simple**: Each script should do one thing well
2. **Use helper methods**: Don't manipulate state directly
3. **Handle errors gracefully**: Check for null/undefined before operations
4. **Document complex scripts**: Add comments explaining the logic
5. **Test scripts thoroughly**: Write unit tests for each script
6. **Avoid side effects**: Scripts should only modify game state through helpers

## Future Enhancements

Potential future additions to the system:

- **Script composition**: Combine multiple scripts into one
- **Conditional execution**: Built-in condition checking in scripts
- **Script parameters**: Pass parameters to scripts at registration time
- **Script debugging**: Enhanced logging and debugging tools
- **Script validation**: Validate scripts before registration
- **Script hot-reloading**: Update scripts without restarting the engine
