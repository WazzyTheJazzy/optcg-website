# Card Images System

## Overview
All 120 cards in the database now have image URLs configured. The system uses a smart fallback approach to ensure cards always display properly.

## Image Sources

### Primary Source (Currently Used)
**Limitless TCG CDN** (Most Reliable)
- Pattern: `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/[SET]/[SET]_[NUM]_EN.webp`
- Example: `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01_001_EN.webp`
- Format: WebP (optimized for web)
- Coverage: OP01-OP05 and beyond

### Alternative Sources
1. **Official One Piece Card Game Website**
   - Pattern: `https://en.onepiece-cardgame.com/images/cardlist/card/[CARD_NUMBER].png`
   - Note: May have CORS restrictions

2. **Community Databases**
   - One Piece Card Game Dev
   - Grand Line TCG

### Fallback System
If the primary image fails to load, the `CardImage` component automatically displays a styled fallback with:
- Gradient background based on card rarity
- Card number and name
- Rarity badge
- Color-coded by rarity:
  - **Leader (L)**: Gold gradient
  - **Secret Rare (SEC)**: Red gradient
  - **Super Rare (SR)**: Orange gradient
  - **Rare (R)**: Purple gradient
  - **Uncommon (UC)**: Gray gradient
  - **Common (C)**: Light gray gradient

## CardImage Component

Located at: `components/CardImage.tsx`

### Features
- Automatic image loading with error handling
- Smooth loading transitions
- Styled fallback cards
- Lazy loading support (except priority images)
- Responsive design

### Usage

```tsx
import { CardImage } from '@/components/CardImage'

<CardImage
  cardNumber="OP01-001"
  name="Monkey.D.Luffy"
  rarity="L"
  imageUrl={card.imageUrl}
  className="w-full h-full"
  priority={false} // Set to true for above-the-fold images
/>
```

## Database Status

- **Total Cards**: 120
- **Cards with Images**: 120 (100%)
- **Sets Covered**: OP01, OP02, OP03, OP04, OP05

## Adding Real Card Images

### Option 1: Update Individual Cards
```typescript
await prisma.card.update({
  where: { cardNumber: 'OP01-001' },
  data: { imageUrl: 'https://your-cdn.com/OP01-001.jpg' }
})
```

### Option 2: Bulk Update via Script
Use the provided scripts:
- `scripts/add-card-images.ts` - Adds placeholder images
- `scripts/update-real-images.ts` - Updates with real image URLs

### Option 3: Use External API
Integrate with a One Piece TCG API that provides card images:
```typescript
const response = await fetch('https://api.onepiece-tcg.com/cards')
const cards = await response.json()
// Update database with real image URLs
```

## Image Hosting Recommendations

For production, consider:

1. **Self-Hosted CDN**
   - Upload card images to your own CDN
   - Use services like Cloudinary, AWS S3, or Vercel Blob

2. **Community APIs**
   - One Piece Card Game Database API
   - TCGPlayer API
   - Scryfall-style API for One Piece TCG

3. **Image Optimization**
   - Use Next.js Image component for automatic optimization
   - Implement responsive images with srcset
   - Add WebP format support

## Testing Images

Visit the cards page to see all images:
- http://localhost:3000/cards

The fallback system ensures all cards display beautifully even if external images are unavailable.

## Future Improvements

- [ ] Implement image caching
- [ ] Add multiple image sizes (thumbnail, medium, full)
- [ ] Support for alternate art versions
- [ ] Image zoom/lightbox functionality
- [ ] Bulk image upload interface
- [ ] Integration with official One Piece TCG API
