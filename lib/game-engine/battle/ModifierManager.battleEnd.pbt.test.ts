/**
 * ModifierManager.battleEnd.pbt.test.ts
 * 
 * Property-based tests for battle-end modifier cleanup
 * 
 * Feature: ai-battle-integration, Property 29: Battle End Modifier Cleanup
 * Validates: Requirements 20.3
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
 * Property 29: Battle End Modifier Cleanup
 * 
 * For any battle end, all modifiers with "Until End of Battle" duration should be 
 * removed from all cards.
 * 
 * This property ensures that:
 * 1. All UNTIL_END_OF_BATTLE modifiers are removed at battle end
 * 2. Other duration modifiers (PERMANENT, UNTIL_END_OF_TURN, etc.) are NOT removed
 * 3. Battle-end cleanup affects all cards in all zones
 * 4. Battle-end cleanup works for both players
 */

describe('Property 29: Battle End Modifier Cleanup', () => {
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

  const cardIdArb = fc.string({ minLength: 5, maxLength: 20 });

  const zoneArb = fc.constantFrom(
    ZoneId.CHARACTER_AREA,
    ZoneId.HAND,
    ZoneId.TRASH,
    ZoneId.LIFE
  );

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 29.1: All UNTIL_END_OF_BATTLE modifiers are removed at battle end', () => {
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

          // Verify all modifiers exist
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(1);
          }

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

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

  it('Property 29.2: PERMANENT modifiers are NOT removed at battle end', () => {
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

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

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

  it('Property 29.3: UNTIL_END_OF_TURN modifiers are NOT removed at battle end', () => {
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

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

          // All UNTIL_END_OF_TURN modifiers should still exist
          for (const cardId of uniqueCardIds) {
            const modifiers = modifierManager.getModifiers(cardId);
            expect(modifiers.length).toBe(1);
            expect(modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 29.4: Battle-end cleanup affects cards in all zones', () => {
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

          // Add UNTIL_END_OF_BATTLE modifiers to all cards
          for (const cardId of cardIds) {
            modifierManager.addModifier(
              cardId,
              ModifierType.POWER,
              powerValue,
              ModifierDuration.UNTIL_END_OF_BATTLE,
              'source-card'
            );
          }

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

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

  it('Property 29.5: Battle-end cleanup works for both players', () => {
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

          // Add UNTIL_END_OF_BATTLE modifiers to both cards
          modifierManager.addModifier(
            cardId1,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-1'
          );
          modifierManager.addModifier(
            cardId2,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-2'
          );

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

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

  it('Property 29.6: Mixed duration modifiers are handled correctly at battle end', () => {
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
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-1'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
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
            ModifierDuration.DURING_THIS_TURN,
            'source-4'
          );

          // Verify all modifiers exist
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(4);

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

          // Only UNTIL_END_OF_BATTLE should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(3);
          expect(modifiers.some(m => m.duration === ModifierDuration.PERMANENT)).toBe(true);
          expect(modifiers.some(m => m.duration === ModifierDuration.UNTIL_END_OF_TURN)).toBe(true);
          expect(modifiers.some(m => m.duration === ModifierDuration.DURING_THIS_TURN)).toBe(true);
          expect(modifiers.some(m => m.duration === ModifierDuration.UNTIL_END_OF_BATTLE)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29.7: Battle-end cleanup removes all battle-duration modifiers regardless of type', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add different types of modifiers with UNTIL_END_OF_BATTLE duration
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-1'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.COST,
            -1,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-2'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.KEYWORD,
            'Rush',
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-3'
          );

          // Verify all modifiers exist
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(3);

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

          // All modifiers should be removed regardless of type
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29.8: Multiple battle-end cleanups are idempotent', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_BATTLE modifier
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-card'
          );

          // Expire end of battle modifiers multiple times
          modifierManager.expireEndOfBattleModifiers();
          modifierManager.expireEndOfBattleModifiers();
          modifierManager.expireEndOfBattleModifiers();

          // Modifier should be removed (and not cause errors)
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29.9: Battle-end cleanup does not affect turn-duration modifiers', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add both battle and turn duration modifiers
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-1'
          );
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-2'
          );

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

          // Only turn-duration modifier should remain
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);
          expect(modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29.10: Battle-end cleanup on attacker and defender', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        cardIdArb,
        powerValueArb,
        (attackerId, defenderId, powerValue) => {
          // Ensure unique card IDs
          if (attackerId === defenderId) return;

          // Create attacker and defender cards
          const attacker = createTestCard(attackerId, PlayerId.PLAYER_1);
          const defender = createTestCard(defenderId, PlayerId.PLAYER_2);
          stateManager = addCardToState(stateManager, attacker);
          stateManager = addCardToState(stateManager, defender);
          modifierManager.updateStateManager(stateManager);

          // Add UNTIL_END_OF_BATTLE modifiers to both cards (simulating battle boosts)
          modifierManager.addModifier(
            attackerId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'attacker-boost'
          );
          modifierManager.addModifier(
            defenderId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'defender-boost'
          );

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

          // Both cards' battle modifiers should be removed
          const attackerModifiers = modifierManager.getModifiers(attackerId);
          const defenderModifiers = modifierManager.getModifiers(defenderId);
          expect(attackerModifiers.length).toBe(0);
          expect(defenderModifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
