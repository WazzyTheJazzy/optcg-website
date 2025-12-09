# Design Document

## Overview

The One Piece TCG Engine is a modular, rules-accurate game engine built with TypeScript that separates game logic from presentation. The architecture consists of three main layers:

1. **Core Engine Layer**: Pure game logic with no UI dependencies
2. **Rendering Interface Layer**: Event-driven bridge between engine and visuals
3. **Three.js Visualization Layer**: 3D card rendering and animations

The engine uses an event-driven architecture where game state changes emit events that the rendering layer can subscribe to. This allows the core engine to run independently (for AI, testing, or server-side play) while supporting rich 3D visuals when needed.

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Game Application                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Three.js Visualization Layer             │ │
│  │  - Card meshes and materials                       │ │
│  │  - Zone representations                            │ │
│  │  - Animation system (future)                       │ │
│  │  - Special effects (future)                        │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Rendering Interface Layer                  │ │
│  │  - Event subscriptions                             │ │
│  │  - State queries                                   │ │
│  │  - Animation hooks                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Core Engine Layer                     │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  Game Engine                                 │ │ │
│  │  │  - State management                          │ │ │
│  │  │  - Turn execution                            │ │ │
│  │  │  - Event emission                            │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  Rules Context                               │ │ │
│  │  │  - JSON rules wrapper                        │ │ │
│  │  │  - Rule queries                              │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  Battle System                               │ │ │
│  │  │  - Attack resolution                         │ │ │
│  │  │  - Damage calculation                        │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  Effect System                               │ │ │
│  │  │  - Trigger queue                             │ │ │
│  │  │  - Effect resolution                         │ │ │
│  │  │  - Script execution                          │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Data Layer                            │ │
│  │  - Card definitions (JSON/Database)                │ │
│  │  - Rules JSON                                      │ │
│  │  - Deck lists                                      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Module Structure

```
lib/
  game-engine/
    core/
      GameEngine.ts          # Main engine orchestrator
      GameState.ts           # State management
      types.ts               # Core type definitions
    rules/
      RulesContext.ts        # Rules JSON wrapper
      rules.json             # Official rules data
    battle/
      BattleSystem.ts        # Attack and combat logic
      DamageCalculator.ts    # Power and damage calculations
    effects/
      EffectSystem.ts        # Effect resolution
      TriggerQueue.ts        # Auto trigger management
      EffectScripts.ts       # Effect implementations
    zones/
      ZoneManager.ts         # Zone operations
      CardMovement.ts        # Card transitions
    phases/
      PhaseManager.ts        # Turn phase execution
      RefreshPhase.ts
      DrawPhase.ts
      DonPhase.ts
      MainPhase.ts
      EndPhase.ts
    setup/
      GameSetup.ts           # Initial game setup
      DeckLoader.ts          # Deck loading
    rendering/
      RenderingInterface.ts  # Bridge to Three.js
      EventEmitter.ts        # Game event system
      AnimationHooks.ts      # Future animation support
    utils/
      LoopGuard.ts           # Infinite loop detection
      DefeatChecker.ts       # Win/loss conditions
      
components/
  game/
    GameScene.tsx            # Three.js scene container
    CardMesh.tsx             # 3D card representation
    ZoneRenderer.tsx         # Zone visualization
    GameBoard.tsx            # Complete board layout
```

## Components and Interfaces

### Core Engine Components

#### GameEngine

The main orchestrator that manages game flow.

```typescript
class GameEngine {
  private state: GameState;
  private rules: RulesContext;
  private battleSystem: BattleSystem;
  private effectSystem: EffectSystem;
  private phaseManager: PhaseManager;
  private zoneManager: ZoneManager;
  private renderingInterface: RenderingInterface;
  private loopGuard: LoopGuard;
  
  constructor(rules: RulesContext, renderingInterface?: RenderingInterface);
  
  // Game lifecycle
  setupGame(deck1: CardDefinition[], deck2: CardDefinition[]): void;
  runGame(): PlayerId | null; // Returns winner or null for draw
  runTurn(): void;
  
  // Action handlers
  playCard(playerId: PlayerId, cardId: string, targets?: Target[]): boolean;
  activateEffect(playerId: PlayerId, cardId: string, effectId: string): boolean;
  giveDon(playerId: PlayerId, donId: string, targetCardId: string): boolean;
  declareAttack(playerId: PlayerId, attackerId: string, targetId: string): boolean;
  
  // State queries
  getState(): Readonly<GameState>;
  canPerformAction(playerId: PlayerId, action: Action): boolean;
  getLegalActions(playerId: PlayerId): Action[];
  
  // Event system
  on(event: GameEventType, handler: EventHandler): void;
  off(event: GameEventType, handler: EventHandler): void;
}
```

