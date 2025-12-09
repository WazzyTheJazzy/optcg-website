/**
 * KOHandler.test.ts
 * 
 * Tests for the K.O. (Knock Out) system functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { koCharacter } from './KOHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import {
  CardInstance,
  CardDefinition,
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  TriggerTiming,
  EffectTimingType,
} from '../core/types';

describe('KOHandler - koCharacter', () => {
  let stateManager: GameStateManager;

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

  beforeEach(() => {
    // Create initial game state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
  });

  describe('Basic K.O. functionality', () => {
    it('should move character from character area to trash', () => {
      // Create a character without On K.O. effects
      const characterDef = createTestCardDef('char-1', CardCategory.CHARACTER, 5000, 3);
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA,
        CardState.RESTED
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify character moved to trash
      const updatedPlayer = result.stateManager.getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.characterArea).toHaveLength(0);
      expect(updatedPlayer.zones.trash).toHaveLength(1);
      expect(updatedPlayer.zones.trash[0].id).toBe('char-instance-1');
    });

    it('should return empty triggers array for character without On K.O. effects', () => {
      // Create a character without On K.O. effects
      const characterDef = createTestCardDef('char-1', CardCategory.CHARACTER, 5000, 3);
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify no triggers were created
      expect(result.triggers).toHaveLength(0);
    });
  });

  describe('On K.O. effect handling', () => {
    it('should enqueue On K.O. triggers for character with On K.O. effects', () => {
      // Create a character with an On K.O. effect
      const onKOEffect = {
        id: 'effect-1',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'draw-one-card',
        oncePerTurn: false,
      };

      const characterDef = createTestCardDef(
        'char-1',
        CardCategory.CHARACTER,
        5000,
        3,
        [],
        [onKOEffect]
      );
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify trigger was created
      expect(result.triggers).toHaveLength(1);
      expect(result.triggers[0].effectDefinition.id).toBe('effect-1');
      expect(result.triggers[0].source.id).toBe('char-instance-1');
      expect(result.triggers[0].controller).toBe(PlayerId.PLAYER_1);
    });

    it('should enqueue multiple On K.O. triggers for character with multiple On K.O. effects', () => {
      // Create a character with multiple On K.O. effects
      const onKOEffect1 = {
        id: 'effect-1',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'draw-one-card',
        oncePerTurn: false,
      };

      const onKOEffect2 = {
        id: 'effect-2',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'search-deck',
        oncePerTurn: false,
      };

      const characterDef = createTestCardDef(
        'char-1',
        CardCategory.CHARACTER,
        5000,
        3,
        [],
        [onKOEffect1, onKOEffect2]
      );
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify both triggers were created
      expect(result.triggers).toHaveLength(2);
      expect(result.triggers[0].effectDefinition.id).toBe('effect-1');
      expect(result.triggers[1].effectDefinition.id).toBe('effect-2');
    });

    it('should not enqueue triggers for non-On K.O. effects', () => {
      // Create a character with On Play and When Attacking effects (but no On K.O.)
      const onPlayEffect = {
        id: 'effect-1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'draw-one-card',
        oncePerTurn: false,
      };

      const whenAttackingEffect = {
        id: 'effect-2',
        label: '[When Attacking]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.WHEN_ATTACKING,
        condition: null,
        cost: null,
        scriptId: 'power-boost',
        oncePerTurn: false,
      };

      const characterDef = createTestCardDef(
        'char-1',
        CardCategory.CHARACTER,
        5000,
        3,
        [],
        [onPlayEffect, whenAttackingEffect]
      );
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify no triggers were created (only On K.O. effects should trigger)
      expect(result.triggers).toHaveLength(0);
    });
  });

  describe('Trigger priority', () => {
    it('should assign higher priority to turn player triggers', () => {
      // Create a character with an On K.O. effect
      const onKOEffect = {
        id: 'effect-1',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'draw-one-card',
        oncePerTurn: false,
      };

      const characterDef = createTestCardDef(
        'char-1',
        CardCategory.CHARACTER,
        5000,
        3,
        [],
        [onKOEffect]
      );
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Set active player to PLAYER_1 (turn player)
      const currentState = stateManager.getState();
      const updatedState = {
        ...currentState,
        activePlayer: PlayerId.PLAYER_1,
      };
      stateManager = new GameStateManager(updatedState);

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify trigger has higher priority (1) for turn player
      expect(result.triggers[0].priority).toBe(1);
    });

    it('should assign lower priority to non-turn player triggers', () => {
      // Create a character with an On K.O. effect
      const onKOEffect = {
        id: 'effect-1',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'draw-one-card',
        oncePerTurn: false,
      };

      const characterDef = createTestCardDef(
        'char-1',
        CardCategory.CHARACTER,
        5000,
        3,
        [],
        [onKOEffect]
      );
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Set active player to PLAYER_2 (not the character's controller)
      const currentState = stateManager.getState();
      const updatedState = {
        ...currentState,
        activePlayer: PlayerId.PLAYER_2,
      };
      stateManager = new GameStateManager(updatedState);

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify trigger has lower priority (0) for non-turn player
      expect(result.triggers[0].priority).toBe(0);
    });
  });

  describe('Trigger event context', () => {
    it('should create trigger with proper event context', () => {
      // Create a character with an On K.O. effect
      const onKOEffect = {
        id: 'effect-1',
        label: '[On K.O.]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_KO,
        condition: null,
        cost: null,
        scriptId: 'draw-one-card',
        oncePerTurn: false,
      };

      const characterDef = createTestCardDef(
        'char-1',
        CardCategory.CHARACTER,
        5000,
        3,
        [],
        [onKOEffect]
      );
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA
      );

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify trigger event has proper context
      const trigger = result.triggers[0];
      expect(trigger.event.cardId).toBe('char-instance-1');
      expect(trigger.event.playerId).toBe(PlayerId.PLAYER_1);
      expect(trigger.event.data.fromZone).toBe(ZoneId.CHARACTER_AREA);
      expect(trigger.event.data.toZone).toBe(ZoneId.TRASH);
      expect(trigger.event.data.reason).toBe('KO');
    });
  });

  describe('State consistency', () => {
    it('should maintain state consistency after K.O.', () => {
      // Create multiple characters
      const char1Def = createTestCardDef('char-1', CardCategory.CHARACTER, 5000, 3);
      const char2Def = createTestCardDef('char-2', CardCategory.CHARACTER, 4000, 2);
      const char3Def = createTestCardDef('char-3', CardCategory.CHARACTER, 3000, 1);

      const char1 = createTestCard('char-1-inst', char1Def, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const char2 = createTestCard('char-2-inst', char2Def, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const char3 = createTestCard('char-3-inst', char3Def, PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);

      // Add characters to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [char1, char2, char3],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // K.O. the middle character
      const result = koCharacter(char2, stateManager);

      // Verify state consistency
      const updatedPlayer = result.stateManager.getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.characterArea).toHaveLength(2);
      expect(updatedPlayer.zones.characterArea[0].id).toBe('char-1-inst');
      expect(updatedPlayer.zones.characterArea[1].id).toBe('char-3-inst');
      expect(updatedPlayer.zones.trash).toHaveLength(1);
      expect(updatedPlayer.zones.trash[0].id).toBe('char-2-inst');
    });

    it('should preserve card properties when moving to trash', () => {
      // Create a character with modifiers and given DON
      const characterDef = createTestCardDef('char-1', CardCategory.CHARACTER, 5000, 3);
      const character = createTestCard(
        'char-instance-1',
        characterDef,
        PlayerId.PLAYER_1,
        ZoneId.CHARACTER_AREA,
        CardState.RESTED
      );

      // Add modifiers and given DON
      character.modifiers = [
        {
          id: 'mod-1',
          type: 'POWER' as any,
          value: 1000,
          duration: 'PERMANENT' as any,
          source: 'some-card',
          timestamp: Date.now(),
        },
      ];
      character.givenDon = [
        {
          id: 'don-1',
          owner: PlayerId.PLAYER_1,
          zone: ZoneId.CHARACTER_AREA,
          state: CardState.ACTIVE,
        },
      ];

      // Add character to player's character area
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const updatedZones = {
        ...player1.zones,
        characterArea: [character],
      };
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, { zones: updatedZones });

      // Execute K.O.
      const result = koCharacter(character, stateManager);

      // Verify card properties are preserved in trash
      const trashedCard = result.stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.trash[0];
      expect(trashedCard.modifiers).toHaveLength(1);
      expect(trashedCard.givenDon).toHaveLength(1);
      expect(trashedCard.state).toBe(CardState.RESTED);
    });
  });
});
