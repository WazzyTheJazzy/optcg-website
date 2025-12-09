/**
 * Generate table surface textures programmatically using Node.js Canvas
 * 
 * This script generates:
 * - Wood grain texture (2048x2048)
 * - Felt playmat texture (2048x2048)
 * - Wood normal map (2048x2048)
 * - Felt normal map (2048x2048)
 * 
 * Usage: node scripts/generate-table-textures.js
 */

const fs = require('fs');
const path = require('path');

// Check if canvas package is available
let Canvas;
try {
  Canvas = require('canvas');
} catch (e) {
  console.log('Note: canvas package not installed. Using HTML generator instead.');
  console.log('To generate textures:');
  console.log('1. Open public/textures/texture-generator.html in a browser');
  console.log('2. Click the download buttons to save each texture');
  console.log('3. Save files to public/textures/ directory');
  console.log('\nAlternatively, install canvas package:');
  console.log('npm install canvas');
  process.exit(0);
}

const { createCanvas } = Canvas;

// Noise functions
function noise(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, seed = 0) {
  const corners = (noise(x-1, y-1, seed) + noise(x+1, y-1, seed) + 
                 noise(x-1, y+1, seed) + noise(x+1, y+1, seed)) / 16;
  const sides = (noise(x-1, y, seed) + noise(x+1, y, seed) + 
               noise(x, y-1, seed) + noise(x, y+1, seed)) / 8;
  const center = noise(x, y, seed) / 4;
  return corners + sides + center;
}

function perlinNoise(x, y, octaves = 4, persistence = 0.5, seed = 0) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise(x * frequency, y * frequency, seed + i) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

// Generate wood texture
function generateWoodTexture(width, height) {
  console.log('Generating wood texture...');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const woodColors = [
    { r: 101, g: 67, b: 33 },
    { r: 139, g: 90, b: 43 },
    { r: 160, g: 110, b: 60 },
    { r: 180, g: 130, b: 70 }
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const grainX = x / width;
      const grainY = y / height;
      
      const grain = Math.sin(grainY * 80 + perlinNoise(grainX * 10, grainY * 10, 6, 0.5) * 20) * 0.5 + 0.5;
      const detail = perlinNoise(grainX * 50, grainY * 50, 4, 0.6) * 0.3;
      const value = grain * 0.7 + detail * 0.3;
      
      const colorIndex = Math.floor(value * (woodColors.length - 1));
      const color = woodColors[Math.min(colorIndex, woodColors.length - 1)];
      
      const variation = (perlinNoise(grainX * 100, grainY * 100, 3, 0.5) - 0.5) * 30;
      
      data[idx] = Math.max(0, Math.min(255, color.r + variation));
      data[idx + 1] = Math.max(0, Math.min(255, color.g + variation));
      data[idx + 2] = Math.max(0, Math.min(255, color.b + variation));
      data[idx + 3] = 255;
    }
    
    if (y % 256 === 0) {
      process.stdout.write(`\rWood texture: ${Math.floor(y / height * 100)}%`);
    }
  }
  console.log('\rWood texture: 100%');

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Generate felt texture
function generateFeltTexture(width, height) {
  console.log('Generating felt texture...');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const baseColor = { r: 20, g: 80, b: 40 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const nx = x / width;
      const ny = y / height;
      
      const feltNoise = perlinNoise(nx * 200, ny * 200, 6, 0.6) * 0.15;
      const weave = (Math.sin(nx * 400) * Math.sin(ny * 400)) * 0.05;
      const variation = (feltNoise + weave) * 255;
      
      data[idx] = Math.max(0, Math.min(255, baseColor.r + variation));
      data[idx + 1] = Math.max(0, Math.min(255, baseColor.g + variation));
      data[idx + 2] = Math.max(0, Math.min(255, baseColor.b + variation));
      data[idx + 3] = 255;
    }
    
    if (y % 256 === 0) {
      process.stdout.write(`\rFelt texture: ${Math.floor(y / height * 100)}%`);
    }
  }
  console.log('\rFelt texture: 100%');

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Generate normal map
function generateNormalMap(width, height, type = 'wood') {
  console.log(`Generating ${type} normal map...`);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Generate height map
  const heightMap = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      
      if (type === 'wood') {
        const grain = Math.sin(ny * 80 + perlinNoise(nx * 10, ny * 10, 6, 0.5) * 20) * 0.3;
        const detail = perlinNoise(nx * 50, ny * 50, 4, 0.6) * 0.2;
        heightMap[y * width + x] = grain + detail;
      } else {
        const feltNoise = perlinNoise(nx * 200, ny * 200, 6, 0.6) * 0.1;
        const weave = (Math.sin(nx * 400) * Math.sin(ny * 400)) * 0.05;
        heightMap[y * width + x] = feltNoise + weave;
      }
    }
  }

  // Calculate normals
  const strength = type === 'wood' ? 3.0 : 1.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const left = heightMap[y * width + Math.max(0, x - 1)];
      const right = heightMap[y * width + Math.min(width - 1, x + 1)];
      const up = heightMap[Math.max(0, y - 1) * width + x];
      const down = heightMap[Math.min(height - 1, y + 1) * width + x];
      
      const dx = (right - left) * strength;
      const dy = (down - up) * strength;
      
      const length = Math.sqrt(dx * dx + dy * dy + 1);
      const nx = dx / length;
      const ny = dy / length;
      const nz = 1 / length;
      
      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
    
    if (y % 256 === 0) {
      process.stdout.write(`\r${type} normal map: ${Math.floor(y / height * 100)}%`);
    }
  }
  console.log(`\r${type} normal map: 100%`);

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Main execution
async function main() {
  const outputDir = path.join(__dirname, '..', 'public', 'textures');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const size = 2048;

  try {
    // Generate wood texture
    const woodCanvas = generateWoodTexture(size, size);
    const woodBuffer = woodCanvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outputDir, 'wood-table-2048.png'), woodBuffer);
    console.log('✓ Saved wood-table-2048.png');

    // Generate felt texture
    const feltCanvas = generateFeltTexture(size, size);
    const feltBuffer = feltCanvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outputDir, 'felt-playmat-2048.png'), feltBuffer);
    console.log('✓ Saved felt-playmat-2048.png');

    // Generate wood normal map
    const woodNormalCanvas = generateNormalMap(size, size, 'wood');
    const woodNormalBuffer = woodNormalCanvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outputDir, 'wood-normal-2048.png'), woodNormalBuffer);
    console.log('✓ Saved wood-normal-2048.png');

    // Generate felt normal map
    const feltNormalCanvas = generateNormalMap(size, size, 'felt');
    const feltNormalBuffer = feltNormalCanvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outputDir, 'felt-normal-2048.png'), feltNormalBuffer);
    console.log('✓ Saved felt-normal-2048.png');

    console.log('\n✓ All textures generated successfully!');
    console.log(`Output directory: ${outputDir}`);
  } catch (error) {
    console.error('Error generating textures:', error);
    process.exit(1);
  }
}

main();
