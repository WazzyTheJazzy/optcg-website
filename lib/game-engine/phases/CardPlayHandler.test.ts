/**
 * CardPlayHandler.test.ts
 * 
 * Tests for the card playing system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handlePlayCard, CardPlayError } from './CardPlayHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  CardDefinition,
  CardInstance,
  DonInstance,
  EffectTimingType,
  TriggerTiming,
} from '../core/types';

describe('CardPlayHandler', () => {
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;
  let eventEmitter: EventEmitter;

  // Helper to create a test card definition
  function createTestCardDef(
    category: CardCategory,
    cost: number,
    hasOnPlay: boolean = false
  ): CardDefinition {
    return {
      id: `test-${category}-${cost}`,
      name: `Test ${category}`,
      category,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: category === CardCategory.CHARACTER ? 5000 : null,
      baseCost: cost,
      lifeValue: null,
      counterValue: null,
      rarity: 'C',
      keywords: [],
      effects: hasOnPlay
        ? [
            {
              id: 'on-play-1',
              label: '[On Play]',
              timingType: EffectTimingType.AUTO,
              triggerTiming: TriggerTiming.ON_PLAY,
              condition: null,
              cost: null,
              scriptId: 'draw-1',
              oncePerTurn: false,
            },
          ]
        : [],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };
  }

  // Helper to create a card instance
  function createCardInstance(
    definition: CardDefinition,
    owner: PlayerId,
    zone: ZoneId
  ): CardInstance {
    return {
      id: `card-${Math.random()}`,
      definition,
      owner,
      controller: owner,
      zone,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  // Helper to create DON instances
  function createDonInstances(owner: PlayerId, count: number, state: CardState): DonInstance[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `don-${owner}-${i}`,
      owner,
      zone: ZoneId.COST_AREA,
      state,
    }));
  }

  beforeEach(() => {
    // Create initial state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);

    // Set up player 1 with some DON in cost area
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    const activeDon = createDonInstances(PlayerId.PLAYER_1, 5, CardState.ACTIVE);
    stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
      zones: {
        ...player1.zones,
        costArea: activeDon,
      },
    });
  });

  describe('Playing Character Cards', () => {
    it('should successfully play a character card from hand', () => {
      // Create a character card in hand
      const characterDef = createTestCardDef(CardCategory.CHARACTER, 3);
      const character = createCardInstance(characterDef, PlayerId.PLAYER_1, ZoneId.HAND);

      // Add card to hand
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          hand: [character],
        },
      });

      // Update zone manager
      zoneManager.updateStateManager(stateManager);

      // Play the card
      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        character.id
      );

      // Verify success
      expect(result.success).toBe(true);

      // Verify card moved to character area
      const updatedCard = result.newState.getCard(character.id);
      expect(updatedCard?.zone).toBe(ZoneId.CHARACTER_AREA);
      expect(updatedCard?.state).toBe(CardState.ACTIVE);

      // Verify DON were rested
      const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1)!;
      const restedDon = updatedPlayer.zones.costArea.filter(
        don => don.state === CardState.RESTED
      );
      expect(restedDon.length).toBe(3);
    });

    it('should fail if character area is full', () => {
      // Fill character area with 5 characters
      const characters = Array.from({ length: 5 }, (_, i) => {
        const def = createTestCardDef(CardCategory.CHARACTER, 1);
        return createCardInstance(def, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      });

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: characters,
        },
      });

      // Try to play another character
      const newCharacterDef = createTestCardDef(CardCategory.CHARACTER, 1);
      const newCharacter = createCardInstance(newCharacterDef, PlayerId.PLAYER_1, ZoneId.HAND);

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...stateManager.getPlayer(PlayerId.PLAYER_1)!.zones,
          hand: [newCharacter],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        newCharacter.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Character area is full');
    });

    it('should trigger On Play effects', () => {
      // Create a character with On Play effect
      const characterDef = createTestCardDef(CardCategory.CHARACTER, 2, true);
      const character = createCardInstance(characterDef, PlayerId.PLAYER_1, ZoneId.HAND);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          hand: [character],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        character.id
      );

      expect(result.success).toBe(true);

      // Verify trigger was enqueued
      const state = result.newState.getState();
      expect(state.pendingTriggers.length).toBe(1);
      expect(state.pendingTriggers[0].effectDefinition.label).toBe('[On Play]');
    });
  });

  describe('Playing Stage Cards', () => {
    it('should successfully play a stage card', () => {
      const stageDef = createTestCardDef(CardCategory.STAGE, 2);
      const stage = createCardInstance(stageDef, PlayerId.PLAYER_1, ZoneId.HAND);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          hand: [stage],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        stage.id
      );

      expect(result.success).toBe(true);

      // Verify card moved to stage area
      const updatedCard = result.newState.getCard(stage.id);
      expect(updatedCard?.zone).toBe(ZoneId.STAGE_AREA);
      expect(updatedCard?.state).toBe(CardState.ACTIVE);
    });

    it('should trash existing stage when playing a new one', () => {
      // Create existing stage
      const existingStageDef = createTestCardDef(CardCategory.STAGE, 1);
      const existingStage = createCardInstance(existingStageDef, PlayerId.PLAYER_1, ZoneId.STAGE_AREA);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          stageArea: existingStage,
        },
      });

      // Create new stage in hand
      const newStageDef = createTestCardDef(CardCategory.STAGE, 2);
      const newStage = createCardInstance(newStageDef, PlayerId.PLAYER_1, ZoneId.HAND);

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...stateManager.getPlayer(PlayerId.PLAYER_1)!.zones,
          hand: [newStage],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        newStage.id
      );

      expect(result.success).toBe(true);

      // Verify old stage is in trash
      const oldStage = result.newState.getCard(existingStage.id);
      expect(oldStage?.zone).toBe(ZoneId.TRASH);

      // Verify new stage is in stage area
      const updatedNewStage = result.newState.getCard(newStage.id);
      expect(updatedNewStage?.zone).toBe(ZoneId.STAGE_AREA);
    });
  });

  describe('Playing Event Cards', () => {
    it('should play event and move to trash', () => {
      const eventDef = createTestCardDef(CardCategory.EVENT, 1);
      const event = createCardInstance(eventDef, PlayerId.PLAYER_1, ZoneId.HAND);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          hand: [event],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        event.id
      );

      expect(result.success).toBe(true);

      // Verify event is in trash
      const updatedEvent = result.newState.getCard(event.id);
      expect(updatedEvent?.zone).toBe(ZoneId.TRASH);
    });
  });

  describe('Cost Payment', () => {
    it('should fail if player cannot afford cost', () => {
      // Create expensive card
      const expensiveCardDef = createTestCardDef(CardCategory.CHARACTER, 10);
      const expensiveCard = createCardInstance(expensiveCardDef, PlayerId.PLAYER_1, ZoneId.HAND);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          hand: [expensiveCard],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        expensiveCard.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot afford cost');
    });

    it('should only rest active DON when paying cost', () => {
      // Set up mixed DON (some active, some rested)
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const mixedDon = [
        ...createDonInstances(PlayerId.PLAYER_1, 3, CardState.ACTIVE),
        ...createDonInstances(PlayerId.PLAYER_1, 2, CardState.RESTED),
      ];

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          costArea: mixedDon,
        },
      });

      // Play a 2-cost card
      const cardDef = createTestCardDef(CardCategory.CHARACTER, 2);
      const card = createCardInstance(cardDef, PlayerId.PLAYER_1, ZoneId.HAND);

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...stateManager.getPlayer(PlayerId.PLAYER_1)!.zones,
          hand: [card],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        card.id
      );

      expect(result.success).toBe(true);

      // Verify 2 more DON are rested (total 4 rested)
      const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1)!;
      const restedDon = updatedPlayer.zones.costArea.filter(
        don => don.state === CardState.RESTED
      );
      expect(restedDon.length).toBe(4);
    });
  });

  describe('Validation', () => {
    it('should fail if card is not in hand', () => {
      const cardDef = createTestCardDef(CardCategory.CHARACTER, 1);
      const card = createCardInstance(cardDef, PlayerId.PLAYER_1, ZoneId.DECK);

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          deck: [card],
        },
      });

      zoneManager.updateStateManager(stateManager);

      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        card.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in hand');
    });

    it('should fail if card does not exist', () => {
      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'non-existent-card'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if player does not own the card', () => {
      // Create card owned by player 2
      const cardDef = createTestCardDef(CardCategory.CHARACTER, 1);
      const card = createCardInstance(cardDef, PlayerId.PLAYER_2, ZoneId.HAND);

      const player2 = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
        zones: {
          ...player2.zones,
          hand: [card],
        },
      });

      zoneManager.updateStateManager(stateManager);

      // Try to play with player 1
      const result = handlePlayCard(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        card.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not owned by player');
    });
  });
});
