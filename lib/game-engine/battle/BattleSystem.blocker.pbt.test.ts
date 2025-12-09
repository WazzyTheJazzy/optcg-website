/**
 * BattleSystem.blocker.pbt.test.ts
 * 
 * Property-based tests for blocker decisions in BattleSystem
 * 
 * Feature: ai-battle-integration, Property 6: Blocker Redirection
 * Feature: ai-battle-integration, Property 7: No Blocker Original Target
 * Validates: Requirements 4.2, 4.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { BattleSystem } from './BattleSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { RulesContext } from '../rules/RulesContext';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  CardDefinition,
  CardInstance,
  Player,
  GameState,
  GameAction,
  CounterAction,
  Target,
  EffectInstance,
} from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Mock Player implementation for testing blocker decisions
 */
class MockPlayer implements Player {
  readonly id: PlayerId;
  readonly type: 'human' | 'ai';
  private blockerChoice: CardInstance | null;

  constructor(id: PlayerId, blockerChoice: CardInstance | null = null) {
    this.id = id;
    this.type = 'ai';
    this.blockerChoice = blockerChoice;
  }

  setBlockerChoice(blocker: CardInstance | null): void {
    this.blockerChoice = blocker;
  }

  async chooseAction(legalActions: GameAction[], state: GameState): Promise<GameAction> {
    return legalActions[0];
  }

  async chooseMulligan(hand: CardInstance[], state: GameState): Promise<boolean> {
    return false;
  }

  async chooseBlocker(
    legalBlockers: CardInstance[],
    attacker: CardInstance,
    state: GameState
  ): Promise<CardInstance | null> {
    return this.blockerChoice;
  }

  async chooseCounterAction(
    options: CounterAction[],
    state: GameState
  ): Promise<CounterAction | null> {
    return { type: 'PASS' };
  }

  async chooseTarget(
    legalTargets: Target[],
    effect: EffectInstance,
    state: GameState
  ): Promise<Target> {
    return legalTargets[0];
  }

  async chooseValue(
    options: number[],
    effect: EffectInstance,
    state: GameState
  ): Promise<number> {
    return options[0];
  }
}

/**
 * Helper function to create a character card instance
 */
function createCharacter(
  id: string,
  owner: PlayerId,
  state: CardState,
  power: number = 5000,
  hasBlocker: boolean = false
): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: `Character ${id}`,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: power,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: hasBlocker ? ['Blocker'] : [],
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
function createLeader(
  id: string,
  owner: PlayerId,
  state: CardState,
  power: number = 5000
): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: `Leader ${id}`,
    category: CardCategory.LEADER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: power,
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
 * Helper function to create life cards for a player
 */
function createLifeCards(owner: PlayerId, count: number = 5): CardInstance[] {
  return Array.from({ length: count }, (_, i) => {
    const card = createCharacter(`life-${owner}-${i}`, owner, CardState.ACTIVE);
    // Override zone to be LIFE instead of CHARACTER_AREA
    return { ...card, zone: ZoneId.LIFE };
  });
}

/**
 * Property 6: Blocker Redirection
 * 
 * For any battle where a blocker is chosen, the battle should resolve between 
 * the attacker and the blocker, not the original target.
 * 
 * This property ensures that:
 * 1. When a blocker is chosen, the battle redirects to the blocker
 * 2. The original target is not affected by the battle
 * 3. The blocker becomes rested
 * 4. Damage/K.O. is applied to the blocker, not the original target
 * 
 * Feature: ai-battle-integration, Property 6: Blocker Redirection
 * Validates: Requirements 4.2
 */
