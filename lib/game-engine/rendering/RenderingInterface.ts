/**
 * RenderingInterface.ts
 * 
 * Bridge between the game engine and Three.js visualization layer.
 * Provides event subscriptions, state queries, and animation hooks for rendering.
 * Maintains separation between game logic and visual presentation.
 */

import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameState';
import {
  EventEmitter,
  GameEventType,
  CardMovedEvent,
  CardStateChangedEvent,
  PowerChangedEvent,
  AttackDeclaredEvent,
  BlockDeclaredEvent,
  CounterStepStartEvent,
  BattleEndEvent,
  PhaseChangedEvent,
  TurnStartEvent,
  TurnEndEvent,
  GameOverEvent,
  StateChangedEvent,
  EffectTriggeredEvent,
  EffectResolvedEvent,
  EffectAwaitingInputEvent,
  AnyGameEvent,
  EventHandler,
} from './EventEmitter';
import {
  PlayerId,
  ZoneId,
  CardState,
  Phase,
  CardInstance,
  DonInstance,
  CardCategory,
} from '../core/types';

/**
 * Visual state of a card for rendering
 */
export interface CardVisualState {
  id: string;
  position: {
    zone: ZoneId;
    index: number;
  };
  state: CardState;
  power: number;
  cost: number;
  givenDonCount: number;
  metadata: CardMetadata;
}

/**
 * Metadata about a card for special visual effects
 */
export interface CardMetadata {
  isAltArt: boolean;
  isPromo: boolean;
  isLeader: boolean;
  rarity: string;
  colors: string[];
  category: CardCategory;
  name: string;
  imageUrl: string;
}

/**
 * Complete board visual state for rendering
 */
export interface BoardVisualState {
  player1: PlayerVisualState;
  player2: PlayerVisualState;
  activePlayer: PlayerId;
  phase: Phase;
  turnNumber: number;
  gameOver: boolean;
  winner: PlayerId | null;
}

/**
 * Visual state of a player's board
 */
export interface PlayerVisualState {
  id: PlayerId;
  zones: {
    deck: CardVisualState[];
    hand: CardVisualState[];
    trash: CardVisualState[];
    life: CardVisualState[];
    donDeck: DonVisualState[];
    costArea: DonVisualState[];
    leaderArea: CardVisualState | null;
    characterArea: CardVisualState[];
    stageArea: CardVisualState | null;
  };
}

/**
 * Visual state of a DON card
 */
export interface DonVisualState {
  id: string;
  zone: ZoneId;
  state: CardState;
  owner: PlayerId;
}

/**
 * Animation hook for future animation system
 */
export interface AnimationHook {
  id: string;
  trigger: GameEventType;
  duration: number;
  callback: () => void | Promise<void>;
}

/**
 * RenderingInterface provides a bridge between game engine and Three.js
 */
export class RenderingInterface {
  private eventEmitter: EventEmitter;
  private engine: GameEngine;
  private animationHooks: Map<string, AnimationHook>;
  private pendingAnimations: Map<string, Promise<void>>;

  /**
   * Create a new RenderingInterface
   * @param engine - The game engine instance
   */
  constructor(engine: GameEngine) {
    this.eventEmitter = engine.getEventEmitter();
    this.engine = engine;
    this.animationHooks = new Map();
    this.pendingAnimations = new Map();
  }

  /**
   * Get the current state manager from the engine
   * This returns the engine's actual state manager, not a copy
   */
  private getStateManager(): GameStateManager {
    return this.engine.getStateManager();
  }

  // ============================================================================
  // Event Subscription Methods
  // ============================================================================

  /**
   * Subscribe to card movement events
   * @param handler - Handler function for card moved events
   */
  onCardMoved(handler: EventHandler<CardMovedEvent>): void {
    this.eventEmitter.on(GameEventType.CARD_MOVED, handler);
  }

  /**
   * Subscribe to card state change events (ACTIVE/RESTED)
   * @param handler - Handler function for card state changed events
   */
  onCardStateChanged(handler: EventHandler<CardStateChangedEvent>): void {
    this.eventEmitter.on(GameEventType.CARD_STATE_CHANGED, handler);
  }

  /**
   * Subscribe to power change events
   * @param handler - Handler function for power changed events
   */
  onPowerChanged(handler: EventHandler<PowerChangedEvent>): void {
    this.eventEmitter.on(GameEventType.POWER_CHANGED, handler);
  }

  /**
   * Subscribe to battle events (attack, block, counter, end)
   * @param handler - Handler function for battle events
   */
  onBattleEvent(
    handler: EventHandler<
      | AttackDeclaredEvent
      | BlockDeclaredEvent
      | CounterStepStartEvent
      | BattleEndEvent
    >
  ): void {
    this.eventEmitter.on(GameEventType.ATTACK_DECLARED, handler as EventHandler<AttackDeclaredEvent>);
    this.eventEmitter.on(GameEventType.BLOCK_DECLARED, handler as EventHandler<BlockDeclaredEvent>);
    this.eventEmitter.on(GameEventType.COUNTER_STEP_START, handler as EventHandler<CounterStepStartEvent>);
    this.eventEmitter.on(GameEventType.BATTLE_END, handler as EventHandler<BattleEndEvent>);
  }

