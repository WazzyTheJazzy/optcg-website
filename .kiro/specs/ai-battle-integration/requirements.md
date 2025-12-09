# AI Battle Integration and Card Effects Requirements

## Introduction

This specification defines the integration between the AI opponent system and the battle system to enable AI players to declare and execute attacks during gameplay, as well as the implementation of a comprehensive card effects system. Currently, the AI decision-making system and battle system exist independently, but the AI cannot actually initiate attacks or use card effects. This feature will connect these systems and implement the effect resolution engine so AI players can engage in full gameplay including combat and card abilities.

## Glossary

- **AI Player**: A computer-controlled player that makes automated decisions during gameplay
- **Battle System**: The system that handles combat-related logic including attack execution, blocking, and damage
- **Attack Declaration**: The action of an AI player choosing to attack with a character
- **Attack Target**: The opponent's leader or rested character that the AI chooses to attack
- **Main Phase**: The game phase during which attacks can be declared
- **Legal Attack**: An attack that satisfies all game rules (attacker is active/has Rush, target is valid, etc.)
- **Card Effect**: An ability on a card that modifies game state when triggered or activated
- **Effect System**: The system that resolves card effects and manages effect timing
- **Trigger**: An automatic effect that activates when a specific game event occurs
- **Activated Effect**: An effect that a player can choose to activate during their turn
- **Effect Resolution**: The process of applying an effect's changes to the game state
- **Effect Target**: A card, player, or zone that an effect applies to

## Requirements

### Requirement 1: AI Attack Action Generation

**User Story:** As an AI player, I want to generate attack actions during my main phase, so that I can engage in combat

#### Acceptance Criteria

1. WHEN the AI is in the main phase, THE AI SHALL identify all characters that can attack
2. WHEN a character can attack, THE AI SHALL generate attack actions for all legal targets
3. WHEN generating attack actions, THE AI SHALL use the BattleSystem to determine legal targets
4. WHEN no characters can attack, THE AI SHALL not generate any attack actions
5. THE AI SHALL include attack actions in the list of available actions during action selection

### Requirement 2: AI Attack Execution

**User Story:** As an AI player, I want to execute attacks when I choose attack actions, so that I can deal damage to my opponent

#### Acceptance Criteria

1. WHEN the AI selects an attack action, THE Game Engine SHALL call the BattleSystem to execute the attack
2. WHEN executing an attack, THE BattleSystem SHALL follow the complete battle sequence (attack, block, counter, damage, end)
3. WHEN an attack completes, THE Game Engine SHALL update the game state with the battle results
4. WHEN an attack causes a character to be KO'd, THE Game Engine SHALL move the character to trash
5. WHEN an attack deals damage to a leader, THE Game Engine SHALL process life cards appropriately

### Requirement 3: AI Attack Target Selection

**User Story:** As an AI player, I want to intelligently choose attack targets, so that I maximize my strategic advantage

#### Acceptance Criteria

1. WHEN evaluating attack actions, THE AI SHALL score attacks based on expected damage and risk
2. WHEN the opponent's leader is a legal target, THE AI SHALL consider the value of dealing life damage
3. WHEN rested characters are legal targets, THE AI SHALL consider the value of removing them from the field
4. WHEN multiple attack options exist, THE AI SHALL prioritize attacks with the highest strategic value
5. THE AI SHALL factor in potential blockers when evaluating attack value

### Requirement 4: AI Blocker Response

**User Story:** As an AI player, I want to respond to opponent attacks with blockers, so that I can defend against damage

#### Acceptance Criteria

1. WHEN the opponent attacks and the AI has legal blockers, THE BattleSystem SHALL query the AI for a blocker choice
2. WHEN the AI chooses to block, THE BattleSystem SHALL redirect the attack to the blocker
3. WHEN the AI chooses not to block, THE BattleSystem SHALL allow the attack to proceed to the original target
4. THE AI SHALL evaluate whether blocking improves the game state before choosing a blocker
5. THE AI SHALL use the AIDecisionSystem.selectBlocker method to make blocker decisions

### Requirement 5: AI Counter Response

**User Story:** As an AI player, I want to use counter cards during battles, so that I can prevent damage or save characters

#### Acceptance Criteria

