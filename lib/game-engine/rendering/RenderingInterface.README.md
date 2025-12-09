# RenderingInterface

The `RenderingInterface` is a bridge between the game engine and the Three.js visualization layer. It provides event subscriptions, state queries, and animation hooks while maintaining complete separation between game logic and visual presentation.

## Purpose

- **Event-Driven Updates**: Subscribe to game events to update visuals reactively
- **State Queries**: Query current visual state of cards, zones, and the board
- **Animation Hooks**: Register animation callbacks for future animation system
- **Metadata Access**: Get card metadata for special visual effects

## Architecture

```
┌─────────────────────────────────────┐
│      Three.js Components            │
│  (GameScene, CardMesh, etc.)        │
└─────────────────────────────────────┘
                 ↕
┌─────────────────────────────────────┐
│      RenderingInterface             │
│  - Event subscriptions              │
│  - State queries                    │
│  - Animation hooks                  │
└─────────────────────────────────────┘
                 ↕
┌─────────────────────────────────────┐
│         GameEngine                  │
│  - Game logic                       │
│  - State management                 │
│  - Event emission                   │
└─────────────────────────────────────┘
```

## Key Features

### Event Subscriptions

Subscribe to specific game events to update visuals:

- `onCardMoved()` - Card moves between zones
- `onCardStateChanged()` - Card becomes active/rested
- `onPowerChanged()` - Card power changes
- `onBattleEvent()` - Battle events (attack, block, counter, end)
- `onPhaseChanged()` - Game phase changes
- `onTurnStart()` - Turn begins
- `onTurnEnd()` - Turn ends
- `onGameOver()` - Game ends

### State Queries

Query current visual state for rendering:

- `getCardVisualState(cardId)` - Get visual state of a specific card
- `getZoneContents(playerId, zone)` - Get all cards in a zone
- `getBoardState()` - Get complete board state
- `getCardMetadata(cardId)` - Get metadata for special effects

### Animation Hooks (Future)

Register animation callbacks that execute when events occur:

- `registerAnimationHook(hook)` - Register an animation
- `waitForAnimation(animationId)` - Wait for animation to complete
- `waitForAllAnimations()` - Wait for all animations
- `unregisterAnimationHook(animationId)` - Remove an animation
- `clearAnimationHooks()` - Remove all animations

## Visual State Types

### CardVisualState

```typescript
interface CardVisualState {
  id: string;
  position: {
    zone: ZoneId;
    index: number;
  };
  state: CardState; // ACTIVE or RESTED
  power: number; // Current power (base + modifiers + DON)
  cost: number; // Current cost (base + modifiers)
  givenDonCount: number;
  metadata: CardMetadata;
}
```

### CardMetadata

```typescript
interface CardMetadata {
  isAltArt: boolean;
  isPromo: boolean;
  isLeader: boolean;
  rarity: string;
  colors: string[];
  category: CardCategory;
  name: string;
  imageUrl: string;
}
```

### BoardVisualState

```typescript
interface BoardVisualState {
  player1: PlayerVisualState;
  player2: PlayerVisualState;
  activePlayer: PlayerId;
  phase: Phase;
  turnNumber: number;
  gameOver: boolean;
  winner: PlayerId | null;
}
```

## Usage Examples

See `RenderingInterface.example.ts` for detailed usage examples.

## Design Decisions

### Why Event-Driven?

Event-driven updates are more efficient than polling and provide clear separation of concerns. The rendering layer only updates when something changes.

### Why Separate Visual State?

The visual state is a simplified view of the game state optimized for rendering. It includes calculated values (current power, cost) and excludes internal game logic details.

### Why Animation Hooks?

Animation hooks allow the rendering layer to register animations without the game engine knowing about Three.js. The engine just calls the hooks at the right time.

### Why Metadata?

Metadata provides information needed for special visual effects (alt art, promo cards, leader cards) without exposing the entire card definition to the rendering layer.

## Performance Considerations

- **Lazy Updates**: Only update visuals when events occur
- **Calculated Values**: Power and cost are pre-calculated in visual state
- **Minimal Data**: Visual state contains only what's needed for rendering
- **No Polling**: Event-driven architecture eliminates polling overhead

## Future Enhancements

- **Animation System**: Full animation support with timing and sequencing
- **Visual Effects**: Special effects for keywords, triggers, etc.
- **Camera Control**: Automatic camera positioning for important events
- **Replay System**: Use event history to replay games visually