  /**
   * Subscribe to phase change events
   * @param handler - Handler function for phase changed events
   */
  onPhaseChanged(handler: EventHandler<PhaseChangedEvent>): void {
    this.eventEmitter.on(GameEventType.PHASE_CHANGED, handler);
  }

  /**
   * Subscribe to turn start events
   * @param handler - Handler function for turn start events
   */
  onTurnStart(handler: EventHandler<TurnStartEvent>): void {
    this.eventEmitter.on(GameEventType.TURN_START, handler);
  }

  /**
   * Subscribe to turn end events
   * @param handler - Handler function for turn end events
   */
  onTurnEnd(handler: EventHandler<TurnEndEvent>): void {
    this.eventEmitter.on(GameEventType.TURN_END, handler);
  }

  /**
   * Subscribe to game over events
   * @param handler - Handler function for game over events
   */
  onGameOver(handler: EventHandler<GameOverEvent>): void {
    this.eventEmitter.on(GameEventType.GAME_OVER, handler);
  }

  /**
   * Subscribe to general state change events
   * This is emitted after any state-modifying operation completes
   * @param handler - Handler function for state changed events
   */
  onStateChanged(handler: EventHandler<StateChangedEvent>): void {
    this.eventEmitter.on(GameEventType.STATE_CHANGED, handler);
  }

  /**
   * Subscribe to effect events (triggered, resolved, awaiting input)
   * @param handler - Handler function for effect events
   */
  onEffectEvent(
    handler: EventHandler<
      | EffectTriggeredEvent
      | EffectResolvedEvent
      | EffectAwaitingInputEvent
    >
  ): void {
    this.eventEmitter.on(GameEventType.EFFECT_TRIGGERED, handler as EventHandler<EffectTriggeredEvent>);
    this.eventEmitter.on(GameEventType.EFFECT_RESOLVED, handler as EventHandler<EffectResolvedEvent>);
    this.eventEmitter.on(GameEventType.EFFECT_AWAITING_INPUT, handler as EventHandler<EffectAwaitingInputEvent>);
  }

  // ============================================================================
  // State Query Methods
  // ============================================================================

  /**
   * Get the visual state of a specific card
   * @param cardId - The card instance ID
   * @returns The card's visual state or null if not found
   */
  getCardVisualState(cardId: string): CardVisualState | null {
    const card = this.getStateManager().getCard(cardId);
    if (!card) return null;

    return this.cardToVisualState(card);
  }

  /**
   * Get the contents of a zone as visual states
   * @param playerId - The player ID
   * @param zone - The zone ID
   * @param stateManager - Optional state manager to reuse (avoids creating multiple copies)
   * @returns Array of card visual states in the zone
   */
  getZoneContents(playerId: PlayerId, zone: ZoneId, stateManager?: GameStateManager): CardVisualState[] {
    const sm = stateManager || this.getStateManager();
    const zoneContents = sm.getZone(playerId, zone);
    
    return zoneContents
      .filter((item): item is CardInstance => 'definition' in item)
      .map((card, index) => ({
        ...this.cardToVisualState(card),
        position: { zone, index },
      }));
  }

  /**
   * Get the DON contents of a zone
   * @param playerId - The player ID
   * @param zone - The zone ID (DON_DECK or COST_AREA)
   * @param stateManager - Optional state manager to reuse (avoids creating multiple copies)
   * @returns Array of DON visual states in the zone
   */
  getDonZoneContents(playerId: PlayerId, zone: ZoneId, stateManager?: GameStateManager): DonVisualState[] {
    const sm = stateManager || this.getStateManager();
    const zoneContents = sm.getZone(playerId, zone);
    
    return zoneContents
      .filter((item): item is DonInstance => !('definition' in item))
      .map((don) => this.donToVisualState(don));
  }

  /**
   * Get the complete board state for rendering
   * @returns The complete board visual state
   */
  getBoardState(): BoardVisualState {
    const stateManager = this.getStateManager();
    const state = stateManager.getState();
    
    return {
      player1: this.getPlayerVisualState(PlayerId.PLAYER_1, stateManager),
      player2: this.getPlayerVisualState(PlayerId.PLAYER_2, stateManager),
      activePlayer: state.activePlayer,
      phase: state.phase,
      turnNumber: state.turnNumber,
      gameOver: state.gameOver,
      winner: state.winner,
    };
  }

