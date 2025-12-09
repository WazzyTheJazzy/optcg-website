'use client'

import { useRouter } from 'next/navigation'
import { LucideIcon } from 'lucide-react'

interface SignInPromptProps {
  title: string
  description: string
  icon: LucideIcon
  primaryAction?: string
  secondaryAction?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
}

export function SignInPrompt({
  title,
  description,
  icon: Icon,
  primaryAction = 'Sign In with Google',
  secondaryAction = 'Browse Cards',
  onPrimaryClick,
  onSecondaryClick
}: SignInPromptProps) {
  const router = useRouter()

  const handlePrimaryClick = () => {
    if (onPrimaryClick) {
      onPrimaryClick()
    } else {
      router.push('/auth/signin')
    }
  }

  const handleSecondaryClick = () => {
    if (onSecondaryClick) {
      onSecondaryClick()
    } else {
      router.push('/cards')
    }
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-lg p-8 text-center">
      <Icon className="w-16 h-16 mx-auto mb-4" />
      <h2 className="text-3xl font-bold mb-4">{title}</h2>
      <p className="text-lg mb-6 max-w-2xl mx-auto">{description}</p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={handlePrimaryClick}
          className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          {primaryAction}
        </button>
        <button
          onClick={handleSecondaryClick}
          className="bg-red-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-800 transition"
        >
          {secondaryAction}
        </button>
      </div>
    </div>
  )
}
