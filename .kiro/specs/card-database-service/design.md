# Card Database Service - Design Document

## Overview

The Card Database Service is a critical bridge layer between the Prisma database (which stores card data in a relational format) and the game engine (which requires CardDefinition objects). This service handles loading, transforming, caching, and validating card data to ensure the game engine has access to complete and accurate card information.

The service will be implemented as a singleton class that can be used both server-side (Next.js API routes) and client-side (when needed for game initialization). It provides a clean API for loading cards by various criteria and transforming them into the format expected by the game engine.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Game Engine, API Routes, Components)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Card Database Service                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Loader     │  │  Transformer │  │    Cache     │     │
│  │   Module     │  │    Module    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Effect     │  │  Validator   │  │   Factory    │     │
│  │   Mapper     │  │    Module    │  │   Module     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Prisma Client                              │
│                  (Database Access)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                            │
│                   (Card Data Storage)                        │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

1. **Loader Module**: Queries Prisma database for card data
2. **Transformer Module**: Converts Prisma Card model to CardDefinition
3. **Cache Manager**: In-memory caching for performance
4. **Effect Mapper**: Parses effect text and maps to script IDs
5. **Validator Module**: Validates card data integrity
6. **Factory Module**: Creates CardInstance objects from CardDefinitions

## Components and Interfaces

### 1. CardDatabaseService (Main Class)

```typescript
class CardDatabaseService {
  // Singleton instance
  private static instance: CardDatabaseService | null = null;
  
  // Dependencies
  private prisma: PrismaClient;
  private cache: CardCache;
  private effectMapper: EffectMapper;
  private validator: CardValidator;
  
  // Public API
  static getInstance(): CardDatabaseService;
  
  // Load single card
  async getCardById(cardId: string): Promise<CardDefinition>;
  async getCardByNumber(cardNumber: string): Promise<CardDefinition>;
  
  // Load multiple cards
  async getCardsByIds(cardIds: string[]): Promise<CardDefinition[]>;
  async getCardsByFilter(filter: CardFilter): Promise<CardDefinition[]>;
  
  // Preload and cache management
  async preloadAllCards(): Promise<void>;
  clearCache(): void;
  invalidateCard(cardId: string): void;
  
  // Validation
  async validateAllCards(): Promise<ValidationReport>;
  
  // Factory methods
  createCardInstance(
    cardDefinition: CardDefinition,
    owner: PlayerId,
    zone: ZoneId
  ): CardInstance;
  
  async createDeckInstances(
    cardIds: string[],
    owner: PlayerId
  ): Promise<CardInstance[]>;
}
```

### 2. CardCache

```typescript
class CardCache {
  private cache: Map<string, CardDefinition>;
  private cardNumberIndex: Map<string, string>; // cardNumber -> cardId
  
  set(cardId: string, definition: CardDefinition): void;
  get(cardId: string): CardDefinition | undefined;
  getByNumber(cardNumber: string): CardDefinition | undefined;
  has(cardId: string): boolean;
  delete(cardId: string): void;
  clear(): void;
  size(): number;
}
```

### 3. EffectMapper

```typescript
class EffectMapper {
  // Parse effect text and create EffectDefinition objects
  parseEffects(effectText: string | null): EffectDefinition[];
  
  // Extract effect label (e.g., "[On Play]", "[When Attacking]")
  private extractEffectLabel(text: string): string | null;
  
  // Map label to timing type and trigger
  private mapLabelToTiming(label: string): {
    timingType: EffectTimingType;
    triggerTiming: TriggerTiming | null;
  };
  
  // Map effect text to script ID
  private mapEffectToScriptId(effectText: string, label: string): string;
  
  // Parse condition from effect text
  private parseCondition(effectText: string): ConditionExpr | null;
  
  // Parse cost from effect text
  private parseCost(effectText: string): CostExpr | null;
}
```

### 4. CardTransformer

```typescript
class CardTransformer {
  // Transform Prisma Card to CardDefinition
  transform(
    prismaCard: PrismaCard,
    effects: EffectDefinition[]
  ): CardDefinition;
  
  // Parse color string to array
  private parseColors(colorString: string): string[];
  
  // Parse tags/keywords
  private parseKeywords(tagsString: string | null): string[];
  
  // Parse attributes
  private parseAttributes(attributeString: string | null): string[];
  
  // Map type to category
  private mapTypeToCategory(type: string): CardCategory;
}
```

### 5. CardValidator

```typescript
class CardValidator {
  // Validate a single card
  validate(card: PrismaCard): ValidationResult;
  
  // Validate all cards in database
  async validateAll(prisma: PrismaClient): Promise<ValidationReport>;
  
  // Validation rules
  private validateRequiredFields(card: PrismaCard): string[];
  private validateNumericRanges(card: PrismaCard): string[];
  private validateEnumValues(card: PrismaCard): string[];
  private validateEffectText(card: PrismaCard): string[];
}
```

### 6. CardInstanceFactory

```typescript
class CardInstanceFactory {
  // Create a single card instance
  createInstance(
    definition: CardDefinition,
    owner: PlayerId,
    zone: ZoneId
  ): CardInstance;
  
  // Generate unique instance ID
  private generateInstanceId(): string;
  
  // Determine initial card state based on zone
  private getInitialState(zone: ZoneId): CardState;
}
```

