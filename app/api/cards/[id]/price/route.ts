import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { price, condition, source } = await request.json()

  const priceEntry = await prisma.priceHistory.create({
    data: {
      cardId: params.id,
      price,
      condition: condition || 'NM',
      source: source || 'market'
    }
  })

  return NextResponse.json(priceEntry, { status: 201 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '30')
  const condition = searchParams.get('condition') || 'NM'

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const priceHistory = await prisma.priceHistory.findMany({
    where: {
      cardId: params.id,
      condition,
      timestamp: { gte: startDate }
    },
    orderBy: { timestamp: 'asc' }
  })

  return NextResponse.json(priceHistory)
}
