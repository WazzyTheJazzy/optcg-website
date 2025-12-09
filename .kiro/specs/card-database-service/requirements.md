# Requirements Document

## Introduction

The One Piece TCG application needs a Card Database Service that bridges the gap between the Prisma database (which stores card data) and the game engine (which needs CardDefinition objects). Currently, the game engine has no way to load card stats, abilities, and effects from the database, making it impossible to initialize games with actual card data.

## Glossary

- **Card Database Service**: A service layer that loads card data from Prisma and transforms it into CardDefinition objects for the game engine
- **CardDefinition**: TypeScript interface in the game engine that represents a card's complete data including stats, effects, and metadata
- **Prisma Card Model**: Database model that stores card information (name, stats, rarity, effects, etc.)
- **Effect Script**: JavaScript code that defines how a card's ability works in the game engine
- **Card Instance**: Runtime representation of a card in an active game (references a CardDefinition)
- **Game Engine**: The core game logic system that needs card definitions to function

## Requirements

### Requirement 1

**User Story:** As a game developer, I want the game engine to load card definitions from the database, so that games can be initialized with real card data

#### Acceptance Criteria

1. WHEN THE Card_Database_Service receives a card ID, THE Card_Database_Service SHALL query the Prisma database and return a CardDefinition object
2. WHEN THE Card_Database_Service receives a card number (e.g., "OP01-001"), THE Card_Database_Service SHALL query the Prisma database and return a CardDefinition object
3. WHEN THE Card_Database_Service receives multiple card IDs, THE Card_Database_Service SHALL return an array of CardDefinition objects
4. WHEN a card is not found in the database, THE Card_Database_Service SHALL throw a descriptive error
5. THE Card_Database_Service SHALL transform Prisma Card model data into the CardDefinition interface format required by the game engine

### Requirement 2

**User Story:** As a game developer, I want card effects to be properly mapped to effect scripts, so that card abilities work correctly in the game engine

#### Acceptance Criteria

1. WHEN THE Card_Database_Service loads a card with effects, THE Card_Database_Service SHALL parse the effect text and map it to registered effect script IDs
2. WHEN a card has multiple effects, THE Card_Database_Service SHALL create multiple EffectDefinition objects with appropriate timing and triggers
3. WHEN a card effect cannot be mapped to a script, THE Card_Database_Service SHALL use a placeholder script ID and log a warning
4. THE Card_Database_Service SHALL extract effect labels (e.g., "[On Play]", "[When Attacking]") from the card's effect text
5. THE Card_Database_Service SHALL determine the correct EffectTimingType and TriggerTiming for each effect based on its label

### Requirement 3

**User Story:** As a game developer, I want to cache loaded card definitions, so that repeated queries for the same card are fast

#### Acceptance Criteria

1. WHEN THE Card_Database_Service loads a card definition, THE Card_Database_Service SHALL store it in an in-memory cache
2. WHEN THE Card_Database_Service receives a request for a cached card, THE Card_Database_Service SHALL return the cached definition without querying the database
3. THE Card_Database_Service SHALL provide a method to clear the cache
4. THE Card_Database_Service SHALL provide a method to preload all cards into the cache at application startup
5. WHEN a card is updated in the database, THE Card_Database_Service SHALL invalidate the cached entry for that card

### Requirement 4

**User Story:** As a game developer, I want to load all cards for a specific set or rarity, so that I can build decks and filter cards efficiently

#### Acceptance Criteria

1. WHEN THE Card_Database_Service receives a set code filter, THE Card_Database_Service SHALL return all CardDefinition objects for that set
2. WHEN THE Card_Database_Service receives a rarity filter, THE Card_Database_Service SHALL return all CardDefinition objects with that rarity
3. WHEN THE Card_Database_Service receives multiple filters, THE Card_Database_Service SHALL return CardDefinition objects matching all filters
4. THE Card_Database_Service SHALL support filtering by card type (Leader, Character, Event, Stage)
5. THE Card_Database_Service SHALL support filtering by color

### Requirement 5

**User Story:** As a game developer, I want the service to handle missing or incomplete card data gracefully, so that the application doesn't crash when loading cards

#### Acceptance Criteria

1. WHEN a card has null values for optional fields, THE Card_Database_Service SHALL use appropriate default values in the CardDefinition
2. WHEN a card is missing required fields, THE Card_Database_Service SHALL throw a validation error with details about the missing fields
3. THE Card_Database_Service SHALL validate that numeric fields (power, cost, life, counter) are within valid ranges
4. WHEN a card has invalid data, THE Card_Database_Service SHALL log the error and skip that card rather than failing completely
5. THE Card_Database_Service SHALL provide a method to validate all cards in the database and report any data issues

### Requirement 6

**User Story:** As a game developer, I want to easily create CardInstance objects from CardDefinitions, so that I can initialize game state with player decks

#### Acceptance Criteria

1. THE Card_Database_Service SHALL provide a factory method that creates a CardInstance from a CardDefinition
2. WHEN creating a CardInstance, THE Card_Database_Service SHALL generate a unique instance ID
3. WHEN creating a CardInstance, THE Card_Database_Service SHALL initialize the card with default state (ACTIVE or NONE based on zone)
4. WHEN creating a CardInstance, THE Card_Database_Service SHALL set the owner and controller to the specified player
5. THE Card_Database_Service SHALL provide a method to create multiple CardInstance objects from an array of card IDs (for deck initialization)
