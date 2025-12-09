/**
 * Guest Storage - Local storage for guest users
 * Data is stored in browser localStorage and not persisted to database
 */

export interface GuestCollectionItem {
  cardId: string
  cardNumber: string
  name: string
  set: string
  rarity: string
  color: string
  type: string
  imageUrl?: string
  quantity: number
  condition: string
  forTrade: boolean
  addedAt: string
}

const STORAGE_KEY = 'optcg_guest_collection'
const GUEST_MODE_KEY = 'optcg_guest_mode'

export class GuestStorage {
  static isGuestMode(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(GUEST_MODE_KEY) === 'true'
  }

  static enableGuestMode() {
    if (typeof window === 'undefined') return
    localStorage.setItem(GUEST_MODE_KEY, 'true')
  }

  static disableGuestMode() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(GUEST_MODE_KEY)
  }

  static getCollection(): GuestCollectionItem[] {
    if (typeof window === 'undefined') return []
    
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to load guest collection:', error)
      return []
    }
  }

  static saveCollection(collection: GuestCollectionItem[]) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
    } catch (error) {
      console.error('Failed to save guest collection:', error)
    }
  }

  static addCard(card: Omit<GuestCollectionItem, 'addedAt'>) {
    const collection = this.getCollection()
    
    // Check if card already exists
    const existing = collection.find(
      item => item.cardId === card.cardId && item.condition === card.condition
    )
    
    if (existing) {
      existing.quantity += card.quantity
      this.saveCollection(collection)
      return existing
    }
    
    const newItem: GuestCollectionItem = {
      ...card,
      addedAt: new Date().toISOString()
    }
    
    collection.push(newItem)
    this.saveCollection(collection)
    return newItem
  }

  static updateCard(cardId: string, condition: string, updates: Partial<GuestCollectionItem>) {
    const collection = this.getCollection()
    const item = collection.find(
      item => item.cardId === cardId && item.condition === condition
    )
    
    if (item) {
      Object.assign(item, updates)
      this.saveCollection(collection)
      return item
    }
    
    return null
  }

  static removeCard(cardId: string, condition: string) {
    const collection = this.getCollection()
    const filtered = collection.filter(
      item => !(item.cardId === cardId && item.condition === condition)
    )
    this.saveCollection(filtered)
    return true
  }

  static getStats() {
    const collection = this.getCollection()
    
    const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0)
    const uniqueCards = collection.length
    const forTrade = collection.filter(item => item.forTrade).length
    const sets = new Set(collection.map(item => item.set)).size
    
    const recentlyAdded = collection
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 5)
      .map(item => ({
        cardNumber: item.cardNumber,
        name: item.name,
        imageUrl: item.imageUrl
      }))
    
    return {
      totalCards,
      uniqueCards,
      forTrade,
      sets,
      recentlyAdded
    }
  }

  static filterCollection(filters: {
    search?: string
    sets?: string[]
    rarities?: string[]
    types?: string[]
    colors?: string[]
    forTrade?: boolean
  }) {
    let collection = this.getCollection()
    
    if (filters.search) {
      const search = filters.search.toLowerCase()
      collection = collection.filter(
        item =>
          item.name.toLowerCase().includes(search) ||
          item.cardNumber.toLowerCase().includes(search)
      )
    }
    
    if (filters.sets && filters.sets.length > 0) {
      collection = collection.filter(item => filters.sets!.includes(item.set))
    }
    
    if (filters.rarities && filters.rarities.length > 0) {
      collection = collection.filter(item => filters.rarities!.includes(item.rarity))
    }
    
    if (filters.types && filters.types.length > 0) {
      collection = collection.filter(item => filters.types!.includes(item.type))
    }
    
    if (filters.colors && filters.colors.length > 0) {
      collection = collection.filter(item => filters.colors!.includes(item.color))
    }
    
    if (filters.forTrade !== undefined) {
      collection = collection.filter(item => item.forTrade === filters.forTrade)
    }
    
    return collection
  }

  static exportToCSV(): string {
    const collection = this.getCollection()
    
    const headers = ['Card Number', 'Name', 'Set', 'Rarity', 'Quantity', 'Condition', 'For Trade']
    const rows = collection.map(item => [
      item.cardNumber,
      item.name,
      item.set,
      item.rarity,
      item.quantity.toString(),
      item.condition,
      item.forTrade ? 'Yes' : 'No'
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  static importFromCSV(csv: string) {
    // Parse CSV and add cards
    const lines = csv.split('\n')
    const headers = lines[0].split(',')
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      if (values.length < 7) continue
      
      // This would need to fetch card data from API
      // For now, just a placeholder
      console.log('Import card:', values[0])
    }
  }

  static clearCollection() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }

  static migrateToAccount(userId: string): GuestCollectionItem[] {
    // Return collection data for migration to user account
    const collection = this.getCollection()
    this.clearCollection()
    this.disableGuestMode()
    return collection
  }
}
