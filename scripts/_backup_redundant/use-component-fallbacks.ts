import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Setting cards to use CardImage component fallbacks...\n')
  
  const cards = await prisma.card.findMany()
  
  let updated = 0
  
  for (const card of cards) {
    // Set imageUrl to null so the CardImage component uses its styled fallback
    await prisma.card.update({
      where: { id: card.id },
      data: { imageUrl: null }
    })
    
    updated++
    if (updated % 20 === 0) {
      console.log(`Progress: ${updated}/${cards.length}`)
    }
  }
  
  console.log(`\n✓ Updated ${updated} cards to use component fallbacks`)
  console.log('\nThe CardImage component will now display beautiful styled cards')
  console.log('with gradient backgrounds based on rarity.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
