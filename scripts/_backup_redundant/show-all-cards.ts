import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' },
    take: 20
  })
  
  console.log('First 20 cards in database:\n')
  console.log('Card Number | Name | Rarity | Type')
  console.log('------------|------|--------|-----')
  
  cards.forEach(card => {
    console.log(`${card.cardNumber} | ${card.name} | ${card.rarity} | ${card.type}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
