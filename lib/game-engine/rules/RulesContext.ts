import { Phase } from '../core/types';
import rulesData from './rules.json';

/**
 * Battle step types in the battle system
 */
export type BattleStep = 'ATTACK' | 'BLOCK' | 'COUNTER' | 'DAMAGE' | 'END';

/**
 * Keyword definition structure
 */
export interface KeywordDef {
  name: string;
  description: string;
  type: 'static' | 'activated' | 'triggered';
  appliesTo: string[];
}

/**
 * Zone definition structure
 */
export interface ZoneDef {
  name: string;
  maxCards: number | null;
  minCards: number;
  visibility: 'public' | 'owner' | 'hidden';
  ordered: boolean;
}

/**
 * Infinite loop resolution rules
 */
export interface LoopRules {
  maxRepeats: number;
  resolution: {
    bothCanStop: string;
    oneCanStop: string;
    neitherCanStop: string;
  };
}

/**
 * Rules data structure matching rules.json schema
 */
interface RulesData {
  version: string;
  turnStructure: {
    phases: Phase[];
    firstTurnRules: {
      skipDraw: boolean;
      donCount: number;
      canBattle: boolean;
    };
  };
  battleSystem: {
    steps: BattleStep[];
    powerComparison: string;
    damageRules: {
      leaderDamage: number;
      doubleAttackDamage: number;
    };
  };
  keywords: {
    [keyword: string]: KeywordDef;
  };
  zones: {
    [zone: string]: ZoneDef;
  };
  defeatConditions: string[];
  infiniteLoopRules: LoopRules;
  gameSetup: {
    startingHandSize: number;
    mulliganAllowed: boolean;
    donDeckSize: number;
  };
  limits: {
    maxCharacterArea: number;
    maxStageArea: number;
    deckSize: number;
    donDeckSize: number;
  };
}

/**
 * RulesContext wraps the rules JSON and provides type-safe query methods.
 * This class serves as the single point of access to game rules, ensuring
 * that the engine never accesses raw JSON directly.
 */
export class RulesContext {
  private rules: RulesData;

  /**
   * Creates a new RulesContext instance
   * @param rulesJson - Optional rules data, defaults to built-in rules.json
   * @throws Error if rules JSON is invalid
   */
  constructor(rulesJson?: RulesData) {
    this.rules = rulesJson || (rulesData as RulesData);
    this.validateRulesSchema();
  }

  /**
   * Validates the rules JSON schema to ensure all required fields are present
   * @throws Error if validation fails
   */
  private validateRulesSchema(): void {
    if (!this.rules.version) {
      throw new Error('Rules JSON missing version field');
    }

    if (!this.rules.turnStructure || !Array.isArray(this.rules.turnStructure.phases)) {
      throw new Error('Rules JSON missing or invalid turnStructure.phases');
    }

    if (!this.rules.battleSystem || !Array.isArray(this.rules.battleSystem.steps)) {
      throw new Error('Rules JSON missing or invalid battleSystem.steps');
    }

    if (!this.rules.keywords || typeof this.rules.keywords !== 'object') {
      throw new Error('Rules JSON missing or invalid keywords');
    }

    if (!this.rules.zones || typeof this.rules.zones !== 'object') {
      throw new Error('Rules JSON missing or invalid zones');
    }

    if (!Array.isArray(this.rules.defeatConditions)) {
      throw new Error('Rules JSON missing or invalid defeatConditions');
    }

    if (!this.rules.infiniteLoopRules) {
      throw new Error('Rules JSON missing infiniteLoopRules');
    }

    if (!this.rules.gameSetup) {
      throw new Error('Rules JSON missing gameSetup');
    }

    if (!this.rules.limits) {
      throw new Error('Rules JSON missing limits');
    }
  }

  /**
   * Gets the sequence of phases in a turn
   * @returns Array of phases in order
   */
  getPhaseSequence(): Phase[] {
    return [...this.rules.turnStructure.phases];
  }

