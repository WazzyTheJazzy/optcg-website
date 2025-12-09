'use client'

import { CardSleeve, cardSleeves } from '@/lib/card-sleeves'
import { Crown } from 'lucide-react'

interface SleeveSelectorProps {
  selectedSleeve: CardSleeve
  onSelectSleeve: (sleeve: CardSleeve) => void
}

export function SleeveSelector({ selectedSleeve, onSelectSleeve }: SleeveSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>Card Sleeves</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Customize your card back
        </span>
      </h3>
      
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cardSleeves.map((sleeve) => {
          const isSelected = selectedSleeve.id === sleeve.id
          
          return (
            <button
              key={sleeve.id}
              onClick={() => onSelectSleeve(sleeve)}
              className={`relative aspect-[2/3] rounded-lg overflow-hidden transition-all ${
                isSelected 
                  ? 'ring-4 ring-red-500 scale-105' 
                  : 'hover:scale-105 hover:ring-2 hover:ring-gray-400'
              }`}
              title={sleeve.name}
            >
              {/* Sleeve preview */}
              <div 
                className="w-full h-full"
                style={{
                  background: sleeve.pattern === 'gradient'
                    ? `linear-gradient(to bottom, ${sleeve.colors.map(c => `#${c.toString(16).padStart(6, '0')}`).join(', ')})`
                    : `#${sleeve.color.toString(16).padStart(6, '0')}`
                }}
              >
                {/* Pattern overlay preview */}
                {sleeve.pattern === 'stripes' && (
                  <div className="w-full h-full" style={{
                    backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,0,0,0.2) 20px, rgba(0,0,0,0.2) 40px)`
                  }} />
                )}
                {sleeve.pattern === 'dots' && (
                  <div className="w-full h-full" style={{
                    backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.3) 2px, transparent 2px)`,
                    backgroundSize: '20px 20px'
                  }} />
                )}
                {sleeve.pattern === 'stars' && (
                  <div className="w-full h-full flex items-center justify-center text-yellow-400 text-2xl">
                    ★
                  </div>
                )}
              </div>
              
              {/* Premium badge */}
              {sleeve.premium && (
                <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-1">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Name label */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2 truncate">
                {sleeve.name}
              </div>
            </button>
          )
        })}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          Premium sleeves available
        </p>
      </div>
    </div>
  )
}
