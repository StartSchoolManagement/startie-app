// Level registry - central configuration for all levels
import type { LevelInfo, LevelEntry } from '../types';
import { 
  level1, level2, level3, level4, level5, 
  level6, level7, level8, level9, level10 
} from './levels-data';

export const levels: Record<number, LevelInfo> = {
  1: { data: level1, password: 'MVE', next: 2, prev: null, name: 'Move', description: 'Learn to move', hints: ['move()', 'move()', 'move()'] },
  2: { data: level2, password: 'JMP', next: 3, prev: 1, name: 'Jump', description: 'Jump over obstacles', hints: ['jump()', 'move()'] },
  3: { data: level3, password: 'SPN', next: 4, prev: 2, name: 'Spin', description: 'Rotate to change direction', hints: ['move()', 'spin(r)', 'move()'] },
  4: { data: level4, password: 'HGT', next: 5, prev: 3, name: 'Height', description: 'Navigate elevated platforms', hints: ['move()', 'jump()'] },
  5: { data: level5, password: 'HCK', next: 6, prev: 4, name: 'Hack', description: 'Pick up the laptop and loop', hints: ['move()', 'while(hacking) {', 'jump()', '}'] },
  6: { data: level6, password: 'SSS', next: 7, prev: 5, name: 'Pattern', description: 'Use patterns efficiently', hints: ['move()', 'spin(r)'] },
  7: { data: level7, password: 'PTN', next: 8, prev: 6, name: 'S-Curve', description: 'Navigate the S-shaped path', hints: ['move()', 'spin(l)', 'move()'] },
  8: { data: level8, password: 'GLS', next: 9, prev: 7, name: 'Goals', description: 'Visit multiple goals', hints: ['while(hacking) {', 'move()', '}'] },
  9: { data: level9, password: 'LOP', next: 10, prev: 8, name: 'Loop', description: 'Master the loop', hints: ['jump()', 'while(hacking) {', 'move()', '}'] },
  10: { data: level10, password: 'FIN', next: null, prev: 9, name: 'Final', description: 'The final challenge', hints: ['while(hacking) {', 'move()', 'spin(r)', '}'] },
};

export function getLevelByPassword(password: string): LevelEntry | null {
  const upper = password.toUpperCase();
  const entry = Object.entries(levels).find(([_, level]) => level.password === upper);
  return entry ? { number: parseInt(entry[0]), ...entry[1] } : null;
}

export function getLevelByNumber(num: number): LevelEntry | null {
  const level = levels[num];
  return level ? { number: num, ...level } : null;
}

export function getAllLevels(): LevelEntry[] {
  return Object.entries(levels).map(([num, level]) => ({
    number: parseInt(num),
    ...level
  }));
}
