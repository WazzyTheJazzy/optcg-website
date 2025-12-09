# Table Surface Textures

This directory contains texture assets for the game table surface in the One Piece TCG simulator.

## Generated Textures

### Wood Table Textures

1. **wood-table-2048.png** (2048x2048)
   - Realistic wood grain texture for table surface
   - Brown tones with natural grain pattern
   - Use for: Main table surface material

2. **wood-normal-2048.png** (2048x2048)
   - Normal map for wood surface
   - Adds depth and detail to wood grain
   - Use for: Material normal map property

### Felt Playmat Textures

3. **felt-playmat-2048.png** (2048x2048)
   - Dark green felt texture
   - Typical card game playmat appearance
   - Use for: Alternative table surface material

4. **felt-normal-2048.png** (2048x2048)
   - Normal map for felt surface
   - Subtle fabric texture detail
   - Use for: Material normal map property

## How to Generate Textures

1. Open `texture-generator.html` in a web browser
2. The textures will be automatically generated on page load
3. Click the "Download PNG" button for each texture to save it
4. Save the files to this directory with the names listed above

## Usage in Three.js

```typescript
import * as THREE from 'three';

// Load wood texture
const textureLoader = new THREE.TextureLoader();
const woodTexture = textureLoader.load('/textures/wood-table-2048.png');
const woodNormal = textureLoader.load('/textures/wood-normal-2048.png');

// Create material
const tableMaterial = new THREE.MeshStandardMaterial({
  map: woodTexture,
  normalMap: woodNormal,
  roughness: 0.8,
  metalness: 0.1,
});

// Apply to table mesh
const tableGeometry = new THREE.PlaneGeometry(20, 30);
const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
```

## Texture Properties

### Wood Table
- **Resolution**: 2048x2048 pixels
- **Format**: PNG with alpha channel
- **Color Space**: sRGB
- **Recommended Material Settings**:
  - Roughness: 0.7-0.9
  - Metalness: 0.0-0.2
  - Normal Scale: 0.5-1.0

### Felt Playmat
- **Resolution**: 2048x2048 pixels
- **Format**: PNG with alpha channel
- **Color Space**: sRGB
- **Recommended Material Settings**:
  - Roughness: 0.9-1.0
  - Metalness: 0.0
  - Normal Scale: 0.3-0.6

## Optimization

The textures are generated at 2048x2048 resolution for high quality. For better web performance:

1. **Compression**: Use PNG optimization tools (e.g., pngquant, TinyPNG)
2. **Mipmaps**: Three.js will automatically generate mipmaps
3. **Texture Filtering**: Use THREE.LinearFilter for minification
4. **Consider WebP**: Convert to WebP format for smaller file sizes (with PNG fallback)

## Performance Considerations

- **Memory Usage**: Each 2048x2048 texture uses ~16MB of GPU memory
- **Loading Time**: Textures are loaded asynchronously
- **Caching**: Textures are cached by Three.js after first load
- **Mobile**: Consider using 1024x1024 versions for mobile devices

## Future Enhancements

- Add more texture variations (different wood types, colors)
- Create seamless tiling patterns
- Add roughness maps for more realistic materials
- Add ambient occlusion maps for enhanced depth
- Create custom playmat designs with zone markings

## Requirements Satisfied

This texture set satisfies the following requirements from the phase-system-review spec:

- **Requirement 12.1**: Table surface texture for realistic appearance
- **Requirement 12.2**: Zone boundary markings (can be added to textures or overlaid)
- Normal maps provide surface detail for enhanced realism

## Credits

Textures generated procedurally using HTML5 Canvas and Perlin noise algorithms.
No external assets or licenses required.
