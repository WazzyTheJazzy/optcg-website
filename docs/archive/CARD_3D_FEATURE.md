# 3D Card Viewer Feature

## Overview
Interactive 3D card viewer using Three.js that allows users to rotate and inspect One Piece TCG cards in 3D space.

## Features

### 3D View Toggle
- Toggle button in the cards page header to switch between 2D grid and 3D view
- Icon changes based on current view mode

### Interactive 3D Card
- **Rotate**: Click and drag to rotate the card in any direction
- **Zoom**: Scroll to zoom in/out (min: 3 units, max: 8 units)
- **Auto-rotate on hover**: Card slowly rotates when mouse hovers over it
- **Card back**: Flip the card to see the official One Piece TCG card back

### Card Selection
- Grid of thumbnail cards below the 3D viewer
- Click any card to view it in 3D
- Selected card is highlighted with a red ring
- Card details (name, number, set, rarity, price) displayed above 3D viewer

## Technical Details

### Libraries Used
- **three**: Core 3D rendering library
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers and abstractions

### Components

#### Card3D Component (`components/Card3D.tsx`)
- Renders a 3D card mesh with proper textures
- Front face: Card image from database
- Back face: Official One Piece TCG card back
- Lighting: Ambient + spotlight + point light for realistic appearance
- Shadows enabled for depth perception

#### Cards Page (`app/cards/page.tsx`)
- View toggle button
- 3D viewer section (when enabled)
- Card selection grid
- Maintains all existing filters and search functionality

### Card Dimensions
- Width: 2.5 units
- Height: 3.5 units (standard TCG card ratio)
- Depth: 0.02 units (thin card)

### Textures
- Front: Card image from `https://en.onepiece-cardgame.com/images/cardlist/card/[CARD-NUMBER].png`
- Back: `https://en.onepiece-cardgame.com/images/cardlist/card/cardback.png`
- Fallback: Rarity-based colored material if texture fails to load

### Performance
- Dynamic import with SSR disabled for client-side only rendering
- Loading state while Three.js initializes
- Lazy texture loading

## Usage

1. Navigate to the Cards page (`/cards`)
2. Click the "3D View" button in the top-right corner
3. Select a card from the grid below
4. Interact with the 3D card:
   - Click and drag to rotate
   - Scroll to zoom
   - Hover for auto-rotation effect

## Future Enhancements

- [ ] Add card flip animation
- [ ] Multiple cards displayed in 3D space
- [ ] Card comparison mode (side-by-side 3D cards)
- [ ] VR/AR support
- [ ] Custom backgrounds/environments
- [ ] Card holographic effects for rare cards
- [ ] Touch gestures for mobile devices
- [ ] Keyboard controls (arrow keys for rotation)
