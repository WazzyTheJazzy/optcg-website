/**
 * GameSetup.example.ts
 * 
 * Example usage of the game setup system
 */

import { setupGame, validateDeck, GameSetupConfig } from './GameSetup';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  CardDefinition,
  CardCategory,
  PlayerId,
  EffectTimingType,
  TriggerTiming,
} from '../core/types';

// Create example card definitions
function createExampleLeader(playerId: string): CardDefinition {
  return {
    id: `${playerId}-leader`,
    name: 'Monkey D. Luffy',
    category: CardCategory.LEADER,
    colors: ['Red'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Strike'],
    basePower: 5000,
    baseCost: null,
    lifeValue: 5,
    counterValue: null,
    rarity: 'L',
    keywords: [],
    effects: [
      {
        id: 'luffy-start-effect',
        label: '[Start of Game]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.START_OF_GAME,
        condition: null,
        cost: null,
        scriptId: 'luffy-start-game',
        oncePerTurn: false,
      },
    ],
    imageUrl: '/cards/luffy-leader.jpg',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createExampleCharacter(id: string, name: string, cost: number): CardDefinition {
  return {
    id,
    name,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: ['Straw Hat Crew'],
    attributes: ['Strike'],
    basePower: 4000,
    baseCost: cost,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: `/cards/${id}.jpg`,
    metadata: {
      setCode: 'OP01',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createExampleDon(id: string): CardDefinition {
  return {
    id,
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
    imageUrl: '/cards/don.jpg',
    metadata: {
      setCode: 'DON',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

// Create a complete deck
function createExampleDeck(playerId: string): CardDefinition[] {
  const deck: CardDefinition[] = [];

  // Add leader
  deck.push(createExampleLeader(playerId));

  // Add 50 character cards with varying costs
  for (let i = 0; i < 50; i++) {
    const cost = (i % 7) + 1; // Costs from 1 to 7
    deck.push(createExampleCharacter(`${playerId}-char-${i}`, `Character ${i}`, cost));
  }

  // Add 10 DON cards
  for (let i = 0; i < 10; i++) {
    deck.push(createExampleDon(`${playerId}-don-${i}`));
  }

  return deck;
}

// Example 1: Basic game setup
export function exampleBasicSetup() {
  console.log('=== Example 1: Basic Game Setup ===\n');

  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();

  const deck1 = createExampleDeck('p1');
  const deck2 = createExampleDeck('p2');

  // Validate decks first
  console.log('Validating decks...');
  const deck1Validation = validateDeck(deck1, rules);
  const deck2Validation = validateDeck(deck2, rules);

  console.log(`Deck 1 valid: ${deck1Validation.valid}`);
  console.log(`Deck 2 valid: ${deck2Validation.valid}`);

  if (!deck1Validation.valid || !deck2Validation.valid) {
    console.error('Deck validation failed!');
    return;
  }

  // Setup game
  const config: GameSetupConfig = {
    deck1,
    deck2,
    firstPlayerChoice: PlayerId.PLAYER_1,
    randomSeed: 12345,
  };

  console.log('\nSetting up game...');
  const result = setupGame(config, rules, eventEmitter);

  console.log(`First player: ${result.firstPlayer}`);
  console.log(`Active player: ${result.stateManager.getActivePlayer()}`);

  const state = result.stateManager.getState();
  const player1 = state.players.get(PlayerId.PLAYER_1)!;
  const player2 = state.players.get(PlayerId.PLAYER_2)!;

  console.log('\nPlayer 1 zones:');
  console.log(`  Deck: ${player1.zones.deck.length} cards`);
  console.log(`  Hand: ${player1.zones.hand.length} cards`);
  console.log(`  Life: ${player1.zones.life.length} cards`);
  console.log(`  DON Deck: ${player1.zones.donDeck.length} cards`);
  console.log(`  Leader: ${player1.zones.leaderArea?.definition.name}`);

  console.log('\nPlayer 2 zones:');
  console.log(`  Deck: ${player2.zones.deck.length} cards`);
  console.log(`  Hand: ${player2.zones.hand.length} cards`);
  console.log(`  Life: ${player2.zones.life.length} cards`);
  console.log(`  DON Deck: ${player2.zones.donDeck.length} cards`);
  console.log(`  Leader: ${player2.zones.leaderArea?.definition.name}`);

  console.log('\n✓ Game setup complete!\n');
}

// Example 2: Setup with mulligan
export function exampleSetupWithMulligan() {
  console.log('=== Example 2: Setup with Mulligan ===\n');

  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();

  const deck1 = createExampleDeck('p1');
  const deck2 = createExampleDeck('p2');

  const config: GameSetupConfig = {
    deck1,
    deck2,
    firstPlayerChoice: PlayerId.PLAYER_1,
    player1Mulligan: true, // Player 1 takes a mulligan
    randomSeed: 12345,
  };

  console.log('Setting up game with Player 1 mulligan...');
  const result = setupGame(config, rules, eventEmitter);

  const state = result.stateManager.getState();
  const player1 = state.players.get(PlayerId.PLAYER_1)!;

  console.log(`\nPlayer 1 hand after mulligan: ${player1.zones.hand.length} cards`);
  console.log('Hand cards:');
  player1.zones.hand.forEach((card, i) => {
    console.log(`  ${i + 1}. ${card.definition.name} (Cost: ${card.definition.baseCost})`);
  });

  console.log('\n✓ Mulligan complete!\n');
}

// Example 3: Random first player selection
export function exampleRandomFirstPlayer() {
  console.log('=== Example 3: Random First Player Selection ===\n');

  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();

  const deck1 = createExampleDeck('p1');
  const deck2 = createExampleDeck('p2');

  // Run setup multiple times with different seeds to show randomness
  console.log('Running setup 5 times with different random seeds:\n');

  for (let i = 0; i < 5; i++) {
    const config: GameSetupConfig = {
      deck1,
      deck2,
      randomSeed: i * 1000,
    };

    const result = setupGame(config, rules, eventEmitter);
    console.log(`  Seed ${i * 1000}: First player is ${result.firstPlayer}`);
  }

  console.log('\n✓ Random selection demonstrated!\n');
}

// Example 4: Checking start of game effects
export function exampleStartOfGameEffects() {
  console.log('=== Example 4: Start of Game Effects ===\n');

  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();

  const deck1 = createExampleDeck('p1');
  const deck2 = createExampleDeck('p2');

  const config: GameSetupConfig = {
    deck1,
    deck2,
    firstPlayerChoice: PlayerId.PLAYER_1,
    randomSeed: 12345,
  };

  const result = setupGame(config, rules, eventEmitter);
  const state = result.stateManager.getState();

  const player1 = state.players.get(PlayerId.PLAYER_1)!;
  const player2 = state.players.get(PlayerId.PLAYER_2)!;

  console.log('Checking for Start of Game effects:\n');

  const p1Leader = player1.zones.leaderArea!;
  const p2Leader = player2.zones.leaderArea!;

  console.log(`Player 1 Leader: ${p1Leader.definition.name}`);
  console.log(`  Has START_OF_GAME effects: ${p1Leader.flags.get('hasStartOfGameEffects') || false}`);
  console.log(`  Effect count: ${p1Leader.definition.effects.length}`);

  console.log(`\nPlayer 2 Leader: ${p2Leader.definition.name}`);
  console.log(`  Has START_OF_GAME effects: ${p2Leader.flags.get('hasStartOfGameEffects') || false}`);
  console.log(`  Effect count: ${p2Leader.definition.effects.length}`);

  console.log('\n✓ Start of game effects checked!\n');
}

// Run all examples
if (require.main === module) {
  exampleBasicSetup();
  exampleSetupWithMulligan();
  exampleRandomFirstPlayer();
  exampleStartOfGameEffects();
}
