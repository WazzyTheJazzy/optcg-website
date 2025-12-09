'use client';

/**
 * ZoneRenderer.tsx
 * 
 * Three.js component for rendering game zones with boundaries, labels, and card layouts.
 * Handles different zone types (deck stack, hand fan, character grid, etc.) and
 * updates when zone contents change via RenderingInterface events.
 */

import React, { useRef, useState, useMemo } from 'react';
// Text component disabled due to compatibility issues
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CardVisualState, DonVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { PlayerId, ZoneId, CardState } from '@/lib/game-engine/core/types';
import { CardMesh } from './CardMesh';
import { DonMesh } from './DonMesh';

/**
 * Props for the ZoneRenderer component
 */
export interface ZoneRendererProps {
  playerId: PlayerId;
  zoneId: ZoneId;
  cards: CardVisualState[] | DonVisualState[];
  position: [number, number, number];
  rotation: [number, number, number];
  layout: ZoneLayoutType;
  onCardClick?: (cardId: string) => void;
  onZoneClick?: (playerId: PlayerId, zone: ZoneId) => void;
  showLabel?: boolean;
  showBoundary?: boolean;
}

/**
 * Zone layout types determine how cards are positioned
 */
export enum ZoneLayoutType {
  STACK = 'STACK',       // Cards stacked vertically (deck, trash, don deck)
  FAN = 'FAN',           // Cards fanned out horizontally (hand)
  GRID = 'GRID',         // Cards in a grid layout (character area)
  SINGLE = 'SINGLE',     // Single card slot (leader, stage)
  HORIZONTAL = 'HORIZONTAL', // Cards in a horizontal line (life, cost area)
}

/**
 * Zone layout configuration
 */
interface ZoneLayoutConfig {
  type: ZoneLayoutType;
  spacing: number;
  stackOffset: number;
  maxCards: number;
  boundarySize: [number, number]; // [width, depth]
}

/**
 * Default layout configurations for each zone type
 */
const DEFAULT_ZONE_LAYOUTS: Record<ZoneId, ZoneLayoutConfig> = {
  [ZoneId.DECK]: {
    type: ZoneLayoutType.STACK,
    spacing: 0,
    stackOffset: 0.01,
    maxCards: 50,
    boundarySize: [2, 3.5],
  },
  [ZoneId.HAND]: {
    type: ZoneLayoutType.FAN,
    spacing: 1.5,
    stackOffset: 0,
    maxCards: 10,
    boundarySize: [15, 3.5],
  },
  [ZoneId.TRASH]: {
    type: ZoneLayoutType.STACK,
    spacing: 0,
    stackOffset: 0.01,
    maxCards: 50,
    boundarySize: [2, 3.5],
  },
  [ZoneId.LIFE]: {
    type: ZoneLayoutType.HORIZONTAL,
    spacing: 0.3,
    stackOffset: 0,
    maxCards: 5,
    boundarySize: [2, 3.5],
  },
  [ZoneId.DON_DECK]: {
    type: ZoneLayoutType.STACK,
    spacing: 0,
    stackOffset: 0.01,
    maxCards: 10,
    boundarySize: [1.5, 2],
  },
  [ZoneId.COST_AREA]: {
    type: ZoneLayoutType.GRID,
    spacing: 0.5,
    stackOffset: 0,
    maxCards: 10,
    boundarySize: [4.5, 2.5],
  },
  [ZoneId.LEADER_AREA]: {
    type: ZoneLayoutType.SINGLE,
    spacing: 0,
    stackOffset: 0,
    maxCards: 1,
    boundarySize: [2.5, 3.5],
  },
  [ZoneId.CHARACTER_AREA]: {
    type: ZoneLayoutType.GRID,
    spacing: 2,
    stackOffset: 0,
    maxCards: 5,
    boundarySize: [10, 3.5],
  },
  [ZoneId.STAGE_AREA]: {
    type: ZoneLayoutType.SINGLE,
    spacing: 0,
    stackOffset: 0,
    maxCards: 1,
    boundarySize: [2.5, 3.5],
  },
  [ZoneId.LIMBO]: {
    type: ZoneLayoutType.STACK,
    spacing: 0,
    stackOffset: 0.01,
    maxCards: 10,
    boundarySize: [2, 3.5],
  },
  [ZoneId.BANISHED]: {
    type: ZoneLayoutType.STACK,
    spacing: 0,
    stackOffset: 0.01,
    maxCards: 50,
    boundarySize: [2, 3.5],
  },
};

/**
 * Zone label names for display
 */
