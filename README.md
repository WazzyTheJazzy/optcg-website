# One Piece TCG Trader

A comprehensive web application for One Piece Trading Card Game enthusiasts, featuring card browsing, collection tracking, trading, and a fully functional game engine with 3D visualization.

![Project Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Tests](https://img.shields.io/badge/tests-718%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

## ✨ Features

- 🃏 **Complete Card Database** - 500+ One Piece TCG cards with advanced filtering
- 📦 **Collection Management** - Track your card collection with guest mode support
- 🔄 **Trading System** - Create and manage trade offers with other players
- 🎮 **Game Engine** - Full One Piece TCG rules implementation (718 tests passing)
- 🎨 **3D Visualization** - Three.js powered card carousel and game board
- 🎯 **Drag & Drop Gameplay** - Intuitive card placement and movement
- 🔐 **Authentication** - Secure login with guest mode and account migration
- 🎴 **Card Sleeves** - Customizable card appearances

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- **[Documentation Index](./docs/README.md)** - Complete documentation overview
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Codebase organization
- **[Setup Guide](./docs/SETUP.md)** - Detailed installation instructions
- **[Game Engine](./docs/GAME_ENGINE.md)** - Game engine documentation
- **[Visual Enhancements](./docs/VISUAL_ENHANCEMENTS.md)** - 3D graphics, DON cards, lighting, and performance
- **[Features](./docs/FEATURES.md)** - All implemented features
- **[API Documentation](./docs/API.md)** - API endpoints and usage
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🎮 Game Engine

The One Piece TCG game engine is a complete, production-ready implementation:

- ✅ **718 tests passing** (100% coverage)
- ✅ All 5 turn phases (Refresh, Draw, DON, Main, End)
- ✅ Complete battle system with damage calculation
- ✅ Effect system with triggers and replacements
- ✅ 3D game board with drag & drop
- ✅ Card animations and visual feedback
- ✅ Win condition checking
- ✅ **Realistic 3D tabletop environment** with lighting and shadows
- ✅ **Professional DON card rendering** with proper card images

[Read more about the game engine →](./docs/GAME_ENGINE.md)  
[Visual enhancements documentation →](./docs/VISUAL_ENHANCEMENTS.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- lib/game-engine/core/GameEngine.test.ts

# Run with coverage
npm test -- --coverage
```

**Current Stats:**
- 38 test files
- 718 tests passing
- 100% pass rate

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **3D Graphics**: Three.js with React Three Fiber
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Testing**: Vitest

## 📁 Project Structure

```
one-piece-tcg-trader/
├── app/                    # Next.js pages and API routes
├── components/             # React components
│   ├── game/              # Game engine UI
│   └── three/             # 3D components
├── lib/                   # Core libraries
│   ├── game-engine/       # One Piece TCG engine
│   └── [utilities]        # Shared utilities
├── prisma/                # Database schema and migrations
├── docs/                  # Documentation
└── scripts/               # Utility scripts
```

[View detailed project structure →](./docs/PROJECT_STRUCTURE.md)

## 🎯 Roadmap

### ✅ Completed
- Card database and browsing
- Collection management
- Trading system
- Complete game engine
- 3D visualization
- Authentication system

### 🔄 In Progress
- Multiplayer networking
- AI opponents
- Advanced deck builder

### 📋 Planned
- Mobile app
- Tournament system
- Social features
- Meta analysis tools

[View full roadmap →](./docs/MULTIPLAYER_ROADMAP.md)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

[Add your license here]

## 🙏 Acknowledgments

- One Piece TCG by Bandai
- Card images from official sources
- Community feedback and testing

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: November 2025

For detailed documentation, visit the [`docs/`](./docs) directory.
