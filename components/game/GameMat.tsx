'use client';

/**
 * GameMat.tsx
 * 
 * Visual game board/playmat for One Piece TCG
 * Shows labeled zones where cards can be placed with realistic table surface
 */

import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { PlayerId } from '@/lib/game-engine/core/types';
import { 
  createTableMaterial, 
  createFallbackTableMaterial,
  type TableSurfaceType 
} from '@/lib/game-engine/rendering/TableTextureLoader';

interface GameMatProps {
  playerId: PlayerId;
  surfaceType?: TableSurfaceType;
}

/**
 * Zone box component - shows a labeled area for cards with enhanced boundaries
 * Task 22: Improved zone boundary markings for better clarity
 */
function ZoneBox({
  position,
  size,
  label,
  color = '#2a5c3a',
  rotation = [0, 0, 0] as [number, number, number],
}: {
  position: [number, number, number];
  size: [number, number];
  label: string;
  color?: string;
  rotation?: [number, number, number];
}) {
  const [width, depth] = size;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Zone outline - subtle fill with improved opacity (Task 22) */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      
      {/* Zone border - enhanced visibility with glow effect (Task 22) */}
      <lineSegments position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} />
        <lineBasicMaterial color="#7ab88f" linewidth={2} />
      </lineSegments>
      
      {/* Inner border for double-line effect (Task 22) */}
      <lineSegments position={[0, -0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width * 0.95, depth * 0.95)]} />
        <lineBasicMaterial color="#5a8c6f" linewidth={1} transparent opacity={0.6} />
      </lineSegments>
      
      {/* Corner markers with enhanced visibility (Task 22) */}
      {[
        [-width/2, -depth/2],
        [width/2, -depth/2],
        [-width/2, depth/2],
        [width/2, depth/2],
      ].map(([x, z], i) => (
        <mesh 
          key={i}
          position={[x, -0.03, z]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.18, 12]} />
          <meshStandardMaterial 
            color="#9acfaa" 
            transparent 
            opacity={0.7}
            emissive="#9acfaa"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
      
      {/* Subtle glow around zone perimeter (Task 22) */}
      <mesh position={[0, -0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 0.2, depth + 0.2]} />
        <meshBasicMaterial 
          color={color}
          transparent 
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Player's side of the game mat
 */
export function PlayerMat({ playerId }: GameMatProps) {
  const isPlayer1 = playerId === PlayerId.PLAYER_1;
  const zMultiplier = isPlayer1 ? -1 : 1;
  const baseZ = isPlayer1 ? -4 : 4;
  
  return (
    <group>
      {/* Deck Zone */}
      <ZoneBox
        position={[-8, 0, baseZ + zMultiplier * 2]}
        size={[2.5, 3.5]}
        label="DECK"
        color="#1a3a2a"
      />
      
      {/* Trash Zone */}
      <ZoneBox
        position={[8, 0, baseZ + zMultiplier * 2]}
        size={[2.5, 3.5]}
        label="TRASH"
        color="#3a1a1a"
      />
      
      {/* Life Zone */}
      <ZoneBox
        position={[-6, 0, baseZ + zMultiplier * 2]}
        size={[2, 3.5]}
        label="LIFE"
        color="#4a2a1a"
      />
      
      {/* DON Deck */}
      <ZoneBox
        position={[-10, 0, baseZ]}
        size={[1.5, 2]}
        label="DON"
        color="#3a1a3a"
      />
      
      {/* Cost Area (Active DON) */}
      <ZoneBox
        position={[-10, 0, baseZ - zMultiplier * 2]}
        size={[2, 3]}
        label="COST"
        color="#2a2a4a"
      />
      
      {/* Leader Zone */}
      <ZoneBox
        position={[0, 0, baseZ]}
        size={[2.8, 3.8]}
        label="LEADER"
        color="#4a3a1a"
      />
      
      {/* Character Area */}
      <ZoneBox
        position={[0, 0, baseZ - zMultiplier * 2]}
        size={[12, 4]}
        label="CHARACTER AREA"
        color="#2a4a3a"
      />
      
      {/* Stage Zone */}
      <ZoneBox
        position={[6, 0, baseZ]}
        size={[2.8, 3.8]}
        label="STAGE"
        color="#3a2a4a"
      />
      
      {/* Hand Zone */}
      <ZoneBox
        position={[0, 0, baseZ + zMultiplier * 4]}
        size={[16, 4]}
        label={isPlayer1 ? "YOUR HAND" : "OPPONENT HAND"}
        color="#1a2a3a"
      />
    </group>
  );
}

/**
 * Complete game mat with both players' zones and realistic table surface
 */
export function GameMat({ surfaceType = 'felt' }: { surfaceType?: TableSurfaceType }) {
  const [tableMaterial, setTableMaterial] = useState<THREE.MeshStandardMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load table material with textures
  useEffect(() => {
    let mounted = true;
    
    async function loadMaterial() {
      try {
        const material = await createTableMaterial({
          surfaceType,
          roughness: surfaceType === 'wood' ? 0.8 : 0.95,
          metalness: surfaceType === 'wood' ? 0.1 : 0.0,
          normalScale: surfaceType === 'wood' ? 0.7 : 0.4,
        });
        
        if (mounted) {
          setTableMaterial(material);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Failed to load table material, using fallback', error);
        if (mounted) {
          const fallback = createFallbackTableMaterial(surfaceType);
          setTableMaterial(fallback);
          setIsLoading(false);
        }
      }
    }

    loadMaterial();

    return () => {
      mounted = false;
      // Cleanup material when component unmounts
      if (tableMaterial) {
        tableMaterial.dispose();
      }
    };
  }, [surfaceType]);

  // Fallback material while loading
  const fallbackMaterial = useMemo(() => {
    return createFallbackTableMaterial(surfaceType);
  }, [surfaceType]);

  return (
    <group>
      {/* Main board surface with texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
        <planeGeometry args={[32, 22]} />
        <primitive object={isLoading ? fallbackMaterial : (tableMaterial || fallbackMaterial)} />
      </mesh>
      
      {/* Board border - wood frame */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
        <ringGeometry args={[15.8, 16, 4]} />
        <meshStandardMaterial 
          color="#5a3a1a"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* Center line - enhanced visual separation between players (Task 22) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]}>
        <planeGeometry args={[30, 0.2]} />
        <meshStandardMaterial 
          color="#ffffff" 
          opacity={0.35} 
          transparent 
          emissive="#ffffff"
          emissiveIntensity={0.25}
        />
      </mesh>
      
      {/* Center line glow effect (Task 22) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.128, 0]}>
        <planeGeometry args={[30, 0.4]} />
        <meshBasicMaterial 
          color="#ffffff" 
          opacity={0.12} 
          transparent 
        />
      </mesh>
      
      {/* Player 1 area indicator with enhanced visibility (Task 22) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.125, -6]}>
        <planeGeometry args={[28, 0.12]} />
        <meshStandardMaterial 
          color="#4a8c69" 
          opacity={0.45} 
          transparent 
          emissive="#4a8c69"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Player 2 area indicator with enhanced visibility (Task 22) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.125, 6]}>
        <planeGeometry args={[28, 0.12]} />
        <meshStandardMaterial 
          color="#8c694a" 
          opacity={0.45} 
          transparent 
          emissive="#8c694a"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Player 1 Mat (bottom) */}
      <PlayerMat playerId={PlayerId.PLAYER_1} />
      
      {/* Player 2 Mat (top) */}
      <PlayerMat playerId={PlayerId.PLAYER_2} />
    </group>
  );
}
