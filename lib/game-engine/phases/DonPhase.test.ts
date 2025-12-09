/**
 * DonPhase.test.ts
 * 
 * Tests for the Don Phase implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runDonPhase } from './DonPhase';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardState,
  DonInstance,
} from '../core/types';

describe('DonPhase', () => {
  let stateManager: GameStateManager;
  let rules: RulesContext;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    // Initialize rules context
    rules = new RulesContext();

    // Initialize event emitter
    eventEmitter = new EventEmitter();

    // Create initial game state
    const initialState = createInitialGameState();
    stateManager = new GameStateManager(initialState);

    // Add 10 DON cards to each player's don deck
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
    const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

    if (player1 && player2) {
      for (let i = 0; i < 10; i++) {
        const don1: DonInstance = {
          id: `don-p1-${i}`,
          owner: PlayerId.PLAYER_1,
          zone: ZoneId.DON_DECK,
          state: CardState.NONE,
        };
        player1.zones.donDeck.push(don1);

        const don2: DonInstance = {
          id: `don-p2-${i}`,
          owner: PlayerId.PLAYER_2,
          zone: ZoneId.DON_DECK,
          state: CardState.NONE,
        };
        player2.zones.donDeck.push(don2);
      }
    }

    stateManager = new GameStateManager(stateManager.getState());
  });

  describe('Normal Turn DON Placement', () => {
    it('should place 2 DON from don deck to cost area on turn 2', () => {
      // Set turn number to 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      const player1Before = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const donDeckSizeBefore = player1Before.zones.donDeck.length;
      const costAreaSizeBefore = player1Before.zones.costArea.length;

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player1After = newState.getPlayer(PlayerId.PLAYER_1)!;
      const donDeckSizeAfter = player1After.zones.donDeck.length;
      const costAreaSizeAfter = player1After.zones.costArea.length;

      // Verify 2 DON were moved
      expect(donDeckSizeAfter).toBe(donDeckSizeBefore - 2);
      expect(costAreaSizeAfter).toBe(costAreaSizeBefore + 2);
    });

    it('should place DON as active in cost area', () => {
      // Set turn number to 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player1 = newState.getPlayer(PlayerId.PLAYER_1)!;
      const placedDon = player1.zones.costArea.slice(-2); // Get last 2 DON

      // Verify both DON are active
      expect(placedDon[0].state).toBe(CardState.ACTIVE);
      expect(placedDon[1].state).toBe(CardState.ACTIVE);
    });

    it('should emit CARD_MOVED events for each DON placed', () => {
      const events: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event);
      });

      // Set turn number to 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // Run Don Phase
      runDonPhase(stateManager, rules, eventEmitter);

      // Verify 2 CARD_MOVED events were emitted
      expect(events.length).toBe(2);
      expect(events[0].type).toBe(GameEventType.CARD_MOVED);
      expect(events[0].fromZone).toBe(ZoneId.DON_DECK);
      expect(events[0].toZone).toBe(ZoneId.COST_AREA);
      expect(events[1].type).toBe(GameEventType.CARD_MOVED);
      expect(events[1].fromZone).toBe(ZoneId.DON_DECK);
      expect(events[1].toZone).toBe(ZoneId.COST_AREA);
    });
  });

  describe('First Turn DON Placement', () => {
    it('should place 1 DON on first turn for player going first', () => {
      // Turn 1, player 1 as active (first player) - default state
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      const player1Before = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const donDeckSizeBefore = player1Before.zones.donDeck.length;
      const costAreaSizeBefore = player1Before.zones.costArea.length;

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player1After = newState.getPlayer(PlayerId.PLAYER_1)!;
      const donDeckSizeAfter = player1After.zones.donDeck.length;
      const costAreaSizeAfter = player1After.zones.costArea.length;

      // Verify only 1 DON was moved
      expect(donDeckSizeAfter).toBe(donDeckSizeBefore - 1);
      expect(costAreaSizeAfter).toBe(costAreaSizeBefore + 1);
    });

    it('should place 2 DON on first turn for player going second', () => {
      // Turn 1, player 2 as active (second player)
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_2);

      const player2Before = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      const donDeckSizeBefore = player2Before.zones.donDeck.length;
      const costAreaSizeBefore = player2Before.zones.costArea.length;

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player2After = newState.getPlayer(PlayerId.PLAYER_2)!;
      const donDeckSizeAfter = player2After.zones.donDeck.length;
      const costAreaSizeAfter = player2After.zones.costArea.length;

      // Verify 2 DON were moved
      expect(donDeckSizeAfter).toBe(donDeckSizeBefore - 2);
      expect(costAreaSizeAfter).toBe(costAreaSizeBefore + 2);
    });
  });

  describe('Empty Don Deck Handling', () => {
    it('should handle empty don deck gracefully', () => {
      // Empty the don deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          donDeck: [],
        },
      });

      // Set turn number to 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      const costAreaSizeBefore = stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.costArea.length;

      // Run Don Phase - should not crash
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const costAreaSizeAfter = newState.getPlayer(PlayerId.PLAYER_1)!.zones.costArea.length;

      // Verify no DON were added
      expect(costAreaSizeAfter).toBe(costAreaSizeBefore);
    });

    it('should place only available DON when don deck has fewer than required', () => {
      // Leave only 1 DON in the don deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const oneDon = player1.zones.donDeck.slice(0, 1);
      
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          donDeck: oneDon,
        },
      });

      // Set turn number to 2 (should try to place 2 DON)
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      const costAreaSizeBefore = stateManager.getPlayer(PlayerId.PLAYER_1)!.zones.costArea.length;

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player1After = newState.getPlayer(PlayerId.PLAYER_1)!;
      const donDeckSizeAfter = player1After.zones.donDeck.length;
      const costAreaSizeAfter = player1After.zones.costArea.length;

      // Verify only 1 DON was placed (all that was available)
      expect(donDeckSizeAfter).toBe(0);
      expect(costAreaSizeAfter).toBe(costAreaSizeBefore + 1);
    });
  });

  describe('Only Active Player DON Placement', () => {
    it('should only place DON for the active player', () => {
      // Set player 1 as active
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      const player2Before = stateManager.getPlayer(PlayerId.PLAYER_2)!;
      const player2DonDeckBefore = player2Before.zones.donDeck.length;
      const player2CostAreaBefore = player2Before.zones.costArea.length;

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player2After = newState.getPlayer(PlayerId.PLAYER_2)!;
      const player2DonDeckAfter = player2After.zones.donDeck.length;
      const player2CostAreaAfter = player2After.zones.costArea.length;

      // Verify player 2's DON were not affected
      expect(player2DonDeckAfter).toBe(player2DonDeckBefore);
      expect(player2CostAreaAfter).toBe(player2CostAreaBefore);
    });
  });

  describe('DON Zone Property Updates', () => {
    it('should update DON zone property when moved to cost area', () => {
      // Set turn number to 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      const player1Before = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const donIds = player1Before.zones.donDeck.slice(0, 2).map(d => d.id);

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      // Verify DON zone property is updated
      const player1After = newState.getPlayer(PlayerId.PLAYER_1)!;
      const movedDon = player1After.zones.costArea.filter(d => donIds.includes(d.id));

      expect(movedDon.length).toBe(2);
      movedDon.forEach(don => {
        expect(don.zone).toBe(ZoneId.COST_AREA);
      });
    });
  });

  describe('Multiple Turn Consistency', () => {
    it('should consistently place 2 DON on subsequent turns', () => {
      // Turn 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);
      let newState = runDonPhase(stateManager, rules, eventEmitter);
      
      let player1 = newState.getPlayer(PlayerId.PLAYER_1)!;
      expect(player1.zones.costArea.length).toBe(2);

      // Turn 3
      newState = newState.incrementTurn();
      newState = newState.setActivePlayer(PlayerId.PLAYER_1);
      newState = runDonPhase(newState, rules, eventEmitter);
      
      player1 = newState.getPlayer(PlayerId.PLAYER_1)!;
      expect(player1.zones.costArea.length).toBe(4);

      // Turn 4
      newState = newState.incrementTurn();
      newState = newState.setActivePlayer(PlayerId.PLAYER_1);
      newState = runDonPhase(newState, rules, eventEmitter);
      
      player1 = newState.getPlayer(PlayerId.PLAYER_1)!;
      expect(player1.zones.costArea.length).toBe(6);
    });
  });

  describe('Edge Cases', () => {
    it('should handle turn 1 with empty don deck for player 1 without crashing', () => {
      // Empty the don deck for player 1
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          donDeck: [],
        },
      });

      // Turn 1, player 1 as active (should try to place 1 DON)
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // Run Don Phase - should not crash
      expect(() => {
        runDonPhase(stateManager, rules, eventEmitter);
      }).not.toThrow();
    });

    it('should emit correct number of events when don deck is partially empty', () => {
      const events: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event);
      });

      // Leave only 1 DON in the don deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      const oneDon = player1.zones.donDeck.slice(0, 1);
      
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          donDeck: oneDon,
        },
      });

      // Set turn number to 2 (should try to place 2 DON)
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // Run Don Phase
      runDonPhase(stateManager, rules, eventEmitter);

      // Verify only 1 CARD_MOVED event was emitted (only 1 DON available)
      expect(events.length).toBe(1);
    });

    it('should not emit any events when don deck is empty', () => {
      const events: any[] = [];
      eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
        events.push(event);
      });

      // Empty the don deck
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, {
        zones: {
          ...player1.zones,
          donDeck: [],
        },
      });

      // Set turn number to 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // Run Don Phase
      runDonPhase(stateManager, rules, eventEmitter);

      // Verify no events were emitted
      expect(events.length).toBe(0);
    });
  });

  describe('DON Owner Verification', () => {
    it('should maintain correct DON owner when moved to cost area', () => {
      // Set turn number to 2
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player1 = newState.getPlayer(PlayerId.PLAYER_1)!;
      const placedDon = player1.zones.costArea.slice(-2);

      // Verify DON owner is correct
      placedDon.forEach(don => {
        expect(don.owner).toBe(PlayerId.PLAYER_1);
      });
    });

    it('should place DON with correct owner for player 2', () => {
      // Set turn number to 2, player 2 as active
      stateManager = stateManager.incrementTurn();
      stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_2);

      // Run Don Phase
      const newState = runDonPhase(stateManager, rules, eventEmitter);

      const player2 = newState.getPlayer(PlayerId.PLAYER_2)!;
      const placedDon = player2.zones.costArea.slice(-2);

      // Verify DON owner is correct
      placedDon.forEach(don => {
        expect(don.owner).toBe(PlayerId.PLAYER_2);
      });
    });
  });
});
