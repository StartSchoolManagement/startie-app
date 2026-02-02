// Game state management - discrete grid coordinates
import type { GameState, AnimationState, Direction, DirectionVector, Position3D, SpriteVariant } from '../types';

export function createState(): GameState {
  return {
    x: 0,        // grid column (integer)
    y: 0,        // grid row (integer)
    z: 0,        // height: 0 = ground, 1 = jumping (integer)
    facing: 'SE', // SE, NE, NW, SW
    queue: [],   // animation queue
    failed: false,
    ghostVisible: false,
    stepCount: 0,
    hasLaptop: false, // track if player has picked up laptop
    visitedGoals: new Set<string>() // track visited goals for levels with multiple goals
  };
}

export function resetState(state: GameState): void {
  state.x = 0;
  state.y = 0;
  state.z = 0;
  state.facing = 'SE';
  state.queue = [];
  state.failed = false;
  state.ghostVisible = false;
  state.stepCount = 0;
  state.hasLaptop = false;
  state.visitedGoals = new Set<string>();
}

// Animation state - visual-only values, separate from game state
// This holds temporary interpolation values for rendering smooth animations
export function createAnimationState(): AnimationState {
  return {
    x: null,        // interpolated x position (null = use state.x)
    y: null,        // interpolated y position (null = use state.y)
    z: null,        // interpolated z/height for jump animation
    rotation: null, // spin animation rotation in degrees
    alpha: null,    // fade alpha for fall animation
    ghostY: null,   // ghost vertical position during float-up
    ghostAlpha: null // ghost fade alpha
  };
}

export function resetAnimationState(animState: AnimationState): void {
  animState.x = null;
  animState.y = null;
  animState.z = null;
  animState.rotation = null;
  animState.alpha = null;
  animState.ghostY = null;
  animState.ghostAlpha = null;
}

// Direction vectors
export const DIR: Record<Direction, DirectionVector> = {
  SE: { dx: 1, dy: 0 },  // Southeast (right in isometric)
  NE: { dx: 0, dy: -1 }, // Northeast (up in isometric)
  NW: { dx: -1, dy: 0 }, // Northwest (left in isometric)
  SW: { dx: 0, dy: 1 }   // Southwest (down in isometric)
};

// Get next tile position based on facing direction
export function nextTile(state: GameState): Position3D {
  const dir = DIR[state.facing];
  return {
    x: state.x + dir.dx,
    y: state.y + dir.dy,
    z: state.z
  };
}

// Map facing to sprite variant
export function facingToSprite(facing: Direction): SpriteVariant {
  const map: Record<Direction, SpriteVariant> = {
    'SE': 'rd',
    'NE': 'ru',
    'NW': 'lu',
    'SW': 'ld'
  };
  return map[facing] || 'rd';
}

// Rotate facing direction
// spin(l): rd -> ru -> lu -> ld (SE -> NE -> NW -> SW)
// spin(r): rd -> ld -> lu -> ru (SE -> SW -> NW -> NE)
export function rotateFacing(facing: Direction, direction: 'left' | 'right'): Direction {
  const order: Direction[] = ['SE', 'NE', 'NW', 'SW'];
  const currentIndex = order.indexOf(facing);
  
  // Swapped: left goes forward, right goes backward
  if (direction === 'left') {
    return order[(currentIndex + 1) % order.length];
  } else {
    return order[(currentIndex - 1 + order.length) % order.length];
  }
}
