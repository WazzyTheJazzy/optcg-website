/**
 * Core type definitions for the One Piece TCG Engine
 */

// ============================================================================
// Enums
// ============================================================================

export enum ZoneId {
  DECK = 'DECK',
  HAND = 'HAND',
  TRASH = 'TRASH',
  LIFE = 'LIFE',
  DON_DECK = 'DON_DECK',
  COST_AREA = 'COST_AREA',
  LEADER_AREA = 'LEADER_AREA',
  CHARACTER_AREA = 'CHARACTER_AREA',
  STAGE_AREA = 'STAGE_AREA',
  LIMBO = 'LIMBO', // Temporary zone for cards being resolved
  BANISHED = 'BANISHED', // Cards removed from the game permanently
}

export enum CardCategory {
  LEADER = 'LEADER',
  CHARACTER = 'CHARACTER',
  EVENT = 'EVENT',
  STAGE = 'STAGE',
  DON = 'DON',
}

export enum Color {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  PURPLE = 'PURPLE',
  BLACK = 'BLACK',
  YELLOW = 'YELLOW',
}

export enum CardState {
  ACTIVE = 'ACTIVE',
  RESTED = 'RESTED',
  NONE = 'NONE', // For cards in zones where state doesn't apply
}

export enum Phase {
  REFRESH = 'REFRESH',
  DRAW = 'DRAW',
  DON_PHASE = 'DON_PHASE',
  MAIN = 'MAIN',
  END = 'END',
}

export enum EffectTimingType {
  AUTO = 'AUTO',
  ACTIVATE = 'ACTIVATE',
  PERMANENT = 'PERMANENT',
  REPLACEMENT = 'REPLACEMENT',
}

export enum TriggerTiming {
  START_OF_GAME = 'START_OF_GAME',
  START_OF_TURN = 'START_OF_TURN',
  START_OF_MAIN = 'START_OF_MAIN',
  WHEN_ATTACKING = 'WHEN_ATTACKING',
  ON_OPPONENT_ATTACK = 'ON_OPPONENT_ATTACK',
  ON_BLOCK = 'ON_BLOCK',
  WHEN_ATTACKED = 'WHEN_ATTACKED',
  ON_PLAY = 'ON_PLAY',
  ON_KO = 'ON_KO',
  END_OF_BATTLE = 'END_OF_BATTLE',
  END_OF_YOUR_TURN = 'END_OF_YOUR_TURN',
  END_OF_OPPONENT_TURN = 'END_OF_OPPONENT_TURN',
}

export enum PlayerId {
  PLAYER_1 = 'PLAYER_1',
  PLAYER_2 = 'PLAYER_2',
}

export enum PlayerType {
  HUMAN = 'human',
  AI = 'ai',
}

export enum GameEventType {
  CARD_MOVED = 'CARD_MOVED',
  CARD_STATE_CHANGED = 'CARD_STATE_CHANGED',
  POWER_CHANGED = 'POWER_CHANGED',
  ATTACK_DECLARED = 'ATTACK_DECLARED',
  BLOCK_DECLARED = 'BLOCK_DECLARED',
  COUNTER_STEP_START = 'COUNTER_STEP_START',
  BATTLE_END = 'BATTLE_END',
  PHASE_CHANGED = 'PHASE_CHANGED',
  TURN_START = 'TURN_START',
  TURN_END = 'TURN_END',
  GAME_OVER = 'GAME_OVER',
  STATE_CHANGED = 'STATE_CHANGED', // General state update event
  // AI-specific events
  AI_THINKING_START = 'AI_THINKING_START',
  AI_THINKING_END = 'AI_THINKING_END',
  AI_ACTION_SELECTED = 'AI_ACTION_SELECTED',
  // Game action events
  CARD_PLAYED = 'CARD_PLAYED',
  DON_GIVEN = 'DON_GIVEN',
  COUNTER_USED = 'COUNTER_USED',
  // Effect events
  EFFECT_TRIGGERED = 'EFFECT_TRIGGERED',
  EFFECT_RESOLVED = 'EFFECT_RESOLVED',
  EFFECT_AWAITING_INPUT = 'EFFECT_AWAITING_INPUT',
  EFFECT_ADDED_TO_STACK = 'EFFECT_ADDED_TO_STACK',
  ERROR = 'ERROR',
}

