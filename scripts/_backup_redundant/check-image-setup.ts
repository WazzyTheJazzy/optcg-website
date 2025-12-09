import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkImageSetup() {
  const card = await prisma.card.findFirst()
  console.log('Sample card:', JSON.stringify(card, null, 2))
  await prisma.$disconnect()
}

checkImageSetup()
