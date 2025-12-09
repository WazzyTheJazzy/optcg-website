'use client'

interface AdInFeedProps {
  index: number
  className?: string
}

export function AdInFeed({ index, className = '' }: AdInFeedProps) {
  return (
    <div className={`col-span-full my-4 ${className}`}>
      <div className="w-full h-32 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
        <div className="text-center text-gray-400">
          <div className="text-sm font-semibold mb-1">Sponsored Content</div>
          <div className="text-xs opacity-75">In-Feed Ad #{index}</div>
        </div>
      </div>
    </div>
  )
}
