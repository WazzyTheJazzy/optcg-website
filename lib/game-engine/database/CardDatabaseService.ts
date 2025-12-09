/**
 * CardDatabaseService.ts
 * 
 * Main service for loading and managing card data from the database.
 * Provides a bridge between Prisma database and game engine CardDefinitions.
 */

import { PrismaClient } from '@prisma/client';
import { CardDefinition } from '../core/types';
import { CardDataError } from '../utils/errors';
import { CardCache } from './CardCache';
import { CardTransformer } from './CardTransformer';
import { EffectMapper } from './EffectMapper';
import { CardValidator } from './CardValidator';
import {
  CardDatabaseConfig,
  CardDatabaseFilter,
  ValidationReport,
  PrismaCard,
} from './types';

/**
 * Singleton service for card database operations
 */
export class CardDatabaseService {
  private static instance: CardDatabaseService | null = null;

  private prisma: PrismaClient;
  private cache: CardCache;
  private transformer: CardTransformer;
  private effectMapper: EffectMapper;
  private validator: CardValidator;
  private config: CardDatabaseConfig;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config?: Partial<CardDatabaseConfig>) {
    this.prisma = new PrismaClient();
    this.cache = new CardCache();
    this.transformer = new CardTransformer();
    this.effectMapper = new EffectMapper();
    this.validator = new CardValidator();

    // Default configuration
    this.config = {
      cacheEnabled: true,
      preloadOnStartup: false,
      strictValidation: false,
      logEffectParsingWarnings: true,
      ...config,
    };
  }

  /**
   * Get singleton instance
   * @param config - Optional configuration
   * @returns CardDatabaseService instance
   */
  static getInstance(config?: Partial<CardDatabaseConfig>): CardDatabaseService {
    if (!CardDatabaseService.instance) {
      CardDatabaseService.instance = new CardDatabaseService(config);
    }
    return CardDatabaseService.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (CardDatabaseService.instance) {
      CardDatabaseService.instance.prisma.$disconnect();
      CardDatabaseService.instance = null;
    }
  }

  /**
   * Get card by database ID
   * @param cardId - The card's database ID
   * @returns CardDefinition
   * @throws CardDataError if card not found
   */
  async getCardById(cardId: string): Promise<CardDefinition> {
    // Check cache first
    if (this.config.cacheEnabled && this.cache.has(cardId)) {
      return this.cache.get(cardId)!;
    }

    // Query database
    const prismaCard = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!prismaCard) {
      throw new CardDataError(`Card not found: ${cardId}`, cardId);
    }

    // Transform and cache
    const cardDef = this.transformCard(prismaCard as PrismaCard);

    if (this.config.cacheEnabled) {
      this.cache.set(cardId, cardDef);
    }

    return cardDef;
  }

  /**
   * Get card by card number (e.g., "OP01-001")
   * @param cardNumber - The card number
   * @returns CardDefinition
   * @throws CardDataError if card not found
   */
  async getCardByNumber(cardNumber: string): Promise<CardDefinition> {
    // Check cache first
    if (this.config.cacheEnabled && this.cache.hasByNumber(cardNumber)) {
      return this.cache.getByNumber(cardNumber)!;
    }

    // Query database
    const prismaCard = await this.prisma.card.findUnique({
      where: { cardNumber },
    });

    if (!prismaCard) {
      throw new CardDataError(`Card not found: ${cardNumber}`, undefined, {
        cardNumber,
      });
    }

    // Transform and cache
    const cardDef = this.transformCard(prismaCard as PrismaCard);

    if (this.config.cacheEnabled) {
      this.cache.set(prismaCard.id, cardDef);
    }

    return cardDef;
  }

  /**
   * Get multiple cards by IDs
   * @param cardIds - Array of card IDs
   * @returns Array of CardDefinitions
   */
  async getCardsByIds(cardIds: string[]): Promise<CardDefinition[]> {
    const cards: CardDefinition[] = [];
    const uncachedIds: string[] = [];

    // Check cache for each card
    for (const cardId of cardIds) {
      if (this.config.cacheEnabled && this.cache.has(cardId)) {
        cards.push(this.cache.get(cardId)!);
      } else {
        uncachedIds.push(cardId);
      }
    }

    // Query database for uncached cards
    if (uncachedIds.length > 0) {
      const prismaCards = await this.prisma.card.findMany({
        where: {
          id: {
            in: uncachedIds,
          },
        },
      });

      for (const prismaCard of prismaCards) {
        const cardDef = this.transformCard(prismaCard as PrismaCard);
        cards.push(cardDef);

        if (this.config.cacheEnabled) {
          this.cache.set(prismaCard.id, cardDef);
        }
      }
    }

    return cards;
  }

  /**
   * Get cards by filter criteria
   * @param filter - Filter criteria
   * @returns Array of CardDefinitions
   */
  async getCardsByFilter(filter: CardDatabaseFilter): Promise<CardDefinition[]> {
    const where: any = {};

    if (filter.set) {
      where.set = filter.set;
    }

    if (filter.rarity) {
      where.rarity = filter.rarity;
    }

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.color) {
      where.color = {
        contains: filter.color,
      };
    }

    if (filter.category) {
      where.category = filter.category;
    }

    const prismaCards = await this.prisma.card.findMany({
      where,
    });

    const cards: CardDefinition[] = [];

    for (const prismaCard of prismaCards) {
      const cardDef = this.transformCard(prismaCard as PrismaCard);
      cards.push(cardDef);

      if (this.config.cacheEnabled) {
        this.cache.set(prismaCard.id, cardDef);
      }
    }

    return cards;
  }

  /**
   * Preload all cards into cache
   */
  async preloadAllCards(): Promise<void> {
    console.log('Preloading all cards into cache...');

    const prismaCards = await this.prisma.card.findMany();

    for (const prismaCard of prismaCards) {
      const cardDef = this.transformCard(prismaCard as PrismaCard);
      this.cache.set(prismaCard.id, cardDef);
    }

    console.log(`Preloaded ${prismaCards.length} cards into cache`);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate a specific card in the cache
   * @param cardId - The card ID to invalidate
   */
  invalidateCard(cardId: string): void {
    this.cache.delete(cardId);
  }

  /**
   * Validate all cards in the database
   * @returns Validation report
   */
  async validateAllCards(): Promise<ValidationReport> {
    return await this.validator.validateAll(this.prisma);
  }

  /**
   * Transform a Prisma card to CardDefinition
   * @param prismaCard - The Prisma card
   * @returns CardDefinition
   * @private
   */
  private transformCard(prismaCard: PrismaCard): CardDefinition {
    // Validate if strict mode is enabled
    if (this.config.strictValidation) {
      const validation = this.validator.validate(prismaCard);
      if (!validation.valid) {
        throw new CardDataError(
          `Card validation failed: ${validation.errors.join(', ')}`,
          prismaCard.id,
          { errors: validation.errors }
        );
      }
    }

    // Parse effects
    const effects = this.effectMapper.parseEffects(prismaCard.effect);

    // Transform to CardDefinition
    const cardDef = this.transformer.transform(prismaCard, effects);

    return cardDef;
  }

  /**
   * Get cache statistics
   * @returns Cache size
   */
  getCacheSize(): number {
    return this.cache.size();
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
