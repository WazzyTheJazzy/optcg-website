/**
 * RulesContext.test.ts
 * 
 * Unit tests for RulesContext - testing rule queries, JSON parsing, and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RulesContext } from './RulesContext';

describe('RulesContext', () => {
  let rulesContext: RulesContext;

  beforeEach(() => {
    rulesContext = new RulesContext();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(rulesContext).toBeDefined();
    });

    it('should have correct version', () => {
      expect(rulesContext.getVersion()).toBe('1.0.0');
    });

    it('should throw error for invalid rules JSON', () => {
      expect(() => new RulesContext({} as any)).toThrow('Rules JSON');
    });
  });

  describe('Phase Queries', () => {
    describe('getPhaseSequence', () => {
      it('should return all 5 phases in correct order', () => {
        const phases = rulesContext.getPhaseSequence();
        expect(phases).toHaveLength(5);
        expect(phases[0]).toBe('REFRESH');
        expect(phases[1]).toBe('DRAW');
        expect(phases[2]).toBe('DON_PHASE');
        expect(phases[3]).toBe('MAIN');
        expect(phases[4]).toBe('END');
      });
    });
  });

  describe('Battle System Queries', () => {
    describe('getBattleSteps', () => {
      it('should return all 5 battle steps in correct order', () => {
        const steps = rulesContext.getBattleSteps();
        expect(steps).toHaveLength(5);
        expect(steps[0]).toBe('ATTACK');
        expect(steps[1]).toBe('BLOCK');
        expect(steps[2]).toBe('COUNTER');
        expect(steps[3]).toBe('DAMAGE');
        expect(steps[4]).toBe('END');
      });
    });

    it('should return correct leader damage', () => {
      expect(rulesContext.getLeaderDamage()).toBe(1);
    });

    it('should return correct double attack damage', () => {
      expect(rulesContext.getDoubleAttackDamage()).toBe(2);
    });
  });

  describe('Keyword Queries', () => {
    describe('getKeywordDefinition', () => {
      it('should return Rush keyword definition', () => {
        const rushKeyword = rulesContext.getKeywordDefinition('Rush');
        expect(rushKeyword).not.toBeNull();
        expect(rushKeyword?.name).toBe('Rush');
        expect(rushKeyword?.type).toBe('static');
      });

      it('should return Blocker keyword definition', () => {
        const blockerKeyword = rulesContext.getKeywordDefinition('Blocker');
        expect(blockerKeyword).not.toBeNull();
        expect(blockerKeyword?.name).toBe('Blocker');
        expect(blockerKeyword?.type).toBe('activated');
      });

      it('should return Trigger keyword definition', () => {
        const triggerKeyword = rulesContext.getKeywordDefinition('Trigger');
        expect(triggerKeyword).not.toBeNull();
        expect(triggerKeyword?.name).toBe('Trigger');
      });

      it('should return Double Attack keyword definition', () => {
        const doubleAttackKeyword = rulesContext.getKeywordDefinition('Double Attack');
        expect(doubleAttackKeyword).not.toBeNull();
        expect(doubleAttackKeyword?.name).toBe('Double Attack');
      });

      it('should return null for unknown keyword', () => {
        const unknownKeyword = rulesContext.getKeywordDefinition('UnknownKeyword');
        expect(unknownKeyword).toBeNull();
      });
    });

    describe('getAllKeywords', () => {
      it('should return all keyword names', () => {
        const keywords = rulesContext.getAllKeywords();
        expect(keywords).toContain('Rush');
        expect(keywords).toContain('Blocker');
        expect(keywords).toContain('Trigger');
        expect(keywords).toContain('Double Attack');
      });
    });
  });

  describe('Zone Queries', () => {
    describe('getZoneDefinition', () => {
      it('should return CHARACTER_AREA zone definition', () => {
        const zone = rulesContext.getZoneDefinition('CHARACTER_AREA');
        expect(zone).not.toBeNull();
        expect(zone?.maxCards).toBe(5);
      });

      it('should return STAGE_AREA zone definition', () => {
        const zone = rulesContext.getZoneDefinition('STAGE_AREA');
        expect(zone).not.toBeNull();
        expect(zone?.maxCards).toBe(1);
      });
    });

    it('should return correct max character area', () => {
      expect(rulesContext.getMaxCharacterArea()).toBe(5);
    });
  });

  describe('Game Setup Queries', () => {
    it('should return correct starting hand size', () => {
      expect(rulesContext.getStartingHandSize()).toBe(5);
    });

    it('should return correct deck size', () => {
      expect(rulesContext.getDeckSize()).toBe(50);
    });

    it('should return correct DON deck size', () => {
      expect(rulesContext.getDonDeckSize()).toBe(10);
    });

    it('should indicate mulligan is allowed', () => {
      expect(rulesContext.isMulliganAllowed()).toBe(true);
    });
  });

  describe('First Turn Rules', () => {
    it('should indicate first turn battles are banned', () => {
      expect(rulesContext.isFirstTurnBattleBanned()).toBe(true);
    });

    it('should indicate first player should skip draw', () => {
      expect(rulesContext.shouldFirstPlayerSkipDraw()).toBe(true);
    });

    describe('getDonPerTurn', () => {
      it('should return 1 DON for first player on turn 1', () => {
        expect(rulesContext.getDonPerTurn(1, true)).toBe(1);
      });

      it('should return 2 DON for second player on turn 1', () => {
        expect(rulesContext.getDonPerTurn(1, false)).toBe(2);
      });

      it('should return 2 DON for first player on turn 2+', () => {
        expect(rulesContext.getDonPerTurn(2, true)).toBe(2);
        expect(rulesContext.getDonPerTurn(5, true)).toBe(2);
      });

      it('should return 2 DON for all normal turns', () => {
        expect(rulesContext.getDonPerTurn(5, false)).toBe(2);
      });
    });
  });

  describe('Defeat Conditions', () => {
    describe('getDefeatConditions', () => {
      it('should include deck_empty condition', () => {
        const conditions = rulesContext.getDefeatConditions();
        expect(conditions).toContain('deck_empty');
      });

      it('should include life_depleted condition', () => {
        const conditions = rulesContext.getDefeatConditions();
        expect(conditions).toContain('life_depleted');
      });
    });
  });

  describe('Infinite Loop Rules', () => {
    describe('getInfiniteLoopRules', () => {
      it('should return correct max repeats', () => {
        const loopRules = rulesContext.getInfiniteLoopRules();
        expect(loopRules.maxRepeats).toBe(4);
      });

      it('should return correct resolution for both can stop', () => {
        const loopRules = rulesContext.getInfiniteLoopRules();
        expect(loopRules.resolution.bothCanStop).toBe('game_continues');
      });

      it('should return correct resolution for one can stop', () => {
        const loopRules = rulesContext.getInfiniteLoopRules();
        expect(loopRules.resolution.oneCanStop).toBe('stopping_player_must_stop');
      });

      it('should return correct resolution for neither can stop', () => {
        const loopRules = rulesContext.getInfiniteLoopRules();
        expect(loopRules.resolution.neitherCanStop).toBe('draw');
      });
    });
  });
});
