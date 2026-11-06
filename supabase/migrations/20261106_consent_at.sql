-- =====================================================
-- 2026-11-06  Record when a player opted in to announcements
--
-- consent alone says "yes/no" but not when. Mailing tools and any later
-- audit need the timestamp. consent_at is set when consent flips to true
-- and cleared when it is withdrawn.
--
-- Applied to project avhwbbkfzstchdjrjkat on 2026-11-06.
-- =====================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS consent_at timestamptz;

-- Backfill: every existing opt-in was given on the registration form,
-- so the registration time is the best record we have.
UPDATE public.users SET consent_at = created_at
WHERE consent = true AND consent_at IS NULL;

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
  v_consent  boolean;
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
    v_consent := coalesce(p_consent, v_user.consent);
    UPDATE public.users
    SET consent    = v_consent,
        consent_at = CASE
                       WHEN v_consent AND NOT v_user.consent THEN now()   -- newly opted in
                       WHEN v_consent THEN v_user.consent_at              -- unchanged, keep original time
                       ELSE NULL                                          -- withdrawn
                     END,
        token_hash = v_hash
    WHERE id = v_user.id
    RETURNING * INTO v_user;
  ELSE
    IF EXISTS (SELECT 1 FROM public.users WHERE upper(username) = v_username) THEN
      RAISE EXCEPTION 'Username already taken. Choose another.';
    END IF;
    v_consent := coalesce(p_consent, false);
    INSERT INTO public.users (name, email, username, consent, consent_at, verified, current_level, token_hash)
    VALUES (v_name, v_email, v_username, v_consent,
            CASE WHEN v_consent THEN now() END, true, 1, v_hash)
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
