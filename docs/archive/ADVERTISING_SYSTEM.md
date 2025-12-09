# Advertising System Documentation

## Overview
The One Piece TCG Trader platform includes a comprehensive advertising system designed to maximize revenue while maintaining excellent user experience.

## Ad Placement Strategy

### 1. Homepage
- **Top Banner** (728x90 or responsive)
  - Above the fold, high visibility
  - Slot: `home-top-banner`
- **Bottom Banner** (728x90 or responsive)
  - After feature cards
  - Slot: `home-bottom-banner`

### 2. Cards Browse Page
- **Top Banner** (728x90 or responsive)
  - Below header, above search
  - Slot: `cards-top-banner`
- **Left Sidebar** (160x600 + 160x160)
  - Sticky, visible on desktop
  - High engagement area
- **Right Sidebar** (160x600 + 160x160)
  - Sticky, visible on desktop
  - Complements left sidebar
- **In-Feed Ads** (Responsive)
  - Every 8 cards in the grid
  - Native-looking, less intrusive
  - Slots: `cards-feed-1`, `cards-feed-2`, etc.
- **Bottom Banner** (728x90 or responsive)
  - After card grid
  - Slot: `cards-bottom-banner`

### 3. Individual Card Page
- **Top Banner** (728x90)
- **Sidebar Ads** (300x250)
- **Related Cards Section** (In-feed ads)

### 4. Dashboard
- **Top Banner** (728x90)
- **Sidebar Ads** (300x250)

### 5. Trade Marketplace
- **Top Banner** (728x90)
- **In-Feed Ads** (Between trade listings)

## Ad Networks Supported

### Google AdSense (Recommended)
```tsx
// Add to app/layout.tsx <head>
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
  crossOrigin="anonymous"
/>
```

### Implementation Steps:
1. Sign up for Google AdSense
2. Get your publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
3. Update `components/ads/AdBanner.tsx` with your publisher ID
4. Uncomment the AdSense code in AdBanner component
5. Replace placeholder divs with actual ad units

### Alternative Networks
- **Media.net** - Good for contextual ads
- **PropellerAds** - Pop-unders and native ads
- **Ezoic** - AI-powered ad optimization
- **Direct Sponsors** - TCG shops, card sellers

## Ad Formats

### Banner Ads
- **Leaderboard**: 728x90 (Desktop)
- **Mobile Banner**: 320x50 (Mobile)
- **Large Rectangle**: 336x280
- **Medium Rectangle**: 300x250

### Sidebar Ads
- **Wide Skyscraper**: 160x600
- **Square**: 160x160

### Responsive Ads
- Automatically adjust to container size
- Best for mobile optimization

## Revenue Optimization Tips

### 1. Ad Placement Best Practices
- ✓ Place ads above the fold for higher viewability
- ✓ Use sticky sidebars for longer engagement
- ✓ In-feed ads blend naturally with content
- ✗ Don't overload pages with too many ads
- ✗ Avoid placing ads too close together

### 2. Ad Density
- **Homepage**: 2 ad units (low density, good UX)
- **Cards Page**: 5-7 ad units (medium density)
- **Individual Card**: 3-4 ad units (focused content)

### 3. Mobile Optimization
- Sidebars hidden on mobile (< 1024px)
- Responsive banners adapt to screen size
- In-feed ads work great on mobile

### 4. A/B Testing
Test different:
- Ad positions
- Ad sizes
- Ad networks
- Ad density

## Performance Metrics

### Key Metrics to Track
- **CPM** (Cost Per Mille): Revenue per 1000 impressions
- **CTR** (Click-Through Rate): Percentage of ad clicks
- **Viewability**: Percentage of ads actually seen
- **Page RPM**: Revenue per 1000 page views

### Expected Revenue (Estimates)
- **Low Traffic** (1K daily visitors): $50-150/month
- **Medium Traffic** (10K daily visitors): $500-1500/month
- **High Traffic** (100K daily visitors): $5K-15K/month

*Actual revenue depends on niche, geography, ad network, and optimization*

## Implementation Checklist

### Phase 1: Setup (Current)
- [x] Create ad component structure
- [x] Add placeholder ads to pages
- [x] Implement responsive design
- [ ] Sign up for ad network
- [ ] Get publisher ID

### Phase 2: Integration
- [ ] Add ad network script to layout
- [ ] Update AdBanner with real ad code
- [ ] Test ads on staging environment
- [ ] Verify ad display on all pages
- [ ] Check mobile responsiveness

### Phase 3: Optimization
- [ ] Set up analytics tracking
- [ ] Monitor ad performance
- [ ] A/B test ad placements
- [ ] Optimize for higher CPM
- [ ] Add more ad units if needed

### Phase 4: Scaling
- [ ] Implement header bidding
- [ ] Add multiple ad networks
- [ ] Use ad mediation platform
- [ ] Negotiate direct deals
- [ ] Implement video ads

## Compliance & Best Practices

### Ad Policy Compliance
- ✓ Clearly label ads as "Advertisement" or "Sponsored"
- ✓ Don't place ads on error pages
- ✓ Ensure ads don't interfere with navigation
- ✓ Follow ad network policies strictly
- ✓ Implement GDPR/CCPA consent if needed

### User Experience
- Keep page load time under 3 seconds
- Ensure ads don't cause layout shifts
- Make sure content is still accessible
- Provide ad-free option for premium users (future)

## Files Structure

```
components/ads/
├── AdBanner.tsx       # Main banner ad component
├── AdSidebar.tsx      # Sticky sidebar ads
└── AdInFeed.tsx       # Native in-feed ads

app/
├── page.tsx           # Homepage with ads
├── cards/page.tsx     # Cards page with ads
└── layout.tsx         # Add ad network scripts here
```

## Future Enhancements

- [ ] Ad blocker detection
- [ ] Premium ad-free subscription
- [ ] Sponsored card listings
- [ ] Affiliate links for card purchases
- [ ] Email newsletter ads
- [ ] Video ads for high-value content
- [ ] Native advertising partnerships

## Support & Resources

- [Google AdSense Help](https://support.google.com/adsense)
- [Ad Placement Guide](https://support.google.com/adsense/answer/1354736)
- [Ad Optimization Tips](https://support.google.com/adsense/answer/17957)

## Contact

For questions about the advertising system, contact the development team.
