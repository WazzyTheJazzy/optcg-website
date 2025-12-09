'use client'

import { useState } from 'react'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'

interface CardFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  search: string
  set: string[]
  cardNumber: string
  rarity: string[]
  type: string[]
  color: string[]
  costMin: number | null
  costMax: number | null
  powerMin: number | null
  powerMax: number | null
  counterMin: number | null
  counterMax: number | null
  life: number | null
  attribute: string[]
  illustrationType: string[]
  artist: string
  archetype: string
}

const SETS = ['OP01', 'OP02', 'OP03', 'OP04', 'OP05']

const RARITIES = [
  { value: 'C', label: 'Common (C)' },
  { value: 'UC', label: 'Uncommon (UC)' },
  { value: 'R', label: 'Rare (R)' },
  { value: 'SR', label: 'Super Rare (SR)' },
  { value: 'SEC', label: 'Secret Rare (SEC)' },
  { value: 'L', label: 'Leader (L)' },
  { value: 'P', label: 'Promo (P)' },
  { value: 'AA', label: 'Alternate Art (AA)' },
]

const TYPES = [
  { value: 'Leader', label: 'Leader' },
  { value: 'Character', label: 'Character' },
  { value: 'Event', label: 'Event' },
  { value: 'Stage', label: 'Stage' },
]

const COLORS = [
  { value: 'Red', label: 'Red', color: 'bg-red-500' },
  { value: 'Green', label: 'Green', color: 'bg-green-500' },
  { value: 'Blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'Purple', label: 'Purple', color: 'bg-purple-500' },
  { value: 'Black', label: 'Black', color: 'bg-gray-900' },
  { value: 'Yellow', label: 'Yellow', color: 'bg-yellow-400' },
  { value: 'Multicolor', label: 'Multicolor', color: 'bg-gradient-to-r from-red-500 to-blue-500' },
]

const ATTRIBUTES = [
  { value: 'Strike', label: 'Strike' },
  { value: 'Slash', label: 'Slash' },
  { value: 'Wisdom', label: 'Wisdom' },
  { value: 'Ranged', label: 'Ranged' },
  { value: 'Special', label: 'Special' },
]

const ILLUSTRATION_TYPES = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Manga', label: 'Manga Art' },
  { value: 'Original', label: 'Original Art' },
  { value: 'Alternate', label: 'Alternate Art' },
  { value: 'Parallel', label: 'Parallel' },
]