const ZONE_LABELS: Record<ZoneId, string> = {
  [ZoneId.DECK]: 'Deck',
  [ZoneId.HAND]: 'Hand',
  [ZoneId.TRASH]: 'Trash',
  [ZoneId.LIFE]: 'Life',
  [ZoneId.DON_DECK]: 'DON Deck',
  [ZoneId.COST_AREA]: 'Cost Area',
  [ZoneId.LEADER_AREA]: 'Leader',
  [ZoneId.CHARACTER_AREA]: 'Characters',
  [ZoneId.STAGE_AREA]: 'Stage',
  [ZoneId.LIMBO]: 'Limbo',
  [ZoneId.BANISHED]: 'Banished',
};

/**
 * Calculate card positions based on zone layout type
 */
function calculateCardPositions(
  layout: ZoneLayoutConfig,
  cardCount: number,
  basePosition: [number, number, number]
): [number, number, number][] {
  const positions: [number, number, number][] = [];
  const [baseX, baseY, baseZ] = basePosition;

  switch (layout.type) {
    case ZoneLayoutType.STACK:
      // Stack cards vertically with small offset
      for (let i = 0; i < cardCount; i++) {
        positions.push([baseX, baseY + i * layout.stackOffset, baseZ]);
      }
      break;

    case ZoneLayoutType.FAN:
      // Fan cards out horizontally
      const totalWidth = (cardCount - 1) * layout.spacing;
      for (let i = 0; i < cardCount; i++) {
        const offsetX = i * layout.spacing - totalWidth / 2;
        positions.push([baseX + offsetX, baseY, baseZ]);
      }
      break;

    case ZoneLayoutType.GRID:
      // Arrange cards in a 2-row grid (5 cards per row for cost area)
      const gridSpacing = layout.spacing;
      const cardsPerRow = 5;
      const rows = Math.ceil(cardCount / cardsPerRow);
      
      for (let i = 0; i < cardCount; i++) {
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const cardsInRow = Math.min(cardsPerRow, cardCount - row * cardsPerRow);
        const rowWidth = (cardsInRow - 1) * gridSpacing;
        
        const offsetX = col * gridSpacing - rowWidth / 2;
        const offsetZ = row * gridSpacing * 1.2; // Slightly more spacing between rows
        
        positions.push([baseX + offsetX, baseY, baseZ + offsetZ]);
      }
      break;

    case ZoneLayoutType.HORIZONTAL:
      // Arrange cards in a horizontal line with spacing
      const lineWidth = (cardCount - 1) * layout.spacing;
      for (let i = 0; i < cardCount; i++) {
        const offsetX = i * layout.spacing - lineWidth / 2;
        positions.push([baseX + offsetX, baseY, baseZ]);
      }
      break;

    case ZoneLayoutType.SINGLE:
      // Single card at base position
      positions.push([baseX, baseY, baseZ]);
      break;
  }

  return positions;
}

/**
 * ZoneRenderer component - renders a game zone with boundaries and cards
 */
export function ZoneRenderer({
  playerId,
  zoneId,
  cards,
  position,
  rotation,
  layout: layoutType,
  onCardClick,
  onZoneClick,
  showLabel = true,
  showBoundary = true,
}: ZoneRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    const defaultLayout = DEFAULT_ZONE_LAYOUTS[zoneId];
    return {
      ...defaultLayout,
      type: layoutType,
    };
  }, [zoneId, layoutType]);

  // Calculate card positions
  const cardPositions = useMemo(() => {
    return calculateCardPositions(layoutConfig, cards.length, [0, 0, 0]);
  }, [layoutConfig, cards.length]);

  // Handle zone click
  const handleZoneClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onZoneClick) {
      onZoneClick(playerId, zoneId);
    }
  };

  // Zone label
  const zoneLabel = ZONE_LABELS[zoneId];
  const cardCountLabel = `${cards.length}`;

  // Check if cards are DON cards
  const isDonZone = zoneId === ZoneId.DON_DECK || zoneId === ZoneId.COST_AREA;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Zone boundary */}
      {showBoundary && (
        <mesh
          position={[0, 0, 0]}
          onClick={handleZoneClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[...layoutConfig.boundarySize, 0.05]} />
          <meshStandardMaterial
            color={hovered ? '#4a7c59' : '#2a5c3a'}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* Zone label - DISABLED due to Text component issues */}

      {/* Render cards */}
      {!isDonZone && cards.length > 0 && (
        <>
          {(cards as CardVisualState[]).map((card, index) => {
            const cardPos = cardPositions[index] || [0, 0, 0];
            return (
              <CardMesh
                key={card.id}
                cardState={card}
                zonePosition={cardPos}
                zoneRotation={[0, 0, 0]}
                indexInZone={index}
                totalCards={cards.length}
                spacing={layoutConfig.spacing}
                stackOffset={layoutConfig.stackOffset}
                onInteract={(cardId, action) => {
                  if (action === 'click' && onCardClick) {
                    onCardClick(cardId);
                  }
                }}
              />
            );
          })}
        </>
      )}

      {/* Render DON cards with zone-specific rendering */}
      {isDonZone && cards.length > 0 && (
        <>
          {(cards as DonVisualState[]).map((don, index) => {
            const cardPos = cardPositions[index] || [0, 0, 0];
            
            // Determine rendering parameters based on zone
            const scale = 1.0; // Normal scale for don deck and cost area
            
            return (
              <DonMesh
                key={don.id}
                donState={don}
                zonePosition={cardPos}
                indexInZone={index}
                totalDon={cards.length}
                spacing={layoutConfig.spacing}
                stackOffset={layoutConfig.stackOffset}
                onClick={(donId) => {
                  if (onCardClick) {
                    onCardClick(donId);
                  }
                }}
                scale={scale}
              />
            );
          })}
        </>
      )}
    </group>
  );
}



