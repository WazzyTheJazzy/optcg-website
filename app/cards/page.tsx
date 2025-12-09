'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, TrendingUp, TrendingDown, Box, Grid3x3 } from 'lucide-react'
import Link from 'next/link'
import { CardImage } from '@/components/CardImage'
import { SleeveSelector } from '@/components/SleeveSelector'
import { cardSleeves, CardSleeve } from '@/lib/card-sleeves'
import { AdBanner } from '@/components/ads/AdBanner'
import { AdSidebar } from '@/components/ads/AdSidebar'
import { AdInFeed } from '@/components/ads/AdInFeed'
import { CardFilters, FilterState } from '@/components/CardFilters'
import dynamic from 'next/dynamic'

const Card3D = dynamic(() => import('@/components/Card3D').then(mod => mod.Card3D), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-gray-800 rounded-lg animate-pulse" />
})

interface Card {
  id: string
  cardNumber: string
  name: string
  set: string
  rarity: string
  color: string
  type: string
  imageUrl?: string
  priceHistory: { price: number }[]
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    set: [],
    cardNumber: '',
    rarity: [],
    type: [],
    color: [],
    costMin: null,
    costMax: null,
    powerMin: null,
    powerMax: null,
    counterMin: null,
    counterMax: null,
    life: null,
    attribute: [],
    illustrationType: [],
    artist: '',
    archetype: '',
  })
  const [loading, setLoading] = useState(true)
  const [view3D, setView3D] = useState(false)
  const [selected3DCard, setSelected3DCard] = useState<Card | null>(null)
  const [selectedSleeve, setSelectedSleeve] = useState<CardSleeve>(cardSleeves[0])
  const [showFilters, setShowFilters] = useState(true)

  useEffect(() => {
    fetchCards()
  }, [filters])

  const fetchCards = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    
    // Set high limit to show all cards
    params.append('limit', '1000')
    
    if (filters.search) params.append('search', filters.search)
    if (filters.cardNumber) params.append('cardNumber', filters.cardNumber)
    if (filters.set.length > 0) params.append('sets', filters.set.join(','))
    if (filters.rarity.length > 0) params.append('rarities', filters.rarity.join(','))
    if (filters.type.length > 0) params.append('types', filters.type.join(','))
    if (filters.color.length > 0) params.append('colors', filters.color.join(','))
    if (filters.costMin !== null) params.append('costMin', filters.costMin.toString())
    if (filters.costMax !== null) params.append('costMax', filters.costMax.toString())
    if (filters.powerMin !== null) params.append('powerMin', filters.powerMin.toString())
    if (filters.powerMax !== null) params.append('powerMax', filters.powerMax.toString())
    if (filters.counterMin !== null) params.append('counterMin', filters.counterMin.toString())
    if (filters.counterMax !== null) params.append('counterMax', filters.counterMax.toString())
    if (filters.life !== null) params.append('life', filters.life.toString())
    if (filters.attribute.length > 0) params.append('attributes', filters.attribute.join(','))
    if (filters.illustrationType.length > 0) params.append('illustrationTypes', filters.illustrationType.join(','))
    if (filters.artist) params.append('artist', filters.artist)
    if (filters.archetype) params.append('archetype', filters.archetype)

    const res = await fetch(`/api/cards?${params}`)
    const data = await res.json()
    setCards(data.cards)
    setLoading(false)
  }

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  return (
    <div className="flex gap-6">
      {/* Left Sidebar Ad */}
      <AdSidebar position="left" />

      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Top Banner Ad */}
        <div className="mb-6">
          <AdBanner slot="cards-top-banner" format="horizontal" />
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Browse Cards</h1>
            {!loading && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Showing {cards.length} card{cards.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              <Filter className="w-5 h-5" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <button
              onClick={() => setView3D(!view3D)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                view3D 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {view3D ? <Grid3x3 className="w-5 h-5" /> : <Box className="w-5 h-5" />}
              {view3D ? '2D Grid' : '3D View'}
            </button>
          </div>
        </div>

        {/* Comprehensive Filters */}
        {showFilters && (
          <div className="mb-8">
            <CardFilters onFilterChange={handleFilterChange} />
          </div>
        )}

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : view3D ? (
        <div className="space-y-6">
          {/* 3D Card Viewer */}
          {selected3DCard && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selected3DCard.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selected3DCard.cardNumber} • {selected3DCard.set} • {selected3DCard.rarity}
                  </p>
                </div>
                {selected3DCard.priceHistory[0] && (
                  <span className="text-2xl font-bold text-red-600">
                    ${selected3DCard.priceHistory[0].price.toFixed(2)}
                  </span>
                )}
              </div>
              <Card3D
                cardNumber={selected3DCard.cardNumber}
                name={selected3DCard.name}
                rarity={selected3DCard.rarity}
                imageUrl={selected3DCard.imageUrl}
                sleeve={selectedSleeve}
              />
              <p className="text-center text-sm text-gray-500 mt-4">
                Click and drag to rotate • Scroll to zoom
              </p>
            </div>
          )}

          {/* Sleeve Selector */}
          {selected3DCard && (
            <div className="mb-6">
              <SleeveSelector
                selectedSleeve={selectedSleeve}
                onSelectSleeve={setSelectedSleeve}
              />
            </div>
          )}

          {/* Card Selection Grid */}
          <div>
            <h3 className="text-xl font-semibold mb-4">
              {selected3DCard ? 'Select Another Card' : 'Select a Card to View in 3D'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelected3DCard(card)}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden ${
                    selected3DCard?.id === card.id ? 'ring-4 ring-red-500' : ''
                  }`}
                >
                  <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700">
                    <CardImage
                      cardNumber={card.cardNumber}
                      name={card.name}
                      rarity={card.rarity}
                      imageUrl={card.imageUrl}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-xs truncate">{card.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {card.cardNumber}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => (
            <>
              {/* Insert in-feed ad every 8 cards */}
              {index > 0 && index % 8 === 0 && (
                <AdInFeed key={`ad-${index}`} index={Math.floor(index / 8)} />
              )}
              
              <Link key={card.id} href={`/cards/${card.id}`}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden">
                  <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700">
                    <CardImage
                      cardNumber={card.cardNumber}
                      name={card.name}
                      rarity={card.rarity}
                      imageUrl={card.imageUrl}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 truncate">{card.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {card.set} • {card.rarity}
                    </p>
                    {card.priceHistory[0] && (
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-red-600">
                          ${card.priceHistory[0].price.toFixed(2)}
                        </span>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </>
          ))}
        </div>
      )}

        {/* Bottom Banner Ad */}
        <div className="mt-8">
          <AdBanner slot="cards-bottom-banner" format="horizontal" />
        </div>
      </div>

      {/* Right Sidebar Ad */}
      <AdSidebar position="right" />
    </div>
  )
}
