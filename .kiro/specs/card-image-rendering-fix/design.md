# Design Document

## Overview

This design addresses the card image rendering failure by implementing comprehensive diagnostic logging, verifying the texture loading and application pipeline, and fixing any issues discovered. The approach is diagnostic-first: we'll add detailed logging to identify the root cause, then implement targeted fixes based on the findings.

## Architecture

### Diagnostic Flow

```
Database (imageUrl)
  ↓ [Log: DB query result]
CardDefinition
  ↓ [Log: Definition creation]
CardInstance
  ↓ [Log: Instance creation]
RenderingInterface.extractCardMetadata()
  ↓ [Log: Metadata extraction]
CardVisualState.metadata.imageUrl
  ↓ [Log: Visual state creation]
CardMesh useEffect
  ↓ [Log: Load request]
CardImageLoader.loadTexture()
  ↓ [Log: URL routing decision]
Image Proxy (if external) OR Direct Load (if local)
  ↓ [Log: Load result]
THREE.Texture
  ↓ [Log: Texture application]
Material.map = texture
  ↓ [Log: Render]
Visible Card Image
```

### Key Investigation Areas

1. **Data Flow**: Verify imageUrl propagates from database to CardMesh
2. **Texture Loading**: Verify CardImageLoader successfully loads textures
3. **Texture Application**: Verify textures are applied to materials
4. **Material Configuration**: Verify materials are configured to display textures
5. **React State**: Verify React state updates trigger re-renders

## Components and Interfaces

### 1. Enhanced Logging in CardMesh

**Location:** `components/game/CardMesh.tsx`

**Current Issue:**
The useEffect that loads textures logs success/failure, but doesn't log:
- The initial imageUrl value
- Whether the texture object is valid
- Whether the texture is being applied to the material
- The material configuration

**Enhanced Logging:**
```typescript
useEffect(() => {
  const loader = CardImageLoader.getInstance();
  const imageUrl = cardState.metadata.imageUrl || '';
  
  // Log 1: Initial load request
  console.log('🖼️ CardMesh: Loading texture', {
    cardId: cardState.id,
    cardName: cardState.metadata.name,
    imageUrl: imageUrl || 'EMPTY',
    zone: cardState.position.zone,
    showFaceUp,
  });
  
  // Load texture with fallback data
  loader.loadTexture({
    imageUrl,
    fallbackData: {
      name: cardState.metadata.name,
      category: String(cardState.metadata.category),
      power: cardState.power,
      cost: cardState.cost,
    },
  }).then(texture => {
    // Log 2: Load success
    console.log('✅ CardMesh: Texture loaded', {
      cardId: cardState.id,
      cardName: cardState.metadata.name,
      imageUrl,
      textureValid: texture !== null,
      textureUuid: texture?.uuid,
      textureImage: texture?.image ? 'present' : 'missing',
    });
    
    setCardTexture(texture);
    setIsLoading(false);
  }).catch(error => {
    // Log 3: Load error
    console.error('❌ CardMesh: Texture load failed', {
      cardId: cardState.id,
      cardName: cardState.metadata.name,
      imageUrl,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    });
    
    setLoadError(true);
    setIsLoading(false);
  });
  
  // Cleanup
  return () => {
    if (imageUrl) {
      loader.releaseTexture(imageUrl);
    }
  };
}, [cardState.id, cardState.metadata.imageUrl, /* ... */]);

// Log 4: Material application
useEffect(() => {
  if (cardTexture) {
    console.log('🎨 CardMesh: Applying texture to material', {
      cardId: cardState.id,
      cardName: cardState.metadata.name,
      textureUuid: cardTexture.uuid,
      showFaceUp,
    });
  }
}, [cardTexture, showFaceUp]);
```

### 2. Enhanced Logging in CardImageLoader

**Location:** `lib/game-engine/rendering/CardImageLoader.ts`

