import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const moreCards = [
  // OP02 - Paramount War
  { cardNumber: 'OP02-001', name: 'Eustass.Kid', set: 'OP02', rarity: 'L', color: 'Red/Purple', cost: 0, power: 5000, type: 'Leader', category: 'Kid Pirates' },
  { cardNumber: 'OP02-002', name: 'Edward.Newgate', set: 'OP02', rarity: 'L', color: 'Green', cost: 0, power: 5000, type: 'Leader', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-003', name: 'Smoker', set: 'OP02', rarity: 'L', color: 'Blue', cost: 0, power: 5000, type: 'Leader', category: 'Navy' },
  { cardNumber: 'OP02-004', name: 'Crocodile', set: 'OP02', rarity: 'L', color: 'Purple', cost: 0, power: 5000, type: 'Leader', category: 'Baroque Works' },
  { cardNumber: 'OP02-005', name: 'Portgas.D.Ace', set: 'OP02', rarity: 'SR', color: 'Red', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-006', name: 'Sabo', set: 'OP02', rarity: 'SR', color: 'Red', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Revolutionary Army' },
  { cardNumber: 'OP02-007', name: 'Marco', set: 'OP02', rarity: 'SR', color: 'Green', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-008', name: 'Edward.Newgate', set: 'OP02', rarity: 'SEC', color: 'Green', cost: 10, power: 12000, type: 'Character', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-009', name: 'Boa.Hancock', set: 'OP02', rarity: 'SR', color: 'Blue', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Kuja Pirates' },
  { cardNumber: 'OP02-010', name: 'Donquixote.Doflamingo', set: 'OP02', rarity: 'SR', color: 'Purple', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Donquixote Pirates' },
  { cardNumber: 'OP02-011', name: 'Jozu', set: 'OP02', rarity: 'R', color: 'Green', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-012', name: 'Vista', set: 'OP02', rarity: 'R', color: 'Green', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-013', name: 'Squard', set: 'OP02', rarity: 'UC', color: 'Green', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-014', name: 'Izou', set: 'OP02', rarity: 'UC', color: 'Green', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Whitebeard Pirates' },
  { cardNumber: 'OP02-015', name: 'Tashigi', set: 'OP02', rarity: 'R', color: 'Blue', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Navy' },
  { cardNumber: 'OP02-016', name: 'Hina', set: 'OP02', rarity: 'UC', color: 'Blue', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Navy' },
  { cardNumber: 'OP02-017', name: 'Crocodile', set: 'OP02', rarity: 'SR', color: 'Purple', cost: 7, power: 7000, type: 'Character', category: 'Baroque Works' },
  { cardNumber: 'OP02-018', name: 'Daz.Bonez', set: 'OP02', rarity: 'R', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Baroque Works' },
  { cardNumber: 'OP02-019', name: 'Bentham', set: 'OP02', rarity: 'UC', color: 'Purple', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Baroque Works' },
  { cardNumber: 'OP02-020', name: 'Emporio.Ivankov', set: 'OP02', rarity: 'R', color: 'Red', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Revolutionary Army' },
  
  // OP03 - Pillars of Strength
  { cardNumber: 'OP03-001', name: 'Charlotte.Katakuri', set: 'OP03', rarity: 'L', color: 'Purple', cost: 0, power: 5000, type: 'Leader', category: 'Big Mom Pirates' },
  { cardNumber: 'OP03-002', name: 'Sakazuki', set: 'OP03', rarity: 'L', color: 'Red', cost: 0, power: 5000, type: 'Leader', category: 'Navy' },
  { cardNumber: 'OP03-003', name: 'Magellan', set: 'OP03', rarity: 'L', color: 'Black', cost: 0, power: 5000, type: 'Leader', category: 'Impel Down' },
  { cardNumber: 'OP03-004', name: 'Monkey.D.Luffy', set: 'OP03', rarity: 'SR', color: 'Red', cost: 7, power: 7000, type: 'Character', category: 'Straw Hat Crew' },
  { cardNumber: 'OP03-005', name: 'Sabo', set: 'OP03', rarity: 'SR', color: 'Red', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Revolutionary Army' },
  { cardNumber: 'OP03-006', name: 'Roronoa.Zoro', set: 'OP03', rarity: 'SR', color: 'Green', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Straw Hat Crew' },
  { cardNumber: 'OP03-007', name: 'Kaido', set: 'OP03', rarity: 'SEC', color: 'Purple', cost: 10, power: 12000, type: 'Character', category: 'The Four Emperors' },
  { cardNumber: 'OP03-008', name: 'Charlotte.Linlin', set: 'OP03', rarity: 'SR', color: 'Purple', cost: 9, power: 10000, type: 'Character', category: 'Big Mom Pirates' },
  { cardNumber: 'OP03-009', name: 'Perona', set: 'OP03', rarity: 'R', color: 'Black', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Thriller Bark Pirates' },
  { cardNumber: 'OP03-010', name: 'Dracule.Mihawk', set: 'OP03', rarity: 'SR', color: 'Black', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Seven Warlords' },
  { cardNumber: 'OP03-011', name: 'Charlotte.Cracker', set: 'OP03', rarity: 'R', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Big Mom Pirates' },
  { cardNumber: 'OP03-012', name: 'Charlotte.Smoothie', set: 'OP03', rarity: 'R', color: 'Purple', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Big Mom Pirates' },
  { cardNumber: 'OP03-013', name: 'Charlotte.Perospero', set: 'OP03', rarity: 'UC', color: 'Purple', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Big Mom Pirates' },
  { cardNumber: 'OP03-014', name: 'Hannyabal', set: 'OP03', rarity: 'R', color: 'Black', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Impel Down' },
  { cardNumber: 'OP03-015', name: 'Sadi', set: 'OP03', rarity: 'UC', color: 'Black', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Impel Down' },
]

async function main() {
  console.log('Adding more cards to database...')
  console.log(`Total cards to add: ${moreCards.length}`)
  
  let imported = 0
  
  for (const cardData of moreCards) {
    const card = await prisma.card.upsert({
      where: { cardNumber: cardData.cardNumber },
      update: {},
      create: cardData
    })
    
    const basePrice = 
      cardData.rarity === 'SEC' ? 50 + Math.random() * 100 :
      cardData.rarity === 'SR' ? 10 + Math.random() * 40 :
      cardData.rarity === 'R' ? 2 + Math.random() * 8 :
      cardData.rarity === 'L' ? 5 + Math.random() * 15 :
      cardData.rarity === 'UC' ? 0.5 + Math.random() * 2 :
      0.25 + Math.random() * 1
    
    const existingPrices = await prisma.priceHistory.count({
      where: { cardId: card.id }
    })
    
    if (existingPrices === 0) {
      for (let i = 0; i < 30; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        const priceVariation = (Math.random() - 0.5) * 0.2
        const price = basePrice * (1 + priceVariation)
        
        await prisma.priceHistory.create({
          data: {
            cardId: card.id,
            price: parseFloat(price.toFixed(2)),
            condition: 'NM',
            source: 'market',
            timestamp: date
          }
        })
      }
    }
    
    imported++
    if (imported % 10 === 0) {
      console.log(`Progress: ${imported}/${moreCards.length}`)
    }
  }
  
  console.log(`\n✓ Added ${imported} cards`)
  console.log(`Total cards in database: ${await prisma.card.count()}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
