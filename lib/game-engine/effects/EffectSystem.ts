/**
 * EffectSystem.ts
 * 
 * Core effect resolution orchestration for the One Piece TCG Engine.
 * Handles effect activation, condition checking, cost payment, script execution,
 * effect triggering, stack management, and target determination.
 */

import { GameStateManager } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import { ReplacementEffectHandler } from './ReplacementEffectHandler';
import {
  EffectDefinition,
  EffectInstance,
  EffectContext,
  CardInstance,
  PlayerId,
  Target,
  ConditionExpr,
  CostExpr,
  ZoneId,
  CardState,
  EffectTimingType,
  TriggerTiming,
  GameEvent,
  GameEventType,
  CardCategory,
  Color,
  Phase,
} from '../core/types';
import {
  EffectStackEntry,
  TargetFilter,
  TargetType,
} from './types';

/**
 * Error thrown when an effect operation fails
 */
export class EffectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EffectError';
  }
}

/**
 * Type for effect script functions
 */
export type EffectScript = (context: EffectContext) => void;

/**
 * Registry mapping script IDs to effect script functions
 */
export type EffectScriptRegistry = Map<string, EffectScript>;

/**
 * EffectSystem orchestrates effect resolution
 */
export class EffectSystem {
  private stateManager: GameStateManager;
  private eventEmitter: EventEmitter;
  private zoneManager: ZoneManager;
  private scriptRegistry: EffectScriptRegistry;
  private replacementHandler: ReplacementEffectHandler;
  private effectStack: EffectStackEntry[];
  private nextEffectInstanceId: number;
  private stateSnapshot: any | null;

  constructor(
    stateManager: GameStateManager,
    eventEmitter: EventEmitter,
    zoneManager: ZoneManager,
    scriptRegistry?: EffectScriptRegistry,
    replacementHandler?: ReplacementEffectHandler
  ) {
    this.stateManager = stateManager;
    this.eventEmitter = eventEmitter;
    this.zoneManager = zoneManager;
    this.scriptRegistry = scriptRegistry || new Map();
    this.replacementHandler = replacementHandler || new ReplacementEffectHandler(stateManager);
    this.effectStack = [];
    this.nextEffectInstanceId = 1;
    this.stateSnapshot = null;
  }

  /**
   * Create a snapshot of the current game state for transaction rollback
   */
  private createStateSnapshot(): any {
    const state = this.stateManager.getState();
    // Deep clone the state using JSON serialization
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Restore game state from a snapshot
   */
  private restoreStateSnapshot(snapshot: any): void {
    if (snapshot) {
      this.stateManager.setState(snapshot);
      // Update zone manager with restored state
      this.zoneManager.updateStateManager(this.stateManager);
    }
  }

  /**
   * Update the state manager reference (used after state restoration)
   */
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
  }

  /**
   * Activate an effect
   * Checks conditions, pays cost, chooses targets/values, and resolves the effect
   * 
   * @param cardId - The card with the effect
   * @param effectId - The effect definition ID
   * @param targets - The targets for the effect
   * @param values - Additional values for the effect
   * @returns True if effect was successfully activated
   * @throws EffectError if activation fails
   */
  activateEffect(
    cardId: string,
    effectId: string,
    targets: Target[] = [],
    values: Map<string, any> = new Map()
  ): boolean {
    // Get the card
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      throw new EffectError(`Card ${cardId} not found`);
    }

    // Find the effect definition
    const effectDef = card.definition.effects.find(e => e.id === effectId);
    if (!effectDef) {
      throw new EffectError(`Effect ${effectId} not found on card ${cardId}`);
    }

    // Validate effect can be activated (not AUTO or PERMANENT)
    if (effectDef.timingType !== EffectTimingType.ACTIVATE) {
      throw new EffectError(
        `Effect ${effectId} has timing type ${effectDef.timingType}, cannot be manually activated`
      );
    }

    // Check phase timing for [Activate: Main] effects
    if (effectDef.label && effectDef.label.toLowerCase().includes('activate: main')) {
      const currentPhase = this.stateManager.getState().phase;
      if (currentPhase !== Phase.MAIN) {
        throw new EffectError(
          `Effect ${effectId} can only be activated during the Main phase, current phase is ${currentPhase}`
        );
      }
    }

