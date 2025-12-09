/**
 * GameScene.example.tsx
 * 
 * Example usage of the GameScene component with the One Piece TCG Engine.
 * Demonstrates how to set up the engine, rendering interface, and scene.
 */

'use client';

import React from 'react';
import { GameScene } from '@/components/game/GameScene';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { RenderingInterface } from '@/lib/game-engine/rendering/RenderingInterface';
import { RulesContext } from '@/lib/game-engine/rules/RulesContext';
import { PlayerId, ZoneId, CardDefinition } from '@/lib/game-engine/core/types';

/**
 * Example component showing how to use GameScene
 */
export function GameSceneExample() {
  // Initialize the game engine
  const rules = new RulesContext();
  const engine = new GameEngine(rules);
  const renderingInterface = new RenderingInterface(engine);

  // Example card definitions (in a real app, these would come from your database)
  const exampleDeck1: CardDefinition[] = [
    // ... your deck cards here
  ];

  const exampleDeck2: CardDefinition[] = [
    // ... your deck cards here
  ];

  // Set up the game
  React.useEffect(() => {
    try {
      engine.setupGame({
        deck1: exampleDeck1,
        deck2: exampleDeck2,
      });
      console.log('Game setup complete');
    } catch (error) {
      console.error('Failed to setup game:', error);
    }
  }, []);

  // Handle card clicks
  const handleCardClick = (cardId: string) => {
    console.log('Card clicked:', cardId);
    
    // Get card visual state
    const cardState = renderingInterface.getCardVisualState(cardId);
    if (cardState) {
      console.log('Card state:', cardState);
    }
  };

  // Handle zone clicks
  const handleZoneClick = (playerId: PlayerId, zone: ZoneId) => {
    console.log('Zone clicked:', playerId, zone);
    
    // Get zone contents
    const zoneContents = renderingInterface.getZoneContents(playerId, zone);
    console.log('Zone contents:', zoneContents);
  };

  const boardState = renderingInterface.getBoardState();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GameScene
        engine={engine}
        renderingInterface={renderingInterface}
        boardState={boardState}
        onCardClick={handleCardClick}
        onZoneClick={handleZoneClick}
      />
      
      {/* UI Overlay (optional) */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
      }}>
        <h3>Game Info</h3>
        <p>Phase: {engine.getState().phase}</p>
        <p>Turn: {engine.getState().turnNumber}</p>
        <p>Active Player: {engine.getState().activePlayer}</p>
      </div>
    </div>
  );
}

/**
 * Example with event subscriptions
 */
export function GameSceneWithEvents() {
  const rules = new RulesContext();
  const engine = new GameEngine(rules);
  const renderingInterface = new RenderingInterface(engine);
  const [eventLog, setEventLog] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Subscribe to various game events
    renderingInterface.onCardMoved((event) => {
      setEventLog(prev => [...prev, `Card moved: ${event.cardId} from ${event.fromZone} to ${event.toZone}`]);
    });

    renderingInterface.onCardStateChanged((event) => {
      setEventLog(prev => [...prev, `Card state changed: ${event.cardId} from ${event.oldState} to ${event.newState}`]);
    });

    renderingInterface.onPhaseChanged((event) => {
      setEventLog(prev => [...prev, `Phase changed: ${event.oldPhase} → ${event.newPhase}`]);
    });

    renderingInterface.onBattleEvent((event) => {
      setEventLog(prev => [...prev, `Battle event: ${event.type}`]);
    });

    renderingInterface.onGameOver((event) => {
      setEventLog(prev => [...prev, `Game over! Winner: ${event.winner}`]);
    });
  }, [renderingInterface]);

  const boardState = renderingInterface.getBoardState();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GameScene
        engine={engine}
        renderingInterface={renderingInterface}
        boardState={boardState}
      />
      
      {/* Event Log Overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: '300px',
        maxHeight: '80vh',
        overflow: 'auto',
        color: 'white',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        <h3>Event Log</h3>
        {eventLog.map((log, index) => (
          <div key={index} style={{ marginBottom: '5px', borderBottom: '1px solid #333' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example with camera controls demonstration
 */
export function GameSceneWithCameraDemo() {
  const rules = new RulesContext();
  const engine = new GameEngine(rules);
  const renderingInterface = new RenderingInterface(engine);
  const boardState = renderingInterface.getBoardState();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GameScene
        engine={engine}
        renderingInterface={renderingInterface}
        boardState={boardState}
      />
      
      {/* Camera Controls Info */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: 'white',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px',
        borderRadius: '5px',
        fontFamily: 'sans-serif',
      }}>
        <h3 style={{ marginTop: 0 }}>Camera Controls</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Left Click + Drag: Rotate camera</li>
          <li>Right Click + Drag: Pan camera</li>
          <li>Scroll Wheel: Zoom in/out</li>
          <li>Zoom Range: 10-50 units</li>
        </ul>
      </div>
    </div>
  );
}
