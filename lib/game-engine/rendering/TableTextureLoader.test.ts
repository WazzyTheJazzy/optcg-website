/**
 * Tests for TableTextureLoader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  loadTableTextures,
  createTableMaterial,
  createFallbackTableMaterial,
  clearTextureCache,
  getTextureCacheStats,
} from './TableTextureLoader';

// Mock THREE.TextureLoader
vi.mock('three', async (importOriginal) => {
  const actual: any = await importOriginal();
  
  // Create a proper constructor mock
  const MockTextureLoader = vi.fn().mockImplementation(function(this: any) {
    this.loadAsync = vi.fn().mockImplementation((path: string) => {
      // Create an actual THREE.Texture instance
      const texture = new actual.Texture();
      texture.name = path;
      texture.wrapS = actual.RepeatWrapping;
      texture.wrapT = actual.RepeatWrapping;
      texture.repeat = { set: vi.fn() };
      texture.anisotropy = 1;
      texture.colorSpace = actual.SRGBColorSpace;
      texture.needsUpdate = true;
      return Promise.resolve(texture);
    });
    return this;
  });
  
  return {
    ...actual,
    TextureLoader: MockTextureLoader,
  };
});

describe('TableTextureLoader', () => {
  beforeEach(() => {
    clearTextureCache();
    vi.clearAllMocks();
  });

  describe('loadTableTextures', () => {
    it('should load wood textures', async () => {
      const textures = await loadTableTextures('wood');
      
      expect(textures.diffuse).toBeDefined();
      expect(textures.diffuse).toBeInstanceOf(THREE.Texture);
      expect(textures.normal).toBeDefined();
    });

    it('should load felt textures', async () => {
      const textures = await loadTableTextures('felt');
      
      expect(textures.diffuse).toBeDefined();
      expect(textures.diffuse).toBeInstanceOf(THREE.Texture);
      expect(textures.normal).toBeDefined();
    });

    it('should cache loaded textures', async () => {
      await loadTableTextures('wood');
      const stats1 = getTextureCacheStats();
      
      await loadTableTextures('wood');
      const stats2 = getTextureCacheStats();
      
      // Cache size should not increase on second load
      expect(stats2.count).toBe(stats1.count);
    });
  });

  describe('createTableMaterial', () => {
    it('should create wood material with default properties', async () => {
      const material = await createTableMaterial({ surfaceType: 'wood' });
      
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBe(0.8);
      expect(material.metalness).toBe(0.1);
    });

    it('should create felt material with default properties', async () => {
      const material = await createTableMaterial({ surfaceType: 'felt' });
      
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBe(0.95);
      expect(material.metalness).toBe(0.0);
    });

    it('should allow custom material properties', async () => {
      const material = await createTableMaterial({
        surfaceType: 'wood',
        roughness: 0.5,
        metalness: 0.3,
        normalScale: 1.0,
      });
      
      expect(material.roughness).toBe(0.5);
      expect(material.metalness).toBe(0.3);
    });

    it('should apply textures to material', async () => {
      const material = await createTableMaterial({ surfaceType: 'wood' });
      
      expect(material.map).toBeDefined();
      expect(material.normalMap).toBeDefined();
    });
  });

  describe('createFallbackTableMaterial', () => {
    it('should create wood fallback material', () => {
      const material = createFallbackTableMaterial('wood');
      
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(0x8b5a2b);
      expect(material.roughness).toBe(0.8);
    });

    it('should create felt fallback material', () => {
      const material = createFallbackTableMaterial('felt');
      
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(0x145028);
      expect(material.roughness).toBe(0.95);
    });

    it('should not have textures', () => {
      const material = createFallbackTableMaterial('wood');
      
      expect(material.map).toBeNull();
      expect(material.normalMap).toBeNull();
    });
  });

  describe('texture cache management', () => {
    it('should track cached textures', async () => {
      const stats1 = getTextureCacheStats();
      expect(stats1.count).toBe(0);
      
      await loadTableTextures('wood');
      const stats2 = getTextureCacheStats();
      expect(stats2.count).toBeGreaterThan(0);
    });

    it('should clear texture cache', async () => {
      await loadTableTextures('wood');
      await loadTableTextures('felt');
      
      const statsBefore = getTextureCacheStats();
      expect(statsBefore.count).toBeGreaterThan(0);
      
      clearTextureCache();
      
      const statsAfter = getTextureCacheStats();
      expect(statsAfter.count).toBe(0);
    });
  });
});
