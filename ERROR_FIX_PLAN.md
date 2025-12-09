# Error Fix Plan - December 4, 2025

## Overview
This document outlines the systematic approach to fixing the 17+ test failures identified in the codebase.

## Fix Priority Order

### Phase 1: Critical Core Functionality (Blocks Gameplay)

#### Fix 1: Performance Monitor Integration
**Files**: `lib/game-engine/effects/PerformanceMonitor.ts`
**Issue**: Missing `onWarning` method causing TypeErrors
**Impact**: 12 visual environment tests failing
**Fix**:
```typescript
// Add onWarning method to PerformanceMonitor class
public onWarning(callback: (warning: PerformanceWarning) => void): void {
  this.warningCallbacks.push(callback);
}
```

#### Fix 2: Effect System State Management
**Files**: `lib/game-engine/effects/EffectSystem.ts`
**Issue**: State changes occurring even when cost payment fails
**Impact**: 3 cost-before-resolution tests failing
**Fix**:
- Implement transaction-like state management
- Rollback state if cost payment fails
- Ensure cost validation happens before any state mutations

#### Fix 3: Attack System Execution
**Files**: `lib/game-engine/phases/MainPhase.ts`, `lib/game-engine/battle/BattleSystem.ts`
**Issue**: Attacks not completing properly
**Impact**: 13 attack-related tests failing
**Fix**:
- Ensure attack execution completes all steps
- Fix attack generation to produce valid attacks
- Implement proper attack limit validation
- Handle multiple attacks correctly

### Phase 2: Component Integration Issues

#### Fix 4: React Component Refs
**Files**: `components/game/GameScene.tsx`
**Issue**: SceneContent component needs forwardRef
**Impact**: Visual environment rendering warnings
**Fix**:
```typescript
const SceneContent = React.forwardRef<THREE.Group, SceneContentProps>((props, ref) => {
  // Component implementation
});
```

#### Fix 5: GameBoard Integration
**Files**: `components/game/GameBoard.tsx`
**Issue**: Card data errors and error handling issues
**Impact**: 8 GameBoard integration tests failing
**Fix**:
- Add proper card existence validation
- Improve error handling for invalid actions
- Add null checks for card lookups

### Phase 3: AI System Fixes

#### Fix 6: ActionEvaluator State Simulation
**Files**: `lib/game-engine/ai/ActionEvaluator.ts`
**Issue**: Simulated actions affecting real game state
**Impact**: 3 ActionEvaluator tests failing
**Fix**:
- Implement deep state cloning for simulations
- Ensure simulated actions don't modify original state
- Add state verification after simulations

#### Fix 7: AI vs AI Game Completion
**Files**: `lib/game-engine/ai/AI.integration.test.ts`, `lib/game-engine/FullGame.integration.test.ts`
**Issue**: AI games not completing without errors
**Impact**: Integration test failures
**Fix**:
- Fix underlying attack and effect system issues (Fixes 2 & 3)
- Add better error handling in AI decision loop
- Implement game completion detection

## Detailed Fix Implementation

### Fix 1: Performance Monitor - onWarning Method

**Problem**: The PerformanceMonitor class is missing the `onWarning` method that's being called in GameScene.

**Solution**:
```typescript
// In lib/game-engine/effects/PerformanceMonitor.ts

export interface PerformanceWarning {
  type: 'fps' | 'memory' | 'calls';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private warningCallbacks: Array<(warning: PerformanceWarning) => void> = [];
  
  // Add this method
  public onWarning(callback: (warning: PerformanceWarning) => void): void {
    this.warningCallbacks.push(callback);
  }
  
  // Emit warnings when thresholds are exceeded
  private emitWarning(warning: PerformanceWarning): void {
    this.warningCallbacks.forEach(callback => callback(warning));
  }
  
  // Update existing methods to emit warnings
  public recordFrame(deltaTime: number, drawCalls: number): void {
    // ... existing code ...
    
    // Check thresholds and emit warnings
    if (this.metrics.fps < 30) {
      this.emitWarning({
        type: 'fps',
        message: 'Low FPS detected',
        value: this.metrics.fps,
        threshold: 30,
        timestamp: Date.now(),
      });
    }
  }
}
```

### Fix 2: Effect System State Management

**Problem**: Effects are modifying state even when cost payment fails.

**Solution**: Implement transaction-like state management:

```typescript
// In lib/game-engine/effects/EffectSystem.ts

export class EffectSystem {
  // Add state snapshot capability
  private createStateSnapshot(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
  }
  
  // Modify resolveEffect to use transactions
  public async resolveEffect(
    effect: EffectDefinition,
    source: CardInstance,
    targets: CardInstance[]
  ): Promise<void> {
    // Create snapshot before attempting cost payment
    const stateSnapshot = this.createStateSnapshot(this.stateManager.getState());
    
    try {
      // Attempt to pay cost
      const costPaid = await this.payCost(effect.cost, source.controller);
      
      if (!costPaid) {
        // Rollback to snapshot
        this.stateManager.setState(stateSnapshot);
        throw new Error('Cost payment failed');
      }
      
      // Cost paid successfully, proceed with effect
      await this.executeEffect(effect, source, targets);
      
    } catch (error) {
      // Rollback to snapshot on any error
      this.stateManager.setState(stateSnapshot);
      throw error;
    }
  }
}
```

### Fix 3: Attack System Execution

