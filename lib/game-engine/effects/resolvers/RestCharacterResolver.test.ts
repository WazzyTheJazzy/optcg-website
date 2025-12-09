/**
 * RestCharacterResolver.test.ts
 * 
 * Unit tests for the RestCharacterResolver.
 */

import { describe, it, expect } from 'vitest';
import { RestCharacterResolver } from './RestCharacterResolver';
import { EffectInstance, EffectType, TargetType } from '../types';
import { 
  GameState, 
  PlayerId, 
  Phase, 
  ZoneId, 
  CardCategory, 
  CardState,
  Color,
  CardInstance,
  CardDefinition,
  EffectTimingType,
} from '../../core/types';

describe('RestCharacterResolver', () => {
  it('should rest an active character', () => {
    const characterCard: CardInstance = {
      id: 'char-1',
      definition: {
        id: 'char-def-1',
        name: 'Test Character',
        category: CardCategory.CHARACTER,
        colors: [Color.RED],
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [characterCard],
            stageArea: null,
          },
          flags: new Map(),
        }],
        [PlayerId.PLAYER_2, {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
      ]),
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
      attackedThisTurn: new Set(),
    };

    const effect: EffectInstance = {
      id: 'effect-1',
      definition: {
        id: 'effect-def-1',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.REST_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: TargetType.CARD,
        cardId: 'char-1',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new RestCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);
    expect(player1).toBeDefined();

    // Character should be rested
    const restedChar = player1!.zones.characterArea[0];
    expect(restedChar.state).toBe(CardState.RESTED);
    expect(restedChar.id).toBe('char-1');
  });

  it('should handle already rested character', () => {
    const characterCard: CardInstance = {
      id: 'char-1',
      definition: {
        id: 'char-def-1',
        name: 'Test Character',
        category: CardCategory.CHARACTER,
        colors: [Color.RED],
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.RESTED, // Already rested
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [characterCard],
            stageArea: null,
          },
          flags: new Map(),
        }],
        [PlayerId.PLAYER_2, {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
      ]),
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
      attackedThisTurn: new Set(),
    };

    const effect: EffectInstance = {
      id: 'effect-1',
      definition: {
        id: 'effect-def-1',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.REST_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: TargetType.CARD,
        cardId: 'char-1',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new RestCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);

    // Character should still be rested
    const restedChar = player1!.zones.characterArea[0];
    expect(restedChar.state).toBe(CardState.RESTED);
  });

  it('should rest multiple characters', () => {
    const char1: CardInstance = {
      id: 'char-1',
      definition: {
        id: 'char-def-1',
        name: 'Test Character 1',
        category: CardCategory.CHARACTER,
        colors: [Color.RED],
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const char2: CardInstance = {
      id: 'char-2',
      definition: {
        id: 'char-def-2',
        name: 'Test Character 2',
        category: CardCategory.CHARACTER,
        colors: [Color.BLUE],
        typeTags: [],
        attributes: [],
        basePower: 4000,
        baseCost: 2,
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [char1, char2],
            stageArea: null,
          },
          flags: new Map(),
        }],
        [PlayerId.PLAYER_2, {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
      ]),
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
      attackedThisTurn: new Set(),
    };

    const effect: EffectInstance = {
      id: 'effect-1',
      definition: {
        id: 'effect-def-1',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.REST_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [
        { type: TargetType.CARD, cardId: 'char-1' },
        { type: TargetType.CARD, cardId: 'char-2' },
      ],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new RestCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);

    // Both characters should be rested
    expect(player1!.zones.characterArea).toHaveLength(2);
    expect(player1!.zones.characterArea[0].state).toBe(CardState.RESTED);
    expect(player1!.zones.characterArea[1].state).toBe(CardState.RESTED);
  });

  it('should not rest non-character cards', () => {
    const leaderCard: CardInstance = {
      id: 'leader-1',
      definition: {
        id: 'leader-def-1',
        name: 'Test Leader',
        category: CardCategory.LEADER,
        colors: [Color.RED],
        typeTags: [],
        attributes: [],
        basePower: 5000,
        baseCost: 0,
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.LEADER_AREA,
      state: CardState.ACTIVE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: leaderCard,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
        [PlayerId.PLAYER_2, {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
      ]),
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
      attackedThisTurn: new Set(),
    };

    const effect: EffectInstance = {
      id: 'effect-1',
      definition: {
        id: 'effect-def-1',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.REST_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: TargetType.CARD,
        cardId: 'leader-1',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new RestCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);

    // Leader should NOT be rested (not a character)
    expect(player1!.zones.leaderArea!.state).toBe(CardState.ACTIVE);
  });

  it('should handle empty targets gracefully', () => {
    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
        [PlayerId.PLAYER_2, {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
      ]),
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
      attackedThisTurn: new Set(),
    };

    const effect: EffectInstance = {
      id: 'effect-1',
      definition: {
        id: 'effect-def-1',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.REST_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new RestCharacterResolver();
    
    // Should not throw
    expect(() => resolver.resolve(effect, state)).not.toThrow();
    
    const newState = resolver.resolve(effect, state);
    
    // State should be unchanged
    expect(newState).toEqual(state);
  });

  it('should handle invalid card ID gracefully', () => {
    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
        [PlayerId.PLAYER_2, {
          id: PlayerId.PLAYER_2,
          zones: {
            deck: [],
            hand: [],
            trash: [],
            life: [],
            donDeck: [],
            costArea: [],
            leaderArea: null,
            characterArea: [],
            stageArea: null,
          },
          flags: new Map(),
        }],
      ]),
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
      attackedThisTurn: new Set(),
    };

    const effect: EffectInstance = {
      id: 'effect-1',
      definition: {
        id: 'effect-def-1',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.REST_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: TargetType.CARD,
        cardId: 'non-existent-card',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new RestCharacterResolver();
    
    // Should not throw
    expect(() => resolver.resolve(effect, state)).not.toThrow();
  });
});
