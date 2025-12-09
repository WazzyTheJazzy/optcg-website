/**
 * StrategyManager - Manages AI strategy profiles and dynamic adjustments
 * 
 * This class handles strategy selection, weight management, and dynamic strategy
 * adjustments based on game state conditions like life totals and resources.
 */

import { GameState, PlayerId } from '../core/types';
import {
  EvaluationWeights,
  StrategyProfile,
  PlayStyle,
  DifficultyLevel,
  DEFAULT_STRATEGY_PROFILES,
  STRATEGY_WEIGHTS,
} from './types';

/**
 * StrategyManager manages AI play styles and dynamically adjusts strategy
 * based on game state conditions.
 */
export class StrategyManager {
  private profiles: Map<PlayStyle, StrategyProfile>;
  private currentProfile: StrategyProfile;

  /**
   * Create a new StrategyManager with default strategy profiles
   */
  constructor() {
    // Initialize with default strategy profiles
    this.profiles = new Map<PlayStyle, StrategyProfile>([
      ['aggressive', this.getAggressiveProfile()],
      ['defensive', this.getDefensiveProfile()],
      ['balanced', this.getBalancedProfile()],
    ]);

    // Start with balanced strategy
    this.currentProfile = this.profiles.get('balanced')!;
  }

  /**
   * Set the strategy based on play style and difficulty
   * 
   * @param playStyle - The desired play style (aggressive, defensive, balanced)
   * @param difficulty - The difficulty level (affects strategy intensity)
   */
  setStrategy(playStyle: PlayStyle, difficulty: DifficultyLevel): void {
    const baseProfile = this.profiles.get(playStyle);
    if (!baseProfile) {
      throw new Error(`Unknown play style: ${playStyle}`);
    }

    // Clone the profile to avoid modifying the base profile
    this.currentProfile = {
      ...baseProfile,
      weights: { ...baseProfile.weights },
    };

    // Adjust strategy intensity based on difficulty
    this.applyDifficultyModifier(difficulty);
  }

  /**
   * Get the current evaluation weights
   * 
   * @returns Current evaluation weights
   */
  getWeights(): EvaluationWeights {
    return { ...this.currentProfile.weights };
  }

  /**
   * Get the current strategy profile
   * 
   * @returns Current strategy profile
   */
  getCurrentProfile(): StrategyProfile {
    return { ...this.currentProfile };
  }

  /**
   * Dynamically adjust strategy based on game state
   * This modifies the current profile to adapt to the current situation
   * 
   * @param state - Current game state
   * @param playerId - ID of the AI player
   */
  adjustForGameState(state: GameState, playerId: PlayerId): void {
    const player = state.players.get(playerId);
    const opponent = state.players.get(this.getOpponentId(playerId));
    
    if (!player || !opponent) return;

    // Calculate life differential
    const playerLife = player.zones.life.length;
    const opponentLife = opponent.zones.life.length;
    const lifeDiff = playerLife - opponentLife;

    // Apply life-based adjustments
    this.applyLifeAdvantageModifier(lifeDiff);

    // Calculate resource availability
    const availableDon = player.zones.costArea.filter(
      don => don.state === 'ACTIVE'
    ).length;
    const handSize = player.zones.hand.length;

    // Apply resource-based adjustments
    this.applyResourceModifier(availableDon, handSize);

    // Apply board state adjustments
    const boardSize = player.zones.characterArea.length;
    const opponentBoardSize = opponent.zones.characterArea.length;
    this.applyBoardStateModifier(boardSize, opponentBoardSize);
  }

  /**
   * Get the aggressive strategy profile
   * Prioritizes life damage and tempo over board control
   * 
   * @returns Aggressive strategy profile
   */
  private getAggressiveProfile(): StrategyProfile {
    return {
      name: 'Aggressive',
      weights: {
        boardControl: 0.25,
        resourceEfficiency: 0.15,
        lifeDifferential: 0.35,
        cardAdvantage: 0.10,
        tempo: 0.15,
      },
      aggressiveness: 0.8,
      riskTolerance: 0.7,
    };
  }

  /**
   * Get the defensive strategy profile
   * Prioritizes board control and card advantage over aggression
   * 
   * @returns Defensive strategy profile
   */
  private getDefensiveProfile(): StrategyProfile {
    return {
      name: 'Defensive',
      weights: {
        boardControl: 0.30,
        resourceEfficiency: 0.20,
        lifeDifferential: 0.20,
        cardAdvantage: 0.20,
        tempo: 0.10,
      },
      aggressiveness: 0.3,
      riskTolerance: 0.3,
    };
  }

