/**
 * DonHandler.test.ts
 * 
 * Tests for DON giving system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleGiveDon, canGiveDon, computeCurrentPower } from './DonHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { ZoneManager } from '../zones/ZoneManager';
import { EventEmitter } from '../rendering/EventEmitter';
import {
  PlayerId,
  CardInstance,
  DonInstance,
  ZoneId,
  CardState,
  CardCategory,
  CardDefinition,
  GameEventType,
  PowerChangedEvent,
} from '../core/types';

describe('DonHandler', () => {
  let stateManager: GameStateManager;
  let zoneManager: ZoneManager;
  let eventEmitter: EventEmitter;

  // Helper to create a test card definition
  function createTestCardDefinition(overrides: Partial<CardDefinition> = {}): CardDefinition {
    return {
      id: 'test-card',
      name: 'Test Card',
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
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
      ...overrides,
    };
  }

  // Helper to create a test card instance
  function createTestCard(
    id: string,
    owner: PlayerId,
    zone: ZoneId,
    overrides: Partial<CardInstance> = {}
  ): CardInstance {
    return {
      id,
      definition: createTestCardDefinition(),
      owner,
      controller: owner,
      zone,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
      ...overrides,
    };
  }

  // Helper to create a test DON instance
  function createTestDon(
    id: string,
    owner: PlayerId,
    zone: ZoneId,
    state: CardState = CardState.ACTIVE
  ): DonInstance {
    return {
      id,
      owner,
      zone,
      state,
    };
  }

  beforeEach(() => {
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);
    eventEmitter = new EventEmitter();
    zoneManager = new ZoneManager(stateManager, eventEmitter);
  });

  describe('handleGiveDon', () => {
    it('should successfully give DON to a character', () => {
      // Setup: Add a character to character area
      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(character);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Give DON to character
      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'char-1'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify DON was moved to character's givenDon array
      const updatedCharacter = result.newState.getCard('char-1');
      expect(updatedCharacter).toBeDefined();
      expect(updatedCharacter!.givenDon.length).toBe(1);
      expect(updatedCharacter!.givenDon[0].id).toBe('don-1');

      // Verify DON is no longer in cost area
      const updatedPlayer = result.newState.getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.costArea.length).toBe(0);
    });

    it('should successfully give DON to a leader', () => {
      // Setup: Add a leader to leader area
      const leader = createTestCard('leader-1', PlayerId.PLAYER_1, ZoneId.LEADER_AREA, {
        definition: createTestCardDefinition({ category: CardCategory.LEADER, basePower: 5000 }),
      });
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.leaderArea = leader;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Give DON to leader
      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'leader-1'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify DON was moved to leader's givenDon array
      const updatedLeader = result.newState.getCard('leader-1');
      expect(updatedLeader).toBeDefined();
      expect(updatedLeader!.givenDon.length).toBe(1);
      expect(updatedLeader!.givenDon[0].id).toBe('don-1');
    });

    it('should fail if DON does not exist', () => {
      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'non-existent-don',
        'char-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if DON is not in cost area', () => {
      // Setup: Add a DON to don deck (not cost area)
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.DON_DECK);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.donDeck.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'char-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in cost area');
    });

    it('should fail if DON is not active', () => {
      // Setup: Add a rested DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.RESTED);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'char-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });

    it('should fail if target card does not exist', () => {
      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'non-existent-card'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if target is not a character or leader', () => {
      // Setup: Add an event card to hand
      const event = createTestCard('event-1', PlayerId.PLAYER_1, ZoneId.HAND, {
        definition: createTestCardDefinition({ category: CardCategory.EVENT }),
      });
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(event);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'event-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a character or leader');
    });

    it('should fail if target is not on field', () => {
      // Setup: Add a character to hand (not on field)
      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.HAND);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(character);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const result = handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'char-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not on field');
    });

    it('should emit POWER_CHANGED event', () => {
      // Setup: Add a character to character area
      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(character);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Listen for POWER_CHANGED event
      let powerChangedEmitted = false;
      eventEmitter.on(GameEventType.POWER_CHANGED, (event) => {
        powerChangedEmitted = true;
        const powerEvent = event as unknown as PowerChangedEvent;
        expect(powerEvent.data.cardId).toBe('char-1');
        expect(powerEvent.data.oldPower).toBe(5000);
        expect(powerEvent.data.newPower).toBe(6000); // 5000 + 1000 from DON
      });

      // Give DON to character
      handleGiveDon(
        stateManager,
        zoneManager,
        eventEmitter,
        PlayerId.PLAYER_1,
        'don-1',
        'char-1'
      );

      expect(powerChangedEmitted).toBe(true);
    });
  });

  describe('computeCurrentPower', () => {
    it('should return base power for card with no modifiers or DON', () => {
      const card = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const power = computeCurrentPower(card);
      expect(power).toBe(5000);
    });

    it('should add 1000 power per given DON', () => {
      const card = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      card.givenDon = [
        createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA),
        createTestDon('don-2', PlayerId.PLAYER_1, ZoneId.COST_AREA),
      ];
      const power = computeCurrentPower(card);
      expect(power).toBe(7000); // 5000 + 2000
    });

    it('should add power modifiers', () => {
      const card = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      card.modifiers = [
        {
          id: 'mod-1',
          type: 'POWER' as any,
          value: 2000,
          duration: 'UNTIL_END_OF_TURN' as any,
          source: 'effect-1',
          timestamp: Date.now(),
        },
      ];
      const power = computeCurrentPower(card);
      expect(power).toBe(7000); // 5000 + 2000
    });

    it('should combine base power, modifiers, and given DON', () => {
      const card = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      card.givenDon = [createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA)];
      card.modifiers = [
        {
          id: 'mod-1',
          type: 'POWER' as any,
          value: 1000,
          duration: 'UNTIL_END_OF_TURN' as any,
          source: 'effect-1',
          timestamp: Date.now(),
        },
      ];
      const power = computeCurrentPower(card);
      expect(power).toBe(7000); // 5000 + 1000 (modifier) + 1000 (DON)
    });

    it('should handle cards with null base power', () => {
      const card = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA, {
        definition: createTestCardDefinition({ basePower: null }),
      });
      const power = computeCurrentPower(card);
      expect(power).toBe(0);
    });
  });

  describe('canGiveDon', () => {
    it('should return true for valid DON giving', () => {
      // Setup: Add a character to character area
      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.CHARACTER_AREA);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.characterArea.push(character);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const canGive = canGiveDon(stateManager, PlayerId.PLAYER_1, 'don-1', 'char-1');
      expect(canGive).toBe(true);
    });

    it('should return false if DON does not exist', () => {
      const canGive = canGiveDon(stateManager, PlayerId.PLAYER_1, 'non-existent', 'char-1');
      expect(canGive).toBe(false);
    });

    it('should return false if DON is not active', () => {
      // Setup: Add a rested DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.RESTED);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const canGive = canGiveDon(stateManager, PlayerId.PLAYER_1, 'don-1', 'char-1');
      expect(canGive).toBe(false);
    });

    it('should return false if target is not a character or leader', () => {
      // Setup: Add an event card
      const event = createTestCard('event-1', PlayerId.PLAYER_1, ZoneId.HAND, {
        definition: createTestCardDefinition({ category: CardCategory.EVENT }),
      });
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(event);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const canGive = canGiveDon(stateManager, PlayerId.PLAYER_1, 'don-1', 'event-1');
      expect(canGive).toBe(false);
    });

    it('should return false if target is not on field', () => {
      // Setup: Add a character to hand
      const character = createTestCard('char-1', PlayerId.PLAYER_1, ZoneId.HAND);
      const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      player.zones.hand.push(character);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      // Setup: Add an active DON to cost area
      const don = createTestDon('don-1', PlayerId.PLAYER_1, ZoneId.COST_AREA, CardState.ACTIVE);
      player.zones.costArea.push(don);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);

      const canGive = canGiveDon(stateManager, PlayerId.PLAYER_1, 'don-1', 'char-1');
      expect(canGive).toBe(false);
    });
  });
});
