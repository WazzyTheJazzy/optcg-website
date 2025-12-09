# KeywordHandler

The `KeywordHandler` class manages keyword checking and enforcement for the One Piece TCG Engine. Keywords are special abilities that modify how cards behave in the game.

## Overview

Keywords in the One Piece TCG are special abilities that cards can have. They can be:
- **Static keywords**: Defined on the card itself (in `CardDefinition.keywords`)
- **Dynamic keywords**: Added temporarily or permanently through modifiers

The `KeywordHandler` provides a unified interface to check for keywords regardless of their source.

## Supported Keywords

### Rush
- **Description**: Allows a character to attack on the turn it is played
- **Applies to**: Characters
- **Type**: Static
- **Usage**: Bypasses the normal restriction that characters must be active (not rested) to attack

### Blocker
- **Description**: Allows a character to block attacks
- **Applies to**: Characters
- **Type**: Activated
- **Usage**: When an opponent's character attacks, a character with Blocker can be rested to redirect the attack to itself

### Trigger
- **Description**: Allows a card to activate when taken as life damage
- **Applies to**: Characters, Events
- **Type**: Triggered
- **Usage**: When revealed as a life card, the player can choose to activate the trigger effect or add the card to hand

### Double Attack
- **Description**: Deals 2 damage to leaders instead of 1
- **Applies to**: Characters
- **Type**: Static
- **Usage**: When attacking a leader, deals 2 life cards of damage instead of 1

### Counter
- **Description**: Can be played from hand during the Counter Step
- **Applies to**: Characters, Events
- **Type**: Activated
- **Usage**: During the counter step of a battle, can be played to boost power or provide other effects

## Usage

### Basic Keyword Checking

```typescript
import { KeywordHandler } from './KeywordHandler';
import { RulesContext } from '../rules/RulesContext';

const rules = new RulesContext();
const keywordHandler = new KeywordHandler(rules);

// Check if a card has a specific keyword
if (keywordHandler.hasRush(card)) {
  // Card can attack on the turn it's played
}

if (keywordHandler.hasBlocker(card)) {
  // Card can block attacks
}

if (keywordHandler.hasTrigger(card)) {
  // Card can activate when taken as life damage
}

if (keywordHandler.hasDoubleAttack(card)) {
  // Card deals 2 damage to leaders
}

if (keywordHandler.hasCounter(card)) {
  // Card can be played during counter step
}
```

### Generic Keyword Checking

```typescript
// Check for any keyword by name
if (keywordHandler.hasKeyword(card, 'Rush')) {
  // Card has Rush
}

// Get all keywords on a card
const keywords = keywordHandler.getAllKeywords(card);
console.log(keywords); // ['Rush', 'Blocker', 'Double Attack']
```

### Working with Modifiers

Keywords can be added dynamically through modifiers:

```typescript
import { ModifierType, ModifierDuration } from '../core/types';

// Add Rush keyword temporarily
card.modifiers.push({
  id: 'temp-rush',
  type: ModifierType.KEYWORD,
  value: 'Rush',
  duration: ModifierDuration.UNTIL_END_OF_TURN,
  source: 'effect-card-id',
  timestamp: Date.now(),
});

// Now the card has Rush until end of turn
keywordHandler.hasRush(card); // true
```

### Validating Keywords

```typescript
// Check if a keyword exists in the rules
if (keywordHandler.isValidKeyword('Rush')) {
  // Rush is a valid keyword
}

// Check if a keyword can apply to a card category
if (keywordHandler.canApplyToCategory('Rush', 'CHARACTER')) {
  // Rush can be applied to characters
}

if (!keywordHandler.canApplyToCategory('Rush', 'EVENT')) {
  // Rush cannot be applied to events
}
```

### Getting Keyword Definitions

```typescript
// Get the official keyword definition from rules
const rushDef = keywordHandler.getKeywordDefinition('Rush');
console.log(rushDef);
// {
//   name: 'Rush',
//   description: 'This Character can attack on the turn it is played',
//   type: 'static',
//   appliesTo: ['CHARACTER']
// }
```

