# AI Battle Integration and Card Effects System Design

## Overview

This design document describes the architecture for integrating the AI opponent system with the battle system and implementing a comprehensive card effects engine. The system enables AI players to declare attacks, respond to combat, and use card abilities while providing a flexible framework for implementing the diverse effects found in the One Piece TCG.

The design follows a modular architecture with clear separation between:
- Battle action generation and execution
- Effect definition and resolution
- AI decision-making for combat and effects
- Game state management and validation

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game Engine                              │
│                    (Orchestrates gameplay)                       │
└────────┬──────────────────────────────────────┬─────────────────┘
         │                                      │
         │                                      │
┌────────▼────────┐                   ┌────────▼────────┐
│  Main Phase     │                   │  Battle System  │
│   Handler       │◄──────────────────┤  (Existing)     │
│                 │                   │                 │
│ - Generate      │                   │ - Execute       │
│   attack        │                   │   attacks       │
│   actions       │                   │ - Handle        │
│ - Execute       │                   │   blockers      │
│   actions       │                   │ - Handle        │
└────────┬────────┘                   │   counters      │
         │                            └────────┬────────┘
         │                                     │
         │                            ┌────────▼────────┐
         │                            │  Effect System  │
         │                            │   (New)         │
         │                            │                 │
         │                            │ - Parse effects │
         │                            │ - Trigger       │
         │                            │   effects       │
         │                            │ - Resolve       │
         │                            │   effects       │
         │                            │ - Manage stack  │
         │                            └────────┬────────┘
         │                                     │
         │                                     │
┌────────▼─────────────────────────────────────▼────────┐
│              AI Decision System                       │
│                                                        │
│  - Evaluate attack actions                            │
│  - Choose blockers                                    │
│  - Choose counters                                    │
│  - Choose effect targets                              │
│  - Evaluate effect activations                        │
└───────────────────────────────────────────────────────┘
```

### Component Responsibilities

1. **Main Phase Handler**: Generates available actions including attacks, manages action execution
2. **Battle System**: Executes attack sequences, handles combat steps (existing, with enhancements)
3. **Effect System**: Parses, triggers, and resolves card effects
4. **AI Decision System**: Makes intelligent choices for all decision points (existing, with enhancements)
5. **Game State Manager**: Maintains game state, validates actions (existing)

## Components and Interfaces

### 1. Attack Action Type

```typescript
// Add to GameAction union type
export type GameAction =
  | PassAction
  | PlayCardAction
  | GiveDonAction
  | ActivateEffectAction
  | AttackAction  // NEW
  | EndPhaseAction;

export interface AttackAction {
  type: 'ATTACK';
  attackerId: string;  // Card instance ID of attacker
  targetId: string;    // Card instance ID of target (leader or character)
  playerId: PlayerId;  // Player declaring the attack
}
```

### 2. Main Phase Attack Integration

```typescript
interface MainPhaseHandler {
  /**
   * Generate all available actions for the active player
   * Includes attack actions for all characters that can attack
   */
  generateAvailableActions(state: GameState): GameAction[];
  
  /**
   * Execute an action selected by the player
   * Routes attack actions to the BattleSystem
   */
  executeAction(action: GameAction, state: GameState): GameState;
  
  /**
   * Generate attack actions for all characters that can attack
   */
  private generateAttackActions(state: GameState): AttackAction[];
  
  /**
   * Execute an attack action through the BattleSystem
   */
  private executeAttack(action: AttackAction, state: GameState): GameState;
}
```

### 3. Effect System Core

```typescript
interface EffectSystem {
  /**
   * Parse effect text from card database into structured effect definitions
   */
  parseEffectText(effectText: string, cardId: string): EffectDefinition[];
  
  /**
   * Trigger effects based on game events
   */
  triggerEffects(event: GameEvent, state: GameState): EffectInstance[];
  
  /**
   * Resolve an effect instance
   */
  resolveEffect(effect: EffectInstance, state: GameState): GameState;
  
  /**
   * Add effect to resolution stack
   */
  pushEffect(effect: EffectInstance): void;
  
