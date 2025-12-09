import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CardDefinition, CardCategory, Color } from '@/lib/game-engine/core/types';
import { EffectParser } from '@/lib/game-engine/effects/EffectParser';

// Use global prisma instance to avoid too many connections
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Create effect parser instance
const effectParser = new EffectParser();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const set = searchParams.get('set');
    const limit = parseInt(searchParams.get('limit') || '200');

    console.log('🎮 Game cards API called:', { set, limit });

    // Build query
    const where: any = {
      // Exclude DON cards and alternate art cards for deck building
      type: { not: 'DON' },
      cardNumber: { not: { contains: '_alt' } }
    };

    if (set) {
      where.set = { contains: set };
    }

    console.log('📊 Querying database with:', where);

    // Fetch cards from database
    const dbCards = await prisma.card.findMany({
      where,
      take: limit,
      orderBy: { cardNumber: 'asc' }
    });

    console.log(`✅ Found ${dbCards.length} cards`);

    // Transform to CardDefinition format
    const cards: CardDefinition[] = dbCards.map(card => {
      // Map type to category
      let category: CardCategory;
      switch (card.type) {
        case 'Leader':
          category = CardCategory.LEADER;
          break;
        case 'Character':
          category = CardCategory.CHARACTER;
          break;
        case 'Event':
          category = CardCategory.EVENT;
          break;
        case 'Stage':
          category = CardCategory.STAGE;
          break;
        default:
          category = CardCategory.CHARACTER;
      }

      // Map color string to Color enum
      const colors: Color[] = [];
      if (card.color && card.color !== 'Unknown') {
        const colorMap: Record<string, Color> = {
          'Red': Color.RED,
          'Green': Color.GREEN,
          'Blue': Color.BLUE,
          'Purple': Color.PURPLE,
          'Black': Color.BLACK,
          'Yellow': Color.YELLOW,
        };
        const mappedColor = colorMap[card.color];
        if (mappedColor) {
          colors.push(mappedColor);
        }
      }

      // Proxy external images through our API to avoid CORS issues
      let imageUrl = card.imageUrl || '/cards/placeholder.png';
      if (imageUrl.startsWith('http')) {
        imageUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      }

      // Parse effects from effect text
      let effects: any[] = [];
      let keywords: string[] = [];
      
      if (card.effect && card.effect.trim() !== '') {
        try {
          effects = effectParser.parseEffectText(card.effect, card.cardNumber);
          
          // Extract keywords from effect text
          const effectLower = card.effect.toLowerCase();
          if (effectLower.includes('[rush]')) {
            keywords.push('Rush');
          }
          if (effectLower.includes('[blocker]')) {
            keywords.push('Blocker');
          }
          if (effectLower.includes('[double attack]')) {
            keywords.push('Double Attack');
          }
          if (effectLower.includes('[banish]')) {
            keywords.push('Banish');
          }
          
          // Validate parsed effects
          for (const effect of effects) {
            if (!effect.id || !effect.sourceCardId || !effect.effectType) {
              console.warn(`Invalid effect definition for card ${card.cardNumber}:`, effect);
            }
          }
        } catch (error) {
          console.error(`Failed to parse effects for card ${card.cardNumber}:`, error);
          // Continue with empty effects array - don't fail the entire card load
        }
      }

      return {
        id: card.cardNumber,
        name: card.name,
        category,
        colors,
        typeTags: card.category ? card.category.split('/').map(t => t.trim()) : [],
        attributes: card.attribute ? [card.attribute] : [],
        basePower: card.power ?? 0,
        baseCost: card.cost ?? 0,
        lifeValue: card.life,
        counterValue: card.counter,
        rarity: card.rarity || 'C',
        keywords,
        effects,
        imageUrl,
        metadata: {
          setCode: card.set || 'Unknown',
          cardNumber: card.cardNumber,
          isAltArt: false,
          isPromo: card.set?.includes('P') || false,
        },
      };
    });

    console.log(`🎴 Returning ${cards.length} transformed cards`);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error('❌ Error fetching cards:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch cards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Don't disconnect in development to reuse connection
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
}