  /**
   * Gets the sequence of steps in a battle
   * @returns Array of battle steps in order
   */
  getBattleSteps(): BattleStep[] {
    return [...this.rules.battleSystem.steps];
  }

  /**
   * Gets the definition of a keyword
   * @param keyword - The keyword name to look up
   * @returns Keyword definition or null if not found
   */
  getKeywordDefinition(keyword: string): KeywordDef | null {
    return this.rules.keywords[keyword] || null;
  }

  /**
   * Checks if battles are banned on the first turn for the first player
   * @returns true if first turn battles are banned
   */
  isFirstTurnBattleBanned(): boolean {
    return !this.rules.turnStructure.firstTurnRules.canBattle;
  }

  /**
   * Gets the maximum number of cards allowed in the character area
   * @returns Maximum character area size
   */
  getMaxCharacterArea(): number {
    return this.rules.limits.maxCharacterArea;
  }

  /**
   * Gets the starting hand size for game setup
   * @returns Number of cards to draw at game start
   */
  getStartingHandSize(): number {
    return this.rules.gameSetup.startingHandSize;
  }

  /**
   * Gets the number of DON cards to place during the Don Phase
   * @param turnNumber - The current turn number (1-indexed)
   * @param isFirstPlayer - Whether this is the player who went first
   * @returns Number of DON cards to place
   */
  getDonPerTurn(turnNumber: number, isFirstPlayer: boolean): number {
    // Only the first player on their very first turn (turn 1) gets 1 DON
    // This is to balance the advantage of going first
    if (turnNumber === 1 && isFirstPlayer) {
      return this.rules.turnStructure.firstTurnRules.donCount;
    }
    // All other turns get 2 DON (including player 2's first turn)
    return 2;
  }

  /**
   * Gets the infinite loop detection and resolution rules
   * @returns Loop rules configuration
   */
  getInfiniteLoopRules(): LoopRules {
    return { ...this.rules.infiniteLoopRules };
  }

  /**
   * Gets the definition of a zone
   * @param zone - The zone identifier
   * @returns Zone definition or null if not found
   */
  getZoneDefinition(zone: string): ZoneDef | null {
    return this.rules.zones[zone] || null;
  }

  /**
   * Gets all defeat conditions
   * @returns Array of defeat condition identifiers
   */
  getDefeatConditions(): string[] {
    return [...this.rules.defeatConditions];
  }

  /**
   * Gets the damage dealt to a leader by a normal attack
   * @returns Leader damage amount
   */
  getLeaderDamage(): number {
    return this.rules.battleSystem.damageRules.leaderDamage;
  }

  /**
   * Gets the damage dealt to a leader by a Double Attack
   * @returns Double attack damage amount
   */
  getDoubleAttackDamage(): number {
    return this.rules.battleSystem.damageRules.doubleAttackDamage;
  }

  /**
   * Checks if the first player should skip draw on turn 1
   * @returns true if first player skips draw on turn 1
   */
  shouldFirstPlayerSkipDraw(): boolean {
    return this.rules.turnStructure.firstTurnRules.skipDraw;
  }

  /**
   * Gets the size of the DON deck
   * @returns Number of DON cards in the DON deck
   */
  getDonDeckSize(): number {
    return this.rules.gameSetup.donDeckSize;
  }

  /**
   * Gets the required deck size
   * @returns Number of cards required in a deck
   */
  getDeckSize(): number {
    return this.rules.limits.deckSize;
  }

  /**
   * Checks if mulligan is allowed during game setup
   * @returns true if mulligan is allowed
   */
  isMulliganAllowed(): boolean {
    return this.rules.gameSetup.mulliganAllowed;
  }

  /**
   * Gets all keyword names
   * @returns Array of keyword names
   */
  getAllKeywords(): string[] {
    return Object.keys(this.rules.keywords);
  }

  /**
   * Gets the rules version
   * @returns Version string
   */
  getVersion(): string {
    return this.rules.version;
  }
}
