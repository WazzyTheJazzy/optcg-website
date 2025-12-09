/**
 * CardAnimator.ts
 * 
 * Handles smooth animations for card movements between zones.
 * Uses spring physics for natural-feeling transitions.
 */

import { Vector3, Euler } from 'three';

export interface AnimationState {
  cardId: string;
  from: {
    position: Vector3;
    rotation: Euler;
  };
  to: {
    position: Vector3;
    rotation: Euler;
  };
  progress: number; // 0 to 1
  duration: number; // milliseconds
  startTime: number;
  easing: EasingFunction;
}

export type EasingFunction = (t: number) => number;

/**
 * Common easing functions
 */
export const Easing = {
  linear: (t: number) => t,
  
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Spring-like easing for card movements
  spring: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  
  // Bounce effect for landing animations
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/**
 * CardAnimator manages smooth transitions for card movements
 */
export class CardAnimator {
  private animations: Map<string, AnimationState> = new Map();
  private animationCallbacks: Map<string, () => void> = new Map();

  /**
   * Start a new animation for a card
   */
  startAnimation(
    cardId: string,
    from: { position: [number, number, number]; rotation: [number, number, number] },
    to: { position: [number, number, number]; rotation: [number, number, number] },
    duration: number = 500,
    easing: EasingFunction = Easing.easeOutCubic,
    onComplete?: () => void
  ): void {
    const animation: AnimationState = {
      cardId,
      from: {
        position: new Vector3(...from.position),
        rotation: new Euler(...from.rotation),
      },
      to: {
        position: new Vector3(...to.position),
        rotation: new Euler(...to.rotation),
      },
      progress: 0,
      duration,
      startTime: Date.now(),
      easing,
    };

    this.animations.set(cardId, animation);
    
    if (onComplete) {
      this.animationCallbacks.set(cardId, onComplete);
    }
  }

  /**
   * Update all active animations
   * Call this in your render loop
   */
  update(): void {
    const now = Date.now();
    const completedAnimations: string[] = [];

    this.animations.forEach((animation, cardId) => {
      const elapsed = now - animation.startTime;
      const rawProgress = Math.min(elapsed / animation.duration, 1);
      animation.progress = animation.easing(rawProgress);

      if (rawProgress >= 1) {
        completedAnimations.push(cardId);
      }
    });

    // Clean up completed animations
    completedAnimations.forEach(cardId => {
      this.animations.delete(cardId);
      
      const callback = this.animationCallbacks.get(cardId);
      if (callback) {
        callback();
        this.animationCallbacks.delete(cardId);
      }
    });
  }

  /**
   * Get the current interpolated position and rotation for a card
   */
  getAnimatedTransform(cardId: string): {
    position: Vector3;
    rotation: Euler;
  } | null {
    const animation = this.animations.get(cardId);
    if (!animation) return null;

    const { from, to, progress } = animation;

    // Interpolate position
    const position = new Vector3(
      from.position.x + (to.position.x - from.position.x) * progress,
      from.position.y + (to.position.y - from.position.y) * progress,
      from.position.z + (to.position.z - from.position.z) * progress
    );

    // Interpolate rotation
    const rotation = new Euler(
      from.rotation.x + (to.rotation.x - from.rotation.x) * progress,
      from.rotation.y + (to.rotation.y - from.rotation.y) * progress,
      from.rotation.z + (to.rotation.z - from.rotation.z) * progress
    );

    return { position, rotation };
  }

  /**
   * Check if a card is currently animating
   */
  isAnimating(cardId: string): boolean {
    return this.animations.has(cardId);
  }

  /**
   * Cancel an animation
   */
  cancelAnimation(cardId: string): void {
    this.animations.delete(cardId);
    this.animationCallbacks.delete(cardId);
  }

  /**
   * Cancel all animations
   */
  cancelAll(): void {
    this.animations.clear();
    this.animationCallbacks.clear();
  }

  /**
   * Get all currently animating card IDs
   */
  getAnimatingCards(): string[] {
    return Array.from(this.animations.keys());
  }
}