    // Check once-per-turn restriction
    if (effectDef.oncePerTurn) {
      const usedThisTurn = card.flags.get(`effect_${effectId}_used_turn`) === this.stateManager.getTurnNumber();
      if (usedThisTurn) {
        throw new EffectError(`Effect ${effectId} has already been used this turn`);
      }
    }

    // Check condition
    if (effectDef.condition) {
      const context = this.createEffectContext(card, card.controller, targets, values, null);
      if (!this.checkCondition(effectDef.condition, context)) {
        throw new EffectError(`Effect ${effectId} condition not met`);
      }
    }

    // Verify and pay cost (with replacement effects applied)
    if (effectDef.cost) {
      // Create state snapshot before attempting cost payment
      this.stateSnapshot = this.createStateSnapshot();
      
      try {
        // Create temporary context for cost replacement
        const tempContext = this.createEffectContext(card, card.controller, targets, values, null);
        
        // Apply cost replacement effects
        const modifiedCost = this.replacementHandler.applyCostReplacementEffects(
          effectDef.cost,
          tempContext
        );
        
        // Verify player can pay the cost before attempting
        if (!this.canPayCost(modifiedCost, card.controller)) {
          // Rollback state
          this.restoreStateSnapshot(this.stateSnapshot);
          this.stateSnapshot = null;
          throw new EffectError(`Cannot afford cost for effect ${effectId}`);
        }
        
        // Pay the cost
        if (!this.payCost(modifiedCost, card.controller)) {
          // Rollback state if cost payment fails
          this.restoreStateSnapshot(this.stateSnapshot);
          this.stateSnapshot = null;
          throw new EffectError(`Failed to pay cost for effect ${effectId}`);
        }
        
        // Cost paid successfully, clear snapshot
        this.stateSnapshot = null;
      } catch (error) {
        // Rollback on any error during cost payment
        if (this.stateSnapshot) {
          this.restoreStateSnapshot(this.stateSnapshot);
          this.stateSnapshot = null;
        }
        throw error;
      }
    }

    // Mark effect as used this turn if once-per-turn
    if (effectDef.oncePerTurn) {
      const updatedCard = {
        ...card,
        flags: new Map(card.flags),
      };
      updatedCard.flags.set(`effect_${effectId}_used_turn`, this.stateManager.getTurnNumber());
      this.stateManager = this.stateManager.updateCard(cardId, { flags: updatedCard.flags });
      this.zoneManager.updateStateManager(this.stateManager);
    }

    // Create effect instance
    const effectInstance: EffectInstance = {
      effectDefinition: effectDef,
      source: card,
      controller: card.controller,
      targets,
      values,
      context: null,
    };

    // Emit effect triggered event for activated effects
    this.eventEmitter.emit({
      type: GameEventType.EFFECT_TRIGGERED,
      data: {
        effectId: effectDef.id,
        sourceCardId: card.id,
        sourceName: card.definition.name,
        controller: card.controller,
        effectType: effectDef.effectType,
        triggerTiming: effectDef.triggerTiming,
        label: effectDef.label,
        targets,
        values: Object.fromEntries(values),
      },
    });

    // Resolve the effect
    this.resolveEffect(effectInstance);

