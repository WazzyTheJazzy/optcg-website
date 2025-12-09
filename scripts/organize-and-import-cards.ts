import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Source and destination directories
const SOURCE_DIR = 'public/OPTCGSim AA v1.25b-20251120T213204Z-1-001/OPTCGSim AA v1.25b';
const DEST_DIR = 'public/cards';
const DEST_AA_DIR = 'public/cards/aa'; // Alternative Art
const DEST_DON_DIR = 'public/cards/don'; // DON cards

interface CardInfo {
  originalPath: string;
  newPath: string;
  cardNumber: string;
  name: string;
  set: string;
  type: string;
  isAlternateArt: boolean;
  rarity?: string;
  color?: string;
}

// Parse filename to extract card information
function parseCardFilename(filename: string, setCode: string, isAA: boolean): CardInfo | null {
  const nameWithoutExt = filename.replace(/\.(png|jpg|jpeg)$/i, '');
  
  // Handle DON cards
  if (filename.startsWith('Don')) {
    const donNumber = filename.match(/Don\(alt(\d+)\)/)?.[1] || '0';
    return {
      originalPath: filename,
      newPath: `don/Don-${donNumber.padStart(2, '0')}.png`,
      cardNumber: `DON-${donNumber.padStart(2, '0')}`,
      name: 'DON!!',
      set: 'DON',
      type: 'DON',
      isAlternateArt: donNumber !== '0',
    };
  }
  
  // Extract card number from filename
  // Formats: OP01-001, ST01-001, P-001, etc.
  const cardMatch = nameWithoutExt.match(/^([A-Z]+\d*)-(\d+)/);
  if (!cardMatch) {
    console.warn(`⚠️  Could not parse filename: ${filename}`);
    return null;
  }
  
  const set = cardMatch[1];
  const number = cardMatch[2].padStart(3, '0');
  const cardNumber = `${set}-${number}`;
  
  // Determine destination path
  let destPath: string;
  if (isAA) {
    destPath = `aa/${cardNumber}.png`;
  } else {
    destPath = `${cardNumber}.png`;
  }
  
  return {
    originalPath: filename,
    newPath: destPath,
    cardNumber,
    name: nameWithoutExt.replace(/^[A-Z]+\d*-\d+_?/, '').replace(/_/g, ' ').trim() || 'Unknown',
    set: setCode,
    type: 'Character', // Default, will be updated from API/database
    isAlternateArt: isAA,
  };
}

