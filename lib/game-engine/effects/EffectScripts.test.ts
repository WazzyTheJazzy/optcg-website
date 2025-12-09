/**
 * EffectScripts.test.ts
 * 
 * Tests for the effect script execution system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EffectScriptRegistry,
  EffectScriptExecutor,
  EffectScript,
  EffectScriptContext,
} from './EffectScripts';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { DamageCalculator } from '../battle/DamageCalculator';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardCategory,
  CardState,
  ModifierDuration,
  CardInstance,
  CardDefinition,
  EffectContext,
} from '../core/types';

describe('EffectScriptRegistry', () => {
  let registry: EffectScriptRegistry;

  beforeEach(() => {
    registry = new EffectScriptRegistry();
  });

  it('should register a script', () => {
    const script: EffectScript = (ctx) => {};
    registry.register('test_script', script);

    expect(registry.has('test_script')).toBe(true);
    expect(registry.get('test_script')).toBe(script);
  });

  it('should throw error when registering duplicate script', () => {
    const script: EffectScript = (ctx) => {};
    registry.register('test_script', script);

    expect(() => registry.register('test_script', script)).toThrow(
      'Script test_script is already registered'
    );
  });

  it('should unregister a script', () => {
    const script: EffectScript = (ctx) => {};
    registry.register('test_script', script);

    const removed = registry.unregister('test_script');
    expect(removed).toBe(true);
    expect(registry.has('test_script')).toBe(false);
  });

  it('should return all script IDs', () => {
    registry.register('script1', (ctx) => {});
    registry.register('script2', (ctx) => {});
    registry.register('script3', (ctx) => {});

    const ids = registry.getAllScriptIds();
    expect(ids).toHaveLength(3);
    expect(ids).toContain('script1');
    expect(ids).toContain('script2');
    expect(ids).toContain('script3');
  });

  it('should clear all scripts', () => {
    registry.register('script1', (ctx) => {});
    registry.register('script2', (ctx) => {});

    registry.clear();
    expect(registry.getAllScriptIds()).toHaveLength(0);
  });
});

describe('EffectScriptExecutor', () => {
  let executor: EffectScriptExecutor;
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;
  let damageCalculator: DamageCalculator;
  let eventEmitter: EventEmitter;
  let registry: EffectScriptRegistry;

  // Helper to create a test card
  function createTestCard(
    id: string,
    owner: PlayerId,
    zone: ZoneId,
    overrides?: Partial<CardDefinition>
  ): CardInstance {
    const definition: CardDefinition = {
      id: `def_${id}`,
      name: `Test Card ${id}`,
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
      ...overrides,
    };

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
  }

  beforeEach(() => {
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
  });

  describe('Script Registration and Execution', () => {
    it('should execute a registered script', () => {
      let executed = false;
      const script: EffectScript = (ctx) => {
        executed = true;
      };

      registry.register('test_script', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND),
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('test_script', baseContext);
      expect(executed).toBe(true);
    });

    it('should throw error when executing unregistered script', () => {
      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND),
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      expect(() => executor.executeScript('nonexistent', baseContext)).toThrow(
        'Effect script nonexistent not found in registry'
      );
    });
  });

  describe('Helper Methods', () => {
    it('should provide moveCard helper', () => {
      // Add a card to player 1's hand
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.HAND);
      executor.updateStateManager(stateManager);

      // Create script that moves card to trash
      const script: EffectScript = (ctx: EffectScriptContext) => {
        ctx.moveCard('card1', ZoneId.TRASH);
      };

      registry.register('move_to_trash', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('move_to_trash', baseContext);

      // Verify card moved
      const updatedState = executor.getStateManager();
      const movedCard = updatedState.getCard('card1');
      expect(movedCard?.zone).toBe(ZoneId.TRASH);
    });

    it('should provide modifyPower helper', () => {
      // Add a card to player 1's character area
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      // Create script that boosts power by 2000
      const script: EffectScript = (ctx: EffectScriptContext) => {
        ctx.modifyPower('card1', 2000, ModifierDuration.UNTIL_END_OF_TURN);
      };

      registry.register('power_boost', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('power_boost', baseContext);

      // Verify power modifier added
      const updatedState = executor.getStateManager();
      const boostedCard = updatedState.getCard('card1');
      expect(boostedCard?.modifiers).toHaveLength(1);
      expect(boostedCard?.modifiers[0].value).toBe(2000);
      expect(boostedCard?.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);
    });

    it('should provide modifyCost helper', () => {
      // Add a card to player 1's hand
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.HAND);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.HAND);
      executor.updateStateManager(stateManager);

      // Create script that reduces cost by 1
      const script: EffectScript = (ctx: EffectScriptContext) => {
        ctx.modifyCost('card1', -1, ModifierDuration.PERMANENT);
      };

      registry.register('cost_reduction', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('cost_reduction', baseContext);

      // Verify cost modifier added
      const updatedState = executor.getStateManager();
      const modifiedCard = updatedState.getCard('card1');
      expect(modifiedCard?.modifiers).toHaveLength(1);
      expect(modifiedCard?.modifiers[0].value).toBe(-1);
      expect(modifiedCard?.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should provide drawCards helper', () => {
      // Add cards to player 1's deck
      const card1 = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.DECK);
      const card2 = createTestCard('card2', PlayerId.PLAYER_1, ZoneId.DECK);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card1, ZoneId.DECK);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card2, ZoneId.DECK);
      executor.updateStateManager(stateManager);

      // Create script that draws 2 cards
      const script: EffectScript = (ctx: EffectScriptContext) => {
        ctx.drawCards(PlayerId.PLAYER_1, 2);
      };

      registry.register('draw_two', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: card1,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('draw_two', baseContext);

      // Verify cards drawn
      const updatedState = executor.getStateManager();
      const player = updatedState.getPlayer(PlayerId.PLAYER_1);
      expect(player?.zones.hand).toHaveLength(2);
      expect(player?.zones.deck).toHaveLength(0);
    });

    it('should provide searchZone helper', () => {
      // Add various cards to player 1's deck
      const redCard = createTestCard('red1', PlayerId.PLAYER_1, ZoneId.DECK, {
        colors: ['Red'],
        basePower: 4000,
      });
      const blueCard = createTestCard('blue1', PlayerId.PLAYER_1, ZoneId.DECK, {
        colors: ['Blue'],
        basePower: 5000,
      });
      const redCard2 = createTestCard('red2', PlayerId.PLAYER_1, ZoneId.DECK, {
        colors: ['Red'],
        basePower: 6000,
      });

      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, redCard, ZoneId.DECK);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, blueCard, ZoneId.DECK);
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, redCard2, ZoneId.DECK);
      executor.updateStateManager(stateManager);

      // Create script that searches for red cards
      let foundCards: CardInstance[] = [];
      const script: EffectScript = (ctx: EffectScriptContext) => {
        foundCards = ctx.searchZone(PlayerId.PLAYER_1, ZoneId.DECK, {
          colors: ['Red'],
        });
      };

      registry.register('search_red', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: redCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('search_red', baseContext);

      // Verify search results
      expect(foundCards).toHaveLength(2);
      expect(foundCards.map(c => c.id)).toContain('red1');
      expect(foundCards.map(c => c.id)).toContain('red2');
    });

    it('should provide restCard helper', () => {
      // Add an active card to player 1's character area
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      card.state = CardState.ACTIVE;
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      // Create script that rests the card
      const script: EffectScript = (ctx: EffectScriptContext) => {
        ctx.restCard('card1');
      };

      registry.register('rest_card', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('rest_card', baseContext);

      // Verify card is rested
      const updatedState = executor.getStateManager();
      const restedCard = updatedState.getCard('card1');
      expect(restedCard?.state).toBe(CardState.RESTED);
    });

    it('should provide activateCard helper', () => {
      // Add a rested card to player 1's character area
      const card = createTestCard('card1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      card.state = CardState.RESTED;
      stateManager = zoneManager.addToZone(PlayerId.PLAYER_1, card, ZoneId.CHARACTER_AREA);
      executor.updateStateManager(stateManager);

      // Create script that activates the card
      const script: EffectScript = (ctx: EffectScriptContext) => {
        ctx.activateCard('card1');
      };

      registry.register('activate_card', script);

      const baseContext: EffectContext = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      executor.executeScript('activate_card', baseContext);

      // Verify card is active
      const updatedState = executor.getStateManager();
      const activeCard = updatedState.getCard('card1');
      expect(activeCard?.state).toBe(CardState.ACTIVE);
    });
  });
});
