# Requirements Document

## Introduction

This spec addresses a comprehensive review and improvement of the One Piece TCG game engine's phase system. After completing work on the Main Phase, concerns have been raised about whether all other phases (Refresh, Draw, Don, End) have been properly implemented and tested according to the official game rules. This review will systematically verify each phase's implementation, ensure complete test coverage, and fix any issues discovered.

## Glossary

- **Phase System**: The turn structure system that executes game phases in sequence (Refresh → Draw → Don → Main → End)
- **RefreshPhase**: The first phase of each turn where cards and DON are refreshed to active state
- **DrawPhase**: The phase where the active player draws one card
- **DonPhase**: The phase where DON cards are placed from the don deck to the cost area
- **MainPhase**: The phase where players can perform actions (play cards, attack, etc.)
- **EndPhase**: The final phase where end-of-turn effects trigger and temporary effects expire
- **PhaseManager**: The orchestrator that executes phases in sequence and manages phase transitions
- **Game Engine**: The core system managing game state and rules enforcement

## Requirements

### Requirement 1: RefreshPhase Implementation Review

**User Story:** As a game developer, I want the Refresh Phase to correctly implement all official rules, so that the game state is properly reset at the start of each turn.

#### Acceptance Criteria

1. WHEN the Refresh Phase executes, THE Game Engine SHALL expire all modifiers with "until start of your next turn" duration for the active player only
2. WHEN the Refresh Phase executes, THE Game Engine SHALL return all given DON cards from characters and leaders to the cost area in rested state
3. WHEN the Refresh Phase executes, THE Game Engine SHALL set all rested cards in the character area to active state for the active player
4. WHEN the Refresh Phase executes, THE Game Engine SHALL set all rested DON in the cost area to active state for the active player
5. WHEN the Refresh Phase executes, THE Game Engine SHALL set the leader card to active state if it is rested for the active player

### Requirement 2: RefreshPhase Test Coverage

**User Story:** As a game developer, I want comprehensive tests for the Refresh Phase, so that I can verify it works correctly and prevent regressions.

#### Acceptance Criteria

1. THE Game Engine SHALL have unit tests that verify modifier expiration for "until start of your next turn" duration
2. THE Game Engine SHALL have unit tests that verify given DON cards are returned to cost area as rested
3. THE Game Engine SHALL have unit tests that verify all rested cards are set to active state
4. THE Game Engine SHALL have unit tests that verify only the active player's cards are affected
5. THE Game Engine SHALL have unit tests that verify the non-active player's cards remain unchanged

### Requirement 3: DrawPhase Implementation Review

**User Story:** As a game developer, I want the Draw Phase to correctly implement all official rules, so that card drawing works properly throughout the game.

#### Acceptance Criteria

1. WHEN the Draw Phase executes on turn 1 for player 1, THE Game Engine SHALL skip the draw
2. WHEN the Draw Phase executes on turn 1 for player 2, THE Game Engine SHALL draw one card
3. WHEN the Draw Phase executes on turn 2 or later, THE Game Engine SHALL draw one card for the active player
4. WHEN the active player's deck is empty during Draw Phase, THE Game Engine SHALL trigger game over with the opponent as winner
5. WHEN a card is drawn, THE Game Engine SHALL emit a CARD_MOVED event

### Requirement 4: DonPhase Implementation Review

**User Story:** As a game developer, I want the Don Phase to correctly implement all official rules, so that DON placement follows the game's resource system.

#### Acceptance Criteria

1. WHEN the Don Phase executes on turn 1 for player 1, THE Game Engine SHALL place 1 DON from don deck to cost area as active
2. WHEN the Don Phase executes on turn 1 for player 2, THE Game Engine SHALL place 2 DON from don deck to cost area as active
3. WHEN the Don Phase executes on turn 2 or later, THE Game Engine SHALL place 2 DON from don deck to cost area as active
4. WHEN the don deck has fewer DON than required, THE Game Engine SHALL place only the available DON
5. WHEN the don deck is empty, THE Game Engine SHALL handle the situation gracefully without errors

### Requirement 5: MainPhase Implementation Review

**User Story:** As a game developer, I want the Main Phase to correctly implement all official rules, so that player actions are properly validated and executed.

#### Acceptance Criteria

1. WHEN the Main Phase begins, THE Game Engine SHALL trigger all START_OF_MAIN auto effects
2. WHEN the Main Phase action loop runs, THE Game Engine SHALL query the player for actions until they pass
3. WHEN a player action is executed, THE Game Engine SHALL resolve any pending triggers before the next action
4. WHEN an action fails validation, THE Game Engine SHALL allow the player to choose another action
5. WHEN the player chooses to end the phase, THE Game Engine SHALL exit the action loop

### Requirement 6: EndPhase Implementation Review

**User Story:** As a game developer, I want the End Phase to correctly implement all official rules, so that end-of-turn effects and cleanup happen properly.

#### Acceptance Criteria

