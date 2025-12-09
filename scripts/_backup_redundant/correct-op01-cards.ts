import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Correct OP01 card data based on official One Piece TCG
const correctOP01Cards = [
  { cardNumber: 'OP01-001', name: 'Monkey D. Luffy', rarity: 'L', color: 'Red', type: 'Leader', cost: 0, power: 5000 },
  { cardNumber: 'OP01-002', name: 'Roronoa Zoro', rarity: 'L', color: 'Green', type: 'Leader', cost: 0, power: 5000 },
  { cardNumber: 'OP01-003', name: 'Nami', rarity: 'L', color: 'Orange', type: 'Leader', cost: 0, power: 5000 },
  { cardNumber: 'OP01-004', name: 'Kaido', rarity: 'L', color: 'Purple', type: 'Leader', cost: 0, power: 5000 },
]

async function main() {
  console.log('Correcting OP01 Leader cards...\n')
  
  for (const correctCard of correctOP01Cards) {
    const existing = await prisma.card.findUnique({
      where: { cardNumber: correctCard.cardNumber }
    })
    
    if (existing) {
      await prisma.card.update({
        where: { cardNumber: correctCard.cardNumber },
        data: {
          name: correctCard.name,
          rarity: correctCard.rarity,
          type: correctCard.type,
          cost: correctCard.cost,
          power: correctCard.power,
        }
      })
      console.log(`✓ Updated ${correctCard.cardNumber}: ${correctCard.name} (${correctCard.rarity})`)
    } else {
      await prisma.card.create({
        data: {
          ...correctCard,
          set: 'OP01',
          category: correctCard.name.includes('Luffy') || correctCard.name.includes('Zoro') || correctCard.name.includes('Nami') 
            ? 'Straw Hat Crew' 
            : 'The Four Emperors',
          imageUrl: `https://en.onepiece-cardgame.com/images/cardlist/card/${correctCard.cardNumber}.png`
        }
      })
      console.log(`✓ Created ${correctCard.cardNumber}: ${correctCard.name} (${correctCard.rarity})`)
    }
  }
  
  console.log('\n✓ OP01 Leader cards corrected!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
