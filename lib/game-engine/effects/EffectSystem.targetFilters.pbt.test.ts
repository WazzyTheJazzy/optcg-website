/**
 * EffectSystem.targetFilters.pbt.test.ts
 * 
 * Property-based tests for target filter application in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 26: Target Filter Application
 * Validates: Requirements 18.4
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
  Color,
} from '../core/types';
import { TargetFilter, TargetType } from './types';

/**
 * Property 26: Target Filter Application
 * 
 * For any target filter, only cards matching all filter criteria should be considered 
 * legal targets.
 * 
 * This property ensures that:
 * 1. Controller filter is properly applied
 * 2. Zone filter is properly applied
 * 3. Category filter is properly applied
 * 4. Color filter is properly applied
 * 5. Power range filter is properly applied
 * 6. Cost range filter is properly applied
 * 7. State filter is properly applied
 * 8. Keyword filters are properly applied
 * 9. Multiple filters combine with AND logic
 */

describe('Property 26: Target Filter Application', () => {
  let stateManager: GameStateManager;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;
  let effectSystem: EffectSystem;

  // Helper to create a test card
  const createTestCard = (
    id: string,
    playerId: PlayerId,
    zone: ZoneId,
    category: CardCategory = CardCategory.CHARACTER,
    colors: Color[] = ['Red'],
    basePower: number = 5000,
    baseCost: number = 3,
    state: CardState = CardState.ACTIVE,
    keywords: string[] = [],
    typeTags: string[] = [],
    attributes: string[] = []
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category,
      colors,
      typeTags,
      attributes,
      basePower,
      baseCost,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords,
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
      state,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper to add a card to the game state
  const addCardToState = (card: CardInstance): void => {
    const state = stateManager.getState();
    const player = state.players.get(card.controller);
    if (!player) return;

    // Add card to appropriate zone
    switch (card.zone) {
      case ZoneId.HAND:
        player.zones.hand.push(card);
        break;
      case ZoneId.CHARACTER_AREA:
        player.zones.characterArea.push(card);
        break;
      case ZoneId.LEADER_AREA:
        player.zones.leaderArea = card;
        break;
      case ZoneId.STAGE_AREA:
        player.zones.stageArea = card;
        break;
      case ZoneId.TRASH:
        player.zones.trash.push(card);
        break;
      case ZoneId.DECK:
        player.zones.deck.push(card);
        break;
      case ZoneId.LIFE:
        player.zones.life.push(card);
        break;
    }

    stateManager = new GameStateManager(state);
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

  const colorArb = fc.constantFrom('Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow');
  const categoryArb = fc.constantFrom(
    CardCategory.CHARACTER,
    CardCategory.EVENT,
    CardCategory.STAGE,
    CardCategory.LEADER
  );
  const zoneArb = fc.constantFrom(
    ZoneId.HAND,
    ZoneId.CHARACTER_AREA,
    ZoneId.TRASH,
    ZoneId.DECK
  );
  const stateArb = fc.constantFrom(
    CardState.ACTIVE,
    CardState.RESTED,
    CardState.NONE
  );
  const keywordArb = fc.constantFrom('Rush', 'Blocker', 'DoubleAttack', 'Banish');

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 26.1: Controller filter correctly filters by controller', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('self', 'opponent', 'any'),
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            playerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (controller, cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              cardData.playerId,
              ZoneId.CHARACTER_AREA
            );
            addCardToState(card);
          }

          // Create filter with controller
          const filter: TargetFilter = {
            controller: controller as 'self' | 'opponent' | 'any',
            zone: ZoneId.CHARACTER_AREA,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // Check that all targets match controller filter
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (!cardData) continue;

            if (controller === 'self') {
              expect(cardData.playerId).toBe(PlayerId.PLAYER_1);
            } else if (controller === 'opponent') {
              expect(cardData.playerId).toBe(PlayerId.PLAYER_2);
            }
            // 'any' allows both
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.2: Zone filter correctly filters by zone', () => {
    fc.assert(
      fc.property(
        zoneArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            zone: zoneArb,
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (targetZone, cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              cardData.zone
            );
            addCardToState(card);
          }

          // Create filter with zone
          const filter: TargetFilter = {
            controller: 'self',
            zone: targetZone,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should be in the specified zone
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.zone).toBe(targetZone);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.3: Category filter correctly filters by category', () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            category: categoryArb,
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (targetCategory, cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              ZoneId.CHARACTER_AREA,
              cardData.category
            );
            addCardToState(card);
          }

          // Create filter with category
          const filter: TargetFilter = {
            controller: 'self',
            zone: ZoneId.CHARACTER_AREA,
            category: targetCategory,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should have the specified category
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.category).toBe(targetCategory);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.4: Color filter correctly filters by color', () => {
    fc.assert(
      fc.property(
        colorArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            colors: fc.array(colorArb, { minLength: 1, maxLength: 2 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (targetColor, cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              ZoneId.CHARACTER_AREA,
              CardCategory.CHARACTER,
              cardData.colors as Color[]
            );
            addCardToState(card);
          }

          // Create filter with color
          const filter: TargetFilter = {
            controller: 'self',
            zone: ZoneId.CHARACTER_AREA,
            color: targetColor as Color,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should have the specified color
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.colors).toContain(targetColor);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.5: Power range filter correctly filters by power', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000 }),
        fc.integer({ min: 1000, max: 10000 }),
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            basePower: fc.integer({ min: 1000, max: 10000 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (minPower, maxPower, cards) => {
          // Ensure min <= max
          const actualMin = Math.min(minPower, maxPower);
          const actualMax = Math.max(minPower, maxPower);

          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              ZoneId.CHARACTER_AREA,
              CardCategory.CHARACTER,
              ['Red'],
              cardData.basePower
            );
            addCardToState(card);
          }

          // Create filter with power range
          const filter: TargetFilter = {
            controller: 'self',
            zone: ZoneId.CHARACTER_AREA,
            powerRange: { min: actualMin, max: actualMax },
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should have power in range
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.basePower).toBeGreaterThanOrEqual(actualMin);
              expect(cardData.basePower).toBeLessThanOrEqual(actualMax);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.6: Cost range filter correctly filters by cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (minCost, maxCost, cards) => {
          // Ensure min <= max
          const actualMin = Math.min(minCost, maxCost);
          const actualMax = Math.max(minCost, maxCost);

          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              ZoneId.CHARACTER_AREA,
              CardCategory.CHARACTER,
              ['Red'],
              5000,
              cardData.baseCost
            );
            addCardToState(card);
          }

          // Create filter with cost range
          const filter: TargetFilter = {
            controller: 'self',
            zone: ZoneId.CHARACTER_AREA,
            costRange: { min: actualMin, max: actualMax },
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should have cost in range
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.baseCost).toBeGreaterThanOrEqual(actualMin);
              expect(cardData.baseCost).toBeLessThanOrEqual(actualMax);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.7: State filter correctly filters by state', () => {
    fc.assert(
      fc.property(
        stateArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            state: stateArb,
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (targetState, cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              ZoneId.CHARACTER_AREA,
              CardCategory.CHARACTER,
              ['Red'],
              5000,
              3,
              cardData.state
            );
            addCardToState(card);
          }

          // Create filter with state
          const filter: TargetFilter = {
            controller: 'self',
            zone: ZoneId.CHARACTER_AREA,
            state: targetState,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should have the specified state
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.state).toBe(targetState);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.8: Keyword filter correctly filters by keywords', () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            keywords: fc.array(keywordArb, { maxLength: 3 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (targetKeyword, cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              ZoneId.CHARACTER_AREA,
              CardCategory.CHARACTER,
              ['Red'],
              5000,
              3,
              CardState.ACTIVE,
              cardData.keywords
            );
            addCardToState(card);
          }

          // Create filter with keyword
          const filter: TargetFilter = {
            controller: 'self',
            zone: ZoneId.CHARACTER_AREA,
            hasKeyword: targetKeyword,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should have the specified keyword
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.keywords).toContain(targetKeyword);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26.9: Multiple filters combine with AND logic', () => {
    fc.assert(
      fc.property(
        fc.record({
          category: categoryArb,
          minPower: fc.integer({ min: 1000, max: 5000 }),
          maxPower: fc.integer({ min: 5000, max: 10000 }),
          minCost: fc.integer({ min: 0, max: 5 }),
          maxCost: fc.integer({ min: 5, max: 10 }),
        }),
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            category: categoryArb,
            basePower: fc.integer({ min: 1000, max: 10000 }),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 5, maxLength: 15 }
        ),
        (filterData, cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              PlayerId.PLAYER_1,
              ZoneId.CHARACTER_AREA,
              cardData.category,
              ['Red'],
              cardData.basePower,
              cardData.baseCost
            );
            addCardToState(card);
          }

          // Create filter with multiple criteria
          const filter: TargetFilter = {
            controller: 'self',
            zone: ZoneId.CHARACTER_AREA,
            category: filterData.category,
            powerRange: { min: filterData.minPower, max: filterData.maxPower },
            costRange: { min: filterData.minCost, max: filterData.maxCost },
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All targets should match ALL filter criteria
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              // Check all criteria
              expect(cardData.category).toBe(filterData.category);
              expect(cardData.basePower).toBeGreaterThanOrEqual(filterData.minPower);
              expect(cardData.basePower).toBeLessThanOrEqual(filterData.maxPower);
              expect(cardData.baseCost).toBeGreaterThanOrEqual(filterData.minCost);
              expect(cardData.baseCost).toBeLessThanOrEqual(filterData.maxCost);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
