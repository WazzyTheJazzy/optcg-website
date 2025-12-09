import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Verifying card images...\n')
  
  // Get total count
  const total = await prisma.card.count()
  const withImages = await prisma.card.count({
    where: { imageUrl: { not: null } }
  })
  
  console.log(`Total cards: ${total}`)
  console.log(`Cards with images: ${withImages}`)
  console.log(`Coverage: ${((withImages / total) * 100).toFixed(1)}%\n`)
  
  // Sample from each set
  const sets = ['OP01', 'OP02', 'OP03', 'OP04', 'OP05']
  
  for (const set of sets) {
    const sample = await prisma.card.findFirst({
      where: { set },
      orderBy: { cardNumber: 'asc' }
    })
    
    if (sample) {
      console.log(`${sample.cardNumber} - ${sample.name}`)
      console.log(`  ${sample.imageUrl}\n`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