  /**
   * Resolve all effects on the stack
   */
  resolveStack(state: GameState): GameState;
  
  /**
   * Check if an effect's conditions are met
   */
  checkConditions(effect: EffectDefinition, state: GameState): boolean;
  
  /**
   * Get legal targets for an effect
   */
  getLegalTargets(effect: EffectDefinition, state: GameState): Target[];
}
```

### 4. Effect Definition Structure

```typescript
interface EffectDefinition {
  id: string;
  sourceCardId: string;
  label: string;  // "[On Play]", "[When Attacking]", etc.
  timingType: EffectTimingType;  // AUTO, ACTIVATE, PERMANENT
  triggerTiming: TriggerTiming | null;  // WHEN_ATTACKING, ON_PLAY, etc.
  condition: ConditionExpr | null;
  cost: CostExpr | null;
  effectType: EffectType;
  parameters: EffectParameters;
  oncePerTurn: boolean;
  usedThisTurn: boolean;
}

enum EffectType {
  POWER_MODIFICATION = 'POWER_MODIFICATION',
  KO_CHARACTER = 'KO_CHARACTER',
  BOUNCE_CHARACTER = 'BOUNCE_CHARACTER',
  SEARCH_DECK = 'SEARCH_DECK',
  DRAW_CARDS = 'DRAW_CARDS',
  DISCARD_CARDS = 'DISCARD_CARDS',
  GRANT_KEYWORD = 'GRANT_KEYWORD',
  ATTACH_DON = 'ATTACH_DON',
  REST_CHARACTER = 'REST_CHARACTER',
  ACTIVATE_CHARACTER = 'ACTIVATE_CHARACTER',
  DEAL_DAMAGE = 'DEAL_DAMAGE',
  LOOK_AT_CARDS = 'LOOK_AT_CARDS',
  REVEAL_CARDS = 'REVEAL_CARDS',
  TRASH_CARDS = 'TRASH_CARDS',
  // Add more as needed
}

interface EffectParameters {
  // Power modification
  powerChange?: number;
  
  // K.O. / Bounce
  maxPower?: number;
  maxCost?: number;
  
  // Search / Look
  cardCount?: number;
  searchCriteria?: SearchCriteria;
  
  // Keyword grant
  keyword?: string;
  
  // Targeting
  targetType?: TargetType;
  targetCount?: number;
  targetFilter?: TargetFilter;
  
  // Duration
  duration?: ModifierDuration;
}

interface SearchCriteria {
  category?: CardCategory;
  color?: Color;
  cost?: { min?: number; max?: number };
  power?: { min?: number; max?: number };
  typeTags?: string[];
  attributes?: string[];
}

interface TargetFilter {
  controller?: 'self' | 'opponent' | 'any';
  zone?: ZoneId[];
  category?: CardCategory[];
  color?: Color[];
  costRange?: { min?: number; max?: number };
  powerRange?: { min?: number; max?: number };
  state?: CardState[];
  hasKeyword?: string[];
}
```

### 5. Effect Instance

```typescript
interface EffectInstance {
  id: string;
  definition: EffectDefinition;
  source: CardInstance;
  controller: PlayerId;
  targets: Target[];
  chosenValues: Map<string, any>;
  timestamp: number;
  resolved: boolean;
}

interface Target {
  type: TargetType;
  cardId?: string;
  playerId?: PlayerId;
  zoneId?: ZoneId;
}

enum TargetType {
  CARD = 'CARD',
  PLAYER = 'PLAYER',
  ZONE = 'ZONE',
}
```

### 6. Effect Resolver Registry

```typescript
interface EffectResolver {
  /**
   * Resolve a specific effect type
   */
  resolve(effect: EffectInstance, state: GameState): GameState;
  
  /**
   * Validate that an effect can be resolved
   */
  canResolve(effect: EffectInstance, state: GameState): boolean;
}

class EffectResolverRegistry {
  private resolvers: Map<EffectType, EffectResolver>;
  
