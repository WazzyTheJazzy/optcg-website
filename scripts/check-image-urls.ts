import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImageUrls() {
  // Get a few sample cards
  const cards = await prisma.card.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
  });

  console.log('Sample cards from database:');
  cards.forEach(card => {
    console.log(`- ${card.id} (${card.name}): imageUrl = ${card.imageUrl || 'NULL'}`);
  });

  await prisma.$disconnect();
}

checkImageUrls().catch(console.error);
