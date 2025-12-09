# One Piece TCG Game - Setup Guide

## What Was Fixed

### 1. TypeScript Errors (4 main errors + test errors)
- **GameEngine.test.ts**: Fixed event type errors by using `GameEventType` enum instead of string literals
- **GameState.test.ts**: Fixed `TriggerInstance` structure to match current type definition
- **GameState.test.ts**: Fixed `EffectDefinition` to use `scriptId` instead of `bodyScriptId`
- **validation.test.ts**: Fixed `LoopGuardState` to include all required properties

### 2. Missing Game Page
- Created `/app/game/page.tsx` - the main game page that initializes and runs the TCG game
- Added "Play" link to navigation menu
- Integrated GameBoard component with proper error handling and loading states

### 3. Card Loading System
- Implemented card database integration in game page
- Added fallback loading for different card sets (OP01-OP05)
- Proper error handling for missing card data

## How to Play the Game

### Prerequisites
1. Make sure your database is seeded with cards:
   ```bash
   npm run db:seed
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Accessing the Game
1. Navigate to `http://localhost:3000/game`
2. Or click the "Play" button in the navigation menu

### Game Features
- **3D Game Board**: Full 3D visualization of the game state
- **Phase Management**: Automatic turn and phase progression
- **Card Interactions**: Click cards to see available actions
- **Player Info**: Real-time display of deck, hand, life, and DON counts
- **Legal Actions**: Shows available actions during your turn

### Current Limitations
- The game currently loads test decks automatically
- Deck building UI is not yet implemented
- AI opponent is not yet implemented
- Multiplayer is not yet implemented

## Card Database Service

The `CardDatabaseService` is a singleton that:
- Loads cards from the Prisma database
- Caches cards in memory for performance
- Transforms database cards to game engine format
- Validates card data

### Usage Example
```typescript
const cardDb = CardDatabaseService.getInstance({
  cacheEnabled: true,
  preloadOnStartup: false,
});

// Load cards by set
const cards = await cardDb.getCardsByFilter({ set: 'OP01' });

// Load specific card
const card = await cardDb.getCardByNumber('OP01-001');
```

## Troubleshooting

### "No cards found in database"
Run the seed script:
```bash
npm run db:seed
```

### Game won't load
1. Check that Prisma is connected: `npx prisma studio`
2. Check browser console for errors
3. Verify .env file has correct DATABASE_URL

### TypeScript errors
Run type check:
```bash
npx tsc --noEmit
```

## Next Steps

To continue development:
1. **Deck Builder**: Create UI for building custom decks
2. **AI Opponent**: Implement basic AI that makes legal moves
3. **Multiplayer**: Add WebSocket support for online play
4. **Card Effects**: Implement specific card effect scripts
5. **Tutorial**: Add interactive tutorial for new players
