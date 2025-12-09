'use client';

/**
 * CardMesh.tsx
 * 
 * Three.js component for rendering individual cards in 3D space.
 * Handles card geometry, textures, state visualization (ACTIVE/RESTED),
 * power/cost overlays, hover effects, and click interactions.
 */

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CardVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { CardState, ZoneId } from '@/lib/game-engine/core/types';
import { CardAnimator } from '@/lib/game-engine/rendering/CardAnimator';
import { CardSleeve } from '@/lib/card-sleeves';
import { CardImageLoader } from '@/lib/game-engine/rendering/CardImageLoader';

/**
 * Throttle utility function for performance optimization
 * Limits function execution to once per specified interval to reduce unnecessary updates
 * 
 * @template T - The function type to throttle
 * @param func - The function to throttle
 * @param limit - The minimum time in milliseconds between function executions
 * @returns A throttled version of the function
 * 
 * @example
 * ```typescript
 * const throttledHover = throttle((cardId: string) => {
 *   setHoveredCard(cardId);
 * }, 100); // Limits to once per 100ms
 * ```
 */
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args);
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Props for the CardMesh component
 */
export interface CardMeshProps {
  cardState: CardVisualState;
  zonePosition: [number, number, number];
  zoneRotation: [number, number, number];
  indexInZone: number;
  totalCards: number; // Add total cards count for proper centering
  spacing: number;
  stackOffset: number;
  onInteract?: (cardId: string, action: 'click' | 'hover' | 'unhover') => void;
  animator?: CardAnimator;
  isDraggable?: boolean;
  onDragStart?: (cardId: string, position: THREE.Vector3) => void;
  onDragEnd?: (cardId: string) => void;
  isDragging?: boolean;
  dragPosition?: THREE.Vector3;
  sleeve?: CardSleeve; // Card sleeve for the back
  isSelected?: boolean; // Selection state for visual feedback
  isValidTarget?: boolean; // Valid target state for attack mode
  isInvalidTarget?: boolean; // Invalid target state for attack mode
  attachedDonCount?: number; // Number of DON cards attached to this card (task 6.5)
  isHighlighted?: boolean; // Temporary highlight for battle effects (task 9.2)
  isFocused?: boolean; // Focus state for keyboard navigation (task 11.1)
  tabIndex?: number; // Tab index for keyboard navigation (task 11.1)
}

/**
 * Standard card dimensions (in world units)
 * One Piece TCG cards are 63mm x 88mm (roughly 2.5" x 3.5")
 * Using a scale where 1 unit = ~25mm
 */
const CARD_WIDTH = 2.5;
const CARD_HEIGHT = 3.5;
const CARD_THICKNESS = 0.02;
const CARD_CORNER_RADIUS = 0.15;

/**
 * Create rounded rectangle shape for card geometry
 */
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  
  return shape;
}

/**
 * CardMesh component - renders a single card in 3D
 * Memoized for performance optimization (task 15.1)
 */
