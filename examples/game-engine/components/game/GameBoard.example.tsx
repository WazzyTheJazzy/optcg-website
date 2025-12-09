/**
 * GameBoard.example.tsx
 * 
 * Example usage of the GameBoard component showing how to set up
 * a complete game with the engine, rendering interface, and UI.
 */

import React, { useState, useEffect } from 'react';
import { GameBoard } from '@/components/game/GameBoard';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';
import { RulesContext } from '@/lib/game-engine/rules/RulesContext';
import { PlayerId, CardDefinition, CardCategory } from '@/lib/game-engine/core/types';

/**
 * Example 1: Basic Game Setup
 * 
 * Shows how to create a simple game with two decks and render the board.
 */
export function BasicGameExample() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [renderingInterface, setRenderingInterface] = useState<RenderingInterface | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create engine with default rules
    const rules = new RulesContext();
    const gameEngine = new GameEngine(rules);

    // Create rendering interface
    const rendering = new RenderingInterface(gameEngine);

    // Create example decks (simplified for demo)
    const deck1 = createExampleDeck('Luffy');
    const deck2 = createExampleDeck('Kaido');

    try {
      // Setup game
      gameEngine.setupGame({
        deck1: deck1,
        deck2: deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        player1Mulligan: false,
        player2Mulligan: false,
      });

      setEngine(gameEngine);
      setRenderingInterface(rendering);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!engine || !renderingInterface) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Setting up game...</div>
      </div>
    );
  }

  return (
    <GameBoard
      engine={engine}
      renderingInterface={renderingInterface}
      localPlayerId={PlayerId.PLAYER_1}
      onError={(err) => setError(err.message)}
    />
  );
}

/**
 * Example 2: Game with Error Handling and Notifications
 * 
 * Shows how to handle errors and display notifications to the user.
 */
export function GameWithNotificationsExample() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [renderingInterface, setRenderingInterface] = useState<RenderingInterface | null>(null);
  const [notification, setNotification] = useState<{
    type: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    const rules = new RulesContext();
    const gameEngine = new GameEngine(rules);
    const rendering = new RenderingInterface(gameEngine);

    const deck1 = createExampleDeck('Luffy');
    const deck2 = createExampleDeck('Kaido');

    try {
      gameEngine.setupGame({
        deck1: deck1,
        deck2: deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        player1Mulligan: false,
        player2Mulligan: false,
      });

      setEngine(gameEngine);
      setRenderingInterface(rendering);
      
      // Show success notification
      setNotification({
        type: 'success',
        message: 'Game started successfully!',
      });

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleError = (error: Error) => {
    setNotification({
      type: 'error',
      message: error.message,
    });

    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  if (!engine || !renderingInterface) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Setting up game...</div>
      </div>
    );
  }

  return (
    <>
      <GameBoard
        engine={engine}
        renderingInterface={renderingInterface}
        localPlayerId={PlayerId.PLAYER_1}
        onError={handleError}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 pointer-events-auto">
          <div
            className={`
              px-6 py-4 rounded-lg shadow-xl backdrop-blur-sm
              ${notification.type === 'error' && 'bg-red-600/90 text-white'}
              ${notification.type === 'success' && 'bg-green-600/90 text-white'}
              ${notification.type === 'info' && 'bg-blue-600/90 text-white'}
            `}
          >
            <div className="font-semibold mb-1">
              {notification.type === 'error' && 'Error'}
              {notification.type === 'success' && 'Success'}
              {notification.type === 'info' && 'Info'}
            </div>
            <div>{notification.message}</div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Example 3: Game with Custom Player Perspective
 * 
 * Shows how to switch between player perspectives (useful for spectating or testing).
 */
export function GameWithPerspectiveSwitchExample() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [renderingInterface, setRenderingInterface] = useState<RenderingInterface | null>(null);
  const [perspective, setPerspective] = useState<PlayerId>(PlayerId.PLAYER_1);

  useEffect(() => {
    const rules = new RulesContext();
    const gameEngine = new GameEngine(rules);
    const rendering = new RenderingInterface(gameEngine);

    const deck1 = createExampleDeck('Luffy');
    const deck2 = createExampleDeck('Kaido');

    try {
      gameEngine.setupGame({
        deck1: deck1,
        deck2: deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        player1Mulligan: false,
        player2Mulligan: false,
      });

      setEngine(gameEngine);
      setRenderingInterface(rendering);
    } catch (err) {
      console.error('Failed to setup game:', err);
    }
  }, []);

  if (!engine || !renderingInterface) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Setting up game...</div>
      </div>
    );
  }

  return (
    <>
      {/* Perspective Switch Controls */}
      <div className="fixed top-4 left-4 z-50 pointer-events-auto">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-xl">
          <div className="text-white text-sm mb-2">View as:</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPerspective(PlayerId.PLAYER_1)}
              className={`
                px-3 py-1 rounded text-sm font-semibold transition-colors
                ${perspective === PlayerId.PLAYER_1 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
            >
              Player 1
            </button>
            <button
              onClick={() => setPerspective(PlayerId.PLAYER_2)}
              className={`
                px-3 py-1 rounded text-sm font-semibold transition-colors
                ${perspective === PlayerId.PLAYER_2 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
            >
              Player 2
            </button>
          </div>
        </div>
      </div>

      <GameBoard
        engine={engine}
        renderingInterface={renderingInterface}
        localPlayerId={perspective}
        onError={(err) => console.error('Game error:', err)}
      />
    </>
  );
}