export enum ModifierDuration {
  PERMANENT = 'PERMANENT',
  UNTIL_END_OF_TURN = 'UNTIL_END_OF_TURN',
  UNTIL_END_OF_BATTLE = 'UNTIL_END_OF_BATTLE',
  UNTIL_START_OF_NEXT_TURN = 'UNTIL_START_OF_NEXT_TURN',
  DURING_THIS_TURN = 'DURING_THIS_TURN',
}

export enum ModifierType {
  POWER = 'POWER',
  COST = 'COST',
  KEYWORD = 'KEYWORD',
  ATTRIBUTE = 'ATTRIBUTE',
}

// ============================================================================
// Card Definition Interfaces
// ============================================================================

export interface CardDefinition {
  id: string;
  name: string;
  category: CardCategory;
  colors: string[];
  typeTags: string[];
  attributes: string[];
  basePower: number | null;
  baseCost: number | null;
  lifeValue: number | null; // Leaders only
  counterValue: number | null; // Characters only
  rarity: string;
  keywords: string[];
  effects: EffectDefinition[];
  imageUrl: string;
  metadata: CardMetadata;
}

export interface CardMetadata {
  setCode: string;
  cardNumber: string;
  isAltArt: boolean;
  isPromo: boolean;
}

export interface EffectDefinition {
  id: string;
  label: string; // "[On Play]", "[When Attacking]", etc
  timingType: EffectTimingType;
  triggerTiming: TriggerTiming | null;
  condition: ConditionExpr | null;
  cost: CostExpr | null;
  scriptId: string;
  oncePerTurn: boolean;
}

// ============================================================================
// Card Instance Interfaces
// ============================================================================

export interface CardInstance {
  id: string; // Unique instance ID
  definition: CardDefinition;
  owner: PlayerId;
  controller: PlayerId;
  zone: ZoneId;
  state: CardState;
  givenDon: DonInstance[];
  modifiers: Modifier[];
  flags: Map<string, any>;
}

export interface DonInstance {
  id: string; // Unique instance ID
  owner: PlayerId;
  zone: ZoneId;
  state: CardState;
}

// ============================================================================
// Player and Game State Interfaces
// ============================================================================

export interface PlayerState {
  id: PlayerId;
  zones: {
    deck: CardInstance[];
    hand: CardInstance[];
    trash: CardInstance[];
    life: CardInstance[];
    donDeck: DonInstance[];
    costArea: DonInstance[];
    leaderArea: CardInstance | null;
    characterArea: CardInstance[]; // Max 5
    stageArea: CardInstance | null;
    banished: CardInstance[]; // Cards removed from game permanently
  };
  flags: Map<string, any>;
}

export interface GameState {
  players: Map<PlayerId, PlayerState>;
  activePlayer: PlayerId;
  phase: Phase;
  turnNumber: number;
  pendingTriggers: TriggerInstance[];
  gameOver: boolean;
  winner: PlayerId | null;
  history: GameAction[];
  loopGuardState: LoopGuardState;
  attackedThisTurn: Set<string>; // Set of card instance IDs that have attacked this turn
}

export interface LoopGuardState {
  stateHashes: Map<string, number>;
  maxRepeats: number;
}

// ============================================================================
// Event Interfaces
// ============================================================================

export interface GameEvent {
  type: GameEventType;
  playerId: PlayerId | null;
  cardId: string | null;
  data: Record<string, any>;
  timestamp: number;
}

export interface CardMovedEvent extends GameEvent {
  type: GameEventType.CARD_MOVED;
  data: {
    cardId: string;
    fromZone: ZoneId;
    toZone: ZoneId;
    fromIndex: number;
    toIndex: number;
  };
}

export interface CardStateChangedEvent extends GameEvent {
  type: GameEventType.CARD_STATE_CHANGED;
  data: {
    cardId: string;
    oldState: CardState;
    newState: CardState;
  };
}

export interface PowerChangedEvent extends GameEvent {
  type: GameEventType.POWER_CHANGED;
  data: {
    cardId: string;
    oldPower: number;
    newPower: number;
  };
}

