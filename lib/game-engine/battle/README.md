# Battle System

The Battle System handles all combat-related logic for the One Piece TCG Engine. It orchestrates the complete battle sequence from attack declaration through damage resolution.

## Overview

The `BattleSystem` class manages:
- Attack validation and legality checking
- Legal target determination
- Legal blocker identification
- Battle step orchestration (attack, block, counter, damage, end)
- Event emission for battle actions

## Architecture

```
BattleSystem
├── Attack Validation (canAttack)
├── Target Selection (getLegalTargets)
├── Blocker Selection (getLegalBlockers)
└── Battle Execution (executeAttack)
    ├── Attack Step
    ├── Block Step (task 18)
    ├── Counter Step (task 19)
    ├── Damage Step (task 20)
    └── End Battle Step (task 22)
```

## Core Methods

### `executeAttack(attackerId: string, targetId: string): BattleResult`

Executes a complete attack sequence. Validates the attack, then orchestrates all battle steps.

**Parameters:**
- `attackerId` - The ID of the attacking card
- `targetId` - The ID of the target card (leader or character)

**Returns:** `BattleResult` object containing:
- `success` - Whether the attack succeeded
- `attackerId` - The attacker's ID
- `defenderId` - The defender's ID
- `blockerId` - The blocker's ID (if any)
- `attackerPower` - The attacker's power during battle
- `defenderPower` - The defender's power during battle
- `damageDealt` - Amount of damage dealt
- `defenderKOd` - Whether the defender was K.O.'d

**Throws:** Error if the attack is invalid

### `canAttack(attackerId: string, targetId: string): boolean`

Validates whether an attack is legal according to game rules.

