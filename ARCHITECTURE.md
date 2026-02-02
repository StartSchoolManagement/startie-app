# Logic Run – Developer Architecture Guide

> A browser-based educational game teaching programming concepts through visual puzzles.

## Tech Stack

- **TypeScript** – Strict mode, full type coverage
- **Vite** – Build tool with HMR and multi-page support
- **Vitest** – Unit testing (29 tests)
- **Supabase** – Authentication (magic links) and real-time leaderboard
- **Vercel** – Deployment

---

## Project Structure

```
startie/
├── src/
│   ├── types.ts              # Shared type definitions
│   ├── main.ts               # Entry point for play.html
│   ├── engine/               # Game logic core
│   │   ├── index.ts          # Engine factory & exports
│   │   ├── commands.ts       # Command parser (move, jump, spin, while)
│   │   ├── executor.ts       # Command execution & animation state machine
│   │   ├── rules.ts          # Scoring & win condition logic
│   │   └── state.ts          # Game state & animation state factories
│   ├── levels/               # Level definitions
│   │   ├── index.ts          # Level registry & lookup functions
│   │   ├── levels-data.ts    # All 10 level configurations
│   │   └── helpers.ts        # Tile validation utilities
│   ├── render/               # Canvas rendering
│   │   ├── index.ts          # Render orchestration
│   │   ├── grid.ts           # Isometric grid & tiles
│   │   ├── startie.ts        # Character sprite rendering
│   │   └── animations.ts     # Celebration & ghost effects
│   ├── ui/                   # User interface modules
│   │   ├── terminal.ts       # Code input handling
│   │   ├── mobile-commands.ts # Mobile command palette
│   │   ├── modals.ts         # Registration, password & intro dialogs
│   │   └── navigation.ts     # Level navigation buttons
│   └── utils/                # Utilities & services
│       ├── assets.ts         # Asset path resolution
│       ├── sounds.ts         # Audio management
│       ├── supabase.ts       # Supabase client & authentication
│       ├── leaderboard-supabase.ts # Leaderboard CRUD operations
│       └── player-session.ts # Player registration & session management
├── styles/                   # Modular CSS (9 files)
│   ├── base.css              # Variables & reset
│   ├── banner.css            # Header banner
│   ├── game.css              # Game container & canvas
│   ├── highscores.css        # Leaderboard panel
│   ├── landing.css           # Landing page
│   ├── mobile.css            # Mobile responsive
│   ├── modal.css             # Modal dialogs
│   ├── navigation.css        # Nav buttons
│   ├── terminal.css          # Terminal input
│   └── ui.css                # UI panel
├── tests/                    # Unit tests
│   ├── commands.test.ts      # Command parser tests (15)
│   └── rules.test.ts         # Game rules tests (14)
├── assets/
│   └── sounds/               # Audio files
├── index.html                # Landing page
├── play.html                 # Game page (all levels)
├── highscores.html           # Leaderboard page
├── style.css                 # CSS imports
├── tsconfig.json             # TypeScript strict config
├── vite.config.js            # Vite multi-page config
├── vercel.json               # Deployment config
└── package.json              # Dependencies & scripts
```

---

## Core Types

Defined in [src/types.ts](src/types.ts):

```typescript
// Direction and sprite mapping
type Direction = 'SE' | 'NE' | 'NW' | 'SW';
type SpriteVariant = 'rd' | 'ru' | 'lu' | 'ld';

// Level structure
interface Level {
  width: number;
  height: number;
  start: Position;
  goals: Goal[];
  tiles: Tile[][];
  allowJump: boolean;
  levelNumber: number;
  laptop?: Position;        // Optional laptop for while(hacking) levels
  liftedTiles?: Position[]; // Elevated tiles
}

// Game state (logic)
interface GameState {
  x: number;
  y: number;
  z: number;                // Height (0 = ground, 1+ = elevated)
  facing: Direction;
  queue: Action[];
  failed: boolean;
  ghostVisible: boolean;
  stepCount: number;
  hasLaptop: boolean;
  visitedGoals: Set<string>;
}

// Animation state (visual only, separate from game logic)
interface AnimationState {
  x: number | null;         // Interpolated position
  y: number | null;
  z: number | null;         // Jump height
  rotation: number | null;  // Spin animation
  alpha: number | null;     // Fall fade
  ghostY: number | null;
  ghostAlpha: number | null;
}

// Command actions
type Action = MoveAction | JumpAction | SpinAction | WhileAction | WhileCheckAction;
```

