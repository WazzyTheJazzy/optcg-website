'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Package, Users, Clock, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { useGuestMode } from '@/components/GuestModeProvider'

interface Trade {
  id: string
  status: string
  createdAt: string
  initiator: { name: string; email: string }
  items: Array<{
    id: string
    quantity: number
    condition: string
    side: string
    card: {
      name: string
      cardNumber: string
      imageUrl?: string
    }
  }>
  offers: Array<{
    id: string
    status: string
    user: { name: string; email: string }
  }>
}

export default function TradesPage() {
  const { data: session, status } = useSession()
  const { isGuest, enableGuestMode } = useGuestMode()
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrades()
    } else {
      setLoading(false)
    }
  }, [status])

  const fetchTrades = async () => {
    const res = await fetch('/api/trades')
    const data = await res.json()
    setTrades(data)
    setLoading(false)
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading...</div>

  // Show promotional view for unauthenticated users (not in guest mode)
  if (!session && !isGuest) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Trade Marketplace</h1>

        {/* Hero CTA */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-lg p-8 mb-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Connect with Collectors Worldwide</h2>
          <p className="text-lg mb-6 max-w-2xl mx-auto">
            Trade cards safely with our secure marketplace. Build your dream collection by connecting with thousands of active traders.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
            >
              Sign In to Trade
            </Link>
            <button
              onClick={enableGuestMode}
              className="bg-white/20 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/30 transition inline-flex items-center gap-2"
            >
              <UserCircle className="w-5 h-5" />
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Safe Trading</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Secure trade system with verified users and trade history
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Active Community</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Join 1,250+ collectors actively trading cards daily
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Quick Trades</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Fast and easy trade process with instant notifications
            </p>
          </div>
        </div>

        {/* Demo Trades */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Recent Trades</h2>
          <div className="space-y-4">
            {[
              { user: 'CardCollector123', offering: 'Monkey D. Luffy (SR)', wanting: 'Roronoa Zoro (SR)', status: 'Active' },
              { user: 'OnePieceFan', offering: 'Shanks (SEC)', wanting: 'Kaido (SR)', status: 'Completed' },
              { user: 'TCGTrader', offering: 'Nami (L)', wanting: 'Trafalgar Law (SR)', status: 'Active' },
            ].map((trade, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 opacity-75 relative overflow-hidden">
                {/* Blur overlay */}
                <div className="absolute inset-0 backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 flex items-center justify-center">
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition shadow-lg"
                  >
                    Sign In to View Trades
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="font-semibold">{trade.user}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    trade.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {trade.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Offering</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                      <p className="font-semibold text-sm">{trade.offering}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Looking For</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                      <p className="font-semibold text-sm">{trade.wanting}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow-lg">
          <h3 className="text-2xl font-bold mb-4">Ready to Start Trading?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create an account to access the full trading marketplace
          </p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    )
  }

  // Guest mode - show upgrade message
  if (isGuest) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Trade Marketplace</h1>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg p-8 mb-8 text-center">
          <UserCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Trading Requires an Account</h2>
          <p className="text-lg mb-6 max-w-2xl mx-auto">
            You&apos;re currently in Guest Mode. To trade cards with other collectors, you&apos;ll need to create an account.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
            >
              Sign In to Trade
            </Link>
            <Link
              href="/collection"
              className="bg-white/20 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/30 transition inline-block"
            >
              View My Collection
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Safe Trading</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Secure trade system with verified users
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Active Community</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Connect with collectors worldwide
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Quick Trades</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Fast and easy trade process
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">My Trades</h1>
        <button
          onClick={() => router.push('/trades/new')}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
        >
          Create Trade
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No trades yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start trading with other collectors to expand your collection
          </p>
          <button
            onClick={() => router.push('/trades/new')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Create Your First Trade
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {trades.map((trade) => (
            <div key={trade.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                  <span className="font-semibold">{trade.initiator.name || trade.initiator.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    trade.status === 'completed' ? 'bg-green-100 text-green-800' :
                    trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trade.status}
                  </span>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(trade.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Offering</h3>
                  <div className="space-y-2">
                    {trade.items.filter(item => item.side === 'offer').map((item) => (
                      <div key={item.id} className="flex items-center bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <div className="w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded mr-3 flex-shrink-0">
                          {item.card.imageUrl && (
                            <img src={item.card.imageUrl} alt={item.card.name} className="w-full h-full object-cover rounded" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{item.card.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {item.card.cardNumber} • {item.condition} • x{item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Looking For</h3>
                  <div className="space-y-2">
                    {trade.items.filter(item => item.side === 'want').map((item) => (
                      <div key={item.id} className="flex items-center bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <div className="w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded mr-3 flex-shrink-0">
                          {item.card.imageUrl && (
                            <img src={item.card.imageUrl} alt={item.card.name} className="w-full h-full object-cover rounded" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{item.card.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {item.card.cardNumber} • {item.condition} • x{item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {trade.offers.length > 0 && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="font-semibold mb-2">Offers ({trade.offers.length})</h3>
                  <div className="space-y-2">
                    {trade.offers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between text-sm">
                        <span>{offer.user.name || offer.user.email}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {offer.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
