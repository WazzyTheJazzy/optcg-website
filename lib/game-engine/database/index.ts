/**
 * Card Database Service Module
 * 
 * Provides database access and transformation for card data.
 */

export { CardDatabaseService } from './CardDatabaseService';
export { CardCache } from './CardCache';
export { CardTransformer } from './CardTransformer';
export { EffectMapper } from './EffectMapper';
export { CardValidator } from './CardValidator';

// Deck loading helpers
export {
  loadDeckFromDatabase,
  loadDeckByCardNumbers,
  loadStandardDeck,
} from './deckLoader';

export type {
  CardDatabaseConfig,
  CardDatabaseFilter,
  ValidationResult,
  ValidationReport,
  PrismaCard,
} from './types';

// Re-export for convenience
export { CardDataError } from '../utils/errors';
