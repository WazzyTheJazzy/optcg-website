/**
 * Tests for AIDecisionSystem card play priority logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIDecisionSystem } from './AIDecisionSystem';
import { ActionEvaluator } from './ActionEvaluator';
import { StrategyManager } from './StrategyManager';
import {
  GameState,
  PlayerId,
  GameAction,
  ActionType,
  CardInstance,
  CardDefinition,
  CardCategory,
  CardState,
  Phase,
  ZoneId,
  DonInstance,
  TriggerTiming,
  EffectTimingType,
} from '../core/types';
import { DecisionContext, AIPlayerConfig } from './types';

describe('AIDecisionSystem - Card Play Priority Logic', () => {
  let decisionSystem: AIDecisionSystem;
  let evaluator: ActionEvaluator;
  let strategy: StrategyManager;
  let gameState: GameState;
  let context: DecisionContext;

  beforeEach(() => {
    // Create strategy manager and evaluator
    strategy = new StrategyManager();
    strategy.setStrategy('balanced', 'medium');
    evaluator = new ActionEvaluator(strategy.getWeights());
    decisionSystem = new AIDecisionSystem(evaluator, strategy);

    // Create basic game state
    gameState = createTestGameState();

    // Create decision context
    context = {
      state: gameState,
      playerId: PlayerId.PLAYER_1,
      config: {
        difficulty: 'medium',
        playStyle: 'balanced',
        thinkingTime: { min: 500, max: 1500 },
        randomness: 0.15,
      },
    };
  });

  it('should prioritize Rush cards that can attack immediately', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    
    // Add cards to hand: one Rush card and one normal card
    const rushCard = createTestCard('rush-1', 'Rush Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 5000,
      keywords: ['Rush'],
    });
    
    const normalCard = createTestCard('normal-1', 'Normal Character', {
      category: CardCategory.CHARACTER,
      baseCost: 3,
      basePower: 6000,
      keywords: [],
    });
    
    player.zones.hand = [rushCard, normalCard];
    player.zones.costArea = createDonInstances(5, PlayerId.PLAYER_1);

    // Create play card actions
    const actions: GameAction[] = [
      createPlayCardAction(rushCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(normalCard.id, PlayerId.PLAYER_1),
    ];

    // Select action
    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prioritize Rush card
    expect(selectedAction.data.cardId).toBe(rushCard.id);
  });

  it('should prioritize Rush cards even more when opponent is low on life', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    const opponent = gameState.players.get(PlayerId.PLAYER_2)!;
    
    // Set opponent to low life
    opponent.zones.life = [createTestCard('life-1', 'Life Card')];
    
    // Add Rush card and high-power normal card
    const rushCard = createTestCard('rush-1', 'Rush Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 4000,
      keywords: ['Rush'],
    });
    
    const strongCard = createTestCard('strong-1', 'Strong Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 8000,
      keywords: [],
    });
    
    player.zones.hand = [rushCard, strongCard];
    player.zones.costArea = createDonInstances(5, PlayerId.PLAYER_1);

    const actions: GameAction[] = [
      createPlayCardAction(rushCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(strongCard.id, PlayerId.PLAYER_1),
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prioritize Rush card for potential lethal
    expect(selectedAction.data.cardId).toBe(rushCard.id);
  });

  it('should prioritize cards with valuable "On Play" effects', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    
    // Card with On Play effect
    const onPlayCard = createTestCard('onplay-1', 'On Play Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 5000,
      keywords: [],
      effects: [{
        id: 'effect-1',
        label: '[On Play] Draw 2 cards',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'draw_cards',
        oncePerTurn: false,
      }],
    });
    
    const normalCard = createTestCard('normal-1', 'Normal Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 6000,
      keywords: [],
    });
    
    player.zones.hand = [onPlayCard, normalCard];
    player.zones.costArea = createDonInstances(5, PlayerId.PLAYER_1);

    const actions: GameAction[] = [
      createPlayCardAction(onPlayCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(normalCard.id, PlayerId.PLAYER_1),
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prioritize On Play effect
    expect(selectedAction.data.cardId).toBe(onPlayCard.id);
  });

  it('should play low-cost cards before high-cost cards for flexibility', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    
    const lowCostCard = createTestCard('low-1', 'Low Cost Character', {
      category: CardCategory.CHARACTER,
      baseCost: 2,
      basePower: 3000,
      keywords: [],
    });
    
    const highCostCard = createTestCard('high-1', 'High Cost Character', {
      category: CardCategory.CHARACTER,
      baseCost: 7,
      basePower: 9000,
      keywords: [],
    });
    
    player.zones.hand = [lowCostCard, highCostCard];
    player.zones.costArea = createDonInstances(8, PlayerId.PLAYER_1);

    const actions: GameAction[] = [
      createPlayCardAction(lowCostCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(highCostCard.id, PlayerId.PLAYER_1),
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prioritize low-cost card for flexibility
    expect(selectedAction.data.cardId).toBe(lowCostCard.id);
  });

  it('should avoid using all resources when possible', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    
    // Card that uses all DON
    const expensiveCard = createTestCard('expensive-1', 'Expensive Character', {
      category: CardCategory.CHARACTER,
      baseCost: 5,
      basePower: 7000,
      keywords: [],
    });
    
    // Card that leaves resources
    const cheapCard = createTestCard('cheap-1', 'Cheap Character', {
      category: CardCategory.CHARACTER,
      baseCost: 3,
      basePower: 5000,
      keywords: [],
    });
    
    player.zones.hand = [expensiveCard, cheapCard];
    player.zones.costArea = createDonInstances(5, PlayerId.PLAYER_1); // Exactly 5 DON

    const actions: GameAction[] = [
      createPlayCardAction(expensiveCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(cheapCard.id, PlayerId.PLAYER_1),
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prefer card that leaves resources
    expect(selectedAction.data.cardId).toBe(cheapCard.id);
  });

  it('should prioritize Rush + Double Attack combo', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    
    const comboCard = createTestCard('combo-1', 'Rush Double Attack', {
      category: CardCategory.CHARACTER,
      baseCost: 5,
      basePower: 5000,
      keywords: ['Rush', 'Double Attack'],
    });
    
    const rushCard = createTestCard('rush-1', 'Rush Only', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 6000,
      keywords: ['Rush'],
    });
    
    player.zones.hand = [comboCard, rushCard];
    player.zones.costArea = createDonInstances(6, PlayerId.PLAYER_1);

    const actions: GameAction[] = [
      createPlayCardAction(comboCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(rushCard.id, PlayerId.PLAYER_1),
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prioritize combo card
    expect(selectedAction.data.cardId).toBe(comboCard.id);
  });

  it('should prioritize removal effects when opponent has board presence', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    const opponent = gameState.players.get(PlayerId.PLAYER_2)!;
    
    // Give opponent some characters
    opponent.zones.characterArea = [
      createTestCard('opp-1', 'Opponent Character', {
        category: CardCategory.CHARACTER,
        basePower: 7000,
      }),
      createTestCard('opp-2', 'Opponent Character 2', {
        category: CardCategory.CHARACTER,
        basePower: 6000,
      }),
    ];
    
    const removalCard = createTestCard('removal-1', 'Removal Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 4000,
      keywords: [],
      effects: [{
        id: 'effect-1',
        label: '[On Play] K.O. up to 1 opponent Character',
        timingType: EffectTimingType.AUTO,
        triggerTiming: TriggerTiming.ON_PLAY,
        condition: null,
        cost: null,
        scriptId: 'ko_character',
        oncePerTurn: false,
      }],
    });
    
    const normalCard = createTestCard('normal-1', 'Normal Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 6000,
      keywords: [],
    });
    
    player.zones.hand = [removalCard, normalCard];
    player.zones.costArea = createDonInstances(5, PlayerId.PLAYER_1);

    const actions: GameAction[] = [
      createPlayCardAction(removalCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(normalCard.id, PlayerId.PLAYER_1),
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prioritize removal effect
    expect(selectedAction.data.cardId).toBe(removalCard.id);
  });

  it('should prioritize blockers when player is low on life', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    
    // Set player to low life
    player.zones.life = [
      createTestCard('life-1', 'Life Card'),
      createTestCard('life-2', 'Life Card'),
    ];
    
    const blockerCard = createTestCard('blocker-1', 'Blocker Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 5000,
      keywords: ['Blocker'],
    });
    
    const attackerCard = createTestCard('attacker-1', 'Attacker Character', {
      category: CardCategory.CHARACTER,
      baseCost: 4,
      basePower: 6000,
      keywords: [],
    });
    
    player.zones.hand = [blockerCard, attackerCard];
    player.zones.costArea = createDonInstances(5, PlayerId.PLAYER_1);

    const actions: GameAction[] = [
      createPlayCardAction(blockerCard.id, PlayerId.PLAYER_1),
      createPlayCardAction(attackerCard.id, PlayerId.PLAYER_1),
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should prioritize blocker for defense
    expect(selectedAction.data.cardId).toBe(blockerCard.id);
  });

  it('should not play cards when board is full', () => {
    const player = gameState.players.get(PlayerId.PLAYER_1)!;
    
    // Fill the board (max 5 characters)
    player.zones.characterArea = [
      createTestCard('char-1', 'Character 1'),
      createTestCard('char-2', 'Character 2'),
      createTestCard('char-3', 'Character 3'),
      createTestCard('char-4', 'Character 4'),
      createTestCard('char-5', 'Character 5'),
    ];
    
    const newCard = createTestCard('new-1', 'New Character', {
      category: CardCategory.CHARACTER,
      baseCost: 3,
      basePower: 5000,
    });
    
    const passAction: GameAction = {
      type: ActionType.PASS_PRIORITY,
      playerId: PlayerId.PLAYER_1,
      data: {},
      timestamp: Date.now(),
    };
    
    player.zones.hand = [newCard];
    player.zones.costArea = createDonInstances(5, PlayerId.PLAYER_1);

    const actions: GameAction[] = [
      createPlayCardAction(newCard.id, PlayerId.PLAYER_1),
      passAction,
    ];

    const selectedAction = decisionSystem.selectAction(actions, context);

    // Should pass instead of trying to play when board is full
    expect(selectedAction.type).toBe(ActionType.PASS_PRIORITY);
  });
});

// Helper functions

function createTestGameState(): GameState {
  const player1: any = {
    id: PlayerId.PLAYER_1,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [
        createTestCard('life-1', 'Life Card'),
        createTestCard('life-2', 'Life Card'),
        createTestCard('life-3', 'Life Card'),
        createTestCard('life-4', 'Life Card'),
        createTestCard('life-5', 'Life Card'),
      ],
      donDeck: [],
      costArea: [],
      leaderArea: createTestCard('leader-1', 'Test Leader', {
        category: CardCategory.LEADER,
        basePower: 5000,
      }),
      characterArea: [],
      stageArea: null,
    },
    flags: new Map(),
  };

  const player2: any = {
    id: PlayerId.PLAYER_2,
    zones: {
      deck: [],
      hand: [],
      trash: [],
      life: [
        createTestCard('life-1', 'Life Card'),
        createTestCard('life-2', 'Life Card'),
        createTestCard('life-3', 'Life Card'),
        createTestCard('life-4', 'Life Card'),
        createTestCard('life-5', 'Life Card'),
      ],
      donDeck: [],
      costArea: [],
      leaderArea: createTestCard('leader-2', 'Test Leader 2', {
        category: CardCategory.LEADER,
        basePower: 5000,
      }),
      characterArea: [],
      stageArea: null,
    },
    flags: new Map(),
  };

  return {
    players: new Map([
      [PlayerId.PLAYER_1, player1],
      [PlayerId.PLAYER_2, player2],
    ]),
    activePlayer: PlayerId.PLAYER_1,
    phase: Phase.MAIN,
    turnNumber: 1,
    pendingTriggers: [],
    gameOver: false,
    winner: null,
    history: [],
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 3,
    },
  };
}

function createTestCard(
  id: string,
  name: string,
  overrides: Partial<CardDefinition> = {}
): CardInstance {
  const definition: CardDefinition = {
    id: id,
    name: name,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    basePower: 5000,
    baseCost: 4,
    lifeValue: null,
    counterValue: 1000,
    rarity: 'C',
    keywords: [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
    ...overrides,
  };

  return {
    id: id,
    definition: definition,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

function createDonInstances(count: number, owner: PlayerId): DonInstance[] {
  const dons: DonInstance[] = [];
  for (let i = 0; i < count; i++) {
    dons.push({
      id: `don-${i}`,
      owner: owner,
      zone: ZoneId.COST_AREA,
      state: CardState.ACTIVE,
    });
  }
  return dons;
}

function createPlayCardAction(cardId: string, playerId: PlayerId): GameAction {
  return {
    type: ActionType.PLAY_CARD,
    playerId: playerId,
    data: { cardId },
    timestamp: Date.now(),
  };
}
