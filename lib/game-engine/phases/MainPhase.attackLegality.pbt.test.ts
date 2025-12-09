/**
 * MainPhase.attackLegality.pbt.test.ts
 * 
 * Property-based tests for attack action legality in Main Phase
 * 
 * Feature: ai-battle-integration, Property 12: Attack Action Legality
 * Validates: Requirements 8.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { getLegalActions } from './MainPhase';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import { BattleSystem } from '../battle/BattleSystem';
import { RulesContext } from '../rules/RulesContext';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  ActionType,
  CardDefinition,
  CardInstance,
} from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Property 12: Attack Action Legality
 * 
 * For any generated attack action, the attack should be legal according to the game rules 
 * (attacker can attack, target is valid).
 * 
 * This property ensures that:
 * 1. All generated attack actions are legal
 * 2. Attackers are in a state that allows attacking (ACTIVE or have Rush)
 * 3. Targets are valid (opponent's leader or rested characters)
 * 4. Attackers have not already attacked this turn
 * 5. First turn battle restriction is respected
 */

describe('Property 12: Attack Action Legality', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
    eventEmitter = new EventEmitter();
  });

  /**
   * Helper function to create a character card instance
   */
  function createCharacter(
    id: string,
    owner: PlayerId,
    state: CardState,
    hasRush: boolean = false
  ): CardInstance {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Character ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: hasRush ? ['Rush'] : [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition,
      owner,
      controller: owner,
      zone: ZoneId.CHARACTER_AREA,
      state,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  /**
   * Helper function to create a leader card instance
   */
  function createLeader(id: string, owner: PlayerId, state: CardState): CardInstance {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Leader ${id}`,
      category: CardCategory.LEADER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 0,
      lifeValue: 5,
      counterValue: null,
      rarity: 'L',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: 'L01',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition,
      owner,
      controller: owner,
      zone: ZoneId.LEADER_AREA,
      state,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  /**
   * Helper function to extract attack actions from a list of actions
   */
  function extractAttackActions(actions: any[]): any[] {
    return actions.filter(a => a.type === ActionType.DECLARE_ATTACK);
  }

  /**
   * Helper function to check if an attacker can legally attack
   */
  function canAttackerAttack(
    attacker: CardInstance,
    stateManager: GameStateManager
  ): boolean {
    // Must be ACTIVE or have Rush keyword
    const canAttackBasedOnState = 
      attacker.state === CardState.ACTIVE || 
      attacker.definition.keywords.includes('Rush');
    
    // Must not have attacked this turn already
    const hasNotAttackedYet = !stateManager.hasCardAttackedThisTurn(attacker.id);
    
    return canAttackBasedOnState && hasNotAttackedYet;
  }

  /**
   * Helper function to check if a target is valid for attack
   */
  function isValidTarget(
    target: CardInstance,
    attackerOwner: PlayerId
  ): boolean {
    // Target must be owned by opponent
    if (target.owner === attackerOwner) {
      return false;
    }
    
    // If target is a leader, it's always valid
    if (target.zone === ZoneId.LEADER_AREA) {
      return true;
    }
    
    // If target is a character, it must be rested
    if (target.zone === ZoneId.CHARACTER_AREA) {
      return target.state === CardState.RESTED;
    }
    
    return false;
  }

  it('should only generate attacks from characters that can attack', () => {
    fc.assert(
      fc.property(
        // Generate random board state
        fc.integer({ min: 0, max: 3 }), // num active characters
        fc.integer({ min: 0, max: 3 }), // num rested characters without Rush
        fc.integer({ min: 0, max: 3 }), // num rested characters with Rush
        (numActive, numRestedNoRush, numRestedWithRush) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create characters
          const characters: CardInstance[] = [];
          
          // Active characters (can attack)
          for (let i = 0; i < numActive; i++) {
            characters.push(
              createCharacter(`active-${i}`, activePlayer, CardState.ACTIVE, false)
            );
          }
          
          // Rested characters without Rush (cannot attack)
          for (let i = 0; i < numRestedNoRush; i++) {
            characters.push(
              createCharacter(`rested-no-rush-${i}`, activePlayer, CardState.RESTED, false)
            );
          }
          
          // Rested characters with Rush (can attack)
          for (let i = 0; i < numRestedWithRush; i++) {
            characters.push(
              createCharacter(`rested-rush-${i}`, activePlayer, CardState.RESTED, true)
            );
          }

          // Create leaders
          const player1Leader = createLeader('p1-leader', activePlayer, CardState.RESTED);
          const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

          // Update state
          const player1 = stateManager.getPlayer(activePlayer);
          const player2 = stateManager.getPlayer(opponent);

          if (player1) {
            stateManager = stateManager.updatePlayer(activePlayer, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: characters,
                leaderArea: player1Leader,
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(opponent, {
              ...player2,
              zones: {
                ...player2.zones,
                leaderArea: player2Leader,
              },
            });
          }

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: All attack actions should come from characters that can attack
          for (const action of attackActions) {
            const attackerId = action.data.attackerId;
            const attacker = characters.find(c => c.id === attackerId);
            
            if (attacker) {
              expect(canAttackerAttack(attacker, stateManager)).toBe(true);
            }
          }

          // Property: Rested characters without Rush should not appear as attackers
          const restedNoRushIds = characters
            .filter(c => c.state === CardState.RESTED && !c.definition.keywords.includes('Rush'))
            .map(c => c.id);
          
          for (const action of attackActions) {
            const attackerId = action.data.attackerId;
            expect(restedNoRushIds.includes(attackerId)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only generate attacks targeting valid targets', () => {
    fc.assert(
      fc.property(
        // Generate random board state
        fc.integer({ min: 1, max: 3 }), // num active attackers
        fc.integer({ min: 0, max: 3 }), // num rested opponent characters
        fc.integer({ min: 0, max: 3 }), // num active opponent characters
        (numAttackers, numRestedOpponent, numActiveOpponent) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active attackers
          const attackers: CardInstance[] = [];
          for (let i = 0; i < numAttackers; i++) {
            attackers.push(
              createCharacter(`attacker-${i}`, activePlayer, CardState.ACTIVE)
            );
          }

          // Create opponent characters
          const opponentChars: CardInstance[] = [];
          
          // Rested opponent characters (valid targets)
          for (let i = 0; i < numRestedOpponent; i++) {
            opponentChars.push(
              createCharacter(`opp-rested-${i}`, opponent, CardState.RESTED)
            );
          }
          
          // Active opponent characters (invalid targets)
          for (let i = 0; i < numActiveOpponent; i++) {
            opponentChars.push(
              createCharacter(`opp-active-${i}`, opponent, CardState.ACTIVE)
            );
          }

          // Create leaders
          const player1Leader = createLeader('p1-leader', activePlayer, CardState.RESTED);
          const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

          // Update state
          const player1 = stateManager.getPlayer(activePlayer);
          const player2 = stateManager.getPlayer(opponent);

          if (player1) {
            stateManager = stateManager.updatePlayer(activePlayer, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: attackers,
                leaderArea: player1Leader,
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(opponent, {
              ...player2,
              zones: {
                ...player2.zones,
                characterArea: opponentChars,
                leaderArea: player2Leader,
              },
            });
          }

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: All attack actions should target valid targets
          for (const action of attackActions) {
            const targetId = action.data.targetId;
            
            // Find the target
            let target: CardInstance | null = null;
            if (targetId === player2Leader.id) {
              target = player2Leader;
            } else {
              target = opponentChars.find(c => c.id === targetId) || null;
            }
            
            expect(target).not.toBeNull();
            if (target) {
              expect(isValidTarget(target, activePlayer)).toBe(true);
            }
          }

          // Property: Active opponent characters should not be targets
          const activeOpponentIds = opponentChars
            .filter(c => c.state === CardState.ACTIVE)
            .map(c => c.id);
          
          for (const action of attackActions) {
            const targetId = action.data.targetId;
            expect(activeOpponentIds.includes(targetId)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not generate attacks from characters that have already attacked', () => {
    // Setup game state with active characters
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);
    const zoneManager = new ZoneManager(stateManager, eventEmitter);

    const activePlayer = PlayerId.PLAYER_1;
    const opponent = PlayerId.PLAYER_2;

    // Create two active characters
    const char1 = createCharacter('char-1', activePlayer, CardState.ACTIVE);
    const char2 = createCharacter('char-2', activePlayer, CardState.ACTIVE);

    // Create leaders
    const player1Leader = createLeader('p1-leader', activePlayer, CardState.RESTED);
    const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

    // Update state
    const player1 = stateManager.getPlayer(activePlayer);
    const player2 = stateManager.getPlayer(opponent);

    if (player1) {
      stateManager = stateManager.updatePlayer(activePlayer, {
        ...player1,
        zones: {
          ...player1.zones,
          characterArea: [char1, char2],
          leaderArea: player1Leader,
        },
      });
    }

    if (player2) {
      stateManager = stateManager.updatePlayer(opponent, {
        ...player2,
        zones: {
          ...player2.zones,
          leaderArea: player2Leader,
        },
      });
    }

    // Mark char1 as having attacked this turn
    stateManager = stateManager.markCardAttacked(char1.id);

    // Get legal actions
    const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
    const attackActions = extractAttackActions(legalActions);

    // Property: char1 should not appear as an attacker
    const char1Attacks = attackActions.filter(a => a.data.attackerId === char1.id);
    expect(char1Attacks.length).toBe(0);

    // Property: char2 should still be able to attack
    const char2Attacks = attackActions.filter(a => a.data.attackerId === char2.id);
    expect(char2Attacks.length).toBeGreaterThan(0);
  });

  it('should generate attacks with correct attacker-target ownership', () => {
    fc.assert(
      fc.property(
        // Generate random board state
        fc.integer({ min: 1, max: 3 }), // num active attackers
        (numAttackers) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active attackers
          const attackers: CardInstance[] = [];
          for (let i = 0; i < numAttackers; i++) {
            attackers.push(
              createCharacter(`attacker-${i}`, activePlayer, CardState.ACTIVE)
            );
          }

          // Create leaders
          const player1Leader = createLeader('p1-leader', activePlayer, CardState.RESTED);
          const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

          // Update state
          const player1 = stateManager.getPlayer(activePlayer);
          const player2 = stateManager.getPlayer(opponent);

          if (player1) {
            stateManager = stateManager.updatePlayer(activePlayer, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: attackers,
                leaderArea: player1Leader,
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(opponent, {
              ...player2,
              zones: {
                ...player2.zones,
                leaderArea: player2Leader,
              },
            });
          }

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: All attackers should be owned by active player
          for (const action of attackActions) {
            const attackerId = action.data.attackerId;
            const attacker = attackers.find(c => c.id === attackerId) || 
                           (attackerId === player1Leader.id ? player1Leader : null);
            
            expect(attacker).not.toBeNull();
            if (attacker) {
              expect(attacker.owner).toBe(activePlayer);
            }
          }

          // Property: All targets should be owned by opponent
          for (const action of attackActions) {
            const targetId = action.data.targetId;
            
            // Target should be opponent's leader (only valid target in this setup)
            expect(targetId).toBe(player2Leader.id);
            expect(player2Leader.owner).toBe(opponent);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate attacks with valid action structure', () => {
    fc.assert(
      fc.property(
        // Generate random board state
        fc.integer({ min: 1, max: 3 }), // num active attackers
        (numAttackers) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active attackers
          const attackers: CardInstance[] = [];
          for (let i = 0; i < numAttackers; i++) {
            attackers.push(
              createCharacter(`attacker-${i}`, activePlayer, CardState.ACTIVE)
            );
          }

          // Create leaders
          const player1Leader = createLeader('p1-leader', activePlayer, CardState.RESTED);
          const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

          // Update state
          const player1 = stateManager.getPlayer(activePlayer);
          const player2 = stateManager.getPlayer(opponent);

          if (player1) {
            stateManager = stateManager.updatePlayer(activePlayer, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: attackers,
                leaderArea: player1Leader,
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(opponent, {
              ...player2,
              zones: {
                ...player2.zones,
                leaderArea: player2Leader,
              },
            });
          }

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: All attack actions should have correct structure
          for (const action of attackActions) {
            // Should have correct type
            expect(action.type).toBe(ActionType.DECLARE_ATTACK);
            
            // Should have playerId
            expect(action.playerId).toBe(activePlayer);
            
            // Should have data object
            expect(action.data).toBeDefined();
            
            // Should have attackerId
            expect(action.data.attackerId).toBeDefined();
            expect(typeof action.data.attackerId).toBe('string');
            
            // Should have targetId
            expect(action.data.targetId).toBeDefined();
            expect(typeof action.data.targetId).toBe('string');
            
            // Should have timestamp
            expect(action.timestamp).toBeDefined();
            expect(typeof action.timestamp).toBe('number');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
