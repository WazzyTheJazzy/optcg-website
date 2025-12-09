import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking first 10 cards:\n')
  
  const cards = await prisma.card.findMany({
    where: {
      set: 'OP01'
    },
    orderBy: { cardNumber: 'asc' },
    take: 10
  })
  
  // Actual OP01 card list from official source
  const actualCards = [
    { cardNumber: 'OP01-001', name: 'Monkey D. Luffy', rarity: 'L', type: 'Leader' },
    { cardNumber: 'OP01-002', name: 'Roronoa Zoro', rarity: 'L', type: 'Leader' },
    { cardNumber: 'OP01-003', name: 'Nami', rarity: 'L', type: 'Leader' },
    { cardNumber: 'OP01-004', name: 'Kaido', rarity: 'L', type: 'Leader' },
    { cardNumber: 'OP01-005', name: 'Uta', rarity: 'SR', type: 'Character' },
    { cardNumber: 'OP01-006', name: 'Otama', rarity: 'C', type: 'Character' },
    { cardNumber: 'OP01-007', name: 'Koby', rarity: 'R', type: 'Character' },
    { cardNumber: 'OP01-008', name: 'Gol D. Roger', rarity: 'SR', type: 'Character' },
    { cardNumber: 'OP01-009', name: 'Sakazuki', rarity: 'R', type: 'Character' },
    { cardNumber: 'OP01-010', name: 'Jinbe', rarity: 'UC', type: 'Character' },
  ]
  
  console.log('Card Number | Database | Expected | Match')
  console.log('------------|----------|----------|------')
  
  cards.forEach((card, i) => {
    const expected = actualCards[i]
    const match = card.name === expected.name && card.rarity === expected.rarity
    console.log(`${card.cardNumber} | ${card.name} (${card.rarity}) | ${expected.name} (${expected.rarity}) | ${match ? '✓' : '✗'}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
