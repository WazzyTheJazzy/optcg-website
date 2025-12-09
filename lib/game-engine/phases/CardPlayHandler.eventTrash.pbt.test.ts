/**
 * Property-Based Test: Event Trash After Resolution
 * 
 * Feature: ai-battle-integration, Property 43: Event Trash After Resolution
 * Validates: Requirements 29.2
 * 
 * Property: For any event card that resolves, it should be moved to the trash zone.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import { handlePlayCard } from './CardPlayHandler';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  CardDefinition,
  CardInstance,
} from '../core/types';

describe('Property 43: Event Trash After Resolution', () => {
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    // GameStateManager will be initialized in each test
    eventEmitter = new EventEmitter();
  });

  it('should move event cards to trash after playing', () => {
    fc.assert(
      fc.property(
        // Generate event card
        fc.record({
          cardId: fc.string({ minLength: 1, maxLength: 20 }),
          cardName: fc.string({ minLength: 1, maxLength: 30 }),
          cost: fc.integer({ min: 0, max: 10 }),
        }),
        (testData) => {
          // Setup: Create a fresh game state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          const localEventEmitter = new EventEmitter();

          // Create event card definition
          const eventDef: CardDefinition = {
            id: testData.cardId,
            name: testData.cardName,
            category: CardCategory.EVENT,
            colors: ['RED'],
            typeTags: [],
            attributes: [],
            basePower: null,
            baseCost: testData.cost,
            lifeValue: null,
            counterValue: null,
            rarity: 'C',
            keywords: [],
            effects: [
              {
                id: 'effect-1',
                label: '[On Play]',
                timingType: EffectTimingType.AUTO,
                triggerTiming: TriggerTiming.ON_PLAY,
                condition: null,
                cost: null,
                effectType: 'DRAW_CARDS' as any,
                parameters: { cardCount: 1 },
                oncePerTurn: false,
                scriptId: 'test-draw-script',
              },
            ],
            imageUrl: '',
            metadata: {
              setId: 'TEST',
              cardNumber: '001',
              releaseDate: '2024-01-01',
            },
          };

          // Create event card instance in hand
          const eventCard: CardInstance = {
            id: `instance-${testData.cardId}`,
            definition: eventDef,
            owner: PlayerId.PLAYER_1,
            controller: PlayerId.PLAYER_1,
            zone: ZoneId.HAND,
            state: CardState.NONE,
            counters: {},
            attachedCards: [],
            givenDon: [],
            modifiers: [],
            flags: new Map(),
          };

          // Add card to player's hand
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          if (!player1) throw new Error('Player 1 not found');

          stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
            zones: {
              ...player1.zones,
              hand: [...player1.zones.hand, eventCard],
            },
          });

          // Add enough DON to pay cost
          const donCards: CardInstance[] = [];
          for (let i = 0; i < testData.cost; i++) {
            donCards.push({
              id: `don-${i}`,
              definition: {
                id: 'DON',
                name: 'DON!!',
                category: CardCategory.DON,
                colors: [],
                typeTags: [],
                attributes: [],
                basePower: null,
                baseCost: null,
                lifeValue: null,
                counterValue: null,
                rarity: 'C',
                keywords: [],
                effects: [],
                imageUrl: '',
                metadata: { setId: 'DON', cardNumber: '001', releaseDate: '2024-01-01' },
              },
              owner: PlayerId.PLAYER_1,
              controller: PlayerId.PLAYER_1,
              zone: ZoneId.COST_AREA,
              state: CardState.ACTIVE,
              counters: {},
              attachedCards: [],
              givenDon: [],
              modifiers: [],
              flags: new Map(),
            });
          }

          const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          if (!updatedPlayer1) throw new Error('Player 1 not found');

          stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
            zones: {
              ...updatedPlayer1.zones,
              costArea: donCards,
            },
          });

          zoneManager.updateStateManager(stateManager);

          // Action: Play the event card
          const result = handlePlayCard(
            stateManager,
            zoneManager,
            localEventEmitter,
            PlayerId.PLAYER_1,
            eventCard.id
          );

          // Verify: Event should be in trash
          expect(result.success).toBe(true);
          
          const finalCard = result.newState.getCard(eventCard.id);
          expect(finalCard).toBeDefined();
          
          // Property: Event cards should be moved to trash after playing
          expect(finalCard?.zone).toBe(ZoneId.TRASH);
          
          // Verify card is in player's trash zone
          const finalPlayer = result.newState.getPlayer(PlayerId.PLAYER_1);
          expect(finalPlayer).toBeDefined();
          
          const cardInTrash = finalPlayer?.zones.trash.find(c => c.id === eventCard.id);
          expect(cardInTrash).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
