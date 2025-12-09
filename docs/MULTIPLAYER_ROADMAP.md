# One Piece TCG - Multiplayer Implementation Roadmap

**Status:** Planning Phase  
**Current:** Single-player with both sides controlled by one user  
**Goal:** Full online multiplayer with matchmaking

---

## Phase 1: Hotseat Mode (Local 2-Player) 🎯 IMMEDIATE

**Description:** Two players share one computer, taking turns

**Implementation:**
1. Add player perspective toggle button
2. Switch `localPlayerId` between PLAYER_1 and PLAYER_2
3. Hide opponent's hand when not their turn
4. Add "Pass Device" screen between turns

**Files to Modify:**
- `app/game/page.tsx` - Add perspective state
- `components/game/GameBoard.tsx` - Add toggle button
- `components/game/GameScene.tsx` - Implement hand hiding

**Code Example:**
```typescript
const [localPlayerId, setLocalPlayerId] = useState<PlayerId>(PlayerId.PLAYER_1);
const [showPassDevice, setShowPassDevice] = useState(false);

// When turn ends
if (boardState.activePlayer !== localPlayerId) {
  setShowPassDevice(true);
}

// Toggle perspective
const switchPlayer = () => {
  setLocalPlayerId(prev => 
    prev === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1
  );
  setShowPassDevice(false);
};
```

**Benefits:**
- ✅ No network code needed
- ✅ Test full gameplay loop
- ✅ Validate game rules
- ✅ Perfect for local tournaments

**Estimated Time:** 2-4 hours

---

## Phase 2: Local Network Play (LAN) 🎯 SHORT-TERM

**Description:** Two players on same WiFi network

**Architecture:**
```
Player 1 Browser ←→ WebSocket Server ←→ Player 2 Browser
                         ↓
                    Game Engine
                    (Server-side)
```

**Implementation Steps:**

### 2.1 Create Game Server
**File:** `server/game-server.ts`

```typescript
import { Server } from 'socket.io';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';

const io = new Server(3001);
const games = new Map<string, GameEngine>();

io.on('connection', (socket) => {
  socket.on('create-game', (config) => {
    const gameId = generateGameId();
    const engine = new GameEngine();
    engine.setupGame(config);
    games.set(gameId, engine);
    socket.emit('game-created', { gameId });
  });

  socket.on('join-game', (gameId) => {
    socket.join(gameId);
    socket.emit('game-joined', { gameId });
  });

  socket.on('player-action', ({ gameId, action }) => {
    const engine = games.get(gameId);
    if (engine) {
      // Execute action
      const result = engine.playCard(action.playerId, action.cardId);
      // Broadcast state update
      io.to(gameId).emit('state-update', engine.getState());
    }
  });
});
```

### 2.2 Create Client Connector
**File:** `lib/multiplayer/GameClient.ts`

```typescript
import { io, Socket } from 'socket.io-client';
import { PlayerId } from '@/lib/game-engine/core/types';

export class GameClient {
  private socket: Socket;
  private gameId: string | null = null;
  private playerId: PlayerId | null = null;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.socket = io(serverUrl);
  }

  createGame(config: GameSetupConfig): Promise<string> {
    return new Promise((resolve) => {
      this.socket.emit('create-game', config);
      this.socket.once('game-created', ({ gameId }) => {
        this.gameId = gameId;
        this.playerId = PlayerId.PLAYER_1;
        resolve(gameId);
      });
    });
  }

  joinGame(gameId: string): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit('join-game', gameId);
      this.socket.once('game-joined', () => {
        this.gameId = gameId;
        this.playerId = PlayerId.PLAYER_2;
        resolve();
      });
    });
  }

  sendAction(action: any): void {
    this.socket.emit('player-action', {
      gameId: this.gameId,
      action,
    });
  }

  onStateUpdate(callback: (state: any) => void): void {
    this.socket.on('state-update', callback);
  }
}
```

### 2.3 Update Game Page
**File:** `app/game/page.tsx`

```typescript
const [gameMode, setGameMode] = useState<'local' | 'lan'>('local');
const [gameClient, setGameClient] = useState<GameClient | null>(null);

// For LAN mode
if (gameMode === 'lan') {
  const client = new GameClient();
  // Host creates game
  const gameId = await client.createGame(config);
  // Guest joins with game ID
  await client.joinGame(gameId);
  
  // Listen for state updates
  client.onStateUpdate((newState) => {
    // Update local rendering
  });
}
```