export function CardFilters({ onFilterChange }: CardFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    set: [],
    cardNumber: '',
    rarity: [],
    type: [],
    color: [],
    costMin: null,
    costMax: null,
    powerMin: null,
    powerMax: null,
    counterMin: null,
    counterMax: null,
    life: null,
    attribute: [],
    illustrationType: [],
    artist: '',
    archetype: '',
  })

  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    stats: false,
    advanced: false,
  })

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = filters[key] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value]
    updateFilters({ [key]: newArray })
  }

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      search: '',
      set: [],
      cardNumber: '',
      rarity: [],
      type: [],
      color: [],
      costMin: null,
      costMax: null,
      powerMin: null,
      powerMax: null,
      counterMin: null,
      counterMax: null,
      life: null,
      attribute: [],
      illustrationType: [],
      artist: '',
      archetype: '',
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const activeFilterCount = 
    filters.set.length +
    filters.rarity.length +
    filters.type.length +
    filters.color.length +
    filters.attribute.length +
    filters.illustrationType.length +
    (filters.search ? 1 : 0) +
    (filters.cardNumber ? 1 : 0) +
    (filters.costMin !== null ? 1 : 0) +
    (filters.costMax !== null ? 1 : 0) +
    (filters.powerMin !== null ? 1 : 0) +
    (filters.powerMax !== null ? 1 : 0) +
    (filters.counterMin !== null ? 1 : 0) +
    (filters.counterMax !== null ? 1 : 0) +
    (filters.life !== null ? 1 : 0) +
    (filters.artist ? 1 : 0) +
    (filters.archetype ? 1 : 0)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6" />
          Card Filters
          {activeFilterCount > 0 && (
            <span className="text-sm bg-red-600 text-white px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm font-semibold"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Basic Filters */}
      <div className="space-y-4">
        <button
          onClick={() => toggleSection('basic')}
          className="w-full flex items-center justify-between text-lg font-semibold hover:text-red-600 transition-colors"
        >
          <span>Basic Filters</span>
          {expandedSections.basic ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.basic && (
          <div className="space-y-4 pl-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Card Name / Effect Text</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                placeholder="Search by name or effect..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
              />
            </div>

            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium mb-2">Card Number</label>
              <input
                type="text"
                value={filters.cardNumber}
                onChange={(e) => updateFilters({ cardNumber: e.target.value })}
                placeholder="e.g., OP03-025"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
              />
            </div>

            {/* Set */}
            <div>
              <label className="block text-sm font-medium mb-2">Set / Series</label>
              <div className="flex flex-wrap gap-2">
                {SETS.map(set => (
                  <button
                    key={set}
                    onClick={() => toggleArrayFilter('set', set)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      filters.set.includes(set)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {set}
                  </button>
                ))}
              </div>
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-sm font-medium mb-2">Rarity</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {RARITIES.map(rarity => (
                  <button
                    key={rarity.value}
                    onClick={() => toggleArrayFilter('rarity', rarity.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.rarity.includes(rarity.value)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {rarity.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Card Type</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => toggleArrayFilter('type', type.value)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      filters.type.includes(type.value)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => toggleArrayFilter('color', color.value)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      filters.color.includes(color.value)
                        ? 'ring-4 ring-red-600'
                        : 'hover:scale-105'
                    } bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600`}
                  >
                    <div className={`w-4 h-4 rounded-full ${color.color}`} />
                    {color.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Filters */}
      <div className="space-y-4">
        <button
          onClick={() => toggleSection('stats')}
          className="w-full flex items-center justify-between text-lg font-semibold hover:text-red-600 transition-colors"
        >
          <span>Stats & Values</span>
          {expandedSections.stats ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.stats && (
          <div className="space-y-4 pl-4">
            {/* Cost */}
            <div>
              <label className="block text-sm font-medium mb-2">Cost</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={filters.costMin ?? ''}
                  onChange={(e) => updateFilters({ costMin: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Min"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
                />
                <span>to</span>
                <input
                  type="number"
                  value={filters.costMax ?? ''}
                  onChange={(e) => updateFilters({ costMax: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Max"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
                />
              </div>
            </div>

            {/* Power */}
            <div>
              <label className="block text-sm font-medium mb-2">Power</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={filters.powerMin ?? ''}
                  onChange={(e) => updateFilters({ powerMin: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Min"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
                />
                <span>to</span>
                <input
                  type="number"
                  value={filters.powerMax ?? ''}
                  onChange={(e) => updateFilters({ powerMax: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Max"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
                />
              </div>
            </div>

            {/* Counter */}
            <div>
              <label className="block text-sm font-medium mb-2">Counter Value</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={filters.counterMin ?? ''}
                  onChange={(e) => updateFilters({ counterMin: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Min"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
                />
                <span>to</span>
                <input
                  type="number"
                  value={filters.counterMax ?? ''}
                  onChange={(e) => updateFilters({ counterMax: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Max"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
                />
              </div>
            </div>

            {/* Life (for Leaders) */}
            <div>
              <label className="block text-sm font-medium mb-2">Life (Leaders)</label>
              <input
                type="number"
                value={filters.life ?? ''}
                onChange={(e) => updateFilters({ life: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 4, 5"
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
              />
            </div>

            {/* Attribute */}
            <div>
              <label className="block text-sm font-medium mb-2">Attribute</label>
              <div className="flex flex-wrap gap-2">
                {ATTRIBUTES.map(attr => (
                  <button
                    key={attr.value}
                    onClick={() => toggleArrayFilter('attribute', attr.value)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      filters.attribute.includes(attr.value)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {attr.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <div className="space-y-4">
        <button
          onClick={() => toggleSection('advanced')}
          className="w-full flex items-center justify-between text-lg font-semibold hover:text-red-600 transition-colors"
        >
          <span>Advanced Filters</span>
          {expandedSections.advanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.advanced && (
          <div className="space-y-4 pl-4">
            {/* Illustration Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Illustration Type</label>
              <div className="flex flex-wrap gap-2">
                {ILLUSTRATION_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => toggleArrayFilter('illustrationType', type.value)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      filters.illustrationType.includes(type.value)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Artist */}
            <div>
              <label className="block text-sm font-medium mb-2">Artist Name</label>
              <input
                type="text"
                value={filters.artist}
                onChange={(e) => updateFilters({ artist: e.target.value })}
                placeholder="Search by artist..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
              />
            </div>

            {/* Archetype */}
            <div>
              <label className="block text-sm font-medium mb-2">Archetype / Tag</label>
              <input
                type="text"
                value={filters.archetype}
                onChange={(e) => updateFilters({ archetype: e.target.value })}
                placeholder="e.g., Straw Hat Crew, Whitebeard Pirates..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 dark:bg-gray-700"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
