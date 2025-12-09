/**
 * BattleSystem.counter.pbt.test.ts
 * 
 * Property-based tests for counter decisions in BattleSystem
 * 
 * Feature: ai-battle-integration, Property 8: Counter Power Boost
 * Validates: Requirements 5.2
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
  PlayerType,
} from '../core/types';
import rulesData from '../rules/rules.json';

/**
 * Mock Player implementation for testing counter decisions
 */
class MockPlayer implements Player {
  readonly id: PlayerId;
  readonly type: PlayerType;
  private counterChoice: CounterAction | null;

  constructor(id: PlayerId, counterChoice: CounterAction | null = null) {
    this.id = id;
    this.type = PlayerType.AI;
    this.counterChoice = counterChoice;
  }

  setCounterChoice(counter: CounterAction | null): void {
    this.counterChoice = counter;
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
    return null;
  }

  async chooseCounterAction(
    options: CounterAction[],
    state: GameState
  ): Promise<CounterAction | null> {
    return this.counterChoice;
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
  counterValue: number | null = 1000
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
    counterValue: counterValue,
    rarity: 'C',
    keywords: [],
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
 * Helper function to create a counter card in hand
 */
function createCounterCard(
  id: string,
  owner: PlayerId,
  counterValue: number
): CardInstance {
  const card = createCharacter(id, owner, CardState.NONE, 3000, counterValue);
  return { ...card, zone: ZoneId.HAND, controller: owner };
}

/**
 * Helper function to create life cards for a player
 */
function createLifeCards(owner: PlayerId, count: number = 5): CardInstance[] {
  return Array.from({ length: count }, (_, i) => {
    const card = createCharacter(`life-${owner}-${i}`, owner, CardState.ACTIVE);
    return { ...card, zone: ZoneId.LIFE };
  });
}

/**
 * Property 8: Counter Power Boost
 * 
 * For any counter card used during battle, the defending card's power should 
 * increase by the counter value for the duration of the battle.
 * 
 * This property ensures that:
 * 1. When a counter card is used, it's moved from hand to trash
 * 2. The defender's power increases by the counter value
 * 3. The power boost lasts until the end of the battle
 * 4. The power boost affects the battle outcome
 * 
 * Feature: ai-battle-integration, Property 8: Counter Power Boost
 * Validates: Requirements 5.2
 */
describe('Property 8: Counter Power Boost', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
    eventEmitter = new EventEmitter();
  });

  it('should increase defender power by counter value when counter card is used', async () => {
    // Use fixed values for debugging
    const attackerPower = 5000;
    const defenderBasePower = 3000;
    const counterValue = 1000;
    
    {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const defender = createCharacter('defender', PlayerId.PLAYER_2, CardState.RESTED, defenderBasePower);
          const counterCard = createCounterCard('counter-card', PlayerId.PLAYER_2, counterValue);

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
                characterArea: [defender],
                leaderArea: createLeader('p2-leader', PlayerId.PLAYER_2, CardState.ACTIVE),
                hand: [counterCard],
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that uses the counter card
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2);
          mockPlayer.chooseCounterAction = async (options: CounterAction[], state: GameState) => {
            // Find the counter card in the options
            const counterOption = options.find(opt => opt.type === 'USE_COUNTER_CARD' && opt.cardId === counterCard.id);
            if (counterOption) {
              return counterOption;
            }
            return { type: 'PASS' };
          };
          battleSystem.setPlayerForCounter(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, defender.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedCounterCard = stateManager.getCard(counterCard.id);
          const updatedDefender = stateManager.getCard(defender.id);

          // Property: Counter card should be moved to trash
          expect(updatedCounterCard?.zone).toBe(ZoneId.TRASH);

          // Property: Defender's effective power during battle should include counter boost
          // The battle result should reflect the boosted power
          const boostedDefenderPower = defenderBasePower + counterValue;
          
          // Property: Battle outcome should be affected by counter boost
          if (attackerPower >= boostedDefenderPower) {
            // Attacker wins even with counter
            expect(updatedDefender?.zone).toBe(ZoneId.TRASH);
            expect(result.defenderKOd).toBe(true);
          } else {
            // Counter saved the defender
            expect(updatedDefender?.zone).toBe(ZoneId.CHARACTER_AREA);
            expect(result.defenderKOd).toBe(false);
          }
    }
  });

