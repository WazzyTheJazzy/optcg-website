'use client'

interface AdSidebarProps {
  position?: 'left' | 'right'
  className?: string
}

export function AdSidebar({ position = 'right', className = '' }: AdSidebarProps) {
  return (
    <aside 
      className={`hidden lg:block sticky top-20 ${className}`}
      style={{ height: 'calc(100vh - 5rem)' }}
    >
      <div className="space-y-4">
        {/* Vertical Ad Unit */}
        <div className="w-40 h-96 bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
          <div className="text-center text-gray-400 text-xs px-2">
            <div className="font-semibold mb-1">Ad Space</div>
            <div className="opacity-75">160x600</div>
          </div>
        </div>

        {/* Square Ad Unit */}
        <div className="w-40 h-40 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
          <div className="text-center text-gray-400 text-xs px-2">
            <div className="font-semibold mb-1">Ad Space</div>
            <div className="opacity-75">160x160</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
