// Player session management - handles registration and score tracking
import type { PlayerSession, PendingVerification, ScoreUpdateResult, RegistrationResult, LeaderboardEntry, RegistrationData } from '../types';
import { getSupabaseClient } from './supabase';

const SESSION_KEY = 'logicrun_player';
const PENDING_VERIFICATION_KEY = 'logicrun_pending_verification';
const LEVEL_SCORES_KEY = 'logicrun_level_scores';

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
 * Clear player session
 */
export function clearPlayerSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PENDING_VERIFICATION_KEY);
  localStorage.removeItem(LEVEL_SCORES_KEY);
  localStorage.removeItem('local_score');
  localStorage.removeItem('local_level');
}

/**
 * Check if player is registered (has email + username)
 */
export function isPlayerRegistered(): boolean {
  const session = getPlayerSession();
  return session !== null && !!session.email && !!session.username;
}

/**
 * Sign in an existing verified player by email
 * Checks database for verified player and restores their session
 */
export async function signInExistingPlayer(email: string): Promise<{ success: boolean; player?: PlayerSession; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // Check if user exists with this email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !userData) {
      return { success: false, error: 'No account found with this email' };
    }

    // Get their current score if any
    const { data: scoreData } = await supabase
      .from('scores')
      .select('score, current_level')
      .eq('user_id', userData.id)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    // Restore session locally
    const session: PlayerSession = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      username: userData.username,
      score: scoreData?.score || 0,
      level: scoreData?.current_level || userData.current_level || 1,
      verified: userData.verified,
      consent: userData.consent
    };
    savePlayerSession(session);
    
    // Clear any stale level scores from localStorage to avoid conflicts
    localStorage.removeItem(LEVEL_SCORES_KEY);

    return { success: true, player: session };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Register a new player - saves directly to database (no verification required)
 */
