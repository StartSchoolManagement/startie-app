// Main render module - combines grid, startie, and animations
import type { Level, GameState, AnimationState, GridInfo, VoidCallback } from '../types';
import { drawGrid, loadLaptopImage, isLaptopImageLoaded } from './grid';
import { loadSprites, drawStartie, areSpritesLoaded } from './startie';
import { loadCelebrateSprite, drawGhostAtPosition } from './animations';

let animationId: number | null = null;

export function initRenderer(callback: VoidCallback | null, level: Level | null = null): void {
  let spritesReady = false;
  let celebrateReady = false;
  let laptopReady = true; // Default to true, only false if level has laptop
  
  const checkReady = (): void => {
    if (spritesReady && celebrateReady && laptopReady && callback) callback();
  };
  
  loadSprites(() => {
    spritesReady = true;
    checkReady();
  });
  
  loadCelebrateSprite(() => {
    celebrateReady = true;
    checkReady();
  });
  
  // Preload laptop image if level has laptop
  if (level && level.laptop) {
    laptopReady = false;
    loadLaptopImage(() => {
      laptopReady = true;
      checkReady();
    });
  } else {
    checkReady();
  }
}

export function drawLevel(ctx: CanvasRenderingContext2D, level: Level, state: GameState, animState: AnimationState | null = null): GridInfo {
  const gridInfo = drawLevelFrame(ctx, level, state, animState);
  
  // Redraw when sprites or laptop image load
  const needsLaptop = level && level.laptop;
  const assetsLoaded = areSpritesLoaded() && (!needsLaptop || isLaptopImageLoaded());
  
  if (!assetsLoaded && !animationId) {
    function checkAndRender(): void {
      const needsLaptopCheck = level && level.laptop;
      const allAssetsLoaded = areSpritesLoaded() && (!needsLaptopCheck || isLaptopImageLoaded());
      if (allAssetsLoaded) {
        drawLevelFrame(ctx, level, state, animState);
        animationId = null;
      } else {
        animationId = requestAnimationFrame(checkAndRender);
      }
    }
    animationId = requestAnimationFrame(checkAndRender);
  }
  
  return gridInfo;
}

function drawLevelFrame(ctx: CanvasRenderingContext2D, level: Level, state: GameState, animState: AnimationState | null = null): GridInfo {
  // Draw grid (data-driven from level tiles) - returns gridInfo
  const gridInfo = drawGrid(ctx, level, state);
  
  // Draw character (uses discrete x, y, z coordinates)
  if (!state.ghostVisible) {
    drawStartie(ctx, state, gridInfo, animState);
  }
  
  // Draw ghost if visible
  if (state.ghostVisible && gridInfo) {
    drawGhostAtPosition(ctx, state, gridInfo, animState);
  }
  
  // Celebration is now drawn as HTML overlay, not on canvas
  
  return gridInfo;
}
