/**
 * GameSetup.ts
 * 
 * Handles game initialization for the One Piece TCG Engine.
 * Implements deck loading, validation, first player selection, opening draw,
 * mulligan system, life placement, and start-of-game effects.
 */

import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  CardDefinition,
  CardInstance,
  DonInstance,
  PlayerId,
  ZoneId,
  CardState,
  CardCategory,
  TriggerTiming,
  Player,
} from '../core/types';

/**
 * Error thrown when game setup fails
 */
export class GameSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameSetupError';
  }
}

/**
 * Deck validation result
 */
export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Game setup configuration
 */
export interface GameSetupConfig {
  deck1: CardDefinition[];
  deck2: CardDefinition[];
  player1?: Player; // Optional Player instance for PLAYER_1
  player2?: Player; // Optional Player instance for PLAYER_2
  firstPlayerChoice?: PlayerId; // If not provided, random selection
  player1Mulligan?: boolean;
  player2Mulligan?: boolean;
  randomSeed?: number; // For deterministic randomness in tests
}

/**
 * Game setup result
 */
export interface GameSetupResult {
  stateManager: GameStateManager;
  zoneManager: ZoneManager;
  firstPlayer: PlayerId;
}

/**
 * Setup a new game with the provided decks and configuration (async version)
 * This version queries Player instances for mulligan decisions
 * @param config - Game setup configuration
 * @param rules - Rules context
 * @param eventEmitter - Event emitter for game events
 * @returns Promise resolving to game setup result with initialized state and zone managers
 * @throws GameSetupError if setup fails
 */
export async function setupGameAsync(
  config: GameSetupConfig,
  rules: RulesContext,
  eventEmitter: EventEmitter
): Promise<GameSetupResult> {
  // Validate decks
  const deck1Validation = validateDeck(config.deck1, rules);
  if (!deck1Validation.valid) {
    throw new GameSetupError(
      `Player 1 deck invalid: ${deck1Validation.errors.join(', ')}`
    );
  }

  const deck2Validation = validateDeck(config.deck2, rules);
  if (!deck2Validation.valid) {
    throw new GameSetupError(
      `Player 2 deck invalid: ${deck2Validation.errors.join(', ')}`
    );
  }

  // Create initial game state
  let stateManager = new GameStateManager(createInitialGameState());
  let zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Load decks into game state
  stateManager = loadDeck(PlayerId.PLAYER_1, config.deck1, stateManager);
  stateManager = loadDeck(PlayerId.PLAYER_2, config.deck2, stateManager);
  zoneManager.updateStateManager(stateManager);

  // Determine first player
  const firstPlayer = selectFirstPlayer(config.firstPlayerChoice, config.randomSeed);
  stateManager = stateManager.setActivePlayer(firstPlayer);
  zoneManager.updateStateManager(stateManager);

  // Shuffle decks
  stateManager = shuffleDeck(PlayerId.PLAYER_1, stateManager, config.randomSeed);
  stateManager = shuffleDeck(PlayerId.PLAYER_2, stateManager, config.randomSeed);
  zoneManager.updateStateManager(stateManager);

  // Opening draw (5 cards each)
  const handSize = rules.getStartingHandSize();
  stateManager = drawCards(PlayerId.PLAYER_1, handSize, stateManager, zoneManager);
  stateManager = drawCards(PlayerId.PLAYER_2, handSize, stateManager, zoneManager);
  zoneManager.updateStateManager(stateManager);

  // Handle mulligans using Player interface
  if (config.player1) {
    const player1State = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (player1State) {
      const shouldMulligan = await config.player1.chooseMulligan(
        player1State.zones.hand,
        stateManager.getState()
      );
      if (shouldMulligan) {
        stateManager = performMulligan(PlayerId.PLAYER_1, stateManager, zoneManager, config.randomSeed);
        zoneManager.updateStateManager(stateManager);
      }
    }
  } else if (config.player1Mulligan) {
    stateManager = performMulligan(PlayerId.PLAYER_1, stateManager, zoneManager, config.randomSeed);
    zoneManager.updateStateManager(stateManager);
  }

  if (config.player2) {
    const player2State = stateManager.getPlayer(PlayerId.PLAYER_2);
    if (player2State) {
      const shouldMulligan = await config.player2.chooseMulligan(
        player2State.zones.hand,
        stateManager.getState()
      );
      if (shouldMulligan) {
        stateManager = performMulligan(PlayerId.PLAYER_2, stateManager, zoneManager, config.randomSeed);
        zoneManager.updateStateManager(stateManager);
      }
    }
  } else if (config.player2Mulligan) {
    stateManager = performMulligan(PlayerId.PLAYER_2, stateManager, zoneManager, config.randomSeed);
    zoneManager.updateStateManager(stateManager);
  }

  // Place life cards based on leader's life value
  stateManager = placeLifeCards(PlayerId.PLAYER_1, stateManager, zoneManager);
  stateManager = placeLifeCards(PlayerId.PLAYER_2, stateManager, zoneManager);
  zoneManager.updateStateManager(stateManager);

  // Apply "Start of Game" leader effects
  stateManager = applyStartOfGameEffects(stateManager);
  zoneManager.updateStateManager(stateManager);

  return {
    stateManager,
    zoneManager,
    firstPlayer,
  };
}

