/**
 * Property-Based Tests for Game Over Checking After Attacks
 * 
 * Feature: ai-battle-integration
 * Property 10: Game Over After Winning Attack
 * Validates: Requirements 7.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import { BattleSystem } from '../battle/BattleSystem';
import {
  PlayerId,
  CardInstance,
  CardState,
  ZoneId,
  CardCategory,
  Phase,
} from '../core/types';
import { createTestCard } from '../utils/testHelpers';

/**
 * Generator for a game state where an attack will reduce opponent's life to zero
 */
function gameStateWithWinningAttack() {
  return fc.record({
    attackerPower: fc.integer({ min: 5000, max: 10000 }),
    defenderPower: fc.integer({ min: 1000, max: 4999 }), // Ensure attacker wins
    remainingLife: fc.integer({ min: 1, max: 2 }), // Small amount of life
    attackerHasDoubleAttack: fc.boolean(),
  }).map(({ attackerPower, defenderPower, remainingLife, attackerHasDoubleAttack }) => {
    const attackerId = 'attacker-1';
    const defenderId = 'defender-leader-1';
    
    // Create attacker (active character with enough power to win)
    const attacker = createTestCard({
      id: attackerId,
      name: 'Test Attacker',
      category: CardCategory.CHARACTER,
      basePower: attackerPower,
      baseCost: 3,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      keywords: attackerHasDoubleAttack ? ['Double Attack'] : [],
    });
    
    // Create defender leader
    const defender = createTestCard({
      id: defenderId,
      name: 'Test Defender Leader',
      category: CardCategory.LEADER,
      basePower: defenderPower,
      lifeValue: 5,
      controller: PlayerId.PLAYER_2,
      zone: ZoneId.LEADER_AREA,
      state: CardState.ACTIVE,
    });
    
    // Create life cards - ensure the attack will reduce life to zero
    // If attacker has Double Attack, we need remainingLife <= 2
    // Otherwise, we need remainingLife <= 1
    const effectiveRemainingLife = attackerHasDoubleAttack 
      ? Math.min(remainingLife, 2) 
      : Math.min(remainingLife, 1);
    
    const lifeCards: CardInstance[] = [];
    for (let i = 0; i < effectiveRemainingLife; i++) {
      lifeCards.push(createTestCard({
        id: `life-${i}`,
        name: `Life Card ${i}`,
        category: CardCategory.CHARACTER,
        basePower: 1000,
        baseCost: 1,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.LIFE,
        state: CardState.NONE,
      }));
    }
    
    // Create initial game state
    const initialState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [
              createTestCard({
                id: 'p1-life-1',
                name: 'P1 Life Card 1',
                category: CardCategory.CHARACTER,
                basePower: 1000,
                baseCost: 1,
                controller: PlayerId.PLAYER_1,
                zone: ZoneId.LIFE,
                state: CardState.NONE,
              }),
            ],
            donDeck: [],
            costArea: [],
            leaderArea: createTestCard({
              id: 'leader-1',
              name: 'Player 1 Leader',
              category: CardCategory.LEADER,
              basePower: 5000,
              lifeValue: 5,
              controller: PlayerId.PLAYER_1,
              zone: ZoneId.LEADER_AREA,
              state: CardState.ACTIVE,
            }),
            characterArea: [attacker],
            stageArea: null,
          },
          flags: new Map(),
        }],
        [PlayerId.PLAYER_2, {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: lifeCards,
            donDeck: [],
            costArea: [],
            leaderArea: defender,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
      ]),
      activePlayer: PlayerId.PLAYER_1,
      phase: Phase.MAIN,
      turnNumber: 2, // Turn 2 to avoid first turn battle restriction
      pendingTriggers: [],
      gameOver: false,
      winner: null,
      history: [],
      loopGuardState: {
        stateHashes: new Map(),
        maxRepeats: 4,
      },
    };
    
    return {
      state: new GameStateManager(initialState),
      attackerId,
      defenderId,
      attackerController: PlayerId.PLAYER_1,
      defenderController: PlayerId.PLAYER_2,
      initialLifeCount: effectiveRemainingLife,
      attackerHasDoubleAttack,
    };
  });
}

