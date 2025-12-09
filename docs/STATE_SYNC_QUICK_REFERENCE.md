# State Synchronization Quick Reference

## ⚡ Quick Rules

### 1. Update Order (CRITICAL)
```typescript
// ✅ ALWAYS follow this order:
this.stateManager = newState;      // 1. Update state
this.updateAllSubsystems();        // 2. Sync subsystems  
this.eventEmitter.emit(...);       // 3. Emit events
```

### 2. Reading State
```typescript
// ❌ WRONG - Creates copies
const sm1 = new GameStateManager(engine.getState());
const sm2 = new GameStateManager(engine.getState());

// ✅ CORRECT - Use single source
const sm = engine.getStateManager();
const player1 = sm.getPlayer(PlayerId.PLAYER_1);
const player2 = sm.getPlayer(PlayerId.PLAYER_2);
```

### 3. Event Types
```typescript
// Use STATE_CHANGED for UI updates
renderingInterface.onStateChanged(() => {
  updateUI();  // State is guaranteed to be synced
});

// Use specific events for game logic
renderingInterface.onCardMoved((event) => {
  animateCard(event.cardId);  // React to specific action
});
```

## 🔍 Debugging Checklist

When state isn't updating correctly:

- [ ] Are events emitted AFTER state updates?
- [ ] Is `updateAllSubsystems()` called before emitting?
- [ ] Are you reading from `engine.getStateManager()` (not creating new instances)?
- [ ] Are you reusing the state manager within a single operation?
- [ ] Check console logs for event timing

## 📝 Common Patterns

### Pattern: State-Changing Operation
```typescript
async performAction(params): Promise<boolean> {
  try {
    // 1. Validate
    ValidationUtils.validate(this.stateManager.getState());
    
    // 2. Execute operation (returns new state)
    const result = await someHandler(
      this.stateManager,
      this.zoneManager,
      params
    );
    
    if (!result.success) {
      return false;
    }
    
    // 3. Update engine state
    this.stateManager = result.newState;
    
    // 4. Sync all subsystems
    this.updateAllSubsystems();
    
    // 5. Emit state changed event
    this.eventEmitter.emit({
      type: GameEventType.STATE_CHANGED,
      timestamp: Date.now(),
    });
    
    // 6. Handle side effects
    this.resolvePendingTriggers();
    
    return true;
  } catch (error) {
    this.errorHandler.handleError(error);
    return false;
  }
}
```

### Pattern: Reading State for Rendering
```typescript
getBoardState(): BoardVisualState {
  // Get state manager ONCE
  const stateManager = this.getStateManager();
  
  // Reuse it for all reads
  return {
    player1: this.getPlayerState(PlayerId.PLAYER_1, stateManager),
    player2: this.getPlayerState(PlayerId.PLAYER_2, stateManager),
    phase: stateManager.getState().phase,
    // ...
  };
}

private getPlayerState(
  playerId: PlayerId, 
  stateManager: GameStateManager  // ← Pass it down
): PlayerState {
  const player = stateManager.getPlayer(playerId);
  // Use the same state manager throughout
}
```

### Pattern: React Component State Updates
```typescript
useEffect(() => {
  if (!renderingInterface) return;
  
  // Subscribe to STATE_CHANGED
  const unsubscribe = renderingInterface.onStateChanged(() => {
    // Fetch fresh state
    const newState = renderingInterface.getBoardState();
    setBoardState(newState);
  });
  
  // Initial fetch
  const initialState = renderingInterface.getBoardState();
  setBoardState(initialState);
  
  return unsubscribe;
}, [renderingInterface]);
```

## 🚫 Anti-Patterns

### ❌ Emitting Before Update
```typescript
// WRONG - Event fires before state is ready
this.eventEmitter.emit({ type: GameEventType.STATE_CHANGED });
this.stateManager = newState;  // Too late!
```

### ❌ Creating Multiple State Copies
```typescript
// WRONG - Each call creates a new snapshot
for (const zone of zones) {
  const contents = this.getZoneContents(zone);  // New state each time
}
```

### ❌ Forgetting to Sync
```typescript
// WRONG - Subsystems out of sync
this.stateManager = newState;
this.eventEmitter.emit({ type: GameEventType.STATE_CHANGED });
// Forgot updateAllSubsystems()!
```

### ❌ Mutating State
```typescript
// WRONG - Mutating immutable state
const player = stateManager.getPlayer(playerId);
player.zones.hand.push(card);  // Don't mutate!
```

## 🧪 Testing State Sync

### Test: Event Timing
```typescript
test('STATE_CHANGED fires after state update', () => {
  let stateAtEventTime: GameState | null = null;
  
  engine.onStateChanged(() => {
    stateAtEventTime = engine.getState();
  });
  
  engine.playCard(playerId, cardId);
  
  expect(stateAtEventTime?.characterArea).toHaveLength(1);
});
```

### Test: Subsystem Sync
```typescript
test('subsystems are synchronized', () => {
  engine.playCard(playerId, cardId);
  
  const engineState = engine.getState();
  const zoneState = engine['zoneManager']['stateManager'].getState();
  
  expect(zoneState).toBe(engineState);  // Same reference
});
```

### Test: State Immutability
```typescript
test('state updates are immutable', () => {
  const before = engine.getState();
  engine.playCard(playerId, cardId);
  const after = engine.getState();
  
  expect(after).not.toBe(before);  // Different object
  expect(before.characterArea).toHaveLength(0);  // Old unchanged
  expect(after.characterArea).toHaveLength(1);   // New updated
});
```

## 📊 State Flow Diagram

```
User Action
    ↓
GameEngine.performAction()
    ↓
Handler (returns new state)
    ↓
this.stateManager = newState  ← Update engine
    ↓
this.updateAllSubsystems()    ← Sync all systems
    ↓
emit(STATE_CHANGED)           ← Notify listeners
    ↓
RenderingInterface            ← Reads via getStateManager()
    ↓
GameBoard (React)             ← Updates UI
```

## 🎯 Key Takeaways

1. **One source of truth**: GameEngine owns the state
2. **Update before emit**: Always update state before emitting events
3. **Sync explicitly**: Call `updateAllSubsystems()` after updates
4. **No copies**: Use `getStateManager()`, don't create new instances
5. **Immutable updates**: Create new state objects, don't mutate
6. **Test timing**: Verify state is correct when events fire

## 📚 Full Documentation

For detailed explanations, see:
- [State Management Architecture](./STATE_MANAGEMENT_ARCHITECTURE.md)
- [Lessons Learned: State Sync](./LESSONS_LEARNED_STATE_SYNC.md)
