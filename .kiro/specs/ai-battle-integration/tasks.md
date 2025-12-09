# Implementation Plan

- [x] 1. Define attack action type and update type system


  - Add AttackAction interface to GameAction union type in `lib/game-engine/core/types.ts`
  - Include attackerId, targetId, and playerId fields
  - Update action type discriminators
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement attack action generation in Main Phase


  - Create `generateAttackActions` method in MainPhase handler
  - Iterate through all characters controlled by active player
  - Check if each character can attack using battle system validation
  - For each attacker, get legal targets from BattleSystem
  - Create AttackAction for each (attacker, target) pair
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.1 Write property test for attack action generation






  - **Property 1: Attack Action Completeness**
  - **Validates: Requirements 1.1, 1.2**

- [x] 2.2 Integrate attack actions into available actions list



  - Modify `generateAvailableActions` in MainPhase to include attack actions
  - Ensure attack actions appear alongside other action types
  - _Requirements: 1.5_

- [x] 2.3 Write property test for attack action inclusion




  - **Property 2: Attack Action Inclusion**
  - **Validates: Requirements 1.5**

- [x] 3. Implement attack action execution in Main Phase





  - Add attack action handler in `executeAction` method
  - Route attack actions to BattleSystem.executeAttack
  - Update game state with battle results
  - Handle battle errors gracefully
  - _Requirements: 2.1, 2.2, 2.3, 6.4_

- [x] 3.1 Write property test for attack execution


  - **Property 3: Attack Execution State Change**
  - **Validates: Requirements 2.3**

- [x] 3.2 Write property test for character K.O.

  - **Property 4: Character K.O. on Attack**
  - **Validates: Requirements 2.4**

- [x] 3.3 Write property test for life damage

  - **Property 5: Life Damage Processing**
  - **Validates: Requirements 2.5**

- [x] 4. Connect BattleSystem to AI Player for blocker decisions




  - Update BattleSystem to use Player.chooseBlocker for blocker queries
  - Remove placeholder blocker query method
  - Ensure AI blocker decisions integrate with battle flow
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.1 Write property test for blocker redirection


  - **Property 6: Blocker Redirection**
  - **Validates: Requirements 4.2**

- [x] 4.2 Write property test for no blocker


  - **Property 7: No Blocker Original Target**
  - **Validates: Requirements 4.3**

- [x] 5. Connect BattleSystem to AI Player for counter decisions





  - Update BattleSystem to use Player.chooseCounterAction for counter queries
  - Remove placeholder counter query method
  - Ensure AI counter decisions integrate with battle flow
  - _Requirements: 5.1, 5.2_

- [x] 5.1 Write property test for counter power boost


  - **Property 8: Counter Power Boost**
  - **Validates: Requirements 5.2**

- [x] 6. Implement multiple attacks per turn support





  - Track which characters have attacked this turn in game state
  - Prevent characters from attacking twice
  - Allow different characters to attack in same turn
  - Reset attack tracking at end of turn
  - _Requirements: 7.5, 30.2, 30.3_

- [x] 6.1 Write property test for multiple attacks


  - **Property 11: Multiple Attacks Per Turn**
  - **Validates: Requirements 7.5**

- [x] 6.2 Write property test for attack limit


  - **Property 45: Character Attack Limit**
  - **Validates: Requirements 30.3**

- [x] 7. Implement game over checking after attacks





  - Check for game over conditions after each attack
  - End game if a player's life reaches zero
  - Set winner appropriately
  - _Requirements: 7.4_

- [x] 7.1 Write property test for game over


  - **Property 10: Game Over After Winning Attack**
  - **Validates: Requirements 7.4**

- [x] 8. Implement attack validation





  - Validate attack legality before execution
  - Use BattleSystem.canAttack for validation
  - Handle invalid attacks gracefully without crashing
  - Log validation failures
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 8.1 Write property test for attack legality


  - **Property 12: Attack Action Legality**
  - **Validates: Requirements 8.1**

- [x] 8.2 Write property test for attack validation





  - **Property 13: Attack Validation Before Execution**
  - **Validates: Requirements 8.2, 8.3**

