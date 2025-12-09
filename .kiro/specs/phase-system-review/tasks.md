# Implementation Plan

## Phase 1: RefreshPhase Testing & Fixes

- [x] 1. Create comprehensive RefreshPhase tests





  - Create `lib/game-engine/phases/RefreshPhase.test.ts` file
  - Set up test fixtures with mock game state, cards, and DON
  - Implement test suite structure with describe blocks for each feature area
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Test modifier expiration


  - Write test for expiring "until start of your next turn" modifiers for active player
  - Write test for NOT expiring other duration modifiers (permanent, until end of turn, etc.)
  - Write test for only active player's modifiers being expired
  - Write test for non-active player's modifiers remaining unchanged
  - _Requirements: 1.1, 2.1_

- [x] 1.2 Test DON return to cost area

  - Write test for DON moved from characters to cost area as rested
  - Write test for DON moved from leader to cost area as rested
  - Write test for CARD_MOVED events emitted for each DON
  - Write test for CARD_STATE_CHANGED events emitted for DON state changes
  - Write test for multiple DON on same character
  - _Requirements: 1.2, 2.2_


- [x] 1.3 Test card activation

  - Write test for rested characters set to active state
  - Write test for rested leader set to active state
  - Write test for rested stage set to active state
  - Write test for rested DON in cost area set to active state
  - Write test for CARD_STATE_CHANGED events emitted for each activation
  - Write test for only active player's cards being activated
  - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4_


- [x] 1.4 Test edge cases

  - Write test for RefreshPhase with no cards on field
  - Write test for RefreshPhase with no DON given to characters
  - Write test for RefreshPhase with empty cost area
  - Write test for RefreshPhase with all cards already active
  - _Requirements: 10.1_

- [x] 1.5 Fix any bugs discovered in RefreshPhase


  - Run all RefreshPhase tests
  - Fix any failing tests by updating RefreshPhase.ts implementation
  - Verify all tests pass
  - Verify test coverage is 100% for RefreshPhase
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

## Phase 2: Other Phase Reviews & Testing

- [x] 2. Review and enhance DrawPhase tests





  - Review existing DrawPhase.test.ts for completeness
  - Add any missing edge case tests
  - Verify event emission tests are comprehensive
  - Run tests and fix any issues discovered
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.2_

- [x] 3. Review and enhance DonPhase tests





  - Review existing DonPhase.test.ts for completeness
  - Add any missing edge case tests
  - Verify event emission tests are comprehensive
  - Run tests and fix any issues discovered
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.3_

- [x] 4. Review and enhance MainPhase tests





  - Review existing MainPhase.test.ts for completeness
  - Add tests for START_OF_MAIN trigger handling
  - Add tests for action loop with multiple actions
  - Add tests for action failure and retry
  - Add tests for synchronous execution without input provider
  - Run tests and fix any issues discovered
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.4_

- [x] 5. Review and enhance EndPhase tests





  - Review existing EndPhase.test.ts for completeness
  - Verify END_OF_YOUR_TURN trigger tests
  - Verify END_OF_OPPONENT_TURN trigger tests
  - Verify modifier expiration tests for all durations
  - Add any missing edge case tests
  - Run tests and fix any issues discovered
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.5_

- [x] 6. Review and enhance PhaseManager tests





  - Review existing PhaseManager.test.ts for completeness
  - Add tests for phase transition event emission
  - Add tests for game over detection between phases
  - Add tests for turn increment and player switching
  - Add integration test for full turn execution through all phases
  - Run tests and fix any issues discovered
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Add cross-phase integration tests





  - Create integration test for DON given in Main Phase, returned in Refresh Phase
  - Create integration test for cards rested in Main Phase, activated in Refresh Phase
  - Create integration test for temporary modifiers applied in Main Phase, expired in End Phase
  - Create integration test for deck empty in Draw Phase stopping turn execution
  - Create integration test for game over in any phase stopping turn execution
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Verify event emission consistency across all phases





  - Review all phase implementations for event emission
  - Ensure CARD_STATE_CHANGED events emitted for all state changes
  - Ensure CARD_MOVED events emitted for all zone transitions
  - Ensure PHASE_CHANGED events emitted for all phase transitions
  - Ensure TURN_START and TURN_END events emitted by PhaseManager
  - Add tests for event emission if missing
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 3: DON Card Visual Upgrade

