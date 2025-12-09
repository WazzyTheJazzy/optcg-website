/**
 * PlaceholderGenerator.ts
 * 
 * Utility for generating placeholder card textures when actual card images
 * are unavailable or fail to load. Creates canvas-based representations
 * with card information (name, category, power, cost).
 * 
 * @module PlaceholderGenerator
 * 
 * @example
 * ```typescript
 * const dataUrl = PlaceholderGenerator.generate({
 *   name: 'Monkey D. Luffy',
 *   category: 'LEADER',
 *   power: 5000,
 *   cost: 0,
 *   showError: false
 * });
 * 
 * // Use dataUrl with Three.js TextureLoader
 * const texture = textureLoader.load(dataUrl);
 * ```
 */

/**
 * Options for generating a placeholder card texture
 * 
 * @interface PlaceholderOptions
 * @property {string} name - Card name to display (truncated to 20 characters)
 * @property {string} category - Card category (LEADER, CHARACTER, EVENT, STAGE)
 * @property {number} power - Card power value (displayed if > 0)
 * @property {number} cost - Card cost value (displayed if > 0)
 * @property {number} [width=512] - Canvas width in pixels
 * @property {number} [height=716] - Canvas height in pixels (standard card aspect ratio)
 * @property {boolean} [showError=false] - Whether to show error indicator overlay
 */
export interface PlaceholderOptions {
  name: string;
  category: string;
  power: number;
  cost: number;
  width?: number;
  height?: number;
  showError?: boolean;
}

/**
 * PlaceholderGenerator - generates fallback card textures
 * 
 * Static utility class for creating canvas-based placeholder card images when
 * actual card images cannot be loaded. The placeholders are designed to be
 * visually distinct and informative, showing key card information.
 * 
 * **Features:**
 * - **Color-coded backgrounds** based on card category (LEADER=red, CHARACTER=blue, etc.)
 * - **Card name and category** text prominently displayed
 * - **Power indicator** shown in center if power > 0
 * - **Cost indicator** shown in top-left circle if cost > 0
 * - **Error overlay** optional red tint with warning icon
 * - **Standard dimensions** 512x716 pixels (standard card aspect ratio)
 * 
 * **Category Colors:**
 * - LEADER: Dark red (#8B0000)
 * - CHARACTER: Dark blue (#1E3A8A)
 * - EVENT: Dark green (#065F46)
 * - STAGE: Dark brown (#7C2D12)
 * - Default: Dark purple (#2a2a4a)
 * 
 * @class PlaceholderGenerator
 * @static
 * 
 * @example
 * ```typescript
 * // Generate placeholder for a character card
 * const placeholder = PlaceholderGenerator.generate({
 *   name: 'Roronoa Zoro',
 *   category: 'CHARACTER',
 *   power: 5000,
 *   cost: 4,
 *   showError: false
 * });
 * 
 * // Generate placeholder with error indicator
 * const errorPlaceholder = PlaceholderGenerator.generate({
 *   name: 'Failed Card',
 *   category: 'CHARACTER',
 *   power: 3000,
 *   cost: 2,
 *   showError: true
 * });
 * ```
 */
export class PlaceholderGenerator {
  /**
   * Generate a placeholder card texture as a data URL
   * 
   * Creates a canvas-based card image with the provided card information and
   * returns it as a data URL that can be used with Three.js TextureLoader or
   * HTML img elements.
   * 
   * The generated placeholder includes:
   * - Category-colored background
   * - Gold border
   * - Card name (truncated to 20 characters)
   * - Category label
   * - Power value (if > 0) in center
   * - Cost value (if > 0) in top-left circle
   * - Optional error overlay with warning icon
   * 
   * @static
   * @param {PlaceholderOptions} options - Configuration for the placeholder
   * @returns {string} Data URL string for the generated canvas image (format: 'data:image/png;base64,...')
   * 
   * @example
   * ```typescript
   * const dataUrl = PlaceholderGenerator.generate({
   *   name: 'Monkey D. Luffy',
   *   category: 'LEADER',
   *   power: 5000,
   *   cost: 0,
   *   width: 512,
   *   height: 716,
   *   showError: false
   * });
   * ```
   */
  static generate(options: PlaceholderOptions): string {
    const width = options.width || 512;
    const height = options.height || 716;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context for placeholder generation');
      return '';
    }
    
    // Background color based on category
    ctx.fillStyle = this.getCategoryColor(options.category);
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    
    // Card name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    const name = options.name || 'Card';
    ctx.fillText(name.substring(0, 20), width / 2, 60);
    
    // Category
    ctx.font = '24px Arial';
    ctx.fillText(options.category, width / 2, 100);
    
    // Power
    if (options.power > 0) {
      ctx.font = 'bold 48px Arial';
      ctx.fillText(`${options.power}`, width / 2, 400);
      ctx.font = '20px Arial';
      ctx.fillText('POWER', width / 2, 430);
    }
    
    // Cost
    if (options.cost > 0) {
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(80, 80, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillText(`${options.cost}`, 80, 95);
    }
    
    // Error indicator
    if (options.showError) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ff0000';
      ctx.font = '20px Arial';
      ctx.fillText('⚠ Image Load Failed', width / 2, height - 40);
    }
    
    return canvas.toDataURL();
  }
  
  /**
   * Get background color for a card category
   * 
   * Returns a distinct color for each card category to make placeholders
   * easily distinguishable. Uses dark, saturated colors that work well
   * with white text overlay.
   * 
   * **Color Mapping:**
   * - LEADER: Dark red (#8B0000)
   * - CHARACTER: Dark blue (#1E3A8A)
   * - EVENT: Dark green (#065F46)
   * - STAGE: Dark brown (#7C2D12)
   * - Unknown: Dark purple (#2a2a4a)
   * 
   * @private
   * @static
   * @param {string} category - Card category (LEADER, CHARACTER, EVENT, STAGE)
   * @returns {string} Hex color string (e.g., '#8B0000')
   */
  private static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'LEADER': '#8B0000',
      'CHARACTER': '#1E3A8A',
      'EVENT': '#065F46',
      'STAGE': '#7C2D12',
    };
    return colors[category] || '#2a2a4a';
  }
}
