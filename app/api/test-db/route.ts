import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test database connection
    const count = await prisma.card.count();
    const sample = await prisma.card.findFirst();
    
    return NextResponse.json({
      status: 'ok',
      cardCount: count,
      sampleCard: sample ? {
        id: sample.id,
        name: sample.name,
        set: sample.set,
        type: sample.type,
      } : null,
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
