/**
 * MainPhase.example.ts
 * 
 * Example usage of the Main Phase action framework
 */

import { GameStateManager, createInitialGameState } from '../core/GameState';
import { RulesContext } from '../rules/RulesContext';
import { EventEmitter, GameEventType } from '../rendering/EventEmitter';
import { ZoneManager } from '../zones/ZoneManager';
import {
  runMainPhase,
  PlayerInputProvider,
  MainPhaseActionUnion,
} from './MainPhase';
import { PlayerId, ActionType } from '../core/types';

/**
 * Example: Running Main Phase without player input
 * This will trigger START_OF_MAIN effects but won't execute any actions
 */
export function exampleBasicMainPhase() {
  // Setup
  const state = createInitialGameState();
  const stateManager = new GameStateManager(state);
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Run main phase without input provider
  const result = runMainPhase(stateManager, rules, eventEmitter, zoneManager);

  console.log('Main phase completed without actions');
  if (!(result instanceof Promise)) {
    console.log('Game over:', result.isGameOver());
  }
}

/**
 * Example: Simple AI that always passes
 */
export class PassingAI implements PlayerInputProvider {
  async getNextAction(
    playerId: PlayerId,
    availableActions: ActionType[],
    state: GameStateManager
  ): Promise<MainPhaseActionUnion | null> {
    // Always pass (return null)
    console.log(`Player ${playerId} passes`);
    return null;
  }
}

/**
 * Example: Simple AI that ends phase immediately
 */
export class EndPhaseAI implements PlayerInputProvider {
  async getNextAction(
    playerId: PlayerId,
    availableActions: ActionType[],
    state: GameStateManager
  ): Promise<MainPhaseActionUnion | null> {
    // Always end phase
    console.log(`Player ${playerId} ends main phase`);
    return {
      type: ActionType.END_PHASE,
      playerId,
    };
  }
}

/**
 * Example: AI that tries to play a card if available
 */
export class SimplePlayCardAI implements PlayerInputProvider {
  private actionsTaken = 0;
  private maxActions = 3;

  async getNextAction(
    playerId: PlayerId,
    availableActions: ActionType[],
    state: GameStateManager
  ): Promise<MainPhaseActionUnion | null> {
    // Limit number of actions to prevent infinite loop
    if (this.actionsTaken >= this.maxActions) {
      console.log(`Player ${playerId} ends main phase after ${this.actionsTaken} actions`);
      return {
        type: ActionType.END_PHASE,
        playerId,
      };
    }

    // Try to play a card if available
    if (availableActions.includes(ActionType.PLAY_CARD)) {
      const player = state.getPlayer(playerId);
      if (player && player.zones.hand.length > 0) {
        const cardToPlay = player.zones.hand[0];
        this.actionsTaken++;
        console.log(`Player ${playerId} plays card: ${cardToPlay.definition.name}`);
        return {
          type: ActionType.PLAY_CARD,
          playerId,
          cardId: cardToPlay.id,
        };
      }
    }

    // Otherwise, end phase
    console.log(`Player ${playerId} ends main phase`);
    return {
      type: ActionType.END_PHASE,
      playerId,
    };
  }
}

/**
 * Example: Running Main Phase with AI player
 */
export async function exampleMainPhaseWithAI() {
  // Setup
  const state = createInitialGameState();
  const stateManager = new GameStateManager(state);
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create AI player
  const ai = new SimplePlayCardAI();

  // Run main phase with AI
  console.log('Running main phase with AI...');
  const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, ai);

  console.log('Main phase completed with AI');
  console.log('Game over:', result.isGameOver());
}

/**
 * Example: Interactive player input (for UI integration)
 */
export class InteractivePlayer implements PlayerInputProvider {
  constructor(
    private onRequestAction: (
      playerId: PlayerId,
      availableActions: ActionType[],
      state: GameStateManager
    ) => Promise<MainPhaseActionUnion | null>
  ) {}

  async getNextAction(
    playerId: PlayerId,
    availableActions: ActionType[],
    state: GameStateManager
  ): Promise<MainPhaseActionUnion | null> {
    // Delegate to UI callback
    return this.onRequestAction(playerId, availableActions, state);
  }
}

/**
 * Example: Using interactive player with UI
 */
export async function exampleMainPhaseWithUI() {
  // Setup
  const state = createInitialGameState();
  const stateManager = new GameStateManager(state);
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Create interactive player that would connect to UI
  const interactivePlayer = new InteractivePlayer(async (playerId, actions, state) => {
    // In a real implementation, this would:
    // 1. Display available actions to the user
    // 2. Wait for user input
    // 3. Return the chosen action
    
    // For this example, just end phase
    console.log(`UI: Player ${playerId} has actions:`, actions);
    return {
      type: ActionType.END_PHASE,
      playerId,
    };
  });

  // Run main phase with interactive player
  console.log('Running main phase with UI...');
  const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, interactivePlayer);

  console.log('Main phase completed');
  console.log('Game over:', result.isGameOver());
}

/**
 * Example: Listening to events during main phase
 */
export async function exampleMainPhaseWithEventListening() {
  // Setup
  const state = createInitialGameState();
  const stateManager = new GameStateManager(state);
  const rules = new RulesContext();
  const eventEmitter = new EventEmitter();
  const zoneManager = new ZoneManager(stateManager, eventEmitter);

  // Subscribe to events
  eventEmitter.on(GameEventType.CARD_MOVED, (event) => {
    console.log('Card moved:', event);
  });

  eventEmitter.on(GameEventType.ATTACK_DECLARED, (event) => {
    console.log('Attack declared:', event);
  });

  // Create AI
  const ai = new EndPhaseAI();

  // Run main phase
  const result = await runMainPhase(stateManager, rules, eventEmitter, zoneManager, ai);

  console.log('Main phase completed with event listening');
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('=== Example 1: Basic Main Phase ===');
  exampleBasicMainPhase();

  console.log('\n=== Example 2: Main Phase with AI ===');
  exampleMainPhaseWithAI().then(() => {
    console.log('\n=== Example 3: Main Phase with UI ===');
    return exampleMainPhaseWithUI();
  }).then(() => {
    console.log('\n=== Example 4: Main Phase with Event Listening ===');
    return exampleMainPhaseWithEventListening();
  }).catch(console.error);
}