## Data Models

### Prisma Card Model (Input)

```typescript
// From database
interface PrismaCard {
  id: string;
  cardNumber: string;
  name: string;
  set: string;
  rarity: string;
  color: string;
  cost: number | null;
  power: number | null;
  counter: number | null;
  life: number | null;
  attribute: string | null;
  type: string;
  category: string;
  effect: string | null;
  trigger: string | null;
  imageUrl: string | null;
  illustrationType: string | null;
  artist: string | null;
  archetype: string | null;
  tags: string | null;
}
```

### CardDefinition (Output)

```typescript
// For game engine
interface CardDefinition {
  id: string;
  name: string;
  category: CardCategory;
  colors: string[];
  typeTags: string[];
  attributes: string[];
  basePower: number | null;
  baseCost: number | null;
  lifeValue: number | null;
  counterValue: number | null;
  rarity: string;
  keywords: string[];
  effects: EffectDefinition[];
  imageUrl: string;
  metadata: CardMetadata;
}
```

### Transformation Mapping

| Prisma Field | CardDefinition Field | Transformation |
|--------------|---------------------|----------------|
| id | id | Direct copy |
| name | name | Direct copy |
| type | category | Map to CardCategory enum |
| color | colors | Parse comma-separated to array |
| tags | typeTags | Parse comma-separated to array |
| attribute | attributes | Parse comma-separated to array |
| power | basePower | Direct copy |
| cost | baseCost | Direct copy |
| life | lifeValue | Direct copy |
| counter | counterValue | Direct copy |
| rarity | rarity | Direct copy |
| tags | keywords | Extract keyword tags |
| effect | effects | Parse and map to EffectDefinition[] |
| imageUrl | imageUrl | Default to placeholder if null |
| set, cardNumber, etc. | metadata | Group into metadata object |

## Effect Parsing Strategy

### Effect Label Patterns

The effect mapper will recognize these common patterns:

- `[On Play]` → AUTO trigger, ON_PLAY timing
- `[When Attacking]` → AUTO trigger, WHEN_ATTACKING timing
- `[On K.O.]` → AUTO trigger, ON_KO timing
- `[Activate: Main]` → ACTIVATE trigger, START_OF_MAIN timing
- `[Blocker]` → PERMANENT effect, no trigger
- `[Rush]` → PERMANENT effect, no trigger
- `[Double Attack]` → PERMANENT effect, no trigger
- `[Trigger]` → AUTO trigger, special trigger timing

### Effect Text to Script ID Mapping

The mapper will use pattern matching to map effect text to script IDs:

```typescript
const effectPatterns = [
  {
    pattern: /draw (\d+) card/i,
    scriptId: (match) => `draw_${match[1]}`,
  },
  {
    pattern: /(\d+) power.*until.*end of.*turn/i,
    scriptId: (match) => `power_boost_${match[1]}_until_end_of_turn`,
  },
  {
    pattern: /(\d+) power.*during.*battle/i,
    scriptId: (match) => `power_boost_${match[1]}_during_battle`,
  },
  {
    pattern: /k\.?o\.? .*character.*cost (\d+) or less/i,
    scriptId: (match) => `ko_cost_${match[1]}_or_less`,
  },
  {
    pattern: /rest.*character/i,
    scriptId: () => 'rest_target_character',
  },
  // ... more patterns
];
```

For effects that don't match any pattern, use a placeholder script ID and log a warning.

## Error Handling

### Error Types

**Note:** We will use the existing error classes from `lib/game-engine/utils/errors.ts`:

```typescript
// Use existing CardDataError for card-related errors
import { CardDataError } from '../utils/errors';

// Card not found
throw new CardDataError(`Card not found: ${identifier}`, identifier);

// Card validation failed
throw new CardDataError(
  `Card validation failed: ${errors.join(', ')}`,
  cardId,
  { errors }
);

// Effect parsing failed (log warning, don't throw)
console.warn(`Failed to parse effect for card ${cardId}: ${effectText}`);
```

### Error Handling Strategy

1. **Card Not Found**: Throw `CardNotFoundError` - caller must handle
2. **Validation Errors**: Log warning and skip card (for batch operations) or throw (for single card)
3. **Effect Parsing Errors**: Log warning, use placeholder script ID, continue processing
4. **Database Errors**: Propagate to caller with context

## Caching Strategy

### Cache Behavior

1. **On First Load**: Query database, transform, store in cache
2. **On Subsequent Loads**: Return from cache if available
3. **Cache Invalidation**: Manual invalidation when card is updated
4. **Preloading**: Load all cards at application startup for optimal performance

### Cache Key Strategy

- Primary key: Card ID (database ID)
- Secondary index: Card number (e.g., "OP01-001")

### Memory Considerations

With ~700 cards, each CardDefinition ~2KB, total cache size ~1.4MB - acceptable for in-memory storage.

## Validation Rules

### Required Fields

- id, cardNumber, name, set, rarity, color, type, category

### Numeric Ranges

