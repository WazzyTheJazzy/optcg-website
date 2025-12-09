/**
 * BattleSystem.ts
 * 
 * Handles all combat-related logic for the One Piece TCG Engine.
 * Orchestrates battle steps: attack, block, counter, damage, and end.
 * Validates attack legality and determines legal targets and blockers.
 */

import {
  CardInstance,
  PlayerId,
  CardState,
  ZoneId,
  CardCategory,
  BattleResult,
  CounterAction,
  ModifierDuration,
  ModifierType,
} from '../core/types';
import { GameStateManager } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { DamageCalculator } from './DamageCalculator';
import {
  EventEmitter,
  GameEventType,
  AttackDeclaredEvent,
  BlockDeclaredEvent,
  CounterStepStartEvent,
  BattleEndEvent,
} from '../rendering/EventEmitter';
import { koCharacter as koCharacterHandler } from './KOHandler';
import { KeywordHandler } from './KeywordHandler';
import { EffectSystem } from '../effects/EffectSystem';

/**
 * BattleSystem manages all combat interactions in the game
 */
export class BattleSystem {
  private stateManager: GameStateManager;
  private rules: RulesContext;
  private damageCalculator: DamageCalculator;
  private eventEmitter: EventEmitter;
  private keywordHandler: KeywordHandler;
  private effectSystem: EffectSystem | null;

  constructor(
    stateManager: GameStateManager,
    rules: RulesContext,
    eventEmitter: EventEmitter,
    effectSystem?: EffectSystem
  ) {
    this.stateManager = stateManager;
    this.rules = rules;
    this.damageCalculator = new DamageCalculator();
    this.eventEmitter = eventEmitter;
    this.keywordHandler = new KeywordHandler(rules);
    this.effectSystem = effectSystem || null;
  }

  /**
   * Execute a complete attack sequence
   * 
   * @param attackerId - The ID of the attacking card
   * @param targetId - The ID of the target card (leader or character)
   * @returns Battle result with outcome details
   */
  async executeAttack(attackerId: string, targetId: string): Promise<BattleResult> {
    // Validate the attack
    if (!this.canAttack(attackerId, targetId)) {
      // Log validation failure for debugging
      console.warn(`[BattleSystem] Invalid attack rejected: ${attackerId} cannot attack ${targetId}`);
      
      // Return failure result instead of throwing
      return {
        success: false,
        attackerId,
        defenderId: targetId,
        damageDealt: 0,
        attackerKOd: false,
        defenderKOd: false,
        error: `Invalid attack: ${attackerId} cannot attack ${targetId}`,
      };
    }

    const attacker = this.stateManager.getCard(attackerId);
    let target = this.stateManager.getCard(targetId);

    if (!attacker || !target) {
      // Log error for debugging
      console.error(`[BattleSystem] Attacker or target not found: attacker=${attackerId}, target=${targetId}`);
      
      // Return failure result instead of throwing
      return {
        success: false,
        attackerId,
        defenderId: targetId,
        damageDealt: 0,
        attackerKOd: false,
        defenderKOd: false,
        error: 'Attacker or target not found',
      };
    }

    // Initialize battle result
    const result: BattleResult = {
      success: true,
      attackerId,
      defenderId: targetId,
      blockerId: null,
      attackerPower: this.damageCalculator.computeCurrentPower(attacker),
      defenderPower: this.damageCalculator.computeCurrentPower(target),
      damageDealt: 0,
      defenderKOd: false,
    };

    // Execute battle steps
    // Note: Individual step implementations will be added in subsequent tasks

    // Step 1: Attack step
    const shouldContinue = this.attackStep(attacker, target);
    if (!shouldContinue) {
      // Battle aborted - attacker or target left the field
      result.success = false;
      return result;
    }

    // Step 2: Block step
    const blockResult = await this.blockStep(attacker, target);
    if (!blockResult.shouldContinue) {
      // Battle aborted during block step - attacker or blocker left the field
      result.success = false;
      return result;
    }
    if (blockResult.blocker) {
      result.blockerId = blockResult.blocker.id;
      result.defenderPower = this.damageCalculator.computeCurrentPower(blockResult.blocker);
      // Update target to be the blocker for subsequent steps
      target = blockResult.blocker;
    }

    // Step 3: Counter step
    await this.counterStep(attacker, target);

    // Get updated attacker and target after counter step (they may have modifiers applied)
    const updatedAttacker = this.stateManager.getCard(attacker.id);
    const updatedTarget = this.stateManager.getCard(target.id);
    if (!updatedAttacker || !updatedTarget) {
      // One of the cards left the field during counter step
      result.success = false;
      return result;
    }

    // Step 4: Damage step
    const damageResult = this.damageStep(updatedAttacker, updatedTarget);
    result.damageDealt = damageResult.damageDealt;
    result.defenderKOd = damageResult.defenderKOd;

    // Step 5: End battle step
    this.endBattle(updatedAttacker, updatedTarget, result.damageDealt);

    return result;
  }