1. WHEN the AI is defending in a battle and has counter options, THE BattleSystem SHALL query the AI for counter actions
2. WHEN the AI chooses to use a counter card, THE BattleSystem SHALL apply the counter value as a power boost
3. WHEN the AI chooses to play a counter event, THE BattleSystem SHALL resolve the event effect
4. THE AI SHALL evaluate whether countering is worth the card cost before using counters
5. THE AI SHALL use the AIDecisionSystem.selectCounterAction method to make counter decisions

### Requirement 6: Attack Action Type Definition

**User Story:** As a developer, I want a clear action type for attacks, so that the system can distinguish attacks from other actions

#### Acceptance Criteria

1. THE system SHALL define an ATTACK action type in the GameAction type system
2. THE ATTACK action SHALL include the attacker card ID and target card ID
3. THE ATTACK action SHALL be distinguishable from other action types (PLAY_CARD, GIVE_DON, etc.)
4. THE Game Engine SHALL recognize ATTACK actions and route them to the BattleSystem
5. THE AI SHALL be able to generate and select ATTACK actions like any other action type

### Requirement 7: Main Phase Attack Integration

**User Story:** As a player, I want the AI to declare attacks during the main phase, so that combat flows naturally

#### Acceptance Criteria

1. WHEN the AI is in the main phase, THE Main Phase handler SHALL include attack actions in available actions
2. WHEN the AI selects an attack action, THE Main Phase handler SHALL execute the attack through the BattleSystem
3. WHEN an attack completes, THE Main Phase handler SHALL continue allowing actions until the AI passes
4. THE Main Phase handler SHALL check for game over conditions after each attack
5. THE Main Phase handler SHALL handle multiple attacks in a single main phase

### Requirement 8: Attack Validation

**User Story:** As a developer, I want attacks to be validated before execution, so that illegal attacks are prevented

#### Acceptance Criteria

1. WHEN generating attack actions, THE system SHALL only include legal attacks
2. WHEN executing an attack, THE BattleSystem SHALL validate the attack is still legal
3. WHEN an attack becomes illegal (attacker/target moved), THE system SHALL handle the error gracefully
4. THE system SHALL use BattleSystem.canAttack to validate attack legality
5. THE system SHALL log validation failures for debugging

### Requirement 9: Battle Event Handling

**User Story:** As a developer, I want battle events to be emitted, so that the UI can visualize combat

#### Acceptance Criteria

1. WHEN an attack is declared, THE BattleSystem SHALL emit an ATTACK_DECLARED event
2. WHEN a blocker is chosen, THE BattleSystem SHALL emit a BLOCK_DECLARED event
3. WHEN the counter step begins, THE BattleSystem SHALL emit a COUNTER_STEP_START event
4. WHEN a battle ends, THE BattleSystem SHALL emit a BATTLE_END event
5. THE UI SHALL be able to subscribe to these events to show battle animations

### Requirement 10: AI vs AI Combat

**User Story:** As a developer, I want AI vs AI games to work correctly, so that I can test the battle system

#### Acceptance Criteria

1. WHEN both players are AI, THE system SHALL alternate between AI players for attack and defense decisions
2. WHEN an AI attacks another AI, THE defending AI SHALL make blocker and counter decisions
3. WHEN AI vs AI combat occurs, THE system SHALL not deadlock or hang
4. THE system SHALL complete AI vs AI games without human intervention
5. THE system SHALL emit all appropriate events during AI vs AI combat

### Requirement 11: Error Recovery

**User Story:** As a developer, I want the system to recover from battle errors, so that games don't crash

#### Acceptance Criteria

1. WHEN an attack fails to execute, THE system SHALL log the error and continue the game
2. WHEN the AI fails to choose a blocker, THE system SHALL default to no block
3. WHEN the AI fails to choose a counter, THE system SHALL default to no counter
4. WHEN a battle causes an invalid state, THE system SHALL revert to the pre-battle state if possible
5. THE system SHALL never crash due to battle-related errors

### Requirement 12: Performance

**User Story:** As a player, I want battles to execute quickly, so that the game flows smoothly

#### Acceptance Criteria

