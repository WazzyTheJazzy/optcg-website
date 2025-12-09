# Implementation Plan

- [x] 1. Set up database module structure and core types


  - Create directory structure: `lib/game-engine/database/`
  - Create `lib/game-engine/database/types.ts` for service-specific types
  - Create `lib/game-engine/database/index.ts` for module exports
  - Import and reuse existing error classes from `lib/game-engine/utils/errors.ts` (CardDataError)
  - _Requirements: 1.4, 5.2_






- [x] 2. Implement CardCache class




  - [ ] 2.1 Create CardCache with Map-based storage
    - Implement set, get, has, delete, clear methods

    - Add secondary index for card number lookups
    - Add size() method for cache statistics






    - _Requirements: 3.1, 3.2_

  - [ ] 2.2 Add cache invalidation methods
    - Implement invalidateCard method


    - Implement clear method for full cache reset
    - _Requirements: 3.3, 3.5_

- [ ] 3. Implement CardTransformer class
  - [x] 3.1 Create transformation logic for basic fields

    - Transform id, name, rarity fields
    - Parse color string to array

    - Map type to CardCategory enum
    - _Requirements: 1.5_


  - [-] 3.2 Implement parsing methods for complex fields


    - Parse tags/keywords from comma-separated string
    - Parse attributes from comma-separated string
    - Handle null values with appropriate defaults
    - _Requirements: 5.1_


  - [ ] 3.3 Create metadata object builder
    - Group set, cardNumber, illustrationType into metadata
    - Set isAltArt and isPromo flags based on data
    - _Requirements: 1.5_

  - [ ] 3.4 Handle imageUrl with fallback
    - Use provided imageUrl or generate default path
    - Ensure imageUrl is never null in CardDefinition
    - _Requirements: 5.1_

- [x] 4. Implement EffectMapper class


  - [x] 4.1 Create effect label extraction


    - Extract labels like "[On Play]", "[When Attacking]"
    - Handle multiple effects in single text string
    - _Requirements: 2.1, 2.4_

  - [x] 4.2 Implement label to timing mapping

    - Map "[On Play]" to AUTO/ON_PLAY
    - Map "[When Attacking]" to AUTO/WHEN_ATTACKING
    - Map "[Blocker]" to PERMANENT/null
    - Add mappings for all common labels
    - _Requirements: 2.5_

  - [x] 4.3 Create effect text to script ID mapper

    - Implement pattern matching for common effects
    - Map "draw X card" to draw_X script
    - Map power boost patterns to appropriate scripts
    - Map K.O. patterns to ko_* scripts
    - _Requirements: 2.1, 2.2_

  - [x] 4.4 Add placeholder handling for unmapped effects

    - Use "effect_placeholder" script ID for unknown effects
    - Log warnings for unmapped effects
    - _Requirements: 2.3_

  - [x] 4.5 Implement parseEffects main method

    - Combine all parsing logic
    - Return array of EffectDefinition objects
    - Handle cards with no effects
    - _Requirements: 2.2_

- [x] 5. Implement CardValidator class



  - [x] 5.1 Create required field validation


    - Check for presence of id, cardNumber, name, set, rarity, color, type
    - Return array of error messages for missing fields
    - _Requirements: 5.2_

  - [x] 5.2 Implement numeric range validation


    - Validate cost is 0-10
    - Validate power is 0-12000
    - Validate counter is 0-2000
    - Validate life is 0-5

    - _Requirements: 5.3_


  - [ ] 5.3 Add enum value validation
    - Validate type is valid card type

    - Validate rarity is valid rarity code
    - _Requirements: 5.3_


  - [x] 5.4 Create validate method for single card

    - Combine all validation rules
    - Return ValidationResult with errors


    - _Requirements: 5.2_

  - [ ] 5.5 Implement validateAll for batch validation
    - Query all cards from database
    - Validate each card
    - Return ValidationReport with summary
    - _Requirements: 5.5_