// Create destination directories
function ensureDirectories() {
  [DEST_DIR, DEST_AA_DIR, DEST_DON_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
}

// Copy and rename files
async function organizeFiles(): Promise<CardInfo[]> {
  const cardInfos: CardInfo[] = [];
  
  console.log('📁 Organizing card images...\n');
  
  // Process regular cards
  const cardsDir = path.join(SOURCE_DIR, 'Cards');
  if (fs.existsSync(cardsDir)) {
    const sets = fs.readdirSync(cardsDir);
    
    for (const setFolder of sets) {
      const setPath = path.join(cardsDir, setFolder);
      if (!fs.statSync(setPath).isDirectory()) continue;
      
      const files = fs.readdirSync(setPath);
      console.log(`📦 Processing ${setFolder}: ${files.length} files`);
      
      for (const file of files) {
        if (!/\.(png|jpg|jpeg)$/i.test(file)) continue;
        
        const cardInfo = parseCardFilename(file, setFolder, false);
        if (!cardInfo) continue;
        
        const sourcePath = path.join(setPath, file);
        const destPath = path.join(DEST_DIR, cardInfo.newPath);
        
        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        cardInfo.originalPath = sourcePath;
        cardInfos.push(cardInfo);
      }
    }
  }
  
  // Process Alternative Art cards
  const aaDir = path.join(SOURCE_DIR, 'Variant AA');
  if (fs.existsSync(aaDir)) {
    const aaSets = fs.readdirSync(aaDir);
    
    for (const setFolder of aaSets) {
      const setPath = path.join(aaDir, setFolder);
      if (!fs.statSync(setPath).isDirectory()) continue;
      
      const setCode = setFolder.replace(' AA', '');
      const files = fs.readdirSync(setPath);
      console.log(`🎨 Processing ${setFolder}: ${files.length} AA files`);
      
      for (const file of files) {
        if (!/\.(png|jpg|jpeg)$/i.test(file)) continue;
        
        const cardInfo = parseCardFilename(file, setCode, true);
        if (!cardInfo) continue;
        
        const sourcePath = path.join(setPath, file);
        const destPath = path.join(DEST_DIR, cardInfo.newPath);
        
        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        cardInfo.originalPath = sourcePath;
        cardInfos.push(cardInfo);
      }
    }
  }
  
  // Process DON cards
  const donDir = path.join(SOURCE_DIR, 'AA Don');
  if (fs.existsSync(donDir)) {
    const files = fs.readdirSync(donDir);
    console.log(`💎 Processing DON cards: ${files.length} files`);
    
    for (const file of files) {
      if (!/\.(png|jpg|jpeg)$/i.test(file)) continue;
      
      const cardInfo = parseCardFilename(file, 'DON', false);
      if (!cardInfo) continue;
      
      const sourcePath = path.join(donDir, file);
      const destPath = path.join(DEST_DIR, cardInfo.newPath);
      
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
      cardInfo.originalPath = sourcePath;
      cardInfos.push(cardInfo);
    }
  }
  
  console.log(`\n✅ Organized ${cardInfos.length} card images\n`);
  return cardInfos;
}

// Import cards into database
async function importToDatabase(cardInfos: CardInfo[]) {
  console.log('💾 Importing cards to database...\n');
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const cardInfo of cardInfos) {
    try {
      // Check if card already exists
      const existing = await prisma.card.findUnique({
        where: { cardNumber: cardInfo.cardNumber },
      });
      
      const imageUrl = `/cards/${cardInfo.newPath}`;
      
      if (existing) {
        // Update image URL if it's an alternate art or if no image exists
        if (cardInfo.isAlternateArt || !existing.imageUrl) {
          await prisma.card.update({
            where: { cardNumber: cardInfo.cardNumber },
            data: {
              imageUrl,
              illustrationType: cardInfo.isAlternateArt ? 'Alternate' : existing.illustrationType,
            },
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new card entry
        await prisma.card.create({
          data: {
            cardNumber: cardInfo.cardNumber,
            name: cardInfo.name,
            set: cardInfo.set,
            type: cardInfo.type,
            category: cardInfo.type,
            rarity: cardInfo.rarity || 'C',
            color: cardInfo.color || 'Unknown',
            imageUrl,
            illustrationType: cardInfo.isAlternateArt ? 'Alternate' : 'Standard',
          },
        });
        created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${cardInfo.cardNumber}:`, error);
    }
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📝 Total: ${cardInfos.length}\n`);
}

// Generate summary report
function generateReport(cardInfos: CardInfo[]) {
  const report = {
    total: cardInfos.length,
    bySets: {} as Record<string, number>,
    alternateArt: cardInfos.filter(c => c.isAlternateArt).length,
    regular: cardInfos.filter(c => !c.isAlternateArt).length,
  };
  
  cardInfos.forEach(card => {
    report.bySets[card.set] = (report.bySets[card.set] || 0) + 1;
  });
  
  console.log('📈 Organization Report:');
  console.log(`   Total Cards: ${report.total}`);
  console.log(`   Regular: ${report.regular}`);
  console.log(`   Alternate Art: ${report.alternateArt}\n`);
  console.log('   By Set:');
  
  Object.entries(report.bySets)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([set, count]) => {
      console.log(`     ${set}: ${count}`);
    });
  
  console.log('');
}

// Main execution
async function main() {
  console.log('🚀 Starting Card Organization and Import\n');
  console.log('=' .repeat(50) + '\n');
  
  try {
    // Step 1: Ensure directories exist
    ensureDirectories();
    
    // Step 2: Organize and copy files
    const cardInfos = await organizeFiles();
    
    // Step 3: Generate report
    generateReport(cardInfos);
    
    // Step 4: Import to database
    await importToDatabase(cardInfos);
    
    console.log('=' .repeat(50));
    console.log('✨ Card organization and import complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
