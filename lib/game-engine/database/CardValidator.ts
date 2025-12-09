/**
 * CardValidator.ts
 * 
 * Validates card data from the database to ensure integrity and completeness.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaCard, ValidationResult, ValidationReport } from './types';

/**
 * Validates card data for integrity and completeness
 */
export class CardValidator {
  /**
   * Validate a single card
   * @param card - The Prisma card to validate
   * @returns Validation result with errors and warnings
   */
  validate(card: PrismaCard): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    errors.push(...this.validateRequiredFields(card));

    // Numeric range validation
    errors.push(...this.validateNumericRanges(card));

    // Enum value validation
    errors.push(...this.validateEnumValues(card));

    // Effect text validation (warnings only)
    warnings.push(...this.validateEffectText(card));

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate all cards in the database
   * @param prisma - Prisma client instance
   * @returns Comprehensive validation report
   */
  async validateAll(prisma: PrismaClient): Promise<ValidationReport> {
    const cards = await prisma.card.findMany();

    const report: ValidationReport = {
      totalCards: cards.length,
      validCards: 0,
      invalidCards: 0,
      cardsWithWarnings: 0,
      errors: [],
      warnings: [],
    };

    for (const card of cards) {
      const result = this.validate(card as PrismaCard);

      if (result.valid) {
        report.validCards++;
      } else {
        report.invalidCards++;
        report.errors.push({
          cardId: card.id,
          cardNumber: card.cardNumber,
          errors: result.errors,
        });
      }

      if (result.warnings.length > 0) {
        report.cardsWithWarnings++;
        report.warnings.push({
          cardId: card.id,
          cardNumber: card.cardNumber,
          warnings: result.warnings,
        });
      }
    }

    return report;
  }

  /**
   * Validate required fields
   * @param card - The card to validate
   * @returns Array of error messages
   */
  private validateRequiredFields(card: PrismaCard): string[] {
    const errors: string[] = [];

    if (!card.id || card.id.trim().length === 0) {
      errors.push('Missing required field: id');
    }

    if (!card.cardNumber || card.cardNumber.trim().length === 0) {
      errors.push('Missing required field: cardNumber');
    }

    if (!card.name || card.name.trim().length === 0) {
      errors.push('Missing required field: name');
    }

    if (!card.set || card.set.trim().length === 0) {
      errors.push('Missing required field: set');
    }

    if (!card.rarity || card.rarity.trim().length === 0) {
      errors.push('Missing required field: rarity');
    }

    if (!card.color || card.color.trim().length === 0) {
      errors.push('Missing required field: color');
    }

    if (!card.type || card.type.trim().length === 0) {
      errors.push('Missing required field: type');
    }

    if (!card.category || card.category.trim().length === 0) {
      errors.push('Missing required field: category');
    }

    return errors;
  }

  /**
   * Validate numeric ranges
   * @param card - The card to validate
   * @returns Array of error messages
   */
  private validateNumericRanges(card: PrismaCard): string[] {
    const errors: string[] = [];

    // Cost validation (0-10)
    if (card.cost !== null) {
      if (card.cost < 0 || card.cost > 10) {
        errors.push(`Cost out of range: ${card.cost} (expected 0-10)`);
      }
    }

    // Power validation (0-12000)
    if (card.power !== null) {
      if (card.power < 0 || card.power > 12000) {
        errors.push(`Power out of range: ${card.power} (expected 0-12000)`);
      }
    }

    // Counter validation (0-2000)
    if (card.counter !== null) {
      if (card.counter < 0 || card.counter > 2000) {
        errors.push(`Counter out of range: ${card.counter} (expected 0-2000)`);
      }
    }

    // Life validation (0-5)
    if (card.life !== null) {
      if (card.life < 0 || card.life > 5) {
        errors.push(`Life out of range: ${card.life} (expected 0-5)`);
      }
    }

    return errors;
  }

  /**
   * Validate enum values
   * @param card - The card to validate
   * @returns Array of error messages
   */
  private validateEnumValues(card: PrismaCard): string[] {
    const errors: string[] = [];

    // Type validation
    const validTypes = ['Leader', 'Character', 'Event', 'Stage', 'DON', 'DON!!'];
    if (!validTypes.includes(card.type)) {
      errors.push(`Invalid type: ${card.type} (expected one of: ${validTypes.join(', ')})`);
    }

    // Rarity validation
    const validRarities = ['C', 'UC', 'R', 'SR', 'SEC', 'L', 'P'];
    if (!validRarities.includes(card.rarity)) {
      errors.push(`Invalid rarity: ${card.rarity} (expected one of: ${validRarities.join(', ')})`);
    }

    // Type-specific validations
    if (card.type === 'Leader' && card.life === null) {
      errors.push('Leader cards must have a life value');
    }

    if (card.type === 'Character' && card.power === null) {
      errors.push('Character cards should have a power value');
    }

    return errors;
  }

  /**
   * Validate effect text (warnings only)
   * @param card - The card to validate
   * @returns Array of warning messages
   */
  private validateEffectText(card: PrismaCard): string[] {
    const warnings: string[] = [];

    // Check if card has effect text when it should
    if (card.type === 'Event' && (!card.effect || card.effect.trim().length === 0)) {
      warnings.push('Event card has no effect text');
    }

    // Check for common effect text issues
    if (card.effect) {
      // Check for incomplete effect labels
      const openBrackets = (card.effect.match(/\[/g) || []).length;
      const closeBrackets = (card.effect.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        warnings.push('Effect text has mismatched brackets');
      }

      // Check for very short effect text (might be incomplete)
      if (card.effect.trim().length < 10 && card.type !== 'DON') {
        warnings.push('Effect text seems unusually short');
      }
    }

    return warnings;
  }
}
