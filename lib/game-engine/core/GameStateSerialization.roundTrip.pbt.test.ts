/**
 * Property-Based Test: Game State Serialization Round Trip
 * 
 * Feature: ai-battle-integration, Property 54: Game State Serialization Round Trip
 * Validates: Requirements 38.1
 * 
 * Property: For any game state, serializing to JSON and then deserializing
 * should produce an equivalent game state.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  serializeGameState,
  deserializeGameState,
  gameStateToJSON,
  gameStateFromJSON,
} from './GameStateSerialization';
import {
  GameState,
  PlayerId,
  Phase,
  ZoneId,
  CardState,
  CardCategory,
  Color,
  PlayerState,
  CardInstance,
  DonInstance,
  CardDefinition,
  ModifierDuration,
  ModifierType,
} from './types';

// ============================================================================
// Arbitraries for generating random game states
// ============================================================================

const playerIdArb = fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2);
const phaseArb = fc.constantFrom(
  Phase.REFRESH,
  Phase.DRAW,
  Phase.DON_PHASE,
  Phase.MAIN,
  Phase.END
);
const zoneIdArb = fc.constantFrom(
  ZoneId.DECK,
  ZoneId.HAND,
  ZoneId.TRASH,
  ZoneId.LIFE,
  ZoneId.CHARACTER_AREA,
  ZoneId.LEADER_AREA,
  ZoneId.STAGE_AREA,
  ZoneId.BANISHED
);
const cardStateArb = fc.constantFrom(
  CardState.ACTIVE,
  CardState.RESTED,
  CardState.NONE
);
const categoryArb = fc.constantFrom(
  CardCategory.LEADER,
  CardCategory.CHARACTER,
  CardCategory.EVENT,
  CardCategory.STAGE
);
const colorArb = fc.constantFrom(
  Color.RED,
  Color.GREEN,
  Color.BLUE,
  Color.PURPLE,
  Color.BLACK,
  Color.YELLOW
);

const cardDefinitionArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  category: categoryArb,
  colors: fc.array(colorArb.map(c => c.toString()), { minLength: 1, maxLength: 2 }),
  typeTags: fc.array(fc.string(), { maxLength: 3 }),
  attributes: fc.array(fc.string(), { maxLength: 3 }),
  basePower: fc.option(fc.integer({ min: 0, max: 12000 }), { nil: null }),
  baseCost: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
  lifeValue: fc.option(fc.integer({ min: 4, max: 5 }), { nil: null }),
  counterValue: fc.option(fc.integer({ min: 1000, max: 2000 }), { nil: null }),
  rarity: fc.constantFrom('C', 'UC', 'R', 'SR', 'SEC', 'L'),
  keywords: fc.array(fc.constantFrom('Rush', 'Blocker', 'Double Attack'), { maxLength: 2 }),
  effects: fc.constant([]), // Simplified for testing
  imageUrl: fc.string(),
  metadata: fc.record({
    setCode: fc.string({ minLength: 4, maxLength: 6 }),
    cardNumber: fc.string({ minLength: 3, maxLength: 6 }),
    isAltArt: fc.boolean(),
    isPromo: fc.boolean(),
  }),
}) as fc.Arbitrary<CardDefinition>;

const modifierArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(ModifierType.POWER, ModifierType.KEYWORD),
  value: fc.oneof(
    fc.integer({ min: -5000, max: 5000 }),
    fc.constantFrom('Rush', 'Blocker', 'Double Attack')
  ),
  duration: fc.constantFrom(
    ModifierDuration.PERMANENT,
    ModifierDuration.UNTIL_END_OF_TURN,
    ModifierDuration.UNTIL_END_OF_BATTLE
  ),
  source: fc.uuid(),
  timestamp: fc.integer({ min: 0, max: Date.now() }),
});

const donInstanceArb = (owner: PlayerId) =>
  fc.record({
    id: fc.uuid(),
    owner: fc.constant(owner),
    zone: fc.constantFrom(ZoneId.DON_DECK, ZoneId.COST_AREA),
    state: cardStateArb,
  }) as fc.Arbitrary<DonInstance>;

const cardInstanceArb = (
  owner: PlayerId,
  zone: ZoneId,
  definition: CardDefinition
) =>
  fc.record({
    id: fc.uuid(),
    definition: fc.constant(definition),
    owner: fc.constant(owner),
    controller: fc.constant(owner),
    zone: fc.constant(zone),
    state: cardStateArb,
    givenDon: fc.array(donInstanceArb(owner), { maxLength: 3 }),
    modifiers: fc.array(modifierArb, { maxLength: 3 }),
    flags: fc.constant(new Map()),
  }) as fc.Arbitrary<CardInstance>;

// Create a simple card definition for testing
const testLeaderDef: CardDefinition = {
  id: 'test-leader',
  name: 'Test Leader',
  category: CardCategory.LEADER,
  colors: ['RED'],
  typeTags: [],
  attributes: [],
  basePower: 5000,
  baseCost: null,
  lifeValue: 5,
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

const testCharacterDef: CardDefinition = {
  id: 'test-character',
  name: 'Test Character',
  category: CardCategory.CHARACTER,
  colors: ['RED'],
  typeTags: [],
  attributes: [],
  basePower: 3000,
  baseCost: 3,
  lifeValue: null,
  counterValue: 1000,
  rarity: 'C',
  keywords: [],
  effects: [],
  imageUrl: '',
  metadata: {
    setCode: 'TEST',
    cardNumber: '002',
    isAltArt: false,
    isPromo: false,
  },
};

const playerStateArb = (playerId: PlayerId) =>
  fc.record({
    id: fc.constant(playerId),
    zones: fc.record({
      deck: fc.array(
        cardInstanceArb(playerId, ZoneId.DECK, testCharacterDef),
        { maxLength: 10 }
      ),
      hand: fc.array(
        cardInstanceArb(playerId, ZoneId.HAND, testCharacterDef),
        { maxLength: 7 }
      ),
      trash: fc.array(
        cardInstanceArb(playerId, ZoneId.TRASH, testCharacterDef),
        { maxLength: 5 }
      ),
      life: fc.array(
        cardInstanceArb(playerId, ZoneId.LIFE, testCharacterDef),
        { minLength: 0, maxLength: 5 }
      ),
      donDeck: fc.array(donInstanceArb(playerId), { maxLength: 10 }),
      costArea: fc.array(donInstanceArb(playerId), { maxLength: 10 }),
      leaderArea: cardInstanceArb(playerId, ZoneId.LEADER_AREA, testLeaderDef),
      characterArea: fc.array(
        cardInstanceArb(playerId, ZoneId.CHARACTER_AREA, testCharacterDef),
        { maxLength: 5 }
      ),
      stageArea: fc.option(
        cardInstanceArb(playerId, ZoneId.STAGE_AREA, testCharacterDef),
        { nil: null }
      ),
      banished: fc.array(
        cardInstanceArb(playerId, ZoneId.BANISHED, testCharacterDef),
        { maxLength: 3 }
      ),
    }),
    flags: fc.constant(new Map()),
  }) as fc.Arbitrary<PlayerState>;

const gameStateArb = fc
  .record({
    activePlayer: playerIdArb,
    phase: phaseArb,
    turnNumber: fc.integer({ min: 1, max: 20 }),
    gameOver: fc.boolean(),
  })
  .chain((base) =>
    fc.record({
      players: fc
        .tuple(
          playerStateArb(PlayerId.PLAYER_1),
          playerStateArb(PlayerId.PLAYER_2)
        )
        .map((states) => {
          const map = new Map<PlayerId, PlayerState>();
          map.set(PlayerId.PLAYER_1, states[0]);
          map.set(PlayerId.PLAYER_2, states[1]);
          return map;
        }),
      activePlayer: fc.constant(base.activePlayer),
      phase: fc.constant(base.phase),
      turnNumber: fc.constant(base.turnNumber),
      pendingTriggers: fc.constant([]),
      gameOver: fc.constant(base.gameOver),
      winner: base.gameOver
        ? fc.option(playerIdArb, { nil: null })
        : fc.constant(null),
      history: fc.constant([]),
      loopGuardState: fc.constant({
        stateHashes: new Map(),
        maxRepeats: 3,
      }),
      attackedThisTurn: fc.constant(new Set<string>()),
    })
  ) as fc.Arbitrary<GameState>;

// ============================================================================
// Card Definition Lookup for Testing
// ============================================================================

const cardDefinitions = new Map<string, CardDefinition>([
  ['test-leader', testLeaderDef],
  ['test-character', testCharacterDef],
]);

function cardDefinitionLookup(cardId: string): CardDefinition | undefined {
  return cardDefinitions.get(cardId);
}

// ============================================================================
// Helper Functions
// ============================================================================

function compareGameStates(original: GameState, deserialized: GameState): boolean {
  // Compare basic properties
  if (original.activePlayer !== deserialized.activePlayer) return false;
  if (original.phase !== deserialized.phase) return false;
  if (original.turnNumber !== deserialized.turnNumber) return false;
  if (original.gameOver !== deserialized.gameOver) return false;
  if (original.winner !== deserialized.winner) return false;
  
  // Compare players
  if (original.players.size !== deserialized.players.size) return false;
  
  for (const [playerId, originalPlayer] of original.players) {
    const deserializedPlayer = deserialized.players.get(playerId);
    if (!deserializedPlayer) return false;
    
    if (!comparePlayerStates(originalPlayer, deserializedPlayer)) return false;
  }
  
  // Compare attacked this turn
  if (original.attackedThisTurn.size !== deserialized.attackedThisTurn.size) {
    return false;
  }
  for (const id of original.attackedThisTurn) {
    if (!deserialized.attackedThisTurn.has(id)) return false;
  }
  
  return true;
}

function comparePlayerStates(
  original: PlayerState,
  deserialized: PlayerState
): boolean {
  if (original.id !== deserialized.id) return false;
  
  // Compare zones
  const zones = [
    'deck',
    'hand',
    'trash',
    'life',
    'characterArea',
    'banished',
  ] as const;
  
  for (const zone of zones) {
    const origZone = original.zones[zone] as CardInstance[];
    const deserZone = deserialized.zones[zone] as CardInstance[];
    
    if (origZone.length !== deserZone.length) return false;
    
    for (let i = 0; i < origZone.length; i++) {
      if (!compareCardInstances(origZone[i], deserZone[i])) return false;
    }
  }
  
  // Compare leader
  if (original.zones.leaderArea && deserialized.zones.leaderArea) {
    if (
      !compareCardInstances(
        original.zones.leaderArea,
        deserialized.zones.leaderArea
      )
    ) {
      return false;
    }
  } else if (original.zones.leaderArea || deserialized.zones.leaderArea) {
    return false;
  }
  
  // Compare stage
  if (original.zones.stageArea && deserialized.zones.stageArea) {
    if (
      !compareCardInstances(original.zones.stageArea, deserialized.zones.stageArea)
    ) {
      return false;
    }
  } else if (original.zones.stageArea || deserialized.zones.stageArea) {
    return false;
  }
  
  // Compare DON zones
  if (original.zones.donDeck.length !== deserialized.zones.donDeck.length) {
    return false;
  }
  if (original.zones.costArea.length !== deserialized.zones.costArea.length) {
    return false;
  }
  
  return true;
}

function compareCardInstances(
  original: CardInstance,
  deserialized: CardInstance
): boolean {
  if (original.id !== deserialized.id) return false;
  if (original.definition.id !== deserialized.definition.id) return false;
  if (original.owner !== deserialized.owner) return false;
  if (original.controller !== deserialized.controller) return false;
  if (original.zone !== deserialized.zone) return false;
  if (original.state !== deserialized.state) return false;
  
  // Compare modifiers
  if (original.modifiers.length !== deserialized.modifiers.length) return false;
  for (let i = 0; i < original.modifiers.length; i++) {
    const origMod = original.modifiers[i];
    const deserMod = deserialized.modifiers[i];
    
    if (origMod.id !== deserMod.id) return false;
    if (origMod.type !== deserMod.type) return false;
    if (origMod.value !== deserMod.value) return false;
    if (origMod.duration !== deserMod.duration) return false;
    if (origMod.source !== deserMod.source) return false;
  }
  
  // Compare given DON
  if (original.givenDon.length !== deserialized.givenDon.length) return false;
  
  return true;
}

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('GameStateSerialization - Round Trip Property', () => {
  it('Property 54: serializing and deserializing should produce equivalent state', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        // Serialize the state
        const serialized = serializeGameState(originalState);
        
        // Deserialize the state
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: The deserialized state should be equivalent to the original
        expect(compareGameStates(originalState, deserialized)).toBe(true);
        
        // Additional checks
        expect(deserialized.activePlayer).toBe(originalState.activePlayer);
        expect(deserialized.phase).toBe(originalState.phase);
        expect(deserialized.turnNumber).toBe(originalState.turnNumber);
        expect(deserialized.gameOver).toBe(originalState.gameOver);
        expect(deserialized.winner).toBe(originalState.winner);
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 54: JSON string round trip should preserve state', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        // Convert to JSON string
        const json = gameStateToJSON(originalState);
        
        // Parse back from JSON
        const deserialized = gameStateFromJSON(json, cardDefinitionLookup);
        
        // Property: The deserialized state should be equivalent to the original
        expect(compareGameStates(originalState, deserialized)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 54: multiple round trips should be stable', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        // First round trip
        const serialized1 = serializeGameState(originalState);
        const deserialized1 = deserializeGameState(serialized1, cardDefinitionLookup);
        
        // Second round trip
        const serialized2 = serializeGameState(deserialized1);
        const deserialized2 = deserializeGameState(serialized2, cardDefinitionLookup);
        
        // Property: Multiple round trips should produce the same result
        expect(compareGameStates(deserialized1, deserialized2)).toBe(true);
      }),
      { numRuns: 50 }
    );
  });
});
