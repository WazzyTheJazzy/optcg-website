/**
 * Example usage of PhaseManager
 * 
 * This example demonstrates how to use the PhaseManager to run turns
 * and listen to phase transition events.
 */

import { PhaseManager } from './PhaseManager';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardState,
  CardCategory,
  CardDefinition,
  CardInstance,
  DonInstance,
} from '../core/types';

// Initialize components
const rules = new RulesContext();
const eventEmitter = new EventEmitter();
const phaseManager = new PhaseManager(rules, eventEmitter);

// Subscribe to events
eventEmitter.on(GameEventType.TURN_START, (event: any) => {
  console.log(`Turn ${event.turnNumber} started for ${event.activePlayer}`);
});

eventEmitter.on(GameEventType.PHASE_CHANGED, (event: any) => {
  console.log(`Phase changed: ${event.oldPhase} -> ${event.newPhase}`);
});

eventEmitter.on(GameEventType.TURN_END, (event: any) => {
  console.log(`Turn ${event.turnNumber} ended`);
});

// Create initial game state
const initialState = createInitialGameState();
let stateManager = new GameStateManager(initialState);

// Set up some test data
const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

if (player1 && player2) {
  // Add DON cards to don decks
  for (let i = 0; i < 10; i++) {
    const don1: DonInstance = {
      id: `don-p1-${i}`,
      owner: PlayerId.PLAYER_1,
      zone: ZoneId.DON_DECK,
      state: CardState.NONE,
    };
    player1.zones.donDeck.push(don1);

    const don2: DonInstance = {
      id: `don-p2-${i}`,
      owner: PlayerId.PLAYER_2,
      zone: ZoneId.DON_DECK,
      state: CardState.NONE,
    };
    player2.zones.donDeck.push(don2);
  }

  // Add some cards to decks
  for (let i = 0; i < 10; i++) {
    const cardDef: CardDefinition = {
      id: `card-${i}`,
      name: `Test Card ${i}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 3000,
      baseCost: 2,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: `${i}`,
        isAltArt: false,
        isPromo: false,
      },
    };

    const card1: CardInstance = {
      id: `card-p1-${i}`,
      definition: cardDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
    player1.zones.deck.push(card1);

    const card2: CardInstance = {
      id: `card-p2-${i}`,
      definition: cardDef,
      owner: PlayerId.PLAYER_2,
      controller: PlayerId.PLAYER_2,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
    player2.zones.deck.push(card2);
  }
}

// Recreate state manager with updated state
stateManager = new GameStateManager(stateManager.getState());

console.log('\n=== Running Turn 1 (Player 1) ===');
stateManager = phaseManager.runTurn(stateManager);

console.log('\nAfter Turn 1:');
console.log('- Turn number:', stateManager.getTurnNumber());
console.log('- Active player:', stateManager.getActivePlayer());
console.log('- Player 1 hand size:', stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.hand.length);
console.log('- Player 1 DON in cost area:', stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.costArea.length);

console.log('\n=== Running Turn 2 (Player 2) ===');
stateManager = phaseManager.runTurn(stateManager);

console.log('\nAfter Turn 2:');
console.log('- Turn number:', stateManager.getTurnNumber());
console.log('- Active player:', stateManager.getActivePlayer());
console.log('- Player 2 hand size:', stateManager.getPlayer(PlayerId.PLAYER_2)?.zones.hand.length);
console.log('- Player 2 DON in cost area:', stateManager.getPlayer(PlayerId.PLAYER_2)?.zones.costArea.length);

console.log('\n=== Running Turn 3 (Player 1) ===');
stateManager = phaseManager.runTurn(stateManager);

console.log('\nAfter Turn 3:');
console.log('- Turn number:', stateManager.getTurnNumber());
console.log('- Active player:', stateManager.getActivePlayer());
console.log('- Player 1 hand size:', stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.hand.length);
console.log('- Player 1 DON in cost area:', stateManager.getPlayer(PlayerId.PLAYER_1)?.zones.costArea.length);

console.log('\n✅ PhaseManager example completed successfully!');
