/**
 * CardImageLoader.placeholder.test.ts
 * 
 * Tests for placeholder fallback behavior in CardImageLoader
 * Verifies Requirements 6.1-6.5 from card-image-rendering-fix spec
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { CardImageLoader } from './CardImageLoader';
import { PlaceholderGenerator } from './PlaceholderGenerator';

// Mock PlaceholderGenerator to verify it's called correctly
vi.mock('./PlaceholderGenerator', () => ({
  PlaceholderGenerator: {
    generate: vi.fn((options) => {
      // Return a mock data URL that includes the options for verification
      return `data:image/png;base64,mock-${options.name}-${options.category}-${options.power}-${options.cost}-${options.showError}`;
    }),
  },
}));

describe('CardImageLoader - Placeholder Fallback Behavior', () => {
  let loader: CardImageLoader;
  
  beforeEach(() => {
    // Reset singleton and mocks before each test
    CardImageLoader.resetInstance();
    loader = CardImageLoader.getInstance();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    CardImageLoader.resetInstance();
  });
  
  describe('Requirement 6.1: Missing imageUrl fallback', () => {
    it('should generate placeholder immediately when imageUrl is empty string', async () => {
      const fallbackData = {
        name: 'Test Card',
        category: 'CHARACTER',
        power: 3000,
        cost: 2,
      };
      
      const texture = await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      // Verify placeholder was generated
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 3000,
        cost: 2,
        showError: false, // No error indicator for missing URL
      });
      
      // Verify texture was created
      expect(texture).toBeInstanceOf(THREE.Texture);
    });
    
    it('should generate placeholder immediately when imageUrl is null', async () => {
      const fallbackData = {
        name: 'Null URL Card',
        category: 'LEADER',
        power: 5000,
        cost: 0,
      };
      
      const texture = await loader.loadTexture({
        imageUrl: null as any, // Simulate null URL
        fallbackData,
      });
      
      // Verify placeholder was generated without error indicator
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Null URL Card',
        category: 'LEADER',
        power: 5000,
        cost: 0,
        showError: false,
      });
      
      expect(texture).toBeInstanceOf(THREE.Texture);
    });
    
    it('should generate placeholder immediately when imageUrl is whitespace', async () => {
      const fallbackData = {
        name: 'Whitespace Card',
        category: 'EVENT',
        power: 0,
        cost: 1,
      };
      
      const texture = await loader.loadTexture({
        imageUrl: '   ',
        fallbackData,
      });
      
      // Verify placeholder was generated
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Whitespace Card',
        category: 'EVENT',
        power: 0,
        cost: 1,
        showError: false,
      });
      
      expect(texture).toBeInstanceOf(THREE.Texture);
    });
  });
  
  describe('Requirement 6.2: Invalid imageUrl fallback with error indicator', () => {
    it('should generate placeholder with error indicator when image load fails', async () => {
      const fallbackData = {
        name: 'Failed Card',
        category: 'CHARACTER',
        power: 4000,
        cost: 3,
      };
      
      // Mock TextureLoader to simulate load failure
      const mockLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load');
      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        // Simulate async error
        setTimeout(() => {
          if (onError) {
            onError(new Error('404 Not Found'));
          }
        }, 0);
        return new THREE.Texture();
      });
      
      const texture = await loader.loadTexture({
        imageUrl: '/invalid/path.png',
        fallbackData,
      });
      
      // Verify placeholder was generated with error indicator
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Failed Card',
        category: 'CHARACTER',
        power: 4000,
        cost: 3,
        showError: true, // Error indicator should be shown
      });
      
      expect(texture).toBeInstanceOf(THREE.Texture);
      
      mockLoad.mockRestore();
    });
    
    it('should generate placeholder with error indicator on network error', async () => {
      const fallbackData = {
        name: 'Network Error Card',
        category: 'STAGE',
        power: 0,
        cost: 2,
      };
      
      const mockLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load');
      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        setTimeout(() => {
          if (onError) {
            onError(new Error('Network error'));
          }
        }, 0);
        return new THREE.Texture();
      });
      
      const texture = await loader.loadTexture({
        imageUrl: 'https://example.com/card.png',
        fallbackData,
      });
      
      // Should show error indicator for network failures
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Network Error Card',
          showError: true,
        })
      );
      
      expect(texture).toBeInstanceOf(THREE.Texture);
      
      mockLoad.mockRestore();
    });
  });
  
  describe('Requirement 6.3: Placeholder shows card name and stats', () => {
    it('should pass card name to placeholder generator', async () => {
      const fallbackData = {
        name: 'Monkey D. Luffy',
        category: 'LEADER',
        power: 5000,
        cost: 0,
      };
      
      await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Monkey D. Luffy',
        })
      );
    });
    
    it('should pass card category to placeholder generator', async () => {
      const fallbackData = {
        name: 'Roronoa Zoro',
        category: 'CHARACTER',
        power: 5000,
        cost: 4,
      };
      
      await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'CHARACTER',
        })
      );
    });
    
    it('should pass card power to placeholder generator', async () => {
      const fallbackData = {
        name: 'Nami',
        category: 'CHARACTER',
        power: 3000,
        cost: 2,
      };
      
      await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          power: 3000,
        })
      );
    });
    
    it('should pass card cost to placeholder generator', async () => {
      const fallbackData = {
        name: 'Usopp',
        category: 'CHARACTER',
        power: 2000,
        cost: 1,
      };
      
      await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          cost: 1,
        })
      );
    });
    
    it('should handle zero power and cost correctly', async () => {
      const fallbackData = {
        name: 'Event Card',
        category: 'EVENT',
        power: 0,
        cost: 0,
      };
      
      await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          power: 0,
          cost: 0,
        })
      );
    });
  });
  
  describe('Requirement 6.4: Placeholder texture is applied to material', () => {
    it('should return a valid Three.js texture for missing URL', async () => {
      const fallbackData = {
        name: 'Test Card',
        category: 'CHARACTER',
        power: 3000,
        cost: 2,
      };
      
      const texture = await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      // Verify it's a valid Three.js texture that can be applied to material
      expect(texture).toBeInstanceOf(THREE.Texture);
      expect(texture.minFilter).toBe(THREE.LinearFilter);
      expect(texture.magFilter).toBe(THREE.LinearFilter);
    });
    
    it('should return a valid Three.js texture for failed load', async () => {
      const fallbackData = {
        name: 'Failed Card',
        category: 'CHARACTER',
        power: 4000,
        cost: 3,
      };
      
      const mockLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load');
      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        setTimeout(() => {
          if (onError) {
            onError(new Error('Load failed'));
          }
        }, 0);
        return new THREE.Texture();
      });
      
      const texture = await loader.loadTexture({
        imageUrl: '/invalid.png',
        fallbackData,
      });
      
      // Verify it's a valid texture with proper settings
      expect(texture).toBeInstanceOf(THREE.Texture);
      expect(texture.minFilter).toBe(THREE.LinearFilter);
      expect(texture.magFilter).toBe(THREE.LinearFilter);
      
      mockLoad.mockRestore();
    });
  });
  
  describe('Requirement 6.5: Error indicator when appropriate', () => {
    it('should NOT show error indicator for missing URL (expected case)', async () => {
      const fallbackData = {
        name: 'No URL Card',
        category: 'CHARACTER',
        power: 3000,
        cost: 2,
      };
      
      await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      // Missing URL is not an error - it's expected for some cards
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          showError: false,
        })
      );
    });
    
    it('should show error indicator for failed image load (unexpected case)', async () => {
      const fallbackData = {
        name: 'Failed Load Card',
        category: 'CHARACTER',
        power: 4000,
        cost: 3,
      };
      
      const mockLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load');
      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        setTimeout(() => {
          if (onError) {
            onError(new Error('Image load failed'));
          }
        }, 0);
        return new THREE.Texture();
      });
      
      await loader.loadTexture({
        imageUrl: '/should-exist.png',
        fallbackData,
      });
      
      // Failed load IS an error - the image should have existed
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          showError: true,
        })
      );
      
      mockLoad.mockRestore();
    });
    
    it('should show error indicator after timeout', async () => {
      const fallbackData = {
        name: 'Timeout Card',
        category: 'CHARACTER',
        power: 3000,
        cost: 2,
      };
      
      const mockLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load');
      mockLoad.mockImplementation(() => {
        // Never call onLoad or onError - simulate hanging request
        return new THREE.Texture();
      });
      
      // Use fake timers to control timeout
      vi.useFakeTimers();
      
      const loadPromise = loader.loadTexture({
        imageUrl: '/slow-image.png',
        fallbackData,
      });
      
      // Fast-forward past the 5-second timeout
      vi.advanceTimersByTime(5001);
      
      const texture = await loadPromise;
      
      // Timeout should trigger error indicator
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          showError: true,
        })
      );
      
      expect(texture).toBeInstanceOf(THREE.Texture);
      
      vi.useRealTimers();
      mockLoad.mockRestore();
    });
  });
  
  describe('Integration: Complete fallback scenarios', () => {
    it('should handle complete missing URL scenario', async () => {
      const fallbackData = {
        name: 'Complete Missing Test',
        category: 'LEADER',
        power: 5000,
        cost: 0,
      };
      
      const texture = await loader.loadTexture({
        imageUrl: '',
        fallbackData,
      });
      
      // Verify complete placeholder generation
      expect(PlaceholderGenerator.generate).toHaveBeenCalledTimes(1);
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith({
        name: 'Complete Missing Test',
        category: 'LEADER',
        power: 5000,
        cost: 0,
        showError: false,
      });
      
      expect(texture).toBeInstanceOf(THREE.Texture);
    });
    
    it('should handle complete load failure scenario', async () => {
      const fallbackData = {
        name: 'Complete Failure Test',
        category: 'CHARACTER',
        power: 4000,
        cost: 3,
      };
      
      const mockLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load');
      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        setTimeout(() => {
          if (onError) {
            onError(new Error('Complete failure'));
          }
        }, 0);
        return new THREE.Texture();
      });
      
      const texture = await loader.loadTexture({
        imageUrl: '/complete-failure.png',
        fallbackData,
      });
      
      // Verify complete placeholder generation with error
      expect(PlaceholderGenerator.generate).toHaveBeenCalled();
      expect(PlaceholderGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Complete Failure Test',
          category: 'CHARACTER',
          power: 4000,
          cost: 3,
          showError: true,
        })
      );
      
      expect(texture).toBeInstanceOf(THREE.Texture);
      
      mockLoad.mockRestore();
    });
  });
});