1. WHEN the AI declares an attack, THE attack SHALL execute within 2 seconds
2. WHEN the AI makes blocker decisions, THE decision SHALL complete within 1 second
3. WHEN the AI makes counter decisions, THE decision SHALL complete within 1 second
4. THE system SHALL not introduce noticeable lag during combat
5. THE system SHALL handle multiple attacks in a turn without performance degradation

### Requirement 13: Card Effect System Architecture

**User Story:** As a developer, I want a flexible effect system, so that I can implement diverse card abilities

#### Acceptance Criteria

1. THE system SHALL define an Effect type that represents card abilities
2. THE system SHALL support multiple effect types (power modification, card draw, search, damage, etc.)
3. THE system SHALL support effect timing (On Play, When Attacking, When Attacked, End of Turn, etc.)
4. THE system SHALL support effect targeting (specific cards, all cards, players, zones)
5. THE system SHALL support effect conditions (if X, then Y)

### Requirement 13: Effect Parsing and Loading

**User Story:** As a developer, I want to load card effects from card data, so that cards have their abilities

#### Acceptance Criteria

1. WHEN loading card data, THE system SHALL parse effect definitions from card JSON
2. WHEN a card is created, THE system SHALL attach its effect definitions to the card instance
3. THE system SHALL validate effect definitions during loading
4. THE system SHALL log errors for invalid effect definitions
5. THE system SHALL support cards with multiple effects

### Requirement 14: Effect Triggering

**User Story:** As a player, I want card effects to trigger automatically, so that abilities activate at the right time

#### Acceptance Criteria

1. WHEN a trigger condition is met, THE system SHALL identify all effects that should trigger
2. WHEN multiple effects trigger simultaneously, THE system SHALL resolve them in priority order
3. WHEN an effect triggers, THE system SHALL create an effect instance with the current game context
4. THE system SHALL support trigger conditions: On Play, When Attacking, When Attacked, On K.O., End of Turn, Start of Turn
5. THE system SHALL queue triggered effects for resolution

### Requirement 15: Effect Resolution

**User Story:** As a player, I want effects to resolve correctly, so that card abilities work as intended

#### Acceptance Criteria

1. WHEN resolving an effect, THE system SHALL apply the effect's changes to the game state
2. WHEN an effect requires targeting, THE system SHALL prompt the controller to choose targets
3. WHEN an effect requires a choice, THE system SHALL prompt the controller to make the choice
4. WHEN an effect modifies power, THE system SHALL apply the modifier with the correct duration
5. WHEN an effect moves cards, THE system SHALL update card zones appropriately

### Requirement 16: Common Effect Types

**User Story:** As a developer, I want to implement common effect types, so that most cards work correctly

#### Acceptance Criteria

1. THE system SHALL implement power modification effects (+X power, -X power)
2. THE system SHALL implement card draw effects (draw X cards)
3. THE system SHALL implement search effects (search deck for card matching criteria)
4. THE system SHALL implement K.O. effects (K.O. target character)
5. THE system SHALL implement rest/active effects (rest target, activate target)
6. THE system SHALL implement DON attachment effects (attach DON to target)
7. THE system SHALL implement life damage effects (deal X damage to leader)
8. THE system SHALL implement hand discard effects (discard X cards)

### Requirement 17: Effect Targeting System

**User Story:** As a player, I want to target cards with effects, so that I can choose which cards are affected

#### Acceptance Criteria

1. WHEN an effect requires a target, THE system SHALL determine legal targets based on effect criteria
2. WHEN presenting targets to a player, THE system SHALL only show legal targets
3. WHEN a player chooses a target, THE system SHALL validate the target is legal
4. THE system SHALL support target filters (color, cost, power, type, etc.)
5. THE system SHALL support multiple targets (target up to X cards)

### Requirement 18: AI Effect Decision Making

**User Story:** As an AI player, I want to make intelligent effect decisions, so that I use abilities effectively

#### Acceptance Criteria

1. WHEN the AI must choose a target for an effect, THE AI SHALL evaluate all legal targets
2. WHEN the AI must choose whether to activate an optional effect, THE AI SHALL evaluate the effect's value
3. WHEN the AI must choose a value for an effect, THE AI SHALL choose the value that maximizes advantage
4. THE AI SHALL use the ActionEvaluator to score effect outcomes
5. THE AI SHALL integrate effect evaluation into overall action selection

