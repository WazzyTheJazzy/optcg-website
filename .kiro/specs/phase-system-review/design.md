# Design Document

## Overview

This design document outlines the approach for reviewing and improving the One Piece TCG game engine's phase system, along with visual enhancements to DON cards and the game board. The work is divided into three main areas:

1. **Phase System Review & Testing**: Systematically review each phase implementation, add missing tests (especially for RefreshPhase), and verify correct behavior
2. **DON Card Visual Upgrade**: Replace token-like DON representation with proper card images
3. **Tabletop Visual Environment**: Create an immersive 3D tabletop environment with realistic table surface and lighting

## Architecture

### Phase System Components

The phase system consists of several interconnected components:

```
PhaseManager (orchestrator)
    ├── RefreshPhase.ts
    ├── DrawPhase.ts
    ├── DonPhase.ts
    ├── MainPhase.ts
    └── EndPhase.ts
```

Each phase module exports a `run[Phase]Phase` function that:
- Takes `GameStateManager`, `RulesContext`, and `EventEmitter` as parameters
- Returns an updated `GameStateManager`
- Emits appropriate events for state changes

### Visual System Components

The visual system uses Three.js for 3D rendering:

```
GameScene.tsx (root component)
    ├── GameMat.tsx (table surface)
    ├── ZoneRenderer.tsx (zone layouts)
    │   └── CardMesh.tsx (individual cards)
    │       └── DonMesh.tsx (DON cards - to be updated)
    └── Environment (lighting, background)
```

## Components and Interfaces

### 1. Phase Implementation Review

#### RefreshPhase Enhancement

**Current State:**
- Implementation exists but lacks comprehensive tests
- Handles modifier expiration, DON return, and card activation

**Design Changes:**
- Create `RefreshPhase.test.ts` with comprehensive test coverage
- Verify modifier expiration logic for "until start of your next turn"
- Verify DON return logic (from characters/leader to cost area as rested)
- Verify card activation logic (all rested cards to active)
- Verify only active player's cards are affected

**Test Structure:**
```typescript
describe('RefreshPhase', () => {
  describe('Modifier Expiration', () => {
    // Test expiring "until start of your next turn" modifiers
    // Test NOT expiring other duration modifiers
    // Test only active player's modifiers expire
  });
  
  describe('DON Return', () => {
    // Test DON moved from characters to cost area
    // Test DON moved from leader to cost area
    // Test DON state set to rested
    // Test events emitted
  });
  
  describe('Card Activation', () => {
    // Test characters activated
    // Test leader activated
    // Test stage activated
    // Test DON in cost area activated
    // Test only active player's cards activated
  });
});
```

#### DrawPhase, DonPhase, EndPhase Review

**Current State:**
- All have existing test files
- Need to verify test coverage is complete

**Design Changes:**
- Review existing tests for completeness
- Add any missing edge case tests
- Verify event emission is tested
- Verify error handling is tested

#### MainPhase Review

**Current State:**
- Has tests but complex due to action loop
- May need additional integration tests

**Design Changes:**
- Review action loop tests
- Verify START_OF_MAIN trigger tests
- Verify action validation tests
- Add tests for action failure handling

#### PhaseManager Integration

**Current State:**
- Has tests for basic phase sequencing

**Design Changes:**
- Add tests for phase transition events
- Add tests for game over detection between phases
- Add tests for turn increment and player switching
- Add integration tests for full turn execution

### 2. DON Card Visual Representation

#### Current Implementation Analysis

**Current State:**
- DON cards use `DonMesh.tsx` component
- Rendered as simple geometric shapes (likely cylinders or spheres)
- No card image textures applied

**Design Changes:**

##### DonMesh Component Update

```typescript
// components/game/DonMesh.tsx
interface DonMeshProps {
  don: DonInstance;
  position: [number, number, number];
  rotation: number; // 0 for active, 90 for rested
  scale: number; // Smaller when given to characters
  onClick?: () => void;
}

// Use CardMesh as base but with DON-specific texture
// DON cards should use same geometry as regular cards
```

**Implementation Approach:**
1. Reuse existing `CardMesh` component structure
2. Add DON card image texture loading
3. Handle DON card back texture for don deck
4. Scale DON cards appropriately when given to characters (smaller)
5. Position given DON cards underneath character cards

##### Texture Management

```typescript
// lib/game-engine/rendering/TextureManager.ts (new or extend existing)
interface TextureManager {
  loadDonCardTexture(): Promise<Texture>;
  loadDonCardBackTexture(): Promise<Texture>;
  loadCardTexture(cardId: string): Promise<Texture>;
}
```

