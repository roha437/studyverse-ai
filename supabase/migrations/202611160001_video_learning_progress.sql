CREATE TABLE IF NOT EXISTS public.video_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL CHECK (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  channel TEXT NOT NULL CHECK (char_length(channel) BETWEEN 1 AND 120),
  thumbnail_url TEXT CHECK (
    thumbnail_url IS NULL OR
    thumbnail_url ~ '^https://(i\.ytimg\.com|img\.youtube\.com)/'
  ),
  class_level TEXT NOT NULL CHECK (class_level IN (
    'class-5', 'class-6', 'class-7', 'class-8', 'class-9', 'class-10', 'inter-1', 'inter-2'
  )),
  board TEXT NOT NULL CHECK (board IN ('NCERT / CBSE', 'State Board', 'Intermediate Board')),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 100),
  chapter TEXT NOT NULL CHECK (char_length(chapter) BETWEEN 1 AND 180),
  topic TEXT NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 180),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.video_learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own video learning progress"
  ON public.video_learning_progress;
CREATE POLICY "Users can view their own video learning progress"
  ON public.video_learning_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own video learning progress"
  ON public.video_learning_progress;
CREATE POLICY "Users can insert their own video learning progress"
  ON public.video_learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own video learning progress"
  ON public.video_learning_progress;
CREATE POLICY "Users can update their own video learning progress"
  ON public.video_learning_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_learning_progress_user_updated
  ON public.video_learning_progress (user_id, updated_at DESC);
