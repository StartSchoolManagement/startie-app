// Character (Startie) rendering - uses discrete grid coordinates
import type { GameState, AnimationState, GridInfo, SpriteVariant } from '../types';
import { facingToSprite } from '../engine/state';
import { getAssetPath } from '../utils/assets';

const SPRITE_VARIANTS: SpriteVariant[] = ['rd', 'ru', 'lu', 'ld'];

const sprites: Record<SpriteVariant, HTMLImageElement> = {
  rd: new Image(),
  ru: new Image(),
  lu: new Image(),
  ld: new Image()
};

const laptopSprites: Record<SpriteVariant, HTMLImageElement> = {
  rd: new Image(),
  ru: new Image(),
  lu: new Image(),
  ld: new Image()
};

let spritesLoaded = 0;
let laptopSpritesLoaded = 0;
const TOTAL_SPRITES = SPRITE_VARIANTS.length;

function loadSpriteSet(spriteSet: Record<SpriteVariant, HTMLImageElement>, prefix: string, onLoad: (key: SpriteVariant) => void): void {
  SPRITE_VARIANTS.forEach(key => {
    const img = spriteSet[key];
    img.onload = () => onLoad(key);
    img.onerror = () => {
      console.error(`Failed to load sprite: ${prefix}-${key}.png`);
      onLoad(key); // Count as loaded even on error to avoid blocking
    };
    // Set src after setting up handlers
    img.src = getAssetPath(`${prefix}-${key}.png`);
    // Check if already cached/loaded (must check after setting src)
    if (img.complete && img.naturalWidth > 0) {
      onLoad(key);
    }
  });
}

export function loadSprites(callback: () => void): void {
  spritesLoaded = 0;
  laptopSpritesLoaded = 0;
  
  const checkAllLoaded = (): void => {
    if (spritesLoaded === TOTAL_SPRITES && laptopSpritesLoaded === TOTAL_SPRITES && callback) {
      callback();
    }
  };
  
  loadSpriteSet(sprites, 'startie', () => {
    spritesLoaded++;
    checkAllLoaded();
  });
  
  loadSpriteSet(laptopSprites, 'startie-laptop', () => {
    laptopSpritesLoaded++;
    checkAllLoaded();
  });
}

export function drawStartie(ctx: CanvasRenderingContext2D, state: GameState, gridInfo: GridInfo | null, animState: AnimationState | null = null): void {
  if (state.ghostVisible) return;
  
  if (!gridInfo) return;
  
  // Use animation position if available, otherwise use discrete state position
  // Only use animation values if they're valid (not undefined/null)
  const displayX = (animState?.x !== undefined && animState?.x !== null) ? animState.x : state.x;
  const displayY = (animState?.y !== undefined && animState?.y !== null) ? animState.y : state.y;
  // animZ is ONLY for jump animation (0-1 during jump), NOT for tile height
  const jumpAnimationZ = (animState?.z !== undefined && animState?.z !== null) ? animState.z : 0;
  
  // Convert grid coordinates to isometric screen coordinates
  // Use the same offset calculation as the grid
  const ISO_TILE_WIDTH = gridInfo.isoTileWidth || 50;
  const ISO_TILE_HEIGHT = gridInfo.isoTileHeight || 25;
  const ISO_OFFSET_X = gridInfo.offsetX || 300;
  const ISO_OFFSET_Y = gridInfo.offsetY || 120;
  
  // Use the exact same formula as gridToIso in grid.js
  const isoX = ISO_OFFSET_X + (displayX - displayY) * (ISO_TILE_WIDTH / 2);
  const isoY = ISO_OFFSET_Y + (displayX + displayY) * (ISO_TILE_HEIGHT / 2);
  
  // Character should be positioned at the top-center of the isometric tile
  // The top point of the diamond is at isoY - ISO_TILE_HEIGHT / 2
  const tileTopY = isoY - ISO_TILE_HEIGHT / 2;
  
  // Get tile height (for lifted tiles) - use state.z which stores lifted tile height
  const tileHeight = state.z || 0; // state.z stores the lifted tile height (0 for ground, 1+ for lifted)
  
  // Apply height offset:
  // - jumpAnimationZ is for jump animation (0-1 during jump, 0 when not jumping)
  // - tileHeight is for standing on a lifted tile (0 = ground, 1+ = lifted)
  // Match the reduced lift height multiplier from grid.js (1.2 instead of 2)
  const jumpHeightOffset = jumpAnimationZ * ISO_TILE_HEIGHT * 2; // Jump animation (keep full height for jumps)
  const liftedOffset = tileHeight * ISO_TILE_HEIGHT * 1.2; // Lifted tile height (reduced for shorter appearance)
  
  const pixelX = isoX + ISO_TILE_WIDTH / 2;  // Center horizontally
  const pixelY = tileTopY - jumpHeightOffset - liftedOffset;     // Top of tile, minus jump height, minus lifted height
  
  // Get sprite based on facing direction and laptop state
  const spriteVariant = facingToSprite(state.facing);
  const spriteSet = state.hasLaptop ? laptopSprites : sprites;
  const currentSprite = spriteSet[spriteVariant];
  
  if (currentSprite && currentSprite.complete && currentSprite.naturalWidth > 0) {
    const spriteSize = (gridInfo.isoTileWidth || 70) * 0.9;  // Increased from 0.8 to 0.9 and base size
    const spriteX = pixelX - spriteSize / 2;
    const spriteY = pixelY - spriteSize / 2;
    
    ctx.save();
    
    // Apply alpha if falling
    if (animState?.alpha !== undefined && animState?.alpha !== null) {
      ctx.globalAlpha = animState.alpha;
    }
    
    // Apply rotation if spinning
    if (animState?.rotation !== undefined && animState?.rotation !== null) {
      ctx.translate(pixelX, pixelY);
      ctx.rotate((animState.rotation * Math.PI) / 180);
      ctx.drawImage(currentSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
    } else {
      ctx.drawImage(currentSprite, spriteX, spriteY, spriteSize, spriteSize);
    }
    
    ctx.restore();
  }
}

export function areSpritesLoaded(): boolean {
  return spritesLoaded === TOTAL_SPRITES && laptopSpritesLoaded === TOTAL_SPRITES;
}
