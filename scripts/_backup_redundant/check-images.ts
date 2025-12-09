import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cards = await prisma.card.findMany({
    take: 10,
    orderBy: { cardNumber: 'asc' },
    select: {
      cardNumber: true,
      name: true,
      rarity: true,
      imageUrl: true
    }
  })
  
  console.log('First 10 cards with image URLs:\n')
  cards.forEach(c => {
    console.log(`${c.cardNumber} - ${c.name} (${c.rarity})`)
    console.log(`  Image: ${c.imageUrl || 'NO IMAGE'}`)
    console.log()
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