**Current Issue:**
The loader logs cache hits/misses and errors, but doesn't log:
- URL routing decisions (external vs local)
- Proxy URL transformation
- Texture object validation

**Enhanced Logging:**
```typescript
async loadTexture(options: LoadImageOptions): Promise<THREE.Texture> {
  const { imageUrl, fallbackData } = options;
  
  // Log 1: Load request received
  console.log('📥 CardImageLoader: Load request', {
    imageUrl: imageUrl || 'EMPTY',
    cardName: fallbackData.name,
    isExternal: this.isExternalUrl(imageUrl),
  });
  
  // Check if imageUrl is missing
  if (!imageUrl || imageUrl.trim() === '') {
    console.warn('⚠️ CardImageLoader: Missing URL, using placeholder', {
      cardName: fallbackData.name,
    });
    return this.generatePlaceholder(fallbackData, false);
  }
  
  // Check cache
  const cachedTexture = this.getCachedTexture(imageUrl);
  if (cachedTexture) {
    console.log('💾 CardImageLoader: Cache hit', {
      imageUrl,
      cardName: fallbackData.name,
    });
    return cachedTexture;
  }
  
  // Determine load URL
  const loadUrl = this.getLoadUrl(imageUrl);
  console.log('🔗 CardImageLoader: URL routing', {
    originalUrl: imageUrl,
    loadUrl,
    isProxied: loadUrl !== imageUrl,
  });
  
  // Load texture
  try {
    const texture = await this.loadTextureFromUrl(loadUrl);
    
    console.log('✅ CardImageLoader: Texture loaded successfully', {
      imageUrl,
      textureUuid: texture.uuid,
      textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : 'unknown',
    });
    
    // Configure and cache
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    
    this.addToCache(imageUrl, texture);
    return texture;
  } catch (error) {
    console.error('❌ CardImageLoader: Load failed', {
      imageUrl,
      loadUrl,
      error: error instanceof Error ? error.message : 'UNKNOWN',
    });
    
    return this.generatePlaceholder(fallbackData, true);
  }
}
```

### 3. Material Configuration Fix

**Location:** `components/game/CardMesh.tsx`

**Potential Issue:**
The material might not be correctly configured to display the texture. The current implementation uses:

```typescript
<meshStandardMaterial
  map={showFaceUp && cardTexture ? cardTexture : null}
  color={showFaceUp ? (cardTexture ? '#ffffff' : '#4a4a6a') : ...}
  ...
/>
```

**Potential Problems:**
1. The `map` prop might not trigger a re-render when `cardTexture` changes
2. The `color` prop might be interfering with texture display
3. The material might need `needsUpdate` flag

**Proposed Fix:**
```typescript
// Create material ref to force updates
const materialRef = useRef<THREE.MeshStandardMaterial>(null);

// Update material when texture changes
useEffect(() => {
  if (materialRef.current && cardTexture) {
    materialRef.current.map = cardTexture;
    materialRef.current.needsUpdate = true;
    
    console.log('🎨 Material updated with texture', {
      cardId: cardState.id,
      textureUuid: cardTexture.uuid,
    });
  }
}, [cardTexture, cardState.id]);

// In JSX
<meshStandardMaterial
  ref={materialRef}
  map={showFaceUp && cardTexture ? cardTexture : null}
  color={showFaceUp && cardTexture ? '#ffffff' : (showFaceUp ? '#4a4a6a' : sleeveColor)}
  roughness={0.3}
  metalness={0.1}
  side={THREE.DoubleSide}
  needsUpdate={true}
/>
```

### 4. Image Proxy Logging

**Location:** `app/api/image-proxy/route.ts`

**Current Issue:**
The proxy logs errors but doesn't log successful requests, making it hard to verify the proxy is being used.