export async function registerPlayer(data: RegistrationData): Promise<RegistrationResult> {
  const { name, email, username, consent } = data;
  
  if (!name || !email || !username) {
    return { success: false, error: 'Name, email, and username are required' };
  }

  if (username.length !== 3 || !/^[A-Z0-9]{3}$/i.test(username)) {
    return { success: false, error: 'Username must be exactly 3 alphanumeric characters' };
  }

  const supabase = getSupabaseClient();
  
  if (supabase) {
    // Check if username is already taken by a different email
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username, email')
      .eq('username', username.toUpperCase())
      .single();

    if (existingUsername && existingUsername.email !== email.toLowerCase()) {
      return { success: false, error: 'Username already taken. Choose another.' };
    }

    // Check if email already exists (returning player)
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      // Returning player - get their current score
      const { data: scoreData } = await supabase
        .from('scores')
        .select('score, current_level')
        .eq('user_id', existingUser.id)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      // Update consent if changed
      if (existingUser.consent !== consent) {
        await supabase
          .from('users')
          .update({ consent, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id);
      }

      const session: PlayerSession = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        username: existingUser.username,
        score: scoreData?.score || 0,
        level: scoreData?.current_level || existingUser.current_level || 1,
        verified: true,
        consent: consent
      };
      savePlayerSession(session);
      return { success: true, player: session };
    }
  }

  // Get any local scores to include
  const levelScoresData = localStorage.getItem(LEVEL_SCORES_KEY);
  const levelScores: Record<string, number> = levelScoresData ? JSON.parse(levelScoresData) : {};
  const totalScore = Object.values(levelScores).reduce((sum, score) => sum + score, 0);
  const highestLevel = Object.keys(levelScores).length > 0 
    ? Math.max(...Object.keys(levelScores).map(Number)) 
    : 1;

  if (supabase) {
    try {
      // Create new user in database
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          email: email.toLowerCase(),
          username: username.toUpperCase(),
          consent: consent,
          verified: true,
          current_level: highestLevel
        })
        .select()
        .single();

      if (userError) {
        return { success: false, error: userError.message };
      }

      // Create initial score entry if there's a local score
      if (totalScore > 0) {
        await supabase
          .from('scores')
          .insert({
            user_id: newUser.id,
            score: totalScore,
            current_level: highestLevel
          });
      }

      // Save session locally
      const session: PlayerSession = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        score: totalScore,
        level: highestLevel,
        verified: true,
        consent: newUser.consent
      };
      savePlayerSession(session);

      return { success: true, player: session };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Offline mode - save locally only
  const session: PlayerSession = {
    name: name.trim(),
    email: email.toLowerCase(),
    username: username.toUpperCase(),
    score: totalScore,
    level: highestLevel,
    verified: true,
    consent: consent
  };
  savePlayerSession(session);

  return { success: true, player: session };
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
    // No improvement, return current total
    const session = getPlayerSession();
    const currentTotal = session ? session.score : calculateTotalScore(levelScores);
    return { 
      success: true, 
      newScore: currentTotal, 
      improved: false 
    };
  }
  
  // Update best score for this level in localStorage
  levelScores[levelNumber] = levelScore;
  saveLevelScores(levelScores);
  
  // Calculate total from localStorage level scores
  const localTotalScore = calculateTotalScore(levelScores);
  
  const session = getPlayerSession();
  if (!session) {
    // Player not registered, store locally for now
    localStorage.setItem('local_score', localTotalScore.toString());
    localStorage.setItem('local_level', levelNumber.toString());
    return { success: true, newScore: localTotalScore, improved: true };
  }

  // For registered players, use the HIGHER of:
  // - Their current database score
  // - Their localStorage total (sum of best per level)
  // This ensures score never goes down and properly handles returning players
  const newTotalScore = Math.max(session.score || 0, localTotalScore);

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Offline mode - update local session
    session.score = newTotalScore;
    session.level = Math.max(session.level || 1, levelNumber);
    savePlayerSession(session);
    return { success: true, newScore: newTotalScore, improved: true };
  }

  try {
    // Check if user has an existing score entry
    const { data: existingScore } = await supabase
      .from('scores')
      .select('id, score')
      .eq('user_id', session.id)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    if (existingScore) {
      // Update existing score entry
      const { data, error } = await supabase
        .from('scores')
        .update({
          score: newTotalScore,
          current_level: Math.max(session.level || 1, levelNumber),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingScore.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        session.score = newTotalScore;
        session.level = Math.max(session.level || 1, levelNumber);
        savePlayerSession(session);
        return { success: true, newScore: newTotalScore, improved: true };
      }

      // Update local session
      session.score = data.score;
      session.level = data.current_level;
      savePlayerSession(session);

      return { success: true, newScore: data.score, improved: true };
    } else {
      // Create new score entry
      const { data, error } = await supabase
        .from('scores')
        .insert({
          user_id: session.id,
          score: newTotalScore,
          current_level: Math.max(session.level || 1, levelNumber)
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        session.score = newTotalScore;
        session.level = Math.max(session.level || 1, levelNumber);
        savePlayerSession(session);
        return { success: true, newScore: newTotalScore, improved: true };
      }

      // Update user's current_level in users table
      await supabase
        .from('users')
        .update({ current_level: Math.max(session.level || 1, levelNumber) })
        .eq('id', session.id);

      session.score = data.score;
      session.level = data.current_level;
      savePlayerSession(session);

      return { success: true, newScore: data.score, improved: true };
    }
  } catch (error) {
    console.error('Error updating score:', error);
    session.score = newTotalScore;
    session.level = Math.max(session.level || 1, levelNumber);
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
    // Query using the leaderboard_view or manual join
    const { data, error } = await supabase
      .from('scores')
      .select(`
        score,
        current_level,
        updated_at,
        users!inner (
          username,
          name
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
      name: entry.users?.name,
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
 * Check if there's a pending verification to complete
 */
export function hasPendingVerification(): boolean {
  return localStorage.getItem(PENDING_VERIFICATION_KEY) !== null;
}

/**
 * Get pending verification data
 */
export function getPendingVerification(): PendingVerification | null {
  const data = localStorage.getItem(PENDING_VERIFICATION_KEY);
  return data ? JSON.parse(data) : null;
}

/**
 * Get local score (for unregistered players)
 */
export function getLocalScore(): number {
  return parseInt(localStorage.getItem('local_score') || '0', 10);
}

/**
 * Clear local score
 */
export function clearLocalScore(): void {
  localStorage.removeItem('local_score');
  localStorage.removeItem('local_level');
}
