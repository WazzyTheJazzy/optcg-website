/**
 * KeywordHandler.example.ts
 * 
 * Examples demonstrating how to use the KeywordHandler class
 */

import { KeywordHandler } from '@/lib/game-engine/battle/KeywordHandler';
import { RulesContext } from '@/lib/game-engine/rules/RulesContext';
import {
  CardInstance,
  CardDefinition,
  CardCategory,
  CardState,
  ZoneId,
  PlayerId,
  ModifierType,
  ModifierDuration,
} from '@/lib/game-engine/core/types';

// Initialize the keyword handler
const rules = new RulesContext();
const keywordHandler = new KeywordHandler(rules);

// ============================================================================
// Example 1: Checking Static Keywords
// ============================================================================

// Create a character with Rush keyword
const luffyDefinition: CardDefinition = {
  id: 'OP01-001',
  name: 'Monkey.D.Luffy',
  category: CardCategory.CHARACTER,
  colors: ['Red'],
  typeTags: ['Straw Hat Crew'],
  attributes: ['Strike'],
  basePower: 5000,
  baseCost: 3,
  lifeValue: null,
  counterValue: 1000,
  rarity: 'SR',
  keywords: ['Rush'], // Static keyword
  effects: [],
  imageUrl: '',
  metadata: {
    setCode: 'OP01',
    cardNumber: '001',
    isAltArt: false,
    isPromo: false,
  },
};

const luffyInstance: CardInstance = {
  id: 'luffy-instance-1',
  definition: luffyDefinition,
  owner: PlayerId.PLAYER_1,
  controller: PlayerId.PLAYER_1,
  zone: ZoneId.CHARACTER_AREA,
  state: CardState.ACTIVE,
  givenDon: [],
  modifiers: [],
  flags: new Map(),
};

// Check if Luffy has Rush
console.log('Example 1: Static Keywords');
console.log('Luffy has Rush:', keywordHandler.hasRush(luffyInstance)); // true
console.log('Luffy has Blocker:', keywordHandler.hasBlocker(luffyInstance)); // false

// ============================================================================
// Example 2: Checking Multiple Keywords
// ============================================================================

// Create a character with multiple keywords
const zoroDefinition: CardDefinition = {
  id: 'OP01-025',
  name: 'Roronoa.Zoro',
  category: CardCategory.CHARACTER,
  colors: ['Green'],
  typeTags: ['Straw Hat Crew'],
  attributes: ['Slash'],
  basePower: 6000,
  baseCost: 4,
  lifeValue: null,
  counterValue: 2000,
  rarity: 'SR',
  keywords: ['Rush', 'Double Attack'], // Multiple keywords
  effects: [],
  imageUrl: '',
  metadata: {
    setCode: 'OP01',
    cardNumber: '025',
    isAltArt: false,
    isPromo: false,
  },
};

const zoroInstance: CardInstance = {
  id: 'zoro-instance-1',
  definition: zoroDefinition,
  owner: PlayerId.PLAYER_1,
  controller: PlayerId.PLAYER_1,
  zone: ZoneId.CHARACTER_AREA,
  state: CardState.ACTIVE,
  givenDon: [],
  modifiers: [],
  flags: new Map(),
};

console.log('\nExample 2: Multiple Keywords');
console.log('Zoro has Rush:', keywordHandler.hasRush(zoroInstance)); // true
console.log('Zoro has Double Attack:', keywordHandler.hasDoubleAttack(zoroInstance)); // true
console.log('All Zoro keywords:', keywordHandler.getAllKeywords(zoroInstance)); // ['Rush', 'Double Attack']

// ============================================================================
// Example 3: Dynamic Keywords via Modifiers
// ============================================================================

// Create a character without keywords
const namiDefinition: CardDefinition = {
  id: 'OP01-016',
  name: 'Nami',
  category: CardCategory.CHARACTER,
  colors: ['Blue'],
  typeTags: ['Straw Hat Crew'],
  attributes: ['Special'],
  basePower: 3000,
  baseCost: 2,
  lifeValue: null,
  counterValue: 1000,
  rarity: 'R',
  keywords: [], // No static keywords
  effects: [],
  imageUrl: '',
  metadata: {
    setCode: 'OP01',
    cardNumber: '016',
    isAltArt: false,
    isPromo: false,
  },
};

const namiInstance: CardInstance = {
  id: 'nami-instance-1',
  definition: namiDefinition,
  owner: PlayerId.PLAYER_1,
  controller: PlayerId.PLAYER_1,
  zone: ZoneId.CHARACTER_AREA,
  state: CardState.ACTIVE,
  givenDon: [],
  modifiers: [],
  flags: new Map(),
};

console.log('\nExample 3: Dynamic Keywords');
console.log('Nami has Rush (before modifier):', keywordHandler.hasRush(namiInstance)); // false

