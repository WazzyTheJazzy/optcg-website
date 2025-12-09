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
