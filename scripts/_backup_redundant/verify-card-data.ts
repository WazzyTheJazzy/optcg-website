import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyCardData() {
  console.log('🔍 Checking card database...\n')

  // Get all cards
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' },
    take: 20
  })

  console.log(`📊 Total cards in database: ${cards.length}\n`)

  // Check for issues
  const issues: string[] = []

  cards.forEach((card, index) => {
    console.log(`${index + 1}. ${card.cardNumber} - ${card.name}`)
    console.log(`   Image: ${card.imageUrl}`)
    
    // Check if name matches card number
    const expectedCardNumber = card.imageUrl?.match(/\/(OP\d+-\d+)\.png/)?.[1]
    if (expectedCardNumber && expectedCardNumber !== card.cardNumber) {
      issues.push(`❌ ${card.cardNumber}: Name "${card.name}" but image is ${expectedCardNumber}`)
    }
    
    // Check for placeholder names
    if (card.name.includes('.')) {
      issues.push(`⚠️  ${card.cardNumber}: Name has dots: "${card.name}"`)
    }
    
    console.log('')
  })

  if (issues.length > 0) {
    console.log('\n🚨 Issues found:\n')
    issues.forEach(issue => console.log(issue))
  } else {
    console.log('\n✅ All cards look good!')
  }

  // Show some statistics
  const stats = await prisma.card.groupBy({
    by: ['set'],
    _count: true
  })

  console.log('\n📈 Cards by set:')
  stats.forEach(stat => {
    console.log(`   ${stat.set}: ${stat._count} cards`)
  })

  await prisma.$disconnect()
}

verifyCardData()
  .catch(console.error)
