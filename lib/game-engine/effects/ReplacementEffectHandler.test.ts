/**
 * ReplacementEffectHandler.test.ts
 * 
 * Tests for replacement effect processing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReplacementEffectHandler } from './ReplacementEffectHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import {
  CardDefinition,
  CardInstance,
  EffectDefinition,
  EffectInstance,
  EffectContext,
  CostExpr,
  CardCategory,
  EffectTimingType,
  PlayerId,
  ZoneId,
  CardState,
  Target,
} from '../core/types';

describe('ReplacementEffectHandler', () => {
  let handler: ReplacementEffectHandler;
  let stateManager: GameStateManager;
  let testCard: CardInstance;
  let testEffectDef: EffectDefinition;

  beforeEach(() => {
    // Create a test card definition
    const cardDef: CardDefinition = {
      id: 'test-card-1',
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
      id: 'card-instance-1',
      definition: cardDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    // Create a replacement effect definition
    testEffectDef = {
      id: 'replacement-effect-1',
      label: '[Replacement]',
      timingType: EffectTimingType.REPLACEMENT,
      triggerTiming: null,
      condition: null,
      cost: null,
      scriptId: 'test-replacement',
      oncePerTurn: false,
    };

    // Initialize state manager
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Add test card to player 1's character area
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (player1) {
      player1.zones.characterArea.push(testCard);
    }

    handler = new ReplacementEffectHandler(stateManager);
  });

  describe('Cost Replacement Effects', () => {
    it('should apply cost replacement effects', () => {
      // Create a cost expression
      const originalCost: CostExpr = {
        type: 'REST_DON',
        amount: 3,
      };

      // Create a cost replacement function that reduces cost by 1
      const costReplacement = (cost: CostExpr): CostExpr => {
        if (cost.type === 'REST_DON' && cost.amount) {
          return {
            ...cost,
            amount: cost.amount - 1,
          };
        }
        return cost;
      };

      // Register the replacement effect
      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        0,
        costReplacement
      );

      // Create effect context
      const context: EffectContext = {
        state: stateManager.getState(),
        source: testCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      // Apply cost replacement
      const modifiedCost = handler.applyCostReplacementEffects(originalCost, context);

      // Verify cost was reduced
      expect(modifiedCost.type).toBe('REST_DON');
      expect(modifiedCost.amount).toBe(2);
    });

    it('should apply multiple cost replacement effects in priority order', () => {
      const originalCost: CostExpr = {
        type: 'REST_DON',
        amount: 5,
      };

      // First replacement: reduce by 1 (priority 0)
      const costReplacement1 = (cost: CostExpr): CostExpr => {
        if (cost.type === 'REST_DON' && cost.amount) {
          return { ...cost, amount: cost.amount - 1 };
        }
        return cost;
      };

      // Second replacement: reduce by 2 (priority 1)
      const costReplacement2 = (cost: CostExpr): CostExpr => {
        if (cost.type === 'REST_DON' && cost.amount) {
          return { ...cost, amount: cost.amount - 2 };
        }
        return cost;
      };

      // Register replacements with different priorities
      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        1,
        costReplacement2
      );

      handler.registerReplacementEffect(
        testCard.id,
        { ...testEffectDef, id: 'replacement-effect-2' },
        0,
        costReplacement1
      );

      const context: EffectContext = {
        state: stateManager.getState(),
        source: testCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      // Apply cost replacements
      const modifiedCost = handler.applyCostReplacementEffects(originalCost, context);

      // Should apply priority 0 first (-1), then priority 1 (-2) = 5 - 1 - 2 = 2
      expect(modifiedCost.amount).toBe(2);
    });

    it('should not apply cost replacement if card is not on field', () => {
      const originalCost: CostExpr = {
        type: 'REST_DON',
        amount: 3,
      };

      const costReplacement = (cost: CostExpr): CostExpr => {
        if (cost.type === 'REST_DON' && cost.amount) {
          return { ...cost, amount: 0 };
        }
        return cost;
      };

      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        0,
        costReplacement
      );

      // Move card to hand (not on field)
      stateManager = stateManager.updateCard(testCard.id, {
        zone: ZoneId.HAND,
      });
      handler.updateStateManager(stateManager);

      const context: EffectContext = {
        state: stateManager.getState(),
        source: testCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      // Apply cost replacement
      const modifiedCost = handler.applyCostReplacementEffects(originalCost, context);

      // Cost should not be modified since card is not on field
      expect(modifiedCost.amount).toBe(3);
    });
  });

  describe('Body Replacement Effects', () => {
    it('should apply body replacement effects', () => {
      // Create an effect instance
      const effectInstance: EffectInstance = {
        effectDefinition: {
          id: 'test-effect',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: null,
          condition: null,
          cost: null,
          scriptId: 'draw-cards',
          oncePerTurn: false,
        },
        source: testCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map([['amount', 1]]),
        context: null,
      };

      // Create a body replacement function that doubles the draw amount
      const bodyReplacement = (instance: EffectInstance): EffectInstance => {
        const amount = instance.values.get('amount') || 0;
        const newValues = new Map(instance.values);
        newValues.set('amount', amount * 2);
        return {
          ...instance,
          values: newValues,
        };
      };

      // Register the replacement effect
      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        0,
        undefined,
        bodyReplacement
      );

      const context: EffectContext = {
        state: stateManager.getState(),
        source: testCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      // Apply body replacement
      const modifiedInstance = handler.applyBodyReplacementEffects(effectInstance, context);

      // Verify amount was doubled
      expect(modifiedInstance.values.get('amount')).toBe(2);
    });

    it('should apply multiple body replacement effects in priority order', () => {
      const effectInstance: EffectInstance = {
        effectDefinition: {
          id: 'test-effect',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: null,
          condition: null,
          cost: null,
          scriptId: 'draw-cards',
          oncePerTurn: false,
        },
        source: testCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map([['amount', 1]]),
        context: null,
      };

      // First replacement: add 1 (priority 0)
      const bodyReplacement1 = (instance: EffectInstance): EffectInstance => {
        const amount = instance.values.get('amount') || 0;
        const newValues = new Map(instance.values);
        newValues.set('amount', amount + 1);
        return { ...instance, values: newValues };
      };

      // Second replacement: multiply by 2 (priority 1)
      const bodyReplacement2 = (instance: EffectInstance): EffectInstance => {
        const amount = instance.values.get('amount') || 0;
        const newValues = new Map(instance.values);
        newValues.set('amount', amount * 2);
        return { ...instance, values: newValues };
      };

      // Register replacements
      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        1,
        undefined,
        bodyReplacement2
      );

      handler.registerReplacementEffect(
        testCard.id,
        { ...testEffectDef, id: 'replacement-effect-2' },
        0,
        undefined,
        bodyReplacement1
      );

      const context: EffectContext = {
        state: stateManager.getState(),
        source: testCard,
        controller: PlayerId.PLAYER_1,
        targets: [],
        values: new Map(),
        event: null,
      };

      // Apply body replacements
      const modifiedInstance = handler.applyBodyReplacementEffects(effectInstance, context);

      // Should apply priority 0 first (+1), then priority 1 (*2) = (1 + 1) * 2 = 4
      expect(modifiedInstance.values.get('amount')).toBe(4);
    });
  });

  describe('Registration and Management', () => {
    it('should register replacement effects', () => {
      const costReplacement = (cost: CostExpr): CostExpr => cost;

      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        0,
        costReplacement
      );

      const activeReplacements = handler.getActiveReplacementEffects();
      expect(activeReplacements).toHaveLength(1);
      expect(activeReplacements[0].id).toBe(`${testCard.id}_${testEffectDef.id}`);
    });

    it('should throw error when registering non-REPLACEMENT effect', () => {
      const nonReplacementEffect: EffectDefinition = {
        ...testEffectDef,
        timingType: EffectTimingType.AUTO,
      };

      expect(() => {
        handler.registerReplacementEffect(
          testCard.id,
          nonReplacementEffect,
          0
        );
      }).toThrow('Cannot register non-REPLACEMENT effect');
    });

    it('should unregister replacement effects', () => {
      const costReplacement = (cost: CostExpr): CostExpr => cost;

      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        0,
        costReplacement
      );

      expect(handler.getActiveReplacementEffects()).toHaveLength(1);

      handler.unregisterReplacementEffect(testCard.id, testEffectDef.id);

      expect(handler.getActiveReplacementEffects()).toHaveLength(0);
    });

    it('should clear all replacement effects from a card', () => {
      const costReplacement = (cost: CostExpr): CostExpr => cost;

      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        0,
        costReplacement
      );

      handler.registerReplacementEffect(
        testCard.id,
        { ...testEffectDef, id: 'replacement-effect-2' },
        0,
        costReplacement
      );

      expect(handler.getActiveReplacementEffects()).toHaveLength(2);

      handler.clearReplacementEffectsFromCard(testCard.id);

      expect(handler.getActiveReplacementEffects()).toHaveLength(0);
    });

    it('should clear all replacement effects', () => {
      const costReplacement = (cost: CostExpr): CostExpr => cost;

      handler.registerReplacementEffect(
        testCard.id,
        testEffectDef,
        0,
        costReplacement
      );

      expect(handler.getActiveReplacementEffects()).toHaveLength(1);

      handler.clearAllReplacementEffects();

      expect(handler.getActiveReplacementEffects()).toHaveLength(0);
    });
  });

  describe('Priority Ordering', () => {
    it('should sort replacement effects by priority', () => {
      const costReplacement = (cost: CostExpr): CostExpr => cost;

      // Register with priority 2
      handler.registerReplacementEffect(
        testCard.id,
        { ...testEffectDef, id: 'effect-3' },
        2,
        costReplacement
      );

      // Register with priority 0
      handler.registerReplacementEffect(
        testCard.id,
        { ...testEffectDef, id: 'effect-1' },
        0,
        costReplacement
      );

      // Register with priority 1
      handler.registerReplacementEffect(
        testCard.id,
        { ...testEffectDef, id: 'effect-2' },
        1,
        costReplacement
      );

      const activeReplacements = handler.getActiveReplacementEffects();
      expect(activeReplacements).toHaveLength(3);
      expect(activeReplacements[0].priority).toBe(0);
      expect(activeReplacements[1].priority).toBe(1);
      expect(activeReplacements[2].priority).toBe(2);
    });
  });
});
