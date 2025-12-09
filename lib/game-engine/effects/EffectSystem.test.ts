/**
 * EffectSystem.test.ts
 * 
 * Tests for the EffectSystem core functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EffectSystem, EffectError, EffectScript } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  CardInstance,
  CardDefinition,
  EffectDefinition,
  Target,
  TargetType,
  ConditionExpr,
  CostExpr,
  DonInstance,
} from '../core/types';

describe('EffectSystem', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;

  // Helper to create a test card
  const createTestCard = (
    id: string,
    playerId: PlayerId,
    effects: EffectDefinition[] = []
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
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
      effects,
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition,
      owner: playerId,
      controller: playerId,
      zone: ZoneId.HAND,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper to create a test DON
  const createTestDon = (id: string, playerId: PlayerId, state: CardState = CardState.ACTIVE): DonInstance => {
    return {
      id,
      owner: playerId,
      zone: ZoneId.COST_AREA,
      state,
    };
  };

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  });

  describe('activateEffect', () => {
    it('should activate an ACTIVATE effect successfully', () => {
      // Create a card with an ACTIVATE effect
      const effectDef: EffectDefinition = {
        id: 'test-effect',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'test-script',
        oncePerTurn: false,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);

      // Add card to player's hand
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      // Register a test script
      let scriptExecuted = false;
      effectSystem.registerScript('test-script', () => {
        scriptExecuted = true;
      });

      // Activate the effect
      const result = effectSystem.activateEffect('card1', 'test-effect');

      expect(result).toBe(true);
      expect(scriptExecuted).toBe(true);
    });

    it('should throw error if card not found', () => {
      expect(() => {
        effectSystem.activateEffect('nonexistent', 'test-effect');
      }).toThrow(EffectError);
    });

    it('should throw error if effect not found on card', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      expect(() => {
        effectSystem.activateEffect('card1', 'nonexistent-effect');
      }).toThrow(EffectError);
    });

    it('should throw error if effect is not ACTIVATE type', () => {
      const effectDef: EffectDefinition = {
        id: 'auto-effect',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'test-script',
        oncePerTurn: false,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      expect(() => {
        effectSystem.activateEffect('card1', 'auto-effect');
      }).toThrow(EffectError);
    });

    it('should enforce once-per-turn restriction', () => {
      const effectDef: EffectDefinition = {
        id: 'once-per-turn-effect',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'test-script',
        oncePerTurn: true,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      effectSystem.registerScript('test-script', () => {});

      // First activation should succeed
      effectSystem.activateEffect('card1', 'once-per-turn-effect');

      // Second activation should fail
      expect(() => {
        effectSystem.activateEffect('card1', 'once-per-turn-effect');
      }).toThrow(EffectError);
    });

    it('should check condition before activating', () => {
      const condition: ConditionExpr = {
        type: 'COMPARE',
        operator: 'GT',
        left: 'turn',
        right: 5,
      };

      const effectDef: EffectDefinition = {
        id: 'conditional-effect',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition,
        cost: null,
        scriptId: 'test-script',
        oncePerTurn: false,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      effectSystem.registerScript('test-script', () => {});

      // Turn 1, condition not met
      expect(() => {
        effectSystem.activateEffect('card1', 'conditional-effect');
      }).toThrow(EffectError);
    });

    it('should pay cost before activating', () => {
      const cost: CostExpr = {
        type: 'REST_DON',
        amount: 2,
      };

      const effectDef: EffectDefinition = {
        id: 'costly-effect',
        label: '[Activate: Main]',
        timingType: EffectTimingType.ACTIVATE,
        triggerTiming: null,
        condition: null,
        cost,
        scriptId: 'test-script',
        oncePerTurn: false,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(card);

      // Add DON to cost area
      const don1 = createTestDon('don1', PlayerId.PLAYER_1);
      const don2 = createTestDon('don2', PlayerId.PLAYER_1);
      player.zones.costArea.push(don1, don2);

      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      effectSystem.registerScript('test-script', () => {});

      // Activate effect
      effectSystem.activateEffect('card1', 'costly-effect');

      // Check DON are rested
      const updatedPlayer = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.costArea[0].state).toBe(CardState.RESTED);
      expect(updatedPlayer.zones.costArea[1].state).toBe(CardState.RESTED);
    });
  });

  describe('checkCondition', () => {
    it('should evaluate AND condition', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const context = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      const condition: ConditionExpr = {
        type: 'AND',
        operands: [
          { type: 'COMPARE', operator: 'EQ', left: 1, right: 1 },
          { type: 'COMPARE', operator: 'EQ', left: 2, right: 2 },
        ],
      };

      expect(effectSystem.checkCondition(condition, context)).toBe(true);
    });

    it('should evaluate OR condition', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const context = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      const condition: ConditionExpr = {
        type: 'OR',
        operands: [
          { type: 'COMPARE', operator: 'EQ', left: 1, right: 2 },
          { type: 'COMPARE', operator: 'EQ', left: 2, right: 2 },
        ],
      };

      expect(effectSystem.checkCondition(condition, context)).toBe(true);
    });

    it('should evaluate NOT condition', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const context = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      const condition: ConditionExpr = {
        type: 'NOT',
        operands: [{ type: 'COMPARE', operator: 'EQ', left: 1, right: 2 }],
      };

      expect(effectSystem.checkCondition(condition, context)).toBe(true);
    });

    it('should evaluate COMPARE condition with all operators', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      const context = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      expect(
        effectSystem.checkCondition({ type: 'COMPARE', operator: 'EQ', left: 5, right: 5 }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'COMPARE', operator: 'NEQ', left: 5, right: 3 }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'COMPARE', operator: 'GT', left: 5, right: 3 }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'COMPARE', operator: 'LT', left: 3, right: 5 }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'COMPARE', operator: 'GTE', left: 5, right: 5 }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'COMPARE', operator: 'LTE', left: 5, right: 5 }, context)
      ).toBe(true);
    });

    it('should evaluate HAS_KEYWORD condition', () => {
      const definition: CardDefinition = {
        id: 'def-card1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        colors: ['Red'],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 3,
        lifeValue: null,
        counterValue: 1000,
        rarity: 'C',
        keywords: ['Rush', 'Blocker'],
        effects: [],
        imageUrl: '',
        metadata: {
          setCode: 'TEST',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      };

      const card: CardInstance = {
        id: 'card1',
        definition,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.HAND,
        state: CardState.NONE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      const context = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      expect(
        effectSystem.checkCondition({ type: 'HAS_KEYWORD', keyword: 'Rush' }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'HAS_KEYWORD', keyword: 'DoubleAttack' }, context)
      ).toBe(false);
    });

    it('should evaluate IN_ZONE condition', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);
      card.zone = ZoneId.CHARACTER_AREA;

      const context = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      expect(
        effectSystem.checkCondition({ type: 'IN_ZONE', zone: ZoneId.CHARACTER_AREA }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'IN_ZONE', zone: ZoneId.HAND }, context)
      ).toBe(false);
    });

    it('should evaluate IS_COLOR condition', () => {
      const card = createTestCard('card1', PlayerId.PLAYER_1);

      const context = {
        state: stateManager.getState(),
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      expect(
        effectSystem.checkCondition({ type: 'IS_COLOR', color: 'Red' }, context)
      ).toBe(true);
      expect(
        effectSystem.checkCondition({ type: 'IS_COLOR', color: 'Blue' }, context)
      ).toBe(false);
    });
  });

  describe('payCost', () => {
    it('should pay REST_DON cost', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don1', PlayerId.PLAYER_1);
      const don2 = createTestDon('don2', PlayerId.PLAYER_1);
      player.zones.costArea.push(don1, don2);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      const cost: CostExpr = { type: 'REST_DON', amount: 2 };
      const result = effectSystem.payCost(cost, PlayerId.PLAYER_1);

      expect(result).toBe(true);
      const updatedPlayer = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.costArea[0].state).toBe(CardState.RESTED);
      expect(updatedPlayer.zones.costArea[1].state).toBe(CardState.RESTED);
    });

    it('should fail REST_DON cost if not enough active DON', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don1', PlayerId.PLAYER_1);
      player.zones.costArea.push(don1);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      const cost: CostExpr = { type: 'REST_DON', amount: 2 };
      const result = effectSystem.payCost(cost, PlayerId.PLAYER_1);

      expect(result).toBe(false);
    });

    it('should pay TRASH_CARD cost', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const card1 = createTestCard('card1', PlayerId.PLAYER_1);
      const card2 = createTestCard('card2', PlayerId.PLAYER_1);
      player.zones.hand.push(card1, card2);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      zoneManager.updateStateManager(stateManager);
      effectSystem.updateStateManager(stateManager);

      const cost: CostExpr = { type: 'TRASH_CARD', amount: 1 };
      const result = effectSystem.payCost(cost, PlayerId.PLAYER_1);

      expect(result).toBe(true);
      const updatedPlayer = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.hand.length).toBe(1);
      expect(updatedPlayer.zones.trash.length).toBe(1);
    });

    it('should pay REST_CARD cost', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const card1 = createTestCard('card1', PlayerId.PLAYER_1);
      card1.state = CardState.ACTIVE;
      card1.zone = ZoneId.CHARACTER_AREA;
      player.zones.characterArea.push(card1);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      effectSystem.updateStateManager(stateManager);

      const cost: CostExpr = { type: 'REST_CARD', amount: 1 };
      const result = effectSystem.payCost(cost, PlayerId.PLAYER_1);

      expect(result).toBe(true);
      const updatedPlayer = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.characterArea[0].state).toBe(CardState.RESTED);
    });

    it('should pay COMPOSITE cost', () => {
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don1', PlayerId.PLAYER_1);
      const card1 = createTestCard('card1', PlayerId.PLAYER_1);
      player.zones.costArea.push(don1);
      player.zones.hand.push(card1);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
      zoneManager.updateStateManager(stateManager);
      effectSystem.updateStateManager(stateManager);

      const cost: CostExpr = {
        type: 'COMPOSITE',
        costs: [
          { type: 'REST_DON', amount: 1 },
          { type: 'TRASH_CARD', amount: 1 },
        ],
      };
      const result = effectSystem.payCost(cost, PlayerId.PLAYER_1);

      expect(result).toBe(true);
      const updatedPlayer = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.costArea[0].state).toBe(CardState.RESTED);
      expect(updatedPlayer.zones.hand.length).toBe(0);
      expect(updatedPlayer.zones.trash.length).toBe(1);
    });
  });

  describe('resolveEffect', () => {
    it('should execute effect script', () => {
      const effectDef: EffectDefinition = {
        id: 'test-effect',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'test-script',
        oncePerTurn: false,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);

      let scriptExecuted = false;
      effectSystem.registerScript('test-script', (context) => {
        scriptExecuted = true;
        expect(context.source.id).toBe('card1');
      });

      const effectInstance = {
        effectDefinition: effectDef,
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        context: null,
      };

      effectSystem.resolveEffect(effectInstance);

      expect(scriptExecuted).toBe(true);
    });

    it('should throw error if script not found', () => {
      const effectDef: EffectDefinition = {
        id: 'test-effect',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'nonexistent-script',
        oncePerTurn: false,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);

      const effectInstance = {
        effectDefinition: effectDef,
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        context: null,
      };

      expect(() => {
        effectSystem.resolveEffect(effectInstance);
      }).toThrow(EffectError);
    });
  });

  describe('registerScript', () => {
    it('should register and retrieve effect scripts', () => {
      const script: EffectScript = () => {};
      effectSystem.registerScript('my-script', script);

      // Verify by trying to resolve an effect with this script
      const effectDef: EffectDefinition = {
        id: 'test-effect',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'my-script',
        oncePerTurn: false,
      };

      const card = createTestCard('card1', PlayerId.PLAYER_1, [effectDef]);

      const effectInstance = {
        effectDefinition: effectDef,
        source: card,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        context: null,
      };

      // Should not throw
      expect(() => {
        effectSystem.resolveEffect(effectInstance);
      }).not.toThrow();
    });
  });
});
