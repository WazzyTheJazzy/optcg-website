'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { BookMarked, TrendingUp, Package, Repeat } from 'lucide-react'
import Link from 'next/link'

interface CollectionStats {
  totalCards: number
  uniqueCards: number
  forTrade: number
  sets: number
  recentlyAdded: Array<{
    cardNumber: string
    name: string
    imageUrl?: string
  }>
}

export function CollectionStats() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchStats()
    } else {
      setLoading(false)
    }
  }, [session])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/collection/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch collection stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">My Collection</h3>
        <p className="text-gray-300 mb-4">Sign in to track your cards</p>
        <Link
          href="/api/auth/signin"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats || stats.uniqueCards === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BookMarked className="w-5 h-5" />
          My Collection
        </h3>
        <p className="text-gray-300 mb-4">Start building your collection</p>
        <Link
          href="/collection"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add Cards
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <BookMarked className="w-5 h-5" />
          My Collection
        </h3>
        <Link
          href="/collection"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Package className="w-4 h-4" />
            Total Cards
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalCards}</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Unique
          </div>
          <div className="text-2xl font-bold text-white">{stats.uniqueCards}</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Repeat className="w-4 h-4" />
            For Trade
          </div>
          <div className="text-2xl font-bold text-white">{stats.forTrade}</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <BookMarked className="w-4 h-4" />
            Sets
          </div>
          <div className="text-2xl font-bold text-white">{stats.sets}</div>
        </div>
      </div>

      {stats.recentlyAdded.length > 0 && (
        <div>
          <div className="text-sm text-gray-400 mb-3">Recently Added</div>
          <div className="space-y-2">
            {stats.recentlyAdded.slice(0, 3).map((card, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-white truncate flex-1">{card.name}</div>
                <div className="text-gray-400 text-xs">{card.cardNumber}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
