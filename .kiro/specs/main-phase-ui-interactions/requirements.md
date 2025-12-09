# Requirements Document

## Introduction

This feature bridges the gap between the existing game engine backend and the user interface, enabling players to interact with the Main Phase of the One Piece TCG game. The game engine logic is complete, but UI components for card selection, playing cards, attacking, and DON attachment are missing or not connected.

## Glossary

- **GameEngine**: The core game logic system that manages game state and rules
- **GameBoard**: The React component that renders the game UI and handles user interactions
- **CardMesh**: The Three.js component that renders individual 3D card representations
- **Main Phase**: The game phase where players can play cards, attack, and perform actions
- **DON Card**: Special cards used as currency to pay costs and boost character power
- **Active State**: A card that is untapped and can perform actions
- **Rested State**: A card that is tapped and cannot perform actions until refreshed
- **Character Area**: The zone where character cards are played (max 5 cards)
- **Cost Area**: The zone where DON cards are placed to pay for actions

## Requirements

### Requirement 1: Card Selection System

**User Story:** As a player, I want to select cards by clicking them, so that I can perform actions with the selected card.

#### Acceptance Criteria

1. WHEN THE Player clicks a card in hand, THE GameBoard SHALL update the selectedCardId state with the clicked card's ID
2. WHEN THE Player clicks a selected card again, THE GameBoard SHALL clear the selectedCardId state to deselect the card
3. WHEN THE Player clicks a different card while another is selected, THE GameBoard SHALL update selectedCardId to the newly clicked card's ID
4. WHEN a card is selected, THE CardMesh SHALL display a visual highlight effect (yellow glow or border)
5. WHEN a card is deselected, THE CardMesh SHALL remove the visual highlight effect

### Requirement 2: Card Playing from Hand

**User Story:** As a player, I want to play character cards from my hand to the character area, so that I can build my board and prepare for battle.

#### Acceptance Criteria

1. WHEN THE Player drags a card from hand to character area during Main Phase, THE GameBoard SHALL call engine.playCard() with the card ID
2. WHEN THE GameEngine validates the play action, THE CardPlayHandler SHALL verify the player has sufficient active DON cards to pay the cost
3. IF THE Player has insufficient DON cards, THEN THE GameEngine SHALL reject the play action and return an error message
4. WHEN a card is successfully played, THE CardPlayHandler SHALL rest the required number of DON cards equal to the card's cost
5. WHEN a card is successfully played, THE ZoneManager SHALL move the card from HAND zone to CHARACTER_AREA zone
6. WHEN THE Character area contains 5 cards, THE GameBoard SHALL prevent additional character cards from being played
7. WHEN a card play fails, THE GameBoard SHALL display an error message to the player

### Requirement 3: Attack Declaration System

**User Story:** As a player, I want to declare attacks with my active characters, so that I can deal damage to my opponent and win the game.

#### Acceptance Criteria

1. WHEN THE Player selects an active character in character area, THE GameBoard SHALL display an "Attack" button
2. WHEN THE Player clicks the "Attack" button, THE GameBoard SHALL enter attack mode and highlight valid attack targets
3. WHEN THE BattleSystem validates attack targets, THE GameEngine SHALL identify opponent's leader and rested characters as valid targets
4. WHEN THE Player clicks a valid target, THE GameBoard SHALL call engine.declareAttack() with attacker and target IDs
5. IF THE Attacker is in RESTED state, THEN THE BattleSystem SHALL reject the attack and return an error
6. WHEN an attack is declared, THE BattleSystem SHALL rest the attacking character
7. WHEN battle resolves, THE BattleSystem SHALL compare attacker power to defender power and deal appropriate damage
8. WHEN attacking a leader, THE BattleSystem SHALL deal 1 life damage (or 2 if attacker has Double Attack keyword)
9. WHEN attacking a character with lower power, THE KOHandler SHALL move the defeated character to trash

### Requirement 4: DON Attachment System

**User Story:** As a player, I want to attach DON cards to my characters, so that I can increase their power and make them stronger in battle.

#### Acceptance Criteria

1. WHEN THE Player selects a character in character area, THE GameBoard SHALL enable DON attachment mode
2. WHEN THE Player selects an active DON card from cost area, THE GameBoard SHALL display an "Attach DON" action option
3. WHEN THE Player confirms DON attachment, THE GameBoard SHALL call DonHandler.attachDonToCharacter() with character and DON IDs
4. WHEN DON is attached, THE DonHandler SHALL move the DON card from cost area to the character's givenDon array
5. WHEN DON is attached, THE DamageCalculator SHALL increase the character's current power by 1000
6. WHEN THE Character has attached DON, THE CardMesh SHALL display a visual indicator showing the number of attached DON cards

### Requirement 5: Visual Feedback System

**User Story:** As a player, I want clear visual feedback for all my actions, so that I understand what is happening in the game and what actions are available.

#### Acceptance Criteria

1. WHEN THE Player hovers over a card, THE CardMesh SHALL display the card's cost and power values
2. WHEN THE GameBoard is in attack mode, THE CardMesh SHALL highlight valid attack targets with a green glow
3. WHEN THE GameBoard is in attack mode, THE CardMesh SHALL display invalid targets with reduced opacity
4. WHEN an action fails, THE GameBoard SHALL display a toast notification with the error message
5. WHEN an action succeeds, THE GameBoard SHALL provide visual confirmation through animation or notification

### Requirement 6: Action Button Panel

**User Story:** As a player, I want to see available actions for my selected card, so that I know what I can do during my turn.

#### Acceptance Criteria

1. WHEN THE Player selects a card during Main Phase, THE GameBoard SHALL display an action panel with available actions
2. WHEN THE Selected card is in hand and player has sufficient DON, THE GameBoard SHALL display a "Play Card" button
3. WHEN THE Selected card is an active character, THE GameBoard SHALL display an "Attack" button
4. WHEN THE Player has active DON and a selected character, THE GameBoard SHALL display an "Attach DON" button
5. WHEN THE Player deselects the card, THE GameBoard SHALL hide the action panel
6. WHEN THE Player clicks an action button, THE GameBoard SHALL execute the corresponding action and update game state

### Requirement 7: Phase Control Integration

**User Story:** As a player, I want the Main Phase to wait for my actions, so that I have time to make strategic decisions without being rushed.

#### Acceptance Criteria

1. WHEN THE GameEngine enters Main Phase, THE PhaseManager SHALL not auto-advance to the next phase
2. WHEN THE Player is in Main Phase, THE GameBoard SHALL display an "End Main Phase" button
3. WHEN THE Player clicks "End Main Phase", THE GameBoard SHALL call engine.advancePhase() to proceed to End Phase
4. WHEN THE Main Phase is active, THE GameBoard SHALL enable all Main Phase action handlers
5. WHEN THE Main Phase ends, THE GameBoard SHALL disable Main Phase action handlers until the next Main Phase
