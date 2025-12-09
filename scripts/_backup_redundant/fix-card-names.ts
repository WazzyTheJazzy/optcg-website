import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing card names...\n')
  
  const cards = await prisma.card.findMany()
  
  let updated = 0
  
  for (const card of cards) {
    // Fix common name issues
    let fixedName = card.name
      // Fix D. middle initial first (before general period replacement)
      .replace(/D\s+Luffy/g, 'D. Luffy')
      .replace(/D\s+Ace/g, 'D. Ace')
      .replace(/D\s+Roger/g, 'D. Roger')
      // Replace remaining periods with spaces in names
      .replace(/\./g, ' ')
      // Fix specific patterns
      .replace(/Roronoa Zoro/g, 'Roronoa Zoro')
      .replace(/Trafalgar Law/g, 'Trafalgar Law')
      .replace(/Tony Tony Chopper/g, 'Tony Tony Chopper')
      .replace(/Nico Robin/g, 'Nico Robin')
      .replace(/Nefeltari Vivi/g, 'Nefeltari Vivi')
      .replace(/Charlotte Katakuri/g, 'Charlotte Katakuri')
      .replace(/Charlotte Linlin/g, 'Charlotte Linlin')
      .replace(/Donquixote Doflamingo/g, 'Donquixote Doflamingo')
      .replace(/Gecko Moria/g, 'Gecko Moria')
      .replace(/Rob Lucci/g, 'Rob Lucci')
      .replace(/Jewelry Bonney/g, 'Jewelry Bonney')
      .replace(/Eustass Kid/g, 'Eustass "Captain" Kid')
      .replace(/Eustass"Captain"Kid/g, 'Eustass "Captain" Kid')
    
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
  console.log(`Total cards: ${cards.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
