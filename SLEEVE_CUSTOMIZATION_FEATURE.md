# Card Sleeve Customization Feature

## Overview
Integrated the card sleeve customization system into the game, allowing players to personalize the appearance of their card backs with different colors, patterns, and materials.

## Implementation

### 1. Sleeve Preferences System (`lib/sleeve-preferences.ts`)
Created a utility module to manage sleeve preferences:

```typescript
// Get user's selected sleeve (from localStorage)
export function getSelectedSleeve(): CardSleeve

// Save user's selected sleeve
export function setSelectedSleeve(sleeve: CardSleeve): void

// React hook for managing preferences
export function useSleevePreference()
```

**Features:**
- Persists to localStorage
- Defaults to "Midnight Black"
- Server-safe (handles SSR)
- Error handling for storage issues

### 2. Card Mesh Integration (`components/game/CardMesh.tsx`)
Updated CardMesh to use sleeve for card backs:

```typescript
interface CardMeshProps {
  // ... existing props
  sleeve?: CardSleeve; // New prop
}
```

**Material Updates:**
- Card back color uses sleeve color
- Metalness and roughness from sleeve properties
- Gradient support (future enhancement)
- Pattern support (future enhancement)

```typescript
<meshStandardMaterial
  map={showFaceUp ? cardTexture : null}
  color={showFaceUp ? '#ffffff' : sleeveColor}
  roughness={showFaceUp ? 0.3 : sleeve.roughness}
  metalness={showFaceUp ? 0.1 : sleeve.metalness}
/>
```

### 3. Game Scene Integration (`components/game/GameScene.tsx`)
GameScene loads and passes sleeve to all cards:

```typescript
// Load sleeve on mount
const [selectedSleeve, setSelectedSleeve] = useState<CardSleeve | null>(null);

useEffect(() => {
  setSelectedSleeve(getSelectedSleeve());
  
  // Listen for changes
  window.addEventListener('sleeve-changed', handleSleeveChange);
}, []);
```

**Propagation:**
- Loads sleeve from localStorage
- Listens for sleeve changes
- Passes to all CardZoneRenderer instances
- Updates in real-time

### 4. Game Page UI (`app/game/page.tsx`)
Added sleeve selector button:

```typescript
<button onClick={handleSleeveChange}>
  <div style={{ background: sleeveColor }} />
  <span>{selectedSleeve.name}</span>
</button>
```

**Features:**
- Visual preview of current sleeve
- Click to cycle through sleeves
- Shows sleeve name
- Saves to localStorage
- Triggers re-render

## Available Sleeves

### Basic Solid Colors
- **Classic Blue** - Traditional blue sleeve
- **Crimson Red** - Bold red color
- **Emerald Green** - Rich green
- **Royal Purple** - Deep purple
- **Midnight Black** - Default, sleek black
- **Pearl White** - Elegant white

### Premium Gradients
- **Sunset Gradient** - Orange → Red → Purple
- **Ocean Gradient** - Blue → Navy → Teal
- **Galaxy Gradient** - Purple → Navy → Black

### Pattern Sleeves (Future)
- Stripes
- Dots
- Waves
- Stars

## How It Works

### Data Flow
```
User clicks sleeve button
    ↓
handleSleeveChange() cycles to next sleeve
    ↓
setSelectedSleeve() saves to localStorage
    ↓
'sleeve-changed' event dispatched
    ↓
GameScene receives event
    ↓
GameScene loads new sleeve for Player 1
    ↓
Player 2 uses default sleeve (Crimson Red)
    ↓
Passes appropriate sleeve to each CardZoneRenderer
    ↓
Passes to CardMesh
    ↓
CardMesh updates material
    ↓
Card backs re-render with player-specific colors
```

### Per-Player Sleeves
- **Player 1**: Uses selected sleeve from localStorage (customizable)
- **Player 2**: Uses Crimson Red as default (for visual distinction)
- Each player's cards render with their own sleeve
- Easy to extend for multiplayer with per-user preferences

