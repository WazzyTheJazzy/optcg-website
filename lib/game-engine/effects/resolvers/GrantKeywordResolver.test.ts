/**
 * GrantKeywordResolver.test.ts
 * 
 * Unit tests for GrantKeywordResolver
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrantKeywordResolver } from './GrantKeywordResolver';
import { createInitialGameState } from '../../core/GameState';
import {
  EffectInstance,
  EffectDefinition,
  EffectType,
  Target,
  TargetType,
} from '../types';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  CardDefinition,
  CardInstance,
  ModifierDuration,
  ModifierType,
  GameState,
} from '../../core/types';

describe('GrantKeywordResolver', () => {
  let resolver: GrantKeywordResolver;
  let initialState: GameState;

  beforeEach(() => {
    resolver = new GrantKeywordResolver();
    initialState = createInitialGameState();
  });

  // Helper to create a test card
  const createTestCard = (id: string, playerId: PlayerId): CardInstance => {
    const definition: CardDefinition = {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
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
        setCode: 'TEST',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id,
      definition,
      owner: playerId,
      controller: playerId,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  // Helper to add a card to the game state
  const addCardToState = (state: GameState, card: CardInstance): GameState => {
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    
    const playersMap = new Map<PlayerId, any>();
    if (state.players instanceof Map) {
      state.players.forEach((player, id) => {
        playersMap.set(id, JSON.parse(JSON.stringify(player)));
      });
    }
    newState.players = playersMap;
    
    const player = newState.players.get(card.controller);
    if (!player) {
      throw new Error(`Player ${card.controller} not found in state`);
    }
    
    if (!player.zones.characterArea) {
      player.zones.characterArea = [];
    }
    player.zones.characterArea.push(card);
    
    return newState;
  };

  it('should grant Rush keyword to a character', () => {
    const card = createTestCard('card1', PlayerId.PLAYER_1);
    const stateWithCard = addCardToState(initialState, card);

    const effectDef: EffectDefinition = {
      id: 'effect-1',
      sourceCardId: 'source-card',
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      condition: null,
      cost: null,
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword: 'Rush',
        duration: ModifierDuration.PERMANENT,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };

    const target: Target = {
      type: TargetType.CARD,
      cardId: card.id,
    };

    const effectInstance: EffectInstance = {
      id: 'instance-1',
      definition: effectDef,
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [target],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };

    const resultState = resolver.resolve(effectInstance, stateWithCard);

    const player = resultState.players.get(PlayerId.PLAYER_1);
    const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === 'card1');

    expect(resultCard).toBeDefined();
    expect(resultCard!.modifiers.length).toBe(1);
    expect(resultCard!.modifiers[0].type).toBe(ModifierType.KEYWORD);
    expect(resultCard!.modifiers[0].value).toBe('Rush');
    expect(resultCard!.modifiers[0].duration).toBe(ModifierDuration.PERMANENT);
  });

  it('should grant Blocker keyword with UNTIL_END_OF_TURN duration', () => {
    const card = createTestCard('card1', PlayerId.PLAYER_1);
    const stateWithCard = addCardToState(initialState, card);

    const effectDef: EffectDefinition = {
      id: 'effect-1',
      sourceCardId: 'source-card',
      label: '[Activate: Main]',
      timingType: EffectTimingType.ACTIVATE,
      triggerTiming: null,
      condition: null,
      cost: null,
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword: 'Blocker',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };

    const target: Target = {
      type: TargetType.CARD,
      cardId: card.id,
    };

    const effectInstance: EffectInstance = {
      id: 'instance-1',
      definition: effectDef,
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [target],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };

    const resultState = resolver.resolve(effectInstance, stateWithCard);

    const player = resultState.players.get(PlayerId.PLAYER_1);
    const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === 'card1');

    expect(resultCard).toBeDefined();
    expect(resultCard!.modifiers.length).toBe(1);
    expect(resultCard!.modifiers[0].type).toBe(ModifierType.KEYWORD);
    expect(resultCard!.modifiers[0].value).toBe('Blocker');
    expect(resultCard!.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_TURN);
  });

  it('should grant Double Attack keyword', () => {
    const card = createTestCard('card1', PlayerId.PLAYER_1);
    const stateWithCard = addCardToState(initialState, card);

    const effectDef: EffectDefinition = {
      id: 'effect-1',
      sourceCardId: 'source-card',
      label: '[When Attacking]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.WHEN_ATTACKING,
      condition: null,
      cost: null,
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword: 'Double Attack',
        duration: ModifierDuration.UNTIL_END_OF_BATTLE,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };

    const target: Target = {
      type: TargetType.CARD,
      cardId: card.id,
    };

    const effectInstance: EffectInstance = {
      id: 'instance-1',
      definition: effectDef,
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [target],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };

    const resultState = resolver.resolve(effectInstance, stateWithCard);

    const player = resultState.players.get(PlayerId.PLAYER_1);
    const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === 'card1');

    expect(resultCard).toBeDefined();
    expect(resultCard!.modifiers.length).toBe(1);
    expect(resultCard!.modifiers[0].type).toBe(ModifierType.KEYWORD);
    expect(resultCard!.modifiers[0].value).toBe('Double Attack');
    expect(resultCard!.modifiers[0].duration).toBe(ModifierDuration.UNTIL_END_OF_BATTLE);
  });

  it('should handle effect with no targets gracefully', () => {
    const effectDef: EffectDefinition = {
      id: 'effect-1',
      sourceCardId: 'source-card',
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      condition: null,
      cost: null,
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword: 'Rush',
        duration: ModifierDuration.PERMANENT,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };

    const effectInstance: EffectInstance = {
      id: 'instance-1',
      definition: effectDef,
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [], // No targets
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };

    // Should not throw, just return state unchanged
    const resultState = resolver.resolve(effectInstance, initialState);
    expect(resultState).toBeDefined();
  });

  it('should validate that keyword parameter exists', () => {
    const card = createTestCard('card1', PlayerId.PLAYER_1);
    const stateWithCard = addCardToState(initialState, card);

    const effectDef: EffectDefinition = {
      id: 'effect-1',
      sourceCardId: 'source-card',
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      condition: null,
      cost: null,
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        // keyword is missing
        duration: ModifierDuration.PERMANENT,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };

    const target: Target = {
      type: TargetType.CARD,
      cardId: card.id,
    };

    const effectInstance: EffectInstance = {
      id: 'instance-1',
      definition: effectDef,
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [target],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };

    // canResolve should return false
    expect(resolver.canResolve(effectInstance, stateWithCard)).toBe(false);

    // resolve should throw
    expect(() => {
      resolver.resolve(effectInstance, stateWithCard);
    }).toThrow(/keyword/);
  });

  it('should reject empty keyword strings', () => {
    const card = createTestCard('card1', PlayerId.PLAYER_1);
    const stateWithCard = addCardToState(initialState, card);

    const effectDef: EffectDefinition = {
      id: 'effect-1',
      sourceCardId: 'source-card',
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      condition: null,
      cost: null,
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword: '   ', // Empty/whitespace keyword
        duration: ModifierDuration.PERMANENT,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };

    const target: Target = {
      type: TargetType.CARD,
      cardId: card.id,
    };

    const effectInstance: EffectInstance = {
      id: 'instance-1',
      definition: effectDef,
      sourceCardId: 'source-card',
      controller: PlayerId.PLAYER_1,
      targets: [target],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };

    // canResolve should return false for empty keyword
    expect(resolver.canResolve(effectInstance, stateWithCard)).toBe(false);
  });

  it('should track source card in modifier', () => {
    const card = createTestCard('card1', PlayerId.PLAYER_1);
    const stateWithCard = addCardToState(initialState, card);

    const sourceCardId = 'source-card-123';

    const effectDef: EffectDefinition = {
      id: 'effect-1',
      sourceCardId,
      label: '[On Play]',
      timingType: EffectTimingType.AUTO,
      triggerTiming: TriggerTiming.ON_PLAY,
      condition: null,
      cost: null,
      effectType: EffectType.GRANT_KEYWORD,
      parameters: {
        keyword: 'Rush',
        duration: ModifierDuration.PERMANENT,
      },
      oncePerTurn: false,
      usedThisTurn: false,
    };

    const target: Target = {
      type: TargetType.CARD,
      cardId: card.id,
    };

    const effectInstance: EffectInstance = {
      id: 'instance-1',
      definition: effectDef,
      sourceCardId,
      controller: PlayerId.PLAYER_1,
      targets: [target],
      chosenValues: new Map(),
      timestamp: Date.now(),
      resolved: false,
      priority: 1,
    };

    const resultState = resolver.resolve(effectInstance, stateWithCard);

    const player = resultState.players.get(PlayerId.PLAYER_1);
    const resultCard = player?.zones.characterArea?.find((c: CardInstance) => c.id === 'card1');

    expect(resultCard).toBeDefined();
    expect(resultCard!.modifiers.length).toBe(1);
    expect(resultCard!.modifiers[0].source).toBe(sourceCardId);
  });
});
