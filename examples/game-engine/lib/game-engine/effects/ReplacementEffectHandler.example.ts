/**
 * ReplacementEffectHandler.example.ts
 * 
 * Examples demonstrating how to use replacement effects
 */

import { ReplacementEffectHandler } from './ReplacementEffectHandler';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import {
  CardDefinition,
  CardInstance,
  EffectDefinition,
  EffectInstance,
  EffectContext,
  CostExpr,
  CardCategory,
  EffectTimingType,
  PlayerId,
  ZoneId,
  CardState,
} from '../core/types';

// ============================================================================
// Example 1: Cost Reduction Effect
// ============================================================================

/**
 * Example: A card that reduces the cost of all effects by 1 DON
 */
export function exampleCostReduction() {
  // Create initial state
  const initialState = createInitialGameState();
  const stateManager = new GameStateManager(initialState);
  const handler = new ReplacementEffectHandler(stateManager);

  // Create a cost reducer card
  const costReducerDef: CardDefinition = {
    id: 'cost-reducer-001',
    name: 'Nami - Navigator',
    category: CardCategory.CHARACTER,
    colors: ['Blue'],
    typeTags: ['Straw Hat Crew'],
    attributes: [],
    basePower: 3000,
    baseCost: 2,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'cost-reduction',
        label: '[Replacement]',
        timingType: EffectTimingType.REPLACEMENT,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'reduce-all-costs',
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '016',
      isAltArt: false,
      isPromo: false,
    },
  };

  const costReducerCard: CardInstance = {
    id: 'card-instance-1',
    definition: costReducerDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Define the cost replacement function
  const costReduction = (cost: CostExpr, context: EffectContext): CostExpr => {
    if (cost.type === 'REST_DON' && cost.amount) {
      return {
        ...cost,
        amount: Math.max(0, cost.amount - 1), // Reduce by 1, minimum 0
      };
    }
    return cost;
  };

  // Register the replacement effect
  handler.registerReplacementEffect(
    costReducerCard.id,
    costReducerDef.effects[0],
    0, // priority
    costReduction
  );

  // Test: Apply cost replacement
  const originalCost: CostExpr = { type: 'REST_DON', amount: 3 };
  const context: EffectContext = {
    state: stateManager.getState(),
    source: costReducerCard,
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map(),
    event: null,
  };

  const modifiedCost = handler.applyCostReplacementEffects(originalCost, context);
  
  console.log('Original cost:', originalCost.amount); // 3
  console.log('Modified cost:', modifiedCost.amount); // 2
}

// ============================================================================
// Example 2: Effect Doubling
// ============================================================================

/**
 * Example: A card that doubles the effect of all draw effects
 */
