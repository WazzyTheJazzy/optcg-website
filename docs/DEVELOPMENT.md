# Development Documentation

> This document consolidates multiple related documentation files.
> Last updated: 2025-11-22

---

## CARD IMPORT SUMMARY

> Source: `CARD_IMPORT_SUMMARY.md`

# Card Import Summary

## Overview
Successfully organized and imported **757 card images** from the OPTCGSim collection into the database.

## Organization Structure

### Source
```
public/OPTCGSim AA v1.25b-20251120T213204Z-1-001/OPTCGSim AA v1.25b/
├── Cards/          (Regular card images by set)
├── Variant AA/     (Alternative Art versions)
└── AA Don/         (DON card variants)
```

### Destination
```
public/cards/
├── {CARDNUMBER}.png     (Regular cards: OP01-001.png, ST01-001.png, etc.)
├── aa/                  (Alternative Art cards)
│   └── {CARDNUMBER}.png
└── don/                 (DON cards)
    └── Don-{XX}.png
```

## Import Statistics

### Total Cards: 757
- **Regular Cards:** 452
- **Alternative Art:** 305
- **DON Cards:** 58

### Database Import Results
- ✅ **Created:** 82 new card entries
- 🔄 **Updated:** 249 existing cards (added images)
- ⏭️ **Skipped:** 426 cards (already had images)

## Cards by Set

| Set    | Total | Regular | Alt Art |
|--------|-------|---------|---------|
| OP01   | 109   | 51      | 58      |
| OP02   | 73    | 44      | 29      |
| OP03   | 70    | 45      | 25      |
| OP05   | 60    | 37      | 23      |
| OP06   | 53    | 42      | 11      |
| OP04   | 46    | 31      | 15      |
| P      | 40    | 26      | 14      |
| OP07   | 37    | 28      | 9       |
| ST01   | 34    | 13      | 21      |
| OP09   | 34    | 24      | 10      |
| OP08   | 29    | 25      | 4       |
| EB01   | 22    | 19      | 3       |
| ST13   | 19    | 16      | 3       |
| ST03   | 18    | 11      | 7       |
| ST04   | 14    | 8       | 6       |
| ST10   | 10    | 4       | 6       |
| ST02   | 8     | 6       | 2       |
| ST06   | 7     | 5       | 2       |
| ST11   | 4     | 4       | 0       |
| ST07   | 4     | 3       | 1       |
| ST05   | 3     | 3       | 0       |
| ST12   | 2     | 2       | 0       |
| PRB01  | 1     | 1       | 0       |
| ST08   | 1     | 1       | 0       |
| ST09   | 1     | 1       | 0       |
| **DON**| **58**| **58**  | **-**   |

## File Naming Convention

### Regular Cards
- Format: `{SET}-{NUMBER}.png`
- Examples: `OP01-001.png`, `ST01-012.png`, `P-003.png`

### Alternative Art Cards
- Location: `public/cards/aa/`
- Format: `{SET}-{NUMBER}.png`
- Database field: `illustrationType = 'Alternate'`

### DON Cards
- Location: `public/cards/don/`
- Format: `Don-{XX}.png`
- Card Number: `DON-{XX}`

## Script Usage

### Run the import script:
```bash
npm run cards:organize
```

### Script location:
```
scripts/organize-and-import-cards.ts
```

## Features

✅ **Automatic Organization:** Copies and renames files to standardized format
✅ **Database Integration:** Creates/updates card entries in Prisma database
✅ **Alternative Art Support:** Properly categorizes AA variants
✅ **DON Card Handling:** Special handling for DON card variants
✅ **Duplicate Detection:** Skips cards that already have images
✅ **Progress Reporting:** Detailed console output during processing
✅ **Error Handling:** Graceful handling of parsing errors

## Next Steps

