import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const card = await prisma.card.findUnique({
    where: { id: params.id },
    include: {
      priceHistory: {
        orderBy: { timestamp: 'desc' },
        take: 30
      }
    }
  })

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  return NextResponse.json(card)
}
