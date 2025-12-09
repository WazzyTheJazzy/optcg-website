/**
 * DON Card Texture Configuration
 * 
 * Defines the texture paths for DON card rendering.
 * These textures are used by DonMesh component to display DON cards
 * with proper front/back images.
 */

export interface DonCardTextures {
  /** Path to DON card front image (shown in cost area and when given to characters) */
  front: string;
  /** Path to card back image (shown in don deck) */
  back: string;
}

/**
 * Default DON card texture paths
 * 
 * Current status:
 * - front: 336x470 PNG (ready for use, upgrade to 1024x1024 for production)
 * - back: SVG available, PNG needs to be generated at 1024x1024
 * 
 * See /public/cards/DON_ASSETS_README.md for details
 */
export const DON_CARD_TEXTURES: DonCardTextures = {
  front: '/cards/don-card-front.png',
  back: '/cards/card-back.svg', // Using SVG until PNG is generated
};

/**
 * Alternative DON card textures (from don/ subdirectory)
 * Can be used for variety or special editions
 */
export const ALTERNATIVE_DON_TEXTURES: string[] = Array.from(
  { length: 57 },
  (_, i) => `/cards/don/Don-${String(i).padStart(2, '0')}.png`
);

/**
 * Get a random alternative DON texture
 */
export function getRandomDonTexture(): string {
  const index = Math.floor(Math.random() * ALTERNATIVE_DON_TEXTURES.length);
  return ALTERNATIVE_DON_TEXTURES[index];
}

/**
 * Get DON texture by index
 */
export function getDonTextureByIndex(index: number): string {
  if (index < 0 || index >= ALTERNATIVE_DON_TEXTURES.length) {
    return DON_CARD_TEXTURES.front;
  }
  return ALTERNATIVE_DON_TEXTURES[index];
}