  /**
   * Get a player's visual state
   * @param playerId - The player ID
   * @param stateManager - Optional state manager to reuse (avoids creating multiple copies)
   * @returns The player's visual state
   */
  private getPlayerVisualState(playerId: PlayerId, stateManager?: GameStateManager): PlayerVisualState {
    const sm = stateManager || this.getStateManager();
    const player = sm.getPlayer(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    return {
      id: playerId,
      zones: {
        deck: this.getZoneContents(playerId, ZoneId.DECK, sm),
        hand: this.getZoneContents(playerId, ZoneId.HAND, sm),
        trash: this.getZoneContents(playerId, ZoneId.TRASH, sm),
        life: this.getZoneContents(playerId, ZoneId.LIFE, sm),
        donDeck: this.getDonZoneContents(playerId, ZoneId.DON_DECK, sm),
        costArea: this.getDonZoneContents(playerId, ZoneId.COST_AREA, sm),
        leaderArea: player.zones.leaderArea
          ? this.cardToVisualState(player.zones.leaderArea)
          : null,
        characterArea: this.getZoneContents(playerId, ZoneId.CHARACTER_AREA, sm),
        stageArea: player.zones.stageArea
          ? this.cardToVisualState(player.zones.stageArea)
          : null,
      },
    };
  }

  // ============================================================================
  // Animation Hook System (Placeholder for Future)
  // ============================================================================

  /**
   * Register an animation hook for a specific event type
   * @param hook - The animation hook to register
   */
  registerAnimationHook(hook: AnimationHook): void {
    this.animationHooks.set(hook.id, hook);

    // Subscribe to the trigger event
    this.eventEmitter.on(hook.trigger, async () => {
      // Execute the animation callback
      const result = hook.callback();
      
      // If callback returns a promise, track it
      if (result instanceof Promise) {
        this.pendingAnimations.set(hook.id, result);
        
        try {
          await result;
        } finally {
          this.pendingAnimations.delete(hook.id);
        }
      }
    });
  }

  /**
   * Wait for a specific animation to complete
   * @param animationId - The animation hook ID
   * @returns Promise that resolves when animation completes
   */
  async waitForAnimation(animationId: string): Promise<void> {
    const pending = this.pendingAnimations.get(animationId);
    if (pending) {
      await pending;
    }
  }

  /**
   * Wait for all pending animations to complete
   * @returns Promise that resolves when all animations complete
   */
  async waitForAllAnimations(): Promise<void> {
    await Promise.all(Array.from(this.pendingAnimations.values()));
  }

  /**
   * Unregister an animation hook
   * @param animationId - The animation hook ID to remove
   */
  unregisterAnimationHook(animationId: string): void {
    this.animationHooks.delete(animationId);
  }

  /**
   * Clear all animation hooks
   */
  clearAnimationHooks(): void {
    this.animationHooks.clear();
  }

  // ============================================================================
  // Metadata Methods
  // ============================================================================

  /**
   * Get card metadata for special effects
   * @param cardId - The card instance ID
   * @returns Card metadata or null if not found
   */
  getCardMetadata(cardId: string): CardMetadata | null {
    const card = this.getStateManager().getCard(cardId);
    if (!card) return null;

    return this.extractCardMetadata(card);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert a card instance to visual state
   */
  private cardToVisualState(card: CardInstance): CardVisualState {
    // Calculate current power (base + modifiers + given DON)
    const basePower = card.definition.basePower ?? 0;
    const modifierPower = card.modifiers
      .filter(m => m.type === 'POWER')
      .reduce((sum, m) => sum + (typeof m.value === 'number' ? m.value : 0), 0);
    const donPower = card.givenDon.length * 1000; // Each DON adds 1000 power
    const currentPower = basePower + modifierPower + donPower;

    // Calculate current cost (base + modifiers, clamped to 0)
    const baseCost = card.definition.baseCost ?? 0;
    const modifierCost = card.modifiers
      .filter(m => m.type === 'COST')
      .reduce((sum, m) => sum + (typeof m.value === 'number' ? m.value : 0), 0);
    const currentCost = Math.max(0, baseCost + modifierCost);

    // Find the card's index in its zone
    const player = this.getStateManager().getPlayer(card.owner);
    let index = 0;
    if (player) {
      const zone = this.getStateManager().getZone(card.owner, card.zone);
      index = zone.findIndex(item => 'id' in item && item.id === card.id);
      if (index === -1) index = 0;
    }

    return {
      id: card.id,
      position: {
        zone: card.zone,
        index,
      },
      state: card.state,
      power: currentPower,
      cost: currentCost,
      givenDonCount: card.givenDon.length,
      metadata: this.extractCardMetadata(card),
    };
  }

  /**
   * Convert a DON instance to visual state
   */
  private donToVisualState(don: DonInstance): DonVisualState {
    return {
      id: don.id,
      zone: don.zone,
      state: don.state,
      owner: don.owner,
    };
  }

  /**
   * Extract metadata from a card instance
   */
  private extractCardMetadata(card: CardInstance): CardMetadata {
    return {
      isAltArt: card.definition.metadata.isAltArt,
      isPromo: card.definition.metadata.isPromo,
      isLeader: card.definition.category === CardCategory.LEADER,
      rarity: card.definition.rarity,
      colors: card.definition.colors,
      category: card.definition.category,
      name: card.definition.name,
      imageUrl: card.definition.imageUrl,
    };
  }
}
