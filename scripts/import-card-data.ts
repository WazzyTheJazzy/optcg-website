import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface APICard {
  cid: string;        // Card ID (e.g., "ST01-001")
  n: string;          // Name
  t: string;          // Type (1=Leader, 2=Character, 3=Event, 4=Stage)
  col: string;        // Color (1=Red, 2=Green, 3=Blue, 4=Purple, 5=Black, 6=Yellow)
  cs?: string;        // Cost
  p?: string;         // Power
  cp?: string;        // Counter
  l?: string;         // Life (for Leaders)
  a?: string;         // Attribute
  tr?: string;        // Traits/Category
  e?: string;         // Effect
  r?: string;         // Rarity
  srcN?: string;      // Set name
  iu?: string;        // Image URL
  ar?: string;        // Artist
}

async function importCardData() {
  console.log('🔄 Fetching card data from One Piece Card Game API...\n');
  
  try {
    const response = await fetch('https://onepiece-cardgame.dev/cards.json');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const apiCards: APICard[] = await response.json();
    
    console.log(`📦 Found ${apiCards.length} cards from API\n`);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < apiCards.length; i++) {
      const apiCard = apiCards[i];
      
      try {
        // Map type codes to names
        const typeMap: Record<string, string> = {
          '1': 'Leader',
          '2': 'Character',
          '3': 'Event',
          '4': 'Stage',
          '5': 'DON'
        };
        
        // Map color codes to names
        const colorMap: Record<string, string> = {
          '1': 'Red',
          '2': 'Green',
          '3': 'Blue',
          '4': 'Purple',
          '5': 'Black',
          '6': 'Yellow',
          '7': 'Multi'
        };
        
        // Map rarity codes to names
        const rarityMap: Record<string, string> = {
          '1': 'Leader',
          '2': 'Common',
          '3': 'Uncommon',
          '4': 'Rare',
          '5': 'Super Rare',
          '6': 'Secret Rare',
          '7': 'Special',
          '8': 'Promo'
        };
        
        // Transform API data to match our schema
        const cardData = {
          cardNumber: apiCard.cid,
          name: apiCard.n,
          type: typeMap[apiCard.t] || 'Unknown',
          color: colorMap[apiCard.col] || 'Unknown',
          cost: apiCard.cs ? parseInt(apiCard.cs) : null,
          power: apiCard.p ? parseInt(apiCard.p) : null,
          counter: apiCard.cp ? parseInt(apiCard.cp) : null,
          life: apiCard.l ? parseInt(apiCard.l) : null,
          attribute: apiCard.a ?? null,
          category: apiCard.tr || 'Unknown',
          effect: apiCard.e ?? null,
          trigger: null, // Not in API
          rarity: rarityMap[apiCard.r || '2'] || 'Common',
          set: apiCard.srcN || 'Unknown',
          imageUrl: apiCard.iu ?? null,
          artist: apiCard.ar ?? null,
          archetype: apiCard.tr ?? null,
          tags: apiCard.tr ?? null,
        };
        
        // Check if card already exists
        const existingCard = await prisma.card.findUnique({
          where: { cardNumber: cardData.cardNumber }
        });
        
        if (existingCard) {
          // Update existing card
          await prisma.card.update({
            where: { cardNumber: cardData.cardNumber },
            data: cardData
          });
          updated++;
        } else {
          // Create new card
          await prisma.card.create({
            data: cardData
          });
          created++;
        }
        
        // Progress indicator
        if ((i + 1) % 50 === 0) {
          console.log(`   Processed ${i + 1}/${apiCards.length} cards...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing card ${apiCard.cid}: ${error}`);
        errors++;
      }
    }
    
    console.log('\n✅ Import complete!\n');
    console.log('📊 Summary:');
    console.log(`   Created: ${created} new cards`);
    console.log(`   Updated: ${updated} existing cards`);
    console.log(`   Skipped: ${skipped} cards`);
    console.log(`   Errors: ${errors} cards\n`);
    
    // Verify data completeness
    console.log('🔍 Verifying data completeness...\n');
    
    const total = await prisma.card.count();
    const withEffect = await prisma.card.count({ where: { effect: { not: null } } });
    const withPower = await prisma.card.count({ where: { power: { not: null } } });
    const withCost = await prisma.card.count({ where: { cost: { not: null } } });
    const withImage = await prisma.card.count({ where: { imageUrl: { not: null } } });
    
    console.log('📈 Data completeness:');
    console.log(`   Total cards: ${total}`);
    console.log(`   Cards with effects: ${withEffect}/${total} (${(withEffect/total*100).toFixed(1)}%)`);
    console.log(`   Cards with power: ${withPower}/${total} (${(withPower/total*100).toFixed(1)}%)`);
    console.log(`   Cards with cost: ${withCost}/${total} (${(withCost/total*100).toFixed(1)}%)`);
    console.log(`   Cards with images: ${withImage}/${total} (${(withImage/total*100).toFixed(1)}%)`);
    
    // Show sample cards
    console.log('\n📋 Sample imported cards:\n');
    const sampleCards = await prisma.card.findMany({
      where: {
        type: 'Character',
        effect: { not: null }
      },
      take: 3,
      orderBy: { cardNumber: 'asc' }
    });
    
    sampleCards.forEach(card => {
      console.log(`   ${card.name} (${card.cardNumber})`);
      console.log(`      Type: ${card.type} | Color: ${card.color}`);
      console.log(`      Cost: ${card.cost ?? 'N/A'} | Power: ${card.power ?? 'N/A'} | Counter: ${card.counter ?? 'N/A'}`);
      console.log(`      Effect: ${card.effect ? card.effect.substring(0, 60) + '...' : 'None'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importCardData()
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
