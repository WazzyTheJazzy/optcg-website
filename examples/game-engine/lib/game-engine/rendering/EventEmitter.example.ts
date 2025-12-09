/**
 * Example usage of the EventEmitter system
 * This file demonstrates how to use the event emission system
 */

import {
  EventEmitter,
  GameEventType,
  CardMovedEvent,
  PhaseChangedEvent,
  AttackDeclaredEvent,
  GameOverEvent,
} from './EventEmitter';
import { PlayerId, ZoneId, Phase } from '../core/types';

// Create an event emitter instance
const emitter = new EventEmitter();

// Example 1: Subscribe to a specific event type
console.log('Example 1: Basic subscription');
const cardMovedHandler = (event: CardMovedEvent) => {
  console.log(
    `Card ${event.cardId} moved from ${event.fromZone} to ${event.toZone} for player ${event.playerId}`
  );
};

emitter.on(GameEventType.CARD_MOVED, cardMovedHandler);

// Emit a card moved event
emitter.emit({
  type: GameEventType.CARD_MOVED,
  timestamp: Date.now(),
  cardId: 'card-123',
  playerId: PlayerId.PLAYER_1,
  fromZone: ZoneId.HAND,
  toZone: ZoneId.CHARACTER_AREA,
});

// Example 2: Subscribe with filtering
console.log('\nExample 2: Filtered subscription');
const player1OnlyHandler = (event: CardMovedEvent) => {
  console.log(`Player 1 moved card ${event.cardId}`);
};

emitter.on(
  GameEventType.CARD_MOVED,
  player1OnlyHandler,
  (event) => event.playerId === PlayerId.PLAYER_1
);

// This will trigger the filtered handler
emitter.emit({
  type: GameEventType.CARD_MOVED,
  timestamp: Date.now(),
  cardId: 'card-456',
  playerId: PlayerId.PLAYER_1,
  fromZone: ZoneId.DECK,
  toZone: ZoneId.HAND,
});

// This will NOT trigger the filtered handler
emitter.emit({
  type: GameEventType.CARD_MOVED,
  timestamp: Date.now(),
  cardId: 'card-789',
  playerId: PlayerId.PLAYER_2,
  fromZone: ZoneId.DECK,
  toZone: ZoneId.HAND,
});

// Example 3: Wildcard subscription (listen to all events)
console.log('\nExample 3: Wildcard subscription');
const allEventsHandler = (event: any) => {
  console.log(`Event occurred: ${event.type}`);
};

emitter.onAny(allEventsHandler);

// Emit various event types
emitter.emit({
  type: GameEventType.PHASE_CHANGED,
  timestamp: Date.now(),
  oldPhase: Phase.MAIN,
  newPhase: Phase.END,
  activePlayer: PlayerId.PLAYER_1,
} as PhaseChangedEvent);

emitter.emit({
  type: GameEventType.ATTACK_DECLARED,
  timestamp: Date.now(),
  attackerId: 'attacker-1',
  targetId: 'target-1',
  attackingPlayerId: PlayerId.PLAYER_1,
  defendingPlayerId: PlayerId.PLAYER_2,
} as AttackDeclaredEvent);

// Example 4: Unsubscribe using subscription object
console.log('\nExample 4: Unsubscribe');
const tempHandler = (event: GameOverEvent) => {
  console.log(`Game over! Winner: ${event.winner}`);
};

const subscription = emitter.on(GameEventType.GAME_OVER, tempHandler);

// This will trigger the handler
emitter.emit({
  type: GameEventType.GAME_OVER,
  timestamp: Date.now(),
  winner: PlayerId.PLAYER_1,
  reason: 'Deck out',
} as GameOverEvent);

// Unsubscribe
subscription.unsubscribe();

// This will NOT trigger the handler (already unsubscribed)
emitter.emit({
  type: GameEventType.GAME_OVER,
  timestamp: Date.now(),
  winner: PlayerId.PLAYER_2,
  reason: 'Life depletion',
} as GameOverEvent);

// Example 5: Multiple handlers for the same event
console.log('\nExample 5: Multiple handlers');
const handler1 = () => console.log('Handler 1 called');
const handler2 = () => console.log('Handler 2 called');
const handler3 = () => console.log('Handler 3 called');

emitter.on(GameEventType.TURN_START, handler1);
emitter.on(GameEventType.TURN_START, handler2);
emitter.on(GameEventType.TURN_START, handler3);

emitter.emit({
  type: GameEventType.TURN_START,
  timestamp: Date.now(),
  turnNumber: 1,
  activePlayer: PlayerId.PLAYER_1,
});

// Example 6: Check subscription status
console.log('\nExample 6: Subscription queries');
console.log(
  `CARD_MOVED subscriptions: ${emitter.getSubscriptionCount(GameEventType.CARD_MOVED)}`
);
console.log(
  `TURN_START subscriptions: ${emitter.getSubscriptionCount(GameEventType.TURN_START)}`
);
console.log(`Wildcard subscriptions: ${emitter.getWildcardSubscriptionCount()}`);
console.log(
  `Has PHASE_CHANGED subscriptions: ${emitter.hasSubscriptions(GameEventType.PHASE_CHANGED)}`
);

// Example 7: Clear all subscriptions
console.log('\nExample 7: Clear all subscriptions');
emitter.clear();
console.log(`After clear - CARD_MOVED subscriptions: ${emitter.getSubscriptionCount(GameEventType.CARD_MOVED)}`);
console.log(`After clear - Wildcard subscriptions: ${emitter.getWildcardSubscriptionCount()}`);

console.log('\nAll examples completed!');
