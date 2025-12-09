import { describe, it, expect } from 'vitest';
import { ValidationUtils } from './validation';
import { IllegalActionError, InvalidStateError, RulesViolationError, CardDataError } from './errors';
import { GameState, CardInstance, PlayerId, CardCategory } from '../core/types';

// Helper to create a minimal game state for testing
function createTestGameState(): GameState {
  return {
    players: new Map([
      [PlayerId.PLAYER_1, {
        id: PlayerId.PLAYER_1,
        zones: {
          deck: [],
          hand: [],
          trash: [],
          life: [],
          donDeck: [],
          costArea: [],
          leaderArea: null as any,
          characterArea: [],
          stageArea: null,
          banished: [],
        },
        flags: new Map(),
      }],
      [PlayerId.PLAYER_2, {
        id: PlayerId.PLAYER_2,
        zones: {
          deck: [],
          hand: [],
          trash: [],
          life: [],
          donDeck: [],
          costArea: [],
          leaderArea: null as any,
          characterArea: [],
          stageArea: null,
          banished: [],
        },
        flags: new Map(),
      }],
    ]),
    cards: new Map(),
    dons: new Map(),
    activePlayer: PlayerId.PLAYER_1,
    phase: 'MAIN' as any,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: { actionCount: 0, stateHashes: new Map(), maxRepeats: 4 },
    loopGuardHistory: new Map(),
  } as GameState;
}

