import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check cards that were working in the screenshot (OP01-003 onwards)
  const workingCards = await prisma.card.findMany({
    where: {
      cardNumber: {
        in: ['OP01-003', 'OP01-004', 'OP01-005', 'OP01-006', 'OP01-007', 'OP01-008']
      }
    },
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('Checking what URLs the working cards had:\n')
  workingCards.forEach(c => {
    console.log(`${c.cardNumber} - ${c.name}`)
    console.log(`  ${c.imageUrl}\n`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
