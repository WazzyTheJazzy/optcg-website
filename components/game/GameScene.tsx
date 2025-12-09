'use client';

/**
 * GameScene.tsx
 * 
 * Three.js scene component for rendering the One Piece TCG game board.
 * Manages the 3D scene, camera, lights, and zone layouts for both players.
 * Subscribes to RenderingInterface events to update visuals in response to game state changes.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { RenderingInterface, BoardVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { PlayerId, ZoneId, Phase } from '@/lib/game-engine/core/types';
import { CardZoneRenderer } from './CardMesh';
import { DonZoneRenderer } from './DonMesh';
import { CardAnimator } from '@/lib/game-engine/rendering/CardAnimator';
import { DragDropManager, DropZone } from '@/lib/game-engine/rendering/DragDropManager';
import { GameMat } from './GameMat';
import { CardSleeve } from '@/lib/card-sleeves';
import { getPerformanceMonitor } from '@/lib/game-engine/rendering/PerformanceMonitor';
import { PhaseTransitionEffect, PhaseIndicator } from './PhaseTransition';

/**
 * Props for the GameScene component
 */
export interface GameSceneProps {
  engine: GameEngine;
  renderingInterface: RenderingInterface;
  boardState: BoardVisualState;
  onCardClick?: (cardId: string) => void;
  onZoneClick?: (playerId: PlayerId, zone: ZoneId) => void;
  onCardMove?: (cardId: string, fromZone: ZoneId, toZone: ZoneId, toPlayerId: PlayerId) => void;
  selectedCardId?: string | null;
  attackMode?: boolean;
  validTargets?: string[];
  donAttachMode?: boolean;
  selectedDonId?: string | null;
  highlightedCards?: string[];
  focusedCardId?: string | null;
}

/**
 * Zone layout configuration for positioning cards in 3D space
 */
interface ZoneLayout {
  position: [number, number, number];
  rotation: [number, number, number];
  maxCards: number;
  spacing: number;
  stackOffset: number;
}

/**
 * Zone layouts for both players
 * Player 1 is at the bottom (negative Z), Player 2 is at the top (positive Z)
 */
const ZONE_LAYOUTS: Record<PlayerId, Record<ZoneId, ZoneLayout>> = {
  [PlayerId.PLAYER_1]: {
    [ZoneId.DECK]: {
      position: [-8, 0, -6],
      rotation: [0, 0, 0],
      maxCards: 50,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.HAND]: {
      position: [0, 0, -8],
      rotation: [0, 0, 0],
      maxCards: 10,
      spacing: 1.5,
      stackOffset: 0,
    },
    [ZoneId.TRASH]: {
      position: [8, 0, -6],
      rotation: [0, 0, 0],
      maxCards: 50,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.LIFE]: {
      position: [-6, 0, -6],
      rotation: [0, 0, 0],
      maxCards: 5,
      spacing: 0.3,
      stackOffset: 0,
    },
    [ZoneId.DON_DECK]: {
      position: [-10, 0, -4],
      rotation: [0, 0, 0],
      maxCards: 10,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.COST_AREA]: {
      position: [-10, 0, -2],
      rotation: [0, 0, 0],
      maxCards: 10,
      spacing: 0.3,
      stackOffset: 0,
    },
    [ZoneId.LEADER_AREA]: {
      position: [0, 0, -4],
      rotation: [0, 0, 0],
      maxCards: 1,
      spacing: 0,
      stackOffset: 0,
    },
    [ZoneId.CHARACTER_AREA]: {
      position: [0, 0, -2],
      rotation: [0, 0, 0],
      maxCards: 5,
      spacing: 2,
      stackOffset: 0,
    },
    [ZoneId.STAGE_AREA]: {
      position: [6, 0, -4],
      rotation: [0, 0, 0],
      maxCards: 1,
      spacing: 0,
      stackOffset: 0,
    },
    [ZoneId.LIMBO]: {
      position: [0, 2, 0],
      rotation: [0, 0, 0],
      maxCards: 10,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.BANISHED]: {
      position: [10, 0, -6],
      rotation: [0, 0, 0],
      maxCards: 50,
      spacing: 0,
      stackOffset: 0.01,
    },
  },
  [PlayerId.PLAYER_2]: {
    [ZoneId.DECK]: {
      position: [-8, 0, 6],
      rotation: [0, Math.PI, 0],
      maxCards: 50,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.HAND]: {
      position: [0, 0, 8],
      rotation: [0, Math.PI, 0],
      maxCards: 10,
      spacing: 1.5,
      stackOffset: 0,
    },
    [ZoneId.TRASH]: {
      position: [8, 0, 6],
      rotation: [0, Math.PI, 0],
      maxCards: 50,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.LIFE]: {
      position: [-6, 0, 6],
      rotation: [0, Math.PI, 0],
      maxCards: 5,
      spacing: 0.3,
      stackOffset: 0,
    },
    [ZoneId.DON_DECK]: {
      position: [-10, 0, 4],
      rotation: [0, Math.PI, 0],
      maxCards: 10,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.COST_AREA]: {
      position: [-10, 0, 2],
      rotation: [0, Math.PI, 0],
      maxCards: 10,
      spacing: 0.3,
      stackOffset: 0,
    },
    [ZoneId.LEADER_AREA]: {
      position: [0, 0, 4],
      rotation: [0, Math.PI, 0],
      maxCards: 1,
      spacing: 0,
      stackOffset: 0,
    },
    [ZoneId.CHARACTER_AREA]: {
      position: [0, 0, 2],
      rotation: [0, Math.PI, 0],
      maxCards: 5,
      spacing: 2,
      stackOffset: 0,
    },
    [ZoneId.STAGE_AREA]: {
      position: [6, 0, 4],
      rotation: [0, Math.PI, 0],
      maxCards: 1,
      spacing: 0,
      stackOffset: 0,
    },
    [ZoneId.LIMBO]: {
      position: [0, 2, 0],
      rotation: [0, Math.PI, 0],
      maxCards: 10,
      spacing: 0,
      stackOffset: 0.01,
    },
    [ZoneId.BANISHED]: {
      position: [10, 0, 6],
      rotation: [0, Math.PI, 0],
      maxCards: 50,
      spacing: 0,
      stackOffset: 0.01,
    },
  },
};

