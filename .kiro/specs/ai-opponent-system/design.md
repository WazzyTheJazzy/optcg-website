# AI Opponent System Design

## Overview

The AI Opponent System extends the existing One Piece TCG game engine to support computer-controlled players. The design follows a modular architecture with clear separation between decision-making logic, action evaluation, and game engine integration. The system uses a scoring-based approach to evaluate potential actions and select optimal plays based on configurable difficulty levels and strategies.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Engine                           │
│  (Existing: GameEngine, PhaseManager, BattleSystem, etc.)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Player Interface
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐            ┌────────▼────────┐
│  Human Player   │            │   AI Player     │
│   Controller    │            │   Controller    │
└─────────────────┘            └────────┬────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
           ┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
           │  AI Decision    │ │    Action      │ │   Strategy     │
           │     System      │ │   Evaluator    │ │    Manager     │
           └─────────────────┘ └────────────────┘ └────────────────┘
```

### Component Responsibilities

1. **AI Player Controller**: Implements the player interface, receives decision requests from the game engine, and coordinates AI responses
2. **AI Decision System**: Core decision-making logic that selects actions based on game state
3. **Action Evaluator**: Scores potential actions using heuristics and game state analysis
4. **Strategy Manager**: Manages play style configurations and adjusts evaluation weights
5. **Player Interface**: Abstract interface that both human and AI players implement

## Components and Interfaces

### 1. Player Interface

```typescript
interface Player {
  readonly id: PlayerId;
  readonly type: 'human' | 'ai';
  
  // Decision methods called by game engine
  chooseAction(legalActions: Action[], state: GameState): Promise<Action>;
  chooseMulligan(hand: CardInstance[], state: GameState): Promise<boolean>;
  chooseBlocker(legalBlockers: CardInstance[], attacker: CardInstance, state: GameState): Promise<CardInstance | null>;
  chooseCounterAction(options: CounterOption[], state: GameState): Promise<CounterOption | null>;
  chooseTarget(legalTargets: Target[], effect: EffectInstance, state: GameState): Promise<Target>;
  chooseValue(options: number[], effect: EffectInstance, state: GameState): Promise<number>;
}
```

### 2. AI Player Controller

```typescript
interface AIPlayerConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  playStyle: 'aggressive' | 'defensive' | 'balanced';
  thinkingTime: {
    min: number; // Minimum delay in ms
    max: number; // Maximum delay in ms
  };
  randomness: number; // 0-1, amount of random variation in decisions
}

class AIPlayer implements Player {
  readonly id: PlayerId;
  readonly type = 'ai';
  
  private decisionSystem: AIDecisionSystem;
  private config: AIPlayerConfig;
  
  constructor(id: PlayerId, config: AIPlayerConfig);
  
  async chooseAction(legalActions: Action[], state: GameState): Promise<Action>;
  async chooseMulligan(hand: CardInstance[], state: GameState): Promise<boolean>;
  async chooseBlocker(legalBlockers: CardInstance[], attacker: CardInstance, state: GameState): Promise<CardInstance | null>;
  async chooseCounterAction(options: CounterOption[], state: GameState): Promise<CounterOption | null>;
  async chooseTarget(legalTargets: Target[], effect: EffectInstance, state: GameState): Promise<Target>;
  async chooseValue(options: number[], effect: EffectInstance, state: GameState): Promise<number>;
  
  private async simulateThinking(complexity: number): Promise<void>;
  private applyRandomness<T>(options: T[], scores: number[]): T;
}
```

### 3. AI Decision System

```typescript
interface DecisionContext {
  state: GameState;
  playerId: PlayerId;
  config: AIPlayerConfig;
}

class AIDecisionSystem {
  private evaluator: ActionEvaluator;
  private strategy: StrategyManager;
  
  constructor(evaluator: ActionEvaluator, strategy: StrategyManager);
  
