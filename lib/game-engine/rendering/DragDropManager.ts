/**
 * DragDropManager.ts
 * 
 * Manages drag-and-drop interactions for cards in the 3D game scene.
 * Handles raycasting, valid drop zone detection, and snap-to-grid positioning.
 */

import { Vector3, Raycaster, Camera, Vector2 } from 'three';
import { ZoneId, PlayerId } from '../core/types';

export interface DragState {
  cardId: string;
  startZone: ZoneId;
  startPosition: Vector3;
  currentPosition: Vector3;
  isDragging: boolean;
  validDropZones: ZoneId[];
}

export interface DropZone {
  zoneId: ZoneId;
  playerId: PlayerId;
  position: Vector3;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  snapPositions: Vector3[]; // Positions where cards can snap to
}

/**
 * DragDropManager handles all drag-and-drop logic for cards
 */
export class DragDropManager {
  private dragState: DragState | null = null;
  private dropZones: Map<string, DropZone> = new Map();
  private raycaster: Raycaster = new Raycaster();
  private hoveredZone: DropZone | null = null;

  /**
   * Register a drop zone
   */
  registerDropZone(zone: DropZone): void {
    const key = `${zone.playerId}-${zone.zoneId}`;
    this.dropZones.set(key, zone);
  }

  /**
   * Unregister a drop zone
   */
  unregisterDropZone(playerId: PlayerId, zoneId: ZoneId): void {
    const key = `${playerId}-${zoneId}`;
    this.dropZones.delete(key);
  }

  /**
   * Start dragging a card
   */
  startDrag(
    cardId: string,
    startZone: ZoneId,
    startPosition: Vector3,
    validDropZones: ZoneId[]
  ): void {
    this.dragState = {
      cardId,
      startZone,
      startPosition: startPosition.clone(),
      currentPosition: startPosition.clone(),
      isDragging: true,
      validDropZones,
    };
  }

  /**
   * Update drag position based on mouse/pointer position
   */
  updateDrag(
    mouseX: number,
    mouseY: number,
    camera: Camera,
    groundPlaneY: number = 0
  ): Vector3 | null {
    if (!this.dragState) return null;

    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    const mouse = new Vector2(mouseX, mouseY);

    // Update raycaster
    this.raycaster.setFromCamera(mouse, camera);

    // Raycast to ground plane
    const groundPlane = new Vector3(0, groundPlaneY, 0);
    const planeNormal = new Vector3(0, 1, 0);
    
    const ray = this.raycaster.ray;
    const denominator = planeNormal.dot(ray.direction);
    
    if (Math.abs(denominator) > 0.0001) {
      const t = groundPlane.sub(ray.origin).dot(planeNormal) / denominator;
      if (t >= 0) {
        const intersectionPoint = ray.origin.clone().add(ray.direction.multiplyScalar(t));
        this.dragState.currentPosition = intersectionPoint;
        
        // Check which zone we're hovering over
        this.updateHoveredZone(intersectionPoint);
        
        return intersectionPoint;
      }
    }

    return null;
  }

  /**
   * Update which zone is currently being hovered
   */
  private updateHoveredZone(position: Vector3): void {
    this.hoveredZone = null;

    if (!this.dragState) return;

    // Check each valid drop zone
    for (const [key, zone] of this.dropZones) {
      if (!this.dragState.validDropZones.includes(zone.zoneId)) {
        continue;
      }

      // Check if position is within zone bounds
      if (
        position.x >= zone.bounds.minX &&
        position.x <= zone.bounds.maxX &&
        position.z >= zone.bounds.minZ &&
        position.z <= zone.bounds.maxZ
      ) {
        this.hoveredZone = zone;
        break;
      }
    }
  }

  /**
   * End drag and return drop information
   */
  endDrag(): {
    cardId: string;
    targetZone: ZoneId | null;
    targetPlayerId: PlayerId | null;
    snapPosition: Vector3 | null;
  } | null {
    if (!this.dragState) return null;

    const result = {
      cardId: this.dragState.cardId,
      targetZone: this.hoveredZone?.zoneId || null,
      targetPlayerId: this.hoveredZone?.playerId || null,
      snapPosition: this.hoveredZone ? this.getSnapPosition(this.hoveredZone, this.dragState.currentPosition) : null,
    };

    this.dragState = null;
    this.hoveredZone = null;

    return result;
  }

  /**
   * Cancel current drag
   */
  cancelDrag(): void {
    this.dragState = null;
    this.hoveredZone = null;
  }

  /**
   * Get the nearest snap position within a zone
   */
  private getSnapPosition(zone: DropZone, position: Vector3): Vector3 {
    if (zone.snapPositions.length === 0) {
      return zone.position.clone();
    }

    // Find closest snap position
    let closestPosition = zone.snapPositions[0];
    let closestDistance = position.distanceTo(closestPosition);

    for (let i = 1; i < zone.snapPositions.length; i++) {
      const snapPos = zone.snapPositions[i];
      const distance = position.distanceTo(snapPos);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPosition = snapPos;
      }
    }

    return closestPosition.clone();
  }

  /**
   * Get current drag state
   */
  getDragState(): DragState | null {
    return this.dragState;
  }

  /**
   * Get currently hovered zone
   */
  getHoveredZone(): DropZone | null {
    return this.hoveredZone;
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.dragState !== null && this.dragState.isDragging;
  }

  /**
   * Check if a zone is valid for current drag
   */
  isValidDropZone(zoneId: ZoneId): boolean {
    if (!this.dragState) return false;
    return this.dragState.validDropZones.includes(zoneId);
  }

  /**
   * Generate snap positions for a zone based on layout
   */
  static generateSnapPositions(
    zonePosition: Vector3,
    layout: 'stack' | 'fan' | 'grid' | 'single' | 'horizontal',
    maxCards: number,
    spacing: number
  ): Vector3[] {
    const positions: Vector3[] = [];

    switch (layout) {
      case 'single':
        positions.push(zonePosition.clone());
        break;

      case 'stack':
        // For stacks, only one snap position at the top
        positions.push(zonePosition.clone());
        break;

      case 'fan':
      case 'horizontal':
        // Horizontal spread
        for (let i = 0; i < maxCards; i++) {
          const offsetX = (i - maxCards / 2) * spacing;
          positions.push(new Vector3(
            zonePosition.x + offsetX,
            zonePosition.y,
            zonePosition.z
          ));
        }
        break;

      case 'grid':
        // Grid layout (2 rows)
        const cardsPerRow = Math.ceil(maxCards / 2);
        for (let i = 0; i < maxCards; i++) {
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          const offsetX = (col - cardsPerRow / 2) * spacing;
          const offsetZ = row * spacing;
          positions.push(new Vector3(
            zonePosition.x + offsetX,
            zonePosition.y,
            zonePosition.z + offsetZ
          ));
        }
        break;
    }

    return positions;
  }
}