export function exampleEffectDoubling() {
  const initialState = createInitialGameState();
  const stateManager = new GameStateManager(initialState);
  const handler = new ReplacementEffectHandler(stateManager);

  // Create an effect doubler card
  const doublerDef: CardDefinition = {
    id: 'effect-doubler-001',
    name: 'Nico Robin - Archaeologist',
    category: CardCategory.STAGE,
    colors: ['Purple'],
    typeTags: ['Straw Hat Crew'],
    attributes: [],
    basePower: null,
    baseCost: 2,
    lifeValue: null,
    counterValue: null,
    rarity: 'SR',
    keywords: [],
    effects: [
      {
        id: 'double-draw',
        label: '[Replacement]',
        timingType: EffectTimingType.REPLACEMENT,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'double-draw-effects',
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '067',
      isAltArt: false,
      isPromo: false,
    },
  };

  const doublerCard: CardInstance = {
    id: 'card-instance-2',
    definition: doublerDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.STAGE_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Define the body replacement function
  const doubleDrawEffect = (
    instance: EffectInstance,
    context: EffectContext
  ): EffectInstance => {
    // Only double draw effects
    if (instance.effectDefinition.scriptId.includes('draw')) {
      const amount = instance.values.get('amount') || 0;
      const newValues = new Map(instance.values);
      newValues.set('amount', amount * 2);
      
      return {
        ...instance,
        values: newValues,
      };
    }
    return instance;
  };

  // Register the replacement effect
  handler.registerReplacementEffect(
    doublerCard.id,
    doublerDef.effects[0],
    0,
    undefined, // no cost replacement
    doubleDrawEffect
  );

  // Test: Apply body replacement
  const drawEffectDef: EffectDefinition = {
    id: 'draw-effect',
    label: '[On Play]',
    timingType: EffectTimingType.AUTO,
    triggerTiming: null,
    condition: null,
    cost: null,
    scriptId: 'draw-cards',
    oncePerTurn: false,
  };

  const originalInstance: EffectInstance = {
    effectDefinition: drawEffectDef,
    source: doublerCard,
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map([['amount', 2]]),
    context: null,
  };

  const context: EffectContext = {
    state: stateManager.getState(),
    source: doublerCard,
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map(),
    event: null,
  };

  const modifiedInstance = handler.applyBodyReplacementEffects(originalInstance, context);
  
  console.log('Original draw amount:', originalInstance.values.get('amount')); // 2
  console.log('Modified draw amount:', modifiedInstance.values.get('amount')); // 4
}

// ============================================================================
// Example 3: Multiple Replacement Effects with Priority
// ============================================================================

/**
 * Example: Multiple cards with replacement effects that stack
 */
export function exampleMultipleReplacements() {
  const initialState = createInitialGameState();
  const stateManager = new GameStateManager(initialState);
  const handler = new ReplacementEffectHandler(stateManager);

  // Card 1: Reduces cost by 1 (priority 0)
  const card1Def: CardDefinition = {
    id: 'reducer-1',
    name: 'Cost Reducer 1',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 2000,
    baseCost: 1,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [
      {
        id: 'reduce-1',
        label: '[Replacement]',
        timingType: EffectTimingType.REPLACEMENT,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'reduce-cost-1',
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card1: CardInstance = {
    id: 'card-1',
    definition: card1Def,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Card 2: Reduces cost by 2 (priority 1)
  const card2Def: CardDefinition = {
    id: 'reducer-2',
    name: 'Cost Reducer 2',
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 3000,
    baseCost: 2,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'R',
    keywords: [],
    effects: [
      {
        id: 'reduce-2',
        label: '[Replacement]',
        timingType: EffectTimingType.REPLACEMENT,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'reduce-cost-2',
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '002',
      isAltArt: false,
      isPromo: false,
    },
  };

  const card2: CardInstance = {
    id: 'card-2',
    definition: card2Def,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Register both replacement effects
  const reduce1 = (cost: CostExpr): CostExpr => {
    if (cost.type === 'REST_DON' && cost.amount) {
      return { ...cost, amount: Math.max(0, cost.amount - 1) };
    }
    return cost;
  };

  const reduce2 = (cost: CostExpr): CostExpr => {
    if (cost.type === 'REST_DON' && cost.amount) {
      return { ...cost, amount: Math.max(0, cost.amount - 2) };
    }
    return cost;
  };

  // Register with different priorities
  handler.registerReplacementEffect(card1.id, card1Def.effects[0], 0, reduce1);
  handler.registerReplacementEffect(card2.id, card2Def.effects[0], 1, reduce2);

  // Test: Apply both replacements
  const originalCost: CostExpr = { type: 'REST_DON', amount: 5 };
  const context: EffectContext = {
    state: stateManager.getState(),
    source: card1,
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map(),
    event: null,
  };

  const modifiedCost = handler.applyCostReplacementEffects(originalCost, context);
  
  console.log('Original cost:', originalCost.amount); // 5
  console.log('After priority 0 (-1):', 4);
  console.log('After priority 1 (-2):', 2);
  console.log('Final cost:', modifiedCost.amount); // 2
}

// ============================================================================
// Example 4: Conditional Replacement Effect
// ============================================================================

/**
 * Example: A replacement effect that only applies under certain conditions
 */
export function exampleConditionalReplacement() {
  const initialState = createInitialGameState();
  const stateManager = new GameStateManager(initialState);
  const handler = new ReplacementEffectHandler(stateManager);

  // Create a conditional replacement card
  const conditionalDef: CardDefinition = {
    id: 'conditional-001',
    name: 'Conditional Effect',
    category: CardCategory.CHARACTER,
    colors: ['Green'],
    typeTags: [],
    attributes: [],
    basePower: 4000,
    baseCost: 3,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'SR',
    keywords: [],
    effects: [
      {
        id: 'conditional-replacement',
        label: '[Replacement]',
        timingType: EffectTimingType.REPLACEMENT,
        triggerTiming: null,
        condition: null,
        cost: null,
        scriptId: 'conditional-cost-reduction',
        oncePerTurn: false,
      },
    ],
    imageUrl: '',
    metadata: {
      setCode: 'OP01',
      cardNumber: '050',
      isAltArt: false,
      isPromo: false,
    },
  };

  const conditionalCard: CardInstance = {
    id: 'card-conditional',
    definition: conditionalDef,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.CHARACTER_AREA,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };

  // Define a conditional cost replacement
  // Only reduces cost if the effect source is a character
  const conditionalReduction = (
    cost: CostExpr,
    context: EffectContext
  ): CostExpr => {
    // Check if the effect source is a character
    if (
      context.source.definition.category === CardCategory.CHARACTER &&
      cost.type === 'REST_DON' &&
      cost.amount
    ) {
      return {
        ...cost,
        amount: Math.max(0, cost.amount - 1),
      };
    }
    return cost;
  };

  // Register the conditional replacement
  handler.registerReplacementEffect(
    conditionalCard.id,
    conditionalDef.effects[0],
    0,
    conditionalReduction
  );

  // Test with character effect (should reduce)
  const characterCost: CostExpr = { type: 'REST_DON', amount: 3 };
  const characterContext: EffectContext = {
    state: stateManager.getState(),
    source: conditionalCard, // Character card
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map(),
    event: null,
  };

  const modifiedCharacterCost = handler.applyCostReplacementEffects(
    characterCost,
    characterContext
  );
  
  console.log('Character effect cost:', characterCost.amount); // 3
  console.log('Modified cost:', modifiedCharacterCost.amount); // 2 (reduced)

  // Test with event effect (should not reduce)
  const eventCard: CardInstance = {
    ...conditionalCard,
    definition: {
      ...conditionalCard.definition,
      category: CardCategory.EVENT,
    },
  };

  const eventCost: CostExpr = { type: 'REST_DON', amount: 3 };
  const eventContext: EffectContext = {
    state: stateManager.getState(),
    source: eventCard, // Event card
    controller: PlayerId.PLAYER_1,
    targets: [],
    values: new Map(),
    event: null,
  };

  const modifiedEventCost = handler.applyCostReplacementEffects(
    eventCost,
    eventContext
  );
  
  console.log('Event effect cost:', eventCost.amount); // 3
  console.log('Modified cost:', modifiedEventCost.amount); // 3 (not reduced)
}

// Run examples
if (require.main === module) {
  console.log('=== Example 1: Cost Reduction ===');
  exampleCostReduction();
  
  console.log('\n=== Example 2: Effect Doubling ===');
  exampleEffectDoubling();
  
  console.log('\n=== Example 3: Multiple Replacements ===');
  exampleMultipleReplacements();
  
  console.log('\n=== Example 4: Conditional Replacement ===');
  exampleConditionalReplacement();
}
