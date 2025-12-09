'use client'

import { useEffect, useState } from 'react'
import { Users, Package, TrendingUp, Repeat } from 'lucide-react'

interface Stats {
  totalCards: number
  totalUsers: number
  totalTrades: number
  totalValue: number
}

export function CommunityStats() {
  const [stats, setStats] = useState<Stats>({
    totalCards: 0,
    totalUsers: 0,
    totalTrades: 0,
    totalValue: 0
  })

  useEffect(() => {
    // Simulate fetching stats - replace with actual API call
    setStats({
      totalCards: 120,
      totalUsers: 1250,
      totalTrades: 342,
      totalValue: 45678
    })
  }, [])

  const statItems = [
    {
      icon: <Package className="w-8 h-8" />,
      label: 'Cards Tracked',
      value: stats.totalCards.toLocaleString(),
      color: 'text-blue-600'
    },
    {
      icon: <Users className="w-8 h-8" />,
      label: 'Active Traders',
      value: stats.totalUsers.toLocaleString(),
      color: 'text-green-600'
    },
    {
      icon: <Repeat className="w-8 h-8" />,
      label: 'Trades Completed',
      value: stats.totalTrades.toLocaleString(),
      color: 'text-purple-600'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      label: 'Total Value',
      value: `$${(stats.totalValue / 1000).toFixed(1)}K`,
      color: 'text-red-600'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition"
        >
          <div className={`${item.color} flex justify-center mb-3`}>
            {item.icon}
          </div>
          <div className="text-3xl font-bold mb-1">{item.value}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
