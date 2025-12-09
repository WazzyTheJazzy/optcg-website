# Implementation Plan

- [x] 1. Set up project structure and core type definitions





  - Create `lib/game-engine` directory structure with subdirectories for core, rules, battle, effects, zones, phases, setup, rendering, and utils
  - Define core TypeScript types in `types.ts`: ZoneId, CardCategory, CardState, Phase, EffectTimingType, TriggerTiming, PlayerId enums
  - Define CardDefinition, EffectDefinition, CardInstance, DonInstance, PlayerState, GameState interfaces
  - Define Event, EffectInstance, TriggerInstance, Target, Modifier interfaces
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Implement GameState and state management





  - Create `GameState.ts` with immutable state container class
  - Implement state query methods: getCard, getPlayer, getZone, getActivePlayer
  - Implement state update methods that return new state: updateCard, moveCard, updatePlayer
  - Add game history tracking for replay/undo support
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement RulesContext and load rules JSON





  - Create `rules.json` with official One Piece TCG rules data including turn structure, battle system, keywords, zones, defeat conditions, and infinite loop rules
  - Create `RulesContext.ts` class that wraps rules JSON
  - Implement rule query methods: getPhaseSequence, getBattleSteps, getKeywordDefinition, isFirstTurnBattleBanned, getMaxCharacterArea, getStartingHandSize, getDonPerTurn, getInfiniteLoopRules
  - Add validation for rules JSON schema on load
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 13.5_

- [x] 4. Implement event emission system





  - Create `EventEmitter.ts` with type-safe event emission
  - Define GameEventType enum with all event types: CARD_MOVED, CARD_STATE_CHANGED, POWER_CHANGED, ATTACK_DECLARED, BLOCK_DECLARED, COUNTER_STEP_START, BATTLE_END, PHASE_CHANGED, TURN_START, TURN_END, GAME_OVER
  - Implement on/off/emit methods with proper typing
  - Add event filtering and subscription management
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 5. Implement ZoneManager for card movement





  - Create `ZoneManager.ts` to handle all card zone transitions
  - Implement moveCard method that updates state and emits CARD_MOVED events
  - Implement zone-specific operations: addToZone, removeFromZone, getZoneContents
  - Enforce zone limits (character area max 5, stage area max 1)
  - Handle DON card movement between don deck and cost area
  - _Requirements: 1.3, 1.5, 6.6_

- [x] 6. Implement game setup system





  - Create `GameSetup.ts` with setupGame function
  - Implement deck loading and validation (50 cards, 1 leader, 10 DON)
  - Implement first player selection (random or choice)
  - Implement opening draw (5 cards per player)
  - Implement mulligan system (return hand to deck, shuffle, draw 5)
  - Implement life placement based on leader's life value
  - Apply "Start of Game" leader effects
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Implement PhaseManager and turn structure





  - Create `PhaseManager.ts` to orchestrate turn phases
  - Implement runTurn method that executes phases in sequence from rules context
  - Create phase-specific files: RefreshPhase.ts, DrawPhase.ts, DonPhase.ts, MainPhase.ts, EndPhase.ts
  - Implement phase transition logic with PHASE_CHANGED events
  - Handle turn number increment and active player switching
  - _Requirements: 3.1, 11.2_

- [x] 8. Implement Refresh Phase





  - Create `RefreshPhase.ts` with runRefreshPhase function
  - Expire effects with "until start of your next turn" duration
  - Trigger START_OF_TURN auto effects
  - Return all given DON cards to cost area as rested
  - Set all rested cards and DON to active state
  - _Requirements: 3.2_

- [x] 9. Implement Draw Phase





  - Create `DrawPhase.ts` with runDrawPhase function
  - Draw 1 card for active player
  - Skip draw on first turn for player going first
  - Handle deck empty condition (triggers defeat)
  - _Requirements: 3.3_

- [x] 10. Implement Don Phase







  - Create `DonPhase.ts` with runDonPhase function
  - Place 2 DON from don deck to cost area as active (normal turns)
  - Place 1 DON on first turn for player going first
  - Handle empty don deck gracefully
  - _Requirements: 3.4_

- [x] 11. Implement Main Phase action framework





  - Create `MainPhase.ts` with runMainPhase function
  - Trigger START_OF_MAIN auto effects
  - Implement action loop that queries player for actions until they pass
  - Define Action types: PlayCard, ActivateEffect, GiveDon, Attack, EndMain
  - Route actions to appropriate handlers
  - Resolve pending triggers after each action
  - _Requirements: 3.5_

- [x] 12. Implement End Phase





  - Create `EndPhase.ts` with runEndPhase function
  - Trigger END_OF_YOUR_TURN effects for active player
  - Trigger END_OF_OPPONENT_TURN effects for non-active player
  - Expire effects with "until end of turn" and "during this turn" durations
  - _Requirements: 3.6_

