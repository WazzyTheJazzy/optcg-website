/**
 * HumanPlayer.test.ts
 * 
 * Tests for the HumanPlayer implementation
 */

import { describe, it, expect, vi } from 'vitest';
import { HumanPlayer, createHumanPlayer } from './HumanPlayer';
import {
  PlayerId,
  PlayerType,
  GameAction,
  ActionType,
  CardInstance,
  CounterAction,
  Target,
  TargetType,
  EffectInstance,
  GameState,
  Phase,
  ZoneId,
  CardCategory,
  CardState,
  EffectTimingType,
} from '../core/types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockGameState(): GameState {
  return {
    players: new Map(),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.MAIN,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 3,
    },
  };
}

function createMockCard(id: string): CardInstance {
  return {
    id,
    definition: {
      id: 'card-def-1',
      name: 'Test Card',
      category: CardCategory.CHARACTER,
      colors: ['RED'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
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
    },
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createMockAction(type: ActionType): GameAction {
  return {
    type,
    playerId: PlayerId.PLAYER_1,
    data: {},
    timestamp: Date.now(),
  };
}

function createMockEffect(): EffectInstance {
  const card = createMockCard('test-card');
  return {
    effectDefinition: {
      id: 'effect-1',
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: null,
      condition: null,
      cost: null,
      scriptId: 'test-script',
      oncePerTurn: false,
    },
    source: card,
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map(),
    context: null,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('HumanPlayer', () => {
  describe('constructor', () => {
    it('should create a human player with correct id and type', () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      
      expect(player.id).toBe(PlayerId.PLAYER_1);
      expect(player.type).toBe(PlayerType.HUMAN);
    });
    
    it('should accept callbacks in constructor', () => {
      const mockCallback = vi.fn();
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseAction: mockCallback,
      });
      
      expect(player).toBeDefined();
    });
  });
  
  describe('setCallbacks', () => {
    it('should update callbacks', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const mockAction = createMockAction(ActionType.END_PHASE);
      const mockCallback = vi.fn().mockResolvedValue(mockAction);
      
      player.setCallbacks({ onChooseAction: mockCallback });
      
      const result = await player.chooseAction([mockAction], createMockGameState());
      
      expect(mockCallback).toHaveBeenCalled();
      expect(result).toBe(mockAction);
    });
    
    it('should partially update callbacks', async () => {
      const mockActionCallback = vi.fn().mockResolvedValue(createMockAction(ActionType.END_PHASE));
      const mockMulliganCallback = vi.fn().mockResolvedValue(true);
      
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseAction: mockActionCallback,
      });
      
      player.setCallbacks({ onChooseMulligan: mockMulliganCallback });
      
      // Both callbacks should work
      await player.chooseAction([createMockAction(ActionType.END_PHASE)], createMockGameState());
      await player.chooseMulligan([], createMockGameState());
      
      expect(mockActionCallback).toHaveBeenCalled();
      expect(mockMulliganCallback).toHaveBeenCalled();
    });
  });
  
  describe('chooseAction', () => {
    it('should call the callback when provided', async () => {
      const mockAction = createMockAction(ActionType.END_PHASE);
      const mockCallback = vi.fn().mockResolvedValue(mockAction);
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseAction: mockCallback,
      });
      
      const state = createMockGameState();
      const result = await player.chooseAction([mockAction], state);
      
      expect(mockCallback).toHaveBeenCalledWith([mockAction], state);
      expect(result).toBe(mockAction);
    });
    
    it('should return first action as fallback when no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const mockAction = createMockAction(ActionType.END_PHASE);
      
      const result = await player.chooseAction([mockAction], createMockGameState());
      
      expect(result).toBe(mockAction);
    });
    
    it('should throw error when no actions available and no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      
      await expect(
        player.chooseAction([], createMockGameState())
      ).rejects.toThrow('No legal actions available');
    });
  });
  
  describe('chooseMulligan', () => {
    it('should call the callback when provided', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseMulligan: mockCallback,
      });
      
      const hand = [createMockCard('card-1')];
      const state = createMockGameState();
      const result = await player.chooseMulligan(hand, state);
      
      expect(mockCallback).toHaveBeenCalledWith(hand, state);
      expect(result).toBe(true);
    });
    
    it('should return false as fallback when no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const hand = [createMockCard('card-1')];
      
      const result = await player.chooseMulligan(hand, createMockGameState());
      
      expect(result).toBe(false);
    });
  });
  
  describe('chooseBlocker', () => {
    it('should call the callback when provided', async () => {
      const blocker = createMockCard('blocker-1');
      const attacker = createMockCard('attacker-1');
      const mockCallback = vi.fn().mockResolvedValue(blocker);
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseBlocker: mockCallback,
      });
      
      const state = createMockGameState();
      const result = await player.chooseBlocker([blocker], attacker, state);
      
      expect(mockCallback).toHaveBeenCalledWith([blocker], attacker, state);
      expect(result).toBe(blocker);
    });
    
    it('should return null as fallback when no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const blocker = createMockCard('blocker-1');
      const attacker = createMockCard('attacker-1');
      
      const result = await player.chooseBlocker([blocker], attacker, createMockGameState());
      
      expect(result).toBeNull();
    });
  });
  
  describe('chooseCounterAction', () => {
    it('should call the callback when provided', async () => {
      const counterAction: CounterAction = { type: 'PASS' };
      const mockCallback = vi.fn().mockResolvedValue(counterAction);
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseCounterAction: mockCallback,
      });
      
      const options: CounterAction[] = [counterAction];
      const state = createMockGameState();
      const result = await player.chooseCounterAction(options, state);
      
      expect(mockCallback).toHaveBeenCalledWith(options, state);
      expect(result).toBe(counterAction);
    });
    
    it('should return null as fallback when no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const options: CounterAction[] = [{ type: 'PASS' }];
      
      const result = await player.chooseCounterAction(options, createMockGameState());
      
      expect(result).toBeNull();
    });
  });
  
  describe('chooseTarget', () => {
    it('should call the callback when provided', async () => {
      const target: Target = { type: TargetType.CARD, cardId: 'card-1' };
      const mockCallback = vi.fn().mockResolvedValue(target);
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseTarget: mockCallback,
      });
      
      const effect = createMockEffect();
      const state = createMockGameState();
      const result = await player.chooseTarget([target], effect, state);
      
      expect(mockCallback).toHaveBeenCalledWith([target], effect, state);
      expect(result).toBe(target);
    });
    
    it('should return first target as fallback when no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const target: Target = { type: TargetType.CARD, cardId: 'card-1' };
      const effect = createMockEffect();
      
      const result = await player.chooseTarget([target], effect, createMockGameState());
      
      expect(result).toBe(target);
    });
    
    it('should throw error when no targets available and no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const effect = createMockEffect();
      
      await expect(
        player.chooseTarget([], effect, createMockGameState())
      ).rejects.toThrow('No legal targets available');
    });
  });
  
  describe('chooseValue', () => {
    it('should call the callback when provided', async () => {
      const mockCallback = vi.fn().mockResolvedValue(5);
      const player = new HumanPlayer(PlayerId.PLAYER_1, {
        onChooseValue: mockCallback,
      });
      
      const options = [1, 3, 5];
      const effect = createMockEffect();
      const state = createMockGameState();
      const result = await player.chooseValue(options, effect, state);
      
      expect(mockCallback).toHaveBeenCalledWith(options, effect, state);
      expect(result).toBe(5);
    });
    
    it('should return first value as fallback when no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const options = [1, 3, 5];
      const effect = createMockEffect();
      
      const result = await player.chooseValue(options, effect, createMockGameState());
      
      expect(result).toBe(1);
    });
    
    it('should throw error when no options available and no callback', async () => {
      const player = new HumanPlayer(PlayerId.PLAYER_1);
      const effect = createMockEffect();
      
      await expect(
        player.chooseValue([], effect, createMockGameState())
      ).rejects.toThrow('No value options available');
    });
  });
  
  describe('createHumanPlayer factory', () => {
    it('should create a human player', () => {
      const player = createHumanPlayer(PlayerId.PLAYER_2);
      
      expect(player).toBeInstanceOf(HumanPlayer);
      expect(player.id).toBe(PlayerId.PLAYER_2);
      expect(player.type).toBe(PlayerType.HUMAN);
    });
    
    it('should create a human player with callbacks', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);
      const player = createHumanPlayer(PlayerId.PLAYER_1, {
        onChooseMulligan: mockCallback,
      });
      
      await player.chooseMulligan([], createMockGameState());
      
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