- [x] 9. Prepare DON card image assets





  - Source or create official DON card front image (1024x1024 resolution)
  - Source or create card back image if not already available
  - Save images to `/public/cards/` directory
  - Optimize images for web (compress without quality loss)
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 10. Update DonMesh component to use card images





  - Modify `components/game/DonMesh.tsx` to use CardMesh structure
  - Implement texture loading for DON card front image
  - Implement texture loading for DON card back image
  - Add proper card geometry (plane with rounded corners like CardMesh)
  - Handle rotation for active (0°) and rested (90°) states
  - _Requirements: 11.1, 11.5_

- [x] 11. Implement zone-specific DON rendering





  - Update don deck rendering to show card backs in stack
  - Update cost area rendering to show DON card fronts in grid layout
  - Update given DON rendering to show small cards under characters/leader (scale 0.3x)
  - Position given DON with slight offset to show count
  - Add hover effects for DON cards
  - _Requirements: 11.2, 11.3, 11.4_

- [x] 12. Update ZoneRenderer for DON card display





  - Modify `components/game/ZoneRenderer.tsx` to handle DON cards properly
  - Ensure DON cards in don deck are stacked vertically
  - Ensure DON cards in cost area are laid out in grid
  - Ensure given DON cards are positioned under their parent card
  - Test DON card rendering in all zones
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 13. Add DON card visual tests





  - Create visual regression tests for DON card rendering
  - Test DON cards in don deck (card backs)
  - Test DON cards in cost area (card fronts, active and rested)
  - Test given DON cards under characters
  - Verify textures load correctly
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

## Phase 4: Tabletop Visual Environment

- [x] 14. Create table surface assets





  - Source or create wood grain texture (2048x2048 resolution)
  - Source or create felt/playmat texture as alternative
  - Create normal map for surface detail
  - Optimize textures for web performance
  - Save textures to `/public/textures/` directory
  - _Requirements: 12.1, 12.2_

- [x] 15. Update GameMat component with realistic surface





  - Modify `components/game/GameMat.tsx` to use texture materials
  - Implement texture loading for table surface
  - Add normal map for surface detail
  - Configure material properties (roughness, metalness)
  - Add zone boundary markings on table surface
  - Add visual separation between player areas
  - _Requirements: 12.1, 12.2_

- [x] 16. Implement enhanced lighting system





  - Update `components/game/GameScene.tsx` lighting setup
  - Add ambient light with appropriate intensity (0.6)
  - Add directional light from above-front (0.8 intensity)
  - Configure directional light for shadow casting
  - Add optional spot lights for player areas
  - Test lighting with different table textures
  - _Requirements: 12.3_

- [x] 17. Add background environment




  - Implement dark gradient background (darker at edges, lighter at center)
  - Add subtle vignette effect
  - Optional: Add blurred room texture as skybox
  - Ensure background doesn't distract from gameplay
  - Test performance impact of background
  - _Requirements: 12.4_

- [x] 18. Enable card shadows





  - Enable shadow map in Three.js renderer
  - Configure shadow map size (2048x2048) and type (PCFSoftShadowMap)
  - Set directional light to cast shadows
  - Set all card meshes to cast shadows
  - Set table mesh to receive shadows
  - Optimize shadow rendering for performance
  - _Requirements: 12.5_

- [x] 19. Performance optimization for visual enhancements




  - Profile frame rate with all visual enhancements enabled
  - Optimize shadow map size if needed for performance
  - Implement texture caching for DON cards
  - Consider LOD system for distant cards
  - Ensure 60 FPS target is maintained
  - Add performance monitoring metrics
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 20. Add visual environment tests




  - Create visual regression tests for table surface
  - Test lighting setup doesn't cause errors
  - Test shadows render correctly
  - Test background environment renders correctly
  - Verify performance meets 60 FPS target
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

## Phase 5: Integration & Polish

- [x] 21. Integration testing of all changes









  - Run full test suite for phase system
  - Run visual tests for DON cards and table environment
  - Test complete game flow with all visual enhancements
  - Verify no regressions in existing functionality
  - Test on different screen sizes and resolutions
  - _Requirements: All_

- [x] 22. Visual polish and tweaks





  - Adjust lighting intensity based on visual feedback
  - Fine-tune shadow settings for best appearance
  - Adjust DON card scale when given to characters
  - Tweak zone boundary markings for clarity
  - Add subtle animations for phase transitions
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 23. Update documentation





  - Update README with visual enhancements description
  - Document DON card rendering system
  - Document table environment configuration
  - Add screenshots of new visual features
  - Document performance considerations
  - _Requirements: All_

- [x] 24. Performance profiling and optimization





  - Profile complete game with all enhancements
  - Identify any performance bottlenecks
  - Optimize texture loading and caching
  - Optimize shadow rendering if needed
  - Verify memory usage is acceptable
  - Document performance metrics
  - _Requirements: All_