- [x] 13. Implement card playing system





  - Create `CardPlayHandler.ts` with handlePlayCard function
  - Validate card is in hand and player can afford cost
  - Implement cost payment by resting DON in cost area
  - Handle character playing: enforce 5-card limit, move to character area, trigger On Play effects
  - Handle stage playing: trash existing stage, move to stage area, trigger On Play effects
  - Handle event playing: resolve effect, move to trash
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Implement DON giving system





  - Create `DonHandler.ts` with handleGiveDon function
  - Validate DON is active in cost area
  - Validate target is character or leader on field
  - Move DON from cost area to under target card (givenDon array)
  - Update card power calculation to include given DON
  - _Requirements: 6.6_

- [x] 15. Implement power and cost calculation





  - Create `DamageCalculator.ts` with power and cost calculation methods
  - Implement computeCurrentPower: base power + modifiers + given DON count
  - Implement getCurrentCost: base cost + modifiers, clamped to minimum 0
  - Support temporary and permanent modifiers
  - _Requirements: 12.1, 12.2_

- [x] 16. Implement BattleSystem core





  - Create `BattleSystem.ts` with executeAttack method
  - Implement canAttack validation: check turn rules, card state, Rush keyword, target validity
  - Implement getLegalTargets: opponent's leader or rested characters
  - Implement getLegalBlockers: characters with Blocker keyword
  - Orchestrate battle steps: attack, block, counter, damage, end
  - _Requirements: 5.1, 5.8, 13.1_

- [x] 17. Implement battle attack step





  - Implement attackStep method in BattleSystem
  - Rest the attacker
  - Emit ATTACK_DECLARED event
  - Trigger WHEN_ATTACKING effects on attacker
  - Trigger ON_OPPONENT_ATTACK effects for defender
  - Check if attacker or target left field (abort battle if so)
  - _Requirements: 5.1_

- [x] 18. Implement battle block step





  - Implement blockStep method in BattleSystem
  - Query defender for blocker choice from legal blockers
  - If blocker chosen: rest blocker, redirect attack to blocker, emit BLOCK_DECLARED event
  - Trigger ON_BLOCK effects
  - Check if attacker or target left field (abort battle if so)
  - _Requirements: 5.2, 5.3, 13.2_

- [x] 19. Implement battle counter step





  - Implement counterStep method in BattleSystem
  - Emit COUNTER_STEP_START event
  - Trigger WHEN_ATTACKED effects on defender
  - Query defender for counter actions in loop until they pass
  - Handle USE_COUNTER_CARD: trash card from hand, apply counter value as power boost
  - Handle PLAY_COUNTER_EVENT: pay cost, resolve counter event, trash event
  - _Requirements: 5.4, 12.3_

- [x] 20. Implement battle damage step





  - Implement damageStep method in BattleSystem
  - Compare attacker power to defender power
  - If attacker power < defender power: no damage, battle ends
  - If defender is leader: calculate damage amount (1 or 2 for Double Attack), call dealLeaderDamage
  - If defender is character: call koCharacter
  - _Requirements: 5.5_

- [x] 21. Implement leader damage system





  - Implement dealLeaderDamage method in BattleSystem
  - For each damage: check if life is empty (defeat if so), take top life card
  - If life card has Trigger keyword: query player to activate or add to hand
  - If trigger activated: move to LIMBO, resolve trigger effect, place in trash (or hand per effect)
  - If not trigger or not activated: add to hand
  - Run defeat check after each life card
  - _Requirements: 5.6, 5.7, 13.3_

- [x] 22. Implement battle end step





  - Implement endBattle method in BattleSystem
  - Emit BATTLE_END event
  - Trigger END_OF_BATTLE effects for both players
  - Expire "during this battle" modifiers
  - _Requirements: 5.8_

- [x] 23. Implement K.O. system





  - Create `KOHandler.ts` with koCharacter function
  - Check for "On K.O." effects while card is still on field
  - Enqueue On K.O. triggers
  - Move card to trash
  - Resolve queued On K.O. triggers (which resolve from trash)
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 24. Implement EffectSystem core





  - Create `EffectSystem.ts` with effect resolution orchestration
  - Implement activateEffect method: check conditions, pay cost, choose targets/values, resolve
  - Implement resolveEffect method: apply replacement effects, execute script
  - Implement checkCondition method for condition expression evaluation
  - Implement payCost method for cost expression payment
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 25. Implement TriggerQueue





  - Create `TriggerQueue.ts` for managing auto triggers
  - Implement enqueueTrigger method to add triggers to queue
  - Implement resolveAllPendingTriggers: partition by turn player, resolve turn player first, then non-turn player
  - Implement resolveSingleTrigger: build effect instance, choose targets, resolve
  - Handle newly created triggers during resolution (re-queue and resolve)
  - _Requirements: 7.1, 7.2, 7.6_

