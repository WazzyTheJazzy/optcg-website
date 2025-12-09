/**
 * Script to prepare DON card assets for the game
 * - Copies and documents DON card front image
 * - Creates a reference for card back image
 * - Documents asset locations in /public/cards/ directory
 * 
 * Note: The existing Don.png (336x470) will be used as-is.
 * For production, higher resolution images (1024x1024) should be sourced.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'cards');
const SOURCE_DON = path.join(OUTPUT_DIR, 'Don.png');
const OUTPUT_DON_FRONT = path.join(OUTPUT_DIR, 'don-card-front.png');
const OUTPUT_CARD_BACK = path.join(OUTPUT_DIR, 'card-back.png');

/**
 * Copy DON card front image
 */
function prepareDonCardFront() {
  console.log('Preparing DON card front image...');
  
  try {
    // Copy the existing Don.png as don-card-front.png
    fs.copyFileSync(SOURCE_DON, OUTPUT_DON_FRONT);
    
    const stats = fs.statSync(OUTPUT_DON_FRONT);
    console.log(`✓ DON card front prepared: ${OUTPUT_DON_FRONT}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Note: Current resolution is 336x470. For optimal quality, source a 1024x1024 image.`);
  } catch (error) {
    console.error('Error preparing DON card front:', error);
    throw error;
  }
}

/**
 * Create a simple card back placeholder
 * This creates a basic SVG-based card back that can be rendered at any resolution
 */
function createCardBackPlaceholder() {
  console.log('Creating card back placeholder...');
  
  try {
    // Create an SVG card back that can scale to any size
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a3e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2a2a5e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a3e;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bgGradient)"/>
  
  <!-- Outer border -->
  <rect x="40" y="40" width="944" height="944" fill="none" stroke="#d4af37" stroke-width="20"/>
  
  <!-- Inner border -->
  <rect x="70" y="70" width="884" height="884" fill="none" stroke="#8b7355" stroke-width="10"/>
  
  <!-- Center circle -->
  <circle cx="512" cy="512" r="200" fill="#3a3a6e" stroke="#d4af37" stroke-width="15"/>
  
  <!-- Text: ONE PIECE -->
  <text x="512" y="200" font-family="Arial, sans-serif" font-size="80" font-weight="bold" 
        fill="#d4af37" text-anchor="middle" dominant-baseline="middle">ONE PIECE</text>
  
  <!-- Text: CARD GAME -->
  <text x="512" y="824" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
        fill="#d4af37" text-anchor="middle" dominant-baseline="middle">CARD GAME</text>
  
  <!-- Center logo: OP -->
  <text x="512" y="512" font-family="Arial, sans-serif" font-size="180" font-weight="bold" 
        fill="#d4af37" text-anchor="middle" dominant-baseline="middle">OP</text>
  
  <!-- Corner decorations -->
  <!-- Top-left -->
  <path d="M 100 150 L 100 100 L 150 100" fill="none" stroke="#d4af37" stroke-width="8"/>
  
  <!-- Top-right -->
  <path d="M 874 100 L 924 100 L 924 150" fill="none" stroke="#d4af37" stroke-width="8"/>
  
  <!-- Bottom-left -->
  <path d="M 100 874 L 100 924 L 150 924" fill="none" stroke="#d4af37" stroke-width="8"/>
  
  <!-- Bottom-right -->
  <path d="M 874 924 L 924 924 L 924 874" fill="none" stroke="#d4af37" stroke-width="8"/>
</svg>`;

    // Save as SVG
    const svgPath = OUTPUT_CARD_BACK.replace('.png', '.svg');
    fs.writeFileSync(svgPath, svgContent);
    
    console.log(`✓ Card back SVG created: ${svgPath}`);
    console.log(`  This SVG can be converted to PNG at any resolution using an image converter.`);
    
    // Create a simple PNG placeholder note
    const noteContent = `Card back image placeholder.

The card-back.svg file contains a scalable vector version of the card back.
For production use, this should be converted to a PNG at 1024x1024 resolution.

You can convert it using:
- Online tools like CloudConvert or Convertio
- Command line: inkscape card-back.svg --export-png=card-back.png --export-width=1024 --export-height=1024
- Or use any image editing software that supports SVG

For now, the game will use the sleeve color as a fallback for card backs.`;
    
    fs.writeFileSync(OUTPUT_CARD_BACK.replace('.png', '.txt'), noteContent);
    console.log(`✓ Card back note created: ${OUTPUT_CARD_BACK.replace('.png', '.txt')}`);
    
  } catch (error) {
    console.error('Error creating card back placeholder:', error);
    throw error;
  }
}

/**
 * Create asset documentation
 */
function createAssetDocumentation() {
  console.log('Creating asset documentation...');
  
  const docContent = `# DON Card Assets

## Overview
This directory contains the DON card assets used in the One Piece TCG game engine.

## Files

### DON Card Front
- **File**: \`don-card-front.png\`
- **Current Resolution**: 336x470 pixels
- **Target Resolution**: 1024x1024 pixels (for optimal quality)
- **Usage**: Displayed when DON cards are in the cost area or given to characters
- **Source**: Copied from Don.png

### Card Back
- **File**: \`card-back.svg\` (vector) / \`card-back.png\` (raster, to be created)
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

## Image Optimization

When higher resolution images are available, optimize them using:
- **PNG**: Use tools like TinyPNG, ImageOptim, or pngquant
- **Target**: < 200KB per image while maintaining visual quality
- **Format**: PNG with transparency support

## Usage in Code

The DON card textures are referenced in:
- \`components/game/DonMesh.tsx\` - DON card rendering component
- \`lib/game-engine/rendering/RenderingInterface.ts\` - Rendering interface

Texture paths:
\`\`\`typescript
const DON_CARD_TEXTURES = {
  front: '/cards/don-card-front.png',
  back: '/cards/card-back.png',
};
\`\`\`

## Alternative DON Cards

The \`don/\` subdirectory contains 57 alternative DON card designs (Don-00.png through Don-56.png).
These can be used for variety or special editions.

---
Generated: ${new Date().toISOString()}
`;

  const docPath = path.join(OUTPUT_DIR, 'DON_ASSETS_README.md');
  fs.writeFileSync(docPath, docContent);
  
  console.log(`✓ Asset documentation created: ${docPath}`);
}

/**
 * Main execution
 */
function main() {
  console.log('=== DON Card Asset Preparation ===\n');
  
  // Check if source DON image exists
  if (!fs.existsSync(SOURCE_DON)) {
    console.error(`Error: Source DON image not found at ${SOURCE_DON}`);
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  try {
    prepareDonCardFront();
    createCardBackPlaceholder();
    createAssetDocumentation();
    
    console.log('\n=== Asset Preparation Complete ===');
    console.log('\nFiles created:');
    console.log(`  ✓ ${OUTPUT_DON_FRONT}`);
    console.log(`  ✓ ${OUTPUT_CARD_BACK.replace('.png', '.svg')}`);
    console.log(`  ✓ ${OUTPUT_CARD_BACK.replace('.png', '.txt')}`);
    console.log(`  ✓ ${path.join(OUTPUT_DIR, 'DON_ASSETS_README.md')}`);
    console.log('\nNote: For production, upgrade to 1024x1024 resolution images.');
    console.log('See DON_ASSETS_README.md for details.');
  } catch (error) {
    console.error('\nAsset preparation failed:', error);
    process.exit(1);
  }
}

main();
