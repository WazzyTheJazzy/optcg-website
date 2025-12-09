import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  console.log('🔍 Verifying imported card data...\n');
  
  // Get some popular characters
  const luffy = await prisma.card.findFirst({
    where: { 
      name: { contains: 'Monkey D. Luffy' },
      type: 'Leader'
    }
  });
  
  const zoro = await prisma.card.findFirst({
    where: { 
      name: { contains: 'Roronoa Zoro' },
      type: 'Character'
    }
  });
  
  const ace = await prisma.card.findFirst({
    where: { 
      name: { contains: 'Portgas D. Ace' }
    }
  });
  
  console.log('📋 Sample Character Cards:\n');
  
  [luffy, zoro, ace].forEach(card => {
    if (card) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${card.name} (${card.cardNumber})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Type: ${card.type}`);
      console.log(`Color: ${card.color}`);
      console.log(`Set: ${card.set}`);
      console.log(`Rarity: ${card.rarity}`);
      if (card.cost !== null) console.log(`Cost: ${card.cost}`);
      if (card.power !== null) console.log(`Power: ${card.power}`);
      if (card.counter !== null) console.log(`Counter: ${card.counter}`);
      if (card.life !== null) console.log(`Life: ${card.life}`);
      if (card.category) console.log(`Category: ${card.category}`);
      if (card.effect) console.log(`Effect: ${card.effect}`);
      if (card.imageUrl) console.log(`Image: ✅`);
      console.log('');
    }
  });
  
  // Statistics by type
  console.log('📊 Cards by Type:\n');
  const types = await prisma.card.groupBy({
    by: ['type'],
    _count: true,
    orderBy: { _count: { type: 'desc' } }
  });
  
  types.forEach(t => {
    console.log(`   ${t.type}: ${t._count} cards`);
  });
  
  console.log('\n📊 Cards by Color:\n');
  const colors = await prisma.card.groupBy({
    by: ['color'],
    _count: true,
    orderBy: { _count: { color: 'desc' } }
  });
  
  colors.forEach(c => {
    console.log(`   ${c.color}: ${c._count} cards`);
  });
  
  console.log('\n📊 Cards by Set (Top 10):\n');
  const sets = await prisma.card.groupBy({
    by: ['set'],
    _count: true,
    orderBy: { _count: { set: 'desc' } },
    take: 10
  });
  
  sets.forEach(s => {
    console.log(`   ${s.set}: ${s._count} cards`);
  });
  
  await prisma.$disconnect();
}

verifyImport();
