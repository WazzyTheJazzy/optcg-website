import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Use Limitless TCG CDN which is more reliable
const getBetterImageUrl = (cardNumber: string): string => {
  const [set, num] = cardNumber.split('-')
  
  // Limitless TCG has a reliable CDN for One Piece cards
  // Format: https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/[SET]/[SET]_[NUM]_EN.webp
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${set}/${set}_${num}_EN.webp`
}

async function main() {
  console.log('Updating all cards with better image URLs...\n')
  
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' }
  })
  
  let updated = 0
  
  for (const card of cards) {
    const newImageUrl = getBetterImageUrl(card.cardNumber)
    
    await prisma.card.update({
      where: { id: card.id },
      data: { imageUrl: newImageUrl }
    })
    
    updated++
    if (updated % 20 === 0) {
      console.log(`Progress: ${updated}/${cards.length}`)
    }
  }
  
  console.log(`\n✓ Updated ${updated} cards with Limitless TCG CDN URLs`)
  
  // Show examples
  const samples = await prisma.card.findMany({
    take: 5,
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('\nSample URLs:')
  samples.forEach(c => {
    console.log(`${c.cardNumber}: ${c.imageUrl}`)
  })
  
  console.log('\nNote: If these images also fail, the CardImage component will show styled fallbacks.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
