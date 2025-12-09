# CardImageLoader

A singleton utility for loading and caching card image textures with Three.js. Provides automatic fallback to placeholder generation when images fail to load.

## Features

- **Singleton Pattern**: Single instance manages all texture loading
- **LRU Cache**: Automatically evicts least recently used textures when cache is full
- **Reference Counting**: Tracks texture usage to prevent premature disposal
- **Automatic Fallback**: Generates placeholder textures when images fail to load
- **Progress Tracking**: Optional progress callbacks during loading

## Usage

```typescript
import { CardImageLoader } from './CardImageLoader';

// Get the singleton instance
const loader = CardImageLoader.getInstance();

// Load a texture
const texture = await loader.loadTexture({
  imageUrl: '/cards/OP01-001.png',
  fallbackData: {
    name: 'Monkey D. Luffy',
    category: 'CHARACTER',
    power: 5000,
    cost: 3,
  },
  onProgress: (progress) => {
    console.log(`Loading: ${progress * 100}%`);
  },
});

// Use the texture in your mesh
mesh.material.map = texture;

// Release texture when component unmounts
loader.releaseTexture('/cards/OP01-001.png');
```

## API

### `getInstance(maxCacheSize?: number): CardImageLoader`

Get the singleton instance. Optionally specify max cache size (default: 100).

### `loadTexture(options: LoadImageOptions): Promise<THREE.Texture>`

Load a texture with caching and fallback support.

**Options:**
- `imageUrl`: URL of the image to load
- `fallbackData`: Card data for placeholder generation if load fails
- `onProgress`: Optional callback for load progress (0-1)

### `getCachedTexture(imageUrl: string): THREE.Texture | null`

Get a cached texture if available. Returns null if not cached.

### `releaseTexture(imageUrl: string): void`

Decrement reference count for a texture. Should be called when a component unmounts.

### `clearCache(): void`

Clear all cached textures and dispose of them.

### `getCacheStats(): object`

Get cache statistics for debugging.

## Cache Behavior

- **Max Size**: 100 textures by default
- **Eviction**: LRU (Least Recently Used) strategy
- **Reference Counting**: Textures with higher ref counts are kept longer
- **Automatic Disposal**: Three.js textures are properly disposed when evicted

## Fallback Behavior

When an image fails to load or imageUrl is missing:

1. Logs a warning with card details and reason
2. Generates a placeholder using PlaceholderGenerator
3. Returns the placeholder texture immediately
4. Placeholder includes card name, category, power, and cost
5. Error indicator shown if load failed (vs. missing URL)

## Performance

- Textures are cached and reused across multiple cards
- Only one network request per unique imageUrl
- Automatic memory management via LRU eviction
- Proper Three.js texture disposal prevents memory leaks

## Testing

Comprehensive unit tests cover:
- Singleton pattern
- Texture loading and caching
- LRU eviction logic
- Reference counting
- Fallback generation
- Error handling

Run tests with:
```bash
npm test -- CardImageLoader.test.ts
```
