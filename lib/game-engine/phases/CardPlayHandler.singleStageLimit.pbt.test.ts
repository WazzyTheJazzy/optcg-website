/**
 * Property-Based Test: Single Stage Limit
 * 
 * Feature: ai-battle-integration, Property 40: Single Stage Limit
 * Validates: Requirements 28.2
 * 
 * Property: For any player, playing a second stage card should cause the first stage to be moved to trash.
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
} from '../core/types';

describe('Property 40: Single Stage Limit', () => {
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
    color: Color
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

  it('should trash existing stage when playing a second stage card', () => {
    fc.assert(
      fc.property(
        // Generate two different stage cards
        fc.tuple(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            cost: fc.integer({ min: 0, max: 10 }),
            color: fc.constantFrom(...Object.values(Color)),
          }),
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            cost: fc.integer({ min: 0, max: 10 }),
            color: fc.constantFrom(...Object.values(Color)),
          })
        ),
        ([stage1Props, stage2Props]) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Create two stage cards
          const stage1 = createStageCard(
            `stage1-${stage1Props.name}`,
            stage1Props.name,
            stage1Props.cost,
            stage1Props.color
          );

          const stage2 = createStageCard(
            `stage2-${stage2Props.name}`,
            stage2Props.name,
            stage2Props.cost,
            stage2Props.color
          );

          // Add both cards to player's hand
          stateManager = addCardToHand(stateManager, stage1);
          stateManager = addCardToHand(stateManager, stage2);

          // Give player enough DON for both cards
          const maxCost = Math.max(stage1Props.cost, stage2Props.cost);
          stateManager = giveDon(stateManager, PlayerId.PLAYER_1, maxCost);

          // Play the first stage card
          let zoneManager = new ZoneManager(stateManager, eventEmitter);
          const result1 = handlePlayCard(
            stateManager,
            zoneManager,
            eventEmitter,
            PlayerId.PLAYER_1,
            stage1.id
          );

          expect(result1.success).toBe(true);

          // Verify first stage is in stage area
          const player1 = result1.newState.getPlayer(PlayerId.PLAYER_1);
          expect(player1?.zones.stageArea?.id).toBe(stage1.id);

          // Verify first stage is not in trash
          const stage1InTrash = player1?.zones.trash.find(c => c.id === stage1.id);
          expect(stage1InTrash).toBeUndefined();

          // Give player more DON for second card
          stateManager = giveDon(result1.newState, PlayerId.PLAYER_1, stage2Props.cost);

          // Play the second stage card
          zoneManager = new ZoneManager(stateManager, eventEmitter);
          const result2 = handlePlayCard(
            stateManager,
            zoneManager,
            eventEmitter,
            PlayerId.PLAYER_1,
            stage2.id
          );

          expect(result2.success).toBe(true);

          // Property: Second stage should be in stage area
          const player2 = result2.newState.getPlayer(PlayerId.PLAYER_1);
          expect(player2?.zones.stageArea?.id).toBe(stage2.id);

          // Property: First stage should be in trash
          const stage1InTrashAfter = player2?.zones.trash.find(c => c.id === stage1.id);
          expect(stage1InTrashAfter).toBeDefined();
          expect(stage1InTrashAfter?.zone).toBe(ZoneId.TRASH);

          // Property: Only one stage should be in stage area
          expect(player2?.zones.stageArea).toBeDefined();
          expect(player2?.zones.stageArea?.id).not.toBe(stage1.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain single stage limit regardless of card properties', () => {
    fc.assert(
      fc.property(
        // Generate array of 2-5 stage cards
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 15 }),
            cost: fc.integer({ min: 0, max: 5 }),
            color: fc.constantFrom(...Object.values(Color)),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (stageProps) => {
          // Create initial game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          // Create stage cards
          const stages = stageProps.map((props, index) =>
            createStageCard(
              `stage-${index}-${props.name}`,
              props.name,
              props.cost,
              props.color
            )
          );

          // Add all cards to player's hand
          for (const stage of stages) {
            stateManager = addCardToHand(stateManager, stage);
          }

          // Give player enough DON
          const maxCost = Math.max(...stageProps.map(s => s.cost));
          stateManager = giveDon(stateManager, PlayerId.PLAYER_1, maxCost);

          // Play each stage card in sequence
          let currentState = stateManager;
          for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];

            // Ensure enough DON
            currentState = giveDon(currentState, PlayerId.PLAYER_1, stageProps[i].cost);

            const zoneManager = new ZoneManager(currentState, eventEmitter);
            const result = handlePlayCard(
              currentState,
              zoneManager,
              eventEmitter,
              PlayerId.PLAYER_1,
              stage.id
            );

            if (result.success) {
              currentState = result.newState;

              // Property: Only the most recently played stage should be in stage area
              const player = currentState.getPlayer(PlayerId.PLAYER_1);
              expect(player?.zones.stageArea?.id).toBe(stage.id);

              // Property: All previously played stages should be in trash
              for (let j = 0; j < i; j++) {
                const previousStage = stages[j];
                const inTrash = player?.zones.trash.find(c => c.id === previousStage.id);
                expect(inTrash).toBeDefined();
              }

              // Property: Only one stage in stage area
              expect(player?.zones.stageArea).toBeDefined();
              const stageCount = player?.zones.stageArea ? 1 : 0;
              expect(stageCount).toBe(1);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
