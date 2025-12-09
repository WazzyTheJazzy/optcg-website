# Card Data Import Plan

## Current Status

**Database:** 790 cards
- ✅ All cards have images (790/790)
- ❌ Only 15 cards have effect text (15/790)
- ❌ Only 82 cards have power values (82/790)

**Problem:** Cards are missing critical gameplay data:
- Effect text
- Power values
- Cost values
- Counter values
- Attributes
- Keywords
- Triggers

## Card Data Schema

Your database already has the right structure:

```prisma
model Card {
  id             String   @id
  cardNumber     String   @unique
  name           String
  set            String
  rarity         String
  color          String
  cost           Int?
  power          Int?
  counter        Int?
  life           Int?     // For Leaders
  attribute      String?
  type           String   // Leader, Character, Event, Stage
  category       String
  effect         String?
  trigger        String?
  imageUrl       String?
  illustrationType String?
  artist         String?
  archetype      String?
  tags           String?
}
```

## Data Sources

### Option 1: One Piece Card Game API
**URL:** https://onepiece-cardgame.dev/
- Free API with complete card data
- Includes all card text, stats, and metadata
- Well-maintained and up-to-date
- JSON format

**Example API call:**
```
GET https://onepiece-cardgame.dev/cards.json
```

**Response includes:**
- Card number, name, type
- Cost, power, counter, life
- Effect text
- Trigger effects
- Color, attribute, category
- Rarity, set information
- Image URLs

### Option 2: OnePieceTCG.io
**URL:** https://www.onepiecetcg.io/
- Community-maintained database
- Has card search and export features
- May require scraping

### Option 3: Official Bandai Card Database
**URL:** https://en.onepiece-cardgame.com/cardlist/
- Official source
- Most accurate data
- May require scraping

### Option 4: Manual CSV Import
Create a CSV file with card data and import it.

## Recommended Approach

**Use Option 1: One Piece Card Game API**

### Step 1: Fetch Card Data
```typescript
const response = await fetch('https://onepiece-cardgame.dev/cards.json');
const cards = await response.json();
```

### Step 2: Transform Data
Map API data to your schema:
```typescript
{
  cardNumber: card.id,
  name: card.name,
  type: card.type,
  color: card.color,
  cost: card.cost,
  power: card.power,
  counter: card.counter,
  life: card.life,
  attribute: card.attribute,
  category: card.category,
  effect: card.effect,
  trigger: card.trigger,
  rarity: card.rarity,
  set: card.set,
  imageUrl: card.image_url
}
```

### Step 3: Update Database
```typescript
for (const cardData of transformedCards) {
  await prisma.card.upsert({
    where: { cardNumber: cardData.cardNumber },
    update: cardData,
    create: cardData
  });
}
```

## Implementation Script

Create `scripts/import-card-data.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importCardData() {
  console.log('🔄 Fetching card data from API...');
  
  const response = await fetch('https://onepiece-cardgame.dev/cards.json');
  const apiCards = await response.json();
  
  console.log(`📦 Found ${apiCards.length} cards`);
  
  let updated = 0;
  let created = 0;
  
  for (const apiCard of apiCards) {
    const cardData = {
      cardNumber: apiCard.id,
      name: apiCard.name,
      type: apiCard.type,
      color: apiCard.color || 'Unknown',
      cost: apiCard.cost,
      power: apiCard.power,
      counter: apiCard.counter,
      life: apiCard.life,
      attribute: apiCard.attribute,
      category: apiCard.category || 'Unknown',
      effect: apiCard.effect,
      trigger: apiCard.trigger,
      rarity: apiCard.rarity || 'Common',
      set: apiCard.set || 'Unknown',
      imageUrl: apiCard.image_url,
      artist: apiCard.artist,
      archetype: apiCard.archetype,
      tags: apiCard.tags?.join(',')
    };
    
    const result = await prisma.card.upsert({
      where: { cardNumber: cardData.cardNumber },
      update: cardData,
      create: cardData
    });
    
    if (result.updatedAt > result.createdAt) {
      updated++;
    } else {
      created++;
    }
  }
  
  console.log(`✅ Import complete!`);
  console.log(`   Created: ${created} cards`);
  console.log(`   Updated: ${updated} cards`);
}

importCardData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Alternative: Manual Data Entry

If APIs aren't available, you can:

1. **Create a CSV template:**
```csv
cardNumber,name,type,color,cost,power,counter,effect,trigger
OP01-001,Monkey D. Luffy,Leader,Red,0,5000,0,"[DON!! x1] [When Attacking] Give up to 1 of your Leader or Character cards +1000 power during this battle.",
OP01-002,Roronoa Zoro,Character,Red,3,4000,1000,"[On Play] K.O. up to 1 of your opponent's Characters with 3000 power or less.",
```

2. **Import CSV:**
```typescript
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const csvContent = fs.readFileSync('cards.csv', 'utf-8');
const records = parse(csvContent, { columns: true });

for (const record of records) {
  await prisma.card.upsert({
    where: { cardNumber: record.cardNumber },
    update: record,
    create: record
  });
}
```

## Game Engine Integration

Once card data is imported, the game engine can use it:

```typescript
// In CardDatabaseService
async getCardData(cardNumber: string): Promise<CardData> {
  const card = await prisma.card.findUnique({
    where: { cardNumber }
  });
  
  return {
    id: card.cardNumber,
    name: card.name,
    type: card.type as CardType,
    color: card.color as Color,
    cost: card.cost,
    power: card.power,
    counter: card.counter,
    effect: card.effect,
    trigger: card.trigger,
    // ... other fields
  };
}
```

## Validation

After import, verify data:

```typescript
// Check completeness
const total = await prisma.card.count();
const withEffect = await prisma.card.count({ where: { effect: { not: null } } });
const withPower = await prisma.card.count({ where: { power: { not: null } } });

console.log(`Cards with effects: ${withEffect}/${total} (${(withEffect/total*100).toFixed(1)}%)`);
console.log(`Cards with power: ${withPower}/${total} (${(withPower/total*100).toFixed(1)}%)`);
```

## Next Steps

1. **Choose data source** (recommend API)
2. **Create import script**
3. **Test with small batch** (10-20 cards)
4. **Run full import**
5. **Verify data completeness**
6. **Update game engine** to use real card data
7. **Test gameplay** with actual card effects

## Benefits

Once complete:
- ✅ Cards will have accurate stats
- ✅ Effects will display correctly
- ✅ Game engine can implement card abilities
- ✅ Search and filter will work properly
- ✅ Collection tracking will be accurate
- ✅ Trading will show correct card info

## Estimated Time

- API integration: 2-3 hours
- Testing and validation: 1 hour
- Game engine updates: 2-3 hours
- **Total: 5-7 hours**
