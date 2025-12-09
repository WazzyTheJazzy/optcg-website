/**
 * SearchDeckResolver.test.ts
 * 
 * Unit tests for the SearchDeckResolver.
 */

import { describe, it, expect } from 'vitest';
import { SearchDeckResolver } from './SearchDeckResolver';
import { EffectInstance, EffectType, SearchCriteria } from '../types';
import { 
  createInitialGameState, 
  GameStateManager 
} from '../../core/GameState';
import {
  GameState,
  PlayerId,
  ZoneId,
  CardInstance,
  CardCategory,
  Color,
  CardState,
  EffectTimingType,
} from '../../core/types';

describe('SearchDeckResolver', () => {
  it('should move chosen card from deck to hand', () => {
    // Create test cards in deck
    const card1: CardInstance = {
      id: 'card1',
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
      definition: {
        id: 'OP01-001',
        name: 'Test Character',
        category: CardCategory.CHARACTER,
        colors: ['RED'],
        baseCost: 3,
        basePower: 4000,
        counterValue: 1000,
        lifeValue: null,
        attributes: [],
        typeTags: ['Straw Hat Crew'],
        keywords: [],
        effects: [],
        rarity: 'C',
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      },
    };

    const card2: CardInstance = {
      id: 'card2',
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
      definition: {
        id: 'OP01-002',
        name: 'Test Event',
        category: CardCategory.EVENT,
        colors: ['RED'],
        baseCost: 2,
        basePower: null,
        counterValue: null,
        lifeValue: null,
        attributes: [],
        typeTags: [],
        keywords: [],
        effects: [],
        rarity: 'C',
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '002',
          isAltArt: false,
          isPromo: false,
        },
      },
    };

    const state = createInitialGameState();
    const stateManager = new GameStateManager(state);
    const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    player.zones.deck = [card1, card2];

    // Create search effect: look at top 2 cards, find a character
    const searchCriteria: SearchCriteria = {
      category: CardCategory.CHARACTER,
    };

    const effect: EffectInstance = {
      id: 'effect1',
      definition: {
        id: 'def1',
        sourceCardId: 'source1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.SEARCH_DECK,
        parameters: {
          cardCount: 2,
          searchCriteria,
          maxTargets: 1,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source1',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new SearchDeckResolver();
    const newState = resolver.resolve(effect, stateManager.getState());

    // Verify card1 (character) was moved to hand
    const newStateManager = new GameStateManager(newState);
    const newPlayer = newStateManager.getPlayer(PlayerId.PLAYER_1)!;
    
    expect(newPlayer.zones.hand.length).toBe(1);
    expect(newPlayer.zones.hand[0].id).toBe('card1');
    
    // Verify card2 was moved to bottom of deck
    expect(newPlayer.zones.deck.length).toBe(1);
    expect(newPlayer.zones.deck[0].id).toBe('card2');
  });

  it('should place all cards at bottom if no matches found', () => {
    const card1: CardInstance = {
      id: 'card1',
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
      definition: {
        id: 'OP01-001',
        name: 'Test Event',
        category: CardCategory.EVENT,
        colors: ['RED'],
        baseCost: 2,
        basePower: null,
        counterValue: null,
        lifeValue: null,
        attributes: [],
        typeTags: [],
        keywords: [],
        effects: [],
        rarity: 'C',
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      },
    };

    const card2: CardInstance = {
      id: 'card2',
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
      definition: {
        id: 'OP01-002',
        name: 'Test Stage',
        category: CardCategory.STAGE,
        colors: ['RED'],
        baseCost: 1,
        basePower: null,
        counterValue: null,
        lifeValue: null,
        attributes: [],
        typeTags: [],
        keywords: [],
        effects: [],
        rarity: 'C',
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '002',
          isAltArt: false,
          isPromo: false,
        },
      },
    };

    const state = createInitialGameState();
    const stateManager = new GameStateManager(state);
    const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    player.zones.deck = [card1, card2];

    // Search for character (won't find any)
    const searchCriteria: SearchCriteria = {
      category: CardCategory.CHARACTER,
    };

    const effect: EffectInstance = {
      id: 'effect1',
      definition: {
        id: 'def1',
        sourceCardId: 'source1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.SEARCH_DECK,
        parameters: {
          cardCount: 2,
          searchCriteria,
          maxTargets: 1,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source1',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new SearchDeckResolver();
    const newState = resolver.resolve(effect, stateManager.getState());

    // Verify no cards were added to hand
    const newStateManager = new GameStateManager(newState);
    const newPlayer = newStateManager.getPlayer(PlayerId.PLAYER_1)!;
    
    expect(newPlayer.zones.hand.length).toBe(0);
    
    // Verify both cards remain in deck (at bottom)
    expect(newPlayer.zones.deck.length).toBe(2);
  });

  it('should handle empty deck gracefully', () => {
    const state = createInitialGameState();
    const stateManager = new GameStateManager(state);
    const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    player.zones.deck = [];

    const effect: EffectInstance = {
      id: 'effect1',
      definition: {
        id: 'def1',
        sourceCardId: 'source1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.SEARCH_DECK,
        parameters: {
          cardCount: 5,
          maxTargets: 1,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source1',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new SearchDeckResolver();
    const newState = resolver.resolve(effect, stateManager.getState());

    // Should not crash, state should be unchanged
    expect(newState).toBeDefined();
    const newStateManager = new GameStateManager(newState);
    const newPlayer = newStateManager.getPlayer(PlayerId.PLAYER_1)!;
    expect(newPlayer.zones.deck.length).toBe(0);
    expect(newPlayer.zones.hand.length).toBe(0);
  });

  it('should filter by multiple criteria', () => {
    const card1: CardInstance = {
      id: 'card1',
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
      definition: {
        id: 'OP01-001',
        name: 'Luffy',
        category: CardCategory.CHARACTER,
        colors: ['RED'],
        baseCost: 5,
        basePower: 6000,
        counterValue: 1000,
        lifeValue: null,
        attributes: [],
        typeTags: ['Straw Hat Crew'],
        keywords: [],
        effects: [],
        rarity: 'SR',
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '001',
          isAltArt: false,
          isPromo: false,
        },
      },
    };

    const card2: CardInstance = {
      id: 'card2',
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.DECK,
      state: CardState.NONE,
      modifiers: [],
      givenDon: [],
      flags: new Map(),
      definition: {
        id: 'OP01-002',
        name: 'Zoro',
        category: CardCategory.CHARACTER,
        colors: ['GREEN'],
        baseCost: 3,
        basePower: 4000,
        counterValue: 1000,
        lifeValue: null,
        attributes: [],
        typeTags: ['Straw Hat Crew'],
        keywords: [],
        effects: [],
        rarity: 'R',
        imageUrl: '',
        metadata: {
          setCode: 'OP01',
          cardNumber: '002',
          isAltArt: false,
          isPromo: false,
        },
      },
    };

    const state = createInitialGameState();
    const stateManager = new GameStateManager(state);
    const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
    player.zones.deck = [card1, card2];

    // Search for RED character with cost <= 5
    const searchCriteria: SearchCriteria = {
      category: CardCategory.CHARACTER,
      color: Color.RED,
      cost: { max: 5 },
    };

    const effect: EffectInstance = {
      id: 'effect1',
      definition: {
        id: 'def1',
        sourceCardId: 'source1',
        label: '[On Play]',
        timingType: EffectTimingType.AUTO,
        triggerTiming: null,
        condition: null,
        cost: null,
        effectType: EffectType.SEARCH_DECK,
        parameters: {
          cardCount: 2,
          searchCriteria,
          maxTargets: 1,
        },
        oncePerTurn: false,
        usedThisTurn: false,
      },
      sourceCardId: 'source1',
      controller: PlayerId.PLAYER_1,
      targets: [],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
    };

    const resolver = new SearchDeckResolver();
    const newState = resolver.resolve(effect, stateManager.getState());

    // Verify card1 (Luffy - RED, cost 5) was moved to hand
    const newStateManager = new GameStateManager(newState);
    const newPlayer = newStateManager.getPlayer(PlayerId.PLAYER_1)!;
    
    expect(newPlayer.zones.hand.length).toBe(1);
    expect(newPlayer.zones.hand[0].id).toBe('card1');
    
    // Verify card2 (Zoro - GREEN) was moved to bottom
    expect(newPlayer.zones.deck.length).toBe(1);
    expect(newPlayer.zones.deck[0].id).toBe('card2');
  });
});
