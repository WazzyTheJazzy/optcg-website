/**
 * ModifierManager.turnEnd.pbt.test.ts
 * 
 * Property-based tests for turn-end modifier cleanup
 * 
 * Feature: ai-battle-integration, Property 28: Turn End Modifier Cleanup
 * Validates: Requirements 20.2
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
 * Property 28: Turn End Modifier Cleanup
 * 
 * For any turn end, all modifiers with "Until End of Turn" duration should be 
 * removed from all cards.
 * 
 * This property ensures that:
 * 1. All UNTIL_END_OF_TURN modifiers are removed at turn end
 * 2. All DURING_THIS_TURN modifiers are removed at turn end
 * 3. Other duration modifiers (PERMANENT, UNTIL_END_OF_BATTLE, etc.) are NOT removed
 * 4. Turn-end cleanup affects all cards in all zones
 * 5. Turn-end cleanup works for both players
 */

describe('Property 28: Turn End Modifier Cleanup', () => {
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

  const cardIdArb = fc.uuid();

  const zoneArb = fc.constantFrom(
    ZoneId.CHARACTER_AREA,
    ZoneId.HAND,
    ZoneId.TRASH,
    ZoneId.LIFE
  );

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 28.1: All UNTIL_END_OF_TURN modifiers are removed at turn end', () => {
    fc.assert(
      fc.property(
        fc.array(cardIdArb, { minLength: 1, maxLength: 10 }),
        powerValueArb,
        playerIdArb,
        (cardIds, powerValue, playerId) => {
          // Ensure unique card IDs
          const uniqueCardIds = Array.from(new Set(cardIds));

          // Create cards and add them to the state
          for (const cardId of uniqueCardIds) {
            const card = createTestCard(cardId, playerId);
            stateManager = addCardToState(stateManager, card);
          }
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_TURN modifiers to all cards
          for (const cardId of uniqueCardIds) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValue,
              ModifierDuration.UNTIL_END_OF_TURN,
              'source-card'
            );
          }

          // Verify all modifiers exist
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(1);
          }

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // All modifiers should be removed
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 28.2: All DURING_THIS_TURN modifiers are removed at turn end', () => {
    fc.assert(
      fc.property(
        fc.array(cardIdArb, { minLength: 1, maxLength: 10 }),
        powerValueArb,
        playerIdArb,
        (cardIds, powerValue, playerId) => {
          const uniqueCardIds = Array.from(new Set(cardIds));

          for (const cardId of uniqueCardIds) {
            const card = createTestCard(cardId, playerId);
            stateManager = addCardToState(stateManager, card);
          }
          modifierManager.updateStateManager(stateManager);

          // Add DURING_THIS_TURN modifiers to all cards
          for (const cardId of uniqueCardIds) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValue,
              ModifierDuration.DURING_THIS_TURN,
              'source-card'
            );
          }

          // Verify all modifiers exist
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(1);
          }

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // All modifiers should be removed
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 28.3: PERMANENT modifiers are NOT removed at turn end', () => {
    fc.assert(
      fc.property(
        fc.array(cardIdArb, { minLength: 1, maxLength: 10 }),
        powerValueArb,
        playerIdArb,
        (cardIds, powerValue, playerId) => {
          const uniqueCardIds = Array.from(new Set(cardIds));

          for (const cardId of uniqueCardIds) {
            const card = createTestCard(cardId, playerId);
            stateManager = addCardToState(stateManager, card);
          }
          modifierManager.updateStateManager(stateManager);

          // Add PERMANENT modifiers to all cards
          for (const cardId of uniqueCardIds) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValue,
              ModifierDuration.PERMANENT,
              'source-card'
            );
          }

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // All PERMANENT modifiers should still exist
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(1);
            expect(modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 28.4: UNTIL_END_OF_BATTLE modifiers are NOT removed at turn end', () => {
    fc.assert(
      fc.property(
        fc.array(cardIdArb, { minLength: 1, maxLength: 10 }),
        powerValueArb,
        playerIdArb,
        (cardIds, powerValue, playerId) => {
          const uniqueCardIds = Array.from(new Set(cardIds));

          for (const cardId of uniqueCardIds) {
            const card = createTestCard(cardId, playerId);
            stateManager = addCardToState(stateManager, card);
          }
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_BATTLE modifiers to all cards
          for (const cardId of uniqueCardIds) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValue,
              ModifierDuration.UNTIL_END_OF_BATTLE,
              'source-card'
            );
          }

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // All UNTIL_END_OF_BATTLE modifiers should still exist
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(1);
            expect(modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_BATTLE);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 28.5: Turn-end cleanup affects cards in all zones', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        cardIdArb,
        cardIdArb,
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId1, cardId2, cardId3, cardId4, powerValue, playerId) => {
          // Ensure unique card IDs
          const cardIds = Array.from(new Set([cardId1, cardId2, cardId3, cardId4]));
          if (cardIds.length < 4) return; // Skip if not enough unique IDs

          // Create cards in different zones
          const zones = [ZoneId.CHARACTER_AREA, ZoneId.HAND, ZoneId.TRASH, ZoneId.LIFE];
          for (let i = 0; i < 4; i++) {
            const card = createTestCard(cardIds[i], playerId, 5000, 3, zones[i]);
            stateManager = addCardToState(stateManager, card);
          }
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_TURN modifiers to all cards
          for (const cardId of cardIds) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValue,
              ModifierDuration.UNTIL_END_OF_TURN,
              'source-card'
            );
          }

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // All modifiers should be removed regardless of zone
          for (const cardId of cardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 28.6: Turn-end cleanup works for both players', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        cardIdArb,
        powerValueArb,
        (cardId1, cardId2, powerValue) => {
          // Ensure unique card IDs
          if (cardId1 === cardId2) return;

          // Create cards for both players
          const card1 = createTestCard(cardId1, PlayerId.PLAYER_1);
          const card2 = createTestCard(cardId2, PlayerId.PLAYER_2);
          stateManager = addCardToState(stateManager, card1);
          stateManager = addCardToState(stateManager, card2);
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_TURN modifiers to both cards
          modifierManager.addModifier(
            cardId1,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-1'
          );
          modifierManager.addModifier(
            cardId2,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-2'
          );

          // Expire end of turn modifiers (without player filter)
          modifierManager.expireEndOfTurnModifiers();

          // Both players' modifiers should be removed
          const modifiers1 = modifierManager.getModifiers(cardId1);
          const modifiers2 = modifierManager.getModifiers(cardId2);
          expect(modifiers1.length).toBe(0);
          expect(modifiers2.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28.7: Mixed duration modifiers are handled correctly at turn end', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers with different durations
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-1'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.DURING_THIS_TURN,
            'source-2'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-3'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-4'
          );

          // Verify all modifiers exist
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(4);

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // Only PERMANENT and UNTIL_END_OF_BATTLE should remain
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(2);
          expect(modifiers.some(m => m.duration === ModifierDuration.PERMANENT)).toBe(true);
          expect(modifiers.some(m => m.duration === ModifierDuration.UNTIL_END_OF_BATTLE)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28.8: Turn-end cleanup removes all turn-duration modifiers regardless of type', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add different types of modifiers with UNTIL_END_OF_TURN duration
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-1'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.COST,
            -1,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-2'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.KEYWORD,
            'Rush',
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-3'
          );

          // Verify all modifiers exist
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(3);

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // All modifiers should be removed regardless of type
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28.9: Multiple turn-end cleanups are idempotent', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_TURN modifier
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-card'
          );

          // Expire end of turn modifiers multiple times
          modifierManager.expireEndOfTurnModifiers();
          modifierManager.expireEndOfTurnModifiers();
          modifierManager.expireEndOfTurnModifiers();

          // Modifier should be removed (and not cause errors)
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28.10: Turn-end cleanup with player filter only affects that player', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        cardIdArb,
        powerValueArb,
        (cardId1, cardId2, powerValue) => {
          // Ensure unique card IDs
          if (cardId1 === cardId2) return;

          // Create cards for both players
          const card1 = createTestCard(cardId1, PlayerId.PLAYER_1);
          const card2 = createTestCard(cardId2, PlayerId.PLAYER_2);
          stateManager = addCardToState(stateManager, card1);
          stateManager = addCardToState(stateManager, card2);
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_TURN modifiers to both cards
          modifierManager.addModifier(
            cardId1,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-1'
          );
          modifierManager.addModifier(
            cardId2,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-2'
          );

          // Expire end of turn modifiers for PLAYER_1 only
          modifierManager.expireEndOfTurnModifiers(PlayerId.PLAYER_1);

          // Only PLAYER_1's modifiers should be removed
          const modifiers1 = modifierManager.getModifiers(cardId1);
          const modifiers2 = modifierManager.getModifiers(cardId2);
          expect(modifiers1.length).toBe(0);
          expect(modifiers2.length).toBe(1); // PLAYER_2's modifier should still exist
        }
      ),
      { numRuns: 100 }
    );
  });
});
