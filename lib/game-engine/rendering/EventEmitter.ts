import { PlayerId, ZoneId, Phase, CardState } from '../core/types';

/**
 * Enum defining all game event types that can be emitted
 */
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
  STATE_CHANGED = 'STATE_CHANGED',
  ERROR = 'ERROR',
  AI_THINKING_START = 'AI_THINKING_START',
  AI_THINKING_END = 'AI_THINKING_END',
  AI_ACTION_SELECTED = 'AI_ACTION_SELECTED',
  CARD_PLAYED = 'CARD_PLAYED',
  DON_GIVEN = 'DON_GIVEN',
  COUNTER_USED = 'COUNTER_USED',
  // Effect events
  EFFECT_TRIGGERED = 'EFFECT_TRIGGERED',
  EFFECT_RESOLVED = 'EFFECT_RESOLVED',
  EFFECT_AWAITING_INPUT = 'EFFECT_AWAITING_INPUT',
}

/**
 * Base interface for all game events
 */
export interface GameEvent {
  type: GameEventType;
  timestamp: number;
}

/**
 * Event emitted when a card moves between zones
 */
export interface CardMovedEvent extends GameEvent {
  type: GameEventType.CARD_MOVED;
  cardId: string;
  playerId: PlayerId;
  fromZone: ZoneId;
  toZone: ZoneId;
  fromIndex?: number;
  toIndex?: number;
}

/**
 * Event emitted when a card's state changes (ACTIVE/RESTED)
 */
export interface CardStateChangedEvent extends GameEvent {
  type: GameEventType.CARD_STATE_CHANGED;
  cardId: string;
  playerId: PlayerId;
  oldState: CardState;
  newState: CardState;
}

/**
 * Event emitted when a card's power changes
 */
export interface PowerChangedEvent extends GameEvent {
  type: GameEventType.POWER_CHANGED;
  cardId: string;
  playerId: PlayerId;
  oldPower: number;
  newPower: number;
  reason: string;
}

/**
 * Event emitted when an attack is declared
 */
export interface AttackDeclaredEvent extends GameEvent {
  type: GameEventType.ATTACK_DECLARED;
  attackerId: string;
  targetId: string;
  attackingPlayerId: PlayerId;
  defendingPlayerId: PlayerId;
}

/**
 * Event emitted when a blocker is declared
 */
export interface BlockDeclaredEvent extends GameEvent {
  type: GameEventType.BLOCK_DECLARED;
  blockerId: string;
  attackerId: string;
  blockingPlayerId: PlayerId;
}

/**
 * Event emitted when the counter step begins
 */
export interface CounterStepStartEvent extends GameEvent {
  type: GameEventType.COUNTER_STEP_START;
  attackerId: string;
  defenderId: string;
  defendingPlayerId: PlayerId;
}

/**
 * Event emitted when a battle ends
 */
export interface BattleEndEvent extends GameEvent {
  type: GameEventType.BATTLE_END;
  attackerId: string;
  defenderId: string;
  attackingPlayerId: PlayerId;
  defendingPlayerId: PlayerId;
  damageDealt: number;
}

/**
 * Event emitted when the game phase changes
 */
export interface PhaseChangedEvent extends GameEvent {
  type: GameEventType.PHASE_CHANGED;
  oldPhase: Phase;
  newPhase: Phase;
  activePlayer: PlayerId;
}

/**
 * Event emitted when a turn starts
 */
export interface TurnStartEvent extends GameEvent {
  type: GameEventType.TURN_START;
  turnNumber: number;
  activePlayer: PlayerId;
}

/**
 * Event emitted when a turn ends
 */
export interface TurnEndEvent extends GameEvent {
  type: GameEventType.TURN_END;
  turnNumber: number;
  activePlayer: PlayerId;
}

/**
 * Event emitted when the game ends
 */
export interface GameOverEvent extends GameEvent {
  type: GameEventType.GAME_OVER;
  winner: PlayerId | null;
  reason: string;
}