  // Main decision methods
  selectAction(actions: Action[], context: DecisionContext): Action;
  evaluateMulligan(hand: CardInstance[], context: DecisionContext): boolean;
  selectBlocker(blockers: CardInstance[], attacker: CardInstance, context: DecisionContext): CardInstance | null;
  selectCounterAction(options: CounterOption[], context: DecisionContext): CounterOption | null;
  selectTarget(targets: Target[], effect: EffectInstance, context: DecisionContext): Target;
  selectValue(options: number[], effect: EffectInstance, context: DecisionContext): number;
  
  // Helper methods
  private rankOptions<T>(options: T[], evaluateFn: (option: T) => number): Array<{ option: T; score: number }>;
  private applyDifficultyModifier(score: number, difficulty: string): number;
}
```

### 4. Action Evaluator

```typescript
interface EvaluationFactors {
  boardControl: number;      // -100 to 100
  resourceEfficiency: number; // -100 to 100
  lifeDifferential: number;   // -100 to 100
  cardAdvantage: number;      // -100 to 100
  tempo: number;              // -100 to 100
}

interface EvaluationWeights {
  boardControl: number;
  resourceEfficiency: number;
  lifeDifferential: number;
  cardAdvantage: number;
  tempo: number;
}

class ActionEvaluator {
  private weights: EvaluationWeights;
  
  constructor(weights: EvaluationWeights);
  
  // Main evaluation method
  evaluateAction(action: Action, state: GameState, playerId: PlayerId): number;
  
  // Factor evaluation methods
  evaluateBoardControl(state: GameState, playerId: PlayerId): number;
  evaluateResourceEfficiency(action: Action, state: GameState, playerId: PlayerId): number;
  evaluateLifeDifferential(state: GameState, playerId: PlayerId): number;
  evaluateCardAdvantage(state: GameState, playerId: PlayerId): number;
  evaluateTempo(action: Action, state: GameState, playerId: PlayerId): number;
  
  // Specific action evaluators
  evaluatePlayCard(card: CardInstance, state: GameState, playerId: PlayerId): number;
  evaluateAttack(attacker: CardInstance, target: CardInstance | 'leader', state: GameState, playerId: PlayerId): number;
  evaluateGiveDon(don: DonInstance, target: CardInstance, state: GameState, playerId: PlayerId): number;
  evaluateActivateEffect(effect: EffectInstance, state: GameState, playerId: PlayerId): number;
  
  // Utility methods
  private simulateAction(action: Action, state: GameState): GameState;
  private compareStates(before: GameState, after: GameState, playerId: PlayerId): EvaluationFactors;
  private calculateTotalScore(factors: EvaluationFactors): number;
}
```

### 5. Strategy Manager

```typescript
interface StrategyProfile {
  name: string;
  weights: EvaluationWeights;
  aggressiveness: number; // 0-1, affects attack vs defense priority
  riskTolerance: number;  // 0-1, affects risky plays
}

class StrategyManager {
  private profiles: Map<string, StrategyProfile>;
  private currentProfile: StrategyProfile;
  
  constructor();
  
  // Strategy selection
  setStrategy(playStyle: string, difficulty: string): void;
  getWeights(): EvaluationWeights;
  
  // Dynamic strategy adjustment
  adjustForGameState(state: GameState, playerId: PlayerId): void;
  
  // Predefined strategies
  private getAggressiveProfile(): StrategyProfile;
  private getDefensiveProfile(): StrategyProfile;
  private getBalancedProfile(): StrategyProfile;
  
  // Strategy modifiers
  private applyLifeAdvantageModifier(profile: StrategyProfile, lifeDiff: number): StrategyProfile;
  private applyResourceModifier(profile: StrategyProfile, resources: number): StrategyProfile;
}
```

## Data Models

### AI Configuration

```typescript
interface AIPlayerConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  playStyle: 'aggressive' | 'defensive' | 'balanced';
  thinkingTime: {
    min: number;
    max: number;
  };
  randomness: number;
}

