'use client'

import { useState } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import { GuestStorage } from '@/lib/guest-storage'
import { useGuestMode } from './GuestModeProvider'

export function GuestMigrationModal() {
  const { showMigrationPrompt, dismissMigrationPrompt } = useGuestMode()
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!showMigrationPrompt) return null

  const handleMigrate = async () => {
    setMigrating(true)
    setError(null)

    try {
      const guestCollection = GuestStorage.getCollection()

      // Migrate each card to the user's account
      for (const item of guestCollection) {
        const res = await fetch('/api/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: item.cardId,
            quantity: item.quantity,
            condition: item.condition,
            forTrade: item.forTrade
          })
        })

        if (!res.ok) {
          throw new Error(`Failed to migrate card: ${item.name}`)
        }
      }

      // Clear guest data and disable guest mode
      GuestStorage.migrateToAccount('user')
      dismissMigrationPrompt()
      
      // Reload to show migrated collection
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
      setMigrating(false)
    }
  }

  const handleSkip = () => {
    // Keep guest data but dismiss prompt
    dismissMigrationPrompt()
  }

  const handleDiscard = () => {
    // Clear guest data and disable guest mode
    if (confirm('Are you sure? This will delete your guest collection data.')) {
      GuestStorage.clearCollection()
      GuestStorage.disableGuestMode()
      dismissMigrationPrompt()
    }
  }

  const stats = GuestStorage.getStats()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Migrate Guest Data</h2>
              <p className="text-sm text-gray-400">You have collection data as a guest</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-300 mb-3">Your guest collection:</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-bold text-white">{stats.totalCards}</div>
              <div className="text-xs text-gray-400">Total Cards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.uniqueCards}</div>
              <div className="text-xs text-gray-400">Unique Cards</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {migrating ? 'Migrating...' : 'Migrate to My Account'}
          </button>

          <button
            onClick={handleSkip}
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Keep as Guest (Ask Later)
          </button>

          <button
            onClick={handleDiscard}
            className="w-full px-4 py-3 bg-transparent text-red-400 rounded-lg hover:bg-red-500/10 text-sm"
          >
            Discard Guest Data
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Guest data is stored locally in your browser
        </div>
      </div>
    </div>
  )
}
