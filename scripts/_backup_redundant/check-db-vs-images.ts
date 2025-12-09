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
  
  console.log('Database vs Expected:\n')
  
  const expected = [
    { cardNumber: 'OP01-001', name: 'Monkey D. Luffy', rarity: 'L' },
    { cardNumber: 'OP01-002', name: 'Roronoa Zoro', rarity: 'L' },
    { cardNumber: 'OP01-003', name: 'Nami', rarity: 'L' },
    { cardNumber: 'OP01-004', name: 'Kaido', rarity: 'L' },
  ]
  
  cards.forEach((card, i) => {
    const exp = expected[i]
    const match = card.name === exp.name && card.rarity === exp.rarity
    console.log(`${card.cardNumber}:`)
    console.log(`  DB: ${card.name} (${card.rarity})`)
    console.log(`  Expected: ${exp.name} (${exp.rarity})`)
    console.log(`  Match: ${match ? '✓' : '✗'}`)
    console.log(`  Image: ${card.imageUrl}\n`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
