'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus, Trash2, Filter, Download } from 'lucide-react'
import Link from 'next/link'
import { CardImage } from '@/components/CardImage'
import { CardFilters, FilterState } from '@/components/CardFilters'
import { useSession } from 'next-auth/react'
import { useGuestMode } from '@/components/GuestModeProvider'
import { GuestStorage } from '@/lib/guest-storage'

interface Card {
  id: string
  cardNumber: string
  name: string
  set: string
  rarity: string
  color: string
  type: string
  imageUrl?: string
}

interface CollectionItem {
  id: string
  quantity: number
  condition: string
  forTrade: boolean
  card: Card
}

export default function CollectionPage() {
  const { data: session } = useSession()
  const { isGuest, enableGuestMode } = useGuestMode()
  const [collection, setCollection] = useState<CollectionItem[]>([])
  const [availableCards, setAvailableCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
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
    archetype: ''
  })

  useEffect(() => {
    if (session?.user) {
      fetchCollection()
    } else if (isGuest) {
      fetchGuestCollection()
    } else {
      setLoading(false)
    }
  }, [session, isGuest, filters])

  useEffect(() => {
    if (showAddCard) {
      fetchAvailableCards()
    }
  }, [showAddCard, filters])

  const fetchGuestCollection = () => {
    setLoading(true)
    const guestItems = GuestStorage.filterCollection({
      search: filters.search,
      sets: filters.set,
      rarities: filters.rarity,
      types: filters.type,
      colors: filters.color
    })
    
    // Convert guest items to CollectionItem format
    const converted = guestItems.map(item => ({
      id: `${item.cardId}-${item.condition}`,
      quantity: item.quantity,
      condition: item.condition,
      forTrade: item.forTrade,
      card: {
        id: item.cardId,
        cardNumber: item.cardNumber,
        name: item.name,
        set: item.set,
        rarity: item.rarity,
        color: item.color,
        type: item.type,
        imageUrl: item.imageUrl
      }
    }))
    
    setCollection(converted)
    setLoading(false)
  }

  const fetchCollection = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    
    if (filters.search) params.append('search', filters.search)
    if (filters.set.length > 0) params.append('sets', filters.set.join(','))
    if (filters.rarity.length > 0) params.append('rarities', filters.rarity.join(','))
    if (filters.type.length > 0) params.append('types', filters.type.join(','))
    if (filters.color.length > 0) params.append('colors', filters.color.join(','))

    const res = await fetch(`/api/collection?${params}`)
    const data = await res.json()
    setCollection(data.collection || [])
    setLoading(false)
  }

  const fetchAvailableCards = async () => {
    const params = new URLSearchParams()
    params.append('limit', '1000')
    
    if (filters.search) params.append('search', filters.search)
    if (filters.set.length > 0) params.append('sets', filters.set.join(','))
    if (filters.rarity.length > 0) params.append('rarities', filters.rarity.join(','))
    if (filters.type.length > 0) params.append('types', filters.type.join(','))
    if (filters.color.length > 0) params.append('colors', filters.color.join(','))

    const res = await fetch(`/api/cards?${params}`)
    const data = await res.json()
    setAvailableCards(data.cards || [])
  }

  const addToCollection = async (cardId: string, quantity: number = 1, condition: string = 'NM') => {
    if (isGuest) {
      // Add to guest storage
      const card = availableCards.find(c => c.id === cardId)
      if (card) {
        GuestStorage.addCard({
          cardId: card.id,
          cardNumber: card.cardNumber,
          name: card.name,
          set: card.set,
          rarity: card.rarity,
          color: card.color,
          type: card.type,
          imageUrl: card.imageUrl,
          quantity,
          condition,
          forTrade: false
        })
        fetchGuestCollection()
        setShowAddCard(false)
      }
      return
    }

    const res = await fetch('/api/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, quantity, condition })
    })
    
    if (res.ok) {
      fetchCollection()
      setShowAddCard(false)
    }
  }

  const updateQuantity = async (collectionId: string, change: number) => {
    const item = collection.find(c => c.id === collectionId)
    if (!item) return
    
    const newQuantity = item.quantity + change
    if (newQuantity <= 0) {
      await deleteFromCollection(collectionId)
      return
    }

    if (isGuest) {
      GuestStorage.updateCard(item.card.id, item.condition, { quantity: newQuantity })
      fetchGuestCollection()
      return
    }

    const res = await fetch('/api/collection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId, quantity: newQuantity })
    })
    
    if (res.ok) {
      fetchCollection()
    }
  }

  const deleteFromCollection = async (collectionId: string) => {
    const item = collection.find(c => c.id === collectionId)
    if (!item) return

    if (isGuest) {
      GuestStorage.removeCard(item.card.id, item.condition)
      fetchGuestCollection()
      return
    }

    const res = await fetch(`/api/collection?id=${collectionId}`, {
      method: 'DELETE'
    })
    
    if (res.ok) {
      fetchCollection()
    }
  }

  const toggleForTrade = async (collectionId: string) => {
    const item = collection.find(c => c.id === collectionId)
    if (!item) return

    if (isGuest) {
      GuestStorage.updateCard(item.card.id, item.condition, { forTrade: !item.forTrade })
      fetchGuestCollection()
      return
    }

    const res = await fetch('/api/collection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId, forTrade: !item.forTrade })
    })
    
    if (res.ok) {
      fetchCollection()
    }
  }

  const exportCollection = () => {
    if (isGuest) {
      const csv = GuestStorage.exportToCSV()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-collection-guest.csv'
      a.click()
      return
    }

    const csv = [
      ['Card Number', 'Name', 'Set', 'Rarity', 'Quantity', 'Condition', 'For Trade'].join(','),
      ...collection.map(item => [
        item.card.cardNumber,
        item.card.name,
        item.card.set,
        item.card.rarity,
        item.quantity,
        item.condition,
        item.forTrade ? 'Yes' : 'No'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-collection.csv'
    a.click()
  }

  const stats = {
    totalCards: collection.reduce((sum, item) => sum + item.quantity, 0),
    uniqueCards: collection.length,
    forTrade: collection.filter(item => item.forTrade).length,
    bySets: collection.reduce((acc, item) => {
      acc[item.card.set] = (acc[item.card.set] || 0) + item.quantity
      return acc
    }, {} as Record<string, number>)
  }

  if (!session && !isGuest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-4">Collection Tracker</h1>
          <p className="text-gray-300 mb-8">Track your One Piece TCG cards</p>
          
          <div className="space-y-4">
            <Link 
              href="/api/auth/signin" 
              className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Sign In to Save Online
            </Link>
            
            <button
              onClick={enableGuestMode}
              className="block w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium"
            >
              Continue as Guest
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            <p className="mb-2">Guest mode stores data locally in your browser</p>
            <p>Sign in to sync across devices</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Collection</h1>
          <p className="text-gray-300">Track and manage your One Piece TCG cards</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold text-white mb-1">{stats.totalCards}</div>
            <div className="text-gray-300 text-sm">Total Cards</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold text-white mb-1">{stats.uniqueCards}</div>
            <div className="text-gray-300 text-sm">Unique Cards</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold text-white mb-1">{stats.forTrade}</div>
            <div className="text-gray-300 text-sm">For Trade</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold text-white mb-1">{Object.keys(stats.bySets).length}</div>
            <div className="text-gray-300 text-sm">Sets Collected</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowAddCard(!showAddCard)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Cards
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter className="w-5 h-5" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button
            onClick={exportCollection}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6">
            <CardFilters
              onFilterChange={setFilters}
            />
          </div>
        )}

        {/* Add Card Modal */}
        {showAddCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Add Cards to Collection</h2>
                  <button
                    onClick={() => setShowAddCard(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {availableCards.map(card => (
                    <div key={card.id} className="bg-gray-700 rounded-lg p-3">
                      <CardImage
                        cardNumber={card.cardNumber}
                        name={card.name}
                        rarity={card.rarity}
                        imageUrl={card.imageUrl}
                        className="w-full rounded-lg mb-2"
                      />
                      <div className="text-white text-sm font-medium mb-1 truncate">{card.name}</div>
                      <div className="text-gray-400 text-xs mb-2">{card.cardNumber}</div>
                      <button
                        onClick={() => addToCollection(card.id)}
                        className="w-full px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collection Grid */}
        {loading ? (
          <div className="text-center text-white py-12">Loading collection...</div>
        ) : collection.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl mb-4">Your collection is empty</p>
            <button
              onClick={() => setShowAddCard(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collection.map(item => (
              <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <Link href={`/cards/${item.card.id}`}>
                  <CardImage
                    cardNumber={item.card.cardNumber}
                    name={item.card.name}
                    rarity={item.card.rarity}
                    imageUrl={item.card.imageUrl}
                    className="w-full rounded-lg mb-3 hover:scale-105 transition-transform cursor-pointer"
                  />
                </Link>
                
                <div className="text-white font-medium mb-1">{item.card.name}</div>
                <div className="text-gray-400 text-sm mb-3">{item.card.cardNumber}</div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-300 text-sm">Qty:</span>
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-white font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-1 bg-gray-700 text-white rounded">{item.condition}</span>
                  <button
                    onClick={() => toggleForTrade(item.id)}
                    className={`text-xs px-2 py-1 rounded ${
                      item.forTrade ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {item.forTrade ? 'For Trade' : 'Not Trading'}
                  </button>
                </div>

                <button
                  onClick={() => deleteFromCollection(item.id)}
                  className="w-full px-3 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
