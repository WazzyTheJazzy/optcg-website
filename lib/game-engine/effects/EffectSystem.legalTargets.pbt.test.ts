/**
 * EffectSystem.legalTargets.pbt.test.ts
 * 
 * Property-based tests for legal target determination in EffectSystem
 * 
 * Feature: ai-battle-integration, Property 24: Legal Target Determination
 * Validates: Requirements 18.1
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
 * Property 24: Legal Target Determination
 * 
 * For any effect with targeting requirements, the set of legal targets should match 
 * exactly the cards that satisfy the effect's target filter.
 * 
 * This property ensures that:
 * 1. All cards matching the filter are included in legal targets
 * 2. No cards that don't match the filter are included
 * 3. Target determination is consistent and deterministic
 * 4. All filter criteria are properly applied
 */

describe('Property 24: Legal Target Determination', () => {
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

  // Helper to manually check if a card matches a filter
  const doesCardMatchFilter = (card: CardInstance, filter: TargetFilter): boolean => {
    // Check category
    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      if (!categories.includes(card.definition.category)) {
        return false;
      }
    }

    // Check color
    if (filter.color) {
      const colors = Array.isArray(filter.color) ? filter.color : [filter.color];
      const hasMatchingColor = colors.some(color => card.definition.colors.includes(color));
      if (!hasMatchingColor) {
        return false;
      }
    }

    // Check cost range
    if (filter.costRange) {
      const cost = card.definition.baseCost || 0;
      if (filter.costRange.min !== undefined && cost < filter.costRange.min) {
        return false;
      }
      if (filter.costRange.max !== undefined && cost > filter.costRange.max) {
        return false;
      }
      if (filter.costRange.exact !== undefined && cost !== filter.costRange.exact) {
        return false;
      }
    }

    // Check power range
    if (filter.powerRange) {
      const power = card.definition.basePower || 0;
      if (filter.powerRange.min !== undefined && power < filter.powerRange.min) {
        return false;
      }
      if (filter.powerRange.max !== undefined && power > filter.powerRange.max) {
        return false;
      }
      if (filter.powerRange.exact !== undefined && power !== filter.powerRange.exact) {
        return false;
      }
    }

    // Check state
    if (filter.state) {
      const states = Array.isArray(filter.state) ? filter.state : [filter.state];
      if (!states.includes(card.state)) {
        return false;
      }
    }

    // Check keywords
    if (filter.hasKeyword) {
      const keywords = Array.isArray(filter.hasKeyword) ? filter.hasKeyword : [filter.hasKeyword];
      const hasAllKeywords = keywords.every(keyword => card.definition.keywords.includes(keyword));
      if (!hasAllKeywords) {
        return false;
      }
    }

    if (filter.lacksKeyword) {
      const keywords = Array.isArray(filter.lacksKeyword) ? filter.lacksKeyword : [filter.lacksKeyword];
      const hasAnyKeyword = keywords.some(keyword => card.definition.keywords.includes(keyword));
      if (hasAnyKeyword) {
        return false;
      }
    }

    // Check type tags
    if (filter.typeTags && filter.typeTags.length > 0) {
      const hasMatchingTag = filter.typeTags.some(tag => card.definition.typeTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check attributes
    if (filter.attributes && filter.attributes.length > 0) {
      const hasMatchingAttribute = filter.attributes.some(attr => card.definition.attributes.includes(attr));
      if (!hasMatchingAttribute) {
        return false;
      }
    }

    return true;
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

  it('Property 24.1: All cards matching filter are included in legal targets', () => {
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
            state: stateArb,
            keywords: fc.array(keywordArb, { maxLength: 2 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.record({
          controller: fc.constantFrom('self', 'opponent', 'any'),
          zone: fc.oneof(zoneArb, fc.array(zoneArb, { minLength: 1, maxLength: 3 })),
          category: fc.option(categoryArb, { nil: undefined }),
          color: fc.option(colorArb, { nil: undefined }),
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
              cardData.baseCost,
              cardData.state,
              cardData.keywords
            );
            addCardToState(card);
          }

          // Create filter
          const filter: TargetFilter = {
            controller: filterBase.controller as 'self' | 'opponent' | 'any',
            zone: filterBase.zone,
            category: filterBase.category,
            color: filterBase.color as Color | undefined,
          };

          // Get legal targets from system
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // Manually determine which cards should match
          const state = stateManager.getState();
          const expectedMatches: string[] = [];

          for (const cardData of uniqueCards) {
            const card = createTestCard(
              cardData.id,
              cardData.playerId,
              cardData.zone,
              cardData.category,
              cardData.colors as Color[],
              cardData.basePower,
              cardData.baseCost,
              cardData.state,
              cardData.keywords
            );

            // Check controller filter
            let controllerMatches = false;
            if (filter.controller === 'self' && card.controller === PlayerId.PLAYER_1) {
              controllerMatches = true;
            } else if (filter.controller === 'opponent' && card.controller === PlayerId.PLAYER_2) {
              controllerMatches = true;
            } else if (filter.controller === 'any') {
              controllerMatches = true;
            }

            if (!controllerMatches) continue;

            // Check zone filter
            const zones = Array.isArray(filter.zone) ? filter.zone : [filter.zone];
            if (!zones.includes(card.zone)) continue;

            // Check other filters
            if (doesCardMatchFilter(card, filter)) {
              expectedMatches.push(card.id);
            }
          }

          // Check that all expected matches are in legal targets
          for (const expectedId of expectedMatches) {
            const found = legalTargets.some(
              target => target.type === TargetType.CARD && target.cardId === expectedId
            );
            expect(found).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 24.2: No cards that don\'t match filter are included in legal targets', () => {
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
            state: stateArb,
            keywords: fc.array(keywordArb, { maxLength: 2 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.record({
          controller: fc.constantFrom('self', 'opponent', 'any'),
          zone: zoneArb,
          category: fc.option(categoryArb, { nil: undefined }),
          powerRange: fc.option(
            fc.record({
              max: fc.integer({ min: 1000, max: 10000 }),
            }),
            { nil: undefined }
          ),
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
              cardData.baseCost,
              cardData.state,
              cardData.keywords
            );
            addCardToState(card);
          }

          // Create filter
          const filter: TargetFilter = {
            controller: filterBase.controller as 'self' | 'opponent' | 'any',
            zone: filterBase.zone,
            category: filterBase.category,
            powerRange: filterBase.powerRange,
          };

          // Get legal targets from system
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // Check that all legal targets actually match the filter
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            // Find the card in our test data
            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (!cardData) continue;

            const card = createTestCard(
              cardData.id,
              cardData.playerId,
              cardData.zone,
              cardData.category,
              cardData.colors as Color[],
              cardData.basePower,
              cardData.baseCost,
              cardData.state,
              cardData.keywords
            );

            // Verify controller matches
            if (filter.controller === 'self') {
              expect(card.controller).toBe(PlayerId.PLAYER_1);
            } else if (filter.controller === 'opponent') {
              expect(card.controller).toBe(PlayerId.PLAYER_2);
            }

            // Verify zone matches
            expect(card.zone).toBe(filter.zone);

            // Verify other filters
            expect(doesCardMatchFilter(card, filter)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 24.3: Legal target determination is deterministic', () => {
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
          { minLength: 1, maxLength: 5 }
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
              cardData.colors as Color[]
            );
            addCardToState(card);
          }

          // Create filter
          const filter: TargetFilter = {
            controller: filterBase.controller as 'self' | 'opponent' | 'any',
            zone: filterBase.zone,
            category: filterBase.category,
          };

          // Get legal targets multiple times
          const targets1 = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);
          const targets2 = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);
          const targets3 = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All results should be identical
          expect(targets1.length).toBe(targets2.length);
          expect(targets2.length).toBe(targets3.length);

          // Check that the same card IDs are present
          const ids1 = targets1.map(t => t.cardId).sort();
          const ids2 = targets2.map(t => t.cardId).sort();
          const ids3 = targets3.map(t => t.cardId).sort();

          expect(ids1).toEqual(ids2);
          expect(ids2).toEqual(ids3);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 24.4: Power range filter correctly limits targets', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000 }),
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            basePower: fc.integer({ min: 1000, max: 10000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (maxPower, cards) => {
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
            powerRange: { max: maxPower },
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All legal targets should have power <= maxPower
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.basePower).toBeLessThanOrEqual(maxPower);
            }
          }

          // All cards with power <= maxPower should be in legal targets
          for (const cardData of uniqueCards) {
            if (cardData.basePower <= maxPower) {
              const found = legalTargets.some(
                target => target.type === TargetType.CARD && target.cardId === cardData.id
              );
              expect(found).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 24.5: Cost range filter correctly limits targets', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }).map(n => `card-${n}`),
            baseCost: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (maxCost, cards) => {
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
            costRange: { max: maxCost },
          };

          // Get legal targets
          const legalTargets = effectSystem.getLegalTargets(filter, PlayerId.PLAYER_1);

          // All legal targets should have cost <= maxCost
          for (const target of legalTargets) {
            if (target.type !== TargetType.CARD || !target.cardId) continue;

            const cardData = uniqueCards.find(c => c.id === target.cardId);
            if (cardData) {
              expect(cardData.baseCost).toBeLessThanOrEqual(maxCost);
            }
          }

          // All cards with cost <= maxCost should be in legal targets
          for (const cardData of uniqueCards) {
            if (cardData.baseCost <= maxCost) {
              const found = legalTargets.some(
                target => target.type === TargetType.CARD && target.cardId === cardData.id
              );
              expect(found).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
