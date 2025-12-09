'use client'

import { useState } from 'react'
import Image from 'next/image'

interface CardImageProps {
  cardNumber: string
  name: string
  rarity: string
  imageUrl?: string | null
  className?: string
  priority?: boolean
}

export function CardImage({ cardNumber, name, rarity, imageUrl, className = '', priority = false }: CardImageProps) {
  const [imgError, setImgError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Rarity colors for fallback
  const rarityColors: { [key: string]: string } = {
    'L': 'bg-gradient-to-br from-yellow-400 to-yellow-600',
    'SEC': 'bg-gradient-to-br from-red-500 to-red-700',
    'SR': 'bg-gradient-to-br from-orange-400 to-orange-600',
    'R': 'bg-gradient-to-br from-purple-400 to-purple-600',
    'UC': 'bg-gradient-to-br from-gray-400 to-gray-600',
    'C': 'bg-gradient-to-br from-gray-300 to-gray-500'
  }

  const rarityColor = rarityColors[rarity] || 'bg-gradient-to-br from-gray-400 to-gray-600'

  // Fallback placeholder
  const getFallbackUrl = () => {
    const bgColor = {
      'L': 'fbbf24',
      'SEC': 'dc2626',
      'SR': 'f59e0b',
      'R': 'a855f7',
      'UC': '6b7280',
      'C': '9ca3af'
    }[rarity] || '6b7280'
    
    return `https://placehold.co/400x560/${bgColor}/white?text=${encodeURIComponent(cardNumber)}%0A${encodeURIComponent(name)}&font=roboto`
  }

  // If no image URL or error, show styled fallback
  if (!imageUrl || imgError) {
    return (
      <div className={`relative ${className}`}>
        <div className={`w-full h-full ${rarityColor} flex flex-col items-center justify-center text-white p-4`}>
          <div className="text-center">
            <div className="text-xs font-mono mb-2 opacity-80">{cardNumber}</div>
            <div className="text-sm font-bold mb-2 line-clamp-2">{name}</div>
            <div className="text-xs px-2 py-1 bg-white/20 rounded">{rarity}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className={`absolute inset-0 ${rarityColor} animate-pulse`} />
      )}
      <img
        src={imageUrl}
        alt={`${name} - ${cardNumber}`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgError(true)
          setIsLoading(false)
        }}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  )
}