/**
 * Props for SceneContent component
 */
interface SceneContentProps {
  boardState: BoardVisualState;
  renderingInterface: RenderingInterface;
  onCardClick?: (cardId: string) => void;
  onZoneClick?: (playerId: PlayerId, zone: ZoneId) => void;
  onCardMove?: (cardId: string, fromZone: ZoneId, toZone: ZoneId, toPlayerId: PlayerId) => void;
  selectedCardId?: string | null;
  attackMode?: boolean;
  validTargets?: string[];
  donAttachMode?: boolean;
  selectedDonId?: string | null;
  highlightedCards?: string[];
  focusedCardId?: string | null;
}

/**
 * Scene content component that handles rendering and event subscriptions
 */
const SceneContent = React.forwardRef<THREE.Group, SceneContentProps>(
  ({ boardState, renderingInterface, onCardClick, onZoneClick, onCardMove, selectedCardId, attackMode, validTargets, donAttachMode, selectedDonId, highlightedCards = [], focusedCardId }, ref) => {
  console.log('🎬 GameScene SceneContent received boardState:', {
    p1Deck: boardState?.player1?.zones?.deck?.length || 'undefined',
    p1Hand: boardState?.player1?.zones?.hand?.length || 'undefined',
    hasPlayer1: !!boardState?.player1,
    hasZones: !!boardState?.player1?.zones,
  });
  
  const { camera, gl, mouse } = useThree();
  
  // Performance monitoring (Task 19)
  const [performanceMonitor] = useState(() => {
    const monitor = getPerformanceMonitor();
    monitor.setRenderer(gl);
    return monitor;
  });
  
  // Adaptive shadow map size based on performance (Task 19)
  const [shadowMapSize, setShadowMapSize] = useState(2048);
  
  // Performance warning handler
  useEffect(() => {
    performanceMonitor.onWarning((metrics) => {
      console.warn('⚠️ Performance warning:', metrics);
      
      // Automatically reduce shadow map size if performance is poor
      if (metrics.fps < 45 && shadowMapSize > 1024) {
        const newSize = shadowMapSize / 2;
        console.log(`📉 Reducing shadow map size: ${shadowMapSize} -> ${newSize}`);
        setShadowMapSize(newSize);
      }
    });
  }, [performanceMonitor, shadowMapSize]);
  
  // Configure shadow map type for soft shadows (Task 18)
  useEffect(() => {
    if (gl.shadowMap) {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }, [gl]);
  const [animator] = useState(() => new CardAnimator());
  const [dragDropManager] = useState(() => new DragDropManager());
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<THREE.Vector3 | null>(null);
  const controlsRef = useRef<any>(null);
  
  // Load sleeve preferences (per player)
  const [player1Sleeve, setPlayer1Sleeve] = useState<CardSleeve | null>(null);
  const [player2Sleeve, setPlayer2Sleeve] = useState<CardSleeve | null>(null);
  
  // Track current phase for transition animations (Task 22)
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  
  useEffect(() => {
    // Load sleeve preferences from localStorage
    import('@/lib/sleeve-preferences').then(({ getSelectedSleeve }) => {
      setPlayer1Sleeve(getSelectedSleeve());
    });
    
    // For Player 2, use a different default (e.g., Crimson Red)
    import('@/lib/card-sleeves').then(({ cardSleeves }) => {
      const defaultP2Sleeve = cardSleeves.find(s => s.id === 'crimson-red') || cardSleeves[1];
      setPlayer2Sleeve(defaultP2Sleeve);
    });

    // Listen for sleeve changes (only affects Player 1 for now)
    const handleSleeveChange = () => {
      import('@/lib/sleeve-preferences').then(({ getSelectedSleeve }) => {
        setPlayer1Sleeve(getSelectedSleeve());
      });
    };

    window.addEventListener('sleeve-changed', handleSleeveChange);
    return () => window.removeEventListener('sleeve-changed', handleSleeveChange);
  }, []);
  
  // Preload textures for better performance (Task 19)
  useEffect(() => {
    console.log('🔄 Preloading textures...');
    
    // Preload DON card textures
    import('@/lib/game-engine/rendering/TextureCache').then(({ getDonTextureManager }) => {
      const manager = getDonTextureManager();
      manager.preload().then(() => {
        console.log('✅ DON textures preloaded');
      });
    });
    
    // Preload table textures
    import('@/lib/game-engine/rendering/TableTextureLoader').then(({ preloadTableTextures }) => {
      preloadTableTextures().then(() => {
        console.log('✅ Table textures preloaded');
      });
    });
  }, []);

  // Initialize drop zones
  useEffect(() => {
    Object.entries(ZONE_LAYOUTS[PlayerId.PLAYER_1]).forEach(([zoneId, layout]) => {
      const zone: DropZone = {
        zoneId: zoneId as ZoneId,
        playerId: PlayerId.PLAYER_1,
        position: new THREE.Vector3(...layout.position),
        bounds: {
          minX: layout.position[0] - 2,
          maxX: layout.position[0] + 2,
          minZ: layout.position[2] - 1.5,
          maxZ: layout.position[2] + 1.5,
        },
        snapPositions: DragDropManager.generateSnapPositions(
          new THREE.Vector3(...layout.position),
          layout.stackOffset > 0 ? 'stack' : layout.spacing > 0 ? 'horizontal' : 'single',
          layout.maxCards,
          layout.spacing
        ),
      };
      dragDropManager.registerDropZone(zone);
    });

    Object.entries(ZONE_LAYOUTS[PlayerId.PLAYER_2]).forEach(([zoneId, layout]) => {
      const zone: DropZone = {
        zoneId: zoneId as ZoneId,
        playerId: PlayerId.PLAYER_2,
        position: new THREE.Vector3(...layout.position),
        bounds: {
          minX: layout.position[0] - 2,
          maxX: layout.position[0] + 2,
          minZ: layout.position[2] - 1.5,
          maxZ: layout.position[2] + 1.5,
        },
        snapPositions: DragDropManager.generateSnapPositions(
          new THREE.Vector3(...layout.position),
          layout.stackOffset > 0 ? 'stack' : layout.spacing > 0 ? 'horizontal' : 'single',
          layout.maxCards,
          layout.spacing
        ),
      };
      dragDropManager.registerDropZone(zone);
    });
  }, [dragDropManager]);

  // Keep a ref to the latest boardState to avoid re-subscribing
  const boardStateRef = useRef(boardState);
  useEffect(() => {
    boardStateRef.current = boardState;
  }, [boardState]);

  // Subscribe to phase change events for transition animations (Task 22)
  useEffect(() => {
    if (!renderingInterface) return;

    const handlePhaseChanged = (event: any) => {
      const { phase } = event;
      console.log(`🎬 Phase changed to: ${phase}`);
      setCurrentPhase(phase);
    };

    renderingInterface.onPhaseChanged(handlePhaseChanged);

    return () => {
      console.log('🧹 Cleaning up PHASE_CHANGED event listener');
    };
  }, [renderingInterface]);

  // Subscribe to card movement events for animations
  useEffect(() => {
    if (!renderingInterface) return;

    const handleCardMoved = (event: any) => {
      const { cardId, fromZone, toZone, playerId } = event;
      
      console.log(`📦 CARD_MOVED event received:`, {
        cardId,
        fromZone,
        toZone,
        playerId,
        isDeckToHand: fromZone === ZoneId.DECK && toZone === ZoneId.HAND
      });
      
      // Animate card plays (HAND -> CHARACTER_AREA) with bounce effect (task 9.1)
      if (fromZone === ZoneId.HAND && (toZone === ZoneId.CHARACTER_AREA || toZone === ZoneId.STAGE_AREA)) {
        console.log(`🎬 Starting play animation for ${cardId} with bounce effect`);
        
        const fromLayout = ZONE_LAYOUTS[playerId as PlayerId]?.[fromZone as ZoneId];
        const toLayout = ZONE_LAYOUTS[playerId as PlayerId]?.[toZone as ZoneId];
        
        if (fromLayout && toLayout) {
          // Get the target zone cards to calculate position
          const playerKey = playerId === PlayerId.PLAYER_1 ? 'player1' : 'player2';
          const targetZoneCards = toZone === ZoneId.CHARACTER_AREA 
            ? boardStateRef.current[playerKey].zones.characterArea
            : boardStateRef.current[playerKey].zones.stageArea;
          
          // Ensure targetZoneCards is an array
          const cardsArray = Array.isArray(targetZoneCards) ? targetZoneCards : (targetZoneCards ? [targetZoneCards] : []);
          
          const cardIndex = cardsArray.findIndex((c: any) => c.id === cardId);
          const spacing = toLayout.spacing;
          const totalWidth = (cardsArray.length - 1) * spacing;
          const startX = toLayout.position[0] - totalWidth / 2;
          const toX = startX + cardIndex * spacing;
          
          // Import Easing from CardAnimator
          const { Easing } = require('@/lib/game-engine/rendering/CardAnimator');
          
          // Use bounce easing for landing effect (task 9.1)
          animator.startAnimation(
            cardId,
            {
              position: fromLayout.position,
              rotation: fromLayout.rotation,
            },
            {
              position: [toX, toLayout.position[1], toLayout.position[2]],
              rotation: toLayout.rotation,
            },
            700, // Slightly longer duration for bounce
            Easing.bounce, // Bounce effect on landing
            () => {
              console.log(`✅ Play animation complete for ${cardId} with bounce`);
            }
          );
          
          console.log(`🚀 Play animation with bounce started for ${cardId}`);
        }
      }
      
      // Animate card draws (DECK -> HAND)
      if (fromZone === ZoneId.DECK && toZone === ZoneId.HAND) {
        console.log(`🎬 Starting draw animation for ${cardId}`);
        
        const fromLayout = ZONE_LAYOUTS[playerId as PlayerId]?.[fromZone as ZoneId];
        const toLayout = ZONE_LAYOUTS[playerId as PlayerId]?.[toZone as ZoneId];
        
        console.log(`📐 Layouts:`, {
          fromLayout: fromLayout ? 'found' : 'missing',
          toLayout: toLayout ? 'found' : 'missing',
          fromPosition: fromLayout?.position,
          toPosition: toLayout?.position
        });
        
        if (fromLayout && toLayout) {
          // Get the hand position for this card (will be at the end)
          const playerKey = playerId === PlayerId.PLAYER_1 ? 'player1' : 'player2';
          const handCards = boardStateRef.current[playerKey].zones.hand;
          
          console.log(`📊 Hand state when animating:`, {
            playerId,
            playerKey,
            currentHandSize: handCards.length,
            handCardIds: handCards.map(c => c.id),
            isDrawnCardInHand: handCards.some(c => c.id === cardId)
          });
          
          // IMPORTANT: If the drawn card is not in the hand yet, we need to calculate
          // position for the FUTURE hand size (current + 1)
          const isCardAlreadyInHand = handCards.some(c => c.id === cardId);
          const futureHandSize = isCardAlreadyInHand ? handCards.length : handCards.length + 1;
          const cardIndex = futureHandSize - 1; // New card will be at the end
          const handSpacing = toLayout.spacing;
          const totalWidth = (futureHandSize - 1) * handSpacing;
          const startX = toLayout.position[0] - totalWidth / 2;
          const toX = startX + cardIndex * handSpacing;
          
          console.log(`🎯 Animation parameters:`, {
            currentHandSize: handCards.length,
            futureHandSize,
            isCardAlreadyInHand,
            cardIndex,
            fromPosition: fromLayout.position,
            toPosition: [toX, toLayout.position[1], toLayout.position[2]],
            fromRotation: [fromLayout.rotation[0], 0, fromLayout.rotation[2]],
            toRotation: [toLayout.rotation[0], Math.PI, toLayout.rotation[2]]
          });
          
          // Add a flip animation by rotating 180 degrees around Y axis
          // Start face-down (0), end face-up (Math.PI for 180 degrees)
          animator.startAnimation(
            cardId,
            {
              position: fromLayout.position,
              rotation: [fromLayout.rotation[0], 0, fromLayout.rotation[2]], // Start face-down
            },
            {
              position: [toX, toLayout.position[1], toLayout.position[2]],
              rotation: [toLayout.rotation[0], Math.PI, toLayout.rotation[2]], // End face-up (flipped)
            },
            600, // Duration in ms
            undefined, // Use default easing
            () => {
              console.log(`✅ Draw animation complete for ${cardId}`);
            }
          );
          
          console.log(`🚀 Animation started for ${cardId}`);
        } else {
          console.warn(`⚠️ Missing layouts for animation`, { fromLayout, toLayout });
        }
      }
    };

    renderingInterface.onCardMoved(handleCardMoved);

    return () => {
      // Cleanup handled by event emitter
      console.log('🧹 Cleaning up CARD_MOVED event listener');
    };
  }, [renderingInterface, animator]);

  // Update animations, drag state, and performance monitoring
  useFrame(() => {
    // Update performance metrics (Task 19)
    performanceMonitor.update();
    
    animator.update();

    if (draggingCardId && dragDropManager.isDragging()) {
      const newPos = dragDropManager.updateDrag(mouse.x, mouse.y, camera, 0.5);
      if (newPos) {
        setDragPosition(newPos);
      }
    }
  });
  
  // Log performance metrics periodically (Task 19)
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = performanceMonitor.getMetrics();
      const status = performanceMonitor.getStatus();
      
      console.log(`📊 Performance: ${metrics.fps} FPS (${status}) | Frame: ${metrics.frameTime.toFixed(2)}ms | Calls: ${metrics.renderCalls}`);
      
      if (metrics.memoryUsage) {
        console.log(`💾 Memory: ${metrics.memoryUsage.geometries} geometries, ${metrics.memoryUsage.textures} textures`);
      }
    }, 5000); // Log every 5 seconds
    
    return () => clearInterval(interval);
  }, [performanceMonitor]);

  // Handle drag start
  const handleDragStart = (cardId: string, position: THREE.Vector3) => {
    // Disable orbit controls while dragging
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }

    // Find which zone this card is in
    let startZone: ZoneId = ZoneId.HAND;
    // Determine valid drop zones based on game rules
    const validDropZones = [ZoneId.CHARACTER_AREA, ZoneId.STAGE_AREA, ZoneId.TRASH];

    dragDropManager.startDrag(cardId, startZone, position, validDropZones);
    setDraggingCardId(cardId);
  };

  // Handle drag end
  const handleDragEnd = (cardId: string) => {
    const dropResult = dragDropManager.endDrag();
    
    // Re-enable orbit controls
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }

    if (dropResult && dropResult.targetZone && dropResult.targetPlayerId && onCardMove) {
      // Animate card to snap position
      if (dropResult.snapPosition) {
        const currentPos = dragPosition || new THREE.Vector3();
        animator.startAnimation(
          cardId,
          { position: [currentPos.x, currentPos.y, currentPos.z], rotation: [0, 0, 0] },
          { 
            position: [dropResult.snapPosition.x, dropResult.snapPosition.y, dropResult.snapPosition.z],
            rotation: [0, 0, 0]
          },
          300
        );
      }

      // Notify parent of card move
      onCardMove(cardId, ZoneId.HAND, dropResult.targetZone, dropResult.targetPlayerId);
    }

    setDraggingCardId(null);
    setDragPosition(null);
  };

  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      if ('aspect' in camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
      gl.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [camera, gl]);

  return (
    <>
      {/* Orbit controls with ref */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
      
      {/* Enhanced Lighting System (Task 16 + Task 22 polish) */}
      
      {/* Ambient light - adjusted for better visibility (Task 22) */}
      <ambientLight intensity={0.7} color="#ffffff" />
      
      {/* Main directional light from above-front with optimized shadow settings (Task 22) */}
      {/* Shadow map size is adaptive based on performance (Task 19) */}
      <directionalLight
        position={[6, 18, 10]}
        intensity={0.9}
        color="#fffef8"
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-bias={-0.00005}
        shadow-radius={1.5}
      />
      
      {/* Fill light for softer shadows and better card visibility (Task 22) */}
      <directionalLight
        position={[-4, 10, -6]}
        intensity={0.3}
        color="#e8f4ff"
        castShadow={false}
      />
      
      {/* Spot lights for player areas with enhanced settings (Task 22) */}
      <spotLight
        position={[0, 14, -10]}
        angle={Math.PI / 5}
        penumbra={0.4}
        intensity={0.35}
        color="#fff8f0"
        target-position={[0, 0, -4]}
        castShadow={false}
        distance={25}
        decay={2}
      />
      
      <spotLight
        position={[0, 14, 10]}
        angle={Math.PI / 5}
        penumbra={0.4}
        intensity={0.35}
        color="#fff8f0"
        target-position={[0, 0, 4]}
        castShadow={false}
        distance={25}
        decay={2}
      />

      {/* Game Mat with labeled zones and realistic surface */}
      <GameMat surfaceType="wood" />
      
      {/* Phase transition effects (Task 22) */}
      {currentPhase && (
        <>
          <PhaseTransitionEffect currentPhase={currentPhase} />
          <PhaseIndicator currentPhase={currentPhase} />
        </>
      )}

      {/* Zone markers for Player 1 */}
      {Object.entries(ZONE_LAYOUTS[PlayerId.PLAYER_1]).map(([zoneId, layout]) => {
        const hoveredZone = dragDropManager.getHoveredZone();
        const isValidDrop = dragDropManager.isValidDropZone(zoneId as ZoneId);
        const isHovered = hoveredZone?.zoneId === zoneId && hoveredZone?.playerId === PlayerId.PLAYER_1;
        
        return (
          <ZoneMarker
            key={`p1-${zoneId}`}
            playerId={PlayerId.PLAYER_1}
            zoneId={zoneId as ZoneId}
            layout={layout}
            onClick={onZoneClick}
            isValidDropTarget={isValidDrop}
            isHoveredDropTarget={isHovered}
          />
        );
      })}

      {/* Zone markers for Player 2 */}
      {Object.entries(ZONE_LAYOUTS[PlayerId.PLAYER_2]).map(([zoneId, layout]) => {
        const hoveredZone = dragDropManager.getHoveredZone();
        const isValidDrop = dragDropManager.isValidDropZone(zoneId as ZoneId);
        const isHovered = hoveredZone?.zoneId === zoneId && hoveredZone?.playerId === PlayerId.PLAYER_2;
        
        return (
          <ZoneMarker
            key={`p2-${zoneId}`}
            playerId={PlayerId.PLAYER_2}
            zoneId={zoneId as ZoneId}
            layout={layout}
            onClick={onZoneClick}
            isValidDropTarget={isValidDrop}
            isHoveredDropTarget={isHovered}
          />
        );
      })}

      {/* Render cards for Player 1 */}
      {Object.entries(ZONE_LAYOUTS[PlayerId.PLAYER_1]).map(([zoneId, layout]) => {
        // Map ZoneId enum to boardState keys (LEADER_AREA -> leaderArea)
        const zoneKeyMap: Partial<Record<ZoneId, keyof typeof boardState.player1.zones>> = {
          [ZoneId.DECK]: 'deck',
          [ZoneId.HAND]: 'hand',
          [ZoneId.TRASH]: 'trash',
          [ZoneId.LIFE]: 'life',
          [ZoneId.DON_DECK]: 'donDeck',
          [ZoneId.COST_AREA]: 'costArea',
          [ZoneId.LEADER_AREA]: 'leaderArea',
          [ZoneId.CHARACTER_AREA]: 'characterArea',
          [ZoneId.STAGE_AREA]: 'stageArea',
          // LIMBO zone not exposed in visual state
        };
        
        const zoneKey = zoneKeyMap[zoneId as ZoneId];
        if (!zoneKey) return null;
        
        console.log(`🔍 Checking zone ${zoneId} (key: ${zoneKey}):`, {
          zoneExists: zoneKey in boardState.player1.zones,
        });
        
        // @ts-ignore - Dynamic zone access
        const zoneCards = boardState.player1.zones[zoneKey];
        
        // Type guard to ensure we have CardVisualState[] or DonVisualState[]
        let cards: any[] = [];
        if (Array.isArray(zoneCards)) {
          cards = zoneCards;
        } else if (zoneCards && 'metadata' in zoneCards) {
          cards = [zoneCards];
        }
        
        // Skip rendering DON zones - they're rendered separately below
        if (zoneId === ZoneId.DON_DECK || zoneId === ZoneId.COST_AREA) {
          console.log(`Rendering P1 ${zoneId}:`, cards.length, 'DON cards (rendered separately)');
          return null;
        }
        
        console.log(`Rendering P1 ${zoneId}:`, cards.length, 'cards');
        
        // Cards in hand are draggable
        const isDraggable = zoneId === ZoneId.HAND;
        
        // Enable tab navigation for hand zone (task 11.1)
        const enableTabNav = zoneId === ZoneId.HAND;
        
        return (
          <CardZoneRenderer
            key={`p1-cards-${zoneId}`}
            cards={cards}
            zonePosition={layout.position}
            zoneRotation={layout.rotation}
            spacing={layout.spacing}
            stackOffset={layout.stackOffset}
            onCardInteract={onCardClick}
            animator={animator}
            isDraggable={isDraggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            draggingCardId={draggingCardId}
            dragPosition={dragPosition}
            sleeve={player1Sleeve || undefined}
            selectedCardId={selectedCardId}
            attackMode={attackMode}
            validTargets={validTargets}
            highlightedCards={highlightedCards}
            focusedCardId={focusedCardId}
            enableTabNavigation={enableTabNav}
          />
        );
      })}

      {/* Render cards for Player 2 */}
      {Object.entries(ZONE_LAYOUTS[PlayerId.PLAYER_2]).map(([zoneId, layout]) => {
        // Map ZoneId enum to boardState keys (LEADER_AREA -> leaderArea)
        const zoneKeyMap: Partial<Record<ZoneId, keyof typeof boardState.player2.zones>> = {
          [ZoneId.DECK]: 'deck',
          [ZoneId.HAND]: 'hand',
          [ZoneId.TRASH]: 'trash',
          [ZoneId.LIFE]: 'life',
          [ZoneId.DON_DECK]: 'donDeck',
          [ZoneId.COST_AREA]: 'costArea',
          [ZoneId.LEADER_AREA]: 'leaderArea',
          [ZoneId.CHARACTER_AREA]: 'characterArea',
          [ZoneId.STAGE_AREA]: 'stageArea',
          // LIMBO zone not exposed in visual state
        };
        
        const zoneKey = zoneKeyMap[zoneId as ZoneId];
        if (!zoneKey) return null;
        
        // @ts-ignore - Dynamic zone access
        const zoneCards = boardState.player2.zones[zoneKey];
        
        // Type guard to ensure we have CardVisualState[] or DonVisualState[]
        let cards: any[] = [];
        if (Array.isArray(zoneCards)) {
          cards = zoneCards;
        } else if (zoneCards && 'metadata' in zoneCards) {
          cards = [zoneCards];
        }
        
        // Skip rendering DON zones for now - they need special DON card rendering
        if (zoneId === ZoneId.DON_DECK || zoneId === ZoneId.COST_AREA) {
          return null;
        }
        
        // Cards in hand are draggable
        const isDraggable = zoneId === ZoneId.HAND;
        
        // Enable tab navigation for hand zone (task 11.1)
        const enableTabNav = zoneId === ZoneId.HAND;
        
        return (
          <CardZoneRenderer
            key={`p2-cards-${zoneId}`}
            cards={cards}
            zonePosition={layout.position}
            zoneRotation={layout.rotation}
            spacing={layout.spacing}
            stackOffset={layout.stackOffset}
            onCardInteract={onCardClick}
            animator={animator}
            isDraggable={isDraggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            draggingCardId={draggingCardId}
            dragPosition={dragPosition}
            sleeve={player2Sleeve || undefined}
            selectedCardId={selectedCardId}
            attackMode={attackMode}
            validTargets={validTargets}
            highlightedCards={highlightedCards}
            focusedCardId={focusedCardId}
            enableTabNavigation={enableTabNav}
          />
        );
      })}

      {/* Render DON cards for Player 1 */}
      <DonZoneRenderer
        donCards={boardState.player1.zones.donDeck}
        zonePosition={ZONE_LAYOUTS[PlayerId.PLAYER_1][ZoneId.DON_DECK].position}
        spacing={ZONE_LAYOUTS[PlayerId.PLAYER_1][ZoneId.DON_DECK].spacing}
        stackOffset={ZONE_LAYOUTS[PlayerId.PLAYER_1][ZoneId.DON_DECK].stackOffset}
        selectedDonId={selectedDonId}
        onClick={onCardClick}
      />
      <DonZoneRenderer
        donCards={boardState.player1.zones.costArea}
        zonePosition={ZONE_LAYOUTS[PlayerId.PLAYER_1][ZoneId.COST_AREA].position}
        spacing={ZONE_LAYOUTS[PlayerId.PLAYER_1][ZoneId.COST_AREA].spacing}
        stackOffset={ZONE_LAYOUTS[PlayerId.PLAYER_1][ZoneId.COST_AREA].stackOffset}
        selectedDonId={selectedDonId}
        onClick={onCardClick}
      />

      {/* Render DON cards for Player 2 */}
      <DonZoneRenderer
        donCards={boardState.player2.zones.donDeck}
        zonePosition={ZONE_LAYOUTS[PlayerId.PLAYER_2][ZoneId.DON_DECK].position}
        spacing={ZONE_LAYOUTS[PlayerId.PLAYER_2][ZoneId.DON_DECK].spacing}
        stackOffset={ZONE_LAYOUTS[PlayerId.PLAYER_2][ZoneId.DON_DECK].stackOffset}
        selectedDonId={selectedDonId}
        onClick={onCardClick}
      />
      <DonZoneRenderer
        donCards={boardState.player2.zones.costArea}
        zonePosition={ZONE_LAYOUTS[PlayerId.PLAYER_2][ZoneId.COST_AREA].position}
        spacing={ZONE_LAYOUTS[PlayerId.PLAYER_2][ZoneId.COST_AREA].spacing}
        stackOffset={ZONE_LAYOUTS[PlayerId.PLAYER_2][ZoneId.COST_AREA].stackOffset}
        selectedDonId={selectedDonId}
        onClick={onCardClick}
      />
    </>
  );
});

// Add display name for debugging
SceneContent.displayName = 'SceneContent';

/**
 * Zone marker component to visualize zone boundaries
 */
function ZoneMarker({
  playerId,
  zoneId,
  layout,
  onClick,
  isValidDropTarget = false,
  isHoveredDropTarget = false,
}: {
  playerId: PlayerId;
  zoneId: ZoneId;
  layout: ZoneLayout;
  onClick?: (playerId: PlayerId, zone: ZoneId) => void;
  isValidDropTarget?: boolean;
  isHoveredDropTarget?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(playerId, zoneId);
    }
  };

  // Calculate zone size based on max cards and spacing
  const width = layout.maxCards > 1 ? layout.maxCards * layout.spacing : 1.5;
  const depth = 2;

  // Determine color based on state
  let color = '#2a5c3a';
  let opacity = 0.3;
  
  if (isHoveredDropTarget) {
    color = '#00ff00';
    opacity = 0.6;
  } else if (isValidDropTarget) {
    color = '#4a9c59';
    opacity = 0.4;
  } else if (hovered) {
    color = '#4a7c59';
    opacity = 0.3;
  }

  return (
    <mesh
      ref={meshRef}
      position={layout.position}
      rotation={layout.rotation}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[width, 0.05, depth]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

/**
 * Background environment component with gradient and vignette effect
 */
function BackgroundEnvironment() {
  const { scene } = useThree();
  
  useEffect(() => {
    // Create dark gradient background (darker at edges, lighter at center)
    // Using a radial gradient effect with fog
    const darkColor = new THREE.Color(0x0a0a0f); // Very dark blue-grey
    const lightColor = new THREE.Color(0x1a1a2e); // Slightly lighter blue-grey
    
    // Set the base background color
    scene.background = darkColor;
    
    // Add fog for depth and vignette-like effect
    // Fog creates a subtle gradient from center to edges
    scene.fog = new THREE.Fog(darkColor, 30, 80);
    
    return () => {
      // Cleanup
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);
  
  // Add a large sphere around the scene for gradient effect
  // This creates a more pronounced vignette
  return (
    <mesh scale={[100, 100, 100]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        side={THREE.BackSide}
        color={0x0a0a0f}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

/**
 * Main GameScene component
 */
export function GameScene({
  engine,
  renderingInterface,
  boardState,
  onCardClick,
  onZoneClick,
  onCardMove,
  selectedCardId,
  attackMode,
  validTargets,
  donAttachMode,
  selectedDonId,
  highlightedCards = [],
  focusedCardId,
}: GameSceneProps) {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas
        shadows
        camera={{
          position: [0, 20, 0],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
      >
        {/* Camera with orbit controls for user interaction */}
        <PerspectiveCamera makeDefault position={[0, 20, 0]} />
        
        {/* Background environment with gradient and vignette (Task 17) */}
        <BackgroundEnvironment />
        
        {/* Scene content */}
        <SceneContent
          boardState={boardState}
          renderingInterface={renderingInterface}
          onCardClick={onCardClick}
          onZoneClick={onZoneClick}
          onCardMove={onCardMove}
          selectedCardId={selectedCardId}
          attackMode={attackMode}
          validTargets={validTargets}
          donAttachMode={donAttachMode}
          selectedDonId={selectedDonId}
          highlightedCards={highlightedCards}
          focusedCardId={focusedCardId}
        />
      </Canvas>
    </div>
  );
}