describe('Property 6: Blocker Redirection', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
    eventEmitter = new EventEmitter();
  });

  it('should redirect attack to blocker when blocker is chosen', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random power values for attacker and blocker
        fc.integer({ min: 3000, max: 10000 }), // attacker power
        fc.integer({ min: 2000, max: 8000 }),  // blocker power
        fc.integer({ min: 4000, max: 9000 }),  // original target power
        async (attackerPower, blockerPower, targetPower) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2, // Turn 2 to avoid first turn battle restriction
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const originalTarget = createLeader('target-leader', PlayerId.PLAYER_2, CardState.ACTIVE, targetPower);
          const blocker = createCharacter('blocker', PlayerId.PLAYER_2, CardState.ACTIVE, blockerPower, true);

          // Setup players with cards
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

          if (player1) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: [attacker],
                leaderArea: createLeader('p1-leader', PlayerId.PLAYER_1, CardState.ACTIVE),
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
              ...player2,
              zones: {
                ...player2.zones,
                characterArea: [blocker],
                leaderArea: originalTarget,
              },
            });
          }

          // Update battleSystem with new state
          battleSystem.updateStateManager(stateManager);

          // Create mock player that chooses to block
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, blocker);
          battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, originalTarget.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedBlocker = stateManager.getCard(blocker.id);
          const updatedTarget = stateManager.getCard(originalTarget.id);

          // Property: Battle result should indicate blocker was used
          expect(result.blockerId).toBe(blocker.id);

          // Property: Blocker should be rested
          expect(updatedBlocker?.state).toBe(CardState.RESTED);

          // Property: If attacker power >= blocker power, blocker should be K.O.'d
          if (attackerPower >= blockerPower) {
            expect(updatedBlocker?.zone).toBe(ZoneId.TRASH);
          }

          // Property: Original target should not be affected (still in leader area)
          expect(updatedTarget?.zone).toBe(ZoneId.LEADER_AREA);

          // Property: Original target's life should not decrease
          const player2After = stateManager.getPlayer(PlayerId.PLAYER_2);
          expect(player2After?.zones.life.length).toBe(player2?.zones.life.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should K.O. blocker when attacker power exceeds blocker power', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate attacker power higher than blocker power
        fc.integer({ min: 5000, max: 10000 }),
        async (attackerPower) => {
          const blockerPower = attackerPower - 1000; // Blocker has less power

          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const originalTarget = createLeader('target-leader', PlayerId.PLAYER_2, CardState.ACTIVE);
          const blocker = createCharacter('blocker', PlayerId.PLAYER_2, CardState.ACTIVE, blockerPower, true);

          // Setup players
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

          if (player1) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: [attacker],
                leaderArea: createLeader('p1-leader', PlayerId.PLAYER_1, CardState.ACTIVE),
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
              ...player2,
              zones: {
                ...player2.zones,
                characterArea: [blocker],
                leaderArea: originalTarget,
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that chooses to block
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, blocker);
          battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, originalTarget.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedBlocker = stateManager.getCard(blocker.id);

          // Property: Blocker should be K.O.'d (moved to trash)
          expect(updatedBlocker?.zone).toBe(ZoneId.TRASH);
          expect(result.defenderKOd).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not K.O. blocker when blocker power exceeds attacker power', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate blocker power higher than attacker power
        fc.integer({ min: 5000, max: 10000 }),
        async (blockerPower) => {
          const attackerPower = blockerPower - 1000; // Attacker has less power

          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const originalTarget = createLeader('target-leader', PlayerId.PLAYER_2, CardState.ACTIVE);
          const blocker = createCharacter('blocker', PlayerId.PLAYER_2, CardState.ACTIVE, blockerPower, true);

          // Setup players
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

          if (player1) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: [attacker],
                leaderArea: createLeader('p1-leader', PlayerId.PLAYER_1, CardState.ACTIVE),
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
              ...player2,
              zones: {
                ...player2.zones,
                characterArea: [blocker],
                leaderArea: originalTarget,
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that chooses to block
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, blocker);
          battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, originalTarget.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedBlocker = stateManager.getCard(blocker.id);

          // Property: Blocker should still be in character area (not K.O.'d)
          expect(updatedBlocker?.zone).toBe(ZoneId.CHARACTER_AREA);
          expect(result.defenderKOd).toBe(false);
          expect(result.damageDealt).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 7: No Blocker Original Target
 * 
 * For any battle where no blocker is chosen, the battle should resolve between 
 * the attacker and the original target.
 * 
 * This property ensures that:
 * 1. When no blocker is chosen, the battle proceeds with the original target
 * 2. The original target receives damage/K.O. as appropriate
 * 3. No blocker is involved in the battle
 * 
 * Feature: ai-battle-integration, Property 7: No Blocker Original Target
 * Validates: Requirements 4.3
 */
describe('Property 7: No Blocker Original Target', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
    eventEmitter = new EventEmitter();
  });

  it('should resolve battle with original target when no blocker is chosen', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random power values
        fc.integer({ min: 3000, max: 10000 }), // attacker power
        fc.integer({ min: 4000, max: 9000 }),  // target power
        async (attackerPower, targetPower) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const originalTarget = createLeader('target-leader', PlayerId.PLAYER_2, CardState.ACTIVE, targetPower);
          const blocker = createCharacter('blocker', PlayerId.PLAYER_2, CardState.ACTIVE, 5000, true);

          // Setup players
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

          if (player1) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: [attacker],
                leaderArea: createLeader('p1-leader', PlayerId.PLAYER_1, CardState.ACTIVE),
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
              ...player2,
              zones: {
                ...player2.zones,
                characterArea: [blocker],
                leaderArea: originalTarget,
                life: createLifeCards(PlayerId.PLAYER_2, 5),
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that chooses NOT to block (returns null)
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, null);
          battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

          // Get initial life count AFTER updating state
          const player2Before = stateManager.getPlayer(PlayerId.PLAYER_2);
          const initialLifeCount = player2Before?.zones.life.length || 0;

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, originalTarget.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedBlocker = stateManager.getCard(blocker.id);
          const player2After = stateManager.getPlayer(PlayerId.PLAYER_2);

          // Property: No blocker should be involved
          expect(result.blockerId).toBeNull();

          // Property: Blocker should remain active (not rested)
          expect(updatedBlocker?.state).toBe(CardState.ACTIVE);

          // Property: If attacker power >= target power, life damage should be dealt
          if (attackerPower >= targetPower) {
            // When attacker wins, damage should be dealt
            expect(result.damageDealt).toBeGreaterThanOrEqual(1);
            expect(player2After?.zones.life.length).toBeLessThan(initialLifeCount);
          } else {
            // If attacker power < target power, no damage
            expect(result.damageDealt).toBe(0);
            expect(player2After?.zones.life.length).toBe(initialLifeCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should deal life damage to leader when no blocker and attacker wins', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate attacker power higher than leader power
        fc.integer({ min: 5000, max: 10000 }),
        async (attackerPower) => {
          const leaderPower = attackerPower - 1000; // Leader has less power

          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const leader = createLeader('target-leader', PlayerId.PLAYER_2, CardState.ACTIVE, leaderPower);

          // Setup players
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

          if (player1) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: [attacker],
                leaderArea: createLeader('p1-leader', PlayerId.PLAYER_1, CardState.ACTIVE),
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
              ...player2,
              zones: {
                ...player2.zones,
                leaderArea: leader,
                life: createLifeCards(PlayerId.PLAYER_2, 5),
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that chooses NOT to block
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, null);
          battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

          // Get initial life count AFTER updating state
          const player2Before = stateManager.getPlayer(PlayerId.PLAYER_2);
          const initialLifeCount = player2Before?.zones.life.length || 0;

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, leader.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const player2After = stateManager.getPlayer(PlayerId.PLAYER_2);

          // Property: Life damage should be dealt (1 life card removed)
          expect(result.damageDealt).toBe(1);
          expect(player2After?.zones.life.length).toBe(initialLifeCount - 1);

          // Property: No blocker involved
          expect(result.blockerId).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should K.O. character target when no blocker and attacker wins', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate attacker power higher than target power
        fc.integer({ min: 5000, max: 10000 }),
        async (attackerPower) => {
          const targetPower = attackerPower - 1000; // Target has less power

          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const target = createCharacter('target', PlayerId.PLAYER_2, CardState.RESTED, targetPower);

          // Setup players
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

          if (player1) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: [attacker],
                leaderArea: createLeader('p1-leader', PlayerId.PLAYER_1, CardState.ACTIVE),
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
              ...player2,
              zones: {
                ...player2.zones,
                characterArea: [target],
                leaderArea: createLeader('p2-leader', PlayerId.PLAYER_2, CardState.ACTIVE),
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that chooses NOT to block
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, null);
          battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, target.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedTarget = stateManager.getCard(target.id);

          // Property: Target should be K.O.'d (moved to trash)
          expect(updatedTarget?.zone).toBe(ZoneId.TRASH);
          expect(result.defenderKOd).toBe(true);

          // Property: No blocker involved
          expect(result.blockerId).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not deal damage when no blocker and defender wins', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate defender power higher than attacker power
        fc.integer({ min: 5000, max: 10000 }),
        async (defenderPower) => {
          const attackerPower = defenderPower - 1000; // Attacker has less power

          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const leader = createLeader('target-leader', PlayerId.PLAYER_2, CardState.ACTIVE, defenderPower);

          // Setup players
          const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
          const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

          if (player1) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
              ...player1,
              zones: {
                ...player1.zones,
                characterArea: [attacker],
                leaderArea: createLeader('p1-leader', PlayerId.PLAYER_1, CardState.ACTIVE),
              },
            });
          }

          if (player2) {
            stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
              ...player2,
              zones: {
                ...player2.zones,
                leaderArea: leader,
                life: createLifeCards(PlayerId.PLAYER_2, 5),
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that chooses NOT to block
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, null);
          battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

          // Get initial life count AFTER updating state
          const player2Before = stateManager.getPlayer(PlayerId.PLAYER_2);
          const initialLifeCount = player2Before?.zones.life.length || 0;

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, leader.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const player2After = stateManager.getPlayer(PlayerId.PLAYER_2);

          // Property: No damage should be dealt
          expect(result.damageDealt).toBe(0);
          expect(player2After?.zones.life.length).toBe(initialLifeCount);

          // Property: No blocker involved
          expect(result.blockerId).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
