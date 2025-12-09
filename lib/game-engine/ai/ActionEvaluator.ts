/**
 * ActionEvaluator - Core evaluation engine for AI decision-making
 * 
 * This class evaluates potential actions by simulating their effects and scoring
 * the resulting game states based on multiple evaluation factors.
 */

import {
  GameState,
  PlayerId,
  GameAction,
  CardInstance,
  CardState,
  ActionType,
  Phase,
  CardCategory,
} from '../core/types';
import {
  EvaluationWeights,
  EvaluationFactors,
} from './types';
import {
  EffectDefinition,
  EffectInstance,
  EffectType,
  Target,
  TargetType,
} from '../effects/types';
import { GameLogger } from '../utils/GameLogger';

/**
 * ActionEvaluator evaluates game actions and states to provide numeric scores
 * for AI decision-making.
 */
export class ActionEvaluator {
  private weights: EvaluationWeights;
  private logger?: GameLogger;

  /**
   * Create a new ActionEvaluator with the specified evaluation weights
   * @param weights - Weights for different evaluation factors
   * @param logger - Optional game logger for logging AI decisions
   */
  constructor(weights: EvaluationWeights, logger?: GameLogger) {
    this.weights = weights;
    this.logger = logger;
  }

  /**
   * Evaluate an action and return a numeric score
   * Higher scores indicate better actions
   * 
   * @param action - The action to evaluate
   * @param state - Current game state
   * @param playerId - ID of the player making the action
   * @returns Numeric score for the action
   */
  evaluateAction(action: GameAction, state: GameState, playerId: PlayerId): number {
    // Use specific evaluators for certain action types for more accurate scoring
    let score: number;
    switch (action.type) {
      case ActionType.DECLARE_ATTACK:
        score = this.evaluateAttackAction(action, state, playerId);
        break;
      case ActionType.PLAY_CARD:
        score = this.evaluatePlayCardAction(action, state, playerId);
        break;
      case ActionType.GIVE_DON:
        score = this.evaluateGiveDonAction(action, state, playerId);
        break;
      case ActionType.ACTIVATE_EFFECT:
        score = this.evaluateActivateEffectAction(action, state, playerId);
        break;
      default:
        // For other actions, use generic simulation-based evaluation
        score = this.evaluateGenericAction(action, state, playerId);
    }

    // Log the evaluation
    if (this.logger) {
      this.logger.logAIActionEvaluation(playerId, action, score);
    }

    return score;
  }

  /**
   * Evaluate an attack action using detailed combat logic
   * 
   * @param action - The attack action
   * @param state - Current game state
   * @param playerId - ID of the attacking player
   * @returns Score for this attack
   */
  private evaluateAttackAction(action: GameAction, state: GameState, playerId: PlayerId): number {
    if (action.type !== ActionType.DECLARE_ATTACK) return -100;
    
    const { attackerId, targetId } = action;
    const player = state.players.get(playerId);
    if (!player) return -100;

    // Find the attacker
    const attacker = player.zones.characterArea.find(c => c.id === attackerId) ||
                    (player.zones.leaderArea?.id === attackerId ? player.zones.leaderArea : null);
    
    if (!attacker) return -100;

    // Determine the target
    let target: CardInstance | 'leader';
    if (targetId === 'leader') {
      target = 'leader';
    } else {
      const opponent = state.players.get(this.getOpponentId(playerId));
      if (!opponent) return -100;
      
      const targetCard = opponent.zones.characterArea.find(c => c.id === targetId);
      if (!targetCard) return -100;
      
      target = targetCard;
    }

    // Use the detailed evaluateAttack method
    return this.evaluateAttack(attacker, target, state, playerId);
  }

  /**
   * Evaluate a play card action
   * 
   * @param action - The play card action
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for playing this card
   */
  private evaluatePlayCardAction(action: GameAction, state: GameState, playerId: PlayerId): number {
    if (action.type !== ActionType.PLAY_CARD) return -100;
    
    const { cardId } = action;
    const player = state.players.get(playerId);
    if (!player) return -100;

    const card = player.zones.hand.find(c => c.id === cardId);
    if (!card) return -100;

    return this.evaluatePlayCard(card, state, playerId);
  }

  /**
   * Evaluate a give DON action
   * 
   * @param action - The give DON action
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for this DON assignment
   */
  private evaluateGiveDonAction(action: GameAction, state: GameState, playerId: PlayerId): number {
    if (action.type !== ActionType.GIVE_DON) return -100;
    
    const { donId, targetCardId } = action;
    const player = state.players.get(playerId);
    if (!player) return -100;

    const don = player.zones.costArea.find(d => d.id === donId);
    if (!don) return -100;

    const target = player.zones.characterArea.find(c => c.id === targetCardId) ||
                  (player.zones.leaderArea?.id === targetCardId ? player.zones.leaderArea : null);
    
    if (!target) return -100;

    return this.evaluateGiveDon(don, target, state, playerId);
  }

  /**
   * Evaluate an activate effect action
   * 
   * @param action - The activate effect action
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for activating this effect
   */
  private evaluateActivateEffectAction(action: GameAction, state: GameState, playerId: PlayerId): number {
    if (action.type !== ActionType.ACTIVATE_EFFECT) return -100;
    
    const { effectId } = action;
    // For now, use a generic evaluation
    // In a full implementation, we would look up the effect and evaluate it
    return this.evaluateActivateEffect(effectId, state, playerId);
  }

  /**
   * Generic action evaluation using simulation and state comparison
   * 
   * @param action - The action to evaluate
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for the action
   */
  private evaluateGenericAction(action: GameAction, state: GameState, playerId: PlayerId): number {
    // Simulate the action to get the resulting state
    const simulatedState = this.simulateAction(action, state);
    
    // Compare the states to extract evaluation factors
    const factors = this.compareStates(state, simulatedState, playerId);
    
    // Calculate the total score based on factors and weights
    return this.calculateTotalScore(factors);
  }

  /**
   * Simulate an action on a game state to create a hypothetical future state
   * This is a shallow simulation that doesn't execute full game logic
   * 
   * @param action - The action to simulate
   * @param state - Current game state
   * @returns Simulated game state after the action
   */
  simulateAction(action: GameAction, state: GameState): GameState {
    // Create a shallow copy of the state for simulation
    const simulated: GameState = {
      ...state,
      players: new Map(state.players),
      pendingTriggers: [...state.pendingTriggers],
      history: [...state.history],
      loopGuardState: { ...state.loopGuardState },
    };

    // Copy player states
    simulated.players = new Map();
    state.players.forEach((playerState, playerId) => {
      simulated.players.set(playerId, {
        ...playerState,
        zones: {
          ...playerState.zones,
          deck: [...playerState.zones.deck],
          hand: [...playerState.zones.hand],
          trash: [...playerState.zones.trash],
          life: [...playerState.zones.life],
          donDeck: [...playerState.zones.donDeck],
          costArea: [...playerState.zones.costArea],
          characterArea: [...playerState.zones.characterArea],
        },
        flags: new Map(playerState.flags),
      });
    });

    // Simulate the action based on its type
    switch (action.type) {
      case ActionType.PLAY_CARD:
        this.simulatePlayCard(simulated, action);
        break;
      case ActionType.GIVE_DON:
        this.simulateGiveDon(simulated, action);
        break;
      case ActionType.DECLARE_ATTACK:
        this.simulateDeclareAttack(simulated, action);
        break;
      case ActionType.ACTIVATE_EFFECT:
        this.simulateActivateEffect(simulated, action);
        break;
      // Other action types have minimal impact on evaluation
      default:
        break;
    }

    return simulated;
  }

  /**
   * Compare two game states and extract evaluation factors
   * 
   * @param before - State before the action
   * @param after - State after the action
   * @param playerId - ID of the player being evaluated
   * @returns Evaluation factors comparing the two states
   */
  compareStates(before: GameState, after: GameState, playerId: PlayerId): EvaluationFactors {
    return {
      boardControl: this.evaluateBoardControl(after, playerId) - this.evaluateBoardControl(before, playerId),
      resourceEfficiency: this.evaluateResourceEfficiency(after, playerId) - this.evaluateResourceEfficiency(before, playerId),
      lifeDifferential: this.evaluateLifeDifferential(after, playerId) - this.evaluateLifeDifferential(before, playerId),
      cardAdvantage: this.evaluateCardAdvantage(after, playerId) - this.evaluateCardAdvantage(before, playerId),
      tempo: this.evaluateTempo(after, playerId) - this.evaluateTempo(before, playerId),
    };
  }

