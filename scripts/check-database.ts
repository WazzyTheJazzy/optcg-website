/**
 * Check Database Status
 * 
 * Verifies database connection and card count
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database status...\n');
    
    // Check card count
    const cardCount = await prisma.card.count();
    console.log(`📊 Total cards in database: ${cardCount}`);
    
    if (cardCount === 0) {
      console.log('\n⚠️  WARNING: No cards in database!');
      console.log('\n💡 To seed the database, run:');
      console.log('   npx prisma db seed');
      return;
    }
    
    // Get card breakdown by set
    const cardsBySet = await prisma.card.groupBy({
      by: ['set'],
      _count: true,
    });
    
    console.log('\n📦 Cards by set:');
    cardsBySet.forEach(({ set, _count }) => {
      console.log(`   ${set}: ${_count} cards`);
    });
    
    // Get card breakdown by type
    const cardsByType = await prisma.card.groupBy({
      by: ['type'],
      _count: true,
    });
    
    console.log('\n🃏 Cards by type:');
    cardsByType.forEach(({ type, _count }) => {
      console.log(`   ${type}: ${_count} cards`);
    });
    
    // Get card breakdown by rarity
    const cardsByRarity = await prisma.card.groupBy({
      by: ['rarity'],
      _count: true,
    });
    
    console.log('\n✨ Cards by rarity:');
    cardsByRarity.forEach(({ rarity, _count }) => {
      console.log(`   ${rarity}: ${_count} cards`);
    });
    
    // Check for cards with images
    const cardsWithImages = await prisma.card.count({
      where: {
        imageUrl: {
          not: null,
        },
      },
    });
    
    console.log(`\n🖼️  Cards with images: ${cardsWithImages}/${cardCount} (${Math.round(cardsWithImages/cardCount*100)}%)`);
    
    // Sample a few cards
    const sampleCards = await prisma.card.findMany({
      take: 3,
      select: {
        cardNumber: true,
        name: true,
        set: true,
        type: true,
        rarity: true,
      },
    });
    
    console.log('\n📋 Sample cards:');
    sampleCards.forEach(card => {
      console.log(`   ${card.cardNumber} - ${card.name} (${card.set}, ${card.type}, ${card.rarity})`);
    });
    
    console.log('\n✅ Database is operational');
    
  } catch (error) {
    console.error('\n❌ Database error:', error);
    console.log('\n💡 Make sure the database is set up:');
    console.log('   1. npx prisma migrate dev');
    console.log('   2. npx prisma db seed');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