/**
 * Example 4: Game with Event Logging
 * 
 * Shows how to subscribe to game events and display a log.
 */
export function GameWithEventLogExample() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [renderingInterface, setRenderingInterface] = useState<RenderingInterface | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);

  useEffect(() => {
    const rules = new RulesContext();
    const gameEngine = new GameEngine(rules);
    const rendering = new RenderingInterface(gameEngine);

    // Subscribe to events for logging
    const eventEmitter = gameEngine.getEventEmitter();
    
    eventEmitter.onAny((event: any) => {
      const logEntry = `[${new Date().toLocaleTimeString()}] ${event.type}`;
      setEventLog((prev) => [logEntry, ...prev].slice(0, 20)); // Keep last 20 events
    });

    const deck1 = createExampleDeck('Luffy');
    const deck2 = createExampleDeck('Kaido');

    try {
      gameEngine.setupGame({
        deck1: deck1,
        deck2: deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        player1Mulligan: false,
        player2Mulligan: false,
      });

      setEngine(gameEngine);
      setRenderingInterface(rendering);
    } catch (err) {
      console.error('Failed to setup game:', err);
    }
  }, []);

  if (!engine || !renderingInterface) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Setting up game...</div>
      </div>
    );
  }

  return (
    <>
      {/* Event Log Panel */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 pointer-events-auto">
        <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 shadow-xl w-64">
          <div className="text-white font-semibold mb-3">Event Log</div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {eventLog.map((log, index) => (
              <div key={index} className="text-xs text-gray-300 font-mono">
                {log}
              </div>
            ))}
            {eventLog.length === 0 && (
              <div className="text-gray-500 text-sm">No events yet</div>
            )}
          </div>
        </div>
      </div>

      <GameBoard
        engine={engine}
        renderingInterface={renderingInterface}
        localPlayerId={PlayerId.PLAYER_1}
        onError={(err) => console.error('Game error:', err)}
      />
    </>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an example deck for testing
 */
function createExampleDeck(leaderName: string): CardDefinition[] {
  const deck: CardDefinition[] = [];

  // Add leader
  deck.push(createExampleLeader(leaderName));

  // Add 39 characters
  for (let i = 0; i < 39; i++) {
    deck.push(createExampleCharacter(`Character ${i + 1}`));
  }

  // Add 10 DON cards
  for (let i = 0; i < 10; i++) {
    deck.push(createExampleDon());
  }

  return deck;
}

/**
 * Create an example leader card
 */
function createExampleLeader(name: string): CardDefinition {
  return {
    id: `leader-${name.toLowerCase()}`,
    name: `${name} Leader`,
    category: CardCategory.LEADER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: null,
    lifeValue: 5,
    counterValue: null,
    rarity: 'L',
    keywords: [],
    effects: [],
    imageUrl: '/cards/card-back.png',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

/**
 * Create an example character card
 */
function createExampleCharacter(name: string): CardDefinition {
  return {
    id: `char-${Math.random().toString(36).substring(2, 11)}`,
    name,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 3000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '/cards/card-back.png',
    metadata: {
      setCode: 'OP01',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
  };
}

/**
 * Create an example DON card
 */
function createExampleDon(): CardDefinition {
  return {
    id: `don-${Math.random().toString(36).substring(2, 11)}`,
    name: 'DON!!',
    category: CardCategory.DON,
    colors: [],
    typeTags: [],
    attributes: [],
    basePower: null,
    baseCost: null,
    lifeValue: null,
    counterValue: null,
    rarity: 'DON',
    keywords: [],
    effects: [],
    imageUrl: '/cards/don-card.png',
    metadata: {
      setCode: 'DON',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}