/**
 * Setup a new game with the provided decks and configuration
 * @param config - Game setup configuration
 * @param rules - Rules context
 * @param eventEmitter - Event emitter for game events
 * @returns Game setup result with initialized state and zone managers
 * @throws GameSetupError if setup fails
 */
export function setupGame(
  config: GameSetupConfig,
  rules: RulesContext,
  eventEmitter: EventEmitter
): GameSetupResult {
  // Validate decks
  const deck1Validation = validateDeck(config.deck1, rules);
  if (!deck1Validation.valid) {
    throw new GameSetupError(
      `Player 1 deck invalid: ${deck1Validation.errors.join(', ')}`
    );
  }

  const deck2Validation = validateDeck(config.deck2, rules);
  if (!deck2Validation.valid) {
    throw new GameSetupError(
      `Player 2 deck invalid: ${deck2Validation.errors.join(', ')}`
    );
  }

  // Create initial game state
  let stateManager = new GameStateManager(createInitialGameState());
  let zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Load decks into game state
  stateManager = loadDeck(PlayerId.PLAYER_1, config.deck1, stateManager);
  stateManager = loadDeck(PlayerId.PLAYER_2, config.deck2, stateManager);
  zoneManager.updateStateManager(stateManager);

  // Determine first player
  const firstPlayer = selectFirstPlayer(config.firstPlayerChoice, config.randomSeed);
  stateManager = stateManager.setActivePlayer(firstPlayer);
  zoneManager.updateStateManager(stateManager);

  // Shuffle decks
  stateManager = shuffleDeck(PlayerId.PLAYER_1, stateManager, config.randomSeed);
  stateManager = shuffleDeck(PlayerId.PLAYER_2, stateManager, config.randomSeed);
  zoneManager.updateStateManager(stateManager);

  // Opening draw (5 cards each)
  const handSize = rules.getStartingHandSize();
  stateManager = drawCards(PlayerId.PLAYER_1, handSize, stateManager, zoneManager);
  stateManager = drawCards(PlayerId.PLAYER_2, handSize, stateManager, zoneManager);
  zoneManager.updateStateManager(stateManager);

  // Handle mulligans
  // If Player instances are provided, query them for mulligan decision
  // Otherwise, use the explicit mulligan flags from config
  if (config.player1) {
    const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
    if (player1) {
      // Query player for mulligan decision (async, but we need to handle it synchronously here)
      // For now, we'll use the config flag if provided, otherwise default to false
      const shouldMulligan = config.player1Mulligan ?? false;
      if (shouldMulligan) {
        stateManager = performMulligan(PlayerId.PLAYER_1, stateManager, zoneManager, config.randomSeed);
        zoneManager.updateStateManager(stateManager);
      }
    }
  } else if (config.player1Mulligan) {
    stateManager = performMulligan(PlayerId.PLAYER_1, stateManager, zoneManager, config.randomSeed);
    zoneManager.updateStateManager(stateManager);
  }

  if (config.player2) {
    const player2State = stateManager.getPlayer(PlayerId.PLAYER_2);
    if (player2State) {
      const shouldMulligan = config.player2Mulligan ?? false;
      if (shouldMulligan) {
        stateManager = performMulligan(PlayerId.PLAYER_2, stateManager, zoneManager, config.randomSeed);
        zoneManager.updateStateManager(stateManager);
      }
    }
  } else if (config.player2Mulligan) {
    stateManager = performMulligan(PlayerId.PLAYER_2, stateManager, zoneManager, config.randomSeed);
    zoneManager.updateStateManager(stateManager);
  }

  // Place life cards based on leader's life value
  stateManager = placeLifeCards(PlayerId.PLAYER_1, stateManager, zoneManager);
  stateManager = placeLifeCards(PlayerId.PLAYER_2, stateManager, zoneManager);
  zoneManager.updateStateManager(stateManager);

  // Apply "Start of Game" leader effects
  stateManager = applyStartOfGameEffects(stateManager);
  zoneManager.updateStateManager(stateManager);

  return {
    stateManager,
    zoneManager,
    firstPlayer,
  };
}

