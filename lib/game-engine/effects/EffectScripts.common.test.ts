/**
 * Tests for common effect scripts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { DamageCalculator } from '../battle/DamageCalculator';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  EffectScriptRegistry,
  EffectScriptExecutor,
  registerCommonEffectScripts,
} from './EffectScripts';
import {
  CardDefinition,
  CardInstance,
  CardCategory,
  PlayerId,
  ZoneId,
  CardState,
  ModifierDuration,
  TargetType,
  EffectContext,
  GameEvent,
  GameEventType,
} from '../core/types';

describe('Common Effect Scripts', () => {
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;
  let damageCalculator: DamageCalculator;
  let eventEmitter: EventEmitter;
  let registry: EffectScriptRegistry;
  let executor: EffectScriptExecutor;

  // Helper to create test card
  const createTestCard = (overrides: Partial<CardDefinition> = {}): CardDefinition => ({
    id: `card_${Date.now()}_${Math.random()}`,
    name: 'Test Card',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: 4,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
    ...overrides,
  });

  // Helper to create a test card instance
  const createTestCardInstance = (
    id: string,
    owner: PlayerId,
    zone: ZoneId,
    overrides: Partial<CardDefinition> = {}
  ): CardInstance => {
    const definition = createTestCard(overrides);
    return {
      id,
      definition,
      owner,
      controller: owner,
      zone,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  beforeEach(() => {
    // Initialize state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    damageCalculator = new DamageCalculator();
    registry = new EffectScriptRegistry();
    executor = new EffectScriptExecutor(
      stateManager,
      zoneManager,
      damageCalculator,
      eventEmitter,
      registry
    );

    // Add some cards to player 1's deck for testing
    for (let i = 0; i < 10; i++) {
      const card = createTestCardInstance(`deck_card_${i}`, PlayerId.PLAYER_1, ZoneId.DECK, {
        name: `Deck Card ${i}`,
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.DECK);
      executor.updateStateManager(stateManager);
    }

    // Register common scripts
    registerCommonEffectScripts(registry);
  });

  describe('Draw Effects', () => {
    it('should draw 1 card with draw_1 script', () => {
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;
      const handSizeBefore = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('draw_1', context);

      const updatedState = executor.getStateManager();
      const handSizeAfter = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;
      expect(handSizeAfter).toBe(handSizeBefore + 1);
    });

    it('should draw 2 cards with draw_2 script', () => {
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;
      const handSizeBefore = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('draw_2', context);

      const updatedState = executor.getStateManager();
      const handSizeAfter = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;
      expect(handSizeAfter).toBe(handSizeBefore + 2);
    });

    it('should draw 3 cards with draw_3 script', () => {
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;
      const handSizeBefore = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('draw_3', context);

      const updatedState = executor.getStateManager();
      const handSizeAfter = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;
      expect(handSizeAfter).toBe(handSizeBefore + 3);
    });
  });

  describe('Power Boost Effects', () => {
    it('should boost power permanently with power_boost_2000 script', () => {
      const card = createTestCardInstance('char1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, {
        basePower: 5000,
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('power_boost_2000', context);

      const updatedState = executor.getStateManager();
      const updatedCard = updatedState.getCard(targetCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].value).toBe(2000);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should boost power until end of turn with power_boost_2000_until_end_of_turn script', () => {
      const card = createTestCardInstance('char1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, {
        basePower: 5000,
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('power_boost_2000_until_end_of_turn', context);

      const updatedState = executor.getStateManager();
      const updatedCard = updatedState.getCard(targetCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].value).toBe(2000);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);
    });

    it('should boost power during battle with when_attacking_power_boost_2000 script', () => {
      const card = createTestCardInstance('char1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, {
        basePower: 5000,
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA)[0] as CardInstance;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('when_attacking_power_boost_2000', context);

      const updatedState = executor.getStateManager();
      const updatedCard = updatedState.getCard(sourceCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].value).toBe(2000);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_BATTLE);
    });
  });

  describe('Cost Reduction Effects', () => {
    it('should reduce cost with cost_reduction_2 script', () => {
      const card = createTestCardInstance('card1', PlayerId.PLAYER_1, ZoneId.HAND, {
        baseCost: 5,
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.HAND);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('cost_reduction_2', context);

      const updatedState = executor.getStateManager();
      const updatedCard = updatedState.getCard(targetCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.modifiers.length).toBe(1);
      expect(updatedCard!.modifiers[0].value).toBe(-2);
      expect(updatedCard!.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);
    });
  });

  describe('Search Effects', () => {
    it('should search deck for character with search_deck_character script', () => {
      const card = createTestCardInstance('char_search', PlayerId.PLAYER_1, ZoneId.DECK, {
        category: CardCategory.CHARACTER,
        name: 'Character',
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.DECK);
      executor.updateStateManager(stateManager);

      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;
      const handSizeBefore = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('search_deck_character', context);

      const updatedState = executor.getStateManager();
      const handSizeAfter = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;
      expect(handSizeAfter).toBe(handSizeBefore + 1);

      // Verify it's a character card
      const addedCard = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).find(
        c => (c as CardInstance).definition.category === CardCategory.CHARACTER
      );
      expect(addedCard).toBeDefined();
    });

    it('should search deck for event with search_deck_event script', () => {
      const card = createTestCardInstance('event_search', PlayerId.PLAYER_1, ZoneId.DECK, {
        category: CardCategory.EVENT,
        name: 'Event',
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.DECK);
      executor.updateStateManager(stateManager);

      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;
      const handSizeBefore = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('search_deck_event', context);

      const updatedState = executor.getStateManager();
      const handSizeAfter = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;
      expect(handSizeAfter).toBe(handSizeBefore + 1);

      // Verify it's an event card
      const addedCard = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).find(
        c => (c as CardInstance).definition.category === CardCategory.EVENT
      );
      expect(addedCard).toBeDefined();
    });

    it('should search deck by cost with search_deck_cost_4_or_less script', () => {
      const card = createTestCardInstance('low_cost', PlayerId.PLAYER_1, ZoneId.DECK, {
        baseCost: 3,
        name: 'Low Cost',
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.DECK);
      executor.updateStateManager(stateManager);

      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;
      const handSizeBefore = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('search_deck_cost_4_or_less', context);

      const updatedState = executor.getStateManager();
      const handSizeAfter = updatedState.getZone(PlayerId.PLAYER_1, ZoneId.HAND).length;
      expect(handSizeAfter).toBe(handSizeBefore + 1);
    });
  });

  describe('Rest/Activate Effects', () => {
    it('should rest target character with rest_target_character script', () => {
      const card = createTestCardInstance('char1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      card.state = CardState.ACTIVE;
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('rest_target_character', context);

      const updatedState = executor.getStateManager();
      const updatedCard = updatedState.getCard(targetCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.state).toBe(CardState.RESTED);
    });

    it('should activate target character with activate_target_character script', () => {
      const card = createTestCardInstance('char1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      card.state = CardState.RESTED;
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('activate_target_character', context);

      const updatedState = executor.getStateManager();
      const updatedCard = updatedState.getCard(targetCard.id);
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.state).toBe(CardState.ACTIVE);
    });
  });

  describe('K.O. Effects', () => {
    it('should K.O. target character with ko_target_character script', () => {
      const card = createTestCardInstance('char1', PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_2, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const characterAreaBefore = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA).length;
      const trashBefore = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.TRASH).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('ko_target_character', context);

      const updatedState = executor.getStateManager();
      const characterAreaAfter = updatedState.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA).length;
      const trashAfter = updatedState.getZone(PlayerId.PLAYER_2, ZoneId.TRASH).length;

      // Card should be moved from character area to trash
      expect(characterAreaAfter).toBe(characterAreaBefore - 1);
      expect(trashAfter).toBe(trashBefore + 1);

      // Verify the card is in trash
      const koedCard = updatedState.getCard(targetCard.id);
      expect(koedCard).toBeDefined();
      expect(koedCard!.zone).toBe(ZoneId.TRASH);
    });

    it('should K.O. rested character with ko_rested_character script', () => {
      // Add a rested character (should be K.O.'d)
      const restedCard = createTestCardInstance('rested', PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);
      restedCard.state = CardState.RESTED;
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_2, restedCard, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const characterAreaBefore = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA).length;
      const trashBefore = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.TRASH).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('ko_rested_character', context);

      const updatedState = executor.getStateManager();
      const characterAreaAfter = updatedState.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA).length;
      const trashAfter = updatedState.getZone(PlayerId.PLAYER_2, ZoneId.TRASH).length;

      // Card should be moved from character area to trash
      expect(characterAreaAfter).toBe(characterAreaBefore - 1);
      expect(trashAfter).toBe(trashBefore + 1);
      
      // Rested card should be in trash
      const koedCard = updatedState.getCard(targetCard.id);
      expect(koedCard).toBeDefined();
      expect(koedCard!.zone).toBe(ZoneId.TRASH);
    });

    it('should K.O. character with cost 3 or less with ko_cost_3_or_less script', () => {
      // Add a low cost character (should be K.O.'d)
      const lowCostCard = createTestCardInstance('low', PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA, {
        baseCost: 2,
      });
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_2, lowCostCard, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      const targetCard = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA)[0] as CardInstance;
      const sourceCard = stateManager.getZone(PlayerId.PLAYER_1, ZoneId.DECK)[0] as CardInstance;

      const characterAreaBefore = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA).length;
      const trashBefore = stateManager.getZone(PlayerId.PLAYER_2, ZoneId.TRASH).length;

      const context: EffectContext = {
        state: stateManager.getState(),
        source: sourceCard,
        controller: PlayerId.PLAYER_1,
        targets: [{ type: TargetType.CARD, cardId: targetCard.id }],
        values: new Map(),
        event: null,
      };

      executor.executeScript('ko_cost_3_or_less', context);

      const updatedState = executor.getStateManager();
      const characterAreaAfter = updatedState.getZone(PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA).length;
      const trashAfter = updatedState.getZone(PlayerId.PLAYER_2, ZoneId.TRASH).length;

      // Card should be moved from character area to trash
      expect(characterAreaAfter).toBe(characterAreaBefore - 1);
      expect(trashAfter).toBe(trashBefore + 1);
      
      // Low cost card should be in trash
      const koedCard = updatedState.getCard(targetCard.id);
      expect(koedCard).toBeDefined();
      expect(koedCard!.zone).toBe(ZoneId.TRASH);
    });
  });

  describe('Script Registration', () => {
    it('should register all common scripts', () => {
      const scriptIds = registry.getAllScriptIds();
      
      // Verify key scripts are registered
      expect(scriptIds).toContain('draw_1');
      expect(scriptIds).toContain('draw_2');
      expect(scriptIds).toContain('power_boost_2000');
      expect(scriptIds).toContain('search_deck_character');
      expect(scriptIds).toContain('ko_target_character');
      expect(scriptIds).toContain('rest_target_character');
      
      // Should have a reasonable number of scripts
      expect(scriptIds.length).toBeGreaterThan(20);
    });

    it('should have unique script IDs', () => {
      const scriptIds = registry.getAllScriptIds();
      const uniqueIds = new Set(scriptIds);
      expect(uniqueIds.size).toBe(scriptIds.length);
    });
  });
});
