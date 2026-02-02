// Celebration image
import type { GameState, AnimationState, GridInfo, DrawFunction } from '../types';
import { getAssetPath } from '../utils/assets';

let celebrateSprite: HTMLImageElement | null = null;
let celebrateLoaded = false;

export function loadCelebrateSprite(callback?: () => void): void {
  if (celebrateLoaded && celebrateSprite) {
    if (callback) callback();
    return;
  }
  
  celebrateSprite = new Image();
  celebrateSprite.onload = () => {
    celebrateLoaded = true;
    if (callback) callback();
  };
  celebrateSprite.src = getAssetPath('celebrate.png');
  
  // Check if image is cached (onload won't fire for cached images)
  if (celebrateSprite.complete && celebrateSprite.naturalWidth > 0) {
    celebrateLoaded = true;
    if (callback) callback();
  }
}

export function isCelebrateLoaded(): boolean {
  return celebrateLoaded && celebrateSprite !== null && celebrateSprite.complete;
}

// Animation effects (ghost, etc.)
export function drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  // Alpha should be set by caller before calling this function
  // If not set, default to 0.7
  if (ctx.globalAlpha === 1.0) {
    ctx.globalAlpha = 0.7;
  }
  
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y + 20, 15, Math.PI, 0, false);
  ctx.lineTo(x + 15, y + 40);
  ctx.lineTo(x + 5, y + 30);
  ctx.lineTo(x - 5, y + 30);
  ctx.lineTo(x - 15, y + 40);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(x - 5, y + 18, 2, 0, Math.PI * 2);
  ctx.arc(x + 5, y + 18, 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

export function drawGhostAtPosition(ctx: CanvasRenderingContext2D, state: GameState, gridInfo: GridInfo | null, animState: AnimationState | null = null): void {
  if (!state.ghostVisible) return;
  
  if (!gridInfo) return;
  
  // Calculate ghost position using the same isometric conversion as the character
  const ISO_TILE_WIDTH = gridInfo.isoTileWidth || 50;
  const ISO_TILE_HEIGHT = gridInfo.isoTileHeight || 25;
  const ISO_OFFSET_X = gridInfo.offsetX || 300;
  const ISO_OFFSET_Y = gridInfo.offsetY || 120;
  
  // Use the exact same formula as gridToIso in grid.js
  const isoX = ISO_OFFSET_X + (state.x - state.y) * (ISO_TILE_WIDTH / 2);
  const isoY = ISO_OFFSET_Y + (state.x + state.y) * (ISO_TILE_HEIGHT / 2);
  
  // Ghost appears at the top-center of the tile where character fell
  const tileTopY = isoY - ISO_TILE_HEIGHT / 2;
  const ghostX = isoX + ISO_TILE_WIDTH / 2;  // Center horizontally
  
  // Initialize ghostY if not set (first time ghost becomes visible)
  if (animState && (animState.ghostY === undefined || animState.ghostY === null)) {
    animState.ghostY = tileTopY;
  }
  
  const ghostY = animState?.ghostY ?? tileTopY;
  const ghostAlpha = animState?.ghostAlpha ?? 1;
  
  // Only draw if ghostY is defined and valid
  if (ghostY !== undefined && ghostY !== null) {
    ctx.save();
    // Apply alpha fade (multiply with base 0.7)
    const baseAlpha = 0.7;
    const fadeAlpha = ghostAlpha * baseAlpha;
    ctx.globalAlpha = fadeAlpha;
    drawGhost(ctx, ghostX, ghostY);
    ctx.restore();
  }
}

export function drawCelebration(ctx: CanvasRenderingContext2D, state: GameState, gridInfo: GridInfo | null): void {
  if (!state.celebrating || !celebrateLoaded || !celebrateSprite) return;
  
  if (!gridInfo) return;
  
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // Calculate celebration position - center of canvas
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Animation properties
  const scale = state.celebrateScale !== undefined ? state.celebrateScale : 1.0;
  const alpha = state.celebrateAlpha !== undefined ? state.celebrateAlpha : 1.0;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  
  const imgWidth = celebrateSprite.width * scale;
  const imgHeight = celebrateSprite.height * scale;
  
  ctx.drawImage(
    celebrateSprite,
    -imgWidth / 2,
    -imgHeight / 2,
    imgWidth,
    imgHeight
  );
  
  ctx.restore();
}

// Create or get celebration overlay element
function getCelebrationOverlay(): HTMLDivElement {
  let overlay = document.getElementById('celebration-overlay') as HTMLDivElement | null;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'celebration-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    const img = document.createElement('img');
    img.id = 'celebration-img';
    img.style.cssText = `
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      position: absolute;
    `;
    img.src = getAssetPath('celebrate.png');
    overlay.appendChild(img);
    
    // Find the game container and append overlay
    const gameContainer = document.getElementById('game');
    if (gameContainer) {
      gameContainer.style.position = 'relative';
      gameContainer.appendChild(overlay);
    }
  }
  return overlay;
}

