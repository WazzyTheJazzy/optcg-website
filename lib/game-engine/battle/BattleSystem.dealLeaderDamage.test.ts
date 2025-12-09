/**
 * BattleSystem.dealLeaderDamage.test.ts
 * 
 * Tests for the leader damage system implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BattleSystem } from './BattleSystem';
import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  CardInstance,
  CardDefinition,
  PlayerId,
  ZoneId,
  CardState,
  CardCategory,
  DonInstance,
  GameState,
  PlayerState,
} from '../core/types';

/**
 * Test subclass that allows us to control player decisions
 */
class TestBattleSystem extends BattleSystem {
  private triggerActivationDecision: boolean = false;

  setTriggerActivationDecision(shouldActivate: boolean): void {
    this.triggerActivationDecision = shouldActivate;
  }

  protected queryPlayerForTriggerActivation(
    playerId: PlayerId,
    lifeCard: CardInstance
  ): boolean {
    return this.triggerActivationDecision;
  }
}

describe('BattleSystem - Leader Damage', () => {
  let battleSystem: TestBattleSystem;
  let stateManager: GameStateManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  // Helper to create a card definition
  const createCardDef = (
    id: string,
    name: string,
    keywords: string[] = []
  ): CardDefinition => ({
    id,
    name,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords,
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  });

  // Helper to create a card instance
  const createCard = (
    id: string,
    definition: CardDefinition,
    owner: PlayerId,
    zone: ZoneId
  ): CardInstance => ({
    id,
    definition,
    owner,
    controller: owner,
    zone,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  });

  // Helper to create a leader
  const createLeader = (
    id: string,
    owner: PlayerId,
    lifeValue: number
  ): CardInstance => {
    const leaderDef: CardDefinition = {
      id: `${id}-def`,
      name: 'Test Leader',
      category: CardCategory.LEADER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: null,
      lifeValue,
      counterValue: null,
      rarity: 'L',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: 'L001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return createCard(id, leaderDef, owner, ZoneId.LEADER_AREA);
  };

  beforeEach(() => {
    // Create rules context
    const rulesData = {
      version: '1.0',
      turnStructure: {
        phases: [],
        firstTurnRules: {
          skipDraw: true,
          donCount: 1,
          canBattle: false,
        },
      },
      battleSystem: {
        steps: [],
        powerComparison: 'greater_or_equal',
        damageRules: {
          leaderDamage: 1,
          doubleAttackDamage: 2,
        },
      },
      gameSetup: {
        startingHandSize: 5,
        mulliganAllowed: true,
        donDeckSize: 10,
      },
      limits: {
        maxCharacterArea: 5,
        maxStageArea: 1,
        deckSize: 50,
        donDeckSize: 10,
      },
      keywords: {},
      zones: {},
      defeatConditions: [],
      infiniteLoopRules: {
        maxRepeats: 4,
        resolution: {
          bothCanStop: 'continue',
          oneCanStop: 'winner',
          neitherCanStop: 'draw',
        },
      },
    };
    rules = new RulesContext(rulesData);

    // Create event emitter
    eventEmitter = new EventEmitter();

    // Create initial game state
    const player1Leader = createLeader('p1-leader', PlayerId.PLAYER_1, 5);
    const player2Leader = createLeader('p2-leader', PlayerId.PLAYER_2, 5);

    // Create life cards for player 2
    const life1 = createCard(
      'life1',
      createCardDef('life1-def', 'Life Card 1'),
      PlayerId.PLAYER_2,
      ZoneId.LIFE
    );
    const life2 = createCard(
      'life2',
      createCardDef('life2-def', 'Life Card 2'),
      PlayerId.PLAYER_2,
      ZoneId.LIFE
    );
    const life3 = createCard(
      'life3',
      createCardDef('life3-def', 'Life Card 3', ['Trigger']),
      PlayerId.PLAYER_2,
      ZoneId.LIFE
    );

    const player1: PlayerState = {
      id: PlayerId.PLAYER_1,
      zones: {
        deck: [],
        hand: [],
        trash: [],
        life: [],
        donDeck: [],
        costArea: [],
        leaderArea: player1Leader,
        characterArea: [],
        stageArea: null,
      },
      flags: new Map(),
    };

    const player2: PlayerState = {
      id: PlayerId.PLAYER_2,
      zones: {
        deck: [],
        hand: [],
        trash: [],
        life: [life1, life2, life3],
        donDeck: [],
        costArea: [],
        leaderArea: player2Leader,
        characterArea: [],
        stageArea: null,
      },
      flags: new Map(),
    };

    const initialState: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, player1],
        [PlayerId.PLAYER_2, player2],
      ]),
      activePlayer: PlayerId.PLAYER_1,
      phase: 'MAIN' as any,
      turnNumber: 1,
      pendingTriggers: [],
      gameOver: false,
      winner: null,
      history: [],
      loopGuardState: {
        stateHashes: new Map(),
        maxRepeats: 4,
      },
    };

    stateManager = new GameStateManager(initialState);
    battleSystem = new TestBattleSystem(stateManager, rules, eventEmitter);
  });

  describe('Basic Leader Damage', () => {
    it('should move life card to hand when taking 1 damage', () => {
      const leader = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Get initial state
      const initialLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      const initialHandCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.hand.length;
      
      // Deal 1 damage
      (battleSystem as any).dealLeaderDamage(leader, 1);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify life card moved to hand
      const finalLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      const finalHandCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.hand.length;
      
      expect(finalLifeCount).toBe(initialLifeCount - 1);
      expect(finalHandCount).toBe(initialHandCount + 1);
    });

    it('should move multiple life cards to hand when taking multiple damage', () => {
      const leader = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Get initial state
      const initialLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      const initialHandCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.hand.length;
      
      // Deal 2 damage
      (battleSystem as any).dealLeaderDamage(leader, 2);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify 2 life cards moved to hand
      const finalLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      const finalHandCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.hand.length;
      
      expect(finalLifeCount).toBe(initialLifeCount - 2);
      expect(finalHandCount).toBe(initialHandCount + 2);
    });
  });

  describe('Trigger Keyword Handling', () => {
    it('should add trigger card to hand when player declines activation', () => {
      const leader = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Set decision to not activate trigger
      battleSystem.setTriggerActivationDecision(false);
      
      // Deal 3 damage to hit the trigger card (3rd life card)
      (battleSystem as any).dealLeaderDamage(leader, 3);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify all 3 cards went to hand (including trigger)
      const finalHandCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.hand.length;
      expect(finalHandCount).toBe(3);
      
      // Verify the trigger card is in hand
      const triggerCardInHand = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.hand
        .find(card => card.id === 'life3');
      expect(triggerCardInHand).toBeDefined();
    });

    it('should move trigger card to trash when player activates it', () => {
      const leader = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Set decision to activate trigger
      battleSystem.setTriggerActivationDecision(true);
      
      // Deal 3 damage to hit the trigger card
      (battleSystem as any).dealLeaderDamage(leader, 3);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify first 2 cards went to hand
      const finalHandCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.hand.length;
      expect(finalHandCount).toBe(2);
      
      // Verify the trigger card went to trash (after activation)
      const triggerCardInTrash = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.trash
        .find(card => card.id === 'life3');
      expect(triggerCardInTrash).toBeDefined();
    });
  });

  describe('Defeat Conditions', () => {
    it('should mark player as defeated when life is empty', () => {
      const leader = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Deal damage equal to all life cards
      (battleSystem as any).dealLeaderDamage(leader, 3);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify all life cards are gone
      const finalLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      expect(finalLifeCount).toBe(0);
      
      // Now deal 1 more damage - should trigger defeat
      (battleSystem as any).dealLeaderDamage(leader, 1);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify game is over and player 1 won
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_1);
    });

    it('should stop processing damage after defeat', () => {
      const leader = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Deal damage equal to all life cards
      (battleSystem as any).dealLeaderDamage(leader, 3);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Now deal excessive damage - should only process until defeat
      (battleSystem as any).dealLeaderDamage(leader, 5);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify game is over
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_1);
    });
  });

  describe('Integration with Damage Step', () => {
    it('should deal 1 damage to leader when attacker power >= defender power', () => {
      // Create attacker and defender
      const attackerDef = createCardDef('attacker-def', 'Attacker');
      attackerDef.basePower = 5000;
      const attacker = createCard('attacker', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      
      const defender = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Add attacker to state
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(attacker);
      
      // Get initial life count
      const initialLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      
      // Execute damage step
      const result = (battleSystem as any).damageStep(attacker, defender);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify 1 damage was dealt
      expect(result.damageDealt).toBe(1);
      expect(result.defenderKOd).toBe(false);
      
      // Verify life card moved to hand
      const finalLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      expect(finalLifeCount).toBe(initialLifeCount - 1);
    });

    it('should deal 2 damage to leader when attacker has Double Attack', () => {
      // Create attacker with Double Attack
      const attackerDef = createCardDef('attacker-def', 'Attacker', ['Double Attack']);
      attackerDef.basePower = 5000;
      const attacker = createCard('attacker', attackerDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      
      const defender = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.leaderArea!;
      
      // Add attacker to state
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(attacker);
      
      // Get initial life count
      const initialLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      
      // Execute damage step
      const result = (battleSystem as any).damageStep(attacker, defender);
      
      // Update state manager reference
      stateManager = battleSystem.getStateManager();
      
      // Verify 2 damage was dealt
      expect(result.damageDealt).toBe(2);
      
      // Verify 2 life cards moved to hand
      const finalLifeCount = stateManager.getPlayer(PlayerId.PLAYER_2)!.zones.life.length;
      expect(finalLifeCount).toBe(initialLifeCount - 2);
    });
  });
});
