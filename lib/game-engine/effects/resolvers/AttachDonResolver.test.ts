/**
 * AttachDonResolver.test.ts
 * 
 * Unit tests for DON attachment effects.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AttachDonResolver } from './AttachDonResolver';
import {
  GameState,
  PlayerId,
  CardCategory,
  ZoneId,
  CardState,
  CardInstance,
  DonInstance,
  EffectTimingType,
} from '../../core/types';
import { EffectInstance, EffectType, TargetType } from '../types';
import { createInitialGameState } from '../../core/GameState';

// ============================================================================
// Test Utilities
// ============================================================================

function createTestCard(
  id: string,
  owner: PlayerId,
  category: CardCategory = CardCategory.CHARACTER,
  basePower: number = 5000
): CardInstance {
  return {
    id,
    definition: {
      id: `def-${id}`,
      name: `Test Card ${id}`,
      category,
      color: 'Red',
      baseCost: 4,
      basePower,
      effects: [],
    },
    owner,
    controller: owner,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createTestDon(id: string, owner: PlayerId, zone: ZoneId = ZoneId.COST_AREA): DonInstance {
  return {
    id,
    owner,
    zone,
  };
}

function findCard(cardId: string, state: GameState): CardInstance | null {
  const players: any[] = state.players instanceof Map 
    ? Array.from(state.players.values())
    : Object.values(state.players);

  for (const player of players) {
    if (!player || !player.zones) continue;

    if (player.zones.leaderArea?.id === cardId) {
      return player.zones.leaderArea;
    }

    const zones: any[] = [
      player.zones.deck,
      player.zones.hand,
      player.zones.trash,
      player.zones.life,
      player.zones.characterArea || [],
      player.zones.stageArea ? [player.zones.stageArea] : [],
    ];

    for (const zone of zones) {
      if (!zone) continue;
      if (Array.isArray(zone)) {
        const card = zone.find((c: any) => c.id === cardId);
        if (card) return card;
      }
    }
  }

  return null;
}

// ============================================================================
// Unit Tests
// ============================================================================

describe('AttachDonResolver', () => {
  let resolver: AttachDonResolver;
  let initialState: GameState;

  beforeEach(() => {
    resolver = new AttachDonResolver();
    initialState = createInitialGameState();
  });

  describe('resolve', () => {
    it('should attach DON from cost area to character', () => {
      // Setup
      const character = createTestCard('char1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(character);
      
      const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.COST_AREA);
      player1.zones.costArea.push(don);

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
          effectType: EffectType.ATTACH_DON,
          parameters: {
            value: 1,
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'source1',
        controller: PlayerId.PLAYER_1,
        targets: [
          {
            type: TargetType.CARD,
            cardId: character.id,
          },
        ],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      // Execute
      const newState = resolver.resolve(effect, initialState);

      // Verify
      const updatedCharacter = findCard(character.id, newState);
      expect(updatedCharacter).not.toBeNull();
      expect(updatedCharacter!.givenDon.length).toBe(1);
      expect(updatedCharacter!.givenDon[0].id).toBe('don1');

      const updatedPlayer = newState.players.get(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.costArea.length).toBe(0);
    });

    it('should handle no targets gracefully', () => {
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
          effectType: EffectType.ATTACH_DON,
          parameters: {
            value: 1,
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

      // Execute - should not throw
      const newState = resolver.resolve(effect, initialState);

      // Verify state unchanged
      expect(newState).toBeDefined();
    });

    it('should handle no DON available gracefully', () => {
      // Setup
      const character = createTestCard('char1', PlayerId.PLAYER_1, CardCategory.CHARACTER, 5000);
      const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
      player1.zones.characterArea.push(character);
      // No DON in cost area

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
          effectType: EffectType.ATTACH_DON,
          parameters: {
            value: 1,
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'source1',
        controller: PlayerId.PLAYER_1,
        targets: [
          {
            type: TargetType.CARD,
            cardId: character.id,
          },
        ],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      // Execute - should not throw
      const newState = resolver.resolve(effect, initialState);

      // Verify character has no DON attached
      const updatedCharacter = findCard(character.id, newState);
      expect(updatedCharacter).not.toBeNull();
      expect(updatedCharacter!.givenDon.length).toBe(0);
    });

    it('should not attach DON to non-character cards', () => {
      // Setup
      const leader = createTestCard('leader1', PlayerId.PLAYER_1, CardCategory.LEADER, 5000);
      leader.zone = ZoneId.LEADER_AREA;
      const player1 = initialState.players.get(PlayerId.PLAYER_1)!;
      player1.zones.leaderArea = leader;
      
      const don = createTestDon('don1', PlayerId.PLAYER_1, ZoneId.COST_AREA);
      player1.zones.costArea.push(don);

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
          effectType: EffectType.ATTACH_DON,
          parameters: {
            value: 1,
          },
          oncePerTurn: false,
          usedThisTurn: false,
        },
        sourceCardId: 'source1',
        controller: PlayerId.PLAYER_1,
        targets: [
          {
            type: TargetType.CARD,
            cardId: leader.id,
          },
        ],
        chosenValues: new Map(),
        timestamp: Date.now(),
        resolved: false,
      };

      // Execute
      const newState = resolver.resolve(effect, initialState);

      // Verify DON not attached (leader is not a character)
      const updatedLeader = findCard(leader.id, newState);
      expect(updatedLeader).not.toBeNull();
      expect(updatedLeader!.givenDon.length).toBe(0);

      // DON should still be in cost area
      const updatedPlayer = newState.players.get(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.costArea.length).toBe(1);
    });
  });

  describe('canResolve', () => {
    it('should always return true', () => {
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
          effectType: EffectType.ATTACH_DON,
          parameters: {
            value: 1,
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

      expect(resolver.canResolve(effect, initialState)).toBe(true);
    });
  });
});
