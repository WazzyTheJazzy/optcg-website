import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const totalCards = await prisma.card.count()
  const cardsBySets = await prisma.card.groupBy({
    by: ['set'],
    _count: true,
    orderBy: { set: 'asc' }
  })
  
  const cardsByRarity = await prisma.card.groupBy({
    by: ['rarity'],
    _count: true,
    orderBy: { rarity: 'asc' }
  })
  
  console.log('=== Database Statistics ===\n')
  console.log(`Total Cards: ${totalCards}\n`)
  
  console.log('Cards by Set:')
  cardsBySets.forEach(s => console.log(`  ${s.set}: ${s._count} cards`))
  
  console.log('\nCards by Rarity:')
  cardsByRarity.forEach(r => console.log(`  ${r.rarity}: ${r._count} cards`))
  
  const sampleCards = await prisma.card.findMany({
    take: 5,
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('\nSample Cards:')
  sampleCards.forEach(c => console.log(`  ${c.cardNumber} - ${c.name} (${c.rarity})`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
