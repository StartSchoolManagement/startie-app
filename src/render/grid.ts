// Grid rendering - data-driven from level tiles (isometric)
import type { Level, GameState, GridInfo } from '../types';
import { getAssetPath } from '../utils/assets';

const ISO_TILE_WIDTH = 70;
const ISO_TILE_HEIGHT = 35;

// Laptop image for rendering
let laptopImage: HTMLImageElement | null = null;
let laptopImageLoaded = false;
let laptopImageCallbacks: (() => void)[] = [];

export function loadLaptopImage(callback?: () => void): HTMLImageElement | null {
  if (laptopImageLoaded) {
    if (callback) callback();
    return laptopImage;
  }
  
  if (callback) {
    laptopImageCallbacks.push(callback);
  }
  
  if (laptopImage) {
    // Already loading
    return laptopImage;
  }
  
  laptopImage = new Image();
  laptopImage.onload = () => {
    laptopImageLoaded = true;
    // Call all pending callbacks
    laptopImageCallbacks.forEach(cb => cb());
    laptopImageCallbacks = [];
  };
  laptopImage.src = getAssetPath('laptop.png');
  return laptopImage;
}

export function isLaptopImageLoaded(): boolean {
  return laptopImageLoaded;
}

// Convert grid coordinates to isometric screen coordinates
function gridToIso(gridX: number, gridY: number, offsetX = 0, offsetY = 0): { x: number; y: number } {
  const isoX = offsetX + (gridX - gridY) * (ISO_TILE_WIDTH / 2);
  const isoY = offsetY + (gridX + gridY) * (ISO_TILE_HEIGHT / 2);
  return { x: isoX, y: isoY };
}

