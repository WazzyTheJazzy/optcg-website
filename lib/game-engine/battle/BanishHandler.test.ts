/**
 * BanishHandler.test.ts
 * 
 * Tests for the Banish keyword functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { banishCard, shouldBanish } from './BanishHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { CardInstance, PlayerId, ZoneId, CardState, CardCategory, ModifierType, ModifierDuration } from '../core/types';
import { createTestCard } from '../utils/testHelpers';

describe('BanishHandler', () => {
  let stateManager: GameStateManager;

  beforeEach(() => {
    stateManager = new GameStateManager(createInitialGameState());
  });

  describe('shouldBanish', () => {
    it('should return true for cards with Banish keyword in definition', () => {
      const card = createTestCard({
        id: 'card1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
        keywords: ['Banish'],
      });

      expect(shouldBanish(card)).toBe(true);
    });

    it('should return true for cards with Banish keyword from modifier', () => {
      const card = createTestCard({
        id: 'card1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
      });

      // Add Banish keyword via modifier
      card.modifiers.push({
        id: 'mod1',
        type: ModifierType.KEYWORD,
        value: 'Banish',
        duration: ModifierDuration.PERMANENT,
        source: 'effect1',
        timestamp: Date.now(),
      });

      expect(shouldBanish(card)).toBe(true);
    });

    it('should return false for cards without Banish keyword', () => {
      const card = createTestCard({
        id: 'card1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
      });

      expect(shouldBanish(card)).toBe(false);
    });
  });

  describe('banishCard', () => {
    it('should move card to banished zone', () => {
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      
      // Create a card in character area
      const card = createTestCard({
        id: 'card1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
      });
      
      player1.zones.characterArea.push(card);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player1);

      // Get the card from the updated state
      const cardInState = stateManager.getCard('card1')!;
      expect(cardInState).toBeDefined();
      expect(cardInState.zone).toBe(ZoneId.CHARACTER_AREA);
      
      // Banish the card
      stateManager = banishCard(cardInState, stateManager);

      // Verify card is in banished zone
      const banishedCard = stateManager.getCard('card1');
      expect(banishedCard).toBeDefined();
      expect(banishedCard!.zone).toBe(ZoneId.BANISHED);
      
      const updatedPlayer = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      expect(updatedPlayer.zones.banished.length).toBe(1);
      expect(updatedPlayer.zones.banished[0].id).toBe('card1');
      expect(updatedPlayer.zones.characterArea.length).toBe(0);
    });

    it('should clear modifiers from banished card', () => {
      const player1 = stateManager.getPlayer(PlayerId.PLAYER_1)!;
      
      // Create a card with modifiers
      const card = createTestCard({
        id: 'card1',
        name: 'Test Card',
        category: CardCategory.CHARACTER,
        controller: PlayerId.PLAYER_1,
        zone: ZoneId.CHARACTER_AREA,
        state: CardState.ACTIVE,
      });
      
      card.modifiers.push({
        id: 'mod1',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.PERMANENT,
        source: 'effect1',
        timestamp: Date.now(),
      });
      
      player1.zones.characterArea.push(card);
      stateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player1);

      // Banish the card
      stateManager = banishCard(card, stateManager);

      // Verify modifiers are cleared
      const banishedCard = stateManager.getCard('card1');
      expect(banishedCard).toBeDefined();
      expect(banishedCard!.modifiers.length).toBe(0);
    });
  });
});
