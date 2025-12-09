/**
 * Unit tests for Game State Serialization
 */

import { describe, it, expect } from 'vitest';
import {
  serializeGameState,
  deserializeGameState,
  validateGameState,
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
  PlayerState,
  CardInstance,
  CardDefinition,
} from './types';

describe('GameStateSerialization', () => {
  // Create test card definitions
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

  const cardDefinitions = new Map<string, CardDefinition>([
    ['test-leader', testLeaderDef],
    ['test-character', testCharacterDef],
  ]);

  function cardDefinitionLookup(cardId: string): CardDefinition | undefined {
    return cardDefinitions.get(cardId);
  }

  function createTestGameState(): GameState {
    const player1Leader: CardInstance = {
      id: 'leader-1',
      definition: testLeaderDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.LEADER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    const player2Leader: CardInstance = {
      id: 'leader-2',
      definition: testLeaderDef,
      owner: PlayerId.PLAYER_2,
      controller: PlayerId.PLAYER_2,
      zone: ZoneId.LEADER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    const player1: PlayerState = {
      id: PlayerId.PLAYER_1,
      zones: {
        deck: [],
        hand: [],
        trash: [],
        life: [],
        donDeck: [],
        costArea: [],
        leaderArea: player1Leader,
        characterArea: [],
        stageArea: null,
        banished: [],
      },
      flags: new Map(),
    };

    const player2: PlayerState = {
      id: PlayerId.PLAYER_2,
      zones: {
        deck: [],
        hand: [],
        trash: [],
        life: [],
        donDeck: [],
        costArea: [],
        leaderArea: player2Leader,
        characterArea: [],
        stageArea: null,
        banished: [],
      },
      flags: new Map(),
    };

    const players = new Map<PlayerId, PlayerState>();
    players.set(PlayerId.PLAYER_1, player1);
    players.set(PlayerId.PLAYER_2, player2);

    return {
      players,
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
      attackedThisTurn: new Set(),
    };
  }

  describe('serializeGameState', () => {
    it('should serialize a game state to a serializable object', () => {
      const state = createTestGameState();
      const serialized = serializeGameState(state);

      expect(serialized.version).toBe('1.0.0');
      expect(serialized.activePlayer).toBe(PlayerId.PLAYER_1);
      expect(serialized.phase).toBe(Phase.MAIN);
      expect(serialized.turnNumber).toBe(1);
      expect(serialized.gameOver).toBe(false);
      expect(serialized.winner).toBeNull();
      expect(serialized.players).toBeDefined();
      expect(Object.keys(serialized.players)).toHaveLength(2);
    });

    it('should serialize player zones correctly', () => {
      const state = createTestGameState();
      const serialized = serializeGameState(state);

      const player1 = serialized.players[PlayerId.PLAYER_1];
      expect(player1).toBeDefined();
      expect(player1.zones.leaderArea).not.toBeNull();
      expect(player1.zones.leaderArea?.definitionId).toBe('test-leader');
      expect(player1.zones.deck).toEqual([]);
      expect(player1.zones.hand).toEqual([]);
    });
  });

  describe('deserializeGameState', () => {
    it('should deserialize a serialized game state', () => {
      const originalState = createTestGameState();
      const serialized = serializeGameState(originalState);
      const deserialized = deserializeGameState(serialized, cardDefinitionLookup);

      expect(deserialized.activePlayer).toBe(originalState.activePlayer);
      expect(deserialized.phase).toBe(originalState.phase);
      expect(deserialized.turnNumber).toBe(originalState.turnNumber);
      expect(deserialized.gameOver).toBe(originalState.gameOver);
      expect(deserialized.winner).toBe(originalState.winner);
      expect(deserialized.players.size).toBe(2);
    });

    it('should restore card definitions correctly', () => {
      const originalState = createTestGameState();
      const serialized = serializeGameState(originalState);
      const deserialized = deserializeGameState(serialized, cardDefinitionLookup);

      const player1 = deserialized.players.get(PlayerId.PLAYER_1);
      expect(player1).toBeDefined();
      expect(player1!.zones.leaderArea).not.toBeNull();
      expect(player1!.zones.leaderArea!.definition.id).toBe('test-leader');
      expect(player1!.zones.leaderArea!.definition.name).toBe('Test Leader');
    });

    it('should throw error for unsupported version', () => {
      const originalState = createTestGameState();
      const serialized = serializeGameState(originalState);
      serialized.version = '999.0.0';

      expect(() => {
        deserializeGameState(serialized, cardDefinitionLookup);
      }).toThrow('Unsupported serialization version');
    });

    it('should throw error for missing card definition', () => {
      const originalState = createTestGameState();
      const serialized = serializeGameState(originalState);
      
      // Use a lookup that doesn't have the card
      const emptyLookup = () => undefined;

      expect(() => {
        deserializeGameState(serialized, emptyLookup);
      }).toThrow('Card definition not found');
    });
  });

  describe('validateGameState', () => {
    it('should validate a valid game state', () => {
      const state = createTestGameState();
      const validation = validateGameState(state);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing players', () => {
      const state = createTestGameState();
      state.players.delete(PlayerId.PLAYER_2);

      const validation = validateGameState(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Expected 2 players, found 1');
    });

    it('should detect invalid active player', () => {
      const state = createTestGameState();
      state.players.delete(PlayerId.PLAYER_2);
      state.activePlayer = PlayerId.PLAYER_2;

      const validation = validateGameState(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Active player'))).toBe(true);
    });

    it('should detect missing leader', () => {
      const state = createTestGameState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      player1.zones.leaderArea = null;

      const validation = validateGameState(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('has no leader'))).toBe(true);
    });

    it('should detect too many characters', () => {
      const state = createTestGameState();
      const player1 = state.players.get(PlayerId.PLAYER_1)!;
      
      // Add 6 characters (exceeds max of 5)
      for (let i = 0; i < 6; i++) {
        player1.zones.characterArea.push({
          id: `char-${i}`,
          definition: testCharacterDef,
          owner: PlayerId.PLAYER_1,
          controller: PlayerId.PLAYER_1,
          zone: ZoneId.CHARACTER_AREA,
          state: CardState.ACTIVE,
          givenDon: [],
          modifiers: [],
          flags: new Map(),
        });
      }

      const validation = validateGameState(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('6 characters'))).toBe(true);
    });

    it('should detect invalid turn number', () => {
      const state = createTestGameState();
      state.turnNumber = 0;

      const validation = validateGameState(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid turn number'))).toBe(true);
    });
  });

  describe('gameStateToJSON and gameStateFromJSON', () => {
    it('should convert game state to JSON string and back', () => {
      const originalState = createTestGameState();
      const json = gameStateToJSON(originalState);

      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);

      const deserialized = gameStateFromJSON(json, cardDefinitionLookup);

      expect(deserialized.activePlayer).toBe(originalState.activePlayer);
      expect(deserialized.phase).toBe(originalState.phase);
      expect(deserialized.turnNumber).toBe(originalState.turnNumber);
    });

    it('should produce valid JSON', () => {
      const state = createTestGameState();
      const json = gameStateToJSON(state);

      // Should be parseable
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});
