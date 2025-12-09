/**
 * AIPlayerFactory.test.ts
 * 
 * Unit tests for AI player factory functions and configuration utilities
 */

import { describe, it, expect } from 'vitest';
import {
  createAIPlayer,
  createEasyAI,
  createMediumAI,
  createHardAI,
  createCustomAIPlayer,
  createAIFromPreset,
  getDefaultConfig,
  createCustomConfig,
  getAvailableDifficulties,
  getAvailablePlayStyles,
  getDifficultyDescription,
  getPlayStyleDescription,
  validateConfig,
  getConfigSummary,
  getAvailablePresets,
  getPresetDescription,
  AI_PRESETS,
  AIPlayerConfig,
  DifficultyLevel,
  PlayStyle,
} from './AIPlayerFactory';
import { PlayerId, PlayerType } from '../core/types';

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('AIPlayerFactory - Factory Functions', () => {
  describe('createAIPlayer', () => {
    it('should create AI player with default medium difficulty and balanced style', () => {
      const ai = createAIPlayer(PlayerId.PLAYER_2);
      
      expect(ai).toBeDefined();
      expect(ai.id).toBe(PlayerId.PLAYER_2);
      expect(ai.type).toBe(PlayerType.AI);
    });

    it('should create AI player with specified difficulty', () => {
      const easyAI = createAIPlayer(PlayerId.PLAYER_2, 'easy');
      const hardAI = createAIPlayer(PlayerId.PLAYER_2, 'hard');
      
      expect(easyAI).toBeDefined();
      expect(hardAI).toBeDefined();
    });

    it('should create AI player with specified play style', () => {
      const aggressiveAI = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'aggressive');
      const defensiveAI = createAIPlayer(PlayerId.PLAYER_2, 'medium', 'defensive');
      
      expect(aggressiveAI).toBeDefined();
      expect(defensiveAI).toBeDefined();
    });
  });

  describe('createEasyAI', () => {
    it('should create easy difficulty AI', () => {
      const ai = createEasyAI(PlayerId.PLAYER_2);
      
      expect(ai).toBeDefined();
      expect(ai.id).toBe(PlayerId.PLAYER_2);
      expect(ai.type).toBe(PlayerType.AI);
    });

    it('should accept custom play style', () => {
      const aggressiveAI = createEasyAI(PlayerId.PLAYER_2, 'aggressive');
      
      expect(aggressiveAI).toBeDefined();
    });
  });

  describe('createMediumAI', () => {
    it('should create medium difficulty AI', () => {
      const ai = createMediumAI(PlayerId.PLAYER_2);
      
      expect(ai).toBeDefined();
      expect(ai.id).toBe(PlayerId.PLAYER_2);
      expect(ai.type).toBe(PlayerType.AI);
    });
  });

  describe('createHardAI', () => {
    it('should create hard difficulty AI', () => {
      const ai = createHardAI(PlayerId.PLAYER_2);
      
      expect(ai).toBeDefined();
      expect(ai.id).toBe(PlayerId.PLAYER_2);
      expect(ai.type).toBe(PlayerType.AI);
    });
  });

  describe('createCustomAIPlayer', () => {
    it('should create AI with custom configuration', () => {
      const config: AIPlayerConfig = {
        difficulty: 'hard',
        playStyle: 'aggressive',
        thinkingTime: { min: 500, max: 2000 },
        randomness: 0.1,
      };
      
      const ai = createCustomAIPlayer(PlayerId.PLAYER_2, config);
      
      expect(ai).toBeDefined();
      expect(ai.id).toBe(PlayerId.PLAYER_2);
    });
  });

  describe('createAIFromPreset', () => {
    it('should create AI from TUTORIAL preset', () => {
      const ai = createAIFromPreset(PlayerId.PLAYER_2, 'TUTORIAL');
      
      expect(ai).toBeDefined();
      expect(ai.id).toBe(PlayerId.PLAYER_2);
    });

    it('should create AI from COMPETITIVE preset', () => {
      const ai = createAIFromPreset(PlayerId.PLAYER_2, 'COMPETITIVE');
      
      expect(ai).toBeDefined();
    });

    it('should create AI from all available presets', () => {
      const presets = getAvailablePresets();
      
      presets.forEach(preset => {
        const ai = createAIFromPreset(PlayerId.PLAYER_2, preset);
        expect(ai).toBeDefined();
      });
    });
  });
});

// ============================================================================
// Configuration Utility Tests
// ============================================================================

