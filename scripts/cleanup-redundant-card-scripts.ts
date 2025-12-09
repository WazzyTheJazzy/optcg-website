/**
 * Cleanup script to identify and optionally remove redundant card-related scripts
 * 
 * Now that we have organized card images and a proper database,
 * many of the old import/fix/check scripts are no longer needed.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCRIPTS_DIR = 'scripts';

// Scripts to keep (essential)
const KEEP_SCRIPTS = [
  'organize-and-import-cards.ts',  // Our new main import script
  'database-summary.ts',            // Useful for checking DB state
  'test-collection-api.ts',         // API testing
  'cleanup-redundant-card-scripts.ts', // This script
];

// Scripts that are redundant (can be removed)
const REDUNDANT_SCRIPTS = [
  // Old import scripts (replaced by organize-and-import-cards.ts)
  'import-cards.ts',                    // Used external API (no longer needed)
  'import-all-local-cards.ts',          // Old local import (replaced)
  'reorganize-and-import-cards.ts',     // Duplicate functionality
  
  // Image fixing scripts (images are now organized)
  'add-all-images.ts',
  'add-card-images.ts',
  'fix-card-names-from-images.ts',
  'fix-all-card-names-complete.ts',
  'fix-based-on-screenshot.ts',
  'fix-broken-images.ts',
  'fix-card-names.ts',
  'fix-d-names.ts',
  'use-better-images.ts',
  'use-component-fallbacks.ts',
  'use-placeholder-images.ts',
  
  // Sync scripts (no longer needed with organized images)
  'sync-cards-with-images.ts',
  'update-real-images.ts',
  'correct-op01-cards.ts',
  
  // Check scripts (redundant with database-summary)
  'check-cards.ts',
  'check-db-vs-images.ts',
  'check-db.ts',
  'check-first-cards.ts',
  'check-image-setup.ts',
  'check-image-urls.ts',
  'check-images.ts',
  'check-working-cards.ts',
  'verify-card-data.ts',
  'verify-cards.ts',
  'verify-images.ts',
  
  // List/show scripts (can use database queries instead)
  'list-all-cards.ts',
  'show-all-cards.ts',
  'show-luffy-cards.ts',
  'new-cards-summary.ts',
  
  // Metadata scripts (images now have proper metadata)
  'update-card-metadata.ts',
  'add-cache-buster.ts',
  'test-image-sources.ts',
];

interface ScriptInfo {
  name: string;
  path: string;
  size: number;
  status: 'keep' | 'redundant' | 'review';
  reason?: string;
}

function analyzeScripts(): ScriptInfo[] {
  const scripts: ScriptInfo[] = [];
  
  if (!fs.existsSync(SCRIPTS_DIR)) {
    console.error(`Scripts directory not found: ${SCRIPTS_DIR}`);
    return scripts;
  }
  
  const files = fs.readdirSync(SCRIPTS_DIR);
  
  for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    
    const filePath = path.join(SCRIPTS_DIR, file);
    const stats = fs.statSync(filePath);
    
    let status: 'keep' | 'redundant' | 'review' = 'review';
    let reason: string | undefined;
    
    if (KEEP_SCRIPTS.includes(file)) {
      status = 'keep';
      reason = 'Essential script';
    } else if (REDUNDANT_SCRIPTS.includes(file)) {
      status = 'redundant';
      reason = 'Replaced by organize-and-import-cards.ts or no longer needed';
    }
    
    scripts.push({
      name: file,
      path: filePath,
      size: stats.size,
      status,
      reason,
    });
  }
  
  return scripts;
}

function generateReport(scripts: ScriptInfo[]) {
  const keep = scripts.filter(s => s.status === 'keep');
  const redundant = scripts.filter(s => s.status === 'redundant');
  const review = scripts.filter(s => s.status === 'review');
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 CARD SCRIPTS CLEANUP REPORT');
  console.log('='.repeat(70) + '\n');
  
  console.log(`📊 Summary:`);
  console.log(`   Total Scripts: ${scripts.length}`);
  console.log(`   ✅ Keep: ${keep.length}`);
  console.log(`   🗑️  Redundant: ${redundant.length}`);
  console.log(`   🔍 Review: ${review.length}\n`);
  
  if (keep.length > 0) {
    console.log('✅ Scripts to KEEP:');
    keep.forEach(s => {
      console.log(`   - ${s.name}`);
      if (s.reason) console.log(`     ${s.reason}`);
    });
    console.log('');
  }
  
  if (redundant.length > 0) {
    console.log('🗑️  Scripts marked as REDUNDANT:');
    redundant.forEach(s => {
      const sizeKB = (s.size / 1024).toFixed(1);
      console.log(`   - ${s.name} (${sizeKB} KB)`);
      if (s.reason) console.log(`     ${s.reason}`);
    });
    console.log('');
  }
  
  if (review.length > 0) {
    console.log('🔍 Scripts to REVIEW:');
    review.forEach(s => {
      console.log(`   - ${s.name}`);
    });
    console.log('');
  }
  
  const totalRedundantSize = redundant.reduce((sum, s) => sum + s.size, 0);
  console.log(`💾 Space to reclaim: ${(totalRedundantSize / 1024).toFixed(1)} KB\n`);
}

function createBackupAndCleanup(scripts: ScriptInfo[], dryRun: boolean = true) {
  const redundant = scripts.filter(s => s.status === 'redundant');
  
  if (redundant.length === 0) {
    console.log('No redundant scripts to clean up.');
    return;
  }
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted');
    console.log('   Run with --execute flag to actually delete files\n');
    return;
  }
  
  // Create backup directory
  const backupDir = path.join(SCRIPTS_DIR, '_backup_redundant');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`✅ Created backup directory: ${backupDir}\n`);
  }
  
  console.log('🗑️  Moving redundant scripts to backup...\n');
  
  for (const script of redundant) {
    const backupPath = path.join(backupDir, script.name);
    
    try {
      // Move to backup
      fs.renameSync(script.path, backupPath);
      console.log(`   ✅ Moved: ${script.name}`);
    } catch (error) {
      console.error(`   ❌ Error moving ${script.name}:`, error);
    }
  }
  
  console.log(`\n✨ Cleanup complete! ${redundant.length} scripts moved to backup.`);
  console.log(`   Backup location: ${backupDir}`);
  console.log(`   You can safely delete the backup folder after verifying everything works.\n`);
}

function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  
  console.log('🧹 Analyzing card-related scripts...\n');
  
  const scripts = analyzeScripts();
  generateReport(scripts);
  
  console.log('='.repeat(70));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(70) + '\n');
  
  console.log('Now that you have:');
  console.log('  ✅ Organized card images in public/cards/');
  console.log('  ✅ Database with 757 cards imported');
  console.log('  ✅ organize-and-import-cards.ts as the main import script\n');
  
  console.log('You can safely remove the redundant scripts.\n');
  
  console.log('To clean up:');
  console.log('  1. Review the list above');
  console.log('  2. Run: npm run scripts:cleanup -- --execute');
  console.log('  3. Scripts will be moved to scripts/_backup_redundant/');
  console.log('  4. Test your app to ensure everything works');
  console.log('  5. Delete the backup folder when confident\n');
  
  if (execute) {
    console.log('='.repeat(70) + '\n');
    createBackupAndCleanup(scripts, false);
  } else {
    createBackupAndCleanup(scripts, true);
  }
}

main();