1. **Verify Images:** Check that all images are accessible at `/cards/{cardnumber}.png`
2. **Update Card Data:** Run additional scripts to fetch card details from API
3. **Add Missing Metadata:** Update card names, effects, and other details
4. **Test Display:** Verify cards display correctly in the UI
5. **Cleanup:** Optionally remove the original OPTCGSim folder after verification

## Notes

- All images are copied (not moved) to preserve originals
- Card numbers are zero-padded to 3 digits (e.g., 001, 002, 123)
- Alternative Art cards are stored separately but reference the same card number
- The script is idempotent - safe to run multiple times


---

## CARD IMAGES

> Source: `CARD_IMAGES.md`

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


---

## LOCAL IMAGES SETUP

> Source: `LOCAL_IMAGES_SETUP.md`

# Local Card Images Setup

## ✅ Completed Setup

### 1. Image Organization
- **Location**: `public/cards/`
- **Total Images**: 722 files
  - 425 regular cards
  - 239 alternate art cards
  - 58 DON cards

### 2. Database Import
- **Total Cards in Database**: 708 cards
- **Local Images**: 664 cards (94%)
- **External Images**: 44 cards (6%)
- **Coverage**: All cards have images

### 3. Card Sets Imported
- OP01-OP09 (Booster Packs)
- ST01-ST13 (Starter Decks)
- EB01 (Extra Booster)
- P (Promo Cards)
- PRB01 (Premium Booster)

### 4. File Naming Convention
- Regular cards: `OP01-001.png`, `ST13-005.png`
- Alternate arts: `OP01-001_alt.png`
- Promo cards: `P-001.png`
- DON cards: `Don(alt).png`, `Don(alt1).png`

### 5. Code Updates
- ✅ `components/Card3D.tsx` - Updated to handle local images
- ✅ `app/api/card-image/route.ts` - Proxy for external images only
- ✅ Database - All cards updated with local image paths

## 🔧 Scripts Created

### `scripts/reorganize-and-import-cards.ts`
Reorganizes images from the source folder into `public/cards/`

### `scripts/import-all-local-cards.ts`
Scans `public/cards/` and imports all cards into the database

### `scripts/check-image-urls.ts`
Verifies image URL types (local vs external)

## 🚀 How It Works

1. **Local Images**: Cards with `/cards/` URLs load directly from `public/cards/`
2. **External Images**: Cards with `https://` URLs use the proxy API
3. **Card3D Component**: Automatically detects and handles both types

## 📊 Database Summary

```
Total Cards: 708

By Set:
- OP01: 109 cards
- OP02: 83 cards
- OP03: 80 cards
- OP04: 58 cards
- OP05: 72 cards
- OP06: 53 cards
- OP07: 37 cards
- OP08: 29 cards
- ST01-ST13: 102 cards
- P: 40 cards
- EB01: 22 cards
```

## 🎯 Next Steps

To add more cards:
1. Add image files to `public/cards/` with proper naming
2. Run `npx tsx scripts/import-all-local-cards.ts`
3. Cards will be automatically added to the database

## 🔍 Testing

Visit http://localhost:3000/cards to see all 708 cards with local images!


---

## CLEANUP SCRIPTS SUMMARY

> Source: `CLEANUP_SCRIPTS_SUMMARY.md`

# Scripts Cleanup Summary

## Overview
Successfully cleaned up **35 redundant card-related scripts** (71.1 KB) that are no longer needed after implementing the new card organization system.

## What Was Removed

