'use client';

/**
 * Game Page
 * 
 * Main page for playing the One Piece TCG game.
 * Initializes the game engine, loads cards, and renders the game board.
 * Supports both human vs human and human vs AI gameplay.
 */

import React, { useState, useEffect } from 'react';
import { GameBoard } from '@/components/game/GameBoard';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';
import { RulesContext } from '@/lib/game-engine/rules/RulesContext';
import { PlayerId, CardDefinition, CardCategory } from '@/lib/game-engine/core/types';
import { GameEventType } from '@/lib/game-engine/rendering/EventEmitter';
import { cardSleeves, CardSleeve } from '@/lib/card-sleeves';
import { getSelectedSleeve, setSelectedSleeve } from '@/lib/sleeve-preferences';
import { HumanPlayer } from '@/lib/game-engine/ai/HumanPlayer';
import { 
  createAIPlayer, 
  DifficultyLevel, 
  PlayStyle,
  getAvailableDifficulties,
  getAvailablePlayStyles,
  getDifficultyDescription,
  getPlayStyleDescription
} from '@/lib/game-engine/ai/AIPlayerFactory';

export default function GamePage() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [renderingInterface, setRenderingInterface] = useState<RenderingInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  const [controllingPlayer, setControllingPlayer] = useState<PlayerId>(PlayerId.PLAYER_1);
  const [selectedSleeve, setSelectedSleeveState] = useState<CardSleeve>(getSelectedSleeve());
  
  // AI opponent configuration
  const [showAIConfig, setShowAIConfig] = useState(true);
  const [opponentType, setOpponentType] = useState<'human' | 'ai'>('human');
  const [aiDifficulty, setAiDifficulty] = useState<DifficultyLevel>('medium');
  const [aiPlayStyle, setAiPlayStyle] = useState<PlayStyle>('balanced');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiDecisionInfo, setAiDecisionInfo] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  const handleSleeveChange = () => {
    const currentIndex = cardSleeves.findIndex(s => s.id === selectedSleeve.id);
    const nextIndex = (currentIndex + 1) % cardSleeves.length;
    const newSleeve = cardSleeves[nextIndex];
    setSelectedSleeve(newSleeve);
    setSelectedSleeveState(newSleeve);
    // Force a re-render by triggering a state update
    window.dispatchEvent(new Event('sleeve-changed'));
  };

  useEffect(() => {
    // Don't auto-initialize, wait for user to configure and start
  }, []);

  async function initializeGame() {
    try {
      console.log('🎮 Starting game initialization...');
      setLoading(true);
      setError(null);
      setShowAIConfig(false);
      
      setLoadingProgress('Loading rules...');
      const rules = new RulesContext();
      console.log('✅ Rules loaded');

      setLoadingProgress('Loading card data...');
      // Load some starter cards for testing
      // In a real game, you'd load the player's deck
      const cards = await loadStarterDeck();
      console.log(`✅ Loaded ${cards.length} cards`);

      if (cards.length === 0) {
        console.warn('⚠️ No cards found in database, using mock data');
        setLoadingProgress('Using demo cards...');
        // Use mock data for demo purposes
        const mockCards = createMockCards();
        if (mockCards.length > 0) {
          console.log(`Using ${mockCards.length} mock cards`);
          // Continue with mock cards instead of throwing
          const { deck1, deck2 } = buildValidDecks(mockCards);
          if (!deck1 || !deck2) {
            throw new Error('Unable to build valid decks from mock cards');
          }
          
          setLoadingProgress('Setting up game with demo cards...');
          const gameEngine = new GameEngine(rules);
          
          // Create player instances
          const player1 = new HumanPlayer(PlayerId.PLAYER_1);
          const player2 = opponentType === 'ai' 
            ? createAIPlayer(PlayerId.PLAYER_2, aiDifficulty, aiPlayStyle, gameEngine.getEventEmitter())
            : new HumanPlayer(PlayerId.PLAYER_2);
          
          // Setup AI event listeners
          if (opponentType === 'ai') {
            setupAIEventListeners(gameEngine);
          }
          
          await gameEngine.setupGameAsync({ 
            deck1, 
            deck2, 
            firstPlayerChoice: PlayerId.PLAYER_1,
            player1,
            player2
          });
          
          const rendering = new RenderingInterface(gameEngine);
          setEngine(gameEngine);
          setRenderingInterface(rendering);
          setLoading(false);
          setLoadingProgress('Game ready with demo cards!');
          return;
        }
        throw new Error('No cards found in database. Please run the seed script first.');
      }

      setLoadingProgress('Creating game engine...');
      const gameEngine = new GameEngine(rules);

      setLoadingProgress('Building valid decks...');
      // Build valid decks from loaded cards
      const { deck1, deck2 } = buildValidDecks(cards);

      if (!deck1 || !deck2) {
        throw new Error('Unable to build valid decks from available cards. Need at least 1 leader and 50 other cards.');
      }

      setLoadingProgress('Setting up game...');
      console.log('About to setup game with decks:', {
        deck1Length: deck1.length,
        deck2Length: deck2.length,
        deck1Leader: deck1.find(c => c.category === 'LEADER')?.name,
        deck2Leader: deck2.find(c => c.category === 'LEADER')?.name,
        opponentType,
        aiDifficulty: opponentType === 'ai' ? aiDifficulty : 'N/A',
        aiPlayStyle: opponentType === 'ai' ? aiPlayStyle : 'N/A',
      });

      // Create player instances
      const player1 = new HumanPlayer(PlayerId.PLAYER_1);
      const player2 = opponentType === 'ai' 
        ? createAIPlayer(PlayerId.PLAYER_2, aiDifficulty, aiPlayStyle, gameEngine.getEventEmitter())
        : new HumanPlayer(PlayerId.PLAYER_2);
      
      // Setup AI event listeners
      if (opponentType === 'ai') {
        setupAIEventListeners(gameEngine);
      }

      await gameEngine.setupGameAsync({
        deck1,
        deck2,
        firstPlayerChoice: PlayerId.PLAYER_1,
        player1,
        player2
      });

      // Create rendering interface AFTER game setup so it has the correct state
      const rendering = new RenderingInterface(gameEngine);

      setEngine(gameEngine);
      setRenderingInterface(rendering);
      setLoading(false);
      setLoadingProgress('Game ready!');

      // Start the game by advancing through initial phases
      // This will automatically progress through REFRESH, DRAW, DON_PHASE until MAIN
      // If player 1 is AI, it will start making decisions automatically
      const advanceResult = gameEngine.advancePhase();
      // If it's a promise (AI player), wait for it
      if (advanceResult instanceof Promise) {
        await advanceResult;
      }
    } catch (err) {
      console.error('Failed to initialize game:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
      setLoading(false);
      setShowAIConfig(true);
    }
  }

  function setupAIEventListeners(gameEngine: GameEngine) {
    const eventEmitter = gameEngine.getEventEmitter();
    
    // Listen for AI thinking events
    eventEmitter.on(GameEventType.AI_THINKING_START, (event: any) => {
      setAiThinking(true);
      if (debugMode) {
        setAiDecisionInfo(`AI is thinking about ${event.decisionType}... (${event.optionsCount} options)`);
      }
    });
    
    eventEmitter.on(GameEventType.AI_THINKING_END, (event: any) => {
      setAiThinking(false);
      if (debugMode) {
        setAiDecisionInfo(`AI finished thinking in ${event.thinkingTimeMs}ms`);
        // Clear after 3 seconds
        setTimeout(() => setAiDecisionInfo(null), 3000);
      }
    });
    
    eventEmitter.on(GameEventType.AI_ACTION_SELECTED, (event: any) => {
      if (debugMode) {
        const scoreInfo = event.evaluationScore !== undefined 
          ? ` (score: ${event.evaluationScore.toFixed(2)})` 
          : '';
        setAiDecisionInfo(`AI selected: ${event.decisionType}${scoreInfo}`);
        // Clear after 5 seconds
        setTimeout(() => setAiDecisionInfo(null), 5000);
      }
    });
  }

  async function loadStarterDeck(): Promise<CardDefinition[]> {
    try {
      console.log('Starting card load...');
      setLoadingProgress('Fetching cards from database...');
      
      // Try to load cards from different sets
      const sets = ['OP01', 'OP02', 'OP03', 'OP04', 'OP05'];
      
      for (const set of sets) {
        try {
          console.log(`Trying to load cards from set ${set}...`);
          const response = await fetch(`/api/game/cards?set=${set}&limit=200`, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!response.ok) {
            console.warn(`API returned ${response.status} for set ${set}`);
            continue;
          }
          
          const data = await response.json();
          
          if (data.cards && data.cards.length > 0) {
            console.log(`✅ Loaded ${data.cards.length} cards from set ${set}`);
            return data.cards;
          }
        } catch (err) {
          console.warn(`Failed to load cards from set ${set}:`, err);
        }
      }

      // If no cards found by set, try to load any cards
      console.log('Attempting to load any available cards...');
      setLoadingProgress('Loading any available cards...');
      
      const response = await fetch('/api/game/cards?limit=200', {
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Loaded ${data.cards?.length || 0} cards total`);
      return data.cards || [];
    } catch (err) {
      console.error('Failed to load cards:', err);
      throw new Error(`Failed to load cards: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  function buildValidDecks(cards: CardDefinition[]): { deck1: CardDefinition[] | null; deck2: CardDefinition[] | null } {
    // Separate cards by category
    const leaders = cards.filter(c => c.category === 'LEADER');
    const characters = cards.filter(c => c.category === 'CHARACTER');
    const events = cards.filter(c => c.category === 'EVENT');
    const stages = cards.filter(c => c.category === 'STAGE');

    // Ensure leaders have life values (default to 5 if missing)
    leaders.forEach(leader => {
      if (!leader.lifeValue || leader.lifeValue === 0) {
        console.warn(`Leader ${leader.name} missing life value, defaulting to 5`);
        leader.lifeValue = 5;
      }
    });

    // Check if we have enough cards
    if (leaders.length < 1) {
      console.error('Not enough leaders found');
      return { deck1: null, deck2: null };
    }

    const nonLeaderCards = [...characters, ...events, ...stages];
    if (nonLeaderCards.length < 50) {
      console.error('Not enough non-leader cards found');
      return { deck1: null, deck2: null };
    }

    // Build deck 1
    const leader1 = leaders[0];
    const mainDeck1 = nonLeaderCards.slice(0, 50);
    const donCards1 = Array(10).fill(null).map((_, i) => ({
      id: `don-p1-${i}`,
      name: 'DON!!',
      category: CardCategory.DON,
      colors: [],
      typeTags: [],
      attributes: [],
      basePower: 0,
      baseCost: 0,
      lifeValue: null,
      counterValue: null,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '/cards/don.png',
      metadata: {
        setCode: 'DON',
        cardNumber: 'DON',
        isAltArt: false,
        isPromo: false,
      },
    }));

    const deck1 = [leader1, ...mainDeck1, ...donCards1];

    // Build deck 2 (use same cards for now)
    const leader2 = leaders.length > 1 ? leaders[1] : leaders[0];
    const mainDeck2 = nonLeaderCards.slice(0, 50);
    const donCards2 = Array(10).fill(null).map((_, i) => ({
      id: `don-p2-${i}`,
      name: 'DON!!',
      category: CardCategory.DON,
      colors: [],
      typeTags: [],
      attributes: [],
      basePower: 0,
      baseCost: 0,
      lifeValue: null,
      counterValue: null,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '/cards/don.png',
      metadata: {
        setCode: 'DON',
        cardNumber: 'DON',
        isAltArt: false,
        isPromo: false,
      },
    }));

    const deck2 = [leader2, ...mainDeck2, ...donCards2];

    console.log(`Built deck 1: 1 leader + ${mainDeck1.length} cards + 10 DON = ${deck1.length} total`);
    console.log(`Built deck 2: 1 leader + ${mainDeck2.length} cards + 10 DON = ${deck2.length} total`);

    return { deck1, deck2 };
  }

  function createMockCards(): CardDefinition[] {
    // Create minimal mock cards for testing
    const mockCards: CardDefinition[] = [];
    
    // Add 2 leaders
    for (let i = 0; i < 2; i++) {
      mockCards.push({
        id: `mock-leader-${i}`,
        name: `Demo Leader ${i + 1}`,
        category: CardCategory.LEADER,
        colors: ['Red'],
        typeTags: [],
        attributes: ['Straw Hat Crew'],
        basePower: 5000,
        baseCost: 0,
        lifeValue: 5,
        counterValue: null,
        rarity: 'L',
        keywords: [],
        effects: [],
        imageUrl: '/cards/placeholder.png',
        metadata: {
          setCode: 'DEMO',
          cardNumber: `L-${i + 1}`,
          isAltArt: false,
          isPromo: false,
        },
      });
    }
    
    // Add 100 character cards
    for (let i = 0; i < 100; i++) {
      mockCards.push({
        id: `mock-char-${i}`,
        name: `Demo Character ${i + 1}`,
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: ['Straw Hat Crew'],
        basePower: 3000 + (i % 5) * 1000,
        baseCost: 1 + (i % 7),
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [],
        imageUrl: '/cards/placeholder.png',
        metadata: {
          setCode: 'DEMO',
          cardNumber: `C-${i + 1}`,
          isAltArt: false,
          isPromo: false,
        },
      });
    }
    
    console.log(`Created ${mockCards.length} mock cards`);
    return mockCards;
  }

  function handleError(err: Error) {
    console.error('Game error:', err);
    setError(err.message);
  }

  function handleRestart() {
    setEngine(null);
    setRenderingInterface(null);
    setLoading(false);
    setError(null);
    setShowAIConfig(true);
    setAiThinking(false);
    setAiDecisionInfo(null);
  }

  // Show AI configuration screen before game starts
  if (showAIConfig && !engine) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Start New Game</h1>
          
          {/* Opponent Type Selection */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Opponent Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setOpponentType('human')}
                className={`p-4 rounded-lg border-2 transition ${
                  opponentType === 'human'
                    ? 'border-blue-500 bg-blue-900/30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-semibold">Human vs Human</div>
                <div className="text-sm opacity-75 mt-1">Local multiplayer</div>
              </button>
              <button
                onClick={() => setOpponentType('ai')}
                className={`p-4 rounded-lg border-2 transition ${
                  opponentType === 'ai'
                    ? 'border-blue-500 bg-blue-900/30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-semibold">Human vs AI</div>
                <div className="text-sm opacity-75 mt-1">Practice against computer</div>
              </button>
            </div>
          </div>

          {/* AI Configuration (only shown when AI is selected) */}
          {opponentType === 'ai' && (
            <>
              {/* Difficulty Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">AI Difficulty</label>
                <div className="grid grid-cols-3 gap-3">
                  {getAvailableDifficulties().map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => setAiDifficulty(difficulty)}
                      className={`p-3 rounded-lg border-2 transition ${
                        aiDifficulty === difficulty
                          ? 'border-green-500 bg-green-900/30 text-white'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-semibold capitalize">{difficulty}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  {getDifficultyDescription(aiDifficulty)}
                </div>
              </div>

              {/* Play Style Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">AI Play Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {getAvailablePlayStyles().map((style) => (
                    <button
                      key={style}
                      onClick={() => setAiPlayStyle(style)}
                      className={`p-3 rounded-lg border-2 transition ${
                        aiPlayStyle === style
                          ? 'border-purple-500 bg-purple-900/30 text-white'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-semibold capitalize">{style}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  {getPlayStyleDescription(aiPlayStyle)}
                </div>
              </div>

              {/* Debug Mode Toggle */}
              <div className="mb-6">
                <label className="flex items-center text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="mr-3 w-5 h-5 rounded"
                  />
                  <span className="font-semibold">Debug Mode</span>
                  <span className="ml-2 text-sm text-gray-400">(Show AI decision information)</span>
                </label>
              </div>
            </>
          )}

          {/* Start Game Button */}
          <button
            onClick={initializeGame}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg transition shadow-lg"
          >
            Start Game
          </button>

          {/* Back to Menu */}
          <a
            href="/"
            className="block text-center mt-4 text-gray-400 hover:text-white transition"
          >
            ← Back to Menu
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl font-bold mb-4">Loading Game...</div>
          <div className="text-gray-400 text-lg mb-6">{loadingProgress}</div>
          <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-red-600 animate-pulse" style={{ width: '60%' }}></div>
          </div>
          {error && (
            <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg max-w-md mx-auto">
              <div className="text-red-400 font-semibold mb-2">Error</div>
              <div className="text-red-300 text-sm">{error}</div>
              <button
                onClick={handleRestart}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Back to Setup
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && !engine) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-2xl font-bold mb-4">Failed to Load Game</div>
          <div className="text-gray-300 mb-6">{error}</div>
          <div className="space-y-3">
            <button
              onClick={handleRestart}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
            >
              Try Again
            </button>
            <a
              href="/cards"
              className="block w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
            >
              Browse Cards
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!engine || !renderingInterface) {
    return null;
  }

  return (
    <div className="w-full h-screen relative">
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        {/* Player Switch Button (only show for human vs human) */}
        {opponentType === 'human' && (
          <button
            onClick={() => setControllingPlayer(
              controllingPlayer === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1
            )}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg transition-colors flex items-center gap-2"
          >
            <span>🎮</span>
            <span>Playing as: {controllingPlayer === PlayerId.PLAYER_1 ? 'Player 1' : 'Player 2'}</span>
            <span className="text-xs opacity-75">(Click to switch)</span>
          </button>
        )}

        {/* AI Opponent Info */}
        {opponentType === 'ai' && (
          <div className="px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold shadow-lg border border-gray-600">
            <div className="flex items-center gap-2">
              <span>🤖</span>
              <span>AI Opponent: {aiDifficulty} / {aiPlayStyle}</span>
            </div>
          </div>
        )}

        {/* Sleeve Selector Button */}
        <button
          onClick={handleSleeveChange}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-lg transition-colors flex items-center gap-2"
          title="Change card sleeve"
        >
          <div 
            className="w-6 h-8 rounded border-2 border-white shadow-inner"
            style={{
              background: selectedSleeve.pattern === 'gradient'
                ? `linear-gradient(to bottom, ${selectedSleeve.colors.map(c => `#${c.toString(16).padStart(6, '0')}`).join(', ')})`
                : `#${selectedSleeve.color.toString(16).padStart(6, '0')}`
            }}
          />
          <span>{selectedSleeve.name}</span>
          <span className="text-xs opacity-75">(Click to change)</span>
        </button>

        {/* New Game Button */}
        <button
          onClick={handleRestart}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-lg transition-colors flex items-center gap-2"
        >
          <span>🔄</span>
          <span>New Game</span>
        </button>
      </div>

      {/* AI Thinking Indicator */}
      {opponentType === 'ai' && aiThinking && (
        <div className="absolute top-4 left-4 z-50">
          <div className="px-4 py-3 bg-blue-900/90 text-white rounded-lg shadow-lg border border-blue-500 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="font-semibold">AI is thinking...</span>
          </div>
        </div>
      )}

      {/* AI Decision Info (Debug Mode) */}
      {opponentType === 'ai' && debugMode && aiDecisionInfo && (
        <div className="absolute top-20 left-4 z-50 max-w-md">
          <div className="px-4 py-3 bg-gray-900/90 text-white rounded-lg shadow-lg border border-gray-600">
            <div className="text-sm font-mono">{aiDecisionInfo}</div>
          </div>
        </div>
      )}

      <GameBoard
        engine={engine}
        renderingInterface={renderingInterface}
        localPlayerId={controllingPlayer}
        onError={handleError}
      />
    </div>
  );
}
