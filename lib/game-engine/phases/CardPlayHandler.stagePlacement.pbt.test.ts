/**
 * Property-Based Test: Stage Card Placement
 * 
 * Feature: ai-battle-integration, Property 39: Stage Card Placement
 * Validates: Requirements 28.1
 * 
 * Property: For any stage card played, it should be placed in the stage area.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import { handlePlayCard } from './CardPlayHandler';
import {
  PlayerId,
  CardCategory,
  ZoneId,
  CardState,
  Color,
  EffectTimingType,
  CardInstance,
  CardDefinition,
} from '../core/types';

describe('Property 39: Stage Card Placement', () => {
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
  });

  /**
   * Helper function to create a stage card instance
   */
  function createStageCard(
    id: string,
    name: string,
    cost: number,
    color: Color,
    keywords: string[]
  ): CardInstance {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name,
      category: CardCategory.STAGE,
      colors: [color],
      typeTags: [],
      attributes: [],
      basePower: null,
      baseCost: cost,
      lifeValue: null,
      counterValue: null,
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
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.HAND,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  /**
   * Helper function to add a card to player's hand
   */
  function addCardToHand(
    stateManager: GameStateManager,
    card: CardInstance
  ): GameStateManager {
    const player = stateManager.getPlayer(card.owner);
    if (!player) return stateManager;

    return stateManager.updatePlayer(card.owner, {
      zones: {
        ...player.zones,
        hand: [...player.zones.hand, card],
      },
    });
  }

  /**
   * Helper function to give player DON
   */
  function giveDon(
    stateManager: GameStateManager,
    playerId: PlayerId,
    amount: number
  ): GameStateManager {
    const player = stateManager.getPlayer(playerId);
    if (!player) return stateManager;

    const donToAdd = [];
    for (let i = 0; i < amount; i++) {
      donToAdd.push({
        id: `don-${i}`,
        owner: playerId,
        zone: ZoneId.COST_AREA,
        state: CardState.ACTIVE,
      });
    }

    return stateManager.updatePlayer(playerId, {
      zones: {
        ...player.zones,
        costArea: donToAdd,
      },
    });
  }

  it('should place any stage card in the stage area when played', () => {
    fc.assert(
      fc.property(
        // Generate random stage card properties
        fc.string({ minLength: 1, maxLength: 20 }),  // card name
        fc.integer({ min: 0, max: 10 }),              // cost
        fc.constantFrom(...Object.values(Color)),     // color
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 3 }), // keywords
        (cardName, cost, color, keywords) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Create a stage card
          const stageCard = createStageCard(
            `stage-${cardName}`,
            cardName,
            cost,
            color,
            keywords
          );

          // Add card to player's hand
          stateManager = addCardToHand(stateManager, stageCard);

          // Give player enough DON to play the card
          stateManager = giveDon(stateManager, PlayerId.PLAYER_1, cost);

          // Create zone manager with updated state
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          // Play the stage card
          const result = handlePlayCard(
            stateManager,
            zoneManager,
            eventEmitter,
            PlayerId.PLAYER_1,
            stageCard.id
          );

          // Verify the card was played successfully
          expect(result.success).toBe(true);

          // Verify the card is in the stage area
          const updatedCard = result.newState.getCard(stageCard.id);
          expect(updatedCard).toBeDefined();
          expect(updatedCard?.zone).toBe(ZoneId.STAGE_AREA);

          // Verify the card is in the player's stage area
          const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1);
          expect(updatedPlayer?.zones.stageArea).toBeDefined();
          expect(updatedPlayer?.zones.stageArea?.id).toBe(stageCard.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should place stage card in stage area regardless of card properties', () => {
    fc.assert(
      fc.property(
        // Generate various stage card configurations
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 30 }),
          cost: fc.integer({ min: 0, max: 10 }),
          colors: fc.array(fc.constantFrom(...Object.values(Color)), { minLength: 1, maxLength: 2 }),
          keywords: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
          typeTags: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 3 }),
        }),
        (stageProps) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Create stage card with generated properties
          const stageCard = createStageCard(
            `stage-${stageProps.name}`,
            stageProps.name,
            stageProps.cost,
            stageProps.colors[0], // Use first color
            stageProps.keywords
          );

          // Add card to player's hand
          stateManager = addCardToHand(stateManager, stageCard);

          // Give player enough DON
          stateManager = giveDon(stateManager, PlayerId.PLAYER_1, stageProps.cost);

          // Create zone manager
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          // Play the stage card
          const result = handlePlayCard(
            stateManager,
            zoneManager,
            eventEmitter,
            PlayerId.PLAYER_1,
            stageCard.id
          );

          // Property: Stage card should always be in stage area after playing
          if (result.success) {
            const updatedCard = result.newState.getCard(stageCard.id);
            expect(updatedCard?.zone).toBe(ZoneId.STAGE_AREA);
            
            const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1);
            expect(updatedPlayer?.zones.stageArea?.id).toBe(stageCard.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