describe('MainPhase Game Over Property Tests', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;

  beforeEach(() => {
    rules = new RulesContext();
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager();
  });

  /**
   * Property 10: Game Over After Winning Attack
   * For any attack that reduces the opponent's life to zero, the game should end
   * with the attacker's controller as the winner.
   * Validates: Requirements 7.4
   */
  it('Property 10: Game should end with correct winner when attack reduces life to zero', async () => {
    await fc.assert(
      fc.asyncProperty(
        gameStateWithWinningAttack(),
        async ({ state, attackerId, defenderId, attackerController, defenderController, initialLifeCount, attackerHasDoubleAttack }) => {
          // Verify initial state
          expect(state.isGameOver()).toBe(false);
          expect(state.getState().winner).toBeNull();
          
          const initialDefenderLife = state.getPlayer(defenderController)!.zones.life.length;
          expect(initialDefenderLife).toBe(initialLifeCount);
          
          // Execute attack
          const battleSystem = new BattleSystem(state, rules, eventEmitter);
          const result = await battleSystem.executeAttack(attackerId, defenderId);
          
          // Get updated state
          const updatedState = battleSystem.getStateManager();
          
          // Calculate expected damage
          const expectedDamage = attackerHasDoubleAttack ? 2 : 1;
          const actualDamage = Math.min(expectedDamage, initialLifeCount);
          
          // Verify damage was dealt
          expect(result.damageDealt).toBe(actualDamage);
          
          // Property: If life reaches zero, game should be over
          const finalDefenderLife = updatedState.getPlayer(defenderController)!.zones.life.length;
          
          if (finalDefenderLife === 0) {
            // Property: Game should be marked as over
            expect(updatedState.isGameOver()).toBe(true);
            
            // Property: Winner should be the attacker's controller
            expect(updatedState.getState().winner).toBe(attackerController);
            
            // Property: Winner should NOT be the defender's controller
            expect(updatedState.getState().winner).not.toBe(defenderController);
          } else {
            // If life didn't reach zero, game should continue
            expect(updatedState.isGameOver()).toBe(false);
            expect(updatedState.getState().winner).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify game over is checked immediately after attack
   * This ensures the check happens synchronously, not deferred
   */
  it('Property 10 (variant): Game over should be detected immediately after winning attack', async () => {
    await fc.assert(
      fc.asyncProperty(
        gameStateWithWinningAttack().filter(
          ({ initialLifeCount, attackerHasDoubleAttack }) => {
            // Only test cases where we KNOW the attack will win
            const damage = attackerHasDoubleAttack ? 2 : 1;
            return initialLifeCount <= damage;
          }
        ),
        async ({ state, attackerId, defenderId, attackerController }) => {
          // Execute attack
          const battleSystem = new BattleSystem(state, rules, eventEmitter);
          const result = await battleSystem.executeAttack(attackerId, defenderId);
          
          // Get updated state immediately after attack
          const updatedState = battleSystem.getStateManager();
          
          // Property: Game should be over immediately
          expect(updatedState.isGameOver()).toBe(true);
          
          // Property: Winner should be set immediately
          expect(updatedState.getState().winner).toBe(attackerController);
          
          // Property: Battle should have succeeded
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify game continues when life doesn't reach zero
   */
  it('Property 10 (inverse): Game should continue when attack does not reduce life to zero', async () => {
    // Create a state where defender has more life than damage dealt
    const stateGen = fc.record({
      attackerPower: fc.integer({ min: 5000, max: 10000 }),
      defenderPower: fc.integer({ min: 1000, max: 4999 }),
      remainingLife: fc.integer({ min: 3, max: 5 }), // More life than can be dealt in one attack
    }).map(({ attackerPower, defenderPower, remainingLife }) => {
      const attackerId = 'attacker-1';
      const defenderId = 'defender-leader-1';
      
      const attacker = createTestCard({
        id: attackerId,
        name: 'Test Attacker',
        category: CardCategory.CHARACTER,
        basePower: attackerPower,
        baseCost: 3,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        keywords: [], // No Double Attack
      });
      
      const defender = createTestCard({
        id: defenderId,
        name: 'Test Defender Leader',
        category: CardCategory.LEADER,
        basePower: defenderPower,
        lifeValue: 5,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.LEADER_AREA,
        state: CardState.ACTIVE,
      });
      
      const lifeCards: CardInstance[] = [];
      for (let i = 0; i < remainingLife; i++) {
        lifeCards.push(createTestCard({
          id: `life-${i}`,
          name: `Life Card ${i}`,
          category: CardCategory.CHARACTER,
          basePower: 1000,
          baseCost: 1,
          controller: PlayerId.PLAYER_2,
          zone: ZoneId.LIFE,
          state: CardState.NONE,
        }));
      }
      
      const initialState = {
        players: new Map([
          [PlayerId.PLAYER_1, {
            id: PlayerId.PLAYER_1,
            zones: {
              deck: [],
              hand: [],
              trash: [],
              life: [
                createTestCard({
                  id: 'p1-life-1',
                  name: 'P1 Life Card 1',
                  category: CardCategory.CHARACTER,
                  basePower: 1000,
                  baseCost: 1,
                  controller: PlayerId.PLAYER_1,
                  zone: ZoneId.LIFE,
                  state: CardState.NONE,
                }),
              ],
              donDeck: [],
              costArea: [],
              leaderArea: createTestCard({
                id: 'leader-1',
                name: 'Player 1 Leader',
                category: CardCategory.LEADER,
                basePower: 5000,
                lifeValue: 5,
                controller: PlayerId.PLAYER_1,
                zone: ZoneId.LEADER_AREA,
                state: CardState.ACTIVE,
              }),
              characterArea: [attacker],
              stageArea: null,
            },
            flags: new Map(),
          }],
          [PlayerId.PLAYER_2, {
            id: PlayerId.PLAYER_2,
            zones: {
              deck: [],
              hand: [],
              trash: [],
              life: lifeCards,
              donDeck: [],
              costArea: [],
              leaderArea: defender,
              characterArea: [],
              stageArea: null,
            },
            flags: new Map(),
          }],
        ]),
        activePlayer: PlayerId.PLAYER_1,
        phase: Phase.MAIN,
        turnNumber: 2,
        pendingTriggers: [],
        gameOver: false,
        winner: null,
        history: [],
        loopGuardState: {
          stateHashes: new Map(),
          maxRepeats: 4,
        },
      };
      
      return {
        state: new GameStateManager(initialState),
        attackerId,
        defenderId,
        initialLifeCount: remainingLife,
      };
    });

    await fc.assert(
      fc.asyncProperty(
        stateGen,
        async ({ state, attackerId, defenderId, initialLifeCount }) => {
          // Execute attack
          const battleSystem = new BattleSystem(state, rules, eventEmitter);
          const result = await battleSystem.executeAttack(attackerId, defenderId);
          
          // Get updated state
          const updatedState = battleSystem.getStateManager();
          
          // Verify damage was dealt but not enough to win
          expect(result.damageDealt).toBeGreaterThan(0);
          expect(result.damageDealt).toBeLessThan(initialLifeCount);
          
          // Property: Game should NOT be over
          expect(updatedState.isGameOver()).toBe(false);
          
          // Property: Winner should still be null
          expect(updatedState.getState().winner).toBeNull();
          
          // Property: Defender should still have life remaining
          const finalDefenderLife = updatedState.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
          expect(finalDefenderLife).toBeGreaterThan(0);
          expect(finalDefenderLife).toBe(initialLifeCount - result.damageDealt);
        }
      ),
      { numRuns: 100 }
    );
  });
});