  /**
   * Evaluate board control - the number and power of characters on the field
   * 
   * @param state - Game state to evaluate
   * @param playerId - ID of the player being evaluated
   * @returns Board control score (-100 to 100)
   */
  evaluateBoardControl(state: GameState, playerId: PlayerId): number {
    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    
    if (!player || !opponent) return 0;

    // Calculate total power on board for both players
    const playerPower = player.zones.characterArea.reduce((sum, card) => {
      return sum + this.getCardPower(card);
    }, 0);

    const opponentPower = opponent.zones.characterArea.reduce((sum, card) => {
      return sum + this.getCardPower(card);
    }, 0);

    // Calculate character count advantage
    const playerCount = player.zones.characterArea.length;
    const opponentCount = opponent.zones.characterArea.length;

    // Normalize to -100 to 100 scale
    const powerDiff = playerPower - opponentPower;
    const countDiff = (playerCount - opponentCount) * 10;

    return Math.max(-100, Math.min(100, powerDiff / 10 + countDiff));
  }

  /**
   * Evaluate resource efficiency - DON usage and card cost effectiveness
   * 
   * @param state - Game state to evaluate
   * @param playerId - ID of the player being evaluated
   * @returns Resource efficiency score (-100 to 100)
   */
  evaluateResourceEfficiency(state: GameState, playerId: PlayerId): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    // Available DON in cost area
    const availableDon = player.zones.costArea.filter(don => don.state === CardState.ACTIVE).length;
    
    // DON attached to characters
    const attachedDon = player.zones.characterArea.reduce((sum, card) => {
      return sum + card.givenDon.length;
    }, 0);

    // Efficiency score based on DON utilization
    const totalDon = availableDon + attachedDon;
    const utilizationRate = totalDon > 0 ? attachedDon / totalDon : 0;