**UI Additions:**
- Game mode selector (Local / LAN)
- "Create Game" button (shows game code)
- "Join Game" input (enter game code)
- Connection status indicator

**Benefits:**
- ✅ No internet required
- ✅ Low latency
- ✅ Perfect for home play
- ✅ Foundation for online play

**Estimated Time:** 1-2 weeks

---

## Phase 3: Online Multiplayer 🎯 LONG-TERM

**Description:** Players anywhere in the world

**Architecture:**
```
Player 1 ←→ Cloud Server ←→ Player 2
              ↓
         Database
         (Game State Persistence)
```

**Requirements:**

### 3.1 Infrastructure
- **Hosting:** Vercel/Railway/AWS
- **WebSocket:** Socket.io or Pusher
- **Database:** PostgreSQL for game state
- **Authentication:** NextAuth (already implemented)

### 3.2 Features to Add

**Matchmaking System**
```typescript
// lib/multiplayer/Matchmaking.ts
export class Matchmaking {
  async findMatch(userId: string): Promise<Match> {
    // Add to queue
    // Wait for opponent
    // Create game session
  }
}
```

**Game Session Management**
```typescript
// Database schema
model GameSession {
  id          String   @id
  player1Id   String
  player2Id   String
  state       Json     // Serialized game state
  status      String   // active, completed, abandoned
  createdAt   DateTime
  updatedAt   DateTime
}
```

**Reconnection Handling**
```typescript
// Handle disconnects
socket.on('disconnect', () => {
  // Save game state
  // Allow reconnection within 5 minutes
  // Forfeit if timeout
});
```

**Spectator Mode**
```typescript
// Allow others to watch games
socket.on('spectate-game', (gameId) => {
  socket.join(`spectate-${gameId}`);
  // Send read-only state updates
});
```

### 3.3 Security Considerations
- **Action Validation:** Server validates all moves
- **Anti-Cheat:** Server is source of truth
- **Rate Limiting:** Prevent spam/DoS
- **State Encryption:** Protect game data

**Estimated Time:** 2-3 months

---

## Implementation Priority

### NOW (Phase 1)
```typescript
// Add to GameBoard.tsx
const [controllingPlayer, setControllingPlayer] = useState<PlayerId>(PlayerId.PLAYER_1);

<button onClick={() => {
  setControllingPlayer(prev => 
    prev === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1
  );
}}>
  Switch to {controllingPlayer === PlayerId.PLAYER_1 ? 'Player 2' : 'Player 1'}
</button>
```

### SOON (Phase 2)
- Set up Socket.io server
- Create game room system
- Implement state synchronization
- Add connection UI

### LATER (Phase 3)
- Deploy to cloud
- Add matchmaking
- Implement ranking system
- Add replay system

---

## Technical Architecture

### Current (Single Player)
```
Browser
  └── GameEngine (client-side)
      └── Game State (local)
```

### Phase 1 (Hotseat)
```
Browser
  └── GameEngine (client-side)
      └── Game State (local)
      └── Perspective Toggle
```

### Phase 2 (LAN)
```
Browser 1                    Browser 2
  └── GameClient              └── GameClient
      ↓                            ↓
      WebSocket ←→ Server ←→ WebSocket
                     └── GameEngine
                         └── Game State
```

### Phase 3 (Online)
```
Browser 1                              Browser 2
  └── GameClient                        └── GameClient
      ↓                                      ↓
      WebSocket ←→ Cloud Server ←→ WebSocket
                     ├── GameEngine
                     ├── Matchmaking
                     ├── Database
                     └── Authentication
```

---

## State Synchronization Strategy

### Approach 1: Full State Sync (Recommended for Phase 2)
```typescript
// Server sends complete state after each action
io.to(gameId).emit('state-update', {
  type: 'FULL_STATE',
  state: engine.getState(),
  timestamp: Date.now(),
});
```

**Pros:** Simple, reliable, easy to debug  
**Cons:** More bandwidth

### Approach 2: Delta Sync (For Phase 3 optimization)
```typescript
// Server sends only changes
io.to(gameId).emit('state-update', {
  type: 'DELTA',
  changes: {
    cardMoved: { cardId, fromZone, toZone },
    powerChanged: { cardId, newPower },
  },
  timestamp: Date.now(),
});
```

**Pros:** Less bandwidth, faster  
**Cons:** More complex, harder to debug

---

## Quick Start: Hotseat Mode

