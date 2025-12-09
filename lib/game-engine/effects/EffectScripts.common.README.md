# Common Effect Scripts

This document describes the common effect scripts available in the One Piece TCG Engine. These scripts implement frequently used card effects and can be referenced by their script IDs in card definitions.

## Overview

Common effect scripts are pre-implemented effect functions that handle typical card abilities. They are registered via the `registerCommonEffectScripts()` function and can be used by referencing their script ID in a card's `EffectDefinition`.

## Usage

```typescript
import { EffectScriptRegistry, registerCommonEffectScripts } from './EffectScripts';

// Create registry and register all common scripts
const registry = new EffectScriptRegistry();
registerCommonEffectScripts(registry);

// Use in card definitions
const card: CardDefinition = {
  // ... other properties
  effects: [
    {
      id: 'effect_1',
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      scriptId: 'draw_2', // Reference common script
      // ... other properties
    }
  ]
};
```

## Available Scripts

### Draw Effects

Draw cards from the deck.

| Script ID | Description | Parameters |
|-----------|-------------|------------|
| `draw_1` | Draw 1 card | None |
| `draw_2` | Draw 2 cards | None |
| `draw_3` | Draw 3 cards | None |

**Example Usage:**
```typescript
{
  label: '[On Play]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.ON_PLAY,
  scriptId: 'draw_2'
}
```

### Power Boost Effects

Modify a card's power value.

| Script ID | Description | Duration | Target Required |
|-----------|-------------|----------|-----------------|
| `power_boost_1000` | +1000 power | Permanent | Yes |
| `power_boost_2000` | +2000 power | Permanent | Yes |
| `power_boost_3000` | +3000 power | Permanent | Yes |
| `power_boost_1000_until_end_of_turn` | +1000 power | Until end of turn | Yes |
| `power_boost_2000_until_end_of_turn` | +2000 power | Until end of turn | Yes |
| `power_boost_1000_during_battle` | +1000 power | During battle | No (uses source) |
| `power_boost_2000_during_battle` | +2000 power | During battle | No (uses source) |

**Example Usage:**
```typescript
// Permanent boost to target
{
  label: '[On Play]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.ON_PLAY,
  scriptId: 'power_boost_2000'
}

// Boost during battle (for "When Attacking" effects)
{
  label: '[When Attacking]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.WHEN_ATTACKING,
  scriptId: 'power_boost_2000_during_battle'
}
```

### Cost Reduction Effects

Reduce a card's cost.

| Script ID | Description | Target Required |
|-----------|-------------|-----------------|
| `cost_reduction_1` | -1 cost | Yes |
| `cost_reduction_2` | -2 cost | Yes |
| `cost_reduction_3` | -3 cost | Yes |

**Example Usage:**
```typescript
{
  label: '[Activate: Main]',
  timingType: EffectTimingType.ACTIVATE,
  scriptId: 'cost_reduction_2'
}
```

### Search Effects

Search the deck for specific cards.

| Script ID | Description | Filter |
|-----------|-------------|--------|
| `search_deck_character` | Search for a character | Category: CHARACTER |
| `search_deck_event` | Search for an event | Category: EVENT |
| `search_deck_stage` | Search for a stage | Category: STAGE |
| `search_deck_cost_4_or_less` | Search for cost 4 or less | Max cost: 4 |
| `search_deck_cost_5_or_less` | Search for cost 5 or less | Max cost: 5 |

**Example Usage:**
```typescript
{
  label: '[On Play]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.ON_PLAY,
  scriptId: 'search_deck_character'
}
```

**Note:** Search effects automatically add the first matching card to hand. In a full implementation, these would typically present choices to the player.

### K.O. Effects

K.O. (knock out) characters, moving them to trash.

| Script ID | Description | Target Required | Restrictions |
|-----------|-------------|-----------------|--------------|
| `ko_target_character` | K.O. target character | Yes | None |
| `ko_rested_character` | K.O. rested character | Yes | Must be rested |
| `ko_cost_3_or_less` | K.O. cost 3 or less | Yes | Cost ≤ 3 |
| `ko_cost_4_or_less` | K.O. cost 4 or less | Yes | Cost ≤ 4 |

**Example Usage:**
```typescript
{
  label: '[Main]',
  timingType: EffectTimingType.ACTIVATE,
  scriptId: 'ko_cost_4_or_less'
}
```

### Rest/Activate Effects

Change card states between ACTIVE and RESTED.

| Script ID | Description | Target Required |
|-----------|-------------|-----------------|
| `rest_target_character` | Rest target character | Yes |
| `rest_all_opponent_characters` | Rest all opponent's characters | No |
| `activate_target_character` | Activate target character | Yes |

**Example Usage:**
```typescript
{
  label: '[On Play]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.ON_PLAY,
  scriptId: 'rest_target_character'
}
```

### On K.O. Effects

Effects that trigger when a card is K.O.'d.

| Script ID | Description |
|-----------|-------------|
| `on_ko_search_deck` | Search deck when K.O.'d |
| `on_ko_add_to_hand_from_trash` | Return to hand from trash |
| `on_ko_draw_1` | Draw 1 card when K.O.'d |

**Example Usage:**
```typescript
{
  label: '[On K.O.]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.ON_KO,
  scriptId: 'on_ko_search_deck'
}
```

### When Attacking Effects

Effects that trigger when a card attacks.

| Script ID | Description |
|-----------|-------------|
| `when_attacking_power_boost_1000` | +1000 power during battle |
| `when_attacking_power_boost_2000` | +2000 power during battle |
| `when_attacking_draw_1` | Draw 1 card when attacking |

**Example Usage:**
```typescript
{
  label: '[When Attacking]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.WHEN_ATTACKING,
  scriptId: 'when_attacking_power_boost_2000'
}
```

## Target Requirements

Some effects require targets to be specified:

- **Power boost effects** (except "during battle" variants): Require a target card
- **Cost reduction effects**: Require a target card
- **K.O. effects**: Require a target character
- **Rest/Activate single target**: Require a target character

Effects that don't require targets:
- **Draw effects**: Automatically draw for the controller
- **Search effects**: Automatically search controller's deck
- **"During battle" power boosts**: Automatically boost the source card
- **Rest all effects**: Automatically affect all valid targets

## Creating Custom Scripts

While common scripts cover many use cases, you can create custom scripts for unique effects:

```typescript
import { EffectScript, EffectScriptContext } from './EffectScripts';

const customScript: EffectScript = (context: EffectScriptContext) => {
  // Your custom effect logic
  context.drawCards(context.controller, 1);
  context.modifyPower(context.source.id, 1000, ModifierDuration.UNTIL_END_OF_TURN);
};

// Register custom script
executor.registerScript('custom_draw_and_boost', customScript);
```

## Error Handling

All effect scripts throw `EffectScriptError` when:
- Required targets are missing
- Target validation fails (e.g., cost too high, not rested)
- Cards are not found
- Operations fail (e.g., deck is empty for draw)

These errors should be caught and handled by the EffectSystem.

## Implementation Notes

1. **State Updates**: All helper methods update the game state immutably
2. **Zone Manager Sync**: State changes are synchronized with the ZoneManager
3. **Event Emission**: Card movements and state changes emit appropriate events
4. **Trigger Handling**: K.O. effects properly queue triggers for resolution

## See Also

- [EffectScripts.ts](./EffectScripts.ts) - Main implementation
- [EffectScripts.common.example.ts](./EffectScripts.common.example.ts) - Usage examples
- [EffectSystem.ts](./EffectSystem.ts) - Effect resolution system
- [TriggerQueue.ts](./TriggerQueue.ts) - Trigger management
