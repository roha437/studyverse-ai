-- StudyVerse Production PostgreSQL Schema Migration
-- Idempotent migration creating core student learning tables, constraints,
-- indexes, and updated_at triggers.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  class_level TEXT NOT NULL DEFAULT 'class-10',
  curriculum_board TEXT NOT NULL DEFAULT 'NCERT / CBSE',
  stream TEXT NOT NULL DEFAULT 'general',
  academic_goal TEXT DEFAULT '',
  target_marks INTEGER CHECK (target_marks IS NULL OR (target_marks >= 0 AND target_marks <= 100)),
  exam_date DATE,
  daily_study_minutes INTEGER NOT NULL DEFAULT 90 CHECK (daily_study_minutes BETWEEN 15 AND 720),
  preferred_language TEXT NOT NULL DEFAULT 'English',
  guardian_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. student_progress
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
  time_spent_minutes INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_minutes >= 0),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_student_progress_user_topic UNIQUE (user_id, class_level, subject, chapter_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_user_class
  ON public.student_progress (user_id, class_level, subject);

CREATE INDEX IF NOT EXISTS idx_student_progress_user_last_accessed
  ON public.student_progress (user_id, last_accessed_at DESC);

DROP TRIGGER IF EXISTS trg_student_progress_updated_at ON public.student_progress;
CREATE TRIGGER trg_student_progress_updated_at
  BEFORE UPDATE ON public.student_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. study_plans
CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subject TEXT NOT NULL DEFAULT 'General',
  chapter_id TEXT,
  task_description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 600),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_date
  ON public.study_plans (user_id, plan_date ASC);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_status
  ON public.study_plans (user_id, status);

-- 4. notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  class_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter_id TEXT,
  topic_id TEXT,
  note_type TEXT NOT NULL DEFAULT 'summary' CHECK (note_type IN ('summary', 'formulas', 'qa', 'mindmap', 'custom')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON public.notes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_user_subject
  ON public.notes (user_id, class_level, subject);

DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter_id TEXT,
  quiz_type TEXT NOT NULL DEFAULT 'practice',
  difficulty TEXT NOT NULL DEFAULT 'Board Standard',
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
  score_percentage NUMERIC(5,2) NOT NULL CHECK (score_percentage >= 0 AND score_percentage <= 100),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_quiz_correct_le_total CHECK (correct_answers <= total_questions)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_completed
  ON public.quiz_attempts (user_id, completed_at DESC);

-- 6. test_attempts
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  class_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'chapter-test',
  total_marks NUMERIC(6,2) NOT NULL CHECK (total_marks > 0),
  obtained_marks NUMERIC(6,2) NOT NULL CHECK (obtained_marks >= 0),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_test_obtained_le_total CHECK (obtained_marks <= total_marks)
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_completed
  ON public.test_attempts (user_id, completed_at DESC);

-- 7. bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('lesson', 'topic', 'note', 'video', 'numerical')),
  resource_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_bookmarks_user_resource UNIQUE (user_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_type
  ON public.bookmarks (user_id, resource_type, created_at DESC);

-- 8. achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_achievements_user_code UNIQUE (user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_unlocked
  ON public.achievements (user_id, unlocked_at DESC);
