/**
 * LoopGuard.example.ts
 * 
 * Examples demonstrating how to use the LoopGuard for infinite loop detection
 */

import { LoopGuard } from './LoopGuard';
import { RulesContext } from '../rules/RulesContext';
import { GameStateManager, createInitialGameState } from '../core/GameState';
import { PlayerId, Phase, CardState, ZoneId } from '../core/types';

// ============================================================================
// Example 1: Basic Loop Detection
// ============================================================================

export function example1_BasicLoopDetection() {
  console.log('=== Example 1: Basic Loop Detection ===\n');

  const rules = new RulesContext();
  const loopGuard = new LoopGuard(rules);
  let stateManager = new GameStateManager(createInitialGameState());

  // Simulate a game where the same state repeats
  for (let i = 0; i < 5; i++) {
    const state = stateManager.getState();
    
    // Check for loop
    const result = loopGuard.checkForLoop(state);
    
    console.log(`Iteration ${i + 1}:`);
    console.log(`  Loop detected: ${result.loopDetected}`);
    console.log(`  Repeat count: ${loopGuard.getRepeatCount(state)}`);
    
    if (result.loopDetected) {
      console.log(`  Resolution: ${result.resolution}`);
      if (result.stoppingPlayer) {
        console.log(`  Stopping player: ${result.stoppingPlayer}`);
      }
      break;
    }
    
    // Record the state
    const stateHash = loopGuard.recordState(state);
    stateManager = stateManager.updateLoopGuard(stateHash);
    console.log();
  }
}

// ============================================================================
// Example 2: State Changes Break Loop Detection
// ============================================================================

export function example2_StateChangesBreakLoop() {
  console.log('=== Example 2: State Changes Break Loop Detection ===\n');

  const rules = new RulesContext();
  const loopGuard = new LoopGuard(rules);
  let stateManager = new GameStateManager(createInitialGameState());

  // Record initial state multiple times
  for (let i = 0; i < 3; i++) {
    const state = stateManager.getState();
    const stateHash = loopGuard.recordState(state);
    stateManager = stateManager.updateLoopGuard(stateHash);
    console.log(`Recorded state ${i + 1}, repeat count: ${loopGuard.getRepeatCount(state)}`);
  }

  // Change the state (advance phase)
  console.log('\nChanging phase to MAIN...');
  stateManager = stateManager.setPhase(Phase.MAIN);

  // This is a new state, so repeat count resets
  const newState = stateManager.getState();
  console.log(`New state repeat count: ${loopGuard.getRepeatCount(newState)}`);

  // Record the new state
  const newHash = loopGuard.recordState(newState);
  stateManager = stateManager.updateLoopGuard(newHash);
  console.log(`After recording: ${loopGuard.getRepeatCount(stateManager.getState())}`);
}

// ============================================================================
// Example 3: Loop Resolution Scenarios
// ============================================================================

export function example3_LoopResolutionScenarios() {
  console.log('=== Example 3: Loop Resolution Scenarios ===\n');

  const rules = new RulesContext();
  const loopGuard = new LoopGuard(rules);

  // Scenario A: Active player in main phase with resources (can stop)
  console.log('Scenario A: Active player can stop');
  let stateManager = new GameStateManager(createInitialGameState());
  stateManager = stateManager.setPhase(Phase.MAIN);
  stateManager = stateManager.setActivePlayer(PlayerId.PLAYER_1);

  // Add a card to hand so player has choices
  const player1State = stateManager.getState().players.get(PlayerId.PLAYER_1)!;
  player1State.zones.hand.push({
    id: 'card1',
    definition: {
      id: 'def1',
      name: 'Test Card',
      category: 'CHARACTER' as any,
      colors: ['Red'],
      typeTags: [],
      attributes: [],
      basePower: 4000,
      baseCost: 3,
      lifeValue: null,
      counterValue: null,
      rarity: 'C',
      keywords: [],
      effects: [],
      imageUrl: '',
      metadata: {
        setCode: 'OP01',
        cardNumber: '001',
        isAltArt: false,
        isPromo: false,
      },
    },
    owner: PlayerId.PLAYER_1,
    controller: PlayerId.PLAYER_1,
    zone: ZoneId.HAND,
    state: CardState.NONE,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  });

  // Simulate loop
  const stateHash = loopGuard.hashRelevantState(stateManager.getState());
  stateManager.getState().loopGuardState.stateHashes.set(stateHash, 4);

  const resultA = loopGuard.checkForLoop(stateManager.getState());
  console.log(`  Loop detected: ${resultA.loopDetected}`);
  console.log(`  Resolution: ${resultA.resolution}`);
  console.log(`  Stopping player: ${resultA.stoppingPlayer}\n`);

  // Scenario B: Not in main phase (neither can stop)
  console.log('Scenario B: Neither player can stop');
  stateManager = new GameStateManager(createInitialGameState());
  stateManager = stateManager.setPhase(Phase.DRAW);

  const stateHashB = loopGuard.hashRelevantState(stateManager.getState());
  stateManager.getState().loopGuardState.stateHashes.set(stateHashB, 4);

  const resultB = loopGuard.checkForLoop(stateManager.getState());
  console.log(`  Loop detected: ${resultB.loopDetected}`);
  console.log(`  Resolution: ${resultB.resolution}`);
  console.log(`  Stopping player: ${resultB.stoppingPlayer}`);
}

