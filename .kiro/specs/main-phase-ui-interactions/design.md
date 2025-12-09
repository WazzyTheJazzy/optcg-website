# Design Document

## Overview

This feature connects the existing game engine backend to the React/Three.js frontend, enabling interactive gameplay during the Main Phase. The game engine (GameEngine, BattleSystem, CardPlayHandler, DonHandler) already contains all necessary logic. This design focuses on UI components, event handlers, state management, and visual feedback systems.

## Architecture

### Component Hierarchy

```
GameBoard (React Component)
├── State Management
│   ├── selectedCardId: string | null
│   ├── attackMode: boolean
│   ├── validTargets: string[]
│   └── actionPanelVisible: boolean
├── Event Handlers
│   ├── handleCardClick(cardId)
│   ├── handleCardMove(cardId, fromZone, toZone)
│   ├── handlePlayCard()
│   ├── handleDeclareAttack(targetId)
│   ├── handleAttachDon()
│   └── handleEndMainPhase()
└── Child Components
    ├── GameScene (Three.js)
    │   ├── CardMesh (per card)
    │   │   ├── Visual States (selected, valid target, hovered)
    │   │   └── Click Handlers
    │   └── ZoneRenderer (per zone)
    └── UI Overlay
        ├── ActionPanel
        ├── PhaseControls
        └── ErrorToast
```

### Data Flow

```
User Interaction → GameBoard Handler → GameEngine Method → State Update → RenderingInterface Event → UI Update
```

Example: Playing a Card
```
1. User drags card from hand
2. handleCardMove() called
3. engine.playCard(playerId, cardId) called
4. CardPlayHandler validates and executes
5. ZoneManager updates state
6. RenderingInterface emits CARD_MOVED event
7. GameBoard updates via subscription
8. CardMesh re-renders in new position
```

## Components and Interfaces

### GameBoard Component

**Purpose:** Main container for game UI and interaction logic

**State:**
```typescript
interface GameBoardState {
  selectedCardId: string | null;
  attackMode: boolean;
  validTargets: string[];
  donAttachMode: boolean;
  errorMessage: string | null;
  boardState: BoardState; // from RenderingInterface
}
```

**Key Methods:**
```typescript
// Card Selection
handleCardClick(cardId: string): void
  - Update selectedCardId
  - Clear attack mode if active
  - Show action panel

// Card Playing
handleCardMove(cardId: string, fromZone: ZoneId, toZone: ZoneId): void
  - Validate move is legal
  - Call engine.playCard() if from HAND to CHARACTER_AREA
  - Handle success/error response
  - Update UI state

handlePlayCard(): void
  - Get selectedCardId
  - Call engine.playCard(currentPlayerId, selectedCardId)
  - Show error toast if fails
  - Clear selection if succeeds

// Attacking
startAttackMode(): void
  - Set attackMode = true
  - Get valid targets from engine
  - Set validTargets array
  - Highlight valid targets

handleDeclareAttack(targetId: string): void
  - Validate target is in validTargets
  - Call engine.declareAttack(currentPlayerId, selectedCardId, targetId)
  - Exit attack mode
  - Clear selection

cancelAttackMode(): void
  - Set attackMode = false
  - Clear validTargets
  - Remove highlights

// DON Attachment
handleAttachDon(donCardId: string): void
  - Validate DON is active
  - Validate character is selected
  - Call engine.attachDon(currentPlayerId, donCardId, selectedCardId)
  - Update UI on success

// Phase Control
handleEndMainPhase(): void
  - Call engine.advancePhase()
  - Clear all selections
  - Exit any active modes
```

### CardMesh Component

**Purpose:** 3D representation of a single card with visual states

**Props:**
```typescript
interface CardMeshProps {
  cardState: CardInstance;
  isSelected: boolean;
  isValidTarget: boolean;
  isHovered: boolean;
  onClick: (cardId: string) => void;
  onDragStart: (cardId: string) => void;
  onDragEnd: (cardId: string, zone: ZoneId) => void;
}
```

