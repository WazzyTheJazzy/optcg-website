import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function LatestSets() {
  const sets = [
    {
      code: 'OP05',
      name: 'Awakening of the New Era',
      releaseDate: 'September 2023',
      cardCount: 120,
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=300&fit=crop',
      featured: true
    },
    {
      code: 'OP04',
      name: 'Kingdoms of Intrigue',
      releaseDate: 'June 2023',
      cardCount: 120,
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
      featured: false
    },
    {
      code: 'OP03',
      name: 'Pillars of Strength',
      releaseDate: 'March 2023',
      cardCount: 120,
      image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&h=300&fit=crop',
      featured: false
    }
  ]

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {sets.map((set) => (
        <Link key={set.code} href={`/cards?set=${set.code}`}>
          <div className={`group relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition ${
            set.featured ? 'md:col-span-2 md:row-span-1' : ''
          }`}>
            {/* Background Image */}
            <div className="aspect-video bg-gradient-to-br from-red-900 to-orange-900 relative">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition" />
              
              {/* Featured Badge */}
              {set.featured && (
                <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                  NEW
                </div>
              )}
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
              <div className="text-red-500 text-sm font-semibold mb-1">{set.code}</div>
              <h3 className="text-white text-xl font-bold mb-2">{set.name}</h3>
              <div className="flex items-center justify-between text-gray-300 text-sm">
                <span>{set.releaseDate}</span>
                <span>{set.cardCount} cards</span>
              </div>
              
              {/* Hover Arrow */}
              <div className="mt-3 flex items-center text-white opacity-0 group-hover:opacity-100 transition">
                <span className="text-sm font-semibold mr-2">Explore Set</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
