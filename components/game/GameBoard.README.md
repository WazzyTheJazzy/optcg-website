# GameBoard Component

## Overview

The `GameBoard` component is the complete game board layout that composes the Three.js `GameScene` with UI overlays for phase indicators, turn counter, player information, and action buttons. It serves as the main interface for playing the One Piece TCG game.

## Features

- **3D Game Scene Integration**: Embeds the Three.js GameScene component for 3D card visualization
- **Player Information Display**: Shows deck count, hand count, life count, and available DON for both players
- **Phase and Turn Indicators**: Displays current phase and turn number prominently
- **Action Buttons**: Provides buttons for ending phase, passing priority, and other game actions
- **Legal Actions Panel**: Shows available actions for the active player
- **Card Selection**: Handles card clicks and displays action menus
- **Game State Synchronization**: Automatically updates UI when game state changes
- **Error Handling**: Provides error callback for handling action failures

## Usage

### Basic Usage

```tsx
import { GameBoard } from '@/components/game/GameBoard';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';
import { PlayerId } from '@/lib/game-engine/core/types';

function GamePage() {
  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Setup game with decks
  engine.setupGame({
    player1Deck: deck1,
    player2Deck: deck2,
    firstPlayerChoice: PlayerId.PLAYER_1,
  });

  return (
    <GameBoard
      engine={engine}
      renderingInterface={renderingInterface}
      localPlayerId={PlayerId.PLAYER_1}
      onError={(error) => console.error('Game error:', error)}
    />
  );
}
```

### With Error Handling

```tsx
function GamePage() {
  const [error, setError] = useState<string | null>(null);

  const handleError = (error: Error) => {
    setError(error.message);
    // Show error toast or modal
  };

  return (
    <>
      <GameBoard
        engine={engine}
        renderingInterface={renderingInterface}
        localPlayerId={PlayerId.PLAYER_1}
        onError={handleError}
      />
      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}
    </>
  );
}
```

## Props

### `engine` (required)
- Type: `GameEngine`
- The game engine instance managing game state and logic

### `renderingInterface` (required)
- Type: `RenderingInterface`
- The rendering interface that bridges engine and visuals

### `localPlayerId` (optional)
- Type: `PlayerId`
- Default: `PlayerId.PLAYER_1`
- The player ID for the local user (determines perspective and UI layout)

### `onError` (optional)
- Type: `(error: Error) => void`
- Callback function called when an action fails or error occurs

## UI Layout

### Top Bar (Opponent Info)
- Player name
- Active player indicator
- Deck count
- Hand count
- Life count
- Available DON count

### Center (Phase/Turn Info)
- Current turn number
- Current phase name
- Game over status and winner

### Bottom Bar (Local Player Info)
- Player name
- Active player indicator
- Deck count
- Hand count
- Life count
- Available DON count
- Action buttons (End Phase, Pass Priority)

### Right Panel (Legal Actions)
- List of available actions for active player
- Shows action type and basic data
- Limited to 10 visible actions with count of additional actions

### Action Menu (Card Selection)
- Appears when a card is clicked
- Shows available actions for selected card
- Play Card button
- Cancel button

## State Management

The component maintains several pieces of local state:

- `boardState`: Complete board visual state from RenderingInterface
- `selectedCardId`: Currently selected card ID
- `selectedAction`: Currently selected action type
- `legalActions`: Array of legal actions for local player
- `showActionMenu`: Whether to show the card action menu

## Event Handling

### Card Interactions
- **Card Click**: Selects card and shows action menu
- **Zone Click**: Logs zone click (can be extended for zone-specific actions)

### Action Execution
- **Play Card**: Plays selected card from hand
- **Give DON**: Gives selected DON to target card
- **Declare Attack**: Declares attack with selected card
- **End Phase**: Ends current phase (triggers phase transition)
- **Pass Priority**: Passes priority without taking action

## Styling

The component uses Tailwind CSS for styling with:
- Dark theme (gray-900 background)
- Semi-transparent overlays with backdrop blur
- Color-coded information (red for life, purple for DON)
- Hover effects on buttons
- Responsive layout

## Integration with Game Engine

The GameBoard component integrates with the game engine through:

1. **State Queries**: Uses `renderingInterface.getBoardState()` to get current state
2. **Action Execution**: Calls engine methods like `playCard()`, `giveDon()`, `declareAttack()`
3. **Legal Actions**: Uses `engine.getLegalActions()` to show available actions
4. **Event Subscriptions**: Subscribes to rendering interface events to update UI

## Future Enhancements

Potential improvements for the GameBoard component:

1. **Animation Integration**: Add animation hooks for card movements and effects
2. **Sound Effects**: Play sounds for actions and events
3. **Chat/Communication**: Add player communication features
4. **Replay Controls**: Add controls for viewing game replays
5. **Settings Panel**: Add game settings and preferences
6. **Card Details Panel**: Show detailed card information on hover
7. **Action History**: Display log of recent actions
8. **Timer Display**: Show turn timer for timed games
9. **Spectator Mode**: Support for spectating games
10. **Mobile Responsiveness**: Optimize layout for mobile devices

## Requirements Satisfied

This component satisfies the following requirements from the design document:

- **16.1**: Provides rendering interface that communicates game state to Three.js layer
- **16.2**: Emits state change events that Three.js renderer subscribes to
- **16.3**: Maintains separation between game logic and rendering
- **16.4**: Provides card position and state data for Three.js updates
- **16.5**: Supports querying current visual state of cards and zones

## Related Components

- `GameScene`: Three.js scene component for 3D rendering
- `ZoneRenderer`: Renders individual game zones
- `CardMesh`: Renders individual 3D cards
- `GameEngine`: Core game engine
- `RenderingInterface`: Bridge between engine and visuals
