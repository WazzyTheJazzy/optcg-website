import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const trades = await prisma.trade.findMany({
    where: {
      OR: [
        { initiatorId: session.user.id },
        { offers: { some: { userId: session.user.id } } }
      ]
    },
    include: {
      initiator: true,
      offers: {
        include: { user: true }
      },
      items: {
        include: { card: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(trades)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { items } = await request.json()

  const trade = await prisma.trade.create({
    data: {
      initiatorId: session.user.id,
      items: {
        create: items.map((item: any) => ({
          cardId: item.cardId,
          quantity: item.quantity,
          condition: item.condition || 'NM',
          side: 'offer'
        }))
      }
    },
    include: {
      items: {
        include: { card: true }
      }
    }
  })

  return NextResponse.json(trade, { status: 201 })
}
