// Leaderboard management using Supabase
// Supports both anonymous codes and authenticated email submissions

import type { LeaderboardEntry } from '../types';
import { getSupabaseClient, getCurrentUser } from './supabase';

/**
 * Save a score to the leaderboard
 * If authenticated, saves with email; otherwise uses display code
 */
export async function saveCumulativeScore(code: string, totalScore: number, email: string | null = null): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not available, falling back to localStorage');
    return saveCumulativeScoreLocal(code, totalScore);
  }

  try {
    // Check if user is authenticated
    const { user } = await getCurrentUser();
    
    const scoreData = {
      code: code.toUpperCase(),
      score: totalScore,
      email: user?.email || email || null,
      verified: !!user // Mark as verified if user is authenticated
    };

    const { error } = await supabase
      .from('leaderboard')
      .insert([scoreData])
      .select();

    if (error) {
      console.error('Error saving score to Supabase:', error);
      return saveCumulativeScoreLocal(code, totalScore);
    }

    return await getCumulativeLeaderboard();
  } catch (error) {
    console.error('Error saving score:', error);
    return saveCumulativeScoreLocal(code, totalScore);
  }
}

/**
 * Save authenticated score with email verification
 * Requires user to be logged in via magic link
 */
export async function saveAuthenticatedScore(code: string, totalScore: number): Promise<{ success: boolean; error?: string; leaderboard?: LeaderboardEntry[] }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not available' };
  }

  const { user } = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'User must be authenticated to submit verified scores' };
  }

  try {
    const { error } = await supabase
      .from('leaderboard')
      .insert([{
        code: code.toUpperCase(),
        score: totalScore,
        email: user.email,
        user_id: user.id,
        verified: true
      }])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    const leaderboard = await getCumulativeLeaderboard();
    return { success: true, leaderboard };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get the cumulative leaderboard
 */
export async function getCumulativeLeaderboard(verifiedOnly = false): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not available, falling back to localStorage');
    return getCumulativeLeaderboardLocal();
  }

  try {
    let query = supabase
      .from('leaderboard')
      .select('code, score, verified, created_at')
      .order('score', { ascending: false })
      .limit(10);
    
    if (verifiedOnly) {
      query = query.eq('verified', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leaderboard from Supabase:', error);
      return getCumulativeLeaderboardLocal();
    }

    return (data || []).map(entry => ({
      code: entry.code,
      score: entry.score,
      verified: entry.verified || false,
      date: entry.created_at
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return getCumulativeLeaderboardLocal();
  }
}

// Local storage fallback functions
function saveCumulativeScoreLocal(code: string, totalScore: number): LeaderboardEntry[] {
  const key = 'cumulative_leaderboard';
  const leaderboard = getCumulativeLeaderboardLocal();
  
  leaderboard.push({
    code: code.toUpperCase(),
    score: totalScore,
    date: new Date().toISOString()
  });
  
  leaderboard.sort((a, b) => b.score - a.score);
  const topScores = leaderboard.slice(0, 10);
  
  localStorage.setItem(key, JSON.stringify(topScores));
  return topScores;
}

function getCumulativeLeaderboardLocal(): LeaderboardEntry[] {
  const key = 'cumulative_leaderboard';
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// Get current run total score from localStorage (this stays local)
export function getCurrentRunTotal(): number {
  const data = localStorage.getItem('current_run_total');
  return data ? parseInt(data, 10) : 0;
}

// Set current run total score
export function setCurrentRunTotal(score: number): void {
  localStorage.setItem('current_run_total', score.toString());
}

// Add to current run total
export function addToRunTotal(score: number): void {
  const current = getCurrentRunTotal();
  setCurrentRunTotal(current + score);
}

// Reset current run total
export function resetRunTotal(): void {
  localStorage.removeItem('current_run_total');
}