  /**
   * Get the balanced strategy profile
   * Balanced weights across all factors
   * 
   * @returns Balanced strategy profile
   */
  private getBalancedProfile(): StrategyProfile {
    return {
      name: 'Balanced',
      weights: {
        boardControl: 0.25,
        resourceEfficiency: 0.20,
        lifeDifferential: 0.25,
        cardAdvantage: 0.15,
        tempo: 0.15,
      },
      aggressiveness: 0.5,
      riskTolerance: 0.5,
    };
  }

  /**
   * Apply difficulty-based modifications to the current strategy
   * Higher difficulty = more focused strategy, lower difficulty = more random
   * 
   * @param difficulty - The difficulty level
   */
  private applyDifficultyModifier(difficulty: DifficultyLevel): void {
    // Easy difficulty: Flatten weights slightly (less focused strategy)
    if (difficulty === 'easy') {
      const weights = this.currentProfile.weights;
      const avg = (
        weights.boardControl +
        weights.resourceEfficiency +
        weights.lifeDifferential +
        weights.cardAdvantage +
        weights.tempo
      ) / 5;

      // Move weights 30% toward average (less specialized)
      weights.boardControl = weights.boardControl * 0.7 + avg * 0.3;
      weights.resourceEfficiency = weights.resourceEfficiency * 0.7 + avg * 0.3;
      weights.lifeDifferential = weights.lifeDifferential * 0.7 + avg * 0.3;
      weights.cardAdvantage = weights.cardAdvantage * 0.7 + avg * 0.3;
      weights.tempo = weights.tempo * 0.7 + avg * 0.3;

      // Reduce aggressiveness and risk tolerance
      this.currentProfile.aggressiveness *= 0.8;
      this.currentProfile.riskTolerance *= 0.7;
    }
    // Medium difficulty: Use weights as-is
    else if (difficulty === 'medium') {
      // No modification needed
    }
    // Hard difficulty: Sharpen weights (more focused strategy)
    else if (difficulty === 'hard') {
      const weights = this.currentProfile.weights;
      
      // Find the highest weight
      const maxWeight = Math.max(
        weights.boardControl,
        weights.resourceEfficiency,
        weights.lifeDifferential,
        weights.cardAdvantage,
        weights.tempo
      );

      // Amplify differences (make strategy more focused)
      const amplify = (weight: number) => {
        const diff = weight - 0.2; // 0.2 is the baseline
        return 0.2 + diff * 1.2; // Amplify by 20%
      };

      weights.boardControl = amplify(weights.boardControl);
      weights.resourceEfficiency = amplify(weights.resourceEfficiency);
      weights.lifeDifferential = amplify(weights.lifeDifferential);
      weights.cardAdvantage = amplify(weights.cardAdvantage);
      weights.tempo = amplify(weights.tempo);

      // Normalize to ensure weights sum to 1.0
      const sum = 
        weights.boardControl +
        weights.resourceEfficiency +
        weights.lifeDifferential +
        weights.cardAdvantage +
        weights.tempo;

      weights.boardControl /= sum;
      weights.resourceEfficiency /= sum;
      weights.lifeDifferential /= sum;
      weights.cardAdvantage /= sum;
      weights.tempo /= sum;

      // Increase aggressiveness and risk tolerance slightly
      this.currentProfile.aggressiveness = Math.min(1.0, this.currentProfile.aggressiveness * 1.1);
      this.currentProfile.riskTolerance = Math.min(1.0, this.currentProfile.riskTolerance * 1.1);
    }
  }

