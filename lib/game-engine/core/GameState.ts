/**
 * GameState.ts
 * 
 * Immutable state container for the One Piece TCG Engine.
 * All state updates return new state objects to maintain immutability.
 * Supports game history tracking for replay/undo functionality.
 */

import {
  GameState,
  PlayerState,
  CardInstance,
  DonInstance,
  PlayerId,
  ZoneId,
  Phase,
  CardState,
  TriggerInstance,
  GameAction,
  LoopGuardState,
  Modifier,
} from './types';

/**
 * Immutable GameState container with query and update methods
 */
export class GameStateManager {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = this.deepClone(initialState);
  }

  // ============================================================================
  // State Query Methods
  // ============================================================================

  /**
   * Get the current game state (readonly)
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Get a card instance by ID
   * @param cardId - The unique card instance ID
   * @returns The card instance or null if not found
   */
  getCard(cardId: string): CardInstance | null {
    for (const player of this.state.players.values()) {
      // Check all zones for the card
      const zones = [
        player.zones.deck,
        player.zones.hand,
        player.zones.trash,
        player.zones.life,
        player.zones.characterArea,
        player.zones.banished,
      ];

      for (const zone of zones) {
        const card = zone.find(c => c.id === cardId);
        if (card) return card;
      }

      // Check leader area
      if (player.zones.leaderArea?.id === cardId) {
        return player.zones.leaderArea;
      }

      // Check stage area
      if (player.zones.stageArea?.id === cardId) {
        return player.zones.stageArea;
      }
    }

    return null;
  }

  /**
   * Get a DON instance by ID
   * @param donId - The unique DON instance ID
   * @returns The DON instance or null if not found
   */
  getDon(donId: string): DonInstance | null {
    for (const player of this.state.players.values()) {
      const donZones = [player.zones.donDeck, player.zones.costArea];

      for (const zone of donZones) {
        const don = zone.find(d => d.id === donId);
        if (don) return don;
      }

      // Check given DON on cards
      const allCards = [
        ...player.zones.deck,
        ...player.zones.hand,
        ...player.zones.trash,
        ...player.zones.life,
        ...player.zones.characterArea,
        player.zones.leaderArea,
        player.zones.stageArea,
      ].filter(Boolean) as CardInstance[];

      for (const card of allCards) {
        const don = card.givenDon.find(d => d.id === donId);
        if (don) return don;
      }
    }

    return null;
  }

  /**
   * Get a player's state
   * @param playerId - The player ID
   * @returns The player state or null if not found
   */
  getPlayer(playerId: PlayerId): PlayerState | null {
    return this.state.players.get(playerId) || null;
  }

  /**
   * Get the contents of a specific zone for a player
   * @param playerId - The player ID
   * @param zoneId - The zone ID
   * @returns Array of cards/DON in the zone
   */
  getZone(playerId: PlayerId, zoneId: ZoneId): (CardInstance | DonInstance)[] {
    const player = this.getPlayer(playerId);
    if (!player) return [];

    switch (zoneId) {
      case ZoneId.DECK:
        return player.zones.deck;
      case ZoneId.HAND:
        return player.zones.hand;
      case ZoneId.TRASH:
        return player.zones.trash;
      case ZoneId.LIFE:
        return player.zones.life;
      case ZoneId.DON_DECK:
        return player.zones.donDeck;
      case ZoneId.COST_AREA:
        return player.zones.costArea;
      case ZoneId.LEADER_AREA:
        return player.zones.leaderArea ? [player.zones.leaderArea] : [];
      case ZoneId.CHARACTER_AREA:
        return player.zones.characterArea;
      case ZoneId.STAGE_AREA:
        return player.zones.stageArea ? [player.zones.stageArea] : [];
      default:
        return [];
    }
  }

  /**
   * Get the active player ID
   * @returns The active player ID
   */
  getActivePlayer(): PlayerId {
    return this.state.activePlayer;
  }

  /**
   * Get the current phase
   * @returns The current phase
   */
  getCurrentPhase(): Phase {
    return this.state.phase;
  }

  /**
   * Get the current turn number
   * @returns The turn number
   */
  getTurnNumber(): number {
    return this.state.turnNumber;
  }

  /**
   * Check if the game is over
   * @returns True if game is over
   */
  isGameOver(): boolean {
    return this.state.gameOver;
  }

  /**
   * Get the winner (if game is over)
   * @returns The winner's player ID or null
   */
  getWinner(): PlayerId | null {
    return this.state.winner;
  }

  // ============================================================================
  // State Update Methods (return new state)
  // ============================================================================

  /**
   * Update a card instance
   * @param cardId - The card ID to update
   * @param updates - Partial card updates
   * @returns New GameStateManager with updated state
   */
  updateCard(cardId: string, updates: Partial<CardInstance>): GameStateManager {
    const newState = this.deepClone(this.state);
    
    for (const [playerId, player] of newState.players.entries()) {
      // Update in array zones
      const arrayZones = [
        player.zones.deck,
        player.zones.hand,
        player.zones.trash,
        player.zones.life,
        player.zones.characterArea,
        player.zones.banished,
      ];

      for (const zone of arrayZones) {
        const index = zone.findIndex(c => c.id === cardId);
        if (index !== -1) {
          zone[index] = { ...zone[index], ...updates };
          return new GameStateManager(newState);
        }
      }

      // Update leader area
      if (player.zones.leaderArea?.id === cardId) {
        player.zones.leaderArea = { ...player.zones.leaderArea, ...updates };
        return new GameStateManager(newState);
      }

      // Update stage area
      if (player.zones.stageArea?.id === cardId) {
        player.zones.stageArea = { ...player.zones.stageArea, ...updates };
        return new GameStateManager(newState);
      }
    }

    // Card not found, return unchanged
    return this;
  }

  /**
   * Move a card from one zone to another
   * @param cardId - The card ID to move
   * @param toZone - The destination zone
   * @param toIndex - Optional index in destination zone (defaults to end)
   * @returns New GameStateManager with updated state
   */
  moveCard(cardId: string, toZone: ZoneId, toIndex?: number): GameStateManager {
    const card = this.getCard(cardId);
    if (!card) return this;

    const newState = this.deepClone(this.state);
    const owner = card.owner;
    const player = newState.players.get(owner);
    if (!player) return this;

    // Remove from current zone
    this.removeCardFromZone(player, card.id, card.zone);

    // Update card's zone
    const updatedCard = { ...card, zone: toZone };

    // Add to new zone
    this.addCardToZone(player, updatedCard, toZone, toIndex);

    return new GameStateManager(newState);
  }

  /**
   * Update a DON instance
   * @param donId - The DON ID to update
   * @param updates - Partial DON updates
   * @returns New GameStateManager with updated state
   */
  updateDon(donId: string, updates: Partial<DonInstance>): GameStateManager {
    const newState = this.deepClone(this.state);
    
    for (const player of newState.players.values()) {
      // Update in DON zones
      const donZones = [player.zones.donDeck, player.zones.costArea];

      for (const zone of donZones) {
        const index = zone.findIndex(d => d.id === donId);
        if (index !== -1) {
          zone[index] = { ...zone[index], ...updates };
          return new GameStateManager(newState);
        }
      }

      // Update in given DON on cards
      const allCards = [
        ...player.zones.deck,
        ...player.zones.hand,
        ...player.zones.trash,
        ...player.zones.life,
        ...player.zones.characterArea,
        player.zones.leaderArea,
        player.zones.stageArea,
      ].filter(Boolean) as CardInstance[];

      for (const card of allCards) {
        const index = card.givenDon.findIndex(d => d.id === donId);
        if (index !== -1) {
          card.givenDon[index] = { ...card.givenDon[index], ...updates };
          return new GameStateManager(newState);
        }
      }
    }

    // DON not found, return unchanged
    return this;
  }

  /**
   * Move a DON card from one zone to another
   * @param donId - The DON ID to move
   * @param toZone - The destination zone
   * @param targetCardId - Optional card ID if giving DON to a card
   * @returns New GameStateManager with updated state
   */
  moveDon(donId: string, toZone: ZoneId, targetCardId?: string): GameStateManager {
    const don = this.getDon(donId);
    if (!don) return this;

    const newState = this.deepClone(this.state);
    const owner = don.owner;
    const player = newState.players.get(owner);
    if (!player) return this;

    // Remove from current zone
    this.removeDonFromZone(player, don.id, don.zone);

    // Update DON's zone
    const updatedDon = { ...don, zone: toZone };

    // Add to new zone or to card
    if (targetCardId) {
      // Add to card's givenDon array
      const targetCard = this.findCardInPlayer(player, targetCardId);
      if (targetCard) {
        targetCard.givenDon.push(updatedDon);
      }
    } else {
      this.addDonToZone(player, updatedDon, toZone);
    }

    return new GameStateManager(newState);
  }

  /**
   * Update a player's state
   * @param playerId - The player ID
   * @param updates - Partial player state updates
   * @returns New GameStateManager with updated state
   */
  updatePlayer(playerId: PlayerId, updates: Partial<PlayerState>): GameStateManager {
    const newState = this.deepClone(this.state);
    const player = newState.players.get(playerId);
    
    if (!player) return this;

    // Merge updates
    const updatedPlayer = { ...player, ...updates };
    newState.players.set(playerId, updatedPlayer);

    return new GameStateManager(newState);
  }

  /**
   * Set the active player
   * @param playerId - The player ID to set as active
   * @returns New GameStateManager with updated state
   */
  setActivePlayer(playerId: PlayerId): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.activePlayer = playerId;
    return new GameStateManager(newState);
  }

  /**
   * Set the current phase
   * @param phase - The phase to set
   * @returns New GameStateManager with updated state
   */
  setPhase(phase: Phase): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.phase = phase;
    return new GameStateManager(newState);
  }

  /**
   * Increment the turn number
   * @returns New GameStateManager with updated state
   */
  incrementTurn(): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.turnNumber += 1;
    return new GameStateManager(newState);
  }

  /**
   * Add a trigger to the pending triggers queue
   * @param trigger - The trigger instance to add
   * @returns New GameStateManager with updated state
   */
  addPendingTrigger(trigger: TriggerInstance): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.pendingTriggers.push(trigger);
    return new GameStateManager(newState);
  }

  /**
   * Clear all pending triggers
   * @returns New GameStateManager with updated state
   */
  clearPendingTriggers(): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.pendingTriggers = [];
    return new GameStateManager(newState);
  }

  /**
   * Set game over state
   * @param winner - The winning player ID or null for draw
   * @returns New GameStateManager with updated state
   */
  setGameOver(winner: PlayerId | null): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.gameOver = true;
    newState.winner = winner;
    return new GameStateManager(newState);
  }

  /**
   * Add a game action to history
   * @param action - The game action to record
   * @returns New GameStateManager with updated state
   */
  addToHistory(action: GameAction): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.history.push(action);
    return new GameStateManager(newState);
  }

  /**
   * Get the game history
   * @returns Array of game actions
   */
  getHistory(): readonly GameAction[] {
    return this.state.history;
  }

  /**
   * Update loop guard state
   * @param stateHash - The state hash to track
   * @returns New GameStateManager with updated state
   */
  updateLoopGuard(stateHash: string): GameStateManager {
    const newState = this.deepClone(this.state);
    const currentCount = newState.loopGuardState.stateHashes.get(stateHash) || 0;
    newState.loopGuardState.stateHashes.set(stateHash, currentCount + 1);
    return new GameStateManager(newState);
  }

  /**
   * Get loop guard repeat count for a state hash
   * @param stateHash - The state hash to check
   * @returns Number of times this state has been seen
   */
  getLoopGuardCount(stateHash: string): number {
    return this.state.loopGuardState.stateHashes.get(stateHash) || 0;
  }

  /**
   * Mark a card as having attacked this turn
   * @param cardId - The card instance ID that attacked
   * @returns New GameStateManager with updated state
   */
  markCardAttacked(cardId: string): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.attackedThisTurn.add(cardId);
    return new GameStateManager(newState);
  }

  /**
   * Check if a card has attacked this turn
   * @param cardId - The card instance ID to check
   * @returns True if the card has attacked this turn
   */
  hasCardAttackedThisTurn(cardId: string): boolean {
    return this.state.attackedThisTurn.has(cardId);
  }

  /**
   * Clear the attacked this turn tracking (called at end of turn)
   * @returns New GameStateManager with updated state
   */
  clearAttackedThisTurn(): GameStateManager {
    const newState = this.deepClone(this.state);
    newState.attackedThisTurn.clear();
    return new GameStateManager(newState);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Deep clone the game state
   */
  private deepClone(state: GameState): GameState {
    return {
      players: new Map(
        Array.from(state.players.entries()).map(([id, player]) => [
          id,
          this.clonePlayerState(player),
        ])
      ),
      activePlayer: state.activePlayer,
      phase: state.phase,
      turnNumber: state.turnNumber,
      pendingTriggers: state.pendingTriggers.map(t => ({ ...t })),
      gameOver: state.gameOver,
      winner: state.winner,
      history: [...state.history],
      loopGuardState: {
        stateHashes: new Map(state.loopGuardState.stateHashes),
        maxRepeats: state.loopGuardState.maxRepeats,
      },
      attackedThisTurn: new Set(state.attackedThisTurn),
    };
  }

  /**
   * Clone a player state
   */
  private clonePlayerState(player: PlayerState): PlayerState {
    return {
      id: player.id,
      zones: {
        deck: player.zones.deck.map(c => this.cloneCard(c)),
        hand: player.zones.hand.map(c => this.cloneCard(c)),
        trash: player.zones.trash.map(c => this.cloneCard(c)),
        life: player.zones.life.map(c => this.cloneCard(c)),
        donDeck: player.zones.donDeck.map(d => ({ ...d })),
        costArea: player.zones.costArea.map(d => ({ ...d })),
        leaderArea: player.zones.leaderArea ? this.cloneCard(player.zones.leaderArea) : null,
        characterArea: player.zones.characterArea.map(c => this.cloneCard(c)),
        stageArea: player.zones.stageArea ? this.cloneCard(player.zones.stageArea) : null,
        banished: (player.zones.banished || []).map(c => this.cloneCard(c)),
      },
      flags: new Map(player.flags),
    };
  }

  /**
   * Clone a card instance
   */
  private cloneCard(card: CardInstance): CardInstance {
    return {
      ...card,
      givenDon: card.givenDon.map(d => ({ ...d })),
      modifiers: card.modifiers.map(m => ({ ...m })),
      flags: new Map(card.flags),
    };
  }

  /**
   * Remove a card from a zone
   */
  private removeCardFromZone(player: PlayerState, cardId: string, zone: ZoneId): void {
    switch (zone) {
      case ZoneId.DECK:
        player.zones.deck = player.zones.deck.filter(c => c.id !== cardId);
        break;
      case ZoneId.HAND:
        player.zones.hand = player.zones.hand.filter(c => c.id !== cardId);
        break;
      case ZoneId.TRASH:
        player.zones.trash = player.zones.trash.filter(c => c.id !== cardId);
        break;
      case ZoneId.LIFE:
        player.zones.life = player.zones.life.filter(c => c.id !== cardId);
        break;
      case ZoneId.CHARACTER_AREA:
        player.zones.characterArea = player.zones.characterArea.filter(c => c.id !== cardId);
        break;
      case ZoneId.LEADER_AREA:
        if (player.zones.leaderArea?.id === cardId) {
          player.zones.leaderArea = null;
        }
        break;
      case ZoneId.STAGE_AREA:
        if (player.zones.stageArea?.id === cardId) {
          player.zones.stageArea = null;
        }
        break;
      case ZoneId.BANISHED:
        player.zones.banished = player.zones.banished.filter(c => c.id !== cardId);
        break;
      case ZoneId.LIMBO:
        // LIMBO is a temporary zone, cards are not stored in player zones
        break;
    }
  }

  /**
   * Add a card to a zone
   */
  private addCardToZone(player: PlayerState, card: CardInstance, zone: ZoneId, index?: number): void {
    switch (zone) {
      case ZoneId.DECK:
        if (index !== undefined) {
          player.zones.deck.splice(index, 0, card);
        } else {
          player.zones.deck.push(card);
        }
        break;
      case ZoneId.HAND:
        if (index !== undefined) {
          player.zones.hand.splice(index, 0, card);
        } else {
          player.zones.hand.push(card);
        }
        break;
      case ZoneId.TRASH:
        if (index !== undefined) {
          player.zones.trash.splice(index, 0, card);
        } else {
          player.zones.trash.push(card);
        }
        break;
      case ZoneId.LIFE:
        if (index !== undefined) {
          player.zones.life.splice(index, 0, card);
        } else {
          player.zones.life.push(card);
        }
        break;
      case ZoneId.CHARACTER_AREA:
        if (index !== undefined) {
          player.zones.characterArea.splice(index, 0, card);
        } else {
          player.zones.characterArea.push(card);
        }
        break;
      case ZoneId.LEADER_AREA:
        player.zones.leaderArea = card;
        break;
      case ZoneId.STAGE_AREA:
        player.zones.stageArea = card;
        break;
      case ZoneId.BANISHED:
        if (index !== undefined) {
          player.zones.banished.splice(index, 0, card);
        } else {
          player.zones.banished.push(card);
        }
        break;
      case ZoneId.LIMBO:
        // LIMBO is a temporary zone, cards are not stored in player zones
        break;
    }
  }

  /**
   * Remove a DON from a zone
   */
  private removeDonFromZone(player: PlayerState, donId: string, zone: ZoneId): void {
    switch (zone) {
      case ZoneId.DON_DECK:
        player.zones.donDeck = player.zones.donDeck.filter(d => d.id !== donId);
        break;
      case ZoneId.COST_AREA:
        player.zones.costArea = player.zones.costArea.filter(d => d.id !== donId);
        break;
    }

    // Also check if DON is given to any card
    const allCards = [
      ...player.zones.deck,
      ...player.zones.hand,
      ...player.zones.trash,
      ...player.zones.life,
      ...player.zones.characterArea,
      player.zones.leaderArea,
      player.zones.stageArea,
    ].filter(Boolean) as CardInstance[];

    for (const card of allCards) {
      card.givenDon = card.givenDon.filter(d => d.id !== donId);
    }
  }

  /**
   * Add a DON to a zone
   */
  private addDonToZone(player: PlayerState, don: DonInstance, zone: ZoneId): void {
    switch (zone) {
      case ZoneId.DON_DECK:
        player.zones.donDeck.push(don);
        break;
      case ZoneId.COST_AREA:
        player.zones.costArea.push(don);
        break;
    }
  }

  /**
   * Find a card in a player's zones
   */
  private findCardInPlayer(player: PlayerState, cardId: string): CardInstance | null {
    const zones = [
      player.zones.deck,
      player.zones.hand,
      player.zones.trash,
      player.zones.life,
      player.zones.characterArea,
    ];

    for (const zone of zones) {
      const card = zone.find(c => c.id === cardId);
      if (card) return card;
    }

    if (player.zones.leaderArea?.id === cardId) {
      return player.zones.leaderArea;
    }

    if (player.zones.stageArea?.id === cardId) {
      return player.zones.stageArea;
    }

    return null;
  }
}

/**
 * Create an initial game state
 */
export function createInitialGameState(): GameState {
  const player1: PlayerState = {
    id: PlayerId.PLAYER_1,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [],
      donDeck: [],
      costArea: [],
      leaderArea: null,
      characterArea: [],
      stageArea: null,
      banished: [],
    },
    flags: new Map(),
  };

  const player2: PlayerState = {
    id: PlayerId.PLAYER_2,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [],
      donDeck: [],
      costArea: [],
      leaderArea: null,
      characterArea: [],
      stageArea: null,
      banished: [],
    },
    flags: new Map(),
  };

  return {
    players: new Map([
      [PlayerId.PLAYER_1, player1],
      [PlayerId.PLAYER_2, player2],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.REFRESH,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 3,
    },
    attackedThisTurn: new Set(),
  };
}