  /**
   * Validate if an attack is legal
   * 
   * Checks:
   * - Attacker is in valid zone (character area or leader area)
   * - Attacker is active (or has Rush keyword)
   * - Target is valid (opponent's leader or rested character)
   * - First turn battle restrictions
   * 
   * @param attackerId - The ID of the attacking card
   * @param targetId - The ID of the target card
   * @returns True if the attack is legal
   */
  canAttack(attackerId: string, targetId: string): boolean {
    const state = this.stateManager.getState();
    const attacker = this.stateManager.getCard(attackerId);
    const target = this.stateManager.getCard(targetId);

    if (!attacker || !target) {
      return false;
    }

    // Check if attacker is in a valid zone (character area or leader area)
    if (
      attacker.zone !== ZoneId.CHARACTER_AREA &&
      attacker.zone !== ZoneId.LEADER_AREA
    ) {
      return false;
    }

    // Check if attacker is controlled by the active player
    if (attacker.controller !== state.activePlayer) {
      return false;
    }

    // Check if target is controlled by the opponent
    const opponent =
      state.activePlayer === PlayerId.PLAYER_1
        ? PlayerId.PLAYER_2
        : PlayerId.PLAYER_1;
    if (target.controller !== opponent) {
      return false;
    }

    // Check if attacker is rested (unless it has Rush keyword)
    if (attacker.state === CardState.RESTED) {
      // Check for Rush keyword
      const hasRush = this.keywordHandler.hasRush(attacker);
      if (!hasRush) {
        return false;
      }
    }

    // Check first turn battle restriction
    if (state.turnNumber === 1 && this.rules.isFirstTurnBattleBanned()) {
      // Determine if this is the first player's first turn
      // The first player is the one who started the game
      // We can infer this from the active player on turn 1
      if (state.activePlayer === PlayerId.PLAYER_1) {
        return false;
      }
    }

    // Check if target is valid
    const legalTargets = this.getLegalTargets(attackerId);
    return legalTargets.some((t) => t.id === targetId);
  }

  /**
   * Get all legal attack targets for an attacker
   * 
   * Legal targets are:
   * - Opponent's leader (always)
   * - Opponent's rested characters
   * 
   * @param attackerId - The ID of the attacking card
   * @returns Array of legal target cards
   */
  getLegalTargets(attackerId: string): CardInstance[] {
    const state = this.stateManager.getState();
    const attacker = this.stateManager.getCard(attackerId);

    if (!attacker) {
      return [];
    }

    // Determine opponent
    const opponent =
      attacker.controller === PlayerId.PLAYER_1
        ? PlayerId.PLAYER_2
        : PlayerId.PLAYER_1;

    const opponentPlayer = this.stateManager.getPlayer(opponent);
    if (!opponentPlayer) {
      return [];
    }

    const targets: CardInstance[] = [];

    // Opponent's leader is always a legal target
    if (opponentPlayer.zones.leaderArea) {
      targets.push(opponentPlayer.zones.leaderArea);
    }

    // Opponent's rested characters are legal targets
    const restedCharacters = opponentPlayer.zones.characterArea.filter(
      (card) => card.state === CardState.RESTED
    );
    targets.push(...restedCharacters);

    return targets;
  }

  /**
   * Get all legal blockers for a defending player
   * 
   * Legal blockers are characters with the Blocker keyword
   * that are in the character area and active
   * 
   * @param attackerId - The ID of the attacking card
   * @param defenderId - The ID of the defending player
   * @returns Array of cards that can block
   */
  getLegalBlockers(attackerId: string, defenderId: PlayerId): CardInstance[] {
    const defender = this.stateManager.getPlayer(defenderId);
    if (!defender) {
      return [];
    }

    // Get all characters with Blocker keyword that are active
    const blockers = defender.zones.characterArea.filter((card) => {
      return (
        card.state === CardState.ACTIVE &&
        this.keywordHandler.hasBlocker(card)
      );
    });

    return blockers;
  }