---

## Architecture Decisions

### Separation of Game State and Animation State

The game maintains two distinct state objects:

1. **GameState** – Discrete grid coordinates, logical game state
2. **AnimationState** – Visual interpolation values for smooth rendering

This separation ensures:
- Clean game logic without visual concerns
- Animations can be reset without affecting game state
- No `delete` statements for animation cleanup

### Command Execution Flow

```
Terminal Input → Parser → Actions[] → Executor → GameState + AnimationState → Renderer
```

1. **Parser** ([commands.ts](src/engine/commands.ts)) – Converts text to action objects
2. **Executor** ([executor.ts](src/engine/executor.ts)) – Runs actions, updates state
3. **Renderer** ([render/index.ts](src/render/index.ts)) – Draws based on both states

### Level Data Structure

Each level in [levels-data.ts](src/levels/levels-data.ts):

```typescript
export const level1: Level = {
  width: 5,
  height: 5,
  start: { x: 0, y: 2 },
  goals: [{ x: 4, y: 2 }],
  tiles: [
    [{ type: 'floor' }, { type: 'floor' }, ...],
    // 2D array of tiles
  ],
  allowJump: true,
  levelNumber: 1
};
```

---

## Game Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| Move | `move()` or `move(n)` | Move forward 1 or n tiles |
| Jump | `jump()` or `jump(n)` | Jump forward (clears gaps) |
| Spin | `spin(l)` or `spin(r)` | Rotate left or right |
| Loop | `while(hacking) { ... }` | Repeat until goal reached |

---

## Player Flow

1. **Level 1 loads** → Intro modal appears
2. **"Let's Go!" clicked** → Registration modal (if not registered)
3. **Enter email + username** → Game begins immediately
4. **Complete level** → Score saved, navigate to next level
5. **Leaderboard** → Real-time updates via Supabase subscription

### Registration

- Email (validated format) + 3-character username
- Instant registration, no verification required
- Returning users are recognized by email
- Top 20 players on leaderboard

---

## Scoring

```
Score = 1000 - (commandCount × 100)
Minimum = 100
```

- Each command costs 100 points
- Best score per level is tracked
- Total score = sum of best scores

---

## Development

### Prerequisites

- Node.js 18+
- Supabase project (for leaderboard)

### Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build (dist/)
npm run preview      # Preview production build
npm test             # Run tests (watch mode)
npm run test:run     # Run tests once
```

### Environment Variables

Create `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Adding a New Level

1. **Add level data** in [src/levels/levels-data.ts](src/levels/levels-data.ts):
   ```typescript
   export const level11: Level = {
     width: 6,
     height: 6,
     start: { x: 0, y: 3 },
     goals: [{ x: 5, y: 3 }],
     tiles: [...],
     allowJump: true,
     levelNumber: 11
   };
   ```

2. **Register in** [src/levels/index.ts](src/levels/index.ts):
   ```typescript
   import { level11 } from './levels-data';
   
   export const levels: Record<number, LevelInfo> = {
     // ...
     10: { ..., next: 11 },
     11: { 
       data: level11, 
       password: 'NEW', 
       next: null, 
       prev: 10,
       name: 'New Level',
       description: 'Your description',
       hints: ['move()', 'spin(r)']
     }
   };
   ```

3. **Test** at `/play.html?level=11`

---

## Testing

29 tests across 2 files:

- **commands.test.ts** (15 tests) – Parser validation
- **rules.test.ts** (14 tests) – Scoring, win conditions

Run with: `npm test`

---

## Deployment

Automatic deployment to Vercel on push to main.

**Configuration** in [vercel.json](vercel.json):
```json
{
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/$1" }
  ]
}
```

---

## URLs

| Environment | URL |
|-------------|-----|
| Dev | `http://localhost:5173` |
| Level 1 | `/play.html?password=MVE` |
| By number | `/play.html?level=1` |
| Leaderboard | `/highscores.html` |
