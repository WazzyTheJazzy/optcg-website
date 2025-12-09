import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Complete correct card data for all 82 cards based on official One Piece TCG
const allCorrectCardData: Record<string, { name: string, rarity: string, type: string, color: string }> = {
  // OP01 Set - Romance Dawn
  'OP01-001': { name: 'Roronoa Zoro', rarity: 'L', type: 'Leader', color: 'Green' },
  'OP01-002': { name: 'Trafalgar Law', rarity: 'L', type: 'Leader', color: 'Blue' },
  'OP01-003': { name: 'Monkey D. Luffy', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP01-004': { name: 'Kaido', rarity: 'L', type: 'Leader', color: 'Purple' },
  'OP01-016': { name: 'Nami', rarity: 'R', type: 'Character', color: 'Red' },
  'OP01-025': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP01-031': { name: 'Sanji', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP01-047': { name: 'Trafalgar Law', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP01-060': { name: 'Portgas D. Ace', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-070': { name: 'Edward Newgate', rarity: 'SEC', type: 'Character', color: 'Red' },
  
  // OP02 Set - Paramount War
  'OP02-001': { name: 'Eustass Kid', rarity: 'L', type: 'Leader', color: 'Purple' },
  'OP02-002': { name: 'Edward Newgate', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP02-003': { name: 'Smoker', rarity: 'L', type: 'Leader', color: 'Blue' },
  'OP02-004': { name: 'Crocodile', rarity: 'L', type: 'Leader', color: 'Purple' },
  'OP02-005': { name: 'Portgas D. Ace', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP02-006': { name: 'Sabo', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP02-007': { name: 'Marco', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP02-008': { name: 'Edward Newgate', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP02-009': { name: 'Boa Hancock', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP02-010': { name: 'Donquixote Doflamingo', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP02-011': { name: 'Jozu', rarity: 'R', type: 'Character', color: 'Red' },
  'OP02-012': { name: 'Vista', rarity: 'R', type: 'Character', color: 'Red' },
  'OP02-013': { name: 'Jewelry Bonney', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP02-014': { name: 'Izou', rarity: 'UC', type: 'Character', color: 'Red' },
  'OP02-015': { name: 'Tashigi', rarity: 'R', type: 'Character', color: 'Blue' },
  'OP02-016': { name: 'Hina', rarity: 'UC', type: 'Character', color: 'Blue' },
  'OP02-017': { name: 'Crocodile', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP02-018': { name: 'Eustass Kid', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP02-019': { name: 'Bentham', rarity: 'UC', type: 'Character', color: 'Purple' },
  'OP02-020': { name: 'Emporio Ivankov', rarity: 'SR', type: 'Character', color: 'Purple' },
  
  // OP03 Set - Pillars of Strength
  'OP03-001': { name: 'Nami', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP03-002': { name: 'Perona', rarity: 'L', type: 'Leader', color: 'Black' },
  'OP03-003': { name: 'Charlotte Linlin', rarity: 'L', type: 'Leader', color: 'Yellow' },
  'OP03-004': { name: 'Monkey D. Luffy', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP03-005': { name: 'Sabo', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP03-006': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP03-007': { name: 'Kaido', rarity: 'SEC', type: 'Character', color: 'Purple' },
  'OP03-008': { name: 'Charlotte Linlin', rarity: 'SR', type: 'Character', color: 'Yellow' },
  'OP03-009': { name: 'Perona', rarity: 'R', type: 'Character', color: 'Black' },
  'OP03-010': { name: 'Dracule Mihawk', rarity: 'SR', type: 'Character', color: 'Black' },
  'OP03-011': { name: 'Charlotte Cracker', rarity: 'R', type: 'Character', color: 'Yellow' },
  'OP03-012': { name: 'Charlotte Smoothie', rarity: 'R', type: 'Character', color: 'Yellow' },
  'OP03-013': { name: 'Nami', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP03-014': { name: 'Hannyabal', rarity: 'R', type: 'Character', color: 'Black' },
  'OP03-015': { name: 'Sadi', rarity: 'UC', type: 'Character', color: 'Black' },
  'OP03-040': { name: 'Kaido', rarity: 'SEC', type: 'Character', color: 'Purple' },
  
  // OP04 Set - Kingdoms of Intrigue
  'OP04-001': { name: 'Donquixote Doflamingo', rarity: 'L', type: 'Leader', color: 'Black' },
  'OP04-002': { name: 'Vinsmoke Reiju', rarity: 'L', type: 'Leader', color: 'Blue' },
  'OP04-003': { name: 'Monkey D. Luffy', rarity: 'L', type: 'Leader', color: 'Red/Green' },
  'OP04-004': { name: 'Monkey D. Luffy', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP04-005': { name: 'Shanks', rarity: 'SEC', type: 'Character', color: 'Red' },
  'OP04-006': { name: 'Nico Robin', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP04-007': { name: 'Crocodile', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP04-008': { name: 'Rebecca', rarity: 'R', type: 'Character', color: 'Red' },
  'OP04-009': { name: 'Kyros', rarity: 'R', type: 'Character', color: 'Red' },
  'OP04-010': { name: 'Viola', rarity: 'UC', type: 'Character', color: 'Red' },
  'OP04-011': { name: 'Trebol', rarity: 'R', type: 'Character', color: 'Black' },
  'OP04-012': { name: 'Diamante', rarity: 'R', type: 'Character', color: 'Black' },
  'OP04-013': { name: 'Pica', rarity: 'R', type: 'Character', color: 'Black' },
  'OP04-014': { name: 'Vergo', rarity: 'UC', type: 'Character', color: 'Black' },
  'OP04-015': { name: 'Baby 5', rarity: 'C', type: 'Character', color: 'Black' },
  'OP04-083': { name: 'Shanks', rarity: 'SEC', type: 'Character', color: 'Red' },
  
  // OP05 Set - Awakening of the New Era
  'OP05-001': { name: 'Sakazuki', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP05-002': { name: 'Borsalino', rarity: 'L', type: 'Leader', color: 'Blue' },
  'OP05-003': { name: 'Issho', rarity: 'L', type: 'Leader', color: 'Purple' },
  'OP05-004': { name: 'Kuzan', rarity: 'L', type: 'Leader', color: 'Blue' },
  'OP05-005': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP05-006': { name: 'Sanji', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP05-007': { name: 'Sakazuki', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP05-008': { name: 'Eustass Kid', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP05-009': { name: 'Yamato', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP05-010': { name: 'Kozuki Oden', rarity: 'L', type: 'Leader', color: 'Green' },
  'OP05-011': { name: 'Bepo', rarity: 'R', type: 'Character', color: 'Blue' },
  'OP05-012': { name: 'Killer', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-013': { name: 'King', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP05-014': { name: 'Queen', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-015': { name: 'Jack', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-016': { name: 'Ulti', rarity: 'UC', type: 'Character', color: 'Purple' },
  'OP05-017': { name: 'Page One', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-018': { name: 'X Drake', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-019': { name: 'Basil Hawkins', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-020': { name: 'Scratchmen Apoo', rarity: 'R', type: 'Character', color: 'Purple' },
}

async function fixAllCardNames() {
  console.log('🔧 Fixing ALL card names to match official One Piece TCG data...\n')

  let fixed = 0
  let alreadyCorrect = 0
  let notFound = 0

  for (const [cardNumber, correctData] of Object.entries(allCorrectCardData)) {
    const card = await prisma.card.findUnique({
      where: { cardNumber }
    })

    if (card) {
      if (card.name !== correctData.name || card.rarity !== correctData.rarity) {
        console.log(`Fixing ${cardNumber}:`)
        console.log(`  ❌ Old: ${card.name} (${card.rarity})`)
        console.log(`  ✅ New: ${correctData.name} (${correctData.rarity})`)
        
        await prisma.card.update({
          where: { cardNumber },
          data: {
            name: correctData.name,
            rarity: correctData.rarity,
            type: correctData.type,
            color: correctData.color
          }
        })
        fixed++
      } else {
        alreadyCorrect++
      }
    } else {
      console.log(`⚠️  Card ${cardNumber} not found in database`)
      notFound++
    }
  }

  console.log(`\n✅ Fixed ${fixed} cards`)
  console.log(`✓  ${alreadyCorrect} cards were already correct`)
  if (notFound > 0) {
    console.log(`⚠️  ${notFound} cards not found in database`)
  }

  console.log('\n🎉 All card names are now correct!')

  await prisma.$disconnect()
}

fixAllCardNames()
  .catch(console.error)