  /**
   * Register a resolver for an effect type
   */
  register(effectType: EffectType, resolver: EffectResolver): void;
  
  /**
   * Get resolver for an effect type
   */
  getResolver(effectType: EffectType): EffectResolver | null;
  
  /**
   * Resolve an effect using the appropriate resolver
   */
  resolve(effect: EffectInstance, state: GameState): GameState;
}
```

### 7. Specific Effect Resolvers

```typescript
class PowerModificationResolver implements EffectResolver {
  resolve(effect: EffectInstance, state: GameState): GameState {
    // Apply power modification to target(s)
    // Create modifier with appropriate duration
    // Update game state
  }
}

class KOCharacterResolver implements EffectResolver {
  resolve(effect: EffectInstance, state: GameState): GameState {
    // K.O. target character(s) matching criteria
    // Move to trash
    // Trigger ON_KO effects
  }
}

class BounceCharacterResolver implements EffectResolver {
  resolve(effect: EffectInstance, state: GameState): GameState {
    // Return target character(s) to owner's hand
    // Update game state
  }
}

class SearchDeckResolver implements EffectResolver {
  resolve(effect: EffectInstance, state: GameState): GameState {
    // Look at top X cards
    // Filter by search criteria
    // Prompt player to choose card(s)
    // Add to hand
    // Place remaining at bottom of deck
  }
}

// ... more resolvers for each effect type
```

### 8. Effect Parser

```typescript
class EffectParser {
  /**
   * Parse effect text into structured effect definitions
   */
  parse(effectText: string, cardId: string): EffectDefinition[];
  
  /**
   * Extract effect label ([On Play], [When Attacking], etc.)
   */
  private extractLabel(text: string): string;
  
  /**
   * Determine timing type from label
   */
  private determineTimingType(label: string): EffectTimingType;
  
  /**
   * Determine trigger timing from label
   */
  private determineTriggerTiming(label: string): TriggerTiming | null;
  
  /**
   * Parse effect body into effect type and parameters
   */
  private parseEffectBody(body: string): { type: EffectType; params: EffectParameters };
  
  /**
   * Parse targeting information
   */
  private parseTargeting(text: string): { targetType: TargetType; filter: TargetFilter };
  
  /**
   * Parse conditions
   */
  private parseCondition(text: string): ConditionExpr | null;
  
