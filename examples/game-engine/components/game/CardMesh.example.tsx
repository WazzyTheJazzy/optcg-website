/**
 * CardMesh.example.tsx
 * 
 * Example usage of the CardMesh component showing various card states,
 * zones, and interaction patterns.
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CardMesh, CardZoneRenderer } from '@/components/game/CardMesh';
import { CardVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { CardState, ZoneId, CardCategory } from '@/lib/game-engine/core/types';

/**
 * Example 1: Single Active Character Card
 */
export function Example1_SingleActiveCard() {
  const cardState: CardVisualState = {
    id: 'card-1',
    position: { zone: ZoneId.CHARACTER_AREA, index: 0 },
    state: CardState.ACTIVE,
    power: 5000,
    cost: 4,
    givenDonCount: 0,
    metadata: {
      isAltArt: false,
      isPromo: false,
      isLeader: false,
      rarity: 'R',
      colors: ['Red'],
      category: CardCategory.CHARACTER,
      name: 'Monkey D. Luffy',
      imageUrl: '/cards/op01-001.png',
    },
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        
        <CardMesh
          cardState={cardState}
          zonePosition={[0, 0, 0]}
          zoneRotation={[0, 0, 0]}
          indexInZone={0}
          totalCards={1}
          spacing={0}
          stackOffset={0}
          onInteract={(cardId, action) => {
            console.log(`Card ${cardId}: ${action}`);
          }}
        />
      </Canvas>
    </div>
  );
}

/**
 * Example 2: Rested Character with DON
 */
export function Example2_RestedCardWithDon() {
  const cardState: CardVisualState = {
    id: 'card-2',
    position: { zone: ZoneId.CHARACTER_AREA, index: 0 },
    state: CardState.RESTED, // Card is rested (90° rotation)
    power: 7000, // Base 5000 + 2000 from DON
    cost: 4,
    givenDonCount: 2, // Has 2 DON attached
    metadata: {
      isAltArt: false,
      isPromo: false,
      isLeader: false,
      rarity: 'SR',
      colors: ['Red'],
      category: CardCategory.CHARACTER,
      name: 'Roronoa Zoro',
      imageUrl: '/cards/op01-025.png',
    },
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        
        <CardMesh
          cardState={cardState}
          zonePosition={[0, 0, 0]}
          zoneRotation={[0, 0, 0]}
          indexInZone={0}
          totalCards={1}
          spacing={0}
          stackOffset={0}
        />
      </Canvas>
    </div>
  );
}

/**
 * Example 3: Leader Card (Alt Art)
 */
export function Example3_LeaderAltArt() {
  const cardState: CardVisualState = {
    id: 'leader-1',
    position: { zone: ZoneId.LEADER_AREA, index: 0 },
    state: CardState.ACTIVE,
    power: 5000,
    cost: 0,
    givenDonCount: 1,
    metadata: {
      isAltArt: true, // Alt art gets cyan ring
      isPromo: false,
      isLeader: true,
      rarity: 'L',
      colors: ['Red'],
      category: CardCategory.LEADER,
      name: 'Monkey D. Luffy (Alt Art)',
      imageUrl: '/cards/op01-001-alt.png',
    },
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        
        <CardMesh
          cardState={cardState}
          zonePosition={[0, 0, 0]}
          zoneRotation={[0, 0, 0]}
          indexInZone={0}
          totalCards={1}
          spacing={0}
          stackOffset={0}
        />
      </Canvas>
    </div>
  );
}

/**
 * Example 4: Promo Card
 */
export function Example4_PromoCard() {
  const cardState: CardVisualState = {
    id: 'promo-1',
    position: { zone: ZoneId.CHARACTER_AREA, index: 0 },
    state: CardState.ACTIVE,
    power: 4000,
    cost: 3,
    givenDonCount: 0,
    metadata: {
      isAltArt: false,
      isPromo: true, // Promo gets gold ring
      isLeader: false,
      rarity: 'P',
      colors: ['Blue'],
      category: CardCategory.CHARACTER,
      name: 'Nami (Promo)',
      imageUrl: '/cards/promo-001.png',
    },
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        
        <CardMesh
          cardState={cardState}
          zonePosition={[0, 0, 0]}
          zoneRotation={[0, 0, 0]}
          indexInZone={0}
          totalCards={1}
          spacing={0}
          stackOffset={0}
        />
      </Canvas>
    </div>
  );
}

/**
 * Example 5: Hand of Cards (Spread Layout)
 */
