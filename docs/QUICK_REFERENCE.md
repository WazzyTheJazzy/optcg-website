# Quick Reference Guide

## 📁 Project Structure

```
public/
  cards/                    # All card images (722 files)
    OP01-001.png           # Regular cards
    OP01-001_alt.png       # Alternate arts
    Don(alt).png           # DON cards

scripts/
  import-all-local-cards.ts      # Import images to database
  update-card-metadata.ts        # Update card details
  new-cards-summary.ts           # View import summary
  check-image-urls.ts            # Verify image paths
  database-summary.ts            # Full database stats
```

## 🚀 Common Commands

### View Database Stats
```bash
npx tsx scripts/database-summary.ts
```

### Import New Cards
1. Add images to `public/cards/`
2. Run:
```bash
npx tsx scripts/import-all-local-cards.ts
```

### Update Card Details
1. Edit `scripts/update-card-metadata.ts`
2. Add card data to the `cardUpdates` array
3. Run:
```bash
npx tsx scripts/update-card-metadata.ts
```

### Check Image Coverage
```bash
npx tsx scripts/check-image-urls.ts
```

### View New Cards Summary
```bash
npx tsx scripts/new-cards-summary.ts
```

## 📊 Current Stats

- **Total Cards**: 708
- **Local Images**: 664 (94%)
- **Sets**: OP01-OP09, ST01-ST13, EB01, P, PRB01
- **Alternate Arts**: 239 cards

## 🌐 URLs

- **Cards Page**: http://localhost:3000/cards
- **Home Page**: http://localhost:3000
- **API**: http://localhost:3000/api/cards

## 🎨 Card Types

- **Regular**: Standard cards with full stats
- **Alternate Art**: Special illustrations (marked with `_alt`)
- **Leaders**: Cards with `life` stat
- **DON Cards**: Energy cards for gameplay

## 🔧 Troubleshooting

### Images not showing?
1. Check image exists in `public/cards/`
2. Verify database has correct path: `npx tsx scripts/check-image-urls.ts`
3. Clear browser cache

### Need to re-import?
```bash
npx tsx scripts/import-all-local-cards.ts
```
(Safe to run multiple times - updates existing cards)

### Add missing card info?
Use `scripts/update-card-metadata.ts` to add names, effects, stats, etc.
