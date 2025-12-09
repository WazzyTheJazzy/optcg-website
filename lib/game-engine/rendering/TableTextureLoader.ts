/**
 * Table Texture Loader
 * 
 * Utility for loading and managing table surface textures in the game scene.
 * Handles texture loading, caching, and fallback for missing textures.
 */

import * as THREE from 'three';

export type TableSurfaceType = 'wood' | 'felt';

export interface TableTextures {
  diffuse: THREE.Texture;
  normal?: THREE.Texture;
}

export interface TableMaterialConfig {
  surfaceType: TableSurfaceType;
  roughness?: number;
  metalness?: number;
  normalScale?: number;
}

/**
 * Texture paths for different table surfaces
 */
const TEXTURE_PATHS = {
  wood: {
    diffuse: '/textures/wood-table-2048.png',
    normal: '/textures/wood-normal-2048.png',
  },
  felt: {
    diffuse: '/textures/felt-playmat-2048.png',
    normal: '/textures/felt-normal-2048.png',
  },
} as const;

/**
 * Default material properties for each surface type
 */
const MATERIAL_DEFAULTS = {
  wood: {
    roughness: 0.8,
    metalness: 0.1,
    normalScale: 0.7,
  },
  felt: {
    roughness: 0.95,
    metalness: 0.0,
    normalScale: 0.4,
  },
} as const;

/**
 * Fallback colors if textures fail to load
 */
const FALLBACK_COLORS = {
  wood: 0x8b5a2b, // Brown
  felt: 0x145028, // Dark green
} as const;

/**
 * Cache for loaded textures to avoid reloading
 */
const textureCache = new Map<string, THREE.Texture>();

/**
 * Load a texture with caching and error handling
 */
async function loadTexture(path: string): Promise<THREE.Texture | null> {
  // Check cache first
  if (textureCache.has(path)) {
    return textureCache.get(path)!;
  }

  const loader = new THREE.TextureLoader();

  try {
    const texture = await loader.loadAsync(path);
    
    // Configure texture settings
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4; // Improve quality at angles
    
    // Cache the texture
    textureCache.set(path, texture);
    
    return texture;
  } catch (error) {
    console.warn(`Failed to load texture: ${path}`, error);
    return null;
  }
}

/**
 * Load all textures for a specific table surface type
 */
export async function loadTableTextures(
  surfaceType: TableSurfaceType
): Promise<TableTextures> {
  const paths = TEXTURE_PATHS[surfaceType];

  const [diffuse, normal] = await Promise.all([
    loadTexture(paths.diffuse),
    loadTexture(paths.normal),
  ]);

  if (!diffuse) {
    throw new Error(`Failed to load diffuse texture for ${surfaceType} surface`);
  }

  return {
    diffuse,
    normal: normal || undefined,
  };
}

/**
 * Create a table material with loaded textures
 */
export async function createTableMaterial(
  config: TableMaterialConfig
): Promise<THREE.MeshStandardMaterial> {
  const { surfaceType, roughness, metalness, normalScale } = config;
  
  // Get default values
  const defaults = MATERIAL_DEFAULTS[surfaceType];
  
  try {
    // Load textures
    const textures = await loadTableTextures(surfaceType);
    
    // Create material with textures
    const material = new THREE.MeshStandardMaterial({
      map: textures.diffuse,
      normalMap: textures.normal,
      roughness: roughness ?? defaults.roughness,
      metalness: metalness ?? defaults.metalness,
      normalScale: new THREE.Vector2(
        normalScale ?? defaults.normalScale,
        normalScale ?? defaults.normalScale
      ),
    });
    
    return material;
  } catch (error) {
    console.warn('Failed to create textured material, using fallback color', error);
    
    // Fallback to solid color material
    return new THREE.MeshStandardMaterial({
      color: FALLBACK_COLORS[surfaceType],
      roughness: roughness ?? defaults.roughness,
      metalness: metalness ?? defaults.metalness,
    });
  }
}

/**
 * Create a simple fallback material (no textures)
 */
export function createFallbackTableMaterial(
  surfaceType: TableSurfaceType
): THREE.MeshStandardMaterial {
  const defaults = MATERIAL_DEFAULTS[surfaceType];
  
  return new THREE.MeshStandardMaterial({
    color: FALLBACK_COLORS[surfaceType],
    roughness: defaults.roughness,
    metalness: defaults.metalness,
  });
}

/**
 * Preload all table textures for better performance
 */
export async function preloadTableTextures(): Promise<void> {
  try {
    await Promise.all([
      loadTableTextures('wood'),
      loadTableTextures('felt'),
    ]);
  } catch (error) {
    console.warn('TableTextureLoader: Some table textures failed to preload', error);
  }
}

/**
 * Clear texture cache (useful for memory management)
 */
export function clearTextureCache(): void {
  textureCache.forEach(texture => texture.dispose());
  textureCache.clear();
}

/**
 * Get texture cache statistics
 */
export function getTextureCacheStats() {
  return {
    count: textureCache.size,
    textures: Array.from(textureCache.keys()),
  };
}
