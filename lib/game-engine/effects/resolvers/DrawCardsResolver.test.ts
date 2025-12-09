/**
 * DrawCardsResolver.test.ts
 * 
 * Unit tests for the DrawCardsResolver.
 */

import { describe, it, expect } from 'vitest';
import { DrawCardsResolver } from './DrawCardsResolver';
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
  EffectTimingType,
} from '../../core/types';

describe('DrawCardsResolver', () => {
  it('should draw cards from deck to hand', () => {
    const card1: CardInstance = {
      id: 'card-1',
      definition: {
        id: 'card-def-1',
        name: 'Test Card 1',
        category: CardCategory.CHARACTER,
        colors: [Color.RED],
        typeTags: [],
        attributes: [],
        basePower: 3000,
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const card2: CardInstance = {
      id: 'card-2',
      definition: {
        id: 'card-def-2',
        name: 'Test Card 2',
        category: CardCategory.CHARACTER,
        colors: [Color.BLUE],
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const card3: CardInstance = {
      id: 'card-3',
      definition: {
        id: 'card-def-3',
        name: 'Test Card 3',
        category: CardCategory.EVENT,
        colors: [Color.GREEN],
        typeTags: [],
        attributes: [],
        basePower: null,
        baseCost: 1,
        lifeValue: null,
        counterValue: 2000,
        rarity: 'C',
        keywords: [],
        effects: [],
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '003',
          isAltArt: false,
          isPromo: false,
        },
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [card1, card2, card3], // Top to bottom
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
        effectType: EffectType.DRAW_CARDS,
        parameters: {
          cardCount: 2,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new DrawCardsResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);
    expect(player1).toBeDefined();

    // Should have drawn 2 cards
    expect(player1!.zones.hand).toHaveLength(2);
    expect(player1!.zones.hand[0].id).toBe('card-1');
    expect(player1!.zones.hand[1].id).toBe('card-2');

    // Deck should have 1 card remaining
    expect(player1!.zones.deck).toHaveLength(1);
    expect(player1!.zones.deck[0].id).toBe('card-3');
  });

  it('should handle drawing more cards than available in deck', () => {
    const card1: CardInstance = {
      id: 'card-1',
      definition: {
        id: 'card-def-1',
        name: 'Test Card 1',
        category: CardCategory.CHARACTER,
        colors: [Color.RED],
        typeTags: [],
        attributes: [],
        basePower: 3000,
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const card2: CardInstance = {
      id: 'card-2',
      definition: {
        id: 'card-def-2',
        name: 'Test Card 2',
        category: CardCategory.CHARACTER,
        colors: [Color.BLUE],
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [card1, card2], // Only 2 cards in deck
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
        effectType: EffectType.DRAW_CARDS,
        parameters: {
          cardCount: 5, // Try to draw 5 but only 2 available
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new DrawCardsResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);
    expect(player1).toBeDefined();

    // Should have drawn all 2 available cards
    expect(player1!.zones.hand).toHaveLength(2);
    expect(player1!.zones.hand[0].id).toBe('card-1');
    expect(player1!.zones.hand[1].id).toBe('card-2');

    // Deck should be empty
    expect(player1!.zones.deck).toHaveLength(0);
  });

  it('should handle empty deck gracefully', () => {
    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [], // Empty deck
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
        effectType: EffectType.DRAW_CARDS,
        parameters: {
          cardCount: 3,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new DrawCardsResolver();
    
    // Should not throw
    expect(() => resolver.resolve(effect, state)).not.toThrow();
    
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);
    expect(player1).toBeDefined();

    // Hand should still be empty
    expect(player1!.zones.hand).toHaveLength(0);

    // Deck should still be empty
    expect(player1!.zones.deck).toHaveLength(0);
  });

  it('should validate cardCount parameter', () => {
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

    const resolver = new DrawCardsResolver();

    // Test with missing cardCount
    const effectNoCount: EffectInstance = {
      id: 'effect-1',
      definition: {
        id: 'effect-def-1',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: {}, // No cardCount
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    expect(resolver.canResolve(effectNoCount, state)).toBe(false);

    // Test with invalid cardCount
    const effectInvalidCount: EffectInstance = {
      id: 'effect-2',
      definition: {
        id: 'effect-def-2',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: {
          cardCount: 0, // Invalid count
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    expect(resolver.canResolve(effectInvalidCount, state)).toBe(false);

    // Test with valid cardCount
    const effectValidCount: EffectInstance = {
      id: 'effect-3',
      definition: {
        id: 'effect-def-3',
        sourceCardId: 'source-card',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.DRAW_CARDS,
        parameters: {
          cardCount: 2,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    expect(resolver.canResolve(effectValidCount, state)).toBe(true);
  });

  it('should draw exactly one card when cardCount is 1', () => {
    const card1: CardInstance = {
      id: 'card-1',
      definition: {
        id: 'card-def-1',
        name: 'Test Card 1',
        category: CardCategory.CHARACTER,
        colors: [Color.RED],
        typeTags: [],
        attributes: [],
        basePower: 3000,
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const card2: CardInstance = {
      id: 'card-2',
      definition: {
        id: 'card-def-2',
        name: 'Test Card 2',
        category: CardCategory.CHARACTER,
        colors: [Color.BLUE],
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
      } as CardDefinition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
    };

    const state: GameState = {
      players: new Map([
        [PlayerId.PLAYER_1, {
          id: PlayerId.PLAYER_1,
          zones: {
            deck: [card1, card2],
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
        effectType: EffectType.DRAW_CARDS,
        parameters: {
          cardCount: 1,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new DrawCardsResolver();
    const newState = resolver.resolve(effect, state);

    const player1 = newState.players.get(PlayerId.PLAYER_1);
    expect(player1).toBeDefined();

    // Should have drawn exactly 1 card
    expect(player1!.zones.hand).toHaveLength(1);
    expect(player1!.zones.hand[0].id).toBe('card-1');

    // Deck should have 1 card remaining
    expect(player1!.zones.deck).toHaveLength(1);
    expect(player1!.zones.deck[0].id).toBe('card-2');
  });
});
