/**
 * ModifierManager.test.ts
 * 
 * Tests for the ModifierManager class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModifierManager, ModifierError } from './ModifierManager';
import { GameStateManager } from '../core/GameState';
import {
  CardInstance,
  CardDefinition,
  CardCategory,
  CardState,
  ZoneId,
  PlayerId,
  ModifierType,
  ModifierDuration,
  Phase,
} from '../core/types';

describe('ModifierManager', () => {
  let stateManager: GameStateManager;
  let modifierManager: ModifierManager;
  let testCard: CardInstance;

  beforeEach(() => {
    // Create a test card definition
    const cardDef: CardDefinition = {
      id: 'test-card-def',
      name: 'Test Character',
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
    };

    // Create a test card instance
    testCard = {
      id: 'test-card-1',
      definition: cardDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    // Create initial game state
    const initialState = {
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
              characterArea: [testCard],
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

    stateManager = new GameStateManager(initialState);
    modifierManager = new ModifierManager(stateManager);
  });

  describe('addModifier', () => {
    it('should add a power modifier to a card', () => {
      const updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source-card'
      );

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].type).toBe(ModifierType.POWER);
      expect(updatedCard!.modifiers[0].value).toBe(2000);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
      expect(updatedCard!.modifiers[0].source).toBe('source-card');
    });

    it('should add a cost modifier to a card', () => {
      const updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.COST,
        -1,
        ModifierDuration.UNTIL_END_OF_TURN,
        'source-card'
      );

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].type).toBe(ModifierType.COST);
      expect(updatedCard!.modifiers[0].value).toBe(-1);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);
    });

    it('should add a keyword modifier to a card', () => {
      const updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.KEYWORD,
        'Rush',
        ModifierDuration.PERMANENT,
        'source-card'
      );

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].type).toBe(ModifierType.KEYWORD);
      expect(updatedCard!.modifiers[0].value).toBe('Rush');
    });

    it('should add multiple modifiers to a card', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_TURN,
        'source-1'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.UNTIL_END_OF_BATTLE,
        'source-2'
      );

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(2);
    });

    it('should throw error if card not found', () => {
      expect(() => {
        modifierManager.addModifier(
          'non-existent-card',
          ModifierType.POWER,
          1000,
          ModifierDuration.PERMANENT,
          'source'
        );
      }).toThrow(ModifierError);
    });

    it('should generate unique modifier IDs', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source'
      );

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers[0].id).not.toBe(updatedCard!.modifiers[1].id);
    });
  });

  describe('removeModifier', () => {
    it('should remove a specific modifier from a card', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'source'
      );

      const card = updatedManager.getCard(testCard.id);
      const modifierId = card!.modifiers[0].id;

      modifierManager.updateStateManager(updatedManager);
      updatedManager = modifierManager.removeModifier(testCard.id, modifierId);

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(0);
    });

    it('should only remove the specified modifier', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'source-1'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source-2'
      );

      const card = updatedManager.getCard(testCard.id);
      const firstModifierId = card!.modifiers[0].id;

      modifierManager.updateStateManager(updatedManager);
      updatedManager = modifierManager.removeModifier(testCard.id, firstModifierId);

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].value).toBe(2000);
    });

    it('should throw error if card not found', () => {
      expect(() => {
        modifierManager.removeModifier('non-existent-card', 'modifier-id');
      }).toThrow(ModifierError);
    });
  });

  describe('removeModifiersWhere', () => {
    it('should remove modifiers matching a filter', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_TURN,
        'source-1'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source-2'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.removeModifiersWhere(
        testCard.id,
        m => m.duration === ModifierDuration.UNTIL_END_OF_TURN
      );

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should remove multiple modifiers matching filter', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_TURN,
        'source-1'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.COST,
        -1,
        ModifierDuration.UNTIL_END_OF_TURN,
        'source-2'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source-3'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.removeModifiersWhere(
        testCard.id,
        m => m.duration === ModifierDuration.UNTIL_END_OF_TURN
      );

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });
  });

  describe('expireEndOfTurnModifiers', () => {
    it('should expire UNTIL_END_OF_TURN modifiers', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_TURN,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.expireEndOfTurnModifiers();

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should expire DURING_THIS_TURN modifiers', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.DURING_THIS_TURN,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.expireEndOfTurnModifiers();

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(0);
    });

    it('should not expire other duration modifiers', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_BATTLE,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.UNTIL_START_OF_NEXT_TURN,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.expireEndOfTurnModifiers();

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(2);
    });
  });

  describe('expireEndOfBattleModifiers', () => {
    it('should expire UNTIL_END_OF_BATTLE modifiers', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_BATTLE,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.expireEndOfBattleModifiers();

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should not expire other duration modifiers', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_TURN,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.expireEndOfBattleModifiers();

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(1);
    });
  });

  describe('expireStartOfTurnModifiers', () => {
    it('should expire UNTIL_START_OF_NEXT_TURN modifiers for the active player', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_START_OF_NEXT_TURN,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.expireStartOfTurnModifiers(PlayerId.PLAYER_1);

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should not expire modifiers on opponent cards', () => {
      // Create a card for player 2
      const player2Card: CardInstance = {
        ...testCard,
        id: 'player2-card',
        owner: PlayerId.PLAYER_2,
        controller: PlayerId.PLAYER_2,
      };

      // Add player 2 card to state
      const state = stateManager.getState();
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.characterArea.push(player2Card);
      stateManager = new GameStateManager(state);
      modifierManager = new ModifierManager(stateManager);

      // Add modifier to player 2 card
      let updatedManager = modifierManager.addModifier(
        player2Card.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_START_OF_NEXT_TURN,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      // Expire for player 1's turn start
      updatedManager = modifierManager.expireStartOfTurnModifiers(PlayerId.PLAYER_1);

      // Player 2's card should still have the modifier
      const updatedCard = updatedManager.getCard(player2Card.id);
      expect(updatedCard!.modifiers.length).toBe(1);
    });
  });

  describe('getModifiers', () => {
    it('should return all modifiers on a card', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'source-1'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.COST,
        -1,
        ModifierDuration.PERMANENT,
        'source-2'
      );

      modifierManager.updateStateManager(updatedManager);

      const modifiers = modifierManager.getModifiers(testCard.id);
      expect(modifiers.length).toBe(2);
    });

    it('should throw error if card not found', () => {
      expect(() => {
        modifierManager.getModifiers('non-existent-card');
      }).toThrow(ModifierError);
    });
  });

  describe('getModifiersByType', () => {
    it('should return only modifiers of specified type', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'source-1'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.COST,
        -1,
        ModifierDuration.PERMANENT,
        'source-2'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        2000,
        ModifierDuration.PERMANENT,
        'source-3'
      );

      modifierManager.updateStateManager(updatedManager);

      const powerModifiers = modifierManager.getModifiersByType(testCard.id, ModifierType.POWER);
      expect(powerModifiers.length).toBe(2);
      expect(powerModifiers.every(m => m.type === ModifierType.POWER)).toBe(true);
    });
  });

  describe('hasModifiers', () => {
    it('should return true if card has modifiers', () => {
      const updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'source'
      );

      modifierManager.updateStateManager(updatedManager);

      expect(modifierManager.hasModifiers(testCard.id)).toBe(true);
    });

    it('should return false if card has no modifiers', () => {
      expect(modifierManager.hasModifiers(testCard.id)).toBe(false);
    });
  });

  describe('clearModifiers', () => {
    it('should remove all modifiers from a card', () => {
      let updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'source-1'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.addModifier(
        testCard.id,
        ModifierType.COST,
        -1,
        ModifierDuration.PERMANENT,
        'source-2'
      );

      modifierManager.updateStateManager(updatedManager);

      updatedManager = modifierManager.clearModifiers(testCard.id);

      const updatedCard = updatedManager.getCard(testCard.id);
      expect(updatedCard!.modifiers.length).toBe(0);
    });

    it('should throw error if card not found', () => {
      expect(() => {
        modifierManager.clearModifiers('non-existent-card');
      }).toThrow(ModifierError);
    });
  });
});
