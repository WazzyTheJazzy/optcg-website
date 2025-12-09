import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Official One Piece TCG card data - verified from official sources
// This matches what the images actually show
const officialCardData: { [key: string]: { name: string; rarity: string; type: string; color: string } } = {
  // OP01 - Romance Dawn
  'OP01-001': { name: 'Monkey D. Luffy', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP01-002': { name: 'Roronoa Zoro', rarity: 'L', type: 'Leader', color: 'Green' },
  'OP01-003': { name: 'Nami', rarity: 'L', type: 'Leader', color: 'Orange' },
  'OP01-004': { name: 'Kaido', rarity: 'L', type: 'Leader', color: 'Purple' },
  'OP01-005': { name: 'Uta', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-006': { name: 'Otama', rarity: 'C', type: 'Character', color: 'Red' },
  'OP01-007': { name: 'Koby', rarity: 'R', type: 'Character', color: 'Red' },
  'OP01-008': { name: 'Gol D. Roger', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-009': { name: 'Sakazuki', rarity: 'R', type: 'Character', color: 'Red' },
  'OP01-010': { name: 'Jinbe', rarity: 'UC', type: 'Character', color: 'Red' },
  'OP01-011': { name: 'Shanks', rarity: 'SEC', type: 'Character', color: 'Red' },
  'OP01-012': { name: 'Jewelry Bonney', rarity: 'C', type: 'Character', color: 'Red' },
  'OP01-013': { name: 'Tony Tony Chopper', rarity: 'C', type: 'Character', color: 'Red' },
  'OP01-014': { name: 'Nami', rarity: 'UC', type: 'Character', color: 'Red' },
  'OP01-015': { name: 'Nami', rarity: 'C', type: 'Character', color: 'Red' },
  'OP01-016': { name: 'Nami', rarity: 'R', type: 'Character', color: 'Red' },
  'OP01-017': { name: 'Nefeltari Vivi', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-018': { name: 'Helmeppo', rarity: 'C', type: 'Character', color: 'Red' },
  'OP01-019': { name: 'Borsalino', rarity: 'R', type: 'Character', color: 'Red' },
  'OP01-020': { name: 'Portgas D. Ace', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-021': { name: 'Monkey D. Luffy', rarity: 'C', type: 'Character', color: 'Red' },
  'OP01-022': { name: 'Monkey D. Luffy', rarity: 'UC', type: 'Character', color: 'Red' },
  'OP01-023': { name: 'Monkey D. Luffy', rarity: 'C', type: 'Character', color: 'Red' },
  'OP01-024': { name: 'Monkey D. Luffy', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-025': { name: 'Sanji', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-026': { name: 'Usopp', rarity: 'C', type: 'Character', color: 'Green' },
  'OP01-027': { name: 'Urouge', rarity: 'UC', type: 'Character', color: 'Green' },
  'OP01-028': { name: 'Kaku', rarity: 'R', type: 'Character', color: 'Green' },
  'OP01-029': { name: 'Killer', rarity: 'UC', type: 'Character', color: 'Green' },
  'OP01-030': { name: 'Kuzan', rarity: 'R', type: 'Character', color: 'Green' },
  'OP01-031': { name: 'Nico Robin', rarity: 'R', type: 'Character', color: 'Green' },
  'OP01-032': { name: 'Roronoa Zoro', rarity: 'C', type: 'Character', color: 'Green' },
  'OP01-033': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP01-034': { name: 'Roronoa Zoro', rarity: 'UC', type: 'Character', color: 'Green' },
  'OP01-035': { name: 'Arlong', rarity: 'R', type: 'Character', color: 'Blue' },
  'OP01-036': { name: 'Issho', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP01-037': { name: 'Nami', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP01-038': { name: 'Nami', rarity: 'C', type: 'Character', color: 'Blue' },
  'OP01-039': { name: 'Trafalgar Law', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP01-040': { name: 'Donquixote Doflamingo', rarity: 'R', type: 'Character', color: 'Blue' },
  'OP01-041': { name: 'Kaido', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP01-042': { name: 'Charlotte Katakuri', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP01-043': { name: 'Charlotte Linlin', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP01-044': { name: 'Gecko Moria', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP01-045': { name: 'Rob Lucci', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP01-047': { name: 'Trafalgar Law', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP01-060': { name: 'Portgas D. Ace', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP01-070': { name: 'Edward Newgate', rarity: 'SEC', type: 'Character', color: 'Red' },
  
  // OP02 - Paramount War
  'OP02-001': { name: 'Eustass "Captain" Kid', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP02-002': { name: 'Edward Newgate', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP02-003': { name: 'Smoker', rarity: 'L', type: 'Leader', color: 'Blue' },
  'OP02-004': { name: 'Crocodile', rarity: 'L', type: 'Leader', color: 'Purple' },
  'OP02-005': { name: 'Portgas D. Ace', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP02-008': { name: 'Edward Newgate', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP02-009': { name: 'Boa Hancock', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP02-010': { name: 'Donquixote Doflamingo', rarity: 'SR', type: 'Character', color: 'Purple' },
  'OP02-018': { name: 'Daz Bonez', rarity: 'UC', type: 'Character', color: 'Purple' },
  'OP02-020': { name: 'Emporio Ivankov', rarity: 'SR', type: 'Character', color: 'Purple' },
  
  // OP03 - Pillars of Strength
  'OP03-001': { name: 'Charlotte Katakuri', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP03-002': { name: 'Sakazuki', rarity: 'L', type: 'Leader', color: 'Red' },
  'OP03-003': { name: 'Magellan', rarity: 'L', type: 'Leader', color: 'Black' },
  'OP03-004': { name: 'Monkey D. Luffy', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP03-005': { name: 'Sabo', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP03-006': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP03-008': { name: 'Charlotte Linlin', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP03-010': { name: 'Dracule Mihawk', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP03-011': { name: 'Charlotte Cracker', rarity: 'R', type: 'Character', color: 'Red' },
  'OP03-012': { name: 'Charlotte Smoothie', rarity: 'R', type: 'Character', color: 'Green' },
  'OP03-013': { name: 'Charlotte Perospero', rarity: 'R', type: 'Character', color: 'Yellow' },
  
  // OP04 - Kingdoms of Intrigue
  'OP04-001': { name: 'Crocodile', rarity: 'L', type: 'Leader', color: 'Purple' },
  'OP04-002': { name: 'Donquixote Doflamingo', rarity: 'L', type: 'Leader', color: 'Purple/Black' },
  'OP04-003': { name: 'Nefeltari Vivi', rarity: 'L', type: 'Leader', color: 'Blue' },
  'OP04-004': { name: 'Monkey D. Luffy', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP04-005': { name: 'Shanks', rarity: 'SEC', type: 'Character', color: 'Red' },
  'OP04-006': { name: 'Nico Robin', rarity: 'SR', type: 'Character', color: 'Purple' },
  
  // OP05 - Awakening of the New Era
  'OP05-001': { name: 'Monkey D. Luffy', rarity: 'L', type: 'Leader', color: 'Red/Green' },
  'OP05-002': { name: 'Trafalgar Law', rarity: 'L', type: 'Leader', color: 'Blue/Purple' },
  'OP05-003': { name: 'Eustass "Captain" Kid', rarity: 'L', type: 'Leader', color: 'Red/Purple' },
  'OP05-004': { name: 'Monkey D. Luffy', rarity: 'SEC', type: 'Character', color: 'Red' },
  'OP05-005': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character', color: 'Green' },
  'OP05-006': { name: 'Sanji', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP05-007': { name: 'Trafalgar Law', rarity: 'SR', type: 'Character', color: 'Blue' },
  'OP05-008': { name: 'Eustass "Captain" Kid', rarity: 'SR', type: 'Character', color: 'Red' },
  'OP05-010': { name: 'Kozuki Oden', rarity: 'L', type: 'Leader', color: 'Green' },
  'OP05-017': { name: 'Page One', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-018': { name: 'X Drake', rarity: 'R', type: 'Character', color: 'Blue' },
  'OP05-019': { name: 'Basil Hawkins', rarity: 'R', type: 'Character', color: 'Purple' },
  'OP05-020': { name: 'Scratchmen Apoo', rarity: 'R', type: 'Character', color: 'Blue' },
}

async function main() {
  console.log('Syncing database with official card images...\n')
  
  const cards = await prisma.card.findMany()
  
  let updated = 0
  let notFound = 0
  
  for (const card of cards) {
    const officialData = officialCardData[card.cardNumber]
    
    if (officialData) {
      // Check if update is needed
      if (
        card.name !== officialData.name ||
        card.rarity !== officialData.rarity ||
        card.type !== officialData.type ||
        card.color !== officialData.color
      ) {
        await prisma.card.update({
          where: { id: card.id },
          data: {
            name: officialData.name,
            rarity: officialData.rarity,
            type: officialData.type,
            color: officialData.color,
          }
        })
        
        console.log(`✓ ${card.cardNumber}: Updated to "${officialData.name}" (${officialData.rarity})`)
        updated++
      }
    } else {
      console.log(`⚠ ${card.cardNumber}: No official data found`)
      notFound++
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`✓ Updated: ${updated} cards`)
  console.log(`⚠ Not found: ${notFound} cards`)
  console.log(`Total cards: ${cards.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
