// Shared type definitions for Logic Run / Startie game

// Direction types
export type Direction = 'SE' | 'NE' | 'NW' | 'SW';
export type SpinDirection = 'left' | 'right';
export type SpriteVariant = 'rd' | 'ru' | 'lu' | 'ld';

// Tile types
export type TileType = 'floor' | 'hole' | 'void' | 'start' | 'goal' | 'lifted';

export interface Tile {
  type: TileType;
  height?: number;
}

// Position types
export interface Position {
  x: number;
  y: number;
}

export interface Position3D extends Position {
  z: number;
}

// Goal with optional height
export interface Goal extends Position {
  height?: number;
}

// Laptop position
export interface Laptop extends Position {}

// Level definition
export interface Level {
  width: number;
  height: number;
  start: Position;
  goals: Goal[];
  tiles: Tile[][];
  allowJump: boolean;
  levelNumber: number;
  laptop?: Laptop;
  liftedTiles?: Position[];
}

// Level registry entry
export interface LevelInfo {
  data: Level;
  password: string;
  next: number | null;
  prev: number | null;
  name: string;
  description: string;
  hints: string[];
}

export interface LevelEntry extends LevelInfo {
  number: number;
}

// Action types for command parsing
export type ActionType = 'move' | 'jump' | 'spin' | 'while' | 'while-check';

export interface BaseAction {
  type: ActionType;
}

export interface MoveAction extends BaseAction {
  type: 'move';
  count?: number;
}

export interface JumpAction extends BaseAction {
  type: 'jump';
  count?: number;
}

export interface SpinAction extends BaseAction {
  type: 'spin';
  direction: SpinDirection;
}

export interface WhileAction extends BaseAction {
  type: 'while';
  condition: string;
  body: Action[];
}

export interface WhileCheckAction extends BaseAction {
  type: 'while-check';
  originalAction: WhileAction;
}

export type Action = MoveAction | JumpAction | SpinAction | WhileAction | WhileCheckAction;

// Parse result
export interface ParseResult {
  actions?: Action[];
  error?: string;
}

// Game state - discrete grid coordinates
export interface GameState {
  x: number;
  y: number;
  z: number;
  facing: Direction;
  queue: Action[];
  failed: boolean;
  ghostVisible: boolean;
  stepCount: number;
  hasLaptop: boolean;
  visitedGoals: Set<string>;
  // Optional celebration state
  celebrating?: boolean;
  celebrateScale?: number;
  celebrateAlpha?: number;
}

// Animation state - visual-only values for rendering
export interface AnimationState {
  x: number | null;
  y: number | null;
  z: number | null;
  rotation: number | null;
  alpha: number | null;
  ghostY: number | null;
  ghostAlpha: number | null;
}

// Direction vector
export interface DirectionVector {
  dx: number;
  dy: number;
}

// Grid info for rendering
export interface GridInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  tileSize: number;
  isoTileWidth: number;
  isoTileHeight: number;
  offsetX: number;
  offsetY: number;
  level: Level;
}

// Animation queue item
export interface Animation {
  type: 'move' | 'jump' | 'fall' | 'spin';
  from: Partial<Position3D>;
  to: Partial<Position3D>;
  duration: number;
  callback?: () => void;
  startTime: number | null;
}

// Player session for leaderboard
export interface PlayerSession {
  id?: string;
  name: string;
  email: string;
  username: string;
  score: number;
  level: number;
  verified: boolean;
  consent: boolean;
}

// Registration data from modal
export interface RegistrationData {
  name: string;
  username: string;
  email: string;
  consent: boolean;
}

// Pending verification data
export interface PendingVerification {
  email: string;
  username: string;
  timestamp: number;
}

// Leaderboard entry
export interface LeaderboardEntry {
  code?: string;
  username?: string;
  name?: string;
  score: number;
  verified?: boolean;
  date?: string;
  current_level?: number;
  updated_at?: string;
}

// Score update result
export interface ScoreUpdateResult {
  success: boolean;
  newScore?: number;
  improved?: boolean;
  error?: string;
}

// Registration result
export interface RegistrationResult {
  success: boolean;
  player?: PlayerSession;
  error?: string;
}

// Auth result
export interface AuthResult {
  success: boolean;
  error?: string;
}

// Modal controller interface
export interface ModalController {
  show: () => void;
  hide: () => void;
}

// Mobile commands controller
export interface MobileCommandsController {
  getCommands: () => string;
  setCommands: (commands: string[]) => void;
}

// Engine interface
export interface Engine {
  state: GameState;
  animState: AnimationState;
  parse: (text: string) => ParseResult;
  execute: (
    actions: Action[],
    draw: DrawFunction,
    onFinish: (state: GameState) => void
  ) => void;
}

// Executor interface
export interface Executor {
  state: GameState;
  animState: AnimationState;
  execute: (
    actions: Action[],
    draw: DrawFunction,
    onFinish: (state: GameState) => void
  ) => void;
}

// Draw function type
export type DrawFunction = (state: GameState, animState: AnimationState) => void;

// Callback types
export type VoidCallback = () => void;
export type LeaderboardCallback = (leaderboard: LeaderboardEntry[]) => void;
