ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS topic_id text;