- [x] 26. Implement effect script execution system





  - Create `EffectScripts.ts` with EffectContext interface and helper methods
  - Define EffectScript type as function taking EffectContext
  - Implement context helper methods: moveCard, modifyPower, modifyCost, drawCards, searchZone, koCard, restCard, activateCard
  - Create script registry mapping scriptId to EffectScript function
  - Implement executeScript method that looks up and runs script with context
  - _Requirements: 7.5_

- [x] 27. Implement basic effect scripts





  - Implement common effect scripts: draw cards, search deck, power boost, cost reduction, K.O. character, rest character
  - Implement On Play effects: draw, search, power boost
  - Implement When Attacking effects: power boost, draw
  - Implement On K.O. effects: search, add to hand
  - Register all scripts in script registry
  - _Requirements: 7.5_

- [x] 28. Implement keyword system





  - Create `KeywordHandler.ts` to check and enforce keywords
  - Implement hasKeyword method that checks card definition and modifiers
  - Implement Rush keyword: allow attack on turn played
  - Implement Blocker keyword: allow blocking attacks
  - Implement Trigger keyword: allow activation when taken as life damage
  - Implement Double Attack keyword: deal 2 damage to leaders instead of 1
  - Query keyword definitions from RulesContext
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 29. Implement modifier system





  - Create `ModifierManager.ts` to track and apply modifiers
  - Define Modifier interface: type, value, duration, source
  - Implement addModifier method to apply modifiers to cards
  - Implement removeModifier method for expired modifiers
  - Implement expireModifiers method called at phase/turn/battle end
  - Support modifier durations: permanent, until end of turn, until end of battle, until start of next turn
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 30. Implement replacement effects





  - Create `ReplacementEffectHandler.ts` for replacement effect processing
  - Implement applyCostReplacementEffects: modify cost expressions before payment
  - Implement applyBodyReplacementEffects: modify effect instances before resolution
  - Support REPLACEMENT timing type effects
  - Handle multiple replacement effects with proper ordering
  - _Requirements: 15.1, 15.2, 15.3_

- [x] 31. Implement defeat checking





  - Create `DefeatChecker.ts` with runDefeatCheck function
  - Check if any player has defeated flag set (mark game over, set winner)
  - Check if any player's deck is empty (mark game over, set winner)
  - Check if any player has zero life and takes damage (mark defeated)
  - Call after every action and trigger resolution
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 32. Implement loop guard





  - Create `LoopGuard.ts` to detect infinite loops
  - Implement hashRelevantState to create state fingerprint
  - Track state hash occurrences in history map
  - When max repeats exceeded: apply official infinite loop rules
  - Implement resolveInfiniteLoopByRules: determine if either/both/neither player can stop loop, resolve accordingly
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 33. Implement GameEngine main class





  - Create `GameEngine.ts` as main orchestrator
  - Wire together all subsystems: rules, battle, effects, phases, zones, setup
  - Implement constructor that initializes all subsystems
  - Implement setupGame method that calls GameSetup
  - Implement runGame method that loops runTurn until game over
  - Implement runTurn method that delegates to PhaseManager
  - Implement action handler methods: playCard, activateEffect, giveDon, declareAttack
  - Implement state query methods: getState, canPerformAction, getLegalActions
  - Implement event system methods: on, off, emit
  - _Requirements: 1.1, 3.1, 11.1_

- [x] 34. Implement RenderingInterface





  - Create `RenderingInterface.ts` as bridge to Three.js
  - Implement event subscription methods: onCardMoved, onCardStateChanged, onPowerChanged, onBattleEvent, onPhaseChanged
  - Implement state query methods: getCardVisualState, getZoneContents, getBoardState
  - Implement animation hook system: registerAnimationHook, waitForAnimation (placeholder for future)
  - Implement getCardMetadata for special effects data (alt art, promo, leader, rarity, colors)
  - Wire to GameEngine event emitter
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 35. Create Three.js GameScene component





  - Create `components/game/GameScene.tsx` React component
  - Set up Three.js scene, camera, renderer, lights
  - Subscribe to RenderingInterface events
  - Create zone layouts for both players (deck, hand, trash, life, don deck, cost area, leader, characters, stage)
  - Handle window resize
  - Implement camera controls (orbit, zoom)
  - _Requirements: 16.1, 16.2_

- [x] 36. Create Three.js CardMesh component





  - Create `components/game/CardMesh.tsx` for 3D card representation
  - Create card geometry (plane with rounded corners)
  - Load card image as texture
  - Implement rotation for ACTIVE (0°) and RESTED (90°) states
  - Add power/cost overlay text
  - Add hover highlight effect
  - Implement click interaction callback
  - Position based on zone and index
  - _Requirements: 16.1, 16.4_

