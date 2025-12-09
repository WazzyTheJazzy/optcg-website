import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getDatabaseSummary() {
  console.log('📊 One Piece TCG Database Summary\n')
  console.log('=' .repeat(50))

  // Total cards
  const totalCards = await prisma.card.count()
  console.log(`\n✅ Total Cards: ${totalCards}`)

  // Cards by set
  const bySet = await prisma.card.groupBy({
    by: ['set'],
    _count: true,
    orderBy: { set: 'asc' }
  })

  console.log('\n📦 Cards by Set:')
  bySet.forEach(s => {
    console.log(`   ${s.set}: ${s._count} cards`)
  })

  // Cards by rarity
  const byRarity = await prisma.card.groupBy({
    by: ['rarity'],
    _count: true,
    orderBy: { rarity: 'asc' }
  })

  console.log('\n⭐ Cards by Rarity:')
  byRarity.forEach(r => {
    console.log(`   ${r.rarity}: ${r._count} cards`)
  })

  // Cards by color
  const byColor = await prisma.card.groupBy({
    by: ['color'],
    _count: true,
    orderBy: { color: 'asc' }
  })

  console.log('\n🎨 Cards by Color:')
  byColor.forEach(c => {
    console.log(`   ${c.color}: ${c._count} cards`)
  })

  // Cards by type
  const byType = await prisma.card.groupBy({
    by: ['type'],
    _count: true,
    orderBy: { type: 'asc' }
  })

  console.log('\n🃏 Cards by Type:')
  byType.forEach(t => {
    console.log(`   ${t.type}: ${t._count} cards`)
  })

  // Sample of popular characters
  console.log('\n🌟 Sample Cards:')
  const sampleCards = await prisma.card.findMany({
    where: {
      OR: [
        { name: { contains: 'Luffy' } },
        { name: { contains: 'Zoro' } },
        { name: { contains: 'Shanks' } },
        { name: { contains: 'Kaido' } },
      ]
    },
    take: 10,
    orderBy: { cardNumber: 'asc' }
  })

  sampleCards.forEach(card => {
    console.log(`   ${card.cardNumber} - ${card.name} (${card.rarity})`)
  })

  console.log('\n' + '='.repeat(50))
  console.log('✅ Database is healthy and ready!')

  await prisma.$disconnect()
}

getDatabaseSummary()
  .catch(console.error)