// Animate celebration - call this function to start the celebration animation
export function animateCelebration(state: GameState, _draw: DrawFunction, duration = 1500): void {
  if (!state) return;
  
  const overlay = getCelebrationOverlay();
  const img = overlay.querySelector('#celebration-img') as HTMLImageElement | null;
  
  if (!img) return;
  
  // Set initial state
  overlay.style.display = 'flex';
  let scale = 0.3;
  let alpha = 0;
  img.style.transform = `scale(${scale})`;
  img.style.opacity = alpha.toString();
  
  // Set base size maintaining aspect ratio - make it bigger
  const baseWidth = 700;
  // Only set width, let height scale naturally to maintain aspect ratio
  img.style.width = baseWidth + 'px';
  img.style.height = 'auto';
  
  const startTime = Date.now();
  const totalDuration = duration;
  
  function animate(): void {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    
    // Scale: pop out effect - grows from 0.3 to 1.2, then bounces back to 1.0
    if (progress < 0.25) {
      // Quick pop out
      const t = progress / 0.25;
      scale = 0.3 + (1.2 - 0.3) * (1 - Math.pow(1 - t, 3)); // Ease out cubic
    } else if (progress < 0.5) {
      // Bounce back
      const t = (progress - 0.25) / 0.25;
      scale = 1.2 - (1.2 - 1.0) * (1 - Math.pow(1 - t, 3)); // 1.2 to 1.0
    } else {
      // Stay at 1.0
      scale = 1.0;
    }
    
    // Alpha: fade in quickly, stay visible, then fade out
    if (progress < 0.2) {
      alpha = progress / 0.2; // Fade in
    } else if (progress < 0.7) {
      alpha = 1.0; // Full opacity
    } else {
      alpha = 1.0 - ((progress - 0.7) / 0.3); // Fade out
    }
    
    img!.style.transform = `scale(${scale})`;
    img!.style.opacity = alpha.toString();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Animation complete
      overlay.style.display = 'none';
    }
  }
  
  animate();
}

// Animate celebration image in intro modal or any element
export function animateCelebrationImage(imgElement: HTMLImageElement, duration = 1500): void {
  if (!imgElement) return;
  
  let scale = 0.3;
  let alpha = 0;
  imgElement.style.transform = `scale(${scale})`;
  imgElement.style.opacity = alpha.toString();
  imgElement.style.transition = 'none';
  
  const startTime = Date.now();
  const totalDuration = duration;
  
  function animate(): void {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    
    // Scale: pop out effect - grows from 0.3 to 1.2, then bounces back to 1.0
    if (progress < 0.25) {
      // Quick pop out
      const t = progress / 0.25;
      scale = 0.3 + (1.2 - 0.3) * (1 - Math.pow(1 - t, 3)); // Ease out cubic
    } else if (progress < 0.5) {
      // Bounce back
      const t = (progress - 0.25) / 0.25;
      scale = 1.2 - (1.2 - 1.0) * (1 - Math.pow(1 - t, 3)); // 1.2 to 1.0
    } else {
      // Stay at 1.0
      scale = 1.0;
    }
    
    // Alpha: fade in quickly, stay visible, then fade out
    if (progress < 0.2) {
      alpha = progress / 0.2; // Fade in
    } else if (progress < 0.7) {
      alpha = 1.0; // Full opacity
    } else {
      alpha = 1.0 - ((progress - 0.7) / 0.3); // Fade out
    }
    
    imgElement.style.transform = `scale(${scale})`;
    imgElement.style.opacity = alpha.toString();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Animation complete - reset to normal state
      imgElement.style.opacity = '1';
      imgElement.style.transform = 'scale(1)';
    }
  }
  
  animate();
}
