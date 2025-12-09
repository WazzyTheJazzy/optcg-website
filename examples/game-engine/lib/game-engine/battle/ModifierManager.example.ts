/**
 * ModifierManager.example.ts
 * 
 * Examples demonstrating the usage of ModifierManager
 */

import { ModifierManager } from '@/lib/game-engine/battle/ModifierManager';
import { GameStateManager } from '@/lib/game-engine/core/GameState';
import { DamageCalculator } from '@/lib/game-engine/battle/DamageCalculator';
import {
  CardInstance,
  CardDefinition,
  CardCategory,
  CardState,
  ZoneId,
  PlayerId,
  Phase,
  ModifierType,
  ModifierDuration,
  GameState,
} from '../core/types';

// ============================================================================
// Helper Functions
// ============================================================================

function createInitialGameState(): GameState {
  return {
    players: new Map([
      [
        PlayerId.PLAYER_1,
        {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        },
      ],
      [
        PlayerId.PLAYER_2,
        {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        },
      ],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.MAIN,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 3,
    },
  };
}

function createTestCharacter(id: string, basePower: number, baseCost: number): CardInstance {
  const definition: CardDefinition = {
    id: `${id}-def`,
    name: `Character ${id}`,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower,
    baseCost,
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
  };

  return {
    id,
    definition,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

// ============================================================================
// Example 1: Basic Modifier Operations
// ============================================================================

function example1_BasicModifierOperations() {
  console.log('=== Example 1: Basic Modifier Operations ===\n');

  const initialState = createInitialGameState();
  const character = createTestCharacter('char-1', 5000, 3);
  
  // Add character to player 1's character area
  const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
  player1.zones.characterArea.push(character);

  const stateManager = new GameStateManager(initialState);
  const modifierManager = new ModifierManager(stateManager);
  const calculator = new DamageCalculator();

  console.log('Initial character state:');
  console.log(`  Power: ${calculator.computeCurrentPower(character)}`);
  console.log(`  Cost: ${calculator.getCurrentCost(character)}`);
  console.log(`  Modifiers: ${character.modifiers.length}\n`);

  // Add a power boost
  console.log('Adding +2000 power modifier (permanent)...');
  let updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.POWER,
    2000,
    ModifierDuration.PERMANENT,
    'effect-source'
  );

  let updatedChar = updatedManager.getCard(character.id)!;
  console.log(`  Power: ${calculator.computeCurrentPower(updatedChar)}`);
  console.log(`  Modifiers: ${updatedChar.modifiers.length}\n`);

  // Add a cost reduction
  modifierManager.updateStateManager(updatedManager);
  console.log('Adding -1 cost modifier (until end of turn)...');
  updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.COST,
    -1,
    ModifierDuration.UNTIL_END_OF_TURN,
    'effect-source'
  );

  updatedChar = updatedManager.getCard(character.id)!;
  console.log(`  Cost: ${calculator.getCurrentCost(updatedChar)}`);
  console.log(`  Modifiers: ${updatedChar.modifiers.length}\n`);

  // Add a keyword
  modifierManager.updateStateManager(updatedManager);
  console.log('Adding Rush keyword...');
  updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.KEYWORD,
    'Rush',
    ModifierDuration.PERMANENT,
    'effect-source'
  );

  updatedChar = updatedManager.getCard(character.id)!;
  console.log(`  Modifiers: ${updatedChar.modifiers.length}`);
  console.log(`  Keyword modifiers: ${updatedChar.modifiers.filter(m => m.type === ModifierType.KEYWORD).length}\n`);
}

// ============================================================================
// Example 2: Battle Modifiers
// ============================================================================

