// All level configurations - consolidated level data
// Each level defines: grid dimensions, start position, goals, tiles, and optional laptop
import type { Level } from '../types';

export const level1: Level = {
  width: 5,
  height: 5,
  start: { x: 0, y: 2 },
  goals: [{ x: 4, y: 2 }],
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'goal' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 1
};

export const level2: Level = {
  width: 5,
  height: 5,
  start: { x: 0, y: 2 },
  goals: [{ x: 4, y: 2 }],
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'hole' }, { type: 'floor' }, { type: 'goal' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 2
};

export const level3: Level = {
  width: 7,
  height: 7,
  start: { x: 0, y: 3 },
  goals: [{ x: 6, y: 0 }],
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'hole' }, { type: 'floor' }, { type: 'floor' }, { type: 'goal' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'hole' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'hole' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'hole' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 3
};

export const level4: Level = {
  width: 5,
  height: 5,
  start: { x: 0, y: 2 },
  goals: [{ x: 4, y: 0, height: 1 }],
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor'}],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 4
};

export const level5: Level = {
  width: 7,
  height: 7,
  start: { x: 0, y: 3 },
  goals: [{ x: 6, y: 3 }],
  laptop: { x: 3, y: 3 },
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'goal' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 5
};

export const level6: Level = {
  width: 6,
  height: 6,
  start: { x: 0, y: 5 },
  goals: [{ x: 5, y: 0 }],
  tiles: [
    [{ type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'goal'}],
    [{ type: 'void' }, { type: 'floor' }, { type: 'floor'}, { type: 'floor'}, { type: 'floor'}, { type: 'floor'}],
    [{ type: 'void' }, { type: 'floor' }, { type: 'void'}, { type: 'void' }, { type: 'void' }, { type: 'void' }],
    [{ type: 'void' }, { type: 'floor'}, { type: 'floor'}, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'void'}, { type: 'void'}, { type: 'void'}, { type: 'void' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 6
};

export const level7: Level = {
  width: 8,
  height: 7,
  start: { x: 0, y: 3 },
  goals: [{ x: 7, y: 5 }],
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'goal' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 7
};

export const level8: Level = {
  width: 9,
  height: 5,
  start: { x: 0, y: 4 },
  goals: [{ x: 3, y: 0 }, { x: 8, y: 4 }],
  laptop: { x: 2, y: 4 },
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'goal' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'goal' }]
  ],
  allowJump: true,
  levelNumber: 8
};

export const level9: Level = {
  width: 8,
  height: 7,
  start: { x: 0, y: 3 },
  goals: [{ x: 3, y: 0 }, { x: 7, y: 4 }],
  laptop: { x: 7, y: 0 },
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'goal' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'goal' }],
    [{ type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 9
};

export const level10: Level = {
  width: 8,
  height: 8,
  start: { x: 0, y: 7 },
  goals: [{ x: 7, y: 0 }, { x: 5, y: 4 }],
  laptop: { x: 3, y: 6 },
  tiles: [
    [{ type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'goal' }],
    [{ type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'void' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'void' }],
    [{ type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'void' }, { type: 'goal' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    [{ type: 'void' }, { type: 'floor' }, { type: 'void' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }],
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 10
};