  it('should allow counter to save defender from being K.O.\'d', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate scenario where counter saves the defender
        fc.integer({ min: 5000, max: 8000 }),
        async (attackerPower) => {
          // Defender has less power than attacker, but counter will save them
          const defenderBasePower = attackerPower - 1000;
          const counterValue = 2000; // Enough to survive

          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const defender = createCharacter('defender', PlayerId.PLAYER_2, CardState.RESTED, defenderBasePower);
          const counterCard = createCounterCard('counter-card', PlayerId.PLAYER_2, counterValue);

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
                characterArea: [defender],
                leaderArea: createLeader('p2-leader', PlayerId.PLAYER_2, CardState.ACTIVE),
                hand: [counterCard],
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that uses the counter card
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2);
          mockPlayer.chooseCounterAction = async (options: CounterAction[], state: GameState) => {
            const counterOption = options.find(opt => opt.type === 'USE_COUNTER_CARD' && opt.cardId === counterCard.id);
            return counterOption || { type: 'PASS' };
          };
          battleSystem.setPlayerForCounter(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, defender.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedDefender = stateManager.getCard(defender.id);

          // Property: Defender should survive (not K.O.'d)
          expect(updatedDefender?.zone).toBe(ZoneId.CHARACTER_AREA);
          expect(result.defenderKOd).toBe(false);
          expect(result.damageDealt).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not save defender if counter boost is insufficient', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate scenario where counter is not enough
        fc.integer({ min: 8000, max: 12000 }),
        async (attackerPower) => {
          // Defender has much less power, counter won't be enough
          const defenderBasePower = attackerPower - 3000;
          const counterValue = 1000; // Not enough to survive

          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const defender = createCharacter('defender', PlayerId.PLAYER_2, CardState.RESTED, defenderBasePower);
          const counterCard = createCounterCard('counter-card', PlayerId.PLAYER_2, counterValue);

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
                characterArea: [defender],
                leaderArea: createLeader('p2-leader', PlayerId.PLAYER_2, CardState.ACTIVE),
                hand: [counterCard],
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that uses the counter card
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2);
          mockPlayer.chooseCounterAction = async (options: CounterAction[], state: GameState) => {
            const counterOption = options.find(opt => opt.type === 'USE_COUNTER_CARD' && opt.cardId === counterCard.id);
            return counterOption || { type: 'PASS' };
          };
          battleSystem.setPlayerForCounter(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, defender.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedDefender = stateManager.getCard(defender.id);

          // Property: Defender should still be K.O.'d despite counter
          expect(updatedDefender?.zone).toBe(ZoneId.TRASH);
          expect(result.defenderKOd).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not apply counter boost when no counter is used', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random power values
        fc.integer({ min: 5000, max: 10000 }), // attacker power
        fc.integer({ min: 3000, max: 6000 }),  // defender power
        async (attackerPower, defenderPower) => {
          // Setup game state
          const initialState = createInitialGameState();
          let stateManager = new GameStateManager({
            ...initialState,
            activePlayer: PlayerId.PLAYER_1,
            turnNumber: 2,
          });
          const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

          const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
          const defender = createCharacter('defender', PlayerId.PLAYER_2, CardState.RESTED, defenderPower);
          const counterCard = createCounterCard('counter-card', PlayerId.PLAYER_2, 2000);

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
                characterArea: [defender],
                leaderArea: createLeader('p2-leader', PlayerId.PLAYER_2, CardState.ACTIVE),
                hand: [counterCard],
              },
            });
          }

