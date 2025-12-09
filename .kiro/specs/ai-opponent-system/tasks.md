# Implementation Plan

- [x] 1. Create Player interface and update GameEngine integration





  - Define Player interface in `lib/game-engine/core/types.ts` with methods: chooseAction, chooseMulligan, chooseBlocker, chooseCounterAction, chooseTarget, chooseValue
  - Create PlayerType enum with 'human' and 'ai' values
  - Update GameEngine constructor to accept Player instances instead of player IDs
  - Update GameEngine to route decision requests through Player interface
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Create HumanPlayer implementation





  - Create `lib/game-engine/ai/HumanPlayer.ts` implementing Player interface
  - Implement all decision methods to return promises that resolve with user input
  - Add callback system for UI to provide user decisions
  - Maintain backward compatibility with existing game flow
  - _Requirements: 1.4_

- [x] 3. Implement AI configuration and types





  - Create `lib/game-engine/ai/types.ts` with AIPlayerConfig, EvaluationWeights, StrategyProfile interfaces
  - Define default configurations for easy, medium, and hard difficulties
  - Define strategy weight profiles for aggressive, defensive, and balanced play styles
  - Create DecisionContext interface for passing state to AI components
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.1, 12.2, 12.3, 12.4_

- [x] 4. Implement ActionEvaluator core





  - Create `lib/game-engine/ai/ActionEvaluator.ts` class
  - Implement constructor accepting EvaluationWeights
  - Implement evaluateAction method that returns numeric score for any action
  - Implement simulateAction method to create hypothetical game states
  - Implement compareStates method to extract evaluation factors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Implement evaluation factor calculations





  - Implement evaluateBoardControl: count and sum power of characters on field
  - Implement evaluateResourceEfficiency: calculate DON usage efficiency and card cost effectiveness
  - Implement evaluateLifeDifferential: compare life totals between players
  - Implement evaluateCardAdvantage: compare hand sizes and deck sizes
  - Implement evaluateTempo: evaluate action speed and board impact
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Implement specific action evaluators





  - Implement evaluatePlayCard: score card plays based on cost, power, effects, and timing
  - Implement evaluateAttack: score attacks based on damage potential, risk, and board impact
  - Implement evaluateGiveDon: score DON distribution based on power gain and attack potential
  - Implement evaluateActivateEffect: score effect activations based on impact and cost
  - _Requirements: 2.2, 2.3, 7.1, 7.2, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7. Implement StrategyManager





  - Create `lib/game-engine/ai/StrategyManager.ts` class
  - Implement strategy profile definitions for aggressive, defensive, and balanced
  - Implement setStrategy method to select profile based on play style and difficulty
  - Implement getWeights method to return current evaluation weights
  - Implement adjustForGameState method to dynamically modify strategy based on life totals and resources
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.2_

- [x] 8. Implement AIDecisionSystem core





  - Create `lib/game-engine/ai/AIDecisionSystem.ts` class
  - Implement constructor accepting ActionEvaluator and StrategyManager
  - Implement selectAction method: evaluate all actions, rank by score, apply difficulty modifier
  - Implement rankOptions helper method for scoring and sorting options
  - Implement applyDifficultyModifier to add randomness based on difficulty level
  - _Requirements: 2.1, 3.2, 3.3, 3.4_

- [x] 9. Implement mulligan decision logic





  - Implement evaluateMulligan method in AIDecisionSystem
  - Count playable cards in opening hand (cost <= 3)
  - Calculate hand quality score based on curve and playability
  - Return true (mulligan) if score below threshold, false otherwise
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Implement blocker selection logic





  - Implement selectBlocker method in AIDecisionSystem
  - Evaluate each potential blocker's value vs the attacking character
  - Calculate risk of losing the blocker vs damage prevented
  - Return best blocker or null if blocking is not advantageous
  - _Requirements: 2.4, 8.5_

- [x] 11. Implement counter action selection logic








  - Implement selectCounterAction method in AIDecisionSystem
  - Evaluate counter card value vs damage prevented
  - Calculate if counter cost is justified by battle outcome
  - Return best counter option or null if countering is not worth it
  - _Requirements: 2.5, 8.5_

- [x] 12. Implement target and value selection logic




  - Implement selectTarget method: score each target based on effect impact
  - Implement selectValue method: evaluate numeric choices based on game state
  - Handle effect-specific targeting logic (damage, power boost, search, etc.)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13. Implement DON management logic





  - Create DON distribution algorithm in ActionEvaluator
  - Prioritize giving DON to characters that can attack immediately
  - Calculate optimal DON distribution to maximize board power
  - Reserve DON for planned high-cost card plays
  - Give excess DON to leader for defensive power
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Implement combat decision logic





  - Implement attack target evaluation in ActionEvaluator
  - Calculate expected value for attacking leader vs characters
  - Factor in blocker probability and counter risk
  - Prioritize attacks that deal life damage when advantageous
  - Evaluate character removal value vs life damage
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 15. Implement card play priority logic





  - Create card play ordering algorithm in AIDecisionSystem
  - Prioritize cards with Rush keyword that can attack immediately
  - Prioritize cards with valuable "On Play" effects
  - Play low-cost cards before high-cost cards for flexibility
  - Reserve resources for reactive plays when appropriate
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 16. Implement AIPlayer controller





  - Create `lib/game-engine/ai/AIPlayer.ts` implementing Player interface
  - Implement constructor accepting player ID and AIPlayerConfig
  - Implement all Player interface methods to delegate to AIDecisionSystem
  - Implement simulateThinking method to add realistic delays
  - Implement applyRandomness method to introduce decision variation based on difficulty
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 11.1, 11.2, 11.3, 11.4_

