# Requirements Document

## Introduction

This document specifies the requirements for a programmable, modular One Piece Trading Card Game (TCG) engine that implements the complete official game rules. The engine will support game simulation, card interaction testing, AI opponents, automated rule testing, and both online and local play modes. The system must remain synchronized with real-world One Piece TCG rules and support loading any card set or dataset.

## Glossary

- **Game Engine**: The core system that manages game state, enforces rules, and processes player actions
- **Card Definition**: Static data describing a card's properties (name, cost, power, effects, keywords)
- **Card Instance**: A runtime reference to a card in a specific zone with current state and modifiers
- **Zone**: A game area where cards can exist (Deck, Hand, Trash, Life, Don Deck, Cost Area, Leader Area, Character Area, Stage Area, Limbo)
- **DON Card**: Special resource cards used to pay costs and boost character power
- **Effect**: A card ability that modifies game state (Auto, Activate, Permanent, Replacement types)
- **Trigger**: An automatic effect that activates when specific game events occur
- **Game State**: The complete current state of a game including all zones, cards, and player data
- **Rules Context**: A wrapper around the official rules JSON that provides rule queries
- **Battle System**: The subsystem handling attack declarations, blocking, counters, and damage resolution
- **Phase**: A distinct segment of a turn (Refresh, Draw, Don Phase, Main, End)

## Requirements

### Requirement 1

**User Story:** As a game developer, I want a core game engine that manages complete game state, so that I can simulate accurate One Piece TCG matches

#### Acceptance Criteria

1. WHEN the Game Engine initializes, THE Game Engine SHALL create a GameState structure containing player states, active player, current phase, turn number, rules context, pending triggers, game over status, winner, loop guard, and random number generator
2. WHILE a game is in progress, THE Game Engine SHALL maintain accurate state for both players including deck, hand, trash, life, don deck, cost area, leader area, character area, stage area, and player flags
3. THE Game Engine SHALL support all official zones: DECK, HAND, TRASH, LIFE, DON_DECK, COST_AREA, LEADER_AREA, CHARACTER_AREA, STAGE_AREA, and LIMBO
4. THE Game Engine SHALL track card states as ACTIVE, RESTED, or NONE based on zone and game actions
5. THE Game Engine SHALL enforce the character area limit of 5 cards per player

### Requirement 2

**User Story:** As a game developer, I want the engine to load and interpret card definitions, so that any card set can be used in the game

#### Acceptance Criteria

1. THE Game Engine SHALL load CardDefinition structures containing id, name, category, colors, type tags, attributes, base power, base cost, life value, counter value, rarity, keywords, and effects
2. THE Game Engine SHALL support card categories: LEADER, CHARACTER, EVENT, STAGE, and DON
3. WHEN a card is instantiated in a game, THE Game Engine SHALL create a CardRef linking the definition to runtime state including owner, controller, zone, state, given don, modifiers, and flags
4. THE Game Engine SHALL support effect definitions with id, label, timing type, trigger timing, condition expression, cost expression, body script id, and once-per-turn flag
5. THE Game Engine SHALL support effect timing types: AUTO, ACTIVATE, PERMANENT, and REPLACEMENT

### Requirement 3

**User Story:** As a game developer, I want the engine to implement the complete turn structure, so that games follow official One Piece TCG rules

#### Acceptance Criteria

1. THE Game Engine SHALL execute turns in the sequence: REFRESH, DRAW, DON_PHASE, MAIN, END
2. WHEN the Refresh Phase begins, THE Game Engine SHALL expire turn-based effects, trigger start-of-turn autos, return given DON cards to cost area as rested, and set all rested cards and DON to active
3. WHEN the Draw Phase begins, THE Game Engine SHALL draw one card for the active player, except on the first turn for the player going first
4. WHEN the Don Phase begins, THE Game Engine SHALL place 2 DON cards from don deck to cost area as active, except on the first turn for the player going first where only 1 DON is placed
5. WHEN the Main Phase begins, THE Game Engine SHALL allow the active player to play cards, activate effects, give DON, and attack until they choose to end the phase
6. WHEN the End Phase begins, THE Game Engine SHALL trigger end-of-turn effects for both players and expire turn-duration effects

### Requirement 4

**User Story:** As a game developer, I want the engine to handle game setup correctly, so that games start according to official rules

#### Acceptance Criteria