  /**
   * Execute the attack step of battle
   * 
   * - Rest the attacker
   * - Emit ATTACK_DECLARED event
   * - Trigger WHEN_ATTACKING effects on attacker
   * - Trigger ON_OPPONENT_ATTACK effects for defender
   * - Check if attacker or target left field (abort battle if so)
   * 
   * @param attacker - The attacking card
   * @param target - The target card
   * @returns True if battle should continue, false if it should abort
   */
  private attackStep(attacker: CardInstance, target: CardInstance): boolean {
    // Rest the attacker
    this.stateManager = this.stateManager.updateCard(attacker.id, {
      state: CardState.RESTED,
    });

    // Emit ATTACK_DECLARED event
    const attackEvent: AttackDeclaredEvent = {
      type: GameEventType.ATTACK_DECLARED,
      timestamp: Date.now(),
      attackerId: attacker.id,
      targetId: target.id,
      attackingPlayerId: attacker.controller,
      defendingPlayerId: target.controller,
    };
    this.eventEmitter.emit(attackEvent);

    // Trigger effects through the effect system
    if (this.effectSystem) {
      // Trigger WHEN_ATTACKING and WHEN_ATTACKED effects
      this.effectSystem.triggerEffects({
        type: GameEventType.ATTACK_DECLARED,
        playerId: attacker.controller,
        cardId: attacker.id,
        timestamp: Date.now(),
        data: {
          attackerId: attacker.id,
          targetId: target.id,
          attackingPlayerId: attacker.controller,
          defendingPlayerId: target.controller,
        },
      });

      // Resolve the effect stack
      this.effectSystem.resolveStack();

      // Update state manager after effect resolution
      this.stateManager = this.effectSystem.getStateManager();
    }

    // Check if attacker or target left field (abort battle if so)
    const attackerStillOnField = this.isCardOnField(attacker.id);
    const targetStillOnField = this.isCardOnField(target.id);

    if (!attackerStillOnField || !targetStillOnField) {
      // Battle is aborted - one or both cards left the field
      return false;
    }

    return true;
  }

  /**
   * Execute the block step of battle
   * 
   * - Query defender for blocker choice from legal blockers
   * - If blocker chosen: rest blocker, redirect attack to blocker, emit BLOCK_DECLARED event
   * - Trigger ON_BLOCK effects
   * - Check if attacker or target left field (abort battle if so)
   * 
   * @param attacker - The attacking card
   * @param target - The original target card
   * @returns Object with blocker (if chosen) and shouldContinue flag
   */
  private async blockStep(
    attacker: CardInstance,
    target: CardInstance
  ): Promise<{ blocker: CardInstance | null; shouldContinue: boolean }> {
    // Get legal blockers for the defending player
    const legalBlockers = this.getLegalBlockers(attacker.id, target.controller);

    // If no legal blockers, no block occurs but battle continues
    if (legalBlockers.length === 0) {
      return { blocker: null, shouldContinue: true };
    }

    // Query defender for blocker choice using Player interface
    const chosenBlocker = await this.queryDefenderForBlockerAsync(legalBlockers, attacker, target.controller);

    // If no blocker chosen, no block occurs but battle continues
    if (!chosenBlocker) {
      return { blocker: null, shouldContinue: true };
    }

    // Rest the blocker
    this.stateManager = this.stateManager.updateCard(chosenBlocker.id, {
      state: CardState.RESTED,
    });

    // Emit BLOCK_DECLARED event
    const blockEvent: BlockDeclaredEvent = {
      type: GameEventType.BLOCK_DECLARED,
      timestamp: Date.now(),
      blockerId: chosenBlocker.id,
      attackerId: attacker.id,
      blockingPlayerId: chosenBlocker.controller,
    };
    this.eventEmitter.emit(blockEvent);

    // Trigger effects through the effect system
    if (this.effectSystem) {
      // Trigger ON_BLOCK effects
      this.effectSystem.triggerEffects({
        type: GameEventType.BLOCK_DECLARED,
        playerId: chosenBlocker.controller,
        cardId: chosenBlocker.id,
        timestamp: Date.now(),
        data: {
          blockerId: chosenBlocker.id,
          attackerId: attacker.id,
          blockingPlayerId: chosenBlocker.controller,
        },
      });

      // Resolve the effect stack
      this.effectSystem.resolveStack();

      // Update state manager after effect resolution
      this.stateManager = this.effectSystem.getStateManager();
    }

    // Check if attacker or blocker left field (abort battle if so)
    const attackerStillOnField = this.isCardOnField(attacker.id);
    const blockerStillOnField = this.isCardOnField(chosenBlocker.id);

    if (!attackerStillOnField || !blockerStillOnField) {
      // Battle is aborted - one or both cards left the field
      return { blocker: null, shouldContinue: false };
    }

    // Return the blocker to redirect the attack
    const updatedBlocker = this.stateManager.getCard(chosenBlocker.id);
    return { blocker: updatedBlocker, shouldContinue: true };
  }

  /**
   * Query the defending player for a blocker choice
   * 
   * This is a placeholder for the player input system.
   * In a real implementation, this would:
   * 1. Present the legal blockers to the defending player
   * 2. Allow them to choose one or decline to block
   * 3. Return the chosen blocker or null
   * 
   * For now, this returns null (no block) to allow testing of the block logic
   * without requiring a full player input system.
   * 
   * Protected to allow test subclasses to override for testing purposes.
   * 
   * @param legalBlockers - Array of cards that can block
   * @param defenderId - The defending player's ID
   * @returns The chosen blocker or null if no block
   */
  protected queryDefenderForBlocker(
    legalBlockers: CardInstance[],
    defenderId: PlayerId
  ): CardInstance | null {
    // TODO: Implement player input system (future task)
    // For now, return null (no block chosen)
    // This allows the block logic to be tested by calling blockStep directly
    // or by implementing a test-specific version of this method
    return null;
  }

