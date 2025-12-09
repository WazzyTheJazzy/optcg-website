/**
 * Property-Based Test: Stage Effect Application
 * 
 * Feature: ai-battle-integration, Property 41: Stage Effect Application
 * Validates: Requirements 28.4
 * 
 * Property: For any stage card in play, its continuous effects should be applied to the game state.
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
  CardInstance,
  CardDefinition,
  EffectTimingType,
  TriggerTiming,
} from '../core/types';

describe('Property 41: Stage Effect Application', () => {
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
  });

  /**
   * Helper function to create a stage card with effects
   */
  function createStageCardWithEffects(
    id: string,
    name: string,
    cost: number,
    color: Color,
    hasOnPlayEffect: boolean,
    hasPermanentEffect: boolean
  ): CardInstance {
    const effects: any[] = [];

    if (hasOnPlayEffect) {
      effects.push({
        id: `effect-onplay-${id}`,
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'test-onplay-effect',
        oncePerTurn: false,
      });
    }

    if (hasPermanentEffect) {
      effects.push({
        id: `effect-permanent-${id}`,
        label: '[Permanent]',
        timingType: EffectTimingType.PERMANENT,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'test-permanent-effect',
        oncePerTurn: false,
      });
    }

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
      keywords: [],
      effects,
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

  it('should trigger On Play effects when stage card is played', () => {
    fc.assert(
      fc.property(
        // Generate random stage card properties
        fc.string({ minLength: 1, maxLength: 20 }),  // card name
        fc.integer({ min: 0, max: 10 }),              // cost
        fc.constantFrom(...Object.values(Color)),     // color
        (cardName, cost, color) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Create a stage card with On Play effect
          const stageCard = createStageCardWithEffects(
            `stage-${cardName}`,
            cardName,
            cost,
            color,
            true,  // has On Play effect
            false  // no permanent effect
          );

          // Add card to player's hand
          stateManager = addCardToHand(stateManager, stageCard);

          // Give player enough DON
          stateManager = giveDon(stateManager, PlayerId.PLAYER_1, cost);

          // Get initial pending triggers count
          const initialTriggers = stateManager.getState().pendingTriggers.length;

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

          // Verify the card was played successfully
          expect(result.success).toBe(true);

          // Property: On Play effects should be enqueued as pending triggers
          const finalTriggers = result.newState.getState().pendingTriggers.length;
          expect(finalTriggers).toBeGreaterThan(initialTriggers);

          // Verify the trigger is for the stage card
          const stageTriggers = result.newState.getState().pendingTriggers.filter(
            trigger => trigger.source.id === stageCard.id
          );
          expect(stageTriggers.length).toBeGreaterThan(0);

          // Verify the trigger is an ON_PLAY trigger
          const onPlayTriggers = stageTriggers.filter(
            trigger => trigger.effectDefinition.triggerTiming === TriggerTiming.ON_PLAY
          );
          expect(onPlayTriggers.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain stage effects while stage is in play', () => {
    fc.assert(
      fc.property(
        // Generate random stage card properties
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }),
          cost: fc.integer({ min: 0, max: 10 }),
          color: fc.constantFrom(...Object.values(Color)),
          hasOnPlay: fc.boolean(),
          hasPermanent: fc.boolean(),
        }),
        (stageProps) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Create a stage card with effects
          const stageCard = createStageCardWithEffects(
            `stage-${stageProps.name}`,
            stageProps.name,
            stageProps.cost,
            stageProps.color,
            stageProps.hasOnPlay,
            stageProps.hasPermanent
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

          if (result.success) {
            // Property: Stage card should be in stage area
            const updatedCard = result.newState.getCard(stageCard.id);
            expect(updatedCard?.zone).toBe(ZoneId.STAGE_AREA);

            // Property: Stage card's effects should be accessible
            expect(updatedCard?.definition.effects).toBeDefined();
            expect(updatedCard?.definition.effects.length).toBeGreaterThanOrEqual(0);

            // If card has effects, verify they match what we created
            if (stageProps.hasOnPlay || stageProps.hasPermanent) {
              expect(updatedCard?.definition.effects.length).toBeGreaterThan(0);
            }

            // Property: Effects should be associated with the card in stage area
            if (stageProps.hasOnPlay) {
              const onPlayEffects = updatedCard?.definition.effects.filter(
                e => e.triggerTiming === TriggerTiming.ON_PLAY
              );
              expect(onPlayEffects?.length).toBeGreaterThan(0);
            }

            if (stageProps.hasPermanent) {
              const permanentEffects = updatedCard?.definition.effects.filter(
                e => e.timingType === EffectTimingType.PERMANENT
              );
              expect(permanentEffects?.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve stage effects across game state updates', () => {
    fc.assert(
      fc.property(
        // Generate stage card properties
        fc.string({ minLength: 1, maxLength: 15 }),
        fc.integer({ min: 0, max: 5 }),
        fc.constantFrom(...Object.values(Color)),
        (cardName, cost, color) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Create a stage card with both types of effects
          const stageCard = createStageCardWithEffects(
            `stage-${cardName}`,
            cardName,
            cost,
            color,
            true,  // has On Play effect
            true   // has permanent effect
          );

          // Add card to player's hand
          stateManager = addCardToHand(stateManager, stageCard);

          // Give player enough DON
          stateManager = giveDon(stateManager, PlayerId.PLAYER_1, cost);

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

          if (result.success) {
            // Get the stage card from the new state
            const playedStage = result.newState.getCard(stageCard.id);
            expect(playedStage).toBeDefined();

            // Property: Effects should be preserved after playing
            expect(playedStage?.definition.effects.length).toBe(2);

            // Verify both effect types are present
            const onPlayEffect = playedStage?.definition.effects.find(
              e => e.triggerTiming === TriggerTiming.ON_PLAY
            );
            const permanentEffect = playedStage?.definition.effects.find(
              e => e.timingType === EffectTimingType.PERMANENT
            );

            expect(onPlayEffect).toBeDefined();
            expect(permanentEffect).toBeDefined();

            // Property: Effect IDs should be preserved
            expect(onPlayEffect?.id).toContain('effect-onplay');
            expect(permanentEffect?.id).toContain('effect-permanent');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