**Validation Checks:**
1. Attacker is in valid zone (character area or leader area)
2. Attacker is controlled by the active player
3. Target is controlled by the opponent
4. Attacker is active (or has Rush keyword if rested)
5. Target is a legal target (opponent's leader or rested character)
6. First turn battle restrictions are respected

**Parameters:**
- `attackerId` - The ID of the attacking card
- `targetId` - The ID of the target card

**Returns:** `true` if the attack is legal, `false` otherwise

### `getLegalTargets(attackerId: string): CardInstance[]`

Determines all legal attack targets for an attacker.

**Legal Targets:**
- Opponent's leader (always)
- Opponent's rested characters

**Parameters:**
- `attackerId` - The ID of the attacking card

**Returns:** Array of legal target cards

### `getLegalBlockers(attackerId: string, defenderId: PlayerId): CardInstance[]`

Identifies all characters that can block an attack.

**Legal Blockers:**
- Characters with the "Blocker" keyword
- Must be in character area
- Must be active (not rested)

**Parameters:**
- `attackerId` - The ID of the attacking card
- `defenderId` - The ID of the defending player

**Returns:** Array of cards that can block

## Battle Steps

### Attack Step (Implemented)

The attack step is the first phase of battle:

1. **Rest the Attacker** - The attacking card is rested
2. **Emit Event** - `ATTACK_DECLARED` event is emitted
3. **Trigger Effects** - (To be implemented in task 17)
   - WHEN_ATTACKING effects on attacker
   - ON_OPPONENT_ATTACK effects for defender
4. **Check Field** - (To be implemented in task 17)
   - Verify attacker and target are still on field
   - Abort battle if either has left

### Block Step (Task 18)

To be implemented. Will handle:
- Query defender for blocker choice
- Redirect attack to blocker if chosen
- Rest the blocker
- Emit BLOCK_DECLARED event
- Trigger ON_BLOCK effects

### Counter Step (Task 19)

To be implemented. Will handle:
- Emit COUNTER_STEP_START event
- Trigger WHEN_ATTACKED effects
- Allow defender to use counter cards/events
- Apply counter power boosts

### Damage Step (Task 20)

To be implemented. Will handle:
- Compare attacker power to defender power
- Deal damage to leaders or K.O. characters
- Handle Double Attack keyword

### End Battle Step (Task 22)

To be implemented. Will handle:
- Emit BATTLE_END event
- Trigger END_OF_BATTLE effects
- Expire battle-duration modifiers

## Rules Implementation

### First Turn Battle Restriction

The first player cannot attack on their first turn. This is enforced in `canAttack`:

```typescript
if (state.turnNumber === 1 && this.rules.isFirstTurnBattleBanned()) {
  if (state.activePlayer === PlayerId.PLAYER_1) {
    return false;
  }
}
```

### Rush Keyword

Characters with the Rush keyword can attack even when rested:

```typescript
if (attacker.state === CardState.RESTED) {
  const hasRush = this.hasKeyword(attacker, 'Rush');
  if (!hasRush) {
    return false;
  }
}
```

### Target Selection

Only opponent's leader and rested characters are legal targets:

```typescript
// Leader is always legal
if (opponentPlayer.zones.leaderArea) {
  targets.push(opponentPlayer.zones.leaderArea);
}

// Rested characters are legal
const restedCharacters = opponentPlayer.zones.characterArea.filter(
  (card) => card.state === CardState.RESTED
);
targets.push(...restedCharacters);
```

## Event Emission

The BattleSystem emits events for all significant battle actions:

### ATTACK_DECLARED Event

Emitted when an attack is declared:

```typescript
{
  type: GameEventType.ATTACK_DECLARED,
  timestamp: number,
  attackerId: string,
  targetId: string,
  attackingPlayerId: PlayerId,
  defendingPlayerId: PlayerId
}
```

Additional events (BLOCK_DECLARED, COUNTER_STEP_START, BATTLE_END) will be emitted in subsequent tasks.

## Dependencies

- **GameStateManager** - For querying and updating game state
- **RulesContext** - For accessing game rules (first turn restrictions, keywords)
- **DamageCalculator** - For computing card power during battle
- **EventEmitter** - For emitting battle events

## Usage Example

```typescript
import { BattleSystem } from './battle/BattleSystem';
import { GameStateManager } from './core/GameState';
import { RulesContext } from './rules/RulesContext';
import { EventEmitter } from './rendering/EventEmitter';

// Initialize dependencies
const stateManager = new GameStateManager(initialState);
const rules = new RulesContext();
const eventEmitter = new EventEmitter();

// Create battle system
const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

// Check if attack is legal
const canAttack = battleSystem.canAttack(attackerId, targetId);

if (canAttack) {
  // Execute the attack
  const result = battleSystem.executeAttack(attackerId, targetId);
  
  console.log(`Attack result: ${result.success}`);
  console.log(`Attacker power: ${result.attackerPower}`);
  console.log(`Defender power: ${result.defenderPower}`);
  
  // Update state manager after battle
  const updatedStateManager = battleSystem.getStateManager();
}

// Get legal targets for an attacker
const legalTargets = battleSystem.getLegalTargets(attackerId);
console.log(`Legal targets: ${legalTargets.length}`);

// Get legal blockers for a defender
const legalBlockers = battleSystem.getLegalBlockers(attackerId, defenderId);
console.log(`Legal blockers: ${legalBlockers.length}`);
```

## Testing

Comprehensive tests are provided in `BattleSystem.test.ts`:

- **Attack Validation Tests** - Verify all attack legality checks
- **Target Selection Tests** - Verify legal target determination
- **Blocker Selection Tests** - Verify legal blocker identification
- **Attack Execution Tests** - Verify battle execution and state changes

Run tests with:
```bash
npm test -- lib/game-engine/battle/BattleSystem.test.ts
```

## Future Enhancements

The following features will be added in subsequent tasks:

1. **Block Step Implementation** (Task 18)
   - Blocker selection UI/logic
   - Attack redirection
   - Block event emission

2. **Counter Step Implementation** (Task 19)
   - Counter card usage
   - Counter event usage
   - Power boost application

3. **Damage Step Implementation** (Task 20)
   - Power comparison
   - Leader damage with life cards
   - Character K.O.

4. **Leader Damage System** (Task 21)
   - Life card handling
   - Trigger activation
   - Defeat checking

5. **End Battle Step** (Task 22)
   - Battle end event emission
   - Effect triggering
   - Modifier expiration

6. **Effect Integration** (Tasks 24-27)
   - WHEN_ATTACKING effects
   - ON_OPPONENT_ATTACK effects
   - ON_BLOCK effects
   - WHEN_ATTACKED effects
   - END_OF_BATTLE effects

7. **Keyword System** (Task 28)
   - Full keyword support
   - Modifier-based keywords
   - Keyword validation

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 5.1** - Attack declaration and WHEN_ATTACKING effects (partial - effects in task 17)
- **Requirement 5.8** - Battle end and END_OF_BATTLE effects (partial - end step in task 22)
- **Requirement 13.1** - Rush keyword recognition and enforcement

Additional requirements will be satisfied in subsequent tasks (5.2-5.7, 13.2-13.4).
