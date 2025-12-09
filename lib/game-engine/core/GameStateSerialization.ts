/**
 * Game State Serialization System
 * 
 * Handles serialization and deserialization of complete game states to/from JSON.
 * Supports saving games at any point and resuming them later.
 */

import {
  GameState,
  PlayerState,
  PlayerId,
  CardInstance,
  DonInstance,
  Modifier,
  GameAction,
  TriggerInstance,
  LoopGuardState,
  Phase,
  ZoneId,
  CardState,
  CardCategory,
  EffectDefinition,
  EffectTimingType,
  TriggerTiming,
  ModifierDuration,
  ModifierType,
  ActionType,
} from './types';

// ============================================================================
// Serializable Types
// ============================================================================

/**
 * JSON-serializable representation of GameState
 */
export interface SerializableGameState {
  version: string; // Serialization format version
  players: {
    [key: string]: SerializablePlayerState;
  };
  activePlayer: PlayerId;
  phase: Phase;
  turnNumber: number;
  pendingTriggers: SerializableTriggerInstance[];
  gameOver: boolean;
  winner: PlayerId | null;
  history: SerializableGameAction[];
  loopGuardState: SerializableLoopGuardState;
  attackedThisTurn: string[];
  timestamp: number; // When this state was saved
}

export interface SerializablePlayerState {
  id: PlayerId;
  zones: {
    deck: SerializableCardInstance[];
    hand: SerializableCardInstance[];
    trash: SerializableCardInstance[];
    life: SerializableCardInstance[];
    donDeck: SerializableDonInstance[];
    costArea: SerializableDonInstance[];
    leaderArea: SerializableCardInstance | null;
    characterArea: SerializableCardInstance[];
    stageArea: SerializableCardInstance | null;
    banished: SerializableCardInstance[];
  };
  flags: { [key: string]: any };
}

export interface SerializableCardInstance {
  id: string;
  definitionId: string; // Reference to card definition by ID
  owner: PlayerId;
  controller: PlayerId;
  zone: ZoneId;
  state: CardState;
  givenDon: SerializableDonInstance[];
  modifiers: SerializableModifier[];
  flags: { [key: string]: any };
}

export interface SerializableDonInstance {
  id: string;
  owner: PlayerId;
  zone: ZoneId;
  state: CardState;
}

export interface SerializableModifier {
  id: string;
  type: ModifierType;
  value: number | string;
  duration: ModifierDuration;
  source: string;
  timestamp: number;
}

export interface SerializableTriggerInstance {
  effectDefinitionId: string;
  sourceCardId: string;
  controller: PlayerId;
  eventType: string;
  eventData: any;
  priority: number;
}

export interface SerializableGameAction {
  type: ActionType;
  playerId: PlayerId;
  timestamp: number;
  data: any; // Action-specific data
}

export interface SerializableLoopGuardState {
  stateHashes: { [key: string]: number };
  maxRepeats: number;
}

// ============================================================================
// Serialization Functions
// ============================================================================

const SERIALIZATION_VERSION = '1.0.0';

/**
 * Serialize a complete game state to JSON
 */
export function serializeGameState(state: GameState): SerializableGameState {
  return {
    version: SERIALIZATION_VERSION,
    players: serializePlayers(state.players),
    activePlayer: state.activePlayer,
    phase: state.phase,
    turnNumber: state.turnNumber,
    pendingTriggers: serializeTriggers(state.pendingTriggers),
    gameOver: state.gameOver,
    winner: state.winner,
    history: serializeHistory(state.history),
    loopGuardState: serializeLoopGuardState(state.loopGuardState),
    attackedThisTurn: Array.from(state.attackedThisTurn),
    timestamp: Date.now(),
  };
}

function serializePlayers(
  players: Map<PlayerId, PlayerState>
): { [key: string]: SerializablePlayerState } {
  const result: { [key: string]: SerializablePlayerState } = {};
  
  players.forEach((playerState, playerId) => {
    result[playerId] = serializePlayerState(playerState);
  });
  
  return result;
}

