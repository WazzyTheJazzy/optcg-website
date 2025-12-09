/**
 * DealDamageResolver.test.ts
 * 
 * Unit tests for the DealDamageResolver
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DealDamageResolver } from './DealDamageResolver';
import { GameStateManager, createInitialGameState } from '../../core/GameState';
import {
  PlayerId,
  ZoneId,
  CardCategory,
  CardState,
  Color,
  EffectTimingType,
  CardInstance,
  CardDefinition,
} from '../../core/types';
import { EffectInstance, EffectType, TargetType } from '../types';

describe('DealDamageResolver', () => {
  let resolver: DealDamageResolver;
  let stateManager: GameStateManager;

  beforeEach(() => {
    resolver = new DealDamageResolver();

    // Create initial game state
    const initialState = createInitialGameState();
    
    // Add leaders to both players
    const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
    const player2 = initialState.players.get(PlayerId.PLAYER_2)!;
    player1.zones.leaderArea = createLeader('leader1', PlayerId.PLAYER_1);
    player2.zones.leaderArea = createLeader('leader2', PlayerId.PLAYER_2);

    stateManager = new GameStateManager(initialState);
  });

  describe('resolve', () => {
    it('should deal damage to a leader by moving life cards to hand', () => {
      // Setup: Give player 2 some life cards
      const state = stateManager.getState();
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.life = [
        createLifeCard('life1', PlayerId.PLAYER_2),
        createLifeCard('life2', PlayerId.PLAYER_2),
        createLifeCard('life3', PlayerId.PLAYER_2),
      ];
      stateManager = new GameStateManager(state);

      // Create effect to deal 2 damage to player 2's leader
      const effect = createDealDamageEffect(2, 'leader2');

      // Resolve the effect
      const newState = resolver.resolve(effect, stateManager.getState());
      const newStateManager = new GameStateManager(newState);

      // Verify: Player 2 should have 1 life card remaining
      const updatedPlayer2 = newStateManager.getPlayer(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.life.length).toBe(1);

      // Verify: Player 2 should have 2 cards in hand (the life cards)
      expect(updatedPlayer2.zones.hand.length).toBe(2);
      expect(updatedPlayer2.zones.hand[0].id).toBe('life1');
      expect(updatedPlayer2.zones.hand[1].id).toBe('life2');
    });

    it('should handle damage exceeding available life cards', () => {
      // Setup: Give player 2 only 2 life cards
      const state = stateManager.getState();
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.life = [
        createLifeCard('life1', PlayerId.PLAYER_2),
        createLifeCard('life2', PlayerId.PLAYER_2),
      ];
      stateManager = new GameStateManager(state);

      // Create effect to deal 5 damage (more than available life)
      const effect = createDealDamageEffect(5, 'leader2');

      // Resolve the effect
      const newState = resolver.resolve(effect, stateManager.getState());
      const newStateManager = new GameStateManager(newState);

      // Verify: Player 2 should have 0 life cards remaining
      const updatedPlayer2 = newStateManager.getPlayer(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.life.length).toBe(0);

      // Verify: Player 2 should have 2 cards in hand (all available life cards)
      expect(updatedPlayer2.zones.hand.length).toBe(2);
    });

    it('should handle trigger life cards by moving them to trash', () => {
      // Setup: Give player 2 life cards with triggers
      const state = stateManager.getState();
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.life = [
        createLifeCardWithTrigger('life1', PlayerId.PLAYER_2),
        createLifeCard('life2', PlayerId.PLAYER_2),
        createLifeCard('life3', PlayerId.PLAYER_2),
      ];
      stateManager = new GameStateManager(state);

      // Create effect to deal 2 damage
      const effect = createDealDamageEffect(2, 'leader2');

      // Resolve the effect
      const newState = resolver.resolve(effect, stateManager.getState());
      const newStateManager = new GameStateManager(newState);

      // Verify: Player 2 should have 1 life card remaining
      const updatedPlayer2 = newStateManager.getPlayer(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.life.length).toBe(1);

      // Verify: First card (with trigger) should be in trash
      expect(updatedPlayer2.zones.trash.length).toBe(1);
      expect(updatedPlayer2.zones.trash[0].id).toBe('life1');

      // Verify: Second card (no trigger) should be in hand
      expect(updatedPlayer2.zones.hand.length).toBe(1);
      expect(updatedPlayer2.zones.hand[0].id).toBe('life2');
    });

    it('should return unchanged state when damage value is invalid', () => {
      const state = stateManager.getState();
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.life = [createLifeCard('life1', PlayerId.PLAYER_2)];
      stateManager = new GameStateManager(state);

      // Create effect with invalid damage value
      const effect = createDealDamageEffect(0, 'leader2');

      // Resolve the effect
      const newState = resolver.resolve(effect, stateManager.getState());

      // Verify: State should be unchanged
      expect(newState).toEqual(stateManager.getState());
    });

    it('should return unchanged state when target is not a leader', () => {
      const state = stateManager.getState();
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.life = [createLifeCard('life1', PlayerId.PLAYER_2)];
      
      // Add a character to target instead
      const character = createCharacter('char1', PlayerId.PLAYER_2);
      player2.zones.characterArea = [character];
      stateManager = new GameStateManager(state);

      // Create effect targeting the character instead of leader
      const effect = createDealDamageEffect(1, 'char1');

      // Resolve the effect
      const newState = resolver.resolve(effect, stateManager.getState());

      // Verify: State should be unchanged (no damage dealt to character)
      const newStateManager = new GameStateManager(newState);
      const updatedPlayer2 = newStateManager.getPlayer(PlayerId.PLAYER_2)!;
      expect(updatedPlayer2.zones.life.length).toBe(1);
      expect(updatedPlayer2.zones.hand.length).toBe(0);
    });

    it('should return unchanged state when target card is not found', () => {
      const state = stateManager.getState();
      const player2 = state.players.get(PlayerId.PLAYER_2)!;
      player2.zones.life = [createLifeCard('life1', PlayerId.PLAYER_2)];
      stateManager = new GameStateManager(state);

      // Create effect targeting non-existent card
      const effect = createDealDamageEffect(1, 'nonexistent');

      // Resolve the effect
      const newState = resolver.resolve(effect, stateManager.getState());

      // Verify: State should be unchanged
      expect(newState).toEqual(stateManager.getState());
    });
  });

  describe('canResolve', () => {
    it('should return true for valid damage effect', () => {
      const effect = createDealDamageEffect(2, 'leader2');
      const result = resolver.canResolve(effect, stateManager.getState());
      expect(result).toBe(true);
    });

    it('should return false when damage value is missing', () => {
      const effect = createDealDamageEffect(0, 'leader2');
      effect.definition.parameters.value = undefined;
      const result = resolver.canResolve(effect, stateManager.getState());
      expect(result).toBe(false);
    });

    it('should return false when damage value is zero', () => {
      const effect = createDealDamageEffect(0, 'leader2');
      const result = resolver.canResolve(effect, stateManager.getState());
      expect(result).toBe(false);
    });

    it('should return false when damage value is negative', () => {
      const effect = createDealDamageEffect(-1, 'leader2');
      const result = resolver.canResolve(effect, stateManager.getState());
      expect(result).toBe(false);
    });

    it('should return false when targets are missing', () => {
      const effect = createDealDamageEffect(2, 'leader2');
      effect.targets = [];
      const result = resolver.canResolve(effect, stateManager.getState());
      expect(result).toBe(false);
    });
  });
});

// Helper functions

function createLeader(id: string, owner: PlayerId): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: 'Test Leader',
    category: CardCategory.LEADER,
    colors: [Color.RED],
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
      setCode: 'TEST',
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
    zone: ZoneId.LEADER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createLifeCard(id: string, owner: PlayerId): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: 'Test Life Card',
    category: CardCategory.CHARACTER,
    colors: [Color.RED],
    typeTags: [],
    attributes: [],
    basePower: 2000,
    baseCost: 2,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
  };

  return {
    id,
    definition,
    owner,
    controller: owner,
    zone: ZoneId.LIFE,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createLifeCardWithTrigger(id: string, owner: PlayerId): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: 'Test Trigger Life Card',
    category: CardCategory.CHARACTER,
    colors: [Color.RED],
    typeTags: [],
    attributes: [],
    basePower: 2000,
    baseCost: 2,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: ['Trigger'],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '003',
      isAltArt: false,
      isPromo: false,
    },
  };

  return {
    id,
    definition,
    owner,
    controller: owner,
    zone: ZoneId.LIFE,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createCharacter(id: string, owner: PlayerId): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: 'Test Character',
    category: CardCategory.CHARACTER,
    colors: [Color.RED],
    typeTags: [],
    attributes: [],
    basePower: 3000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '004',
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
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createDealDamageEffect(
  damageValue: number,
  targetCardId: string
): EffectInstance {
  return {
    id: 'effect-1',
    definition: {
      id: 'def-1',
      sourceCardId: 'source-1',
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: null,
      condition: null,
      cost: null,
      effectType: EffectType.DEAL_DAMAGE,
      parameters: {
        value: damageValue,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    },
    sourceCardId: 'source-1',
    controller: PlayerId.PLAYER_1,
    targets: [
      {
        type: TargetType.CARD,
        cardId: targetCardId,
      },
    ],
    chosenValues: new Map(),
    timestamp: Date.now(),
    resolved: false,
  };
}