- [x] 9. Create effect system core types





  - Create `lib/game-engine/effects/types.ts`
  - Define EffectDefinition, EffectInstance, EffectType enum
  - Define EffectParameters, SearchCriteria, TargetFilter interfaces
  - Define Target, TargetType enum
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 10. Implement EffectSystem class





  - Create `lib/game-engine/effects/EffectSystem.ts`
  - Implement effect triggering based on game events
  - Implement effect resolution
  - Implement effect stack management
  - Implement condition checking
  - Implement legal target determination
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 10.1 Write property test for effect conditions

  - **Property 14: Effect Condition Evaluation**
  - **Validates: Requirements 13.5**

- [x] 11. Implement EffectParser class





  - Create `lib/game-engine/effects/EffectParser.ts`
  - Implement parseEffectText method
  - Extract effect labels ([On Play], [When Attacking], etc.)
  - Determine timing type and trigger timing from labels
  - Parse effect body into effect type and parameters
  - Parse targeting information
  - Parse conditions and costs
  - _Requirements: 14.1, 35.1, 35.2, 35.3, 35.4, 35.5_

- [x] 11.1 Write property test for effect parsing


  - **Property 15: Effect Parsing Correctness**
  - **Validates: Requirements 14.1**

- [x] 12. Implement card effect loading





  - Update card loading to parse effect text from database
  - Attach parsed effect definitions to card instances
  - Validate effect definitions during loading
  - Log errors for invalid effects
  - Support cards with multiple effects
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 12.1 Write property test for effect attachment


  - **Property 16: Card Effect Attachment**
  - **Validates: Requirements 14.2**

- [x] 12.2 Write property test for effect validation


  - **Property 17: Effect Definition Validation**
  - **Validates: Requirements 14.3**

- [x] 13. Implement effect triggering system





  - Identify effects that match trigger conditions
  - Create effect instances with game context
  - Add effects to resolution queue
  - Support all trigger timings (ON_PLAY, WHEN_ATTACKING, etc.)
  - Handle multiple simultaneous triggers with priority ordering
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 13.1 Write property test for trigger identification


  - **Property 18: Trigger Identification**
  - **Validates: Requirements 15.1**

- [x] 13.2 Write property test for effect priority


  - **Property 19: Effect Resolution Priority**
  - **Validates: Requirements 15.2**

- [x] 13.3 Write property test for effect queue


  - **Property 20: Effect Queue Management**
  - **Validates: Requirements 15.5**

- [x] 14. Implement EffectResolverRegistry





  - Create `lib/game-engine/effects/EffectResolver.ts`
  - Define EffectResolver interface
  - Implement EffectResolverRegistry class
  - Support registering resolvers for effect types
  - Support resolving effects through registered resolvers
  - _Requirements: 16.1_

- [x] 14.1 Write property test for effect resolution

  - **Property 21: Effect State Modification**
q  - **Validates: Requirements 16.1**

- [x] 15. Implement PowerModificationResolver





  - Create `lib/game-engine/effects/resolvers/PowerModificationResolver.ts`
  - Apply power modifications to target cards
  - Create modifiers with appropriate duration
  - Support positive and negative power changes
  - _Requirements: 17.1, 16.4_

- [x] 15.1 Write property test for power modifier duration


  - **Property 22: Power Modifier Duration**
  - **Validates: Requirements 16.4**

- [x] 16. Implement KOCharacterResolver




  - Create `lib/game-engine/effects/resolvers/KOCharacterResolver.ts`
  - K.O. target characters matching criteria
  - Move characters to trash
  - Trigger ON_KO effects
  - Support maxPower and maxCost filters
  - _Requirements: 17.4_

- [x] 17. Implement BounceCharacterResolver




  - Create `lib/game-engine/effects/resolvers/BounceCharacterResolver.ts`
  - Return target characters to owner's hand
  - Update game state appropriately
  - Support cost and power filters
  - _Requirements: 16.5_

- [x] 17.1 Write property test for card zone updates

  - **Property 23: Card Zone Update on Effect**
  - **Validates: Requirements 16.5**

- [x] 18. Implement SearchDeckResolver





  - Create `lib/game-engine/effects/resolvers/SearchDeckResolver.ts`
  - Look at top X cards of deck
  - Filter cards by search criteria
  - Prompt player to choose card(s)
  - Add chosen cards to hand
  - Place remaining cards at bottom of deck
  - _Requirements: 17.3_

