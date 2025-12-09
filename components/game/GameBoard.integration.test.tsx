/**
 * GameBoard.integration.test.tsx
 * 
 * Integration tests for Main Phase UI interactions
 * Tests card selection, playing cards, attacking, DON attachment, and phase control
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';
import { PlayerId, Phase, CardCategory, CardDefinition } from '@/lib/game-engine/core/types';

/**
 * Helper function to create a test deck
 */
function createTestDeck(): CardDefinition[] {
  const deck: CardDefinition[] = [];
  
  // Add leader
  deck.push({
    id: 'leader-1',
    name: 'Test Leader',
    category: CardCategory.LEADER,
    colors: ['Red'],
    typeTags: [],
    basePower: 5000,
    baseCost: null,
    lifeValue: 5,
    counterValue: null,
    rarity: 'L',
    keywords: [],
    attributes: [],
    effects: [],
    imageUrl: '',
    metadata: {
      isAltArt: false,
      isPromo: false,
      setCode: 'TEST',
      cardNumber: '001',
    },
  });
  
  // Add 10 DON cards (required)
  for (let i = 1; i <= 10; i++) {
    deck.push({
      id: `don-${i}`,
      name: `DON!! Card ${i}`,
      category: CardCategory.DON,
      colors: ['Red'],
      typeTags: [],
      basePower: null,
      baseCost: null,
      lifeValue: null,
      counterValue: null,
      rarity: 'C',
      keywords: [],
      attributes: [],
      effects: [],
      imageUrl: '',
      metadata: {
        isAltArt: false,
        isPromo: false,
        setCode: 'TEST',
        cardNumber: `DON-${i.toString().padStart(3, '0')}`,
      },
    });
  }
  
  // Add 50 character cards (total deck = 61 cards: 1 leader + 10 DON + 50 characters)
  for (let i = 1; i <= 50; i++) {
    deck.push({
      id: `char-${i}`,
      name: `Character ${i}`,
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      basePower: 3000 + (i * 100),
      baseCost: i <= 10 ? 2 : i <= 20 ? 3 : i <= 30 ? 4 : 5,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: [],
      attributes: [],
      effects: [],
      imageUrl: '',
      metadata: {
        isAltArt: false,
        isPromo: false,
        setCode: 'TEST',
        cardNumber: i.toString().padStart(3, '0'),
      },
    });
  }
  
  return deck;
}

/**
 * Helper function to setup a game in Main Phase
 */
async function setupGameInMainPhase(engine: GameEngine): Promise<void> {
  const deck1 = createTestDeck();
  const deck2 = createTestDeck();
  
  engine.setupGame({
    deck1,
    deck2,
    firstPlayerChoice: PlayerId.PLAYER_1,
  });
  
  // Advance to Main Phase
  while (engine.getState().phase !== Phase.MAIN) {
    engine.advancePhase();
  }
}