**Problem**: Attacks not completing all steps properly.

**Solution**: Ensure complete attack flow:

```typescript
// In lib/game-engine/phases/MainPhase.ts

export async function executeAttack(
  state: GameState,
  attackerId: string,
  targetId: string,
  battleSystem: BattleSystem,
  eventEmitter: EventEmitter
): Promise<boolean> {
  try {
    // 1. Validate attack is still legal
    const attacker = findCard(state, attackerId);
    const target = findCard(state, targetId);
    
    if (!attacker || !target) {
      console.error('[MainPhase] Attack failed: Card not found');
      return false;
    }
    
    // 2. Rest the attacker
    attacker.state = CardState.RESTED;
    eventEmitter.emit('CARD_STATE_CHANGED', { cardId: attackerId, newState: CardState.RESTED });
    
    // 3. Execute battle through BattleSystem
    const battleResult = await battleSystem.executeBattle(attackerId, targetId);
    
    // 4. Process battle results
    if (battleResult.defenderKOed) {
      // Handle defender KO
      await handleCharacterKO(state, targetId, eventEmitter);
    }
    
    if (battleResult.lifeDamage > 0) {
      // Handle life damage
      await processLifeDamage(state, target.controller, battleResult.lifeDamage, eventEmitter);
    }
    
    // 5. Mark attack as completed
    if (!attacker.flags) attacker.flags = new Map();
    attacker.flags.set('hasAttacked', true);
    
    // 6. Emit completion event
    eventEmitter.emit('ATTACK_COMPLETED', {
      attackerId,
      targetId,
      result: battleResult,
    });
    
    return true;
    
  } catch (error) {
    console.error('[MainPhase] Attack execution error:', error);
    return false;
  }
}
```

### Fix 4: React Component Refs

**Problem**: SceneContent component cannot receive refs.

**Solution**:
```typescript
// In components/game/GameScene.tsx

const SceneContent = React.forwardRef<THREE.Group, SceneContentProps>(
  ({ boardState, onCardClick, selectedCardId, attackMode, donAttachMode }, ref) => {
    // Component implementation
    return (
      <group ref={ref}>
        {/* ... existing content ... */}
      </group>
    );
  }
);

SceneContent.displayName = 'SceneContent';
```

### Fix 5: GameBoard Integration

**Problem**: Card data errors when cards don't exist.

**Solution**:
```typescript
// In components/game/GameBoard.tsx

const handleCardAction = async (cardId: string) => {
  try {
    // Validate card exists
    const card = findCardInState(boardState, cardId);
    if (!card) {
      console.warn(`Card not found: ${cardId}`);
      setError(`Card not found: ${cardId}`);
      return;
    }
    
    // Proceed with action
    await performAction(card);
    
  } catch (error) {
    console.error('Card action error:', error);
    setError(error.message);
  }
};
```

### Fix 6: ActionEvaluator State Simulation

**Problem**: Simulations modifying original state.

**Solution**:
```typescript
// In lib/game-engine/ai/ActionEvaluator.ts

export class ActionEvaluator {
  // Deep clone state for simulation
  private cloneGameState(state: GameState): GameState {
    // Use structured clone or deep copy
    return JSON.parse(JSON.stringify(state));
  }
  
  public simulateAction(action: GameAction, state: GameState): GameState {
    // Clone state before simulation
    const simulatedState = this.cloneGameState(state);
    
    // Perform action on cloned state
    switch (action.type) {
      case ActionType.PLAY_CARD:
        this.simulatePlayCard(simulatedState, action);
        break;
      case ActionType.GIVE_DON:
        this.simulateGiveDon(simulatedState, action);
        break;
      case ActionType.DECLARE_ATTACK:
        this.simulateAttack(simulatedState, action);
        break;
    }
    
    // Return modified clone, original state unchanged
    return simulatedState;
  }
}
```

## Testing Strategy

### Phase 1 Testing
1. Run PerformanceMonitor tests
2. Run VisualEnvironment integration tests
3. Verify no TypeErrors

### Phase 2 Testing
1. Run EffectSystem.costBeforeResolution tests
2. Run all MainPhase attack tests
3. Verify attack execution completes

### Phase 3 Testing
1. Run GameBoard integration tests
2. Run ActionEvaluator tests
3. Run AI integration tests

### Final Verification
1. Run full test suite: `npm test`
2. Verify all 17+ failures are resolved
3. Run AI vs AI game manually
4. Check console for errors

## Success Criteria

- [ ] All PerformanceMonitor tests pass
- [ ] All EffectSystem cost tests pass
- [ ] All MainPhase attack tests pass (13 tests)
- [ ] All VisualEnvironment tests pass (12 tests)
- [ ] All GameBoard integration tests pass (8 tests)
- [ ] All ActionEvaluator tests pass (3 tests)
- [ ] AI vs AI games complete without errors
- [ ] No console errors during gameplay
- [ ] Total test count: 0 failures

## Implementation Order

1. Fix 1: PerformanceMonitor.onWarning (5 minutes)
2. Fix 4: React forwardRef (5 minutes)
3. Fix 2: Effect System transactions (30 minutes)
4. Fix 3: Attack System execution (45 minutes)
5. Fix 5: GameBoard validation (15 minutes)
6. Fix 6: ActionEvaluator cloning (20 minutes)
7. Test and verify (30 minutes)

**Total Estimated Time**: 2.5 hours
