/**
 * Simple test to debug AI vs AI game completion
 */

import { GameEngine } from './lib/game-engine/core/GameEngine';
import { createAIPlayer } from './lib/game-engine/ai/AIPlayer';
import { CardDefinition, CardCategory, PlayerId } from './lib/game-engine/core/types';

function createLeader(id: string, lifeValue: number): CardDefinition {
  return {
    id,
    name: `Leader ${id}`,
    category: CardCategory.LEADER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: null,
    lifeValue,
    counterValue: null,
    rarity: 'L',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createCharacter(id: string, power: number, cost: number): CardDefinition {
  return {
    id,
    name: `Character ${id}`,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: power,
    baseCost: cost,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: id,
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createDon(id: string): CardDefinition {
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
    imageUrl: '',
    metadata: {
      setCode: 'DON',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

function createValidDeck(leaderId: string, lifeValue: number = 5): CardDefinition[] {
  const deck: CardDefinition[] = [];
  deck.push(createLeader(leaderId, lifeValue));

  for (let i = 0; i < 50; i++) {
    const cost = (i % 5) + 1;
    const power = cost * 1000;
    deck.push(createCharacter(`char-${leaderId}-${i}`, power, cost));
  }

  for (let i = 0; i < 10; i++) {
    deck.push(createDon(`don-${leaderId}-${i}`));
  }

  return deck;
}

async function runTest() {
  console.log('Starting AI vs AI game test...\n');

  const engine = new GameEngine();
  const deck1 = createValidDeck('p1', 3);
  const deck2 = createValidDeck('p2', 3);

  const ai1 = createAIPlayer(PlayerId.PLAYER_1, 'medium', 'aggressive', engine.getEventEmitter());
  const ai2 = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'balanced', engine.getEventEmitter());

  await engine.setupGameAsync({
    deck1,
    deck2,
    player1: ai1,
    player2: ai2,
    firstPlayerChoice: PlayerId.PLAYER_1,
    randomSeed: 12345,
  });

  console.log('Game setup complete');
  console.log(`Player 1 life: ${engine.getState().players.get(PlayerId.PLAYER_1)?.zones.life.length}`);
  console.log(`Player 2 life: ${engine.getState().players.get(PlayerId.PLAYER_2)?.zones.life.length}\n`);

  // Run game
  const maxTurns = 20;
  let turnsPlayed = 0;

  // Track attacks and battles
  let attackCount = 0;
  let battleEndCount = 0;
  engine.on('ATTACK_DECLARED', (event: any) => {
    attackCount++;
    console.log(`  -> Attack declared! Attacker: ${event.attackerId}, Target: ${event.targetId}`);
  });
  engine.on('BATTLE_END', (event: any) => {
    battleEndCount++;
    console.log(`  -> Battle ended! Attacker: ${event.attackerId}, Defender: ${event.defenderId}, Damage: ${event.damageDealt}, Defender KO'd: ${event.defenderKOd}`);
  });

  while (!engine.getState().gameOver && turnsPlayed < maxTurns) {
    console.log(`\n=== Turn ${turnsPlayed + 1} (${engine.getState().activePlayer}) ===`);
    
    const state = engine.getState();
    const activePlayer = state.players.get(state.activePlayer);
    const p1 = state.players.get(PlayerId.PLAYER_1);
    const p2 = state.players.get(PlayerId.PLAYER_2);
    const characters = activePlayer?.zones.characterArea || [];
    console.log(`  P1 Characters: ${p1?.zones.characterArea.length}, P2 Characters: ${p2?.zones.characterArea.length}`);
    console.log(`  Active DON: ${activePlayer?.zones.costArea.filter(d => d.state === 'ACTIVE').length}`);
    
    await engine.runTurn();
    turnsPlayed++;

    const p1After = state.players.get(PlayerId.PLAYER_1);
    const p2After = state.players.get(PlayerId.PLAYER_2);

    console.log(`Player 1 life: ${p1After?.zones.life.length}, defeated: ${p1After?.flags.get('defeated')}`);
    console.log(`Player 2 life: ${p2After?.zones.life.length}, defeated: ${p2After?.flags.get('defeated')}`);
    console.log(`Game over: ${state.gameOver}, Winner: ${state.winner}`);
  }

  console.log(`\nTotal attacks: ${attackCount}`);
  console.log(`Total battles ended: ${battleEndCount}`);

  console.log(`\n=== Game Complete ===`);
  console.log(`Turns played: ${turnsPlayed}`);
  console.log(`Game over: ${engine.getState().gameOver}`);
  console.log(`Winner: ${engine.getState().winner}`);
}

runTest().catch(console.error);