  /**
   * Apply life advantage/disadvantage modifiers to strategy
   * 
   * @param lifeDiff - Life differential (positive = advantage, negative = disadvantage)
   */
  private applyLifeAdvantageModifier(lifeDiff: number): void {
    const weights = this.currentProfile.weights;

    if (lifeDiff >= 3) {
      // Significant life advantage - play more aggressively
      // Increase life differential and tempo weights
      weights.lifeDifferential *= 1.3;
      weights.tempo *= 1.2;
      // Decrease defensive weights
      weights.boardControl *= 0.9;
      weights.cardAdvantage *= 0.9;
      
      // Increase aggressiveness
      this.currentProfile.aggressiveness = Math.min(1.0, this.currentProfile.aggressiveness + 0.2);
      this.currentProfile.riskTolerance = Math.min(1.0, this.currentProfile.riskTolerance + 0.15);
    } else if (lifeDiff >= 1) {
      // Slight life advantage - maintain pressure
      weights.lifeDifferential *= 1.15;
      weights.tempo *= 1.1;
      
      this.currentProfile.aggressiveness = Math.min(1.0, this.currentProfile.aggressiveness + 0.1);
    } else if (lifeDiff <= -3) {
      // Significant life disadvantage - play defensively
      // Increase board control and card advantage
      weights.boardControl *= 1.3;
      weights.cardAdvantage *= 1.2;
      // Decrease aggressive weights
      weights.lifeDifferential *= 0.8;
      weights.tempo *= 0.9;
      
      // Decrease aggressiveness
      this.currentProfile.aggressiveness = Math.max(0.0, this.currentProfile.aggressiveness - 0.2);
      this.currentProfile.riskTolerance = Math.max(0.0, this.currentProfile.riskTolerance - 0.2);
    } else if (lifeDiff <= -1) {
      // Slight life disadvantage - play more carefully
      weights.boardControl *= 1.15;
      weights.cardAdvantage *= 1.1;
      
      this.currentProfile.aggressiveness = Math.max(0.0, this.currentProfile.aggressiveness - 0.1);
      this.currentProfile.riskTolerance = Math.max(0.0, this.currentProfile.riskTolerance - 0.1);
    }

    // Normalize weights
    this.normalizeWeights();
  }

  /**
   * Apply resource availability modifiers to strategy
   * 
   * @param availableDon - Number of available DON
   * @param handSize - Number of cards in hand
   */
  private applyResourceModifier(availableDon: number, handSize: number): void {
    const weights = this.currentProfile.weights;

    // DON availability affects tempo and resource efficiency
    if (availableDon >= 8) {
      // Abundant DON - can afford expensive plays
      weights.resourceEfficiency *= 0.9; // Less concerned about efficiency
      weights.tempo *= 1.1; // Can make impactful plays
    } else if (availableDon <= 3) {
      // Limited DON - need to be efficient
      weights.resourceEfficiency *= 1.2; // Prioritize efficiency
      weights.tempo *= 0.9; // Limited options
    }

    // Hand size affects card advantage priority
    if (handSize <= 2) {
      // Low hand size - need card advantage
      weights.cardAdvantage *= 1.3;
      weights.resourceEfficiency *= 0.9; // Less concerned about efficiency when desperate
    } else if (handSize >= 6) {
      // High hand size - can afford to use cards
      weights.cardAdvantage *= 0.8;
      weights.tempo *= 1.1; // Can make multiple plays
    }

    // Normalize weights
    this.normalizeWeights();
  }

  /**
   * Apply board state modifiers to strategy
   * 
   * @param boardSize - Number of characters on our board
   * @param opponentBoardSize - Number of characters on opponent's board
   */
  private applyBoardStateModifier(boardSize: number, opponentBoardSize: number): void {
    const weights = this.currentProfile.weights;
    const boardDiff = boardSize - opponentBoardSize;

    if (boardDiff >= 2) {
      // Board advantage - can play aggressively
      weights.boardControl *= 0.9; // Already have board control
      weights.tempo *= 1.15; // Press the advantage
      weights.lifeDifferential *= 1.1; // Go for damage
    } else if (boardDiff <= -2) {
      // Board disadvantage - need to stabilize
      weights.boardControl *= 1.3; // Need to contest the board
      weights.tempo *= 0.9; // Can't afford risky plays
      weights.lifeDifferential *= 0.9; // Focus on survival
    }

    // If our board is nearly full (4-5 characters)
    if (boardSize >= 4) {
      weights.boardControl *= 0.85; // Less value in more characters
      weights.tempo *= 1.1; // Use what we have
    }

    // If opponent's board is full
    if (opponentBoardSize >= 5) {
      weights.boardControl *= 1.2; // Need removal/blockers
    }

    // Normalize weights
    this.normalizeWeights();
  }

  /**
   * Normalize weights to ensure they sum to 1.0
   */
  private normalizeWeights(): void {
    const weights = this.currentProfile.weights;
    const sum = 
      weights.boardControl +
      weights.resourceEfficiency +
      weights.lifeDifferential +
      weights.cardAdvantage +
      weights.tempo;

    if (sum > 0) {
      weights.boardControl /= sum;
      weights.resourceEfficiency /= sum;
      weights.lifeDifferential /= sum;
      weights.cardAdvantage /= sum;
      weights.tempo /= sum;
    }
  }

  /**
   * Get the opponent's player ID
   */
  private getOpponentId(playerId: PlayerId): PlayerId {
    return playerId === PlayerId.PLAYER_1 ? PlayerId.PLAYER_2 : PlayerId.PLAYER_1;
  }
}
