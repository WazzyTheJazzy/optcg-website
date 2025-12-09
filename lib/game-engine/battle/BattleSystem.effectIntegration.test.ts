/**
 * BattleSystem.effectIntegration.test.ts
 * 
 * Tests for effect system integration with battle system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleSystem } from './BattleSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { EffectSystem } from '../effects/EffectSystem';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardState,
  ZoneId,
  CardCategory,
  CardDefinition,
  CardInstance,
  Phase,
  GameEventType,
  TriggerTiming,
  EffectTimingType,
} from '../core/types';

// Helper function to create a test card definition
function createTestCardDef(
  id: string,
  category: CardCategory,
  power: number | null = null,
  cost: number | null = null,
  keywords: string[] = [],
  effects: any[] = []
): CardDefinition {
  return {
    id,
    name: `Test ${category} ${id}`,
    category,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: power,
    baseCost: cost,
    lifeValue: category === CardCategory.LEADER ? 5 : null,
    counterValue: category === CardCategory.CHARACTER ? 1000 : null,
    rarity: 'C',
    keywords,
    effects,
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };
}

// Helper function to create a test card instance
function createTestCard(
  id: string,
  definition: CardDefinition,
  owner: PlayerId,
  zone: ZoneId,
  state: CardState = CardState.ACTIVE
): CardInstance {
  return {
    id,
    definition,
    owner,
    controller: owner,
    zone,
    state,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

describe('BattleSystem - Effect System Integration', () => {
  let battleSystem: BattleSystem;
  let stateManager: GameStateManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;
  let effectSystem: EffectSystem;
  let zoneManager: ZoneManager;

  beforeEach(() => {
    // Create card definitions with effects
    const characterWithEffect = createTestCardDef(
      'char-def-1',
      CardCategory.CHARACTER,
      4000,
      3,
      [],
      [
        {
          id: 'when-attacking-effect',
          label: '[When Attacking]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.WHEN_ATTACKING,
          condition: null,
          cost: null,
          effectType: 'POWER_MODIFICATION' as any,
          parameters: {
            powerChange: 1000,
            duration: 'UNTIL_END_OF_BATTLE' as any,
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
      ]
    );

    const leaderDef = createTestCardDef('leader-def', CardCategory.LEADER, 5000);
    const lifeDef = createTestCardDef('life-def', CardCategory.CHARACTER, 2000);

    // Create initial game state using helper
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Add test cards to the state
    const state = stateManager.getState();
    const player1 = state.players.get(PlayerId.PLAYER_1)!;
    const player2 = state.players.get(PlayerId.PLAYER_2)!;

    // Set up player 1 with leader and character
    player1.zones.leaderArea = createTestCard('leader1', leaderDef, PlayerId.PLAYER_1, ZoneId.LEADER_AREA);
    player1.zones.characterArea = [
      createTestCard('char1', characterWithEffect, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA),
    ];

    // Set up player 2 with leader and life cards
    player2.zones.leaderArea = createTestCard('leader2', leaderDef, PlayerId.PLAYER_2, ZoneId.LEADER_AREA);
    player2.zones.life = [
      createTestCard('life1', lifeDef, PlayerId.PLAYER_2, ZoneId.LIFE),
      createTestCard('life2', lifeDef, PlayerId.PLAYER_2, ZoneId.LIFE),
    ];

    // Update state to turn 2 to avoid first turn battle restriction
    const updatedState = {
      ...state,
      turnNumber: 2,
      phase: Phase.MAIN,
    };

    // Update state manager with modified state
    stateManager = new GameStateManager(updatedState);

    rules = new RulesContext();
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager);
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

    battleSystem = new BattleSystem(stateManager, rules, eventEmitter, effectSystem);
  });

  it('should trigger WHEN_ATTACKING effects during attack step', async () => {
    const attacker = stateManager.getState().players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
    const target = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea;

    // Spy on effectSystem.triggerEffects
    const triggerEffectsSpy = vi.spyOn(effectSystem, 'triggerEffects');

    // Execute attack
    await battleSystem.executeAttack(attacker.id, target.id);

    // Verify that triggerEffects was called with ATTACK_DECLARED event
    expect(triggerEffectsSpy).toHaveBeenCalled();
    const calls = triggerEffectsSpy.mock.calls;
    const attackDeclaredCall = calls.find(call => call[0].type === GameEventType.ATTACK_DECLARED);
    expect(attackDeclaredCall).toBeDefined();
  });

  it('should resolve effect stack after triggering effects', async () => {
    const attacker = stateManager.getState().players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
    const target = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea;

    // Spy on effectSystem.resolveStack
    const resolveStackSpy = vi.spyOn(effectSystem, 'resolveStack');

    // Execute attack
    await battleSystem.executeAttack(attacker.id, target.id);

    // Verify that resolveStack was called
    expect(resolveStackSpy).toHaveBeenCalled();
  });

  it('should update state manager after effect resolution', async () => {
    const attacker = stateManager.getState().players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
    const target = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea;

    // Execute attack
    await battleSystem.executeAttack(attacker.id, target.id);

    // Verify that battle system's state manager was updated
    const updatedStateManager = battleSystem.getStateManager();
    expect(updatedStateManager).toBeDefined();
  });

  it('should work without effect system (backward compatibility)', async () => {
    // Create battle system without effect system
    const battleSystemWithoutEffects = new BattleSystem(stateManager, rules, eventEmitter);

    const attacker = stateManager.getState().players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
    const target = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea;

    // Execute attack - should not throw
    const result = await battleSystemWithoutEffects.executeAttack(attacker.id, target.id);

    // Verify attack completed successfully
    expect(result.success).toBe(true);
  });

  it('should trigger effects during block step', async () => {
    // Add a blocker to player 2
    const blockerDef = createTestCardDef('blocker-def', CardCategory.CHARACTER, 3000, 2, ['Blocker']);
    const blocker = createTestCard('blocker1', blockerDef, PlayerId.PLAYER_2, ZoneId.CHARACTER_AREA);

    const updatedState = {
      ...stateManager.getState(),
      players: new Map(stateManager.getState().players),
    };
    const player2 = updatedState.players.get(PlayerId.PLAYER_2)!;
    player2.zones.characterArea.push(blocker);
    stateManager = new GameStateManager(updatedState);
    battleSystem.updateStateManager(stateManager);
    effectSystem.updateStateManager(stateManager);

    const attacker = stateManager.getState().players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
    const target = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea;

    // Mock player to choose blocker
    const mockPlayer = {
      chooseBlocker: vi.fn().mockResolvedValue(blocker),
      chooseCounterAction: vi.fn().mockResolvedValue({ type: 'PASS' }),
    } as any;
    battleSystem.setPlayerForBlocker(PlayerId.PLAYER_2, mockPlayer);

    // Spy on effectSystem.triggerEffects
    const triggerEffectsSpy = vi.spyOn(effectSystem, 'triggerEffects');

    // Execute attack
    await battleSystem.executeAttack(attacker.id, target.id);

    // Verify that triggerEffects was called with BLOCK_DECLARED event
    const calls = triggerEffectsSpy.mock.calls;
    const blockDeclaredCall = calls.find(call => call[0].type === GameEventType.BLOCK_DECLARED);
    expect(blockDeclaredCall).toBeDefined();
  });

  it('should trigger effects during counter step', async () => {
    const attacker = stateManager.getState().players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
    const target = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea;

    // Mock player to pass on counter
    const mockPlayer = {
      chooseCounterAction: vi.fn().mockResolvedValue({ type: 'PASS' }),
    } as any;
    battleSystem.setPlayerForCounter(PlayerId.PLAYER_2, mockPlayer);

    // Spy on effectSystem.triggerEffects
    const triggerEffectsSpy = vi.spyOn(effectSystem, 'triggerEffects');

    // Execute attack
    await battleSystem.executeAttack(attacker.id, target.id);

    // Verify that triggerEffects was called with COUNTER_STEP_START event
    const calls = triggerEffectsSpy.mock.calls;
    const counterStepCall = calls.find(call => call[0].type === GameEventType.COUNTER_STEP_START);
    expect(counterStepCall).toBeDefined();
  });

  it('should trigger effects at end of battle', async () => {
    const attacker = stateManager.getState().players.get(PlayerId.PLAYER_1)!.zones.characterArea[0];
    const target = stateManager.getState().players.get(PlayerId.PLAYER_2)!.zones.leaderArea;

    // Spy on effectSystem.triggerEffects
    const triggerEffectsSpy = vi.spyOn(effectSystem, 'triggerEffects');

    // Execute attack
    await battleSystem.executeAttack(attacker.id, target.id);

    // Verify that triggerEffects was called with BATTLE_END event
    const calls = triggerEffectsSpy.mock.calls;
    const battleEndCall = calls.find(call => call[0].type === GameEventType.BATTLE_END);
    expect(battleEndCall).toBeDefined();
  });
});
