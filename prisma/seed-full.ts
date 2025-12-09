import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const allCards = [
  // OP01 - Romance Dawn
  { cardNumber: 'OP01-001', name: 'Monkey.D.Luffy', set: 'OP01', rarity: 'L', color: 'Red', cost: 0, power: 5000, type: 'Leader', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_001_EN.webp' },
  { cardNumber: 'OP01-002', name: 'Roronoa.Zoro', set: 'OP01', rarity: 'L', color: 'Green', cost: 0, power: 5000, type: 'Leader', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_002_EN.webp' },
  { cardNumber: 'OP01-003', name: 'Nami', set: 'OP01', rarity: 'L', color: 'Blue', cost: 0, power: 5000, type: 'Leader', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_003_EN.webp' },
  { cardNumber: 'OP01-004', name: 'Kaido', set: 'OP01', rarity: 'L', color: 'Purple', cost: 0, power: 5000, type: 'Leader', category: 'The Four Emperors', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_004_EN.webp' },
  { cardNumber: 'OP01-005', name: 'Uta', set: 'OP01', rarity: 'SR', color: 'Red', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'FILM', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_005_EN.webp' },
  { cardNumber: 'OP01-006', name: 'Otama', set: 'OP01', rarity: 'C', color: 'Red', cost: 1, power: 2000, type: 'Character', category: 'Land of Wano', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_006_EN.webp' },
  { cardNumber: 'OP01-007', name: 'Koby', set: 'OP01', rarity: 'R', color: 'Red', cost: 1, power: 2000, counter: 1000, type: 'Character', category: 'Navy', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_007_EN.webp' },
  { cardNumber: 'OP01-008', name: 'Gol.D.Roger', set: 'OP01', rarity: 'SR', color: 'Red', cost: 9, power: 10000, type: 'Character', category: 'Roger Pirates', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_008_EN.webp' },
  { cardNumber: 'OP01-009', name: 'Sakazuki', set: 'OP01', rarity: 'R', color: 'Red', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Navy', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_009_EN.webp' },
  { cardNumber: 'OP01-010', name: 'Jinbe', set: 'OP01', rarity: 'UC', color: 'Red', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Fish-Man', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_010_EN.webp' },
  { cardNumber: 'OP01-011', name: 'Shanks', set: 'OP01', rarity: 'SEC', color: 'Red', cost: 9, power: 10000, type: 'Character', category: 'The Four Emperors', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_011_EN.webp' },
  { cardNumber: 'OP01-012', name: 'Jewelry.Bonney', set: 'OP01', rarity: 'C', color: 'Red', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Supernovas', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_012_EN.webp' },
  { cardNumber: 'OP01-013', name: 'Tony.Tony.Chopper', set: 'OP01', rarity: 'C', color: 'Red', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_013_EN.webp' },
  { cardNumber: 'OP01-014', name: 'Nami', set: 'OP01', rarity: 'UC', color: 'Red', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_014_EN.webp' },
  { cardNumber: 'OP01-015', name: 'Nami', set: 'OP01', rarity: 'C', color: 'Red', cost: 1, power: 1000, counter: 2000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_015_EN.webp' },
  { cardNumber: 'OP01-016', name: 'Nami', set: 'OP01', rarity: 'R', color: 'Red', cost: 1, power: 2000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_016_EN.webp' },
  { cardNumber: 'OP01-017', name: 'Nefeltari.Vivi', set: 'OP01', rarity: 'SR', color: 'Red', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Alabasta', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_017_EN.webp' },
  { cardNumber: 'OP01-018', name: 'Helmeppo', set: 'OP01', rarity: 'C', color: 'Red', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Navy', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_018_EN.webp' },
  { cardNumber: 'OP01-019', name: 'Borsalino', set: 'OP01', rarity: 'R', color: 'Red', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Navy', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_019_EN.webp' },
  { cardNumber: 'OP01-020', name: 'Portgas.D.Ace', set: 'OP01', rarity: 'SR', color: 'Red', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Whitebeard Pirates', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_020_EN.webp' },
  { cardNumber: 'OP01-021', name: 'Monkey.D.Luffy', set: 'OP01', rarity: 'C', color: 'Red', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_021_EN.webp' },
  { cardNumber: 'OP01-022', name: 'Monkey.D.Luffy', set: 'OP01', rarity: 'UC', color: 'Red', cost: 5, power: 6000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_022_EN.webp' },
  { cardNumber: 'OP01-023', name: 'Monkey.D.Luffy', set: 'OP01', rarity: 'C', color: 'Red', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_023_EN.webp' },
  { cardNumber: 'OP01-024', name: 'Monkey.D.Luffy', set: 'OP01', rarity: 'SR', color: 'Red', cost: 8, power: 8000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_024_EN.webp' },
  { cardNumber: 'OP01-025', name: 'Sanji', set: 'OP01', rarity: 'SR', color: 'Red', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_025_EN.webp' },
  { cardNumber: 'OP01-026', name: 'Usopp', set: 'OP01', rarity: 'C', color: 'Green', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_026_EN.webp' },
  { cardNumber: 'OP01-027', name: 'Urouge', set: 'OP01', rarity: 'UC', color: 'Green', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Supernovas', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_027_EN.webp' },
  { cardNumber: 'OP01-028', name: 'Kaku', set: 'OP01', rarity: 'R', color: 'Green', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'CP9', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_028_EN.webp' },
  { cardNumber: 'OP01-029', name: 'Killer', set: 'OP01', rarity: 'UC', color: 'Green', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Kid Pirates', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_029_EN.webp' },
  { cardNumber: 'OP01-030', name: 'Kuzan', set: 'OP01', rarity: 'R', color: 'Green', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Navy', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_030_EN.webp' },
  { cardNumber: 'OP01-031', name: 'Nico.Robin', set: 'OP01', rarity: 'R', color: 'Green', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_031_EN.webp' },
  { cardNumber: 'OP01-032', name: 'Roronoa.Zoro', set: 'OP01', rarity: 'C', color: 'Green', cost: 2, power: 3000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_032_EN.webp' },
  { cardNumber: 'OP01-033', name: 'Roronoa.Zoro', set: 'OP01', rarity: 'SR', color: 'Green', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_033_EN.webp' },
  { cardNumber: 'OP01-034', name: 'Roronoa.Zoro', set: 'OP01', rarity: 'UC', color: 'Green', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_034_EN.webp' },
  { cardNumber: 'OP01-035', name: 'Arlong', set: 'OP01', rarity: 'R', color: 'Blue', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Fish-Man', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_035_EN.webp' },
  { cardNumber: 'OP01-036', name: 'Issho', set: 'OP01', rarity: 'SR', color: 'Blue', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Navy', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_036_EN.webp' },
  { cardNumber: 'OP01-037', name: 'Nami', set: 'OP01', rarity: 'SR', color: 'Blue', cost: 3, power: 4000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_037_EN.webp' },
  { cardNumber: 'OP01-038', name: 'Nami', set: 'OP01', rarity: 'C', color: 'Blue', cost: 1, power: 2000, counter: 1000, type: 'Character', category: 'Straw Hat Crew', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_038_EN.webp' },
  { cardNumber: 'OP01-039', name: 'Trafalgar.Law', set: 'OP01', rarity: 'SR', color: 'Blue', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Heart Pirates', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_039_EN.webp' },
  { cardNumber: 'OP01-040', name: 'Donquixote.Doflamingo', set: 'OP01', rarity: 'R', color: 'Blue', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'Donquixote Pirates', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_040_EN.webp' },
  { cardNumber: 'OP01-041', name: 'Kaido', set: 'OP01', rarity: 'SR', color: 'Purple', cost: 10, power: 12000, type: 'Character', category: 'The Four Emperors', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_041_EN.webp' },
  { cardNumber: 'OP01-042', name: 'Charlotte.Katakuri', set: 'OP01', rarity: 'SR', color: 'Purple', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Big Mom Pirates', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_042_EN.webp' },
  { cardNumber: 'OP01-043', name: 'Charlotte.Linlin', set: 'OP01', rarity: 'SR', color: 'Purple', cost: 8, power: 8000, type: 'Character', category: 'The Four Emperors', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_043_EN.webp' },
  { cardNumber: 'OP01-044', name: 'Gecko.Moria', set: 'OP01', rarity: 'R', color: 'Purple', cost: 5, power: 6000, counter: 1000, type: 'Character', category: 'Thriller Bark Pirates', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_044_EN.webp' },
  { cardNumber: 'OP01-045', name: 'Rob.Lucci', set: 'OP01', rarity: 'R', color: 'Purple', cost: 4, power: 5000, counter: 1000, type: 'Character', category: 'CP9', imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_045_EN.webp' },
]

async function main() {
  console.log('Starting full card database seed...')
  console.log(`Total cards to import: ${allCards.length}`)
  
  let imported = 0
  let skipped = 0
  
  for (const cardData of allCards) {
    try {
      const card = await prisma.card.upsert({
        where: { cardNumber: cardData.cardNumber },
        update: {},
        create: cardData
      })
      
      // Generate price history for each card
      const basePrice = 
        cardData.rarity === 'SEC' ? 50 + Math.random() * 100 :
        cardData.rarity === 'SR' ? 10 + Math.random() * 40 :
        cardData.rarity === 'R' ? 2 + Math.random() * 8 :
        cardData.rarity === 'L' ? 5 + Math.random() * 15 :
        cardData.rarity === 'UC' ? 0.5 + Math.random() * 2 :
        0.25 + Math.random() * 1
      
      // Check if price history already exists
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
        console.log(`Progress: ${imported}/${allCards.length} cards imported...`)
      }
    } catch (error) {
      console.error(`Error importing ${cardData.cardNumber}:`, error)
      skipped++
    }
  }
  
  console.log('\n=== Import Complete ===')
  console.log(`✓ Successfully imported: ${imported} cards`)
  console.log(`✗ Skipped: ${skipped} cards`)
  console.log(`Total cards in database: ${await prisma.card.count()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