/**
 * Event emitted when game state changes
 * Listeners should fetch the current state when this is emitted
 */
export interface StateChangedEvent extends GameEvent {
  type: GameEventType.STATE_CHANGED;
}

/**
 * Event emitted when an error occurs
 */
export interface ErrorEvent extends GameEvent {
  type: GameEventType.ERROR;
  error: Error;
  context?: Record<string, any>;
}

/**
 * Event emitted when AI starts thinking about a decision
 */
export interface AIThinkingStartEvent extends GameEvent {
  type: GameEventType.AI_THINKING_START;
  playerId: PlayerId;
  decisionType: string;
  optionsCount: number;
}

/**
 * Event emitted when AI finishes thinking about a decision
 */
export interface AIThinkingEndEvent extends GameEvent {
  type: GameEventType.AI_THINKING_END;
  playerId: PlayerId;
  decisionType: string;
  thinkingTimeMs: number;
}

/**
 * Event emitted when AI selects an action
 */
export interface AIActionSelectedEvent extends GameEvent {
  type: GameEventType.AI_ACTION_SELECTED;
  playerId: PlayerId;
  decisionType: string;
  selectedOption: any;
  evaluationScore?: number;
  allOptions?: any[];
}

/**
 * Event emitted when an effect is triggered
 */
export interface EffectTriggeredEvent extends GameEvent {
  type: GameEventType.EFFECT_TRIGGERED;
  effectId: string;
  sourceCardId: string;
  sourceCardName: string;
  effectType: string;
  effectLabel: string;
  controllerId: PlayerId;
  targets?: Array<{ cardId: string; cardName: string }>;
  values?: Record<string, any>;
}

/**
 * Event emitted when an effect is resolved
 */
export interface EffectResolvedEvent extends GameEvent {
  type: GameEventType.EFFECT_RESOLVED;
  effectId: string;
  sourceCardId: string;
  sourceCardName: string;
  effectType: string;
  effectLabel: string;
  controllerId: PlayerId;
  targets?: Array<{ cardId: string; cardName: string }>;
  result: string;
}

/**
 * Event emitted when an effect is awaiting player input
 */
export interface EffectAwaitingInputEvent extends GameEvent {
  type: GameEventType.EFFECT_AWAITING_INPUT;
  effectId: string;
  sourceCardId: string;
  sourceCardName: string;
  effectType: string;
  effectLabel: string;
  controllerId: PlayerId;
  inputType: string;
  options?: any[];
}

/**
 * Union type of all possible game events
 */
export type AnyGameEvent =
  | CardMovedEvent
  | CardStateChangedEvent
  | PowerChangedEvent
  | AttackDeclaredEvent
  | BlockDeclaredEvent
  | CounterStepStartEvent
  | BattleEndEvent
  | PhaseChangedEvent
  | TurnStartEvent
  | TurnEndEvent
  | GameOverEvent
  | StateChangedEvent
  | ErrorEvent
  | AIThinkingStartEvent
  | AIThinkingEndEvent
  | AIActionSelectedEvent
  | EffectTriggeredEvent
  | EffectResolvedEvent
  | EffectAwaitingInputEvent;

/**
 * Type-safe event handler function
 */
export type EventHandler<T extends AnyGameEvent = AnyGameEvent> = (event: T) => void;

/**
 * Event filter function for subscription filtering
 */
export type EventFilter<T extends AnyGameEvent = AnyGameEvent> = (event: T) => boolean;

/**
 * Subscription object returned when subscribing to events
 */
export interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Internal subscription entry
 */
interface SubscriptionEntry<T extends AnyGameEvent = AnyGameEvent> {
  handler: EventHandler<T>;
  filter?: EventFilter<T>;
}

/**
 * Type-safe event emitter for game events
 * Supports event filtering and subscription management
 */