1. WHEN the End Phase executes, THE Game Engine SHALL trigger all END_OF_YOUR_TURN effects for the active player
2. WHEN the End Phase executes, THE Game Engine SHALL trigger all END_OF_OPPONENT_TURN effects for the non-active player
3. WHEN the End Phase executes, THE Game Engine SHALL expire all modifiers with "until end of turn" duration
4. WHEN the End Phase executes, THE Game Engine SHALL expire all modifiers with "during this turn" duration
5. WHEN the End Phase executes, THE Game Engine SHALL NOT expire modifiers with other durations (permanent, until end of battle, etc.)

### Requirement 7: PhaseManager Integration Review

**User Story:** As a game developer, I want the PhaseManager to correctly orchestrate all phases, so that turns execute in the proper sequence.

#### Acceptance Criteria

1. WHEN a turn executes, THE PhaseManager SHALL run phases in the correct sequence: Refresh, Draw, Don, Main, End
2. WHEN transitioning between phases, THE PhaseManager SHALL emit PHASE_CHANGED events
3. WHEN a phase completes, THE PhaseManager SHALL check for game over conditions before proceeding
4. WHEN the turn completes, THE PhaseManager SHALL increment the turn number
5. WHEN the turn completes, THE PhaseManager SHALL switch the active player

### Requirement 8: Cross-Phase State Consistency

**User Story:** As a game developer, I want state changes in one phase to be properly reflected in subsequent phases, so that the game state remains consistent.

#### Acceptance Criteria

1. WHEN DON cards are given to characters in Main Phase, THE Game Engine SHALL return them to cost area in the next Refresh Phase
2. WHEN cards are rested during Main Phase, THE Game Engine SHALL set them to active in the next Refresh Phase
3. WHEN temporary modifiers are applied during Main Phase, THE Game Engine SHALL expire them in the End Phase
4. WHEN the deck becomes empty during Draw Phase, THE Game Engine SHALL not execute subsequent phases
5. WHEN game over occurs in any phase, THE PhaseManager SHALL stop turn execution

### Requirement 9: Event Emission Consistency

**User Story:** As a game developer, I want all phase operations to emit appropriate events, so that the UI can properly reflect game state changes.

#### Acceptance Criteria

1. WHEN cards change state in any phase, THE Game Engine SHALL emit CARD_STATE_CHANGED events
2. WHEN cards move between zones in any phase, THE Game Engine SHALL emit CARD_MOVED events
3. WHEN a phase begins, THE PhaseManager SHALL emit PHASE_CHANGED events
4. WHEN a turn begins, THE PhaseManager SHALL emit TURN_START events
5. WHEN a turn ends, THE PhaseManager SHALL emit TURN_END events

### Requirement 10: Phase-Specific Edge Cases

**User Story:** As a game developer, I want all edge cases in phase execution to be handled correctly, so that the game doesn't crash or enter invalid states.

#### Acceptance Criteria

1. WHEN the Refresh Phase executes with no cards on field, THE Game Engine SHALL complete without errors
2. WHEN the Draw Phase executes with an empty deck on turn 1 for player 1, THE Game Engine SHALL not trigger game over
3. WHEN the Don Phase executes with an empty don deck, THE Game Engine SHALL complete without errors
4. WHEN the Main Phase executes without an input provider, THE Game Engine SHALL complete synchronously
5. WHEN the End Phase executes with no effects to trigger, THE Game Engine SHALL complete without errors

### Requirement 11: DON Card Visual Representation

**User Story:** As a player, I want DON cards to be displayed with proper card images instead of as generic tokens, so that they look like real DON cards from the physical game.

#### Acceptance Criteria

1. WHEN a DON card is rendered in any zone, THE Rendering System SHALL display it with the official DON card image
2. WHEN a DON card is in the don deck, THE Rendering System SHALL display it with a card back image
3. WHEN a DON card is in the cost area, THE Rendering System SHALL display it with the DON card front image
4. WHEN a DON card is given to a character or leader, THE Rendering System SHALL display it as a small card underneath the character
5. WHEN a DON card changes state between active and rested, THE Rendering System SHALL rotate the card appropriately (0° for active, 90° for rested)

### Requirement 12: Tabletop Visual Environment

**User Story:** As a player, I want the game board to look like a physical tabletop with a realistic playing surface, so that the game feels immersive and familiar like playing the physical card game.

#### Acceptance Criteria

1. WHEN the game board is rendered, THE Rendering System SHALL display a table surface as the background
2. WHEN the game board is rendered, THE Rendering System SHALL display zone boundaries on the table surface to indicate card placement areas
3. WHEN the game board is rendered, THE Rendering System SHALL use appropriate lighting to create depth and realism
4. WHEN the game board is rendered, THE Rendering System SHALL display a background environment around the table
5. WHEN cards are placed on the table, THE Rendering System SHALL render subtle shadows beneath cards to enhance the 3D effect