          battleSystem.updateStateManager(stateManager);

          // Create mock player that PASSES (doesn't use counter)
          const mockPlayer = new MockPlayer(PlayerId.PLAYER_2, { type: 'PASS' });
          battleSystem.setPlayerForCounter(PlayerId.PLAYER_2, mockPlayer);

          // Execute attack
          const result = await battleSystem.executeAttack(attacker.id, defender.id);

          // Get updated state
          stateManager = battleSystem.getStateManager();
          const updatedCounterCard = stateManager.getCard(counterCard.id);
          const updatedDefender = stateManager.getCard(defender.id);

          // Property: Counter card should remain in hand (not used)
          expect(updatedCounterCard?.zone).toBe(ZoneId.HAND);

          // Property: Battle outcome should be based on base power only
          if (attackerPower >= defenderPower) {
            expect(updatedDefender?.zone).toBe(ZoneId.TRASH);
            expect(result.defenderKOd).toBe(true);
          } else {
            expect(updatedDefender?.zone).toBe(ZoneId.CHARACTER_AREA);
            expect(result.defenderKOd).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow multiple counter cards to be used in sequence', async () => {
    // Setup game state
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager({
      ...initialState,
      activePlayer: PlayerId.PLAYER_1,
      turnNumber: 2,
    });
    const battleSystem = new BattleSystem(stateManager, rules, eventEmitter);

    const attackerPower = 10000;
    const defenderBasePower = 4000;
    const counterValue1 = 2000;
    const counterValue2 = 3000;

    const attacker = createCharacter('attacker', PlayerId.PLAYER_1, CardState.ACTIVE, attackerPower);
    const defender = createCharacter('defender', PlayerId.PLAYER_2, CardState.RESTED, defenderBasePower);
    const counterCard1 = createCounterCard('counter-card-1', PlayerId.PLAYER_2, counterValue1);
    const counterCard2 = createCounterCard('counter-card-2', PlayerId.PLAYER_2, counterValue2);

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
          characterArea: [defender],
          leaderArea: createLeader('p2-leader', PlayerId.PLAYER_2, CardState.ACTIVE),
          hand: [counterCard1, counterCard2],
        },
      });
    }

    battleSystem.updateStateManager(stateManager);

    // Create mock player that uses both counter cards
    let callCount = 0;
    const mockPlayer = new MockPlayer(PlayerId.PLAYER_2);
    mockPlayer.chooseCounterAction = async (options: CounterAction[], state: GameState) => {
      callCount++;
      if (callCount === 1) {
        return { type: 'USE_COUNTER_CARD', cardId: counterCard1.id };
      } else if (callCount === 2) {
        return { type: 'USE_COUNTER_CARD', cardId: counterCard2.id };
      } else {
        return { type: 'PASS' };
      }
    };
    battleSystem.setPlayerForCounter(PlayerId.PLAYER_2, mockPlayer);

    // Execute attack
    const result = await battleSystem.executeAttack(attacker.id, defender.id);

    // Get updated state
    stateManager = battleSystem.getStateManager();
    const updatedCounterCard1 = stateManager.getCard(counterCard1.id);
    const updatedCounterCard2 = stateManager.getCard(counterCard2.id);
    const updatedDefender = stateManager.getCard(defender.id);

    // Property: Both counter cards should be in trash
    expect(updatedCounterCard1?.zone).toBe(ZoneId.TRASH);
    expect(updatedCounterCard2?.zone).toBe(ZoneId.TRASH);

    // Property: Defender should survive with combined counter boost
    // defenderBasePower (4000) + counterValue1 (2000) + counterValue2 (3000) = 9000
    // attackerPower (10000) > 9000, so defender should still be K.O.'d
    expect(updatedDefender?.zone).toBe(ZoneId.TRASH);
    expect(result.defenderKOd).toBe(true);
  });
});