    // Normalize to -100 to 100 scale
    return Math.max(-100, Math.min(100, (utilizationRate - 0.5) * 200));
  }

  /**
   * Evaluate playing a specific card
   * Scores card plays based on cost, power, effects, and timing
   * 
   * @param card - The card to evaluate
   * @param state - Current game state
   * @param playerId - ID of the player playing the card
   * @returns Score for playing this card
   */
  evaluatePlayCard(card: CardInstance, state: GameState, playerId: PlayerId): number {
    let score = 0;
    const player = state.players.get(playerId);
    if (!player) return 0;

    const cost = card.definition.baseCost || 0;
    const power = card.definition.basePower || 0;

    // 1. Power-to-cost ratio (efficiency)
    if (cost > 0 && power > 0) {
      const efficiency = power / (cost * 1000); // Normalize power (e.g., 5000 power / 5 cost = 1.0)
      score += efficiency * 30; // High efficiency cards get bonus
    } else if (power > 0) {
      score += power / 200; // Free cards with power are valuable
    }

    // 2. Immediate impact - Rush keyword (can attack this turn)
    if (card.definition.keywords.includes('Rush')) {
      score += 25; // High value for immediate board impact
      
      // Extra value if we can deal lethal damage
      const opponent = state.players.get(this.getOpponentId(playerId));
      if (opponent && opponent.zones.life.length <= 2) {
        score += 15; // Prioritize Rush when opponent is low on life
      }
    }

    // 3. "On Play" effects provide immediate value
    const hasOnPlayEffect = card.definition.effects.some(
      effect => effect.triggerTiming === 'ON_PLAY'
    );
    if (hasOnPlayEffect) {
      score += 20; // Immediate effects are valuable
      
      // Extra value if hand is empty (card draw effects)
      if (player.zones.hand.length <= 2) {
        score += 10;
      }
    }

    // 4. Keywords that provide ongoing value
    if (card.definition.keywords.includes('Double Attack')) {
      score += 15; // Can attack twice
    }
    if (card.definition.keywords.includes('Blocker')) {
      score += 10; // Defensive utility
    }
    if (card.definition.keywords.includes('Banish')) {
      score += 12; // Powerful removal
    }

    // 5. Timing considerations
    const currentPhase = state.phase;
    if (currentPhase === Phase.MAIN) {
      // Early in turn, prefer setting up board
      if (card.definition.category === CardCategory.CHARACTER) {
        score += 5;
      }
    }

    // 6. Board state considerations
    const boardSpace = 5 - player.zones.characterArea.length;
    if (card.definition.category === CardCategory.CHARACTER) {
      if (boardSpace === 0) {
        return -100; // Can't play if board is full
      }
      if (boardSpace === 1) {
        score -= 10; // Penalize if almost full (save space for better cards)
      }
    }

    // 7. Resource considerations
    const availableDon = player.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;
    const donAfterPlay = availableDon - cost;
    
    if (donAfterPlay < 0) {
      return -100; // Can't afford the card
    }
    
    // Prefer to leave some DON for reactive plays
    if (donAfterPlay >= 2) {
      score += 5; // Good to have resources left
    } else if (donAfterPlay === 0) {
      score -= 5; // Using all resources is risky
    }

    // 8. Cost efficiency penalty for expensive cards early
    if (cost >= 7) {
      score -= 5; // High-cost cards are slower
    } else if (cost <= 3) {
      score += 5; // Low-cost cards are efficient
    }

    // 9. Stage cards provide ongoing value
    if (card.definition.category === CardCategory.STAGE) {
      if (!player.zones.stageArea) {
        score += 15; // First stage is valuable
      } else {
        score -= 20; // Already have a stage
      }
    }

    return score;
  }

  /**
   * Evaluate an attack action
   * Scores attacks based on damage potential, risk, and board impact
   * 
   * @param attacker - The attacking card
   * @param target - The target (card or 'leader')
   * @param state - Current game state
   * @param playerId - ID of the attacking player
   * @returns Score for this attack
   */
  evaluateAttack(
    attacker: CardInstance,
    target: CardInstance | 'leader',
    state: GameState,
    playerId: PlayerId
  ): number {
    let score = 0;
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    const attackerPower = this.getCardPower(attacker);
    const attackerBasePower = attacker.definition.basePower || 0;

    if (target === 'leader') {
      // 1. Attacking leader deals life damage
      score += 35; // Base value for life damage
      
      // 2. Check if this could win the game
      const opponentLife = opponent.zones.life.length;
      if (opponentLife === 1) {
        score += 100; // Winning attack is highest priority
      } else if (opponentLife === 2) {
        score += 50; // Getting close to winning
      } else if (opponentLife <= 3) {
        score += 25; // Applying pressure
      }

      // 3. Double Attack keyword doubles the value
      if (attacker.definition.keywords.includes('Double Attack')) {
        score += 40; // Can attack twice for more damage
      }

      // 4. Risk assessment - opponent might have blockers
      const potentialBlockers = opponent.zones.characterArea.filter(
        card => card.definition.keywords.includes('Blocker') && card.state === CardState.ACTIVE
      );
      
      if (potentialBlockers.length > 0) {
        // Reduce score based on blocker threat
        const strongestBlocker = Math.max(...potentialBlockers.map(b => this.getCardPower(b)));
        if (strongestBlocker >= attackerPower) {
          score -= 15; // Likely to be blocked and lose attacker
        } else {
          score -= 5; // Might be blocked but we win the battle
        }
      }

      // 5. Counter risk - opponent might have counter cards
      const opponentHandSize = opponent.zones.hand.length;
      if (opponentHandSize >= 3) {
        score -= 8; // Higher chance of counter
      } else if (opponentHandSize >= 1) {
        score -= 4; // Some counter risk
      }

    } else {
      // Attacking a character
      const targetPower = this.getCardPower(target);
      const targetBasePower = target.definition.basePower || 0;

      // 1. Value of removing the target
      score += targetBasePower / 200; // Base value from target's power
      
      // 2. High-value targets
      if (target.definition.keywords.includes('Rush')) {
        score += 15; // Remove immediate threats
      }
      if (target.definition.keywords.includes('Double Attack')) {
        score += 20; // Remove dangerous attackers
      }
      if (target.definition.keywords.includes('Blocker')) {
        score += 12; // Remove defensive pieces
      }

      // 3. Battle outcome prediction
      if (attackerPower > targetPower) {
        // We win the battle
        score += 25; // Clean removal is valuable
        
        // Extra value if we keep our attacker
        const powerDifference = attackerPower - targetPower;
        if (powerDifference >= 2000) {
          score += 10; // Safe removal
        }
      } else if (attackerPower === targetPower) {
        // Mutual destruction
        score += 10; // Trading is okay
        
        // Better if target is more valuable
        if (targetBasePower > attackerBasePower) {
          score += 15; // Good trade
        } else {
          score -= 5; // Bad trade
        }
      } else {
        // We lose the battle
        score -= 20; // Losing our attacker is bad
        
        // Only worth it if target is very valuable
        if (targetBasePower > attackerBasePower * 2) {
          score += 15; // Worth sacrificing for high-value removal
        } else {
          score -= 10; // Bad trade
        }
      }

      // 4. Board control considerations
      const opponentBoardSize = opponent.zones.characterArea.length;
      if (opponentBoardSize >= 4) {
        score += 8; // Removing characters when opponent has board advantage
      }

      // 5. Rested targets are easier to remove
      if (target.state === CardState.RESTED) {
        score += 10; // Free removal of rested characters
      }

      // 6. DON investment on target
      const targetDonCount = target.givenDon.length;
      if (targetDonCount >= 2) {
        score += targetDonCount * 5; // Removing DON investment is valuable
      }
    }

    // 7. Attacker considerations
    if (attacker.definition.keywords.includes('Banish')) {
      score += 15; // Banish is powerful removal
    }

    // 8. Cost of losing the attacker
    const attackerCost = attacker.definition.baseCost || 0;
    if (attackerCost >= 7) {
      score -= 10; // Expensive cards are harder to replace
    }

    return score;
  }

  /**
   * Evaluate giving DON to a card
   * Scores DON distribution based on power gain and attack potential
   * 
   * @param don - The DON instance to give (unused but kept for interface consistency)
   * @param target - The target card
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for giving DON to this target
   */
  evaluateGiveDon(_don: any, target: CardInstance, state: GameState, playerId: PlayerId): number {
    let score = 0;
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    const currentPower = this.getCardPower(target);
    const basePower = target.definition.basePower || 0;
    const powerAfterDon = currentPower + 1000; // Each DON adds 1000 power

    // 1. Prioritize characters that can attack immediately
    if (target.state === CardState.ACTIVE) {
      score += 30; // High priority for active characters
      
      // Check if this DON enables lethal damage
      const opponentLife = opponent.zones.life.length;
      if (opponentLife === 1) {
        score += 50; // Could enable winning attack
      } else if (opponentLife <= 3) {
        score += 20; // Applying pressure
      }
    } else {
      score += 5; // Rested characters can still benefit for defense
    }

    // 2. Power efficiency - higher base power benefits more from DON
    if (basePower >= 7000) {
      score += 20; // Strong characters become threats
    } else if (basePower >= 5000) {
      score += 15; // Medium characters
    } else if (basePower >= 3000) {
      score += 10; // Weaker characters
    } else {
      score += 5; // Low power characters
    }

    // 3. Keywords that benefit from higher power
    if (target.definition.keywords.includes('Double Attack')) {
      score += 25; // Double Attack benefits greatly from power
    }
    if (target.definition.keywords.includes('Rush')) {
      score += 20; // Rush can attack immediately
    }
    if (target.definition.keywords.includes('Blocker')) {
      score += 12; // Better blocker with more power
    }

    // 4. Battle considerations - check if DON enables winning battles
    const opponentCharacters = opponent.zones.characterArea;
    for (const opponentChar of opponentCharacters) {
      const opponentPower = this.getCardPower(opponentChar);
      
      // Check if this DON allows us to beat this character
      if (currentPower < opponentPower && powerAfterDon >= opponentPower) {
        score += 15; // Enables winning a battle we'd otherwise lose
      }
      
      // Check if this DON allows us to survive a battle
      if (currentPower <= opponentPower && powerAfterDon > opponentPower) {
        score += 10; // Enables surviving an attack
      }
    }

    // 5. Leader considerations
    if (target.definition.category === CardCategory.LEADER) {
      // Leaders benefit from DON for defense
      const opponentActiveCharacters = opponentCharacters.filter(
        c => c.state === CardState.ACTIVE
      );
      
      if (opponentActiveCharacters.length > 0) {
        score += 15; // Defensive value when opponent can attack
        
        // Check if DON helps survive potential attacks
        const strongestOpponent = Math.max(...opponentActiveCharacters.map(c => this.getCardPower(c)));
        if (currentPower < strongestOpponent && powerAfterDon >= strongestOpponent) {
          score += 20; // Enables surviving opponent's strongest attack
        }
      } else {
        score += 5; // Some defensive value
      }
    }

    // 6. DON investment considerations
    const currentDonCount = target.givenDon.length;
    if (currentDonCount === 0) {
      score += 10; // First DON on a character is valuable
    } else if (currentDonCount >= 3) {
      score -= 10; // Diminishing returns on heavily invested characters
    }

    // 7. Cost efficiency - don't over-invest in low-cost characters
    const targetCost = target.definition.baseCost || 0;
    if (targetCost <= 3 && currentDonCount >= 2) {
      score -= 15; // Over-investing in cheap characters
    } else if (targetCost >= 7) {
      score += 5; // High-cost characters are worth investing in
    }

    // 8. Board state - prioritize when we need board presence
    const player = state.players.get(playerId);
    if (player) {
      const ourBoardSize = player.zones.characterArea.length;
      const opponentBoardSize = opponentCharacters.length;
      
      if (ourBoardSize < opponentBoardSize) {
        score += 10; // Need to strengthen our board
      }
    }

    return score;
  }

  /**
   * Evaluate activating an effect
   * Scores effect activations based on impact and cost
   * 
   * @param effect - The effect to activate
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for activating this effect
   */
  evaluateActivateEffect(effect: any, state: GameState, playerId: PlayerId): number {
    let score = 10; // Base value for any effect activation
    
    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!player || !opponent) return score;

    // 1. Evaluate based on effect label/type
    const effectLabel = effect.label?.toLowerCase() || '';
    
    // Card draw effects
    if (effectLabel.includes('draw')) {
      const handSize = player.zones.hand.length;
      if (handSize <= 2) {
        score += 30; // High value when hand is low
      } else if (handSize <= 4) {
        score += 20; // Medium value
      } else {
        score += 10; // Lower value when hand is full
      }
    }

    // Search effects (deck manipulation)
    if (effectLabel.includes('search') || effectLabel.includes('look at')) {
      score += 25; // Card selection is valuable
      
      const deckSize = player.zones.deck.length;
      if (deckSize <= 10) {
        score += 10; // More valuable when deck is smaller
      }
    }

    // Removal effects (KO, return, trash)
    if (effectLabel.includes('k.o') || effectLabel.includes('ko') || 
        effectLabel.includes('trash') || effectLabel.includes('return')) {
      score += 35; // Removal is highly valuable
      
      const opponentBoardSize = opponent.zones.characterArea.length;
      if (opponentBoardSize >= 3) {
        score += 20; // More valuable when opponent has board presence
      }
      
      // Check for high-value targets
      const strongestOpponent = opponent.zones.characterArea.reduce((max, card) => {
        const power = this.getCardPower(card);
        return power > max ? power : max;
      }, 0);
      
      if (strongestOpponent >= 7000) {
        score += 15; // Valuable to remove strong characters
      }
    }

    // Power boost effects
    if (effectLabel.includes('+') || effectLabel.includes('power')) {
      score += 15; // Power boosts are useful
      
      // More valuable if we have active characters that can attack
      const activeCharacters = player.zones.characterArea.filter(
        c => c.state === CardState.ACTIVE
      );
      if (activeCharacters.length > 0) {
        score += 15; // Can enable attacks
      }
      
      // Check if boost could enable lethal
      const opponentLife = opponent.zones.life.length;
      if (opponentLife <= 2 && activeCharacters.length > 0) {
        score += 25; // Could enable winning
      }
    }

    // DON manipulation effects
    if (effectLabel.includes('don')) {
      score += 20; // DON effects are valuable
      
      const availableDon = player.zones.costArea.filter(d => d.state === CardState.ACTIVE).length;
      if (availableDon <= 2) {
        score += 15; // More valuable when low on DON
      }
    }

    // Life manipulation effects
    if (effectLabel.includes('life')) {
      const playerLife = player.zones.life.length;
      const opponentLife = opponent.zones.life.length;
      
      if (effectLabel.includes('add') || effectLabel.includes('gain')) {
        // Gaining life
        if (playerLife <= 2) {
          score += 30; // Critical when low on life
        } else if (playerLife <= 4) {
          score += 15; // Useful
        } else {
          score += 5; // Less valuable when healthy
        }
      }
      
      if (effectLabel.includes('damage') || effectLabel.includes('lose')) {
        // Dealing life damage
        if (opponentLife === 1) {
          score += 100; // Winning effect
        } else if (opponentLife <= 3) {
          score += 40; // High pressure
        } else {
          score += 20; // Always valuable
        }
      }
    }

    // Blocker-related effects
    if (effectLabel.includes('block')) {
      const opponentActiveChars = opponent.zones.characterArea.filter(
        c => c.state === CardState.ACTIVE
      );
      if (opponentActiveChars.length > 0) {
        score += 20; // Defensive value when opponent can attack
      }
    }

    // 2. Evaluate cost of activation
    if (effect.cost) {
      // If effect has a cost, reduce score based on cost
      const costStr = JSON.stringify(effect.cost).toLowerCase();
      
      if (costStr.includes('trash') || costStr.includes('discard')) {
        score -= 10; // Card disadvantage
        
        const handSize = player.zones.hand.length;
        if (handSize <= 2) {
          score -= 15; // More costly when hand is small
        }
      }
      
      if (costStr.includes('rest')) {
        score -= 5; // Tempo cost
      }
      
      if (costStr.includes('don')) {
        score -= 8; // Resource cost
      }
    }

    // 3. Timing considerations
    const currentPhase = state.phase;
    if (currentPhase === Phase.MAIN) {
      // Main phase - proactive effects are good
      if (effectLabel.includes('draw') || effectLabel.includes('search')) {
        score += 10; // Good time for card advantage
      }
    }

    // 4. Once per turn effects - use them or lose them
    if (effect.oncePerTurn) {
      score += 15; // Incentive to use limited effects
    }

    // 5. Game state urgency
    const playerLife = player.zones.life.length;
    const opponentLife = opponent.zones.life.length;
    
    if (playerLife <= 2) {
      // Desperate situation - prioritize defensive/recovery effects
      if (effectLabel.includes('life') || effectLabel.includes('block') || 
          effectLabel.includes('k.o') || effectLabel.includes('return')) {
        score += 20;
      }
    }
    
    if (opponentLife <= 2) {
      // Winning situation - prioritize aggressive effects
      if (effectLabel.includes('damage') || effectLabel.includes('power') || 
          effectLabel.includes('attack')) {
        score += 25;
      }
    }

    return score;
  }

  /**
   * Evaluate life differential - comparison of life totals between players
   * 
   * @param state - Game state to evaluate
   * @param playerId - ID of the player being evaluated
   * @returns Life differential score (-100 to 100)
   */
  evaluateLifeDifferential(state: GameState, playerId: PlayerId): number {
    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    
    if (!player || !opponent) return 0;

    const playerLife = player.zones.life.length;
    const opponentLife = opponent.zones.life.length;

    const lifeDiff = playerLife - opponentLife;

    // Normalize to -100 to 100 scale (assuming max 10 life)
    return Math.max(-100, Math.min(100, lifeDiff * 20));
  }

  /**
   * Evaluate card advantage - hand size and deck size comparison
   * 
   * @param state - Game state to evaluate
   * @param playerId - ID of the player being evaluated
   * @returns Card advantage score (-100 to 100)
   */
  evaluateCardAdvantage(state: GameState, playerId: PlayerId): number {
    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    
    if (!player || !opponent) return 0;

    const playerHand = player.zones.hand.length;
    const opponentHand = opponent.zones.hand.length;
    const playerDeck = player.zones.deck.length;
    const opponentDeck = opponent.zones.deck.length;

    const handDiff = playerHand - opponentHand;
    const deckDiff = (playerDeck - opponentDeck) / 10; // Deck difference is less important

    // Normalize to -100 to 100 scale
    return Math.max(-100, Math.min(100, handDiff * 15 + deckDiff * 5));
  }

  /**
   * Evaluate tempo - action speed and board impact
   * 
   * @param state - Game state to evaluate
   * @param playerId - ID of the player being evaluated
   * @returns Tempo score (-100 to 100)
   */
  evaluateTempo(state: GameState, playerId: PlayerId): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    // Count active (ready to act) characters
    const activeCharacters = player.zones.characterArea.filter(
      card => card.state === CardState.ACTIVE
    ).length;

    // Count available DON
    const availableDon = player.zones.costArea.filter(
      don => don.state === CardState.ACTIVE
    ).length;

    // Tempo is about having resources and threats ready
    const tempoScore = activeCharacters * 15 + availableDon * 5;

    // Normalize to -100 to 100 scale
    return Math.max(-100, Math.min(100, tempoScore - 50));
  }

  /**
   * Calculate the total score from evaluation factors using weights
   * 
   * @param factors - Evaluation factors
   * @returns Weighted total score
   */
  private calculateTotalScore(factors: EvaluationFactors): number {
    return (
      factors.boardControl * this.weights.boardControl +
      factors.resourceEfficiency * this.weights.resourceEfficiency +
      factors.lifeDifferential * this.weights.lifeDifferential +
      factors.cardAdvantage * this.weights.cardAdvantage +
      factors.tempo * this.weights.tempo
    );
  }

  /**
   * Get the opponent's player ID
   */
  private getOpponentId(playerId: PlayerId): PlayerId {
    return playerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
  }

  /**
   * Get the effective power of a card (base power + DON bonuses)
   */
  private getCardPower(card: CardInstance): number {
    const basePower = card.definition.basePower || 0;
    const donBonus = card.givenDon.length * 1000; // Each DON adds 1000 power
    return basePower + donBonus;
  }

  /**
   * Simulate playing a card
   */
  private simulatePlayCard(state: GameState, action: GameAction): void {
    if (action.type !== ActionType.PLAY_CARD) return;
    
    const { cardId } = action;
    const player = state.players.get(action.playerId);
    if (!player) return;

    // Find card in hand
    const cardIndex = player.zones.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.zones.hand[cardIndex];
    
    // Remove from hand
    player.zones.hand.splice(cardIndex, 1);

    // Add to appropriate zone based on category
    if (card.definition.category === 'CHARACTER') {
      player.zones.characterArea.push(card);
    } else if (card.definition.category === 'STAGE') {
      player.zones.stageArea = card;
    }
    // Events go to trash after resolution (not simulated here)
  }

  /**
   * Simulate giving DON to a card
   */
  private simulateGiveDon(state: GameState, action: GameAction): void {
    if (action.type !== ActionType.GIVE_DON) return;
    
    const { donId, targetCardId } = action;
    const player = state.players.get(action.playerId);
    if (!player) return;

    // Find DON in cost area
    const donIndex = player.zones.costArea.findIndex(d => d.id === donId);
    if (donIndex === -1) return;

    const don = player.zones.costArea[donIndex];

    // Find target card
    const targetCard = player.zones.characterArea.find(c => c.id === targetCardId) ||
                      (player.zones.leaderArea?.id === targetCardId ? player.zones.leaderArea : null);
    
    if (!targetCard) return;

    // Attach DON to card (cast to any to avoid type issues in simulation)
    (targetCard.givenDon as any[]).push(don);
  }

  /**
   * Simulate declaring an attack
   */
  private simulateDeclareAttack(state: GameState, action: GameAction): void {
    if (action.type !== ActionType.DECLARE_ATTACK) return;
    
    const { attackerId } = action;
    const player = state.players.get(action.playerId);
    if (!player) return;

    // Find attacker
    const attacker = player.zones.characterArea.find(c => c.id === attackerId) ||
                    (player.zones.leaderArea?.id === attackerId ? player.zones.leaderArea : null);
    
    if (!attacker) return;

    // Rest the attacker
    attacker.state = CardState.RESTED;
  }

  /**
   * Simulate activating an effect (minimal simulation)
   */
  private simulateActivateEffect(state: GameState, action: GameAction): void {
    // Effect simulation is complex and depends on the specific effect
    // For now, we just acknowledge the action without detailed simulation
    // This can be expanded in the future for more accurate evaluation
  }

  /**
   * Calculate optimal DON distribution to maximize board power and strategic value
   * This algorithm prioritizes characters that can attack immediately, reserves DON
   * for planned card plays, and gives excess DON to the leader for defense.
   * 
   * @param state - Current game state
   * @param playerId - ID of the player distributing DON
   * @returns Array of DON distribution recommendations, sorted by priority
   */
  distributeDon(state: GameState, playerId: PlayerId): Array<{ donId: string; targetCardId: string; score: number; reason: string }> {
    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    
    if (!player || !opponent) return [];

    // Get available DON in cost area (active DON that can be given)
    const availableDon = player.zones.costArea.filter(don => don.state === CardState.ACTIVE);
    
    if (availableDon.length === 0) return [];

    // Get all potential targets (characters + leader)
    const potentialTargets: CardInstance[] = [...player.zones.characterArea];
    if (player.zones.leaderArea) {
      potentialTargets.push(player.zones.leaderArea);
    }

    if (potentialTargets.length === 0) return [];

    // Calculate how much DON to reserve for card plays
    const reservedDonCount = this.calculateReservedDon(player, state);
    const donToDistribute = Math.max(0, availableDon.length - reservedDonCount);

    if (donToDistribute === 0) {
      // All DON should be reserved for card plays
      return [];
    }

    // Score each potential DON assignment
    const scoredAssignments: Array<{ donId: string; targetCardId: string; score: number; reason: string }> = [];

    for (let i = 0; i < donToDistribute && i < availableDon.length; i++) {
      const don = availableDon[i];
      
      for (const target of potentialTargets) {
        const score = this.evaluateDonAssignment(don, target, state, playerId);
        const reason = this.getDonAssignmentReason(target, state, playerId);
        
        scoredAssignments.push({
          donId: don.id,
          targetCardId: target.id,
          score,
          reason,
        });
      }
    }

    // Sort by score (highest first)
    scoredAssignments.sort((a, b) => b.score - a.score);

    // Select optimal distribution (greedy algorithm)
    const distribution: Array<{ donId: string; targetCardId: string; score: number; reason: string }> = [];
    const usedDon = new Set<string>();
    const targetDonCount = new Map<string, number>();

    // Initialize target DON counts
    for (const target of potentialTargets) {
      targetDonCount.set(target.id, target.givenDon.length);
    }

    for (const assignment of scoredAssignments) {
      if (usedDon.has(assignment.donId)) continue;
      if (distribution.length >= donToDistribute) break;

      // Check if this assignment is still valuable given previous assignments
      const currentTargetDon = targetDonCount.get(assignment.targetCardId) || 0;
      
      // Avoid over-investing in a single target (diminishing returns)
      if (currentTargetDon >= 3) {
        // Skip unless it's a high-value target
        const target = potentialTargets.find(t => t.id === assignment.targetCardId);
        if (!target || (target.definition.baseCost || 0) < 7) {
          continue;
        }
      }

      distribution.push(assignment);
      usedDon.add(assignment.donId);
      targetDonCount.set(assignment.targetCardId, currentTargetDon + 1);
    }

    return distribution;
  }

  /**
   * Calculate how much DON should be reserved for playing cards from hand
   * 
   * @param player - Player state
   * @param state - Current game state
   * @returns Number of DON to reserve
   */
  private calculateReservedDon(player: any, state: GameState): number {
    // Look at cards in hand and determine if we should reserve DON
    const hand = player.zones.hand;
    
    if (hand.length === 0) return 0;

    // Find the most valuable playable card in hand
    let highestValueCard: CardInstance | null = null;
    let highestScore = 0;

    for (const card of hand) {
      const cost = card.definition.baseCost || 0;
      const availableDon = player.zones.costArea.filter((d: any) => d.state === CardState.ACTIVE).length;
      
      // Only consider cards we can afford or will be able to afford soon
      if (cost <= availableDon + 2) {
        const score = this.evaluatePlayCard(card, state, player.id);
        if (score > highestScore) {
          highestScore = score;
          highestValueCard = card;
        }
      }
    }

    // If we have a high-value card to play, reserve DON for it
    if (highestValueCard && highestScore > 30) {
      const cost = highestValueCard.definition.baseCost || 0;
      const availableDon = player.zones.costArea.filter((d: any) => d.state === CardState.ACTIVE).length;
      
      // Reserve DON if we're close to being able to play it
      if (cost > availableDon - 2 && cost <= availableDon) {
        return Math.min(cost, 2); // Reserve up to 2 DON for card plays
      }
    }

    // Reserve 1 DON for reactive plays (counters, etc.) if we have cards in hand
    if (hand.length >= 3) {
      return 1;
    }

    return 0;
  }

  /**
   * Evaluate a specific DON assignment to a target
   * 
   * @param don - DON instance to assign
   * @param target - Target card to receive DON
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for this DON assignment
   */
  private evaluateDonAssignment(don: any, target: CardInstance, state: GameState, playerId: PlayerId): number {
    let score = 0;
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    const currentPower = this.getCardPower(target);
    const basePower = target.definition.basePower || 0;
    const powerAfterDon = currentPower + 1000;
    const currentDonCount = target.givenDon.length;

    // 1. HIGHEST PRIORITY: Characters that can attack immediately
    if (target.state === CardState.ACTIVE && target.definition.category === CardCategory.CHARACTER) {
      score += 40; // Very high priority for active characters
      
      // Check if this enables lethal damage
      const opponentLife = opponent.zones.life.length;
      if (opponentLife === 1) {
        score += 60; // Could enable winning attack
      } else if (opponentLife === 2) {
        score += 30; // Close to winning
      } else if (opponentLife <= 3) {
        score += 15; // Applying pressure
      }

      // Characters with Rush are especially valuable
      if (target.definition.keywords.includes('Rush')) {
        score += 25;
      }

      // Double Attack characters benefit greatly from power
      if (target.definition.keywords.includes('Double Attack')) {
        score += 30;
      }
    } else if (target.state === CardState.RESTED && target.definition.category === CardCategory.CHARACTER) {
      // Rested characters have lower priority but still benefit
      score += 10;
    }

    // 2. Power efficiency - maximize board power
    if (basePower >= 7000) {
      score += 20; // Strong characters become bigger threats
    } else if (basePower >= 5000) {
      score += 15;
    } else if (basePower >= 3000) {
      score += 10;
    } else {
      score += 5;
    }

    // 3. Battle math - check if DON enables winning specific battles
    const opponentCharacters = opponent.zones.characterArea;
    let battleAdvantages = 0;
    
    for (const opponentChar of opponentCharacters) {
      const opponentPower = this.getCardPower(opponentChar);
      
      // Check if this DON allows us to beat this character
      if (currentPower < opponentPower && powerAfterDon >= opponentPower) {
        battleAdvantages++;
        score += 18; // Enables winning a battle
      }
      
      // Check if this DON allows us to survive a battle
      if (currentPower <= opponentPower && powerAfterDon > opponentPower) {
        battleAdvantages++;
        score += 12; // Enables surviving an attack
      }
    }

    // Bonus for enabling multiple battle advantages
    if (battleAdvantages >= 2) {
      score += 15;
    }

    // 4. Keywords that benefit from higher power
    if (target.definition.keywords.includes('Blocker')) {
      score += 15; // Better blocker with more power
      
      // Extra value if opponent has active attackers
      const opponentActiveChars = opponentCharacters.filter(c => c.state === CardState.ACTIVE);
      if (opponentActiveChars.length > 0) {
        score += 10;
      }
    }

    // 5. Leader considerations - defensive power
    if (target.definition.category === CardCategory.LEADER) {
      const opponentActiveCharacters = opponentCharacters.filter(c => c.state === CardState.ACTIVE);
      
      if (opponentActiveCharacters.length > 0) {
        score += 20; // Defensive value when opponent can attack
        
        // Check if DON helps survive potential attacks
        const strongestOpponent = Math.max(
          ...opponentActiveCharacters.map(c => this.getCardPower(c)),
          0
        );
        
        if (currentPower < strongestOpponent && powerAfterDon >= strongestOpponent) {
          score += 25; // Enables surviving opponent's strongest attack
        }
      } else {
        score += 8; // Some defensive value even without immediate threats
      }
      
      // Lower priority than active characters
      score -= 15;
    }

    // 6. Diminishing returns on DON investment
    if (currentDonCount === 0) {
      score += 12; // First DON on a character is valuable
    } else if (currentDonCount === 1) {
      score += 5; // Second DON is still good
    } else if (currentDonCount >= 2) {
      score -= 10; // Diminishing returns
    }
    
    if (currentDonCount >= 3) {
      score -= 20; // Heavy penalty for over-investment
    }

    // 7. Cost efficiency - avoid over-investing in low-cost characters
    const targetCost = target.definition.baseCost || 0;
    if (targetCost <= 3 && currentDonCount >= 2) {
      score -= 20; // Over-investing in cheap characters
    } else if (targetCost >= 7) {
      score += 8; // High-cost characters are worth investing in
    } else if (targetCost >= 5) {
      score += 5; // Medium-cost characters
    }

    // 8. Board state considerations
    const player = state.players.get(playerId);
    if (player) {
      const ourBoardSize = player.zones.characterArea.length;
      const opponentBoardSize = opponentCharacters.length;
      
      if (ourBoardSize < opponentBoardSize) {
        score += 8; // Need to strengthen our board
      }
      
      // If we have few characters, focus DON on them
      if (ourBoardSize <= 2 && target.definition.category === CardCategory.CHARACTER) {
        score += 10;
      }
    }

    // 9. Strategic considerations based on game state
    const playerState = state.players.get(playerId);
    if (playerState) {
      const playerLife = playerState.zones.life.length;
      const opponentLife = opponent.zones.life.length;
      
      // Aggressive when ahead or close to winning
      if (opponentLife <= 3 && target.state === CardState.ACTIVE) {
        score += 15; // Push for the win
      }
      
      // Defensive when behind
      if (playerLife <= 2) {
        if (target.definition.keywords.includes('Blocker')) {
          score += 15; // Prioritize defense
        }
        if (target.definition.category === CardCategory.LEADER) {
          score += 10; // Strengthen leader defense
        }
      }
    }

    return score;
  }

  /**
   * Get a human-readable reason for a DON assignment
   * 
   * @param target - Target card receiving DON
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Reason string
   */
  private getDonAssignmentReason(target: CardInstance, state: GameState, playerId: PlayerId): string {
    const opponent = state.players.get(this.getOpponentId(playerId));
    
    if (target.state === CardState.ACTIVE && target.definition.category === CardCategory.CHARACTER) {
      if (opponent && opponent.zones.life.length <= 2) {
        return 'Can attack for lethal damage';
      }
      if (target.definition.keywords.includes('Rush')) {
        return 'Rush character can attack immediately';
      }
      if (target.definition.keywords.includes('Double Attack')) {
        return 'Double Attack for maximum damage';
      }
      return 'Active character ready to attack';
    }
    
    if (target.definition.keywords.includes('Blocker')) {
      return 'Strengthen blocker for defense';
    }
    
    if (target.definition.category === CardCategory.LEADER) {
      return 'Increase leader defensive power';
    }
    
    if (target.definition.category === CardCategory.CHARACTER) {
      const basePower = target.definition.basePower || 0;
      if (basePower >= 7000) {
        return 'Maximize high-power character';
      }
      return 'Strengthen character for future attacks';
    }
    
    return 'Increase board power';
  }

  // ============================================================================
  // Effect Evaluation Methods (Task 27)
  // ============================================================================

  /**
   * Evaluate an effect activation
   * Scores effect activations based on their impact on the game state
   * 
   * @param effect - The effect definition to evaluate
   * @param state - Current game state
   * @param playerId - ID of the player activating the effect
   * @returns Score for activating this effect
   */
  evaluateEffectActivation(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!player || !opponent) return 0;

    let score = 0;

    // Base value for any effect activation
    score += 10;

    // Evaluate based on effect type
    switch (effect.effectType) {
      case EffectType.POWER_MODIFICATION:
        score += this.evaluatePowerModificationEffect(effect, state, playerId);
        break;
      case EffectType.KO_CHARACTER:
        score += this.evaluateKOEffect(effect, state, playerId);
        break;
      case EffectType.BOUNCE_CHARACTER:
        score += this.evaluateBounceEffect(effect, state, playerId);
        break;
      case EffectType.DRAW_CARDS:
        score += this.evaluateDrawEffect(effect, state, playerId);
        break;
      case EffectType.SEARCH_DECK:
        score += this.evaluateSearchEffect(effect, state, playerId);
        break;
      case EffectType.DISCARD_CARDS:
        score += this.evaluateDiscardEffect(effect, state, playerId);
        break;
      case EffectType.GRANT_KEYWORD:
        score += this.evaluateKeywordGrantEffect(effect, state, playerId);
        break;
      case EffectType.ATTACH_DON:
        score += this.evaluateAttachDonEffect(effect, state, playerId);
        break;
      case EffectType.REST_CHARACTER:
        score += this.evaluateRestEffect(effect, state, playerId);
        break;
      case EffectType.ACTIVATE_CHARACTER:
        score += this.evaluateActivateCharacterEffect(effect, state, playerId);
        break;
      case EffectType.DEAL_DAMAGE:
        score += this.evaluateDealDamageEffect(effect, state, playerId);
        break;
      default:
        // Generic evaluation for unknown effect types
        score += 15;
    }

    // Adjust for cost
    if (effect.cost) {
      score -= this.evaluateEffectCost(effect.cost, state, playerId);
    }

    // Bonus for once-per-turn effects (use them or lose them)
    if (effect.oncePerTurn && !effect.usedThisTurn) {
      score += 15;
    }

    // Adjust based on game state urgency
    const playerLife = player.zones.life.length;
    const opponentLife = opponent.zones.life.length;

    if (playerLife <= 2) {
      // Desperate - prioritize defensive/recovery effects
      if (effect.effectType === EffectType.KO_CHARACTER ||
          effect.effectType === EffectType.BOUNCE_CHARACTER ||
          effect.effectType === EffectType.REST_CHARACTER) {
        score += 20;
      }
    }

    if (opponentLife <= 2) {
      // Winning - prioritize aggressive effects
      if (effect.effectType === EffectType.DEAL_DAMAGE ||
          effect.effectType === EffectType.POWER_MODIFICATION ||
          effect.effectType === EffectType.GRANT_KEYWORD) {
        score += 25;
      }
    }

    return score;
  }

  /**
   * Evaluate effect target choices
   * Scores potential targets for an effect
   * 
   * @param target - The target to evaluate
   * @param effect - The effect definition
   * @param state - Current game state
   * @param playerId - ID of the player
   * @returns Score for choosing this target
   */
  evaluateEffectTarget(
    target: Target,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    if (target.type !== TargetType.CARD || !target.cardId) {
      return 0;
    }

    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!player || !opponent) return 0;

    // Find the target card
    const targetCard = this.findCard(target.cardId, state);
    if (!targetCard) return 0;

    let score = 0;

    // Evaluate based on effect type
    switch (effect.effectType) {
      case EffectType.POWER_MODIFICATION:
        score = this.evaluatePowerModificationTarget(targetCard, effect, state, playerId);
        break;
      case EffectType.KO_CHARACTER:
        score = this.evaluateKOTarget(targetCard, effect, state, playerId);
        break;
      case EffectType.BOUNCE_CHARACTER:
        score = this.evaluateBounceTarget(targetCard, effect, state, playerId);
        break;
      case EffectType.GRANT_KEYWORD:
        score = this.evaluateKeywordGrantTarget(targetCard, effect, state, playerId);
        break;
      case EffectType.ATTACH_DON:
        score = this.evaluateAttachDonTarget(targetCard, effect, state, playerId);
        break;
      case EffectType.REST_CHARACTER:
        score = this.evaluateRestTarget(targetCard, effect, state, playerId);
        break;
      case EffectType.ACTIVATE_CHARACTER:
        score = this.evaluateActivateTarget(targetCard, effect, state, playerId);
        break;
      default:
        // Generic target evaluation
        score = this.evaluateGenericTarget(targetCard, effect, state, playerId);
    }

    return score;
  }

  /**
   * Simulate an effect and return the resulting game state
   * This is a simplified simulation for evaluation purposes
   * 
   * @param effect - The effect definition
   * @param targets - The targets for the effect
   * @param state - Current game state
   * @returns Simulated game state after the effect
   */
  simulateEffect(
    effect: EffectDefinition,
    targets: Target[],
    state: GameState
  ): GameState {
    // Create a shallow copy of the state
    const simulated: GameState = {
      ...state,
      players: new Map(state.players),
      pendingTriggers: [...state.pendingTriggers],
      history: [...state.history],
      loopGuardState: { ...state.loopGuardState },
    };

    // Copy player states
    simulated.players = new Map();
    state.players.forEach((playerState, playerId) => {
      simulated.players.set(playerId, {
        ...playerState,
        zones: {
          ...playerState.zones,
          deck: [...playerState.zones.deck],
          hand: [...playerState.zones.hand],
          trash: [...playerState.zones.trash],
          life: [...playerState.zones.life],
          donDeck: [...playerState.zones.donDeck],
          costArea: [...playerState.zones.costArea],
          characterArea: [...playerState.zones.characterArea],
        },
        flags: new Map(playerState.flags),
      });
    });

    // Simulate the effect based on its type
    switch (effect.effectType) {
      case EffectType.POWER_MODIFICATION:
        this.simulatePowerModification(simulated, effect, targets);
        break;
      case EffectType.KO_CHARACTER:
        this.simulateKO(simulated, effect, targets);
        break;
      case EffectType.BOUNCE_CHARACTER:
        this.simulateBounce(simulated, effect, targets);
        break;
      case EffectType.DRAW_CARDS:
        this.simulateDraw(simulated, effect, targets);
        break;
      case EffectType.DISCARD_CARDS:
        this.simulateDiscard(simulated, effect, targets);
        break;
      case EffectType.GRANT_KEYWORD:
        this.simulateKeywordGrant(simulated, effect, targets);
        break;
      case EffectType.REST_CHARACTER:
        this.simulateRest(simulated, effect, targets);
        break;
      case EffectType.ACTIVATE_CHARACTER:
        this.simulateActivate(simulated, effect, targets);
        break;
      case EffectType.DEAL_DAMAGE:
        this.simulateDealDamage(simulated, effect, targets);
        break;
      // Other effect types have minimal simulation
      default:
        break;
    }

    return simulated;
  }

  // ============================================================================
  // Effect-Specific Evaluation Methods
  // ============================================================================

  /**
   * Evaluate a power modification effect
   */
  private evaluatePowerModificationEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    const powerChange = effect.parameters.powerChange || 0;
    let score = 0;

    if (powerChange > 0) {
      // Power boost - valuable if we have active characters
      const activeCharacters = player.zones.characterArea.filter(
        c => c.state === CardState.ACTIVE
      );
      score += activeCharacters.length * 10;
      score += (powerChange / 1000) * 5; // Scale by power amount
    } else {
      // Power reduction - valuable if opponent has characters
      const opponent = state.players.get(this.getOpponentId(playerId));
      if (opponent) {
        score += opponent.zones.characterArea.length * 12;
        score += Math.abs(powerChange / 1000) * 6;
      }
    }

    return score;
  }

  /**
   * Evaluate a K.O. effect
   */
  private evaluateKOEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    let score = 35; // Base value for removal

    // More valuable when opponent has board presence
    const opponentBoardSize = opponent.zones.characterArea.length;
    score += opponentBoardSize * 10;

    // Check for high-value targets
    const maxPower = effect.parameters.maxPower || Infinity;
    const eligibleTargets = opponent.zones.characterArea.filter(
      c => this.getCardPower(c) <= maxPower
    );

    if (eligibleTargets.length > 0) {
      const strongestTarget = Math.max(...eligibleTargets.map(c => this.getCardPower(c)));
      score += strongestTarget / 200;
    }

    return score;
  }

  /**
   * Evaluate a bounce effect
   */
  private evaluateBounceEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    let score = 25; // Base value for bounce

    // Similar to K.O. but slightly less valuable
    const opponentBoardSize = opponent.zones.characterArea.length;
    score += opponentBoardSize * 8;

    return score;
  }

  /**
   * Evaluate a draw effect
   */
  private evaluateDrawEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    const cardCount = effect.parameters.cardCount || 1;
    const handSize = player.zones.hand.length;

    let score = cardCount * 15; // Base value per card

    // More valuable when hand is low
    if (handSize <= 2) {
      score += 30;
    } else if (handSize <= 4) {
      score += 15;
    }

    return score;
  }

  /**
   * Evaluate a search effect
   */
  private evaluateSearchEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    let score = 25; // Base value for card selection

    const deckSize = player.zones.deck.length;
    if (deckSize <= 10) {
      score += 10; // More valuable when deck is smaller
    }

    return score;
  }

  /**
   * Evaluate a discard effect
   */
  private evaluateDiscardEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    const cardCount = effect.parameters.cardCount || 1;
    const opponentHandSize = opponent.zones.hand.length;

    let score = cardCount * 12; // Base value per card

    // More valuable when opponent has large hand
    if (opponentHandSize >= 5) {
      score += 20;
    }

    return score;
  }

  /**
   * Evaluate a keyword grant effect
   */
  private evaluateKeywordGrantEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    const keyword = effect.parameters.keyword || '';
    let score = 15; // Base value

    // Evaluate based on keyword type
    if (keyword === 'Rush') {
      score += 25; // Very valuable for immediate attacks
    } else if (keyword === 'Double Attack') {
      score += 30; // Extremely valuable
    } else if (keyword === 'Blocker') {
      score += 20; // Good defensive value
    }

    // More valuable if we have characters to grant to
    score += player.zones.characterArea.length * 5;

    return score;
  }

  /**
   * Evaluate an attach DON effect
   */
  private evaluateAttachDonEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    let score = 20; // Base value

    // More valuable if we have active characters
    const activeCharacters = player.zones.characterArea.filter(
      c => c.state === CardState.ACTIVE
    );
    score += activeCharacters.length * 10;

    return score;
  }

  /**
   * Evaluate a rest character effect
   */
  private evaluateRestEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    let score = 20; // Base value

    // More valuable if opponent has active characters
    const opponentActiveChars = opponent.zones.characterArea.filter(
      c => c.state === CardState.ACTIVE
    );
    score += opponentActiveChars.length * 12;

    return score;
  }

  /**
   * Evaluate an activate character effect
   */
  private evaluateActivateCharacterEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    let score = 15; // Base value

    // More valuable if we have rested characters
    const restedCharacters = player.zones.characterArea.filter(
      c => c.state === CardState.RESTED
    );
    score += restedCharacters.length * 10;

    return score;
  }

  /**
   * Evaluate a deal damage effect
   */
  private evaluateDealDamageEffect(
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const opponent = state.players.get(this.getOpponentId(playerId));
    if (!opponent) return 0;

    const damageAmount = effect.parameters.value || 1;
    const opponentLife = opponent.zones.life.length;

    let score = damageAmount * 20; // Base value per damage

    // Extremely valuable if it wins the game
    if (opponentLife <= damageAmount) {
      score += 100;
    } else if (opponentLife <= damageAmount + 1) {
      score += 50;
    }

    return score;
  }

  /**
   * Evaluate the cost of an effect
   */
  private evaluateEffectCost(
    cost: any,
    state: GameState,
    playerId: PlayerId
  ): number {
    const player = state.players.get(playerId);
    if (!player) return 0;

    let costValue = 0;

    // Simplified cost evaluation
    const costStr = JSON.stringify(cost).toLowerCase();

    if (costStr.includes('trash') || costStr.includes('discard')) {
      costValue += 10;
      if (player.zones.hand.length <= 2) {
        costValue += 15; // More costly when hand is small
      }
    }

    if (costStr.includes('rest')) {
      costValue += 5;
    }

    if (costStr.includes('don')) {
      costValue += 8;
    }

    return costValue;
  }

  // ============================================================================
  // Target Evaluation Methods
  // ============================================================================

  /**
   * Evaluate a power modification target
   */
  private evaluatePowerModificationTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    const powerChange = effect.parameters.powerChange || 0;
    let score = 0;

    if (powerChange > 0) {
      // Boosting - prefer active characters that can attack
      if (targetCard.state === CardState.ACTIVE) {
        score += 30;
      }
      score += (targetCard.definition.basePower || 0) / 200;
    } else {
      // Debuffing - prefer opponent's strong characters
      score += (targetCard.definition.basePower || 0) / 150;
    }

    return score;
  }

  /**
   * Evaluate a K.O. target
   */
  private evaluateKOTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    let score = 0;

    // Value based on target's power and cost
    score += (targetCard.definition.basePower || 0) / 150;
    score += (targetCard.definition.baseCost || 0) * 5;

    // Bonus for removing threats
    if (targetCard.definition.keywords.includes('Rush')) {
      score += 20;
    }
    if (targetCard.definition.keywords.includes('Double Attack')) {
      score += 25;
    }
    if (targetCard.definition.keywords.includes('Blocker')) {
      score += 15;
    }

    return score;
  }

  /**
   * Evaluate a bounce target
   */
  private evaluateBounceTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    let score = 0;

    // Similar to K.O. but slightly less valuable
    score += (targetCard.definition.basePower || 0) / 180;
    score += (targetCard.definition.baseCost || 0) * 4;

    // Bonus for DON investment
    score += targetCard.givenDon.length * 8;

    return score;
  }

  /**
   * Evaluate a keyword grant target
   */
  private evaluateKeywordGrantTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    let score = 0;

    const keyword = effect.parameters.keyword || '';

    // Prefer active characters for Rush
    if (keyword === 'Rush' && targetCard.state === CardState.ACTIVE) {
      score += 30;
    }

    // Prefer high-power characters for Double Attack
    if (keyword === 'Double Attack') {
      score += (targetCard.definition.basePower || 0) / 150;
    }

    // Base value from card power
    score += (targetCard.definition.basePower || 0) / 200;

    return score;
  }

  /**
   * Evaluate an attach DON target
   */
  private evaluateAttachDonTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    // Use existing evaluateDonAssignment logic
    return this.evaluateDonAssignment(null, targetCard, state, playerId);
  }

  /**
   * Evaluate a rest target
   */
  private evaluateRestTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    let score = 0;

    // Only valuable if target is active
    if (targetCard.state === CardState.ACTIVE) {
      score += 25;
      score += (targetCard.definition.basePower || 0) / 200;
    }

    return score;
  }

  /**
   * Evaluate an activate target
   */
  private evaluateActivateTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    let score = 0;

    // Only valuable if target is rested
    if (targetCard.state === CardState.RESTED) {
      score += 25;
      score += (targetCard.definition.basePower || 0) / 200;
    }

    return score;
  }

  /**
   * Generic target evaluation
   */
  private evaluateGenericTarget(
    targetCard: CardInstance,
    effect: EffectDefinition,
    state: GameState,
    playerId: PlayerId
  ): number {
    // Base evaluation on card power and cost
    let score = 0;
    score += (targetCard.definition.basePower || 0) / 200;
    score += (targetCard.definition.baseCost || 0) * 3;
    return score;
  }

  // ============================================================================
  // Effect Simulation Methods
  // ============================================================================

  /**
   * Simulate power modification
   */
  private simulatePowerModification(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    // Power modifications are tracked via modifiers, not simulated here
    // This is a placeholder for more complex simulation
  }

  /**
   * Simulate K.O.
   */
  private simulateKO(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    for (const target of targets) {
      if (target.type === TargetType.CARD && target.cardId) {
        // Find and remove the card from character area
        for (const [playerId, playerState] of state.players) {
          const charIndex = playerState.zones.characterArea.findIndex(
            c => c.id === target.cardId
          );
          if (charIndex !== -1) {
            const card = playerState.zones.characterArea.splice(charIndex, 1)[0];
            playerState.zones.trash.push(card);
            break;
          }
        }
      }
    }
  }

  /**
   * Simulate bounce
   */
  private simulateBounce(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    for (const target of targets) {
      if (target.type === TargetType.CARD && target.cardId) {
        // Find and move the card to hand
        for (const [playerId, playerState] of state.players) {
          const charIndex = playerState.zones.characterArea.findIndex(
            c => c.id === target.cardId
          );
          if (charIndex !== -1) {
            const card = playerState.zones.characterArea.splice(charIndex, 1)[0];
            playerState.zones.hand.push(card);
            break;
          }
        }
      }
    }
  }

  /**
   * Simulate draw
   */
  private simulateDraw(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    const cardCount = effect.parameters.cardCount || 1;
    const playerId = effect.sourceCardId ? this.findCardOwner(effect.sourceCardId, state) : null;
    if (!playerId) return;

    const player = state.players.get(playerId);
    if (!player) return;

    for (let i = 0; i < cardCount && player.zones.deck.length > 0; i++) {
      const card = player.zones.deck.shift();
      if (card) {
        player.zones.hand.push(card);
      }
    }
  }

  /**
   * Simulate discard
   */
  private simulateDiscard(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    const cardCount = effect.parameters.cardCount || 1;
    const playerId = effect.sourceCardId ? this.findCardOwner(effect.sourceCardId, state) : null;
    if (!playerId) return;

    const player = state.players.get(playerId);
    if (!player) return;

    for (let i = 0; i < cardCount && player.zones.hand.length > 0; i++) {
      const card = player.zones.hand.pop();
      if (card) {
        player.zones.trash.push(card);
      }
    }
  }

  /**
   * Simulate keyword grant
   */
  private simulateKeywordGrant(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    // Keyword grants are tracked via modifiers, not simulated here
    // This is a placeholder for more complex simulation
  }

  /**
   * Simulate rest
   */
  private simulateRest(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    for (const target of targets) {
      if (target.type === TargetType.CARD && target.cardId) {
        const card = this.findCard(target.cardId, state);
        if (card) {
          card.state = CardState.RESTED;
        }
      }
    }
  }

  /**
   * Simulate activate
   */
  private simulateActivate(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    for (const target of targets) {
      if (target.type === TargetType.CARD && target.cardId) {
        const card = this.findCard(target.cardId, state);
        if (card) {
          card.state = CardState.ACTIVE;
        }
      }
    }
  }

  /**
   * Simulate deal damage
   */
  private simulateDealDamage(
    state: GameState,
    effect: EffectDefinition,
    targets: Target[]
  ): void {
    const damageAmount = effect.parameters.value || 1;
    
    for (const target of targets) {
      if (target.type === TargetType.PLAYER && target.playerId) {
        const player = state.players.get(target.playerId);
        if (player) {
          for (let i = 0; i < damageAmount && player.zones.life.length > 0; i++) {
            const lifeCard = player.zones.life.shift();
            if (lifeCard) {
              player.zones.hand.push(lifeCard);
            }
          }
        }
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Find a card by ID in the game state
   */
  private findCard(cardId: string, state: GameState): CardInstance | null {
    for (const [playerId, playerState] of state.players) {
      // Check all zones (excluding costArea which contains DonInstance, not CardInstance)
      const allCards = [
        ...playerState.zones.hand,
        ...playerState.zones.deck,
        ...playerState.zones.trash,
        ...playerState.zones.life,
        ...playerState.zones.characterArea,
      ];
      
      if (playerState.zones.leaderArea) {
        allCards.push(playerState.zones.leaderArea);
      }
      
      if (playerState.zones.stageArea) {
        allCards.push(playerState.zones.stageArea);
      }

      const card = allCards.find(c => c.id === cardId);
      if (card) return card;
    }
    
    return null;
  }

  /**
   * Find the owner of a card
   */
  private findCardOwner(cardId: string, state: GameState): PlayerId | null {
    for (const [playerId, playerState] of state.players) {
      const allCards = [
        ...playerState.zones.hand,
        ...playerState.zones.deck,
        ...playerState.zones.trash,
        ...playerState.zones.life,
        ...playerState.zones.characterArea,
      ];
      
      if (playerState.zones.leaderArea) {
        allCards.push(playerState.zones.leaderArea);
      }
      
      if (playerState.zones.stageArea) {
        allCards.push(playerState.zones.stageArea);
      }

      if (allCards.some(c => c.id === cardId)) {
        return playerId;
      }
    }
    
    return null;
  }
}
