import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('First 8 cards being displayed:\n')
  
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' },
    take: 8
  })
  
  console.log('Position | Card Number | Name | Rarity | Image URL')
  console.log('---------|-------------|------|--------|----------')
  
  cards.forEach((card, i) => {
    console.log(`${i + 1} | ${card.cardNumber} | ${card.name} | ${card.rarity} | ${card.imageUrl}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