### Requirement 19: Effect Modifiers and Duration

**User Story:** As a player, I want effect modifiers to last the correct duration, so that temporary effects expire properly

#### Acceptance Criteria

1. THE system SHALL support modifier durations: Until End of Turn, Until End of Battle, Permanent
2. WHEN a turn ends, THE system SHALL remove all "Until End of Turn" modifiers
3. WHEN a battle ends, THE system SHALL remove all "Until End of Battle" modifiers
4. WHEN a card leaves the field, THE system SHALL remove all modifiers on that card
5. THE system SHALL track modifier sources for debugging and effect interaction

### Requirement 20: Effect Conditions and Requirements

**User Story:** As a developer, I want to implement conditional effects, so that effects only apply when conditions are met

#### Acceptance Criteria

1. THE system SHALL support effect conditions (if you have X or more DON, if opponent has X life, etc.)
2. WHEN evaluating an effect, THE system SHALL check if conditions are met
3. WHEN conditions are not met, THE system SHALL not apply the effect
4. THE system SHALL support multiple conditions with AND/OR logic
5. THE system SHALL re-evaluate conditions when game state changes

### Requirement 21: Effect Cost Payment

**User Story:** As a player, I want to pay costs for activated effects, so that abilities have appropriate costs

#### Acceptance Criteria

1. WHEN activating an effect with a cost, THE system SHALL verify the player can pay the cost
2. THE system SHALL support cost types: rest DON, trash cards, rest character, discard cards
3. WHEN a player cannot pay the cost, THE system SHALL not allow effect activation
4. WHEN a cost is paid, THE system SHALL update game state appropriately
5. THE system SHALL validate cost payment before resolving the effect

### Requirement 22: Effect Stack and Priority

**User Story:** As a player, I want effects to resolve in the correct order, so that complex interactions work properly

#### Acceptance Criteria

1. THE system SHALL maintain an effect stack for resolving multiple effects
2. WHEN multiple effects trigger, THE system SHALL add them to the stack in priority order
3. THE system SHALL resolve effects from the stack one at a time
4. THE system SHALL allow players to respond to effects with counter effects
5. THE system SHALL handle effect resolution until the stack is empty

### Requirement 23: Effect Event Emission

**User Story:** As a developer, I want effect events to be emitted, so that the UI can show effect resolution

#### Acceptance Criteria

1. WHEN an effect triggers, THE system SHALL emit an EFFECT_TRIGGERED event
2. WHEN an effect resolves, THE system SHALL emit an EFFECT_RESOLVED event
3. WHEN an effect requires player input, THE system SHALL emit an EFFECT_AWAITING_INPUT event
4. THE events SHALL include effect details (source, type, targets, values)
5. THE UI SHALL be able to subscribe to these events to show effect animations

### Requirement 24: Card-Specific Effect Implementation

**User Story:** As a developer, I want to implement effects for specific cards, so that the card pool is playable

#### Acceptance Criteria

1. THE system SHALL provide a registry for card-specific effect implementations
2. WHEN a card has a unique effect, THE system SHALL look up the implementation in the registry
3. THE system SHALL support both generic effects (power boost) and unique effects (specific card abilities)
4. THE system SHALL log warnings for cards with unimplemented effects
5. THE system SHALL gracefully handle missing effect implementations

### Requirement 25: Effect Testing and Validation

**User Story:** As a developer, I want to test effects thoroughly, so that card abilities work correctly

#### Acceptance Criteria

1. THE system SHALL provide test utilities for effect resolution
2. THE system SHALL validate that effects produce expected game state changes
3. THE system SHALL test effect targeting with various board states
4. THE system SHALL test effect conditions and requirements
5. THE system SHALL test effect interactions and edge cases

### Requirement 26: Effect Documentation

**User Story:** As a developer, I want clear documentation for implementing effects, so that adding new cards is straightforward

#### Acceptance Criteria

1. THE system SHALL document the effect type system and available effect types
2. THE system SHALL provide examples of common effect implementations
3. THE system SHALL document the effect resolution process
4. THE system SHALL document how to add new effect types
5. THE system SHALL document effect timing and priority rules