  /**
   * Parse costs
   */
  private parseCost(text: string): CostExpr | null;
}
```

### 9. AI Effect Evaluation

```typescript
// Extend ActionEvaluator to handle effect evaluation
class ActionEvaluator {
  /**
   * Evaluate an effect activation action
   */
  evaluateEffectActivation(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number;
  
  /**
   * Evaluate effect target choices
   */
  evaluateEffectTarget(
    target: Target,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number;
  
  /**
   * Simulate effect resolution
   */
  private simulateEffect(
    effect: EffectDefinition,
    targets: Target[],
    state: GameState
  ): GameState;
  
  /**
   * Evaluate power modification effects
   */
  private evaluatePowerModification(
    effect: EffectDefinition,
    targets: Target[],
    state: GameState,
    playerId: PlayerId
  ): number;
  
  /**
   * Evaluate K.O. effects
   */
  private evaluateKO(
    effect: EffectDefinition,
    targets: Target[],
    state: GameState,
    playerId: PlayerId
  ): number;
  
  /**
   * Evaluate card advantage effects (draw, search)
   */
  private evaluateCardAdvantage(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number;
}
```

## Data Models

### Effect Definition Examples

```typescript
// Example: "[On Play] K.O. up to 1 of your opponent's Characters with 3000 power or less."
const koEffect: EffectDefinition = {
  id: 'effect-1',
  sourceCardId: 'card-123',
  label: '[On Play]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.ON_PLAY,
  condition: null,
  cost: null,
  effectType: EffectType.KO_CHARACTER,
  parameters: {
    maxPower: 3000,
    targetType: TargetType.CARD,
    targetCount: 1,
    targetFilter: {
      controller: 'opponent',
      zone: [ZoneId.CHARACTER_AREA],
      category: [CardCategory.CHARACTER],
      powerRange: { max: 3000 },
    },
  },
  oncePerTurn: false,
  usedThisTurn: false,
};

// Example: "[When Attacking] Give up to 1 of your Leader or Character cards +1000 power during this battle."
const powerBoostEffect: EffectDefinition = {
  id: 'effect-2',
  sourceCardId: 'card-456',
  label: '[When Attacking]',
  timingType: EffectTimingType.AUTO,
  triggerTiming: TriggerTiming.WHEN_ATTACKING,
  condition: null,
  cost: null,
  effectType: EffectType.POWER_MODIFICATION,
  parameters: {
    powerChange: 1000,
    targetType: TargetType.CARD,
    targetCount: 1,
    targetFilter: {
      controller: 'self',
      zone: [ZoneId.LEADER_AREA, ZoneId.CHARACTER_AREA],
      category: [CardCategory.LEADER, CardCategory.CHARACTER],
    },
    duration: ModifierDuration.UNTIL_END_OF_BATTLE,
  },
  oncePerTurn: false,
  usedThisTurn: false,
};

// Example: "[Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters -2000 power during this turn."
const activatedEffect: EffectDefinition = {
  id: 'effect-3',
  sourceCardId: 'card-789',
  label: '[Activate: Main]',
  timingType: EffectTimingType.ACTIVATE,
  triggerTiming: null,
  condition: null,
  cost: null,  // Could have DON cost
  effectType: EffectType.POWER_MODIFICATION,
  parameters: {
    powerChange: -2000,
    targetType: TargetType.CARD,
    targetCount: 1,
    targetFilter: {
      controller: 'opponent',
      zone: [ZoneId.CHARACTER_AREA],
      category: [CardCategory.CHARACTER],
    },
    duration: ModifierDuration.UNTIL_END_OF_TURN,
  },
  oncePerTurn: true,
  usedThisTurn: false,
};
```

## Decision-Making Algorithms

### Attack Action Generation

```
function generateAttackActions(state: GameState): AttackAction[] {
  actions = []
  activePlayer = state.activePlayer
  
  // Get all characters controlled by active player
  characters = getCharactersInPlay(activePlayer, state)
  
  for each character in characters:
    // Check if character can attack
    if canAttack(character, state):
      // Get legal targets for this attacker
      targets = battleSystem.getLegalTargets(character.id)
      
      // Create attack action for each legal target
      for each target in targets:
        action = {
          type: 'ATTACK',
          attackerId: character.id,
          targetId: target.id,
          playerId: activePlayer
        }
        actions.push(action)
  
  return actions
}

function canAttack(character: CardInstance, state: GameState): boolean {
  // Character must be in character area
  if character.zone != CHARACTER_AREA:
    return false
  
  // Character must be active OR have Rush keyword
  if character.state == RESTED and not hasKeyword(character, 'Rush'):
    return false
  
  // Character must not have attacked this turn (unless special ability)
  if hasAttackedThisTurn(character, state):
    return false
  
  // Check first turn battle restriction
  if state.turnNumber == 1 and isFirstPlayer(character.controller):
    return false
  
  return true
}
```

### Attack Evaluation

```
function evaluateAttack(action: AttackAction, state: GameState): number {
  attacker = getCard(action.attackerId, state)
  target = getCard(action.targetId, state)
  
  score = 0
  
  // Calculate expected damage
  attackerPower = computeCurrentPower(attacker)
  defenderPower = computeCurrentPower(target)
  
  // Evaluate based on target type
  if target.zone == LEADER_AREA:
    // Attacking leader - value life damage
    if attackerPower >= defenderPower:
      damageAmount = hasKeyword(attacker, 'Double Attack') ? 2 : 1
      score += damageAmount * 50  // High value for life damage
      
      // Check if this wins the game
      opponentLife = getLifeCount(target.controller, state)
      if opponentLife <= damageAmount:
        score += 1000  // Winning the game is highest priority
  else:
    // Attacking character - value removing threats
    if attackerPower >= defenderPower:
      // Can K.O. the character
      characterValue = evaluateCharacterValue(target, state)
      score += characterValue
    else:
      // Cannot K.O. - negative value (wasting attack)
      score -= 20
  
  // Factor in blocker risk
  blockerProbability = estimateBlockerProbability(target.controller, state)
  score *= (1 - blockerProbability * 0.5)
  
  // Factor in counter risk
  counterRisk = estimateCounterRisk(target.controller, state)
  score *= (1 - counterRisk * 0.3)
  
  return score
}
```

### Effect Target Selection

```
function selectEffectTarget(
  legalTargets: Target[],
  effect: EffectDefinition,
  state: GameState,
  playerId: PlayerId
): Target {
  
  scores = []
  
  for each target in legalTargets:
    // Simulate effect with this target
    simulatedState = simulateEffect(effect, [target], state)
    
    // Evaluate resulting state
    score = evaluateGameState(simulatedState, playerId)
    
    // Adjust based on effect type
    if effect.effectType == KO_CHARACTER:
      // Prefer K.O.'ing high-value threats
      targetCard = getCard(target.cardId, state)
      score += evaluateCharacterValue(targetCard, state)
    
    else if effect.effectType == POWER_MODIFICATION:
      // Prefer boosting attackers or debuffing blockers
      targetCard = getCard(target.cardId, state)
      if effect.parameters.powerChange > 0:
        // Boosting - prefer characters that can attack
        if canAttack(targetCard, state):
          score += 20
      else:
        // Debuffing - prefer opponent's strong characters
        score += targetCard.definition.basePower / 100
    
    scores.push(score)
  
  // Select highest-scoring target with randomness
  return applyRandomness(legalTargets, scores)
}
```

### Effect Activation Decision

```
function shouldActivateEffect(
  effect: EffectDefinition,
  state: GameState,
  playerId: PlayerId
): boolean {
  
  // Check if effect can be activated
  if not canActivateEffect(effect, state):
    return false
  
  // Evaluate effect value
  legalTargets = getLegalTargets(effect, state)
  if legalTargets.length == 0:
    return false
  
  // Simulate best-case effect resolution
  bestTarget = selectEffectTarget(legalTargets, effect, state, playerId)
  simulatedState = simulateEffect(effect, [bestTarget], state)
  
  // Compare states
  currentScore = evaluateGameState(state, playerId)
  simulatedScore = evaluateGameState(simulatedState, playerId)
  
  improvement = simulatedScore - currentScore
  
  // Consider cost
  if effect.cost:
    costValue = evaluateCost(effect.cost, state, playerId)
    improvement -= costValue
  
  // Activate if improvement is positive
  return improvement > 0
}
```

## Error Handling

### Effect Resolution Errors

```typescript
class EffectResolutionError extends Error {
  constructor(
    message: string,
    public effect: EffectInstance,
    public state: GameState
  ) {
    super(message);
  }
}

class EffectTargetingError extends EffectResolutionError {}
class EffectConditionError extends EffectResolutionError {}
class EffectCostError extends EffectResolutionError {}
```

### Error Recovery Strategy

1. **Invalid Effect**: Log warning, skip effect resolution
2. **Invalid Target**: Prompt for new target or skip effect
3. **Unimplemented Effect**: Log warning, show placeholder message
4. **Effect Stack Overflow**: Clear stack, log error
5. **State Corruption**: Revert to last valid state if possible

## Testing Strategy

### Unit Tests

1. **Effect Parser Tests**
   - Test parsing of each effect type
   - Test extraction of targeting criteria
   - Test condition and cost parsing
   - Test handling of malformed effect text

2. **Effect Resolver Tests**
   - Test each effect type resolver independently
   - Test with various game states
   - Test edge cases (empty targets, invalid targets)
   - Test modifier application and duration

3. **Attack Action Tests**
   - Test attack action generation
   - Test attack validation
   - Test attack execution
   - Test multiple attacks per turn

4. **AI Effect Decision Tests**
   - Test effect target selection
   - Test effect activation decisions
   - Test effect evaluation scoring
   - Test with various board states

### Integration Tests

1. **Full Combat Tests**
   - AI declares attack
   - Opponent AI responds with blocker
   - Opponent AI uses counter
   - Battle resolves correctly
   - Effects trigger appropriately

2. **Effect Chain Tests**
   - Multiple effects trigger simultaneously
   - Effects resolve in correct order
   - Players can respond to effects
   - Stack resolves completely

3. **AI vs AI Game Tests**
   - Complete games with effects
   - Verify all effect types work
   - Verify no deadlocks or hangs
   - Verify game ends correctly

### Property-Based Tests

Will be defined in the prework section before writing correctness properties.

## Performance Considerations

### Optimization Strategies

1. **Effect Caching**: Cache parsed effect definitions
2. **Target Filtering**: Pre-filter invalid targets before evaluation
3. **Lazy Evaluation**: Only evaluate effects when needed
4. **State Snapshots**: Use copy-on-write for state updates
5. **Effect Batching**: Batch similar effects for efficiency

### Performance Targets

- Effect parsing: < 10ms per card
- Effect resolution: < 50ms per effect
- Attack action generation: < 100ms
- AI effect decision: < 500ms
- Full turn with effects: < 5 seconds

## Integration with Existing System

### Minimal Changes to Existing Code

1. **GameEngine**: Add effect system initialization
2. **MainPhase**: Add attack action generation and execution
3. **BattleSystem**: Connect to effect system for trigger events
4. **AIPlayer**: Add effect decision methods (already has interface)
5. **GameState**: Add effect stack and effect history

### New Files to Create

- `lib/game-engine/effects/EffectSystem.ts`
- `lib/game-engine/effects/EffectParser.ts`
- `lib/game-engine/effects/EffectResolver.ts`
- `lib/game-engine/effects/resolvers/PowerModificationResolver.ts`
- `lib/game-engine/effects/resolvers/KOCharacterResolver.ts`
- `lib/game-engine/effects/resolvers/BounceCharacterResolver.ts`
- `lib/game-engine/effects/resolvers/SearchDeckResolver.ts`
- ... (one file per effect type)
- `lib/game-engine/effects/types.ts`
- `lib/game-engine/effects/utils.ts`

## Future Enhancements

1. **Advanced Effect Types**: Implement remaining effect types
2. **Effect Combos**: Detect and optimize effect combinations
3. **Machine Learning**: Train AI on effect usage patterns
4. **Effect Visualization**: Enhanced UI for effect resolution
5. **Custom Effects**: Allow defining custom effects via scripting
6. **Effect Replay**: Record and replay effect sequences
7. **Effect Analytics**: Track effect usage and win rates

## Summary

This design provides a comprehensive system for AI battle integration and card effects. The modular architecture allows for incremental implementation, starting with core attack functionality and basic effects, then expanding to cover the full range of card abilities. The effect system is designed to be extensible, making it straightforward to add new effect types as needed. The AI integration ensures that computer opponents can fully participate in gameplay, using attacks and effects intelligently.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Attack Action Completeness
*For any* game state where the AI is in the main phase, the set of generated attack actions should include exactly one action for each valid (attacker, target) pair where the attacker can legally attack the target.
**Validates: Requirements 1.1, 1.2**

### Property 2: Attack Action Inclusion
*For any* game state where characters can attack, the list of available actions should include attack actions.
**Validates: Requirements 1.5**

### Property 3: Attack Execution State Change
*For any* valid attack action, executing the attack should result in the attacker being rested and appropriate damage/K.O. effects being applied.
**Validates: Requirements 2.3**

### Property 4: Character K.O. on Attack
*For any* attack where the attacker's power exceeds the defender's power and the defender is a character, the defender should be moved to the trash zone.
**Validates: Requirements 2.4**

### Property 5: Life Damage Processing
*For any* attack that deals damage to a leader, the number of life cards in the leader's life zone should decrease by the damage amount, and those cards should move to hand or trash.
**Validates: Requirements 2.5**

### Property 6: Blocker Redirection
*For any* battle where a blocker is chosen, the battle should resolve between the attacker and the blocker, not the original target.
**Validates: Requirements 4.2**

### Property 7: No Blocker Original Target
*For any* battle where no blocker is chosen, the battle should resolve between the attacker and the original target.
**Validates: Requirements 4.3**

### Property 8: Counter Power Boost
*For any* counter card used during battle, the defending card's power should increase by the counter value for the duration of the battle.
**Validates: Requirements 5.2**

### Property 9: Main Phase Continuation After Attack
*For any* attack that completes without ending the game, the main phase should continue and more actions should be available.
**Validates: Requirements 7.3**

### Property 10: Game Over After Winning Attack
*For any* attack that reduces the opponent's life to zero, the game should end with the attacker's controller as the winner.
**Validates: Requirements 7.4**

### Property 11: Multiple Attacks Per Turn
*For any* main phase, multiple attack actions should be executable as long as different characters are attacking.
**Validates: Requirements 7.5**

### Property 12: Attack Action Legality
*For any* generated attack action, the attack should be legal according to the game rules (attacker can attack, target is valid).
**Validates: Requirements 8.1**

### Property 13: Attack Validation Before Execution
*For any* attack action, if the attack is illegal at execution time, the system should reject it without crashing.
**Validates: Requirements 8.2, 8.3**

### Property 14: Effect Condition Evaluation
*For any* effect with conditions, the effect should only apply when all conditions are met.
**Validates: Requirements 13.5**

### Property 15: Effect Parsing Correctness
*For any* valid effect text, parsing should produce a structured effect definition that captures the effect's behavior.
**Validates: Requirements 14.1**

### Property 16: Card Effect Attachment
*For any* card loaded from the database, the card instance should have all its effect definitions attached.
**Validates: Requirements 14.2**

### Property 17: Effect Definition Validation
*For any* invalid effect definition, the system should detect and reject it during loading.
**Validates: Requirements 14.3**

### Property 18: Trigger Identification
*For any* game event, all effects with matching trigger conditions should be identified and queued for resolution.
**Validates: Requirements 15.1**

### Property 19: Effect Resolution Priority
*For any* set of simultaneously triggered effects, they should resolve in the correct priority order (active player's effects first, then opponent's effects).
**Validates: Requirements 15.2**

### Property 20: Effect Queue Management
*For any* triggered effect, it should be added to the effect queue and remain there until resolved.
**Validates: Requirements 15.5**

### Property 21: Effect State Modification
*For any* resolved effect, the game state should reflect the changes specified by the effect.
**Validates: Requirements 16.1**

### Property 22: Power Modifier Duration
*For any* power modification effect, the modifier should persist for exactly the specified duration and then be removed.
**Validates: Requirements 16.4**

### Property 23: Card Zone Update on Effect
*For any* effect that moves cards, the affected cards should be in the correct zones after resolution.
**Validates: Requirements 16.5**

### Property 24: Legal Target Determination
*For any* effect with targeting requirements, the set of legal targets should match exactly the cards that satisfy the effect's target filter.
**Validates: Requirements 18.1**

### Property 25: Target Validation
*For any* chosen target for an effect, the target should be in the set of legal targets for that effect.
**Validates: Requirements 18.3**

### Property 26: Target Filter Application
*For any* target filter, only cards matching all filter criteria should be considered legal targets.
**Validates: Requirements 18.4**

### Property 27: Modifier Duration Support
*For any* modifier with a specific duration, the modifier should be removed at the appropriate time (end of turn, end of battle, etc.).
**Validates: Requirements 20.1**

### Property 28: Turn End Modifier Cleanup
*For any* turn end, all modifiers with "Until End of Turn" duration should be removed from all cards.
**Validates: Requirements 20.2**

### Property 29: Battle End Modifier Cleanup
*For any* battle end, all modifiers with "Until End of Battle" duration should be removed from all cards.
**Validates: Requirements 20.3**

### Property 30: Card Removal Modifier Cleanup
*For any* card that leaves the field, all modifiers on that card should be removed.
**Validates: Requirements 20.4**

### Property 31: Conditional Effect Application
*For any* effect with conditions, if the conditions are not met, the effect should not apply.
**Validates: Requirements 21.2**

### Property 32: Complex Condition Evaluation
*For any* effect with multiple conditions combined with AND/OR logic, the effect should only apply when the combined condition evaluates to true.
**Validates: Requirements 21.4**

### Property 33: Dynamic Condition Re-evaluation
*For any* conditional effect, the conditions should be re-evaluated when the game state changes.
**Validates: Requirements 21.5**

### Property 34: Cost Payment Validation
*For any* effect with a cost, the effect should only be activatable if the player can pay the cost.
**Validates: Requirements 22.1**

### Property 35: Cost Payment State Change
*For any* effect cost that is paid, the game state should reflect the cost payment (DON rested, cards discarded, etc.).
**Validates: Requirements 22.4**

### Property 36: Cost Before Effect Resolution
*For any* effect with a cost, the cost should be paid before the effect resolves.
**Validates: Requirements 22.5**

### Property 37: Effect Stack Sequential Resolution
*For any* effect stack with multiple effects, effects should resolve one at a time in LIFO order.
**Validates: Requirements 23.3**

### Property 38: Effect Stack Completion
*For any* effect resolution sequence, the effect stack should be empty when resolution completes.
**Validates: Requirements 23.5**

### Property 39: Stage Card Placement
*For any* stage card played, it should be placed in the stage area.
**Validates: Requirements 28.1**

### Property 40: Single Stage Limit
*For any* player, playing a second stage card should cause the first stage to be moved to trash.
**Validates: Requirements 28.2**

### Property 41: Stage Effect Application
*For any* stage card in play, its continuous effects should be applied to the game state.
**Validates: Requirements 28.4**

### Property 42: Event Immediate Resolution
*For any* event card played, its effect should resolve immediately.
**Validates: Requirements 29.1**

### Property 43: Event Trash After Resolution
*For any* event card that resolves, it should be moved to the trash zone.
**Validates: Requirements 29.2**

### Property 44: Event Timing Validation
*For any* event card with timing restrictions, it should only be playable during the specified timing.
**Validates: Requirements 29.4**

### Property 45: Character Attack Limit
*For any* character, it should not be able to attack more than once per turn (unless it has a special ability).
**Validates: Requirements 30.3**

### Property 46: DON Power Bonus
*For any* DON attached to a character, the character's power should increase by 1000.
**Validates: Requirements 31.4**

### Property 47: Leader Ability Activation Timing
*For any* leader with an [Activate: Main] ability, the ability should only be activatable during the main phase.
**Validates: Requirements 32.1**

### Property 48: Once Per Turn Restriction
*For any* effect with [Once Per Turn], it should only be activatable once per turn.
**Validates: Requirements 32.2**

### Property 49: Dynamic Keyword Grant
*For any* effect that grants a keyword to a card, the card should have that keyword for the specified duration.
**Validates: Requirements 33.5**

### Property 50: Deck Size Validation
*For any* deck, it should contain exactly 50 cards (excluding the leader).
**Validates: Requirements 37.1**

### Property 51: Card Limit Validation
*For any* deck, no card (except DON) should appear more than 4 times.
**Validates: Requirements 37.2**

### Property 52: Leader Requirement Validation
*For any* deck, it should have exactly one leader card.
**Validates: Requirements 37.3**

### Property 53: Color Restriction Validation
*For any* deck, all cards should match the leader's color restrictions.
**Validates: Requirements 37.4**

### Property 54: Game State Serialization Round Trip
*For any* game state, serializing to JSON and then deserializing should produce an equivalent game state.
**Validates: Requirements 38.1**

### Property 55: Deserialized State Validity
*For any* deserialized game state, it should satisfy all game state invariants (valid zones, valid card states, etc.).
**Validates: Requirements 38.3**