- [x] 19. Implement DrawCardsResolver




  - Create `lib/game-engine/effects/resolvers/DrawCardsResolver.ts`
  - Draw X cards from deck
  - Move cards from deck to hand
  - Handle empty deck appropriately
  - _Requirements: 17.2_

- [x] 20. Implement DiscardCardsResolver




  - Create `lib/game-engine/effects/resolvers/DiscardCardsResolver.ts`
  - Discard X cards from hand
  - Prompt player to choose cards to discard
  - Move cards from hand to trash
  - _Requirements: 17.8_

- [x] 21. Implement GrantKeywordResolver




  - Create `lib/game-engine/effects/resolvers/GrantKeywordResolver.ts`
  - Grant keyword to target card
  - Create keyword modifier with appropriate duration
  - Support Rush, Blocker, Double Attack, etc.
  - _Requirements: 33.5_

- [x] 21.1 Write property test for keyword grants


  - **Property 49: Dynamic Keyword Grant**
  - **Validates: Requirements 33.5**

- [x] 22. Implement AttachDonResolver




  - Create `lib/game-engine/effects/resolvers/AttachDonResolver.ts`
  - Attach DON from cost area to target character
  - Update character's givenDon array
  - Apply power bonus (+1000 per DON)
  - _Requirements: 17.6, 31.4_

- [x] 22.1 Write property test for DON power bonus

  - **Property 46: DON Power Bonus**
  - **Validates: Requirements 31.4**

- [x] 23. Implement RestCharacterResolver




  - Create `lib/game-engine/effects/resolvers/RestCharacterResolver.ts`
  - Rest target character (change state to RESTED)
  - Update game state
  - _Requirements: 17.5_

- [x] 24. Implement ActivateCharacterResolver




  - Create `lib/game-engine/effects/resolvers/ActivateCharacterResolver.ts`
  - Activate target character (change state to ACTIVE)
  - Update game state
  - _Requirements: 17.5_

- [x] 25. Implement DealDamageResolver




  - Create `lib/game-engine/effects/resolvers/DealDamageResolver.ts`
  - Deal X damage to target leader
  - Move life cards from life zone to hand/trash
  - Handle trigger effects on life cards
  - _Requirements: 17.7_

- [x] 26. Implement effect targeting system





  - Determine legal targets based on target filter
  - Filter by controller, zone, category, color, cost, power, state, keywords
  - Support multiple targets (up to X)
  - Validate chosen targets are legal
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 26.1 Write property test for legal targets


  - **Property 24: Legal Target Determination**
  - **Validates: Requirements 18.1**

- [x] 26.2 Write property test for target validation

  - **Property 25: Target Validation**
  - **Validates: Requirements 18.3**

- [x] 26.3 Write property test for target filters

  - **Property 26: Target Filter Application**
  - **Validates: Requirements 18.4**

- [x] 27. Extend AI ActionEvaluator for effects





  - Add evaluateEffectActivation method
  - Add evaluateEffectTarget method
  - Add simulateEffect method
  - Add effect-specific evaluation methods (power mod, K.O., card advantage)
  - Integrate effect evaluation into action selection
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 28. Implement modifier duration management




  - Support PERMANENT, UNTIL_END_OF_TURN, UNTIL_END_OF_BATTLE durations
  - Remove turn-end modifiers at end of turn
  - Remove battle-end modifiers at end of battle
  - Remove all modifiers when card leaves field
  - Track modifier sources
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 28.1 Write property test for modifier durations


  - **Property 27: Modifier Duration Support**
  - **Validates: Requirements 20.1**

- [x] 28.2 Write property test for turn-end cleanup



  - **Property 28: Turn End Modifier Cleanup**
  - **Validates: Requirements 20.2**

- [x] 28.3 Write property test for battle-end cleanup


  - **Property 29: Battle End Modifier Cleanup**
  - **Validates: Requirements 20.3**

- [x] 28.4 Write property test for card removal cleanup


  - **Property 30: Card Removal Modifier Cleanup**
  - **Validates: Requirements 20.4**

