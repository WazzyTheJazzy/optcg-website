/**
 * MainPhase.attackGeneration.pbt.test.ts
 * 
 * Property-based tests for attack action generation in Main Phase
 * 
 * Feature: ai-battle-integration, Property 1: Attack Action Completeness
 * Validates: Requirements 1.1, 1.2
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
  AttackAction,
} from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Property 1: Attack Action Completeness
 * 
 * For any game state where the AI is in the main phase, the set of generated 
 * attack actions should include exactly one action for each valid (attacker, target) 
 * pair where the attacker can legally attack the target.
 * 
 * This property ensures that:
 * 1. All legal attacks are generated (completeness)
 * 2. No illegal attacks are generated (correctness)
 * 3. Each valid (attacker, target) pair appears exactly once (no duplicates)
 */

describe('Property 1: Attack Action Completeness', () => {
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
   * Helper function to count attack actions in a list of actions
   */
  function countAttackActions(actions: any[]): number {
    return actions.filter(a => a.type === ActionType.DECLARE_ATTACK).length;
  }

  /**
   * Helper function to extract attack actions from a list of actions
   */
  function extractAttackActions(actions: any[]): any[] {
    return actions.filter(a => a.type === ActionType.DECLARE_ATTACK);
  }

  /**
   * Helper function to check if an attack action exists for a given attacker-target pair
   */
  function hasAttackAction(
    actions: any[],
    attackerId: string,
    targetId: string
  ): boolean {
    return actions.some(
      a => a.data?.attackerId === attackerId && a.data?.targetId === targetId
    );
  }

  /**
   * Helper function to compute expected attack count based on game rules
   * This computes what attacks SHOULD be generated based on the game state
   */
  function computeExpectedAttacks(
    stateManager: GameStateManager,
    activePlayer: PlayerId
  ): { attackerId: string; targetId: string }[] {
    const expected: { attackerId: string; targetId: string }[] = [];
    const player = stateManager.getPlayer(activePlayer);
    const opponent = activePlayer === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
    const opponentPlayer = stateManager.getPlayer(opponent);
    
    if (!player || !opponentPlayer) return expected;

    // Get all potential attackers (leader + characters)
    const potentialAttackers = [
      player.zones.leaderArea,
      ...player.zones.characterArea,
    ].filter((card): card is CardInstance => card !== null && card !== undefined);

    // For each potential attacker, check if it can attack
    for (const attacker of potentialAttackers) {
      // Check if attacker can attack (must be active or have Rush)
      const canAttack = attacker.state === CardState.ACTIVE || 
                       attacker.definition.keywords.includes('Rush');
      
      if (canAttack) {
        // Can always attack opponent's leader
        if (opponentPlayer.zones.leaderArea) {
          expected.push({
            attackerId: attacker.id,
            targetId: opponentPlayer.zones.leaderArea.id,
          });
        }
        
        // Can attack rested opponent characters
        const restedCharacters = opponentPlayer.zones.characterArea.filter(
          card => card.state === CardState.RESTED
        );
        for (const target of restedCharacters) {
          expected.push({
            attackerId: attacker.id,
            targetId: target.id,
          });
        }
      }
    }

    return expected;
  }

  it('should generate attack actions for all active characters', () => {
    fc.assert(
      fc.property(
        // Generate a random number of active characters (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate a random number of rested opponent characters (0-5)
        fc.integer({ min: 0, max: 5 }),
        (numActiveChars, numRestedOpponentChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active characters for active player
          const activeChars: CardInstance[] = [];
          for (let i = 0; i < numActiveChars; i++) {
            activeChars.push(
              createCharacter(`active-char-${i}`, activePlayer, CardState.ACTIVE)
            );
          }

          // Create rested characters for opponent
          const restedOpponentChars: CardInstance[] = [];
          for (let i = 0; i < numRestedOpponentChars; i++) {
            restedOpponentChars.push(
              createCharacter(`rested-opp-char-${i}`, opponent, CardState.RESTED)
            );
          }

          // Create leaders (rested so they don't interfere with character-only test)
          const player1Leader = createLeader('p1-leader', activePlayer, CardState.RESTED);
          const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

          // Update state with characters and leaders
          const player1 = stateManager.getPlayer(activePlayer);
          const player2 = stateManager.getPlayer(opponent);

          if (player1) {
            stateManager = stateManager.updatePlayer(activePlayer, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: activeChars,
                leaderArea: player1Leader,
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(opponent, {
              ...player2,
              zones: {
                ...player2.zones,
                characterArea: restedOpponentChars,
                leaderArea: player2Leader,
              },
            });
          }

          // Update battleSystem with new state
          battleSystem.updateStateManager(stateManager);

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Compute expected attacks based on game rules
          const expectedAttacks = computeExpectedAttacks(
            stateManager,
            activePlayer
          );

          // Property: Number of attack actions should match expected count
          expect(attackActions.length).toBe(expectedAttacks.length);

          // Property: Each expected attack should be present in generated actions
          for (const expected of expectedAttacks) {
            expect(
              hasAttackAction(attackActions, expected.attackerId, expected.targetId)
            ).toBe(true);
          }

          // Property: No duplicate attack actions
          const uniqueAttacks = new Set(
            attackActions.map(a => `${a.data?.attackerId}-${a.data?.targetId}`)
          );
          expect(uniqueAttacks.size).toBe(attackActions.length);
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });

  it('should generate attack actions for characters with Rush keyword even if rested', () => {
    fc.assert(
      fc.property(
        // Generate a random number of rested characters with Rush (1-5)
        fc.integer({ min: 1, max: 5 }),
        (numRushChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create rested characters with Rush for active player
          const rushChars: CardInstance[] = [];
          for (let i = 0; i < numRushChars; i++) {
            rushChars.push(
              createCharacter(`rush-char-${i}`, activePlayer, CardState.RESTED, true)
            );
          }

          // Create leaders (rested so they don't interfere with Rush test)
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
                characterArea: rushChars,
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

          // Update battleSystem with new state
          battleSystem.updateStateManager(stateManager);

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: Rush characters should be able to attack even when rested
          // Each Rush character should have at least one attack action (targeting opponent leader)
          expect(attackActions.length).toBeGreaterThanOrEqual(numRushChars);

          // Verify each Rush character can attack the opponent leader
          for (const rushChar of rushChars) {
            expect(
              hasAttackAction(attackActions, rushChar.id, player2Leader.id)
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not generate attack actions for rested characters without Rush', () => {
    fc.assert(
      fc.property(
        // Generate a random number of rested characters without Rush (1-5)
        fc.integer({ min: 1, max: 5 }),
        (numRestedChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create rested characters without Rush for active player
          const restedChars: CardInstance[] = [];
          for (let i = 0; i < numRestedChars; i++) {
            restedChars.push(
              createCharacter(`rested-char-${i}`, activePlayer, CardState.RESTED, false)
            );
          }

          // Create leaders (rested so they don't generate attacks)
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
                characterArea: restedChars,
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

          // Update battleSystem with new state
          battleSystem.updateStateManager(stateManager);

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: Rested characters without Rush should not generate attack actions
          for (const restedChar of restedChars) {
            const hasAttack = attackActions.some(a => a.data?.attackerId === restedChar.id);
            expect(hasAttack).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate attack actions targeting opponent leader and rested characters', () => {
    fc.assert(
      fc.property(
        // Generate random board state
        fc.integer({ min: 1, max: 3 }), // num active attackers
        fc.integer({ min: 0, max: 3 }), // num rested opponent characters
        (numAttackers, numRestedTargets) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active attackers
          const attackers: CardInstance[] = [];
          for (let i = 0; i < numAttackers; i++) {
            attackers.push(
              createCharacter(`attacker-${i}`, activePlayer, CardState.ACTIVE)
            );
          }

          // Create rested opponent characters
          const restedTargets: CardInstance[] = [];
          for (let i = 0; i < numRestedTargets; i++) {
            restedTargets.push(
              createCharacter(`target-${i}`, opponent, CardState.RESTED)
            );
          }

          // Create leaders (rested so they don't interfere with character attack count)
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
                characterArea: restedTargets,
                leaderArea: player2Leader,
              },
            });
          }

          // Update battleSystem with new state
          battleSystem.updateStateManager(stateManager);

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: Each attacker should be able to attack the opponent leader
          for (const attacker of attackers) {
            expect(
              hasAttackAction(attackActions, attacker.id, player2Leader.id)
            ).toBe(true);
          }

          // Property: Each attacker should be able to attack each rested opponent character
          for (const attacker of attackers) {
            for (const target of restedTargets) {
              expect(
                hasAttackAction(attackActions, attacker.id, target.id)
              ).toBe(true);
            }
          }

          // Property: Total attack actions should be numAttackers * (1 + numRestedTargets)
          // (1 for leader + numRestedTargets for rested characters)
          const expectedCount = numAttackers * (1 + numRestedTargets);
          expect(attackActions.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not generate attack actions for active opponent characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }), // num active attackers
        fc.integer({ min: 1, max: 3 }), // num active opponent characters
        (numAttackers, numActiveOpponentChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active attackers
          const attackers: CardInstance[] = [];
          for (let i = 0; i < numAttackers; i++) {
            attackers.push(
              createCharacter(`attacker-${i}`, activePlayer, CardState.ACTIVE)
            );
          }

          // Create active opponent characters (should NOT be targetable)
          const activeOpponentChars: CardInstance[] = [];
          for (let i = 0; i < numActiveOpponentChars; i++) {
            activeOpponentChars.push(
              createCharacter(`active-opp-${i}`, opponent, CardState.ACTIVE)
            );
          }

          // Create leaders (rested so they don't interfere with character attack count)
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
                characterArea: activeOpponentChars,
                leaderArea: player2Leader,
              },
            });
          }

          // Update battleSystem with new state
          battleSystem.updateStateManager(stateManager);

          // Get legal actions
          const legalActions = getLegalActions(stateManager, activePlayer, zoneManager);
          const attackActions = extractAttackActions(legalActions);

          // Property: Active opponent characters should NOT be targetable
          for (const attacker of attackers) {
            for (const activeOpponentChar of activeOpponentChars) {
              expect(
                hasAttackAction(attackActions, attacker.id, activeOpponentChar.id)
              ).toBe(false);
            }
          }

          // Property: Only attacks on opponent leader should be generated
          // (numAttackers attacks on leader, 0 attacks on active characters)
          expect(attackActions.length).toBe(numAttackers);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include leader in attack actions when leader is active', () => {
    // Setup game state with active leader and one active character
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);
    const zoneManager = new ZoneManager(stateManager, eventEmitter);

    const activePlayer = PlayerId.PLAYER_1;
    const opponent = PlayerId.PLAYER_2;

    // Create one active character
    const activeChar = createCharacter('char-1', activePlayer, CardState.ACTIVE);

    // Create leaders
    const player1Leader = createLeader('p1-leader', activePlayer, CardState.ACTIVE);
    const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

    // Update state
    const player1 = stateManager.getPlayer(activePlayer);
    const player2 = stateManager.getPlayer(opponent);

    if (player1) {
      stateManager = stateManager.updatePlayer(activePlayer, {
        ...player1,
        zones: {
          ...player1.zones,
          characterArea: [activeChar],
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

    // Should have 2 attack actions: 1 from leader, 1 from character
    expect(attackActions.length).toBe(2);

    // Verify leader can attack
    expect(hasAttackAction(attackActions, player1Leader.id, player2Leader.id)).toBe(true);

    // Verify character can attack
    expect(hasAttackAction(attackActions, activeChar.id, player2Leader.id)).toBe(true);
  });

  it('should generate no attack actions when no characters can attack', () => {
    // Setup game state with no active characters
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);
    const zoneManager = new ZoneManager(stateManager, eventEmitter);

    const activePlayer = PlayerId.PLAYER_1;
    const opponent = PlayerId.PLAYER_2;

    // Create only rested characters without Rush
    const restedChars = [
      createCharacter('rested-1', activePlayer, CardState.RESTED, false),
      createCharacter('rested-2', activePlayer, CardState.RESTED, false),
    ];

    // Create leaders (but leader is rested, so can't attack)
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
          characterArea: restedChars,
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

    // Property: No attack actions should be generated
    expect(attackActions.length).toBe(0);
  });
});

/**
 * Property 2: Attack Action Inclusion
 * 
 * For any game state where characters can attack, the list of available actions 
 * should include attack actions.
 * 
 * This property ensures that:
 * 1. When attackable characters exist, attack actions are present in available actions
 * 2. Attack actions are properly integrated into the action selection system
 * 3. The AI has access to attack actions during decision-making
 * 
 * Feature: ai-battle-integration, Property 2: Attack Action Inclusion
 * Validates: Requirements 1.5
 */
describe('Property 2: Attack Action Inclusion', () => {
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
   * Helper function to check if attack actions are present in available actions
   */
  function hasAttackActions(actions: any[]): boolean {
    return actions.some(a => a.type === ActionType.DECLARE_ATTACK);
  }

  /**
   * Helper function to count attack actions
   */
  function countAttackActions(actions: any[]): number {
    return actions.filter(a => a.type === ActionType.DECLARE_ATTACK).length;
  }

  it('should include attack actions when active characters exist', () => {
    fc.assert(
      fc.property(
        // Generate a random number of active characters (1-5)
        fc.integer({ min: 1, max: 5 }),
        (numActiveChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active characters for active player
          const activeChars: CardInstance[] = [];
          for (let i = 0; i < numActiveChars; i++) {
            activeChars.push(
              createCharacter(`active-char-${i}`, activePlayer, CardState.ACTIVE)
            );
          }

          // Create leaders
          const player1Leader = createLeader('p1-leader', activePlayer, CardState.RESTED);
          const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

          // Update state with characters and leaders
          const player1 = stateManager.getPlayer(activePlayer);
          const player2 = stateManager.getPlayer(opponent);

          if (player1) {
            stateManager = stateManager.updatePlayer(activePlayer, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: activeChars,
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

          // Property: When characters can attack, attack actions should be included
          expect(hasAttackActions(legalActions)).toBe(true);

          // Property: Attack actions should be present and countable
          const attackCount = countAttackActions(legalActions);
          expect(attackCount).toBeGreaterThan(0);

          // Property: Attack count should match number of active characters (each can attack leader)
          expect(attackCount).toBeGreaterThanOrEqual(numActiveChars);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include attack actions when characters with Rush exist', () => {
    fc.assert(
      fc.property(
        // Generate a random number of rested characters with Rush (1-5)
        fc.integer({ min: 1, max: 5 }),
        (numRushChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create rested characters with Rush for active player
          const rushChars: CardInstance[] = [];
          for (let i = 0; i < numRushChars; i++) {
            rushChars.push(
              createCharacter(`rush-char-${i}`, activePlayer, CardState.RESTED, true)
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
                characterArea: rushChars,
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

          // Property: When Rush characters exist, attack actions should be included
          expect(hasAttackActions(legalActions)).toBe(true);

          // Property: Attack count should be at least the number of Rush characters
          const attackCount = countAttackActions(legalActions);
          expect(attackCount).toBeGreaterThanOrEqual(numRushChars);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include attack actions when active leader exists', () => {
    // Setup game state with active leader
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);
    const zoneManager = new ZoneManager(stateManager, eventEmitter);

    const activePlayer = PlayerId.PLAYER_1;
    const opponent = PlayerId.PLAYER_2;

    // Create leaders (player 1 leader is active)
    const player1Leader = createLeader('p1-leader', activePlayer, CardState.ACTIVE);
    const player2Leader = createLeader('p2-leader', opponent, CardState.ACTIVE);

    // Update state
    const player1 = stateManager.getPlayer(activePlayer);
    const player2 = stateManager.getPlayer(opponent);

    if (player1) {
      stateManager = stateManager.updatePlayer(activePlayer, {
        ...player1,
        zones: {
          ...player1.zones,
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

    // Property: When active leader exists, attack actions should be included
    expect(hasAttackActions(legalActions)).toBe(true);

    // Property: At least one attack action should exist (leader attacking opponent leader)
    const attackCount = countAttackActions(legalActions);
    expect(attackCount).toBeGreaterThanOrEqual(1);
  });

  it('should not include attack actions when no characters can attack', () => {
    fc.assert(
      fc.property(
        // Generate a random number of rested characters without Rush (0-5)
        fc.integer({ min: 0, max: 5 }),
        (numRestedChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create rested characters without Rush for active player
          const restedChars: CardInstance[] = [];
          for (let i = 0; i < numRestedChars; i++) {
            restedChars.push(
              createCharacter(`rested-char-${i}`, activePlayer, CardState.RESTED, false)
            );
          }

          // Create leaders (both rested so they can't attack)
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
                characterArea: restedChars,
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

          // Property: When no characters can attack, attack actions should NOT be included
          expect(hasAttackActions(legalActions)).toBe(false);

          // Property: Attack count should be zero
          const attackCount = countAttackActions(legalActions);
          expect(attackCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include attack actions in mixed action lists', () => {
    fc.assert(
      fc.property(
        // Generate random board state with attackers
        fc.integer({ min: 1, max: 3 }),
        (numActiveChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active characters
          const activeChars: CardInstance[] = [];
          for (let i = 0; i < numActiveChars; i++) {
            activeChars.push(
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
                characterArea: activeChars,
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

          // Property: Attack actions should be present alongside other action types
          expect(hasAttackActions(legalActions)).toBe(true);

          // Property: The action list should contain multiple action types
          // (attack actions + pass action at minimum)
          const actionTypes = new Set(legalActions.map(a => a.type));
          expect(actionTypes.size).toBeGreaterThanOrEqual(2);

          // Property: Attack actions should be properly typed
          const attackActions = legalActions.filter(
            a => a.type === ActionType.DECLARE_ATTACK
          );
          for (const action of attackActions) {
            expect(action.type).toBe(ActionType.DECLARE_ATTACK);
            expect(action.data).toBeDefined();
            expect(action.data.attackerId).toBeDefined();
            expect(action.data.targetId).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