// ============================================================================
// Example 4: Integration with Game Engine
// ============================================================================

export function example4_GameEngineIntegration() {
  console.log('=== Example 4: Game Engine Integration ===\n');

  const rules = new RulesContext();
  const loopGuard = new LoopGuard(rules);
  let stateManager = new GameStateManager(createInitialGameState());

  // Simulate a game action
  function executeAction(actionName: string, changeState: boolean = false) {
    console.log(`Executing action: ${actionName}`);

    // Optionally change state
    if (changeState) {
      stateManager = stateManager.setPhase(Phase.MAIN);
    }

    // Check for loop BEFORE recording
    const state = stateManager.getState();
    const result = loopGuard.checkForLoop(state);

    if (result.loopDetected) {
      console.log(`  ⚠️  Loop detected!`);
      console.log(`  Resolution: ${result.resolution}`);

      if (result.resolution === 'draw') {
        console.log(`  Game ends in a draw`);
        stateManager = stateManager.setGameOver(null);
        return false; // Stop game
      } else if (result.stoppingPlayer) {
        console.log(`  ${result.stoppingPlayer} must make a different choice`);
        // In real implementation, would force different action
      }
    } else {
      console.log(`  ✓ No loop detected`);
    }

    // Record state for future loop detection
    const stateHash = loopGuard.recordState(state);
    stateManager = stateManager.updateLoopGuard(stateHash);
    console.log(`  Repeat count: ${loopGuard.getRepeatCount(stateManager.getState())}\n`);

    return true; // Continue game
  }

  // Execute several actions
  executeAction('Action 1');
  executeAction('Action 2');
  executeAction('Action 3');
  executeAction('Action 4');
  executeAction('Action 5 (should trigger loop)');
}

// ============================================================================
// Example 5: Hash Consistency
// ============================================================================

export function example5_HashConsistency() {
  console.log('=== Example 5: Hash Consistency ===\n');

  const rules = new RulesContext();
  const loopGuard = new LoopGuard(rules);
  const stateManager = new GameStateManager(createInitialGameState());
  const state = stateManager.getState();

  // Hash the same state multiple times
  console.log('Hashing the same state 5 times:');
  const hashes: string[] = [];
  for (let i = 0; i < 5; i++) {
    const hash = loopGuard.hashRelevantState(state);
    hashes.push(hash);
    console.log(`  Hash ${i + 1}: ${hash.substring(0, 16)}...`);
  }

  // Verify all hashes are identical
  const allSame = hashes.every(h => h === hashes[0]);
  console.log(`\nAll hashes identical: ${allSame}`);

  // Change state slightly
  console.log('\nChanging active player...');
  const modifiedState = { ...state, activePlayer: PlayerId.PLAYER_2 };
  const newHash = loopGuard.hashRelevantState(modifiedState);
  console.log(`  Original hash: ${hashes[0].substring(0, 16)}...`);
  console.log(`  New hash:      ${newHash.substring(0, 16)}...`);
  console.log(`  Hashes differ: ${newHash !== hashes[0]}`);
}

// ============================================================================
// Example 6: Performance Monitoring
// ============================================================================

export function example6_PerformanceMonitoring() {
  console.log('=== Example 6: Performance Monitoring ===\n');

  const rules = new RulesContext();
  const loopGuard = new LoopGuard(rules);
  let stateManager = new GameStateManager(createInitialGameState());

  // Measure hash computation time
  const iterations = 1000;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    loopGuard.hashRelevantState(stateManager.getState());
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`Hashed state ${iterations} times`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average time per hash: ${avgTime.toFixed(3)}ms`);

  // Measure memory usage (approximate)
  const state = stateManager.getState();
  const hashMapSize = state.loopGuardState.stateHashes.size;
  const estimatedMemory = hashMapSize * 40; // ~40 bytes per entry

  console.log(`\nMemory usage:`);
  console.log(`  Unique states tracked: ${hashMapSize}`);
  console.log(`  Estimated memory: ${estimatedMemory} bytes (~${(estimatedMemory / 1024).toFixed(2)} KB)`);
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  example1_BasicLoopDetection();
  console.log('\n' + '='.repeat(60) + '\n');

  example2_StateChangesBreakLoop();
  console.log('\n' + '='.repeat(60) + '\n');

  example3_LoopResolutionScenarios();
  console.log('\n' + '='.repeat(60) + '\n');

  example4_GameEngineIntegration();
  console.log('\n' + '='.repeat(60) + '\n');

  example5_HashConsistency();
  console.log('\n' + '='.repeat(60) + '\n');

  example6_PerformanceMonitoring();
}

// Uncomment to run examples
// runAllExamples();
