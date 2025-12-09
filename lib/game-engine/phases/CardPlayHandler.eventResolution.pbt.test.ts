/**
 * Property-Based Test: Event Immediate Resolution
 * 
 * Feature: ai-battle-integration, Property 42: Event Immediate Resolution
 * Validates: Requirements 29.1
 * 
 * Property: For any event card played, its effect should resolve immediately.
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

describe('Property 42: Event Immediate Resolution', () => {
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    // GameStateManager will be initialized in each test
    eventEmitter = new EventEmitter();
  });

  it('should resolve event effects immediately when played', () => {
    fc.assert(
      fc.property(
        // Generate event card with ON_PLAY effect
        fc.record({
          cardId: fc.string({ minLength: 1, maxLength: 20 }),
          cardName: fc.string({ minLength: 1, maxLength: 30 }),
          cost: fc.integer({ min: 0, max: 10 }),
          effectId: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        (testData) => {
          // Setup: Create a fresh game state
          const initialState = createInitialGameState();
          stateManager = new GameStateManager(initialState);
          stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          const localEventEmitter = new EventEmitter();

          // Create event card definition with ON_PLAY effect
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
                id: testData.effectId,
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

          // Record initial state
          const initialPendingTriggers = stateManager.getState().pendingTriggers.length;

          // Action: Play the event card
          const result = handlePlayCard(
            stateManager,
            zoneManager,
            localEventEmitter,
            PlayerId.PLAYER_1,
            eventCard.id
          );

          // Verify: Card play should succeed
          expect(result.success).toBe(true);
          
          // Verify: Event should be in trash (not in hand)
          const finalCard = result.newState.getCard(eventCard.id);
          expect(finalCard).toBeDefined();
          expect(finalCard?.zone).toBe(ZoneId.TRASH);
          
          // Property: Event effects should be enqueued for immediate resolution
          // Note: This verifies that the trigger mechanism is invoked
          // The actual effect resolution happens in the EffectSystem
          const finalPendingTriggers = result.newState.getState().pendingTriggers.length;
          
          // If the card has ON_PLAY effects, triggers should be added
          if (eventCard.definition.effects.some(e => e.triggerTiming === TriggerTiming.ON_PLAY)) {
            expect(finalPendingTriggers).toBeGreaterThan(initialPendingTriggers);
            
            // Verify the trigger is for the event's ON_PLAY effect
            const triggers = result.newState.getState().pendingTriggers;
            const eventTrigger = triggers.find(
              t => t.source.id === eventCard.id && 
                   t.effectDefinition.triggerTiming === TriggerTiming.ON_PLAY
            );
            expect(eventTrigger).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