  /**
   * Set the EffectSystem instance (used by GameEngine)
   * @param effectSystem - The EffectSystem instance
   */
  setEffectSystem(effectSystem: EffectSystem): void {
    this.effectSystem = effectSystem;
  }

  /**
   * Set the Player instance for blocker and counter decisions (used by GameEngine)
   * @param playerId - The player ID
   * @param player - The Player instance
   */
  setPlayerForBlocker(playerId: PlayerId, player: import('../core/types').Player): void {
    if (!this.playerInstances) {
      this.playerInstances = new Map();
    }
    this.playerInstances.set(playerId, player);
  }

  /**
   * Set the Player instance for counter decisions (used by GameEngine)
   * This is an alias for setPlayerForBlocker since both use the same player instances map
   * @param playerId - The player ID
   * @param player - The Player instance
   */
  setPlayerForCounter(playerId: PlayerId, player: import('../core/types').Player): void {
    this.setPlayerForBlocker(playerId, player);
  }

  /**
   * Query the defending player for a blocker choice using Player interface
   * @param legalBlockers - Array of cards that can block
   * @param attacker - The attacking card
   * @param defenderId - The defending player's ID
   * @returns Promise resolving to the chosen blocker or null if no block
   */
  protected async queryDefenderForBlockerAsync(
    legalBlockers: CardInstance[],
    attacker: CardInstance,
    defenderId: PlayerId
  ): Promise<CardInstance | null> {
    const player = this.playerInstances?.get(defenderId);
    if (player) {
      return await player.chooseBlocker(legalBlockers, attacker, this.stateManager.getState());
    }
    // If no player instance is registered, default to no block
    // This maintains backward compatibility with tests that don't set up players
    return null;
  }

  private playerInstances?: Map<PlayerId, import('../core/types').Player>;

  /**
   * Execute the counter step of battle
   * 
   * - Emit COUNTER_STEP_START event
   * - Trigger WHEN_ATTACKED effects on defender
   * - Query defender for counter actions in loop until they pass
   * - Handle USE_COUNTER_CARD: trash card from hand, apply counter value as power boost
   * - Handle PLAY_COUNTER_EVENT: pay cost, resolve counter event, trash event
   * 
   * @param attacker - The attacking card
   * @param defender - The defending card (original target or blocker)
   */
  private async counterStep(attacker: CardInstance, defender: CardInstance): Promise<void> {
    // Emit COUNTER_STEP_START event
    const counterEvent: CounterStepStartEvent = {
      type: GameEventType.COUNTER_STEP_START,
      timestamp: Date.now(),
      attackerId: attacker.id,
      defenderId: defender.id,
      defendingPlayerId: defender.controller,
    };
    this.eventEmitter.emit(counterEvent);

    // Trigger effects through the effect system
    if (this.effectSystem) {
      // Trigger COUNTER_STEP effects
      this.effectSystem.triggerEffects({
        type: GameEventType.COUNTER_STEP_START,
        playerId: defender.controller,
        cardId: defender.id,
        timestamp: Date.now(),
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          defendingPlayerId: defender.controller,
        },
      });

      // Resolve the effect stack
      this.effectSystem.resolveStack();

      // Update state manager after effect resolution
      this.stateManager = this.effectSystem.getStateManager();
    }

