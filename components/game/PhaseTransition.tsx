'use client';

/**
 * PhaseTransition.tsx
 * 
 * Visual effects for phase transitions in the game
 * Task 22: Add subtle animations for phase transitions
 */

import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Phase } from '@/lib/game-engine/core/types';

export interface PhaseTransitionProps {
  currentPhase: Phase;
  onTransitionComplete?: () => void;
}

/**
 * Phase transition visual effect component
 * Shows a subtle pulse/wave effect when phases change
 */
export function PhaseTransitionEffect({ currentPhase, onTransitionComplete }: PhaseTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const previousPhaseRef = useRef<Phase>(currentPhase);
  const ringRef = useRef<THREE.Mesh>(null);
  
  // Detect phase changes
  useEffect(() => {
    if (previousPhaseRef.current !== currentPhase) {
      console.log(`🎬 Phase transition: ${previousPhaseRef.current} -> ${currentPhase}`);
      setIsTransitioning(true);
      setTransitionProgress(0);
      previousPhaseRef.current = currentPhase;
    }
  }, [currentPhase]);
  
  // Animate transition
  useFrame((state, delta) => {
    if (!isTransitioning) return;
    
    // Update progress
    const newProgress = transitionProgress + delta * 1.5; // 1.5 = speed multiplier
    setTransitionProgress(newProgress);
    
    // Update ring mesh
    if (ringRef.current) {
      // Expand ring outward
      const scale = 1 + newProgress * 3;
      ringRef.current.scale.set(scale, scale, 1);
      
      // Fade out
      const opacity = Math.max(0, 1 - newProgress);
      if (ringRef.current.material instanceof THREE.MeshBasicMaterial) {
        ringRef.current.material.opacity = opacity * 0.4;
      }
    }
    
    // Complete transition
    if (newProgress >= 1) {
      setIsTransitioning(false);
      setTransitionProgress(0);
      if (onTransitionComplete) {
        onTransitionComplete();
      }
    }
  });
  
  // Get phase color
  const getPhaseColor = (phase: Phase): string => {
    switch (phase) {
      case Phase.REFRESH:
        return '#4a9cff'; // Blue
      case Phase.DRAW:
        return '#9c4aff'; // Purple
      case Phase.DON_PHASE:
        return '#ff9c4a'; // Orange
      case Phase.MAIN:
        return '#4aff9c'; // Green
      case Phase.END:
        return '#ff4a9c'; // Pink
      default:
        return '#ffffff'; // White
    }
  };
  
  if (!isTransitioning) return null;
  
  return (
    <group position={[0, 0.5, 0]}>
      {/* Expanding ring effect */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 2.5, 32]} />
        <meshBasicMaterial
          color={getPhaseColor(currentPhase)}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Center pulse */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial
          color={getPhaseColor(currentPhase)}
          transparent
          opacity={Math.max(0, 0.3 - transitionProgress * 0.3)}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Phase indicator component - shows current phase with subtle glow
 * Task 22: Visual feedback for current phase
 */
export function PhaseIndicator({ currentPhase }: { currentPhase: Phase }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Subtle pulsing animation
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Gentle pulse using sine wave
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.9;
    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.opacity = pulse * 0.25;
    }
  });
  
  // Get phase color
  const getPhaseColor = (phase: Phase): string => {
    switch (phase) {
      case Phase.REFRESH:
        return '#4a9cff';
      case Phase.DRAW:
        return '#9c4aff';
      case Phase.DON_PHASE:
        return '#ff9c4a';
      case Phase.MAIN:
        return '#4aff9c';
      case Phase.END:
        return '#ff4a9c';
      default:
        return '#ffffff';
    }
  };
  
  return (
    <group position={[0, 0.2, 0]}>
      {/* Phase indicator ring */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.0, 32]} />
        <meshBasicMaterial
          color={getPhaseColor(currentPhase)}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Card play animation enhancement
 * Task 22: Subtle particle effect when cards are played
 */
export function CardPlayEffect({ position }: { position: [number, number, number] }) {
  const [particles, setParticles] = useState<Array<{ id: number; offset: THREE.Vector3; velocity: THREE.Vector3 }>>([]);
  const [lifetime, setLifetime] = useState(0);
  
  // Initialize particles
  useEffect(() => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      offset: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 2
      ),
    }));
    setParticles(newParticles);
    setLifetime(0);
  }, []);
  
  // Animate particles
  useFrame((state, delta) => {
    setLifetime(prev => prev + delta);
    
    setParticles(prev => prev.map(p => ({
      ...p,
      offset: p.offset.clone().add(p.velocity.clone().multiplyScalar(delta)),
      velocity: p.velocity.clone().add(new THREE.Vector3(0, -delta * 2, 0)), // Gravity
    })));
  });
  
  if (lifetime > 1) return null; // Effect duration: 1 second
  
  return (
    <group position={position}>
      {particles.map(p => (
        <mesh key={p.id} position={p.offset.toArray()}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color="#ffdd88"
            transparent
            opacity={Math.max(0, 1 - lifetime)}
          />
        </mesh>
      ))}
    </group>
  );
}
