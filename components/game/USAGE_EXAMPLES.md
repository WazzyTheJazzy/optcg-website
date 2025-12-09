# Main Phase UI Interactions - Usage Examples

This document provides examples for extending and working with the Main Phase UI interaction system.

## Table of Contents

1. [Adding New Actions](#adding-new-actions)
2. [Extending ActionPanel](#extending-actionpanel)
3. [Event Subscription Patterns](#event-subscription-patterns)
4. [Custom Card Interactions](#custom-card-interactions)

---

## Adding New Actions

### Example: Adding a "Use Ability" Action

To add a new action type for card abilities:

**Step 1: Update the Action type**

```typescript
// In components/game/ActionPanel.tsx
export type Action = 'PLAY_CARD' | 'ATTACK' | 'ATTACH_DON' | 'USE_ABILITY';
```

**Step 2: Add action availability logic**

```typescript
// In getAvailableActions function
export function getAvailableActions(
  selectedCard: CardVisualState | null,
  boardState: BoardVisualState,
  phase: Phase,
  playerId: PlayerId
): Action[] {
  const actions: Action[] = [];
  
  // ... existing logic ...
  
  // USE_ABILITY action - card must have an ability and be in play
  if (
    (selectedCard.position.zone === ZoneId.CHARACTER_AREA || 
     selectedCard.position.zone === ZoneId.LEADER_AREA) &&
    selectedCard.metadata.effect && // Check if card has an ability
    selectedCard.state === CardState.ACTIVE
  ) {
    actions.push('USE_ABILITY');
  }
  
  return actions;
}
```

**Step 3: Add button to ActionPanel**

```typescript
// In ActionPanel component
{availableActions.includes('USE_ABILITY') && (
  <button
    onClick={() => onAction('USE_ABILITY')}
    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-lg text-sm"
    aria-label={`Use ${selectedCard.metadata.name}'s ability`}
  >
    Use Ability
    <span className="ml-2 text-xs opacity-90">
      (Activate Effect)
    </span>
  </button>
)}
```

**Step 4: Handle the action in GameBoard**

```typescript
// In GameBoard.tsx handleAction callback
const handleAction = useCallback((action: Action) => {
  console.log('Action triggered:', action, 'for card:', selectedCardId);
  
  if (!selectedCardId) {
    console.warn('No card selected');
    return;
  }

  switch (action) {
    case 'PLAY_CARD':
      handlePlayCard();
      break;
    case 'ATTACK':
      startAttackMode();
      break;
    case 'ATTACH_DON':
      startDonAttachMode();
      break;
    case 'USE_ABILITY':
      handleUseAbility(); // New handler
      break;
    default:
      console.warn('Unknown action:', action);
  }
}, [selectedCardId, handlePlayCard, startAttackMode, startDonAttachMode, handleUseAbility]);

// New handler implementation
const handleUseAbility = useCallback(() => {
  if (!selectedCardId || !boardState) {
    console.warn('⚠️ No card selected or no board state');
    return;
  }
  
  try {
    const success = engine.activateAbility(localPlayerId, selectedCardId);
    
    if (!success) {
      showError('Failed to activate ability');
    } else {
      showSuccess('Ability activated!');
      setSelectedCardId(null);
    }
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
  }
}, [selectedCardId, boardState, engine, localPlayerId, showError, showSuccess, handleError]);
```

---

## Extending ActionPanel

### Example: Adding Action Costs and Requirements

You can extend the ActionPanel to show more detailed information about action requirements:

```typescript
// Enhanced ActionPanel with cost display
export function ActionPanel({
  selectedCard,
  availableActions,
  onAction,
  phase,
  boardState, // Add boardState prop
  playerId,   // Add playerId prop
}: ActionPanelProps) {
  // Calculate costs and requirements
  const getActionInfo = (action: Action) => {
    const playerState = playerId === PlayerId.PLAYER_1
      ? boardState.player1 
      : boardState.player2;
    
    switch (action) {
      case 'PLAY_CARD':
        const activeDon = playerState.zones.costArea.filter(
          don => don.state === CardState.ACTIVE
        ).length;
        return {
          cost: selectedCard.cost,
          available: activeDon,
          canAfford: activeDon >= selectedCard.cost,
        };
      case 'ATTACK':
        return {
          power: selectedCard.power,
          canAttack: selectedCard.state === CardState.ACTIVE,
        };
      case 'ATTACH_DON':
        const activeDonCount = playerState.zones.costArea.filter(
          don => don.state === CardState.ACTIVE
        ).length;
        return {
          available: activeDonCount,
          powerGain: 1000,
        };
      default:
        return {};
    }
  };

  return (
    <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border-2 border-blue-500">
      <div className="text-white font-semibold mb-3 text-sm">
        {selectedCard.metadata.name}
      </div>
      
      <div className="space-y-2">
        {availableActions.includes('PLAY_CARD') && (() => {
          const info = getActionInfo('PLAY_CARD');
          return (
            <button
              onClick={() => onAction('PLAY_CARD')}
              className={`w-full px-4 py-2 ${
                info.canAfford 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-600 cursor-not-allowed'
              } text-white rounded-lg font-semibold transition-colors shadow-lg text-sm`}
              disabled={!info.canAfford}
            >
              Play Card
              <div className="text-xs opacity-90 mt-1">
                Cost: {info.cost} DON (Available: {info.available})
              </div>
            </button>
          );
        })()}
        
        {/* Similar enhancements for other actions */}
      </div>
    </div>
  );
}
```

---

## Event Subscription Patterns

### Example: Subscribing to Card Movement Events

```typescript
// In a custom component or GameBoard
useEffect(() => {
  if (!renderingInterface) return;

  const handleCardMoved = (event: CardMovedEvent) => {
    console.log(`Card ${event.cardId} moved from ${event.fromZone} to ${event.toZone}`);
    
    // Custom logic based on movement
    if (event.toZone === ZoneId.TRASH) {
      showNotification(`${event.cardId} was sent to trash`);
    }
    
    if (event.fromZone === ZoneId.DECK && event.toZone === ZoneId.HAND) {
      showNotification(`Drew a card`);
    }
  };

  // Subscribe to the event
  renderingInterface.onCardMoved(handleCardMoved);

  // Cleanup is handled automatically by the event emitter
  return () => {
    console.log('Cleaning up card moved subscription');
  };
}, [renderingInterface]);
```

### Example: Subscribing to Power Changes

```typescript
// Track power changes for visual effects
useEffect(() => {
  if (!renderingInterface) return;

  const handlePowerChanged = (event: PowerChangedEvent) => {
    console.log(`Card ${event.cardId} power changed: ${event.oldPower} → ${event.newPower}`);
    
    // Show visual effect for power increase
    if (event.newPower > event.oldPower) {
      setHighlightedCards(prev => [...prev, event.cardId]);
      
      // Clear highlight after animation
      setTimeout(() => {
        setHighlightedCards(prev => prev.filter(id => id !== event.cardId));
      }, 1000);
    }
    
    // Announce for screen readers
    announce(`${event.cardId} power changed to ${event.newPower}`);
  };

  renderingInterface.onPowerChanged(handlePowerChanged);

  return () => {
    console.log('Cleaning up power changed subscription');
  };
}, [renderingInterface, announce]);
```

### Example: Subscribing to Battle Events

```typescript
// Track battle outcomes for animations and notifications
useEffect(() => {
  if (!renderingInterface) return;

  const handleBattleEvent = (event: BattleEvent) => {
    if (event.type === 'BATTLE_START') {
      console.log(`Battle started: ${event.attackerId} vs ${event.defenderId}`);
      
      // Highlight both cards
      setHighlightedCards([event.attackerId, event.defenderId]);
    }
    
    if (event.type === 'BATTLE_END') {
      console.log(`Battle ended: ${event.damageDealt} damage dealt`);
      
      // Show battle result notification
      showSuccess(`Battle complete! ${event.damageDealt} damage dealt`);
      
      // Clear highlights
      setTimeout(() => {
        setHighlightedCards([]);
      }, 1500);
    }
  };

  renderingInterface.onBattleEvent(handleBattleEvent);

  return () => {
    console.log('Cleaning up battle event subscription');
  };
}, [renderingInterface, showSuccess]);
```

### Example: Subscribing to Phase Changes

```typescript
// React to phase changes for UI updates
useEffect(() => {
  if (!renderingInterface) return;

  const handlePhaseChanged = (event: PhaseChangedEvent) => {
    console.log(`Phase changed: ${event.oldPhase} → ${event.newPhase}`);
    
    // Clear UI state when leaving Main Phase
    if (event.oldPhase === Phase.MAIN && event.newPhase !== Phase.MAIN) {
      setSelectedCardId(null);
      setAttackMode(false);
      setDonAttachMode(false);
    }
    
    // Show phase transition notification
    showNotification(`Entering ${getPhaseDisplayName(event.newPhase)}`);
    
    // Announce for screen readers
    announce(`Phase changed to ${getPhaseDisplayName(event.newPhase)}`);
  };

  renderingInterface.onPhaseChanged(handlePhaseChanged);

  return () => {
    console.log('Cleaning up phase changed subscription');
  };
}, [renderingInterface, showNotification, announce]);
```

---

## Custom Card Interactions

### Example: Adding Hover Tooltips

```typescript
// In a custom CardTooltip component
export function CardTooltip({ card }: { card: CardVisualState }) {
  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-sm">
      <h3 className="font-bold text-lg mb-2">{card.metadata.name}</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <span className="text-gray-400 text-sm">Cost:</span>
          <span className="ml-2 font-semibold">{card.cost}</span>
        </div>
        <div>
          <span className="text-gray-400 text-sm">Power:</span>
          <span className="ml-2 font-semibold">{card.power}</span>
        </div>
      </div>
      
      {card.metadata.effect && (
        <div className="text-sm text-gray-300 mb-2">
          <span className="text-gray-400">Effect:</span>
          <p className="mt-1">{card.metadata.effect}</p>
        </div>
      )}
      
      {card.givenDonCount > 0 && (
        <div className="text-sm text-purple-400">
          +{card.givenDonCount} DON attached (+{card.givenDonCount * 1000} power)
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        State: {card.state} | Zone: {card.position.zone}
      </div>
    </div>
  );
}

// Usage in GameBoard
const [hoveredCard, setHoveredCard] = useState<CardVisualState | null>(null);

const handleCardHover = useCallback((cardId: string, action: 'hover' | 'unhover') => {
  if (action === 'hover') {
    // Find the card in board state
    const card = findCardInBoardState(boardState, cardId);
    setHoveredCard(card);
  } else {
    setHoveredCard(null);
  }
}, [boardState]);

// In render
{hoveredCard && (
  <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-none">
    <CardTooltip card={hoveredCard} />
  </div>
)}
```

### Example: Custom Drag Validation

```typescript
// In GameBoard, customize handleCardMove for specific rules
const handleCardMove = useCallback((cardId: string, fromZone: ZoneId, toZone: ZoneId, toPlayerId: PlayerId) => {
  // Custom validation: Only allow moving cards during Main Phase
  if (boardState?.phase !== Phase.MAIN) {
    showError('Can only move cards during Main Phase');
    return;
  }
  
  // Custom validation: Check if it's the player's turn
  if (boardState?.activePlayer !== localPlayerId) {
    showError('Not your turn!');
    return;
  }
  
  // Custom validation: Prevent moving opponent's cards
  if (toPlayerId !== localPlayerId) {
    showError('Cannot move cards to opponent\'s zones');
    return;
  }
  
  // Custom validation: Check zone-specific rules
  if (toZone === ZoneId.CHARACTER_AREA) {
    const characterCount = boardState.player1.zones.characterArea.length;
    if (characterCount >= 5) {
      showError('Character area is full (5/5)');
      return;
    }
  }
  
  // If all validations pass, proceed with the move
  // ... existing handleCardMove logic ...
}, [boardState, localPlayerId, showError]);
```

---

## Best Practices

### 1. Always Clean Up Subscriptions

```typescript
useEffect(() => {
  if (!renderingInterface) return;

  const handler = (event) => {
    // Handle event
  };

  renderingInterface.onSomeEvent(handler);

  // Always return cleanup function
  return () => {
    console.log('Cleaning up subscription');
  };
}, [renderingInterface]);
```

### 2. Use Batch State Updates for Performance

```typescript
// Good: Batch related state updates
React.startTransition(() => {
  setSelectedCardId(null);
  setAttackMode(false);
  setValidTargets([]);
});

// Avoid: Multiple separate state updates
setSelectedCardId(null);
setAttackMode(false);
setValidTargets([]);
```

### 3. Provide Accessibility Support

```typescript
// Always include ARIA labels for actions
<button
  onClick={() => onAction('ATTACK')}
  aria-label={`Attack with ${selectedCard.metadata.name}, power ${selectedCard.power}`}
>
  Attack
</button>

// Announce important state changes
announce(`${card.metadata.name} selected. Cost ${card.cost}, Power ${card.power}`);
```

### 4. Handle Errors Gracefully

```typescript
try {
  const success = engine.someAction(playerId, cardId);
  
  if (!success) {
    showError('Action failed. Please try again.');
  } else {
    showSuccess('Action completed successfully!');
  }
} catch (error) {
  console.error('Error executing action:', error);
  handleError(error instanceof Error ? error : new Error(String(error)));
}
```

---

## Additional Resources

- See `GameBoard.tsx` for complete implementation examples
- See `ActionPanel.tsx` for action availability logic
- See `CardMesh.tsx` for visual state management
- See `RenderingInterface.ts` for available events and their payloads
