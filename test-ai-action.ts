/**
 * Test script to verify AI takes actions during MAIN phase
 */

import { GameEngine } from './lib/game-engine/core/GameEngine';
import { RulesContext } from './lib/game-engine/rules/RulesContext';
import { createAIPlayer } from './lib/game-engine/ai/AIPlayerFactory';
import { HumanPlayer } from './lib/game-engine/ai/HumanPlayer';
import { PlayerId, CardDefinition, CardCategory } from './lib/game-engine/core/types';

// Create mock cards for testing
function createMockCards(): CardDefinition[] {
  const mockCards: CardDefinition[] = [];
  
  // Add 2 leaders
  for (let i = 0; i < 2; i++) {
    mockCards.push({
      id: `mock-leader-${i}`,
      name: `Test Leader ${i + 1}`,
      category: CardCategory.LEADER,
      colors: ['Red'],
      typeTags: [],
      attributes: ['Test'],
      basePower: 5000,
      baseCost: 0,
      lifeValue: 5,
      counterValue: null,
      rarity: 'L',
      keywords: [],
      effects: [],
      imageUrl: '/cards/placeholder.png',
      metadata: {
        setCode: 'TEST',
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
      name: `Test Character ${i + 1}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: ['Test'],
      basePower: 3000 + (i % 5) * 1000,
      baseCost: 1 + (i % 7),
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '/cards/placeholder.png',
      metadata: {
        setCode: 'TEST',
        cardNumber: `C-${i + 1}`,
        isAltArt: false,
        isPromo: false,
      },
    });
  }
  
  return mockCards;
}

function buildValidDecks(cards: CardDefinition[]): { deck1: CardDefinition[]; deck2: CardDefinition[] } {
  const leaders = cards.filter(c => c.category === 'LEADER');
  const characters = cards.filter(c => c.category === 'CHARACTER');

  const leader1 = leaders[0];
  const mainDeck1 = characters.slice(0, 50);
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

  const leader2 = leaders[1];
  const mainDeck2 = characters.slice(0, 50);
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

  return { deck1, deck2 };
}

async function testAIActions() {
  console.log('🧪 Testing AI action loop...\n');

  // Create game engine
  const rules = new RulesContext();
  const engine = new GameEngine(rules);

  // Create mock cards
  const cards = createMockCards();
  const { deck1, deck2 } = buildValidDecks(cards);

  // Create players: Player 1 is human, Player 2 is AI
  const player1 = new HumanPlayer(PlayerId.PLAYER_1);
  const player2 = createAIPlayer(PlayerId.PLAYER_2, 'easy', 'balanced', engine.getEventEmitter());

  console.log('✅ Created players:');
  console.log(`   - Player 1: ${player1.type}`);
  console.log(`   - Player 2: ${player2.type}\n`);

  // Setup game
  await engine.setupGameAsync({
    deck1,
    deck2,
    firstPlayerChoice: PlayerId.PLAYER_1,
    player1,
    player2,
  });

  console.log('✅ Game setup complete\n');

  // Get initial state
  const initialState = engine.getState();
  console.log('📊 Initial state:');
  console.log(`   - Phase: ${initialState.phase}`);
  console.log(`   - Active player: ${initialState.activePlayer}`);
  console.log(`   - Turn: ${initialState.turnNumber}\n`);

  // Advance through phases until we reach Player 2's MAIN phase
  console.log('⏩ Advancing to Player 2 turn...\n');
  
  // Player 1's turn - advance through all phases
  for (let i = 0; i < 5; i++) {
    const state = engine.getState();
    console.log(`   Phase ${i + 1}: ${state.phase} (Active: ${state.activePlayer})`);
    engine.advancePhase();
  }

  // Now we should be on Player 2's turn
  const p2State = engine.getState();
  console.log(`\n✅ Reached Player 2's turn`);
  console.log(`   - Phase: ${p2State.phase}`);
  console.log(`   - Active player: ${p2State.activePlayer}\n`);

  // Advance to MAIN phase
  console.log('⏩ Advancing to MAIN phase...\n');
  while (engine.getState().phase !== 'MAIN') {
    engine.advancePhase();
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }

  console.log('✅ Reached MAIN phase');
  console.log('🤖 AI should now be taking actions...\n');

  // Wait a bit for AI to act
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check final state
  const finalState = engine.getState();
  console.log('\n📊 Final state:');
  console.log(`   - Phase: ${finalState.phase}`);
  console.log(`   - Active player: ${finalState.activePlayer}`);
  console.log(`   - Turn: ${finalState.turnNumber}`);

  const p2Player = finalState.players.get(PlayerId.PLAYER_2);
  if (p2Player) {
    console.log(`   - P2 hand: ${p2Player.zones.hand.length} cards`);
    console.log(`   - P2 character area: ${p2Player.zones.characterArea.length} cards`);
    console.log(`   - P2 active DON: ${p2Player.zones.costArea.filter(d => d.state === 'ACTIVE').length}`);
  }

  console.log('\n✅ Test complete!');
}

// Run the test
testAIActions().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
