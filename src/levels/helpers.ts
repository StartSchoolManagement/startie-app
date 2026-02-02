// Shared level helper functions
import type { Level, Tile, Goal } from '../types';

export function getTile(level: Level, x: number, y: number): Tile {
  if (x < 0 || x >= level.width || y < 0 || y >= level.height) {
    return { type: 'void' };
  }
  return level.tiles[y][x] || { type: 'void' };
}

export function isHole(level: Level, x: number, y: number): boolean {
  const tile = getTile(level, x, y);
  return tile.type === 'hole';
}

export function isGoal(level: Level, x: number, y: number): boolean {
  // All levels now use goals[] array
  return level.goals && level.goals.some(g => g.x === x && g.y === y);
}

export function getGoalAt(level: Level, x: number, y: number): Goal | null {
  return level.goals ? level.goals.find(g => g.x === x && g.y === y) || null : null;
}

export function getGoalHeight(level: Level, x: number, y: number): number {
  const goal = getGoalAt(level, x, y);
  return goal?.height || 0;
}

export function isValidPosition(level: Level, x: number, y: number): boolean {
  if (x < 0 || x >= level.width || y < 0 || y >= level.height) {
    return false;
  }
  const tile = getTile(level, x, y);
  return tile.type !== 'void' && tile.type !== 'hole';
}

export function isLiftedTile(level: Level, x: number, y: number): boolean {
  // Check if goal is elevated at this position
  const goal = getGoalAt(level, x, y);
  if (goal && goal.height && goal.height > 0) {
    return true;
  }
  
  // Check if tile has height property
  const tile = getTile(level, x, y);
  return tile.type === 'lifted' || (tile.height !== undefined && tile.height > 0);
}

export function getTileHeight(level: Level, x: number, y: number): number {
  // Check if goal is elevated at this position
  const goal = getGoalAt(level, x, y);
  if (goal && goal.height && goal.height > 0) {
    return goal.height;
  }
  
  // Check if tile has height property
  const tile = getTile(level, x, y);
  if (tile.type === 'lifted' || (tile.height !== undefined && tile.height > 0)) {
    return tile.height || 1;
  }
  return 0;
}

export function isLaptop(level: Level, x: number, y: number): boolean {
  // Check if this position matches the laptop position in the level
  if (level.laptop && level.laptop.x === x && level.laptop.y === y) {
    return true;
  }
  return false;
}
