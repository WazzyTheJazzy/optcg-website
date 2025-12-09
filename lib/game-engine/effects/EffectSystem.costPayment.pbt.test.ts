/**
 * EffectSystem.costPayment.pbt.test.ts
 * 
 * Property-based tests for effect cost payment in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 35: Cost Payment State Change
 * Validates: Requirements 22.4
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
 * Property 35: Cost Payment State Change
 * 
 * For any effect cost that is paid, the game state should reflect the cost payment 
 * (DON rested, cards discarded, etc.).
 * 
 * This property ensures that:
 * 1. Paying REST_DON cost rests the appropriate number of DON
 * 2. Paying TRASH_CARD cost moves cards from hand to trash
 * 3. Paying REST_CARD cost rests the appropriate number of characters
 * 4. Composite costs update state for all sub-costs
 */

describe('Property 35: Cost Payment State Change', () => {
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
  // Property Tests
  // ============================================================================

  it('Property 35.1: Paying REST_DON cost rests the specified number of DON', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (totalDon, costAmount) => {
          fc.pre(totalDon >= costAmount); // Only test when cost can be paid

          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add active DON
          addDonToCostArea(PlayerId.PLAYER_1, totalDon, CardState.ACTIVE);

          // Count active DON before payment
          const playerBefore = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const activeDonBefore = playerBefore!.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;

          const cost: CostExpr = {
            type: 'REST_DON',
            amount: costAmount,
          };

          // Pay the cost
          const paid = effectSystem.payCost(cost, PlayerId.PLAYER_1);
          expect(paid).toBe(true);

          // Count active DON after payment
          const playerAfter = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const activeDonAfter = playerAfter!.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;

          // The number of active DON should decrease by the cost amount
          expect(activeDonBefore - activeDonAfter).toBe(costAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 35.2: Paying TRASH_CARD cost moves cards from hand to trash', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (totalCards, costAmount) => {
          fc.pre(totalCards >= costAmount); // Only test when cost can be paid

          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add cards to hand
          addCardsToHand(PlayerId.PLAYER_1, totalCards);

          // Count cards before payment
          const playerBefore = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const handSizeBefore = playerBefore!.zones.hand.length;
          const trashSizeBefore = playerBefore!.zones.trash.length;

          const cost: CostExpr = {
            type: 'TRASH_CARD',
            amount: costAmount,
          };

          // Pay the cost
          const paid = effectSystem.payCost(cost, PlayerId.PLAYER_1);
          expect(paid).toBe(true);

          // Count cards after payment
          const playerAfter = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const handSizeAfter = playerAfter!.zones.hand.length;
          const trashSizeAfter = playerAfter!.zones.trash.length;

          // Hand should decrease and trash should increase by cost amount
          expect(handSizeBefore - handSizeAfter).toBe(costAmount);
          expect(trashSizeAfter - trashSizeBefore).toBe(costAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 35.3: Paying REST_CARD cost rests the specified number of characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (totalChars, costAmount) => {
          fc.pre(totalChars >= costAmount); // Only test when cost can be paid

          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup: Add active characters
          addCharactersToField(PlayerId.PLAYER_1, totalChars, CardState.ACTIVE);

          // Count active characters before payment
          const playerBefore = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const activeCharsBefore = playerBefore!.zones.characterArea.filter(c => c.state === CardState.ACTIVE).length;

          const cost: CostExpr = {
            type: 'REST_CARD',
            amount: costAmount,
          };

          // Pay the cost
          const paid = effectSystem.payCost(cost, PlayerId.PLAYER_1);
          expect(paid).toBe(true);

          // Count active characters after payment
          const playerAfter = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const activeCharsAfter = playerAfter!.zones.characterArea.filter(c => c.state === CardState.ACTIVE).length;

          // The number of active characters should decrease by the cost amount
          expect(activeCharsBefore - activeCharsAfter).toBe(costAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 35.4: Paying COMPOSITE cost updates state for all sub-costs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        (totalDon, totalCards, donCost, cardCost) => {
          fc.pre(totalDon >= donCost && totalCards >= cardCost); // Only test when cost can be paid

          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Setup resources
          addDonToCostArea(PlayerId.PLAYER_1, totalDon, CardState.ACTIVE);
          addCardsToHand(PlayerId.PLAYER_1, totalCards);

          // Count resources before payment
          const playerBefore = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const activeDonBefore = playerBefore!.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;
          const handSizeBefore = playerBefore!.zones.hand.length;

          const cost: CostExpr = {
            type: 'COMPOSITE',
            costs: [
              { type: 'REST_DON', amount: donCost },
              { type: 'TRASH_CARD', amount: cardCost },
            ],
          };

          // Pay the cost
          const paid = effectSystem.payCost(cost, PlayerId.PLAYER_1);
          expect(paid).toBe(true);

          // Count resources after payment
          const playerAfter = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1);
          const activeDonAfter = playerAfter!.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;
          const handSizeAfter = playerAfter!.zones.hand.length;

          // Both sub-costs should have been paid
          expect(activeDonBefore - activeDonAfter).toBe(donCost);
          expect(handSizeBefore - handSizeAfter).toBe(cardCost);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 35.5: Paying zero-cost has no effect on game state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('REST_DON', 'TRASH_CARD', 'REST_CARD'),
        (costType) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Add some resources
          addDonToCostArea(PlayerId.PLAYER_1, 5, CardState.ACTIVE);
          addCardsToHand(PlayerId.PLAYER_1, 5);
          addCharactersToField(PlayerId.PLAYER_1, 5, CardState.ACTIVE);

          // Capture state before
          const stateBefore = effectSystem.getStateManager().getState();
          const playerBefore = stateBefore.players.get(PlayerId.PLAYER_1)!;

          const cost: CostExpr = {
            type: costType as any,
            amount: 0,
          };

          // Pay zero cost
          const paid = effectSystem.payCost(cost, PlayerId.PLAYER_1);
          expect(paid).toBe(true);

          // Capture state after
          const stateAfter = effectSystem.getStateManager().getState();
          const playerAfter = stateAfter.players.get(PlayerId.PLAYER_1)!;

          // State should be unchanged
          expect(playerAfter.zones.costArea.filter(d => d.state === CardState.ACTIVE).length)
            .toBe(playerBefore.zones.costArea.filter(d => d.state === CardState.ACTIVE).length);
          expect(playerAfter.zones.hand.length).toBe(playerBefore.zones.hand.length);
          expect(playerAfter.zones.characterArea.filter(c => c.state === CardState.ACTIVE).length)
            .toBe(playerBefore.zones.characterArea.filter(c => c.state === CardState.ACTIVE).length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 35.6: Failed cost payment does not modify game state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('REST_DON', 'TRASH_CARD', 'REST_CARD'),
        fc.integer({ min: 1, max: 5 }),
        (costType, costAmount) => {
          // Reset state for each property test run
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          eventEmitter = new EventEmitter();
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

          // Don't add any resources, so cost cannot be paid

          // Capture state before
          const stateBefore = effectSystem.getStateManager().getState();
          const playerBefore = stateBefore.players.get(PlayerId.PLAYER_1)!;

          const cost: CostExpr = {
            type: costType as any,
            amount: costAmount,
          };

          // Try to pay cost (should fail)
          const paid = effectSystem.payCost(cost, PlayerId.PLAYER_1);
          expect(paid).toBe(false);

          // Capture state after
          const stateAfter = effectSystem.getStateManager().getState();
          const playerAfter = stateAfter.players.get(PlayerId.PLAYER_1)!;

          // State should be unchanged
          expect(playerAfter.zones.costArea.length).toBe(playerBefore.zones.costArea.length);
          expect(playerAfter.zones.hand.length).toBe(playerBefore.zones.hand.length);
          expect(playerAfter.zones.characterArea.length).toBe(playerBefore.zones.characterArea.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
