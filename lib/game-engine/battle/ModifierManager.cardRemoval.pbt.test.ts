/**
 * ModifierManager.cardRemoval.pbt.test.ts
 * 
 * Property-based tests for modifier cleanup when cards leave the field
 * 
 * Feature: ai-battle-integration, Property 30: Card Removal Modifier Cleanup
 * Validates: Requirements 20.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ModifierManager } from './ModifierManager';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  CardDefinition,
  CardInstance,
  ModifierDuration,
  ModifierType,
  GameState,
} from '../core/types';

/**
 * Property 30: Card Removal Modifier Cleanup
 * 
 * For any card that leaves the field, all modifiers on that card should be removed.
 * 
 * This property ensures that:
 * 1. Modifiers are cleared when a card moves from field to non-field zones
 * 2. Modifiers are NOT cleared when a card moves between field zones
 * 3. Modifiers are NOT cleared when a card moves between non-field zones
 * 4. All modifier types are cleared when leaving the field
 * 5. Modifiers of all durations are cleared when leaving the field
 */

describe('Property 30: Card Removal Modifier Cleanup', () => {
  let stateManager: GameStateManager;
  let modifierManager: ModifierManager;

  // Helper to create a test card
  const createTestCard = (
    id: string,
    playerId: PlayerId,
    basePower: number = 5000,
    baseCost: number = 3,
    zone: ZoneId = ZoneId.CHARACTER_AREA
  ): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower,
      baseCost,
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
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper to add a card to the game state
  const addCardToState = (manager: GameStateManager, card: CardInstance): GameStateManager => {
    const state = manager.getState();
    const player = state.players.get(card.controller);
    if (!player) {
      throw new Error(`Player ${card.controller} not found in state`);
    }
    
    if (card.zone === ZoneId.LEADER_AREA) {
      player.zones.leaderArea = card;
    } else if (card.zone === ZoneId.CHARACTER_AREA) {
      player.zones.characterArea.push(card);
    } else if (card.zone === ZoneId.HAND) {
      player.zones.hand.push(card);
    } else if (card.zone === ZoneId.TRASH) {
      player.zones.trash.push(card);
    } else if (card.zone === ZoneId.LIFE) {
      player.zones.life.push(card);
    } else if (card.zone === ZoneId.STAGE_AREA) {
      player.zones.stageArea = card;
    } else if (card.zone === ZoneId.DECK) {
      player.zones.deck.push(card);
    }
    
    return manager;
  };

  beforeEach(() => {
    stateManager = new GameStateManager(createInitialGameState());
    modifierManager = new ModifierManager(stateManager);
  });

  // ============================================================================
  // Arbitraries for generating test data
  // ============================================================================

  const powerValueArb = fc.integer({ min: -5000, max: 5000 });

  const playerIdArb = fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2);

  const cardIdArb = fc.string({ minLength: 5, maxLength: 20 });

  const fieldZoneArb = fc.constantFrom(
    ZoneId.CHARACTER_AREA,
    ZoneId.LEADER_AREA,
    ZoneId.STAGE_AREA
  );

  const nonFieldZoneArb = fc.constantFrom(
    ZoneId.HAND,
    ZoneId.TRASH,
    ZoneId.LIFE,
    ZoneId.DECK
  );

  const durationArb = fc.constantFrom(
    ModifierDuration.PERMANENT,
    ModifierDuration.UNTIL_END_OF_TURN,
    ModifierDuration.UNTIL_END_OF_BATTLE,
    ModifierDuration.DURING_THIS_TURN,
    ModifierDuration.UNTIL_START_OF_NEXT_TURN
  );

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 30.1: Modifiers are cleared when card moves from field to non-field zone', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        fieldZoneArb,
        nonFieldZoneArb,
        (cardId, powerValue, playerId, fromZone, toZone) => {
          const card = createTestCard(cardId, playerId, 5000, 3, fromZone);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add a modifier to the card
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-card'
          );

          // Verify modifier exists
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);

          // Clear modifiers when card leaves field
          modifierManager.clearModifiersOnZoneChange(cardId, fromZone, toZone);

          // Modifier should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30.2: Modifiers are NOT cleared when card moves between field zones', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        fieldZoneArb,
        fieldZoneArb,
        (cardId, powerValue, playerId, fromZone, toZone) => {
          // Skip if same zone
          if (fromZone === toZone) return;

          const card = createTestCard(cardId, playerId, 5000, 3, fromZone);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add a modifier to the card
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-card'
          );

          // Clear modifiers when card moves between field zones
          modifierManager.clearModifiersOnZoneChange(cardId, fromZone, toZone);

          // Modifier should still exist
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 30.3: Modifiers are NOT cleared when card moves between non-field zones', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        nonFieldZoneArb,
        nonFieldZoneArb,
        (cardId, powerValue, playerId, fromZone, toZone) => {
          // Skip if same zone
          if (fromZone === toZone) return;

          const card = createTestCard(cardId, playerId, 5000, 3, fromZone);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add a modifier to the card
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-card'
          );

          // Clear modifiers when card moves between non-field zones
          modifierManager.clearModifiersOnZoneChange(cardId, fromZone, toZone);

          // Modifier should still exist
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 30.4: All modifier types are cleared when leaving the field', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        fieldZoneArb,
        nonFieldZoneArb,
        (cardId, powerValue, playerId, fromZone, toZone) => {
          const card = createTestCard(cardId, playerId, 5000, 3, fromZone);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add different types of modifiers
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-1'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.COST,
            -1,
            ModifierDuration.PERMANENT,
            'source-2'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.KEYWORD,
            'Rush',
            ModifierDuration.PERMANENT,
            'source-3'
          );

          // Verify all modifiers exist
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(3);

          // Clear modifiers when card leaves field
          modifierManager.clearModifiersOnZoneChange(cardId, fromZone, toZone);

          // All modifiers should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30.5: Modifiers of all durations are cleared when leaving the field', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        fieldZoneArb,
        nonFieldZoneArb,
        (cardId, powerValue, playerId, fromZone, toZone) => {
          const card = createTestCard(cardId, playerId, 5000, 3, fromZone);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers with different durations
          const durations = [
            ModifierDuration.PERMANENT,
            ModifierDuration.UNTIL_END_OF_TURN,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            ModifierDuration.DURING_THIS_TURN,
            ModifierDuration.UNTIL_START_OF_NEXT_TURN,
          ];

          for (const duration of durations) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValue,
              duration,
              `source-${duration}`
            );
          }

          // Verify all modifiers exist
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(5);

          // Clear modifiers when card leaves field
          modifierManager.clearModifiersOnZoneChange(cardId, fromZone, toZone);

          // All modifiers should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30.6: Character moving to trash clears modifiers', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId, 5000, 3, ZoneId.CHARACTER_AREA);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-card'
          );

          // Clear modifiers when card moves to trash (K.O.'d)
          modifierManager.clearModifiersOnZoneChange(cardId, ZoneId.CHARACTER_AREA, ZoneId.TRASH);

          // Modifiers should be removed
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30.7: Character returning to hand clears modifiers', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId, 5000, 3, ZoneId.CHARACTER_AREA);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-card'
          );

          // Clear modifiers when card returns to hand (bounced)
          modifierManager.clearModifiersOnZoneChange(cardId, ZoneId.CHARACTER_AREA, ZoneId.HAND);

          // Modifiers should be removed
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30.8: Stage card moving to trash clears modifiers', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId, 5000, 3, ZoneId.STAGE_AREA);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-card'
          );

          // Clear modifiers when stage is replaced
          modifierManager.clearModifiersOnZoneChange(cardId, ZoneId.STAGE_AREA, ZoneId.TRASH);

          // Modifiers should be removed
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30.9: Multiple modifiers are all cleared when leaving field', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        fc.array(powerValueArb, { minLength: 1, maxLength: 10 }),
        playerIdArb,
        fieldZoneArb,
        nonFieldZoneArb,
        (cardId, powerValues, playerId, fromZone, toZone) => {
          const card = createTestCard(cardId, playerId, 5000, 3, fromZone);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add multiple modifiers
          for (let i = 0; i < powerValues.length; i++) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValues[i],
              ModifierDuration.PERMANENT,
              `source-${i}`
            );
          }

          // Verify all modifiers exist
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(powerValues.length);

          // Clear modifiers when card leaves field
          modifierManager.clearModifiersOnZoneChange(cardId, fromZone, toZone);

          // All modifiers should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 30.10: Modifiers on other cards are not affected', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        cardIdArb,
        powerValueArb,
        playerIdArb,
        nonFieldZoneArb,
        (cardId1, cardId2, powerValue, playerId, toZone) => {
          // Ensure unique card IDs
          if (cardId1 === cardId2) return;

          // Create two cards in CHARACTER_AREA (to avoid STAGE_AREA single-card limit)
          const card1 = createTestCard(cardId1, playerId, 5000, 3, ZoneId.CHARACTER_AREA);
          const card2 = createTestCard(cardId2, playerId, 5000, 3, ZoneId.CHARACTER_AREA);
          stateManager = addCardToState(stateManager, card1);
          stateManager = addCardToState(stateManager, card2);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers to both cards
          modifierManager.addModifier(
            cardId1,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-1'
          );
          modifierManager.addModifier(
            cardId2,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-2'
          );

          // Clear modifiers when card1 leaves field
          modifierManager.clearModifiersOnZoneChange(cardId1, ZoneId.CHARACTER_AREA, toZone);

          // Card1's modifiers should be removed
          const modifiers1 = modifierManager.getModifiers(cardId1);
          expect(modifiers1.length).toBe(0);

          // Card2's modifiers should still exist
          const modifiers2 = modifierManager.getModifiers(cardId2);
          expect(modifiers2.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
