/**
 * Property-Based Tests for Attack Execution in Main Phase
 * 
 * Feature: ai-battle-integration
 * Property 3: Attack Execution State Change
 * Validates: Requirements 2.3
 * 
 * Property 4: Character K.O. on Attack
 * Validates: Requirements 2.4
 * 
 * Property 5: Life Damage Processing
 * Validates: Requirements 2.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { GameStateManager } from '../core/GameState';
import { runMainPhase, getLegalActions } from './MainPhase';
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
  ActionType,
  Phase,
} from '../core/types';
import { createTestCard, createTestDon } from '../utils/testHelpers';

/**
 * Generator for a game state with attackable characters
 */
function gameStateWithAttackableCharacters() {
  return fc.record({
    attackerPower: fc.integer({ min: 1000, max: 10000 }),
    defenderPower: fc.integer({ min: 1000, max: 10000 }),
    defenderIsCharacter: fc.boolean(),
    attackerHasDoubleAttack: fc.boolean(),
    defenderLife: fc.integer({ min: 1, max: 5 }),
  }).map(({ attackerPower, defenderPower, defenderIsCharacter, attackerHasDoubleAttack, defenderLife }) => {
    // Create a minimal game state with an attacker and defender
    const attackerId = 'attacker-1';
    const defenderId = defenderIsCharacter ? 'defender-char-1' : 'defender-leader-1';
    
    // Create attacker (active character)
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
    
    // Create defender
    let defender: CardInstance;
    if (defenderIsCharacter) {
      defender = createTestCard({
        id: defenderId,
        name: 'Test Defender Character',
        category: CardCategory.CHARACTER,
        basePower: defenderPower,
        baseCost: 3,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.RESTED,
      });
    } else {
      defender = createTestCard({
        id: defenderId,
        name: 'Test Defender Leader',
        category: CardCategory.LEADER,
        basePower: defenderPower,
        lifeValue: 5,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.LEADER_AREA,
        state: CardState.ACTIVE,
      });
    }
    
    // Create life cards for defender if it's a leader
    const lifeCards: CardInstance[] = [];
    if (!defenderIsCharacter) {
      for (let i = 0; i < defenderLife; i++) {
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
            life: [],
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
            leaderArea: defenderIsCharacter ? createTestCard({
              id: 'leader-2',
              name: 'Player 2 Leader',
              category: CardCategory.LEADER,
              basePower: 5000,
              lifeValue: 5,
              controller: PlayerId.PLAYER_2,
              zone: ZoneId.LEADER_AREA,
              state: CardState.ACTIVE,
            }) : defender,
            characterArea: defenderIsCharacter ? [defender] : [],
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
      attackerPower,
      defenderPower,
      defenderIsCharacter,
      attackerHasDoubleAttack,
      defenderLife,
    };
  });
}

describe('MainPhase Attack Execution Property Tests', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;
  let zoneManager: ZoneManager;

  beforeEach(() => {
    rules = new RulesContext();
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager();
  });

  /**
   * Property 3: Attack Execution State Change
   * For any valid attack action, executing the attack should result in the attacker being rested
   * and appropriate damage/K.O. effects being applied.
   * Validates: Requirements 2.3
   */
  it('Property 3: Attack execution should rest attacker and apply damage/K.O. effects', () => {
    fc.assert(
      fc.property(
        gameStateWithAttackableCharacters(),
        ({ state, attackerId, defenderId, attackerPower, defenderPower, defenderIsCharacter }) => {
          // Get initial attacker state
          const initialAttacker = state.getCard(attackerId);
          expect(initialAttacker).toBeDefined();
          expect(initialAttacker!.state).toBe(CardState.ACTIVE);
          
          // Create BattleSystem and execute attack
          const battleSystem = new BattleSystem(state, rules, eventEmitter);
          const result = battleSystem.executeAttack(attackerId, defenderId);
          
          // Get updated state
          const updatedState = battleSystem.getStateManager();
          const updatedAttacker = updatedState.getCard(attackerId);
          
          // Property: Attacker should be rested after attack
          expect(updatedAttacker).toBeDefined();
          expect(updatedAttacker!.state).toBe(CardState.RESTED);
          
          // Property: If attacker power >= defender power, damage/K.O. should occur
          if (attackerPower >= defenderPower) {
            if (defenderIsCharacter) {
              // Defender should be K.O.'d (moved to trash)
              const updatedDefender = updatedState.getCard(defenderId);
              expect(updatedDefender).toBeDefined();
              expect(updatedDefender!.zone).toBe(ZoneId.TRASH);
              expect(result.defenderKOd).toBe(true);
            } else {
              // Leader should take damage (life cards moved)
              const player2 = updatedState.getPlayer(PlayerId.PLAYER_2);
              expect(player2).toBeDefined();
              
              // Life should decrease or hand should increase
              const initialPlayer2 = state.getPlayer(PlayerId.PLAYER_2);
              const lifeDiff = initialPlayer2!.zones.life.length - player2!.zones.life.length;
              expect(lifeDiff).toBeGreaterThan(0);
              expect(result.damageDealt).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Character K.O. on Attack
   * For any attack where the attacker's power exceeds the defender's power and the defender is a character,
   * the defender should be moved to the trash zone.
   * Validates: Requirements 2.4
   */
  it('Property 4: Character should be K.O.\'d when attacker power exceeds defender power', () => {
    fc.assert(
      fc.property(
        gameStateWithAttackableCharacters().filter(
          ({ defenderIsCharacter, attackerPower, defenderPower }) =>
            defenderIsCharacter && attackerPower >= defenderPower
        ),
        ({ state, attackerId, defenderId }) => {
          // Get initial defender
          const initialDefender = state.getCard(defenderId);
          expect(initialDefender).toBeDefined();
          expect(initialDefender!.zone).toBe(ZoneId.CHARACTER_AREA);
          
          // Execute attack
          const battleSystem = new BattleSystem(state, rules, eventEmitter);
          const result = battleSystem.executeAttack(attackerId, defenderId);
          
          // Get updated state
          const updatedState = battleSystem.getStateManager();
          const updatedDefender = updatedState.getCard(defenderId);
          
          // Property: Defender should be in trash zone
          expect(updatedDefender).toBeDefined();
          expect(updatedDefender!.zone).toBe(ZoneId.TRASH);
          
          // Property: Battle result should indicate defender was K.O.'d
          expect(result.defenderKOd).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Life Damage Processing
   * For any attack that deals damage to a leader, the number of life cards in the leader's life zone
   * should decrease by the damage amount, and those cards should move to hand or trash.
   * Validates: Requirements 2.5
   */
  it('Property 5: Life damage should move life cards to hand', () => {
    fc.assert(
      fc.property(
        gameStateWithAttackableCharacters().filter(
          ({ defenderIsCharacter, attackerPower, defenderPower, defenderLife }) =>
            !defenderIsCharacter && attackerPower >= defenderPower && defenderLife > 0
        ),
        ({ state, attackerId, defenderId, attackerHasDoubleAttack, defenderLife }) => {
          // Get initial life count
          const initialPlayer2 = state.getPlayer(PlayerId.PLAYER_2);
          expect(initialPlayer2).toBeDefined();
          const initialLifeCount = initialPlayer2!.zones.life.length;
          const initialHandCount = initialPlayer2!.zones.hand.length;
          const initialTrashCount = initialPlayer2!.zones.trash.length;
          
          // Execute attack
          const battleSystem = new BattleSystem(state, rules, eventEmitter);
          const result = battleSystem.executeAttack(attackerId, defenderId);
          
          // Get updated state
          const updatedState = battleSystem.getStateManager();
          const updatedPlayer2 = updatedState.getPlayer(PlayerId.PLAYER_2);
          expect(updatedPlayer2).toBeDefined();
          
          // Calculate expected damage (capped at available life)
          const expectedDamage = attackerHasDoubleAttack ? 2 : 1;
          const actualDamage = Math.min(expectedDamage, initialLifeCount);
          
          // Property: Life count should decrease by actual damage dealt
          const finalLifeCount = updatedPlayer2!.zones.life.length;
          const lifeLost = initialLifeCount - finalLifeCount;
          expect(lifeLost).toBe(actualDamage);
          
          // Property: Cards should move to hand or trash (total cards conserved)
          const finalHandCount = updatedPlayer2!.zones.hand.length;
          const finalTrashCount = updatedPlayer2!.zones.trash.length;
          const movedCards = (finalHandCount - initialHandCount) + (finalTrashCount - initialTrashCount);
          expect(movedCards).toBe(lifeLost);
          
          // Property: Battle result should report correct damage
          expect(result.damageDealt).toBe(actualDamage);
        }
      ),
      { numRuns: 100 }
    );
  });
});
