'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TrendingUp, Heart, Plus, X, UserCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { CardImage } from '@/components/CardImage'
import { useGuestMode } from '@/components/GuestModeProvider'
import { GuestStorage } from '@/lib/guest-storage'

interface Card {
  id: string
  cardNumber: string
  name: string
  set: string
  rarity: string
  color: string
  cost?: number
  power?: number
  counter?: number
  type: string
  category: string
  effect?: string
  trigger?: string
  imageUrl?: string
  priceHistory: Array<{ price: number; timestamp: string }>
}

export default function CardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { isGuest, enableGuestMode } = useGuestMode()
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState('NM')

  useEffect(() => {
    if (params.id) {
      fetchCard()
    }
  }, [params.id])

  const fetchCard = async () => {
    const res = await fetch(`/api/cards/${params.id}`)
    const data = await res.json()
    setCard(data)
    setLoading(false)
  }

  const [showSignInModal, setShowSignInModal] = useState(false)

  const addToCollection = async () => {
    if (!session && !isGuest) {
      setShowSignInModal(true)
      return
    }

    if (isGuest && card) {
      // Add to guest storage
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
      alert('Added to collection! (Guest Mode - stored locally)')
      return
    }

    await fetch('/api/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId: card?.id,
        quantity,
        condition
      })
    })

    alert('Added to collection!')
  }

  const addToWatchlist = async () => {
    if (!session && !isGuest) {
      setShowSignInModal(true)
      return
    }

    if (isGuest) {
      alert('Watchlist requires an account. Sign in to track card prices!')
      return
    }

    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card?.id })
    })

    alert('Added to watchlist!')
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading...</div>
  if (!card) return <div className="container mx-auto px-4 py-8">Card not found</div>

  const currentPrice = card.priceHistory[0]?.price || 0
  const priceChange = card.priceHistory.length > 1
    ? ((currentPrice - card.priceHistory[1].price) / card.priceHistory[1].price) * 100
    : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <CardImage
              cardNumber={card.cardNumber}
              name={card.name}
              rarity={card.rarity}
              imageUrl={card.imageUrl}
              className="w-full h-full"
              priority={true}
            />
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold mb-2">{card.name}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            {card.cardNumber} • {card.set}
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Price</p>
                <p className="text-3xl font-bold text-red-600">${currentPrice.toFixed(2)}</p>
              </div>
              <div className={`flex items-center ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                <TrendingUp className="w-6 h-6 mr-1" />
                <span className="text-xl font-semibold">{priceChange.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="NM">Near Mint</option>
                  <option value="LP">Lightly Played</option>
                  <option value="MP">Moderately Played</option>
                  <option value="HP">Heavily Played</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={addToCollection}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add to Collection
              </button>
              <button
                onClick={addToWatchlist}
                className="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Card Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="font-semibold">{card.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rarity:</span>
                <span className="font-semibold">{card.rarity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Color:</span>
                <span className="font-semibold">{card.color}</span>
              </div>
              {card.cost !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                  <span className="font-semibold">{card.cost}</span>
                </div>
              )}
              {card.power !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Power:</span>
                  <span className="font-semibold">{card.power}</span>
                </div>
              )}
              {card.counter !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Counter:</span>
                  <span className="font-semibold">{card.counter}</span>
                </div>
              )}
              {card.category && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Category:</span>
                  <span className="font-semibold">{card.category}</span>
                </div>
              )}
            </div>
            {card.effect && (
              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                <p className="text-sm font-medium mb-2">Effect:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.effect}</p>
              </div>
            )}
            {card.trigger && (
              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                <p className="text-sm font-medium mb-2">Trigger:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.trigger}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Price History</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {card.priceHistory.slice(0, 30).reverse().map((entry, i) => (
            <div
              key={i}
              className="flex-1 bg-red-600 rounded-t hover:bg-red-700 transition"
              style={{ height: `${(entry.price / Math.max(...card.priceHistory.map(p => p.price))) * 100}%` }}
              title={`$${entry.price.toFixed(2)}`}
            />
          ))}
        </div>
      </div>
      {/* Sign In Modal */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            
            <Heart className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4 text-center">Track Your Collection</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              Save your cards online or track them locally in your browser
            </p>
            
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition mb-3"
            >
              Sign In to Save Online
            </button>
            
            <button
              onClick={() => {
                enableGuestMode()
                setShowSignInModal(false)
                // Trigger add to collection again
                setTimeout(() => addToCollection(), 100)
              }}
              className="w-full bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition mb-3 flex items-center justify-center gap-2"
            >
              <UserCircle className="w-5 h-5" />
              Continue as Guest
            </button>
            
            <button
              onClick={() => setShowSignInModal(false)}
              className="w-full bg-transparent text-gray-600 dark:text-gray-400 px-6 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
