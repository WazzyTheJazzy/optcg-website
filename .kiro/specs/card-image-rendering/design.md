# Design Document

## Overview

This design addresses the card image rendering issue by implementing a complete image loading pipeline from database to 3D rendering. The solution leverages the existing `imageUrl` field in `CardMetadata` and adds texture caching, fallback handling, and an image proxy for external URLs.

## Architecture

### High-Level Flow

```
Database (imageUrl) 
  → CardDefinition 
  → CardInstance 
  → CardVisualState (metadata.imageUrl)
  → CardMesh Component
  → TextureLoader / ImageProxy
  → Three.js Texture
  → Rendered Card
```

### Key Components

1. **RenderingInterface** - Already passes `imageUrl` through `CardMetadata`
2. **CardMesh** - Needs modification to use `imageUrl` instead of always generating placeholders
3. **CardImageLoader** - New utility class for loading and caching textures
4. **ImageProxyAPI** - New API route for proxying external images
5. **PlaceholderGenerator** - Extracted utility for generating fallback textures

## Components and Interfaces

### 1. CardImageLoader Utility

A new utility class that handles texture loading, caching, and fallback logic.

**Location:** `lib/game-engine/rendering/CardImageLoader.ts`

```typescript
interface TextureCacheEntry {
  texture: THREE.Texture;
  lastUsed: number;
  refCount: number;
}

interface LoadImageOptions {
  imageUrl: string;
  fallbackData: {
    name: string;
    category: string;
    power: number;
    cost: number;
  };
  onProgress?: (progress: number) => void;
}

class CardImageLoader {
  private cache: Map<string, TextureCacheEntry>;
  private maxCacheSize: number;
  private loader: THREE.TextureLoader;
  
  constructor(maxCacheSize = 100);
  
  // Load texture with caching and fallback
  async loadTexture(options: LoadImageOptions): Promise<THREE.Texture>;
  
  // Get cached texture if available
  getCachedTexture(imageUrl: string): THREE.Texture | null;
  
  // Generate placeholder texture
  generatePlaceholder(fallbackData): THREE.Texture;
  
  // Clean up old textures
  private evictLRU(): void;
  
  // Dispose of a texture
  releaseTexture(imageUrl: string): void;
  
  // Clear all cached textures
  clearCache(): void;
}
```

**Key Design Decisions:**
- LRU (Least Recently Used) cache eviction strategy
- Reference counting to prevent premature disposal
- Async loading with progress callbacks
- Automatic fallback to placeholder on error

### 2. CardMesh Component Updates

**Location:** `components/game/CardMesh.tsx`

**Current State:**
```typescript
// Always generates placeholder
const placeholderDataUrl = useMemo(() => { /* ... */ }, []);
useEffect(() => {
  loader.load(placeholderDataUrl, setCardTexture);
}, [placeholderDataUrl]);
```

**New State:**
```typescript
// Use imageUrl from metadata
const imageUrl = cardState.metadata.imageUrl;
const [cardTexture, setCardTexture] = useState<THREE.Texture | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [loadError, setLoadError] = useState(false);

useEffect(() => {
  const loader = CardImageLoader.getInstance();
  
  loader.loadTexture({
    imageUrl,
    fallbackData: {
      name: cardState.metadata.name,
      category: cardState.metadata.category,
      power: cardState.power,
      cost: cardState.cost,
    },
    onProgress: (progress) => {
      // Optional: show loading indicator
    }
  }).then(texture => {
    setCardTexture(texture);
    setIsLoading(false);
  }).catch(error => {
    console.error('Failed to load card image:', error);
    setLoadError(true);
    setIsLoading(false);
  });
  
  return () => {
    // Release texture reference on unmount
    loader.releaseTexture(imageUrl);
  };
}, [imageUrl, cardState.metadata.name, /* ... */]);
```

**Visual States:**
- Loading: Show placeholder with subtle animation
- Loaded: Display actual card image
- Error: Show enhanced placeholder with error indicator

### 3. Image Proxy API

**Location:** `app/api/image-proxy/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  // Validate URL
  if (!url || !isValidImageUrl(url)) {
    return new NextResponse('Invalid URL', { status: 400 });
  }
  
  try {
    // Fetch external image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OnePieceTCG/1.0',
      },
    });
    
    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { 
        status: response.status 
      });
    }
    
    // Get image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Return with cache headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Proxy error', { status: 500 });
  }
}
```

**Security Considerations:**
- Whitelist allowed domains (optional)
- Rate limiting (future enhancement)
- Size limits on responses
- Timeout handling

### 4. Placeholder Generator

**Location:** `lib/game-engine/rendering/PlaceholderGenerator.ts`

Extract the current placeholder generation logic into a reusable utility:

