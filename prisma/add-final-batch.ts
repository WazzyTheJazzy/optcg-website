import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const finalBatch = [
  // OP04 - Kingdoms of Intrigue
  { cardNumber: 'OP04-001', name: 'Crocodile', set: 'OP04', rarity: 'L', color: 'Black', cost: 0, power: 5000, type: 'Leader', category: 'Baroque Works' },
  { cardNumber: 'OP04-002', name: 'Donquixote.Doflamingo', set: 'OP04', rarity: 'L', color: 'Purple/Black', cost: 0, power: 5000, type: 'Leader', category: 'Donquixote Pirates' },
  { cardNumber: 'OP04-003', name: 'Nefeltari.Vivi', set: 'OP04', rarity: 'L', color: 'Blue', cost: 0, power: 5000, type: 'Leader', category: 'Alabasta' },
  { cardNumber: 'OP04-004', name: 'Monkey.D.Luffy', set: 'OP04', rarity: 'SR', color: 'Red', cost: 6, power: 7000, type: 'Character', category: 'Straw Hat Crew' },
  { cardNumber: 'OP04-005', name: 'Shanks', set: 'OP04', rarity: 'SEC', color: 'Red', cost: 9, power: 10000, type: 'Character', category: 'Red Hair Pirates' },
  { cardNumber: 'OP04-006', name: 'Nico.Robin', set: 'OP04', rarity: 'SR', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Straw Hat Crew' },
  { cardNumber: 'OP04-007', name: 'Crocodile', set: 'OP04', rarity: 'SR', color: 'Black', cost: 7, power: 7000, type: 'Character', category: 'Baroque Works' },
  { cardNumber: 'OP04-008', name: 'Rebecca', set: 'OP04', rarity: 'R', color: 'Blue', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Dressrosa' },
  { cardNumber: 'OP04-009', name: 'Kyros', set: 'OP04', rarity: 'R', color: 'Blue', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Dressrosa' },
  { cardNumber: 'OP04-010', name: 'Viola', set: 'OP04', rarity: 'UC', color: 'Blue', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Dressrosa' },
  { cardNumber: 'OP04-011', name: 'Trebol', set: 'OP04', rarity: 'R', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Donquixote Pirates' },
  { cardNumber: 'OP04-012', name: 'Diamante', set: 'OP04', rarity: 'R', color: 'Purple', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Donquixote Pirates' },
  { cardNumber: 'OP04-013', name: 'Pica', set: 'OP04', rarity: 'R', color: 'Purple', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Donquixote Pirates' },
  { cardNumber: 'OP04-014', name: 'Vergo', set: 'OP04', rarity: 'UC', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Donquixote Pirates' },
  { cardNumber: 'OP04-015', name: 'Baby5', set: 'OP04', rarity: 'C', color: 'Purple', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Donquixote Pirates' },
  
  // OP05 - Awakening of the New Era
  { cardNumber: 'OP05-001', name: 'Monkey.D.Luffy', set: 'OP05', rarity: 'L', color: 'Red/Green', cost: 0, power: 5000, type: 'Leader', category: 'Straw Hat Crew' },
  { cardNumber: 'OP05-002', name: 'Trafalgar.Law', set: 'OP05', rarity: 'L', color: 'Blue/Purple', cost: 0, power: 5000, type: 'Leader', category: 'Heart Pirates' },
  { cardNumber: 'OP05-003', name: 'Eustass.Kid', set: 'OP05', rarity: 'L', color: 'Red/Purple', cost: 0, power: 5000, type: 'Leader', category: 'Kid Pirates' },
  { cardNumber: 'OP05-004', name: 'Monkey.D.Luffy', set: 'OP05', rarity: 'SEC', color: 'Red', cost: 10, power: 12000, type: 'Character', category: 'Straw Hat Crew' },
  { cardNumber: 'OP05-005', name: 'Roronoa.Zoro', set: 'OP05', rarity: 'SR', color: 'Green', cost: 6, power: 7000, type: 'Character', category: 'Straw Hat Crew' },
  { cardNumber: 'OP05-006', name: 'Sanji', set: 'OP05', rarity: 'SR', color: 'Red', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Straw Hat Crew' },
  { cardNumber: 'OP05-007', name: 'Trafalgar.Law', set: 'OP05', rarity: 'SR', color: 'Blue', cost: 6, power: 7000, type: 'Character', category: 'Heart Pirates' },
  { cardNumber: 'OP05-008', name: 'Eustass.Kid', set: 'OP05', rarity: 'SR', color: 'Purple', cost: 6, power: 7000, type: 'Character', category: 'Kid Pirates' },
  { cardNumber: 'OP05-009', name: 'Yamato', set: 'OP05', rarity: 'SR', color: 'Green', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Land of Wano' },
  { cardNumber: 'OP05-010', name: 'Kozuki.Oden', set: 'OP05', rarity: 'SR', color: 'Green', cost: 8, power: 9000, type: 'Character', category: 'Land of Wano' },
  { cardNumber: 'OP05-011', name: 'Bepo', set: 'OP05', rarity: 'R', color: 'Blue', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Heart Pirates' },
  { cardNumber: 'OP05-012', name: 'Killer', set: 'OP05', rarity: 'R', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Kid Pirates' },
  { cardNumber: 'OP05-013', name: 'King', set: 'OP05', rarity: 'SR', color: 'Purple', cost: 7, power: 8000, type: 'Character', category: 'Beast Pirates' },
  { cardNumber: 'OP05-014', name: 'Queen', set: 'OP05', rarity: 'R', color: 'Purple', cost: 6, power: 7000, counter: 1000, type: 'Character', category: 'Beast Pirates' },
  { cardNumber: 'OP05-015', name: 'Jack', set: 'OP05', rarity: 'R', color: 'Purple', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Beast Pirates' },
  { cardNumber: 'OP05-016', name: 'Ulti', set: 'OP05', rarity: 'UC', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Beast Pirates' },
  { cardNumber: 'OP05-017', name: 'Page.One', set: 'OP05', rarity: 'UC', color: 'Purple', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Beast Pirates' },
  { cardNumber: 'OP05-018', name: 'X.Drake', set: 'OP05', rarity: 'R', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Beast Pirates' },
  { cardNumber: 'OP05-019', name: 'Basil.Hawkins', set: 'OP05', rarity: 'UC', color: 'Purple', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Hawkins Pirates' },
  { cardNumber: 'OP05-020', name: 'Scratchmen.Apoo', set: 'OP05', rarity: 'UC', color: 'Purple', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'On Air Pirates' },
]

async function main() {
  console.log('Adding final batch of cards...')
  console.log(`Cards to add: ${finalBatch.length}`)
  
  let imported = 0
  
  for (const cardData of finalBatch) {
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
  }
  
  const total = await prisma.card.count()
  console.log(`\n✓ Added ${imported} cards`)
  console.log(`🎉 Total cards in database: ${total}`)
  console.log('\nDatabase is ready for testing!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
