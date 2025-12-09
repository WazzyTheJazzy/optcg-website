import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding cache buster to image URLs...\n')
  
  const cards = await prisma.card.findMany()
  
  for (const card of cards) {
    if (card.imageUrl) {
      // Add a timestamp to bust cache
      const cacheBuster = `?v=${Date.now()}`
      const newUrl = card.imageUrl.split('?')[0] + cacheBuster
      
      await prisma.card.update({
        where: { id: card.id },
        data: { imageUrl: newUrl }
      })
    }
  }
  
  console.log(`✓ Updated ${cards.length} card image URLs with cache buster`)
  console.log('\nNow refresh your browser with Ctrl+Shift+R')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
