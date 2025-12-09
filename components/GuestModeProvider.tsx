'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { GuestStorage } from '@/lib/guest-storage'

interface GuestModeContextType {
  isGuest: boolean
  enableGuestMode: () => void
  disableGuestMode: () => void
  showMigrationPrompt: boolean
  dismissMigrationPrompt: () => void
}

const GuestModeContext = createContext<GuestModeContextType>({
  isGuest: false,
  enableGuestMode: () => {},
  disableGuestMode: () => {},
  showMigrationPrompt: false,
  dismissMigrationPrompt: () => {}
})

export function useGuestMode() {
  return useContext(GuestModeContext)
}

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [isGuest, setIsGuest] = useState(false)
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)

  useEffect(() => {
    // Check if user is in guest mode
    const guestMode = GuestStorage.isGuestMode()
    setIsGuest(guestMode)

    // If user signs in while in guest mode, show migration prompt
    if (session && guestMode) {
      const collection = GuestStorage.getCollection()
      if (collection.length > 0) {
        setShowMigrationPrompt(true)
      } else {
        // No data to migrate, just disable guest mode
        GuestStorage.disableGuestMode()
        setIsGuest(false)
      }
    }
  }, [session])

  const enableGuestMode = () => {
    GuestStorage.enableGuestMode()
    setIsGuest(true)
  }

  const disableGuestMode = () => {
    GuestStorage.disableGuestMode()
    setIsGuest(false)
  }

  const dismissMigrationPrompt = () => {
    setShowMigrationPrompt(false)
  }

  return (
    <GuestModeContext.Provider
      value={{
        isGuest,
        enableGuestMode,
        disableGuestMode,
        showMigrationPrompt,
        dismissMigrationPrompt
      }}
    >
      {children}
    </GuestModeContext.Provider>
  )
}