- [ ] 6. Implement CardInstanceFactory class (OPTIONAL - GameSetup already has this)
  - Note: GameSetup.ts already has `createCardInstance` function that does this
  - Only implement if we need additional factory methods beyond what GameSetup provides
  - [ ] 6.1 Review existing createCardInstance in GameSetup.ts
    - Check if it meets all requirements
    - _Requirements: 6.1, 6.2, 6.3, 6.4_








  - [ ] 6.2 If needed, create wrapper or enhanced factory
    - Add any missing functionality

    - Keep compatibility with GameSetup
    - _Requirements: 6.1, 6.4_


- [ ] 7. Implement CardDatabaseService main class
  - [ ] 7.1 Set up singleton pattern
    - Create private constructor
    - Implement getInstance static method

    - Initialize dependencies (cache, transformer, mapper, validator, factory)

    - _Requirements: 1.1_

  - [ ] 7.2 Implement single card loading methods
    - Create getCardById method with Prisma query

    - Create getCardByNumber method with Prisma query

    - Add cache check before database query
    - Store result in cache after loading
    - _Requirements: 1.1, 1.2, 3.1, 3.2_



  - [ ] 7.3 Implement batch loading methods
    - Create getCardsByIds for multiple IDs
    - Create getCardsByFilter with Prisma where clause

    - Support filtering by set, rarity, type, color

    - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.4 Add error handling for not found cards

    - Throw CardNotFoundError when card doesn't exist
    - Include identifier in error message

    - _Requirements: 1.4_




  - [x] 7.5 Implement cache management methods

    - Create clearCache method


    - Create invalidateCard method
    - _Requirements: 3.3, 3.5_



  - [ ] 7.6 Implement preloadAllCards method
    - Query all cards from database
    - Transform and cache each card
    - Log progress and completion
    - _Requirements: 3.4_

  - [ ] 7.7 Add validation methods
    - Expose validateAllCards method
    - Return comprehensive ValidationReport
    - _Requirements: 5.5_

  - [ ] 7.8 Implement factory methods (OPTIONAL)
    - Note: GameSetup.ts already has createCardInstance
    - Only add if we need service-level factory methods
    - Consider just returning CardDefinition[] and let GameSetup handle instance creation
    - _Requirements: 6.1, 6.5_

- [ ] 8. Integrate with existing GameSetup
  - [ ] 8.1 Update GameSetup.ts to use CardDatabaseService
    - Keep existing setupGame function signature (accepts CardDefinition[])
    - GameSetup already has loadDeck and createCardInstance functions - reuse them
    - No changes needed to GameSetup internals, just load CardDefinitions from service before calling setupGame
    - _Requirements: 6.5_

  - [ ] 8.2 Create helper function for loading decks from database
    - Create `loadDeckFromDatabase(cardIds: string[]): Promise<CardDefinition[]>`
    - Use CardDatabaseService internally
    - This keeps GameSetup.ts clean and testable
    - _Requirements: 6.5_

- [ ] 9. Add example usage and documentation
  - [ ] 9.1 Create usage examples
    - Example: Load single card
    - Example: Load deck for game initialization
    - Example: Filter cards by set
    - Example: Validate all cards

  - [ ] 9.2 Create README for database module
    - Document API methods
    - Explain caching behavior
    - Show integration examples
    - Document error handling

- [ ] 10. Create integration test suite
  - [ ] 10.1 Test end-to-end card loading
    - Load card from database
    - Verify transformation
    - Verify caching
    - _Requirements: 1.1, 1.2, 3.1, 3.2_

  - [ ] 10.2 Test effect mapping with real cards
    - Load cards with various effect types
    - Verify effect parsing
    - Verify script ID mapping
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 10.3 Test game initialization with real cards
    - Load leader and deck cards
    - Create CardInstances
    - Initialize game state
    - Verify game can start
    - _Requirements: 6.5_

  - [ ] 10.4 Test error scenarios
    - Test card not found
    - Test invalid card data
    - Test missing required fields
    - _Requirements: 1.4, 5.2_
