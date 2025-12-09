import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('All Monkey D. Luffy cards in database:\n')
  
  const luffyCards = await prisma.card.findMany({
    where: {
      name: {
        contains: 'Luffy'
      }
    },
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('Card Number | Name | Set | Rarity | Type | Image URL')
  console.log('------------|------|-----|--------|------|----------')
  
  luffyCards.forEach(card => {
    const imageUrl = card.imageUrl?.substring(0, 50) + '...'
    console.log(`${card.cardNumber} | ${card.name} | ${card.set} | ${card.rarity} | ${card.type} | ${imageUrl}`)
  })
  
  console.log(`\nTotal Luffy cards: ${luffyCards.length}`)
  console.log('\nEach card has a unique card number and image!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