- cost: 0-10
- power: 0-12000
- counter: 0-2000
- life: 0-5

### Enum Values

- type: "Leader", "Character", "Event", "Stage"
- category: Must match CardCategory enum
- rarity: "C", "UC", "R", "SR", "SEC", "L", "P"

### Effect Validation

- Effect text should contain recognizable patterns
- Warn if effect cannot be mapped to a script ID

## Testing Strategy

### Unit Tests

1. **CardTransformer**: Test transformation of various card types
2. **EffectMapper**: Test effect parsing for common patterns
3. **CardValidator**: Test validation rules
4. **CardCache**: Test cache operations
5. **CardInstanceFactory**: Test instance creation

### Integration Tests

1. **Database Loading**: Test loading cards from actual database
2. **End-to-End**: Load card, transform, create instance, use in game
3. **Performance**: Test cache performance with full card set
4. **Error Handling**: Test error scenarios

### Test Data

Use actual cards from database:
- OP01-001 (Roronoa Zoro - Leader)
- OP01-025 (Roronoa Zoro - Character)
- OP01-047 (Gum-Gum Jet Pistol - Event)
- OP01-060 (Thousand Sunny - Stage)

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Only load cards when needed
2. **Batch Loading**: Load multiple cards in single query
3. **Preloading**: Load all cards at startup for game server
4. **Indexing**: Use Prisma indexes for fast queries
5. **Caching**: In-memory cache for repeated access

### Expected Performance

- Single card load (cached): <1ms
- Single card load (uncached): <10ms
- Batch load 50 cards (cached): <1ms
- Batch load 50 cards (uncached): <50ms
- Preload all cards: <500ms

## Integration Points

### With Game Engine

**Update existing GameSetup.ts to use CardDatabaseService:**

```typescript
// NEW: Load card definitions from database
const cardService = CardDatabaseService.getInstance();
const player1Deck = await cardService.getCardsByIds(player1CardIds);
const player2Deck = await cardService.getCardsByIds(player2CardIds);

// Use existing setupGame function (updated to accept CardDefinition[])
const result = setupGame(
  {
    deck1: player1Deck,
    deck2: player2Deck,
    firstPlayerChoice: PlayerId.PLAYER_1,
  },
  rules,
  eventEmitter
);
```

### With API Routes

```typescript
// API route to get card for game
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cardNumber = searchParams.get('cardNumber');
  
  const cardService = CardDatabaseService.getInstance();
  const cardDef = await cardService.getCardByNumber(cardNumber);
  
  return Response.json(cardDef);
}
```

### With Effect Scripts

```typescript
// Effect scripts can reference card definitions
const cardDef = cardInstance.definition;
console.log(`${cardDef.name} has ${cardDef.basePower} power`);
```

## File Structure

**Note:** Integrating with existing `lib/game-engine/` structure:

```
lib/
  game-engine/
    database/                      # NEW MODULE
      CardDatabaseService.ts       # Main service class
      CardCache.ts                 # Cache implementation
      CardTransformer.ts           # Prisma to CardDefinition
      EffectMapper.ts              # Effect parsing and mapping
      CardValidator.ts             # Validation logic
      CardInstanceFactory.ts       # Instance creation
      types.ts                     # Type definitions
      index.ts                     # Module exports
      __tests__/
        CardDatabaseService.test.ts
        CardTransformer.test.ts
        EffectMapper.test.ts
        CardValidator.test.ts
        integration.test.ts
    utils/                         # EXISTING - reuse errors.ts, validation.ts
    setup/                         # EXISTING - update GameSetup.ts to use service
    effects/                       # EXISTING - use EffectScripts registry
    core/                          # EXISTING - use types.ts
```

## Configuration

### Environment Variables

```env
# Database connection (already configured)
DATABASE_URL="file:./dev.db"

# Cache settings
CARD_CACHE_ENABLED=true
CARD_PRELOAD_ON_STARTUP=true

# Validation settings
CARD_VALIDATION_STRICT=false  # If true, throw on validation errors
```

### Service Configuration

```typescript
interface CardDatabaseConfig {
  cacheEnabled: boolean;
  preloadOnStartup: boolean;
  strictValidation: boolean;
  logEffectParsingWarnings: boolean;
}
```

## Migration Strategy

### Phase 1: Core Implementation
- Implement CardDatabaseService with basic loading
- Implement CardTransformer
- Implement CardCache
- Basic effect mapping (common patterns only)

### Phase 2: Effect Mapping
- Implement comprehensive EffectMapper
- Add all common effect patterns
- Test with real card data

### Phase 3: Validation & Testing
- Implement CardValidator
- Add comprehensive tests
- Validate all cards in database

### Phase 4: Integration
- Integrate with GameSetup
- Update game initialization code
- Add API endpoints if needed

## Future Enhancements

1. **Dynamic Effect Loading**: Load effect scripts from database
2. **Card Versioning**: Support multiple versions of same card
3. **Hot Reload**: Reload cards without restarting application
4. **Analytics**: Track which cards are loaded most frequently
5. **Export/Import**: Export card definitions to JSON for testing
6. **Admin UI**: Web interface to validate and fix card data