1. WHEN a game is set up, THE Game Engine SHALL randomly determine which player chooses who goes first
2. WHEN a game is set up, THE Game Engine SHALL draw 5 cards for each player
3. WHEN a player chooses to mulligan, THE Game Engine SHALL return their hand to deck, shuffle the deck, and draw 5 new cards
4. WHEN life cards are placed, THE Game Engine SHALL move cards from the top of each player's deck to their life area equal to their leader's life value
5. WHEN a game starts, THE Game Engine SHALL apply any "Start of Game" leader effects before the first turn

### Requirement 5

**User Story:** As a game developer, I want the engine to implement the battle system, so that attacks and combat are resolved correctly

#### Acceptance Criteria

1. WHEN a character or leader attacks, THE Game Engine SHALL rest the attacker and trigger "When Attacking" effects
2. WHEN an attack is declared against a character, THE Game Engine SHALL allow the defending player to declare a blocker with the Blocker keyword
3. IF a blocker is declared, THEN THE Game Engine SHALL redirect the attack to the blocker and rest the blocker
4. WHEN the counter step begins, THE Game Engine SHALL allow the defending player to play counter cards from hand or activate counter events
5. WHEN the damage step resolves, THE Game Engine SHALL compare attacker power to defender power and K.O. the defender if attacker power is greater or equal
6. WHEN a leader takes damage, THE Game Engine SHALL move cards from the top of the defending player's life area to their hand equal to the damage amount
7. IF a life card has the Trigger keyword, THEN THE Game Engine SHALL allow the defending player to activate the trigger effect instead of adding it to hand
8. WHEN a battle ends, THE Game Engine SHALL trigger end-of-battle effects and expire battle-duration effects

### Requirement 6

**User Story:** As a game developer, I want the engine to handle card playing and costs, so that resource management works correctly

#### Acceptance Criteria

1. WHEN a player plays a card, THE Game Engine SHALL verify the player has sufficient active DON in their cost area to pay the card's cost
2. WHEN a card cost is paid, THE Game Engine SHALL rest the required number of active DON cards in the player's cost area
3. WHEN a character is played, THE Game Engine SHALL move it from hand to character area as active and trigger its "On Play" effects
4. WHEN a stage is played, THE Game Engine SHALL trash any existing stage, move the new stage to stage area as active, and trigger its "On Play" effects
5. WHEN an event is played, THE Game Engine SHALL resolve the event's effect and move it to trash
6. WHEN a player gives DON during main phase, THE Game Engine SHALL move an active DON from cost area to under the target character or leader

### Requirement 7

**User Story:** As a game developer, I want the engine to manage effects and triggers, so that card abilities work correctly

#### Acceptance Criteria

1. WHEN an effect with AUTO timing triggers, THE Game Engine SHALL add it to the pending triggers queue
2. WHEN resolving pending triggers, THE Game Engine SHALL resolve the active player's triggers first, then the non-active player's triggers
3. WHEN an ACTIVATE effect is used, THE Game Engine SHALL check conditions, pay costs, choose targets, and resolve the effect
4. WHILE an effect has once-per-turn restriction, THE Game Engine SHALL prevent the effect from being used more than once per turn
5. WHEN an effect resolves, THE Game Engine SHALL execute the effect script and queue any newly triggered effects
6. THE Game Engine SHALL support trigger timings: START_OF_GAME, START_OF_TURN, START_OF_MAIN, WHEN_ATTACKING, ON_OPPONENT_ATTACK, ON_BLOCK, WHEN_ATTACKED, ON_KO, END_OF_BATTLE, END_OF_YOUR_TURN, END_OF_OPPONENT_TURN

### Requirement 8

**User Story:** As a game developer, I want the engine to handle K.O. mechanics, so that character defeat works correctly

#### Acceptance Criteria

1. WHEN a character is K.O.'d, THE Game Engine SHALL check for "On K.O." effects while the card is still on field
2. WHEN a character is K.O.'d, THE Game Engine SHALL move the card to trash
3. WHEN a character is K.O.'d, THE Game Engine SHALL resolve any queued "On K.O." triggers after the card is in trash

### Requirement 9

**User Story:** As a game developer, I want the engine to detect win/loss conditions, so that games end correctly

#### Acceptance Criteria

1. WHEN a player's deck becomes empty, THE Game Engine SHALL end the game with the other player as winner
2. WHEN a player takes leader damage with zero life cards remaining, THE Game Engine SHALL mark that player as defeated and end the game
3. WHEN a player is marked as defeated, THE Game Engine SHALL end the game with the other player as winner
4. THE Game Engine SHALL check for defeat conditions after each action and trigger resolution