```typescript
interface PlaceholderOptions {
  name: string;
  category: string;
  power: number;
  cost: number;
  width?: number;
  height?: number;
  showError?: boolean;
}

class PlaceholderGenerator {
  static generate(options: PlaceholderOptions): string {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 512;
    canvas.height = options.height || 716;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Background color based on category
    ctx.fillStyle = this.getCategoryColor(options.category);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    
    // Card name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(options.name.substring(0, 20), canvas.width / 2, 60);
    
    // Category
    ctx.font = '24px Arial';
    ctx.fillText(options.category, canvas.width / 2, 100);
    
    // Power
    if (options.power > 0) {
      ctx.font = 'bold 48px Arial';
      ctx.fillText(`${options.power}`, canvas.width / 2, 400);
      ctx.font = '20px Arial';
      ctx.fillText('POWER', canvas.width / 2, 430);
    }
    
    // Cost
    if (options.cost > 0) {
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(80, 80, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillText(`${options.cost}`, 80, 95);
    }
    
    // Error indicator
    if (options.showError) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff0000';
      ctx.font = '20px Arial';
      ctx.fillText('⚠ Image Load Failed', canvas.width / 2, canvas.height - 40);
    }
    
    return canvas.toDataURL();
  }
  
  private static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'LEADER': '#8B0000',
      'CHARACTER': '#1E3A8A',
      'EVENT': '#065F46',
      'STAGE': '#7C2D12',
    };
    return colors[category] || '#2a2a4a';
  }
}
```

## Data Models

### CardVisualState (No Changes Needed)

Already includes `metadata.imageUrl`:

```typescript
interface CardVisualState {
  id: string;
  position: { zone: ZoneId; index: number };
  state: CardState;
  power: number;
  cost: number;
  givenDonCount: number;
  metadata: CardMetadata; // Contains imageUrl
}

interface CardMetadata {
  isAltArt: boolean;
  isPromo: boolean;
  isLeader: boolean;
  rarity: string;
  colors: string[];
  category: CardCategory;
  name: string;
  imageUrl: string; // ✓ Already present
}
```

### TextureCacheEntry (New)

```typescript
interface TextureCacheEntry {
  texture: THREE.Texture;
  lastUsed: number;
  refCount: number;
}
```

## Error Handling

### Error Scenarios

1. **Missing imageUrl**
   - Fallback: Generate placeholder immediately
   - Log: Warning level

2. **External URL CORS error**
   - Fallback: Route through image proxy
   - Log: Info level

3. **Image proxy failure**
   - Fallback: Generate placeholder
   - Log: Error level with URL

4. **Network timeout**
   - Fallback: Generate placeholder after 5s timeout
   - Log: Warning level

5. **Invalid image format**
   - Fallback: Generate placeholder
   - Log: Error level

### Error Logging Strategy

```typescript
// Structured logging for debugging
console.warn('Card image fallback:', {
  cardId: card.id,
  cardName: card.metadata.name,
  imageUrl: card.metadata.imageUrl,
  reason: 'CORS_ERROR' | 'TIMEOUT' | 'INVALID_FORMAT' | 'MISSING_URL',
  timestamp: Date.now(),
});
```

## Testing Strategy

### Unit Tests

1. **CardImageLoader**
   - Cache hit/miss scenarios
   - LRU eviction
   - Reference counting
   - Fallback generation

2. **PlaceholderGenerator**
   - Different card categories
   - Various power/cost combinations
   - Error state rendering

3. **Image Proxy API**
   - Valid external URLs
   - Invalid URLs
   - Network errors
   - Cache headers

### Integration Tests

1. **CardMesh with real images**
   - Load from local path
   - Load from external URL via proxy
   - Fallback to placeholder

2. **Multiple cards with same image**
   - Verify single load
   - Verify cache reuse

3. **Component unmount**
   - Verify texture cleanup
   - Verify no memory leaks

### Manual Testing

1. Load game with cards that have:
   - Valid local images
   - Valid external images
   - Invalid/missing images
   - Mix of all three

2. Verify visual states:
   - Loading indicators
   - Smooth transitions
   - Placeholder quality

3. Performance testing:
   - Load time with 50+ cards
   - Memory usage over time
   - Cache effectiveness

## Performance Considerations

### Texture Memory Management

- **Cache Size**: Limit to 100 textures (~50MB assuming 512KB per texture)
- **Disposal**: Properly dispose Three.js textures when evicted
- **Reference Counting**: Prevent disposal of in-use textures

### Loading Optimization

- **Parallel Loading**: Load multiple textures simultaneously
- **Priority Queue**: Load visible cards first (future enhancement)
- **Progressive Loading**: Show low-res placeholder while loading high-res image (future enhancement)

### Network Optimization

- **Image Proxy Caching**: 24-hour cache on proxy responses
- **Browser Caching**: Leverage browser cache for local images
- **Lazy Loading**: Only load images for visible cards (future enhancement)

## Implementation Notes

### Phase 1: Core Implementation
- CardImageLoader utility
- CardMesh updates to use imageUrl
- PlaceholderGenerator extraction
- Basic error handling

### Phase 2: Image Proxy
- API route implementation
- CORS handling
- Cache headers

### Phase 3: Optimization
- Texture caching
- LRU eviction
- Reference counting

### Phase 4: Polish
- Loading indicators
- Smooth transitions
- Enhanced error states

## Migration Strategy

### Backward Compatibility

- Existing placeholder generation remains as fallback
- No breaking changes to RenderingInterface
- Gradual rollout possible (feature flag)

### Database Considerations

- Verify all cards have imageUrl populated
- Add migration script if needed
- Document imageUrl format expectations

## Future Enhancements

1. **Progressive Image Loading**
   - Load low-res thumbnail first
   - Stream high-res image in background

2. **Image Preloading**
   - Preload deck images on game start
   - Preload opponent's visible cards

3. **Texture Compression**
   - Use compressed texture formats (DXT, ETC)
   - Reduce memory footprint

4. **CDN Integration**
   - Host card images on CDN
   - Faster global delivery

5. **Offline Support**
   - Cache images in IndexedDB
   - Service worker for offline play
