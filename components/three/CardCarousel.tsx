'use client'

import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface CardProps {
  position: [number, number, number]
  imageUrl: string
  index: number
}

function Card3D({ position, imageUrl, index }: CardProps) {
  const meshRef = useRef<THREE.Group>(null)
  
  // Use Three.js texture loader for better performance
  // Always call the hook, but handle null imageUrl
  const texture = useLoader(THREE.TextureLoader, imageUrl || '/placeholder.png')

  useFrame((state) => {
    if (meshRef.current) {
      // Make card face the camera
      meshRef.current.lookAt(state.camera.position)
      
      // Slower, more gentle floating
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.12
    }
  })

  return (
    <group ref={meshRef} position={position}>
      {/* Single plane - simpler and more performant */}
      <mesh>
        <planeGeometry args={[1.2, 1.7]} />
        <meshBasicMaterial 
          map={texture}
          color="#ffffff"
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function SpinningCarousel({ cardImages }: { cardImages: string[] }) {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slower, more elegant rotation
      groupRef.current.rotation.y += delta * 0.08
    }
  })

  // Create a simple circular arrangement
  const cards = []
  const numCards = Math.min(cardImages.length, 15) // Increased to 15 cards
  const radius = 10
  
  for (let i = 0; i < numCards; i++) {
    const angle = (i / numCards) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = Math.sin(angle * 2) * 1.5 // Gentle wave
    
    cards.push({
      position: [x, y, z] as [number, number, number],
      imageUrl: cardImages[i] || '',
      index: i
    })
  }

  return (
    <group ref={groupRef}>
      {cards.map((card, i) => (
        <Card3D 
          key={i}
          position={card.position}
          imageUrl={card.imageUrl}
          index={card.index}
        />
      ))}
    </group>
  )
}

export function CardCarousel() {
  const [cardImages, setCardImages] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/cards?limit=15') // Increased to 15 cards
      .then(res => res.json())
      .then(data => {
        if (data.cards && data.cards.length > 0) {
          const images = data.cards
            .filter((card: any) => card.imageUrl)
            .map((card: any) => {
              // Prefer local images for better performance
              if (card.imageUrl.startsWith('/cards/')) {
                return card.imageUrl
              }
              return `/api/proxy-image?url=${encodeURIComponent(card.imageUrl)}`
            })
          setCardImages(images)
        }
      })
      .catch(error => console.error('Error fetching cards:', error))
  }, [])

  if (cardImages.length === 0) return null

  return (
    <div className="fixed inset-0 -z-10 opacity-70">
      <Canvas 
        camera={{ position: [0, 1, 12], fov: 60 }}
        gl={{ 
          antialias: false, // Disable for better performance
          alpha: true,
          powerPreference: "high-performance",
          precision: "lowp" // Lower precision for better performance
        }}
        dpr={1} // Fixed at 1 for consistent performance
        performance={{ min: 0.5 }} // Allow frame rate to drop if needed
      >
        <ambientLight intensity={2.5} />
        <directionalLight position={[0, 0, 5]} intensity={1} />
        
        <SpinningCarousel cardImages={cardImages} />
      </Canvas>
    </div>
  )
}
