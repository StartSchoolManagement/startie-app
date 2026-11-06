-- =====================================================
-- 2026-11-06  Lock down public access, add RPCs, fix realtime
--
-- Players never sign in (they use the anon key from the site bundle),
-- so the anon role must not be able to write tables directly or read PII.
-- All writes go through SECURITY DEFINER functions with validation.
-- Admins sign in with Supabase Auth and keep full table access.
--
-- Applied to project avhwbbkfzstchdjrjkat on 2026-11-06 (sections 1-5).
-- Section 6 (drops) must be run from the SQL editor / with confirmation.
-- =====================================================

-- -----------------------------------------------------
-- 1. Harden existing functions
-- -----------------------------------------------------
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.clear_all_scores() SET search_path = '';
ALTER FUNCTION public.delete_score(uuid) SET search_path = '';

-- Only the dashboard / service role may call the bulk admin helpers.
REVOKE EXECUTE ON FUNCTION public.clear_all_scores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_score(uuid) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------
-- 2. Player RPCs (the only write path for anon)
-- -----------------------------------------------------

-- Register a new player or recognise a returning one by email.
CREATE OR REPLACE FUNCTION public.register_player(
  p_name text,
  p_email text,
  p_username text,
  p_consent boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email    text := lower(trim(p_email));
  v_username text := upper(trim(p_username));
  v_name     text := trim(p_name);
  v_user     public.users%ROWTYPE;
  v_score    public.scores%ROWTYPE;
  v_is_new   boolean := false;
BEGIN
  IF v_name IS NULL OR length(v_name) < 2 THEN
    RAISE EXCEPTION 'Please enter your name';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  IF v_username IS NULL OR v_username !~ '^[A-Z0-9]{3}$' THEN
    RAISE EXCEPTION 'Username must be exactly 3 letters or numbers';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE email = v_email;

  IF FOUND THEN
    -- Returning player: keep their stored username, refresh consent.
    IF v_user.consent IS DISTINCT FROM p_consent THEN
      UPDATE public.users SET consent = p_consent WHERE id = v_user.id
      RETURNING * INTO v_user;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.users WHERE upper(username) = v_username) THEN
      RAISE EXCEPTION 'Username already taken. Choose another.';
    END IF;
    INSERT INTO public.users (name, email, username, consent, verified, current_level)
    VALUES (v_name, v_email, v_username, coalesce(p_consent, false), true, 1)
    RETURNING * INTO v_user;
    v_is_new := true;
  END IF;

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = v_user.id
  ORDER BY score DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'id',       v_user.id,
    'name',     v_user.name,
    'email',    v_user.email,
    'username', v_user.username,
    'consent',  v_user.consent,
    'verified', v_user.verified,
    'score',    coalesce(v_score.score, 0),
    'level',    greatest(coalesce(v_score.current_level, 1), v_user.current_level),
    'is_new',   v_is_new
  );
END;
$$;