function example2_BattleModifiers() {
  console.log('=== Example 2: Battle Modifiers ===\n');

  const initialState = createInitialGameState();
  const attacker = createTestCharacter('attacker', 5000, 4);
  const defender = createTestCharacter('defender', 6000, 5);
  
  const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
  player1.zones.characterArea.push(attacker);
  
  const player2 = initialState.players.get(PlayerId.PLAYER_2)!;
  player2.zones.characterArea.push(defender);

  const stateManager = new GameStateManager(initialState);
  const modifierManager = new ModifierManager(stateManager);
  const calculator = new DamageCalculator();

  console.log('Battle scenario:');
  console.log(`  Attacker power: ${calculator.computeCurrentPower(attacker)}`);
  console.log(`  Defender power: ${calculator.computeCurrentPower(defender)}\n`);

  // Attacker gets "When Attacking" power boost
  console.log('Attacker triggers "When Attacking" effect (+2000 power until end of battle)...');
  let updatedManager = modifierManager.addModifier(
    attacker.id,
    ModifierType.POWER,
    2000,
    ModifierDuration.UNTIL_END_OF_BATTLE,
    attacker.id
  );

  let updatedAttacker = updatedManager.getCard(attacker.id)!;
  console.log(`  Attacker power: ${calculator.computeCurrentPower(updatedAttacker)}\n`);

  // Defender uses counter card
  modifierManager.updateStateManager(updatedManager);
  console.log('Defender uses counter card (+2000 power until end of battle)...');
  updatedManager = modifierManager.addModifier(
    defender.id,
    ModifierType.POWER,
    2000,
    ModifierDuration.UNTIL_END_OF_BATTLE,
    'counter-card'
  );

  let updatedDefender = updatedManager.getCard(defender.id)!;
  console.log(`  Defender power: ${calculator.computeCurrentPower(updatedDefender)}\n`);

  // Compare powers
  updatedAttacker = updatedManager.getCard(attacker.id)!;
  const attackerPower = calculator.computeCurrentPower(updatedAttacker);
  const defenderPower = calculator.computeCurrentPower(updatedDefender);
  
  console.log('Power comparison:');
  console.log(`  Attacker: ${attackerPower}`);
  console.log(`  Defender: ${defenderPower}`);
  console.log(`  Result: ${attackerPower >= defenderPower ? 'Defender K.O.d' : 'Attacker blocked'}\n`);

  // Battle ends - expire battle modifiers
  modifierManager.updateStateManager(updatedManager);
  console.log('Battle ends - expiring battle modifiers...');
  updatedManager = modifierManager.expireEndOfBattleModifiers();

  updatedAttacker = updatedManager.getCard(attacker.id)!;
  updatedDefender = updatedManager.getCard(defender.id)!;
  console.log(`  Attacker power: ${calculator.computeCurrentPower(updatedAttacker)}`);
  console.log(`  Defender power: ${calculator.computeCurrentPower(updatedDefender)}`);
  console.log(`  Attacker modifiers: ${updatedAttacker.modifiers.length}`);
  console.log(`  Defender modifiers: ${updatedDefender.modifiers.length}\n`);
}

// ============================================================================
// Example 3: Turn-Based Modifier Expiration
// ============================================================================

function example3_TurnBasedExpiration() {
  console.log('=== Example 3: Turn-Based Modifier Expiration ===\n');

  const initialState = createInitialGameState();
  const character = createTestCharacter('char-1', 5000, 3);
  
  const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
  player1.zones.characterArea.push(character);

  const stateManager = new GameStateManager(initialState);
  const modifierManager = new ModifierManager(stateManager);
  const calculator = new DamageCalculator();

  console.log('Adding various modifiers with different durations...\n');

  // Add permanent modifier
  let updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.POWER,
    1000,
    ModifierDuration.PERMANENT,
    'permanent-effect'
  );

  // Add until end of turn modifier
  modifierManager.updateStateManager(updatedManager);
  updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.POWER,
    1000,
    ModifierDuration.UNTIL_END_OF_TURN,
    'temporary-effect'
  );

  // Add until start of next turn modifier
  modifierManager.updateStateManager(updatedManager);
  updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.POWER,
    1000,
    ModifierDuration.UNTIL_START_OF_NEXT_TURN,
    'next-turn-effect'
  );

  let updatedChar = updatedManager.getCard(character.id)!;
  console.log('During turn:');
  console.log(`  Power: ${calculator.computeCurrentPower(updatedChar)}`);
  console.log(`  Modifiers: ${updatedChar.modifiers.length}`);
  console.log(`    - Permanent: ${updatedChar.modifiers.filter(m => m.duration === ModifierDuration.PERMANENT).length}`);
  console.log(`    - Until end of turn: ${updatedChar.modifiers.filter(m => m.duration === ModifierDuration.UNTIL_END_OF_TURN).length}`);
  console.log(`    - Until start of next turn: ${updatedChar.modifiers.filter(m => m.duration === ModifierDuration.UNTIL_START_OF_NEXT_TURN).length}\n`);

  // End of turn
  modifierManager.updateStateManager(updatedManager);
  console.log('End of turn - expiring end-of-turn modifiers...');
  updatedManager = modifierManager.expireEndOfTurnModifiers();

  updatedChar = updatedManager.getCard(character.id)!;
  console.log(`  Power: ${calculator.computeCurrentPower(updatedChar)}`);
  console.log(`  Modifiers: ${updatedChar.modifiers.length}`);
  console.log(`    - Permanent: ${updatedChar.modifiers.filter(m => m.duration === ModifierDuration.PERMANENT).length}`);
  console.log(`    - Until start of next turn: ${updatedChar.modifiers.filter(m => m.duration === ModifierDuration.UNTIL_START_OF_NEXT_TURN).length}\n`);

  // Start of next turn
  modifierManager.updateStateManager(updatedManager);
  console.log('Start of next turn - expiring start-of-turn modifiers...');
  updatedManager = modifierManager.expireStartOfTurnModifiers(PlayerId.PLAYER_1);

  updatedChar = updatedManager.getCard(character.id)!;
  console.log(`  Power: ${calculator.computeCurrentPower(updatedChar)}`);
  console.log(`  Modifiers: ${updatedChar.modifiers.length}`);
  console.log(`    - Permanent: ${updatedChar.modifiers.filter(m => m.duration === ModifierDuration.PERMANENT).length}\n`);
}

