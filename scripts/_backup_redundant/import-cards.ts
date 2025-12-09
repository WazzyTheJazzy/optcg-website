import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()

// One Piece TCG API endpoint
// Note: You may need to find a reliable API source
// Popular options: onepiece-cardgame.dev API, or scrape from official site
const API_URL = 'https://api.onepiece-cardgame.dev/cards' // Example - verify this exists

async function importFromAPI() {
  try {
    console.log('Fetching cards from API...')
    const response = await axios.get(API_URL)
    const cards = response.data
    
    console.log(`Found ${cards.length} cards to import`)
    
    for (const cardData of cards) {
      // Map API data to your schema
      await prisma.card.upsert({
        where: { cardNumber: cardData.number },
        update: {},
        create: {
          cardNumber: cardData.number,
          name: cardData.name,
          set: cardData.set,
          rarity: cardData.rarity,
          color: cardData.color,
          cost: cardData.cost,
          power: cardData.power,
          counter: cardData.counter,
          attribute: cardData.attribute,
          type: cardData.type,
          category: cardData.category,
          effect: cardData.effect,
          trigger: cardData.trigger,
          imageUrl: cardData.image
        }
      })
      
      console.log(`Imported: ${cardData.name}`)
    }
    
    console.log('Import completed!')
  } catch (error) {
    console.error('Error importing cards:', error)
  }
}

importFromAPI()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