const CardMeshComponent = ({
  cardState,
  zonePosition,
  zoneRotation,
  indexInZone,
  totalCards,
  spacing,
  stackOffset,
  onInteract,
  animator,
  isDraggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  dragPosition,
  sleeve,
  isSelected = false,
  isValidTarget = false,
  isInvalidTarget = false,
  attachedDonCount = 0,
  isHighlighted = false,
  isFocused = false,
  tabIndex,
}: CardMeshProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<THREE.Vector3 | null>(null);
  
  // Throttled hover handlers (task 15.2) - limit updates to 100ms intervals
  const throttledSetHovered = useMemo(
    () => throttle((value: boolean) => setHovered(value), 100),
    []
  );
  
  const throttledOnInteract = useMemo(
    () => onInteract ? throttle((id: string, action: 'hover' | 'unhover') => onInteract(id, action), 100) : undefined,
    [onInteract]
  );
  
  // Calculate card position based on zone layout
  const cardPosition = useMemo(() => {
    const [baseX, baseY, baseZ] = zonePosition;
    
    // For stacked zones (deck, trash, don deck), offset vertically
    if (stackOffset > 0) {
      return [baseX, baseY + indexInZone * stackOffset, baseZ] as [number, number, number];
    }
    
    // For spread zones (hand, character area, cost area), offset horizontally
    if (spacing > 0 && totalCards > 1) {
      // Center the cards in the zone
      const totalWidth = (totalCards - 1) * spacing;
      const offsetX = indexInZone * spacing - totalWidth / 2;
      // Add small Y offset based on index to prevent Z-fighting
      const yOffset = indexInZone * 0.001;
      return [baseX + offsetX, baseY + yOffset, baseZ] as [number, number, number];
    }
    
    // Single card zones (leader, stage) or single card in spread zone
    return [baseX, baseY, baseZ] as [number, number, number];
  }, [zonePosition, indexInZone, spacing, stackOffset, totalCards]);

  // Calculate rotation based on card state (ACTIVE = 0°, RESTED = 90°)
  const cardRotation = useMemo(() => {
    const [baseRotX, baseRotY, baseRotZ] = zoneRotation;
    
    // Add 90° rotation around Z axis for RESTED state
    const restedRotation = cardState.state === CardState.RESTED ? Math.PI / 2 : 0;
    
    return [baseRotX, baseRotY, baseRotZ + restedRotation] as [number, number, number];
  }, [zoneRotation, cardState.state]);

  // LOD (Level of Detail) state for performance optimization (Task 19)
  const [useLOD, setUseLOD] = useState(false);
  const [distanceFromCamera, setDistanceFromCamera] = useState(0);
  
  // Create card geometry - use a simple plane for better performance and correct orientation
  const cardGeometry = useMemo(() => {
    // Use PlaneGeometry for cards laying flat on table
    return new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  }, []);

  // Load card texture using CardImageLoader with imageUrl from metadata
  const [cardTexture, setCardTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  useEffect(() => {
    const loader = CardImageLoader.getInstance();
    const imageUrl = cardState.metadata.imageUrl || '';
    
    // Load texture with fallback data
    loader.loadTexture({
      imageUrl,
      fallbackData: {
        name: cardState.metadata.name,
        category: String(cardState.metadata.category),
        power: cardState.power,
        cost: cardState.cost,
      },
    }).then(texture => {
      setCardTexture(texture);
      setIsLoading(false);
    }).catch(error => {
      // Keep error logging for debugging
      console.error('CardMesh: Texture load failed', {
        cardName: cardState.metadata.name,
        imageUrl,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
      
      setLoadError(true);
      setIsLoading(false);
    });
    
    // Cleanup: release texture reference on unmount
    return () => {
      if (imageUrl) {
        loader.releaseTexture(imageUrl);
      }
    };
  }, [cardState.id, cardState.metadata.imageUrl, cardState.metadata.name, cardState.metadata.category, cardState.power, cardState.cost]);

  // No need for separate materials with PlaneGeometry - applied directly in mesh

  // Animation and hover effect
  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    
    // Calculate distance from camera for LOD (Task 19)
    const worldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(worldPos);
    const distance = camera.position.distanceTo(worldPos);
    setDistanceFromCamera(distance);
    
    // Enable LOD for distant cards (>30 units away)
    // This reduces texture quality and disables some effects
    const shouldUseLOD = distance > 30;
    if (shouldUseLOD !== useLOD) {
      setUseLOD(shouldUseLOD);
    }

    // If dragging, use drag position
    if (isDragging && dragPosition) {
      meshRef.current.position.lerp(dragPosition, 0.3);
      meshRef.current.position.y = dragPosition.y + 1; // Elevate while dragging
      return;
    }

    // Check for active animation (task 9.1 - smooth transitions with bounce)
    if (animator) {
      const animatedTransform = animator.getAnimatedTransform(cardState.id);
      if (animatedTransform) {
        // Use smooth interpolation for animated position and rotation
        meshRef.current.position.lerp(animatedTransform.position, 0.2);
        meshRef.current.rotation.x += (animatedTransform.rotation.x - meshRef.current.rotation.x) * 0.2;
        meshRef.current.rotation.y += (animatedTransform.rotation.y - meshRef.current.rotation.y) * 0.2;
        meshRef.current.rotation.z += (animatedTransform.rotation.z - meshRef.current.rotation.z) * 0.2;
        return;
      }
    }

    // Default hover effect - slight elevation and scale (task 7.3)
    // Skip hover effects for LOD cards to improve performance
    const targetPos = new THREE.Vector3(...cardPosition);
    const targetRot = new THREE.Euler(...cardRotation);
    const targetScale = (hovered && !useLOD) ? 1.05 : 1.0;
    
    if (hovered && !useLOD) {
      targetPos.y += 0.3;
    }

    meshRef.current.position.lerp(targetPos, 0.1);
    meshRef.current.rotation.x += (targetRot.x - meshRef.current.rotation.x) * 0.1;
    meshRef.current.rotation.y += (targetRot.y - meshRef.current.rotation.y) * 0.1;
    meshRef.current.rotation.z += (targetRot.z - meshRef.current.rotation.z) * 0.1;
    
    // Smooth scale transition (task 7.3)
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.1;
    meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.1;
    meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * 0.1;
  });

  // Event handlers
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onInteract) {
      onInteract(cardState.id, 'click');
    }
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!isDraggable) return;
    
    event.stopPropagation();
    setIsPointerDown(true);
    
    if (meshRef.current) {
      const worldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPos);
      setDragStartPos(worldPos);
      
      if (onDragStart) {
        onDragStart(cardState.id, worldPos);
      }
    }
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!isDraggable || !isPointerDown) return;
    
    event.stopPropagation();
    setIsPointerDown(false);
    setDragStartPos(null);
    
    if (onDragEnd) {
      onDragEnd(cardState.id);
    }
  };

  const handlePointerOver = useCallback(() => {
    throttledSetHovered(true);
    if (throttledOnInteract) {
      throttledOnInteract(cardState.id, 'hover');
    }
  }, [throttledSetHovered, throttledOnInteract, cardState.id]);

  const handlePointerOut = useCallback(() => {
    throttledSetHovered(false);
    if (throttledOnInteract) {
      throttledOnInteract(cardState.id, 'unhover');
    }
  }, [throttledSetHovered, throttledOnInteract, cardState.id]);

  // Determine if card should show face-up or face-down
  const showFaceUp = useMemo(() => {
    // Cards in hand, character area, stage area, leader area, and life are face-up
    const faceUpZones = [
      ZoneId.HAND,
      ZoneId.CHARACTER_AREA,
      ZoneId.STAGE_AREA,
      ZoneId.LEADER_AREA,
      ZoneId.LIFE,
      ZoneId.TRASH,
      ZoneId.LIMBO,
    ];
    return faceUpZones.includes(cardState.position.zone);
  }, [cardState.position.zone]);

  // Material update fix: Manually update material.map when texture changes
  useEffect(() => {
    if (materialRef.current && cardTexture && showFaceUp) {
      // Set the texture on the material
      materialRef.current.map = cardTexture;
      // Force material update
      materialRef.current.needsUpdate = true;
    } else if (materialRef.current && !showFaceUp) {
      // Clear texture when face-down
      materialRef.current.map = null;
      materialRef.current.needsUpdate = true;
    } else if (materialRef.current && !cardTexture && showFaceUp) {
      // Keep warning for missing textures
      console.warn('CardMesh: Texture missing for face-up card', {
        cardName: cardState.metadata.name,
      });
    }
  }, [cardTexture, showFaceUp, cardState.metadata.name]);

  return (
    <group
      ref={meshRef}
      position={cardPosition}
      rotation={cardRotation}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main card mesh - rotated to lay flat on table */}
      <mesh
        geometry={cardGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
        renderOrder={indexInZone}
      >
        {/* Front face with card image */}
        <meshStandardMaterial
          ref={materialRef}
          map={showFaceUp && cardTexture ? cardTexture : null}
          color={showFaceUp ? (cardTexture ? '#ffffff' : '#4a4a6a') : (sleeve ? `#${sleeve.color.toString(16).padStart(6, '0')}` : '#1a1a2e')}
          roughness={showFaceUp ? 0.3 : (sleeve?.roughness || 0.3)}
          metalness={showFaceUp ? 0.1 : (sleeve?.metalness || 0.1)}
          side={THREE.DoubleSide}
          opacity={isInvalidTarget ? 0.5 : 1.0}
          transparent={isInvalidTarget}
          needsUpdate={true}
        />
      </mesh>

      {/* Selection highlight effect */}
      {isSelected && (
        <mesh
          geometry={cardGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          renderOrder={indexInZone + 1000}
        >
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Focus highlight effect (task 11.1) */}
      {isFocused && !isSelected && (
        <mesh
          geometry={cardGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          renderOrder={indexInZone + 1000}
        >
          <meshBasicMaterial
            color="#00bfff"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Valid target highlight effect (green glow) */}
      {isValidTarget && (
        <mesh
          geometry={cardGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          renderOrder={indexInZone + 1000}
        >
          <meshBasicMaterial
            color="#00ff00"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Hover/Drag highlight effect */}
      {(hovered || isDragging) && !isSelected && !isValidTarget && !isHighlighted && (
        <mesh
          geometry={cardGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          renderOrder={indexInZone + 1000}
        >
          <meshBasicMaterial
            color={isDragging ? "#00ff00" : "#ffff00"}
            transparent
            opacity={isDragging ? 0.5 : 0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Battle highlight effect (task 9.2) */}
      {isHighlighted && (
        <mesh
          geometry={cardGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          renderOrder={indexInZone + 1000}
        >
          <meshBasicMaterial
            color="#ff6600"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Power and Cost overlays - DISABLED due to Text component issues */}

      {/* Given DON cards rendered underneath (task 11) */}
      {showFaceUp && cardState.givenDonCount > 0 && (
        <GivenDonRenderer
          count={cardState.givenDonCount}
          parentCardWidth={CARD_WIDTH}
          parentCardHeight={CARD_HEIGHT}
        />
      )}

      {/* Special effect indicators for alt art, promo, etc */}
      {showFaceUp && (cardState.metadata.isAltArt || cardState.metadata.isPromo) && (
        <mesh
          position={[0, 0, CARD_THICKNESS + 0.005]}
        >
          <ringGeometry args={[CARD_WIDTH / 2 + 0.05, CARD_WIDTH / 2 + 0.1, 32]} />
          <meshBasicMaterial
            color={cardState.metadata.isPromo ? '#ffd700' : '#00ffff'}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Hover info overlay - task 7.2 */}
      {hovered && showFaceUp && (
        <Html
          position={[0, CARD_HEIGHT / 2 + 0.5, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-sm whitespace-nowrap">
            <div className="flex gap-4">
              {cardState.cost >= 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-blue-400 font-semibold">Cost:</span>
                  <span className="font-bold">{cardState.cost}</span>
                </div>
              )}
              {cardState.power > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-red-400 font-semibold">Power:</span>
                  <span className="font-bold">{cardState.power}</span>
                </div>
              )}
            </div>
            {cardState.metadata.name && (
              <div className="text-xs text-gray-400 mt-1 text-center">
                {cardState.metadata.name}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

/**
 * Memoized CardMesh component with custom comparison function (task 15.1)
 * Only re-renders when relevant props change
 */
export const CardMesh = React.memo(CardMeshComponent, (prevProps, nextProps) => {
  // Compare card ID (most important - if card changes, always re-render)
  if (prevProps.cardState.id !== nextProps.cardState.id) {
    return false;
  }
  
  // Compare visual state props that affect rendering
  if (prevProps.cardState.state !== nextProps.cardState.state) {
    return false;
  }
  
  if (prevProps.cardState.power !== nextProps.cardState.power) {
    return false;
  }
  
  if (prevProps.cardState.givenDonCount !== nextProps.cardState.givenDonCount) {
    return false;
  }
  
  // Compare position and zone
  if (prevProps.cardState.position.zone !== nextProps.cardState.position.zone) {
    return false;
  }
  
  if (prevProps.indexInZone !== nextProps.indexInZone) {
    return false;
  }
  
  if (prevProps.totalCards !== nextProps.totalCards) {
    return false;
  }
  
  // Compare interaction state props
  if (prevProps.isSelected !== nextProps.isSelected) {
    return false;
  }
  
  if (prevProps.isValidTarget !== nextProps.isValidTarget) {
    return false;
  }
  
  if (prevProps.isInvalidTarget !== nextProps.isInvalidTarget) {
    return false;
  }
  
  if (prevProps.isHighlighted !== nextProps.isHighlighted) {
    return false;
  }
  
  if (prevProps.isFocused !== nextProps.isFocused) {
    return false;
  }
  
  if (prevProps.isDragging !== nextProps.isDragging) {
    return false;
  }
  
  // Compare drag position if dragging
  if (prevProps.isDragging && nextProps.isDragging) {
    if (prevProps.dragPosition?.x !== nextProps.dragPosition?.x ||
        prevProps.dragPosition?.y !== nextProps.dragPosition?.y ||
        prevProps.dragPosition?.z !== nextProps.dragPosition?.z) {
      return false;
    }
  }
  
  // Compare zone position (for animations)
  if (prevProps.zonePosition[0] !== nextProps.zonePosition[0] ||
      prevProps.zonePosition[1] !== nextProps.zonePosition[1] ||
      prevProps.zonePosition[2] !== nextProps.zonePosition[2]) {
    return false;
  }
  
  // Compare zone rotation (for ACTIVE/RESTED state)
  if (prevProps.zoneRotation[0] !== nextProps.zoneRotation[0] ||
      prevProps.zoneRotation[1] !== nextProps.zoneRotation[1] ||
      prevProps.zoneRotation[2] !== nextProps.zoneRotation[2]) {
    return false;
  }
  
  // Compare sleeve (for visual changes)
  if (prevProps.sleeve?.id !== nextProps.sleeve?.id) {
    return false;
  }
  
  // If all relevant props are the same, skip re-render
  return true;
});

/**
 * GivenDonRenderer - renders small DON cards underneath a character/leader
 * Shows DON cards at 0.3x scale with slight offset to show count
 */
interface GivenDonRendererProps {
  count: number;
  parentCardWidth: number;
  parentCardHeight: number;
}

function GivenDonRenderer({ count, parentCardWidth, parentCardHeight }: GivenDonRendererProps) {
  const [frontTexture, setFrontTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/cards/don-card-front.png', (texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      setFrontTexture(texture);
    }, undefined, (error) => {
      console.warn('Failed to load DON front texture for given DON');
    });
  }, []);
  
  // DON card dimensions at 0.3x scale
  const DON_SCALE = 0.3;
  const DON_WIDTH = 1.8 * DON_SCALE;
  const DON_HEIGHT = 2.5 * DON_SCALE;
  
  // Position DON cards underneath the parent card, slightly offset to show count
  const donPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const offsetIncrement = 0.15; // Small offset between DON cards
    
    for (let i = 0; i < count; i++) {
      // Position below the card, offset to the right to show stacking
      const x = -parentCardWidth / 2 + 0.5 + i * offsetIncrement;
      const z = parentCardHeight / 2 + 0.3; // Below the card
      const y = -0.02 - i * 0.01; // Slightly below, stacked
      
      positions.push([x, y, z]);
    }
    
    return positions;
  }, [count, parentCardWidth, parentCardHeight]);
  
  const cardGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(DON_WIDTH, DON_HEIGHT);
  }, [DON_WIDTH, DON_HEIGHT]);
  
  return (
    <group>
      {donPositions.map((pos, index) => (
        <mesh
          key={index}
          position={pos}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <primitive object={cardGeometry} />
          <meshStandardMaterial
            map={frontTexture}
            color="#ffffff"
            roughness={0.3}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* DON count indicator badge */}
      <group position={[-parentCardWidth / 2 + 0.5, 0.01, parentCardHeight / 2 + 0.3]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 32]} />
          <meshBasicMaterial color="#9d4edd" />
        </mesh>
        
        {/* DON count text disabled due to Text component issues */}
      </group>
    </group>
  );
}

/**
 * Helper component to render multiple cards in a zone
 */
export interface CardZoneRendererProps {
  cards: CardVisualState[];
  zonePosition: [number, number, number];
  zoneRotation: [number, number, number];
  spacing: number;
  stackOffset: number;
  onCardInteract?: (cardId: string, action: 'click' | 'hover' | 'unhover') => void;
  animator?: CardAnimator;
  isDraggable?: boolean;
  onDragStart?: (cardId: string, position: THREE.Vector3) => void;
  onDragEnd?: (cardId: string) => void;
  draggingCardId?: string | null;
  dragPosition?: THREE.Vector3 | null;
  sleeve?: CardSleeve;
  selectedCardId?: string | null;
  attackMode?: boolean;
  validTargets?: string[];
  highlightedCards?: string[];
  focusedCardId?: string | null; // Focused card for keyboard navigation (task 11.1)
  enableTabNavigation?: boolean; // Enable tab navigation for this zone (task 11.1)
}

export function CardZoneRenderer({
  cards,
  zonePosition,
  zoneRotation,
  spacing,
  stackOffset,
  onCardInteract,
  animator,
  isDraggable = false,
  onDragStart,
  onDragEnd,
  draggingCardId,
  dragPosition,
  sleeve,
  selectedCardId,
  attackMode = false,
  validTargets = [],
  highlightedCards = [],
  focusedCardId,
  enableTabNavigation = false,
}: CardZoneRendererProps) {
  return (
    <>
      {cards.map((card, index) => {
        const isThisCardDragging = draggingCardId === card.id;
        const isThisCardSelected = selectedCardId === card.id;
        
        // Calculate isValidTarget based on attackMode and validTargets array
        const isThisCardValidTarget = attackMode && validTargets.includes(card.id);
        
        // Calculate isInvalidTarget based on attackMode and not in validTargets
        const isThisCardInvalidTarget = attackMode && !validTargets.includes(card.id);
        
        // Calculate isHighlighted based on highlightedCards array (task 9.2)
        const isThisCardHighlighted = highlightedCards.includes(card.id);
        
        // Calculate isFocused based on focusedCardId (task 11.1)
        const isThisCardFocused = focusedCardId === card.id;
        
        // Calculate tabIndex for keyboard navigation (task 11.1)
        const cardTabIndex = enableTabNavigation ? index : undefined;
        
        return (
          <CardMesh
            key={card.id}
            cardState={card}
            zonePosition={zonePosition}
            zoneRotation={zoneRotation}
            indexInZone={index}
            totalCards={cards.length}
            spacing={spacing}
            stackOffset={stackOffset}
            onInteract={onCardInteract}
            animator={animator}
            isDraggable={isDraggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={isThisCardDragging}
            dragPosition={isThisCardDragging ? dragPosition || undefined : undefined}
            sleeve={sleeve}
            isSelected={isThisCardSelected}
            isValidTarget={isThisCardValidTarget}
            isInvalidTarget={isThisCardInvalidTarget}
            isHighlighted={isThisCardHighlighted}
            isFocused={isThisCardFocused}
            tabIndex={cardTabIndex}
          />
        );
      })}
    </>
  );
}