## Integration with BattleSystem

The `BattleSystem` uses `KeywordHandler` to enforce keyword rules:

```typescript
// In BattleSystem
class BattleSystem {
  private keywordHandler: KeywordHandler;

  constructor(stateManager, rules, eventEmitter) {
    this.keywordHandler = new KeywordHandler(rules);
  }

  canAttack(attackerId: string, targetId: string): boolean {
    const attacker = this.stateManager.getCard(attackerId);
    
    // Check if attacker can attack while rested (Rush keyword)
    if (attacker.state === CardState.RESTED) {
      if (!this.keywordHandler.hasRush(attacker)) {
        return false;
      }
    }
    
    // ... other validation
  }

  getLegalBlockers(attackerId: string, defenderId: PlayerId): CardInstance[] {
    const defender = this.stateManager.getPlayer(defenderId);
    
    // Only characters with Blocker keyword can block
    return defender.zones.characterArea.filter(card => 
      card.state === CardState.ACTIVE &&
      this.keywordHandler.hasBlocker(card)
    );
  }

  private damageStep(attacker: CardInstance, defender: CardInstance) {
    if (defender.zone === ZoneId.LEADER_AREA) {
      // Check for Double Attack keyword
      const damageAmount = this.keywordHandler.hasDoubleAttack(attacker) ? 2 : 1;
      this.dealLeaderDamage(defender, damageAmount);
    }
  }

  private dealLeaderDamage(leader: CardInstance, damageAmount: number) {
    for (let i = 0; i < damageAmount; i++) {
      const lifeCard = currentPlayer.zones.life[0];
      
      // Check for Trigger keyword
      if (this.keywordHandler.hasTrigger(lifeCard)) {
        // Allow player to activate trigger
      }
    }
  }
}
```

## Design Decisions

### Why Separate KeywordHandler?

1. **Single Responsibility**: Keyword logic is isolated from battle logic
2. **Reusability**: Can be used by other systems (effect system, phase manager, etc.)
3. **Testability**: Easy to test keyword logic in isolation
4. **Maintainability**: Adding new keywords only requires updating KeywordHandler

### Why Check Both Definition and Modifiers?

Keywords can come from two sources:
1. **Card Definition**: Static keywords printed on the card
2. **Modifiers**: Dynamic keywords added by effects

The `KeywordHandler` checks both sources to provide a complete view of a card's current keywords.

### Why Specific Methods (hasRush, hasBlocker, etc.)?

While `hasKeyword(card, 'Rush')` works, specific methods provide:
1. **Type Safety**: No string typos
2. **Discoverability**: IDE autocomplete shows available keywords
3. **Documentation**: Each method documents what the keyword does
4. **Performance**: Slightly faster than string comparison

## Testing

The `KeywordHandler` has comprehensive tests covering:
- Checking keywords from card definitions
- Checking keywords from modifiers
- Combining keywords from both sources
- Validating keywords against rules
- Checking keyword applicability to card categories
- Handling multiple modifiers
- Case sensitivity

Run tests with:
```bash
npm test KeywordHandler.test.ts
```

## Future Enhancements

Potential future additions:
1. **Keyword Stacking**: Some keywords might stack (e.g., multiple Double Attack = Triple Attack)
2. **Keyword Interactions**: Some keywords might interact with each other
3. **Keyword Conditions**: Keywords that only apply under certain conditions
4. **Keyword Parameters**: Keywords with values (e.g., "Banish 3" instead of just "Banish")

## Related Files

- `lib/game-engine/core/types.ts` - Type definitions for keywords and modifiers
- `lib/game-engine/rules/RulesContext.ts` - Rules context for keyword definitions
- `lib/game-engine/rules/rules.json` - Official keyword definitions
- `lib/game-engine/battle/BattleSystem.ts` - Uses KeywordHandler for battle logic
- `lib/game-engine/battle/KeywordHandler.test.ts` - Comprehensive tests
