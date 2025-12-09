/**
 * Test utilities for AI tests
 * Provides mock data creation functions
 */

import {
  GameState,
  PlayerId,
  GameAction,
  CardInstance,
  CardDefinition,
  ActionType,
  Phase,
  CardState,
  CardCategory,
  ZoneId,
} from '../core/types';

/**
 * Create a mock card instance
 */
export function createMockCard(
  id: string,
  overrides: Partial<CardDefinition> = {}
): CardInstance {
  const definition: CardDefinition = {
    id: `def-${id}`,
    name: `Card ${id}`,
    category: CardCategory.CHARACTER,
    colors: ['Red'],
    typeTags: [],
    attributes: [],
    baseCost: 3,
    basePower: 3000,
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
    id,
    definition,
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.ACTIVE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

/**
 * Create a mock player state
 */
export function createMockPlayerState(
  id: PlayerId,
  lifeCount: number = 5,
  handSize: number = 5,
  donCount: number = 5,
  boardSize: number = 2
): any {
  // Create life cards
  const life: CardInstance[] = [];
  for (let i = 0; i < lifeCount; i++) {
    life.push(createMockCard(`life-${id}-${i}`, {}));
  }

  // Create hand cards
  const hand: CardInstance[] = [];
  for (let i = 0; i < handSize; i++) {
    hand.push(createMockCard(`hand-${id}-${i}`, {
      baseCost: 3,
      basePower: 3000,
    }));
  }

  // Create DON cards
  const costArea: CardInstance[] = [];
  for (let i = 0; i < donCount; i++) {
    costArea.push(createMockCard(`don-${id}-${i}`, {
      category: CardCategory.DON,
      baseCost: 0,
      basePower: 0,
    }));
  }

  // Create character area
  const characterArea: CardInstance[] = [];
  for (let i = 0; i < boardSize; i++) {
    characterArea.push(createMockCard(`char-${id}-${i}`, {
      baseCost: 4,
      basePower: 4000,
    }));
  }

  // Create leader
  const leaderArea = createMockCard(`leader-${id}`, {
    category: CardCategory.LEADER,
    baseCost: 0,
    basePower: 5000,
  });

  return {
    id,
    zones: {
      deck: [],
      hand,
      trash: [],
      life,
      donDeck: [],
      costArea,
      characterArea,
      leaderArea,
      stageArea: null,
    },
    flags: new Map(),
  };
}

/**
 * Create a mock game state
 */
export function createMockGameState(
  player1Life: number = 5,
  player2Life: number = 5,
  player1Hand: number = 5,
  player2Hand: number = 5,
  player1Don: number = 5,
  player2Don: number = 5,
  player1Board: number = 2,
  player2Board: number = 2
): GameState {
  const player1 = createMockPlayerState(
    PlayerId.PLAYER_1,
    player1Life,
    player1Hand,
    player1Don,
    player1Board
  );
  const player2 = createMockPlayerState(
    PlayerId.PLAYER_2,
    player2Life,
    player2Hand,
    player2Don,
    player2Board
  );

  return {
    players: new Map([
      [PlayerId.PLAYER_1, player1],
      [PlayerId.PLAYER_2, player2],
    ]),
    turnNumber: 1,
    phase: Phase.MAIN,
    activePlayer: PlayerId.PLAYER_1,
    pendingTriggers: [],
    history: [],
    gameOver: false,
    winner: null,
    attackedThisTurn: new Set(),
    loopGuardState: {
      stateHashes: new Map(),
      maxRepeats: 3,
    },
  };
}

/**
 * Create a mock game action
 */
export function createMockAction(
  type: ActionType,
  playerId: PlayerId,
  data: any = {}
): GameAction {
  return {
    type,
    playerId,
    ...data,
    timestamp: Date.now(),
  } as GameAction;
}