### Requirement 27: Effect Type Catalog

**User Story:** As a developer, I want a comprehensive catalog of effect types, so that I know what needs to be implemented

#### Acceptance Criteria

1. THE system SHALL support the following effect types based on existing card pool:

**Power Modification Effects:**
- Give target +X power (temporary or permanent)
- Give target -X power (temporary or permanent)
- Conditional power boost (if condition, then +X power)

**K.O. Effects:**
- K.O. character with X power or less
- K.O. character with cost X or less
- K.O. specific target character

**Bounce Effects (Return to Hand):**
- Return character with cost X or less to owner's hand
- Return target character to owner's hand
- Return own character to hand

**Search/Look Effects:**
- Look at top X cards of deck
- Search deck for card matching criteria
- Reveal and add card to hand
- Place remaining cards at bottom of deck

**Keyword Grant Effects:**
- Grant [Rush] to character
- Grant [Blocker] to character
- Grant [Double Attack] to character

**Activated Abilities:**
- [Activate: Main] effects that can be used during main phase
- [Once Per Turn] restrictions on activated abilities
- Cost requirements for activation (trash card, rest DON, etc.)

**Trigger Timing:**
- [On Play] - when card is played from hand
- [When Attacking] - when this card attacks
- [When Attacked] - when this card is attacked
- [On K.O.] - when this card is K.O.'d
- [End of Turn] - at end of turn
- [Start of Turn] - at start of turn

**Conditional Effects:**
- If opponent has X or more cards in hand
- If you have X or more DON
- If opponent has X life or less
- If you control X or more characters

**DON Effects:**
- [DON!! x1] - requires 1 DON to be attached
- Attach DON to character
- Rest DON for cost

**Card Draw/Discard:**
- Draw X cards
- Discard X cards
- Trash cards from hand

**Life Effects:**
- Deal X damage to opponent's leader
- Add life card to hand

2. THE system SHALL prioritize implementing the most common effect types first
3. THE system SHALL log warnings for unimplemented effect types encountered
4. THE system SHALL provide a fallback for cards with unimplemented effects
5. THE system SHALL document which effect types are implemented and which are pending


### Requirement 28: Stage Card Support

**User Story:** As a player, I want to play stage cards, so that I can use their ongoing effects

#### Acceptance Criteria

1. WHEN a player plays a stage card, THE system SHALL place it in the stage area
2. THE system SHALL support only one stage card per player at a time
3. WHEN a new stage is played, THE system SHALL trash the existing stage
4. THE system SHALL apply stage effects continuously while the stage is in play
5. THE system SHALL support stage effects with activation costs

### Requirement 29: Event Card Support

**User Story:** As a player, I want to play event cards, so that I can use their one-time effects

#### Acceptance Criteria

1. WHEN a player plays an event card, THE system SHALL resolve its effect immediately
2. WHEN an event effect resolves, THE system SHALL move the event to trash
3. THE system SHALL support counter events that can be played during battles
4. THE system SHALL validate event timing restrictions (Main phase only, Counter timing, etc.)
5. THE system SHALL support events with targeting requirements

### Requirement 30: Multiple Attackers Per Turn

**User Story:** As a player, I want to attack with multiple characters in one turn, so that I can maximize damage

#### Acceptance Criteria

1. WHEN the AI has multiple active characters, THE AI SHALL consider attacking with each one
2. THE system SHALL allow multiple attacks in a single main phase
3. THE system SHALL track which characters have already attacked this turn
4. THE system SHALL prevent characters from attacking multiple times per turn (unless they have special abilities)
5. THE AI SHALL evaluate the order of attacks to maximize strategic value

### Requirement 31: DON Management During Combat

**User Story:** As a player, I want to attach DON to characters before attacking, so that they have more power

#### Acceptance Criteria

1. WHEN the AI is planning attacks, THE AI SHALL consider attaching DON to attackers first
2. THE system SHALL allow DON attachment during the main phase before attacks
3. THE AI SHALL evaluate whether DON attachment makes attacks more favorable
4. THE system SHALL track DON attachments and apply power bonuses correctly
5. THE AI SHALL reserve DON for defensive purposes when appropriate

### Requirement 32: Leader Abilities