export function Example5_HandSpread() {
  const handCards: CardVisualState[] = [
    {
      id: 'hand-1',
      position: { zone: ZoneId.HAND, index: 0 },
      state: CardState.ACTIVE,
      power: 3000,
      cost: 2,
      givenDonCount: 0,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'C',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: 'Card 1',
        imageUrl: '/cards/op01-001.png',
      },
    },
    {
      id: 'hand-2',
      position: { zone: ZoneId.HAND, index: 1 },
      state: CardState.ACTIVE,
      power: 4000,
      cost: 3,
      givenDonCount: 0,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'UC',
        colors: ['Blue'],
        category: CardCategory.CHARACTER,
        name: 'Card 2',
        imageUrl: '/cards/op01-002.png',
      },
    },
    {
      id: 'hand-3',
      position: { zone: ZoneId.HAND, index: 2 },
      state: CardState.ACTIVE,
      power: 5000,
      cost: 4,
      givenDonCount: 0,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Green'],
        category: CardCategory.CHARACTER,
        name: 'Card 3',
        imageUrl: '/cards/op01-003.png',
      },
    },
  ];

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        
        <CardZoneRenderer
          cards={handCards}
          zonePosition={[0, 0, 0]}
          zoneRotation={[0, 0, 0]}
          spacing={1.5} // Cards spread horizontally
          stackOffset={0}
          onCardInteract={(cardId, action) => {
            console.log(`Card ${cardId}: ${action}`);
          }}
        />
      </Canvas>
    </div>
  );
}

/**
 * Example 6: Deck (Stacked Layout)
 */
export function Example6_DeckStack() {
  // Create 10 cards for the deck
  const deckCards: CardVisualState[] = Array.from({ length: 10 }, (_, i) => ({
    id: `deck-${i}`,
    position: { zone: ZoneId.DECK, index: i },
    state: CardState.NONE,
    power: 0,
    cost: 0,
    givenDonCount: 0,
    metadata: {
      isAltArt: false,
      isPromo: false,
      isLeader: false,
      rarity: 'C',
      colors: ['Red'],
      category: CardCategory.CHARACTER,
      name: `Deck Card ${i}`,
      imageUrl: '/cards/card-back.png',
    },
  }));

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        
        <CardZoneRenderer
          cards={deckCards}
          zonePosition={[0, 0, 0]}
          zoneRotation={[0, 0, 0]}
          spacing={0}
          stackOffset={0.01} // Small vertical offset creates stack effect
        />
      </Canvas>
    </div>
  );
}

/**
 * Example 7: Character Area (Multiple Cards)
 */
export function Example7_CharacterArea() {
  const characterCards: CardVisualState[] = [
    {
      id: 'char-1',
      position: { zone: ZoneId.CHARACTER_AREA, index: 0 },
      state: CardState.ACTIVE,
      power: 5000,
      cost: 4,
      givenDonCount: 1,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: 'Luffy',
        imageUrl: '/cards/op01-001.png',
      },
    },
    {
      id: 'char-2',
      position: { zone: ZoneId.CHARACTER_AREA, index: 1 },
      state: CardState.RESTED,
      power: 6000,
      cost: 4,
      givenDonCount: 2,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'SR',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: 'Zoro',
        imageUrl: '/cards/op01-025.png',
      },
    },
    {
      id: 'char-3',
      position: { zone: ZoneId.CHARACTER_AREA, index: 2 },
      state: CardState.ACTIVE,
      power: 4000,
      cost: 3,
      givenDonCount: 0,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: 'Sanji',
        imageUrl: '/cards/op01-013.png',
      },
    },
  ];

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        
        <CardZoneRenderer
          cards={characterCards}
          zonePosition={[0, 0, 0]}
          zoneRotation={[0, 0, 0]}
          spacing={2} // Wide spacing for character area
          stackOffset={0}
          onCardInteract={(cardId, action) => {
            if (action === 'click') {
              console.log(`Selected character: ${cardId}`);
            }
          }}
        />
      </Canvas>
    </div>
  );
}

/**
 * Example 8: Interactive Card Selection
 */
export function Example8_InteractiveSelection() {
  const [selectedCard, setSelectedCard] = React.useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  const cards: CardVisualState[] = [
    {
      id: 'interactive-1',
      position: { zone: ZoneId.CHARACTER_AREA, index: 0 },
      state: CardState.ACTIVE,
      power: 5000,
      cost: 4,
      givenDonCount: 0,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: 'Card 1',
        imageUrl: '/cards/op01-001.png',
      },
    },
    {
      id: 'interactive-2',
      position: { zone: ZoneId.CHARACTER_AREA, index: 1 },
      state: CardState.ACTIVE,
      power: 4000,
      cost: 3,
      givenDonCount: 0,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Blue'],
        category: CardCategory.CHARACTER,
        name: 'Card 2',
        imageUrl: '/cards/op01-002.png',
      },
    },
  ];

  const handleCardInteract = (cardId: string, action: string) => {
    switch (action) {
      case 'click':
        setSelectedCard(cardId === selectedCard ? null : cardId);
        break;
      case 'hover':
        setHoveredCard(cardId);
        break;
      case 'unhover':
        setHoveredCard(null);
        break;
    }
  };

  return (
    <div>
      <div style={{ width: '100%', height: '400px' }}>
        <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <OrbitControls />
          
          <CardZoneRenderer
            cards={cards}
            zonePosition={[0, 0, 0]}
            zoneRotation={[0, 0, 0]}
            spacing={2}
            stackOffset={0}
            onCardInteract={handleCardInteract}
          />
        </Canvas>
      </div>
      
      <div style={{ padding: '20px' }}>
        <p>Selected Card: {selectedCard || 'None'}</p>
        <p>Hovered Card: {hoveredCard || 'None'}</p>
      </div>
    </div>
  );
}
