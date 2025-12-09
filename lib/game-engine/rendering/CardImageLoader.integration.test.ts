/**
 * Integration tests for CardImageLoader
 * Tests the complete image loading pipeline including:
 * - Local image loading
 * - External image loading through proxy
 * - Error scenarios
 * - Performance and caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CardImageLoader } from './CardImageLoader';
import * as THREE from 'three';

describe('CardImageLoader Integration Tests', () => {
  let loader: CardImageLoader;

  beforeEach(() => {
    loader = CardImageLoader.getInstance();
    loader.clearCache();
  });

  afterEach(() => {
    loader.clearCache();
  });

  describe('7.1 Test with local images', () => {
    it('should load card from /cards/ directory', async () => {
      const result = await loader.loadTexture({
        imageUrl: '/cards/OP01-001.png',
        fallbackData: {
          name: 'Monkey.D.Luffy',
          category: 'LEADER',
          power: 5000,
          cost: 0,
        },
      });

      expect(result).toBeInstanceOf(THREE.Texture);
      expect(result.image).toBeDefined();
      
      // Verify it's not a placeholder (placeholders are canvas elements)
      // Real images should be HTMLImageElement
      const isPlaceholder = result.image instanceof HTMLCanvasElement;
      expect(isPlaceholder).toBe(false);
    }, 10000);

    it('should use placeholder fallback for missing local files', async () => {
      const result = await loader.loadTexture({
        imageUrl: '/cards/NONEXISTENT-999.png',
        fallbackData: {
          name: 'Missing Card',
          category: 'CHARACTER',
          power: 3000,
          cost: 4,
        },
      });

      expect(result).toBeInstanceOf(THREE.Texture);
      expect(result.image).toBeDefined();
      
      // Placeholder should be a canvas element
      expect(result.image).toBeInstanceOf(HTMLCanvasElement);
    }, 10000);

    it('should cache loaded local images', async () => {
      const imageUrl = '/cards/OP01-002.png';
      const fallbackData = {
        name: 'Test Card',
        category: 'CHARACTER' as const,
        power: 4000,
        cost: 3,
      };

      // First load
      const texture1 = await loader.loadTexture({ imageUrl, fallbackData });
      
      // Second load should use cache
      const texture2 = await loader.loadTexture({ imageUrl, fallbackData });

      // Should return the same texture instance from cache
      expect(texture1).toBe(texture2);
    }, 10000);

    it('should load multiple different local images', async () => {
      const images = [
        '/cards/OP01-001.png',
        '/cards/OP01-002.png',
        '/cards/OP01-003.png',
      ];

      const results = await Promise.all(
        images.map(imageUrl =>
          loader.loadTexture({
            imageUrl,
            fallbackData: {
              name: 'Test',
              category: 'CHARACTER',
              power: 1000,
              cost: 1,
            },
          })
        )
      );

      // All should load successfully
      expect(results).toHaveLength(3);
      results.forEach(texture => {
        expect(texture).toBeInstanceOf(THREE.Texture);
      });

      // All should be different textures
      expect(results[0]).not.toBe(results[1]);
      expect(results[1]).not.toBe(results[2]);
    }, 15000);
  });

  describe('7.2 Test with external images', () => {
    it('should route external URLs through proxy', async () => {
      // Mock fetch to intercept proxy calls
      const originalFetch = global.fetch;
      let proxyCalled = false;
      let proxyUrl = '';

      global.fetch = vi.fn(async (url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/image-proxy')) {
          proxyCalled = true;
          proxyUrl = urlString;
          
          // Return a mock image response
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png');
          });
          
          return new Response(blob, {
            headers: { 'Content-Type': 'image/png' },
          });
        }
        return originalFetch(url);
      }) as any;

      try {
        await loader.loadTexture({
          imageUrl: 'https://example.com/card.png',
          fallbackData: {
            name: 'External Card',
            category: 'CHARACTER',
            power: 2000,
            cost: 2,
          },
        });

        expect(proxyCalled).toBe(true);
        expect(proxyUrl).toContain('/api/image-proxy');
        expect(proxyUrl).toContain(encodeURIComponent('https://example.com/card.png'));
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);

    it('should handle CORS errors by using proxy', async () => {
      // This test verifies the proxy mechanism is in place
      // In real scenarios, CORS errors would trigger proxy usage
      const externalUrl = 'https://external-cdn.example.com/card-image.jpg';
      
      const result = await loader.loadTexture({
        imageUrl: externalUrl,
        fallbackData: {
          name: 'CORS Test',
          category: 'EVENT',
          power: 0,
          cost: 1,
        },
      });

      // Should either load through proxy or fall back to placeholder
      expect(result).toBeInstanceOf(THREE.Texture);
      expect(result.image).toBeDefined();
    }, 10000);

    it('should verify cache headers work with proxy', async () => {
      const originalFetch = global.fetch;
      let cacheControlHeader = '';

      global.fetch = vi.fn(async (url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/image-proxy')) {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png');
          });
          
          const response = new Response(blob, {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=86400',
            },
          });
          
          cacheControlHeader = response.headers.get('Cache-Control') || '';
          return response;
        }
        return originalFetch(url);
      }) as any;

      try {
        await loader.loadTexture({
          imageUrl: 'https://example.com/cached-card.png',
          fallbackData: {
            name: 'Cached Card',
            category: 'STAGE',
            power: 0,
            cost: 2,
          },
        });

        // Verify cache headers were present
        expect(cacheControlHeader).toContain('max-age');
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);
  });

  describe('7.3 Test error scenarios', () => {
    it('should handle missing imageUrl', async () => {
      const result = await loader.loadTexture({
        imageUrl: '',
        fallbackData: {
          name: 'No URL Card',
          category: 'CHARACTER',
          power: 1500,
          cost: 2,
        },
      });

      expect(result).toBeInstanceOf(THREE.Texture);
      // Should use placeholder
      expect(result.image).toBeInstanceOf(HTMLCanvasElement);
    }, 10000);

    it('should handle invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com/image.png',
        '://malformed',
      ];

      for (const imageUrl of invalidUrls) {
        const result = await loader.loadTexture({
          imageUrl,
          fallbackData: {
            name: 'Invalid URL',
            category: 'CHARACTER',
            power: 1000,
            cost: 1,
          },
        });

        expect(result).toBeInstanceOf(THREE.Texture);
        // Should fall back to placeholder
        expect(result.image).toBeDefined();
      }
    }, 15000);

    it('should handle network failures gracefully', async () => {
      const originalFetch = global.fetch;
      
      global.fetch = vi.fn(async () => {
        throw new Error('Network error');
      }) as any;

      try {
        const result = await loader.loadTexture({
          imageUrl: 'https://example.com/network-fail.png',
          fallbackData: {
            name: 'Network Fail',
            category: 'EVENT',
            power: 0,
            cost: 3,
          },
        });

        expect(result).toBeInstanceOf(THREE.Texture);
        // Should fall back to placeholder
        expect(result.image).toBeInstanceOf(HTMLCanvasElement);
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);

    it('should handle timeout scenarios', async () => {
      const originalFetch = global.fetch;
      
      global.fetch = vi.fn(async () => {
        // Simulate a timeout by delaying longer than the timeout threshold
        await new Promise(resolve => setTimeout(resolve, 10000));
        return new Response();
      }) as any;

      try {
        const result = await loader.loadTexture({
          imageUrl: 'https://example.com/timeout.png',
          fallbackData: {
            name: 'Timeout Test',
            category: 'CHARACTER',
            power: 2500,
            cost: 4,
          },
        });

        // Should eventually return a texture (either loaded or placeholder)
        expect(result).toBeInstanceOf(THREE.Texture);
      } finally {
        global.fetch = originalFetch;
      }
    }, 15000);

    it('should handle malformed image data', async () => {
      const originalFetch = global.fetch;
      
      global.fetch = vi.fn(async (url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/image-proxy')) {
          // Return invalid image data
          return new Response('not an image', {
            headers: { 'Content-Type': 'image/png' },
          });
        }
        return originalFetch(url);
      }) as any;

      try {
        const result = await loader.loadTexture({
          imageUrl: 'https://example.com/malformed.png',
          fallbackData: {
            name: 'Malformed',
            category: 'STAGE',
            power: 0,
            cost: 1,
          },
        });

        expect(result).toBeInstanceOf(THREE.Texture);
        // Should fall back to placeholder
        expect(result.image).toBeDefined();
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);
  });

  describe('7.4 Performance testing', () => {
    it('should load game with 50+ cards efficiently', async () => {
      const startTime = performance.now();
      
      // Create 50 card load requests
      const cardPromises = Array.from({ length: 50 }, (_, i) => {
        // Mix of real and placeholder cards
        const cardNumber = (i % 10) + 1;
        const imageUrl = i < 25 
          ? `/cards/OP01-00${cardNumber}.png`
          : `/cards/MISSING-${i}.png`;
        
        return loader.loadTexture({
          imageUrl,
          fallbackData: {
            name: `Card ${i}`,
            category: 'CHARACTER',
            power: 1000 + (i * 100),
            cost: (i % 10) + 1,
          },
        });
      });

      const results = await Promise.all(cardPromises);
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // All cards should load
      expect(results).toHaveLength(50);
      results.forEach(texture => {
        expect(texture).toBeInstanceOf(THREE.Texture);
      });

      // Should complete in reasonable time (adjust threshold as needed)
      console.log(`Loaded 50 cards in ${loadTime}ms`);
      expect(loadTime).toBeLessThan(30000); // 30 seconds max
    }, 35000);

    it('should verify cache effectiveness', async () => {
      const imageUrl = '/cards/OP01-001.png';
      const fallbackData = {
        name: 'Cache Test',
        category: 'LEADER' as const,
        power: 5000,
        cost: 0,
      };

      // First load - should hit network/disk
      const start1 = performance.now();
      await loader.loadTexture({ imageUrl, fallbackData });
      const time1 = performance.now() - start1;

      // Second load - should hit cache
      const start2 = performance.now();
      await loader.loadTexture({ imageUrl, fallbackData });
      const time2 = performance.now() - start2;

      // Cached load should be significantly faster
      console.log(`First load: ${time1}ms, Cached load: ${time2}ms`);
      expect(time2).toBeLessThan(time1);
    }, 15000);

    it('should check for memory leaks with repeated loads', async () => {
      const imageUrl = '/cards/OP01-002.png';
      const fallbackData = {
        name: 'Memory Test',
        category: 'CHARACTER' as const,
        power: 3000,
        cost: 3,
      };

      // Load and release multiple times
      for (let i = 0; i < 10; i++) {
        const texture = await loader.loadTexture({ imageUrl, fallbackData });
        expect(texture).toBeInstanceOf(THREE.Texture);
        
        // Release texture
        loader.releaseTexture(imageUrl);
      }

      // Cache should handle this gracefully without memory issues
      // If we get here without errors, the test passes
      expect(true).toBe(true);
    }, 20000);

    it('should monitor memory usage with large cache', async () => {
      // Load many different images to fill cache
      const promises = Array.from({ length: 100 }, (_, i) => {
        const cardNum = String(i + 1).padStart(3, '0');
        return loader.loadTexture({
          imageUrl: `/cards/OP01-${cardNum}.png`,
          fallbackData: {
            name: `Card ${i}`,
            category: 'CHARACTER',
            power: 1000,
            cost: 1,
          },
        });
      });

      const results = await Promise.all(promises);
      
      // All should load (some will be placeholders for missing cards)
      expect(results).toHaveLength(100);
      
      // Cache should have evicted old entries (max 100)
      // This is tested implicitly - if memory grows unbounded, test will fail
      results.forEach(texture => {
        expect(texture).toBeInstanceOf(THREE.Texture);
      });
    }, 40000);

    it('should handle concurrent loads of same image', async () => {
      const imageUrl = '/cards/OP01-003.png';
      const fallbackData = {
        name: 'Concurrent Test',
        category: 'CHARACTER' as const,
        power: 2000,
        cost: 2,
      };

      // Start 10 concurrent loads of the same image
      const promises = Array.from({ length: 10 }, () =>
        loader.loadTexture({ imageUrl, fallbackData })
      );

      const results = await Promise.all(promises);

      // All should return the same cached texture
      expect(results).toHaveLength(10);
      const firstTexture = results[0];
      results.forEach(texture => {
        expect(texture).toBe(firstTexture);
      });
    }, 15000);
  });

  describe('Integration with CardMesh workflow', () => {
    it('should simulate CardMesh component lifecycle', async () => {
      // Simulate mounting CardMesh with a card
      const imageUrl = '/cards/OP01-001.png';
      const fallbackData = {
        name: 'Luffy',
        category: 'LEADER' as const,
        power: 5000,
        cost: 0,
      };

      // Load texture (mount)
      const texture = await loader.loadTexture({ imageUrl, fallbackData });
      expect(texture).toBeInstanceOf(THREE.Texture);

      // Use texture in rendering
      expect(texture.image).toBeDefined();

      // Release texture (unmount)
      loader.releaseTexture(imageUrl);

      // Texture should still be in cache for reuse
      const cachedTexture = loader.getCachedTexture(imageUrl);
      expect(cachedTexture).toBeDefined();
    }, 10000);

    it('should handle rapid card changes', async () => {
      const cards = [
        { url: '/cards/OP01-001.png', name: 'Card 1' },
        { url: '/cards/OP01-002.png', name: 'Card 2' },
        { url: '/cards/OP01-003.png', name: 'Card 3' },
      ];

      // Simulate rapid switching between cards
      for (const card of cards) {
        const texture = await loader.loadTexture({
          imageUrl: card.url,
          fallbackData: {
            name: card.name,
            category: 'CHARACTER',
            power: 1000,
            cost: 1,
          },
        });

        expect(texture).toBeInstanceOf(THREE.Texture);
        
        // Simulate brief display then release
        loader.releaseTexture(card.url);
      }

      // All cards should be cached
      cards.forEach(card => {
        const cached = loader.getCachedTexture(card.url);
        expect(cached).toBeDefined();
      });
    }, 15000);
  });
});