function serializePlayerState(playerState: PlayerState): SerializablePlayerState {
  return {
    id: playerState.id,
    zones: {
      deck: playerState.zones.deck.map(serializeCardInstance),
      hand: playerState.zones.hand.map(serializeCardInstance),
      trash: playerState.zones.trash.map(serializeCardInstance),
      life: playerState.zones.life.map(serializeCardInstance),
      donDeck: playerState.zones.donDeck.map(serializeDonInstance),
      costArea: playerState.zones.costArea.map(serializeDonInstance),
      leaderArea: playerState.zones.leaderArea
        ? serializeCardInstance(playerState.zones.leaderArea)
        : null,
      characterArea: playerState.zones.characterArea.map(serializeCardInstance),
      stageArea: playerState.zones.stageArea
        ? serializeCardInstance(playerState.zones.stageArea)
        : null,
      banished: playerState.zones.banished.map(serializeCardInstance),
    },
    flags: mapToObject(playerState.flags),
  };
}

function serializeCardInstance(card: CardInstance): SerializableCardInstance {
  return {
    id: card.id,
    definitionId: card.definition.id,
    owner: card.owner,
    controller: card.controller,
    zone: card.zone,
    state: card.state,
    givenDon: card.givenDon.map(serializeDonInstance),
    modifiers: card.modifiers.map(serializeModifier),
    flags: mapToObject(card.flags),
  };
}

function serializeDonInstance(don: DonInstance): SerializableDonInstance {
  return {
    id: don.id,
    owner: don.owner,
    zone: don.zone,
    state: don.state,
  };
}

function serializeModifier(modifier: Modifier): SerializableModifier {
  return {
    id: modifier.id,
    type: modifier.type,
    value: modifier.value,
    duration: modifier.duration,
    source: modifier.source,
    timestamp: modifier.timestamp,
  };
}

function serializeTriggers(
  triggers: TriggerInstance[]
): SerializableTriggerInstance[] {
  return triggers.map((trigger) => ({
    effectDefinitionId: trigger.effectDefinition.id,
    sourceCardId: trigger.source.id,
    controller: trigger.controller,
    eventType: trigger.event.type,
    eventData: trigger.event.data,
    priority: trigger.priority,
  }));
}

function serializeHistory(history: GameAction[]): SerializableGameAction[] {
  return history.map((action) => ({
    type: action.type,
    playerId: action.playerId,
    timestamp: action.timestamp,
    data: serializeActionData(action),
  }));
}

function serializeActionData(action: GameAction): any {
  switch (action.type) {
    case ActionType.DECLARE_ATTACK:
      return {
        attackerId: action.attackerId,
        targetId: action.targetId,
      };
    case ActionType.PLAY_CARD:
      return {
        cardId: action.cardId,
      };
    case ActionType.GIVE_DON:
      return {
        donId: action.donId,
        targetCardId: action.targetCardId,
      };
    case ActionType.ACTIVATE_EFFECT:
      return {
        effectId: action.effectId,
        sourceCardId: action.sourceCardId,
      };
    default:
      return {};
  }
}

function serializeLoopGuardState(
  loopGuard: LoopGuardState
): SerializableLoopGuardState {
  return {
    stateHashes: mapToObject(loopGuard.stateHashes),
    maxRepeats: loopGuard.maxRepeats,
  };
}

function mapToObject<K extends string | number, V>(map: Map<K, V>): { [key: string]: V } {
  const obj: { [key: string]: V } = {};
  map.forEach((value, key) => {
    obj[String(key)] = value;
  });
  return obj;
}

// ============================================================================
// Deserialization Functions
// ============================================================================

/**
 * Deserialize a game state from JSON
 * Requires a card definition lookup function to restore full card instances
 */
export function deserializeGameState(
  serialized: SerializableGameState,
  cardDefinitionLookup: (cardId: string) => any
): GameState {
  // Validate version
  if (serialized.version !== SERIALIZATION_VERSION) {
    throw new Error(
      `Unsupported serialization version: ${serialized.version}. Expected: ${SERIALIZATION_VERSION}`
    );
  }
  
  const players = new Map<PlayerId, PlayerState>();
  
  Object.entries(serialized.players).forEach(([playerId, playerData]) => {
    players.set(
      playerId as PlayerId,
      deserializePlayerState(playerData, cardDefinitionLookup)
    );
  });
  
  return {
    players,
    activePlayer: serialized.activePlayer,
    phase: serialized.phase,
    turnNumber: serialized.turnNumber,
    pendingTriggers: deserializeTriggers(
      serialized.pendingTriggers,
      players,
      cardDefinitionLookup
    ),
    gameOver: serialized.gameOver,
    winner: serialized.winner,
    history: deserializeHistory(serialized.history),
    loopGuardState: deserializeLoopGuardState(serialized.loopGuardState),
    attackedThisTurn: new Set(serialized.attackedThisTurn),
  };
}

