import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Correct card data based on official One Piece TCG card list
const correctCardData: Record<string, { name: string, rarity: string, type: string }> = {
  // OP01 Set
  'OP01-001': { name: 'Roronoa Zoro', rarity: 'L', type: 'Leader' },
  'OP01-002': { name: 'Trafalgar Law', rarity: 'L', type: 'Leader' },
  'OP01-003': { name: 'Monkey D. Luffy', rarity: 'L', type: 'Leader' },
  'OP01-004': { name: 'Kaido', rarity: 'L', type: 'Leader' },
  'OP01-016': { name: 'Nami', rarity: 'SR', type: 'Character' },
  'OP01-025': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character' },
  'OP01-031': { name: 'Sanji', rarity: 'SR', type: 'Character' },
  'OP01-047': { name: 'Trafalgar Law', rarity: 'SR', type: 'Character' },
  'OP01-060': { name: 'Portgas D. Ace', rarity: 'SR', type: 'Character' },
  'OP01-070': { name: 'Edward Newgate', rarity: 'SR', type: 'Character' },
  
  // OP02 Set
  'OP02-001': { name: 'Eustass Kid', rarity: 'L', type: 'Leader' },
  'OP02-002': { name: 'Edward Newgate', rarity: 'L', type: 'Leader' },
  'OP02-003': { name: 'Smoker', rarity: 'L', type: 'Leader' },
  'OP02-004': { name: 'Crocodile', rarity: 'L', type: 'Leader' },
  'OP02-005': { name: 'Portgas D. Ace', rarity: 'SR', type: 'Character' },
  'OP02-006': { name: 'Sabo', rarity: 'SR', type: 'Character' },
  'OP02-007': { name: 'Marco', rarity: 'SR', type: 'Character' },
  'OP02-008': { name: 'Edward Newgate', rarity: 'SR', type: 'Character' },
  'OP02-009': { name: 'Boa Hancock', rarity: 'SR', type: 'Character' },
  'OP02-010': { name: 'Donquixote Doflamingo', rarity: 'SR', type: 'Character' },
  'OP02-013': { name: 'Jewelry Bonney', rarity: 'SR', type: 'Character' },
  'OP02-018': { name: 'Eustass Kid', rarity: 'SR', type: 'Character' },
  'OP02-022': { name: 'Killer', rarity: 'SR', type: 'Character' },
  'OP02-026': { name: 'Smoker', rarity: 'SR', type: 'Character' },
  'OP02-030': { name: 'Tashigi', rarity: 'R', type: 'Character' },
  'OP02-034': { name: 'Hina', rarity: 'R', type: 'Character' },
  'OP02-040': { name: 'Crocodile', rarity: 'SR', type: 'Character' },
  'OP02-049': { name: 'Nico Robin', rarity: 'SR', type: 'Character' },
  'OP02-051': { name: 'Nefertari Vivi', rarity: 'R', type: 'Character' },
  'OP02-059': { name: 'Bentham', rarity: 'R', type: 'Character' },
  
  // OP03 Set
  'OP03-001': { name: 'Nami', rarity: 'L', type: 'Leader' },
  'OP03-002': { name: 'Perona', rarity: 'L', type: 'Leader' },
  'OP03-003': { name: 'Charlotte Linlin', rarity: 'L', type: 'Leader' },
  'OP03-004': { name: 'Monkey D. Luffy', rarity: 'SR', type: 'Character' },
  'OP03-006': { name: 'Roronoa Zoro', rarity: 'SR', type: 'Character' },
  'OP03-007': { name: 'Kaido', rarity: 'SEC', type: 'Character' },
  'OP03-013': { name: 'Nami', rarity: 'SR', type: 'Character' },
  'OP03-022': { name: 'Perona', rarity: 'SR', type: 'Character' },
  'OP03-025': { name: 'Gecko Moria', rarity: 'SR', type: 'Character' },
  'OP03-033': { name: 'Absalom', rarity: 'R', type: 'Character' },
  'OP03-040': { name: 'Kaido', rarity: 'SEC', type: 'Character' },
  'OP03-053': { name: 'Charlotte Katakuri', rarity: 'SR', type: 'Character' },
  'OP03-056': { name: 'Charlotte Linlin', rarity: 'SR', type: 'Character' },
  'OP03-062': { name: 'Charlotte Cracker', rarity: 'R', type: 'Character' },
  'OP03-078': { name: 'Charlotte Smoothie', rarity: 'R', type: 'Character' },
  'OP03-099': { name: 'Charlotte Pudding', rarity: 'R', type: 'Character' },
  
  // OP04 Set
  'OP04-001': { name: 'Donquixote Doflamingo', rarity: 'L', type: 'Leader' },
  'OP04-002': { name: 'Vinsmoke Reiju', rarity: 'L', type: 'Leader' },
  'OP04-003': { name: 'Monkey D. Luffy', rarity: 'L', type: 'Leader' },
  'OP04-004': { name: 'Monkey D. Luffy', rarity: 'SR', type: 'Character' },
  'OP04-005': { name: 'Shanks', rarity: 'SEC', type: 'Character' },
  'OP04-019': { name: 'Donquixote Doflamingo', rarity: 'SR', type: 'Character' },
  'OP04-022': { name: 'Trafalgar Law', rarity: 'SR', type: 'Character' },
  'OP04-031': { name: 'Viola', rarity: 'R', type: 'Character' },
  'OP04-034': { name: 'Vinsmoke Reiju', rarity: 'SR', type: 'Character' },
  'OP04-039': { name: 'Vinsmoke Ichiji', rarity: 'R', type: 'Character' },
  'OP04-040': { name: 'Vinsmoke Niji', rarity: 'R', type: 'Character' },
  'OP04-041': { name: 'Vinsmoke Yonji', rarity: 'R', type: 'Character' },
  'OP04-051': { name: 'Sanji', rarity: 'SR', type: 'Character' },
  'OP04-058': { name: 'Sabo', rarity: 'SR', type: 'Character' },
  'OP04-083': { name: 'Shanks', rarity: 'SEC', type: 'Character' },
  'OP04-091': { name: 'Koala', rarity: 'R', type: 'Character' },
  
  // OP05 Set
  'OP05-001': { name: 'Sakazuki', rarity: 'L', type: 'Leader' },
  'OP05-002': { name: 'Borsalino', rarity: 'L', type: 'Leader' },
  'OP05-003': { name: 'Issho', rarity: 'L', type: 'Leader' },
  'OP05-004': { name: 'Kuzan', rarity: 'L', type: 'Leader' },
  'OP05-007': { name: 'Sakazuki', rarity: 'SR', type: 'Character' },
  'OP05-022': { name: 'Borsalino', rarity: 'SR', type: 'Character' },
  'OP05-041': { name: 'Issho', rarity: 'SR', type: 'Character' },
  'OP05-043': { name: 'Magellan', rarity: 'SR', type: 'Character' },
  'OP05-051': { name: 'Kuzan', rarity: 'SR', type: 'Character' },
  'OP05-060': { name: 'Monkey D. Garp', rarity: 'SR', type: 'Character' },
  'OP05-069': { name: 'Tsuru', rarity: 'R', type: 'Character' },
  'OP05-074': { name: 'Sengoku', rarity: 'SR', type: 'Character' },
  'OP05-093': { name: 'Emporio Ivankov', rarity: 'SR', type: 'Character' },
  'OP05-100': { name: 'Inazuma', rarity: 'R', type: 'Character' },
  'OP05-119': { name: 'Jinbe', rarity: 'SR', type: 'Character' },
  'OP05-120': { name: 'Arlong', rarity: 'R', type: 'Character' },
}

async function fixCardNames() {
  console.log('🔧 Fixing card names to match images...\n')

  let fixed = 0
  let notFound = 0

  for (const [cardNumber, correctData] of Object.entries(correctCardData)) {
    const card = await prisma.card.findUnique({
      where: { cardNumber }
    })

    if (card) {
      if (card.name !== correctData.name) {
        console.log(`Fixing ${cardNumber}:`)
        console.log(`  ❌ Old: ${card.name}`)
        console.log(`  ✅ New: ${correctData.name}`)
        
        await prisma.card.update({
          where: { cardNumber },
          data: {
            name: correctData.name,
            rarity: correctData.rarity,
            type: correctData.type
          }
        })
        fixed++
      }
    } else {
      console.log(`⚠️  Card ${cardNumber} not found in database`)
      notFound++
    }
  }

  console.log(`\n✅ Fixed ${fixed} cards`)
  if (notFound > 0) {
    console.log(`⚠️  ${notFound} cards not found in database`)
  }

  await prisma.$disconnect()
}

fixCardNames()
  .catch(console.error)