- [x] 17. Implement thinking time simulation





  - Add configurable min/max thinking delays in AIPlayer
  - Calculate delay based on decision complexity (number of options)
  - Ensure minimum delay for visibility and maximum for game flow
  - Use setTimeout/Promise for non-blocking delays
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 18. Implement error handling and fallbacks





  - Create AIDecisionError, AIEvaluationError, AITimeoutError, AIInvalidActionError classes in `lib/game-engine/ai/errors.ts`
  - Add try-catch blocks in all AIPlayer decision methods
  - Implement fallback to random legal action on evaluation failure
  - Implement timeout mechanism with fallback to first legal action
  - Add error logging with decision context
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 19. Update GameEngine to use Player interface





  - Modify GameEngine.setupGame to accept Player instances
  - Update MainPhase to call player.chooseAction() instead of direct input
  - Update BattleSystem to call player.chooseBlocker() and player.chooseCounterAction()
  - Update GameSetup to call player.chooseMulligan()
  - Ensure all player decisions route through Player interface
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 20. Add AI action event emission





  - Emit AI_ACTION_SELECTED event when AI makes a decision
  - Include action type, selected option, and evaluation score in event data
  - Emit AI_THINKING_START and AI_THINKING_END events for UI feedback
  - Ensure events are emitted through existing EventEmitter system
  - _Requirements: 1.5_

- [x] 21. Write unit tests for ActionEvaluator





  - Test evaluateBoardControl with various board states
  - Test evaluateResourceEfficiency with different DON and card costs
  - Test evaluateLifeDifferential with various life totals
  - Test evaluateCardAdvantage with different hand and deck sizes
  - Test evaluateTempo with various action types
  - Test evaluatePlayCard, evaluateAttack, evaluateGiveDon, evaluateActivateEffect
  - Test simulateAction creates valid hypothetical states
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 14.1, 14.2, 14.5_

- [x] 22. Write unit tests for StrategyManager





  - Test strategy profile selection for each play style
  - Test weight retrieval returns correct values
  - Test dynamic strategy adjustment based on life advantage/disadvantage
  - Test dynamic strategy adjustment based on resource availability
  - Test strategy modifiers apply correctly
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 14.1, 14.2_

- [x] 23. Write unit tests for AIDecisionSystem





  - Test selectAction ranks actions correctly
  - Test selectAction applies difficulty modifier appropriately
  - Test evaluateMulligan with various hand compositions
  - Test selectBlocker chooses optimal blockers
  - Test selectCounterAction evaluates counter value correctly
  - Test selectTarget and selectValue with various options
  - Test rankOptions helper method
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 14.1, 14.2, 14.5_

- [x] 24. Write unit tests for AIPlayer





  - Test all Player interface methods return valid actions
  - Test simulateThinking adds appropriate delays
  - Test applyRandomness introduces variation based on difficulty
  - Test error handling and fallback mechanisms
  - Test timeout handling
  - _Requirements: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3, 11.4, 13.1, 13.2, 13.3, 13.4, 14.1, 14.2_

- [x] 25. Write integration tests for AI gameplay





  - Test AI vs AI game completes without errors
  - Test AI makes only legal moves throughout entire game
  - Test AI responds to all decision points (mulligan, actions, blockers, counters)
  - Test AI completes games within reasonable time
  - Test AI with different difficulty levels behaves differently
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 3.2, 3.3, 3.4, 11.5, 13.5, 14.3, 14.4_

- [x] 26. Write scenario tests for AI decision quality





  - Test AI attacks leader when it can win the game
  - Test AI blocks lethal attacks
  - Test AI uses counters to prevent lethal damage
  - Test AI plays cards in logical order
  - Test AI distributes DON effectively
  - Test AI mulligans bad hands
  - Test AI keeps good hands
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, 9.2, 14.4_

- [x] 27. Write performance tests





  - Test decision time for simple actions (< 2 seconds)
  - Test decision time for complex actions (< 5 seconds)
  - Test memory usage during long games
  - Test evaluation performance with complex board states
  - _Requirements: 11.1, 11.2, 11.5_

- [x] 28. Create AI player factory and configuration utilities





  - Create `lib/game-engine/ai/AIPlayerFactory.ts` with factory methods
  - Implement createAIPlayer(difficulty, playStyle) factory method
  - Implement getDefaultConfig(difficulty) utility
  - Export easy-to-use AI creation functions
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 29. Add AI debugging and logging utilities





  - Create `lib/game-engine/ai/AIDebugger.ts` for debug mode logging
  - Implement decision logging with evaluation scores
  - Implement deterministic mode with fixed random seeds for testing
  - Add metrics tracking (decision times, evaluation scores, action counts)
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 30. Update game page to support AI opponents





  - Modify `app/game/page.tsx` to allow selecting AI opponent
  - Add UI controls for AI difficulty selection
  - Add UI controls for AI play style selection
  - Display AI thinking indicator during AI turns
  - Show AI decision information in debug mode
  - _Requirements: 1.1, 3.1, 12.1, 12.2_

- [x] 31. Create AI opponent documentation








  - Write README for AI system in `lib/game-engine/ai/README.md`
  - Document AI architecture and components
  - Document how to create and configure AI players
  - Document evaluation factors and strategy profiles
  - Provide usage examples for integrating AI into games
  - _Requirements: All_

- [x] 32. Add AI performance optimization





  - Implement action pruning to filter obviously bad moves
  - Add caching for repeated game state evaluations
  - Optimize simulation to only compute relevant state changes
  - Add time-limited evaluation with early termination
  - Profile and optimize hot paths in evaluation code
  - _Requirements: 11.5_
