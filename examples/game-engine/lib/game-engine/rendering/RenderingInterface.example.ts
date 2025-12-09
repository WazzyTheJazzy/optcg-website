/**
 * RenderingInterface.example.ts
 * 
 * Examples demonstrating how to use the RenderingInterface
 * to bridge the game engine with Three.js visualization
 */

import { GameEngine } from '../core/GameEngine';
import { RulesContext } from '../rules/RulesContext';
import { RenderingInterface } from './RenderingInterface';
import { PlayerId, ZoneId, CardCategory } from '../core/types';

// ============================================================================
// Example 1: Basic Setup
// ============================================================================

function example1_BasicSetup() {
  console.log('=== Example 1: Basic Setup ===\n');

  // Create game engine
  const rules = new RulesContext();
  const engine = new GameEngine(rules);

  // Create rendering interface
  const renderingInterface = new RenderingInterface(engine);

  console.log('RenderingInterface created and connected to engine');
  console.log('Ready to subscribe to events and query state\n');
}

// ============================================================================
// Example 2: Event Subscriptions
// ============================================================================

function example2_EventSubscriptions() {
  console.log('=== Example 2: Event Subscriptions ===\n');

  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Subscribe to card movement
  renderingInterface.onCardMoved((event) => {
    console.log(`Card ${event.cardId} moved from ${event.fromZone} to ${event.toZone}`);
    // Update Three.js card position here
  });

  // Subscribe to card state changes
  renderingInterface.onCardStateChanged((event) => {
    console.log(`Card ${event.cardId} changed from ${event.oldState} to ${event.newState}`);
    // Rotate card mesh in Three.js (0° for ACTIVE, 90° for RESTED)
  });

  // Subscribe to power changes
  renderingInterface.onPowerChanged((event) => {
    console.log(`Card ${event.cardId} power changed from ${event.oldPower} to ${event.newPower}`);
    // Update power display overlay in Three.js
  });

  // Subscribe to battle events
  renderingInterface.onBattleEvent((event) => {
    console.log(`Battle event: ${event.type}`);
    // Trigger battle animations in Three.js
  });

  // Subscribe to phase changes
  renderingInterface.onPhaseChanged((event) => {
    console.log(`Phase changed from ${event.oldPhase} to ${event.newPhase}`);
    // Update phase indicator UI
  });

  console.log('Event subscriptions registered\n');
}

// ============================================================================
// Example 3: State Queries
// ============================================================================

function example3_StateQueries() {
  console.log('=== Example 3: State Queries ===\n');

  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Get complete board state
  const boardState = renderingInterface.getBoardState();
  console.log('Board State:');
  console.log(`  Active Player: ${boardState.activePlayer}`);
  console.log(`  Phase: ${boardState.phase}`);
  console.log(`  Turn: ${boardState.turnNumber}`);
  console.log(`  Game Over: ${boardState.gameOver}`);

  // Get player 1's hand
  const player1Hand = renderingInterface.getZoneContents(PlayerId.PLAYER_1, ZoneId.HAND);
  console.log(`\nPlayer 1 Hand: ${player1Hand.length} cards`);

  // Get visual state of a specific card (if it exists)
  if (player1Hand.length > 0) {
    const firstCard = player1Hand[0];
    const visualState = renderingInterface.getCardVisualState(firstCard.id);
    
    if (visualState) {
      console.log('\nFirst Card Visual State:');
      console.log(`  ID: ${visualState.id}`);
      console.log(`  Zone: ${visualState.position.zone}`);
      console.log(`  State: ${visualState.state}`);
      console.log(`  Power: ${visualState.power}`);
      console.log(`  Cost: ${visualState.cost}`);
      console.log(`  Given DON: ${visualState.givenDonCount}`);
    }
  }

  console.log();
}

// ============================================================================
// Example 4: Card Metadata for Special Effects
// ============================================================================

function example4_CardMetadata() {
  console.log('=== Example 4: Card Metadata ===\n');

  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Get board state
  const boardState = renderingInterface.getBoardState();

  // Check player 1's leader
  const leader = boardState.player1.zones.leaderArea;
  if (leader) {
    const metadata = renderingInterface.getCardMetadata(leader.id);
    
    if (metadata) {
      console.log('Leader Card Metadata:');
      console.log(`  Name: ${metadata.name}`);
      console.log(`  Is Leader: ${metadata.isLeader}`);
      console.log(`  Is Alt Art: ${metadata.isAltArt}`);
      console.log(`  Is Promo: ${metadata.isPromo}`);
      console.log(`  Rarity: ${metadata.rarity}`);
      console.log(`  Colors: ${metadata.colors.join(', ')}`);
      console.log(`  Category: ${metadata.category}`);
      
      // Use metadata for special effects
      if (metadata.isAltArt) {
        console.log('  -> Apply special alt art shader');
      }
      if (metadata.isPromo) {
        console.log('  -> Add promo card glow effect');
      }
      if (metadata.isLeader) {
        console.log('  -> Use larger card mesh');
      }
    }
  }

  console.log();
}

// ============================================================================
// Example 5: Animation Hooks (Future)
// ============================================================================