- [x] 29. Implement effect condition system





  - Support condition expressions (if X, then Y)
  - Check conditions before applying effects
  - Support multiple conditions with AND/OR logic
  - Re-evaluate conditions when game state changes
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [x] 29.1 Write property test for conditional effects


  - **Property 31: Conditional Effect Application**
  - **Validates: Requirements 21.2**

- [x] 29.2 Write property test for complex conditions

  - **Property 32: Complex Condition Evaluation**
  - **Validates: Requirements 21.4**

- [x] 29.3 Write property test for dynamic conditions

  - **Property 33: Dynamic Condition Re-evaluation**
  - **Validates: Requirements 21.5**

- [x] 30. Implement effect cost system





  - Support cost types: rest DON, trash cards, rest character, discard cards
  - Verify player can pay cost before activation
  - Pay cost and update game state
  - Validate cost payment before effect resolution
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [x] 30.1 Write property test for cost validation


  - **Property 34: Cost Payment Validation**
  - **Validates: Requirements 22.1**

- [x] 30.2 Write property test for cost payment


  - **Property 35: Cost Payment State Change**
  - **Validates: Requirements 22.4**

- [x] 30.3 Write property test for cost before resolution


  - **Property 36: Cost Before Effect Resolution**
  - **Validates: Requirements 22.5**

- [x] 31. Implement effect stack and priority





  - Maintain effect stack for multiple effects
  - Add effects to stack in priority order
  - Resolve effects from stack one at a time (LIFO)
  - Allow players to respond to effects
  - Resolve stack until empty
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [x] 31.1 Write property test for stack resolution


  - **Property 37: Effect Stack Sequential Resolution**
  - **Validates: Requirements 23.3**

- [x] 31.2 Write property test for stack completion


  - **Property 38: Effect Stack Completion**
  - **Validates: Requirements 23.5**

- [x] 32. Implement effect event emission




  - Emit EFFECT_TRIGGERED event when effect triggers
  - Emit EFFECT_RESOLVED event when effect resolves
  - Emit EFFECT_AWAITING_INPUT event when player input needed
  - Include effect details in events (source, type, targets, values)
  - _Requirements: 23.1, 23.2, 23.3_

- [x] 33. Implement stage card support





  - Place stage cards in stage area when played
  - Support only one stage per player
  - Trash existing stage when new stage is played
  - Apply stage effects continuously
  - Support stage effects with activation costs
  - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [x] 33.1 Write property test for stage placement


  - **Property 39: Stage Card Placement**
  - **Validates: Requirements 28.1**

- [x] 33.2 Write property test for single stage limit


  - **Property 40: Single Stage Limit**
  - **Validates: Requirements 28.2**

- [x] 33.3 Write property test for stage effects


  - **Property 41: Stage Effect Application**
  - **Validates: Requirements 28.4**

- [x] 34. Implement event card support





  - Resolve event effects immediately when played
  - Move events to trash after resolution
  - Support counter events during battles
  - Validate event timing restrictions
  - Support events with targeting requirements
  - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

- [x] 34.1 Write property test for event resolution


  - **Property 42: Event Immediate Resolution**
  - **Validates: Requirements 29.1**

- [x] 34.2 Write property test for event trash


  - **Property 43: Event Trash After Resolution**
  - **Validates: Requirements 29.2**

- [x] 34.3 Write property test for event timing


  - **Property 44: Event Timing Validation**
  - **Validates: Requirements 29.4**

- [x] 35. Implement leader ability support




  - Support [Activate: Main] leader abilities
  - Enforce [Once Per Turn] restrictions
  - Validate and pay costs for leader abilities
  - Apply leader ability effects
  - _Requirements: 32.1, 32.2, 32.3, 32.5_

- [x] 35.1 Write property test for leader ability timing


  - **Property 47: Leader Ability Activation Timing**
  - **Validates: Requirements 32.1**

- [x] 35.2 Write property test for once per turn




  - **Property 48: Once Per Turn Restriction**
  - **Validates: Requirements 32.2**

- [x] 36. Implement keyword abilities





  - Implement [Rush] - allows attacking the turn played
  - Implement [Blocker] - allows blocking attacks
  - Implement [Double Attack] - deals 2 life damage
  - Implement [Banish] - removes cards from game
  - Support dynamic keyword grants from effects
  - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

