/**
 * DefeatChecker.example.ts
 * 
 * Examples demonstrating how to use the DefeatChecker module
 */

import { GameStateManager, createInitialGameState } from '../core/GameState';
import {
  runDefeatCheck,
  applyDefeatCheck,
  markPlayerDefeated,
  shouldDefeatForZeroLife,
} from './DefeatChecker';
import { PlayerId, CardCategory, CardState, ZoneId } from '../core/types';

// ============================================================================
// Example 1: Basic Defeat Check After Action
// ============================================================================

function example1_BasicDefeatCheck() {
  console.log('Example 1: Basic Defeat Check After Action\n');

  let stateManager = new GameStateManager(createInitialGameState());

  // Simulate a game action (e.g., drawing a card)
  console.log('Performing game action...');

  // After any action, check for defeat
  const result = runDefeatCheck(stateManager);

  if (result.gameOver) {
    console.log(`Game Over! Winner: ${result.winner}`);
    console.log(`Reason: ${result.reason}`);

    // Apply the defeat to game state
    stateManager = applyDefeatCheck(stateManager, result);
  } else {
    console.log('Game continues...');
  }

  console.log('\n---\n');
}

// ============================================================================
// Example 2: Handling Leader Damage with Zero Life
// ============================================================================

function example2_ZeroLifeDamage() {
  console.log('Example 2: Handling Leader Damage with Zero Life\n');

  let stateManager = new GameStateManager(createInitialGameState());
  const playerId = PlayerId.PLAYER_1;

  // Player 1 has no life cards (initial state)
  console.log(`Player 1 life cards: ${stateManager.getPlayer(playerId)?.zones.life.length}`);

  // Check if player should be defeated for zero life
  if (shouldDefeatForZeroLife(stateManager, playerId)) {
    console.log('Player 1 has zero life and is taking damage!');

    // Mark player as defeated
    stateManager = markPlayerDefeated(stateManager, playerId);
    console.log('Player 1 marked as defeated');

    // Run defeat check
    const result = runDefeatCheck(stateManager);
    console.log(`Defeat check result: ${result.reason}`);

    // Apply defeat
    stateManager = applyDefeatCheck(stateManager, result);
    console.log(`Game over: ${stateManager.isGameOver()}`);
    console.log(`Winner: ${stateManager.getWinner()}`);
  }

  console.log('\n---\n');
}

// ============================================================================
// Example 3: Deck Out Scenario
// ============================================================================

function example3_DeckOut() {
  console.log('Example 3: Deck Out Scenario\n');

  let stateManager = new GameStateManager(createInitialGameState());

  // Give Player 2 some cards, but Player 1 has none
  const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
  player2.zones.deck = [
    {
      id: 'card1',
      definition: {
        id: 'def1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      },
      owner: PlayerId.PLAYER_2,
      controller: PlayerId.PLAYER_2,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    },
  ];

  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, player2);

  console.log(`Player 1 deck size: ${stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.deck.length}`);
  console.log(`Player 2 deck size: ${stateManager.getPlayer(PlayerId.PLAYER_2)?.zones.deck.length}`);

  // Check for defeat
  const result = runDefeatCheck(stateManager);

  if (result.gameOver) {
    console.log(`\nGame Over!`);
    console.log(`Winner: ${result.winner}`);
    console.log(`Reason: ${result.reason}`);

    stateManager = applyDefeatCheck(stateManager, result);
  }

  console.log('\n---\n');
}

// ============================================================================
// Example 4: Draw Scenario (Both Players Decked Out)
// ============================================================================

function example4_DrawScenario() {
  console.log('Example 4: Draw Scenario (Both Players Decked Out)\n');

  let stateManager = new GameStateManager(createInitialGameState());

  // Both players have empty decks (initial state)
  console.log(`Player 1 deck size: ${stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.deck.length}`);
  console.log(`Player 2 deck size: ${stateManager.getPlayer(PlayerId.PLAYER_2)?.zones.deck.length}`);

  // Check for defeat
  const result = runDefeatCheck(stateManager);

  if (result.gameOver) {
    console.log(`\nGame Over!`);
    console.log(`Winner: ${result.winner === null ? 'DRAW' : result.winner}`);
    console.log(`Reason: ${result.reason}`);

    stateManager = applyDefeatCheck(stateManager, result);
  }

  console.log('\n---\n');
}

// ============================================================================
// Example 5: Integration with Game Loop
// ============================================================================

function example5_GameLoopIntegration() {
  console.log('Example 5: Integration with Game Loop\n');

  let stateManager = new GameStateManager(createInitialGameState());
  let turnCount = 0;

  // Simulate a game loop
  while (!stateManager.isGameOver() && turnCount < 10) {
    turnCount++;
    console.log(`Turn ${turnCount}:`);

    // Simulate some game action
    console.log('  - Performing actions...');

    // After each action, check for defeat
    const result = runDefeatCheck(stateManager);

    if (result.gameOver) {
      console.log(`  - Defeat detected: ${result.reason}`);
      stateManager = applyDefeatCheck(stateManager, result);
      break;
    }

    console.log('  - No defeat, continuing...');
  }

  if (stateManager.isGameOver()) {
    console.log(`\nGame ended after ${turnCount} turns`);
    console.log(`Winner: ${stateManager.getWinner() === null ? 'DRAW' : stateManager.getWinner()}`);
  }

  console.log('\n---\n');
}

// ============================================================================
// Example 6: Checking Before and After State Changes
// ============================================================================

function example6_BeforeAfterCheck() {
  console.log('Example 6: Checking Before and After State Changes\n');

  let stateManager = new GameStateManager(createInitialGameState());

  // Give both players cards initially
  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;

  player1.zones.deck = [
    {
      id: 'card1',
      definition: {
        id: 'def1',
        name: 'Last Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      },
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    },
  ];

  player2.zones.deck = [
    {
      id: 'card2',
      definition: {
        id: 'def2',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        colors: ['Blue'],
        typeTags: [],
        attributes: [],
        basePower: 4000,
        baseCost: 2,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: [],
        effects: [],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '002',
          isAltArt: false,
          isPromo: false,
        },
      },
      owner: PlayerId.PLAYER_2,
      controller: PlayerId.PLAYER_2,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    },
  ];

  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player1);
  stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, player2);

  console.log('Before drawing last card:');
  let result = runDefeatCheck(stateManager);
  console.log(`  Game over: ${result.gameOver}`);

  // Simulate drawing the last card (move from deck to hand)
  console.log('\nDrawing Player 1\'s last card...');
  stateManager = stateManager.moveCard('card1', ZoneId.HAND);

  console.log('\nAfter drawing last card:');
  result = runDefeatCheck(stateManager);
  console.log(`  Game over: ${result.gameOver}`);
  console.log(`  Winner: ${result.winner}`);
  console.log(`  Reason: ${result.reason}`);

  console.log('\n---\n');
}

// ============================================================================
// Run all examples
// ============================================================================

if (require.main === module) {
  example1_BasicDefeatCheck();
  example2_ZeroLifeDamage();
  example3_DeckOut();
  example4_DrawScenario();
  example5_GameLoopIntegration();
  example6_BeforeAfterCheck();
}

export {
  example1_BasicDefeatCheck,
  example2_ZeroLifeDamage,
  example3_DeckOut,
  example4_DrawScenario,
  example5_GameLoopIntegration,
  example6_BeforeAfterCheck,
};