**Enhanced Logging:**
```typescript
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  console.log('🌐 Image Proxy: Request received', {
    url: url || 'MISSING',
    timestamp: new Date().toISOString(),
  });
  
  // ... validation ...
  
  try {
    const response = await fetch(url, { /* ... */ });
    
    console.log('✅ Image Proxy: Fetch successful', {
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
    });
    
    // ... return image ...
  } catch (error) {
    console.error('❌ Image Proxy: Fetch failed', {
      url,
      error: error instanceof Error ? error.message : 'UNKNOWN',
    });
    // ... return error ...
  }
}
```

## Data Models

No changes to data models needed - the existing interfaces are correct.

## Error Handling

### Error Scenarios and Logging

1. **Missing imageUrl**
   - Log: "⚠️ CardImageLoader: Missing URL, using placeholder"
   - Action: Generate placeholder immediately

2. **External URL CORS error**
   - Log: "⚠️ CardImageLoader: CORS error, retrying through proxy"
   - Action: Retry with proxy URL

3. **Image proxy failure**
   - Log: "❌ Image Proxy: Fetch failed"
   - Action: Return 500 error, CardImageLoader falls back to placeholder

4. **Texture application failure**
   - Log: "❌ CardMesh: Texture not applied to material"
   - Action: Investigate material configuration

5. **React state not updating**
   - Log: "⚠️ CardMesh: Texture loaded but state not updated"
   - Action: Check useEffect dependencies

## Testing Strategy

### Diagnostic Phase

1. **Add all logging**
   - Implement enhanced logging in all components
   - Deploy and test in browser
   - Review console output

2. **Identify root cause**
   - Check if imageUrl is present in CardMesh
   - Check if CardImageLoader is being called
   - Check if textures are being loaded
   - Check if textures are being applied to materials
   - Check if materials are rendering

3. **Implement targeted fix**
   - Based on diagnostic findings, implement specific fix
   - Could be:
     - Material configuration issue
     - React state update issue
     - Texture loading issue
     - Image proxy issue

### Verification Phase

1. **Visual verification**
   - Load game and verify cards show images
   - Check that external URLs work (proxied)
   - Check that local URLs work (direct)
   - Check that missing URLs show placeholders

2. **Console verification**
   - Verify no errors in console
   - Verify successful load logs
   - Verify cache hits for duplicate cards

3. **Performance verification**
   - Verify images load within expected timeframes
   - Verify cache is working (no duplicate loads)
   - Verify memory usage is reasonable

## Implementation Notes

### Phase 1: Diagnostic Logging
- Add comprehensive logging to CardMesh
- Add comprehensive logging to CardImageLoader
- Add logging to Image Proxy
- Test and review console output

### Phase 2: Root Cause Identification
- Analyze console logs
- Identify where the pipeline is failing
- Document the specific issue

### Phase 3: Targeted Fix
- Implement fix based on root cause
- Could be one of:
  - Material ref and needsUpdate fix
  - React state dependency fix
  - Texture loading fix
  - Image proxy fix

### Phase 4: Verification
- Visual testing
- Console log review
- Performance testing

## Likely Root Causes (Hypotheses)

Based on the symptoms (blank colored rectangles), the most likely issues are:

1. **Material not updating when texture loads** (Most Likely)
   - React Three Fiber might not detect texture changes
   - Solution: Use material ref and manually set needsUpdate

2. **Texture not being applied due to conditional logic**
   - The `showFaceUp && cardTexture` condition might be failing
   - Solution: Log showFaceUp value and verify logic

3. **Texture loading but image data missing**
   - Texture object exists but image property is null
   - Solution: Verify texture.image is populated

4. **Color prop interfering with texture**
   - Setting color might override texture display
   - Solution: Only set color when no texture

5. **React state not triggering re-render**
   - setCardTexture might not cause material to update
   - Solution: Add key prop or force update

## Future Enhancements

Once the immediate issue is fixed:

1. **Loading indicators**
   - Show spinner while texture loads
   - Smooth fade-in when texture appears

2. **Error recovery**
   - Retry failed loads after delay
   - Provide manual refresh option

3. **Performance monitoring**
   - Track load times
   - Alert on slow loads