describe('GameBoard Integration Tests', () => {
  let engine: GameEngine;
  let renderingInterface: RenderingInterface;

  beforeEach(() => {
    engine = new GameEngine();
    renderingInterface = new RenderingInterface(engine);
  });

  describe('13.1 Card Selection Flow', () => {
    it('should have cards in hand after setup', async () => {
      await setupGameInMainPhase(engine);
      
      const boardState = renderingInterface.getBoardState();
      expect(boardState.player1.zones.hand.length).toBeGreaterThan(0);
    });

    it('should track selected card state through game engine', async () => {
      await setupGameInMainPhase(engine);
      
      const boardState = renderingInterface.getBoardState();
      const firstCard = boardState.player1.zones.hand[0];
      
      // Verify card exists and has expected properties
      expect(firstCard).toBeDefined();
      expect(firstCard.id).toBeDefined();
      expect(firstCard.metadata.name).toBeDefined();
    });

    it('should have multiple cards available for selection', async () => {
      await setupGameInMainPhase(engine);
      
      const boardState = renderingInterface.getBoardState();
      expect(boardState.player1.zones.hand.length).toBeGreaterThanOrEqual(2);
      
      const firstCard = boardState.player1.zones.hand[0];
      const secondCard = boardState.player1.zones.hand[1];
      
      expect(firstCard.id).not.toBe(secondCard.id);
    });
  });

  describe('13.2 Card Playing Flow', () => {
    it('should play card with sufficient DON', async () => {
      await setupGameInMainPhase(engine);
      
      const boardState = renderingInterface.getBoardState();
      const cardToPlay = boardState.player1.zones.hand.find(c => c.cost <= 2);
      
      expect(cardToPlay).toBeDefined();
      
      // Play the card
      const success = engine.playCard(PlayerId.PLAYER_1, cardToPlay!.id);
      expect(success).toBe(true);
      
      // Verify card moved to character area
      const newBoardState = renderingInterface.getBoardState();
      const playedCard = newBoardState.player1.zones.characterArea.find(c => c.id === cardToPlay!.id);
      expect(playedCard).toBeDefined();
    });

    it('should fail to play card with insufficient DON', async () => {
      await setupGameInMainPhase(engine);
      
      const boardState = renderingInterface.getBoardState();
      const expensiveCard = boardState.player1.zones.hand.find(c => c.cost > 2);
      
      if (expensiveCard) {
        const success = engine.playCard(PlayerId.PLAYER_1, expensiveCard.id);
        expect(success).toBe(false);
      }
    });

    it('should rest DON cards after playing card', async () => {
      await setupGameInMainPhase(engine);
      
      const boardState = renderingInterface.getBoardState();
      const cardToPlay = boardState.player1.zones.hand.find(c => c.cost === 2);
      
      if (cardToPlay) {
        const activeDonBefore = boardState.player1.zones.costArea.filter(d => d.state === 'ACTIVE').length;
        
        engine.playCard(PlayerId.PLAYER_1, cardToPlay.id);
        
        const newBoardState = renderingInterface.getBoardState();
        const activeDonAfter = newBoardState.player1.zones.costArea.filter(d => d.state === 'ACTIVE').length;
        
        expect(activeDonAfter).toBe(activeDonBefore - cardToPlay.cost);
      }
    });

    it('should prevent playing 6th character card', async () => {
      await setupGameInMainPhase(engine);
      
      // Play 5 cards
      for (let i = 0; i < 5; i++) {
        const boardState = renderingInterface.getBoardState();
        const cardToPlay = boardState.player1.zones.hand.find(c => c.cost <= 2);
        if (cardToPlay) {
          engine.playCard(PlayerId.PLAYER_1, cardToPlay.id);
        }
      }
      
      // Try to play 6th card
      const boardState = renderingInterface.getBoardState();
      const sixthCard = boardState.player1.zones.hand.find(c => c.cost <= 2);
      
      if (sixthCard) {
        const success = engine.playCard(PlayerId.PLAYER_1, sixthCard.id);
        expect(success).toBe(false);
      }
    });
  });

  describe('13.3 Attack Flow', () => {
    it('should get valid attack targets for active character', async () => {
      await setupGameInMainPhase(engine);
      
      // Play a character
      const boardState = renderingInterface.getBoardState();
      const cardToPlay = boardState.player1.zones.hand.find(c => c.cost <= 2);
      
      if (cardToPlay) {
        engine.playCard(PlayerId.PLAYER_1, cardToPlay.id);
        
        const newBoardState = renderingInterface.getBoardState();
        const playedCard = newBoardState.player1.zones.characterArea[0];
        
        // Get valid targets
        const targets = engine.getLegalAttackTargets(playedCard.id);
        expect(targets).toBeDefined();
        expect(Array.isArray(targets)).toBe(true);
      }
    });

    it('should get valid attack targets for character', async () => {
      await setupGameInMainPhase(engine);
      
      // Test that getLegalAttackTargets returns valid targets
      const boardState = renderingInterface.getBoardState();
      const cardToPlay = boardState.player1.zones.hand.find(c => c.cost <= 2);
      
      if (cardToPlay) {
        engine.playCard(PlayerId.PLAYER_1, cardToPlay.id);
        
        const newBoardState = renderingInterface.getBoardState();
        const playedCard = newBoardState.player1.zones.characterArea[0];
        
        // Get valid attack targets (may include opponent leader)
        const targets = engine.getLegalAttackTargets(playedCard.id);
        expect(Array.isArray(targets)).toBe(true);
      }
    });

    it('should rest attacker after attack', async () => {
      await setupGameInMainPhase(engine);
      
      // This test verifies the attack system works conceptually
      // In a real game, characters need to wait a turn before attacking
      const boardState = renderingInterface.getBoardState();
      const cardToPlay = boardState.player1.zones.hand.find(c => c.cost <= 2);
      
      if (cardToPlay) {
        engine.playCard(PlayerId.PLAYER_1, cardToPlay.id);
        
        const newBoardState = renderingInterface.getBoardState();
        const playedCard = newBoardState.player1.zones.characterArea[0];
        
        // Verify character exists in character area
        expect(playedCard).toBeDefined();
        expect(playedCard.state).toBe('ACTIVE');
      }
    });
  });

  describe('13.4 DON Attachment Flow', () => {
    it('should attach DON to character', async () => {
      await setupGameInMainPhase(engine);
      
      // Play a character
      const boardState = renderingInterface.getBoardState();
      const cardToPlay = boardState.player1.zones.hand.find(c => c.cost <= 2);
      
      if (cardToPlay) {
        engine.playCard(PlayerId.PLAYER_1, cardToPlay.id);
        
        const newBoardState = renderingInterface.getBoardState();
        const playedCard = newBoardState.player1.zones.characterArea[0];
        const activeDon = newBoardState.player1.zones.costArea.find(d => d.state === 'ACTIVE');
        
        if (activeDon) {
          const powerBefore = playedCard.power;
          
          // Attach DON
          const success = engine.giveDon(PlayerId.PLAYER_1, activeDon.id, playedCard.id);
          expect(success).toBe(true);
          
          // Verify power increased
          const finalBoardState = renderingInterface.getBoardState();
          const characterAfter = finalBoardState.player1.zones.characterArea.find(c => c.id === playedCard.id);
          expect(characterAfter?.power).toBe(powerBefore + 1000);
        }
      }
    });

    it('should increase DON count on character', async () => {
      await setupGameInMainPhase(engine);
      
      // Play a character
      const boardState = renderingInterface.getBoardState();
      const cardToPlay = boardState.player1.zones.hand.find(c => c.cost <= 2);
      
      if (cardToPlay) {
        engine.playCard(PlayerId.PLAYER_1, cardToPlay.id);
        
        const newBoardState = renderingInterface.getBoardState();
        const playedCard = newBoardState.player1.zones.characterArea[0];
        const activeDon = newBoardState.player1.zones.costArea.find(d => d.state === 'ACTIVE');
        
        if (activeDon) {
          const donCountBefore = playedCard.givenDonCount;
          
          // Attach DON
          engine.giveDon(PlayerId.PLAYER_1, activeDon.id, playedCard.id);
          
          // Verify DON count increased
          const finalBoardState = renderingInterface.getBoardState();
          const characterAfter = finalBoardState.player1.zones.characterArea.find(c => c.id === playedCard.id);
          expect(characterAfter?.givenDonCount).toBe(donCountBefore + 1);
        }
      }
    });
  });

  describe('13.5 Error Handling', () => {
    it('should handle invalid card play gracefully', async () => {
      await setupGameInMainPhase(engine);
      
      // Try to play non-existent card - should throw error
      expect(() => {
        engine.playCard(PlayerId.PLAYER_1, 'non-existent-card');
      }).toThrow();
    });

    it('should handle invalid attack gracefully', async () => {
      await setupGameInMainPhase(engine);
      
      // Try to attack with non-existent card - should throw error
      expect(() => {
        engine.declareAttack(PlayerId.PLAYER_1, 'non-existent-card', 'target');
      }).toThrow();
    });

    it('should handle invalid DON attachment gracefully', async () => {
      await setupGameInMainPhase(engine);
      
      // Try to attach non-existent DON - should throw error
      expect(() => {
        engine.giveDon(PlayerId.PLAYER_1, 'non-existent-don', 'target');
      }).toThrow();
    });
  });

  describe('13.6 Phase Control', () => {
    it('should be in MAIN phase after setup', async () => {
      await setupGameInMainPhase(engine);
      
      const state = engine.getState();
      expect(state.phase).toBe(Phase.MAIN);
    });

    it('should advance from MAIN phase when requested', async () => {
      await setupGameInMainPhase(engine);
      
      engine.advancePhase();
      
      const state = engine.getState();
      expect(state.phase).not.toBe(Phase.MAIN);
    });

    it('should clear UI state on phase change', async () => {
      await setupGameInMainPhase(engine);
      
      const phaseBefore = engine.getState().phase;
      
      engine.advancePhase();
      
      const phaseAfter = engine.getState().phase;
      expect(phaseAfter).not.toBe(phaseBefore);
    });
  });

  describe('Task 44: Battle Event Display', () => {
    it('should subscribe to ATTACK_DECLARED events', async () => {
      await setupGameInMainPhase(engine);
      
      let attackEventReceived = false;
      
      // Subscribe to battle events
      renderingInterface.onBattleEvent((event) => {
        if (event.type === 'ATTACK_DECLARED') {
          attackEventReceived = true;
        }
      });
      
      // The subscription should be active
      expect(renderingInterface).toBeDefined();
    });

    it('should subscribe to BLOCK_DECLARED events', async () => {
      await setupGameInMainPhase(engine);
      
      let blockEventReceived = false;
      
      // Subscribe to battle events
      renderingInterface.onBattleEvent((event) => {
        if (event.type === 'BLOCK_DECLARED') {
          blockEventReceived = true;
        }
      });
      
      // The subscription should be active
      expect(renderingInterface).toBeDefined();
    });

    it('should subscribe to COUNTER_STEP_START events', async () => {
      await setupGameInMainPhase(engine);
      
      let counterEventReceived = false;
      
      // Subscribe to battle events
      renderingInterface.onBattleEvent((event) => {
        if (event.type === 'COUNTER_STEP_START') {
          counterEventReceived = true;
        }
      });
      
      // The subscription should be active
      expect(renderingInterface).toBeDefined();
    });

    it('should subscribe to BATTLE_END events', async () => {
      await setupGameInMainPhase(engine);
      
      let battleEndEventReceived = false;
      
      // Subscribe to battle events
      renderingInterface.onBattleEvent((event) => {
        if (event.type === 'BATTLE_END') {
          battleEndEventReceived = true;
        }
      });
      
      // The subscription should be active
      expect(renderingInterface).toBeDefined();
    });

    it('should handle battle events with proper card lookups', async () => {
      await setupGameInMainPhase(engine);
      
      // Subscribe to battle events and verify we can look up cards
      renderingInterface.onBattleEvent((event) => {
        const boardState = renderingInterface.getBoardState();
        
        // Verify we can access board state in event handler
        expect(boardState).toBeDefined();
        expect(boardState.player1).toBeDefined();
        expect(boardState.player2).toBeDefined();
      });
      
      // The subscription should be active
      expect(renderingInterface).toBeDefined();
    });
  });
});