### Requirement 10

**User Story:** As a game developer, I want the engine to prevent infinite loops, so that games cannot hang

#### Acceptance Criteria

1. WHILE the game is running, THE Game Engine SHALL track repeated game states using a loop guard
2. WHEN a game state repeats more than the maximum allowed times, THE Game Engine SHALL apply official infinite loop resolution rules
3. THE Game Engine SHALL support a configurable maximum repeat count for loop detection

### Requirement 11

**User Story:** As a game developer, I want the engine to use a rules context system, so that rules can be updated without changing engine code

#### Acceptance Criteria

1. THE Game Engine SHALL load rules from a JSON rules file through a RulesContext wrapper
2. THE Game Engine SHALL query the RulesContext for phase sequences, battle flow, keyword definitions, and special rules
3. THE Game Engine SHALL enforce first-turn battle restrictions based on rules context
4. THE Game Engine SHALL never access raw JSON rules directly, only through the RulesContext interface

### Requirement 12

**User Story:** As a game developer, I want the engine to support power and cost modifiers, so that card effects can modify values

#### Acceptance Criteria

1. WHEN calculating current card cost, THE Game Engine SHALL apply all active cost modifiers and clamp negative values to zero
2. WHEN calculating current card power, THE Game Engine SHALL sum base power, continuous modifiers, and power from given DON cards
3. WHEN a counter card is used, THE Game Engine SHALL apply the counter value as a temporary power boost to the defender
4. THE Game Engine SHALL support both permanent and temporary modifiers with appropriate expiration

### Requirement 13

**User Story:** As a game developer, I want the engine to support keywords, so that special abilities work correctly

#### Acceptance Criteria

1. THE Game Engine SHALL recognize and enforce the "Rush" keyword allowing characters to attack on the turn they are played
2. THE Game Engine SHALL recognize and enforce the "Blocker" keyword allowing characters to block attacks
3. THE Game Engine SHALL recognize and enforce the "Trigger" keyword on life cards
4. THE Game Engine SHALL recognize and enforce the "Double Attack" keyword causing 2 damage to leaders
5. THE Game Engine SHALL query keyword definitions from the rules context

### Requirement 14

**User Story:** As a game developer, I want the engine to emit game events, so that external systems can observe game state changes

#### Acceptance Criteria

1. WHEN significant game actions occur, THE Game Engine SHALL emit Event structures containing type, player, card, and additional data
2. THE Game Engine SHALL emit events for attack declarations, block declarations, counter steps, battle ends, and other key moments
3. THE Game Engine SHALL allow effects to access event context when resolving triggers

### Requirement 15

**User Story:** As a game developer, I want the engine to support replacement effects, so that effects can modify costs and outcomes

#### Acceptance Criteria

1. WHEN an effect cost is being paid, THE Game Engine SHALL apply any active cost replacement effects before payment
2. WHEN an effect body is being resolved, THE Game Engine SHALL apply any active body replacement effects before execution
3. THE Game Engine SHALL support REPLACEMENT timing type for effects that modify other effects

### Requirement 16

**User Story:** As a game developer, I want all card interactions rendered using Three.js, so that the game has a 3D visual interface

#### Acceptance Criteria

1. THE Game Engine SHALL provide a rendering interface that communicates game state to a Three.js visualization layer
2. THE Game Engine SHALL emit state change events that the Three.js renderer can subscribe to for visual updates
3. THE Game Engine SHALL maintain separation between game logic and rendering, allowing the core engine to run independently of the visual layer
4. THE Game Engine SHALL provide card position and state data in a format suitable for Three.js scene updates
5. THE Game Engine SHALL support querying current visual state of all cards and zones for rendering

### Requirement 17

**User Story:** As a game developer, I want the engine architecture to support future animation and special effects, so that visual enhancements can be added without refactoring

#### Acceptance Criteria

1. THE Game Engine SHALL provide hooks for animation events when cards move between zones
2. THE Game Engine SHALL provide hooks for animation events when cards change state (active to rested, power changes, etc)
3. THE Game Engine SHALL provide metadata about card types (alt art, promo, leader) that can be used for special visual effects
4. THE Game Engine SHALL support a delay/callback system allowing animations to complete before game state advances
5. WHILE animations are not yet implemented, THE Game Engine SHALL provide placeholder hooks that can be populated later without changing the core engine structure