// Draw an isometric tile
function drawIsoTile(ctx: CanvasRenderingContext2D, gridX: number, gridY: number, color: string, height = 0, offsetX = 0, offsetY = 0): void {
  const { x, y } = gridToIso(gridX, gridY, offsetX, offsetY);
  
  ctx.save();
  
  // Calculate lift height (in pixels, upward is negative Y)
  // Reduced multiplier for shorter visual height
  const liftHeight = height > 0 ? height * ISO_TILE_HEIGHT * 1.2 : 0;
  
  // Draw subtle shadows on sides of elevated tiles
  if (height > 0) {
    // Create a subtle shadow effect by drawing darker side edges
    const shadowColor = 'rgba(0, 0, 0, 0.15)';
    
    // Left shadow edge
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(x, y - liftHeight);
    ctx.lineTo(x, y); // Ground point
    ctx.lineTo(x + ISO_TILE_WIDTH / 2, y + ISO_TILE_HEIGHT / 2); // Bottom-left of diamond
    ctx.lineTo(x + ISO_TILE_WIDTH / 2, y - ISO_TILE_HEIGHT / 2 - liftHeight); // Top-left of elevated tile
    ctx.closePath();
    ctx.fill();
    
    // Right shadow edge
    ctx.beginPath();
    ctx.moveTo(x + ISO_TILE_WIDTH, y - liftHeight);
    ctx.lineTo(x + ISO_TILE_WIDTH, y); // Ground point
    ctx.lineTo(x + ISO_TILE_WIDTH / 2, y + ISO_TILE_HEIGHT / 2); // Bottom-right of diamond
    ctx.lineTo(x + ISO_TILE_WIDTH / 2, y - ISO_TILE_HEIGHT / 2 - liftHeight); // Top-right of elevated tile
    ctx.closePath();
    ctx.fill();
  }
  
  // Draw top face (offset upward by liftHeight for lifted tiles)
  ctx.fillStyle = color;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(x, y - liftHeight);
  ctx.lineTo(x + ISO_TILE_WIDTH / 2, y - ISO_TILE_HEIGHT / 2 - liftHeight);
  ctx.lineTo(x + ISO_TILE_WIDTH, y - liftHeight);
  ctx.lineTo(x + ISO_TILE_WIDTH / 2, y + ISO_TILE_HEIGHT / 2 - liftHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}

export function drawGrid(ctx: CanvasRenderingContext2D, level: Level, state: GameState | null = null): GridInfo {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Calculate grid bounds for positioning
  const gridWidth = level.width;
  const gridHeight = level.height;
  
  // Calculate grid area bounds using base offsets
  const BASE_OFFSET_X = 300;
  const BASE_OFFSET_Y = 120;
  
  let minIsoX = Infinity, maxIsoX = -Infinity;
  let minIsoY = Infinity, maxIsoY = -Infinity;
  
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const { x: isoX, y: isoY } = gridToIso(x, y, BASE_OFFSET_X, BASE_OFFSET_Y);
      minIsoX = Math.min(minIsoX, isoX);
      maxIsoX = Math.max(maxIsoX, isoX + ISO_TILE_WIDTH);
      minIsoY = Math.min(minIsoY, isoY - ISO_TILE_HEIGHT / 2);
      maxIsoY = Math.max(maxIsoY, isoY + ISO_TILE_HEIGHT / 2);
    }
  }
  
  const gridAreaWidth = maxIsoX - minIsoX;
  const gridAreaHeight = maxIsoY - minIsoY;
  const gridX = (ctx.canvas.width - gridAreaWidth) / 2 - minIsoX + BASE_OFFSET_X;
  const gridY = (ctx.canvas.height - gridAreaHeight) / 2 - minIsoY + BASE_OFFSET_Y;
  
  // Create grid info for character positioning (returned instead of stored globally)
  const gridInfo: GridInfo = {
    x: 0, // Grid offset X (for isometric calculations)
    y: 0, // Grid offset Y (for isometric calculations)
    width: gridAreaWidth,
    height: gridAreaHeight,
    tileSize: ISO_TILE_WIDTH,
    isoTileWidth: ISO_TILE_WIDTH,
    isoTileHeight: ISO_TILE_HEIGHT,
    offsetX: gridX,
    offsetY: gridY,
    level: level // Store level for tile height lookups
  };
  
  // Draw tiles from level data (isometric)
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const tile = level.tiles[y][x];
      
      // Check if there's an elevated goal at this position
      const elevatedGoalHere = level.goals && level.goals.some(g => g.x === x && g.y === y && g.height && g.height > 0);
      
      // Check for lifted tile (height property or lifted type)
      const tileHeight = tile.height !== undefined ? tile.height : (tile.type === 'lifted' ? 1 : 0);
      
      // Draw hole underneath if tile has height > 0 (lifted tiles have holes beneath them)
      // BUT skip if this is where an elevated goal is (the void tile already serves as the hole)
      if (tileHeight > 0 && !elevatedGoalHere) {
        const { x: isoX, y: isoY } = gridToIso(x, y, gridX, gridY);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY);
        ctx.lineTo(isoX + ISO_TILE_WIDTH / 2, isoY - ISO_TILE_HEIGHT / 2);
        ctx.lineTo(isoX + ISO_TILE_WIDTH, isoY);
        ctx.lineTo(isoX + ISO_TILE_WIDTH / 2, isoY + ISO_TILE_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
      }
      
      if (tile.type === 'start' || tile.type === 'floor') {
        drawIsoTile(ctx, x, y, '#ddd', tileHeight, gridX, gridY);
        
        // Draw laptop image if this is the laptop position and player hasn't picked it up yet
        if (level.laptop && level.laptop.x === x && level.laptop.y === y && (!state || !state.hasLaptop)) {
          const laptopImg = loadLaptopImage();
          if (laptopImg && laptopImageLoaded) {
            const { x: isoX, y: isoY } = gridToIso(x, y, gridX, gridY);
            const liftHeight = tileHeight > 0 ? tileHeight * ISO_TILE_HEIGHT * 1.2 : 0;
            const laptopSize = ISO_TILE_WIDTH * 0.8;
            const laptopX = isoX + ISO_TILE_WIDTH / 2 - laptopSize / 2;
            const laptopY = isoY - ISO_TILE_HEIGHT / 2 - liftHeight - laptopSize * 0.3;
            ctx.drawImage(laptopImg, laptopX, laptopY, laptopSize, laptopSize);
          }
        }
      } else if (tile.type === 'goal') {
        // Ground-level goal (tile type is goal)
        // Goal color: red if no laptop (only for levels with laptop requirement), blue if has laptop or no laptop requirement
        let goalColor = '#0f00ff'; // Default blue
        if (level.laptop !== undefined) {
          // Only level 5 has laptop requirement - show red if no laptop
          goalColor = (state && state.hasLaptop) ? '#0f00ff' : '#ff4444';
        }
        drawIsoTile(ctx, x, y, goalColor, tileHeight, gridX, gridY);
      } else if (tile.type === 'lifted') {
        // Lifted tile
        drawIsoTile(ctx, x, y, '#ddd', tileHeight, gridX, gridY);
      } else if (tile.type === 'hole') {
        // Draw hole as dark pit
        const { x: isoX, y: isoY } = gridToIso(x, y, gridX, gridY);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY);
        ctx.lineTo(isoX + ISO_TILE_WIDTH / 2, isoY - ISO_TILE_HEIGHT / 2);
        ctx.lineTo(isoX + ISO_TILE_WIDTH, isoY);
        ctx.lineTo(isoX + ISO_TILE_WIDTH / 2, isoY + ISO_TILE_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
      } else if (tile.type === 'void') {
        // Don't draw void tiles at all - they're just empty space
        // If there's an elevated goal above, it will be drawn separately
      }
    }
  }
  
  // Draw elevated goals (goals with height > 0 from the goals array)
  if (level.goals) {
    level.goals.forEach(goal => {
      if (goal.height && goal.height > 0) {
        let goalColor = '#0f00ff'; // Default blue
        if (level.laptop !== undefined) {
          goalColor = (state && state.hasLaptop) ? '#0f00ff' : '#ff4444';
        }
        drawIsoTile(ctx, goal.x, goal.y, goalColor, goal.height, gridX, gridY);
      }
    });
  }
  
  return gridInfo;
}