**DON Card Image Sources:**
- Front: Official DON card image (need to source or create)
- Back: Standard One Piece TCG card back

##### Zone-Specific Rendering

**Don Deck:**
- Render as stacked cards with back texture
- Show count indicator

**Cost Area:**
- Render as grid of DON cards with front texture
- Show active (0°) or rested (90°) rotation
- Highlight available DON for giving

**Given DON (under characters/leader):**
- Render as small cards underneath the character
- Offset slightly to show count
- Use front texture at reduced scale (0.3x)

### 3. Tabletop Visual Environment

#### GameMat Component Enhancement

**Current State:**
- Likely a simple plane or basic geometry
- Minimal visual detail

**Design Changes:**

##### Table Surface

```typescript
// components/game/GameMat.tsx
interface GameMatProps {
  width: number;
  height: number;
  texture?: 'wood' | 'felt' | 'playmat';
}

// Create realistic table surface with:
// - Wood grain texture or felt texture
// - Normal maps for surface detail
// - Subtle reflections
// - Zone boundary lines/markings
```

**Visual Elements:**
1. **Base Surface**: Wood table or felt playmat texture
2. **Zone Markings**: Subtle lines or areas indicating card zones
3. **Player Areas**: Clear visual separation between player 1 and player 2 sides
4. **Center Line**: Visual divider between players

##### Lighting System

**Current State:**
- Basic Three.js lighting

**Design Changes:**

```typescript
// components/game/GameScene.tsx - Lighting setup
const lighting = {
  ambient: new AmbientLight(0xffffff, 0.6), // Soft overall light
  directional: new DirectionalLight(0xffffff, 0.8), // Main light from above
  spotlights: [
    // Focused lights on play areas
    new SpotLight(0xffffff, 0.5, 100, Math.PI / 6),
  ],
};
```

**Lighting Design:**
1. **Ambient Light**: Soft overall illumination (0.6 intensity)
2. **Directional Light**: Main light from above-front (0.8 intensity)
3. **Spot Lights**: Optional focused lights on each player's area
4. **Shadows**: Enable shadow casting for cards on table

##### Background Environment

**Design Options:**

**Option 1: Simple Background**
- Solid color or gradient
- Minimal distraction
- Best performance

**Option 2: Room Environment**
- Walls and ceiling
- Windows with ambient light
- More immersive but higher performance cost

**Recommended: Option 1 with enhancements**
- Dark gradient background (darker at edges, lighter at center)
- Subtle vignette effect
- Optional: Blurred room texture as skybox

```typescript
// Background setup
const scene = new Scene();
scene.background = new Color(0x1a1a2e); // Dark blue-grey
// OR
scene.background = new CubeTextureLoader().load([
  'room_px.jpg', 'room_nx.jpg',
  'room_py.jpg', 'room_ny.jpg',
  'room_pz.jpg', 'room_nz.jpg',
]);
```

##### Card Shadows

**Implementation:**
```typescript
// Enable shadows in renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

// Configure directional light for shadows
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;

// Cards cast and receive shadows
cardMesh.castShadow = true;
cardMesh.receiveShadow = true;
tableMesh.receiveShadow = true;
```

## Data Models

### DON Card Texture Data

```typescript
interface DonCardTextures {
  front: string; // URL or path to DON card front image
  back: string;  // URL or path to card back image
}

// Add to card-sleeves.ts or similar
export const DON_CARD_TEXTURES: DonCardTextures = {
  front: '/cards/don-card-front.png',
  back: '/cards/card-back.png',
};
```

### Table Configuration

```typescript
interface TableConfig {
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  surface: {
    type: 'wood' | 'felt' | 'playmat';
    texture: string;
    normalMap?: string;
    roughness: number;
    metalness: number;
  };
  zones: {
    player1: ZoneLayout;
    player2: ZoneLayout;
  };
}

interface ZoneLayout {
  deck: { x: number; y: number; z: number };
  hand: { x: number; y: number; z: number };
  trash: { x: number; y: number; z: number };
  life: { x: number; y: number; z: number };
  donDeck: { x: number; y: number; z: number };
  costArea: { x: number; y: number; z: number };
  leaderArea: { x: number; y: number; z: number };
  characterArea: { x: number; y: number; z: number };
  stageArea: { x: number; y: number; z: number };
}
```

## Error Handling

### Phase System Error Handling

**Existing Error Handling:**
- GameEngineError classes already exist
- Validation before state changes
- Event emission for errors