- [x] 37. Implement deck building validation





  - Validate deck size (exactly 50 cards)
  - Validate card limits (max 4 copies)
  - Validate leader selection (exactly 1 leader)
  - Validate color restrictions based on leader
  - Provide clear error messages
  - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_

- [x] 37.1 Write property test for deck size


  - **Property 50: Deck Size Validation**
  - **Validates: Requirements 37.1**

- [x] 37.2 Write property test for card limits


  - **Property 51: Card Limit Validation**
  - **Validates: Requirements 37.2**

- [x] 37.3 Write property test for leader requirement


  - **Property 52: Leader Requirement Validation**
  - **Validates: Requirements 37.3**

- [x] 37.4 Write property test for color restrictions


  - **Property 53: Color Restriction Validation**
  - **Validates: Requirements 37.4**

- [x] 38. Implement game state serialization



  - Serialize complete game state to JSON
  - Deserialize game states from JSON
  - Validate deserialized states for consistency
  - Support saving at any point
  - Support loading and resuming games
  - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5_

- [x] 38.1 Write property test for serialization round trip

  - **Property 54: Game State Serialization Round Trip**
  - **Validates: Requirements 38.1**

- [x] 38.2 Write property test for deserialized state validity

  - **Property 55: Deserialized State Validity**
  - **Validates: Requirements 38.3**

- [x] 39. Checkpoint - Ensure all tests pass





  - Run all unit tests and property tests
  - Fix any failing tests
  - Verify attack system works end-to-end
  - Verify effect system works end-to-end
  - Ask user if questions arise

- [x] 40. Integrate effect system with battle system




  - Trigger effects during battle steps (WHEN_ATTACKING, WHEN_ATTACKED, etc.)
  - Resolve effects at appropriate times
  - Update battle system to use effect system for triggers
  - _Requirements: 15.1, 15.2_

- [x] 41. Integrate effect system with main phase





  - Generate effect activation actions for [Activate: Main] effects
  - Execute effect activation actions
  - Include effect actions in available actions
  - _Requirements: 32.1_

- [x] 42. Integrate effect system with card playing




  - Trigger ON_PLAY effects when cards are played
  - Resolve effects before continuing
  - _Requirements: 15.1_

- [x] 43. Integrate effect system with turn phases





  - Trigger START_OF_TURN effects at turn start
  - Trigger END_OF_TURN effects at turn end
  - Clean up modifiers at appropriate times
  - _Requirements: 20.2_

- [x] 44. Update UI to display battle events





  - Subscribe to ATTACK_DECLARED events
  - Subscribe to BLOCK_DECLARED events
  - Subscribe to COUNTER_STEP_START events
  - Subscribe to BATTLE_END events
  - Show battle animations and feedback
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 45. Update UI to display effect events





  - Subscribe to EFFECT_TRIGGERED events
  - Subscribe to EFFECT_RESOLVED events
  - Subscribe to EFFECT_AWAITING_INPUT events
  - Show effect animations and descriptions
  - Display effect log
  - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5_

- [x] 46. Implement comprehensive logging




  - Log all game actions with timestamps
  - Log all effect resolutions with details
  - Log AI decision-making with evaluation scores
  - Support different log levels (debug, info, warn, error)
  - Provide way to export logs
  - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5_

- [x] 47. Write integration tests for AI vs AI combat




  - Test AI declares attack
  - Test AI responds with blocker
  - Test AI uses counter
  - Test battle resolves correctly
  - Test effects trigger appropriately
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 48. Write integration tests for effect chains





  - Test multiple effects trigger simultaneously
  - Test effects resolve in correct order
  - Test players can respond to effects
  - Test stack resolves completely
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [x] 49. Write integration tests for full games




  - Test AI vs AI complete games with effects
  - Verify all effect types work
  - Verify no deadlocks or hangs
  - Verify game ends correctly
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 50. Performance optimization




  - Profile effect parsing and caching
  - Optimize target filtering
  - Implement lazy evaluation where appropriate
  - Use copy-on-write for state updates
  - Batch similar effects
  - _Requirements: Performance targets_

- [x] 51. Final checkpoint - Complete system test





  - Run full test suite
  - Test AI vs AI games
  - Test AI vs Human games
  - Verify all features work together
  - Fix any remaining issues
  - Ask user for final review
