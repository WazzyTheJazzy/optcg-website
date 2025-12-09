# Card Sleeves Feature

## Overview
Custom card sleeves allow users to personalize the back of their 3D cards with various designs, patterns, and colors.

## Features

### 16 Unique Sleeve Designs

#### Basic Solid Colors (6)
- **Classic Blue** - Traditional TCG blue sleeve
- **Crimson Red** - Bold red sleeve
- **Emerald Green** - Vibrant green sleeve
- **Royal Purple** - Rich purple sleeve
- **Midnight Black** - Sleek black sleeve
- **Pearl White** - Clean white sleeve

#### Premium Gradient Sleeves (3)
- **Sunset Gradient** - Orange → Red → Purple
- **Ocean Gradient** - Cyan → Blue → Green
- **Galaxy Gradient** - Purple → Blue → Black (high metalness)

#### Premium Patterned Sleeves (4)
- **Gold Stripes** - Metallic gold stripes on black
- **Silver Dots** - Silver polka dots on dark blue
- **Neon Waves** - Animated wave pattern with neon colors
- **Starry Night** - Stars on dark background

#### One Piece Themed Sleeves (3)
- **Straw Hat** - Yellow and red inspired by Luffy's hat
- **Marine Blue** - Navy stripes for Marine fans
- **Pirate Flag** - Black and white skull theme

### Sleeve Properties

Each sleeve has customizable properties:
- **Color**: Base color (hex value)
- **Pattern**: solid, gradient, stripes, dots, waves, or stars
- **Metalness**: 0.1 - 0.7 (how metallic/shiny)
- **Roughness**: 0.2 - 0.5 (how smooth/matte)
- **Premium**: Special badge for premium designs

### Sleeve Selector UI

- Grid layout showing all available sleeves
- Visual preview of each sleeve design
- Premium badge (crown icon) for special sleeves
- Selected sleeve highlighted with red ring
- Hover effects for better UX
- Sleeve name displayed on hover/bottom

### Technical Implementation

#### Procedural Texture Generation
Sleeves are generated using HTML5 Canvas:
- 512x716 resolution (card aspect ratio)
- Real-time pattern rendering
- Converted to Three.js CanvasTexture
- Optimized for performance

#### Pattern Types

1. **Solid**: Single color fill
2. **Gradient**: Linear gradient with multiple color stops
3. **Stripes**: Repeating vertical stripes
4. **Dots**: Polka dot pattern with spacing
5. **Waves**: Sinusoidal wave overlay
6. **Stars**: Random 5-point stars

#### Material Properties
- Uses MeshStandardMaterial for realistic lighting
- Adjustable metalness for shine effects
- Adjustable roughness for surface finish
- Proper texture mapping on card back face

## Usage

### In 3D View Mode

1. Click "3D View" button on cards page
2. Select a card to view in 3D
3. Sleeve selector appears below the 3D viewer
4. Click any sleeve to apply it to the card back
5. Rotate the card to see the sleeve design

### Customization

Users can:
- Switch between sleeves instantly
- See real-time preview in 3D
- Mix and match with any card
- Premium sleeves add extra flair

## Future Enhancements

- [ ] User-uploaded custom sleeve images
- [ ] Animated sleeves (shimmer, holographic effects)
- [ ] Sleeve collections/sets
- [ ] Save favorite sleeve per card
- [ ] Unlock system for premium sleeves
- [ ] Seasonal/event-themed sleeves
- [ ] Texture variations (matte, glossy, foil)
- [ ] Pattern customization (color picker)
- [ ] Sleeve marketplace
- [ ] Achievement-based sleeve unlocks

## Files

- `lib/card-sleeves.ts` - Sleeve definitions and data
- `components/SleeveTexture.tsx` - Procedural texture generation
- `components/SleeveSelector.tsx` - UI for selecting sleeves
- `components/Card3D.tsx` - 3D card with sleeve support
- `app/cards/page.tsx` - Integration in cards page

## Performance

- Textures generated once and cached
- Canvas rendering is efficient
- No external image loading required
- Minimal impact on 3D performance
- Smooth transitions between sleeves