function deserializePlayerState(
  serialized: SerializablePlayerState,
  cardDefinitionLookup: (cardId: string) => any
): PlayerState {
  return {
    id: serialized.id,
    zones: {
      deck: serialized.zones.deck.map((c) =>
        deserializeCardInstance(c, cardDefinitionLookup)
      ),
      hand: serialized.zones.hand.map((c) =>
        deserializeCardInstance(c, cardDefinitionLookup)
      ),
      trash: serialized.zones.trash.map((c) =>
        deserializeCardInstance(c, cardDefinitionLookup)
      ),
      life: serialized.zones.life.map((c) =>
        deserializeCardInstance(c, cardDefinitionLookup)
      ),
      donDeck: serialized.zones.donDeck.map(deserializeDonInstance),
      costArea: serialized.zones.costArea.map(deserializeDonInstance),
      leaderArea: serialized.zones.leaderArea
        ? deserializeCardInstance(serialized.zones.leaderArea, cardDefinitionLookup)
        : null,
      characterArea: serialized.zones.characterArea.map((c) =>
        deserializeCardInstance(c, cardDefinitionLookup)
      ),
      stageArea: serialized.zones.stageArea
        ? deserializeCardInstance(serialized.zones.stageArea, cardDefinitionLookup)
        : null,
      banished: serialized.zones.banished.map((c) =>
        deserializeCardInstance(c, cardDefinitionLookup)
      ),
    },
    flags: objectToMap(serialized.flags),
  };
}

function deserializeCardInstance(
  serialized: SerializableCardInstance,
  cardDefinitionLookup: (cardId: string) => any
): CardInstance {
  const definition = cardDefinitionLookup(serialized.definitionId);
  
  if (!definition) {
    throw new Error(`Card definition not found: ${serialized.definitionId}`);
  }
  
  return {
    id: serialized.id,
    definition,
    owner: serialized.owner,
    controller: serialized.controller,
    zone: serialized.zone,
    state: serialized.state,
    givenDon: serialized.givenDon.map(deserializeDonInstance),
    modifiers: serialized.modifiers.map(deserializeModifier),
    flags: objectToMap(serialized.flags),
  };
}

function deserializeDonInstance(serialized: SerializableDonInstance): DonInstance {
  return {
    id: serialized.id,
    owner: serialized.owner,
    zone: serialized.zone,
    state: serialized.state,
  };
}

function deserializeModifier(serialized: SerializableModifier): Modifier {
  return {
    id: serialized.id,
    type: serialized.type,
    value: serialized.value,
    duration: serialized.duration,
    source: serialized.source,
    timestamp: serialized.timestamp,
  };
}

function deserializeTriggers(
  serialized: SerializableTriggerInstance[],
  players: Map<PlayerId, PlayerState>,
  cardDefinitionLookup: (cardId: string) => any
): TriggerInstance[] {
  // Note: This is a simplified deserialization
  // In a full implementation, we'd need to reconstruct the full trigger instances
  // For now, we return an empty array as triggers are typically transient
  return [];
}

