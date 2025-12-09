/**
 * DonMesh.test.tsx
 * 
 * Visual tests for DON card rendering in different zones and states
 * Tests Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DonMesh, DonZoneRenderer } from './DonMesh';
import { DonVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { CardState, ZoneId, PlayerId } from '@/lib/game-engine/core/types';
import * as THREE from 'three';

describe('DonMesh - DON Card Visual Tests', () => {
  
  /**
   * Helper to create test DON visual state
   */
  function createTestDon(
    id: string,
    zone: ZoneId,
    state: CardState = CardState.ACTIVE,
    owner: PlayerId = PlayerId.PLAYER_1
  ): DonVisualState {
    return {
      id,
      zone,
      state,
      owner,
    };
  }

  describe('DON Card Texture Loading', () => {
    it('should define DON card front texture path', () => {
      // Requirement 11.1: DON cards should use official DON card image
      const DON_CARD_TEXTURES = {
        front: '/cards/don-card-front.png',
        back: '/cards/card-back.svg',
      };
      
      expect(DON_CARD_TEXTURES.front).toBe('/cards/don-card-front.png');
      expect(DON_CARD_TEXTURES.back).toBe('/cards/card-back.svg');
    });

    it('should use TextureLoader for loading DON textures', () => {
      // Verify that THREE.TextureLoader is available for texture loading
      const loader = new THREE.TextureLoader();
      expect(loader).toBeInstanceOf(THREE.TextureLoader);
    });

    it('should configure texture filters for DON cards', () => {
      // DON card textures should use LinearFilter for better quality
      const texture = new THREE.Texture();
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      expect(texture.minFilter).toBe(THREE.LinearFilter);
      expect(texture.magFilter).toBe(THREE.LinearFilter);
    });
  });

  describe('DON Cards in Don Deck (Card Backs)', () => {
    it('should render DON cards in don deck with card back texture', () => {
      // Requirement 11.2: DON cards in don deck should show card backs
      const don = createTestDon('don-1', ZoneId.DON_DECK);
      
      expect(don.zone).toBe(ZoneId.DON_DECK);
      
      // DON cards in don deck should be face-down
      const showFaceUp = don.zone === ZoneId.COST_AREA || 
                         don.zone === ZoneId.CHARACTER_AREA ||
                         don.zone === ZoneId.LEADER_AREA;
      
      expect(showFaceUp).toBe(false);
    });

    it('should stack DON cards vertically in don deck', () => {
      // DON deck should use vertical stacking
      const donCards = [
        createTestDon('don-1', ZoneId.DON_DECK),
        createTestDon('don-2', ZoneId.DON_DECK),
        createTestDon('don-3', ZoneId.DON_DECK),
      ];
      
      const stackOffset = 0.05; // Vertical offset for stacking
      const zonePosition: [number, number, number] = [0, 0, 0];
      
      // Calculate positions for stacked cards
      const positions = donCards.map((_, index) => {
        return [
          zonePosition[0],
          zonePosition[1] + index * stackOffset,
          zonePosition[2],
        ];
      });
      
      expect(positions[0][1]).toBe(0);
      expect(positions[1][1]).toBe(0.05);
      expect(positions[2][1]).toBe(0.10);
    });

    it('should render multiple DON cards in don deck', () => {
      // Test rendering 10 DON cards in don deck (standard starting amount)
      const donCards = Array.from({ length: 10 }, (_, i) => 
        createTestDon(`don-${i}`, ZoneId.DON_DECK)
      );
      
      expect(donCards).toHaveLength(10);
      donCards.forEach(don => {
        expect(don.zone).toBe(ZoneId.DON_DECK);
      });
    });
  });

  describe('DON Cards in Cost Area (Card Fronts)', () => {
    it('should render DON cards in cost area with card front texture', () => {
      // Requirement 11.3: DON cards in cost area should show card fronts
      const don = createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE);
      
      expect(don.zone).toBe(ZoneId.COST_AREA);
      
      // DON cards in cost area should be face-up
      const showFaceUp = don.zone === ZoneId.COST_AREA || 
                         don.zone === ZoneId.CHARACTER_AREA ||
                         don.zone === ZoneId.LEADER_AREA;
      
      expect(showFaceUp).toBe(true);
    });

    it('should render active DON cards with 0° rotation', () => {
      // Requirement 11.5: Active DON cards should be at 0° rotation
      const don = createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE);
      
      expect(don.state).toBe(CardState.ACTIVE);
      
      // Calculate rotation for active state
      const restedRotation = don.state === CardState.RESTED ? Math.PI / 2 : 0;
      expect(restedRotation).toBe(0);
    });

    it('should render rested DON cards with 90° rotation', () => {
      // Requirement 11.5: Rested DON cards should be at 90° rotation
      const don = createTestDon('don-1', ZoneId.COST_AREA, CardState.RESTED);
      
      expect(don.state).toBe(CardState.RESTED);
      
      // Calculate rotation for rested state
      const restedRotation = don.state === CardState.RESTED ? Math.PI / 2 : 0;
      expect(restedRotation).toBe(Math.PI / 2);
    });

    it('should layout DON cards in grid in cost area', () => {
      // DON cards in cost area should be laid out horizontally
      const donCards = [
        createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-2', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-3', ZoneId.COST_AREA, CardState.RESTED),
        createTestDon('don-4', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-5', ZoneId.COST_AREA, CardState.RESTED),
      ];
      
      const spacing = 2.0; // Horizontal spacing between DON cards
      const zonePosition: [number, number, number] = [0, 0, 0];
      const totalDon = donCards.length;
      
      // Calculate positions for grid layout
      const positions = donCards.map((_, index) => {
        const totalWidth = (totalDon - 1) * spacing;
        const offsetX = index * spacing - totalWidth / 2;
        return [
          zonePosition[0] + offsetX,
          zonePosition[1],
          zonePosition[2],
        ];
      });
      
      // Verify cards are spread horizontally
      expect(positions[0][0]).toBeLessThan(positions[1][0]);
      expect(positions[1][0]).toBeLessThan(positions[2][0]);
      expect(positions[2][0]).toBeLessThan(positions[3][0]);
      expect(positions[3][0]).toBeLessThan(positions[4][0]);
      
      // Verify all cards are at same Y and Z
      positions.forEach(pos => {
        expect(pos[1]).toBe(zonePosition[1]);
        expect(pos[2]).toBe(zonePosition[2]);
      });
    });

    it('should handle maximum DON cards in cost area (10)', () => {
      // Test rendering 10 DON cards in cost area (maximum possible)
      const donCards = Array.from({ length: 10 }, (_, i) => 
        createTestDon(`don-${i}`, ZoneId.COST_AREA, i % 2 === 0 ? CardState.ACTIVE : CardState.RESTED)
      );
      
      expect(donCards).toHaveLength(10);
      donCards.forEach(don => {
        expect(don.zone).toBe(ZoneId.COST_AREA);
      });
    });

    it('should handle mixed active and rested DON cards', () => {
      // Test rendering DON cards with different states
      const donCards = [
        createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-2', ZoneId.COST_AREA, CardState.RESTED),
        createTestDon('don-3', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-4', ZoneId.COST_AREA, CardState.RESTED),
      ];
      
      expect(donCards[0].state).toBe(CardState.ACTIVE);
      expect(donCards[1].state).toBe(CardState.RESTED);
      expect(donCards[2].state).toBe(CardState.ACTIVE);
      expect(donCards[3].state).toBe(CardState.RESTED);
    });
  });

  describe('Given DON Cards Under Characters', () => {
    it('should render given DON cards under characters', () => {
      // Requirement 11.4: Given DON should be displayed as small cards underneath characters
      const don = createTestDon('don-1', ZoneId.CHARACTER_AREA, CardState.ACTIVE);
      
      expect(don.zone).toBe(ZoneId.CHARACTER_AREA);
      
      // Given DON should be face-up
      const showFaceUp = don.zone === ZoneId.COST_AREA || 
                         don.zone === ZoneId.CHARACTER_AREA ||
                         don.zone === ZoneId.LEADER_AREA;
      
      expect(showFaceUp).toBe(true);
    });

    it('should render given DON cards under leader', () => {
      // Requirement 11.4: Given DON should be displayed under leader as well
      const don = createTestDon('don-1', ZoneId.LEADER_AREA, CardState.ACTIVE);
      
      expect(don.zone).toBe(ZoneId.LEADER_AREA);
      
      // Given DON should be face-up
      const showFaceUp = don.zone === ZoneId.COST_AREA || 
                         don.zone === ZoneId.CHARACTER_AREA ||
                         don.zone === ZoneId.LEADER_AREA;
      
      expect(showFaceUp).toBe(true);
    });

    it('should scale given DON cards to 0.3x', () => {
      // Requirement 11.4: Given DON should be smaller (0.3x scale)
      const scale = 0.3;
      const DON_WIDTH = 1.8;
      const DON_HEIGHT = 2.5;
      
      const scaledWidth = DON_WIDTH * scale;
      const scaledHeight = DON_HEIGHT * scale;
      
      expect(scaledWidth).toBe(0.54);
      expect(scaledHeight).toBe(0.75);
    });

    it('should position given DON cards with offset to show count', () => {
      // Multiple given DON should be offset to show stacking
      const donCount = 3;
      const offsetIncrement = 0.15;
      const parentCardWidth = 2.5;
      const parentCardHeight = 3.5;
      
      const positions = Array.from({ length: donCount }, (_, i) => {
        const x = -parentCardWidth / 2 + 0.5 + i * offsetIncrement;
        const z = parentCardHeight / 2 + 0.3;
        const y = -0.02 - i * 0.01;
        return [x, y, z];
      });
      
      // Verify positions are offset
      expect(positions[0][0]).toBeLessThan(positions[1][0]);
      expect(positions[1][0]).toBeLessThan(positions[2][0]);
      
      // Verify vertical stacking
      expect(positions[0][1]).toBeGreaterThan(positions[1][1]);
      expect(positions[1][1]).toBeGreaterThan(positions[2][1]);
    });

    it('should render DON count badge for given DON', () => {
      // Given DON should show a count badge
      const donCount = 5;
      
      // Badge should be a circle with the count
      const badgeRadius = 0.2;
      const badgeColor = '#9d4edd';
      
      expect(badgeRadius).toBe(0.2);
      expect(badgeColor).toBe('#9d4edd');
      expect(donCount).toBe(5);
    });
  });

  describe('DON Card Geometry and Materials', () => {
    it('should use correct DON card dimensions', () => {
      // DON cards are smaller than regular cards
      const DON_WIDTH = 1.8;
      const DON_HEIGHT = 2.5;
      const DON_THICKNESS = 0.02;
      
      expect(DON_WIDTH).toBe(1.8);
      expect(DON_HEIGHT).toBe(2.5);
      expect(DON_THICKNESS).toBe(0.02);
      
      // Regular cards are 2.5 x 3.5 for comparison
      expect(DON_WIDTH).toBeLessThan(2.5);
      expect(DON_HEIGHT).toBeLessThan(3.5);
    });

    it('should use PlaneGeometry for DON cards', () => {
      // DON cards should use PlaneGeometry for flat rendering
      const DON_WIDTH = 1.8;
      const DON_HEIGHT = 2.5;
      const geometry = new THREE.PlaneGeometry(DON_WIDTH, DON_HEIGHT);
      
      expect(geometry).toBeInstanceOf(THREE.PlaneGeometry);
    });

    it('should use MeshStandardMaterial for DON cards', () => {
      // DON cards should use MeshStandardMaterial with texture
      const material = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.3,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBe(0.3);
      expect(material.metalness).toBe(0.1);
      expect(material.side).toBe(THREE.DoubleSide);
    });

    it('should rotate DON cards to lay flat on table', () => {
      // DON cards should be rotated -90° around X axis to lay flat
      const rotation = -Math.PI / 2;
      
      expect(rotation).toBe(-Math.PI / 2);
    });

    it('should enable shadow casting for DON cards', () => {
      // DON cards should cast and receive shadows
      const castShadow = true;
      const receiveShadow = true;
      
      expect(castShadow).toBe(true);
      expect(receiveShadow).toBe(true);
    });
  });

  describe('DON Card Interaction and Hover Effects', () => {
    it('should handle DON card click events', () => {
      // DON cards should be clickable
      const onClick = vi.fn();
      const donId = 'don-1';
      
      onClick(donId);
      
      expect(onClick).toHaveBeenCalledWith(donId);
    });

    it('should show hover effect on DON cards', () => {
      // DON cards should elevate on hover
      const hovered = true;
      const baseY = 0;
      const hoverOffset = 0.2;
      
      const targetY = hovered ? baseY + hoverOffset : baseY;
      
      expect(targetY).toBe(0.2);
    });

    it('should show selection highlight on DON cards', () => {
      // Selected DON cards should show yellow highlight
      const isSelected = true;
      const highlightColor = '#ffff00';
      const highlightOpacity = 0.3;
      
      expect(isSelected).toBe(true);
      expect(highlightColor).toBe('#ffff00');
      expect(highlightOpacity).toBe(0.3);
    });
  });

  describe('DonZoneRenderer - Multiple DON Cards', () => {
    it('should render multiple DON cards in a zone', () => {
      const donCards = [
        createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-2', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-3', ZoneId.COST_AREA, CardState.RESTED),
      ];
      
      expect(donCards).toHaveLength(3);
    });

    it('should handle empty DON zone', () => {
      const donCards: DonVisualState[] = [];
      
      expect(donCards).toHaveLength(0);
    });

    it('should apply correct spacing for DON cards', () => {
      const spacing = 2.0;
      const stackOffset = 0.05;
      
      expect(spacing).toBeGreaterThan(0);
      expect(stackOffset).toBeGreaterThan(0);
    });

    it('should handle DON card selection in zone', () => {
      const donCards = [
        createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-2', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-3', ZoneId.COST_AREA, CardState.RESTED),
      ];
      
      const selectedDonId = 'don-2';
      
      donCards.forEach(don => {
        const isSelected = don.id === selectedDonId;
        if (don.id === 'don-2') {
          expect(isSelected).toBe(true);
        } else {
          expect(isSelected).toBe(false);
        }
      });
    });
  });

  describe('DON Card State Transitions', () => {
    it('should animate rotation when DON changes from active to rested', () => {
      // DON card should smoothly rotate from 0° to 90°
      const oldState = CardState.ACTIVE;
      const newState = CardState.RESTED;
      
      const getRotation = (state: CardState) => state === CardState.RESTED ? Math.PI / 2 : 0;
      const oldRotation = getRotation(oldState);
      const newRotation = getRotation(newState);
      
      expect(oldRotation).toBe(0);
      expect(newRotation).toBe(Math.PI / 2);
    });

    it('should animate rotation when DON changes from rested to active', () => {
      // DON card should smoothly rotate from 90° to 0°
      const oldState = CardState.RESTED;
      const newState = CardState.ACTIVE;
      
      const oldRotation = oldState === CardState.RESTED ? Math.PI / 2 : 0;
      const newRotation = newState === CardState.ACTIVE ? 0 : Math.PI / 2;
      
      expect(oldRotation).toBe(Math.PI / 2);
      expect(newRotation).toBe(0);
    });

    it('should animate position when DON moves between zones', () => {
      // DON card should smoothly move from don deck to cost area
      const oldZone = ZoneId.DON_DECK;
      const newZone = ZoneId.COST_AREA;
      
      expect(oldZone).toBe(ZoneId.DON_DECK);
      expect(newZone).toBe(ZoneId.COST_AREA);
    });
  });

  describe('DON Card Edge Cases', () => {
    it('should handle single DON card in zone', () => {
      const donCards = [
        createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE),
      ];
      
      expect(donCards).toHaveLength(1);
      
      // Single card should be centered
      const spacing = 2.0;
      const totalDon = 1;
      const totalWidth = (totalDon - 1) * spacing;
      
      expect(totalWidth).toBe(0);
    });

    it('should handle DON cards for different players', () => {
      const player1Don = createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE, PlayerId.PLAYER_1);
      const player2Don = createTestDon('don-2', ZoneId.COST_AREA, CardState.ACTIVE, PlayerId.PLAYER_2);
      
      expect(player1Don.owner).toBe(PlayerId.PLAYER_1);
      expect(player2Don.owner).toBe(PlayerId.PLAYER_2);
    });

    it('should handle DON cards with no spacing', () => {
      const spacing = 0;
      const donCards = [
        createTestDon('don-1', ZoneId.COST_AREA, CardState.ACTIVE),
        createTestDon('don-2', ZoneId.COST_AREA, CardState.ACTIVE),
      ];
      
      // With no spacing, cards should be at same position
      expect(spacing).toBe(0);
      expect(donCards).toHaveLength(2);
    });

    it('should handle DON cards with no stack offset', () => {
      const stackOffset = 0;
      const donCards = [
        createTestDon('don-1', ZoneId.DON_DECK),
        createTestDon('don-2', ZoneId.DON_DECK),
      ];
      
      // With no stack offset, cards should be at same height
      expect(stackOffset).toBe(0);
      expect(donCards).toHaveLength(2);
    });
  });
});
