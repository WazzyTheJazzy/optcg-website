# Implementation Plan

- [x] 1. Implement card selection visual feedback





  - [x] 1.1 Add selection state to CardMesh component


    - Pass `isSelected` prop from GameBoard to CardMesh
    - Add yellow highlight mesh when isSelected is true
    - Use emissive material with 0.3 opacity for glow effect
    - _Requirements: 1.4, 1.5_


  - [x] 1.2 Wire up card click handlers

    - Add onClick handler to CardMesh that calls parent callback
    - Pass handleCardClick from GameBoard to GameScene to CardMesh
    - Update selectedCardId state in GameBoard on click
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.3 Implement deselection logic


    - Check if clicked card is already selected
    - Clear selectedCardId if clicking same card
    - Update selectedCardId if clicking different card
    - _Requirements: 1.2, 1.3_

- [x] 2. Create action button panel UI





  - [x] 2.1 Create ActionPanel component


    - Create new component file `components/game/ActionPanel.tsx`
    - Accept props: selectedCard, availableActions, onAction callback
    - Render button for each available action
    - Style with Tailwind CSS for positioning and appearance
    - _Requirements: 6.1, 6.5_

  - [x] 2.2 Implement action availability logic


    - Create `getAvailableActions()` helper function
    - Check if card is in hand and player has sufficient DON for PLAY_CARD
    - Check if card is active character for ATTACK action
    - Check if player has active DON for ATTACH_DON action
    - Return array of available Action types
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 2.3 Integrate ActionPanel into GameBoard


    - Import and render ActionPanel in GameBoard UI overlay
    - Show panel only when selectedCardId is not null and phase is MAIN
    - Pass selectedCard from boardState
    - Pass availableActions from getAvailableActions()
    - Wire up onAction callback to route to appropriate handler
    - _Requirements: 6.1, 6.5, 6.6_

- [x] 3. Implement play card functionality





  - [x] 3.1 Create handlePlayCard method in GameBoard


    - Get selectedCardId from state
    - Get currentPlayerId from boardState
    - Call engine.playCard(currentPlayerId, selectedCardId)
    - Handle ActionResult response
    - Show error toast if success is false
    - Clear selectedCardId if success is true
    - _Requirements: 2.1, 2.7_

  - [x] 3.2 Implement drag-and-drop card playing


    - Update handleCardMove to detect HAND → CHARACTER_AREA moves
    - Validate move is during MAIN phase
    - Call engine.playCard() for valid moves
    - Show error message for invalid moves
    - _Requirements: 2.1_

  - [x] 3.3 Add cost validation feedback


    - Before calling engine.playCard, check active DON count
    - Show preview of cost vs available DON
    - Display error if insufficient DON before attempting play
    - _Requirements: 2.2, 2.3_

  - [x] 3.4 Verify DON payment and card movement


    - Subscribe to CARD_MOVED events from RenderingInterface
    - Verify card moves from HAND to CHARACTER_AREA
    - Verify DON cards change from ACTIVE to RESTED state
    - Update UI to reflect new card positions
    - _Requirements: 2.4, 2.5_

  - [x] 3.5 Implement character area limit validation


    - Check character area card count before allowing play
    - Show error "Character area is full (5/5)" if at limit
    - Prevent drag-drop to character area when full
    - _Requirements: 2.6_