Add this to `app/game/page.tsx` right now:

```typescript
const [controllingPlayer, setControllingPlayer] = useState<PlayerId>(PlayerId.PLAYER_1);

// In the render
<div className="absolute top-20 right-4">
  <button
    onClick={() => {
      const newPlayer = controllingPlayer === PlayerId.PLAYER_1 
        ? PlayerId.PLAYER_2 
        : PlayerId.PLAYER_1;
      setControllingPlayer(newPlayer);
    }}
    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
  >
    Switch to {controllingPlayer === PlayerId.PLAYER_1 ? 'Player 2' : 'Player 1'}
  </button>
</div>

// Pass to GameBoard
<GameBoard
  engine={engine}
  renderingInterface={renderingInterface}
  localPlayerId={controllingPlayer}  // ← Use controlling player
  onError={handleError}
/>
```

This gives you immediate 2-player functionality!

---

## Network Protocol Design (Phase 2)

### Message Types
```typescript
// Client → Server
type ClientMessage =
  | { type: 'CREATE_GAME'; config: GameSetupConfig }
  | { type: 'JOIN_GAME'; gameId: string }
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'DECLARE_ATTACK'; attackerId: string; targetId: string }
  | { type: 'GIVE_DON'; donId: string; targetId: string }
  | { type: 'END_TURN' };

// Server → Client
type ServerMessage =
  | { type: 'GAME_CREATED'; gameId: string; playerId: PlayerId }
  | { type: 'GAME_JOINED'; gameId: string; playerId: PlayerId }
  | { type: 'STATE_UPDATE'; state: BoardVisualState }
  | { type: 'ACTION_RESULT'; success: boolean; error?: string }
  | { type: 'OPPONENT_DISCONNECTED' }
  | { type: 'GAME_OVER'; winner: PlayerId };
```

### Connection Flow
```
1. Player 1: CREATE_GAME → Server creates engine → Returns gameId
2. Player 2: JOIN_GAME(gameId) → Server adds to room
3. Server: Broadcasts STATE_UPDATE to both players
4. Player 1: PLAY_CARD → Server validates → Updates state → Broadcasts
5. Player 2: Sees update → Their turn → PLAY_CARD → ...
```

---

## Database Schema (Phase 3)

```prisma
model GameSession {
  id          String   @id @default(cuid())
  player1Id   String
  player2Id   String?
  state       Json     // Serialized GameState
  status      String   // waiting, active, completed, abandoned
  winner      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  player1     User     @relation("Player1Games", fields: [player1Id], references: [id])
  player2     User?    @relation("Player2Games", fields: [player2Id], references: [id])
  moves       GameMove[]
  
  @@index([status])
  @@index([player1Id])
  @@index([player2Id])
}

model GameMove {
  id          String   @id @default(cuid())
  sessionId   String
  playerId    String
  moveNumber  Int
  action      Json     // Serialized action
  timestamp   DateTime @default(now())
  
  session     GameSession @relation(fields: [sessionId], references: [id])
  
  @@index([sessionId, moveNumber])
}

model MatchmakingQueue {
  id          String   @id @default(cuid())
  userId      String
  deckId      String
  rating      Int?
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([createdAt])
}
```

---

## Security & Anti-Cheat

### Server-Side Validation
```typescript
// CRITICAL: Never trust client
function validateAction(gameId: string, playerId: PlayerId, action: any): boolean {
  const engine = games.get(gameId);
  
  // 1. Verify it's player's turn
  if (engine.getActivePlayer() !== playerId) {
    return false;
  }
  
  // 2. Verify action is legal
  const legalActions = engine.getLegalActions(playerId);
  if (!isActionLegal(action, legalActions)) {
    return false;
  }
  
  // 3. Execute on server
  return engine.executeAction(action);
}
```

### State Integrity
- Server is single source of truth
- Clients only send actions, not state
- Server validates every action
- Clients render server state

---

## Testing Strategy

### Phase 1 Testing
- [ ] Both players can see their cards
- [ ] Perspective switches correctly
- [ ] Hand hiding works
- [ ] Turn passing works
- [ ] Game completes successfully

### Phase 2 Testing
- [ ] Two browsers can connect
- [ ] State syncs in real-time
- [ ] Disconnection handled gracefully
- [ ] Reconnection works
- [ ] No desync issues

### Phase 3 Testing
- [ ] Matchmaking finds opponents
- [ ] Games persist across sessions
- [ ] Replay system works
- [ ] Spectators can watch
- [ ] Rating system accurate