// Add Rush keyword via modifier (e.g., from an effect)
namiInstance.modifiers.push({
  id: 'temp-rush-modifier',
  type: ModifierType.KEYWORD,
  value: 'Rush',
  duration: ModifierDuration.UNTIL_END_OF_TURN,
  source: 'effect-card-id',
  timestamp: Date.now(),
});

console.log('Nami has Rush (after modifier):', keywordHandler.hasRush(namiInstance)); // true
console.log('All Nami keywords:', keywordHandler.getAllKeywords(namiInstance)); // ['Rush']

// ============================================================================
// Example 4: Combining Static and Dynamic Keywords
// ============================================================================

// Create a character with Blocker
const sanjiDefinition: CardDefinition = {
  id: 'OP01-013',
  name: 'Sanji',
  category: CardCategory.CHARACTER,
  colors: ['Blue'],
  typeTags: ['Straw Hat Crew'],
  attributes: ['Strike'],
  basePower: 5000,
  baseCost: 4,
  lifeValue: null,
  counterValue: 2000,
  rarity: 'SR',
  keywords: ['Blocker'], // Static keyword
  effects: [],
  imageUrl: '',
  metadata: {
    setCode: 'OP01',
    cardNumber: '013',
    isAltArt: false,
    isPromo: false,
  },
};

const sanjiInstance: CardInstance = {
  id: 'sanji-instance-1',
  definition: sanjiDefinition,
  owner: PlayerId.PLAYER_1,
  controller: PlayerId.PLAYER_1,
  zone: ZoneId.CHARACTER_AREA,
  state: CardState.ACTIVE,
  givenDon: [],
  modifiers: [],
  flags: new Map(),
};

console.log('\nExample 4: Combining Static and Dynamic Keywords');
console.log('Sanji has Blocker (static):', keywordHandler.hasBlocker(sanjiInstance)); // true
console.log('Sanji has Double Attack (before):', keywordHandler.hasDoubleAttack(sanjiInstance)); // false

// Add Double Attack via modifier
sanjiInstance.modifiers.push({
  id: 'double-attack-modifier',
  type: ModifierType.KEYWORD,
  value: 'Double Attack',
  duration: ModifierDuration.UNTIL_END_OF_TURN,
  source: 'effect-card-id',
  timestamp: Date.now(),
});

console.log('Sanji has Double Attack (after):', keywordHandler.hasDoubleAttack(sanjiInstance)); // true
console.log('All Sanji keywords:', keywordHandler.getAllKeywords(sanjiInstance)); // ['Blocker', 'Double Attack']

// ============================================================================
// Example 5: Validating Keywords
// ============================================================================

console.log('\nExample 5: Validating Keywords');

// Check if keywords are valid
console.log('Is "Rush" valid?', keywordHandler.isValidKeyword('Rush')); // true
console.log('Is "Flying" valid?', keywordHandler.isValidKeyword('Flying')); // false

// Check if keywords can apply to card categories
console.log('Can Rush apply to CHARACTER?', keywordHandler.canApplyToCategory('Rush', 'CHARACTER')); // true
console.log('Can Rush apply to EVENT?', keywordHandler.canApplyToCategory('Rush', 'EVENT')); // false
console.log('Can Trigger apply to CHARACTER?', keywordHandler.canApplyToCategory('Trigger', 'CHARACTER')); // true
console.log('Can Trigger apply to EVENT?', keywordHandler.canApplyToCategory('Trigger', 'EVENT')); // true

// ============================================================================
// Example 6: Getting Keyword Definitions
// ============================================================================

console.log('\nExample 6: Keyword Definitions');

// Get keyword definition from rules
const rushDef = keywordHandler.getKeywordDefinition('Rush');
if (rushDef) {
  console.log('Rush Definition:');
  console.log('  Name:', rushDef.name);
  console.log('  Description:', rushDef.description);
  console.log('  Type:', rushDef.type);
  console.log('  Applies To:', rushDef.appliesTo);
}

const blockerDef = keywordHandler.getKeywordDefinition('Blocker');
if (blockerDef) {
  console.log('\nBlocker Definition:');
  console.log('  Name:', blockerDef.name);
  console.log('  Description:', blockerDef.description);
  console.log('  Type:', blockerDef.type);
  console.log('  Applies To:', blockerDef.appliesTo);
}

// ============================================================================
// Example 7: Using Keywords in Game Logic
// ============================================================================

console.log('\nExample 7: Using Keywords in Game Logic');

// Example: Check if a character can attack on the turn it's played
function canAttackThisTurn(card: CardInstance, turnPlayed: number, currentTurn: number): boolean {
  // If card was played on a previous turn, it can attack
  if (turnPlayed < currentTurn) {
    return true;
  }
  
  // If card was played this turn, it can only attack if it has Rush
  return keywordHandler.hasRush(card);
}

