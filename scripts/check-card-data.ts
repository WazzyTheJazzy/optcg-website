import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCardData() {
  try {
    const totalCards = await prisma.card.count();
    console.log(`\n📊 Total cards in database: ${totalCards}\n`);

    const sampleCards = await prisma.card.findMany({
      take: 3,
      orderBy: { cardNumber: 'asc' }
    });

    console.log('📋 Sample cards:\n');
    sampleCards.forEach(card => {
      console.log(`Card: ${card.name} (${card.cardNumber})`);
      console.log(`  Type: ${card.type}`);
      console.log(`  Color: ${card.color}`);
      console.log(`  Cost: ${card.cost ?? 'N/A'}`);
      console.log(`  Power: ${card.power ?? 'N/A'}`);
      console.log(`  Effect: ${card.effect ? card.effect.substring(0, 50) + '...' : 'None'}`);
      console.log(`  Image: ${card.imageUrl ? '✅' : '❌'}`);
      console.log('');
    });

    // Check how many cards have complete data
    const cardsWithEffect = await prisma.card.count({
      where: { effect: { not: null } }
    });
    const cardsWithImage = await prisma.card.count({
      where: { imageUrl: { not: null } }
    });
    const cardsWithPower = await prisma.card.count({
      where: { power: { not: null } }
    });

    console.log('📈 Data completeness:');
    console.log(`  Cards with effects: ${cardsWithEffect}/${totalCards}`);
    console.log(`  Cards with images: ${cardsWithImage}/${totalCards}`);
    console.log(`  Cards with power: ${cardsWithPower}/${totalCards}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCardData();
