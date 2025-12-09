/**
 * Type definitions for the Card Database Service
 */

import { CardDefinition } from '../core/types';

/**
 * Configuration for the Card Database Service
 */
export interface CardDatabaseConfig {
  cacheEnabled: boolean;
  preloadOnStartup: boolean;
  strictValidation: boolean;
  logEffectParsingWarnings: boolean;
}

/**
 * Filter criteria for querying cards
 */
export interface CardDatabaseFilter {
  set?: string;
  rarity?: string;
  type?: string;
  color?: string;
  category?: string;
}

/**
 * Result of validating a single card
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive validation report for all cards
 */
export interface ValidationReport {
  totalCards: number;
  validCards: number;
  invalidCards: number;
  cardsWithWarnings: number;
  errors: Array<{
    cardId: string;
    cardNumber: string;
    errors: string[];
  }>;
  warnings: Array<{
    cardId: string;
    cardNumber: string;
    warnings: string[];
  }>;
}

/**
 * Prisma Card model type (from database)
 */
export interface PrismaCard {
  id: string;
  cardNumber: string;
  name: string;
  set: string;
  rarity: string;
  color: string;
  cost: number | null;
  power: number | null;
  counter: number | null;
  life: number | null;
  attribute: string | null;
  type: string;
  category: string;
  effect: string | null;
  trigger: string | null;
  imageUrl: string | null;
  illustrationType: string | null;
  artist: string | null;
  archetype: string | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}
