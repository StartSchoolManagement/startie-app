// Player session management - handles registration and score tracking
//
// Players never sign in to Supabase. All database writes go through two
// SECURITY DEFINER RPCs (register_player, submit_score); the anon key can
// only read the leaderboard columns.
import type { PlayerSession, ScoreUpdateResult, RegistrationResult, LeaderboardEntry, RegistrationData } from '../types';
import { getSupabaseClient } from './supabase';

const SESSION_KEY = 'logicrun_player';
const LEVEL_SCORES_KEY = 'logicrun_level_scores';
const LOCAL_SCORE_KEY = 'local_score';
const LOCAL_LEVEL_KEY = 'local_level';

interface RegisterPlayerRow {
  id: string;
  token: string;
  name: string;
  email: string;
  username: string;
  consent: boolean;
  verified: boolean;
  score: number;
  level: number;
  is_new: boolean;
}

interface SubmitScoreRow {
  score: number;
  level: number;
}

/**
 * Get current player session from localStorage
 */
export function getPlayerSession(): PlayerSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

/**
 * Save player session to localStorage
 */
export function savePlayerSession(session: PlayerSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Clear player session and all per-player local progress
 */
export function clearPlayerSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEVEL_SCORES_KEY);
  localStorage.removeItem(LOCAL_SCORE_KEY);
  localStorage.removeItem(LOCAL_LEVEL_KEY);
}

/**
 * Check if player is registered (has email + username)
 */
export function isPlayerRegistered(): boolean {
  const session = getPlayerSession();
  return session !== null && !!session.email && !!session.username;
}

/**
 * Register a new player, or recognise a returning one by email.
 * Goes through the register_player RPC so the anon key never touches the users table.
 */
