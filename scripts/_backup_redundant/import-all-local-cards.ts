import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const CARDS_DIR = 'public/cards'

// Parse card filename to extract info
function parseCardFilename(filename: string) {
  // Remove .png extension
  const name = filename.replace('.png', '')
  
  // Check if it's a DON card
  if (name.startsWith('Don(')) {
    return {
      type: 'DON',
      cardNumber: name,
      isAlternate: true,
      set: 'DON'
    }
  }
  
  // Check if it's an alternate art
  const isAlternate = name.includes('_alt') || name.includes('(alt')
  
  // Extract card number (e.g., OP01-001 or P-001)
  const match = name.match(/^([A-Z]+\d*)-(\d+)/)
  if (!match) {
    return null
  }
  
  const set = match[1]
  const number = match[2]
  const cardNumber = `${set}-${number}`
  
  return {
    type: 'CARD',
    cardNumber,
    isAlternate,
    set,
    filename
  }
}

async function importAllLocalCards() {
  console.log('🔍 Scanning public/cards directory...\n')
  
  const files = fs.readdirSync(CARDS_DIR)
  const pngFiles = files.filter(f => f.endsWith('.png'))
  
  console.log(`📊 Found ${pngFiles.length} image files\n`)
  
  const cardMap = new Map<string, { regular?: string, alternates: string[] }>()
  const donCards: string[] = []
  
  // Organize cards
  for (const file of pngFiles) {
    const parsed = parseCardFilename(file)
    if (!parsed) {
      console.log(`⚠️  Skipping unrecognized file: ${file}`)
      continue
    }
    
    if (parsed.type === 'DON') {
      donCards.push(file)
      continue
    }
    
    if (!cardMap.has(parsed.cardNumber)) {
      cardMap.set(parsed.cardNumber, { alternates: [] })
    }
    
    const entry = cardMap.get(parsed.cardNumber)!
    if (parsed.isAlternate) {
      entry.alternates.push(file)
    } else {
      entry.regular = file
    }
  }
  
  console.log(`📋 Organized into:`)
  console.log(`   - ${cardMap.size} unique card numbers`)
  console.log(`   - ${donCards.length} DON cards\n`)
  
  // Update database
  let updated = 0
  let created = 0
  let skipped = 0
  
  for (const [cardNumber, images] of cardMap.entries()) {
    const imageUrl = `/cards/${images.regular || images.alternates[0]}`
    
    try {
      // Check if card exists
      const existing = await prisma.card.findUnique({
        where: { cardNumber }
      })
      
      if (existing) {
        // Update with local image
        await prisma.card.update({
          where: { cardNumber },
          data: { imageUrl }
        })
        updated++
      } else {
        // Create new card with minimal info
        const set = cardNumber.split('-')[0]
        await prisma.card.create({
          data: {
            cardNumber,
            name: `Card ${cardNumber}`,
            set,
            rarity: 'C',
            color: 'Unknown',
            type: 'Character',
            category: 'Unknown',
            imageUrl
          }
        })
        created++
      }
      
      // Handle alternate arts
      for (const altFile of images.alternates) {
        const altCardNumber = `${cardNumber}_alt${images.alternates.indexOf(altFile) + 1}`
        const altImageUrl = `/cards/${altFile}`
        
        const existingAlt = await prisma.card.findUnique({
          where: { cardNumber: altCardNumber }
        })
        
        if (!existingAlt) {
          const set = cardNumber.split('-')[0]
          await prisma.card.create({
            data: {
              cardNumber: altCardNumber,
              name: `Card ${cardNumber} (Alt)`,
              set,
              rarity: 'SR',
              color: 'Unknown',
              type: 'Character',
              category: 'Unknown',
              imageUrl: altImageUrl,
              illustrationType: 'Alternate'
            }
          })
          created++
        }
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${cardNumber}:`, error)
      skipped++
    }
  }
  
  console.log(`\n✅ Import complete!`)
  console.log(`   - ${updated} cards updated with local images`)
  console.log(`   - ${created} new cards created`)
  console.log(`   - ${skipped} cards skipped due to errors`)
  
  // Show summary
  const totalCards = await prisma.card.count()
  console.log(`\n📊 Total cards in database: ${totalCards}`)
  
  await prisma.$disconnect()
}

importAllLocalCards()
  .catch(console.error)
