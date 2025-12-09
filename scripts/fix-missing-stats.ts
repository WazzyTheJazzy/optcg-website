import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMissingStats() {
  console.log('🔧 Fixing cards with missing stats...\n');
  
  // Strategy: For alternate art cards (like OP01-001_alt1), copy stats from base card (OP01-001)
  
  const cardsWithMissingData = await prisma.card.findMany({
    where: {
      OR: [
        { power: null, type: { in: ['Character', 'Leader'] } },
        { cost: null, type: { in: ['Character', 'Event', 'Stage'] } }
      ]
    }
  });
  
  console.log(`Found ${cardsWithMissingData.length} cards with missing stats\n`);
  
  let fixed = 0;
  let notFixed = 0;
  
  for (const card of cardsWithMissingData) {
    // Check if this is an alternate art card
    if (card.cardNumber.includes('_alt')) {
      const baseCardNumber = card.cardNumber.split('_')[0];
      const baseCard = await prisma.card.findUnique({
        where: { cardNumber: baseCardNumber }
      });
      
      if (baseCard) {
        console.log(`   Fixing ${card.cardNumber} from base card ${baseCardNumber}`);
        
        await prisma.card.update({
          where: { id: card.id },
          data: {
            power: card.power ?? baseCard.power,
            cost: card.cost ?? baseCard.cost,
            counter: card.counter ?? baseCard.counter,
            effect: card.effect ?? baseCard.effect,
            life: card.life ?? baseCard.life
          }
        });
        
        fixed++;
      } else {
        console.log(`   ⚠️  No base card found for ${card.cardNumber}`);
        notFixed++;
      }
    } else {
      // Not an alt card, might be genuinely missing from API
      console.log(`   ⚠️  ${card.cardNumber} - ${card.name} missing data (not an alt card)`);
      notFixed++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} cards`);
  console.log(`⚠️  Could not fix ${notFixed} cards\n`);
  
  // Re-check completeness
  console.log('📊 Updated Completeness:\n');
  
  const total = await prisma.card.count();
  const donCards = await prisma.card.count({ where: { type: 'DON' } });
  
  // Effect: All cards except DON should have effects (but vanilla cards won't)
  const hasEffect = await prisma.card.count({ 
    where: { effect: { not: null } } 
  });
  console.log(`Effects: ${hasEffect}/${total} (${(hasEffect/total*100).toFixed(1)}%)`);
  
  // Power: Characters and Leaders should have power
  const shouldHavePower = await prisma.card.count({ 
    where: { type: { in: ['Character', 'Leader'] } } 
  });
  const hasPower = await prisma.card.count({ 
    where: { power: { not: null }, type: { in: ['Character', 'Leader'] } } 
  });
  console.log(`Power: ${hasPower}/${shouldHavePower} (${(hasPower/shouldHavePower*100).toFixed(1)}%)`);
  
  // Cost: Characters, Events, and Stages should have cost
  const shouldHaveCost = await prisma.card.count({ 
    where: { type: { in: ['Character', 'Event', 'Stage'] } } 
  });
  const hasCost = await prisma.card.count({ 
    where: { cost: { not: null }, type: { in: ['Character', 'Event', 'Stage'] } } 
  });
  console.log(`Cost: ${hasCost}/${shouldHaveCost} (${(hasCost/shouldHaveCost*100).toFixed(1)}%)`);
  
  await prisma.$disconnect();
}

fixMissingStats();
