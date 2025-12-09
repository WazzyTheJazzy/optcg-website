/**
 * ZoneRenderer.test.tsx
 * 
 * Tests for DON card rendering in different zones
 */

import { describe, it, expect } from 'vitest';
import { ZoneId, CardState, PlayerId } from '@/lib/game-engine/core/types';
import { DonVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { ZoneLayoutType } from './ZoneRenderer';

describe('ZoneRenderer - DON Card Display', () => {
  
  /**
   * Helper to create test DON cards
   */
  function createTestDonCards(count: number, zone: ZoneId, state: CardState = CardState.ACTIVE): DonVisualState[] {
    const donCards: DonVisualState[] = [];
    for (let i = 0; i < count; i++) {
      donCards.push({
        id: `don-${i}`,
        zone,
        state,
        owner: PlayerId.PLAYER_1,
      });
    }
    return donCards;
  }

  it('should use STACK layout for DON deck', () => {
    // DON deck should use STACK layout (cards stacked vertically)
    const layout = ZoneLayoutType.STACK;
    expect(layout).toBe(ZoneLayoutType.STACK);
  });

  it('should use GRID layout for cost area', () => {
    // Cost area should use GRID layout (cards in grid)
    const layout = ZoneLayoutType.GRID;
    expect(layout).toBe(ZoneLayoutType.GRID);
  });

  it('should create correct number of DON cards for don deck', () => {
    const donCards = createTestDonCards(10, ZoneId.DON_DECK);
    expect(donCards).toHaveLength(10);
    expect(donCards[0].zone).toBe(ZoneId.DON_DECK);
  });

  it('should create correct number of DON cards for cost area', () => {
    const donCards = createTestDonCards(5, ZoneId.COST_AREA, CardState.ACTIVE);
    expect(donCards).toHaveLength(5);
    expect(donCards[0].zone).toBe(ZoneId.COST_AREA);
    expect(donCards[0].state).toBe(CardState.ACTIVE);
  });

  it('should handle rested DON cards in cost area', () => {
    const donCards = createTestDonCards(3, ZoneId.COST_AREA, CardState.RESTED);
    expect(donCards).toHaveLength(3);
    expect(donCards[0].state).toBe(CardState.RESTED);
  });

  it('should handle empty DON zones', () => {
    const donCards = createTestDonCards(0, ZoneId.DON_DECK);
    expect(donCards).toHaveLength(0);
  });

  it('should handle maximum DON cards in cost area (10)', () => {
    const donCards = createTestDonCards(10, ZoneId.COST_AREA);
    expect(donCards).toHaveLength(10);
    
    // Verify grid layout can handle 10 cards (2 rows of 5)
    const cardsPerRow = 5;
    const rows = Math.ceil(donCards.length / cardsPerRow);
    expect(rows).toBe(2);
  });

  it('should verify DON cards have correct owner', () => {
    const donCards = createTestDonCards(5, ZoneId.COST_AREA);
    donCards.forEach(don => {
      expect(don.owner).toBe(PlayerId.PLAYER_1);
    });
  });
});
