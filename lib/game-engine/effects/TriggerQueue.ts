/**
 * TriggerQueue.ts
 * 
 * Manages auto triggers for the One Piece TCG Engine.
 * Handles trigger queuing, priority ordering, and resolution.
 * 
 * Key behaviors:
 * - Turn player's triggers resolve first, then non-turn player's triggers
 * - Newly created triggers during resolution are re-queued and resolved
 * - Triggers are resolved one at a time to maintain proper game state
 */

import { GameStateManager } from '../core/GameState';
import { EffectSystem } from './EffectSystem';
import {
  TriggerInstance,
  EffectInstance,
  PlayerId,
  Target,
  GameEvent,
} from '../core/types';

/**
 * Error thrown when trigger queue operations fail
 */
export class TriggerQueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TriggerQueueError';
  }
}

/**
 * TriggerQueue manages auto trigger resolution
 */
export class TriggerQueue {
  private stateManager: GameStateManager;
  private effectSystem: EffectSystem;
  private queue: TriggerInstance[];

  constructor(stateManager: GameStateManager, effectSystem: EffectSystem) {
    this.stateManager = stateManager;
    this.effectSystem = effectSystem;
    this.queue = [];
  }

  /**
   * Add a trigger to the queue
   * 
   * @param trigger - The trigger instance to enqueue
   */
  enqueueTrigger(trigger: TriggerInstance): void {
    this.queue.push(trigger);
  }

  /**
   * Resolve all pending triggers
   * 
   * Partitions triggers by turn player:
   * 1. Resolve all turn player triggers first
   * 2. Then resolve all non-turn player triggers
   * 3. Handle newly created triggers during resolution (re-queue and resolve)
   */
  resolveAllPendingTriggers(): void {
    // Continue resolving until queue is empty
    while (this.queue.length > 0) {
      // Get the active (turn) player
      const turnPlayer = this.stateManager.getActivePlayer();

      // Partition triggers by turn player
      const { turnPlayerTriggers, nonTurnPlayerTriggers } = this.partitionTriggers(turnPlayer);

      // Resolve turn player triggers first
      for (const trigger of turnPlayerTriggers) {
        this.resolveSingleTrigger(trigger);
      }

      // Then resolve non-turn player triggers
      for (const trigger of nonTurnPlayerTriggers) {
        this.resolveSingleTrigger(trigger);
      }

      // Clear the processed triggers
      this.queue = [];

      // Check if new triggers were added during resolution
      // (they would be in the state's pendingTriggers)
      const newTriggers = this.stateManager.getState().pendingTriggers;
      if (newTriggers.length > 0) {
        // Re-queue new triggers
        this.queue = [...newTriggers];
        // Clear from state
        this.stateManager = this.stateManager.clearPendingTriggers();
        this.effectSystem.updateStateManager(this.stateManager);
      }
    }
  }

  /**
   * Resolve a single trigger
   * 
   * Builds an effect instance from the trigger and resolves it through the effect system
   * 
   * @param trigger - The trigger instance to resolve
   */
  resolveSingleTrigger(trigger: TriggerInstance): void {
    try {
      // Build effect instance from trigger
      const effectInstance: EffectInstance = {
        effectDefinition: trigger.effectDefinition,
        source: trigger.source,
        controller: trigger.controller,
        targets: this.chooseTargets(trigger),
        values: new Map(),
        context: null,
      };

      // Resolve the effect through the effect system
      this.effectSystem.resolveEffect(effectInstance);

      // Update our state manager reference after resolution
      this.stateManager = this.effectSystem.getStateManager();
    } catch (error) {
      // Log error but continue processing other triggers
      console.error(
        `Error resolving trigger for card ${trigger.source.id}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Partition triggers by turn player
   * 
   * @param turnPlayer - The active player ID
   * @returns Object with turnPlayerTriggers and nonTurnPlayerTriggers arrays
   */
  private partitionTriggers(turnPlayer: PlayerId): {
    turnPlayerTriggers: TriggerInstance[];
    nonTurnPlayerTriggers: TriggerInstance[];
  } {
    const turnPlayerTriggers: TriggerInstance[] = [];
    const nonTurnPlayerTriggers: TriggerInstance[] = [];

    for (const trigger of this.queue) {
      if (trigger.controller === turnPlayer) {
        turnPlayerTriggers.push(trigger);
      } else {
        nonTurnPlayerTriggers.push(trigger);
      }
    }

    // Sort by priority within each group (higher priority first)
    turnPlayerTriggers.sort((a, b) => b.priority - a.priority);
    nonTurnPlayerTriggers.sort((a, b) => b.priority - a.priority);

    return { turnPlayerTriggers, nonTurnPlayerTriggers };
  }

  /**
   * Choose targets for a trigger
   * 
   * For now, this is a placeholder that returns empty targets.
   * In a full implementation, this would involve player choices or automatic target selection
   * based on the effect definition.
   * 
   * @param trigger - The trigger instance
   * @returns Array of targets for the effect
   */
  private chooseTargets(trigger: TriggerInstance): Target[] {
    // TODO: Implement target selection logic
    // This would involve:
    // - Checking if effect requires targets
    // - Querying player for target choices (if manual)
    // - Automatically selecting targets (if automatic)
    // - Validating target legality
    
    // For now, return empty array (effects without targets will work)
    return [];
  }

  /**
   * Get the current queue size
   * 
   * @returns Number of triggers in the queue
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Update the internal state manager reference
   * This should be called after external state updates
   * 
   * @param stateManager - The new state manager
   */
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
    this.effectSystem.updateStateManager(stateManager);
  }

  /**
   * Get the current state manager
   * 
   * @returns The current state manager
   */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }
}
