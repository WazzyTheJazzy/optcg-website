import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImageUrl() {
  try {
    // Get a sample card
    const card = await prisma.card.findFirst({
      where: { type: { not: 'DON' } }
    });

    if (card) {
      console.log('Sample card from database:');
      console.log(JSON.stringify({
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
        cardNumber: card.cardNumber,
        set: card.set,
      }, null, 2));
    } else {
      console.log('No cards found in database');
    }

    // Count cards with and without imageUrl
    const totalCards = await prisma.card.count({
      where: { type: { not: 'DON' } }
    });

    const cardsWithImageUrl = await prisma.card.count({
      where: {
        type: { not: 'DON' },
        imageUrl: { not: null }
      }
    });

    const cardsWithoutImageUrl = totalCards - cardsWithImageUrl;

    console.log('\nImage URL Statistics:');
    console.log(`Total cards: ${totalCards}`);
    console.log(`Cards with imageUrl: ${cardsWithImageUrl}`);
    console.log(`Cards without imageUrl: ${cardsWithoutImageUrl}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageUrl();