// Default configurations
const DEFAULT_CONFIGS = {
  easy: {
    difficulty: 'easy',
    playStyle: 'balanced',
    thinkingTime: { min: 500, max: 1500 },
    randomness: 0.3
  },
  medium: {
    difficulty: 'medium',
    playStyle: 'balanced',
    thinkingTime: { min: 800, max: 2000 },
    randomness: 0.15
  },
  hard: {
    difficulty: 'hard',
    playStyle: 'balanced',
    thinkingTime: { min: 1000, max: 3000 },
    randomness: 0.05
  }
};
```

### Evaluation Weights

```typescript
const STRATEGY_WEIGHTS = {
  aggressive: {
    boardControl: 0.25,
    resourceEfficiency: 0.15,
    lifeDifferential: 0.35,
    cardAdvantage: 0.10,
    tempo: 0.15
  },
  defensive: {
    boardControl: 0.30,
    resourceEfficiency: 0.20,
    lifeDifferential: 0.20,
    cardAdvantage: 0.20,
    tempo: 0.10
  },
  balanced: {
    boardControl: 0.25,
    resourceEfficiency: 0.20,
    lifeDifferential: 0.25,
    cardAdvantage: 0.15,
    tempo: 0.15
  }
};
```

## Decision-Making Algorithms

### Action Selection Algorithm

```
function selectAction(actions, context):
  1. Filter actions to remove obviously bad moves
  2. For each remaining action:
     a. Simulate action execution
     b. Evaluate resulting game state
     c. Calculate score based on evaluation factors
  3. Rank actions by score
  4. Apply difficulty modifier (add randomness for lower difficulties)
  5. Select highest-scoring action
  6. Return action
```

### Mulligan Algorithm

```
function evaluateMulligan(hand, context):
  1. Count playable cards in first 3 turns
  2. Calculate average card cost
  3. Check for curve (low, mid, high cost cards)
  4. Evaluate hand quality score:
     - +20 points per playable card (cost <= 3)
     - +10 points per mid-cost card (cost 4-6)
     - +5 points per high-cost card (cost 7+)
     - +15 points if curve is balanced
     - -30 points if no playable cards
  5. Return true (mulligan) if score < 30
  6. Return false (keep) if score >= 30
```

### Attack Target Selection

```
function selectAttackTarget(attacker, targets, context):
  1. For each potential target:
     a. Calculate expected damage
     b. Calculate risk (chance of being blocked/countered)
     c. Evaluate strategic value:
        - Leader damage: high value
        - Removing key character: medium-high value
        - Removing weak character: low-medium value
     d. Calculate score = value * (1 - risk)
  2. Rank targets by score
  3. Apply strategy modifier (aggressive = prefer leader, defensive = prefer characters)
  4. Return highest-scoring target
```

### DON Distribution Algorithm

```
function distributeDon(availableDon, characters, context):
  1. Identify characters that can attack this turn
  2. Calculate power-to-cost ratio for each character
  3. Prioritize characters with:
     - Ability to attack immediately
     - High power-to-cost ratio
     - Keywords (Rush, Double Attack)
  4. Distribute DON to maximize total attacking power
  5. Reserve DON for planned card plays
  6. Give remaining DON to leader for defense
```

## Error Handling

### Error Recovery Strategy

1. **Invalid Action Detection**: Validate all AI-selected actions before execution
2. **Fallback Mechanism**: If evaluation fails, select random legal action
3. **Timeout Handling**: If decision takes too long, select first legal action
4. **Logging**: Log all errors with context for debugging
5. **Graceful Degradation**: Never crash the game; always provide a valid action

### Error Types

```typescript
class AIDecisionError extends Error {
  constructor(message: string, public context: DecisionContext) {
    super(message);
  }
}

