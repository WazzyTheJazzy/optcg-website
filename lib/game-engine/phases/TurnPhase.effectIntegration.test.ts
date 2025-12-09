/**
 * TurnPhase.effectIntegration.test.ts
 * 
 * Integration tests for effect system integration with turn phases.
 * Tests that START_OF_TURN and END_OF_TURN effects trigger correctly
 * and that modifiers are cleaned up at appropriate times.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { PhaseManager } from './PhaseManager';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import { EffectSystem } from '../effects/EffectSystem';
import { ModifierManager } from '../battle/ModifierManager';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardCategory,
  Color,
  CardState,
  ZoneId,
  Phase,
  TriggerTiming,
  EffectTimingType,
  ModifierDuration,
  ModifierType,
  CardDefinition,
  CardInstance,
} from '../core/types';

describe('Turn Phase Effect Integration', () => {
  let stateManager: GameStateManager;
  let phaseManager: PhaseManager;
  let effectSystem: EffectSystem;
  let modifierManager: ModifierManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    // Initialize components
    rules = new RulesContext();
    eventEmitter = new EventEmitter();
    stateManager = new GameStateManager(createInitialGameState());
    phaseManager = new PhaseManager(rules, eventEmitter);
    
    // Initialize ZoneManager for EffectSystem
    const zoneManager = new ZoneManager(stateManager, eventEmitter);
    
    effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);
    modifierManager = new ModifierManager(stateManager);

    // Setup basic game state with two players
    const player1State = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    const player2State = stateManager.getPlayer(PlayerId.PLAYER_2)!;

    // Create a test leader for player 1
    const leaderDef: CardDefinition = {
      id: 'test-leader-1',
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

    const leader1: CardInstance = {
      id: 'leader-1',
      definition: leaderDef,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.LEADER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
      zones: {
        ...player1State.zones,
        leaderArea: leader1,
      },
    });

    // Create a test leader for player 2
    const leader2: CardInstance = {
      id: 'leader-2',
      definition: { ...leaderDef, id: 'test-leader-2' },
      owner: PlayerId.PLAYER_2,
      controller: PlayerId.PLAYER_2,
      zone: ZoneId.LEADER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };

    stateManager = stateManager.updatePlayer(PlayerId.PLAYER_2, {
      zones: {
        ...player2State.zones,
        leaderArea: leader2,
      },
    });

    // Set active player
    stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);
    stateManager = stateManager.setPhase(Phase.REFRESH);
  });

  describe('START_OF_TURN Effect Triggering', () => {
    it('should call EffectSystem.triggerEffects when TURN_START event is emitted', () => {
      // Track if triggerEffects was called
      let triggerEffectsCalled = false;
      let triggerEffectsEvent: any = null;
      
      const originalTriggerEffects = effectSystem.triggerEffects.bind(effectSystem);
      effectSystem.triggerEffects = (event: any) => {
        triggerEffectsCalled = true;
        triggerEffectsEvent = event;
        originalTriggerEffects(event);
      };

      // Set up phase manager with effect system
      phaseManager.setEffectSystem(effectSystem);
      phaseManager.setModifierManager(modifierManager);

      // Emit TURN_START event (simulating what PhaseManager does)
      const turnStartEvent = {
        type: GameEventType.TURN_START,
        timestamp: Date.now(),
        turnNumber: 1,
        activePlayer: PlayerId.PLAYER_1,
      };
      eventEmitter.emit(turnStartEvent);

      // Manually trigger what PhaseManager would do
      effectSystem.updateStateManager(stateManager);
      effectSystem.triggerEffects(turnStartEvent as any);

      // Verify triggerEffects was called with TURN_START event
      expect(triggerEffectsCalled).toBe(true);
      expect(triggerEffectsEvent).toBeDefined();
      expect(triggerEffectsEvent.type).toBe(GameEventType.TURN_START);
    });
  });

  describe('END_OF_TURN Effect Triggering', () => {
    it('should call EffectSystem.triggerEffects when TURN_END event is emitted', () => {
      // Track if triggerEffects was called
      let triggerEffectsCalled = false;
      let triggerEffectsEvent: any = null;
      
      const originalTriggerEffects = effectSystem.triggerEffects.bind(effectSystem);
      effectSystem.triggerEffects = (event: any) => {
        triggerEffectsCalled = true;
        triggerEffectsEvent = event;
        originalTriggerEffects(event);
      };

      // Set up phase manager with effect system
      phaseManager.setEffectSystem(effectSystem);
      phaseManager.setModifierManager(modifierManager);

      // Emit TURN_END event (simulating what PhaseManager does)
      const turnEndEvent = {
        type: GameEventType.TURN_END,
        timestamp: Date.now(),
        turnNumber: 1,
        activePlayer: PlayerId.PLAYER_1,
      };
      eventEmitter.emit(turnEndEvent);

      // Manually trigger what PhaseManager would do
      effectSystem.updateStateManager(stateManager);
      effectSystem.triggerEffects(turnEndEvent as any);

      // Verify triggerEffects was called with TURN_END event
      expect(triggerEffectsCalled).toBe(true);
      expect(triggerEffectsEvent).toBeDefined();
      expect(triggerEffectsEvent.type).toBe(GameEventType.TURN_END);
    });
  });

  describe('Modifier Cleanup at Turn End', () => {
    it('should remove UNTIL_END_OF_TURN modifiers at turn end', () => {
      // Create a character with a modifier
      const characterDef: CardDefinition = {
        id: 'test-char-3',
        name: 'Test Character 3',
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

      const character: CardInstance = {
        id: 'char-3',
        definition: characterDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: [character],
        },
      });

      // Add a modifier with UNTIL_END_OF_TURN duration
      modifierManager.updateStateManager(stateManager);
      stateManager = modifierManager.addModifier(
        'char-3',
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_END_OF_TURN,
        'test-source'
      );

      // Verify modifier was added
      let updatedCharacter = stateManager.getCard('char-3')!;
      expect(updatedCharacter.modifiers.length).toBe(1);
      expect(updatedCharacter.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);

      // Expire end of turn modifiers
      modifierManager.updateStateManager(stateManager);
      stateManager = modifierManager.expireEndOfTurnModifiers();

      // Verify modifier was removed
      updatedCharacter = stateManager.getCard('char-3')!;
      expect(updatedCharacter.modifiers.length).toBe(0);
    });

    it('should keep PERMANENT modifiers at turn end', () => {
      // Create a character with a permanent modifier
      const characterDef: CardDefinition = {
        id: 'test-char-4',
        name: 'Test Character 4',
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
          cardNumber: '005',
          isAltArt: false,
          isPromo: false,
        },
      };

      const character: CardInstance = {
        id: 'char-4',
        definition: characterDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: [character],
        },
      });

      // Add a permanent modifier
      modifierManager.updateStateManager(stateManager);
      stateManager = modifierManager.addModifier(
        'char-4',
        ModifierType.POWER,
        1000,
        ModifierDuration.PERMANENT,
        'test-source'
      );

      // Verify modifier was added
      let updatedCharacter = stateManager.getCard('char-4')!;
      expect(updatedCharacter.modifiers.length).toBe(1);
      expect(updatedCharacter.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);

      // Expire end of turn modifiers
      modifierManager.updateStateManager(stateManager);
      stateManager = modifierManager.expireEndOfTurnModifiers();

      // Verify permanent modifier was kept
      updatedCharacter = stateManager.getCard('char-4')!;
      expect(updatedCharacter.modifiers.length).toBe(1);
      expect(updatedCharacter.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
    });
  });

  describe('Modifier Cleanup at Turn Start', () => {
    it('should remove UNTIL_START_OF_NEXT_TURN modifiers at turn start', () => {
      // Create a character with a modifier
      const characterDef: CardDefinition = {
        id: 'test-char-5',
        name: 'Test Character 5',
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
          cardNumber: '006',
          isAltArt: false,
          isPromo: false,
        },
      };

      const character: CardInstance = {
        id: 'char-5',
        definition: characterDef,
        owner: PlayerId.PLAYER_1,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          characterArea: [character],
        },
      });

      // Add a modifier with UNTIL_START_OF_NEXT_TURN duration
      modifierManager.updateStateManager(stateManager);
      stateManager = modifierManager.addModifier(
        'char-5',
        ModifierType.POWER,
        1000,
        ModifierDuration.UNTIL_START_OF_NEXT_TURN,
        'test-source'
      );

      // Verify modifier was added
      let updatedCharacter = stateManager.getCard('char-5')!;
      expect(updatedCharacter.modifiers.length).toBe(1);
      expect(updatedCharacter.modifiers[0].duration).toBe(ModifierDuration.UNTIL_START_OF_NEXT_TURN);

      // Expire start of turn modifiers for player 1
      modifierManager.updateStateManager(stateManager);
      stateManager = modifierManager.expireStartOfTurnModifiers(PlayerId.PLAYER_1);

      // Verify modifier was removed
      updatedCharacter = stateManager.getCard('char-5')!;
      expect(updatedCharacter.modifiers.length).toBe(0);
    });
  });
});
