import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing D. names...\n')
  
  const cards = await prisma.card.findMany()
  
  let updated = 0
  
  for (const card of cards) {
    let fixedName = card.name
      .replace(/Monkey D Luffy/g, 'Monkey D. Luffy')
      .replace(/Portgas D Ace/g, 'Portgas D. Ace')
      .replace(/Gol D Roger/g, 'Gol D. Roger')
    
    if (fixedName !== card.name) {
      await prisma.card.update({
        where: { id: card.id },
        data: { name: fixedName }
      })
      
      console.log(`${card.cardNumber}: "${card.name}" → "${fixedName}"`)
      updated++
    }
  }
  
  console.log(`\n✓ Updated ${updated} card names`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