console.log('Luffy can attack this turn (with Rush):', canAttackThisTurn(luffyInstance, 1, 1)); // true
console.log('Sanji can attack this turn (without Rush):', canAttackThisTurn(sanjiInstance, 1, 1)); // false

// Example: Calculate damage to leader
function calculateLeaderDamage(attacker: CardInstance): number {
  // Check for Double Attack keyword
  if (keywordHandler.hasDoubleAttack(attacker)) {
    return 2; // Deal 2 damage
  }
  return 1; // Deal 1 damage
}

console.log('Zoro damage to leader:', calculateLeaderDamage(zoroInstance)); // 2 (has Double Attack)
console.log('Luffy damage to leader:', calculateLeaderDamage(luffyInstance)); // 1 (no Double Attack)

// Example: Get all characters that can block
function getLegalBlockers(characters: CardInstance[]): CardInstance[] {
  return characters.filter(card => 
    card.state === CardState.ACTIVE && 
    keywordHandler.hasBlocker(card)
  );
}

const allCharacters = [luffyInstance, zoroInstance, namiInstance, sanjiInstance];
const blockers = getLegalBlockers(allCharacters);
console.log('Characters that can block:', blockers.map(c => c.definition.name)); // ['Sanji']

// ============================================================================
// Example 8: Handling Trigger Keywords
// ============================================================================

console.log('\nExample 8: Trigger Keywords');

// Create a card with Trigger keyword
const triggerEventDefinition: CardDefinition = {
  id: 'OP01-030',
  name: 'Gum-Gum Red Hawk',
  category: CardCategory.EVENT,
  colors: ['Red'],
  typeTags: [],
  attributes: [],
  basePower: null,
  baseCost: 1,
  lifeValue: null,
  counterValue: null,
  rarity: 'C',
  keywords: ['Trigger'], // Trigger keyword
  effects: [],
  imageUrl: '',
  metadata: {
    setCode: 'OP01',
    cardNumber: '030',
    isAltArt: false,
    isPromo: false,
  },
};

const triggerEventInstance: CardInstance = {
  id: 'trigger-event-1',
  definition: triggerEventDefinition,
  owner: PlayerId.PLAYER_1,
  controller: PlayerId.PLAYER_1,
  zone: ZoneId.LIFE, // In life zone
  state: CardState.NONE,
  givenDon: [],
  modifiers: [],
  flags: new Map(),
};

// Check if card can activate as trigger
if (keywordHandler.hasTrigger(triggerEventInstance)) {
  console.log('Card has Trigger - player can choose to activate or add to hand');
}

// ============================================================================
// Example 9: Multiple Modifiers
// ============================================================================

console.log('\nExample 9: Multiple Modifiers');

// Create a basic character
const usoppDefinition: CardDefinition = {
  id: 'OP01-004',
  name: 'Usopp',
  category: CardCategory.CHARACTER,
  colors: ['Red'],
  typeTags: ['Straw Hat Crew'],
  attributes: ['Ranged'],
  basePower: 2000,
  baseCost: 1,
  lifeValue: null,
  counterValue: 1000,
  rarity: 'C',
  keywords: [], // No keywords initially
  effects: [],
  imageUrl: '',
  metadata: {
    setCode: 'OP01',
    cardNumber: '004',
    isAltArt: false,
    isPromo: false,
  },
};

const usoppInstance: CardInstance = {
  id: 'usopp-instance-1',
  definition: usoppDefinition,
  owner: PlayerId.PLAYER_1,
  controller: PlayerId.PLAYER_1,
  zone: ZoneId.CHARACTER_AREA,
  state: CardState.ACTIVE,
  givenDon: [],
  modifiers: [],
  flags: new Map(),
};

console.log('Usopp keywords (initial):', keywordHandler.getAllKeywords(usoppInstance)); // []

// Add multiple keyword modifiers
usoppInstance.modifiers.push(
  {
    id: 'mod-rush',
    type: ModifierType.KEYWORD,
    value: 'Rush',
    duration: ModifierDuration.UNTIL_END_OF_TURN,
    source: 'effect-1',
    timestamp: Date.now(),
  },
  {
    id: 'mod-blocker',
    type: ModifierType.KEYWORD,
    value: 'Blocker',
    duration: ModifierDuration.PERMANENT,
    source: 'effect-2',
    timestamp: Date.now(),
  },
  {
    id: 'mod-power',
    type: ModifierType.POWER,
    value: 2000,
    duration: ModifierDuration.UNTIL_END_OF_TURN,
    source: 'effect-3',
    timestamp: Date.now(),
  }
);

console.log('Usopp keywords (after modifiers):', keywordHandler.getAllKeywords(usoppInstance)); // ['Rush', 'Blocker']
console.log('Usopp has Rush:', keywordHandler.hasRush(usoppInstance)); // true
console.log('Usopp has Blocker:', keywordHandler.hasBlocker(usoppInstance)); // true

console.log('\n=== Examples Complete ===');
