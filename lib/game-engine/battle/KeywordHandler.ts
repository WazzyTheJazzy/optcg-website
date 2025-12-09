/**
 * KeywordHandler.ts
 * 
 * Handles keyword checking and enforcement for the One Piece TCG Engine.
 * Keywords are special abilities that modify how cards behave in the game.
 * 
 * Supported keywords:
 * - Rush: Allows characters to attack on the turn they are played
 * - Blocker: Allows characters to block attacks
 * - Trigger: Allows cards to activate when taken as life damage
 * - Double Attack: Deals 2 damage to leaders instead of 1
 * - Counter: Can be played from hand during the Counter Step
 */

import { CardInstance, ModifierType } from '../core/types';
import { RulesContext, KeywordDef } from '../rules/RulesContext';

/**
 * KeywordHandler provides methods to check and enforce keywords on cards
 */
export class KeywordHandler {
  private rules: RulesContext;

  constructor(rules: RulesContext) {
    this.rules = rules;
  }

  /**
   * Check if a card has a specific keyword
   * 
   * This checks both:
   * 1. The card's definition keywords (static keywords)
   * 2. Keywords added by modifiers (dynamic keywords)
   * 
   * @param card - The card to check
   * @param keyword - The keyword to look for (case-sensitive)
   * @returns True if the card has the keyword
   */
  hasKeyword(card: CardInstance, keyword: string): boolean {
    // Check card definition keywords
    if (card.definition.keywords.includes(keyword)) {
      return true;
    }

    // Check modifiers for added keywords
    const hasKeywordModifier = card.modifiers.some(
      modifier => 
        modifier.type === ModifierType.KEYWORD && 
        modifier.value === keyword
    );

    return hasKeywordModifier;
  }

  /**
   * Check if a card has the Rush keyword
   * 
   * Rush allows a character to attack on the turn it is played,
   * bypassing the normal restriction that characters must wait
   * until they are active (not rested) to attack.
   * 
   * @param card - The card to check
   * @returns True if the card has Rush
   */
  hasRush(card: CardInstance): boolean {
    return this.hasKeyword(card, 'Rush');
  }

  /**
   * Check if a card has the Blocker keyword
   * 
   * Blocker allows a character to block attacks directed at other
   * characters or the leader. When an opponent's character attacks,
   * a character with Blocker can be rested to redirect the attack
   * to itself.
   * 
   * @param card - The card to check
   * @returns True if the card has Blocker
   */
  hasBlocker(card: CardInstance): boolean {
    return this.hasKeyword(card, 'Blocker');
  }

  /**
   * Check if a card has the Trigger keyword
   * 
   * Trigger allows a card to activate its effect when it is revealed
   * as a life card during damage. The player can choose to activate
   * the trigger effect or add the card to their hand.
   * 
   * @param card - The card to check
   * @returns True if the card has Trigger
   */
  hasTrigger(card: CardInstance): boolean {
    return this.hasKeyword(card, 'Trigger');
  }

  /**
   * Check if a card has the Double Attack keyword
   * 
   * Double Attack causes a character to deal 2 damage instead of 1
   * when attacking a leader. This means the defending player must
   * take 2 life cards instead of 1.
   * 
   * @param card - The card to check
   * @returns True if the card has Double Attack
   */
  hasDoubleAttack(card: CardInstance): boolean {
    return this.hasKeyword(card, 'Double Attack');
  }

  /**
   * Check if a card has the Counter keyword
   * 
   * Counter allows a card to be played from hand during the Counter Step
   * of a battle. Counter cards can boost the power of the defending card
   * or provide other effects.
   * 
   * Note: This checks for the Counter keyword. The actual counter value
   * is stored in card.definition.counterValue.
   * 
   * @param card - The card to check
   * @returns True if the card has Counter
   */
  hasCounter(card: CardInstance): boolean {
    return this.hasKeyword(card, 'Counter');
  }

  /**
   * Check if a card has the Banish keyword
   * 
   * Banish removes cards from the game permanently when they would
   * normally go to trash. Banished cards are placed in the banished
   * zone and cannot be retrieved or interacted with for the rest
   * of the game.
   * 
   * @param card - The card to check
   * @returns True if the card has Banish
   */
  hasBanish(card: CardInstance): boolean {
    return this.hasKeyword(card, 'Banish');
  }

  /**
   * Get the definition of a keyword from the rules context
   * 
   * This retrieves the official keyword definition including:
   * - Name
   * - Description
   * - Type (static, activated, triggered)
   * - What card types it applies to
   * 
   * @param keyword - The keyword name to look up
   * @returns Keyword definition or null if not found
   */
  getKeywordDefinition(keyword: string): KeywordDef | null {
    return this.rules.getKeywordDefinition(keyword);
  }

  /**
   * Get all keywords on a card
   * 
   * This returns both static keywords from the card definition
   * and dynamic keywords added by modifiers.
   * 
   * @param card - The card to check
   * @returns Array of keyword names
   */
  getAllKeywords(card: CardInstance): string[] {
    const keywords = new Set<string>();

    // Add keywords from card definition
    card.definition.keywords.forEach(keyword => keywords.add(keyword));

    // Add keywords from modifiers
    card.modifiers
      .filter(modifier => modifier.type === ModifierType.KEYWORD)
      .forEach(modifier => keywords.add(modifier.value as string));

    return Array.from(keywords);
  }

  /**
   * Validate that a keyword exists in the rules
   * 
   * This checks if a keyword is defined in the rules.json file.
   * Useful for validating card data or modifier applications.
   * 
   * @param keyword - The keyword to validate
   * @returns True if the keyword is defined in the rules
   */
  isValidKeyword(keyword: string): boolean {
    return this.rules.getKeywordDefinition(keyword) !== null;
  }

  /**
   * Check if a keyword can be applied to a specific card category
   * 
   * Some keywords only apply to certain card types. For example,
   * Rush and Blocker only apply to characters, not events or stages.
   * 
   * @param keyword - The keyword to check
   * @param cardCategory - The card category to check against
   * @returns True if the keyword can apply to this card category
   */
  canApplyToCategory(keyword: string, cardCategory: string): boolean {
    const keywordDef = this.rules.getKeywordDefinition(keyword);
    if (!keywordDef) {
      return false;
    }

    return keywordDef.appliesTo.includes(cardCategory);
  }
}
