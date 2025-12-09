export interface CardSleeve {
  id: string
  name: string
  color: number
  pattern: 'solid' | 'gradient' | 'stripes' | 'dots' | 'waves' | 'stars'
  colors: number[]
  metalness: number
  roughness: number
  premium?: boolean
}

export const cardSleeves: CardSleeve[] = [
  // Basic Solid Colors
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    color: 0x1e3a8a,
    pattern: 'solid',
    colors: [0x1e3a8a],
    metalness: 0.3,
    roughness: 0.4,
  },
  {
    id: 'crimson-red',
    name: 'Crimson Red',
    color: 0xdc2626,
    pattern: 'solid',
    colors: [0xdc2626],
    metalness: 0.3,
    roughness: 0.4,
  },
  {
    id: 'emerald-green',
    name: 'Emerald Green',
    color: 0x059669,
    pattern: 'solid',
    colors: [0x059669],
    metalness: 0.3,
    roughness: 0.4,
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    color: 0x7c3aed,
    pattern: 'solid',
    colors: [0x7c3aed],
    metalness: 0.3,
    roughness: 0.4,
  },
  {
    id: 'midnight-black',
    name: 'Midnight Black',
    color: 0x1a1a1a,
    pattern: 'solid',
    colors: [0x1a1a1a],
    metalness: 0.5,
    roughness: 0.3,
  },
  {
    id: 'pearl-white',
    name: 'Pearl White',
    color: 0xf8fafc,
    pattern: 'solid',
    colors: [0xf8fafc],
    metalness: 0.4,
    roughness: 0.2,
  },

  // Gradient Sleeves
  {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    color: 0xf59e0b,
    pattern: 'gradient',
    colors: [0xf59e0b, 0xdc2626, 0x7c3aed],
    metalness: 0.4,
    roughness: 0.3,
    premium: true,
  },
  {
    id: 'ocean-gradient',
    name: 'Ocean Gradient',
    color: 0x0ea5e9,
    pattern: 'gradient',
    colors: [0x0ea5e9, 0x1e3a8a, 0x059669],
    metalness: 0.4,
    roughness: 0.3,
    premium: true,
  },
  {
    id: 'galaxy-gradient',
    name: 'Galaxy Gradient',
    color: 0x7c3aed,
    pattern: 'gradient',
    colors: [0x7c3aed, 0x1e3a8a, 0x1a1a1a],
    metalness: 0.6,
    roughness: 0.2,
    premium: true,
  },

  // Patterned Sleeves
  {
    id: 'gold-stripes',
    name: 'Gold Stripes',
    color: 0xfbbf24,
    pattern: 'stripes',
    colors: [0xfbbf24, 0x1a1a1a],
    metalness: 0.7,
    roughness: 0.2,
    premium: true,
  },
  {
    id: 'silver-dots',
    name: 'Silver Dots',
    color: 0x94a3b8,
    pattern: 'dots',
    colors: [0x94a3b8, 0x1e293b],
    metalness: 0.6,
    roughness: 0.3,
    premium: true,
  },
  {
    id: 'neon-waves',
    name: 'Neon Waves',
    color: 0x06b6d4,
    pattern: 'waves',
    colors: [0x06b6d4, 0xec4899, 0x8b5cf6],
    metalness: 0.5,
    roughness: 0.3,
    premium: true,
  },
  {
    id: 'starry-night',
    name: 'Starry Night',
    color: 0x1e293b,
    pattern: 'stars',
    colors: [0x1e293b, 0xfbbf24],
    metalness: 0.4,
    roughness: 0.4,
    premium: true,
  },

  // One Piece Themed
  {
    id: 'straw-hat',
    name: 'Straw Hat',
    color: 0xfbbf24,
    pattern: 'solid',
    colors: [0xfbbf24, 0xdc2626],
    metalness: 0.3,
    roughness: 0.5,
    premium: true,
  },
  {
    id: 'marine-blue',
    name: 'Marine Blue',
    color: 0x1e40af,
    pattern: 'stripes',
    colors: [0x1e40af, 0xf8fafc],
    metalness: 0.4,
    roughness: 0.4,
    premium: true,
  },
  {
    id: 'pirate-flag',
    name: 'Pirate Flag',
    color: 0x1a1a1a,
    pattern: 'solid',
    colors: [0x1a1a1a, 0xf8fafc],
    metalness: 0.3,
    roughness: 0.5,
    premium: true,
  },
]

export function getSleeveById(id: string): CardSleeve {
  return cardSleeves.find(s => s.id === id) || cardSleeves[0]
}
