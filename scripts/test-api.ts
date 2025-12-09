// Quick test to check if the API is accessible
async function testAPI() {
  console.log('🔍 Testing One Piece Card Game API...\n');
  
  try {
    const response = await fetch('https://onepiece-cardgame.dev/cards.json');
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data = await response.json();
    
    console.log(`✅ API is accessible!`);
    console.log(`📦 Found ${data.length} cards\n`);
    
    // Show first card structure
    if (data.length > 0) {
      console.log('📋 Sample card structure:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testAPI();