/**
 * Helper component to render multiple zones for a player
 */
export interface PlayerZonesRendererProps {
  playerId: PlayerId;
  zones: {
    deck: CardVisualState[];
    hand: CardVisualState[];
    trash: CardVisualState[];
    life: CardVisualState[];
    donDeck: DonVisualState[];
    costArea: DonVisualState[];
    leaderArea: CardVisualState | null;
    characterArea: CardVisualState[];
    stageArea: CardVisualState | null;
  };
  zoneLayouts: Record<ZoneId, { position: [number, number, number]; rotation: [number, number, number] }>;
  onCardClick?: (cardId: string) => void;
  onZoneClick?: (playerId: PlayerId, zone: ZoneId) => void;
}

export function PlayerZonesRenderer({
  playerId,
  zones,
  zoneLayouts,
  onCardClick,
  onZoneClick,
}: PlayerZonesRendererProps) {
  return (
    <>
      {/* Deck */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.DECK}
        cards={zones.deck}
        position={zoneLayouts[ZoneId.DECK].position}
        rotation={zoneLayouts[ZoneId.DECK].rotation}
        layout={ZoneLayoutType.STACK}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* Hand */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.HAND}
        cards={zones.hand}
        position={zoneLayouts[ZoneId.HAND].position}
        rotation={zoneLayouts[ZoneId.HAND].rotation}
        layout={ZoneLayoutType.FAN}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* Trash */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.TRASH}
        cards={zones.trash}
        position={zoneLayouts[ZoneId.TRASH].position}
        rotation={zoneLayouts[ZoneId.TRASH].rotation}
        layout={ZoneLayoutType.STACK}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* Life */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.LIFE}
        cards={zones.life}
        position={zoneLayouts[ZoneId.LIFE].position}
        rotation={zoneLayouts[ZoneId.LIFE].rotation}
        layout={ZoneLayoutType.HORIZONTAL}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* DON Deck */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.DON_DECK}
        cards={zones.donDeck}
        position={zoneLayouts[ZoneId.DON_DECK].position}
        rotation={zoneLayouts[ZoneId.DON_DECK].rotation}
        layout={ZoneLayoutType.STACK}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* Cost Area */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.COST_AREA}
        cards={zones.costArea}
        position={zoneLayouts[ZoneId.COST_AREA].position}
        rotation={zoneLayouts[ZoneId.COST_AREA].rotation}
        layout={ZoneLayoutType.GRID}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* Leader Area */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.LEADER_AREA}
        cards={zones.leaderArea ? [zones.leaderArea] : []}
        position={zoneLayouts[ZoneId.LEADER_AREA].position}
        rotation={zoneLayouts[ZoneId.LEADER_AREA].rotation}
        layout={ZoneLayoutType.SINGLE}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* Character Area */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.CHARACTER_AREA}
        cards={zones.characterArea}
        position={zoneLayouts[ZoneId.CHARACTER_AREA].position}
        rotation={zoneLayouts[ZoneId.CHARACTER_AREA].rotation}
        layout={ZoneLayoutType.GRID}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />

      {/* Stage Area */}
      <ZoneRenderer
        playerId={playerId}
        zoneId={ZoneId.STAGE_AREA}
        cards={zones.stageArea ? [zones.stageArea] : []}
        position={zoneLayouts[ZoneId.STAGE_AREA].position}
        rotation={zoneLayouts[ZoneId.STAGE_AREA].rotation}
        layout={ZoneLayoutType.SINGLE}
        onCardClick={onCardClick}
        onZoneClick={onZoneClick}
      />
    </>
  );
}
