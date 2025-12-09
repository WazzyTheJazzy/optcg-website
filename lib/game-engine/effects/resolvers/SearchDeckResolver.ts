/**
 * SearchDeckResolver.ts
 * 
 * Resolver for search deck effects. Allows players to look at the top X cards
 * of their deck, filter by criteria, choose card(s) to add to hand, and place
 * remaining cards at the bottom of the deck.
 */

import { GameState, ZoneId, CardCategory, Color, PlayerId } from '../../core/types';
import { EffectInstance, Target, TargetType, SearchCriteria } from '../types';
import { EffectResolver } from '../EffectResolver';
import { GameStateManager } from '../../core/GameState';
import { CardInstance } from '../../core/types';

/**
 * Resolver for SEARCH_DECK effect type
 * 
 * Implements the search deck mechanic:
 * 1. Look at top X cards of deck
 * 2. Filter cards by search criteria
 * 3. Prompt player to choose card(s)
 * 4. Add chosen cards to hand
 * 5. Place remaining cards at bottom of deck
 */
export class SearchDeckResolver implements EffectResolver {
  /**
   * Resolve a search deck effect
   * 
   * @param effect - The effect instance containing search parameters
   * @param state - The current game state
   * @returns Updated game state with cards moved appropriately
   */
  resolve(effect: EffectInstance, state: GameState): GameState {
    const { cardCount, searchCriteria, minTargets, maxTargets } = effect.definition.parameters;

    // Validate parameters
    if (!cardCount || cardCount <= 0) {
      console.warn('Search deck effect missing or invalid cardCount parameter');
      return state;
    }

    // Get the controller's deck
    const stateManager = new GameStateManager(state);
    const controller = effect.controller;
    const player = stateManager.getPlayer(controller);
    
    if (!player) {
      console.warn(`Search deck effect: player ${controller} not found`);
      return state;
    }

    const deck = player.zones.deck;
    
    if (deck.length === 0) {
      console.log('Search deck effect: deck is empty');
      return state;
    }

    // Look at top X cards (or all cards if deck is smaller)
    const cardsToLook = Math.min(cardCount, deck.length);
    const topCards = deck.slice(0, cardsToLook);

    // Filter cards by search criteria
    const matchingCards = searchCriteria 
      ? this.filterCardsByCriteria(topCards, searchCriteria)
      : topCards;

    if (matchingCards.length === 0) {
      console.log('Search deck effect: no matching cards found');
      // Place all looked-at cards at bottom of deck
      return this.placeCardsAtBottom(topCards, controller, state);
    }

    // Determine how many cards the player can choose
    const minChoices = Math.min(minTargets || 0, matchingCards.length);
    const maxChoices = Math.min(maxTargets || 1, matchingCards.length);

    // For now, automatically choose the first matching card(s)
    // In a full implementation, this would prompt the player through the effect system
    // The targets should be chosen before the effect is resolved
    const chosenCards = this.autoSelectCards(matchingCards, minChoices, maxChoices);

    // Move chosen cards to hand
    let updatedStateManager = stateManager;
    for (const card of chosenCards) {
      updatedStateManager = updatedStateManager.moveCard(card.id, ZoneId.HAND);
    }

    // Get remaining cards (cards that were looked at but not chosen)
    const chosenCardIds = new Set(chosenCards.map(c => c.id));
    const remainingCards = topCards.filter(c => !chosenCardIds.has(c.id));

    // Place remaining cards at bottom of deck
    const finalState = this.placeCardsAtBottom(
      remainingCards,
      controller,
      updatedStateManager.getState()
    );

    return finalState;
  }

  /**
   * Validate that a search deck effect can be resolved
   * 
   * @param effect - The effect instance to validate
   * @param state - The current game state
   * @returns True if the effect has valid parameters
   */
  canResolve(effect: EffectInstance, state: GameState): boolean {
    const { cardCount } = effect.definition.parameters;
    
    // Must have a valid cardCount
    if (!cardCount || cardCount <= 0) {
      return false;
    }

    // Effect can resolve even if deck is empty (it just fizzles)
    return true;
  }

