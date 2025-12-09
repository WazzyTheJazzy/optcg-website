import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listAllCards() {
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' }
  })

  console.log('All cards in database:\n')
  cards.forEach(card => {
    console.log(`${card.cardNumber} - ${card.name} (${card.rarity})`)
  })

  console.log(`\nTotal: ${cards.length} cards`)

  await prisma.$disconnect()
}

listAllCards().catch(console.error)