    // Query defender for counter actions in loop until they pass
    let continueCountering = true;
    while (continueCountering) {
      const counterAction = await this.queryDefenderForCounterActionAsync(defender.controller, attacker, defender);
      
      if (!counterAction || counterAction.type === 'PASS') {
        // Defender passes, exit counter step
        continueCountering = false;
      } else if (counterAction.type === 'USE_COUNTER_CARD') {
        // Handle USE_COUNTER_CARD
        this.handleUseCounterCard(counterAction.cardId!, defender);
      } else if (counterAction.type === 'PLAY_COUNTER_EVENT') {
        // Handle PLAY_COUNTER_EVENT
        this.handlePlayCounterEvent(counterAction.cardId!, defender);
      }
    }
  }

  /**
   * Handle using a counter card from hand
   * 
   * - Verify card is in defender's hand
   * - Verify card has a counter value
   * - Trash the card from hand
   * - Apply counter value as temporary power boost to defender
   * 
   * @param cardId - The ID of the counter card to use
   * @param defender - The defending card receiving the power boost
   */
  private handleUseCounterCard(cardId: string, defender: CardInstance): void {
    const card = this.stateManager.getCard(cardId);
    
    if (!card) {
      throw new Error(`Counter card ${cardId} not found`);
    }

    // Verify card is in defender's hand
    if (card.zone !== ZoneId.HAND || card.controller !== defender.controller) {
      throw new Error(`Card ${cardId} is not in defender's hand`);
    }

    // Verify card has a counter value
    const counterValue = card.definition.counterValue;
    if (counterValue === null || counterValue === undefined) {
      throw new Error(`Card ${cardId} does not have a counter value`);
    }

    // Move card from hand to trash
    this.stateManager = this.stateManager.moveCard(cardId, ZoneId.TRASH);

    // Apply counter value as temporary power boost to defender
    // The power boost lasts until end of battle
    const modifier = {
      id: `counter-${cardId}-${Date.now()}`,
      type: ModifierType.POWER,
      value: counterValue,
      duration: ModifierDuration.UNTIL_END_OF_BATTLE,
      source: cardId,
      timestamp: Date.now(),
    };

    // Add modifier to defender
    const updatedDefender = this.stateManager.getCard(defender.id);
    if (updatedDefender) {
      const newModifiers = [...updatedDefender.modifiers, modifier];
      this.stateManager = this.stateManager.updateCard(defender.id, {
        modifiers: newModifiers,
      });
    }
  }

  /**
   * Handle playing a counter event from hand
   * 
   * - Verify card is in defender's hand
   * - Verify card is an event with counter timing
   * - Pay the cost (rest DON)
   * - Resolve the counter event effect
   * - Move event to trash
   * 
   * @param cardId - The ID of the counter event to play
   * @param defender - The defending card
   */
  private handlePlayCounterEvent(cardId: string, defender: CardInstance): void {
    const card = this.stateManager.getCard(cardId);
    
    if (!card) {
      throw new Error(`Counter event ${cardId} not found`);
    }

    // Verify card is in defender's hand
    if (card.zone !== ZoneId.HAND || card.controller !== defender.controller) {
      throw new Error(`Card ${cardId} is not in defender's hand`);
    }

    // Verify card is an event
    if (card.definition.category !== CardCategory.EVENT) {
      throw new Error(`Card ${cardId} is not an event`);
    }

    // TODO: Verify card has counter timing (requires effect system - tasks 24-27)
    // For now, we assume the card is a valid counter event

    // Pay the cost (rest DON in cost area)
    const cost = card.definition.baseCost ?? 0;
    if (cost > 0) {
      this.payCounterEventCost(defender.controller, cost);
    }

    // TODO: Resolve the counter event effect (requires effect system - tasks 24-27)
    // For now, this is a placeholder
    // When implemented, this will:
    // 1. Create an effect instance from the event's effect definition
    // 2. Resolve the effect through the effect system
    // 3. The effect might add power, draw cards, etc.
    this.resolveCounterEventEffect(card, defender);

    // Move event to trash
    this.stateManager = this.stateManager.moveCard(cardId, ZoneId.TRASH);
  }

  /**
   * Pay the cost for a counter event by resting DON
   * 
   * @param playerId - The player paying the cost
   * @param cost - The amount of cost to pay
   */
  private payCounterEventCost(playerId: PlayerId, cost: number): void {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Get active DON in cost area
    const activeDon = player.zones.costArea.filter(don => don.state === CardState.ACTIVE);
    
    if (activeDon.length < cost) {
      throw new Error(`Insufficient DON to pay cost ${cost}`);
    }

    // Rest the required number of DON
    for (let i = 0; i < cost; i++) {
      const don = activeDon[i];
      this.stateManager = this.stateManager.updateDon(don.id, {
        state: CardState.RESTED,
      });
    }
  }

  /**
   * Resolve a counter event's effect
   * 
   * This is a placeholder for the effect system (tasks 24-27).
   * When the effect system is implemented, this will:
   * 1. Create an effect instance from the event's effect definitions
   * 2. Resolve each effect through the effect system
   * 3. Effects might add power, draw cards, etc.
   * 
   * @param event - The counter event card
   * @param defender - The defending card
   */
  private resolveCounterEventEffect(event: CardInstance, defender: CardInstance): void {
    // TODO: Implement when EffectSystem is available (task 24-27)
    // For now, this is a placeholder that does nothing
    //
    // Future implementation:
    // for (const effectDef of event.definition.effects) {
    //   const effectInstance: EffectInstance = {
    //     effectDefinition: effectDef,
    //     source: event,
    //     controller: event.controller,
    //     targets: [{ type: TargetType.CARD, cardId: defender.id }],
    //     values: new Map(),
    //     context: null,
    //   };
    //   this.effectSystem.resolveEffect(effectInstance);
    // }
  }



  /**
   * Query the defending player for a counter action using Player interface
   * @param defenderId - The defending player's ID
   * @param attacker - The attacking card
   * @param defender - The defending card
   * @returns Promise resolving to the chosen counter action or null if no counter
   */
  protected async queryDefenderForCounterActionAsync(
    defenderId: PlayerId,
    attacker: CardInstance,
    defender: CardInstance
  ): Promise<CounterAction | null> {
    const player = this.playerInstances?.get(defenderId);
    if (player) {
      // Build counter options from defender's hand
      const defenderPlayer = this.stateManager.getPlayer(defenderId);
      if (!defenderPlayer) {
        return { type: 'PASS' };
      }

      const counterOptions: CounterAction[] = [{ type: 'PASS' }];
      
      // Add cards with counter values
      for (const card of defenderPlayer.zones.hand) {
        if (card.definition.counterValue !== null && card.definition.counterValue !== undefined) {
          counterOptions.push({
            type: 'USE_COUNTER_CARD',
            cardId: card.id,
          });
        }
      }

      // Add counter events
      for (const card of defenderPlayer.zones.hand) {
        if (card.definition.category === 'EVENT') {
          // TODO: Check if event has counter timing when effect system is available
          counterOptions.push({
            type: 'PLAY_COUNTER_EVENT',
            cardId: card.id,
          });
        }
      }

      return await player.chooseCounterAction(counterOptions, this.stateManager.getState());
    }
    // If no player instance is registered, default to PASS
    // This maintains backward compatibility with tests that don't set up players
    return { type: 'PASS' };
  }

  /**
   * Execute the damage step of battle
   * 
   * - Compare attacker power to defender power
   * - If attacker power < defender power: no damage, battle ends
   * - If defender is leader: calculate damage amount (1 or 2 for Double Attack), call dealLeaderDamage
   * - If defender is character: call koCharacter
   * 
   * @param attacker - The attacking card
   * @param defender - The defending card (original target or blocker)
   * @returns Object with damage dealt and whether defender was KO'd
   */
  private damageStep(
    attacker: CardInstance,
    defender: CardInstance
  ): { damageDealt: number; defenderKOd: boolean } {
    // Get current power values after all modifiers (including counters)
    const attackerPower = this.damageCalculator.computeCurrentPower(attacker);
    const defenderPower = this.damageCalculator.computeCurrentPower(defender);

    // Compare powers - if attacker power is less than defender power, no damage
    if (attackerPower < defenderPower) {
      return { damageDealt: 0, defenderKOd: false };
    }

    // Determine if defender is a leader or character
    const isLeader = defender.zone === ZoneId.LEADER_AREA;

    if (isLeader) {
      // Calculate damage amount
      // Check for Double Attack keyword - deals 2 damage instead of 1
      const hasDoubleAttack = this.keywordHandler.hasDoubleAttack(attacker);
      const intendedDamage = hasDoubleAttack ? 2 : 1;

      // Deal damage to leader and get actual damage dealt (may be less if life runs out)
      const actualDamage = this.dealLeaderDamage(defender, intendedDamage);

      return { damageDealt: actualDamage, defenderKOd: false };
    } else {
      // Defender is a character - K.O. it
      this.koCharacter(defender);

      return { damageDealt: 0, defenderKOd: true };
    }
  }

  /**
   * Deal damage to a leader by moving life cards to hand
   * 
   * For each point of damage:
   * 1. Check if life is empty (defeat if so)
   * 2. Take top life card
   * 3. If life card has Trigger keyword: query player to activate or add to hand
   * 4. If trigger activated: move to LIMBO, resolve trigger effect, place in trash (or hand per effect)
   * 5. If not trigger or not activated: add to hand
   * 6. Run defeat check after each life card
   * 
   * @param leader - The leader taking damage
   * @param damageAmount - The amount of damage (number of life cards to take)
   * @returns The actual number of life cards processed (may be less than damageAmount if life runs out)
   */
  private dealLeaderDamage(leader: CardInstance, damageAmount: number): number {
    const defendingPlayer = this.stateManager.getPlayer(leader.controller);
    if (!defendingPlayer) {
      throw new Error(`Defending player ${leader.controller} not found`);
    }

    let actualDamageDealt = 0;

    // Process each point of damage separately
    for (let i = 0; i < damageAmount; i++) {
      // Check if life is empty - if so, player is defeated
      const currentPlayer = this.stateManager.getPlayer(leader.controller);
      if (!currentPlayer || currentPlayer.zones.life.length === 0) {
        // Player has no life cards remaining - they are defeated
        this.markPlayerDefeated(leader.controller);
        return actualDamageDealt; // Return actual damage dealt before running out of life
      }

      // Take the top life card (first card in life zone)
      const lifeCard = currentPlayer.zones.life[0];
      
      // Check if the life card has the Trigger keyword
      const hasTrigger = this.keywordHandler.hasTrigger(lifeCard);
      
      if (hasTrigger) {
        // Query player whether to activate the trigger
        const shouldActivate = this.queryPlayerForTriggerActivation(
          leader.controller,
          lifeCard
        );
        
        if (shouldActivate) {
          // Activate the trigger effect
          // Note: In the full implementation, the card would move to LIMBO, resolve effects, then move to trash/hand
          // However, since LIMBO zone is not yet implemented in PlayerState and the effect system
          // is not yet available (tasks 24-27), we simplify this for now:
          // 1. Resolve trigger effect (placeholder - does nothing currently)
          // 2. Move directly to trash (default behavior)
          //
          // When effect system is implemented (task 24-27), this will be updated to:
          // - Move card to LIMBO
          // - Resolve trigger effect through effect system
          // - Effect system will move card to final destination (trash or hand based on effect)
          
          this.resolveTriggerEffect(lifeCard);
          
          // Move to trash as default behavior
          // Note: Some trigger effects may move the card to hand instead
          // When effect system is implemented, the effect resolution will handle the final destination
          this.stateManager = this.stateManager.moveCard(lifeCard.id, ZoneId.TRASH);
        } else {
          // Player chose not to activate trigger - add to hand
          this.stateManager = this.stateManager.moveCard(lifeCard.id, ZoneId.HAND);
        }
      } else {
        // No trigger keyword - add directly to hand
        this.stateManager = this.stateManager.moveCard(lifeCard.id, ZoneId.HAND);
      }
      
      // Increment actual damage dealt
      actualDamageDealt++;
      
      // Run defeat check after each life card is processed
      this.checkForDefeat();
      
      // If game is over, stop processing further damage
      if (this.stateManager.isGameOver()) {
        return actualDamageDealt;
      }
    }

    return actualDamageDealt;
  }

  /**
   * Execute the end battle step
   * 
   * - Emit BATTLE_END event
   * - Trigger END_OF_BATTLE effects for both players
   * - Expire "during this battle" modifiers (UNTIL_END_OF_BATTLE duration)
   * 
   * @param attacker - The attacking card
   * @param defender - The defending card (original target or blocker)
   * @param damageDealt - The amount of damage dealt in the battle
   */
  private endBattle(
    attacker: CardInstance,
    defender: CardInstance,
    damageDealt: number
  ): void {
    // Emit BATTLE_END event
    const battleEndEvent: BattleEndEvent = {
      type: GameEventType.BATTLE_END,
      timestamp: Date.now(),
      attackerId: attacker.id,
      defenderId: defender.id,
      attackingPlayerId: attacker.controller,
      defendingPlayerId: defender.controller,
      damageDealt: damageDealt,
    };
    this.eventEmitter.emit(battleEndEvent);

    // Trigger effects through the effect system
    if (this.effectSystem) {
      // Trigger END_OF_BATTLE effects
      this.effectSystem.triggerEffects({
        type: GameEventType.BATTLE_END,
        playerId: attacker.controller,
        cardId: attacker.id,
        timestamp: Date.now(),
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          attackingPlayerId: attacker.controller,
          defendingPlayerId: defender.controller,
          damageDealt: damageDealt,
        },
      });

      // Resolve the effect stack
      this.effectSystem.resolveStack();

      // Update state manager after effect resolution
      this.stateManager = this.effectSystem.getStateManager();
    }

    // Expire "during this battle" modifiers (UNTIL_END_OF_BATTLE duration)
    this.expireBattleModifiers();
  }

  /**
   * K.O. a character by moving it to trash
   * 
   * Process:
   * 1. Check for "On K.O." effects while card is still on field
   * 2. Enqueue On K.O. triggers
   * 3. Move card to trash
   * 4. Enqueue triggers for resolution by effect system
   * 
   * Note: The actual trigger resolution will be handled by the EffectSystem
   * (tasks 24-27). For now, we collect the triggers but don't resolve them.
   * 
   * @param character - The character to K.O.
   */
  private koCharacter(character: CardInstance): void {
    // Execute K.O. process using the KOHandler
    const result = koCharacterHandler(character, this.stateManager);
    
    // Update state manager with the result
    this.stateManager = result.stateManager;
    
    // Add triggers to pending triggers in game state
    // Note: When EffectSystem is implemented (tasks 24-27), these triggers
    // will be resolved through the proper trigger queue system
    if (result.triggers.length > 0) {
      const currentState = this.stateManager.getState();
      const updatedState = {
        ...currentState,
        pendingTriggers: [...currentState.pendingTriggers, ...result.triggers],
      };
      this.stateManager = new GameStateManager(updatedState);
    }
  }



  /**
   * Check if a card is still on the field (in play zones)
   * 
   * A card is considered "on field" if it's in:
   * - Leader area
   * - Character area
   * - Stage area
   * 
   * @param cardId - The ID of the card to check
   * @returns True if the card is on field, false otherwise
   */
  private isCardOnField(cardId: string): boolean {
    const card = this.stateManager.getCard(cardId);
    if (!card) {
      return false;
    }

    // Check if card is in a field zone
    const fieldZones = [
      ZoneId.LEADER_AREA,
      ZoneId.CHARACTER_AREA,
      ZoneId.STAGE_AREA,
    ];

    return fieldZones.includes(card.zone);
  }

  /**
   * Check if a card has a specific keyword
   * 
   * @param card - The card to check
   * @param keyword - The keyword to look for
   * @returns True if the card has the keyword
   * @deprecated Use keywordHandler.hasKeyword() instead
   */
  private hasKeyword(card: CardInstance, keyword: string): boolean {
    return this.keywordHandler.hasKeyword(card, keyword);
  }

  /**
   * Query the player whether to activate a trigger effect on a life card
   * 
   * This is a placeholder for the player input system.
   * In a real implementation, this would:
   * 1. Present the trigger card to the player
   * 2. Show the trigger effect text
   * 3. Allow them to choose to activate or add to hand
   * 4. Return the player's choice
   * 
   * For now, this returns false (don't activate) to allow testing.
   * Protected to allow test subclasses to override for testing purposes.
   * 
   * @param playerId - The player making the choice
   * @param lifeCard - The life card with a trigger
   * @returns True if player wants to activate trigger, false to add to hand
   */
  protected queryPlayerForTriggerActivation(
    playerId: PlayerId,
    lifeCard: CardInstance
  ): boolean {
    // TODO: Implement player input system (future task)
    // For now, return false (add to hand, don't activate)
    // This allows the trigger logic to be tested by calling dealLeaderDamage directly
    // or by implementing a test-specific version of this method
    return false;
  }

  /**
   * Resolve a trigger effect from a life card
   * 
   * This is a placeholder for the effect system (tasks 24-27).
   * When the effect system is implemented, this will:
   * 1. Find trigger effects on the card
   * 2. Create effect instances for each trigger
   * 3. Resolve the effects through the effect system
   * 4. Effects may move the card, add power, draw cards, etc.
   * 
   * @param triggerCard - The card with trigger effects to resolve
   */
  private resolveTriggerEffect(triggerCard: CardInstance): void {
    // TODO: Implement when EffectSystem is available (task 24-27)
    // For now, this is a placeholder that does nothing
    //
    // Future implementation:
    // const triggerEffects = triggerCard.definition.effects.filter(
    //   effect => effect.triggerTiming === TriggerTiming.ON_TRIGGER
    // );
    // for (const effect of triggerEffects) {
    //   const effectInstance: EffectInstance = {
    //     effectDefinition: effect,
    //     source: triggerCard,
    //     controller: triggerCard.controller,
    //     targets: [],
    //     values: new Map(),
    //     context: null,
    //   };
    //   this.effectSystem.resolveEffect(effectInstance);
    // }
  }

  /**
   * Mark a player as defeated
   * 
   * This sets the game over flag and determines the winner.
   * 
   * @param defeatedPlayerId - The player who was defeated
   */
  private markPlayerDefeated(defeatedPlayerId: PlayerId): void {
    // Determine the winner (the other player)
    const winner = defeatedPlayerId === PlayerId.PLAYER_1 
      ? PlayerId.PLAYER_2 
      : PlayerId.PLAYER_1;
    
    // Update game state to mark game as over
    const newState = this.stateManager.getState();
    const updatedState = {
      ...newState,
      gameOver: true,
      winner: winner,
    };
    
    this.stateManager = new GameStateManager(updatedState);
  }

  /**
   * Check for defeat conditions
   * 
   * Checks if any player has zero life cards remaining and marks them as defeated.
   * This is called after each life card is processed during damage resolution.
   * 
   * Additional defeat conditions (empty deck, etc.) will be added in future tasks.
   */
  private checkForDefeat(): void {
    // Check both players for zero life
    for (const playerId of [PlayerId.PLAYER_1, PlayerId.PLAYER_2]) {
      const player = this.stateManager.getPlayer(playerId);
      if (player && player.zones.life.length === 0) {
        // Player has no life cards remaining - they are defeated
        this.markPlayerDefeated(playerId);
        return; // Game is over, no need to check further
      }
    }
  }



  /**
   * Expire all modifiers with UNTIL_END_OF_BATTLE duration
   * 
   * This removes all battle-duration modifiers from all cards in play.
   * Battle modifiers include counter boosts and temporary power changes
   * that only last for the duration of a single battle.
   */
  private expireBattleModifiers(): void {
    const state = this.stateManager.getState();
    
    // Iterate through both players
    for (const playerId of [PlayerId.PLAYER_1, PlayerId.PLAYER_2]) {
      const player = this.stateManager.getPlayer(playerId);
      if (!player) continue;

      // Collect all cards that might have modifiers
      const cardsToCheck: (CardInstance | null)[] = [
        player.zones.leaderArea,
        ...player.zones.characterArea,
      ];
      
      // Add stage if it exists
      if (player.zones.stageArea) {
        cardsToCheck.push(player.zones.stageArea);
      }

      // Filter out null cards and expire battle modifiers on each card
      for (const card of cardsToCheck.filter((c): c is CardInstance => c !== null)) {
        // Filter out modifiers with UNTIL_END_OF_BATTLE duration
        const remainingModifiers = card.modifiers.filter(
          modifier => modifier.duration !== ModifierDuration.UNTIL_END_OF_BATTLE
        );

        // Only update if modifiers were removed
        if (remainingModifiers.length !== card.modifiers.length) {
          this.stateManager = this.stateManager.updateCard(card.id, {
            modifiers: remainingModifiers,
          });
        }
      }
    }
  }

  /**
   * Update the state manager (used after state changes)
   * 
   * @param newStateManager - The updated state manager
   */
  updateStateManager(newStateManager: GameStateManager): void {
    this.stateManager = newStateManager;
    // Also update effect system if it exists
    if (this.effectSystem) {
      this.effectSystem.updateStateManager(newStateManager);
    }
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