**Visual States:**
- **Default:** Normal card rendering
- **Selected:** Yellow glow/border (emissive material)
- **Valid Target:** Green glow (during attack mode)
- **Invalid Target:** Reduced opacity (0.5)
- **Hovered:** Slight scale increase (1.05x) + info overlay

**Rendering Logic:**
```typescript
// Selection Highlight
if (isSelected) {
  <mesh position={[0, 0, 0.01]}>
    <planeGeometry args={[cardWidth * 1.1, cardHeight * 1.1]} />
    <meshBasicMaterial color="#ffff00" transparent opacity={0.3} />
  </mesh>
}

// Valid Target Highlight
if (isValidTarget) {
  <mesh position={[0, 0, 0.01]}>
    <planeGeometry args={[cardWidth * 1.1, cardHeight * 1.1]} />
    <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
  </mesh>
}

// Hover Info
if (isHovered) {
  <Html position={[0, cardHeight/2 + 0.5, 0]}>
    <div className="card-info">
      <div>Cost: {cardState.cost}</div>
      <div>Power: {cardState.power}</div>
    </div>
  </Html>
}
```

### ActionPanel Component

**Purpose:** Display available actions for selected card

**Props:**
```typescript
interface ActionPanelProps {
  selectedCard: CardInstance | null;
  availableActions: Action[];
  onAction: (action: Action) => void;
}

type Action = 'PLAY_CARD' | 'ATTACK' | 'ATTACH_DON' | 'USE_ABILITY';
```

**Layout:**
```tsx
<div className="action-panel">
  {availableActions.includes('PLAY_CARD') && (
    <button onClick={() => onAction('PLAY_CARD')}>
      Play Card (Cost: {selectedCard.cost})
    </button>
  )}
  {availableActions.includes('ATTACK') && (
    <button onClick={() => onAction('ATTACK')}>
      Attack
    </button>
  )}
  {availableActions.includes('ATTACH_DON') && (
    <button onClick={() => onAction('ATTACH_DON')}>
      Attach DON (+1000 Power)
    </button>
  )}
</div>
```

**Action Availability Logic:**
```typescript
function getAvailableActions(
  selectedCard: CardInstance,
  boardState: BoardState,
  phase: Phase
): Action[] {
  const actions: Action[] = [];
  
  if (phase !== Phase.MAIN) return actions;
  
  // Play Card - if in hand and can afford
  if (selectedCard.zone === ZoneId.HAND) {
    const activeDon = countActiveDon(boardState);
    if (activeDon >= selectedCard.cost) {
      actions.push('PLAY_CARD');
    }
  }
  
  // Attack - if character in play and active
  if (selectedCard.zone === ZoneId.CHARACTER_AREA && 
      selectedCard.state === CardState.ACTIVE) {
    actions.push('ATTACK');
  }
  
  // Attach DON - if character in play and have active DON
  if (selectedCard.zone === ZoneId.CHARACTER_AREA) {
    const activeDon = countActiveDon(boardState);
    if (activeDon > 0) {
      actions.push('ATTACH_DON');
    }
  }
  
  return actions;
}
```

## Data Models

### UI State Models

```typescript
interface UIState {
  // Selection
  selectedCardId: string | null;
  
  // Modes
  attackMode: boolean;
  donAttachMode: boolean;
  
  // Targets
  validTargets: string[];
  
  // Feedback
  errorMessage: string | null;
  successMessage: string | null;
  
  // Hover
  hoveredCardId: string | null;
}

interface BoardState {
  // From RenderingInterface
  phase: Phase;
  currentPlayer: PlayerId;
  zones: Record<ZoneId, CardInstance[]>;
  cardStates: Record<string, CardInstance>;
}
```

### Action Result Models

```typescript
interface ActionResult {
  success: boolean;
  error?: string;
  stateChanges?: StateChange[];
}

interface StateChange {
  type: 'CARD_MOVED' | 'CARD_STATE_CHANGED' | 'POWER_CHANGED';
  cardId: string;
  oldValue: any;
  newValue: any;
}
```