// ============================================================================
// Example 4: Querying and Filtering Modifiers
// ============================================================================

function example4_QueryingModifiers() {
  console.log('=== Example 4: Querying and Filtering Modifiers ===\n');

  const initialState = createInitialGameState();
  const character = createTestCharacter('char-1', 5000, 3);
  
  const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
  player1.zones.characterArea.push(character);

  const stateManager = new GameStateManager(initialState);
  const modifierManager = new ModifierManager(stateManager);

  // Add various modifiers
  let updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.POWER,
    2000,
    ModifierDuration.PERMANENT,
    'source-1'
  );

  modifierManager.updateStateManager(updatedManager);
  updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.POWER,
    1000,
    ModifierDuration.UNTIL_END_OF_TURN,
    'source-2'
  );

  modifierManager.updateStateManager(updatedManager);
  updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.COST,
    -1,
    ModifierDuration.PERMANENT,
    'source-3'
  );

  modifierManager.updateStateManager(updatedManager);
  updatedManager = modifierManager.addModifier(
    character.id,
    ModifierType.KEYWORD,
    'Rush',
    ModifierDuration.PERMANENT,
    'source-4'
  );

  modifierManager.updateStateManager(updatedManager);

  // Query modifiers
  console.log('Querying modifiers:');
  
  const allModifiers = modifierManager.getModifiers(character.id);
  console.log(`  Total modifiers: ${allModifiers.length}`);

  const powerModifiers = modifierManager.getModifiersByType(character.id, ModifierType.POWER);
  console.log(`  Power modifiers: ${powerModifiers.length}`);
  powerModifiers.forEach((m, i) => {
    console.log(`    ${i + 1}. +${m.value} (${m.duration})`);
  });

  const costModifiers = modifierManager.getModifiersByType(character.id, ModifierType.COST);
  console.log(`  Cost modifiers: ${costModifiers.length}`);
  costModifiers.forEach((m, i) => {
    console.log(`    ${i + 1}. ${m.value} (${m.duration})`);
  });

  const keywordModifiers = modifierManager.getModifiersByType(character.id, ModifierType.KEYWORD);
  console.log(`  Keyword modifiers: ${keywordModifiers.length}`);
  keywordModifiers.forEach((m, i) => {
    console.log(`    ${i + 1}. ${m.value} (${m.duration})`);
  });

  console.log(`\n  Has modifiers: ${modifierManager.hasModifiers(character.id)}\n`);

  // Remove specific modifiers
  console.log('Removing temporary power modifiers...');
  updatedManager = modifierManager.removeModifiersWhere(
    character.id,
    m => m.type === ModifierType.POWER && m.duration === ModifierDuration.UNTIL_END_OF_TURN
  );

  modifierManager.updateStateManager(updatedManager);
  const remainingModifiers = modifierManager.getModifiers(character.id);
  console.log(`  Remaining modifiers: ${remainingModifiers.length}\n`);
}

// ============================================================================
// Run All Examples
// ============================================================================

function runAllExamples() {
  example1_BasicModifierOperations();
  example2_BattleModifiers();
  example3_TurnBasedExpiration();
  example4_QueryingModifiers();
}

// Export examples for use in other files
export {
  example1_BasicModifierOperations,
  example2_BattleModifiers,
  example3_TurnBasedExpiration,
  example4_QueryingModifiers,
  runAllExamples,
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
