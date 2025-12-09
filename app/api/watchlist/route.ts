import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const watchlist = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    include: {
      card: {
        include: {
          priceHistory: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(watchlist)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cardId, targetPrice } = await request.json()

  const watchlistItem = await prisma.watchlist.create({
    data: {
      userId: session.user.id,
      cardId,
      targetPrice
    },
    include: { card: true }
  })

  return NextResponse.json(watchlistItem, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const cardId = searchParams.get('cardId')

  if (!cardId) {
    return NextResponse.json({ error: 'Card ID required' }, { status: 400 })
  }

  await prisma.watchlist.delete({
    where: {
      userId_cardId: {
        userId: session.user.id,
        cardId
      }
    }
  })

  return NextResponse.json({ success: true })
}
