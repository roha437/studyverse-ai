-- StudyVerse Row Level Security (RLS) Policies & Safe Auth Signup Profile Trigger
-- Idempotent migration enforcing strict owner-only access on all student tables.

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 1. profiles policies (owner identified by id = auth.uid())
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- 2. student_progress policies
DROP POLICY IF EXISTS "student_progress_select_own" ON public.student_progress;
CREATE POLICY "student_progress_select_own"
  ON public.student_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_progress_insert_own" ON public.student_progress;
CREATE POLICY "student_progress_insert_own"
  ON public.student_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_progress_update_own" ON public.student_progress;
CREATE POLICY "student_progress_update_own"
  ON public.student_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_progress_delete_own" ON public.student_progress;
CREATE POLICY "student_progress_delete_own"
  ON public.student_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. study_plans policies
DROP POLICY IF EXISTS "study_plans_select_own" ON public.study_plans;
CREATE POLICY "study_plans_select_own"
  ON public.study_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_plans_insert_own" ON public.study_plans;
CREATE POLICY "study_plans_insert_own"
  ON public.study_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_plans_update_own" ON public.study_plans;
CREATE POLICY "study_plans_update_own"
  ON public.study_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_plans_delete_own" ON public.study_plans;
CREATE POLICY "study_plans_delete_own"
  ON public.study_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. notes policies
DROP POLICY IF EXISTS "notes_select_own" ON public.notes;
CREATE POLICY "notes_select_own"
  ON public.notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_insert_own" ON public.notes;
CREATE POLICY "notes_insert_own"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_update_own" ON public.notes;
CREATE POLICY "notes_update_own"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_delete_own" ON public.notes;
CREATE POLICY "notes_delete_own"
  ON public.notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. quiz_attempts policies
DROP POLICY IF EXISTS "quiz_attempts_select_own" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select_own"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_attempts_insert_own" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_insert_own"
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_attempts_update_own" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_update_own"
  ON public.quiz_attempts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_attempts_delete_own" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_delete_own"
  ON public.quiz_attempts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. test_attempts policies
DROP POLICY IF EXISTS "test_attempts_select_own" ON public.test_attempts;
CREATE POLICY "test_attempts_select_own"
  ON public.test_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "test_attempts_insert_own" ON public.test_attempts;
CREATE POLICY "test_attempts_insert_own"
  ON public.test_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "test_attempts_update_own" ON public.test_attempts;
CREATE POLICY "test_attempts_update_own"
  ON public.test_attempts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "test_attempts_delete_own" ON public.test_attempts;
CREATE POLICY "test_attempts_delete_own"
  ON public.test_attempts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. bookmarks policies
DROP POLICY IF EXISTS "bookmarks_select_own" ON public.bookmarks;
CREATE POLICY "bookmarks_select_own"
  ON public.bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_insert_own" ON public.bookmarks;
CREATE POLICY "bookmarks_insert_own"
  ON public.bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_update_own" ON public.bookmarks;
CREATE POLICY "bookmarks_update_own"
  ON public.bookmarks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_delete_own" ON public.bookmarks;
CREATE POLICY "bookmarks_delete_own"
  ON public.bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. achievements policies
DROP POLICY IF EXISTS "achievements_select_own" ON public.achievements;
CREATE POLICY "achievements_select_own"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_insert_own" ON public.achievements;
CREATE POLICY "achievements_insert_own"
  ON public.achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_update_own" ON public.achievements;
CREATE POLICY "achievements_update_own"
  ON public.achievements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_delete_own" ON public.achievements;
CREATE POLICY "achievements_delete_own"
  ON public.achievements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Safe profile auto-creation trigger on auth.users signup
-- Uses exception handling so profile insert issues never block auth signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name TEXT;
  v_class_level TEXT;
  v_board TEXT;
  v_stream TEXT;
  v_daily_minutes INTEGER := 90;
  v_guardian_name TEXT;
  v_academic_goal TEXT;
  v_preferred_language TEXT;
BEGIN
  v_full_name := COALESCE(
    NULLIF(trim(v_meta ->> 'full_name'), ''),
    NULLIF(trim(v_meta ->> 'name'), ''),
    split_part(COALESCE(NEW.email, 'Student'), '@', 1)
  );
  v_class_level := COALESCE(
    NULLIF(trim(v_meta ->> 'class_level'), ''),
    NULLIF(trim(v_meta ->> 'gradeId'), ''),
    'class-10'
  );
  v_board := COALESCE(
    NULLIF(trim(v_meta ->> 'curriculum_board'), ''),
    NULLIF(trim(v_meta ->> 'board'), ''),
    'NCERT / CBSE'
  );
  v_stream := COALESCE(
    NULLIF(trim(v_meta ->> 'stream'), ''),
    NULLIF(trim(v_meta ->> 'streamId'), ''),
    'general'
  );
  v_guardian_name := COALESCE(
    NULLIF(trim(v_meta ->> 'guardian_name'), ''),
    NULLIF(trim(v_meta ->> 'guardianName'), ''),
    ''
  );
  v_academic_goal := COALESCE(
    NULLIF(trim(v_meta ->> 'academic_goal'), ''),
    NULLIF(trim(v_meta ->> 'academicGoal'), ''),
    ''
  );
  v_preferred_language := COALESCE(
    NULLIF(trim(v_meta ->> 'preferred_language'), ''),
    NULLIF(trim(v_meta ->> 'preferredLanguage'), ''),
    'English'
  );

  IF (v_meta ->> 'daily_study_minutes') ~ '^\d+$' THEN
    v_daily_minutes := GREATEST(15, LEAST(720, (v_meta ->> 'daily_study_minutes')::INTEGER));
  ELSIF (v_meta ->> 'dailyGoalMinutes') ~ '^\d+$' THEN
    v_daily_minutes := GREATEST(15, LEAST(720, (v_meta ->> 'dailyGoalMinutes')::INTEGER));
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    class_level,
    curriculum_board,
    stream,
    academic_goal,
    daily_study_minutes,
    preferred_language,
    guardian_name
  )
  VALUES (
    NEW.id,
    v_full_name,
    NULLIF(trim(v_meta ->> 'avatar_url'), ''),
    v_class_level,
    v_board,
    v_stream,
    v_academic_goal,
    v_daily_minutes,
    v_preferred_language,
    v_guardian_name
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'public.handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
