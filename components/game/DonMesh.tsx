'use client';

/**
 * DonMesh.tsx
 * 
 * Three.js component for rendering DON cards in 3D space.
 * Updated to use proper card images instead of simple tokens.
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { DonVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { CardState, ZoneId } from '@/lib/game-engine/core/types';

export interface DonMeshProps {
  donState: DonVisualState;
  zonePosition: [number, number, number];
  indexInZone: number;
  totalDon: number;
  spacing: number;
  stackOffset: number;
  isSelected?: boolean;
  onClick?: (donId: string) => void;
  scale?: number; // Scale factor for given DON (smaller when attached to characters)
}

/**
 * DON card dimensions (smaller than regular cards)
 * Standard card is 2.5 x 3.5, DON cards are smaller
 * Task 22: Adjusted dimensions for better visual balance
 */
const DON_WIDTH = 1.6;
const DON_HEIGHT = 2.2;
const DON_THICKNESS = 0.02;

/**
 * Scale factor for DON cards when given to characters/leaders
 * Task 22: Fine-tuned for better visibility without cluttering
 */
const GIVEN_DON_SCALE = 0.35;

/**
 * DON card texture paths
 */
const DON_CARD_TEXTURES = {
  front: '/cards/don-card-front.png',
  back: '/cards/card-back.svg', // Using SVG for now, can be replaced with PNG
};

/**
 * DonMesh component - renders a single DON card with proper card geometry and textures
 */
export function DonMesh({
  donState,
  zonePosition,
  indexInZone,
  totalDon,
  spacing,
  stackOffset,
  isSelected = false,
  onClick,
  scale = 1.0,
}: DonMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Load DON card textures using texture cache for better performance
  const [frontTexture, setFrontTexture] = useState<THREE.Texture | null>(null);
  const [backTexture, setBackTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    // Use texture cache to avoid reloading textures
    import('@/lib/game-engine/rendering/TextureCache').then(({ getDonTextureManager }) => {
      const manager = getDonTextureManager();
      
      // Load front texture
      manager.getFrontTexture().then(texture => {
        setFrontTexture(texture);
      }).catch(error => {
        console.error('DonMesh: Failed to load front texture', error);
      });
      
      // Load back texture
      manager.getBackTexture().then(texture => {
        setBackTexture(texture);
      }).catch(error => {
        console.error('DonMesh: Failed to load back texture', error);
      });
    });
  }, []);
  
  // Calculate position based on zone layout
  const cardPosition = useMemo(() => {
    const [baseX, baseY, baseZ] = zonePosition;
    
    // For stacked zones (don deck), offset vertically
    if (stackOffset > 0) {
      return [baseX, baseY + indexInZone * stackOffset, baseZ] as [number, number, number];
    }
    
    // For spread zones (cost area), offset horizontally
    if (spacing > 0 && totalDon > 1) {
      const totalWidth = (totalDon - 1) * spacing;
      const offsetX = indexInZone * spacing - totalWidth / 2;
      // Add small Y offset based on index to prevent Z-fighting
      const yOffset = indexInZone * 0.001;
      return [baseX + offsetX, baseY + yOffset, baseZ] as [number, number, number];
    }
    
    // Single DON or no spacing
    return [baseX, baseY, baseZ] as [number, number, number];
  }, [zonePosition, indexInZone, spacing, stackOffset, totalDon]);
  
  // Calculate rotation based on card state (ACTIVE = 0°, RESTED = 90°)
  const cardRotation = useMemo(() => {
    const restedRotation = donState.state === CardState.RESTED ? Math.PI / 2 : 0;
    return restedRotation;
  }, [donState.state]);
  
  // Create card geometry - use a simple plane for better performance
  const cardGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(DON_WIDTH * scale, DON_HEIGHT * scale);
  }, [scale]);
  
  // Determine if card should show face-up or face-down
  const showFaceUp = useMemo(() => {
    // DON cards in cost area and when given to characters are face-up
    // DON cards in don deck are face-down
    return donState.zone === ZoneId.COST_AREA || 
           donState.zone === ZoneId.CHARACTER_AREA ||
           donState.zone === ZoneId.LEADER_AREA;
  }, [donState.zone]);
  
  // Animation and hover effect
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Target position and rotation
    const targetPos = new THREE.Vector3(...cardPosition);
    const targetRot = new THREE.Euler(-Math.PI / 2, 0, cardRotation);
    
    // Hover effect - slight elevation
    if (hovered) {
      targetPos.y += 0.2;
    }
    
    // Smooth interpolation
    meshRef.current.position.lerp(targetPos, 0.1);
    meshRef.current.rotation.x += (targetRot.x - meshRef.current.rotation.x) * 0.1;
    meshRef.current.rotation.y += (targetRot.y - meshRef.current.rotation.y) * 0.1;
    meshRef.current.rotation.z += (targetRot.z - meshRef.current.rotation.z) * 0.1;
  });
  
  // Event handlers
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onClick) {
      onClick(donState.id);
    }
  };
  
  const handlePointerOver = () => {
    setHovered(true);
  };
  
  const handlePointerOut = () => {
    setHovered(false);
  };
  
  return (
    <group
      ref={meshRef}
      position={cardPosition}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main card mesh - rotated to lay flat on table */}
      <mesh
        geometry={cardGeometry}
        rotation={[-Math.PI / 2, 0, cardRotation]}
        castShadow
        receiveShadow
        renderOrder={indexInZone}
      >
        <meshStandardMaterial
          map={showFaceUp ? frontTexture : backTexture}
          color="#ffffff"
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Selection highlight effect */}
      {isSelected && (
        <mesh
          geometry={cardGeometry}
          rotation={[-Math.PI / 2, 0, cardRotation]}
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
      
      {/* Hover highlight effect */}
      {hovered && !isSelected && (
        <mesh
          geometry={cardGeometry}
          rotation={[-Math.PI / 2, 0, cardRotation]}
          position={[0, 0.01, 0]}
          renderOrder={indexInZone + 1000}
        >
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * DonZoneRenderer - renders all DON cards in a zone
 */
export function DonZoneRenderer({
  donCards,
  zonePosition,
  spacing,
  stackOffset,
  selectedDonId,
  onClick,
  scale = 1.0,
}: {
  donCards: DonVisualState[];
  zonePosition: [number, number, number];
  spacing: number;
  stackOffset: number;
  selectedDonId?: string | null;
  onClick?: (donId: string) => void;
  scale?: number; // Scale factor for given DON (Task 22: adjusted to GIVEN_DON_SCALE when attached)
}) {
  return (
    <>
      {donCards.map((don, index) => {
        // Task 22: Use GIVEN_DON_SCALE for DON attached to characters/leaders
        const isGivenDon = don.zone === ZoneId.CHARACTER_AREA || don.zone === ZoneId.LEADER_AREA;
        const finalScale = isGivenDon ? GIVEN_DON_SCALE : scale;
        
        return (
          <DonMesh
            key={don.id}
            donState={don}
            zonePosition={zonePosition}
            indexInZone={index}
            totalDon={donCards.length}
            spacing={spacing}
            stackOffset={stackOffset}
            isSelected={selectedDonId === don.id}
            onClick={onClick}
            scale={finalScale}
          />
        );
      })}
    </>
  );
}
