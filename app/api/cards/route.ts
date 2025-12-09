import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  // Basic filters
  const search = searchParams.get('search')
  const cardNumber = searchParams.get('cardNumber')
  const sets = searchParams.get('sets')?.split(',').filter(Boolean)
  const rarities = searchParams.get('rarities')?.split(',').filter(Boolean)
  const types = searchParams.get('types')?.split(',').filter(Boolean)
  const colors = searchParams.get('colors')?.split(',').filter(Boolean)
  
  // Stats filters
  const costMin = searchParams.get('costMin')
  const costMax = searchParams.get('costMax')
  const powerMin = searchParams.get('powerMin')
  const powerMax = searchParams.get('powerMax')
  const counterMin = searchParams.get('counterMin')
  const counterMax = searchParams.get('counterMax')
  const life = searchParams.get('life')
  const attributes = searchParams.get('attributes')?.split(',').filter(Boolean)
  
  // Advanced filters
  const illustrationTypes = searchParams.get('illustrationTypes')?.split(',').filter(Boolean)
  const artist = searchParams.get('artist')
  const archetype = searchParams.get('archetype')
  
  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  
  // Search in name, effect, or card number
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { cardNumber: { contains: search, mode: 'insensitive' } },
      { effect: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  // Card number exact match
  if (cardNumber) {
    where.cardNumber = { contains: cardNumber, mode: 'insensitive' }
  }
  
  // Array filters
  if (sets && sets.length > 0) {
    where.set = { in: sets }
  }
  
  if (rarities && rarities.length > 0) {
    where.rarity = { in: rarities }
  }
  
  if (types && types.length > 0) {
    where.type = { in: types }
  }
  
  if (colors && colors.length > 0) {
    where.OR = colors.map(color => ({
      color: { contains: color, mode: 'insensitive' }
    }))
  }
  
  if (attributes && attributes.length > 0) {
    where.attribute = { in: attributes }
  }
  
  if (illustrationTypes && illustrationTypes.length > 0) {
    where.illustrationType = { in: illustrationTypes }
  }
  
  // Range filters
  if (costMin !== null || costMax !== null) {
    where.cost = {}
    if (costMin) where.cost.gte = parseInt(costMin)
    if (costMax) where.cost.lte = parseInt(costMax)
  }
  
  if (powerMin !== null || powerMax !== null) {
    where.power = {}
    if (powerMin) where.power.gte = parseInt(powerMin)
    if (powerMax) where.power.lte = parseInt(powerMax)
  }
  
  if (counterMin !== null || counterMax !== null) {
    where.counter = {}
    if (counterMin) where.counter.gte = parseInt(counterMin)
    if (counterMax) where.counter.lte = parseInt(counterMax)
  }
  
  if (life) {
    where.life = parseInt(life)
  }
  
  // Text search filters
  if (artist) {
    where.artist = { contains: artist, mode: 'insensitive' }
  }
  
  if (archetype) {
    where.OR = [
      { archetype: { contains: archetype, mode: 'insensitive' } },
      { tags: { contains: archetype, mode: 'insensitive' } }
    ]
  }

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      include: {
        priceHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { cardNumber: 'asc' }
    }),
    prisma.card.count({ where })
  ])

  return NextResponse.json({
    cards,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const card = await prisma.card.create({
    data: body
  })
  
  return NextResponse.json(card, { status: 201 })
}
