/**
 * EffectSystem.costValidation.pbt.test.ts
 * 
 * Property-based tests for effect cost validation in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 34: Cost Payment Validation
 * Validates: Requirements 22.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { EffectSystem } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  CardDefinition,
  CardInstance,
  CostExpr,
  Color,
} from '../core/types';

/**
 * Property 34: Cost Payment Validation
 * 
 * For any effect with a cost, the effect should only be activatable if the player can pay the cost.
 * 
 * This property ensures that:
 * 1. Effects with affordable costs can be activated
 * 2. Effects with unaffordable costs cannot be activated
 * 3. Cost validation checks all cost types correctly
 * 4. Composite costs are validated properly
 */

describe('Property 34: Cost Payment Validation', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;

  // Helper to create a test card
  const createTestCard = (
    id: string,
    playerId: PlayerId,
    zone: ZoneId = ZoneId.HAND
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'] as Color[],
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
      zone,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper to add DON to cost area
  const addDonToCostArea = (playerId: PlayerId, count: number, state: CardState = CardState.ACTIVE) => {
    const gameState = stateManager.getState();
    const player = gameState.players.get(playerId);
    if (!player) return;

    for (let i = 0; i < count; i++) {
      const don = createTestCard(`don-${i}`, playerId, ZoneId.COST_AREA);
      don.definition.category = CardCategory.DON;
      don.state = state;
      player.zones.costArea.push(don);
    }
    
    stateManager = new GameStateManager(gameState);
    effectSystem.updateStateManager(stateManager);
    zoneManager.updateStateManager(stateManager);
  };

  // Helper to add cards to hand
  const addCardsToHand = (playerId: PlayerId, count: number) => {
    const gameState = stateManager.getState();
    const player = gameState.players.get(playerId);
    if (!player) return;

    for (let i = 0; i < count; i++) {
      const card = createTestCard(`hand-card-${i}`, playerId, ZoneId.HAND);
      player.zones.hand.push(card);
    }
    
    stateManager = new GameStateManager(gameState);
    effectSystem.updateStateManager(stateManager);
    zoneManager.updateStateManager(stateManager);
  };

  // Helper to add characters to character area
  const addCharactersToField = (playerId: PlayerId, count: number, state: CardState = CardState.ACTIVE) => {
    const gameState = stateManager.getState();
    const player = gameState.players.get(playerId);
    if (!player) return;

    for (let i = 0; i < count; i++) {
      const card = createTestCard(`char-${i}`, playerId, ZoneId.CHARACTER_AREA);
      card.state = state;
      player.zones.characterArea.push(card);
    }
    
    stateManager = new GameStateManager(gameState);
    effectSystem.updateStateManager(stateManager);
    zoneManager.updateStateManager(stateManager);
  };

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
  });

  // ============================================================================
  // Arbitraries for generating test data
  // ============================================================================

  // Generate REST_DON cost
  const restDonCostArb = fc.record({
    type: fc.constant('REST_DON' as const),
    amount: fc.integer({ min: 0, max: 10 }),
  });

  // Generate TRASH_CARD cost
  const trashCardCostArb = fc.record({
    type: fc.constant('TRASH_CARD' as const),
    amount: fc.integer({ min: 0, max: 5 }),
  });

  // Generate REST_CARD cost
  const restCardCostArb = fc.record({
    type: fc.constant('REST_CARD' as const),
    amount: fc.integer({ min: 0, max: 5 }),
  });

  // Generate simple cost (non-composite)
  const simpleCostArb = fc.oneof(
    restDonCostArb,
    trashCardCostArb,
    restCardCostArb
  );

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 34.1: REST_DON cost validation checks active DON count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (availableDon, requiredDon) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add DON to cost area
          addDonToCostArea(PlayerId.PLAYER_1, availableDon, CardState.ACTIVE);

          const cost: CostExpr = {
            type: 'REST_DON',
            amount: requiredDon,
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Player can pay if they have enough active DON
          const expected = availableDon >= requiredDon;
          expect(canPay).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.2: TRASH_CARD cost validation checks hand size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (cardsInHand, requiredCards) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add cards to hand
          addCardsToHand(PlayerId.PLAYER_1, cardsInHand);

          const cost: CostExpr = {
            type: 'TRASH_CARD',
            amount: requiredCards,
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Player can pay if they have enough cards in hand
          const expected = cardsInHand >= requiredCards;
          expect(canPay).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.3: REST_CARD cost validation checks active characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (activeCharacters, requiredCharacters) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add active characters to field
          addCharactersToField(PlayerId.PLAYER_1, activeCharacters, CardState.ACTIVE);

          const cost: CostExpr = {
            type: 'REST_CARD',
            amount: requiredCharacters,
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Player can pay if they have enough active characters
          const expected = activeCharacters >= requiredCharacters;
          expect(canPay).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.4: Rested DON cannot be used for REST_DON cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (activeDon, restedDon) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add both active and rested DON
          addDonToCostArea(PlayerId.PLAYER_1, activeDon, CardState.ACTIVE);
          addDonToCostArea(PlayerId.PLAYER_1, restedDon, CardState.RESTED);

          const cost: CostExpr = {
            type: 'REST_DON',
            amount: activeDon + 1, // Require more than available active DON
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Player cannot pay even though total DON >= required
          // Only active DON count
          expect(canPay).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.5: Rested characters cannot be used for REST_CARD cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (activeChars, restedChars) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add both active and rested characters
          addCharactersToField(PlayerId.PLAYER_1, activeChars, CardState.ACTIVE);
          addCharactersToField(PlayerId.PLAYER_1, restedChars, CardState.RESTED);

          const cost: CostExpr = {
            type: 'REST_CARD',
            amount: activeChars + 1, // Require more than available active characters
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Player cannot pay even though total characters >= required
          // Only active characters count
          expect(canPay).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.6: COMPOSITE costs require all sub-costs to be payable', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        (availableDon, availableCards, availableChars, requiredDon, requiredCards) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup resources
          addDonToCostArea(PlayerId.PLAYER_1, availableDon, CardState.ACTIVE);
          addCardsToHand(PlayerId.PLAYER_1, availableCards);
          addCharactersToField(PlayerId.PLAYER_1, availableChars, CardState.ACTIVE);

          const cost: CostExpr = {
            type: 'COMPOSITE',
            costs: [
              { type: 'REST_DON', amount: requiredDon },
              { type: 'TRASH_CARD', amount: requiredCards },
            ],
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Player can pay only if they can pay ALL sub-costs
          const canPayDon = availableDon >= requiredDon;
          const canPayCards = availableCards >= requiredCards;
          const expected = canPayDon && canPayCards;

          expect(canPay).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.7: Zero-cost effects are always payable', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('REST_DON', 'TRASH_CARD', 'REST_CARD'),
        (costType) => {
          const cost: CostExpr = {
            type: costType as any,
            amount: 0,
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Zero-cost effects should always be payable
          expect(canPay).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.8: Cost validation is consistent across multiple checks', () => {
    fc.assert(
      fc.property(
        simpleCostArb,
        fc.integer({ min: 0, max: 10 }),
        (cost, resourceCount) => {
          // Setup appropriate resources based on cost type
          if (cost.type === 'REST_DON') {
            addDonToCostArea(PlayerId.PLAYER_1, resourceCount, CardState.ACTIVE);
          } else if (cost.type === 'TRASH_CARD') {
            addCardsToHand(PlayerId.PLAYER_1, resourceCount);
          } else if (cost.type === 'REST_CARD') {
            addCharactersToField(PlayerId.PLAYER_1, resourceCount, CardState.ACTIVE);
          }

          // Check cost multiple times
          const result1 = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);
          const result2 = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);
          const result3 = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // All checks should return the same result (validation doesn't modify state)
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34.9: Empty COMPOSITE cost is always payable', () => {
    const cost: CostExpr = {
      type: 'COMPOSITE',
      costs: [],
    };

    const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

    // Empty composite cost should be payable
    expect(canPay).toBe(true);
  });

  it('Property 34.10: Player with no resources cannot pay non-zero costs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('REST_DON', 'TRASH_CARD', 'REST_CARD'),
        fc.integer({ min: 1, max: 5 }),
        (costType, amount) => {
          // Don't add any resources

          const cost: CostExpr = {
            type: costType as any,
            amount,
          };

          const canPay = effectSystem.canPayCost(cost, PlayerId.PLAYER_1);

          // Player with no resources cannot pay any non-zero cost
          expect(canPay).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
