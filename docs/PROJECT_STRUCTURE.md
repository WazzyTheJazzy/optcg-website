# One Piece TCG Trader - Project Structure

## Overview
A comprehensive web application for One Piece Trading Card Game enthusiasts, featuring card browsing, collection tracking, trading, and a fully functional game engine.

## Directory Structure

```
one-piece-tcg-trader/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── cards/                # Card data endpoints
│   │   ├── collection/           # Collection management
│   │   └── trades/               # Trading system
│   ├── cards/                    # Card browsing pages
│   ├── collection/               # Collection management pages
│   ├── game/                     # Game engine UI
│   ├── trades/                   # Trading pages
│   └── debug/                    # Development tools
│
├── components/                   # React components
│   ├── game/                     # Game engine UI components
│   │   ├── GameBoard.tsx         # Main game board
│   │   ├── GameScene.tsx         # 3D scene manager
│   │   ├── GameMat.tsx           # Game mat/playfield
│   │   ├── CardMesh.tsx          # 3D card rendering
│   │   └── ZoneRenderer.tsx      # Zone visualization
│   ├── three/                    # Three.js components
│   │   └── CardCarousel.tsx      # 3D card carousel
│   ├── ads/                      # Advertisement components
│   ├── home/                     # Homepage components
│   └── [various UI components]   # Shared UI components
│
├── lib/                          # Core libraries
│   ├── game-engine/              # One Piece TCG Game Engine
│   │   ├── core/                 # Core game logic
│   │   │   ├── GameEngine.ts     # Main engine
│   │   │   ├── GameState.ts      # State management
│   │   │   └── types.ts          # Type definitions
│   │   ├── phases/               # Turn phase implementations
│   │   │   ├── PhaseManager.ts   # Phase orchestration
│   │   │   ├── RefreshPhase.ts   # Refresh phase
│   │   │   ├── DrawPhase.ts      # Draw phase
│   │   │   ├── DonPhase.ts       # DON phase
│   │   │   ├── MainPhase.ts      # Main phase
│   │   │   ├── EndPhase.ts       # End phase
│   │   │   ├── CardPlayHandler.ts # Card playing logic
│   │   │   └── DonHandler.ts     # DON management
│   │   ├── battle/               # Battle system
│   │   │   ├── BattleSystem.ts   # Combat resolution
│   │   │   ├── DamageCalculator.ts # Damage calculation
│   │   │   ├── KOHandler.ts      # KO handling
│   │   │   ├── KeywordHandler.ts # Keyword abilities
│   │   │   └── ModifierManager.ts # Power/cost modifiers
│   │   ├── effects/              # Effect system
│   │   │   ├── EffectSystem.ts   # Effect resolution
│   │   │   ├── EffectScripts.ts  # Effect implementations
│   │   │   ├── EffectScripts.common.ts # Common effects
│   │   │   ├── TriggerQueue.ts   # Trigger management
│   │   │   └── ReplacementEffectHandler.ts # Replacement effects
│   │   ├── zones/                # Zone management
│   │   │   └── ZoneManager.ts    # Zone operations
│   │   ├── setup/                # Game setup
│   │   │   └── GameSetup.ts      # Initial game state
│   │   ├── rendering/            # Rendering interface
│   │   │   ├── RenderingInterface.ts # UI bridge
│   │   │   ├── EventEmitter.ts   # Event system
│   │   │   ├── CardAnimator.ts   # Card animations
│   │   │   └── DragDropManager.ts # Drag & drop
│   │   ├── database/             # Card database
│   │   │   ├── CardDatabaseService.ts # Card loading
│   │   │   ├── CardCache.ts      # Caching layer
│   │   │   ├── CardTransformer.ts # Data transformation
│   │   │   ├── CardValidator.ts  # Validation
│   │   │   └── EffectMapper.ts   # Effect mapping
│   │   ├── rules/                # Game rules
│   │   │   ├── RulesContext.ts   # Rules engine
│   │   │   └── rules.json        # Rule definitions
│   │   └── utils/                # Utilities
│   │       ├── validation.ts     # Validation helpers
│   │       ├── ErrorHandler.ts   # Error handling
│   │       ├── errors.ts         # Error types
│   │       ├── DefeatChecker.ts  # Win condition checking
│   │       ├── LoopGuard.ts      # Infinite loop prevention
│   │       └── StateTransaction.ts # State transactions
│   ├── card-sleeves.ts           # Card sleeve system
│   ├── guest-storage.ts          # Guest mode storage
│   └── [various utilities]       # Shared utilities
│
├── prisma/                       # Database
│   ├── schema.prisma             # Database schema
│   ├── seed-full.ts              # Full card database seed
│   └── [migration files]         # Database migrations
│
├── scripts/                      # Utility scripts
│   ├── database-summary.ts       # Database analysis
│   ├── organize-and-import-cards.ts # Card import
│   └── cleanup-redundant-card-scripts.ts # Cleanup
│
├── public/                       # Static assets
│   ├── cards/                    # Card images
│   └── sleeves/                  # Card sleeve images
│
├── docs/                         # Documentation
│   ├── PROJECT_STRUCTURE.md      # This file
│   ├── GAME_ENGINE.md            # Game engine docs
│   ├── FEATURES.md               # Feature documentation
│   └── API.md                    # API documentation
│
└── .kiro/                        # Kiro IDE configuration
    └── specs/                    # Feature specifications
        ├── one-piece-tcg-engine/ # Game engine spec
        └── card-database-service/ # Database spec
```

## Key Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **3D Graphics**: Three.js with React Three Fiber
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Testing**: Vitest (718 tests, 100% passing)
- **State Management**: React Context + Custom State Manager

## Core Features

### 1. Card Database & Browsing
- Complete One Piece TCG card database
- Advanced filtering and search
- 3D card carousel visualization
- Card detail pages with full information

### 2. Collection Management
- Track owned cards
- Guest mode with local storage
- Account migration for guests
- Collection statistics and analytics

### 3. Trading System
- Create and manage trade offers
- Browse available trades
- Trade history tracking

### 4. Game Engine
- Full One Piece TCG rules implementation
- All 5 turn phases (Refresh, Draw, DON, Main, End)
- Complete battle system
- Effect system with triggers
- 3D game board with drag & drop
- Card animations
- Real-time game state management

### 5. Card Sleeves
- Customizable card sleeves
- Multiple sleeve designs
- Applied to 3D card rendering

## Testing

- **Test Framework**: Vitest
- **Total Tests**: 718
- **Pass Rate**: 100%
- **Coverage**: All game engine systems

### Test Organization
```
lib/game-engine/
├── core/*.test.ts           # Core system tests
├── phases/*.test.ts         # Phase logic tests
├── battle/*.test.ts         # Battle system tests
├── effects/*.test.ts        # Effect system tests
├── utils/*.test.ts          # Utility tests
├── rendering/*.test.ts      # Rendering tests
├── database/__tests__/      # Database tests
├── integration.test.ts      # Integration tests
└── rules-accuracy.test.ts   # Rules validation tests
```

## Documentation Files

All documentation is organized in the `/docs` directory:
- Feature documentation
- API documentation
- Game engine documentation
- Development guides

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build for production
npm run build

# Database operations
npx prisma migrate dev
npx prisma db seed
```

## Environment Variables

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Application URL

## Project Status

✅ **Production Ready**
- All core features implemented
- 100% test coverage on game engine
- Comprehensive documentation
- Clean, organized codebase
