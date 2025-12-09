/**
 * ModifierManager.duration.pbt.test.ts
 * 
 * Property-based tests for modifier duration management
 * 
 * Feature: ai-battle-integration, Property 27: Modifier Duration Support
 * Validates: Requirements 20.1
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
 * Property 27: Modifier Duration Support
 * 
 * For any modifier with a specific duration, the modifier should be removed 
 * at the appropriate time (end of turn, end of battle, etc.).
 * 
 * This property ensures that:
 * 1. PERMANENT modifiers are never automatically removed
 * 2. UNTIL_END_OF_TURN modifiers are removed at turn end
 * 3. UNTIL_END_OF_BATTLE modifiers are removed at battle end
 * 4. DURING_THIS_TURN modifiers are removed at turn end
 * 5. UNTIL_START_OF_NEXT_TURN modifiers are removed at start of next turn
 * 6. Modifiers track their duration correctly
 */

describe('Property 27: Modifier Duration Support', () => {
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
    // Use the moveCard method if the card already exists, otherwise manually add it
    const state = manager.getState();
    const player = state.players.get(card.controller);
    if (!player) {
      throw new Error(`Player ${card.controller} not found in state`);
    }
    
    // Add the card to the appropriate zone
    if (card.zone === ZoneId.LEADER_AREA) {
      player.zones.leaderArea = card;
    } else if (card.zone === ZoneId.CHARACTER_AREA) {
      player.zones.characterArea.push(card);
    } else if (card.zone === ZoneId.HAND) {
      player.zones.hand.push(card);
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

  const durationArb = fc.constantFrom(
    ModifierDuration.PERMANENT,
    ModifierDuration.UNTIL_END_OF_TURN,
    ModifierDuration.UNTIL_END_OF_BATTLE,
    ModifierDuration.DURING_THIS_TURN,
    ModifierDuration.UNTIL_START_OF_NEXT_TURN
  );

  const playerIdArb = fc.constantFrom(PlayerId.PLAYER_1, PlayerId.PLAYER_2);

  const cardIdArb = fc.string({ minLength: 5, maxLength: 20 });

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 27.1: PERMANENT modifiers are never automatically removed', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          // Create a card and add it to the state
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add a PERMANENT modifier
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.PERMANENT,
            'source-card'
          );

          // Try to expire all types of modifiers
          modifierManager.expireEndOfTurnModifiers();
          modifierManager.expireEndOfBattleModifiers();
          modifierManager.expireStartOfTurnModifiers(playerId);

          // PERMANENT modifier should still exist
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);
          expect(modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
          expect(modifiers[0].value).toBe(powerValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27.2: UNTIL_END_OF_TURN modifiers are removed at turn end', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add an UNTIL_END_OF_TURN modifier
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_TURN,
            'source-card'
          );

          // Verify modifier exists
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // Modifier should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27.3: UNTIL_END_OF_BATTLE modifiers are removed at battle end', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add an UNTIL_END_OF_BATTLE modifier
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            'source-card'
          );

          // Verify modifier exists
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

          // Modifier should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27.4: DURING_THIS_TURN modifiers are removed at turn end', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add a DURING_THIS_TURN modifier
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.DURING_THIS_TURN,
            'source-card'
          );

          // Verify modifier exists
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // Modifier should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27.5: UNTIL_START_OF_NEXT_TURN modifiers are removed at start of next turn', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add an UNTIL_START_OF_NEXT_TURN modifier
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            ModifierDuration.UNTIL_START_OF_NEXT_TURN,
            'source-card'
          );

          // Verify modifier exists
          let modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);

          // Expire start of turn modifiers
          modifierManager.expireStartOfTurnModifiers(playerId);

          // Modifier should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27.6: Multiple modifiers with different durations are handled correctly', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers with all durations
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

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // Should have 3 modifiers left (PERMANENT, UNTIL_END_OF_BATTLE, UNTIL_START_OF_NEXT_TURN)
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(3);
          expect(modifiers.some(m => m.duration === ModifierDuration.PERMANENT)).toBe(true);
          expect(modifiers.some(m => m.duration === ModifierDuration.UNTIL_END_OF_BATTLE)).toBe(true);
          expect(modifiers.some(m => m.duration === ModifierDuration.UNTIL_START_OF_NEXT_TURN)).toBe(true);

          // Expire end of battle modifiers
          modifierManager.expireEndOfBattleModifiers();

          // Should have 2 modifiers left (PERMANENT, UNTIL_START_OF_NEXT_TURN)
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(2);
          expect(modifiers.some(m => m.duration === ModifierDuration.PERMANENT)).toBe(true);
          expect(modifiers.some(m => m.duration === ModifierDuration.UNTIL_START_OF_NEXT_TURN)).toBe(true);

          // Expire start of turn modifiers
          modifierManager.expireStartOfTurnModifiers(playerId);

          // Should have 1 modifier left (PERMANENT)
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);
          expect(modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 27.7: Modifiers on multiple cards are handled independently', () => {
    fc.assert(
      fc.property(
        fc.array(cardIdArb, { minLength: 2, maxLength: 5 }),
        powerValueArb,
        playerIdArb,
        (cardIds, powerValue, playerId) => {
          // Ensure unique card IDs
          const uniqueCardIds = Array.from(new Set(cardIds));
          if (uniqueCardIds.length < 2) return; // Skip if not enough unique IDs

          // Create cards and add them to the state
          for (const cardId of uniqueCardIds) {
            const card = createTestCard(cardId, playerId);
            stateManager = addCardToState(stateManager, card);
          }
          modifierManager.updateStateManager(stateManager);

          // Add different duration modifiers to each card
          const durations = [
            ModifierDuration.PERMANENT,
            ModifierDuration.UNTIL_END_OF_TURN,
            ModifierDuration.UNTIL_END_OF_BATTLE,
            ModifierDuration.DURING_THIS_TURN,
            ModifierDuration.UNTIL_START_OF_NEXT_TURN,
          ];

          for (let i = 0; i < uniqueCardIds.length; i++) {
            const duration = durations[i % durations.length];
            modifierManager.addModifier(
              uniqueCardIds[i],
              ModifierType.POWER,
              powerValue,
              duration,
              'source-card'
            );
          }

          // Expire end of turn modifiers
          modifierManager.expireEndOfTurnModifiers();

          // Check each card independently
          for (let i = 0; i < uniqueCardIds.length; i++) {
            const duration = durations[i % durations.length];
            const modifiers = modifierManager.getModifiers(uniqueCardIds[i]);

            if (duration === ModifierDuration.UNTIL_END_OF_TURN || 
                duration === ModifierDuration.DURING_THIS_TURN) {
              // Should be removed
              expect(modifiers.length).toBe(0);
            } else {
              // Should still exist
              expect(modifiers.length).toBe(1);
              expect(modifiers[0].duration).toBe(duration);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 27.8: Expiring modifiers does not affect other modifier types', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers of different types with UNTIL_END_OF_TURN duration
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

  it('Property 27.9: Modifiers track their duration correctly', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        durationArb,
        playerIdArb,
        (cardId, powerValue, duration, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add a modifier with the specified duration
          modifierManager.addModifier(
            cardId,
            ModifierType.POWER,
            powerValue,
            duration,
            'source-card'
          );

          // Verify the modifier has the correct duration
          const modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(1);
          expect(modifiers[0].duration).toBe(duration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27.10: Clearing modifiers removes all durations', () => {
    fc.assert(
      fc.property(
        cardIdArb,
        powerValueArb,
        playerIdArb,
        (cardId, powerValue, playerId) => {
          const card = createTestCard(cardId, playerId);
          stateManager = addCardToState(stateManager, card);
          modifierManager.updateStateManager(stateManager);

          // Add modifiers with all durations
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

          // Clear all modifiers
          modifierManager.clearModifiers(cardId);

          // All modifiers should be removed
          modifiers = modifierManager.getModifiers(cardId);
          expect(modifiers.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