export interface AttackDeclaredEvent extends GameEvent {
  type: GameEventType.ATTACK_DECLARED;
  data: {
    attackerId: string;
    targetId: string;
  };
}

export interface BlockDeclaredEvent extends GameEvent {
  type: GameEventType.BLOCK_DECLARED;
  data: {
    blockerId: string;
    attackerId: string;
  };
}

export interface PhaseChangedEvent extends GameEvent {
  type: GameEventType.PHASE_CHANGED;
  data: {
    oldPhase: Phase;
    newPhase: Phase;
  };
}

export interface StateChangedEvent extends GameEvent {
  type: GameEventType.STATE_CHANGED;
  // No additional data needed - listeners should fetch current state
}

// ============================================================================
// Effect System Interfaces
// ============================================================================

export interface EffectInstance {
  effectDefinition: EffectDefinition;
  source: CardInstance;
  controller: PlayerId;
  targets: Target[];
  values: Map<string, any>;
  context: EffectContext | null;
}

export interface TriggerInstance {
  effectDefinition: EffectDefinition;
  source: CardInstance;
  controller: PlayerId;
  event: GameEvent;
  priority: number; // For ordering (turn player triggers first)
}

export interface EffectContext {
  state: GameState;
  source: CardInstance;
  controller: PlayerId;
  targets: Target[];
  values: Map<string, any>;
  event: GameEvent | null;
}

export interface Target {
  type: TargetType;
  cardId?: string;
  playerId?: PlayerId;
  zoneId?: ZoneId;
  value?: any;
}

export enum TargetType {
  CARD = 'CARD',
  PLAYER = 'PLAYER',
  ZONE = 'ZONE',
  VALUE = 'VALUE',
}

// ============================================================================
// Modifier Interface
// ============================================================================

export interface Modifier {
  id: string;
  type: ModifierType;
  value: number | string;
  duration: ModifierDuration;
  source: string; // Card ID that created this modifier
  timestamp: number;
}

// ============================================================================
// Expression Types (for conditions and costs)
// ============================================================================

export type ConditionExpr = {
  type: 'AND' | 'OR' | 'NOT' | 'COMPARE' | 'HAS_KEYWORD' | 'IN_ZONE' | 'IS_COLOR';
  operands?: ConditionExpr[];
  operator?: 'EQ' | 'NEQ' | 'GT' | 'LT' | 'GTE' | 'LTE';
  left?: string | number;
  right?: string | number;
  keyword?: string;
  zone?: ZoneId;
  color?: string;
};

export type CostExpr = {
  type: 'REST_DON' | 'TRASH_CARD' | 'REST_CARD' | 'COMPOSITE';
  amount?: number;
  costs?: CostExpr[];
};

// ============================================================================
// Action Interfaces
// ============================================================================

// Base action interface
export interface BaseGameAction {
  type: ActionType;
  playerId: PlayerId;
  timestamp: number;
}

// Specific action types
export interface AttackAction extends BaseGameAction {
  type: ActionType.DECLARE_ATTACK;
  attackerId: string;  // Card instance ID of attacker
  targetId: string;    // Card instance ID of target (leader or character)
}

export interface PassAction extends BaseGameAction {
  type: ActionType.PASS_PRIORITY;
}

export interface EndPhaseAction extends BaseGameAction {
  type: ActionType.END_PHASE;
}

export interface PlayCardAction extends BaseGameAction {
  type: ActionType.PLAY_CARD;
  cardId: string;
}

export interface GiveDonAction extends BaseGameAction {
  type: ActionType.GIVE_DON;
  donId: string;
  targetCardId: string;
}

export interface ActivateEffectAction extends BaseGameAction {
  type: ActionType.ACTIVATE_EFFECT;
  effectId: string;
  sourceCardId: string;
}

// Union type for all game actions
export type GameAction =
  | AttackAction
  | PassAction
  | EndPhaseAction
  | PlayCardAction
  | GiveDonAction
  | ActivateEffectAction;

