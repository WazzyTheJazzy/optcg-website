'use client'

import { useEffect, useRef } from 'react'

interface AdBannerProps {
  slot: string
  format?: 'horizontal' | 'vertical' | 'rectangle' | 'auto'
  className?: string
  responsive?: boolean
}

export function AdBanner({ 
  slot, 
  format = 'auto', 
  className = '',
  responsive = true 
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // This will be replaced with actual ad network code (Google AdSense, etc.)
    // For now, it's a placeholder
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      }
    } catch (err) {
      console.log('Ad loading error:', err)
    }
  }, [])

  // Placeholder styling based on format
  const formatStyles = {
    horizontal: 'h-24 w-full',
    vertical: 'h-96 w-40',
    rectangle: 'h-64 w-64',
    auto: 'h-32 w-full'
  }

  return (
    <div 
      ref={adRef}
      className={`ad-container ${formatStyles[format]} ${className}`}
      data-ad-slot={slot}
    >
      {/* Placeholder for development */}
      <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
        <div className="text-center text-gray-400">
          <div className="text-sm font-semibold mb-1">Advertisement</div>
          <div className="text-xs opacity-75">{format} - Slot: {slot}</div>
        </div>
      </div>
      
      {/* Actual ad code will go here */}
      {/* <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={responsive ? 'auto' : format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      /> */}
    </div>
  )
}