- [x] 37. Create Three.js ZoneRenderer component





  - Create `components/game/ZoneRenderer.tsx` for zone visualization
  - Render zone boundaries and labels
  - Position cards within zones using grid or stack layout
  - Handle different zone types: deck (stack), hand (fan), character area (grid), etc
  - Update when zone contents change via RenderingInterface events
  - _Requirements: 16.1, 16.2_

- [x] 38. Create GameBoard component





  - Create `components/game/GameBoard.tsx` as complete board layout
  - Compose GameScene with all ZoneRenderers
  - Add UI overlay for phase indicator, turn counter, player info
  - Add action buttons (End Phase, Pass Priority, etc)
  - Wire user interactions to GameEngine action methods
  - Display legal actions based on game state
  - _Requirements: 16.1, 16.2, 16.3_

- [x] 39. Implement error handling














  - Create error classes: GameEngineError, IllegalActionError, InvalidStateError, RulesViolationError
  - Add validation before all state-changing operations
  - Implement atomic operations with rollback on error
  - Emit error events for UI display
  - Add debug mode with verbose logging
  - Add try-catch blocks in all action handlers
  - _Requirements: All (error handling is cross-cutting)_

- [x] 40. Write unit tests for core systems






  - Test GameState: state transitions, immutability, query methods
  - Test RulesContext: rule queries, JSON parsing, validation
  - Test ZoneManager: card movement, zone limits, event emission
  - Test PhaseManager: phase sequence, phase transitions
  - Test DamageCalculator: power calculation, cost calculation, modifiers
  - _Requirements: All_

- [x] 41. Write unit tests for battle system





  - Test BattleSystem: attack validation, legal targets, legal blockers
  - Test attack step: rest attacker, trigger effects, event emission
  - Test block step: blocker selection, attack redirection
  - Test counter step: counter cards, counter events, power boosts
  - Test damage step: power comparison, K.O., leader damage
  - Test leader damage: life cards, triggers, defeat conditions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 42. Write unit tests for effect system





  - Test EffectSystem: effect activation, condition checking, cost payment
  - Test TriggerQueue: trigger queuing, turn player priority, resolution order
  - Test effect scripts: draw, search, power boost, K.O., rest
  - Test replacement effects: cost replacement, body replacement
  - Test once-per-turn restrictions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 15.1, 15.2, 15.3_

- [x] 43. Write integration tests





  - Test complete turn flow through all phases
  - Test full battle sequence from declaration to damage
  - Test effect chains with multiple triggers
  - Test win conditions: deck out, life depletion
  - Test game setup: mulligan, life placement, first player
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4_

- [x] 44. Write rules accuracy tests





  - Test specific card interactions from official rulings
  - Test edge cases: empty zones, maximum limits, timing conflicts
  - Test each keyword: Rush, Blocker, Trigger, Double Attack
  - Test first turn rules: no draw, 1 DON, no battle
  - Test infinite loop detection and resolution
  - _Requirements: 10.1, 10.2, 10.3, 11.3, 13.1, 13.2, 13.3, 13.4_

- [x] 45. Write rendering integration tests





  - Test event emission for all state changes
  - Test RenderingInterface state queries return correct data
  - Test animation hooks are called at correct times
  - Test card metadata is accessible for special effects
  - Test Three.js components render without errors
  - _Requirements: 14.1, 14.2, 14.3, 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 46. Create example card definitions
  - Create JSON files with sample card definitions for testing
  - Include leaders with different life values
  - Include characters with various costs, powers, keywords
  - Include events with different effects
  - Include stages
  - Cover all card categories and common keywords
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 47. Create example deck lists
  - Create JSON files with valid 50-card deck lists
  - Include 1 leader per deck
  - Include mix of characters, events, stages
  - Create decks that test different strategies and card interactions
  - _Requirements: 4.1, 4.2_

- [ ] 48. Create demo game application
  - Create main application entry point that initializes engine
  - Load example decks and rules JSON
  - Set up GameBoard component with RenderingInterface
  - Implement basic AI opponent (random legal actions)
  - Add game controls: start game, reset, undo
  - Add state inspector for debugging
  - _Requirements: All (integration of all systems)_

- [ ] 49. Add documentation
  - Write README with architecture overview and getting started guide
  - Document all public APIs with JSDoc comments
  - Create examples for common use cases: loading cards, running games, adding effects
  - Document effect script system and how to add new cards
  - Document rules JSON schema
  - Create architecture diagrams
  - _Requirements: All_

- [ ] 50. Performance optimization
  - Profile game execution to identify bottlenecks
  - Optimize state updates to minimize copying
  - Add memoization for expensive calculations (power, legal actions)
  - Optimize Three.js rendering (instancing, frustum culling)
  - Add performance monitoring and metrics
  - Test with large game states (100+ turns)
  - _Requirements: All (performance is cross-cutting)_