    return true;
  }

  /**
   * Check if an effect can be activated
   * Validates timing, conditions, costs, and restrictions without actually activating
   * 
   * @param cardId - The card with the effect
   * @param effectId - The effect definition ID
   * @param playerId - The player attempting to activate
   * @returns True if effect can be activated
   */
  canActivateEffect(
    cardId: string,
    effectId: string,
    playerId: PlayerId
  ): boolean {
    try {
      // Get the card
      const card = this.stateManager.getCard(cardId);
      if (!card) {
        return false;
      }

      // Check if player controls the card
      if (card.controller !== playerId) {
        return false;
      }

      // Find the effect definition
      const effectDef = card.definition.effects.find(e => e.id === effectId);
      if (!effectDef) {
        return false;
      }

      // Validate effect can be activated (not AUTO or PERMANENT)
      if (effectDef.timingType !== EffectTimingType.ACTIVATE) {
        return false;
      }

      // Check phase timing for [Activate: Main] effects
      if (effectDef.label && effectDef.label.toLowerCase().includes('activate: main')) {
        const currentPhase = this.stateManager.getState().phase;
        if (currentPhase !== Phase.MAIN) {
          return false;
        }
      }

      // Check once-per-turn restriction
      if (effectDef.oncePerTurn) {
        const usedThisTurn = card.flags.get(`effect_${effectId}_used_turn`) === this.stateManager.getTurnNumber();
        if (usedThisTurn) {
          return false;
        }
      }

      // Check condition
      if (effectDef.condition) {
        const context = this.createEffectContext(card, card.controller, [], new Map(), null);
        if (!this.checkCondition(effectDef.condition, context)) {
          return false;
        }
      }

      // Check cost
      if (effectDef.cost) {
        const tempContext = this.createEffectContext(card, card.controller, [], new Map(), null);
        const modifiedCost = this.replacementHandler.applyCostReplacementEffects(
          effectDef.cost,
          tempContext
        );
        if (!this.canPayCost(modifiedCost, card.controller)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // If any error occurs during validation, effect cannot be activated
      return false;
    }
  }

  /**
   * Resolve an effect
   * Applies replacement effects and executes the effect script
   * 
   * @param instance - The effect instance to resolve
   * @throws EffectError if resolution fails
   */
  resolveEffect(instance: EffectInstance): void {
    // Emit effect awaiting input event (for UI to show effect is about to resolve)
    this.eventEmitter.emit({
      type: GameEventType.EFFECT_AWAITING_INPUT,
      data: {
        effectId: instance.effectDefinition.id,
        sourceCardId: instance.source.id,
        sourceName: instance.source.definition.name,
        controller: instance.controller,
        effectType: instance.effectDefinition.effectType,
        targets: instance.targets,
        values: Object.fromEntries(instance.values),
        label: instance.effectDefinition.label,
      },
    });

    // Create effect context
    const context = this.createEffectContext(
      instance.source,
      instance.controller,
      instance.targets,
      instance.values,
      null
    );

    // Apply body replacement effects
    const modifiedInstance = this.replacementHandler.applyBodyReplacementEffects(
      instance,
      context
    );

    // Create updated context with modified instance
    const modifiedContext = this.createEffectContext(
      modifiedInstance.source,
      modifiedInstance.controller,
      modifiedInstance.targets,
      modifiedInstance.values,
      null
    );

    // Execute the effect script with modified context
    this.executeScript(modifiedInstance.effectDefinition.scriptId, modifiedContext);

    // Emit effect resolved event
    this.eventEmitter.emit({
      type: GameEventType.EFFECT_RESOLVED,
      data: {
        effectId: instance.effectDefinition.id,
        sourceCardId: instance.source.id,
        sourceName: instance.source.definition.name,
        controller: instance.controller,
        effectType: instance.effectDefinition.effectType,
        targets: instance.targets,
        values: Object.fromEntries(instance.values),
      },
    });
  }

  /**
   * Check if a condition expression evaluates to true
   * 
   * @param condition - The condition expression to evaluate
   * @param context - The effect context
   * @returns True if condition is met
   */
  checkCondition(condition: ConditionExpr, context: EffectContext): boolean {
    switch (condition.type) {
      case 'AND':
        return condition.operands?.every(op => this.checkCondition(op, context)) ?? false;

      case 'OR':
        return condition.operands?.some(op => this.checkCondition(op, context)) ?? false;

      case 'NOT':
        return !(condition.operands?.[0] ? this.checkCondition(condition.operands[0], context) : false);

      case 'COMPARE':
        return this.evaluateComparison(condition, context);

      case 'HAS_KEYWORD':
        return this.checkHasKeyword(condition, context);

      case 'IN_ZONE':
        return this.checkInZone(condition, context);

      case 'IS_COLOR':
        return this.checkIsColor(condition, context);

      default:
        throw new EffectError(`Unknown condition type: ${(condition as any).type}`);
    }
  }

  /**
   * Check if a player can pay a cost
   * 
   * @param cost - The cost expression to check
   * @param playerId - The player who would pay the cost
   * @returns True if the player can pay the cost
   */
  canPayCost(cost: CostExpr, playerId: PlayerId): boolean {
    try {
      switch (cost.type) {
        case 'REST_DON':
          return this.canPayRestDonCost(cost.amount || 0, playerId);

        case 'TRASH_CARD':
          return this.canPayTrashCardCost(cost.amount || 0, playerId);

        case 'REST_CARD':
          return this.canPayRestCardCost(cost.amount || 0, playerId);

        case 'COMPOSITE':
          // Check if all sub-costs can be paid
          if (!cost.costs) return false;
          for (const subCost of cost.costs) {
            if (!this.canPayCost(subCost, playerId)) {
              return false;
            }
          }
          return true;

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Pay the cost for an effect
   * 
   * @param cost - The cost expression to pay
   * @param playerId - The player paying the cost
   * @returns True if cost was successfully paid
   */
  payCost(cost: CostExpr, playerId: PlayerId): boolean {
    try {
      switch (cost.type) {
        case 'REST_DON':
          return this.payRestDonCost(cost.amount || 0, playerId);

        case 'TRASH_CARD':
          return this.payTrashCardCost(cost.amount || 0, playerId);

        case 'REST_CARD':
          return this.payRestCardCost(cost.amount || 0, playerId);

        case 'COMPOSITE':
          // Pay multiple costs in sequence with transaction support
          if (!cost.costs) return false;
          
          // Create snapshot before paying composite costs
          const compositeSnapshot = this.createStateSnapshot();
          
          try {
            for (const subCost of cost.costs) {
              if (!this.payCost(subCost, playerId)) {
                // Rollback all previous costs in this composite
                this.restoreStateSnapshot(compositeSnapshot);
                return false;
              }
            }
            return true;
          } catch (error) {
            // Rollback on error
            this.restoreStateSnapshot(compositeSnapshot);
            return false;
          }

        default:
          throw new EffectError(`Unknown cost type: ${(cost as any).type}`);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute an effect script
   * 
   * @param scriptId - The script ID to execute
   * @param context - The effect context
   * @throws EffectError if script not found or execution fails
   */
  private executeScript(scriptId: string | undefined, context: EffectContext): void {
    // If no scriptId, effect has no script to execute (valid for some effects)
    if (!scriptId) {
      return;
    }

    const script = this.scriptRegistry.get(scriptId);
    if (!script) {
      throw new EffectError(`Effect script ${scriptId} not found in registry`);
    }

    try {
      script(context);
    } catch (error) {
      throw new EffectError(
        `Error executing effect script ${scriptId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create an effect context for script execution
   */
  private createEffectContext(
    source: CardInstance,
    controller: PlayerId,
    targets: Target[],
    values: Map<string, any>,
    event: any
  ): EffectContext {
    return {
      state: this.stateManager.getState(),
      source,
      controller,
      targets,
      values,
      event,
    };
  }

  /**
   * Evaluate a comparison condition
   */
  private evaluateComparison(condition: ConditionExpr, context: EffectContext): boolean {
    if (!condition.operator || condition.left === undefined || condition.right === undefined) {
      return false;
    }

    // Resolve left and right values
    const leftValue = this.resolveValue(condition.left, context);
    const rightValue = this.resolveValue(condition.right, context);

    // Perform comparison
    switch (condition.operator) {
      case 'EQ':
        return leftValue === rightValue;
      case 'NEQ':
        return leftValue !== rightValue;
      case 'GT':
        return leftValue > rightValue;
      case 'LT':
        return leftValue < rightValue;
      case 'GTE':
        return leftValue >= rightValue;
      case 'LTE':
        return leftValue <= rightValue;
      default:
        return false;
    }
  }

  /**
   * Check if a card has a keyword
   */
  private checkHasKeyword(condition: ConditionExpr, context: EffectContext): boolean {
    if (!condition.keyword) return false;

    // Check source card for keyword
    return context.source.definition.keywords.includes(condition.keyword);
  }

  /**
   * Check if a card is in a specific zone
   */
  private checkInZone(condition: ConditionExpr, context: EffectContext): boolean {
    if (!condition.zone) return false;

    // Check source card's zone
    return context.source.zone === condition.zone;
  }

  /**
   * Check if a card is a specific color
   */
  private checkIsColor(condition: ConditionExpr, context: EffectContext): boolean {
    if (!condition.color) return false;

    // Check source card for color
    return context.source.definition.colors.includes(condition.color);
  }

  /**
   * Resolve a value from a string or number
   */
  private resolveValue(value: string | number, context: EffectContext): any {
    if (typeof value === 'number') {
      return value;
    }

    // Handle special value references
    switch (value) {
      case 'source.power':
        return context.source.definition.basePower || 0;
      case 'source.cost':
        return context.source.definition.baseCost || 0;
      case 'turn':
        return context.state.turnNumber;
      case 'phase':
        return context.state.phase;
      default:
        // Try to parse as number
        const parsed = Number(value);
        return isNaN(parsed) ? value : parsed;
    }
  }

  /**
   * Pay REST_DON cost
   */
  private payRestDonCost(amount: number, playerId: PlayerId): boolean {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) return false;

    // Find active DON in cost area
    const activeDon = player.zones.costArea.filter(d => d.state === CardState.ACTIVE);
    if (activeDon.length < amount) {
      return false;
    }

    // Rest the required number of DON
    for (let i = 0; i < amount; i++) {
      this.stateManager = this.stateManager.updateDon(activeDon[i].id, {
        state: CardState.RESTED,
      });
    }

    this.zoneManager.updateStateManager(this.stateManager);
    return true;
  }

  /**
   * Pay TRASH_CARD cost
   */
  private payTrashCardCost(amount: number, playerId: PlayerId): boolean {
    let player = this.stateManager.getPlayer(playerId);
    if (!player) return false;

    // Check if player has enough cards in hand
    if (player.zones.hand.length < amount) {
      return false;
    }

    // Trash the required number of cards from hand
    for (let i = 0; i < amount; i++) {
      player = this.stateManager.getPlayer(playerId); // Refresh player reference
      if (!player || player.zones.hand.length === 0) return false;
      
      const card = player.zones.hand[0];
      this.stateManager = this.zoneManager.moveCard(card.id, ZoneId.TRASH);
    }

    return true;
  }

  /**
   * Pay REST_CARD cost
   */
  private payRestCardCost(amount: number, playerId: PlayerId): boolean {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) return false;

    // Find active cards in character area
    const activeCards = player.zones.characterArea.filter(c => c.state === CardState.ACTIVE);
    if (activeCards.length < amount) {
      return false;
    }

    // Rest the required number of cards
    for (let i = 0; i < amount; i++) {
      this.stateManager = this.stateManager.updateCard(activeCards[i].id, {
        state: CardState.RESTED,
      });
    }

    this.zoneManager.updateStateManager(this.stateManager);
    return true;
  }

  /**
   * Check if player can pay REST_DON cost
   */
  private canPayRestDonCost(amount: number, playerId: PlayerId): boolean {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) return false;

    // Find active DON in cost area
    const activeDon = player.zones.costArea.filter(d => d.state === CardState.ACTIVE);
    return activeDon.length >= amount;
  }

  /**
   * Check if player can pay TRASH_CARD cost
   */
  private canPayTrashCardCost(amount: number, playerId: PlayerId): boolean {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) return false;

    // Check if player has enough cards in hand
    return player.zones.hand.length >= amount;
  }

  /**
   * Check if player can pay REST_CARD cost
   */
  private canPayRestCardCost(amount: number, playerId: PlayerId): boolean {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) return false;

    // Find active cards in character area
    const activeCards = player.zones.characterArea.filter(c => c.state === CardState.ACTIVE);
    return activeCards.length >= amount;
  }

  /**
   * Register an effect script
   * 
   * @param scriptId - The script ID
   * @param script - The script function
   */
  registerScript(scriptId: string, script: EffectScript): void {
    this.scriptRegistry.set(scriptId, script);
  }

  /**
   * Update the internal state manager reference
   * This should be called after external state updates
   * 
   * @param stateManager - The new state manager
   */
  updateStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager;
    this.zoneManager.updateStateManager(stateManager);
    this.replacementHandler.updateStateManager(stateManager);
  }

  /**
   * Get the current state manager
   * 
   * @returns The current state manager
   */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }

  /**
   * Get the replacement effect handler
   * 
   * @returns The replacement effect handler
   */
  getReplacementHandler(): ReplacementEffectHandler {
    return this.replacementHandler;
  }

  // ============================================================================
  // Effect Triggering
  // ============================================================================

  /**
   * Trigger effects based on a game event
   * Identifies all effects that should trigger for the event and adds them to the stack
   * 
   * @param event - The game event that occurred
   */
  triggerEffects(event: GameEvent): void {
    const state = this.stateManager.getState();
    const triggeredEffects: EffectStackEntry[] = [];

    // Get all cards in play that might have effects
    const allCards = this.getAllCardsInPlay();

    // Check each card for effects that match this event
    for (const card of allCards) {
      for (const effectDef of card.definition.effects) {
        // Only AUTO effects can trigger
        if (effectDef.timingType !== EffectTimingType.AUTO) {
          continue;
        }

        // Check if this effect triggers on this event type
        if (!this.doesEffectTriggerOnEvent(effectDef, event)) {
          continue;
        }

        // Check once-per-turn restriction
        if (effectDef.oncePerTurn) {
          const usedThisTurn = card.flags.get(`effect_${effectDef.id}_used_turn`) === state.turnNumber;
          if (usedThisTurn) {
            continue;
          }
        }

        // Check condition if present
        if (effectDef.condition) {
          const context = this.createEffectContext(card, card.controller, [], new Map(), event);
          if (!this.checkCondition(effectDef.condition, context)) {
            continue;
          }
        }

        // Create effect instance
        const effectInstance: EffectInstance = {
          effectDefinition: effectDef,
          source: card,
          controller: card.controller,
          targets: [],
          values: new Map(),
          context: null,
        };

        // Emit effect triggered event
        this.eventEmitter.emit({
          type: GameEventType.EFFECT_TRIGGERED,
          data: {
            effectId: effectDef.id,
            sourceCardId: card.id,
            sourceName: card.definition.name,
            controller: card.controller,
            effectType: effectDef.effectType,
            triggerTiming: effectDef.triggerTiming,
            label: effectDef.label,
            eventType: event.type,
          },
        });

        // Determine priority (active player's effects resolve first)
        const priority = card.controller === state.activePlayer ? 1 : 0;

        // Add to triggered effects
        triggeredEffects.push({
          effect: effectInstance,
          priority,
          addedAt: Date.now(),
        });
      }
    }

    // Add triggered effects to stack in priority order
    for (const entry of triggeredEffects) {
      this.pushEffectToStack(entry);
      
      // Emit effect added to stack event
      this.eventEmitter.emit({
        type: GameEventType.EFFECT_ADDED_TO_STACK,
        data: {
          effectId: entry.effect.effectDefinition.id,
          sourceCardId: entry.effect.source.id,
          priority: entry.priority,
        },
      });
    }
  }

  /**
   * Check if an effect should trigger on a specific event
   * 
   * @param effectDef - The effect definition
   * @param event - The game event
   * @returns True if the effect should trigger
   */
  private doesEffectTriggerOnEvent(effectDef: EffectDefinition, event: GameEvent): boolean {
    if (!effectDef.triggerTiming) {
      return false;
    }

    switch (effectDef.triggerTiming) {
      case TriggerTiming.ON_PLAY:
        return event.type === GameEventType.CARD_PLAYED;
      
      case TriggerTiming.WHEN_ATTACKING:
        return event.type === GameEventType.ATTACK_DECLARED;
      
      case TriggerTiming.WHEN_ATTACKED:
        return event.type === GameEventType.ATTACK_DECLARED;
      
      case TriggerTiming.ON_KO:
        return event.type === GameEventType.CARD_MOVED && 
               event.data?.toZone === ZoneId.TRASH;
      
      case TriggerTiming.START_OF_TURN:
        return event.type === GameEventType.TURN_START;
      
      case TriggerTiming.END_OF_YOUR_TURN:
        return event.type === GameEventType.TURN_END;
      
      case TriggerTiming.END_OF_OPPONENT_TURN:
        return event.type === GameEventType.TURN_END;
      
      case TriggerTiming.ON_BLOCK:
        return event.type === GameEventType.BLOCK_DECLARED;
      
      case TriggerTiming.COUNTER_STEP:
        return event.type === GameEventType.COUNTER_STEP_START;
      
      default:
        return false;
    }
  }

  /**
   * Get all cards currently in play (all zones for all players)
   * 
   * @returns Array of all card instances
   */
  private getAllCardsInPlay(): CardInstance[] {
    const state = this.stateManager.getState();
    const cards: CardInstance[] = [];

    for (const [_, player] of state.players) {
      // Add cards from all zones
      cards.push(...player.zones.hand);
      cards.push(...player.zones.deck);
      cards.push(...player.zones.trash);
      cards.push(...player.zones.life);
      cards.push(...player.zones.characterArea);
      
      if (player.zones.leaderArea) {
        cards.push(player.zones.leaderArea);
      }
      
      if (player.zones.stageArea) {
        cards.push(player.zones.stageArea);
      }
    }

    return cards;
  }

  // ============================================================================
  // Effect Stack Management
  // ============================================================================

  /**
   * Push an effect onto the effect stack
   * Effects are ordered by priority (higher priority resolves first)
   * Within the same priority, effects resolve in LIFO order (last in, first out)
   * 
   * @param entry - The effect stack entry to add
   */
  private pushEffectToStack(entry: EffectStackEntry): void {
    // Add to end of stack - will be resolved LIFO
    // Higher priority effects are added first, so they'll be at the bottom
    // and resolve first when we pop from the top
    this.effectStack.push(entry);
  }

  /**
   * Add an effect to the stack (public method for external use)
   * 
   * @param effect - The effect instance to add
   * @param priority - The priority for resolution order (higher = resolves first)
   */
  pushEffect(effect: EffectInstance, priority: number = 0): void {
    const entry: EffectStackEntry = {
      effect,
      priority,
      addedAt: Date.now(),
    };
    this.pushEffectToStack(entry);
  }

  /**
   * Resolve all effects on the stack
   * Effects resolve in LIFO order (last in, first out)
   * Higher priority effects resolve first
   * Allows players to respond to effects between resolutions
   */
  resolveStack(): void {
    // Sort stack so highest priority is at the END (since we pop from end)
    // Within same priority, maintain insertion order (earlier added is at end)
    this.effectStack.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority first (higher priority at end)
      }
      return b.addedAt - a.addedAt; // Later timestamp first (earlier at end for LIFO)
    });

    while (this.effectStack.length > 0) {
      // Pop the top effect from the stack (LIFO)
      const entry = this.effectStack.pop();
      if (!entry) break;

      try {
        // Note: EFFECT_AWAITING_INPUT and EFFECT_RESOLVED are now emitted
        // inside resolveEffect() to ensure they're always emitted regardless
        // of how the effect is resolved (from stack or directly)
        
        // Resolve the effect (this will emit EFFECT_AWAITING_INPUT and EFFECT_RESOLVED)
        this.resolveEffect(entry.effect);

        // Mark effect as used this turn if once-per-turn
        if (entry.effect.effectDefinition.oncePerTurn) {
          const card = entry.effect.source;
          const updatedCard = {
            ...card,
            flags: new Map(card.flags),
          };
          updatedCard.flags.set(
            `effect_${entry.effect.effectDefinition.id}_used_turn`,
            this.stateManager.getTurnNumber()
          );
          this.stateManager = this.stateManager.updateCard(card.id, { flags: updatedCard.flags });
          this.zoneManager.updateStateManager(this.stateManager);
        }
      } catch (error) {
        // Log error but continue resolving stack
        console.error('Error resolving effect:', error);
        
        // Emit error event
        this.eventEmitter.emit({
          type: GameEventType.ERROR,
          data: {
            message: `Error resolving effect: ${error instanceof Error ? error.message : String(error)}`,
            effectId: entry.effect.effectDefinition.id,
            sourceCardId: entry.effect.source.id,
            sourceName: entry.effect.source.definition.name,
            controller: entry.effect.controller,
          },
        });
      }
    }
  }

  /**
   * Get the current effect stack
   * 
   * @returns Array of effect stack entries
   */
  getEffectStack(): EffectStackEntry[] {
    return [...this.effectStack];
  }

  /**
   * Clear the effect stack
   */
  clearEffectStack(): void {
    this.effectStack = [];
  }

  // ============================================================================
  // Legal Target Determination
  // ============================================================================

  /**
   * Get legal targets for an effect based on its target filter
   * 
   * @param filter - The target filter criteria
   * @param controller - The player controlling the effect
   * @returns Array of legal targets
   */
  getLegalTargets(filter: TargetFilter, controller: PlayerId): Target[] {
    const state = this.stateManager.getState();
    const legalTargets: Target[] = [];

    // Determine which players to check based on controller filter
    const playersToCheck: PlayerId[] = [];
    if (filter.controller === 'self' || filter.controller === 'any') {
      playersToCheck.push(controller);
    }
    if (filter.controller === 'opponent' || filter.controller === 'any') {
      const opponent = controller === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
      playersToCheck.push(opponent);
    }

    // Get zones to check
    const zonesToCheck = Array.isArray(filter.zone) ? filter.zone : (filter.zone ? [filter.zone] : []);

    // Check each player's zones
    for (const playerId of playersToCheck) {
      const player = state.players.get(playerId);
      if (!player) continue;

      for (const zoneId of zonesToCheck) {
        let cardsInZone: CardInstance[] = [];

        switch (zoneId) {
          case ZoneId.HAND:
            cardsInZone = player.zones.hand;
            break;
          case ZoneId.DECK:
            cardsInZone = player.zones.deck;
            break;
          case ZoneId.TRASH:
            cardsInZone = player.zones.trash;
            break;
          case ZoneId.LIFE:
            cardsInZone = player.zones.life;
            break;
          case ZoneId.CHARACTER_AREA:
            cardsInZone = player.zones.characterArea;
            break;
          case ZoneId.LEADER_AREA:
            if (player.zones.leaderArea) {
              cardsInZone = [player.zones.leaderArea];
            }
            break;
          case ZoneId.STAGE_AREA:
            if (player.zones.stageArea) {
              cardsInZone = [player.zones.stageArea];
            }
            break;
        }

        // Filter cards based on criteria
        for (const card of cardsInZone) {
          if (this.doesCardMatchFilter(card, filter)) {
            legalTargets.push({
              type: TargetType.CARD,
              cardId: card.id,
            });
          }
        }
      }
    }

    return legalTargets;
  }

  /**
   * Check if a card matches a target filter
   * 
   * @param card - The card to check
   * @param filter - The target filter
   * @returns True if the card matches all filter criteria
   */
  private doesCardMatchFilter(card: CardInstance, filter: TargetFilter): boolean {
    // Check category
    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      if (!categories.includes(card.definition.category)) {
        return false;
      }
    }

    // Check color
    if (filter.color) {
      const colors = Array.isArray(filter.color) ? filter.color : [filter.color];
      const hasMatchingColor = colors.some(color => card.definition.colors.includes(color));
      if (!hasMatchingColor) {
        return false;
      }
    }

    // Check cost range
    if (filter.costRange) {
      const cost = card.definition.baseCost || 0;
      if (filter.costRange.min !== undefined && cost < filter.costRange.min) {
        return false;
      }
      if (filter.costRange.max !== undefined && cost > filter.costRange.max) {
        return false;
      }
      if (filter.costRange.exact !== undefined && cost !== filter.costRange.exact) {
        return false;
      }
    }

    // Check power range
    if (filter.powerRange) {
      const power = card.definition.basePower || 0;
      if (filter.powerRange.min !== undefined && power < filter.powerRange.min) {
        return false;
      }
      if (filter.powerRange.max !== undefined && power > filter.powerRange.max) {
        return false;
      }
      if (filter.powerRange.exact !== undefined && power !== filter.powerRange.exact) {
        return false;
      }
    }

    // Check state
    if (filter.state) {
      const states = Array.isArray(filter.state) ? filter.state : [filter.state];
      if (!states.includes(card.state)) {
        return false;
      }
    }

    // Check keywords
    if (filter.hasKeyword) {
      const keywords = Array.isArray(filter.hasKeyword) ? filter.hasKeyword : [filter.hasKeyword];
      const hasAllKeywords = keywords.every(keyword => card.definition.keywords.includes(keyword));
      if (!hasAllKeywords) {
        return false;
      }
    }

    if (filter.lacksKeyword) {
      const keywords = Array.isArray(filter.lacksKeyword) ? filter.lacksKeyword : [filter.lacksKeyword];
      const hasAnyKeyword = keywords.some(keyword => card.definition.keywords.includes(keyword));
      if (hasAnyKeyword) {
        return false;
      }
    }

    // Check type tags
    if (filter.typeTags && filter.typeTags.length > 0) {
      const hasMatchingTag = filter.typeTags.some(tag => card.definition.typeTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check attributes
    if (filter.attributes && filter.attributes.length > 0) {
      const hasMatchingAttribute = filter.attributes.some(attr => card.definition.attributes.includes(attr));
      if (!hasMatchingAttribute) {
        return false;
      }
    }

    // Check custom filter
    if (filter.customFilter) {
      if (!filter.customFilter(card.id, this.stateManager.getState())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate that chosen targets are legal for an effect
   * 
   * @param targets - The chosen targets
   * @param filter - The target filter
   * @param controller - The player controlling the effect
   * @returns True if all targets are legal
   */
  validateTargets(targets: Target[], filter: TargetFilter, controller: PlayerId): boolean {
    const legalTargets = this.getLegalTargets(filter, controller);
    
    // Check that all chosen targets are in the legal targets list
    for (const target of targets) {
      const isLegal = legalTargets.some(legal => 
        legal.type === target.type &&
        legal.cardId === target.cardId &&
        legal.playerId === target.playerId &&
        legal.zoneId === target.zoneId
      );
      
      if (!isLegal) {
        return false;
      }
    }

    return true;
  }
}
