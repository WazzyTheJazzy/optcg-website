import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkImageUrls() {
  console.log('🔍 Checking image URLs...\n')
  
  // Get sample cards from different sets
  const samples = await prisma.card.findMany({
    where: {
      set: { in: ['OP01', 'OP02', 'ST13', 'P'] }
    },
    take: 10,
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('📋 Sample card image URLs:\n')
  for (const card of samples) {
    const urlType = card.imageUrl?.startsWith('/cards/') ? '✅ LOCAL' : '🌐 EXTERNAL'
    console.log(`${urlType} ${card.cardNumber}: ${card.imageUrl}`)
  }
  
  // Count local vs external
  const totalCards = await prisma.card.count()
  const localCards = await prisma.card.count({
    where: { imageUrl: { startsWith: '/cards/' } }
  })
  const externalCards = await prisma.card.count({
    where: { 
      AND: [
        { imageUrl: { not: null } },
        { imageUrl: { not: { startsWith: '/cards/' } } }
      ]
    }
  })
  const noImage = totalCards - localCards - externalCards
  
  console.log(`\n📊 Image URL Summary:`)
  console.log(`   Total cards: ${totalCards}`)
  console.log(`   ✅ Local images: ${localCards}`)
  console.log(`   🌐 External images: ${externalCards}`)
  console.log(`   ❌ No image: ${noImage}`)
  
  await prisma.$disconnect()
}

checkImageUrls()
  .catch(console.error)
