import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing broken image URLs...\n')
  
  // Fix the two cards with broken imgur links
  const brokenCards = [
    { cardNumber: 'OP01-001', name: 'Monkey.D.Luffy' },
    { cardNumber: 'OP01-002', name: 'Roronoa Zoro' }
  ]
  
  for (const cardInfo of brokenCards) {
    const card = await prisma.card.findUnique({
      where: { cardNumber: cardInfo.cardNumber }
    })
    
    if (card) {
      const newImageUrl = `https://en.onepiece-cardgame.com/images/cardlist/card/${card.cardNumber}.png`
      
      await prisma.card.update({
        where: { id: card.id },
        data: { imageUrl: newImageUrl }
      })
      
      console.log(`✓ Fixed ${card.cardNumber} - ${card.name}`)
      console.log(`  New URL: ${newImageUrl}\n`)
    }
  }
  
  console.log('Done! All image URLs should now be consistent.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