-- Record a player total score. Scores only ever go up; one row per player.
CREATE OR REPLACE FUNCTION public.submit_score(
  p_user_id uuid,
  p_score integer,
  p_level integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_score public.scores%ROWTYPE;
  v_level integer;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Unknown player';
  END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 10000 THEN
    RAISE EXCEPTION 'Invalid score';
  END IF;
  IF p_level IS NULL OR p_level < 1 OR p_level > 10 THEN
    RAISE EXCEPTION 'Invalid level';
  END IF;

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = p_user_id
  ORDER BY score DESC
  LIMIT 1;

  IF FOUND THEN
    v_level := greatest(v_score.current_level, p_level);
    UPDATE public.scores
    SET score = greatest(score, p_score), current_level = v_level
    WHERE id = v_score.id
    RETURNING * INTO v_score;
  ELSE
    INSERT INTO public.scores (user_id, score, current_level)
    VALUES (p_user_id, p_score, p_level)
    RETURNING * INTO v_score;
  END IF;

  UPDATE public.users
  SET current_level = greatest(current_level, v_score.current_level)
  WHERE id = p_user_id;

  RETURN jsonb_build_object('score', v_score.score, 'level', v_score.current_level);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_player(text, text, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_score(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_player(text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_score(uuid, integer, integer) TO anon, authenticated;

-- -----------------------------------------------------
-- 3. Table privileges
-- -----------------------------------------------------

-- users: anon may only read the columns the leaderboard needs. No PII, no writes.
REVOKE ALL ON TABLE public.users FROM anon;
GRANT SELECT (id, username, current_level) ON TABLE public.users TO anon;

-- scores: anon reads the leaderboard (no PII in this table); writes only via submit_score.
REVOKE ALL ON TABLE public.scores FROM anon;
GRANT SELECT ON TABLE public.scores TO anon;

-- legacy objects: nobody reads them through the API any more (dropped in section 6)
REVOKE ALL ON TABLE public.leaderboard FROM anon, authenticated;
REVOKE ALL ON public.leaderboard_view FROM anon, authenticated;
ALTER VIEW public.leaderboard_view SET (security_invoker = true);

-- -----------------------------------------------------
-- 4. RLS: write policies now apply to signed-in admins only.
--    The two "publicly readable" SELECT policies stay; column grants
--    limit what anon can actually see on users.
-- -----------------------------------------------------
ALTER POLICY "Anyone can insert users"         ON public.users  TO authenticated;
ALTER POLICY "Users can update their own data" ON public.users  TO authenticated;
ALTER POLICY "Anyone can insert scores"        ON public.scores TO authenticated;
ALTER POLICY "Scores can be updated"           ON public.scores TO authenticated;
ALTER POLICY "Scores can be deleted"           ON public.scores TO authenticated;

-- -----------------------------------------------------
-- 5. Realtime: the live leaderboard listens for changes on scores
-- -----------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;

-- -----------------------------------------------------
-- 6. Admin allow-list (applied 2026-11-06, second pass)
--    "authenticated" alone is not an admin check: anyone who can sign in
--    would qualify. Only auth users listed in public.admins may manage data.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admins FROM anon, authenticated;
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users WHERE email IN ('eliassbaranovs@startschool.org', 'admin@startschool.org')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = (SELECT auth.uid())) $$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Writes: admins only. Reads: anonymous visitors (leaderboard, column-limited) or admins.
ALTER POLICY "Anyone can insert users"         ON public.users  TO authenticated WITH CHECK (public.is_admin());
ALTER POLICY "Users can update their own data" ON public.users  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
ALTER POLICY "Anyone can insert scores"        ON public.scores TO authenticated WITH CHECK (public.is_admin());
ALTER POLICY "Scores can be updated"           ON public.scores TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
ALTER POLICY "Scores can be deleted"           ON public.scores TO authenticated USING (public.is_admin());
ALTER POLICY "Users are publicly readable"     ON public.users  USING ((SELECT auth.uid()) IS NULL OR public.is_admin());
ALTER POLICY "Scores are publicly readable"    ON public.scores USING ((SELECT auth.uid()) IS NULL OR public.is_admin());

-- -----------------------------------------------------
-- 7. Per-player token (applied 2026-11-06, second pass)
--    submit_score used to accept any user id, so anyone could raise anyone's
--    score. register_player now issues a secret; only its sha256 is stored.
-- -----------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_hash text;

CREATE OR REPLACE FUNCTION public.register_player(
  p_name text,
  p_email text,
  p_username text,
  p_consent boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email    text := lower(trim(p_email));
  v_username text := upper(trim(p_username));
  v_name     text := trim(p_name);
  v_token    text := gen_random_uuid()::text || gen_random_uuid()::text;
  v_hash     text := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');
  v_user     public.users%ROWTYPE;
  v_score    public.scores%ROWTYPE;
  v_is_new   boolean := false;
BEGIN
  IF v_name IS NULL OR length(v_name) < 2 THEN
    RAISE EXCEPTION 'Please enter your name';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  IF v_username IS NULL OR v_username !~ '^[A-Z0-9]{3}$' THEN
    RAISE EXCEPTION 'Username must be exactly 3 letters or numbers';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE email = v_email;

  IF FOUND THEN
    -- Returning player: keep stored username, refresh consent, rotate token.
    UPDATE public.users
    SET consent = coalesce(p_consent, consent), token_hash = v_hash
    WHERE id = v_user.id
    RETURNING * INTO v_user;
  ELSE
    IF EXISTS (SELECT 1 FROM public.users WHERE upper(username) = v_username) THEN
      RAISE EXCEPTION 'Username already taken. Choose another.';
    END IF;
    INSERT INTO public.users (name, email, username, consent, verified, current_level, token_hash)
    VALUES (v_name, v_email, v_username, coalesce(p_consent, false), true, 1, v_hash)
    RETURNING * INTO v_user;
    v_is_new := true;
  END IF;

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = v_user.id
  ORDER BY score DESC
  LIMIT 1;

  -- Never echo the stored name back: the caller only proved they know the email.
  RETURN jsonb_build_object(
    'id',       v_user.id,
    'token',    v_token,
    'name',     v_name,
    'email',    v_user.email,
    'username', v_user.username,
    'consent',  v_user.consent,
    'verified', v_user.verified,
    'score',    coalesce(v_score.score, 0),
    'level',    greatest(coalesce(v_score.current_level, 1), v_user.current_level),
    'is_new',   v_is_new
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_score(
  p_user_id uuid,
  p_token text,
  p_score integer,
  p_level integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_score public.scores%ROWTYPE;
  v_level integer;
BEGIN
  IF p_user_id IS NULL OR p_token IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
      AND token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  ) THEN
    RAISE EXCEPTION 'Not authorised for this player';
  END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 10000 THEN
    RAISE EXCEPTION 'Invalid score';
  END IF;
  IF p_level IS NULL OR p_level < 1 OR p_level > 10 THEN
    RAISE EXCEPTION 'Invalid level';
  END IF;

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = p_user_id
  ORDER BY score DESC
  LIMIT 1;

  IF FOUND THEN
    v_level := greatest(v_score.current_level, p_level);
    UPDATE public.scores
    SET score = greatest(score, p_score), current_level = v_level
    WHERE id = v_score.id
    RETURNING * INTO v_score;
  ELSE
    INSERT INTO public.scores (user_id, score, current_level)
    VALUES (p_user_id, p_score, p_level)
    RETURNING * INTO v_score;
  END IF;

  UPDATE public.users
  SET current_level = greatest(current_level, v_score.current_level)
  WHERE id = p_user_id;

  RETURN jsonb_build_object('score', v_score.score, 'level', v_score.current_level);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_score(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_score(uuid, text, integer, integer) TO anon, authenticated;

-- The old token-less overload is the hole: locked here, dropped in section 8.
REVOKE EXECUTE ON FUNCTION public.submit_score(uuid, integer, integer) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------
-- 8. Drop legacy objects (destructive; run from the SQL editor)
-- -----------------------------------------------------
-- DROP FUNCTION IF EXISTS public.submit_score(uuid, integer, integer);  -- token-less overload
-- DROP VIEW IF EXISTS public.leaderboard_view;      -- SECURITY DEFINER view that exposed emails
-- DROP TABLE IF EXISTS public.leaderboard CASCADE;  -- pre-rewrite table, 0 rows, unused
-- DROP INDEX IF EXISTS public.idx_users_email;      -- duplicate of users_email_key
-- DELETE FROM public.users WHERE email = 'live-test@startschool.org';  -- TST test player
