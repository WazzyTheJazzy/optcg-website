import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Use a reliable placeholder that will always work
const getPlaceholderImageUrl = (cardNumber: string, name: string, rarity: string): string => {
  // Use placeholder.co which is very reliable
  const bgColor = {
    'L': 'fbbf24',      // Gold for Leaders
    'SEC': 'dc2626',    // Red for Secret Rares
    'SR': 'f59e0b',     // Orange for Super Rares
    'R': 'a855f7',      // Purple for Rares
    'UC': '6b7280',     // Gray for Uncommons
    'C': '9ca3af'       // Light gray for Commons
  }[rarity] || '6b7280'
  
  const encodedName = encodeURIComponent(name.replace(/\./g, ' '))
  const encodedNumber = encodeURIComponent(cardNumber)
  
  // Create a nice looking placeholder
  return `https://placehold.co/400x560/${bgColor}/ffffff?text=${encodedNumber}%0A${encodedName}%0A${rarity}`
}

async function main() {
  console.log('Updating all cards with working placeholder images...\n')
  
  const cards = await prisma.card.findMany({
    orderBy: { cardNumber: 'asc' }
  })
  
  let updated = 0
  
  for (const card of cards) {
    const imageUrl = getPlaceholderImageUrl(card.cardNumber, card.name, card.rarity)
    
    await prisma.card.update({
      where: { id: card.id },
      data: { imageUrl }
    })
    
    updated++
    if (updated % 20 === 0) {
      console.log(`Progress: ${updated}/${cards.length}`)
    }
  }
  
  console.log(`\n✓ Updated ${updated} cards with placeholder images`)
  console.log('\nThese placeholders will always work and look good!')
  console.log('You can replace them with real card images later.\n')
  
  // Show examples
  const samples = await prisma.card.findMany({
    take: 3,
    orderBy: { cardNumber: 'asc' }
  })
  
  console.log('Sample URLs:')
  samples.forEach(c => {
    console.log(`${c.cardNumber}: ${c.imageUrl}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
