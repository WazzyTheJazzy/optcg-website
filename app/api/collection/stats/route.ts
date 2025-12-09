import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

  // Get collection with cards
  const collection = await prisma.collection.findMany({
    where: { userId: user.id },
    include: {
      card: {
        select: {
          cardNumber: true,
          name: true,
          set: true,
          imageUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Calculate stats
  const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0)
  const uniqueCards = collection.length
  const forTrade = collection.filter(item => item.forTrade).length
  const sets = new Set(collection.map(item => item.card.set)).size
  
  const recentlyAdded = collection.slice(0, 5).map(item => ({
    cardNumber: item.card.cardNumber,
    name: item.card.name,
    imageUrl: item.card.imageUrl
  }))

  return NextResponse.json({
    totalCards,
    uniqueCards,
    forTrade,
    sets,
    recentlyAdded
  })
}
