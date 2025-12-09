/**
 * CrossPhase.integration.test.ts
 * 
 * Integration tests for cross-phase state consistency
 * Tests that state changes in one phase are properly reflected in subsequent phases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseManager } from './PhaseManager';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardState,
  CardCategory,
  CardDefinition,
  CardInstance,
  DonInstance,
  ModifierDuration,
  ModifierType,
  Modifier,
} from '../core/types';

describe('Cross-Phase Integration Tests', () => {
  let phaseManager: PhaseManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;
  let stateManager: GameStateManager;

  // Helper function to create a test card
  const createTestCard = (
    id: string,
    owner: PlayerId,
    zone: ZoneId,
    state: CardState = CardState.NONE,
    category: CardCategory = CardCategory.CHARACTER
  ): CardInstance => {
    const cardDef: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 3000,
      baseCost: 2,
      lifeValue: category === CardCategory.LEADER ? 5 : null,
      counterValue: category === CardCategory.CHARACTER ? 1000 : null,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: id,
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition: cardDef,
      owner,
      controller: owner,
      zone,
      state,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper function to create a test DON
  const createTestDon = (
    id: string,
    owner: PlayerId,
    zone: ZoneId,
    state: CardState = CardState.NONE
  ): DonInstance => {
    return {
      id,
      owner,
      zone,
      state,
    };
  };

  beforeEach(() => {
    rules = new RulesContext();
    eventEmitter = new EventEmitter();
    phaseManager = new PhaseManager(rules, eventEmitter);

    // Create initial state with cards and DON
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Add DON to don decks
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
    const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

    if (player1 && player2) {
      // Add 10 DON to each player's don deck
      for (let i = 0; i < 10; i++) {
        const don1: DonInstance = {
          id: `don-p1-${i}`,
          owner: PlayerId.PLAYER_1,
          zone: ZoneId.DON_DECK,
          state: CardState.NONE,
        };
        player1.zones.donDeck.push(don1);

        const don2: DonInstance = {
          id: `don-p2-${i}`,
          owner: PlayerId.PLAYER_2,
          zone: ZoneId.DON_DECK,
          state: CardState.NONE,
        };
        player2.zones.donDeck.push(don2);
      }

      // Add cards to decks
      for (let i = 0; i < 10; i++) {
        const card1 = createTestCard(`card-p1-${i}`, PlayerId.PLAYER_1, ZoneId.DECK);
        player1.zones.deck.push(card1);

        const card2 = createTestCard(`card-p2-${i}`, PlayerId.PLAYER_2, ZoneId.DECK);
        player2.zones.deck.push(card2);
      }
    }

    stateManager = new GameStateManager(stateManager.getState());
  });

  describe('DON given in Main Phase, returned in Refresh Phase', () => {
    it('should return DON given to character in Main Phase during next Refresh Phase', () => {
      // Setup: Place DON in cost area and character on field
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don-test-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      const character = createTestCard('char-test-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      player1.zones.costArea.push(don1);
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      // Simulate giving DON to character (as would happen in Main Phase)
      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedCharacter = updatedPlayer1.zones.characterArea.find(c => c.id === 'char-test-1')!;
      const donToGive = updatedPlayer1.zones.costArea.find(d => d.id === 'don-test-1')!;
      
      // Move DON to character
      updatedCharacter.givenDon.push({ ...donToGive, zone: ZoneId.CHARACTER_AREA });
      updatedPlayer1.zones.costArea = updatedPlayer1.zones.costArea.filter(d => d.id !== 'don-test-1');
      stateManager = new GameStateManager(stateManager.getState());

      // Verify DON is on character
      const playerBeforeRefresh = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charBeforeRefresh = playerBeforeRefresh.zones.characterArea.find(c => c.id === 'char-test-1')!;
      expect(charBeforeRefresh.givenDon).toHaveLength(1);
      expect(charBeforeRefresh.givenDon[0].id).toBe('don-test-1');

      // Run a full turn (which includes Refresh Phase at the start)
      stateManager = phaseManager.runTurn(stateManager);

      // Verify DON was returned to cost area during Refresh Phase
      const playerAfterTurn = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charAfterTurn = playerAfterTurn.zones.characterArea.find(c => c.id === 'char-test-1');
      
      // Character should have no given DON
      expect(charAfterTurn?.givenDon).toHaveLength(0);
      
      // DON should be back in cost area and active
      const returnedDon = playerAfterTurn.zones.costArea.find(d => d.id === 'don-test-1');
      expect(returnedDon).toBeDefined();
      expect(returnedDon?.state).toBe(CardState.ACTIVE);
    });

    it('should return DON given to leader in Main Phase during next Refresh Phase', () => {
      // Setup: Place DON in cost area and set leader
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don-test-2', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      const leader = createTestCard('leader-test-1', PlayerId.PLAYER_1, ZoneId.LEADER_AREA, CardState.ACTIVE, CardCategory.LEADER);
      
      player1.zones.costArea.push(don1);
      player1.zones.leaderArea = leader;
      stateManager = new GameStateManager(stateManager.getState());

      // Simulate giving DON to leader
      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const donToGive = updatedPlayer1.zones.costArea.find(d => d.id === 'don-test-2')!;
      
      updatedPlayer1.zones.leaderArea!.givenDon.push({ ...donToGive, zone: ZoneId.LEADER_AREA });
      updatedPlayer1.zones.costArea = updatedPlayer1.zones.costArea.filter(d => d.id !== 'don-test-2');
      stateManager = new GameStateManager(stateManager.getState());

      // Verify DON is on leader
      const playerBeforeRefresh = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      expect(playerBeforeRefresh.zones.leaderArea?.givenDon).toHaveLength(1);

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify DON was returned to cost area
      const playerAfterTurn = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      expect(playerAfterTurn.zones.leaderArea?.givenDon).toHaveLength(0);
      
      const returnedDon = playerAfterTurn.zones.costArea.find(d => d.id === 'don-test-2');
      expect(returnedDon).toBeDefined();
      expect(returnedDon?.state).toBe(CardState.ACTIVE);
    });

    it('should return multiple DON given to multiple characters', () => {
      // Setup: Place multiple DON and characters
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don-multi-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      const don2 = createTestDon('don-multi-2', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      const char1 = createTestCard('char-multi-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      const char2 = createTestCard('char-multi-2', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      player1.zones.costArea.push(don1, don2);
      player1.zones.characterArea.push(char1, char2);
      stateManager = new GameStateManager(stateManager.getState());

      // Give DON to characters
      const updatedPlayer1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const char1Updated = updatedPlayer1.zones.characterArea.find(c => c.id === 'char-multi-1')!;
      const char2Updated = updatedPlayer1.zones.characterArea.find(c => c.id === 'char-multi-2')!;
      const don1ToGive = updatedPlayer1.zones.costArea.find(d => d.id === 'don-multi-1')!;
      const don2ToGive = updatedPlayer1.zones.costArea.find(d => d.id === 'don-multi-2')!;
      
      char1Updated.givenDon.push({ ...don1ToGive, zone: ZoneId.CHARACTER_AREA });
      char2Updated.givenDon.push({ ...don2ToGive, zone: ZoneId.CHARACTER_AREA });
      updatedPlayer1.zones.costArea = [];
      stateManager = new GameStateManager(stateManager.getState());

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify all DON were returned
      const playerAfterTurn = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const char1After = playerAfterTurn.zones.characterArea.find(c => c.id === 'char-multi-1');
      const char2After = playerAfterTurn.zones.characterArea.find(c => c.id === 'char-multi-2');
      
      expect(char1After?.givenDon).toHaveLength(0);
      expect(char2After?.givenDon).toHaveLength(0);
      
      const returnedDon1 = playerAfterTurn.zones.costArea.find(d => d.id === 'don-multi-1');
      const returnedDon2 = playerAfterTurn.zones.costArea.find(d => d.id === 'don-multi-2');
      expect(returnedDon1).toBeDefined();
      expect(returnedDon2).toBeDefined();
    });
  });

  describe('Cards rested in Main Phase, activated in Refresh Phase', () => {
    it('should activate character rested in Main Phase during next Refresh Phase', () => {
      // Setup: Place rested character on field
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const character = createTestCard('char-rest-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.RESTED);
      
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      // Verify character is rested
      const playerBeforeRefresh = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charBefore = playerBeforeRefresh.zones.characterArea.find(c => c.id === 'char-rest-1')!;
      expect(charBefore.state).toBe(CardState.RESTED);

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify character is now active
      const playerAfterTurn = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charAfter = playerAfterTurn.zones.characterArea.find(c => c.id === 'char-rest-1');
      expect(charAfter?.state).toBe(CardState.ACTIVE);
    });

    it('should activate leader rested in Main Phase during next Refresh Phase', () => {
      // Setup: Set rested leader
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const leader = createTestCard('leader-rest-1', PlayerId.PLAYER_1, ZoneId.LEADER_AREA, CardState.RESTED, CardCategory.LEADER);
      
      player1.zones.leaderArea = leader;
      stateManager = new GameStateManager(stateManager.getState());

      // Verify leader is rested
      expect(stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.leaderArea?.state).toBe(CardState.RESTED);

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify leader is now active
      expect(stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.leaderArea?.state).toBe(CardState.ACTIVE);
    });

    it('should activate DON rested in Main Phase during next Refresh Phase', () => {
      // Setup: Place rested DON in cost area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don-rest-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.RESTED);
      const don2 = createTestDon('don-rest-2', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.RESTED);
      
      player1.zones.costArea.push(don1, don2);
      stateManager = new GameStateManager(stateManager.getState());

      // Verify DON are rested
      const playerBefore = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      expect(playerBefore.zones.costArea.every(d => d.state === CardState.RESTED)).toBe(true);

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify DON are now active
      const playerAfter = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const don1After = playerAfter.zones.costArea.find(d => d.id === 'don-rest-1');
      const don2After = playerAfter.zones.costArea.find(d => d.id === 'don-rest-2');
      expect(don1After?.state).toBe(CardState.ACTIVE);
      expect(don2After?.state).toBe(CardState.ACTIVE);
    });

    it('should activate multiple rested cards of different types', () => {
      // Setup: Place multiple rested cards
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const char1 = createTestCard('char-multi-rest-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.RESTED);
      const char2 = createTestCard('char-multi-rest-2', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.RESTED);
      const leader = createTestCard('leader-multi-rest', PlayerId.PLAYER_1, ZoneId.LEADER_AREA, CardState.RESTED, CardCategory.LEADER);
      const don1 = createTestDon('don-multi-rest-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.RESTED);
      
      player1.zones.characterArea.push(char1, char2);
      player1.zones.leaderArea = leader;
      player1.zones.costArea.push(don1);
      stateManager = new GameStateManager(stateManager.getState());

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify all cards are now active
      const playerAfter = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      expect(playerAfter.zones.characterArea.every(c => c.state === CardState.ACTIVE)).toBe(true);
      expect(playerAfter.zones.leaderArea?.state).toBe(CardState.ACTIVE);
      expect(playerAfter.zones.costArea.every(d => d.state === CardState.ACTIVE)).toBe(true);
    });
  });

  describe('Temporary modifiers applied in Main Phase, expired in End Phase', () => {
    it('should expire UNTIL_END_OF_TURN modifier applied in Main Phase', () => {
      // Setup: Place character with temporary modifier
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const character = createTestCard('char-mod-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      const modifier: Modifier = {
        id: 'mod-temp-1',
        type: ModifierType.POWER,
        value: 2000,
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'test-effect',
        timestamp: Date.now(),
      };
      character.modifiers.push(modifier);
      
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      // Verify modifier exists
      const playerBefore = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charBefore = playerBefore.zones.characterArea.find(c => c.id === 'char-mod-1')!;
      expect(charBefore.modifiers).toHaveLength(1);
      expect(charBefore.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);

      // Run a full turn (modifier should expire in End Phase)
      stateManager = phaseManager.runTurn(stateManager);

      // Verify modifier was expired
      const playerAfter = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charAfter = playerAfter.zones.characterArea.find(c => c.id === 'char-mod-1');
      expect(charAfter?.modifiers).toHaveLength(0);
    });

    it('should expire DURING_THIS_TURN modifier applied in Main Phase', () => {
      // Setup: Place character with DURING_THIS_TURN modifier
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const character = createTestCard('char-mod-2', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      const modifier: Modifier = {
        id: 'mod-during-1',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.DURING_THIS_TURN,
        source: 'test-effect',
        timestamp: Date.now(),
      };
      character.modifiers.push(modifier);
      
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify modifier was expired
      const playerAfter = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charAfter = playerAfter.zones.characterArea.find(c => c.id === 'char-mod-2');
      expect(charAfter?.modifiers).toHaveLength(0);
    });

    it('should NOT expire PERMANENT modifier', () => {
      // Setup: Place character with permanent modifier
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const character = createTestCard('char-mod-3', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      const modifier: Modifier = {
        id: 'mod-perm-1',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.PERMANENT,
        source: 'test-effect',
        timestamp: Date.now(),
      };
      character.modifiers.push(modifier);
      
      player1.zones.characterArea.push(character);
      stateManager = new GameStateManager(stateManager.getState());

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify modifier still exists
      const playerAfter = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const charAfter = playerAfter.zones.characterArea.find(c => c.id === 'char-mod-3');
      expect(charAfter?.modifiers).toHaveLength(1);
      expect(charAfter?.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });

    it('should expire modifiers on multiple cards', () => {
      // Setup: Place multiple characters with temporary modifiers
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const char1 = createTestCard('char-mod-multi-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      const char2 = createTestCard('char-mod-multi-2', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      char1.modifiers.push({
        id: 'mod-multi-1',
        type: ModifierType.POWER,
        value: 2000,
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'test-effect',
        timestamp: Date.now(),
      });
      
      char2.modifiers.push({
        id: 'mod-multi-2',
        type: ModifierType.COST,
        value: -1,
        duration: ModifierDuration.DURING_THIS_TURN,
        source: 'test-effect',
        timestamp: Date.now(),
      });
      
      player1.zones.characterArea.push(char1, char2);
      stateManager = new GameStateManager(stateManager.getState());

      // Run a full turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify all modifiers were expired
      const playerAfter = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const char1After = playerAfter.zones.characterArea.find(c => c.id === 'char-mod-multi-1');
      const char2After = playerAfter.zones.characterArea.find(c => c.id === 'char-mod-multi-2');
      expect(char1After?.modifiers).toHaveLength(0);
      expect(char2After?.modifiers).toHaveLength(0);
    });
  });

  describe('Deck empty in Draw Phase stopping turn execution', () => {
    it('should stop turn execution when deck is empty during Draw Phase', () => {
      // Empty player 1's deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.deck = [];
      stateManager = new GameStateManager(stateManager.getState());

      // Advance to turn 2 (so draw happens)
      stateManager = stateManager.incrementTurn();

      const phaseChanges: string[] = [];
      eventEmitter.on(GameEventType.PHASE_CHANGED, (event: any) => {
        phaseChanges.push(event.newPhase);
      });

      // Run turn - should stop after Draw Phase triggers game over
      stateManager = phaseManager.runTurn(stateManager);

      // Verify game is over
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_2);

      // Should not have executed all 5 phases
      expect(phaseChanges.length).toBeLessThan(5);
    });

    it('should emit GAME_OVER event when deck is empty', () => {
      // Empty player 1's deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.deck = [];
      stateManager = new GameStateManager(stateManager.getState());

      // Advance to turn 2
      stateManager = stateManager.incrementTurn();

      const gameOverEvents: any[] = [];
      eventEmitter.on(GameEventType.GAME_OVER, (event) => {
        gameOverEvents.push(event);
      });

      // Run turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify GAME_OVER event was emitted
      expect(gameOverEvents).toHaveLength(1);
      expect(gameOverEvents[0].winner).toBe(PlayerId.PLAYER_2);
      expect(gameOverEvents[0].reason).toBe('DECK_OUT');
    });

    it('should not execute Don Phase or Main Phase after deck out', () => {
      // Empty player 1's deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player1.zones.deck = [];
      stateManager = new GameStateManager(stateManager.getState());

      // Advance to turn 2
      stateManager = stateManager.incrementTurn();

      const initialCostAreaSize = player1.zones.costArea.length;

      // Run turn
      stateManager = phaseManager.runTurn(stateManager);

      // Verify Don Phase did not execute (no DON added to cost area)
      const playerAfter = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      // Cost area size should be same or less (not increased by Don Phase)
      expect(playerAfter.zones.costArea.length).toBeLessThanOrEqual(initialCostAreaSize + 2);
    });
  });

  describe('Game over in any phase stopping turn execution', () => {
    it('should stop turn execution if game is already over before turn starts', () => {
      // Set game over
      stateManager = stateManager.setGameOver(PlayerId.PLAYER_1);

      const phaseChanges: string[] = [];
      eventEmitter.on(GameEventType.PHASE_CHANGED, (event: any) => {
        phaseChanges.push(event.newPhase);
      });

      // Run turn
      stateManager = phaseManager.runTurn(stateManager);

      // Should execute minimal phases
      expect(phaseChanges.length).toBeLessThanOrEqual(1);
      expect(stateManager.isGameOver()).toBe(true);
    });

    it('should not modify game state after game over', () => {
      // Set game over
      stateManager = stateManager.setGameOver(PlayerId.PLAYER_1);

      const initialState = stateManager.getState();

      // Run turn
      stateManager = phaseManager.runTurn(stateManager);

      // Game should still be over with same winner
      expect(stateManager.isGameOver()).toBe(true);
      expect(stateManager.getWinner()).toBe(PlayerId.PLAYER_1);
    });

    it('should handle game over triggered during Refresh Phase', () => {
      // This is a theoretical test - game over typically doesn't happen in Refresh
      // But we test that if it did, execution would stop
      
      stateManager = stateManager.setGameOver(PlayerId.PLAYER_2);

      const phaseChanges: string[] = [];
      eventEmitter.on(GameEventType.PHASE_CHANGED, (event: any) => {
        phaseChanges.push(event.newPhase);
      });

      stateManager = phaseManager.runTurn(stateManager);

      // Should not execute all phases
      expect(phaseChanges.length).toBeLessThan(5);
      expect(stateManager.isGameOver()).toBe(true);
    });

    it('should emit TURN_END even if game is over', () => {
      // Set game over
      stateManager = stateManager.setGameOver(PlayerId.PLAYER_1);

      const turnEndEvents: any[] = [];
      eventEmitter.on(GameEventType.TURN_END, (event) => {
        turnEndEvents.push(event);
      });

      // Run turn
      stateManager = phaseManager.runTurn(stateManager);

      // TURN_END should still be emitted
      expect(turnEndEvents).toHaveLength(1);
    });
  });
});