- [x] 4. Implement attack declaration system





  - [x] 4.1 Create attack mode state management


    - Add attackMode boolean to GameBoard state
    - Add validTargets string array to state
    - Create startAttackMode() method
    - Create cancelAttackMode() method
    - _Requirements: 3.2_

  - [x] 4.2 Implement "Attack" button handler


    - Add startAttackMode() call when Attack button clicked
    - Query engine for valid attack targets using BattleSystem.getLegalTargets()
    - Store valid targets in state
    - Set attackMode to true
    - _Requirements: 3.1, 3.2_

  - [x] 4.3 Add target selection logic


    - Update handleCardClick to check if in attackMode
    - Validate clicked card is in validTargets array
    - Call handleDeclareAttack(targetId) if valid
    - Show error if invalid target clicked
    - _Requirements: 3.3, 3.4_

  - [x] 4.4 Implement handleDeclareAttack method


    - Get selectedCardId (attacker) and targetId from parameters
    - Call engine.declareAttack(currentPlayerId, selectedCardId, targetId)
    - Handle ActionResult response
    - Exit attack mode on success
    - Clear selection on success
    - Show error toast on failure
    - _Requirements: 3.4_

  - [x] 4.5 Add attack validation checks


    - Verify attacker is in ACTIVE state before allowing attack
    - Show error "Character is rested and cannot attack" if RESTED
    - Verify target is valid (opponent's leader or rested character)
    - _Requirements: 3.5, 3.6_

  - [x] 4.6 Verify battle resolution


    - Subscribe to BATTLE_END events from RenderingInterface
    - Verify attacker becomes RESTED after attack
    - Verify damage is dealt to target
    - Verify KO occurs if character power drops to 0 or below
    - _Requirements: 3.7, 3.8, 3.9_

- [x] 5. Implement visual target highlighting





  - [x] 5.1 Add valid target highlighting to CardMesh


    - Pass isValidTarget prop to CardMesh
    - Render green glow mesh when isValidTarget is true
    - Use same technique as selection highlight but with green color
    - _Requirements: 5.2_


  - [x] 5.2 Add invalid target dimming

    - Pass isInvalidTarget prop to CardMesh
    - Reduce opacity to 0.5 when isInvalidTarget is true
    - Apply during attack mode for non-valid targets
    - _Requirements: 5.3_

  - [x] 5.3 Update CardMesh rendering logic


    - Calculate isValidTarget based on attackMode and validTargets array
    - Calculate isInvalidTarget based on attackMode and not in validTargets
    - Pass both props to CardMesh from GameScene
    - _Requirements: 5.2, 5.3_

- [x] 6. Implement DON attachment system





  - [x] 6.1 Create DON attachment mode state


    - Add donAttachMode boolean to GameBoard state
    - Add selectedDonId string to state
    - Create startDonAttachMode() method
    - _Requirements: 4.1_

  - [x] 6.2 Add DON selection logic


    - Update handleCardClick to detect DON card clicks
    - Store selectedDonId when DON clicked during donAttachMode
    - Highlight selected DON card
    - _Requirements: 4.2_

  - [x] 6.3 Implement handleAttachDon method


    - Get selectedCardId (character) and selectedDonId from state
    - Validate DON is in ACTIVE state
    - Call engine.attachDon(currentPlayerId, selectedDonId, selectedCardId)
    - Handle ActionResult response
    - Exit DON attach mode on success
    - Clear selections on success
    - _Requirements: 4.3, 4.4_

  - [x] 6.4 Verify power increase


    - Subscribe to POWER_CHANGED events from RenderingInterface
    - Verify character power increases by 1000
    - Update CardMesh to display new power value
    - _Requirements: 4.5_

  - [x] 6.5 Add visual indicator for attached DON


    - Add attachedDonCount to CardMesh props
    - Render small badge showing DON count on character cards
    - Position badge in corner of card
    - _Requirements: 4.6_

- [x] 7. Implement hover information display





  - [x] 7.1 Add hover state to CardMesh


    - Track isHovered state in CardMesh
    - Set isHovered on pointer enter/leave events
    - _Requirements: 5.1_

  - [x] 7.2 Create hover info overlay


    - Use @react-three/drei Html component
    - Display card cost and power when hovered
    - Position above card
    - Style with Tailwind CSS
    - _Requirements: 5.1_



  - [x] 7.3 Add hover scale effect

    - Scale card to 1.05x when hovered
    - Use smooth transition animation
    - Reset scale on hover exit
    - _Requirements: 5.1_

- [x] 8. Implement error notification system






  - [x] 8.1 Create ErrorToast component

    - Create new component file `components/game/ErrorToast.tsx`
    - Accept props: message, visible, onDismiss
    - Style as fixed position toast at top of screen
    - Auto-dismiss after 3 seconds
    - _Requirements: 5.4_

  - [x] 8.2 Add error state to GameBoard


    - Add errorMessage string to state
    - Create showError(message) helper method
    - Set timeout to clear error after 3 seconds
    - _Requirements: 5.4_


  - [x] 8.3 Integrate error handling in all actions

    - Call showError() when engine methods return success: false
    - Display specific error messages from ActionResult.error
    - Show validation errors before calling engine methods
    - _Requirements: 2.3, 2.7, 3.5, 5.4_

- [x] 9. Implement success feedback





  - [x] 9.1 Add success animation to card movements


    - Trigger animation when card successfully plays
    - Use smooth transition from hand to character area
    - Add slight bounce effect on landing
    - _Requirements: 5.5_

  - [x] 9.2 Add success notification for attacks


    - Show brief notification when attack succeeds
    - Display damage dealt
    - Highlight affected cards briefly
    - _Requirements: 5.5_

- [x] 10. Implement phase control integration





  - [x] 10.1 Verify Main Phase doesn't auto-advance


    - Check PhaseManager skips auto-execution for MAIN phase
    - Verify game waits for manual advancement
    - Test that phase stays on MAIN until player action
    - _Requirements: 7.1_

  - [x] 10.2 Add "End Main Phase" button


    - Add button to phase controls UI
    - Show only during MAIN phase
    - Call engine.advancePhase() on click
    - _Requirements: 7.2, 7.3_

  - [x] 10.3 Clear UI state on phase change


    - Subscribe to PHASE_CHANGED events
    - Clear selectedCardId when leaving MAIN phase
    - Exit attack mode when leaving MAIN phase
    - Exit DON attach mode when leaving MAIN phase
    - Disable action handlers when not in MAIN phase
    - _Requirements: 7.4, 7.5_

- [x] 11. Add keyboard navigation support





  - [x] 11.1 Implement tab navigation


    - Make cards focusable with tabIndex
    - Add focus styles to CardMesh
    - Allow tab to cycle through cards in hand
    - _Requirements: Accessibility_


  - [x] 11.2 Add keyboard shortcuts


    - Enter key to select/deselect focused card
    - Space key to execute primary action
    - Escape key to cancel attack mode
    - Arrow keys to navigate between cards
    - _Requirements: Accessibility_

- [x] 12. Add screen reader support





  - [x] 12.1 Add ARIA labels to action buttons


    - Label "Play Card" button with card name and cost
    - Label "Attack" button with attacker name
    - Label "Attach DON" button with power increase info
    - _Requirements: Accessibility_

  - [x] 12.2 Announce state changes


    - Use aria-live regions for announcements
    - Announce card selection
    - Announce action results
    - Announce errors
    - _Requirements: Accessibility_



- [x] 13. Write integration tests



  - [x] 13.1 Test card selection flow



    - Test clicking card updates selectedCardId
    - Test clicking same card deselects
    - Test clicking different card switches selection
    - Test visual highlight appears/disappears
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_


  - [x] 13.2 Test card playing flow
    - Test playing card with sufficient DON succeeds
    - Test playing card with insufficient DON fails
    - Test DON cards rest after playing card
    - Test card moves to character area
    - Test character area limit prevents 6th card
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_


  - [x] 13.3 Test attack flow
    - Test attack button appears for active character
    - Test valid targets highlight
    - Test attacking valid target succeeds
    - Test attacking with rested character fails
    - Test battle damage calculates correctly
    - Test attacker becomes rested after attack

    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 13.4 Test DON attachment flow
    - Test selecting character enables DON attach mode
    - Test attaching DON increases power by 1000
    - Test DON moves from cost area to character

    - Test visual indicator shows attached DON count
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 13.5 Test error handling
    - Test error toast appears for invalid actions

    - Test error messages are specific and helpful
    - Test errors auto-dismiss after 3 seconds
    - _Requirements: 5.4_

  - [x] 13.6 Test phase control
    - Test Main Phase doesn't auto-advance
    - Test "End Main Phase" button advances phase
    - Test UI state clears on phase change
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Perform manual testing and verification






  - [x] 14.1 Execute Test 1: Card Selection Backend

    - Click cards in hand
    - Verify console logs show selection
    - Verify selectedCardId state updates
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 14.2 Execute Test 2: Card Selection Visual

    - Click card and verify yellow highlight
    - Click another card and verify highlight switches
    - Click same card and verify deselection
    - _Requirements: 1.4, 1.5_


  - [x] 14.3 Execute Test 3-5: Play Card Tests

    - Test engine.playCard() method exists
    - Test cost validation prevents illegal plays
    - Test DON payment rests correct number of DON
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_



  - [x] 14.4 Execute Test 6-9: Attack Tests

    - Test engine.declareAttack() method exists
    - Test active character can attack
    - Test rested character cannot attack
    - Test battle resolution deals damage correctly
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_




  - [x] 14.5 Execute Test 10-11: DON Attachment Tests
    - Test DON attachment method exists
    - Test attaching DON increases power by 1000
    - _Requirements: 4.3, 4.4, 4.5_




  - [x] 14.6 Execute Test 12: Phase Progression
    - Test Main Phase doesn't auto-advance
    - Test manual phase advancement works

    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 14.7 Execute Test 13: End-to-End Flow

    - Start game and advance to Main Phase
    - Play a card from hand
    - Attack with the played card
    - Advance to End Phase
    - Verify turn increments correctly
    - _Requirements: All_

- [x] 15. Performance optimization






  - [x] 15.1 Memoize CardMesh component

    - Wrap CardMesh with React.memo
    - Implement custom comparison function
    - Only re-render when relevant props change
    - _Requirements: Performance_

  - [x] 15.2 Throttle hover events


    - Use throttle utility for hover handlers
    - Limit updates to 100ms intervals
    - Reduce unnecessary re-renders
    - _Requirements: Performance_


  - [x] 15.3 Batch state updates

    - Group related state updates together
    - Use React 18 automatic batching
    - Minimize render cycles
    - _Requirements: Performance_

- [x] 16. Documentation and cleanup





  - [x] 16.1 Add JSDoc comments to all methods


    - Document GameBoard handler methods
    - Document ActionPanel component
    - Document helper functions
    - _Requirements: Documentation_

  - [x] 16.2 Create usage examples


    - Document how to add new actions
    - Document how to extend ActionPanel
    - Document event subscription patterns
    - _Requirements: Documentation_

  - [x] 16.3 Update README with UI interaction guide


    - Document card selection
    - Document playing cards
    - Document attacking
    - Document DON attachment
    - _Requirements: Documentation_