#### GameState

Immutable state container with update methods.

```typescript
interface GameState {
  players: Map<PlayerId, PlayerState>;
  activePlayer: PlayerId;
  phase: Phase;
  turnNumber: number;
  pendingTriggers: TriggerInstance[];
  gameOver: boolean;
  winner: PlayerId | null;
  history: GameAction[]; // For replay/undo
}

interface PlayerState {
  id: PlayerId;
  zones: {
    deck: CardInstance[];
    hand: CardInstance[];
    trash: CardInstance[];
    life: CardInstance[];
    donDeck: DonInstance[];
    costArea: DonInstance[];
    leaderArea: CardInstance;
    characterArea: CardInstance[]; // Max 5
    stageArea: CardInstance | null;
  };
  flags: Map<string, any>;
}

interface CardInstance {
  id: string; // Unique instance ID
  definition: CardDefinition;
  owner: PlayerId;
  controller: PlayerId;
  zone: ZoneId;
  state: CardState;
  givenDon: DonInstance[];
  modifiers: Modifier[];
  flags: Map<string, any>;
  metadata: CardMetadata; // For rendering (alt art, promo, etc)
}
```

#### RulesContext

Wrapper around rules JSON providing type-safe queries.

```typescript
class RulesContext {
  private rules: RulesData;
  
  constructor(rulesJson: RulesData);
  
  getPhaseSequence(): Phase[];
  getBattleSteps(): BattleStep[];
  getKeywordDefinition(keyword: string): KeywordDef | null;
  isFirstTurnBattleBanned(): boolean;
  getMaxCharacterArea(): number;
  getStartingHandSize(): number;
  getDonPerTurn(turnNumber: number, isFirstPlayer: boolean): number;
  getInfiniteLoopRules(): LoopRules;
}
```

#### BattleSystem

Handles all combat-related logic.

```typescript
class BattleSystem {
  constructor(
    private state: GameState,
    private effectSystem: EffectSystem,
    private zoneManager: ZoneManager,
    private eventEmitter: EventEmitter
  );
  
  executeAttack(
    attackerId: string,
    targetId: string
  ): BattleResult;
  
  private attackStep(attacker: CardInstance, target: CardInstance): void;
  private blockStep(attacker: CardInstance, target: CardInstance): CardInstance;
  private counterStep(attacker: CardInstance, defender: CardInstance): void;
  private damageStep(attacker: CardInstance, defender: CardInstance): void;
  private endBattle(attacker: CardInstance, defender: CardInstance): void;
  
  canAttack(attackerId: string, targetId: string): boolean;
  getLegalTargets(attackerId: string): CardInstance[];
  getLegalBlockers(attackerId: string, defenderId: PlayerId): CardInstance[];
}
```

#### EffectSystem

Manages effect resolution and triggers.

```typescript
class EffectSystem {
  private triggerQueue: TriggerQueue;
  private effectScripts: EffectScripts;
  
  constructor(
    private state: GameState,
    private eventEmitter: EventEmitter
  );
  
  // Trigger management
  enqueueTrigger(trigger: TriggerInstance): void;
  resolveAllPendingTriggers(): void;
  
  // Effect activation
  activateEffect(
    cardId: string,
    effectId: string,
    targets: Target[],
    values: Map<string, any>
  ): boolean;
  
  // Effect resolution
  resolveEffect(instance: EffectInstance): void;
  
  // Condition checking
  checkCondition(condition: ConditionExpr, context: EffectContext): boolean;
  
  // Cost payment
  payCost(cost: CostExpr, playerId: PlayerId): boolean;
  
  // Script execution
  executeScript(scriptId: string, context: EffectContext): void;
}
```

### Rendering Interface Components

