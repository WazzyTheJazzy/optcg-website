import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const SOURCE_BASE = 'public/OPTCGSim AA v1.25b-20251120T213204Z-1-001/OPTCGSim AA v1.25b'
const DEST_BASE = 'public/cards'

async function reorganizeAndImport() {
  console.log('🔄 Starting card reorganization and import...\n')

  // Step 1: Copy regular cards
  console.log('📁 Processing regular cards...')
  const cardsDir = path.join(SOURCE_BASE, 'Cards')
  const sets = fs.readdirSync(cardsDir)
  
  let regularCount = 0
  for (const set of sets) {
    const setPath = path.join(cardsDir, set)
    if (!fs.statSync(setPath).isDirectory()) continue
    
    const files = fs.readdirSync(setPath)
    for (const file of files) {
      if (file.endsWith('.png')) {
        const sourcePath = path.join(setPath, file)
        const destPath = path.join(DEST_BASE, file)
        fs.copyFileSync(sourcePath, destPath)
        regularCount++
      }
    }
  }
  console.log(`✅ Copied ${regularCount} regular cards\n`)

  // Step 2: Copy alternate art cards
  console.log('📁 Processing alternate art cards...')
  const aaDir = path.join(SOURCE_BASE, 'Variant AA')
  const aaSets = fs.readdirSync(aaDir)
  
  let aaCount = 0
  for (const set of aaSets) {
    const setPath = path.join(aaDir, set)
    if (!fs.statSync(setPath).isDirectory()) continue
    
    const files = fs.readdirSync(setPath)
    for (const file of files) {
      if (file.endsWith('.png')) {
        const sourcePath = path.join(setPath, file)
        // Rename to add _alt suffix
        const newName = file.replace('.png', '_alt.png')
        const destPath = path.join(DEST_BASE, newName)
        fs.copyFileSync(sourcePath, destPath)
        aaCount++
      }
    }
  }
  console.log(`✅ Copied ${aaCount} alternate art cards\n`)

  // Step 3: Copy DON cards
  console.log('📁 Processing DON cards...')
  const donDir = path.join(SOURCE_BASE, 'AA Don')
  const donFiles = fs.readdirSync(donDir)
  
  let donCount = 0
  for (const file of donFiles) {
    if (file.endsWith('.png')) {
      const sourcePath = path.join(donDir, file)
      const destPath = path.join(DEST_BASE, file)
      fs.copyFileSync(sourcePath, destPath)
      donCount++
    }
  }
  console.log(`✅ Copied ${donCount} DON cards\n`)

  console.log(`\n📊 Total files copied: ${regularCount + aaCount + donCount}`)
  console.log(`\n✅ All cards reorganized into public/cards/`)
  
  await prisma.$disconnect()
}

reorganizeAndImport()
  .catch(console.error)
