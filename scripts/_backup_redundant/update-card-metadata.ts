import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Update card metadata for cards that were imported with minimal info
 * 
 * Usage:
 * 1. Modify the cardUpdates array below with card details
 * 2. Run: npx tsx scripts/update-card-metadata.ts
 */

const cardUpdates: any[] = [
  // Example format:
  // {
  //   cardNumber: 'OP02-001',
  //   name: 'Eustass Kid',
  //   rarity: 'L',
  //   color: 'Red/Purple',
  //   type: 'Leader',
  //   cost: 0,
  //   power: 5000,
  //   life: 4,
  //   category: 'Kid Pirates',
  //   effect: '[DON!! x1] [When Attacking] Give up to 1 of your Leader or Character cards +1000 power during this battle.',
  //   artist: 'Artist Name',
  //   archetype: 'Kid Pirates'
  // },
]

async function updateCardMetadata() {
  console.log('🔄 Updating card metadata...\n')
  
  if (cardUpdates.length === 0) {
    console.log('⚠️  No updates defined. Edit the cardUpdates array in this script.')
    console.log('📝 Example format is provided in the comments.\n')
    await prisma.$disconnect()
    return
  }
  
  let updated = 0
  let notFound = 0
  
  for (const update of cardUpdates) {
    try {
      const card = await prisma.card.findUnique({
        where: { cardNumber: update.cardNumber }
      })
      
      if (!card) {
        console.log(`❌ Card not found: ${update.cardNumber}`)
        notFound++
        continue
      }
      
      await prisma.card.update({
        where: { cardNumber: update.cardNumber },
        data: {
          name: update.name || card.name,
          rarity: update.rarity || card.rarity,
          color: update.color || card.color,
          type: update.type || card.type,
          cost: update.cost !== undefined ? update.cost : card.cost,
          power: update.power !== undefined ? update.power : card.power,
          counter: update.counter !== undefined ? update.counter : card.counter,
          life: update.life !== undefined ? update.life : card.life,
          category: update.category || card.category,
          effect: update.effect || card.effect,
          trigger: update.trigger || card.trigger,
          attribute: update.attribute || card.attribute,
          artist: update.artist || card.artist,
          archetype: update.archetype || card.archetype,
          illustrationType: update.illustrationType || card.illustrationType
        }
      })
      
      console.log(`✅ Updated: ${update.cardNumber} - ${update.name}`)
      updated++
      
    } catch (error) {
      console.log(`❌ Error updating ${update.cardNumber}:`, error)
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ❌ Not found: ${notFound}`)
  
  await prisma.$disconnect()
}

updateCardMetadata()
  .catch(console.error)
