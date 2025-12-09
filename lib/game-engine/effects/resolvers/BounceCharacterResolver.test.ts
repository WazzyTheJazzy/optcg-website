/**
 * BounceCharacterResolver.test.ts
 * 
 * Unit tests for the BounceCharacterResolver.
 */

import { describe, it, expect } from 'vitest';
import { BounceCharacterResolver } from './BounceCharacterResolver';
import { EffectInstance, EffectType } from '../types';
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
  ModifierType,
  ModifierDuration,
  EffectTimingType,
} from '../../core/types';

describe('BounceCharacterResolver', () => {
  it('should return a character to owner hand', () => {
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
        effectType: EffectType.BOUNCE_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: 'CARD',
        cardId: 'char-1',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new BounceCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);
    expect(player1).toBeDefined();

    // Character should be in hand
    expect(player1!.zones.hand).toHaveLength(1);
    expect(player1!.zones.hand[0].id).toBe('char-1');

    // Character should not be in character area
    expect(player1!.zones.characterArea).toHaveLength(0);
  });

  it('should clear modifiers when bouncing', () => {
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
      modifiers: [{
        id: 'mod-1',
        type: ModifierType.POWER,
        value: 2000,
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      }],
      givenDon: [{
        id: 'don-1',
        owner: PlayerId.PLAYER_1,
        zone: ZoneId.COST_AREA,
        state: CardState.RESTED,
      }],
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
        effectType: EffectType.BOUNCE_CHARACTER,
        parameters: {},
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: 'CARD',
        cardId: 'char-1',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new BounceCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);
    const bouncedCard = player1!.zones.hand[0];

    // Modifiers should be cleared
    expect(bouncedCard.modifiers).toHaveLength(0);

    // Attached DON should be cleared
    expect(bouncedCard.givenDon).toHaveLength(0);

    // State should be NONE
    expect(bouncedCard.state).toBe(CardState.NONE);
  });

  it('should respect maxPower constraint', () => {
    const characterCard: CardInstance = {
      id: 'char-1',
      definition: {
        id: 'char-def-1',
        name: 'Test Character',
        category: CardCategory.CHARACTER,
        colors: [Color.RED],
        typeTags: [],
        attributes: [],
        basePower: 8000,
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
        effectType: EffectType.BOUNCE_CHARACTER,
        parameters: {
          maxPower: 5000, // Character has 8000 power, should not bounce
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: 'CARD',
        cardId: 'char-1',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new BounceCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);

    // Character should NOT be bounced (power too high)
    expect(player1!.zones.hand).toHaveLength(0);
    expect(player1!.zones.characterArea).toHaveLength(1);
  });

  it('should respect maxCost constraint', () => {
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
        baseCost: 7,
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
        effectType: EffectType.BOUNCE_CHARACTER,
        parameters: {
          maxCost: 5, // Character has cost 7, should not bounce
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_2,
      targets: [{
        type: 'CARD',
        cardId: 'char-1',
      }],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new BounceCharacterResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);

    // Character should NOT be bounced (cost too high)
    expect(player1!.zones.hand).toHaveLength(0);
    expect(player1!.zones.characterArea).toHaveLength(1);
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
        effectType: EffectType.BOUNCE_CHARACTER,
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

    const resolver = new BounceCharacterResolver();
    
    // Should not throw
    expect(() => resolver.resolve(effect, state)).not.toThrow();
    
    const newState = resolver.resolve(effect, state);
    
    // State should be unchanged
    expect(newState).toEqual(state);
  });
});
