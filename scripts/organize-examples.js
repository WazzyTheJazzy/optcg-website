/**
 * Example Files Organization Script
 * 
 * Moves all .example.ts/tsx files to examples/ directory
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function ensureExamplesDir() {
  const examplesDir = path.join(process.cwd(), 'examples');
  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
  }
  
  // Create subdirectories
  const subdirs = ['game-engine', 'components'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(examplesDir, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }
}

function moveExampleFiles() {
  console.log('\n📝 Moving example files...');
  
  // Find all example files
  const exampleFiles = glob.sync('**/*.example.{ts,tsx}', {
    ignore: ['node_modules/**', '.next/**', 'examples/**']
  });
  
  let movedCount = 0;
  
  for (const file of exampleFiles) {
    const sourcePath = path.join(process.cwd(), file);
    
    // Determine destination based on path
    let destSubdir = 'game-engine';
    if (file.includes('components/')) {
      destSubdir = 'components';
    }
    
    // Create nested structure in examples
    const relativePath = file.replace(/^(lib\/game-engine\/|components\/)/, '');
    const destPath = path.join(process.cwd(), 'examples', destSubdir, relativePath);
    
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Move file
    fs.renameSync(sourcePath, destPath);
    console.log(`  ✓ Moved: ${file} → examples/${destSubdir}/${relativePath}`);
    movedCount++;
  }
  
  return movedCount;
}

function createExamplesReadme() {
  const content = `# Examples

This directory contains example code demonstrating how to use various components and systems.

## Structure

\`\`\`
examples/
├── game-engine/          # Game engine examples
│   ├── core/            # Core system examples
│   ├── phases/          # Phase implementation examples
│   ├── battle/          # Battle system examples
│   ├── effects/         # Effect system examples
│   ├── rendering/       # Rendering examples
│   └── utils/           # Utility examples
└── components/          # React component examples
    └── game/            # Game UI component examples
\`\`\`

## Usage

Each example file demonstrates:
- Basic usage patterns
- Common scenarios
- Best practices
- Integration examples

## Running Examples

Most examples are TypeScript files that can be run with ts-node:

\`\`\`bash
npx ts-node examples/game-engine/core/GameEngine.example.ts
\`\`\`

React component examples can be viewed by importing them into your application.

## Documentation

For full documentation, see the main [docs/](../docs) directory.
`;

  const readmePath = path.join(process.cwd(), 'examples', 'README.md');
  fs.writeFileSync(readmePath, content);
  console.log('\n  ✅ Created: examples/README.md');
}

// Main execution
console.log('📚 One Piece TCG Trader - Example Files Organization');
console.log('===================================================');

ensureExamplesDir();
const movedCount = moveExampleFiles();
createExamplesReadme();

console.log(`\n✅ Moved ${movedCount} example files to examples/ directory`);
console.log('\n💡 Example files are now organized in:');
console.log('  examples/');
console.log('    ├── game-engine/');
console.log('    ├── components/');
console.log('    └── README.md');
