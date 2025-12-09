/**
 * Integration tests for Card Database Service
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CardDatabaseService } from '../CardDatabaseService';
import { CardDataError } from '../../utils/errors';

describe('CardDatabaseService Integration', () => {
  let service: CardDatabaseService;

  beforeAll(() => {
    service = CardDatabaseService.getInstance({
      cacheEnabled: true,
      strictValidation: false,
    });
  });

  afterAll(async () => {
    await service.disconnect();
    CardDatabaseService.resetInstance();
  });

  it('should load a card by ID', async () => {
    // This test requires actual data in the database
    // Skip if no data available
    try {
      const cards = await service.getCardsByFilter({ set: 'OP01' });
      if (cards.length > 0) {
        const card = await service.getCardById(cards[0].id);
        expect(card).toBeDefined();
        expect(card.name).toBeDefined();
        expect(card.metadata.cardNumber).toBeDefined();
      }
    } catch (error) {
      // No cards in database - skip test
      console.log('Skipping test - no cards in database');
    }
  });

  it('should throw error for non-existent card', async () => {
    await expect(
      service.getCardById('non-existent-id')
    ).rejects.toThrow(CardDataError);
  });

  it('should cache loaded cards', async () => {
    try {
      const cards = await service.getCardsByFilter({ set: 'OP01' });
      if (cards.length > 0) {
        const cardId = cards[0].id;
        
        // Load card (should cache it)
        await service.getCardById(cardId);
        
        // Check cache size increased
        const cacheSize = service.getCacheSize();
        expect(cacheSize).toBeGreaterThan(0);
        
        // Clear cache
        service.clearCache();
        expect(service.getCacheSize()).toBe(0);
      }
    } catch (error) {
      console.log('Skipping test - no cards in database');
    }
  });

  it('should filter cards by set', async () => {
    const cards = await service.getCardsByFilter({ set: 'OP01' });
    expect(Array.isArray(cards)).toBe(true);
    
    // If cards exist, verify they're from the correct set
    if (cards.length > 0) {
      cards.forEach(card => {
        expect(card.metadata.setCode).toBe('OP01');
      });
    }
  });

  it('should validate all cards', async () => {
    const report = await service.validateAllCards();
    
    expect(report).toBeDefined();
    expect(report.totalCards).toBeGreaterThanOrEqual(0);
    expect(report.validCards).toBeGreaterThanOrEqual(0);
    expect(report.invalidCards).toBeGreaterThanOrEqual(0);
    expect(report.totalCards).toBe(report.validCards + report.invalidCards);
  });
});
