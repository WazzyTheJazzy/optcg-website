import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Image URL patterns for One Piece TCG cards
// Using multiple sources for card images
const getCardImageUrl = (cardNumber: string, name: string): string => {
  // Option 1: One Piece Top Decks (community database)
  // Format: https://en.onepiece-cardgame.com/images/cardlist/card/[CARD_NUMBER].png
  const cleanNumber = cardNumber.replace('-', '_')
  
  // Option 2: Use a reliable CDN or placeholder
  // For now, we'll use a combination approach
  
  // Check if it's a special card
  const set = cardNumber.split('-')[0]
  const number = cardNumber.split('-')[1]
  
  // Using One Piece Card Game official-style URLs
  return `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}.png`
}

// Fallback to placeholder if official images don't exist
const getPlaceholderUrl = (cardNumber: string, name: string, rarity: string): string => {
  const colors: { [key: string]: string } = {
    'Red': 'ef4444',
    'Green': '22c55e',
    'Blue': '3b82f6',
    'Purple': 'a855f7',
    'Black': '1f2937',
    'Yellow': 'eab308',
  }
  
  const rarityColors: { [key: string]: string } = {
    'L': 'fbbf24',
    'SEC': 'dc2626',
    'SR': 'f59e0b',
    'R': 'a855f7',
    'UC': '6b7280',
    'C': '9ca3af'
  }
  
  const bgColor = rarityColors[rarity] || '6b7280'
  const encodedName = encodeURIComponent(name)
  const encodedNumber = encodeURIComponent(cardNumber)
  
  // Using placeholder.com with custom styling
  return `https://placehold.co/400x560/${bgColor}/white?text=${encodedNumber}%0A${encodedName}&font=roboto`
}

async function main() {
  console.log('Adding images to all cards...\n')
  
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' }
  })
  
  let updated = 0
  
  for (const card of cards) {
    // Primary image URL (official source)
    const primaryImageUrl = getCardImageUrl(card.cardNumber, card.name)
    
    // Fallback placeholder URL
    const placeholderUrl = getPlaceholderUrl(card.cardNumber, card.name, card.rarity)
    
    // For now, we'll use the placeholder since we don't have access to official images
    // In production, you'd want to check if the official URL exists first
    const imageUrl = placeholderUrl
    
    await prisma.card.update({
      where: { id: card.id },
      data: { imageUrl }
    })
    
    updated++
    if (updated % 20 === 0) {
      console.log(`Progress: ${updated}/${cards.length} cards updated...`)
    }
  }
  
  console.log(`\n✓ Updated ${updated} cards with image URLs`)
  
  // Show some examples
  const samples = await prisma.card.findMany({
    take: 5,
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('\nSample card images:')
  samples.forEach(c => {
    console.log(`${c.cardNumber} - ${c.name}`)
    console.log(`  ${c.imageUrl}\n`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