// Helper to create a test card
function createTestCard(overrides: Partial<CardInstance> = {}): CardInstance {
  return {
    id: 'card-123',
    definition: {
      id: 'def-123',
      name: 'Test Card',
      category: 'CHARACTER' as CardCategory,
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
    zone: 'HAND' as any,
    state: 'ACTIVE' as any,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
    metadata: {
      isAltArt: false,
      isPromo: false,
      isLeader: false,
      rarity: 'C',
      colors: ['Red'],
    },
    ...overrides,
  } as CardInstance;
}

describe('ValidationUtils', () => {
  describe('validateCardExists', () => {
    it('should return card if it exists', () => {
      const state = createTestGameState();
      const card = createTestCard();
      // Add card to player's hand
      state.players.get(PlayerId.PLAYER_1)!.zones.hand.push(card);

      const result = ValidationUtils.validateCardExists(state, card.id);
      expect(result).toBe(card);
    });

    it('should throw CardDataError if card does not exist', () => {
      const state = createTestGameState();

      expect(() => {
        ValidationUtils.validateCardExists(state, 'nonexistent');
      }).toThrow(CardDataError);
    });
  });

  describe('validatePlayerExists', () => {
    it('should not throw if player exists', () => {
      const state = createTestGameState();

      expect(() => {
        ValidationUtils.validatePlayerExists(state, PlayerId.PLAYER_1);
      }).not.toThrow();
    });

    it('should throw InvalidStateError if player does not exist', () => {
      const state = createTestGameState();
      state.players.delete(PlayerId.PLAYER_1);

      expect(() => {
        ValidationUtils.validatePlayerExists(state, PlayerId.PLAYER_1);
      }).toThrow(InvalidStateError);
    });
  });

  describe('validateActivePlayer', () => {
    it('should not throw if player is active', () => {
      const state = createTestGameState();
      state.activePlayer = PlayerId.PLAYER_1;

      expect(() => {
        ValidationUtils.validateActivePlayer(state, PlayerId.PLAYER_1);
      }).not.toThrow();
    });

    it('should throw IllegalActionError if player is not active', () => {
      const state = createTestGameState();
      state.activePlayer = PlayerId.PLAYER_1;

      expect(() => {
        ValidationUtils.validateActivePlayer(state, PlayerId.PLAYER_2);
      }).toThrow(IllegalActionError);
    });
  });

  describe('validateCardInZone', () => {
    it('should not throw if card is in expected zone', () => {
      const card = createTestCard({ zone: 'HAND' as any });

      expect(() => {
        ValidationUtils.validateCardInZone(card, 'HAND' as any, 'test action');
      }).not.toThrow();
    });

    it('should throw IllegalActionError if card is not in expected zone', () => {
      const card = createTestCard({ zone: 'DECK' as any });

      expect(() => {
        ValidationUtils.validateCardInZone(card, 'HAND' as any, 'test action');
      }).toThrow(IllegalActionError);
    });
  });

  describe('validateCardOwner', () => {
    it('should not throw if card is owned by player', () => {
      const card = createTestCard({ owner: PlayerId.PLAYER_1 });

      expect(() => {
        ValidationUtils.validateCardOwner(card, PlayerId.PLAYER_1, 'test action');
      }).not.toThrow();
    });

    it('should throw IllegalActionError if card is not owned by player', () => {
      const card = createTestCard({ owner: PlayerId.PLAYER_2 });

      expect(() => {
        ValidationUtils.validateCardOwner(card, PlayerId.PLAYER_1, 'test action');
      }).toThrow(IllegalActionError);
    });
  });

  describe('validateCardController', () => {
    it('should not throw if card is controlled by player', () => {
      const card = createTestCard({ controller: PlayerId.PLAYER_1 });

      expect(() => {
        ValidationUtils.validateCardController(card, PlayerId.PLAYER_1, 'test action');
      }).not.toThrow();
    });

    it('should throw IllegalActionError if card is not controlled by player', () => {
      const card = createTestCard({ controller: PlayerId.PLAYER_2 });

      expect(() => {
        ValidationUtils.validateCardController(card, PlayerId.PLAYER_1, 'test action');
      }).toThrow(IllegalActionError);
    });
  });

  describe('validateCardCategory', () => {
    it('should not throw if card is of expected category', () => {
      const card = createTestCard();
      card.definition.category = 'CHARACTER' as CardCategory;

      expect(() => {
        ValidationUtils.validateCardCategory(card, 'CHARACTER' as CardCategory, 'test action');
      }).not.toThrow();
    });

    it('should throw IllegalActionError if card is not of expected category', () => {
      const card = createTestCard();
      card.definition.category = 'EVENT' as CardCategory;

      expect(() => {
        ValidationUtils.validateCardCategory(card, 'CHARACTER' as CardCategory, 'test action');
      }).toThrow(IllegalActionError);
    });
  });

  describe('validateGameNotOver', () => {
    it('should not throw if game is not over', () => {
      const state = createTestGameState();
      state.gameOver = false;

      expect(() => {
        ValidationUtils.validateGameNotOver(state);
      }).not.toThrow();
    });

    it('should throw IllegalActionError if game is over', () => {
      const state = createTestGameState();
      state.gameOver = true;
      state.winner = PlayerId.PLAYER_1;

      expect(() => {
        ValidationUtils.validateGameNotOver(state);
      }).toThrow(IllegalActionError);
    });
  });

  describe('validateCharacterAreaNotFull', () => {
    it('should not throw if character area is not full', () => {
      const state = createTestGameState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea = [createTestCard(), createTestCard()];

      expect(() => {
        ValidationUtils.validateCharacterAreaNotFull(state, PlayerId.PLAYER_1, 5);
      }).not.toThrow();
    });

    it('should throw RulesViolationError if character area is full', () => {
      const state = createTestGameState();
      const player = state.players.get(PlayerId.PLAYER_1)!;
      player.zones.characterArea = [
        createTestCard(),
        createTestCard(),
        createTestCard(),
        createTestCard(),
        createTestCard(),
      ];

      expect(() => {
        ValidationUtils.validateCharacterAreaNotFull(state, PlayerId.PLAYER_1, 5);
      }).toThrow(RulesViolationError);
    });
  });

  describe('validateNotEmpty', () => {
    it('should not throw if array is not empty', () => {
      expect(() => {
        ValidationUtils.validateNotEmpty([1, 2, 3], 'test array');
      }).not.toThrow();
    });

    it('should throw InvalidStateError if array is empty', () => {
      expect(() => {
        ValidationUtils.validateNotEmpty([], 'test array');
      }).toThrow(InvalidStateError);
    });
  });

  describe('validateRange', () => {
    it('should not throw if value is within range', () => {
      expect(() => {
        ValidationUtils.validateRange(5, 0, 10, 'test value');
      }).not.toThrow();
    });

    it('should throw InvalidStateError if value is below minimum', () => {
      expect(() => {
        ValidationUtils.validateRange(-1, 0, 10, 'test value');
      }).toThrow(InvalidStateError);
    });

    it('should throw InvalidStateError if value is above maximum', () => {
      expect(() => {
        ValidationUtils.validateRange(11, 0, 10, 'test value');
      }).toThrow(InvalidStateError);
    });
  });
});