#### RenderingInterface

Bridge between engine and Three.js layer.

```typescript
class RenderingInterface {
  private eventEmitter: EventEmitter;
  private animationQueue: AnimationHook[];
  
  constructor(engine: GameEngine);
  
  // Event subscriptions
  onCardMoved(handler: (event: CardMovedEvent) => void): void;
  onCardStateChanged(handler: (event: CardStateChangedEvent) => void): void;
  onPowerChanged(handler: (event: PowerChangedEvent) => void): void;
  onBattleEvent(handler: (event: BattleEvent) => void): void;
  onPhaseChanged(handler: (event: PhaseChangedEvent) => void): void;
  
  // State queries for rendering
  getCardVisualState(cardId: string): CardVisualState;
  getZoneContents(playerId: PlayerId, zone: ZoneId): CardVisualState[];
  getBoardState(): BoardVisualState;
  
  // Animation hooks (future)
  registerAnimationHook(hook: AnimationHook): void;
  waitForAnimation(animationId: string): Promise<void>;
  
  // Metadata for special effects
  getCardMetadata(cardId: string): CardMetadata;
}

interface CardVisualState {
  id: string;
  position: { zone: ZoneId; index: number };
  state: CardState; // ACTIVE/RESTED
  power: number;
  cost: number;
  givenDonCount: number;
  metadata: CardMetadata;
}

interface CardMetadata {
  isAltArt: boolean;
  isPromo: boolean;
  isLeader: boolean;
  rarity: string;
  colors: string[];
  // Future: animation preferences, special effect triggers
}

interface AnimationHook {
  id: string;
  trigger: GameEventType;
  duration: number;
  callback: () => void | Promise<void>;
}
```

### Three.js Visualization Components

#### GameScene Component

Main Three.js scene container.

```typescript
interface GameSceneProps {
  engine: GameEngine;
  renderingInterface: RenderingInterface;
}

// React component wrapping Three.js scene
function GameScene({ engine, renderingInterface }: GameSceneProps) {
  // Sets up Three.js scene, camera, lights
  // Subscribes to rendering interface events
  // Manages card meshes and zone layouts
  // Handles user interactions (click, drag)
}
```

#### CardMesh Component

3D representation of a card.

```typescript
interface CardMeshProps {
  cardState: CardVisualState;
  onInteract: (cardId: string, action: string) => void;
}

// Creates Three.js mesh for a card
// Handles rotation for ACTIVE/RESTED states
// Displays card image texture
// Shows power/cost overlays
// Future: Animations, special effects
```

## Data Models

### Card Definition Schema

```typescript
interface CardDefinition {
  id: string;
  name: string;
  category: CardCategory;
  colors: string[];
  typeTags: string[];
  attributes: string[];
  basePower: number | null;
  baseCost: number | null;
  lifeValue: number | null; // Leaders only
  counterValue: number | null; // Characters only
  rarity: string;
  keywords: string[];
  effects: EffectDefinition[];
  imageUrl: string;
  metadata: {
    setCode: string;
    cardNumber: string;
    isAltArt: boolean;
    isPromo: boolean;
  };
}

interface EffectDefinition {
  id: string;
  label: string; // "[On Play]", "[When Attacking]", etc
  timingType: EffectTimingType;
  triggerTiming: TriggerTiming | null;
  condition: ConditionExpr | null;
  cost: CostExpr | null;
  scriptId: string;
  oncePerTurn: boolean;
}
```

### Rules JSON Schema

```typescript
interface RulesData {
  version: string;
  turnStructure: {
    phases: Phase[];
    firstTurnRules: {
      skipDraw: boolean;
      donCount: number;
      canBattle: boolean;
    };
  };
  battleSystem: {
    steps: BattleStep[];
    powerComparison: string;
    damageRules: {
      leaderDamage: number;
      doubleAttackDamage: number;
    };
  };
  keywords: {
    [keyword: string]: KeywordDef;
  };
  zones: {
    [zone: string]: ZoneDef;
  };
  defeatConditions: string[];
  infiniteLoopRules: LoopRules;
}
```

### Effect Script System

Effects are implemented as TypeScript functions with a standardized signature:

