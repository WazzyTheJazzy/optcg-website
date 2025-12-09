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