export enum ActionType {
  PLAY_CARD = 'PLAY_CARD',
  ACTIVATE_EFFECT = 'ACTIVATE_EFFECT',
  GIVE_DON = 'GIVE_DON',
  DECLARE_ATTACK = 'DECLARE_ATTACK',
  DECLARE_BLOCK = 'DECLARE_BLOCK',
  USE_COUNTER = 'USE_COUNTER',
  USE_COUNTER_CARD = 'USE_COUNTER_CARD',
  PLAY_COUNTER_EVENT = 'PLAY_COUNTER_EVENT',
  PASS_PRIORITY = 'PASS_PRIORITY',
  END_PHASE = 'END_PHASE',
}

// Counter action types for the counter step
export interface CounterAction {
  type: 'USE_COUNTER_CARD' | 'PLAY_COUNTER_EVENT' | 'PASS';
  cardId?: string; // Card ID for counter card or counter event
}

export interface UseCounterCardAction extends CounterAction {
  type: 'USE_COUNTER_CARD';
  cardId: string;
}

export interface PlayCounterEventAction extends CounterAction {
  type: 'PLAY_COUNTER_EVENT';
  cardId: string;
}

// ============================================================================
// Battle System Types
// ============================================================================

export interface BattleResult {
  success: boolean;
  attackerId: string;
  defenderId: string;
  blockerId?: string | null;
  attackerPower?: number;
  defenderPower?: number;
  damageDealt: number;
  defenderKOd: boolean;
  attackerKOd?: boolean;
  error?: string;
}

export enum BattleStep {
  ATTACK = 'ATTACK',
  BLOCK = 'BLOCK',
  COUNTER = 'COUNTER',
  DAMAGE = 'DAMAGE',
  END = 'END',
}

// ============================================================================
// Helper Types
// ============================================================================

export type EventHandler = (event: GameEvent) => void;

export interface CardFilter {
  category?: CardCategory;
  colors?: string[];
  keywords?: string[];
  minPower?: number;
  maxPower?: number;
  minCost?: number;
  maxCost?: number;
}

// ============================================================================
// Player Interface (for AI and Human players)
// ============================================================================

/**
 * Player interface for both human and AI players
 * All decision-making methods return promises to support async UI interactions
 */
export interface Player {
  readonly id: PlayerId;
  readonly type: PlayerType;
  
  /**
   * Choose an action from a list of legal actions during the Main Phase
   * @param legalActions - Array of legal actions the player can perform
   * @param state - Current game state
   * @returns Promise resolving to the chosen action
   */
  chooseAction(legalActions: GameAction[], state: GameState): Promise<GameAction>;
  
  /**
   * Decide whether to mulligan the opening hand
   * @param hand - The opening hand cards
   * @param state - Current game state
   * @returns Promise resolving to true (mulligan) or false (keep)
   */
  chooseMulligan(hand: CardInstance[], state: GameState): Promise<boolean>;
  
  /**
   * Choose a blocker from available blockers during the block step
   * @param legalBlockers - Array of cards that can block
   * @param attacker - The attacking card
   * @param state - Current game state
   * @returns Promise resolving to the chosen blocker or null to not block
   */
  chooseBlocker(
    legalBlockers: CardInstance[],
    attacker: CardInstance,
    state: GameState
  ): Promise<CardInstance | null>;
  
  /**
   * Choose a counter action during the counter step
   * @param options - Array of available counter options
   * @param state - Current game state
   * @returns Promise resolving to the chosen counter action or null to pass
   */
  chooseCounterAction(
    options: CounterAction[],
    state: GameState
  ): Promise<CounterAction | null>;
  
  /**
   * Choose a target for an effect
   * @param legalTargets - Array of legal targets
   * @param effect - The effect instance requiring a target
   * @param state - Current game state
   * @returns Promise resolving to the chosen target
   */
  chooseTarget(
    legalTargets: Target[],
    effect: EffectInstance,
    state: GameState
  ): Promise<Target>;
  
  /**
   * Choose a numeric value for an effect
   * @param options - Array of valid numeric options
   * @param effect - The effect instance requiring a value
   * @param state - Current game state
   * @returns Promise resolving to the chosen value
   */
  chooseValue(
    options: number[],
    effect: EffectInstance,
    state: GameState
  ): Promise<number>;
}
