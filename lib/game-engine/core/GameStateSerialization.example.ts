/**
 * Example usage of Game State Serialization
 * 
 * This file demonstrates how to save and load game states.
 */

import {
  serializeGameState,
  deserializeGameState,
  validateGameState,
  gameStateToJSON,
  gameStateFromJSON,
} from './GameStateSerialization';
import { GameState, CardDefinition } from './types';

// ============================================================================
// Example 1: Save a game state to JSON
// ============================================================================

export function saveGameToFile(state: GameState): string {
  // Convert game state to JSON string
  const json = gameStateToJSON(state);
  
  // In a real application, you would write this to a file or database
  // For example:
  // fs.writeFileSync('saved-game.json', json);
  // or
  // localStorage.setItem('saved-game', json);
  
  return json;
}

// ============================================================================
// Example 2: Load a game state from JSON
// ============================================================================

export function loadGameFromFile(
  json: string,
  cardDefinitionLookup: (cardId: string) => CardDefinition | undefined
): GameState {
  // Parse JSON string back to game state
  const state = gameStateFromJSON(json, cardDefinitionLookup);
  
  // Validate the loaded state
  const validation = validateGameState(state);
  if (!validation.valid) {
    throw new Error(`Invalid game state: ${validation.errors.join(', ')}`);
  }
  
  return state;
}

// ============================================================================
// Example 3: Create a card definition lookup function
// ============================================================================

export function createCardLookup(
  cardDefinitions: CardDefinition[]
): (cardId: string) => CardDefinition | undefined {
  const lookupMap = new Map<string, CardDefinition>();
  
  cardDefinitions.forEach((def) => {
    lookupMap.set(def.id, def);
  });
  
  return (cardId: string) => lookupMap.get(cardId);
}

// ============================================================================
// Example 4: Save game with metadata
// ============================================================================

export interface SavedGame {
  version: string;
  savedAt: string;
  playerNames: { [key: string]: string };
  gameState: string; // JSON string
}

export function createSaveGame(
  state: GameState,
  playerNames: { [key: string]: string }
): SavedGame {
  return {
    version: '1.0.0',
    savedAt: new Date().toISOString(),
    playerNames,
    gameState: gameStateToJSON(state),
  };
}

export function loadSaveGame(
  savedGame: SavedGame,
  cardDefinitionLookup: (cardId: string) => CardDefinition | undefined
): { state: GameState; playerNames: { [key: string]: string } } {
  const state = gameStateFromJSON(savedGame.gameState, cardDefinitionLookup);
  
  return {
    state,
    playerNames: savedGame.playerNames,
  };
}

// ============================================================================
// Example 5: Auto-save functionality
// ============================================================================

export class AutoSaveManager {
  private saveInterval: NodeJS.Timeout | null = null;
  private lastSave: string | null = null;
  
  constructor(
    private getCurrentState: () => GameState,
    private onSave: (json: string) => void,
    private intervalMs: number = 30000 // Auto-save every 30 seconds
  ) {}
  
  start(): void {
    if (this.saveInterval) {
      return; // Already started
    }
    
    this.saveInterval = setInterval(() => {
      this.save();
    }, this.intervalMs);
  }
  
  stop(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }
  
  save(): void {
    const state = this.getCurrentState();
    const json = gameStateToJSON(state);
    
    // Only save if state has changed
    if (json !== this.lastSave) {
      this.onSave(json);
      this.lastSave = json;
    }
  }
  
  getLastSave(): string | null {
    return this.lastSave;
  }
}

// ============================================================================
// Example 6: Validate before saving
// ============================================================================

export function safeSaveGame(state: GameState): string | null {
  // Validate state before saving
  const validation = validateGameState(state);
  
  if (!validation.valid) {
    console.error('Cannot save invalid game state:', validation.errors);
    return null;
  }
  
  // State is valid, proceed with save
  return gameStateToJSON(state);
}

// ============================================================================
// Example 7: Migration support for future versions
// ============================================================================

export interface GameStateMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
}

export class GameStateLoader {
  private migrations: GameStateMigration[] = [];
  
  registerMigration(migration: GameStateMigration): void {
    this.migrations.push(migration);
  }
  
  load(
    json: string,
    cardDefinitionLookup: (cardId: string) => CardDefinition | undefined
  ): GameState {
    let data = JSON.parse(json);
    
    // Apply migrations if needed
    const currentVersion = '1.0.0';
    while (data.version !== currentVersion) {
      const migration = this.migrations.find(
        (m) => m.fromVersion === data.version
      );
      
      if (!migration) {
        throw new Error(
          `No migration found from version ${data.version} to ${currentVersion}`
        );
      }
      
      data = migration.migrate(data);
      data.version = migration.toVersion;
    }
    
    return deserializeGameState(data, cardDefinitionLookup);
  }
}

// ============================================================================
// Example 8: Compress saved games (optional)
// ============================================================================

export function compressSaveGame(json: string): string {
  // In a real application, you might use a compression library
  // For example: pako, lz-string, etc.
  // This is just a placeholder
  return json;
}

export function decompressSaveGame(compressed: string): string {
  // Decompress the saved game
  return compressed;
}

// ============================================================================
// Usage Example
// ============================================================================

/*
// Assuming you have a game engine instance and card definitions

// 1. Save a game
const gameState = gameEngine.getState();
const savedJson = saveGameToFile(gameState);
localStorage.setItem('my-game', savedJson);

// 2. Load a game
const loadedJson = localStorage.getItem('my-game');
if (loadedJson) {
  const cardLookup = createCardLookup(allCardDefinitions);
  const loadedState = loadGameFromFile(loadedJson, cardLookup);
  gameEngine.setState(loadedState);
}

// 3. Auto-save
const autoSave = new AutoSaveManager(
  () => gameEngine.getState(),
  (json) => localStorage.setItem('auto-save', json),
  30000 // Save every 30 seconds
);
autoSave.start();

// 4. Stop auto-save when game ends
gameEngine.on('gameOver', () => {
  autoSave.stop();
  autoSave.save(); // Final save
});
*/
