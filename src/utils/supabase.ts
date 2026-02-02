// Supabase client initialization and authentication
/// <reference types="vite/client" />
import { createClient, SupabaseClient, User, AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: SupabaseClient | null = null;

export function initSupabase(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Validate config
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase config not found. Make sure .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

// Authentication functions

/**
 * Send a magic link to the user's email for passwordless authentication
 */
export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not available' };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/highscores.html`
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<{ user: User | null; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { user: null, error: 'Supabase not available' };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return { user: null, error: error.message };
    }

    return { user };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not available' };
  }

  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { user } = await getCurrentUser();
  return user !== null;
}
