import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real One Piece TCG card image sources
// These are common CDN patterns used by the community
const getCardImageUrl = (cardNumber: string): string => {
  // Format the card number for different image sources
  const [set, num] = cardNumber.split('-')
  
  // Option 1: One Piece Card Game official website pattern
  // https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png
  
  // Option 2: One Piece Top Decks (popular community site)
  // https://www.onepiece-cardgame.dev/images/cards/[SET]-[NUM].jpg
  
  // Option 3: Grand Line TCG
  // https://grandlinetcg.com/images/cards/[SET]/[NUM].jpg
  
  // We'll use a multi-source approach with fallbacks
  const sources = [
    `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}.png`,
    `https://images.onepiece-cardgame.dev/images/cards/${cardNumber}.jpg`,
    `https://limitlesstcg.nyc3.digitaloceanspaces.com/one-piece/${set}/${set}_${num}_EN.png`,
  ]
  
  // Return the first source (you can implement fallback logic in the frontend)
  return sources[0]
}

// Alternative: Use imgur or other image hosting for curated card images
const curatedImages: { [key: string]: string } = {
  // Leaders
  'OP01-001': 'https://i.imgur.com/placeholder1.jpg', // Luffy Leader
  'OP01-002': 'https://i.imgur.com/placeholder2.jpg', // Zoro Leader
  // Add more curated images as needed
}

async function main() {
  console.log('Updating cards with real image URLs...\n')
  
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' }
  })
  
  let updated = 0
  
  for (const card of cards) {
    // Check if we have a curated image first
    let imageUrl = curatedImages[card.cardNumber]
    
    // Otherwise use the standard pattern
    if (!imageUrl) {
      imageUrl = getCardImageUrl(card.cardNumber)
    }
    
    await prisma.card.update({
      where: { id: card.id },
      data: { imageUrl }
    })
    
    updated++
    if (updated % 20 === 0) {
      console.log(`Progress: ${updated}/${cards.length}`)
    }
  }
  
  console.log(`\n✓ Updated ${updated} cards with real image URLs`)
  console.log('\nNote: Some images may not load if the source URLs are unavailable.')
  console.log('Consider using a fallback image in your frontend component.')
  
  // Show examples
  const samples = await prisma.card.findMany({
    take: 3,
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('\nSample URLs:')
  samples.forEach(c => {
    console.log(`${c.cardNumber}: ${c.imageUrl}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
