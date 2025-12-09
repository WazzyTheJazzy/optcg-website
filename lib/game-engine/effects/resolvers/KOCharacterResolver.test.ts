/**
 * KOCharacterResolver.test.ts
 * 
 * Unit tests for KOCharacterResolver
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KOCharacterResolver } from './KOCharacterResolver';
import { createInitialGameState, GameStateManager } from '../../core/GameState';
import {
  GameState,
  PlayerId,
  ZoneId,
  CardCategory,
  CardState,
  EffectTimingType,
  TriggerTiming,
  ModifierDuration,
} from '../../core/types';
import { EffectInstance, EffectType, TargetType } from '../types';

describe('KOCharacterResolver', () => {
  let resolver: KOCharacterResolver;
  let initialState: GameState;

  beforeEach(() => {
    resolver = new KOCharacterResolver();
    initialState = createInitialGameState();
  });

  describe('canResolve', () => {
    it('should always return true (K.O. effects can always resolve)', () => {
      const effect: EffectInstance = {
        id: 'effect-1',
        definition: {
          id: 'def-1',
          sourceCardId: 'card-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.KO_CHARACTER,
          parameters: {
            maxPower: 3000,
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'card-1',
        controller: PlayerId.PLAYER_1,
        targets: [],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      expect(resolver.canResolve(effect, initialState)).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should return unchanged state when no targets', () => {
      const effect: EffectInstance = {
        id: 'effect-1',
        definition: {
          id: 'def-1',
          sourceCardId: 'card-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.KO_CHARACTER,
          parameters: {
            maxPower: 3000,
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'card-1',
        controller: PlayerId.PLAYER_1,
        targets: [],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      const result = resolver.resolve(effect, initialState);
      expect(result).toBe(initialState);
    });

    it('should K.O. a character and move it to trash', () => {
      // Create a character card
      const characterCard = {
        id: 'char-1',
        definition: {
          id: 'def-char-1',
          name: 'Test Character',
          category: CardCategory.CHARACTER,
          colors: ['Red'],
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
            setCode: 'OP01',
            cardNumber: '001',
            isAltArt: false,
            isPromo: false,
          },
        },
        owner: PlayerId.PLAYER_2,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Add character to player 2's character area
      const stateWithChar = {
        ...initialState,
        players: new Map([
          [PlayerId.PLAYER_1, initialState.players.get(PlayerId.PLAYER_1)!],
          [
            PlayerId.PLAYER_2,
            {
              ...initialState.players.get(PlayerId.PLAYER_2)!,
              zones: {
                ...initialState.players.get(PlayerId.PLAYER_2)!.zones,
                characterArea: [characterCard],
              },
            },
          ],
        ]),
      };

      const effect: EffectInstance = {
        id: 'effect-1',
        definition: {
          id: 'def-1',
          sourceCardId: 'card-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.KO_CHARACTER,
          parameters: {
            maxPower: 3000,
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'card-1',
        controller: PlayerId.PLAYER_1,
        targets: [
          {
            type: TargetType.CARD,
            cardId: 'char-1',
          },
        ],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      const result = resolver.resolve(effect, stateWithChar);

      // Verify character is no longer in character area
      const player2 = result.players.get(PlayerId.PLAYER_2);
      expect(player2?.zones.characterArea).toHaveLength(0);

      // Verify character is in trash
      expect(player2?.zones.trash).toHaveLength(1);
      expect(player2?.zones.trash[0].id).toBe('char-1');
    });

    it('should not K.O. character with power exceeding maxPower', () => {
      // Create a character card with high power
      const characterCard = {
        id: 'char-1',
        definition: {
          id: 'def-char-1',
          name: 'Strong Character',
          category: CardCategory.CHARACTER,
          colors: ['Red'],
          typeTags: [],
          attributes: [],
          basePower: 5000,
          baseCost: 5,
          lifeValue: null,
          counterValue: 1000,
          rarity: 'SR',
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
        owner: PlayerId.PLAYER_2,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Add character to player 2's character area
      const stateWithChar = {
        ...initialState,
        players: new Map([
          [PlayerId.PLAYER_1, initialState.players.get(PlayerId.PLAYER_1)!],
          [
            PlayerId.PLAYER_2,
            {
              ...initialState.players.get(PlayerId.PLAYER_2)!,
              zones: {
                ...initialState.players.get(PlayerId.PLAYER_2)!.zones,
                characterArea: [characterCard],
              },
            },
          ],
        ]),
      };

      const effect: EffectInstance = {
        id: 'effect-1',
        definition: {
          id: 'def-1',
          sourceCardId: 'card-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.KO_CHARACTER,
          parameters: {
            maxPower: 3000, // Character has 5000 power
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'card-1',
        controller: PlayerId.PLAYER_1,
        targets: [
          {
            type: TargetType.CARD,
            cardId: 'char-1',
          },
        ],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      const result = resolver.resolve(effect, stateWithChar);

      // Verify character is still in character area (not K.O.'d)
      const player2 = result.players.get(PlayerId.PLAYER_2);
      expect(player2?.zones.characterArea).toHaveLength(1);
      expect(player2?.zones.trash).toHaveLength(0);
    });

    it('should not K.O. character with cost exceeding maxCost', () => {
      // Create a character card with high cost
      const characterCard = {
        id: 'char-1',
        definition: {
          id: 'def-char-1',
          name: 'Expensive Character',
          category: CardCategory.CHARACTER,
          colors: ['Red'],
          typeTags: [],
          attributes: [],
          basePower: 2000,
          baseCost: 5,
          lifeValue: null,
          counterValue: 1000,
          rarity: 'SR',
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
        owner: PlayerId.PLAYER_2,
        controller: PlayerId.PLAYER_2,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        givenDon: [],
        modifiers: [],
        flags: new Map(),
      };

      // Add character to player 2's character area
      const stateWithChar = {
        ...initialState,
        players: new Map([
          [PlayerId.PLAYER_1, initialState.players.get(PlayerId.PLAYER_1)!],
          [
            PlayerId.PLAYER_2,
            {
              ...initialState.players.get(PlayerId.PLAYER_2)!,
              zones: {
                ...initialState.players.get(PlayerId.PLAYER_2)!.zones,
                characterArea: [characterCard],
              },
            },
          ],
        ]),
      };

      const effect: EffectInstance = {
        id: 'effect-1',
        definition: {
          id: 'def-1',
          sourceCardId: 'card-1',
          label: '[On Play]',
          timingType: EffectTimingType.AUTO,
          triggerTiming: TriggerTiming.ON_PLAY,
          condition: null,
          cost: null,
          effectType: EffectType.KO_CHARACTER,
          parameters: {
            maxCost: 3, // Character has cost 5
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'card-1',
        controller: PlayerId.PLAYER_1,
        targets: [
          {
            type: TargetType.CARD,
            cardId: 'char-1',
          },
        ],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      const result = resolver.resolve(effect, stateWithChar);

      // Verify character is still in character area (not K.O.'d)
      const player2 = result.players.get(PlayerId.PLAYER_2);
      expect(player2?.zones.characterArea).toHaveLength(1);
      expect(player2?.zones.trash).toHaveLength(0);
    });
  });
});
