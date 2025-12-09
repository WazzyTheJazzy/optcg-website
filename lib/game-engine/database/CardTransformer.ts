/**
 * CardTransformer.ts
 * 
 * Transforms Prisma Card model data into CardDefinition format for the game engine.
 */

import { CardDefinition, CardCategory, EffectDefinition } from '../core/types';
import { PrismaCard } from './types';

/**
 * Transforms Prisma Card data to CardDefinition format
 */
export class CardTransformer {
  /**
   * Transform a Prisma card to a CardDefinition
   * @param prismaCard - The card data from the database
   * @param effects - Parsed effect definitions (from EffectMapper)
   * @returns CardDefinition for the game engine
   */
  transform(prismaCard: PrismaCard, effects: EffectDefinition[]): CardDefinition {
    return {
      id: prismaCard.id,
      name: prismaCard.name,
      category: this.mapTypeToCategory(prismaCard.type),
      colors: this.parseColors(prismaCard.color),
      typeTags: this.parseTypeTags(prismaCard.tags),
      attributes: this.parseAttributes(prismaCard.attribute),
      basePower: prismaCard.power,
      baseCost: prismaCard.cost,
      lifeValue: prismaCard.life,
      counterValue: prismaCard.counter,
      rarity: prismaCard.rarity,
      keywords: this.parseKeywords(prismaCard.tags),
      effects,
      imageUrl: this.getImageUrl(prismaCard),
      metadata: {
        setCode: prismaCard.set,
        cardNumber: prismaCard.cardNumber,
        isAltArt: this.isAlternateArt(prismaCard.illustrationType),
        isPromo: this.isPromo(prismaCard.set),
      },
    };
  }

  /**
   * Parse color string to array
   * @param colorString - Comma-separated color string or single color
   * @returns Array of colors
   */
  private parseColors(colorString: string): string[] {
    if (!colorString) {
      return [];
    }

    // Handle comma-separated colors
    if (colorString.includes(',')) {
      return colorString
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);
    }

    // Single color
    return [colorString.trim()];
  }

  /**
   * Parse type tags from tags string
   * @param tagsString - Comma-separated tags
   * @returns Array of type tags
   */
  private parseTypeTags(tagsString: string | null): string[] {
    if (!tagsString) {
      return [];
    }

    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && !this.isKeyword(tag));
  }

  /**
   * Parse attributes from attribute string
   * @param attributeString - Comma-separated attributes or single attribute
   * @returns Array of attributes
   */
  private parseAttributes(attributeString: string | null): string[] {
    if (!attributeString) {
      return [];
    }

    // Handle comma-separated attributes
    if (attributeString.includes(',')) {
      return attributeString
        .split(',')
        .map(attr => attr.trim())
        .filter(attr => attr.length > 0);
    }

    // Single attribute
    return [attributeString.trim()];
  }

  /**
   * Parse keywords from tags string
   * @param tagsString - Comma-separated tags
   * @returns Array of keywords
   */
  private parseKeywords(tagsString: string | null): string[] {
    if (!tagsString) {
      return [];
    }

    const keywords: string[] = [];
    const tags = tagsString.split(',').map(tag => tag.trim());

    for (const tag of tags) {
      if (this.isKeyword(tag)) {
        keywords.push(tag);
      }
    }

    return keywords;
  }

  /**
   * Check if a tag is a keyword
   * @param tag - The tag to check
   * @returns True if the tag is a keyword
   */
  private isKeyword(tag: string): boolean {
    const keywords = [
      'Rush',
      'Blocker',
      'Banish',
      'Double Attack',
      'Trigger',
      'Counter',
    ];

    return keywords.some(keyword => 
      tag.toLowerCase() === keyword.toLowerCase()
    );
  }

  /**
   * Map card type to CardCategory enum
   * @param type - The card type string
   * @returns CardCategory enum value
   */
  private mapTypeToCategory(type: string): CardCategory {
    const typeUpper = type.toUpperCase();

    switch (typeUpper) {
      case 'LEADER':
        return CardCategory.LEADER;
      case 'CHARACTER':
        return CardCategory.CHARACTER;
      case 'EVENT':
        return CardCategory.EVENT;
      case 'STAGE':
        return CardCategory.STAGE;
      case 'DON':
      case 'DON!!':
        return CardCategory.DON;
      default:
        // Default to CHARACTER if unknown
        console.warn(`Unknown card type: ${type}, defaulting to CHARACTER`);
        return CardCategory.CHARACTER;
    }
  }

  /**
   * Get image URL with fallback
   * @param prismaCard - The Prisma card data
   * @returns Image URL
   */
  private getImageUrl(prismaCard: PrismaCard): string {
    if (prismaCard.imageUrl) {
      return prismaCard.imageUrl;
    }

    // Generate default image path based on card number
    return `/cards/${prismaCard.cardNumber}.png`;
  }

  /**
   * Check if illustration type indicates alternate art
   * @param illustrationType - The illustration type string
   * @returns True if alternate art
   */
  private isAlternateArt(illustrationType: string | null): boolean {
    if (!illustrationType) {
      return false;
    }

    const altTypes = ['alternate', 'parallel', 'manga', 'special'];
    const typeLower = illustrationType.toLowerCase();

    return altTypes.some(altType => typeLower.includes(altType));
  }

  /**
   * Check if card is a promo based on set code
   * @param setCode - The set code
   * @returns True if promo
   */
  private isPromo(setCode: string): boolean {
    return setCode.toUpperCase().startsWith('P');
  }
}