export class EventEmitter {
  private subscriptions: Map<GameEventType, SubscriptionEntry[]>;
  private wildcardSubscriptions: SubscriptionEntry<AnyGameEvent>[];

  constructor() {
    this.subscriptions = new Map();
    this.wildcardSubscriptions = [];
  }

  /**
   * Subscribe to a specific event type
   * @param eventType The type of event to listen for
   * @param handler The handler function to call when the event is emitted
   * @param filter Optional filter function to selectively receive events
   * @returns Subscription object with unsubscribe method
   */
  on<T extends AnyGameEvent>(
    eventType: T['type'],
    handler: EventHandler<T>,
    filter?: EventFilter<T>
  ): EventSubscription {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const entry: SubscriptionEntry<T> = { handler, filter };
    this.subscriptions.get(eventType)!.push(entry as SubscriptionEntry);

    return {
      unsubscribe: () => this.off(eventType, handler),
    };
  }

  /**
   * Subscribe to all event types
   * @param handler The handler function to call for any event
   * @param filter Optional filter function to selectively receive events
   * @returns Subscription object with unsubscribe method
   */
  onAny(
    handler: EventHandler<AnyGameEvent>,
    filter?: EventFilter<AnyGameEvent>
  ): EventSubscription {
    const entry: SubscriptionEntry<AnyGameEvent> = { handler, filter };
    this.wildcardSubscriptions.push(entry);

    return {
      unsubscribe: () => this.offAny(handler),
    };
  }

  /**
   * Unsubscribe from a specific event type
   * @param eventType The type of event to stop listening for
   * @param handler The handler function to remove
   */
  off<T extends AnyGameEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    const handlers = this.subscriptions.get(eventType);
    if (!handlers) return;

    const index = handlers.findIndex((entry) => entry.handler === handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }

    // Clean up empty subscription lists
    if (handlers.length === 0) {
      this.subscriptions.delete(eventType);
    }
  }

  /**
   * Unsubscribe from all event types
   * @param handler The handler function to remove
   */
  offAny(handler: EventHandler<AnyGameEvent>): void {
    const index = this.wildcardSubscriptions.findIndex((entry) => entry.handler === handler);
    if (index !== -1) {
      this.wildcardSubscriptions.splice(index, 1);
    }
  }

  /**
   * Emit an event to all subscribed handlers
   * @param event The event to emit
   */
  emit<T extends AnyGameEvent>(event: T): void {
    // Add timestamp if not present
    if (!event.timestamp) {
      (event as any).timestamp = Date.now();
    }

    // Emit to specific event type subscribers
    const handlers = this.subscriptions.get(event.type);
    if (handlers) {
      for (const entry of handlers) {
        if (!entry.filter || entry.filter(event)) {
          try {
            entry.handler(event);
          } catch (error) {
            console.error(`Error in event handler for ${event.type}:`, error);
          }
        }
      }
    }

    // Emit to wildcard subscribers
    for (const entry of this.wildcardSubscriptions) {
      if (!entry.filter || entry.filter(event)) {
        try {
          entry.handler(event);
        } catch (error) {
          console.error(`Error in wildcard event handler for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Remove all event subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.wildcardSubscriptions = [];
  }

  /**
   * Get the number of subscriptions for a specific event type
   * @param eventType The event type to check
   * @returns The number of subscriptions
   */
  getSubscriptionCount(eventType: GameEventType): number {
    return this.subscriptions.get(eventType)?.length ?? 0;
  }

  /**
   * Get the total number of wildcard subscriptions
   * @returns The number of wildcard subscriptions
   */
  getWildcardSubscriptionCount(): number {
    return this.wildcardSubscriptions.length;
  }

  /**
   * Check if there are any subscriptions for a specific event type
   * @param eventType The event type to check
   * @returns True if there are subscriptions
   */
  hasSubscriptions(eventType: GameEventType): boolean {
    return this.getSubscriptionCount(eventType) > 0 || this.wildcardSubscriptions.length > 0;
  }
}