**User Story:** As a player, I want to use my leader's activated ability, so that I can leverage my leader's power

#### Acceptance Criteria

1. WHEN a leader has an [Activate: Main] ability, THE system SHALL allow activation during main phase
2. THE system SHALL enforce [Once Per Turn] restrictions on leader abilities
3. THE system SHALL validate and pay costs for leader ability activation
4. THE AI SHALL evaluate when to use leader abilities based on game state
5. THE system SHALL apply leader ability effects correctly

### Requirement 33: Keyword Abilities

**User Story:** As a player, I want keyword abilities to work correctly, so that cards function as intended

#### Acceptance Criteria

1. THE system SHALL implement [Rush] - allows attacking the turn a character is played
2. THE system SHALL implement [Blocker] - allows blocking attacks
3. THE system SHALL implement [Double Attack] - deals 2 life damage instead of 1
4. THE system SHALL implement [Banish] - removes cards from the game permanently
5. THE system SHALL support dynamic keyword grants (effects that give keywords temporarily)

### Requirement 34: Effect Chains and Responses

**User Story:** As a player, I want to respond to opponent effects, so that I can interact during their turn

#### Acceptance Criteria

1. WHEN an effect is played, THE system SHALL allow the opponent to respond with counter effects
2. THE system SHALL maintain an effect chain that resolves in LIFO order
3. THE system SHALL allow multiple responses to build up a chain
4. THE system SHALL resolve the chain completely before continuing the game
5. THE AI SHALL evaluate whether to respond to opponent effects

### Requirement 35: Card Text Parsing

**User Story:** As a developer, I want to parse card text into effect definitions, so that cards can be loaded automatically

#### Acceptance Criteria

1. THE system SHALL parse effect text from card database into structured effect definitions
2. THE system SHALL recognize common effect patterns (K.O., power boost, search, etc.)
3. THE system SHALL extract targeting criteria from effect text
4. THE system SHALL extract conditions from effect text
5. THE system SHALL log warnings for unparseable effect text

### Requirement 36: Effect Animation and Visualization

**User Story:** As a player, I want to see effects being resolved, so that I understand what's happening

#### Acceptance Criteria

1. WHEN an effect triggers, THE UI SHALL display the effect source and description
2. WHEN an effect targets cards, THE UI SHALL highlight the targets
3. WHEN power is modified, THE UI SHALL show the power change animation
4. WHEN cards move zones, THE UI SHALL animate the movement
5. THE UI SHALL display a log of all effects resolved during the turn

### Requirement 37: Deck Building Validation

**User Story:** As a player, I want my deck to be validated, so that I know it's legal for play

#### Acceptance Criteria

1. THE system SHALL validate deck size (50 cards)
2. THE system SHALL validate card limits (max 4 copies of any card except DON)
3. THE system SHALL validate leader selection (exactly 1 leader)
4. THE system SHALL validate color restrictions based on leader
5. THE system SHALL provide clear error messages for invalid decks

### Requirement 38: Game State Serialization

**User Story:** As a developer, I want to save and load game states, so that games can be resumed

#### Acceptance Criteria

1. THE system SHALL serialize the complete game state to JSON
2. THE system SHALL deserialize game states from JSON
3. THE system SHALL validate deserialized states for consistency
4. THE system SHALL support saving game states at any point
5. THE system SHALL support loading saved games and resuming play

### Requirement 39: Replay and Undo

**User Story:** As a player, I want to undo actions during testing, so that I can experiment with strategies

#### Acceptance Criteria

1. THE system SHALL maintain a history of game states
2. THE system SHALL support undoing the last action
3. THE system SHALL support replaying a sequence of actions
4. THE system SHALL limit undo to testing/practice modes only
5. THE system SHALL clear undo history when committing to an action in competitive mode

### Requirement 40: Comprehensive Logging

**User Story:** As a developer, I want detailed logs of game actions, so that I can debug issues

#### Acceptance Criteria

1. THE system SHALL log all game actions with timestamps
2. THE system SHALL log all effect resolutions with details
3. THE system SHALL log AI decision-making with evaluation scores
4. THE system SHALL support different log levels (debug, info, warn, error)
5. THE system SHALL provide a way to export logs for analysis