export async function registerPlayer(data: RegistrationData): Promise<RegistrationResult> {
  const { name, email, username, consent } = data;

  if (!name || !email || !username) {
    return { success: false, error: 'Name, email, and username are required' };
  }

  if (username.length !== 3 || !/^[A-Z0-9]{3}$/i.test(username)) {
    return { success: false, error: 'Username must be exactly 3 alphanumeric characters' };
  }

  // Progress stored on this browser before registering. On a shared event
  // laptop this belongs to whoever played last, so it is only carried over
  // when nobody else was signed in here.
  const previousSession = getPlayerSession();
  const levelScores = previousSession ? {} : getLevelScores();
  const localTotalScore = calculateTotalScore(levelScores);
  const localHighestLevel = highestLevel(levelScores);

  const supabase = getSupabaseClient();

  if (!supabase) {
    // Offline mode - save locally only
    saveLevelScores(levelScores);
    const session: PlayerSession = {
      name: name.trim(),
      email: email.toLowerCase(),
      username: username.toUpperCase(),
      score: localTotalScore,
      level: localHighestLevel,
      verified: true,
      consent
    };
    savePlayerSession(session);
    return { success: true, player: session };
  }

  try {
    const { data: row, error } = await supabase.rpc('register_player', {
      p_name: name.trim(),
      p_email: email.toLowerCase(),
      p_username: username.toUpperCase(),
      p_consent: consent
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const player = row as RegisterPlayerRow;
    let score = player.score;
    let level = player.level;

    // Reset per-level bests unless this is the same player continuing.
    if (!previousSession || previousSession.id !== player.id) {
      saveLevelScores(levelScores);
    }

    // Brand-new player who already cleared levels on this browser: record it.
    if (player.is_new && localTotalScore > 0) {
      const { data: submitted } = await supabase.rpc('submit_score', {
        p_user_id: player.id,
        p_token: player.token,
        p_score: localTotalScore,
        p_level: localHighestLevel
      });
      if (submitted) {
        score = (submitted as SubmitScoreRow).score;
        level = (submitted as SubmitScoreRow).level;
      }
    }

    const session: PlayerSession = {
      id: player.id,
      token: player.token,
      name: player.name,
      email: player.email,
      username: player.username,
      score,
      level,
      verified: player.verified,
      consent: player.consent
    };
    savePlayerSession(session);

    return { success: true, player: session };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get best scores per level from localStorage
 */
function getLevelScores(): Record<number, number> {
  const data = localStorage.getItem(LEVEL_SCORES_KEY);
  return data ? JSON.parse(data) : {};
}

/**
 * Save level scores to localStorage
 */
function saveLevelScores(scores: Record<number, number>): void {
  localStorage.setItem(LEVEL_SCORES_KEY, JSON.stringify(scores));
}

/**
 * Calculate total score from best scores per level
 */
function calculateTotalScore(levelScores: Record<number, number>): number {
  return Object.values(levelScores).reduce((sum, score) => sum + score, 0);
}

function highestLevel(levelScores: Record<number, number>): number {
  const keys = Object.keys(levelScores).map(Number);
  return keys.length > 0 ? Math.max(...keys) : 1;
}

/**
 * Update player's score after completing a level
 * Only updates if the new score is better than previous best for that level
 */
export async function updatePlayerScore(levelScore: number, levelNumber: number): Promise<ScoreUpdateResult> {
  // Get current best scores per level from localStorage
  const levelScores = getLevelScores();
  const previousBest = levelScores[levelNumber] || 0;

  // Check if this is an improvement for this level
  if (levelScore <= previousBest) {
    const session = getPlayerSession();
    const currentTotal = session ? session.score : calculateTotalScore(levelScores);
    return { success: true, newScore: currentTotal, improved: false };
  }

  // Update best score for this level in localStorage
  levelScores[levelNumber] = levelScore;
  saveLevelScores(levelScores);

  const localTotalScore = calculateTotalScore(levelScores);

  const session = getPlayerSession();
  if (!session) {
    // Player not registered, store locally for now
    localStorage.setItem(LOCAL_SCORE_KEY, localTotalScore.toString());
    localStorage.setItem(LOCAL_LEVEL_KEY, levelNumber.toString());
    return { success: true, newScore: localTotalScore, improved: true };
  }

  // Never let the score go down: take the higher of the stored total and the local sum.
  const newTotalScore = Math.max(session.score || 0, localTotalScore);
  const newLevel = Math.max(session.level || 1, levelNumber);

  const supabase = getSupabaseClient();
  if (!supabase || !session.id) {
    // Offline session - update locally only
    session.score = newTotalScore;
    session.level = newLevel;
    savePlayerSession(session);
    return { success: true, newScore: newTotalScore, improved: true };
  }

  try {
    // Sessions created before tokens existed: re-register once to obtain one.
    if (!session.token) {
      const { data: reg } = await supabase.rpc('register_player', {
        p_name: session.name,
        p_email: session.email,
        p_username: session.username,
        p_consent: session.consent
      });
      const token = (reg as RegisterPlayerRow | null)?.token;
      if (!token) {
        session.score = newTotalScore;
        session.level = newLevel;
        savePlayerSession(session);
        return { success: true, newScore: newTotalScore, improved: true };
      }
      session.token = token;
      savePlayerSession(session);
    }

    const { data, error } = await supabase.rpc('submit_score', {
      p_user_id: session.id,
      p_token: session.token,
      p_score: newTotalScore,
      p_level: newLevel
    });

    if (error) {
      console.error('Supabase submit_score error:', error);
      session.score = newTotalScore;
      session.level = newLevel;
      savePlayerSession(session);
      return { success: true, newScore: newTotalScore, improved: true };
    }

    const result = data as SubmitScoreRow;
    session.score = result.score;
    session.level = result.level;
    savePlayerSession(session);

    return { success: true, newScore: result.score, improved: true };
  } catch (error) {
    console.error('Error updating score:', error);
    session.score = newTotalScore;
    session.level = newLevel;
    savePlayerSession(session);
    return { success: true, newScore: newTotalScore, improved: true };
  }
}

/**
 * Get the live leaderboard with real-time updates
 */
export function subscribeToLeaderboard(callback: (leaderboard: LeaderboardEntry[]) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    // Return empty leaderboard for offline mode
    callback([]);
    return () => {};
  }

  // Initial fetch
  fetchLeaderboard().then(callback);

  // Subscribe to real-time changes on scores table
  const channel = supabase
    .channel('leaderboard-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scores'
      },
      () => {
        // Refetch leaderboard on any change
        fetchLeaderboard().then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch current leaderboard (joins users and scores)
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('scores')
      .select(`
        score,
        current_level,
        updated_at,
        users!inner (
          username
        )
      `)
      .gt('score', 0)
      .order('score', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return (data || []).map((entry: any) => ({
      username: entry.users?.username,
      score: entry.score,
      current_level: entry.current_level,
      updated_at: entry.updated_at
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

/**
 * Get local score (for unregistered players)
 */
export function getLocalScore(): number {
  return parseInt(localStorage.getItem(LOCAL_SCORE_KEY) || '0', 10);
}

/**
 * Clear local score
 */
export function clearLocalScore(): void {
  localStorage.removeItem(LOCAL_SCORE_KEY);
  localStorage.removeItem(LOCAL_LEVEL_KEY);
}
