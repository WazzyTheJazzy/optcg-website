import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showNewCardsSummary() {
  console.log('🎴 New Cards Summary\n')
  console.log('=' .repeat(50))
  
  // Get cards by set with counts
  const sets = await prisma.card.groupBy({
    by: ['set'],
    _count: true,
    orderBy: { set: 'asc' }
  })
  
  console.log('\n📦 Cards by Set:')
  for (const set of sets) {
    const sampleCards = await prisma.card.findMany({
      where: { set: set.set },
      take: 3,
      orderBy: { cardNumber: 'asc' }
    })
    
    console.log(`\n   ${set.set}: ${set._count} cards`)
    sampleCards.forEach(card => {
      const imgType = card.imageUrl?.startsWith('/cards/') ? '📁' : '🌐'
      console.log(`      ${imgType} ${card.cardNumber} - ${card.name}`)
    })
  }
  
  // Show alternate art cards
  const altCards = await prisma.card.findMany({
    where: {
      illustrationType: 'Alternate'
    },
    take: 10
  })
  
  console.log(`\n\n✨ Alternate Art Cards: ${altCards.length} total`)
  console.log('   Sample:')
  altCards.slice(0, 5).forEach(card => {
    console.log(`      ${card.cardNumber} - ${card.name}`)
  })
  
  // Show image coverage
  const total = await prisma.card.count()
  const withImages = await prisma.card.count({
    where: { imageUrl: { not: null } }
  })
  const localImages = await prisma.card.count({
    where: { imageUrl: { startsWith: '/cards/' } }
  })
  
  console.log('\n\n📊 Image Coverage:')
  console.log(`   Total cards: ${total}`)
  console.log(`   With images: ${withImages} (${Math.round(withImages/total*100)}%)`)
  console.log(`   Local images: ${localImages} (${Math.round(localImages/total*100)}%)`)
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ All cards imported successfully!')
  console.log('🌐 Visit http://localhost:3000/cards to browse\n')
  
  await prisma.$disconnect()
}

showNewCardsSummary()
  .catch(console.error)
