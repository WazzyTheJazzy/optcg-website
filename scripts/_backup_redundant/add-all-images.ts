import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Generate image URL based on card number
function getImageUrl(cardNumber: string): string {
  // Using official One Piece Card Game website
  return `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}.png`
}

async function main() {
  console.log('Adding image URLs to all cards...\n')
  
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log(`Found ${cards.length} cards in database`)
  
  let updated = 0
  
  for (const card of cards) {
    const imageUrl = getImageUrl(card.cardNumber)
    
    await prisma.card.update({
      where: { id: card.id },
      data: { imageUrl }
    })
    
    updated++
    if (updated % 20 === 0) {
      console.log(`Progress: ${updated}/${cards.length}`)
    }
  }
  
  console.log(`\n✓ Updated ${updated} cards with image URLs`)
  
  // Show some examples
  const samples = await prisma.card.findMany({
    take: 5,
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('\nSample URLs:')
  samples.forEach(c => {
    console.log(`${c.cardNumber} - ${c.name}: ${c.imageUrl}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
