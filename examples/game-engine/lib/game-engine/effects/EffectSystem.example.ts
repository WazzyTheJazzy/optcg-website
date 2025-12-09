/**
 * EffectSystem.example.ts
 * 
 * Examples demonstrating how to use the EffectSystem
 */

import { EffectSystem } from './EffectSystem';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { EventEmitter } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
  CardInstance,
  CardDefinition,
  EffectDefinition,
  EffectContext,
  ConditionExpr,
  CostExpr,
} from '../core/types';

// ============================================================================
// Setup
// ============================================================================

function setupEffectSystem() {
  const initialState = createInitialGameState();
  const stateManager = new GameStateManager(initialState);
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);
  const effectSystem = new EffectSystem(stateManager, eventEmitter, zoneManager);

  return { effectSystem, stateManager, eventEmitter, zoneManager };
}

// ============================================================================
// Example 1: Simple Draw Effect
// ============================================================================

function example1_SimpleDrawEffect() {
  console.log('\n=== Example 1: Simple Draw Effect ===\n');

  const { effectSystem, stateManager, zoneManager } = setupEffectSystem();

  // Register a draw effect script
  effectSystem.registerScript('draw-2-cards', (context: EffectContext) => {
    console.log(`Drawing 2 cards for ${context.controller}`);
    
    const player = context.state.players.get(context.controller);
    if (!player) return;

    // Draw 2 cards (simplified - actual implementation would use proper card movement)
    for (let i = 0; i < 2 && player.zones.deck.length > 0; i++) {
      const card = player.zones.deck[0];
      console.log(`  - Drew: ${card.definition.name}`);
    }
  });

  // Create a card with a draw effect
  const effectDef: EffectDefinition = {
    id: 'draw-effect',
    label: '[Activate: Main]',
    timingType: EffectTimingType.ACTIVATE,
    triggerTiming: null,
    condition: null,
    cost: { type: 'REST_DON', amount: 1 },
    scriptId: 'draw-2-cards',
    oncePerTurn: false,
  };

  const cardDef: CardDefinition = {
    id: 'card-001',
    name: 'Card Draw Character',
    category: CardCategory.CHARACTER,
    colors: ['Blue'],
    typeTags: [],
    attributes: [],
    basePower: 3000,
    baseCost: 2,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [effectDef],
    imageUrl: '',
    metadata: {
      setCode: 'EX01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card: CardInstance = {
    id: 'instance-001',
    definition: cardDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Add card to player's hand
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.hand.push(card);

  // Add DON to cost area
  player.zones.costArea.push({
    id: 'don-001',
    owner: PlayerId.PLAYER_1,
    zone: ZoneId.COST_AREA,
    state: CardState.ACTIVE,
  });

  const updatedStateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
  effectSystem.updateStateManager(updatedStateManager);

  // Activate the effect
  try {
    effectSystem.activateEffect('instance-001', 'draw-effect');
    console.log('Effect activated successfully!');
  } catch (error) {
    console.error('Failed to activate effect:', error);
  }
}

// ============================================================================
// Example 2: Conditional Effect
// ============================================================================

function example2_ConditionalEffect() {
  console.log('\n=== Example 2: Conditional Effect ===\n');

  const { effectSystem, stateManager } = setupEffectSystem();

  // Register a power boost effect
  effectSystem.registerScript('power-boost', (context: EffectContext) => {
    console.log(`Boosting power for ${context.source.definition.name}`);
    console.log(`  - Current power: ${context.source.definition.basePower}`);
    console.log(`  - New power: ${(context.source.definition.basePower || 0) + 2000}`);
  });

  // Create a condition: only activate if turn > 3
  const condition: ConditionExpr = {
    type: 'COMPARE',
    operator: 'GT',
    left: 'turn',
    right: 3,
  };

  const effectDef: EffectDefinition = {
    id: 'conditional-boost',
    label: '[Activate: Main]',
    timingType: EffectTimingType.ACTIVATE,
    triggerTiming: null,
    condition,
    cost: null,
    scriptId: 'power-boost',
    oncePerTurn: false,
  };

  const cardDef: CardDefinition = {
    id: 'card-002',
    name: 'Late Game Character',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 4000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [effectDef],
    imageUrl: '',
    metadata: {
      setCode: 'EX01',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card: CardInstance = {
    id: 'instance-002',
    definition: cardDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Add card to character area
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.characterArea.push(card);
  const updatedStateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
  effectSystem.updateStateManager(updatedStateManager);

  // Try to activate on turn 1 (should fail)
  console.log('Turn 1: Attempting to activate effect...');
  try {
    effectSystem.activateEffect('instance-002', 'conditional-boost');
    console.log('Effect activated!');
  } catch (error) {
    console.log('Effect failed (condition not met)');
  }

  // Advance to turn 4
  let newStateManager = updatedStateManager;
  for (let i = 0; i < 3; i++) {
    newStateManager = newStateManager.incrementTurn();
  }
  effectSystem.updateStateManager(newStateManager);

  // Try to activate on turn 4 (should succeed)
  console.log('\nTurn 4: Attempting to activate effect...');
  try {
    effectSystem.activateEffect('instance-002', 'conditional-boost');
    console.log('Effect activated successfully!');
  } catch (error) {
    console.log('Effect failed:', error);
  }
}

// ============================================================================
// Example 3: Complex Condition (AND/OR)
// ============================================================================

function example3_ComplexCondition() {
  console.log('\n=== Example 3: Complex Condition ===\n');

  const { effectSystem, stateManager } = setupEffectSystem();

  // Register effect
  effectSystem.registerScript('special-effect', (context: EffectContext) => {
    console.log('Special effect activated!');
  });

  // Condition: (Has Rush keyword) AND (Power >= 5000 OR Color is Red)
  const condition: ConditionExpr = {
    type: 'AND',
    operands: [
      { type: 'HAS_KEYWORD', keyword: 'Rush' },
      {
        type: 'OR',
        operands: [
          { type: 'COMPARE', operator: 'GTE', left: 'source.power', right: 5000 },
          { type: 'IS_COLOR', color: 'Red' },
        ],
      },
    ],
  };

  const effectDef: EffectDefinition = {
    id: 'complex-effect',
    label: '[Activate: Main]',
    timingType: EffectTimingType.ACTIVATE,
    triggerTiming: null,
    condition,
    cost: null,
    scriptId: 'special-effect',
    oncePerTurn: false,
  };

  // Test card 1: Has Rush, Red, 4000 power (should pass: has Rush AND is Red)
  const card1Def: CardDefinition = {
    id: 'card-003',
    name: 'Rush Red Character',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 4000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: ['Rush'],
    effects: [effectDef],
    imageUrl: '',
    metadata: {
      setCode: 'EX01',
      cardNumber: '003',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card1: CardInstance = {
    id: 'instance-003',
    definition: card1Def,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Test card 2: No Rush, Blue, 6000 power (should fail: no Rush)
  const card2Def: CardDefinition = {
    id: 'card-004',
    name: 'Strong Blue Character',
    category: CardCategory.CHARACTER,
    colors: ['Blue'],
    typeTags: [],
    attributes: [],
    basePower: 6000,
    baseCost: 5,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [effectDef],
    imageUrl: '',
    metadata: {
      setCode: 'EX01',
      cardNumber: '004',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card2: CardInstance = {
    id: 'instance-004',
    definition: card2Def,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Add cards to character area
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.characterArea.push(card1, card2);
  const updatedStateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
  effectSystem.updateStateManager(updatedStateManager);

  // Test card 1
  console.log('Testing Rush Red Character (4000 power)...');
  try {
    effectSystem.activateEffect('instance-003', 'complex-effect');
    console.log('✓ Effect activated (condition met)');
  } catch (error) {
    console.log('✗ Effect failed (condition not met)');
  }

  // Test card 2
  console.log('\nTesting Strong Blue Character (6000 power, no Rush)...');
  try {
    effectSystem.activateEffect('instance-004', 'complex-effect');
    console.log('✓ Effect activated (condition met)');
  } catch (error) {
    console.log('✗ Effect failed (condition not met)');
  }
}

// ============================================================================
// Example 4: Composite Cost
// ============================================================================

function example4_CompositeCost() {
  console.log('\n=== Example 4: Composite Cost ===\n');

  const { effectSystem, stateManager, zoneManager } = setupEffectSystem();

  // Register effect
  effectSystem.registerScript('powerful-effect', (context: EffectContext) => {
    console.log('Powerful effect activated!');
  });

  // Composite cost: Rest 2 DON AND Trash 1 card
  const cost: CostExpr = {
    type: 'COMPOSITE',
    costs: [
      { type: 'REST_DON', amount: 2 },
      { type: 'TRASH_CARD', amount: 1 },
    ],
  };

  const effectDef: EffectDefinition = {
    id: 'costly-effect',
    label: '[Activate: Main]',
    timingType: EffectTimingType.ACTIVATE,
    triggerTiming: null,
    condition: null,
    cost,
    scriptId: 'powerful-effect',
    oncePerTurn: false,
  };

  const cardDef: CardDefinition = {
    id: 'card-005',
    name: 'Expensive Character',
    category: CardCategory.CHARACTER,
    colors: ['Green'],
    typeTags: [],
    attributes: [],
    basePower: 7000,
    baseCost: 5,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'SR',
    keywords: [],
    effects: [effectDef],
    imageUrl: '',
    metadata: {
      setCode: 'EX01',
      cardNumber: '005',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card: CardInstance = {
    id: 'instance-005',
    definition: cardDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Setup player resources
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.characterArea.push(card);

  // Add 2 active DON
  player.zones.costArea.push(
    {
      id: 'don-001',
      owner: PlayerId.PLAYER_1,
      zone: ZoneId.COST_AREA,
      state: CardState.ACTIVE,
    },
    {
      id: 'don-002',
      owner: PlayerId.PLAYER_1,
      zone: ZoneId.COST_AREA,
      state: CardState.ACTIVE,
    }
  );

  // Add a card to hand (to trash)
  const trashCard: CardInstance = {
    id: 'trash-card',
    definition: cardDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
  player.zones.hand.push(trashCard);

  let updatedStateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
  zoneManager.updateStateManager(updatedStateManager);
  effectSystem.updateStateManager(updatedStateManager);

  console.log('Before activation:');
  console.log(`  - Active DON: 2`);
  console.log(`  - Cards in hand: 1`);
  console.log(`  - Cards in trash: 0`);

  // Activate the effect
  try {
    effectSystem.activateEffect('instance-005', 'costly-effect');
    console.log('\nEffect activated successfully!');

    const finalPlayer = effectSystem.getStateManager().getPlayer(PlayerId.PLAYER_1)!;
    const activeDon = finalPlayer.zones.costArea.filter(d => d.state === CardState.ACTIVE);
    console.log('\nAfter activation:');
    console.log(`  - Active DON: ${activeDon.length}`);
    console.log(`  - Cards in hand: ${finalPlayer.zones.hand.length}`);
    console.log(`  - Cards in trash: ${finalPlayer.zones.trash.length}`);
  } catch (error) {
    console.error('Failed to activate effect:', error);
  }
}

// ============================================================================
// Example 5: Once-Per-Turn Effect
// ============================================================================

function example5_OncePerTurnEffect() {
  console.log('\n=== Example 5: Once-Per-Turn Effect ===\n');

  const { effectSystem, stateManager } = setupEffectSystem();

  // Register effect
  effectSystem.registerScript('limited-effect', (context: EffectContext) => {
    console.log('Limited effect activated!');
  });

  const effectDef: EffectDefinition = {
    id: 'once-per-turn',
    label: '[Activate: Main] [Once Per Turn]',
    timingType: EffectTimingType.ACTIVATE,
    triggerTiming: null,
    condition: null,
    cost: null,
    scriptId: 'limited-effect',
    oncePerTurn: true,
  };

  const cardDef: CardDefinition = {
    id: 'card-006',
    name: 'Limited Character',
    category: CardCategory.CHARACTER,
    colors: ['Purple'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: 4,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [effectDef],
    imageUrl: '',
    metadata: {
      setCode: 'EX01',
      cardNumber: '006',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card: CardInstance = {
    id: 'instance-006',
    definition: cardDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Add card to character area
  const player = stateManager.getPlayer(PlayerId.PLAYER_1)!;
  player.zones.characterArea.push(card);
  const updatedStateManager = stateManager.updatePlayer(PlayerId.PLAYER_1, player);
  effectSystem.updateStateManager(updatedStateManager);

  // First activation (should succeed)
  console.log('First activation attempt:');
  try {
    effectSystem.activateEffect('instance-006', 'once-per-turn');
    console.log('✓ Effect activated');
  } catch (error) {
    console.log('✗ Effect failed');
  }

  // Second activation (should fail)
  console.log('\nSecond activation attempt (same turn):');
  try {
    effectSystem.activateEffect('instance-006', 'once-per-turn');
    console.log('✓ Effect activated');
  } catch (error) {
    console.log('✗ Effect failed (once-per-turn restriction)');
  }

  // Advance to next turn
  const nextTurnStateManager = effectSystem.getStateManager().incrementTurn();
  effectSystem.updateStateManager(nextTurnStateManager);

  // Third activation (should succeed - new turn)
  console.log('\nThird activation attempt (next turn):');
  try {
    effectSystem.activateEffect('instance-006', 'once-per-turn');
    console.log('✓ Effect activated');
  } catch (error) {
    console.log('✗ Effect failed');
  }
}

// ============================================================================
// Run Examples
// ============================================================================

if (require.main === module) {
  example1_SimpleDrawEffect();
  example2_ConditionalEffect();
  example3_ComplexCondition();
  example4_CompositeCost();
  example5_OncePerTurnEffect();
}