/**
 * Validate a deck according to One Piece TCG rules
 * @param deck - Array of card definitions
 * @param rules - Rules context
 * @returns Validation result
 */
export function validateDeck(deck: CardDefinition[], rules: RulesContext): DeckValidationResult {
  const errors: string[] = [];

  // Check deck size (should be 50 cards + 1 leader + 10 DON = 61 total)
  const requiredDeckSize = rules.getDeckSize();
  const requiredDonSize = rules.getDonDeckSize();
  
  const leaders = deck.filter(c => c.category === CardCategory.LEADER);
  const donCards = deck.filter(c => c.category === CardCategory.DON);
  const mainDeck = deck.filter(
    c => c.category !== CardCategory.LEADER && c.category !== CardCategory.DON
  );

  // Validate leader count
  if (leaders.length !== 1) {
    errors.push(`Deck must have exactly 1 leader (found ${leaders.length})`);
  }

  // Validate DON count
  if (donCards.length !== requiredDonSize) {
    errors.push(`Deck must have exactly ${requiredDonSize} DON cards (found ${donCards.length})`);
  }

  // Validate main deck size
  if (mainDeck.length !== requiredDeckSize) {
    errors.push(
      `Main deck must have exactly ${requiredDeckSize} cards (found ${mainDeck.length})`
    );
  }

  // Validate leader has life value
  if (leaders.length === 1 && leaders[0].lifeValue === null) {
    errors.push('Leader card must have a life value');
  }

  // Validate card limits (max 4 copies of any card except DON)
  const cardCounts = new Map<string, number>();
  for (const card of mainDeck) {
    const count = cardCounts.get(card.id) || 0;
    cardCounts.set(card.id, count + 1);
  }

  for (const [cardId, count] of cardCounts.entries()) {
    if (count > 4) {
      const card = mainDeck.find(c => c.id === cardId);
      const cardName = card ? card.name : cardId;
      errors.push(`Card "${cardName}" appears ${count} times (max 4 copies allowed)`);
    }
  }

  // Validate color restrictions based on leader
  if (leaders.length === 1) {
    const leader = leaders[0];
    const leaderColors = leader.colors;

    // Check each card in main deck
    for (const card of mainDeck) {
      // Skip cards with no color (if any exist)
      if (!card.colors || card.colors.length === 0) {
        continue;
      }

      // Check if card has at least one color matching the leader
      const hasMatchingColor = card.colors.some(cardColor => 
        leaderColors.includes(cardColor)
      );

      if (!hasMatchingColor) {
        errors.push(
          `Card "${card.name}" has colors [${card.colors.join(', ')}] which don't match leader colors [${leaderColors.join(', ')}]`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Load a deck into a player's zones
 * @param playerId - The player ID
 * @param deck - Array of card definitions
 * @param stateManager - Current state manager
 * @returns Updated state manager
 */
function loadDeck(
  playerId: PlayerId,
  deck: CardDefinition[],
  stateManager: GameStateManager
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(playerId);
  if (!player) {
    throw new GameSetupError(`Player ${playerId} not found`);
  }

  // Separate cards by category
  const leader = deck.find(c => c.category === CardCategory.LEADER);
  const donCards = deck.filter(c => c.category === CardCategory.DON);
  const mainDeck = deck.filter(
    c => c.category !== CardCategory.LEADER && c.category !== CardCategory.DON
  );

  // Create card instances for main deck
  const deckInstances: CardInstance[] = mainDeck.map((def, index) =>
    createCardInstance(def, playerId, ZoneId.DECK, `${playerId}-deck-${index}`)
  );

  // Create leader instance
  const leaderInstance = leader
    ? createCardInstance(leader, playerId, ZoneId.LEADER_AREA, `${playerId}-leader`)
    : null;

  // Create DON instances
  const donInstances: DonInstance[] = donCards.map((def, index) =>
    createDonInstance(playerId, ZoneId.DON_DECK, `${playerId}-don-${index}`)
  );

  // Update player zones
  const newZones = {
    ...player.zones,
    deck: deckInstances,
    leaderArea: leaderInstance,
    donDeck: donInstances,
  };

  return currentState.updatePlayer(playerId, { zones: newZones });
}

/**
 * Create a card instance from a definition
 * @param definition - Card definition
 * @param owner - Owner player ID
 * @param zone - Initial zone
 * @param id - Unique instance ID
 * @returns Card instance
 */
function createCardInstance(
  definition: CardDefinition,
  owner: PlayerId,
  zone: ZoneId,
  id: string
): CardInstance {
  return {
    id,
    definition,
    owner,
    controller: owner,
    zone,
    state: zone === ZoneId.LEADER_AREA ? CardState.ACTIVE : CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

/**
 * Create a DON instance
 * @param owner - Owner player ID
 * @param zone - Initial zone
 * @param id - Unique instance ID
 * @returns DON instance
 */
function createDonInstance(owner: PlayerId, zone: ZoneId, id: string): DonInstance {
  return {
    id,
    owner,
    zone,
    state: CardState.NONE,
  };
}

/**
 * Select the first player
 * @param choice - Optional explicit choice
 * @param seed - Optional random seed
 * @returns The first player ID
 */
function selectFirstPlayer(choice?: PlayerId, seed?: number): PlayerId {
  if (choice) {
    return choice;
  }

  // Random selection
  const random = seed !== undefined ? seededRandom(seed) : Math.random();
  return random < 0.5 ? PlayerId.PLAYER_1 : PlayerId.PLAYER_2;
}

/**
 * Seeded random number generator for deterministic tests
 * @param seed - Random seed
 * @returns Random number between 0 and 1
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Shuffle a player's deck
 * @param playerId - The player ID
 * @param stateManager - Current state manager
 * @param seed - Optional random seed
 * @returns Updated state manager
 */
function shuffleDeck(
  playerId: PlayerId,
  stateManager: GameStateManager,
  seed?: number
): GameStateManager {
  const player = stateManager.getPlayer(playerId);
  if (!player) {
    throw new GameSetupError(`Player ${playerId} not found`);
  }

  const deck = [...player.zones.deck];
  
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const random = seed !== undefined ? seededRandom(seed + i) : Math.random();
    const j = Math.floor(random * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const newZones = {
    ...player.zones,
    deck,
  };

  return stateManager.updatePlayer(playerId, { zones: newZones });
}

/**
 * Draw cards from deck to hand
 * @param playerId - The player ID
 * @param count - Number of cards to draw
 * @param stateManager - Current state manager
 * @param zoneManager - Zone manager
 * @returns Updated state manager
 */
function drawCards(
  playerId: PlayerId,
  count: number,
  stateManager: GameStateManager,
  zoneManager: ZoneManager
): GameStateManager {
  let currentState = stateManager;

  for (let i = 0; i < count; i++) {
    const player = currentState.getPlayer(playerId);
    if (!player) {
      throw new GameSetupError(`Player ${playerId} not found`);
    }

    if (player.zones.deck.length === 0) {
      throw new GameSetupError(`Player ${playerId} has no cards left to draw`);
    }

    const topCard = player.zones.deck[0];
    currentState = zoneManager.moveCard(topCard.id, ZoneId.HAND);
    zoneManager.updateStateManager(currentState);
  }

  return currentState;
}

/**
 * Perform mulligan for a player
 * @param playerId - The player ID
 * @param stateManager - Current state manager
 * @param zoneManager - Zone manager
 * @param seed - Optional random seed
 * @returns Updated state manager
 */
function performMulligan(
  playerId: PlayerId,
  stateManager: GameStateManager,
  zoneManager: ZoneManager,
  seed?: number
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(playerId);
  if (!player) {
    throw new GameSetupError(`Player ${playerId} not found`);
  }

  // Return all cards from hand to deck
  const handCards = [...player.zones.hand];
  for (const card of handCards) {
    currentState = zoneManager.moveCard(card.id, ZoneId.DECK, 0); // Add to top of deck
    zoneManager.updateStateManager(currentState);
  }

  // Shuffle deck
  currentState = shuffleDeck(playerId, currentState, seed);
  zoneManager.updateStateManager(currentState);

  // Draw 5 new cards
  const handSize = 5;
  currentState = drawCards(playerId, handSize, currentState, zoneManager);

  return currentState;
}

/**
 * Place life cards based on leader's life value
 * @param playerId - The player ID
 * @param stateManager - Current state manager
 * @param zoneManager - Zone manager
 * @returns Updated state manager
 */
function placeLifeCards(
  playerId: PlayerId,
  stateManager: GameStateManager,
  zoneManager: ZoneManager
): GameStateManager {
  let currentState = stateManager;
  const player = currentState.getPlayer(playerId);
  if (!player) {
    throw new GameSetupError(`Player ${playerId} not found`);
  }

  const leader = player.zones.leaderArea;
  if (!leader) {
    throw new GameSetupError(`Player ${playerId} has no leader`);
  }

  const lifeValue = leader.definition.lifeValue;
  if (lifeValue === null) {
    throw new GameSetupError(`Player ${playerId} leader has no life value`);
  }

  // Move cards from top of deck to life area
  for (let i = 0; i < lifeValue; i++) {
    const updatedPlayer = currentState.getPlayer(playerId);
    if (!updatedPlayer) {
      throw new GameSetupError(`Player ${playerId} not found`);
    }

    if (updatedPlayer.zones.deck.length === 0) {
      throw new GameSetupError(
        `Player ${playerId} has insufficient cards in deck for life placement`
      );
    }

    const topCard = updatedPlayer.zones.deck[0];
    currentState = zoneManager.moveCard(topCard.id, ZoneId.LIFE);
    zoneManager.updateStateManager(currentState);
  }

  return currentState;
}

/**
 * Apply "Start of Game" leader effects
 * @param stateManager - Current state manager
 * @returns Updated state manager
 */
function applyStartOfGameEffects(stateManager: GameStateManager): GameStateManager {
  // Get both leaders
  const player1 = stateManager.getPlayer(PlayerId.PLAYER_1);
  const player2 = stateManager.getPlayer(PlayerId.PLAYER_2);

  if (!player1 || !player2) {
    throw new GameSetupError('Players not found');
  }

  const leaders = [player1.zones.leaderArea, player2.zones.leaderArea].filter(
    Boolean
  ) as CardInstance[];

  // Check for START_OF_GAME effects
  for (const leader of leaders) {
    const startOfGameEffects = leader.definition.effects.filter(
      effect => effect.triggerTiming === TriggerTiming.START_OF_GAME
    );

    // Note: Actual effect resolution would be handled by the EffectSystem
    // For now, we just mark that these effects exist and should be triggered
    // The game engine will need to resolve these after setup is complete
    if (startOfGameEffects.length > 0) {
      // Add a flag to indicate START_OF_GAME effects need resolution
      const updatedLeader = {
        ...leader,
        flags: new Map(leader.flags),
      };
      updatedLeader.flags.set('hasStartOfGameEffects', true);
      
      // Update the leader in state
      stateManager = stateManager.updateCard(leader.id, updatedLeader);
    }
  }

  return stateManager;
}
