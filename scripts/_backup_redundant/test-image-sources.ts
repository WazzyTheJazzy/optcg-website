// Test different image URL patterns to find which one works correctly

const testCards = [
  { cardNumber: 'OP01-001', expectedName: 'Monkey D. Luffy' },
  { cardNumber: 'OP01-002', expectedName: 'Roronoa Zoro' },
  { cardNumber: 'OP01-003', expectedName: 'Nami' },
]

const urlPatterns = [
  (card: string) => `https://en.onepiece-cardgame.com/images/cardlist/card/${card}.png`,
  (card: string) => {
    const [set, num] = card.split('-')
    return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${set}/${set}_${num}_EN.webp`
  },
  (card: string) => `https://onepiece-cardgame.dev/images/cards/${card}.jpg`,
]

console.log('Testing image URL patterns:\n')

testCards.forEach(card => {
  console.log(`${card.cardNumber} (${card.expectedName}):`)
  urlPatterns.forEach((pattern, i) => {
    console.log(`  Pattern ${i + 1}: ${pattern(card.cardNumber)}`)
  })
  console.log()
})

console.log('\nRecommendation: Test these URLs in your browser to see which shows the correct images')
console.log('Then we can update the database with the working pattern')
