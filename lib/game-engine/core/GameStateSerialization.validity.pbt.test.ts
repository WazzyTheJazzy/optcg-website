/**
 * Property-Based Test: Deserialized State Validity
 * 
 * Feature: ai-battle-integration, Property 55: Deserialized State Validity
 * Validates: Requirements 38.3
 * 
 * Property: For any deserialized game state, it should satisfy all game state
 * invariants (valid zones, valid card states, etc.).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  serializeGameState,
  deserializeGameState,
  validateGameState,
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
// Reuse arbitraries from round trip test
// ============================================================================

const playerIdArb = fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2);
const phaseArb = fc.constantFrom(
  Phase.REFRESH,
  Phase.DRAW,
  Phase.DON_PHASE,
  Phase.MAIN,
  Phase.END
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

// Test card definitions
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

// Card definition lookup
const cardDefinitions = new Map<string, CardDefinition>([
  ['test-leader', testLeaderDef],
  ['test-character', testCharacterDef],
]);

function cardDefinitionLookup(cardId: string): CardDefinition | undefined {
  return cardDefinitions.get(cardId);
}

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('GameStateSerialization - Validity Property', () => {
  it('Property 55: deserialized state should be valid', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        // Serialize and deserialize
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Validate the deserialized state
        const validation = validateGameState(deserialized);
        
        // Property: The deserialized state should be valid
        if (!validation.valid) {
          console.error('Validation errors:', validation.errors);
        }
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: deserialized state should have exactly 2 players', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: Should have exactly 2 players
        expect(deserialized.players.size).toBe(2);
        expect(deserialized.players.has(PlayerId.PLAYER_1)).toBe(true);
        expect(deserialized.players.has(PlayerId.PLAYER_2)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: deserialized state should have valid active player', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: Active player should exist in players map
        expect(deserialized.players.has(deserialized.activePlayer)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: each player should have a leader', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: Each player should have a leader
        deserialized.players.forEach((playerState, playerId) => {
          expect(playerState.zones.leaderArea).not.toBeNull();
          expect(playerState.zones.leaderArea?.definition.category).toBe(
            CardCategory.LEADER
          );
        });
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: character area should not exceed 5 cards', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: Character area should have at most 5 cards
        deserialized.players.forEach((playerState, playerId) => {
          expect(playerState.zones.characterArea.length).toBeLessThanOrEqual(5);
        });
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: all cards should have correct owner', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: All cards in a player's zones should be owned by that player
        deserialized.players.forEach((playerState, playerId) => {
          const allCards = [
            ...playerState.zones.deck,
            ...playerState.zones.hand,
            ...playerState.zones.trash,
            ...playerState.zones.life,
            ...playerState.zones.characterArea,
            ...playerState.zones.banished,
          ];
          
          if (playerState.zones.leaderArea) {
            allCards.push(playerState.zones.leaderArea);
          }
          
          if (playerState.zones.stageArea) {
            allCards.push(playerState.zones.stageArea);
          }
          
          allCards.forEach((card) => {
            expect(card.owner).toBe(playerId);
          });
        });
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: all cards should have correct zone property', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: Each card's zone property should match its actual location
        deserialized.players.forEach((playerState, playerId) => {
          playerState.zones.deck.forEach((card) => {
            expect(card.zone).toBe(ZoneId.DECK);
          });
          
          playerState.zones.hand.forEach((card) => {
            expect(card.zone).toBe(ZoneId.HAND);
          });
          
          playerState.zones.trash.forEach((card) => {
            expect(card.zone).toBe(ZoneId.TRASH);
          });
          
          playerState.zones.life.forEach((card) => {
            expect(card.zone).toBe(ZoneId.LIFE);
          });
          
          playerState.zones.characterArea.forEach((card) => {
            expect(card.zone).toBe(ZoneId.CHARACTER_AREA);
          });
          
          playerState.zones.banished.forEach((card) => {
            expect(card.zone).toBe(ZoneId.BANISHED);
          });
          
          if (playerState.zones.leaderArea) {
            expect(playerState.zones.leaderArea.zone).toBe(ZoneId.LEADER_AREA);
          }
          
          if (playerState.zones.stageArea) {
            expect(playerState.zones.stageArea.zone).toBe(ZoneId.STAGE_AREA);
          }
        });
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: turn number should be positive', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: Turn number should be at least 1
        expect(deserialized.turnNumber).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: game over state should be consistent with winner', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: If game is over, winner may be set; if not over, winner should be null
        if (!deserialized.gameOver) {
          expect(deserialized.winner).toBeNull();
        }
        // Note: If game is over, winner may or may not be set (could be a draw)
      }),
      { numRuns: 100 }
    );
  });
  
  it('Property 55: card modifiers should be preserved', () => {
    fc.assert(
      fc.property(gameStateArb, (originalState) => {
        const serialized = serializeGameState(originalState);
        const deserialized = deserializeGameState(serialized, cardDefinitionLookup);
        
        // Property: All card modifiers should be preserved
        deserialized.players.forEach((playerState) => {
          const allCards = [
            ...playerState.zones.deck,
            ...playerState.zones.hand,
            ...playerState.zones.characterArea,
          ];
          
          allCards.forEach((card) => {
            card.modifiers.forEach((modifier) => {
              expect(modifier.id).toBeDefined();
              expect(modifier.type).toBeDefined();
              expect(modifier.duration).toBeDefined();
              expect(modifier.source).toBeDefined();
            });
          });
        });
      }),
      { numRuns: 100 }
    );
  });
});
