'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Package, Heart, ArrowUpRight, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { useGuestMode } from '@/components/GuestModeProvider'
import { GuestStorage } from '@/lib/guest-storage'

interface CollectionItem {
  id: string
  quantity: number
  condition: string
  forTrade: boolean
  card: {
    id: string
    name: string
    cardNumber: string
    set: string
    rarity: string
    imageUrl?: string
    priceHistory: { price: number }[]
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { isGuest, enableGuestMode } = useGuestMode()
  const router = useRouter()
  const [collection, setCollection] = useState<CollectionItem[]>([])
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    } else if (isGuest) {
      fetchGuestData()
    } else {
      setLoading(false)
    }
  }, [status, isGuest])

  const fetchGuestData = () => {
    const guestCollection = GuestStorage.getCollection()
    
    // Convert to CollectionItem format
    const converted = guestCollection.map(item => ({
      id: `${item.cardId}-${item.condition}`,
      quantity: item.quantity,
      condition: item.condition,
      forTrade: item.forTrade,
      card: {
        id: item.cardId,
        name: item.name,
        cardNumber: item.cardNumber,
        set: item.set,
        rarity: item.rarity,
        imageUrl: item.imageUrl,
        priceHistory: []
      }
    }))
    
    setCollection(converted)
    setTotalValue(0) // Guest mode doesn't track prices
    setWatchlist([]) // Guest mode doesn't have watchlist yet
    setLoading(false)
  }

  const fetchData = async () => {
    const [collectionRes, watchlistRes] = await Promise.all([
      fetch('/api/collection'),
      fetch('/api/watchlist')
    ])

    const collectionData = await collectionRes.json()
    const watchlistData = await watchlistRes.json()

    // Filter out items with missing card data
    const validCollection = (collectionData.collection || []).filter((item: CollectionItem) => item.card)
    
    // Calculate total value safely
    const calculatedValue = validCollection.reduce((sum: number, item: CollectionItem) => {
      const price = item.card?.priceHistory?.[0]?.price || 0
      return sum + (price * item.quantity)
    }, 0)

    setCollection(validCollection)
    setTotalValue(calculatedValue)
    setWatchlist((watchlistData || []).filter((item: any) => item.card))
    setLoading(false)
  }

  const toggleForTrade = async (id: string, currentStatus: boolean) => {
    if (isGuest) {
      // Parse the guest ID format: cardId-condition
      const [cardId, condition] = id.split('-')
      GuestStorage.updateCard(cardId, condition, { forTrade: !currentStatus })
      fetchGuestData()
      return
    }

    await fetch(`/api/collection/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forTrade: !currentStatus })
    })
    fetchData()
  }

  const removeFromCollection = async (id: string) => {
    if (!confirm('Remove this card from your collection?')) return
    
    if (isGuest) {
      // Parse the guest ID format: cardId-condition
      const [cardId, condition] = id.split('-')
      GuestStorage.removeCard(cardId, condition)
      fetchGuestData()
      return
    }
    
    await fetch(`/api/collection/${id}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading...</div>

  // Show demo/empty state for unauthenticated users (not in guest mode)
  if (!session && !isGuest) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Dashboard</h1>

        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-lg p-8 mb-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Track Your Collection</h2>
          <p className="mb-6">Manage your cards, track prices, and trade with others</p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/auth/signin"
              className="inline-block bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Sign In
            </Link>
            <button
              onClick={enableGuestMode}
              className="inline-flex items-center gap-2 bg-white/20 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/30 transition"
            >
              <UserCircle className="w-5 h-5" />
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Demo Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg opacity-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Total Value</h3>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">$0.00</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Sign in to track your collection value</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg opacity-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Collection Size</h3>
              <Package className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">0 unique cards</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg opacity-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Watchlist</h3>
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">cards tracked</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Start Building Your Collection</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Browse cards, track prices, and manage your One Piece TCG collection
          </p>
          <Link 
            href="/cards"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Browse Cards
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">My Dashboard</h1>
        {isGuest && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg">
            <UserCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Guest Mode - Data stored locally</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Total Value</h3>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">${(totalValue || 0).toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Collection Size</h3>
            <Package className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold">{(collection || []).reduce((sum, item) => sum + item.quantity, 0)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{(collection || []).length} unique cards</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Watchlist</h3>
            <Heart className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-3xl font-bold">{(watchlist || []).length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">cards tracked</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Collection</h2>
          <Link href="/cards" className="text-red-600 hover:text-red-700 flex items-center">
            Add Cards <ArrowUpRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {(collection || []).length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">
            Your collection is empty. Start adding cards!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">Card</th>
                  <th className="text-left py-3 px-4">Set</th>
                  <th className="text-left py-3 px-4">Condition</th>
                  <th className="text-center py-3 px-4">Qty</th>
                  <th className="text-right py-3 px-4">Price</th>
                  <th className="text-right py-3 px-4">Value</th>
                  <th className="text-center py-3 px-4">For Trade</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(collection || []).map((item) => {
                  // Safety check for missing card data
                  if (!item.card) return null
                  
                  const price = item.card.priceHistory?.[0]?.price || 0
                  const value = price * item.quantity

                  return (
                    <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4">
                        <Link href={`/cards/${item.card.id}`} className="flex items-center hover:text-red-600">
                          <div className="w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded mr-3 flex-shrink-0">
                            {item.card.imageUrl && (
                              <img src={item.card.imageUrl} alt={item.card.name} className="w-full h-full object-cover rounded" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{item.card.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{item.card.cardNumber}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">{item.card.set}</td>
                      <td className="py-3 px-4">{item.condition}</td>
                      <td className="py-3 px-4 text-center">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">${price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-semibold">${value.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleForTrade(item.id, item.forTrade)}
                          className={`px-3 py-1 rounded text-sm ${
                            item.forTrade
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.forTrade ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removeFromCollection(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Watchlist</h2>

        {(watchlist || []).length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">
            Your watchlist is empty. Add cards to track their prices!
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(watchlist || []).map((item) => {
              // Safety check for missing card data
              if (!item.card) return null
              
              return (
              <Link key={item.id} href={`/cards/${item.card.id}`}>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-lg transition">
                  <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-600 rounded mb-3 flex items-center justify-center">
                    {item.card.imageUrl ? (
                      <img src={item.card.imageUrl} alt={item.card.name} className="w-full h-full object-cover rounded" />
                    ) : (
                      <span className="text-gray-400">{item.card.cardNumber}</span>
                    )}
                  </div>
                  <h3 className="font-semibold mb-1 truncate">{item.card.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.card.set}</p>
                  {item.card.priceHistory?.[0] && (
                    <p className="text-lg font-bold text-red-600">
                      ${item.card.priceHistory[0].price.toFixed(2)}
                    </p>
                  )}
                </div>
              </Link>
            )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
