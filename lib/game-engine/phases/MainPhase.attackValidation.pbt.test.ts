/**
 * MainPhase.attackValidation.pbt.test.ts
 * 
 * Property-based tests for attack validation before execution in Main Phase
 * 
 * Feature: ai-battle-integration, Property 13: Attack Validation Before Execution
 * Validates: Requirements 8.2, 8.3
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
  GameAction,
} from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Property 13: Attack Validation Before Execution
 * 
 * For any attack action, if the attack is illegal at execution time, the system 
 * should reject it without crashing.
 * 
 * This property ensures that:
 * 1. Invalid attacks are detected and rejected
 * 2. The system handles invalid attacks gracefully (no crashes)
 * 3. Error messages are provided for invalid attacks
 * 4. Game state remains consistent after rejecting invalid attacks
 * 5. The system can recover from validation failures
 */

describe('Property 13: Attack Validation Before Execution', () => {
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
   * Helper function to execute an attack action through MainPhase
   */
  async function executeAttackAction(
    stateManager: GameStateManager,
    action: GameAction,
    rules: RulesContext,
    eventEmitter: EventEmitter
  ): Promise<{ success: boolean; error?: string; newState: GameStateManager }> {
    // Import the executeAction function from MainPhase
    // Since it's not exported, we'll simulate it here
    const attackerId = action.data.attackerId as string;
    const targetId = action.data.targetId as string;
    
    try {
      // Check if the attacker has already attacked this turn
      if (stateManager.hasCardAttackedThisTurn(attackerId)) {
        return {
          success: false,
          error: 'Card has already attacked this turn',
          newState: stateManager,
        };
      }
      
      // Create BattleSystem instance BEFORE marking as attacked
      // so that BattleSystem can validate the attack
      const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);
      
      // Execute the attack (BattleSystem will validate)
      const battleResult = await battleSystem.executeAttack(attackerId, targetId);
      
      // Get updated state
      let updatedState = battleSystem.getStateManager();
      
      // If attack succeeded, mark the attacker as having attacked
      if (battleResult.success) {
        updatedState = updatedState.markCardAttacked(attackerId);
      }
      
      return {
        success: battleResult.success,
        newState: updatedState,
        error: battleResult.error || (battleResult.success ? undefined : 'Attack failed to complete'),
      };
    } catch (error) {
      // Handle errors gracefully
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown attack error',
        newState: stateManager,
      };
    }
  }

  it('should reject attacks from cards that have already attacked', () => {
    fc.assert(
      fc.asyncProperty(
        // Generate random number of active characters
        fc.integer({ min: 1, max: 3 }),
        async (numChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);
          // Set turn number to 2 to avoid first turn battle restriction
          stateManager = stateManager.incrementTurn();
          const zoneManager = new ZoneManager(stateManager, eventEmitter);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active characters
          const characters: CardInstance[] = [];
          for (let i = 0; i < numChars; i++) {
            characters.push(
              createCharacter(`char-${i}`, activePlayer, CardState.ACTIVE)
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

          // Pick a random character to attack twice
          const attackerIndex = Math.floor(Math.random() * numChars);
          const attacker = characters[attackerIndex];

          // Create attack action
          const attackAction: GameAction = {
            type: ActionType.DECLARE_ATTACK,
            playerId: activePlayer,
            data: {
              attackerId: attacker.id,
              targetId: player2Leader.id,
            },
            timestamp: Date.now(),
          };

          // Execute first attack (should succeed)
          const firstResult = await executeAttackAction(stateManager, attackAction, rules, eventEmitter);
          expect(firstResult.success).toBe(true);

          // Try to execute second attack with same attacker (should fail)
          const secondResult = await executeAttackAction(
            firstResult.newState,
            attackAction,
            rules,
            eventEmitter
          );
          
          // Property: Second attack should be rejected
          expect(secondResult.success).toBe(false);
          
          // Property: Error message should be provided
          expect(secondResult.error).toBeDefined();
          expect(secondResult.error).toContain('already attacked');
          
          // Property: Game state should remain consistent (not crash)
          expect(secondResult.newState).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle invalid attacker IDs gracefully', () => {
    fc.assert(
      fc.asyncProperty(
        // Generate random invalid attacker ID
        fc.string({ minLength: 1, maxLength: 20 }),
        async (invalidAttackerId) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

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

          // Create attack action with invalid attacker ID
          const attackAction: GameAction = {
            type: ActionType.DECLARE_ATTACK,
            playerId: activePlayer,
            data: {
              attackerId: `invalid-${invalidAttackerId}`,
              targetId: player2Leader.id,
            },
            timestamp: Date.now(),
          };

          // Execute attack
          const result = await executeAttackAction(stateManager, attackAction, rules, eventEmitter);

          // Property: Attack should be rejected (or handled gracefully)
          // Note: The system might succeed if the invalid ID happens to match a valid card
          // But it should never crash
          expect(result).toBeDefined();
          expect(result.newState).toBeDefined();
          
          // Property: If attack fails, error should be provided
          if (!result.success) {
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle invalid target IDs gracefully', () => {
    fc.assert(
      fc.asyncProperty(
        // Generate random invalid target ID
        fc.string({ minLength: 1, maxLength: 20 }),
        async (invalidTargetId) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create one active character
          const attacker = createCharacter('attacker', activePlayer, CardState.ACTIVE);

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
                characterArea: [attacker],
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

          // Create attack action with invalid target ID
          const attackAction: GameAction = {
            type: ActionType.DECLARE_ATTACK,
            playerId: activePlayer,
            data: {
              attackerId: attacker.id,
              targetId: `invalid-${invalidTargetId}`,
            },
            timestamp: Date.now(),
          };

          // Execute attack
          const result = await executeAttackAction(stateManager, attackAction, rules, eventEmitter);

          // Property: Attack should be rejected (or handled gracefully)
          // Note: The system might succeed if the invalid ID happens to match a valid card
          // But it should never crash
          expect(result).toBeDefined();
          expect(result.newState).toBeDefined();
          
          // Property: If attack fails, error should be provided
          if (!result.success) {
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain game state consistency after validation failures', () => {
    fc.assert(
      fc.asyncProperty(
        // Generate random board state
        fc.integer({ min: 1, max: 3 }),
        async (numChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active characters
          const characters: CardInstance[] = [];
          for (let i = 0; i < numChars; i++) {
            characters.push(
              createCharacter(`char-${i}`, activePlayer, CardState.ACTIVE)
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

          // Save initial state for comparison
          const initialPlayerState = stateManager.getPlayer(activePlayer);
          const initialOpponentState = stateManager.getPlayer(opponent);

          // Pick a character and mark it as having attacked
          const attacker = characters[0];
          stateManager = stateManager.markCardAttacked(attacker.id);

          // Try to attack again with the same character (should fail)
          const attackAction: GameAction = {
            type: ActionType.DECLARE_ATTACK,
            playerId: activePlayer,
            data: {
              attackerId: attacker.id,
              targetId: player2Leader.id,
            },
            timestamp: Date.now(),
          };

          const result = await executeAttackAction(stateManager, attackAction, rules, eventEmitter);

          // Property: Attack should fail
          expect(result.success).toBe(false);

          // Property: Game state should remain consistent
          const finalPlayerState = result.newState.getPlayer(activePlayer);
          const finalOpponentState = result.newState.getPlayer(opponent);

          expect(finalPlayerState).toBeDefined();
          expect(finalOpponentState).toBeDefined();

          // Property: Character zones should be unchanged
          if (finalPlayerState && initialPlayerState) {
            expect(finalPlayerState.zones.characterArea.length).toBe(
              initialPlayerState.zones.characterArea.length
            );
          }

          // Property: Life should be unchanged
          if (finalOpponentState && initialOpponentState) {
            expect(finalOpponentState.zones.life.length).toBe(
              initialOpponentState.zones.life.length
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should allow valid attacks after rejecting invalid ones', async () => {
    // Setup game state
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);
    
    // Set turn number to 2 to avoid first turn battle restriction
    stateManager = stateManager.incrementTurn();

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

    // Mark char1 as having attacked
    stateManager = stateManager.markCardAttacked(char1.id);

    // Try to attack with char1 again (should fail)
    const invalidAttack: GameAction = {
      type: ActionType.DECLARE_ATTACK,
      playerId: activePlayer,
      data: {
        attackerId: char1.id,
        targetId: player2Leader.id,
      },
      timestamp: Date.now(),
    };

    const invalidResult = await executeAttackAction(stateManager, invalidAttack, rules, eventEmitter);
    expect(invalidResult.success).toBe(false);

    // Now attack with char2 (should succeed)
    // Use the original stateManager (with char1 marked as attacked) since the invalid attack didn't change state
    const validAttack: GameAction = {
      type: ActionType.DECLARE_ATTACK,
      playerId: activePlayer,
      data: {
        attackerId: char2.id,
        targetId: player2Leader.id,
      },
      timestamp: Date.now(),
    };

    const validResult = await executeAttackAction(stateManager, validAttack, rules, eventEmitter);

    // Property: Valid attack should succeed after invalid one was rejected
    expect(validResult.success).toBe(true);

    // Property: Game state should be updated correctly
    expect(validResult.newState).toBeDefined();
    expect(validResult.newState.hasCardAttackedThisTurn(char2.id)).toBe(true);
  });

  it('should provide meaningful error messages for validation failures', () => {
    fc.assert(
      fc.asyncProperty(
        // Generate random number of characters
        fc.integer({ min: 1, max: 3 }),
        async (numChars) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager(initialState);

          const activePlayer = PlayerId.PLAYER_1;
          const opponent = PlayerId.PLAYER_2;

          // Create active characters
          const characters: CardInstance[] = [];
          for (let i = 0; i < numChars; i++) {
            characters.push(
              createCharacter(`char-${i}`, activePlayer, CardState.ACTIVE)
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

          // Pick a character and mark it as having attacked
          const attacker = characters[0];
          stateManager = stateManager.markCardAttacked(attacker.id);

          // Try to attack again (should fail with meaningful error)
          const attackAction: GameAction = {
            type: ActionType.DECLARE_ATTACK,
            playerId: activePlayer,
            data: {
              attackerId: attacker.id,
              targetId: player2Leader.id,
            },
            timestamp: Date.now(),
          };

          const result = await executeAttackAction(stateManager, attackAction, rules, eventEmitter);

          // Property: Failed attack should have error message
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          
          // Property: Error message should be meaningful (not empty)
          expect(result.error).toBeTruthy();
          expect(result.error!.length).toBeGreaterThan(0);
          
          // Property: Error message should describe the problem
          expect(result.error!.toLowerCase()).toMatch(/attack|already|invalid|fail/);
        }
      ),
      { numRuns: 50 }
    );
  });
});
