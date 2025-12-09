import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cards = await prisma.card.findMany({
    where: {
      cardNumber: {
        in: ['OP01-001', 'OP01-002', 'OP01-003', 'OP01-004']
      }
    },
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('First 4 cards:\n')
  cards.forEach(c => {
    console.log(`${c.cardNumber}: ${c.name} (${c.rarity})`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
