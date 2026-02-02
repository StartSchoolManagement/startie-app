// Command execution - logic first, animation second
import type { 
  Level, 
  GameState, 
  Action, 
  Animation, 
  DrawFunction,
  MoveAction,
  JumpAction,
  SpinAction,
  WhileAction,
  WhileCheckAction,
  Executor
} from '../types';
import { createState, createAnimationState, resetAnimationState, nextTile, rotateFacing, DIR } from './state';
import { isValidPosition, isHole, isGoal, isLiftedTile, getTileHeight, isLaptop } from '../levels/helpers';
import { playJumpSound, playSpinSound, playFallSound } from '../utils/sounds';

// Animation queue item
function createAnimation(
  type: Animation['type'], 
  from: Partial<{ x: number; y: number; z: number }>, 
  to: Partial<{ x: number; y: number; z: number }>, 
  duration: number, 
  callback?: () => void
): Animation {
  return { type, from, to, duration, callback, startTime: null };
}

export function createExecutor(level: Level): Executor {
  const state = createState();
  const animState = createAnimationState(); // Separate animation state for visual-only values
  let animationQueue: Animation[] = [];
  let currentAnimation: Animation | null = null;
  
  // Animation interpolation (visual only, never affects state)
  function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }
  
  function updateAnimation(now: number): void {
    if (!currentAnimation) {
      if (animationQueue.length === 0) {
        return;
      }
      currentAnimation = animationQueue.shift()!;
      currentAnimation.startTime = now;
    }
    
    const elapsed = now - currentAnimation.startTime!;
    const progress = Math.min(elapsed / currentAnimation.duration, 1);
    
    if (currentAnimation.type === 'move') {
      const t = progress;
      // Animation values (for rendering only)
      animState.x = lerp(currentAnimation.from.x!, currentAnimation.to.x!, t);
      animState.y = lerp(currentAnimation.from.y!, currentAnimation.to.y!, t);
    } else if (currentAnimation.type === 'jump') {
      const t = progress;
      animState.x = lerp(currentAnimation.from.x!, currentAnimation.to.x!, t);
      animState.y = lerp(currentAnimation.from.y!, currentAnimation.to.y!, t);
      // Height animation: up then down
      const z = progress < 0.5 
        ? lerp(0, 1, progress * 2)
        : lerp(1, 0, (progress - 0.5) * 2);
      animState.z = z;
    } else if (currentAnimation.type === 'fall') {
      // Falling animation: character sinks into hole/void
      const t = progress;
      animState.z = lerp(currentAnimation.from.z!, currentAnimation.to.z!, t);
      // Also fade out as character sinks
      animState.alpha = 1 - (t * 0.7); // Fade to 30% opacity
    } else if (currentAnimation.type === 'spin') {
      animState.rotation = progress * 360;
    }
    
    if (progress >= 1) {
      // Animation complete - snap to final position
      if (currentAnimation.type === 'move' || currentAnimation.type === 'jump') {
        // Ensure we're at the exact final position (no interpolation artifacts)
        animState.x = currentAnimation.to.x!;
        animState.y = currentAnimation.to.y!;
        if (currentAnimation.type === 'jump') {
          animState.z = 0;
        }
      }
      
      // Call callback
      const callback = currentAnimation.callback;
      currentAnimation = null;
      
      // Clear animation after a brief moment to ensure final position is drawn
      setTimeout(() => {
        resetAnimationState(animState);
        if (callback) callback();
      }, 16);
    }
  }
  
  // Start animation loop
  let animationId: number | null = null;
  let ghostAnimationId: number | null = null;
  
  function stopAnimationLoop(): void {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }
  
  function startAnimationLoop(draw: DrawFunction): void {
    if (animationId) return;
    
    function animate(now: number): void {
      updateAnimation(now);
      draw(state, animState);
      
      if (animationQueue.length > 0 || currentAnimation) {
        animationId = requestAnimationFrame(animate);
      } else {
        animationId = null;
      }
    }
    animationId = requestAnimationFrame(animate);
  }
  
  let currentOnFinish: ((state: GameState) => void) | null = null;
  
  function animateGhost(draw: DrawFunction): void {
    // Stop any ongoing animation loop
    stopAnimationLoop();
    
    // Calculate fade-out threshold (disappear before hitting canvas limit)
    // Canvas height is typically 300, so start fading at around 50 pixels
    const fadeStartY = 50;
    const disappearY = -20; // Disappear completely before canvas edge
    
    if (animState.ghostY !== null && animState.ghostY > disappearY) {
      animState.ghostY -= 3; // Slower movement (was 6)
      
      // Fade out as ghost approaches top
      if (animState.ghostY < fadeStartY) {
        const fadeProgress = (fadeStartY - animState.ghostY) / (fadeStartY - disappearY);
        animState.ghostAlpha = Math.max(0, 1 - fadeProgress);
      } else {
        animState.ghostAlpha = 1;
      }
      
      draw(state, animState);
      ghostAnimationId = requestAnimationFrame(() => animateGhost(draw));
    } else {
      // Reset to start position after ghost animation
      if (ghostAnimationId) {
        cancelAnimationFrame(ghostAnimationId);
        ghostAnimationId = null;
      }
      state.x = level.start.x;
      state.y = level.start.y;
      state.z = 0;
      state.facing = 'SE';
      state.hasLaptop = false; // Reset laptop when respawning
      state.ghostVisible = false;
      state.failed = false;
      // Clear all animation state
      resetAnimationState(animState);
      draw(state, animState);
      if (currentOnFinish) currentOnFinish(state);
    }
  }
  
  // Helper to handle falling animation after failed move/jump
  function handleFall(draw: DrawFunction): void {
    state.failed = true;
    
    // Play fall sound
    playFallSound();
    
    animationQueue.push(createAnimation(
      'fall',
      { z: 0 },
      { z: -2 },
      400,
      () => {
        state.ghostVisible = true;
        animState.ghostY = null; // Will be initialized by render layer
        draw(state, animState);
        animateGhost(draw);
      }
    ));
    startAnimationLoop(draw);
  }
  
  // Helper to copy body actions for while loop
  function copyBodyActions(body: Action[]): Action[] {
    const copy: Action[] = [];
    for (const a of body) {
      if (a.type === 'spin') {
        const spinAction = a as SpinAction;
        copy.push({ type: 'spin', direction: spinAction.direction } as SpinAction);
      } else {
        copy.push({ type: a.type } as Action);
      }
    }
    return copy;
  }
  
  function execute(actions: Action[], draw: DrawFunction, onFinish: (state: GameState) => void): void {
    // Check if any while loops are used (required for laptop pickup in levels with laptops)
    const hasWhileLoop = actions.some(action => action.type === 'while');
    
    // Stop all animations and clear queues before starting new execution
    stopAnimationLoop();
    if (ghostAnimationId) {
      cancelAnimationFrame(ghostAnimationId);
      ghostAnimationId = null;
    }
    animationQueue = [];
    currentAnimation = null;
    
    // Clear all animation state
    resetAnimationState(animState);
    
    // Helper to check and handle laptop pickup (needs access to draw parameter)
    function checkLaptopPickup(): void {
      if (isLaptop(level, state.x, state.y)) {
        // In levels with laptops, require a while(hacking) loop to pick up the laptop
        if (level.laptop !== undefined && !hasWhileLoop) {
          // Cannot pick up laptop without using while(hacking)
          state.failed = true;
          onFinish(state);
          return;
        }
        state.hasLaptop = true;
        draw(state, animState);
      }
    }
    
    // Helper to check and track visited goals (for levels with multiple goals)
    // In levels with laptops, goals only count as visited if the character has the laptop
    function checkGoalsVisited(): void {
      if (level.goals && Array.isArray(level.goals)) {
        // If level has a laptop, require it to be picked up before goals count
        if (level.laptop !== undefined && !state.hasLaptop) {
          return; // Don't mark goals as visited without the laptop
        }
        level.goals.forEach(goal => {
          if (state.x === goal.x && state.y === goal.y && state.z === 0) {
            state.visitedGoals.add(`${goal.x},${goal.y}`);
          }
        });
      }
    }
    
    // Helper to check if all goals are visited (for levels with multiple goals)
    function allGoalsVisited(): boolean {
      if (level.goals && Array.isArray(level.goals)) {
        return state.visitedGoals.size >= level.goals.length;
      }
      return false;
    }
    
    currentOnFinish = onFinish; // Store for animateGhost to access
    
    // Expand actions with count property into individual actions for execution
    state.queue = [];
    for (const action of actions) {
      if ((action.type === 'move' || action.type === 'jump') && 
          (action as MoveAction | JumpAction).count) {
        const countAction = action as MoveAction | JumpAction;
        // Expand grouped move/jump commands into individual actions for execution
        for (let i = 0; i < (countAction.count || 1); i++) {
          state.queue.push({ type: action.type } as Action);
        }
      } else if (action.type === 'while') {
        const whileAction = action as WhileAction;
        // Recursively expand while loop body actions
        const expandedBody: Action[] = [];
        for (const bodyAction of whileAction.body) {
          if ((bodyAction.type === 'move' || bodyAction.type === 'jump') && 
              (bodyAction as MoveAction | JumpAction).count) {
            const countAction = bodyAction as MoveAction | JumpAction;
            for (let i = 0; i < (countAction.count || 1); i++) {
              expandedBody.push({ type: bodyAction.type } as Action);
            }
          } else {
            expandedBody.push(bodyAction);
          }
        }
        state.queue.push({ ...whileAction, body: expandedBody } as WhileAction);
      } else {
        state.queue.push(action);
      }
    }
    state.failed = false;
    state.ghostVisible = false;
    state.stepCount = actions.length;
    
    // Reset to start position
    state.x = level.start.x;
    state.y = level.start.y;
    state.z = 0;
    state.facing = 'SE';
    state.hasLaptop = false;
    state.visitedGoals = new Set<string>();
    
    function processAction(): void {
      if (state.queue.length === 0) {
        // All actions processed, wait for animations to finish
        if (!currentAnimation && animationQueue.length === 0) {
          onFinish(state);
        }
        return;
      }

      const action = state.queue.shift()!;

      if (action.type === 'move') {
        const target = nextTile(state);
        
        // Check if this move will fail
        // Fail if trying to move onto a lifted tile (must jump to reach it, regardless of current height)
        const willFail = !isValidPosition(level, target.x, target.y) || 
                        isHole(level, target.x, target.y) ||
                        isLiftedTile(level, target.x, target.y);
        
        // COMMIT STATE (logic) - always move to target
        const fromPos = { x: state.x, y: state.y };
        state.x = target.x;
        state.y = target.y;
        // When moving to ground level, reset z to 0
        if (!isLiftedTile(level, target.x, target.y)) {
          state.z = 0;
        }
        
        // QUEUE ANIMATION (visual interpolation)
        animationQueue.push(createAnimation(
          'move',
          fromPos,
          { x: state.x, y: state.y },
          400,
          () => {
            if (willFail) {
              handleFall(draw);
            } else {
              checkLaptopPickup();
              checkGoalsVisited();
              processAction();
            }
          }
        ));
        
        startAnimationLoop(draw);
        return;
      }

      if (action.type === 'jump') {
        if (!level.allowJump) {
          state.failed = true;
          onFinish(state);
          return;
        }
        
        // Check if there's a lifted tile 1 tile in front
        const frontTile = {
          x: state.x + DIR[state.facing].dx,
          y: state.y + DIR[state.facing].dy
        };
        
        let jumpTarget: { x: number; y: number };
        if (isLiftedTile(level, frontTile.x, frontTile.y)) {
          // Jump onto the lifted tile directly in front
          jumpTarget = frontTile;
          state.z = getTileHeight(level, frontTile.x, frontTile.y);
        } else {
          // Normal jump: moves 2 tiles forward
          jumpTarget = {
            x: state.x + DIR[state.facing].dx * 2,
            y: state.y + DIR[state.facing].dy * 2
          };
          state.z = 0;
        }
        
        // Store target for validation after animation
        // If landing on elevated tile (state.z > 0), don't check ground-level validity (elevated goals can have void underneath)
        const willFail = (state.z === 0 && !isValidPosition(level, jumpTarget.x, jumpTarget.y)) || isHole(level, jumpTarget.x, jumpTarget.y);
        
        // COMMIT STATE - always move to target position
        const fromPos = { x: state.x, y: state.y };
        state.x = jumpTarget.x;
        state.y = jumpTarget.y;
        
        // Play jump sound
        playJumpSound();
        
        // QUEUE JUMP ANIMATION (always play the jump)
        animationQueue.push(createAnimation(
          'jump',
          fromPos,
          { x: state.x, y: state.y },
          600,
          () => {
            if (willFail) {
              handleFall(draw);
            } else {
              checkLaptopPickup();
              checkGoalsVisited();
              processAction();
            }
          }
        ));
        
        startAnimationLoop(draw);
        return;
      }

      if (action.type === 'while') {
        const whileAction = action as WhileAction;
        // while(hacking) means while hasLaptop - can only be used if you have the laptop
        if (whileAction.condition === 'hacking') {
          // Check if player has laptop - required to use while(hacking)
          if (!state.hasLaptop) {
            state.failed = true;
            onFinish(state);
            return;
          }
          
          // For levels with multiple goals, continue until all are visited
          // For single goal levels, continue until at goal
          const shouldContinue = level.goals && Array.isArray(level.goals) 
            ? !allGoalsVisited()
            : !isGoal(level, state.x, state.y);
            
          if (state.hasLaptop && shouldContinue) {
            const bodyCopy = copyBodyActions(whileAction.body);
            for (let i = bodyCopy.length - 1; i >= 0; i--) {
              state.queue.unshift(bodyCopy[i]);
            }
            state.queue.push({ type: 'while-check', originalAction: whileAction } as WhileCheckAction);
            processAction();
          } else {
            processAction();
          }
        } else {
          state.failed = true;
          onFinish(state);
          return;
        }
        return;
      }
      
      if (action.type === 'while-check') {
        const whileCheckAction = action as WhileCheckAction;
        // This runs after while loop body completes - re-check the condition
        const originalAction = whileCheckAction.originalAction;
        if (originalAction.condition === 'hacking') {
          // For levels with multiple goals, continue until all are visited
          // For single goal levels, continue until at goal
          const shouldContinue = level.goals && Array.isArray(level.goals) 
            ? !allGoalsVisited()
            : !isGoal(level, state.x, state.y);
            
          if (state.hasLaptop && shouldContinue) {
            const bodyCopy = copyBodyActions(originalAction.body);
            for (let i = bodyCopy.length - 1; i >= 0; i--) {
              state.queue.unshift(bodyCopy[i]);
            }
            state.queue.push({ type: 'while-check', originalAction: originalAction } as WhileCheckAction);
            processAction();
          } else {
            processAction();
          }
        }
        return;
      }

      if (action.type === 'spin') {
        const spinAction = action as SpinAction;
        // LOGIC FIRST: Update facing (discrete state change)
        state.facing = rotateFacing(state.facing, spinAction.direction);
        
        // Play spin sound
        playSpinSound();
        
        // QUEUE ANIMATION (visual only)
        animationQueue.push(createAnimation(
          'spin',
          {},
          {},
          200,
          () => processAction()
        ));
        
        startAnimationLoop(draw);
        return;
      }
    }

    // Start processing
    if (actions.length === 0) {
      // No actions, finish immediately
      onFinish(state);
    } else {
      processAction();
      draw(state, animState);
    }
  }

  return { state, animState, execute };
}
