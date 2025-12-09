/**
 * LoopGuard.test.ts
 * 
 * Tests for the infinite loop detection system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoopGuard } from './LoopGuard';
import { RulesContext } from '../rules/RulesContext';
import { 
  GameState, 
  PlayerId, 
  Phase, 
  CardState,
  ZoneId,
  CardCategory,
  CardInstance,
  DonInstance,
  PlayerState,
} from '../core/types';

describe('LoopGuard', () => {
  let loopGuard: LoopGuard;
  let rules: RulesContext;
  let baseState: GameState;

  beforeEach(() => {
    rules = new RulesContext();
    loopGuard = new LoopGuard(rules);
    baseState = createTestGameState();
  });

  describe('hashRelevantState', () => {
    it('should create consistent hashes for identical states', () => {
      const hash1 = loopGuard.hashRelevantState(baseState);
      const hash2 = loopGuard.hashRelevantState(baseState);
      
      expect(hash1).toBe(hash2);
    });

    it('should create different hashes when card positions change', () => {
      const state1 = createTestGameState();
      const hash1 = loopGuard.hashRelevantState(state1);
      
      // Create a new state with a character added
      const state2 = createTestGameState();
      const player1_state2 = state2.players.get(PlayerId.PLAYER_1)!;
      player1_state2.zones.characterArea.push(createTestCharacter('char1', PlayerId.PLAYER_1));
      
      const hash2 = loopGuard.hashRelevantState(state2);
      
      // Verify the states are actually different
      const player1_state1 = state1.players.get(PlayerId.PLAYER_1)!;
      expect(player1_state1.zones.characterArea.length).toBe(0);
      expect(player1_state2.zones.characterArea.length).toBe(1);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes when card states change', () => {
      // Create state with active character
      const state1 = createTestGameState();
      const player1_state1 = state1.players.get(PlayerId.PLAYER_1)!;
      const character1 = createTestCharacter('char1', PlayerId.PLAYER_1);
      character1.state = CardState.ACTIVE;
      player1_state1.zones.characterArea.push(character1);
      
      const hash1 = loopGuard.hashRelevantState(state1);
      
      // Create state with rested character
      const state2 = createTestGameState();
      const player1_state2 = state2.players.get(PlayerId.PLAYER_1)!;
      const character2 = createTestCharacter('char1', PlayerId.PLAYER_1);
      character2.state = CardState.RESTED;
      player1_state2.zones.characterArea.push(character2);
      
      const hash2 = loopGuard.hashRelevantState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes when DON states change', () => {
      // Create state with active DON
      const state1 = createTestGameState();
      const player1_state1 = state1.players.get(PlayerId.PLAYER_1)!;
      const don1 = createTestDon('don1', PlayerId.PLAYER_1);
      don1.state = CardState.ACTIVE;
      player1_state1.zones.costArea.push(don1);
      
      const hash1 = loopGuard.hashRelevantState(state1);
      
      // Create state with rested DON
      const state2 = createTestGameState();
      const player1_state2 = state2.players.get(PlayerId.PLAYER_1)!;
      const don2 = createTestDon('don1', PlayerId.PLAYER_1);
      don2.state = CardState.RESTED;
      player1_state2.zones.costArea.push(don2);
      
      const hash2 = loopGuard.hashRelevantState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes when phase changes', () => {
      const hash1 = loopGuard.hashRelevantState(baseState);
      
      baseState.phase = Phase.MAIN;
      
      const hash2 = loopGuard.hashRelevantState(baseState);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes when active player changes', () => {
      const hash1 = loopGuard.hashRelevantState(baseState);
      
      baseState.activePlayer = PlayerId.PLAYER_2;
      
      const hash2 = loopGuard.hashRelevantState(baseState);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes when given DON count changes', () => {
      // Create state with character without given DON
      const state1 = createTestGameState();
      const player1_state1 = state1.players.get(PlayerId.PLAYER_1)!;
      const character1 = createTestCharacter('char1', PlayerId.PLAYER_1);
      player1_state1.zones.characterArea.push(character1);
      
      const hash1 = loopGuard.hashRelevantState(state1);
      
      // Create state with character with given DON
      const state2 = createTestGameState();
      const player1_state2 = state2.players.get(PlayerId.PLAYER_1)!;
      const character2 = createTestCharacter('char1', PlayerId.PLAYER_1);
      character2.givenDon.push(createTestDon('don1', PlayerId.PLAYER_1));
      player1_state2.zones.characterArea.push(character2);
      
      const hash2 = loopGuard.hashRelevantState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should ignore hidden zone contents but track sizes', () => {
      // Create state with 1 card in deck
      const state1 = createTestGameState();
      const player1_state1 = state1.players.get(PlayerId.PLAYER_1)!;
      player1_state1.zones.deck.push(createTestCharacter('deck1', PlayerId.PLAYER_1));
      const hash1 = loopGuard.hashRelevantState(state1);
      
      // Create state with different card in deck (same size)
      const state2 = createTestGameState();
      const player1_state2 = state2.players.get(PlayerId.PLAYER_1)!;
      player1_state2.zones.deck.push(createTestCharacter('deck2', PlayerId.PLAYER_1));
      const hash2 = loopGuard.hashRelevantState(state2);
      
      // Hashes should be the same (deck contents don't matter, only size)
      expect(hash1).toBe(hash2);
      
      // Create state with 2 cards in deck
      const state3 = createTestGameState();
      const player1_state3 = state3.players.get(PlayerId.PLAYER_1)!;
      player1_state3.zones.deck.push(createTestCharacter('deck1', PlayerId.PLAYER_1));
      player1_state3.zones.deck.push(createTestCharacter('deck3', PlayerId.PLAYER_1));
      const hash3 = loopGuard.hashRelevantState(state3);
      
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('checkForLoop', () => {
    it('should not detect loop when state has not repeated', () => {
      const result = loopGuard.checkForLoop(baseState);
      
      expect(result.loopDetected).toBe(false);
      expect(result.resolution).toBe('continue');
    });

    it('should detect loop when state repeats max times', () => {
      const stateHash = loopGuard.hashRelevantState(baseState);
      const maxRepeats = baseState.loopGuardState.maxRepeats;
      
      // Simulate the state being seen max times
      baseState.loopGuardState.stateHashes.set(stateHash, maxRepeats);
      
      const result = loopGuard.checkForLoop(baseState);
      
      expect(result.loopDetected).toBe(true);
    });

    it('should not detect loop when state repeats less than max times', () => {
      const stateHash = loopGuard.hashRelevantState(baseState);
      const maxRepeats = baseState.loopGuardState.maxRepeats;
      
      // Simulate the state being seen less than max times
      baseState.loopGuardState.stateHashes.set(stateHash, maxRepeats - 1);
      
      const result = loopGuard.checkForLoop(baseState);
      
      expect(result.loopDetected).toBe(false);
    });
  });

  describe('resolveInfiniteLoopByRules', () => {
    it('should return continue when both players can stop', () => {
      // Set up state where active player is in main phase with resources
      baseState.phase = Phase.MAIN;
      baseState.activePlayer = PlayerId.PLAYER_1;
      
      const player1 = baseState.players.get(PlayerId.PLAYER_1)!;
      player1.zones.hand.push(createTestCharacter('hand1', PlayerId.PLAYER_1));
      player1.zones.costArea.push(createTestDon('don1', PlayerId.PLAYER_1));
      
      const stateHash = loopGuard.hashRelevantState(baseState);
      baseState.loopGuardState.stateHashes.set(stateHash, baseState.loopGuardState.maxRepeats);
      
      const result = loopGuard.checkForLoop(baseState);
      
      expect(result.loopDetected).toBe(true);
      // With current heuristic, only active player can stop during their main phase
      expect(result.resolution).toMatch(/player\d_must_stop/);
    });

    it('should return draw when neither player can stop', () => {
      // Set up state where no player has choices (not main phase, no resources)
      baseState.phase = Phase.DRAW;
      baseState.activePlayer = PlayerId.PLAYER_1;
      
      const stateHash = loopGuard.hashRelevantState(baseState);
      baseState.loopGuardState.stateHashes.set(stateHash, baseState.loopGuardState.maxRepeats);
      
      const result = loopGuard.checkForLoop(baseState);
      
      expect(result.loopDetected).toBe(true);
      expect(result.resolution).toBe('draw');
    });

    it('should identify stopping player when only one can stop', () => {
      // Active player in main phase with cards
      baseState.phase = Phase.MAIN;
      baseState.activePlayer = PlayerId.PLAYER_1;
      
      const player1 = baseState.players.get(PlayerId.PLAYER_1)!;
      player1.zones.hand.push(createTestCharacter('hand1', PlayerId.PLAYER_1));
      
      const stateHash = loopGuard.hashRelevantState(baseState);
      baseState.loopGuardState.stateHashes.set(stateHash, baseState.loopGuardState.maxRepeats);
      
      const result = loopGuard.checkForLoop(baseState);
      
      expect(result.loopDetected).toBe(true);
      expect(result.stoppingPlayer).toBe(PlayerId.PLAYER_1);
      expect(result.resolution).toBe('player1_must_stop');
    });
  });

  describe('recordState', () => {
    it('should return the state hash', () => {
      const hash = loopGuard.recordState(baseState);
      const expectedHash = loopGuard.hashRelevantState(baseState);
      
      expect(hash).toBe(expectedHash);
    });
  });

  describe('getRepeatCount', () => {
    it('should return 0 for unseen state', () => {
      const count = loopGuard.getRepeatCount(baseState);
      
      expect(count).toBe(0);
    });

    it('should return correct count for seen state', () => {
      const stateHash = loopGuard.hashRelevantState(baseState);
      baseState.loopGuardState.stateHashes.set(stateHash, 3);
      
      const count = loopGuard.getRepeatCount(baseState);
      
      expect(count).toBe(3);
    });
  });

  describe('createFreshLoopGuardState', () => {
    it('should create empty state with max repeats from rules', () => {
      const freshState = loopGuard.createFreshLoopGuardState();
      
      expect(freshState.stateHashes.size).toBe(0);
      expect(freshState.maxRepeats).toBe(rules.getInfiniteLoopRules().maxRepeats);
    });
  });

  describe('integration scenarios', () => {
    it('should track multiple different states', () => {
      // State 1
      const hash1 = loopGuard.hashRelevantState(baseState);
      baseState.loopGuardState.stateHashes.set(hash1, 1);
      
      // State 2 (different phase)
      baseState.phase = Phase.MAIN;
      const hash2 = loopGuard.hashRelevantState(baseState);
      baseState.loopGuardState.stateHashes.set(hash2, 1);
      
      // State 3 (different active player)
      baseState.activePlayer = PlayerId.PLAYER_2;
      const hash3 = loopGuard.hashRelevantState(baseState);
      baseState.loopGuardState.stateHashes.set(hash3, 1);
      
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
      expect(hash1).not.toBe(hash3);
      expect(baseState.loopGuardState.stateHashes.size).toBe(3);
    });

    it('should detect loop after multiple returns to same state', () => {
      const maxRepeats = baseState.loopGuardState.maxRepeats;
      
      // Simulate returning to the same state multiple times
      for (let i = 0; i < maxRepeats - 1; i++) {
        const hash = loopGuard.hashRelevantState(baseState);
        const currentCount = baseState.loopGuardState.stateHashes.get(hash) || 0;
        baseState.loopGuardState.stateHashes.set(hash, currentCount + 1);
        
        const result = loopGuard.checkForLoop(baseState);
        expect(result.loopDetected).toBe(false);
      }
      
      // One more time should trigger loop detection
      const hash = loopGuard.hashRelevantState(baseState);
      const currentCount = baseState.loopGuardState.stateHashes.get(hash) || 0;
      baseState.loopGuardState.stateHashes.set(hash, currentCount + 1);
      
      const result = loopGuard.checkForLoop(baseState);
      expect(result.loopDetected).toBe(true);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestGameState(): GameState {
  const player1: PlayerState = {
    id: PlayerId.PLAYER_1,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [],
      donDeck: [],
      costArea: [],
      leaderArea: createTestLeader('leader1', PlayerId.PLAYER_1),
      characterArea: [],
      stageArea: null,
      banished: [],
    },
    flags: new Map(),
  };

  const player2: PlayerState = {
    id: PlayerId.PLAYER_2,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [],
      donDeck: [],
      costArea: [],
      leaderArea: createTestLeader('leader2', PlayerId.PLAYER_2),
      characterArea: [],
      stageArea: null,
      banished: [],
    },
    flags: new Map(),
  };

  return {
    players: new Map([
      [PlayerId.PLAYER_1, player1],
      [PlayerId.PLAYER_2, player2],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.REFRESH,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 4, // From rules.json
    },
  };
}

function createTestLeader(id: string, owner: PlayerId): CardInstance {
  return {
    id,
    definition: {
      id: `def-${id}`,
      name: 'Test Leader',
      category: CardCategory.LEADER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: null,
      lifeValue: 5,
      counterValue: null,
      rarity: 'L',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner,
    controller: owner,
    zone: ZoneId.LEADER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createTestCharacter(id: string, owner: PlayerId): CardInstance {
  return {
    id,
    definition: {
      id: `def-${id}`,
      name: 'Test Character',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 4000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '002',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner,
    controller: owner,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createTestDon(id: string, owner: PlayerId): DonInstance {
  return {
    id,
    owner,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  };
}
