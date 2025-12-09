/**
 * KeywordHandler.test.ts
 * 
 * Tests for the KeywordHandler class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordHandler } from './KeywordHandler';
import { RulesContext } from '../rules/RulesContext';
import {
  CardInstance,
  CardDefinition,
  CardCategory,
  CardState,
  ZoneId,
  PlayerId,
  ModifierType,
  ModifierDuration,
} from '../core/types';

describe('KeywordHandler', () => {
  let keywordHandler: KeywordHandler;
  let rules: RulesContext;

  beforeEach(() => {
    rules = new RulesContext();
    keywordHandler = new KeywordHandler(rules);
  });

  // Helper function to create a test card
  const createTestCard = (keywords: string[] = []): CardInstance => {
    const definition: CardDefinition = {
      id: 'test-card-001',
      name: 'Test Card',
      category: CardCategory.CHARACTER,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 5000,
      baseCost: 3,
      lifeValue: null,
      counterValue: 1000,
      rarity: 'C',
      keywords: keywords,
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    };

    return {
      id: 'test-card-instance-001',
      definition,
      owner: PlayerId.PLAYER_1,
      controller: PlayerId.PLAYER_1,
      zone: ZoneId.CHARACTER_AREA,
      state: CardState.ACTIVE,
      givenDon: [],
      modifiers: [],
      flags: new Map(),
    };
  };

  describe('hasKeyword', () => {
    it('should return true for keywords in card definition', () => {
      const card = createTestCard(['Rush', 'Blocker']);
      
      expect(keywordHandler.hasKeyword(card, 'Rush')).toBe(true);
      expect(keywordHandler.hasKeyword(card, 'Blocker')).toBe(true);
    });

    it('should return false for keywords not in card definition', () => {
      const card = createTestCard(['Rush']);
      
      expect(keywordHandler.hasKeyword(card, 'Blocker')).toBe(false);
      expect(keywordHandler.hasKeyword(card, 'Double Attack')).toBe(false);
    });

    it('should return true for keywords added by modifiers', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Rush',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasKeyword(card, 'Rush')).toBe(true);
    });

    it('should check both definition and modifiers', () => {
      const card = createTestCard(['Blocker']);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Rush',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasKeyword(card, 'Rush')).toBe(true);
      expect(keywordHandler.hasKeyword(card, 'Blocker')).toBe(true);
      expect(keywordHandler.hasKeyword(card, 'Double Attack')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const card = createTestCard(['Rush']);
      
      expect(keywordHandler.hasKeyword(card, 'Rush')).toBe(true);
      expect(keywordHandler.hasKeyword(card, 'rush')).toBe(false);
      expect(keywordHandler.hasKeyword(card, 'RUSH')).toBe(false);
    });

    it('should ignore non-keyword modifiers', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.POWER,
        value: 1000,
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasKeyword(card, 'Rush')).toBe(false);
    });
  });

  describe('hasRush', () => {
    it('should return true when card has Rush keyword', () => {
      const card = createTestCard(['Rush']);
      expect(keywordHandler.hasRush(card)).toBe(true);
    });

    it('should return false when card does not have Rush keyword', () => {
      const card = createTestCard(['Blocker']);
      expect(keywordHandler.hasRush(card)).toBe(false);
    });

    it('should return true when Rush is added by modifier', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Rush',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasRush(card)).toBe(true);
    });
  });

  describe('hasBlocker', () => {
    it('should return true when card has Blocker keyword', () => {
      const card = createTestCard(['Blocker']);
      expect(keywordHandler.hasBlocker(card)).toBe(true);
    });

    it('should return false when card does not have Blocker keyword', () => {
      const card = createTestCard(['Rush']);
      expect(keywordHandler.hasBlocker(card)).toBe(false);
    });

    it('should return true when Blocker is added by modifier', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Blocker',
        duration: ModifierDuration.PERMANENT,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasBlocker(card)).toBe(true);
    });
  });

  describe('hasTrigger', () => {
    it('should return true when card has Trigger keyword', () => {
      const card = createTestCard(['Trigger']);
      expect(keywordHandler.hasTrigger(card)).toBe(true);
    });

    it('should return false when card does not have Trigger keyword', () => {
      const card = createTestCard(['Rush']);
      expect(keywordHandler.hasTrigger(card)).toBe(false);
    });

    it('should return true when Trigger is added by modifier', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Trigger',
        duration: ModifierDuration.PERMANENT,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasTrigger(card)).toBe(true);
    });
  });

  describe('hasDoubleAttack', () => {
    it('should return true when card has Double Attack keyword', () => {
      const card = createTestCard(['Double Attack']);
      expect(keywordHandler.hasDoubleAttack(card)).toBe(true);
    });

    it('should return false when card does not have Double Attack keyword', () => {
      const card = createTestCard(['Rush']);
      expect(keywordHandler.hasDoubleAttack(card)).toBe(false);
    });

    it('should return true when Double Attack is added by modifier', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Double Attack',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasDoubleAttack(card)).toBe(true);
    });
  });

  describe('hasCounter', () => {
    it('should return true when card has Counter keyword', () => {
      const card = createTestCard(['Counter']);
      expect(keywordHandler.hasCounter(card)).toBe(true);
    });

    it('should return false when card does not have Counter keyword', () => {
      const card = createTestCard(['Rush']);
      expect(keywordHandler.hasCounter(card)).toBe(false);
    });

    it('should return true when Counter is added by modifier', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Counter',
        duration: ModifierDuration.PERMANENT,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasCounter(card)).toBe(true);
    });
  });

  describe('hasBanish', () => {
    it('should return true when card has Banish keyword', () => {
      const card = createTestCard(['Banish']);
      expect(keywordHandler.hasBanish(card)).toBe(true);
    });

    it('should return false when card does not have Banish keyword', () => {
      const card = createTestCard(['Rush']);
      expect(keywordHandler.hasBanish(card)).toBe(false);
    });

    it('should return true when Banish is added by modifier', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Banish',
        duration: ModifierDuration.PERMANENT,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasBanish(card)).toBe(true);
    });
  });

  describe('getKeywordDefinition', () => {
    it('should return keyword definition from rules', () => {
      const rushDef = keywordHandler.getKeywordDefinition('Rush');
      
      expect(rushDef).not.toBeNull();
      expect(rushDef?.name).toBe('Rush');
      expect(rushDef?.type).toBe('static');
      expect(rushDef?.appliesTo).toContain('CHARACTER');
    });

    it('should return null for non-existent keyword', () => {
      const def = keywordHandler.getKeywordDefinition('NonExistentKeyword');
      expect(def).toBeNull();
    });

    it('should return definitions for all standard keywords', () => {
      const keywords = ['Rush', 'Blocker', 'Trigger', 'Double Attack', 'Counter'];
      
      keywords.forEach(keyword => {
        const def = keywordHandler.getKeywordDefinition(keyword);
        expect(def).not.toBeNull();
        expect(def?.name).toBe(keyword);
      });
    });
  });

  describe('getAllKeywords', () => {
    it('should return empty array for card with no keywords', () => {
      const card = createTestCard([]);
      const keywords = keywordHandler.getAllKeywords(card);
      
      expect(keywords).toEqual([]);
    });

    it('should return keywords from definition', () => {
      const card = createTestCard(['Rush', 'Blocker']);
      const keywords = keywordHandler.getAllKeywords(card);
      
      expect(keywords).toHaveLength(2);
      expect(keywords).toContain('Rush');
      expect(keywords).toContain('Blocker');
    });

    it('should return keywords from modifiers', () => {
      const card = createTestCard([]);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Rush',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      const keywords = keywordHandler.getAllKeywords(card);
      
      expect(keywords).toHaveLength(1);
      expect(keywords).toContain('Rush');
    });

    it('should combine keywords from definition and modifiers', () => {
      const card = createTestCard(['Blocker']);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Rush',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      card.modifiers.push({
        id: 'mod-2',
        type: ModifierType.KEYWORD,
        value: 'Double Attack',
        duration: ModifierDuration.PERMANENT,
        source: 'effect-source-2',
        timestamp: Date.now(),
      });
      
      const keywords = keywordHandler.getAllKeywords(card);
      
      expect(keywords).toHaveLength(3);
      expect(keywords).toContain('Rush');
      expect(keywords).toContain('Blocker');
      expect(keywords).toContain('Double Attack');
    });

    it('should not duplicate keywords', () => {
      const card = createTestCard(['Rush']);
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Rush',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-source',
        timestamp: Date.now(),
      });
      
      const keywords = keywordHandler.getAllKeywords(card);
      
      expect(keywords).toHaveLength(1);
      expect(keywords).toContain('Rush');
    });
  });

  describe('isValidKeyword', () => {
    it('should return true for valid keywords', () => {
      expect(keywordHandler.isValidKeyword('Rush')).toBe(true);
      expect(keywordHandler.isValidKeyword('Blocker')).toBe(true);
      expect(keywordHandler.isValidKeyword('Trigger')).toBe(true);
      expect(keywordHandler.isValidKeyword('Double Attack')).toBe(true);
      expect(keywordHandler.isValidKeyword('Counter')).toBe(true);
    });

    it('should return false for invalid keywords', () => {
      expect(keywordHandler.isValidKeyword('InvalidKeyword')).toBe(false);
      expect(keywordHandler.isValidKeyword('Flying')).toBe(false);
      expect(keywordHandler.isValidKeyword('')).toBe(false);
    });
  });

  describe('canApplyToCategory', () => {
    it('should return true when keyword applies to category', () => {
      expect(keywordHandler.canApplyToCategory('Rush', 'CHARACTER')).toBe(true);
      expect(keywordHandler.canApplyToCategory('Blocker', 'CHARACTER')).toBe(true);
      expect(keywordHandler.canApplyToCategory('Trigger', 'CHARACTER')).toBe(true);
      expect(keywordHandler.canApplyToCategory('Trigger', 'EVENT')).toBe(true);
    });

    it('should return false when keyword does not apply to category', () => {
      expect(keywordHandler.canApplyToCategory('Rush', 'EVENT')).toBe(false);
      expect(keywordHandler.canApplyToCategory('Rush', 'STAGE')).toBe(false);
      expect(keywordHandler.canApplyToCategory('Blocker', 'LEADER')).toBe(false);
    });

    it('should return false for invalid keywords', () => {
      expect(keywordHandler.canApplyToCategory('InvalidKeyword', 'CHARACTER')).toBe(false);
    });
  });

  describe('Integration with modifiers', () => {
    it('should handle multiple keyword modifiers', () => {
      const card = createTestCard(['Blocker']);
      
      // Add Rush temporarily
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.KEYWORD,
        value: 'Rush',
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-1',
        timestamp: Date.now(),
      });
      
      // Add Double Attack permanently
      card.modifiers.push({
        id: 'mod-2',
        type: ModifierType.KEYWORD,
        value: 'Double Attack',
        duration: ModifierDuration.PERMANENT,
        source: 'effect-2',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasBlocker(card)).toBe(true);
      expect(keywordHandler.hasRush(card)).toBe(true);
      expect(keywordHandler.hasDoubleAttack(card)).toBe(true);
      expect(keywordHandler.hasTrigger(card)).toBe(false);
      
      const allKeywords = keywordHandler.getAllKeywords(card);
      expect(allKeywords).toHaveLength(3);
    });

    it('should handle mixed modifier types', () => {
      const card = createTestCard(['Rush']);
      
      // Add power modifier
      card.modifiers.push({
        id: 'mod-1',
        type: ModifierType.POWER,
        value: 2000,
        duration: ModifierDuration.UNTIL_END_OF_TURN,
        source: 'effect-1',
        timestamp: Date.now(),
      });
      
      // Add keyword modifier
      card.modifiers.push({
        id: 'mod-2',
        type: ModifierType.KEYWORD,
        value: 'Blocker',
        duration: ModifierDuration.PERMANENT,
        source: 'effect-2',
        timestamp: Date.now(),
      });
      
      // Add cost modifier
      card.modifiers.push({
        id: 'mod-3',
        type: ModifierType.COST,
        value: -1,
        duration: ModifierDuration.PERMANENT,
        source: 'effect-3',
        timestamp: Date.now(),
      });
      
      expect(keywordHandler.hasRush(card)).toBe(true);
      expect(keywordHandler.hasBlocker(card)).toBe(true);
      
      const allKeywords = keywordHandler.getAllKeywords(card);
      expect(allKeywords).toHaveLength(2);
      expect(allKeywords).toContain('Rush');
      expect(allKeywords).toContain('Blocker');
    });
  });
});