**Additional Error Handling:**
- Add try-catch blocks in test setup/teardown
- Verify error events are emitted correctly
- Test error recovery scenarios

### Visual System Error Handling

**Texture Loading Errors:**
```typescript
async function loadDonTexture(): Promise<Texture> {
  try {
    const texture = await textureLoader.loadAsync(DON_CARD_TEXTURES.front);
    return texture;
  } catch (error) {
    console.error('Failed to load DON texture:', error);
    // Fallback to solid color or default texture
    return createFallbackTexture();
  }
}
```

**Rendering Errors:**
- Graceful degradation if shadows fail
- Fallback to simpler materials if textures fail
- Error boundaries in React components

## Testing Strategy

### Phase System Testing

**Unit Tests:**
- Each phase function tested in isolation
- Mock dependencies (EventEmitter, RulesContext)
- Test all acceptance criteria from requirements

**Integration Tests:**
- Full turn execution through PhaseManager
- Cross-phase state consistency
- Event emission sequence verification

**Test Coverage Goals:**
- 100% coverage for RefreshPhase (currently 0%)
- Maintain/improve coverage for other phases
- All edge cases covered

### Visual System Testing

**Component Tests:**
- DonMesh renders without errors
- GameMat renders with different textures
- Lighting setup doesn't cause performance issues

**Visual Regression Tests:**
- Screenshot comparison for major visual changes
- Verify DON cards look correct in all zones
- Verify table surface renders correctly

**Performance Tests:**
- Frame rate with shadows enabled
- Texture loading time
- Memory usage with multiple DON cards

## Implementation Phases

### Phase 1: RefreshPhase Testing (Priority: High)
1. Create RefreshPhase.test.ts
2. Implement all test cases
3. Fix any bugs discovered
4. Verify 100% coverage

### Phase 2: Other Phase Reviews (Priority: High)
1. Review DrawPhase tests - add missing cases
2. Review DonPhase tests - add missing cases
3. Review MainPhase tests - add missing cases
4. Review EndPhase tests - add missing cases
5. Review PhaseManager tests - add integration tests

### Phase 3: DON Card Visual Upgrade (Priority: Medium)
1. Source or create DON card images
2. Update DonMesh component to use CardMesh structure
3. Implement texture loading for DON cards
4. Update zone renderers for DON card display
5. Test DON cards in all zones

### Phase 4: Tabletop Environment (Priority: Medium)
1. Create/source table texture assets
2. Update GameMat component with realistic surface
3. Implement enhanced lighting system
4. Add background environment
5. Enable card shadows
6. Performance optimization

### Phase 5: Integration & Polish (Priority: Low)
1. Integration testing of all changes
2. Visual polish and tweaks
3. Performance optimization
4. Documentation updates

## Performance Considerations

### Phase System Performance
- Phase execution should remain fast (<10ms per phase)
- Event emission should not block phase execution
- State updates should be efficient (immutable updates)

### Visual System Performance
- Target: 60 FPS with all visual enhancements
- Shadow map size: 2048x2048 (balance quality/performance)
- Texture resolution: 1024x1024 for DON cards
- Consider texture atlasing for multiple DON cards
- Use instanced rendering if many DON cards visible

### Optimization Strategies
1. **Texture Caching**: Load DON textures once, reuse
2. **Shadow Optimization**: Use PCFSoftShadowMap, limit shadow distance
3. **LOD System**: Reduce detail for distant cards
4. **Frustum Culling**: Don't render off-screen cards
5. **Lazy Loading**: Load table textures after initial render

## Security Considerations

- No security concerns for phase system (client-side only)
- Texture loading: Validate image sources
- Prevent loading arbitrary URLs for textures
- Sanitize any user-provided texture paths

## Accessibility Considerations

### Visual Enhancements
- Ensure sufficient contrast for zone markings
- Provide text labels for zones (not just visual)
- Support high contrast mode (disable fancy textures)
- Ensure DON cards are distinguishable from regular cards

### Phase System
- Emit events for screen readers
- Provide text descriptions of phase transitions
- Ensure keyboard navigation works with visual changes

## Future Enhancements

### Phase System
- Add phase timing metrics for performance monitoring
- Implement phase replay system
- Add phase-specific undo/redo

### Visual System
- Animated phase transitions (cards sliding, etc.)
- Particle effects for special actions
- Customizable table themes
- VR support for immersive play
- Animated DON card placement
- Card hover effects with 3D lift
- Smooth camera transitions between phases