class AIEvaluationError extends AIDecisionError {}
class AITimeoutError extends AIDecisionError {}
class AIInvalidActionError extends AIDecisionError {}
```

## Testing Strategy

### Unit Tests

1. **Action Evaluator Tests**
   - Test each evaluation factor independently
   - Test score calculation with various game states
   - Test action simulation accuracy

2. **Decision System Tests**
   - Test action selection with known scenarios
   - Test mulligan decisions with various hands
   - Test blocker selection logic
   - Test counter decision logic

3. **Strategy Manager Tests**
   - Test strategy profile selection
   - Test dynamic strategy adjustment
   - Test weight calculations

### Integration Tests

1. **Full Game Tests**
   - AI vs AI games to completion
   - AI vs scripted opponent
   - Test all game phases with AI player

2. **Decision Quality Tests**
   - Test AI makes legal moves 100% of the time
   - Test AI doesn't make obviously bad moves
   - Test AI responds appropriately to game state

3. **Performance Tests**
   - Test decision time stays within limits
   - Test memory usage during long games
   - Test evaluation performance with complex board states

### Validation Tests

1. **Deterministic Tests**: Use fixed random seeds to ensure reproducible behavior
2. **Scenario Tests**: Test AI behavior in specific game situations
3. **Win Rate Tests**: Measure AI performance against baseline strategies

## Performance Considerations

### Optimization Strategies

1. **Action Pruning**: Filter obviously bad actions before evaluation
2. **Shallow Simulation**: Don't simulate full game state, only relevant changes
3. **Caching**: Cache evaluation results for identical game states
4. **Time Limits**: Implement time-limited evaluation with anytime algorithms
5. **Lazy Evaluation**: Only evaluate actions as needed

### Performance Targets

- Simple decisions (pass, end phase): < 100ms
- Card play decisions: < 1000ms
- Attack decisions: < 1500ms
- Complex decisions (multiple options): < 3000ms
- Memory usage: < 50MB additional per AI player

## Integration with Existing System

### Game Engine Modifications

1. **Player Interface**: Add abstract Player interface to GameEngine
2. **Decision Callbacks**: Replace direct user input with Player method calls
3. **Action Validation**: Ensure all player-selected actions are validated
4. **Event Emission**: Emit events for AI actions to enable UI updates

### Minimal Changes Required

- Modify `GameEngine.ts` to accept Player instances
- Update `MainPhase.ts` to call player.chooseAction()
- Update `BattleSystem.ts` to call player.chooseBlocker() and player.chooseCounterAction()
- Update `GameSetup.ts` to call player.chooseMulligan()
- No changes needed to core game logic, rules, or state management

## Future Enhancements

1. **Machine Learning**: Train AI using reinforcement learning
2. **Deck-Specific Strategies**: Adapt AI behavior based on deck archetype
3. **Opponent Modeling**: Learn and adapt to human player patterns
4. **Advanced Lookahead**: Implement minimax or Monte Carlo tree search
5. **Personality Profiles**: Create distinct AI personalities with different play styles
6. **Difficulty Scaling**: Dynamic difficulty adjustment based on player performance

## Architecture Diagrams

### Decision Flow

```
Game Engine Request
        ↓
   AI Player Controller
        ↓
   AI Decision System
        ↓
   ┌────┴────┐
   ↓         ↓
Action    Strategy
Evaluator  Manager
   ↓         ↓
   └────┬────┘
        ↓
   Selected Action
        ↓
   Game Engine Execution
```

### Evaluation Process

```
Action → Simulate → Evaluate Factors → Calculate Score
                         ↓
                    ┌────┴────┬────────┬──────────┬───────┐
                    ↓         ↓        ↓          ↓       ↓
                  Board   Resource  Life    Card    Tempo
                 Control  Efficiency Diff  Advantage
                    ↓         ↓        ↓          ↓       ↓
                    └────┬────┴────────┴──────────┴───────┘
                         ↓
                   Weighted Sum → Final Score
```

## Summary

The AI Opponent System provides a modular, extensible architecture for computer-controlled players. The design leverages the existing game engine infrastructure while adding a clean abstraction layer for player decision-making. The scoring-based evaluation system allows for tunable difficulty levels and play styles, while maintaining good performance and error handling. The system is designed to be testable, maintainable, and ready for future enhancements.
