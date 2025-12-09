import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeMissingData() {
  console.log('🔍 Analyzing cards with missing data...\n');
  
  // Cards without effects
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Cards WITHOUT Effect Text');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const noEffect = await prisma.card.findMany({
    where: { effect: null },
    select: { cardNumber: true, name: true, type: true, color: true },
    take: 20
  });
  
  console.log(`Total: ${await prisma.card.count({ where: { effect: null } })} cards\n`);
  
  // Group by type
  const noEffectByType = await prisma.card.groupBy({
    by: ['type'],
    where: { effect: null },
    _count: true,
    orderBy: { _count: { type: 'desc' } }
  });
  
  console.log('By Type:');
  noEffectByType.forEach(t => {
    console.log(`   ${t.type}: ${t._count} cards`);
  });
  
  console.log('\nSample cards:');
  noEffect.slice(0, 10).forEach(card => {
    console.log(`   ${card.cardNumber} - ${card.name} (${card.type})`);
  });
  
  // Cards without power
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💪 Cards WITHOUT Power Value');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const noPower = await prisma.card.findMany({
    where: { power: null },
    select: { cardNumber: true, name: true, type: true, color: true },
    take: 20
  });
  
  console.log(`Total: ${await prisma.card.count({ where: { power: null } })} cards\n`);
  
  // Group by type
  const noPowerByType = await prisma.card.groupBy({
    by: ['type'],
    where: { power: null },
    _count: true,
    orderBy: { _count: { type: 'desc' } }
  });
  
  console.log('By Type:');
  noPowerByType.forEach(t => {
    console.log(`   ${t.type}: ${t._count} cards`);
  });
  
  console.log('\nSample cards:');
  noPower.slice(0, 10).forEach(card => {
    console.log(`   ${card.cardNumber} - ${card.name} (${card.type})`);
  });
  
  // Cards without cost
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 Cards WITHOUT Cost Value');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const noCost = await prisma.card.findMany({
    where: { cost: null },
    select: { cardNumber: true, name: true, type: true, color: true },
    take: 20
  });
  
  console.log(`Total: ${await prisma.card.count({ where: { cost: null } })} cards\n`);
  
  // Group by type
  const noCostByType = await prisma.card.groupBy({
    by: ['type'],
    where: { cost: null },
    _count: true,
    orderBy: { _count: { type: 'desc' } }
  });
  
  console.log('By Type:');
  noCostByType.forEach(t => {
    console.log(`   ${t.type}: ${t._count} cards`);
  });
  
  console.log('\nSample cards:');
  noCost.slice(0, 10).forEach(card => {
    console.log(`   ${card.cardNumber} - ${card.name} (${card.type})`);
  });
  
  // Check if missing data is expected
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Expected Missing Data Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // DON cards shouldn't have effects, power, or cost
  const donCards = await prisma.card.count({ where: { type: 'DON' } });
  console.log(`DON cards: ${donCards} (should not have effect/power/cost)`);
  
  // Leaders shouldn't have cost
  const leaders = await prisma.card.count({ where: { type: 'Leader' } });
  const leadersWithCost = await prisma.card.count({ 
    where: { type: 'Leader', cost: { not: null } } 
  });
  console.log(`Leaders: ${leaders} total, ${leadersWithCost} have cost (should be 0 or null)`);
  
  // Events shouldn't have power
  const events = await prisma.card.count({ where: { type: 'Event' } });
  const eventsWithPower = await prisma.card.count({ 
    where: { type: 'Event', power: { not: null } } 
  });
  console.log(`Events: ${events} total, ${eventsWithPower} have power (should be 0)`);
  
  // Stages shouldn't have power
  const stages = await prisma.card.count({ where: { type: 'Stage' } });
  const stagesWithPower = await prisma.card.count({ 
    where: { type: 'Stage', power: { not: null } } 
  });
  console.log(`Stages: ${stages} total, ${stagesWithPower} have power (should be 0)`);
  
  // Calculate "expected" completeness
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Adjusted Completeness (Excluding Expected Nulls)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const total = await prisma.card.count();
  
  // Effect: All cards except DON should have effects
  const shouldHaveEffect = total - donCards;
  const hasEffect = await prisma.card.count({ 
    where: { effect: { not: null }, type: { not: 'DON' } } 
  });
  console.log(`Effects: ${hasEffect}/${shouldHaveEffect} (${(hasEffect/shouldHaveEffect*100).toFixed(1)}%)`);
  
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

analyzeMissingData();