function deserializeHistory(
  serialized: SerializableGameAction[]
): GameAction[] {
  return serialized.map((action) => {
    const base = {
      type: action.type,
      playerId: action.playerId,
      timestamp: action.timestamp,
    };
    
    switch (action.type) {
      case ActionType.DECLARE_ATTACK:
        return {
          ...base,
          type: ActionType.DECLARE_ATTACK,
          attackerId: (action as any).attackerId,
          targetId: (action as any).targetId,
        };
      case ActionType.PLAY_CARD:
        return {
          ...base,
          type: ActionType.PLAY_CARD,
          cardId: (action as any).cardId,
        };
      case ActionType.GIVE_DON:
        return {
          ...base,
          type: ActionType.GIVE_DON,
          donId: (action as any).donId,
          targetCardId: (action as any).targetCardId,
        };
      case ActionType.ACTIVATE_EFFECT:
        return {
          ...base,
          type: ActionType.ACTIVATE_EFFECT,
          effectId: (action as any).effectId,
          sourceCardId: (action as any).sourceCardId,
        };
      case ActionType.PASS_PRIORITY:
        return {
          ...base,
          type: ActionType.PASS_PRIORITY,
        };
      case ActionType.END_PHASE:
        return {
          ...base,
          type: ActionType.END_PHASE,
        };
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  });
}

function deserializeLoopGuardState(
  serialized: SerializableLoopGuardState
): LoopGuardState {
  return {
    stateHashes: objectToMap(serialized.stateHashes),
    maxRepeats: serialized.maxRepeats,
  };
}

function objectToMap<V>(obj: { [key: string]: V }): Map<string, V> {
  const map = new Map<string, V>();
  Object.entries(obj).forEach(([key, value]) => {
    map.set(key, value);
  });
  return map;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that a deserialized game state satisfies all invariants
 */
export function validateGameState(state: GameState): ValidationResult {
  const errors: string[] = [];
  
  // Validate players exist
  if (state.players.size !== 2) {
    errors.push(`Expected 2 players, found ${state.players.size}`);
  }
  
  // Validate active player exists
  if (!state.players.has(state.activePlayer)) {
    errors.push(`Active player ${state.activePlayer} not found in players`);
  }
  
  // Validate each player
  state.players.forEach((playerState, playerId) => {
    const playerErrors = validatePlayerState(playerState, playerId);
    errors.push(...playerErrors);
  });
  
  // Validate turn number
  if (state.turnNumber < 1) {
    errors.push(`Invalid turn number: ${state.turnNumber}`);
  }
  
  // Validate phase
  if (!Object.values(Phase).includes(state.phase)) {
    errors.push(`Invalid phase: ${state.phase}`);
  }
  
  // Validate game over state
  // Note: A game can be over without a winner (draw, timeout, etc.)
  // But if there's a winner, the game must be over
  if (!state.gameOver && state.winner) {
    errors.push('Winner is set but game is not over');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function validatePlayerState(
  playerState: PlayerState,
  playerId: PlayerId
): string[] {
  const errors: string[] = [];
  
  // Validate player ID matches
  if (playerState.id !== playerId) {
    errors.push(
      `Player ID mismatch: expected ${playerId}, got ${playerState.id}`
    );
  }
  
  // Validate leader exists
  if (!playerState.zones.leaderArea) {
    errors.push(`Player ${playerId} has no leader`);
  }
  
  // Validate character area size
  if (playerState.zones.characterArea.length > 5) {
    errors.push(
      `Player ${playerId} has ${playerState.zones.characterArea.length} characters (max 5)`
    );
  }
  
  // Stage area should be a single card or null (already enforced by type system)
  // No additional validation needed here
  
  // Validate all cards have correct zones
  const allCards = [
    ...playerState.zones.deck,
    ...playerState.zones.hand,
    ...playerState.zones.trash,
    ...playerState.zones.life,
    ...playerState.zones.characterArea,
    ...playerState.zones.banished,
  ];
  
  if (playerState.zones.leaderArea) {
    allCards.push(playerState.zones.leaderArea);
  }
  
  if (playerState.zones.stageArea) {
    allCards.push(playerState.zones.stageArea);
  }
  
  allCards.forEach((card) => {
    if (card.owner !== playerId) {
      errors.push(
        `Card ${card.id} in player ${playerId}'s zones has wrong owner: ${card.owner}`
      );
    }
    
    // Validate card is in the correct zone
    const expectedZone = getExpectedZone(card, playerState);
    if (card.zone !== expectedZone) {
      errors.push(
        `Card ${card.id} has zone ${card.zone} but is in ${expectedZone}`
      );
    }
  });
  
  return errors;
}

function getExpectedZone(card: CardInstance, playerState: PlayerState): ZoneId {
  // Find which zone the card is actually in
  if (playerState.zones.deck.includes(card)) return ZoneId.DECK;
  if (playerState.zones.hand.includes(card)) return ZoneId.HAND;
  if (playerState.zones.trash.includes(card)) return ZoneId.TRASH;
  if (playerState.zones.life.includes(card)) return ZoneId.LIFE;
  if (playerState.zones.characterArea.includes(card)) return ZoneId.CHARACTER_AREA;
  if (playerState.zones.banished.includes(card)) return ZoneId.BANISHED;
  if (playerState.zones.leaderArea === card) return ZoneId.LEADER_AREA;
  if (playerState.zones.stageArea === card) return ZoneId.STAGE_AREA;
  
  return card.zone; // Fallback to card's stated zone
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a game state to a JSON string
 */
export function gameStateToJSON(state: GameState): string {
  const serialized = serializeGameState(state);
  return JSON.stringify(serialized, null, 2);
}

/**
 * Parse a game state from a JSON string
 */
export function gameStateFromJSON(
  json: string,
  cardDefinitionLookup: (cardId: string) => any
): GameState {
  const serialized = JSON.parse(json) as SerializableGameState;
  return deserializeGameState(serialized, cardDefinitionLookup);
}
