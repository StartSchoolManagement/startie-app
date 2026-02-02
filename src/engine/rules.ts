// Game rules: collisions, win/lose conditions
import type { GameState, Level, Action, WhileAction } from '../types';

export function checkWinCondition(state: GameState, level: Level): boolean {
  // For single-goal levels, check if at the goal
  if (level.goals.length === 1) {
    const goal = level.goals[0];
    if (state.x !== goal.x || state.y !== goal.y) {
      return false;
    }
    
    // Check if goal is elevated - player must be at correct height
    const goalHeight = goal.height || 0;
    
    if (goalHeight > 0 && state.z !== goalHeight) {
      return false; // Player is at goal position but not at correct height
    }
    if (goalHeight === 0 && state.z !== 0) {
      return false; // Goal is at ground level but player is elevated
    }
    
    // For levels with laptop requirement, must have laptop
    if (level.laptop !== undefined) {
      return state.hasLaptop;
    }
    
    return true;
  }
  
  // For multi-goal levels, check all visited
  return state.visitedGoals.size >= level.goals.length;
}

// Count commands including loops (inner commands count, loop line counts as -1)
export function countCommands(actions: Action[]): number {
  let count = 0;
  for (const action of actions) {
    if (action.type === 'while') {
      const whileAction = action as WhileAction;
      // Loop line counts as -1, inner commands count normally
      count += countCommands(whileAction.body) - 1;
    } else {
      count++;
    }
  }
  return count;
}

export function calculateScore(commandCount: number): number {
  // Score: 950 for 1 command, 900 for 2, 850 for 3, etc.
  return Math.max(100, 1000 - (commandCount * 50));
}
