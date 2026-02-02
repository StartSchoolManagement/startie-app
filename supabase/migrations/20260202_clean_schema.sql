-- =====================================================
-- STARTIE/LOGICRUN - Clean Database Schema
-- Run this after dropping all existing tables
-- =====================================================

-- Drop existing tables and policies if they exist
DROP TABLE IF EXISTS public.scores CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.leaderboard CASCADE;

-- =====================================================
-- 1. USERS TABLE - Stores player registration data
-- =====================================================
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- User information
  name TEXT NOT NULL,
  username VARCHAR(3) NOT NULL,
  email TEXT NOT NULL UNIQUE,
  
  -- Consent for announcements
  consent BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Account status
  verified BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Current game progress (persists across score resets)
  current_level INTEGER DEFAULT 1 NOT NULL
);

-- Indexes for users table
CREATE UNIQUE INDEX idx_users_email ON public.users(email);
CREATE UNIQUE INDEX idx_users_username ON public.users(UPPER(username));
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX idx_users_consent ON public.users(consent);

-- =====================================================
-- 2. SCORES TABLE - Stores game scores (can be cleared)
-- =====================================================
CREATE TABLE public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Reference to user
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Score data
  score INTEGER DEFAULT 0 NOT NULL,
  current_level INTEGER DEFAULT 1 NOT NULL,
  
  -- Event tracking (optional - for grouping by event/day)
  event_name TEXT DEFAULT NULL
);

-- Indexes for scores table
CREATE INDEX idx_scores_user_id ON public.scores(user_id);
CREATE INDEX idx_scores_score ON public.scores(score DESC);
CREATE INDEX idx_scores_created_at ON public.scores(created_at DESC);
CREATE INDEX idx_scores_event ON public.scores(event_name);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Users are publicly readable" ON public.users;
CREATE POLICY "Users are publicly readable"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
CREATE POLICY "Anyone can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (true);

-- Enable RLS on scores table
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Scores table policies
DROP POLICY IF EXISTS "Scores are publicly readable" ON public.scores;
CREATE POLICY "Scores are publicly readable"
  ON public.scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert scores" ON public.scores;
CREATE POLICY "Anyone can insert scores"
  ON public.scores FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Scores can be updated" ON public.scores;
CREATE POLICY "Scores can be updated"
  ON public.scores FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Scores can be deleted" ON public.scores;
CREATE POLICY "Scores can be deleted"
  ON public.scores FOR DELETE
  USING (true);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scores_updated_at ON public.scores;
CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. VIEWS FOR LEADERBOARD
-- =====================================================

-- View for the current leaderboard (active scores)
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  u.id as user_id,
  u.name,
  u.username,
  u.email,
  u.consent,
  u.created_at as user_created_at,
  s.id as score_id,
  s.score,
  s.current_level,
  s.event_name,
  s.created_at as score_created_at,
  s.updated_at as score_updated_at
FROM public.users u
LEFT JOIN public.scores s ON u.id = s.user_id
ORDER BY s.score DESC NULLS LAST;

-- =====================================================
-- 6. ADMIN FUNCTIONS (for authenticated admin users)
-- =====================================================

-- Function to clear all scores but keep users
-- Call this between events/days
CREATE OR REPLACE FUNCTION clear_all_scores()
RETURNS void AS $$
BEGIN
  DELETE FROM public.scores;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a specific score entry
CREATE OR REPLACE FUNCTION delete_score(score_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM public.scores WHERE id = score_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTES FOR ADMIN:
-- - Users table persists: name, username, email, consent
-- - Scores table can be cleared between events
-- - Each event day: clear_all_scores(), users play, scores accumulate
-- - Individual scores can be deleted via delete_score(score_id)
-- =====================================================
