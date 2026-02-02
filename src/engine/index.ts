// Main engine module - combines all engine components
import type { Level, Engine } from '../types';
import { parse } from './commands';
import { createExecutor } from './executor';
import { calculateScore, countCommands } from './rules';

export function createEngine(level: Level): Engine {
  const executor = createExecutor(level);
  
  return {
    state: executor.state,
    animState: executor.animState, // Separate animation state for visual-only values
    parse: parse,
    execute: executor.execute
  };
}

export { calculateScore, countCommands };
