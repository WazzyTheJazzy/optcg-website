# Texture Generation Instructions

This directory needs 2048x2048 texture files for the game table surface. There are two methods to generate them:

## Method 1: Browser-Based Generation (Recommended - No Dependencies)

1. Open `texture-generator.html` in any modern web browser
2. The page will automatically generate all 4 textures
3. Click the "Download PNG" button for each texture:
   - wood-table-2048.png
   - felt-playmat-2048.png
   - wood-normal-2048.png
   - felt-normal-2048.png
4. Save the downloaded files to this directory (`public/textures/`)

**Advantages:**
- No additional dependencies required
- Works in any browser
- Visual preview of textures
- Instant generation

## Method 2: Node.js Script (Optional)

If you have Node.js canvas package installed:

```bash
npm install canvas
node scripts/generate-table-textures.js
```

**Note:** The canvas package requires native dependencies and may be difficult to install on some systems. The browser method is recommended for simplicity.

## Required Files

After generation, you should have these files:

- ✓ wood-table-2048.png (2048x2048, ~2-4 MB)
- ✓ felt-playmat-2048.png (2048x2048, ~2-4 MB)
- ✓ wood-normal-2048.png (2048x2048, ~2-4 MB)
- ✓ felt-normal-2048.png (2048x2048, ~2-4 MB)

## Optimization (Optional)

After generating the textures, you can optimize them for web:

```bash
# Using pngquant (if installed)
pngquant --quality=80-95 *.png

# Using ImageMagick (if installed)
magick mogrify -quality 90 *.png
```

## Verification

To verify the textures are correct:

1. Check file sizes (should be 2-4 MB each)
2. Open in image viewer (should be 2048x2048 pixels)
3. Wood texture should show brown grain pattern
4. Felt texture should show dark green fabric
5. Normal maps should show blue-purple coloring

## Troubleshooting

**Browser method not working?**
- Try a different browser (Chrome, Firefox, Edge)
- Check browser console for errors
- Ensure JavaScript is enabled

**Node.js method failing?**
- Canvas package installation issues are common
- Use the browser method instead
- Or use pre-generated textures if available

## Next Steps

Once textures are generated, they will be automatically loaded by the GameMat component in the game scene.