  /**
   * Filter cards by search criteria
   * 
   * @param cards - Cards to filter
   * @param criteria - Search criteria to apply
   * @returns Filtered array of cards
   */
  private filterCardsByCriteria(
    cards: CardInstance[],
    criteria: SearchCriteria
  ): CardInstance[] {
    return cards.filter(card => {
      // Category filter
      if (criteria.category) {
        const categories = Array.isArray(criteria.category) 
          ? criteria.category 
          : [criteria.category];
        if (!categories.includes(card.definition.category)) {
          return false;
        }
      }

      // Color filter
      if (criteria.color) {
        const searchColors = Array.isArray(criteria.color) 
          ? criteria.color 
          : [criteria.color];
        const cardColors = card.definition.colors || [];
        // Check if any of the card's colors match any of the search colors
        const hasMatchingColor = searchColors.some(searchColor => 
          cardColors.some(cardColor => cardColor.toLowerCase() === searchColor.toLowerCase())
        );
        if (!hasMatchingColor) {
          return false;
        }
      }

      // Cost filter
      if (criteria.cost) {
        const cardCost = card.definition.baseCost || 0;
        if (criteria.cost.exact !== undefined && cardCost !== criteria.cost.exact) {
          return false;
        }
        if (criteria.cost.min !== undefined && cardCost < criteria.cost.min) {
          return false;
        }
        if (criteria.cost.max !== undefined && cardCost > criteria.cost.max) {
          return false;
        }
      }

      // Power filter
      if (criteria.power) {
        const cardPower = card.definition.basePower || 0;
        if (criteria.power.exact !== undefined && cardPower !== criteria.power.exact) {
          return false;
        }
        if (criteria.power.min !== undefined && cardPower < criteria.power.min) {
          return false;
        }
        if (criteria.power.max !== undefined && cardPower > criteria.power.max) {
          return false;
        }
      }

      // Type tags filter
      if (criteria.typeTags && criteria.typeTags.length > 0) {
        const cardTypeTags = card.definition.typeTags || [];
        const hasAllTags = criteria.typeTags.every(tag => 
          cardTypeTags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Attributes filter
      if (criteria.attributes && criteria.attributes.length > 0) {
        const cardAttributes = card.definition.attributes || [];
        const hasAllAttributes = criteria.attributes.every(attr => 
          cardAttributes.includes(attr)
        );
        if (!hasAllAttributes) {
          return false;
        }
      }

      // Keywords filter
      if (criteria.keywords && criteria.keywords.length > 0) {
        const cardKeywords = card.definition.keywords || [];
        const hasAllKeywords = criteria.keywords.every(keyword => 
          cardKeywords.includes(keyword)
        );
        if (!hasAllKeywords) {
          return false;
        }
      }

      // Name filter
      if (criteria.nameContains) {
        const cardName = card.definition.name.toLowerCase();
        const searchTerm = criteria.nameContains.toLowerCase();
        if (!cardName.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Automatically select cards from matching cards
   * 
   * In a full implementation, the player would choose these cards through
   * the effect targeting system before the effect is resolved. For now,
   * we automatically select the first matching cards.
   * 
   * @param matchingCards - Cards that match the search criteria
   * @param minChoices - Minimum number of cards to choose
   * @param maxChoices - Maximum number of cards to choose
   * @returns Array of chosen cards
   */
  private autoSelectCards(
    matchingCards: CardInstance[],
    minChoices: number,
    maxChoices: number
  ): CardInstance[] {
    // Select up to maxChoices cards, but at least minChoices
    const numToSelect = Math.min(maxChoices, matchingCards.length);
    return matchingCards.slice(0, numToSelect);
  }

  /**
   * Place cards at the bottom of the deck
   * 
   * @param cards - Cards to place at bottom
   * @param playerId - Owner of the deck
   * @param state - Current game state
   * @returns Updated game state
   */
  private placeCardsAtBottom(
    cards: CardInstance[],
    playerId: PlayerId,
    state: GameState
  ): GameState {
    if (cards.length === 0) {
      return state;
    }

    let stateManager = new GameStateManager(state);
    const player = stateManager.getPlayer(playerId);
    
    if (!player) {
      return state;
    }

    // Remove cards from deck (they're currently at the top)
    for (const card of cards) {
      stateManager = stateManager.moveCard(card.id, ZoneId.DECK);
    }

    // Now we need to manually reorder the deck to put these cards at the bottom
    // Get the updated state and manually manipulate the deck
    const finalState = stateManager.getState();
    const updatedPlayer = finalState.players.get(playerId);
    
    if (updatedPlayer) {
      const deck = updatedPlayer.zones.deck;
      const cardIds = new Set(cards.map(c => c.id));
      
      // Separate cards into those being moved and those staying
      const cardsToMove = deck.filter(c => cardIds.has(c.id));
      const otherCards = deck.filter(c => !cardIds.has(c.id));
      
      // Reconstruct deck with moved cards at bottom
      updatedPlayer.zones.deck = [...otherCards, ...cardsToMove];
    }

    return finalState;
  }

}
