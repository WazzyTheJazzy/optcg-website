import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sampleCards = [
  {
    cardNumber: 'OP01-001',
    name: 'Monkey.D.Luffy',
    set: 'OP01',
    rarity: 'L',
    color: 'Red',
    cost: 0,
    power: 5000,
    type: 'Leader',
    category: 'Straw Hat Crew',
    effect: '[DON!! x1] [When Attacking] Give up to 1 of your Leader or Character cards +1000 power during this battle.'
  },
  {
    cardNumber: 'OP01-002',
    name: 'Roronoa Zoro',
    set: 'OP01',
    rarity: 'SR',
    color: 'Green',
    cost: 4,
    power: 5000,
    counter: 1000,
    type: 'Character',
    category: 'Straw Hat Crew',
    effect: '[On Play] K.O. up to 1 of your opponent\'s Characters with 3000 power or less.'
  },
  {
    cardNumber: 'OP01-016',
    name: 'Nami',
    set: 'OP01',
    rarity: 'R',
    color: 'Red',
    cost: 1,
    power: 2000,
    counter: 1000,
    type: 'Character',
    category: 'Straw Hat Crew',
    effect: '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add it to your hand. Then, place the rest at the bottom of your deck in any order.'
  },
  {
    cardNumber: 'OP01-025',
    name: 'Sanji',
    set: 'OP01',
    rarity: 'SR',
    color: 'Red',
    cost: 4,
    power: 5000,
    counter: 1000,
    type: 'Character',
    category: 'Straw Hat Crew',
    effect: '[On Play] If your opponent has 6 or more cards in their hand, this Character gains [Rush] during this turn.'
  },
  {
    cardNumber: 'OP01-031',
    name: 'Nico Robin',
    set: 'OP01',
    rarity: 'R',
    color: 'Purple',
    cost: 3,
    power: 4000,
    counter: 1000,
    type: 'Character',
    category: 'Straw Hat Crew',
    effect: '[Blocker]'
  },
  {
    cardNumber: 'OP01-047',
    name: 'Trafalgar Law',
    set: 'OP01',
    rarity: 'SR',
    color: 'Blue',
    cost: 5,
    power: 6000,
    counter: 1000,
    type: 'Character',
    category: 'Heart Pirates',
    effect: '[On Play] Return up to 1 Character with a cost of 3 or less to the owner\'s hand.'
  },
  {
    cardNumber: 'OP01-060',
    name: 'Portgas.D.Ace',
    set: 'OP01',
    rarity: 'SR',
    color: 'Red',
    cost: 5,
    power: 6000,
    counter: 1000,
    type: 'Character',
    category: 'Whitebeard Pirates',
    effect: '[On Play] K.O. up to 1 of your opponent\'s Characters with 5000 power or less.'
  },
  {
    cardNumber: 'OP01-070',
    name: 'Edward.Newgate',
    set: 'OP01',
    rarity: 'SEC',
    color: 'Red',
    cost: 10,
    power: 12000,
    type: 'Character',
    category: 'The Four Emperors, Whitebeard Pirates',
    effect: '[On Play] K.O. up to 1 of your opponent\'s Characters with a cost of 10 or less.'
  },
  {
    cardNumber: 'OP02-001',
    name: 'Eustass"Captain"Kid',
    set: 'OP02',
    rarity: 'L',
    color: 'Red, Purple',
    cost: 0,
    power: 5000,
    type: 'Leader',
    category: 'Kid Pirates',
    effect: '[Activate: Main] [Once Per Turn] Give up to 1 of your opponent\'s Characters -2000 power during this turn.'
  },
  {
    cardNumber: 'OP02-013',
    name: 'Donquixote Doflamingo',
    set: 'OP02',
    rarity: 'SR',
    color: 'Purple',
    cost: 5,
    power: 6000,
    counter: 1000,
    type: 'Character',
    category: 'The Seven Warlords of the Sea, Donquixote Pirates',
    effect: '[On Play] Return up to 1 Character with a cost of 4 or less to the owner\'s hand.'
  },
  {
    cardNumber: 'OP03-001',
    name: 'Charlotte Katakuri',
    set: 'OP03',
    rarity: 'L',
    color: 'Purple',
    cost: 0,
    power: 5000,
    type: 'Leader',
    category: 'Big Mom Pirates',
    effect: '[Activate: Main] [Once Per Turn] You may trash 1 card from your hand: This Leader gains +1000 power during this turn.'
  },
  {
    cardNumber: 'OP03-040',
    name: 'Kaido',
    set: 'OP03',
    rarity: 'SEC',
    color: 'Purple',
    cost: 10,
    power: 12000,
    type: 'Character',
    category: 'The Four Emperors, Beast Pirates',
    effect: '[On Play] K.O. up to 1 of your opponent\'s Characters with a cost of 7 or less.'
  },
  {
    cardNumber: 'OP04-001',
    name: 'Crocodile',
    set: 'OP04',
    rarity: 'L',
    color: 'Black',
    cost: 0,
    power: 5000,
    type: 'Leader',
    category: 'The Seven Warlords of the Sea, Baroque Works',
    effect: '[Activate: Main] [Once Per Turn] Give up to 1 of your opponent\'s Characters -3000 power during this turn.'
  },
  {
    cardNumber: 'OP04-083',
    name: 'Shanks',
    set: 'OP04',
    rarity: 'SEC',
    color: 'Red',
    cost: 9,
    power: 10000,
    type: 'Character',
    category: 'The Four Emperors, Red-Haired Pirates',
    effect: '[On Play] Return up to 1 Character with a cost of 7 or less to the owner\'s hand.'
  },
  {
    cardNumber: 'OP05-001',
    name: 'Monkey.D.Luffy',
    set: 'OP05',
    rarity: 'L',
    color: 'Red, Green',
    cost: 0,
    power: 5000,
    type: 'Leader',
    category: 'Straw Hat Crew',
    effect: '[Activate: Main] [Once Per Turn] Give up to 1 of your Characters +2000 power during this turn.'
  }
]

async function main() {
  console.log('Starting seed...')

  for (const cardData of sampleCards) {
    const card = await prisma.card.create({
      data: cardData
    })

    const basePrice = 
      cardData.rarity === 'SEC' ? 50 + Math.random() * 100 :
      cardData.rarity === 'SR' ? 10 + Math.random() * 40 :
      cardData.rarity === 'R' ? 2 + Math.random() * 8 :
      cardData.rarity === 'L' ? 5 + Math.random() * 15 :
      0.5 + Math.random() * 2

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

    console.log(`Created card: ${card.name}`)
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
