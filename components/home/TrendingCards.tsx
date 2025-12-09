'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { CardImage } from '@/components/CardImage'

interface Card {
  id: string
  cardNumber: string
  name: string
  set: string
  rarity: string
  imageUrl?: string
  priceHistory: { price: number }[]
}

export function TrendingCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrendingCards()
  }, [])

  const fetchTrendingCards = async () => {
    try {
      const res = await fetch('/api/cards?limit=6')
      const data = await res.json()
      setCards(data.cards || [])
    } catch (error) {
      console.error('Error fetching trending cards:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const price = card.priceHistory[0]?.price || 0
        const priceChange = Math.random() > 0.5 ? Math.random() * 20 : -Math.random() * 10

        return (
          <Link key={card.id} href={`/cards/${card.id}`}>
            <div className="group bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden">
              <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 relative">
                <CardImage
                  cardNumber={card.cardNumber}
                  name={card.name}
                  rarity={card.rarity}
                  imageUrl={card.imageUrl}
                  className="w-full h-full"
                />
                {/* Trending Badge */}
                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  HOT
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate mb-1">{card.name}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {card.set} • {card.rarity}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-red-600">
                    ${price.toFixed(2)}
                  </span>
                  <div className={`flex items-center text-xs font-semibold ${
                    priceChange > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {priceChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(priceChange).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
