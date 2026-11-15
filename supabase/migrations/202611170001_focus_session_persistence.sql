CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 160),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 100),
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 0 AND 86400),
  status text NOT NULL CHECK (status IN ('completed', 'interrupted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT focus_sessions_valid_interval CHECK (ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS focus_sessions_user_started_at_idx
  ON public.focus_sessions (user_id, started_at DESC);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "focus_sessions_select_own" ON public.focus_sessions;
CREATE POLICY "focus_sessions_select_own"
  ON public.focus_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "focus_sessions_insert_own" ON public.focus_sessions;
CREATE POLICY "focus_sessions_insert_own"
  ON public.focus_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