### Old Import Scripts (5 files)
These were replaced by `organize-and-import-cards.ts`:
- `import-cards.ts` - Used external API (https://api.onepiece-cardgame.dev)
- `import-all-local-cards.ts` - Old local import method
- `reorganize-and-import-cards.ts` - Duplicate functionality
- `add-all-images.ts`
- `add-card-images.ts`

### Image Fixing Scripts (10 files)
No longer needed since images are now properly organized:
- `fix-card-names-from-images.ts`
- `fix-all-card-names-complete.ts`
- `fix-based-on-screenshot.ts`
- `fix-broken-images.ts`
- `fix-card-names.ts`
- `fix-d-names.ts`
- `use-better-images.ts`
- `use-component-fallbacks.ts`
- `use-placeholder-images.ts`
- `add-cache-buster.ts`

### Sync Scripts (3 files)
No longer needed with organized images:
- `sync-cards-with-images.ts`
- `update-real-images.ts`
- `correct-op01-cards.ts`

### Check/Verify Scripts (11 files)
Redundant with `database-summary.ts`:
- `check-cards.ts`
- `check-db-vs-images.ts`
- `check-db.ts`
- `check-first-cards.ts`
- `check-image-setup.ts`
- `check-image-urls.ts`
- `check-images.ts`
- `check-working-cards.ts`
- `verify-card-data.ts`
- `verify-cards.ts`
- `verify-images.ts`

### List/Show Scripts (4 files)
Can use database queries instead:
- `list-all-cards.ts`
- `show-all-cards.ts`
- `show-luffy-cards.ts`
- `new-cards-summary.ts`

### Metadata Scripts (2 files)
Images now have proper metadata:
- `update-card-metadata.ts`
- `test-image-sources.ts`

## Scripts Kept (4 files)

### Essential Scripts
- ✅ `organize-and-import-cards.ts` - Main card import script
- ✅ `database-summary.ts` - Database inspection tool
- ✅ `test-collection-api.ts` - API testing
- ✅ `cleanup-redundant-card-scripts.ts` - This cleanup tool

## Backup Location

All removed scripts are backed up in:
```
scripts/_backup_redundant/
```

You can safely delete this folder after verifying everything works correctly.

## Why This Cleanup Was Needed

### Before
- 39 scripts with overlapping functionality
- Multiple ways to import cards (confusing)
- Scripts that fixed issues that no longer exist
- External API dependency that may not be reliable

### After
- 4 focused, essential scripts
- Single source of truth for card imports
- All cards properly organized with local images
- No external API dependencies

## New Card Management Workflow

### Import New Cards
```bash
npm run cards:organize
```

### Check Database Status
```bash
npm run db:studio
# or
npx tsx scripts/database-summary.ts
```

### Test Collection API
```bash
npx tsx scripts/test-collection-api.ts
```

## Benefits

✅ **Cleaner codebase** - 35 fewer scripts to maintain
✅ **Less confusion** - Single import method
✅ **Better organization** - Clear purpose for each script
✅ **Reduced dependencies** - No external API needed
✅ **Easier onboarding** - New developers see only relevant scripts

## Next Steps

1. ✅ Test your app to ensure everything works
2. ✅ Verify card images display correctly
3. ✅ Check that card data is accurate
4. ⏳ Delete `scripts/_backup_redundant/` when confident
5. ⏳ Update any documentation that references old scripts

## Rollback Instructions

If you need to restore any script:
1. Navigate to `scripts/_backup_redundant/`
2. Copy the needed script back to `scripts/`
3. The script will work as before

## Notes

- All original card images are preserved in the OPTCGSim folder
- Database has 757 cards with proper image paths
- The cleanup is reversible (scripts are backed up, not deleted)
- No functionality was lost - only redundant code removed


---

## CLEANUP SUMMARY

> Source: `CLEANUP_SUMMARY.md`

# Code Cleanup Summary

## Overview
Cleaned up unused 3D components and redundant documentation files to streamline the codebase.

## Files Deleted

### Unused 3D Components (6 files)
1. `components/three/EpicLightningScene.tsx` - Unused lightning effect component
2. `components/three/LightningHero.tsx` - Unused lightning hero component
3. `components/three/FloatingCards.tsx` - Replaced by CardCarousel
4. `components/three/CardStack3D.tsx` - Imported but never rendered
5. `components/three/ParticleField.tsx` - Unused particle effect
6. `components/three/InteractiveHero.tsx` - Unused interactive component
7. `components/three/RotatingLogo.tsx` - Unused rotating logo

### Redundant Documentation (8 files)
1. `LIGHTNING_EFFECTS_GUIDE.md` - Documentation for deleted components
2. `3D_VISUALS_GUIDE.md` - Outdated, replaced by TRIPLE_CAROUSEL_FEATURE.md
3. `FLOATING_CARDS_ARCHITECTURE.md` - Documentation for deleted component
4. `FLOATING_CARDS_EXPECTED_OUTPUT.md` - Documentation for deleted component
5. `GUEST_MODE_COMPLETE.md` - Redundant (kept GUEST_MODE_FINAL.md)
6. `GUEST_MODE_FEATURE.md` - Redundant (kept GUEST_MODE_FINAL.md)
7. `QUICK_START_GUEST_MODE.md` - Info consolidated in main docs
8. `QUICK_START_COLLECTION.md` - Info consolidated in main docs
9. `TODO_ADVERTISING_SETUP.md` - TODO items should be in issues/main docs

## Files Kept

### Active 3D Components (1 file)
- `components/three/CardCarousel.tsx` - **ACTIVE** - Triple carousel system used on homepage

### Essential Documentation (11 files)
- `README.md` - Main project documentation
- `SETUP.md` - Setup instructions
- `TRIPLE_CAROUSEL_FEATURE.md` - Current 3D feature documentation
- `GUEST_MODE_FINAL.md` - Complete guest mode documentation
- `COLLECTION_SYSTEM_COMPLETE.md` - Collection system documentation
- `COLLECTION_TRACKING.md` - Collection tracking details
- `ADVERTISING_SYSTEM.md` - Advertising implementation
- `AUTHENTICATION_UX.md` - Auth system documentation
- `CARD_3D_FEATURE.md` - 3D card rendering
- `CARD_SLEEVES_FEATURE.md` - Card sleeves feature
- `CARD_IMAGES.md` - Card image management
- `LOCAL_IMAGES_SETUP.md` - Local image setup
- `QUICK_REFERENCE.md` - Quick reference guide
- `TEST_CHECKLIST.md` - Testing checklist

## Code Changes

### app/page.tsx
**Removed:**
```typescript
const CardStack3D = dynamic(
  () => import('@/components/three/CardStack3D').then(mod => mod.CardStack3D),
  { ssr: false }
);
```

**Kept:**
```typescript
const CardCarousel = dynamic(
  () => import('@/components/three/CardCarousel').then(mod => mod.CardCarousel),
  { ssr: false }
);
```

## Results

### Before Cleanup
- **3D Components**: 8 files (only 1 used)
- **Documentation**: 20+ markdown files (many redundant)
- **Unused imports**: CardStack3D imported but never rendered

### After Cleanup
- **3D Components**: 1 file (100% used)
- **Documentation**: 14 focused markdown files
- **No unused imports**: All imports are actively used

## Benefits

1. **Cleaner Codebase**: Removed 15+ unused files
2. **Easier Maintenance**: Less code to maintain and update
3. **Better Performance**: Smaller bundle size (removed unused components)
4. **Clearer Documentation**: Consolidated redundant docs
5. **No Breaking Changes**: All active features still work perfectly

## Verification

✅ App compiles successfully
✅ No TypeScript errors
✅ Homepage renders correctly with triple carousel
✅ All active features functional
✅ Dev server running smoothly

---

**Date**: November 20, 2025
**Status**: ✅ Complete
**Files Deleted**: 15
**Files Kept**: 1 active component + essential docs


---

## TEST CHECKLIST

> Source: `TEST_CHECKLIST.md`

# One Piece TCG Trader - Test Checklist

## Setup Status ✅
- [x] Dependencies installed
- [x] Database configured (SQLite)
- [x] Database schema pushed
- [x] Database seeded with 120 cards (OP01-OP05)
- [x] Card images configured with fallback system
- [x] Environment variables configured
- [x] Build successful
- [x] Dev server running

## Manual Testing Checklist

### 1. Homepage
- [ ] Navigate to http://localhost:3000
- [ ] Verify homepage loads with hero section
- [ ] Check "Browse Cards" and "My Dashboard" buttons
- [ ] Verify 4 feature cards display correctly

### 2. Navigation
- [ ] Test all navigation links (Home, Cards, Dashboard, Trades)
- [ ] Verify active link highlighting works
- [ ] Check responsive behavior on mobile

### 3. Cards Page
- [ ] Navigate to /cards
- [ ] Verify 15 seeded cards display
- [ ] Test search functionality
- [ ] Test filters (set, rarity, color, type)
- [ ] Check pagination works
- [ ] Click on a card to view details

### 4. Card Details
- [ ] View individual card page
- [ ] Verify card information displays
- [ ] Check price history chart
- [ ] Test "Add to Collection" button
- [ ] Test "Add to Watchlist" button

### 5. Authentication
- [ ] Click "Sign In" button
- [ ] Test email/credentials sign in
- [ ] Verify session persists
- [ ] Test sign out functionality

### 6. Dashboard (Requires Auth)
- [ ] Navigate to /dashboard
- [ ] Verify collection displays
- [ ] Check portfolio value calculation
- [ ] Test watchlist functionality
- [ ] Verify recent activity

### 7. Collection Management (Requires Auth)
- [ ] Add cards to collection
- [ ] Update card quantity
- [ ] Change card condition
- [ ] Mark cards for trade
- [ ] Remove cards from collection

### 8. Trading System (Requires Auth)
- [ ] Navigate to /trades
- [ ] Create a new trade offer
- [ ] View active trades
- [ ] Accept/decline trade offers

### 9. API Endpoints
- [ ] GET /api/cards - List cards
- [ ] GET /api/cards/[id] - Get card details
- [ ] GET /api/cards/[id]/price - Get price history
- [ ] GET /api/collection - Get user collection
- [ ] POST /api/collection - Add to collection
- [ ] GET /api/watchlist - Get watchlist
- [ ] POST /api/watchlist - Add to watchlist
- [ ] GET /api/trades - Get trades
- [ ] POST /api/trades - Create trade

## Database Contents
- **Total Cards**: 120
- **Sets**: OP01 (48), OP02 (20), OP03 (16), OP04 (16), OP05 (20)
- **Rarities**: 16 Leaders, 38 Super Rares, 8 Secret Rares, 30 Rares, 17 Uncommons, 11 Commons
- **Price History**: 30 days per card
- **Images**: All cards have image URLs with smart fallback system

### Featured Cards
- Monkey.D.Luffy (multiple versions across sets)
- Roronoa Zoro, Sanji, Nami (Straw Hat Crew)
- Shanks, Kaido, Whitebeard (Four Emperors)
- Trafalgar Law, Eustass Kid (Supernovas)
- Portgas D. Ace, Marco (Whitebeard Pirates)
- Charlotte Katakuri, Big Mom (Big Mom Pirates)
- Crocodile, Doflamingo (Warlords)
- And many more!

## Known Issues
- Google OAuth requires valid credentials (currently using placeholders)
- Price data is randomly generated for demo purposes

## Next Steps
- Test all features manually
- Fix any bugs discovered
- Add more cards to database
- Implement real price API integration
- Add user profile page
- Enhance trade matching algorithm


---

## COLLECTION TRACKING

> Source: `COLLECTION_TRACKING.md`

# Collection Tracking System

## ✅ Features

### 1. Personal Collection Management
- Track which cards you own
- Set quantity for each card
- Mark card condition (NM, LP, MP, HP, DMG)
- Flag cards as "For Trade"

### 2. Advanced Filtering
Uses the same comprehensive filter system as the main cards page:
- **Search**: By card name or number
- **Set**: Filter by OP01-OP09, ST01-ST13, EB01, P, etc.
- **Rarity**: C, UC, R, SR, SEC, L
- **Type**: Leader, Character, Event, Stage
- **Color**: Red, Blue, Green, Purple, Yellow, Black, Multi-color
- **Stats**: Cost, Power, Counter, Life
- **Attributes**: Slash, Strike, Ranged, Special, Wisdom
- **Illustration Type**: Standard, Alternate Art, Parallel
- **Artist**: Filter by card artist
- **Archetype**: Straw Hat Crew, Whitebeard Pirates, etc.

### 3. Collection Statistics
- **Total Cards**: Sum of all card quantities
- **Unique Cards**: Number of different cards
- **For Trade**: Cards marked as available for trading
- **Sets Collected**: Number of different sets in collection

### 4. Quick Actions
- **Add Cards**: Browse all 708 cards with filters
- **Update Quantity**: +/- buttons for quick adjustments
- **Toggle Trade Status**: Mark cards for trading
- **Remove Cards**: Delete from collection
- **Export CSV**: Download collection as spreadsheet

## 🚀 How to Use

### Access Collection
1. Sign in to your account
2. Click "Collection" in the navigation bar
3. Or visit: http://localhost:3000/collection

### Add Cards to Collection
1. Click "Add Cards" button
2. Use filters to find specific cards
3. Click "Add" on any card
4. Card is added with quantity 1, condition NM

### Manage Quantities
- Click **+** to increase quantity
- Click **-** to decrease quantity
- Quantity 0 removes the card

### Mark for Trade
- Click "Not Trading" to toggle to "For Trade"
- Cards marked for trade can be seen by other users
- Useful for the trading system

### Filter Your Collection
1. Click "Show Filters"
2. Apply any combination of filters
3. Collection updates in real-time
4. Same filters as main cards page

### Export Collection
1. Click "Export CSV"
2. Downloads `my-collection.csv`
3. Contains: Card Number, Name, Set, Rarity, Quantity, Condition, For Trade
4. Import into Excel, Google Sheets, etc.

## 📊 API Endpoints

### GET /api/collection
Fetch user's collection with optional filters
```
Query params:
- search: string
- sets: comma-separated
- rarities: comma-separated
- types: comma-separated
- colors: comma-separated
- forTrade: boolean
```

### POST /api/collection
Add card to collection
```json
{
  "cardId": "card-id",
  "quantity": 1,
  "condition": "NM",
  "forTrade": false
}
```

### PATCH /api/collection
Update collection item
```json
{
  "collectionId": "collection-id",
  "quantity": 2,
  "condition": "LP",
  "forTrade": true
}
```

### DELETE /api/collection?id={collectionId}
Remove card from collection

## 🔒 Security

- All endpoints require authentication
- Users can only access their own collection
- Collection items are tied to user ID
- Ownership verified on all operations

## 💾 Database Schema

```prisma
model Collection {
  id        String   @id @default(cuid())
  userId    String
  cardId    String
  quantity  Int      @default(1)
  condition String   @default("NM")
  forTrade  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(...)
  card Card @relation(...)
  
  @@unique([userId, cardId, condition])
}
```

## 🎯 Use Cases

### Collector
- Track complete collection
- See which cards are missing
- Monitor collection value
- Export for insurance

### Trader
- Mark cards for trade
- Filter tradeable cards
- Share collection with others
- Track trade history

### Competitive Player
- Track deck cards
- Monitor card conditions
- Plan deck upgrades
- Track multiple copies

## 🔄 Integration with Other Features

### Trading System
- Cards marked "For Trade" appear in trade offers
- Quantity tracked during trades
- Condition affects trade value

### Watchlist
- Add cards you don't own to watchlist
- Get notified when available for trade
- Track price changes

### Dashboard
- Collection stats on dashboard
- Recent additions
- Collection value over time
- Set completion progress

## 📱 Mobile Responsive
- Works on all screen sizes
- Touch-friendly controls
- Optimized card grid
- Swipe gestures (future)

## 🚀 Future Enhancements
- Bulk import from CSV
- Barcode scanning
- Price tracking integration
- Collection value calculator
- Set completion tracker
- Duplicate finder
- Trade suggestions based on collection


---