```typescript
type EffectScript = (context: EffectContext) => void;

interface EffectContext {
  state: GameState;
  source: CardInstance;
  controller: PlayerId;
  targets: Target[];
  values: Map<string, any>;
  event: GameEvent | null;
  
  // Helper methods
  moveCard(cardId: string, toZone: ZoneId): void;
  modifyPower(cardId: string, amount: number, duration: ModifierDuration): void;
  modifyCost(cardId: string, amount: number, duration: ModifierDuration): void;
  drawCards(playerId: PlayerId, count: number): void;
  searchZone(playerId: PlayerId, zone: ZoneId, filter: CardFilter): CardInstance[];
  // ... more helpers
}

// Example effect script
const onPlayDrawTwo: EffectScript = (context) => {
  context.drawCards(context.controller, 2);
};
```

## Error Handling

### Error Types

```typescript
class GameEngineError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

class IllegalActionError extends GameEngineError {
  constructor(action: string, reason: string) {
    super(`Illegal action: ${action}. Reason: ${reason}`, 'ILLEGAL_ACTION');
  }
}

class InvalidStateError extends GameEngineError {
  constructor(message: string) {
    super(message, 'INVALID_STATE');
  }
}

class RulesViolationError extends GameEngineError {
  constructor(rule: string) {
    super(`Rules violation: ${rule}`, 'RULES_VIOLATION');
  }
}
```

### Error Handling Strategy

1. **Validation Before Execution**: All actions are validated before state changes
2. **Atomic Operations**: State changes are atomic - either fully succeed or fully rollback
3. **Error Events**: Errors emit events that UI can display to users
4. **Graceful Degradation**: Rendering errors don't crash the engine
5. **Debug Mode**: Optional verbose logging for development

```typescript
class GameEngine {
  private debugMode: boolean = false;
  
  playCard(playerId: PlayerId, cardId: string): boolean {
    try {
      // Validate
      if (!this.canPlayCard(playerId, cardId)) {
        throw new IllegalActionError('play card', 'Cannot afford or invalid target');
      }
      
      // Execute
      const result = this.executePlayCard(playerId, cardId);
      
      // Emit success event
      this.emit('cardPlayed', { playerId, cardId });
      
      return true;
    } catch (error) {
      if (error instanceof GameEngineError) {
        this.emit('actionError', { error, playerId, action: 'playCard' });
        if (this.debugMode) console.error(error);
        return false;
      }
      throw error; // Re-throw unexpected errors
    }
  }
}
```

## Testing Strategy

### Unit Testing

Test individual components in isolation:

- **GameState**: State transitions, immutability
- **RulesContext**: Rule queries, JSON parsing
- **BattleSystem**: Attack resolution, damage calculation
- **EffectSystem**: Trigger queuing, effect resolution
- **ZoneManager**: Card movement, zone limits

### Integration Testing

Test component interactions:

- **Turn Flow**: Complete turn execution through all phases
- **Battle Flow**: Full attack sequence from declaration to damage
- **Effect Chains**: Multiple triggers resolving in sequence
- **Win Conditions**: Deck out, life depletion scenarios

### Rules Accuracy Testing

Verify official rules compliance:

- **Card Interaction Tests**: Specific card combinations from official rulings
- **Edge Cases**: Unusual game states, timing conflicts
- **Keyword Tests**: Each keyword behaves correctly
- **Phase Tests**: Each phase follows official rules

### Rendering Integration Testing

Test engine-to-visual communication:

- **Event Emission**: All state changes emit appropriate events
- **State Queries**: Rendering interface returns correct visual state
- **Animation Hooks**: Hooks are called at correct times (when implemented)

### Performance Testing

- **Large Game States**: 100+ turn games
- **Complex Boards**: Full character areas, many effects
- **Loop Detection**: Infinite loop scenarios
- **Memory Leaks**: Long-running games

### Test Structure

