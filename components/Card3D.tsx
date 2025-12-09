'use client'

import { useRef, useState, Suspense, useEffect } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { CardSleeve } from '@/lib/card-sleeves'
import { useSleeveTexture } from './SleeveTexture'

interface Card3DProps {
  cardNumber: string
  name: string
  rarity: string
  imageUrl?: string | null
  sleeve?: CardSleeve
}

function CardMesh({ 
  imageUrl, 
  rarity, 
  sleeve 
}: { 
  imageUrl?: string | null
  rarity: string
  sleeve?: CardSleeve 
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Rarity colors for fallback
  const rarityColors: { [key: string]: number } = {
    'L': 0xfbbf24,
    'SEC': 0xdc2626,
    'SR': 0xf59e0b,
    'R': 0xa855f7,
    'UC': 0x6b7280,
    'C': 0x9ca3af
  }

  const color = rarityColors[rarity] || 0x6b7280

  // Load front texture - use local path directly or proxy for external URLs
  const textureUrl = imageUrl 
    ? (imageUrl.startsWith('/cards/') ? imageUrl : `/api/card-image?url=${encodeURIComponent(imageUrl)}`)
    : null
  const frontTexture = useLoader(THREE.TextureLoader, textureUrl || '')

  // Generate sleeve texture for back
  const sleeveTexture = useSleeveTexture(sleeve || {
    id: 'classic-blue',
    name: 'Classic Blue',
    color: 0x1e3a8a,
    pattern: 'solid',
    colors: [0x1e3a8a],
    metalness: 0.3,
    roughness: 0.4,
  })

  useEffect(() => {
    if (frontTexture) {
      frontTexture.minFilter = THREE.LinearFilter
      frontTexture.magFilter = THREE.LinearFilter
      frontTexture.colorSpace = THREE.SRGBColorSpace
    }
  }, [frontTexture])

  // Auto-rotate slightly when hovered
  useFrame(() => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.01
    }
  })

  // Card dimensions (standard TCG card ratio)
  const width = 2.5
  const height = 3.5
  const depth = 0.02

  // Create materials array for box geometry
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), // right
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), // left
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), // top
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), // bottom
    new THREE.MeshStandardMaterial({ 
      map: frontTexture || null,
      color: frontTexture ? 0xffffff : color,
      roughness: 0.3,
      metalness: 0.1
    }), // front
    new THREE.MeshStandardMaterial({ 
      map: sleeveTexture,
      color: 0xffffff,
      roughness: sleeve?.roughness || 0.4,
      metalness: sleeve?.metalness || 0.3
    }), // back (sleeve)
  ]

  return (
    <mesh
      ref={meshRef}
      material={materials}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, depth]} />
    </mesh>
  )
}

function FallbackCard({ rarity, sleeve }: { rarity: string; sleeve?: CardSleeve }) {
  const rarityColors: { [key: string]: number } = {
    'L': 0xfbbf24,
    'SEC': 0xdc2626,
    'SR': 0xf59e0b,
    'R': 0xa855f7,
    'UC': 0x6b7280,
    'C': 0x9ca3af
  }

  const color = rarityColors[rarity] || 0x6b7280
  const sleeveTexture = useSleeveTexture(sleeve || {
    id: 'classic-blue',
    name: 'Classic Blue',
    color: 0x1e3a8a,
    pattern: 'solid',
    colors: [0x1e3a8a],
    metalness: 0.3,
    roughness: 0.4,
  })

  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ 
      map: sleeveTexture,
      color: 0xffffff,
      roughness: sleeve?.roughness || 0.4,
      metalness: sleeve?.metalness || 0.3
    }),
  ]

  return (
    <mesh material={materials} castShadow receiveShadow>
      <boxGeometry args={[2.5, 3.5, 0.02]} />
    </mesh>
  )
}

export function Card3D({ cardNumber, name, rarity, imageUrl, sleeve }: Card3DProps) {
  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        shadows
        gl={{ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
      >
        {/* Brighter lighting for better visibility */}
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.2}
          castShadow
        />
        <directionalLight 
          position={[-5, -5, 5]} 
          intensity={0.5}
        />
        <pointLight position={[0, 0, 10]} intensity={0.3} />
        
        <Suspense fallback={<FallbackCard rarity={rarity} sleeve={sleeve} />}>
          {imageUrl ? (
            <CardMesh imageUrl={imageUrl} rarity={rarity} sleeve={sleeve} />
          ) : (
            <FallbackCard rarity={rarity} sleeve={sleeve} />
          )}
        </Suspense>
        
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={8}
          autoRotate={false}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  )
}