## Error Handling

### Validation Errors

**Card Play Errors:**
- "Not enough DON to play this card" (cost > active DON)
- "Character area is full (5/5)" (zone limit)
- "Cannot play cards during this phase" (wrong phase)

**Attack Errors:**
- "Character is rested and cannot attack" (state check)
- "Invalid attack target" (target validation)
- "Cannot attack on first turn" (first turn rule)

**DON Attachment Errors:**
- "No active DON cards available" (no DON in cost area)
- "DON card is rested" (DON state check)
- "Target must be a character or leader" (target type)

### Error Display

```typescript
function showError(message: string): void {
  setErrorMessage(message);
  setTimeout(() => setErrorMessage(null), 3000);
}

// Toast Component
<div className={`error-toast ${errorMessage ? 'visible' : ''}`}>
  {errorMessage}
</div>
```

## Testing Strategy

### Unit Tests

**GameBoard Handlers:**
- Test handleCardClick updates selectedCardId
- Test handlePlayCard calls engine.playCard with correct params
- Test handleDeclareAttack validates targets before calling engine
- Test error handling for all actions

**CardMesh Visual States:**
- Test isSelected prop renders highlight
- Test isValidTarget prop renders green glow
- Test hover state shows info overlay

**ActionPanel Logic:**
- Test getAvailableActions returns correct actions for each card state
- Test action buttons only show when conditions are met

### Integration Tests

**Card Playing Flow:**
1. Select card in hand
2. Verify "Play Card" button appears
3. Click button
4. Verify engine.playCard called
5. Verify card moves to character area
6. Verify DON cards are rested

**Attack Flow:**
1. Select active character
2. Click "Attack" button
3. Verify valid targets highlighted
4. Click target
5. Verify battle resolves
6. Verify attacker becomes rested

**DON Attachment Flow:**
1. Select character
2. Select DON card
3. Click "Attach DON"
4. Verify DON moves to character
5. Verify power increases by 1000

### Manual Testing Checklist

- [ ] Card selection highlights work
- [ ] Can play cards from hand
- [ ] Cost validation prevents illegal plays
- [ ] DON cards rest when paying costs
- [ ] Can attack with active characters
- [ ] Cannot attack with rested characters
- [ ] Valid targets highlight during attack
- [ ] Battle damage calculates correctly
- [ ] Can attach DON to characters
- [ ] Power increases when DON attached
- [ ] Error messages display for invalid actions
- [ ] Main Phase doesn't auto-advance

## Performance Considerations

### Optimization Strategies

1. **Memoization:** Use React.memo for CardMesh to prevent unnecessary re-renders
2. **Event Throttling:** Throttle hover events to reduce update frequency
3. **Batch Updates:** Group state updates to minimize render cycles
4. **Lazy Rendering:** Only render cards in visible zones

```typescript
// Memoized CardMesh
export const CardMesh = React.memo(({ cardState, isSelected, ...props }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.cardState.id === nextProps.cardState.id &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isValidTarget === nextProps.isValidTarget;
});

// Throttled hover handler
const handleHover = useCallback(
  throttle((cardId: string) => {
    setHoveredCardId(cardId);
  }, 100),
  []
);
```

## Accessibility

### Keyboard Navigation

- Tab through selectable cards
- Enter to select/deselect
- Arrow keys to navigate between cards
- Space to execute primary action

### Screen Reader Support

- Announce card selection
- Announce available actions
- Announce action results
- Announce error messages

```typescript
<button
  onClick={handlePlayCard}
  aria-label={`Play ${selectedCard.name} for ${selectedCard.cost} DON`}
>
  Play Card
</button>
```

## Future Enhancements

### Phase 2 Features

- Leader ability activation
- Event card playing
- Stage card playing
- Counter step UI
- Block step UI

### Phase 3 Features

- Drag-and-drop DON attachment
- Multi-target selection
- Action history/undo
- Animated transitions
- Sound effects
- Tutorial tooltips
