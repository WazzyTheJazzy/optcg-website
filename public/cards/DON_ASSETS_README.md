# DON Card Assets

## Overview
This directory contains the DON card assets used in the One Piece TCG game engine.

## Files

### DON Card Front
- **File**: `don-card-front.png`
- **Current Resolution**: 336x470 pixels
- **Target Resolution**: 1024x1024 pixels (for optimal quality)
- **Usage**: Displayed when DON cards are in the cost area or given to characters
- **Source**: Copied from Don.png

### Card Back
- **File**: `card-back.svg` (vector) / `card-back.png` (raster, to be created)
- **Target Resolution**: 1024x1024 pixels
- **Usage**: Displayed when DON cards are in the don deck (face-down)
- **Design**: One Piece TCG themed card back with gold borders and "OP" logo

## Asset Requirements (from spec)

From requirements 11.1, 11.2, 11.3:
1. DON cards should use official DON card images
2. DON deck should show card backs
3. Cost area should show DON card fronts
4. Given DON should appear as small cards under characters

## Current Status

✓ DON card front image prepared (don-card-front.png)
✓ Card back SVG template created (card-back.svg)
⚠ Card back PNG needs to be generated from SVG (1024x1024)
⚠ DON card front should be upgraded to higher resolution (1024x1024) for production

## Next Steps

1. **For Development**: Current assets are sufficient for testing and development
2. **For Production**: 
   - Source official One Piece TCG DON card image at 1024x1024 resolution
   - Convert card-back.svg to card-back.png at 1024x1024 resolution
   - Optimize both images for web (compress without quality loss)

### Converting SVG to PNG

A browser-based converter tool is available at `svg-to-png-converter.html`:

1. Open `public/cards/svg-to-png-converter.html` in a web browser
2. Click "Load SVG" to load the card-back.svg
3. Click "Convert to PNG" to generate the PNG at 1024x1024
4. Click "Download PNG" to save as card-back.png
5. Place the downloaded file in `/public/cards/` directory

Alternatively, use command-line tools:
- **ImageMagick**: `convert card-back.svg -resize 1024x1024 card-back.png`
- **Inkscape**: `inkscape card-back.svg --export-png=card-back.png --export-width=1024 --export-height=1024`
- **Online**: Use CloudConvert, Convertio, or similar services

## Image Optimization

When higher resolution images are available, optimize them using:
- **PNG**: Use tools like TinyPNG, ImageOptim, or pngquant
- **Target**: < 200KB per image while maintaining visual quality
- **Format**: PNG with transparency support

## Usage in Code

The DON card textures are referenced in:
- `components/game/DonMesh.tsx` - DON card rendering component
- `lib/game-engine/rendering/RenderingInterface.ts` - Rendering interface

Texture paths:
```typescript
const DON_CARD_TEXTURES = {
  front: '/cards/don-card-front.png',
  back: '/cards/card-back.png',
};
```

## Alternative DON Cards

The `don/` subdirectory contains 57 alternative DON card designs (Don-00.png through Don-56.png).
These can be used for variety or special editions.

---
Generated: 2025-11-23T05:17:47.084Z
