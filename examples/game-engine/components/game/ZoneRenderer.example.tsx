/**
 * ZoneRenderer.example.tsx
 * 
 * Example usage of the ZoneRenderer component for rendering game zones
 * with different layout types and configurations.
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  ZoneRenderer,
  ZoneLayoutType,
  PlayerZonesRenderer,
} from '@/components/game/ZoneRenderer';
import { PlayerId, ZoneId, CardState, CardCategory } from '@/lib/game-engine/core/types';
import { CardVisualState, DonVisualState } from '@/lib/game-engine/rendering/RenderingInterface';

// ============================================================================
// Example 1: Single Zone with Stack Layout (Deck)
// ============================================================================

export function Example1_DeckZone() {
  // Create mock cards for the deck
  const deckCards: CardVisualState[] = Array.from({ length: 40 }, (_, i) => ({
    id: `deck-card-${i}`,
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
      name: `Card ${i}`,
      imageUrl: '/cards/card-back.png',
    },
  }));

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />

        <ZoneRenderer
          playerId={PlayerId.PLAYER_1}
          zoneId={ZoneId.DECK}
          cards={deckCards}
          position={[-8, 0, -6]}
          rotation={[0, 0, 0]}
          layout={ZoneLayoutType.STACK}
          onCardClick={(cardId) => console.log('Deck card clicked:', cardId)}
          onZoneClick={(playerId, zoneId) => console.log('Deck zone clicked:', playerId, zoneId)}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color="#1a472a" />
        </mesh>
      </Canvas>
    </div>
  );
}

// ============================================================================
// Example 2: Hand Zone with Fan Layout
// ============================================================================

export function Example2_HandZone() {
  // Create mock cards for the hand
  const handCards: CardVisualState[] = Array.from({ length: 7 }, (_, i) => ({
    id: `hand-card-${i}`,
    position: { zone: ZoneId.HAND, index: i },
    state: CardState.ACTIVE,
    power: 4000 + i * 1000,
    cost: 3 + i,
    givenDonCount: 0,
    metadata: {
      isAltArt: i === 3,
      isPromo: i === 5,
      isLeader: false,
      rarity: i % 2 === 0 ? 'R' : 'C',
      colors: ['Red', 'Blue'][i % 2] ? ['Red'] : ['Blue'],
      category: CardCategory.CHARACTER,
      name: `Character ${i}`,
      imageUrl: '/cards/placeholder.png',
    },
  }));

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />

        <ZoneRenderer
          playerId={PlayerId.PLAYER_1}
          zoneId={ZoneId.HAND}
          cards={handCards}
          position={[0, 0, -8]}
          rotation={[0, 0, 0]}
          layout={ZoneLayoutType.FAN}
          onCardClick={(cardId) => console.log('Hand card clicked:', cardId)}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color="#1a472a" />
        </mesh>
      </Canvas>
    </div>
  );
}

// ============================================================================
// Example 3: Character Area with Grid Layout
// ============================================================================

export function Example3_CharacterArea() {
  // Create mock characters on the field
  const characters: CardVisualState[] = [
    {
      id: 'char-1',
      position: { zone: ZoneId.CHARACTER_AREA, index: 0 },
      state: CardState.ACTIVE,
      power: 5000,
      cost: 4,
      givenDonCount: 2,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'SR',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: 'Luffy',
        imageUrl: '/cards/luffy.png',
      },
    },
    {
      id: 'char-2',
      position: { zone: ZoneId.CHARACTER_AREA, index: 1 },
      state: CardState.RESTED,
      power: 4000,
      cost: 3,
      givenDonCount: 1,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Blue'],
        category: CardCategory.CHARACTER,
        name: 'Zoro',
        imageUrl: '/cards/zoro.png',
      },
    },
    {
      id: 'char-3',
      position: { zone: ZoneId.CHARACTER_AREA, index: 2 },
      state: CardState.ACTIVE,
      power: 3000,
      cost: 2,
      givenDonCount: 0,
      metadata: {
        isAltArt: true,
        isPromo: false,
        isLeader: false,
        rarity: 'C',
        colors: ['Green'],
        category: CardCategory.CHARACTER,
        name: 'Nami',
        imageUrl: '/cards/nami.png',
      },
    },
  ];

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />

        <ZoneRenderer
          playerId={PlayerId.PLAYER_1}
          zoneId={ZoneId.CHARACTER_AREA}
          cards={characters}
          position={[0, 0, -2]}
          rotation={[0, 0, 0]}
          layout={ZoneLayoutType.GRID}
          onCardClick={(cardId) => console.log('Character clicked:', cardId)}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color="#1a472a" />
        </mesh>
      </Canvas>
    </div>
  );
}

// ============================================================================
// Example 4: DON Cost Area with Horizontal Layout
// ============================================================================

export function Example4_CostArea() {
  // Create mock DON cards
  const donCards: DonVisualState[] = Array.from({ length: 8 }, (_, i) => ({
    id: `don-${i}`,
    zone: ZoneId.COST_AREA,
    state: i < 5 ? CardState.RESTED : CardState.ACTIVE,
    owner: PlayerId.PLAYER_1,
  }));

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />

        <ZoneRenderer
          playerId={PlayerId.PLAYER_1}
          zoneId={ZoneId.COST_AREA}
          cards={donCards}
          position={[-10, 0, -2]}
          rotation={[0, 0, 0]}
          layout={ZoneLayoutType.HORIZONTAL}
          onCardClick={(donId) => console.log('DON clicked:', donId)}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color="#1a472a" />
        </mesh>
      </Canvas>
    </div>
  );
}

// ============================================================================
// Example 5: Complete Player Board with All Zones
// ============================================================================

export function Example5_CompletePlayerBoard() {
  // Create mock board state
  const zones = {
    deck: Array.from({ length: 35 }, (_, i) => ({
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
        name: `Card ${i}`,
        imageUrl: '/cards/card-back.png',
      },
    })) as CardVisualState[],
    hand: Array.from({ length: 5 }, (_, i) => ({
      id: `hand-${i}`,
      position: { zone: ZoneId.HAND, index: i },
      state: CardState.ACTIVE,
      power: 3000 + i * 1000,
      cost: 2 + i,
      givenDonCount: 0,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: `Hand Card ${i}`,
        imageUrl: '/cards/placeholder.png',
      },
    })) as CardVisualState[],
    trash: [] as CardVisualState[],
    life: Array.from({ length: 4 }, (_, i) => ({
      id: `life-${i}`,
      position: { zone: ZoneId.LIFE, index: i },
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
        name: `Life ${i}`,
        imageUrl: '/cards/card-back.png',
      },
    })) as CardVisualState[],
    donDeck: Array.from({ length: 2 }, (_, i) => ({
      id: `don-deck-${i}`,
      zone: ZoneId.DON_DECK,
      state: CardState.NONE,
      owner: PlayerId.PLAYER_1,
    })) as DonVisualState[],
    costArea: Array.from({ length: 8 }, (_, i) => ({
      id: `cost-${i}`,
      zone: ZoneId.COST_AREA,
      state: i < 4 ? CardState.RESTED : CardState.ACTIVE,
      owner: PlayerId.PLAYER_1,
    })) as DonVisualState[],
    leaderArea: {
      id: 'leader',
      position: { zone: ZoneId.LEADER_AREA, index: 0 },
      state: CardState.ACTIVE,
      power: 5000,
      cost: 0,
      givenDonCount: 1,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: true,
        rarity: 'L',
        colors: ['Red'],
        category: CardCategory.LEADER,
        name: 'Monkey D. Luffy',
        imageUrl: '/cards/leader-luffy.png',
      },
    } as CardVisualState,
    characterArea: Array.from({ length: 3 }, (_, i) => ({
      id: `char-${i}`,
      position: { zone: ZoneId.CHARACTER_AREA, index: i },
      state: i === 1 ? CardState.RESTED : CardState.ACTIVE,
      power: 4000 + i * 1000,
      cost: 3 + i,
      givenDonCount: i,
      metadata: {
        isAltArt: false,
        isPromo: false,
        isLeader: false,
        rarity: 'R',
        colors: ['Red'],
        category: CardCategory.CHARACTER,
        name: `Character ${i}`,
        imageUrl: '/cards/placeholder.png',
      },
    })) as CardVisualState[],
    stageArea: null,
  };

  const zoneLayouts = {
    [ZoneId.DECK]: { position: [-8, 0, -6] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.HAND]: { position: [0, 0, -8] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.TRASH]: { position: [8, 0, -6] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.LIFE]: { position: [-6, 0, -6] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.DON_DECK]: { position: [-10, 0, -4] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.COST_AREA]: { position: [-10, 0, -2] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.LEADER_AREA]: { position: [0, 0, -4] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.CHARACTER_AREA]: { position: [0, 0, -2] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.STAGE_AREA]: { position: [6, 0, -4] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    [ZoneId.LIMBO]: { position: [0, 2, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
  };

  return (
    <div style={{ width: '100%', height: '800px' }}>
      <Canvas camera={{ position: [0, 20, 0], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} />
        <OrbitControls
          minDistance={10}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.2}
        />

        <PlayerZonesRenderer
          playerId={PlayerId.PLAYER_1}
          zones={zones}
          zoneLayouts={zoneLayouts}
          onCardClick={(cardId) => console.log('Card clicked:', cardId)}
          onZoneClick={(playerId, zoneId) => console.log('Zone clicked:', playerId, zoneId)}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color="#1a472a" />
        </mesh>
      </Canvas>
    </div>
  );
}

// ============================================================================
// Example 6: Zone Without Boundary or Label
// ============================================================================

export function Example6_MinimalZone() {
  const cards: CardVisualState[] = Array.from({ length: 3 }, (_, i) => ({
    id: `card-${i}`,
    position: { zone: ZoneId.CHARACTER_AREA, index: i },
    state: CardState.ACTIVE,
    power: 4000,
    cost: 3,
    givenDonCount: 0,
    metadata: {
      isAltArt: false,
      isPromo: false,
      isLeader: false,
      rarity: 'C',
      colors: ['Red'],
      category: CardCategory.CHARACTER,
      name: `Card ${i}`,
      imageUrl: '/cards/placeholder.png',
    },
  }));

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />

        <ZoneRenderer
          playerId={PlayerId.PLAYER_1}
          zoneId={ZoneId.CHARACTER_AREA}
          cards={cards}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          layout={ZoneLayoutType.GRID}
          showLabel={false}
          showBoundary={false}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color="#1a472a" />
        </mesh>
      </Canvas>
    </div>
  );
}
