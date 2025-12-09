/**
 * Documentation Organization Script
 * 
 * Consolidates all scattered markdown files into organized docs/ directory
 */

const fs = require('fs');
const path = require('path');

// Documentation organization map
const docOrganization = {
  // Keep in root
  root: [
    'README.md',
  ],
  
  // Move to docs/
  docs: [
    'SETUP.md',
    'QUICK_REFERENCE.md',
    'TROUBLESHOOTING.md',
    'MULTIPLAYER_ROADMAP.md',
  ],
  
  // Consolidate into docs/FEATURES.md
  features: [
    'CARD_SYSTEM_COMPLETE.md',
    'COLLECTION_SYSTEM_COMPLETE.md',
    'GUEST_MODE_FINAL.md',
    'CARD_SLEEVES_FEATURE.md',
    'CARD_3D_FEATURE.md',
    'TRIPLE_CAROUSEL_FEATURE.md',
    'ADVERTISING_SYSTEM.md',
    'AUTHENTICATION_UX.md',
  ],
  
  // Consolidate into docs/GAME_ENGINE.md
  gameEngine: [
    'GAME_IMPLEMENTATION_COMPLETE.md',
    'GAME_MAT_COMPLETE.md',
    'GAME_SETUP.md',
    'GAME_STATUS.md',
  ],
  
  // Consolidate into docs/IMPLEMENTATION_NOTES.md
  implementation: [
    'IMPLEMENTATION_SUMMARY.md',
    'CARD_ANIMATION_COMPLETE.md',
    'DRAG_DROP_FIXES.md',
    'MAIN_PHASE_FIX.md',
    'PHASE_CONTROL_FIX.md',
    'DEBUGGING_FIXES.md',
  ],
  
  // Consolidate into docs/DEVELOPMENT.md
  development: [
    'CARD_IMPORT_SUMMARY.md',
    'CARD_IMAGES.md',
    'LOCAL_IMAGES_SETUP.md',
    'CLEANUP_SCRIPTS_SUMMARY.md',
    'CLEANUP_SUMMARY.md',
    'TEST_CHECKLIST.md',
    'COLLECTION_TRACKING.md',
  ],
};

function ensureDocsDir() {
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // Create archive directory for old docs
  const archiveDir = path.join(docsDir, 'archive');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
}

function moveToArchive(files) {
  console.log('\n📦 Moving files to archive...');
  const archiveDir = path.join(process.cwd(), 'docs', 'archive');
  
  for (const file of files) {
    const sourcePath = path.join(process.cwd(), file);
    const destPath = path.join(archiveDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      console.log(`  ✓ Archived: ${file}`);
    }
  }
}

function moveToRoot(files) {
  console.log('\n📄 Keeping in root...');
  for (const file of files) {
    console.log(`  ✓ ${file}`);
  }
}

function moveToDocs(files) {
  console.log('\n📁 Moving to docs/...');
  const docsDir = path.join(process.cwd(), 'docs');
  
  for (const file of files) {
    const sourcePath = path.join(process.cwd(), file);
    const destPath = path.join(docsDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      console.log(`  ✓ Moved: ${file}`);
    }
  }
}

function consolidateFiles(category, files, outputFile) {
  console.log(`\n📝 Consolidating ${category} files into ${outputFile}...`);
  
  let consolidatedContent = `# ${category.charAt(0).toUpperCase() + category.slice(1)} Documentation\n\n`;
  consolidatedContent += `> This document consolidates multiple related documentation files.\n`;
  consolidatedContent += `> Last updated: ${new Date().toISOString().split('T')[0]}\n\n`;
  consolidatedContent += `---\n\n`;
  
  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(file, '.md');
      
      consolidatedContent += `## ${fileName.replace(/_/g, ' ')}\n\n`;
      consolidatedContent += `> Source: \`${file}\`\n\n`;
      consolidatedContent += content;
      consolidatedContent += `\n\n---\n\n`;
      
      console.log(`  ✓ Added: ${file}`);
    }
  }
  
  const outputPath = path.join(process.cwd(), 'docs', outputFile);
  fs.writeFileSync(outputPath, consolidatedContent);
  console.log(`  ✅ Created: docs/${outputFile}`);
  
  // Move originals to archive
  moveToArchive(files);
}

function generateIndex() {
  console.log('\n📋 Documentation organization complete!');
  console.log('\nOrganized structure:');
  console.log('  docs/');
  console.log('    ├── README.md (index)');
  console.log('    ├── PROJECT_STRUCTURE.md');
  console.log('    ├── FEATURES.md (consolidated)');
  console.log('    ├── GAME_ENGINE.md (consolidated)');
  console.log('    ├── IMPLEMENTATION_NOTES.md (consolidated)');
  console.log('    ├── DEVELOPMENT.md (consolidated)');
  console.log('    ├── SETUP.md');
  console.log('    ├── QUICK_REFERENCE.md');
  console.log('    ├── TROUBLESHOOTING.md');
  console.log('    ├── MULTIPLAYER_ROADMAP.md');
  console.log('    └── archive/ (original files)');
}

// Main execution
console.log('🗂️  One Piece TCG Trader - Documentation Organization');
console.log('====================================================');

ensureDocsDir();
moveToRoot(docOrganization.root);
moveToDocs(docOrganization.docs);
consolidateFiles('Features', docOrganization.features, 'FEATURES.md');
consolidateFiles('Game Engine', docOrganization.gameEngine, 'GAME_ENGINE.md');
consolidateFiles('Implementation Notes', docOrganization.implementation, 'IMPLEMENTATION_NOTES.md');
consolidateFiles('Development', docOrganization.development, 'DEVELOPMENT.md');
generateIndex();

console.log('\n✅ Documentation organization complete!');
console.log('\n💡 Next steps:');
console.log('  1. Review consolidated docs in docs/ directory');
console.log('  2. Update README.md with link to docs/README.md');
console.log('  3. Delete docs/archive/ if you don\'t need the originals');
