import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    // Test database connection
    const count = await prisma.card.count();
    const sample = await prisma.card.findFirst();
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      totalCards: count,
      sampleCard: sample ? {
        id: sample.id,
        name: sample.name,
        type: sample.type,
        cardNumber: sample.cardNumber
      } : null
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
