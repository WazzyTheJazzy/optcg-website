/**
 * Rendering module exports
 * This module provides the bridge between the game engine and the rendering layer
 */

export {
  EventEmitter,
  GameEventType,
  type GameEvent,
  type CardMovedEvent,
  type CardStateChangedEvent,
  type PowerChangedEvent,
  type AttackDeclaredEvent,
  type BlockDeclaredEvent,
  type CounterStepStartEvent,
  type BattleEndEvent,
  type PhaseChangedEvent,
  type TurnStartEvent,
  type TurnEndEvent,
  type GameOverEvent,
  type AnyGameEvent,
  type EventHandler,
  type EventFilter,
  type EventSubscription,
} from './EventEmitter';