### Persistence
```
localStorage: 'optcg_sleeve_preference'
Value: sleeve ID (e.g., "midnight-black")
```

### Real-time Updates
- Event-driven architecture
- No page reload needed
- Instant visual feedback
- Persists across sessions

## User Experience

### Customization
1. **Click sleeve button** in top-right
2. **See preview** of current sleeve
3. **Cycle through options** with each click
4. **Changes apply immediately** to all card backs
5. **Preference saved** automatically

### Visual Feedback
- Sleeve preview shows actual color/gradient
- Sleeve name displayed
- Smooth transitions
- Consistent across all cards

## Technical Details

### Performance
- Sleeve loaded once on mount
- Cached in component state
- Only updates on change event
- No impact on frame rate

### Material Properties
Each sleeve defines:
- **Color**: Base color (hex)
- **Pattern**: solid, gradient, stripes, etc.
- **Colors**: Array for gradients
- **Metalness**: 0.0 - 1.0 (shininess)
- **Roughness**: 0.0 - 1.0 (smoothness)
- **Premium**: Special sleeves

### Browser Compatibility
- Uses localStorage (widely supported)
- Fallback to default sleeve
- Error handling for storage issues
- Works in all modern browsers

## Future Enhancements

### Pattern Rendering
Implement actual pattern rendering on card backs:
```typescript
if (sleeve.pattern === 'stripes') {
  // Apply stripe texture
} else if (sleeve.pattern === 'gradient') {
  // Apply gradient shader
}
```

### Unlock System
- Earn sleeves through gameplay
- Premium sleeves for achievements
- Seasonal/event sleeves
- Purchasable sleeve packs

### Multiplayer Sleeve Support
In multiplayer games, each player would have their own sleeve:
```typescript
interface PlayerSleevePreferences {
  userId: string;
  sleeveId: string;
}

// Load from user profile/database
const player1Sleeve = await getUserSleeve(player1Id);
const player2Sleeve = await getUserSleeve(player2Id);
```

### Per-Deck Sleeves
Allow different sleeves for different decks:
```typescript
interface DeckSettings {
  deckId: string;
  sleeveId: string;
}
```

### Animated Sleeves
- Shimmer effects
- Particle effects
- Holographic patterns
- Animated gradients

### Custom Sleeves
- Upload custom images
- Color picker for custom colors
- Pattern designer
- Share with community

## Code Changes

### Files Created
1. **lib/sleeve-preferences.ts** - Preference management

### Files Modified
1. **components/game/CardMesh.tsx**
   - Added `sleeve` prop
   - Updated material to use sleeve properties
   - Added CardSleeve import

2. **components/game/GameScene.tsx**
   - Load sleeve on mount
   - Listen for sleeve changes
   - Pass sleeve to CardZoneRenderer

3. **app/game/page.tsx**
   - Added sleeve selector button
   - Cycle through sleeves
   - Visual preview

## Benefits

### For Players
- ✅ Personalize their game experience
- ✅ Express their style
- ✅ Easy to change anytime
- ✅ Persists across sessions

### For Development
- ✅ Reusable sleeve system
- ✅ Easy to add new sleeves
- ✅ Clean separation of concerns
- ✅ Extensible architecture

### For Monetization (Future)
- Premium sleeve packs
- Seasonal sleeves
- Achievement-based unlocks
- Custom sleeve marketplace

## Testing

### Manual Testing
1. Start a game
2. Click sleeve button in top-right
3. Verify card backs change color
4. Cycle through several sleeves
5. Refresh page - sleeve should persist
6. Check both deck and hand cards

### Expected Behavior
- ✅ Card backs use sleeve color
- ✅ Changes apply immediately
- ✅ Preference persists
- ✅ All cards update together
- ✅ No performance impact

## Conclusion

The card sleeve customization feature adds a personal touch to the game, allowing players to customize their card backs with various colors and materials. The implementation is clean, performant, and easily extensible for future enhancements like patterns, animations, and unlock systems.

The feature integrates seamlessly with the existing game architecture and provides instant visual feedback, making it a delightful addition to the player experience.
