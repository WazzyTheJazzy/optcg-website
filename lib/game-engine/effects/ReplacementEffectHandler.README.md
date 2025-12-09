# ReplacementEffectHandler

The `ReplacementEffectHandler` manages replacement effects that modify costs and effect bodies before they are processed. This allows cards to change how other effects work in the game.

## Overview

Replacement effects are special effects with `EffectTimingType.REPLACEMENT` that can:
- Modify cost expressions before they are paid
- Modify effect instances before they are resolved

## Requirements

This implementation satisfies the following requirements:

- **Requirement 15.1**: WHEN an effect cost is being paid, THE Game Engine SHALL apply any active cost replacement effects before payment
- **Requirement 15.2**: WHEN an effect body is being resolved, THE Game Engine SHALL apply any active body replacement effects before execution
- **Requirement 15.3**: THE Game Engine SHALL support REPLACEMENT timing type for effects that modify other effects

## Usage

### Basic Setup

```typescript
import { ReplacementEffectHandler } from './ReplacementEffectHandler';
import { GameStateManager } from '../core/GameState';

const stateManager = new GameStateManager(initialState);
const handler = new ReplacementEffectHandler(stateManager);
```

### Registering Cost Replacement Effects

Cost replacement effects modify the cost of an effect before it is paid:

```typescript
// Define a cost replacement function that reduces cost by 1
const costReplacement = (cost: CostExpr, context: EffectContext): CostExpr => {
  if (cost.type === 'REST_DON' && cost.amount) {
    return {
      ...cost,
      amount: Math.max(0, cost.amount - 1), // Reduce by 1, minimum 0
    };
  }
  return cost;
};

// Register the replacement effect
handler.registerReplacementEffect(
  cardId,
  effectDefinition,
  0, // priority (lower numbers apply first)
  costReplacement
);
```

### Registering Body Replacement Effects

Body replacement effects modify the effect instance before it is resolved:

```typescript
// Define a body replacement function that doubles draw amounts
const bodyReplacement = (
  instance: EffectInstance,
  context: EffectContext
): EffectInstance => {
  const amount = instance.values.get('amount') || 0;
  const newValues = new Map(instance.values);
  newValues.set('amount', amount * 2);
  
  return {
    ...instance,
    values: newValues,
  };
};

// Register the replacement effect
handler.registerReplacementEffect(
  cardId,
  effectDefinition,
  0, // priority
  undefined, // no cost replacement
  bodyReplacement
);
```

### Applying Replacement Effects

The `EffectSystem` automatically applies replacement effects when processing effects:

```typescript
// Cost replacements are applied in activateEffect
const modifiedCost = handler.applyCostReplacementEffects(
  originalCost,
  context
);

// Body replacements are applied in resolveEffect
const modifiedInstance = handler.applyBodyReplacementEffects(
  originalInstance,
  context
);
```

### Priority Ordering

When multiple replacement effects are active, they are applied in priority order (lower numbers first):

```typescript
// This will apply first (priority 0)
handler.registerReplacementEffect(cardId1, effectDef1, 0, costReplacement1);

// This will apply second (priority 1)
handler.registerReplacementEffect(cardId2, effectDef2, 1, costReplacement2);

// This will apply third (priority 2)
handler.registerReplacementEffect(cardId3, effectDef3, 2, costReplacement3);
```

### Managing Replacement Effects

```typescript
// Unregister a specific replacement effect
handler.unregisterReplacementEffect(cardId, effectId);

// Clear all replacement effects from a card
handler.clearReplacementEffectsFromCard(cardId);

// Clear all replacement effects
handler.clearAllReplacementEffects();

// Get all active replacement effects
const activeReplacements = handler.getActiveReplacementEffects();
```

## Active Replacement Effect Conditions

Replacement effects are only applied when:

1. The source card still exists in the game state
2. The source card is in an active zone (LEADER_AREA, CHARACTER_AREA, or STAGE_AREA)
3. The replacement function exists (costReplacement or bodyReplacement)

## Integration with EffectSystem

The `ReplacementEffectHandler` is integrated into the `EffectSystem`:

```typescript
const effectSystem = new EffectSystem(
  stateManager,
  eventEmitter,
  zoneManager,
  scriptRegistry,
  replacementHandler // optional, creates default if not provided
);

// Access the replacement handler
const handler = effectSystem.getReplacementHandler();
```

## Example: Cost Reduction Card

Here's a complete example of a card that reduces the cost of all effects by 1:

```typescript
// Card definition with replacement effect
const costReducerCard: CardDefinition = {
  id: 'cost-reducer',
  name: 'Cost Reducer',
  category: CardCategory.CHARACTER,
  // ... other properties
  effects: [
    {
      id: 'cost-reduction',
      label: '[Replacement]',
      timingType: EffectTimingType.REPLACEMENT,
      triggerTiming: null,
      condition: null,
      cost: null,
      scriptId: 'reduce-cost',
      oncePerTurn: false,
    },
  ],
};

// Register the replacement effect when the card enters play
const costReplacement = (cost: CostExpr): CostExpr => {
  if (cost.type === 'REST_DON' && cost.amount) {
    return { ...cost, amount: Math.max(0, cost.amount - 1) };
  }
  return cost;
};

handler.registerReplacementEffect(
  cardInstance.id,
  cardInstance.definition.effects[0],
  0,
  costReplacement
);

// Now all effects will cost 1 less DON to activate
```

## Example: Effect Doubling Card

Here's an example of a card that doubles the effect of draw effects:

```typescript
// Card definition with replacement effect
const drawDoublerCard: CardDefinition = {
  id: 'draw-doubler',
  name: 'Draw Doubler',
  category: CardCategory.STAGE,
  // ... other properties
  effects: [
    {
      id: 'double-draw',
      label: '[Replacement]',
      timingType: EffectTimingType.REPLACEMENT,
      triggerTiming: null,
      condition: null,
      cost: null,
      scriptId: 'double-draw-effects',
      oncePerTurn: false,
    },
  ],
};

// Register the replacement effect
const bodyReplacement = (instance: EffectInstance): EffectInstance => {
  // Only double draw effects
  if (instance.effectDefinition.scriptId.includes('draw')) {
    const amount = instance.values.get('amount') || 0;
    const newValues = new Map(instance.values);
    newValues.set('amount', amount * 2);
    return { ...instance, values: newValues };
  }
  return instance;
};

handler.registerReplacementEffect(
  cardInstance.id,
  cardInstance.definition.effects[0],
  0,
  undefined,
  bodyReplacement
);

// Now all draw effects will draw twice as many cards
```

## Testing

The replacement effect handler includes comprehensive tests covering:

- Cost replacement effects
- Body replacement effects
- Multiple replacement effects with priority ordering
- Registration and unregistration
- Active zone validation
- Priority sorting

Run tests with:

```bash
npm test -- ReplacementEffectHandler.test.ts
```

## Notes

- Replacement effects only work while the source card is on the field (in LEADER_AREA, CHARACTER_AREA, or STAGE_AREA)
- Multiple replacement effects are applied in priority order (lower numbers first)
- Replacement effects can be chained - the output of one becomes the input of the next
- The handler automatically filters out inactive replacement effects when applying them
- State manager updates should be propagated to the handler using `updateStateManager()`
