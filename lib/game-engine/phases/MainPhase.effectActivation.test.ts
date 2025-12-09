/**
 * MainPhase.effectActivation.test.ts
 * 
 * Tests for effect activation integration in Main Phase
 * 
 * Task 41: Integrate effect system with main phase
 * Validates: Requirements 32.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getLegalActions } from './MainPhase';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import { EffectSystem } from '../effects/EffectSystem';
import { RulesContext } from '../rules/RulesContext';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  ActionType,
  CardDefinition,
  EffectTimingType,
  Phase,
} from '../core/types';
import rulesData from '../rules/rules.json';

describe('MainPhase Effect Activation Integration', () => {
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    rules = new RulesContext(rulesData as any);
    eventEmitter = new EventEmitter();
  });

  // Helper to create a card instance
  function createCardInstance(
    definition: CardDefinition,
    owner: PlayerId,
    zone: ZoneId
  ) {
    return {
      id: `card-${Math.random()}`,
      definition,
      owner,
      controller: owner,
      zone,
      state: CardState.NONE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  }

  it('should generate effect activation actions for [Activate: Main] effects', () => {
    // Create a card with an [Activate: Main] effect
    const cardDef: CardDefinition = {
      id: 'test-card-1',
      name: 'Test Character',
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
      effects: [
        {
          id: 'effect-1',
          label: '[Activate: Main]',
          timingType: EffectTimingType.ACTIVATE,
          triggerTiming: null,
          condition: null,
          cost: null,
          scriptId: 'test-script',
          oncePerTurn: false,
        },
      ],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    // Create initial game state
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);

    // Set phase to MAIN
    stateManager = stateManager.setPhase(Phase.MAIN);

    // Add the card to player 1's character area
    const cardInstance = createCardInstance(cardDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
    
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
      zones: {
        ...player1.zones,
        characterArea: [...player1.zones.characterArea, { ...cardInstance, state: CardState.ACTIVE }],
      },
    });

    // Create zone manager and effect system
    const zoneManager = new ZoneManager(stateManager, eventEmitter);
    const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

    // Register a dummy script for the effect
    effectSystem.registerScript('test-script', (context) => {
      console.log('Test effect executed');
    });

    // Get legal actions
    const legalActions = getLegalActions(
      stateManager,
      PlayerId.PLAYER_1,
      zoneManager,
      effectSystem
    );

    // Find effect activation actions
    const effectActions = legalActions.filter(a => a.type === ActionType.ACTIVATE_EFFECT);

    // Should have exactly one effect activation action
    expect(effectActions.length).toBe(1);
    if (effectActions[0].type === ActionType.ACTIVATE_EFFECT) {
      expect(effectActions[0].sourceCardId).toBe(cardInstance.id);
      expect(effectActions[0].effectId).toBe('effect-1');
    }
  });

  it('should not generate effect activation actions when not in MAIN phase', () => {
    // Create a card with an [Activate: Main] effect
    const cardDef: CardDefinition = {
      id: 'test-card-1',
      name: 'Test Character',
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
      effects: [
        {
          id: 'effect-1',
          label: '[Activate: Main]',
          timingType: EffectTimingType.ACTIVATE,
          triggerTiming: null,
          condition: null,
          cost: null,
          scriptId: 'test-script',
          oncePerTurn: false,
        },
      ],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    // Create initial game state
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);

    // Set phase to DRAW (not MAIN)
    stateManager = stateManager.setPhase(Phase.DRAW);

    // Add the card to player 1's character area
    const cardInstance = createCardInstance(cardDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
    
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
      zones: {
        ...player1.zones,
        characterArea: [...player1.zones.characterArea, { ...cardInstance, state: CardState.ACTIVE }],
      },
    });

    // Create zone manager and effect system
    const zoneManager = new ZoneManager(stateManager, eventEmitter);
    const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

    // Register a dummy script for the effect
    effectSystem.registerScript('test-script', (context) => {
      console.log('Test effect executed');
    });

    // Get legal actions
    const legalActions = getLegalActions(
      stateManager,
      PlayerId.PLAYER_1,
      zoneManager,
      effectSystem
    );

    // Find effect activation actions
    const effectActions = legalActions.filter(a => a.type === ActionType.ACTIVATE_EFFECT);

    // Should have NO effect activation actions (wrong phase)
    expect(effectActions.length).toBe(0);
  });

  it('should not generate effect activation actions for once-per-turn effects already used', () => {
    // Create a card with a once-per-turn [Activate: Main] effect
    const cardDef: CardDefinition = {
      id: 'test-card-1',
      name: 'Test Character',
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
      effects: [
        {
          id: 'effect-1',
          label: '[Activate: Main] [Once Per Turn]',
          timingType: EffectTimingType.ACTIVATE,
          triggerTiming: null,
          condition: null,
          cost: null,
          scriptId: 'test-script',
          oncePerTurn: true,
        },
      ],
      imageUrl: '',
      metadata: {
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    // Create initial game state
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);

    // Set phase to MAIN
    stateManager = stateManager.setPhase(Phase.MAIN);

    // Add the card to player 1's character area with effect already used
    const cardInstance = createCardInstance(cardDef, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
    
    // Mark the effect as used this turn
    const flags = new Map(cardInstance.flags);
    flags.set('effect_effect-1_used_turn', stateManager.getTurnNumber());
    
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
      zones: {
        ...player1.zones,
        characterArea: [...player1.zones.characterArea, { ...cardInstance, state: CardState.ACTIVE, flags }],
      },
    });

    // Create zone manager and effect system
    const zoneManager = new ZoneManager(stateManager, eventEmitter);
    const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

    // Register a dummy script for the effect
    effectSystem.registerScript('test-script', (context) => {
      console.log('Test effect executed');
    });

    // Get legal actions
    const legalActions = getLegalActions(
      stateManager,
      PlayerId.PLAYER_1,
      zoneManager,
      effectSystem
    );

    // Find effect activation actions
    const effectActions = legalActions.filter(a => a.type === ActionType.ACTIVATE_EFFECT);

    // Should have NO effect activation actions (already used this turn)
    expect(effectActions.length).toBe(0);
  });

  it('should work without effectSystem parameter (backward compatibility)', () => {
    // Create initial game state
    const initialState = createInitialGameState();
    let stateManager = new GameStateManager(initialState);

    // Set phase to MAIN
    stateManager = stateManager.setPhase(Phase.MAIN);

    // Create zone manager (no effect system)
    const zoneManager = new ZoneManager(stateManager, eventEmitter);

    // Get legal actions without effect system
    const legalActions = getLegalActions(
      stateManager,
      PlayerId.PLAYER_1,
      zoneManager
      // No effectSystem parameter
    );

    // Should still work and return actions (just no effect activation actions)
    expect(legalActions.length).toBeGreaterThan(0);
    
    // Should have END_PHASE action at minimum
    const endPhaseActions = legalActions.filter(a => a.type === ActionType.END_PHASE);
    expect(endPhaseActions.length).toBe(1);

    // Should have NO effect activation actions (no effect system provided)
    const effectActions = legalActions.filter(a => a.type === ActionType.ACTIVATE_EFFECT);
    expect(effectActions.length).toBe(0);
  });
});
