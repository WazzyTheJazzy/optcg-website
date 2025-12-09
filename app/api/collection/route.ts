import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  
  // Filters
  const search = searchParams.get('search')
  const sets = searchParams.get('sets')?.split(',').filter(Boolean)
  const rarities = searchParams.get('rarities')?.split(',').filter(Boolean)
  const types = searchParams.get('types')?.split(',').filter(Boolean)
  const colors = searchParams.get('colors')?.split(',').filter(Boolean)
  const forTrade = searchParams.get('forTrade')

  const where: any = {
    userId: user.id
  }

  // Build card filters
  const cardWhere: any = {}
  
  if (search) {
    cardWhere.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { cardNumber: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  if (sets && sets.length > 0) {
    cardWhere.set = { in: sets }
  }
  
  if (rarities && rarities.length > 0) {
    cardWhere.rarity = { in: rarities }
  }
  
  if (types && types.length > 0) {
    cardWhere.type = { in: types }
  }
  
  if (colors && colors.length > 0) {
    cardWhere.color = { in: colors }
  }

  if (Object.keys(cardWhere).length > 0) {
    where.card = cardWhere
  }

  if (forTrade !== null) {
    where.forTrade = forTrade === 'true'
  }

  const collection = await prisma.collection.findMany({
    where,
    include: {
      card: true
    },
    orderBy: [
      { card: { set: 'asc' } },
      { card: { cardNumber: 'asc' } }
    ]
  })

  return NextResponse.json({ collection })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { cardId, quantity = 1, condition = 'NM', forTrade = false } = body

  if (!cardId) {
    return NextResponse.json({ error: 'Card ID required' }, { status: 400 })
  }

  // Check if already in collection
  const existing = await prisma.collection.findUnique({
    where: {
      userId_cardId_condition: {
        userId: user.id,
        cardId,
        condition
      }
    }
  })

  if (existing) {
    // Update quantity
    const updated = await prisma.collection.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
      include: { card: true }
    })
    return NextResponse.json({ collection: updated })
  }

  // Create new entry
  const collection = await prisma.collection.create({
    data: {
      userId: user.id,
      cardId,
      quantity,
      condition,
      forTrade
    },
    include: { card: true }
  })

  return NextResponse.json({ collection })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { collectionId, quantity, condition, forTrade } = body

  if (!collectionId) {
    return NextResponse.json({ error: 'Collection ID required' }, { status: 400 })
  }

  // Verify ownership
  const existing = await prisma.collection.findUnique({
    where: { id: collectionId }
  })

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updateData: any = {}
  if (quantity !== undefined) updateData.quantity = quantity
  if (condition !== undefined) updateData.condition = condition
  if (forTrade !== undefined) updateData.forTrade = forTrade

  const updated = await prisma.collection.update({
    where: { id: collectionId },
    data: updateData,
    include: { card: true }
  })

  return NextResponse.json({ collection: updated })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const collectionId = searchParams.get('id')

  if (!collectionId) {
    return NextResponse.json({ error: 'Collection ID required' }, { status: 400 })
  }

  // Verify ownership
  const existing = await prisma.collection.findUnique({
    where: { id: collectionId }
  })

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.collection.delete({
    where: { id: collectionId }
  })

  return NextResponse.json({ success: true })
}
