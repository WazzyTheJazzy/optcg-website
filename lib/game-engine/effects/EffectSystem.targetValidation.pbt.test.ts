/**
 * EffectSystem.targetValidation.pbt.test.ts
 * 
 * Property-based tests for target validation in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 25: Target Validation
 * Validates: Requirements 18.3
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
import { TargetFilter, TargetType, Target } from './types';

/**
 * Property 25: Target Validation
 * 
 * For any chosen target for an effect, the target should be in the set of legal targets 
 * for that effect.
 * 
 * This property ensures that:
 * 1. Valid targets pass validation
 * 2. Invalid targets fail validation
 * 3. Validation is consistent with legal target determination
 * 4. All filter criteria are properly checked during validation
 */

describe('Property 25: Target Validation', () => {
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
    keywords: string[] = []
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category,
      colors,
      typeTags: [],
      attributes: [],
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

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 25.1: Legal targets pass validation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => `card-${n}`),
            playerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
            zone: zoneArb,
            category: categoryArb,
            colors: fc.array(colorArb, { minLength: 1, maxLength: 2 }),
            basePower: fc.integer({ min: 1000, max: 10000 }),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.record({
          controller: fc.constantFrom('self', 'opponent', 'any'),
          zone: zoneArb,
          category: fc.option(categoryArb, { nil: undefined }),
        }),
        (cards, filterBase) => {
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
              cardData.zone,
              cardData.category,
              cardData.colors as Color[],
              cardData.basePower,
              cardData.baseCost
            );
            addCardToState(card);
          }

          // Create filter
          const filter: TargetFilter = {
            controller: filterBase.controller as 'self' | 'opponent' | 'any',
            zone: filterBase.zone,
            category: filterBase.category,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All legal targets should pass validation
          const isValid = effectSystem.validateTargets(legalTargets, filter, PlayerId.PLAYER_1);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 25.2: Targets not in legal set fail validation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => `card-${n}`),
            playerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
            zone: zoneArb,
            category: categoryArb,
            colors: fc.array(colorArb, { minLength: 1, maxLength: 2 }),
            basePower: fc.integer({ min: 1000, max: 10000 }),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          if (uniqueCards.length < 2) return; // Need at least 2 cards

          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              cardData.playerId,
              cardData.zone,
              cardData.category,
              cardData.colors as Color[],
              cardData.basePower,
              cardData.baseCost
            );
            addCardToState(card);
          }

          // Create a filter that only matches the first card's zone
          const firstCard = uniqueCards[0];
          const filter: TargetFilter = {
            controller: 'self',
            zone: firstCard.zone,
            category: firstCard.category,
            powerRange: { exact: firstCard.basePower },
            costRange: { exact: firstCard.baseCost },
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // Find a card that doesn't match the filter
          const nonMatchingCard = uniqueCards.find(c => 
            c.id !== firstCard.id &&
            (c.zone !== firstCard.zone || 
             c.category !== firstCard.category ||
             c.basePower !== firstCard.basePower ||
             c.baseCost !== firstCard.baseCost)
          );

          if (nonMatchingCard) {
            // Create a target for the non-matching card
            const invalidTarget: Target = {
              type: TargetType.CARD,
              cardId: nonMatchingCard.id,
            };

            // Check if this target is in legal targets
            const isInLegalTargets = legalTargets.some(
              t => t.type === TargetType.CARD && t.cardId === nonMatchingCard.id
            );

            // If it's not in legal targets, validation should fail
            if (!isInLegalTargets) {
              const isValid = effectSystem.validateTargets([invalidTarget], filter, PlayerId.PLAYER_1);
              expect(isValid).toBe(false);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 25.3: Validation is consistent with legal target determination', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            playerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
            zone: zoneArb,
            category: categoryArb,
            colors: fc.array(colorArb, { minLength: 1, maxLength: 2 }),
            basePower: fc.integer({ min: 1000, max: 10000 }),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.record({
          controller: fc.constantFrom('self', 'opponent', 'any'),
          zone: zoneArb,
          category: fc.option(categoryArb, { nil: undefined }),
        }),
        (cards, filterBase) => {
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
              cardData.zone,
              cardData.category,
              cardData.colors as Color[],
              cardData.basePower,
              cardData.baseCost
            );
            addCardToState(card);
          }

          // Create filter
          const filter: TargetFilter = {
            controller: filterBase.controller as 'self' | 'opponent' | 'any',
            zone: filterBase.zone,
            category: filterBase.category,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // For each card, check if validation matches legal target determination
          for (const cardData of uniqueCards) {
            const target: Target = {
              type: TargetType.CARD,
              cardId: cardData.id,
            };

            const isInLegalTargets = legalTargets.some(
              t => t.type === TargetType.CARD && t.cardId === cardData.id
            );

            const isValid = effectSystem.validateTargets([target], filter, PlayerId.PLAYER_1);

            // Validation should match legal target determination
            expect(isValid).toBe(isInLegalTargets);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 25.4: Empty target list passes validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          controller: fc.constantFrom('self', 'opponent', 'any'),
          zone: zoneArb,
          category: fc.option(categoryArb, { nil: undefined }),
        }),
        (filterBase) => {
          // Create filter
          const filter: TargetFilter = {
            controller: filterBase.controller as 'self' | 'opponent' | 'any',
            zone: filterBase.zone,
            category: filterBase.category,
          };

          // Empty target list should always pass validation
          const isValid = effectSystem.validateTargets([], filter, PlayerId.PLAYER_1);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 25.5: Multiple valid targets all pass validation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => `card-${n}`),
            playerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
            zone: zoneArb,
            category: categoryArb,
            colors: fc.array(colorArb, { minLength: 1, maxLength: 2 }),
            basePower: fc.integer({ min: 1000, max: 10000 }),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        fc.record({
          controller: fc.constantFrom('self', 'opponent', 'any'),
          zone: zoneArb,
          category: fc.option(categoryArb, { nil: undefined }),
        }),
        (cards, filterBase) => {
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
              cardData.zone,
              cardData.category,
              cardData.colors as Color[],
              cardData.basePower,
              cardData.baseCost
            );
            addCardToState(card);
          }

          // Create filter
          const filter: TargetFilter = {
            controller: filterBase.controller as 'self' | 'opponent' | 'any',
            zone: filterBase.zone,
            category: filterBase.category,
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          if (legalTargets.length >= 2) {
            // Take first 2 legal targets
            const selectedTargets = legalTargets.slice(0, 2);

            // Multiple valid targets should pass validation
            const isValid = effectSystem.validateTargets(selectedTargets, filter, PlayerId.PLAYER_1);
            expect(isValid).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 25.6: One invalid target in list fails entire validation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => `card-${n}`),
            playerId: fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2),
            zone: zoneArb,
            category: categoryArb,
            colors: fc.array(colorArb, { minLength: 1, maxLength: 2 }),
            basePower: fc.integer({ min: 1000, max: 10000 }),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        (cards) => {
          // Reset state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          effectSystem.updateStateManager(stateManager);
          zoneManager.updateStateManager(stateManager);

          // Add cards to state
          const uniqueCards = cards.filter((card, index, self) => 
            self.findIndex(c => c.id === card.id) === index
          );
          
          if (uniqueCards.length < 3) return; // Need at least 3 cards

          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              cardData.playerId,
              cardData.zone,
              cardData.category,
              cardData.colors as Color[],
              cardData.basePower,
              cardData.baseCost
            );
            addCardToState(card);
          }

          // Create a filter that matches some but not all cards
          const firstCard = uniqueCards[0];
          const filter: TargetFilter = {
            controller: 'self',
            zone: firstCard.zone,
            category: firstCard.category,
            powerRange: { exact: firstCard.basePower },
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // Find a card that doesn't match
          const nonMatchingCard = uniqueCards.find(c => 
            c.basePower !== firstCard.basePower ||
            c.zone !== firstCard.zone ||
            c.category !== firstCard.category
          );

          if (legalTargets.length > 0 && nonMatchingCard) {
            // Check if non-matching card is actually not in legal targets
            const isInLegalTargets = legalTargets.some(
              t => t.type === TargetType.CARD && t.cardId === nonMatchingCard.id
            );

            if (!isInLegalTargets) {
              // Create a mixed list: one valid, one invalid
              const mixedTargets: Target[] = [
                legalTargets[0],
                { type: TargetType.CARD, cardId: nonMatchingCard.id },
              ];

              // Validation should fail because one target is invalid
              const isValid = effectSystem.validateTargets(mixedTargets, filter, PlayerId.PLAYER_1);
              expect(isValid).toBe(false);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