function example5_AnimationHooks() {
  console.log('=== Example 5: Animation Hooks ===\n');

  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Register animation for card movement
  renderingInterface.registerAnimationHook({
    id: 'card-move-animation',
    trigger: 'CARD_MOVED' as any,
    duration: 500,
    callback: async () => {
      console.log('Starting card move animation...');
      // Animate card position in Three.js
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Card move animation complete');
    },
  });

  // Register animation for attack
  renderingInterface.registerAnimationHook({
    id: 'attack-animation',
    trigger: 'ATTACK_DECLARED' as any,
    duration: 1000,
    callback: async () => {
      console.log('Starting attack animation...');
      // Animate attacker moving toward target
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Attack animation complete');
    },
  });

  console.log('Animation hooks registered');
  console.log('Animations will play automatically when events occur\n');
}

// ============================================================================
// Example 6: Three.js Integration Pattern
// ============================================================================

function example6_ThreeJsIntegration() {
  console.log('=== Example 6: Three.js Integration Pattern ===\n');

  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Simulated Three.js scene
  const scene = {
    cardMeshes: new Map<string, any>(),
    
    updateCardPosition(cardId: string, zone: ZoneId, index: number) {
      console.log(`  Three.js: Moving card ${cardId} to ${zone}[${index}]`);
      // Update mesh position based on zone layout
    },
    
    updateCardRotation(cardId: string, isRested: boolean) {
      console.log(`  Three.js: Rotating card ${cardId} to ${isRested ? '90°' : '0°'}`);
      // Rotate mesh
    },
    
    updateCardPower(cardId: string, power: number) {
      console.log(`  Three.js: Updating card ${cardId} power display to ${power}`);
      // Update text overlay
    },
  };

  // Wire up rendering interface to Three.js scene
  renderingInterface.onCardMoved((event) => {
    scene.updateCardPosition(event.cardId, event.toZone, event.toIndex ?? 0);
  });

  renderingInterface.onCardStateChanged((event) => {
    scene.updateCardRotation(event.cardId, event.newState === 'RESTED');
  });

  renderingInterface.onPowerChanged((event) => {
    scene.updateCardPower(event.cardId, event.newPower);
  });

  console.log('Three.js scene wired to rendering interface');
  console.log('Scene will update automatically when game events occur\n');
}

// ============================================================================
// Example 7: Rendering a Complete Board
// ============================================================================

function example7_RenderCompleteBoard() {
  console.log('=== Example 7: Rendering a Complete Board ===\n');

  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Get complete board state
  const boardState = renderingInterface.getBoardState();

  console.log('Rendering Board:');
  console.log(`Turn ${boardState.turnNumber} - ${boardState.phase} Phase`);
  console.log(`Active Player: ${boardState.activePlayer}\n`);

  // Render Player 1's board
  console.log('Player 1:');
  console.log(`  Deck: ${boardState.player1.zones.deck.length} cards`);
  console.log(`  Hand: ${boardState.player1.zones.hand.length} cards`);
  console.log(`  Life: ${boardState.player1.zones.life.length} cards`);
  console.log(`  DON Deck: ${boardState.player1.zones.donDeck.length} DON`);
  console.log(`  Cost Area: ${boardState.player1.zones.costArea.length} DON`);
  console.log(`  Leader: ${boardState.player1.zones.leaderArea ? 'Present' : 'None'}`);
  console.log(`  Characters: ${boardState.player1.zones.characterArea.length}/5`);
  console.log(`  Stage: ${boardState.player1.zones.stageArea ? 'Present' : 'None'}`);

  // Render Player 2's board
  console.log('\nPlayer 2:');
  console.log(`  Deck: ${boardState.player2.zones.deck.length} cards`);
  console.log(`  Hand: ${boardState.player2.zones.hand.length} cards`);
  console.log(`  Life: ${boardState.player2.zones.life.length} cards`);
  console.log(`  DON Deck: ${boardState.player2.zones.donDeck.length} DON`);
  console.log(`  Cost Area: ${boardState.player2.zones.costArea.length} DON`);
  console.log(`  Leader: ${boardState.player2.zones.leaderArea ? 'Present' : 'None'}`);
  console.log(`  Characters: ${boardState.player2.zones.characterArea.length}/5`);
  console.log(`  Stage: ${boardState.player2.zones.stageArea ? 'Present' : 'None'}`);

  console.log();
}

// ============================================================================
// Example 8: Waiting for Animations
// ============================================================================

async function example8_WaitingForAnimations() {
  console.log('=== Example 8: Waiting for Animations ===\n');

  const engine = new GameEngine();
  const renderingInterface = new RenderingInterface(engine);

  // Register a slow animation
  renderingInterface.registerAnimationHook({
    id: 'slow-animation',
    trigger: 'CARD_MOVED' as any,
    duration: 2000,
    callback: async () => {
      console.log('Starting slow animation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Slow animation complete');
    },
  });

  // Simulate a card move event
  console.log('Emitting card move event...');
  engine.getEventEmitter().emit({
    type: 'CARD_MOVED' as any,
    timestamp: Date.now(),
    cardId: 'card-1',
    playerId: PlayerId.PLAYER_1,
    fromZone: ZoneId.DECK,
    toZone: ZoneId.HAND,
  });

  // Wait for the animation to complete
  console.log('Waiting for animation...');
  await renderingInterface.waitForAnimation('slow-animation');
  console.log('Animation finished, continuing game logic\n');
}

// ============================================================================
// Run Examples
// ============================================================================

if (require.main === module) {
  example1_BasicSetup();
  example2_EventSubscriptions();
  example3_StateQueries();
  example4_CardMetadata();
  example5_AnimationHooks();
  example6_ThreeJsIntegration();
  example7_RenderCompleteBoard();
  
  // Async example
  example8_WaitingForAnimations().then(() => {
    console.log('All examples complete!');
  });
}