describe('AIPlayerFactory - Configuration Utilities', () => {
  describe('getDefaultConfig', () => {
    it('should return default config for easy difficulty', () => {
      const config = getDefaultConfig('easy');
      
      expect(config.difficulty).toBe('easy');
      expect(config.playStyle).toBe('balanced');
      expect(config.randomness).toBe(0.3);
    });

    it('should return default config for medium difficulty', () => {
      const config = getDefaultConfig('medium');
      
      expect(config.difficulty).toBe('medium');
      expect(config.randomness).toBe(0.15);
    });

    it('should return default config for hard difficulty', () => {
      const config = getDefaultConfig('hard');
      
      expect(config.difficulty).toBe('hard');
      expect(config.randomness).toBe(0.05);
    });

    it('should accept custom play style', () => {
      const config = getDefaultConfig('medium', 'aggressive');
      
      expect(config.playStyle).toBe('aggressive');
    });
  });

  describe('createCustomConfig', () => {
    it('should merge overrides with base config', () => {
      const config = createCustomConfig('medium', {
        randomness: 0.5,
      });
      
      expect(config.difficulty).toBe('medium');
      expect(config.randomness).toBe(0.5);
    });

    it('should partially override thinking time', () => {
      const config = createCustomConfig('hard', {
        thinkingTime: { min: 500 },
      });
      
      expect(config.thinkingTime.min).toBe(500);
      expect(config.thinkingTime.max).toBe(3000); // Original max preserved
    });

    it('should override play style', () => {
      const config = createCustomConfig('easy', {
        playStyle: 'defensive',
      });
      
      expect(config.playStyle).toBe('defensive');
    });
  });

  describe('getAvailableDifficulties', () => {
    it('should return all difficulty levels', () => {
      const difficulties = getAvailableDifficulties();
      
      expect(difficulties).toEqual(['easy', 'medium', 'hard']);
    });
  });

  describe('getAvailablePlayStyles', () => {
    it('should return all play styles', () => {
      const styles = getAvailablePlayStyles();
      
      expect(styles).toEqual(['aggressive', 'defensive', 'balanced']);
    });
  });

  describe('getDifficultyDescription', () => {
    it('should return description for each difficulty', () => {
      const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
      
      difficulties.forEach(difficulty => {
        const desc = getDifficultyDescription(difficulty);
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe('string');
      });
    });
  });

  describe('getPlayStyleDescription', () => {
    it('should return description for each play style', () => {
      const styles: PlayStyle[] = ['aggressive', 'defensive', 'balanced'];
      
      styles.forEach(style => {
        const desc = getPlayStyleDescription(style);
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe('string');
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config = getDefaultConfig('medium');
      
      expect(() => validateConfig(config)).not.toThrow();
      expect(validateConfig(config)).toBe(true);
    });

    it('should reject invalid difficulty', () => {
      const config = {
        difficulty: 'invalid' as DifficultyLevel,
        playStyle: 'balanced' as PlayStyle,
        thinkingTime: { min: 500, max: 1500 },
        randomness: 0.15,
      };
      
      expect(() => validateConfig(config)).toThrow('Invalid difficulty');
    });

    it('should reject invalid play style', () => {
      const config = {
        difficulty: 'medium' as DifficultyLevel,
        playStyle: 'invalid' as PlayStyle,
        thinkingTime: { min: 500, max: 1500 },
        randomness: 0.15,
      };
      
      expect(() => validateConfig(config)).toThrow('Invalid play style');
    });

    it('should reject negative thinking time', () => {
      const config = {
        difficulty: 'medium' as DifficultyLevel,
        playStyle: 'balanced' as PlayStyle,
        thinkingTime: { min: -100, max: 1500 },
        randomness: 0.15,
      };
      
      expect(() => validateConfig(config)).toThrow('Thinking time min must be non-negative');
    });

    it('should reject max less than min thinking time', () => {
      const config = {
        difficulty: 'medium' as DifficultyLevel,
        playStyle: 'balanced' as PlayStyle,
        thinkingTime: { min: 2000, max: 1000 },
        randomness: 0.15,
      };
      
      expect(() => validateConfig(config)).toThrow('Thinking time max must be greater than or equal to min');
    });

    it('should reject randomness out of range', () => {
      const config1 = {
        difficulty: 'medium' as DifficultyLevel,
        playStyle: 'balanced' as PlayStyle,
        thinkingTime: { min: 500, max: 1500 },
        randomness: -0.1,
      };
      
      expect(() => validateConfig(config1)).toThrow('Randomness must be between 0 and 1');
      
      const config2 = { ...config1, randomness: 1.5 };
      expect(() => validateConfig(config2)).toThrow('Randomness must be between 0 and 1');
    });
  });

  describe('getConfigSummary', () => {
    it('should return human-readable summary', () => {
      const config = getDefaultConfig('hard', 'aggressive');
      const summary = getConfigSummary(config);
      
      expect(summary).toContain('Hard difficulty');
      expect(summary).toContain('Aggressive play style');
      expect(summary).toContain('1000-3000ms thinking time');
      expect(summary).toContain('5% randomness');
    });

    it('should format percentages correctly', () => {
      const config = createCustomConfig('medium', { randomness: 0.25 });
      const summary = getConfigSummary(config);
      
      expect(summary).toContain('25% randomness');
    });
  });
});

// ============================================================================
// Preset Tests
// ============================================================================

describe('AIPlayerFactory - Presets', () => {
  describe('AI_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(AI_PRESETS.TUTORIAL).toBeDefined();
      expect(AI_PRESETS.QUICK_PLAY).toBeDefined();
      expect(AI_PRESETS.COMPETITIVE).toBeDefined();
      expect(AI_PRESETS.AGGRO).toBeDefined();
      expect(AI_PRESETS.CONTROL).toBeDefined();
    });

    it('should have valid configurations', () => {
      Object.values(AI_PRESETS).forEach(preset => {
        expect(() => validateConfig(preset)).not.toThrow();
      });
    });
  });

  describe('getAvailablePresets', () => {
    it('should return all preset names', () => {
      const presets = getAvailablePresets();
      
      expect(presets).toContain('TUTORIAL');
      expect(presets).toContain('QUICK_PLAY');
      expect(presets).toContain('COMPETITIVE');
      expect(presets).toContain('AGGRO');
      expect(presets).toContain('CONTROL');
    });
  });

  describe('getPresetDescription', () => {
    it('should return description for each preset', () => {
      const presets = getAvailablePresets();
      
      presets.forEach(preset => {
        const desc = getPresetDescription(preset);
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe('string');
      });
    });
  });
});