---

## Performance Targets

### Phase 1 (Hotseat)
- **Latency:** 0ms (local)
- **FPS:** 60fps
- **Memory:** < 200MB

### Phase 2 (LAN)
- **Latency:** < 50ms
- **FPS:** 60fps
- **Bandwidth:** < 10KB/s
- **Memory:** < 300MB

### Phase 3 (Online)
- **Latency:** < 150ms
- **FPS:** 60fps
- **Bandwidth:** < 20KB/s
- **Concurrent Games:** 1000+

---

## Immediate Next Steps

### 1. Add Player Switcher (30 minutes)
```typescript
// In app/game/page.tsx
const [activePlayer, setActivePlayer] = useState<PlayerId>(PlayerId.PLAYER_1);

// Add button to GameBoard
<button onClick={() => setActivePlayer(
  activePlayer === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1
)}>
  Switch Player
</button>

// Pass to GameBoard
<GameBoard localPlayerId={activePlayer} ... />
```

### 2. Hide Opponent Hand (1 hour)
```typescript
// In GameScene.tsx
const shouldShowCards = (zone: ZoneId, owner: PlayerId) => {
  if (zone === ZoneId.HAND && owner !== localPlayerId) {
    return false; // Hide opponent's hand
  }
  return true;
};
```

### 3. Add Pass Device Screen (1 hour)
```typescript
{showPassDevice && (
  <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
    <div className="text-center">
      <h2 className="text-3xl text-white mb-4">Pass Device</h2>
      <p className="text-gray-300 mb-6">
        Hand device to {nextPlayer === PlayerId.PLAYER_1 ? 'Player 1' : 'Player 2'}
      </p>
      <button onClick={() => {
        setLocalPlayerId(nextPlayer);
        setShowPassDevice(false);
      }}>
        Ready
      </button>
    </div>
  </div>
)}
```

---

## Technology Stack

### Phase 1 (Hotseat)
- React state management
- No additional dependencies

### Phase 2 (LAN)
- **WebSocket:** Socket.io
- **Server:** Node.js/Express
- **Discovery:** mDNS or manual IP entry

### Phase 3 (Online)
- **Hosting:** Vercel (frontend) + Railway (backend)
- **WebSocket:** Socket.io with Redis adapter
- **Database:** PostgreSQL (Supabase)
- **CDN:** Cloudflare for assets
- **Monitoring:** Sentry for errors

---

## Cost Estimates (Phase 3)

### Development
- **Backend Development:** 40-60 hours
- **Frontend Integration:** 20-30 hours
- **Testing & QA:** 20-30 hours
- **Total:** 80-120 hours

### Infrastructure (Monthly)
- **Hosting:** $20-50 (Railway/Render)
- **Database:** $25 (Supabase Pro)
- **CDN:** $0-20 (Cloudflare)
- **Monitoring:** $0-30 (Sentry)
- **Total:** $45-125/month

---

## Migration Path

### From Hotseat → LAN
1. Extract game engine to server
2. Add WebSocket layer
3. Update UI to send actions instead of calling engine directly
4. Test with two browsers on same machine
5. Test with two devices on same network

### From LAN → Online
1. Deploy server to cloud
2. Add authentication checks
3. Implement matchmaking
4. Add game persistence
5. Add reconnection logic
6. Implement rating system

---

## Code Organization

### Recommended Structure
```
lib/
├── game-engine/          # Existing engine (no changes)
├── multiplayer/
│   ├── GameClient.ts     # Client-side connector
│   ├── GameServer.ts     # Server-side game manager
│   ├── Matchmaking.ts    # Matchmaking logic
│   ├── StateSync.ts      # State synchronization
│   └── types.ts          # Network message types
server/
├── index.ts              # WebSocket server entry
├── game-manager.ts       # Game session management
└── matchmaking.ts        # Queue management
```

---

## Conclusion

The game engine is already multiplayer-ready! It was designed with multiplayer in mind:
- ✅ Separate PlayerId for each player
- ✅ Turn-based structure
- ✅ Action validation system
- ✅ Event emission for state changes
- ✅ Deterministic game logic

**Immediate Action:** Implement Phase 1 (Hotseat) to enable 2-player testing. This requires minimal code and provides immediate value.

**Long-term Vision:** Full online multiplayer with matchmaking, rankings, and spectator mode.

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2024  
**Next Review:** After Phase 1 completion
