// Check the API structure in detail
async function checkAPIStructure() {
  console.log('🔍 Analyzing API data structure...\n');
  
  const response = await fetch('https://onepiece-cardgame.dev/cards.json');
  const cards = await response.json();
  
  // Find cards with missing data
  const missingEffect = cards.filter((c: any) => !c.e && c.t !== '5'); // Not DON
  const missingPower = cards.filter((c: any) => !c.p && (c.t === '1' || c.t === '2')); // Leaders or Characters
  const missingCost = cards.filter((c: any) => !c.cs && (c.t === '2' || c.t === '3' || c.t === '4')); // Char/Event/Stage
  
  console.log('📊 API Data Completeness:');
  console.log(`   Total cards in API: ${cards.length}`);
  console.log(`   Missing effects: ${missingEffect.length}`);
  console.log(`   Missing power: ${missingPower.length}`);
  console.log(`   Missing cost: ${missingCost.length}\n`);
  
  // Check if alternate cards are the issue
  const altCards = cards.filter((c: any) => c.cid.includes('_alt'));
  console.log(`   Alternate art cards: ${altCards.length}\n`);
  
  // Sample missing data cards
  console.log('📋 Sample cards missing effect in API:');
  missingEffect.slice(0, 5).forEach((c: any) => {
    console.log(`   ${c.cid} - ${c.n} (Type: ${c.t})`);
    console.log(`      Has power: ${c.p ? 'Yes' : 'No'}`);
    console.log(`      Has cost: ${c.cs ? 'Yes' : 'No'}`);
    console.log(`      Has effect: ${c.e ? 'Yes' : 'No'}`);
  });
  
  console.log('\n📋 Sample cards missing power in API:');
  missingPower.slice(0, 5).forEach((c: any) => {
    console.log(`   ${c.cid} - ${c.n} (Type: ${c.t})`);
    console.log(`      Has power: ${c.p ? 'Yes' : 'No'}`);
    console.log(`      Has cost: ${c.cs ? 'Yes' : 'No'}`);
    console.log(`      Has effect: ${c.e ? 'Yes' : 'No'}`);
  });
  
  // Check if there's a pattern
  console.log('\n🔍 Checking for patterns...');
  
  // Are vanilla cards (no effect) intentional?
  const vanillaCharacters = cards.filter((c: any) => 
    c.t === '2' && !c.e && c.p && c.cs
  );
  console.log(`   Vanilla characters (has stats but no effect): ${vanillaCharacters.length}`);
  
  if (vanillaCharacters.length > 0) {
    console.log('\n   Sample vanilla characters:');
    vanillaCharacters.slice(0, 3).forEach((c: any) => {
      console.log(`      ${c.cid} - ${c.n} | Cost: ${c.cs} | Power: ${c.p}`);
    });
  }
}

checkAPIStructure();