```typescript
describe('BattleSystem', () => {
  let engine: GameEngine;
  let state: GameState;
  
  beforeEach(() => {
    engine = createTestEngine();
    state = engine.getState();
  });
  
  describe('Attack Resolution', () => {
    it('should rest attacker when attack is declared', () => {
      const attacker = createTestCharacter({ power: 5000 });
      const target = createTestLeader();
      
      engine.declareAttack(PLAYER_1, attacker.id, target.id);
      
      const updatedAttacker = engine.getState().getCard(attacker.id);
      expect(updatedAttacker.state).toBe(CardState.RESTED);
    });
    
    it('should trigger "When Attacking" effects', () => {
      const attacker = createTestCharacter({
        power: 5000,
        effects: [whenAttackingDrawOne]
      });
      
      const handSizeBefore = engine.getState().players.get(PLAYER_1)!.zones.hand.length;
      
      engine.declareAttack(PLAYER_1, attacker.id, opponentLeader.id);
      
      const handSizeAfter = engine.getState().players.get(PLAYER_1)!.zones.hand.length;
      expect(handSizeAfter).toBe(handSizeBefore + 1);
    });
  });
});
```

## Implementation Phases

### Phase 1: Core Engine Foundation
- Type definitions and interfaces
- GameState and state management
- RulesContext and rules JSON loading
- Basic zone management
- Event emission system

### Phase 2: Turn Structure
- Phase manager
- Individual phase implementations
- Turn loop
- Basic action validation

### Phase 3: Card Playing
- Play card from hand
- Cost payment with DON
- Character/Stage/Event handling
- Zone limit enforcement

### Phase 4: Battle System
- Attack declaration
- Block mechanics
- Counter step
- Damage resolution
- K.O. handling

### Phase 5: Effect System
- Trigger queue
- Effect resolution
- Basic effect scripts
- Condition evaluation
- Cost payment for effects

### Phase 6: Win Conditions
- Defeat checking
- Deck out detection
- Life depletion
- Loop guard

### Phase 7: Rendering Interface
- Event subscriptions
- State query methods
- Visual state mapping
- Animation hook placeholders

### Phase 8: Three.js Integration
- GameScene component
- CardMesh component
- Zone renderers
- User interaction handling

### Phase 9: Advanced Features
- Effect script library
- Keyword implementations
- Replacement effects
- Complex card interactions

### Phase 10: Polish & Testing
- Comprehensive test suite
- Performance optimization
- Documentation
- Example games and demos

## Design Decisions and Rationales

### Separation of Engine and Rendering

**Decision**: Keep game logic completely independent of Three.js

**Rationale**: 
- Allows engine to run headless for AI, testing, server-side
- Makes testing easier (no need to mock Three.js)
- Enables different rendering backends (2D, VR, etc)
- Improves performance by not coupling logic to render loop

### Event-Driven Architecture

**Decision**: Use event emission for state changes rather than polling

**Rationale**:
- More efficient than polling state every frame
- Clear separation of concerns
- Easy to add new listeners without modifying engine
- Natural fit for animation system

### Immutable State with Update Methods

**Decision**: GameState is immutable, updates return new state

**Rationale**:
- Easier to implement undo/replay
- Prevents accidental state corruption
- Simplifies debugging (can inspect state at any point)
- Enables time-travel debugging

### Script-Based Effect System

**Decision**: Effects are TypeScript functions, not DSL

**Rationale**:
- Full power of TypeScript for complex effects
- No need to build/maintain custom parser
- Better IDE support and type checking
- Easier debugging
- Can still load from JSON by mapping scriptId to function

### Rules JSON Wrapper

**Decision**: Never access rules JSON directly, always through RulesContext

**Rationale**:
- Type safety for rule queries
- Single point to update if rules JSON schema changes
- Can add caching/optimization in wrapper
- Easier to test (can mock RulesContext)

### Animation Hook System

**Decision**: Placeholder hooks now, implement animations later

**Rationale**:
- Don't block core engine development on animations
- Ensures architecture supports animations from the start
- Can add animations incrementally per card type
- Hooks are no-ops until implemented (zero performance cost)

### Zone as First-Class Concept

**Decision**: Zones are explicit in the data model, not just arrays

**Rationale**:
- Many rules care about which zone a card is in
- Zone transitions are common operations
- Easier to enforce zone-specific rules (character limit, etc)
- Natural mapping to visual layout

### Player-Centric State Organization

**Decision**: State organized by player, not by zone type

**Rationale**:
- Most operations are player-specific
- Easier to implement "your" vs "opponent's" effects
- Natural for multiplayer expansion
- Matches how players think about the game
