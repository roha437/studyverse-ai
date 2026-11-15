ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_role text NOT NULL DEFAULT 'student';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_role_check
  CHECK (account_role IN ('student', 'parent'));

CREATE OR REPLACE FUNCTION public.prevent_account_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Signup role assignment runs without an authenticated user; block client-side role changes.
  IF NEW.account_role IS DISTINCT FROM OLD.account_role AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Account role cannot be changed directly' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_account_role_change ON public.profiles;
CREATE TRIGGER prevent_client_account_role_change
  BEFORE UPDATE OF account_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_account_role_change();

CREATE OR REPLACE FUNCTION public.set_signup_account_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.profiles
  SET account_role = CASE
    WHEN NEW.raw_user_meta_data ->> 'account_role' = 'parent' THEN 'parent'
    ELSE 'student'
  END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS z_set_signup_account_role ON auth.users;
CREATE TRIGGER z_set_signup_account_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_signup_account_role();

CREATE TABLE IF NOT EXISTS public.guardian_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  consented_at timestamptz NOT NULL,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((claimed_by IS NULL) = (claimed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS guardian_invitations_student_created_idx
  ON public.guardian_invitations (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.guardian_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consented_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (student_id <> guardian_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS guardian_student_links_active_unique
  ON public.guardian_student_links (student_id, guardian_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS guardian_student_links_guardian_idx
  ON public.guardian_student_links (guardian_id, created_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_invitations_select_own" ON public.guardian_invitations;
CREATE POLICY "guardian_invitations_select_own"
  ON public.guardian_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "guardian_student_links_select_participant" ON public.guardian_student_links;
CREATE POLICY "guardian_student_links_select_participant"
  ON public.guardian_student_links FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = guardian_id);

REVOKE ALL ON public.guardian_invitations FROM anon, authenticated;
REVOKE ALL ON public.guardian_student_links FROM anon, authenticated;
GRANT SELECT ON public.guardian_invitations, public.guardian_student_links TO authenticated;

DROP FUNCTION IF EXISTS public.guardian_create_invitation(text);

CREATE OR REPLACE FUNCTION public.guardian_create_invitation(
  p_token_hash text,
  p_consent_given boolean
)
RETURNS TABLE (invitation_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_student_id uuid := auth.uid();
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_student_id AND account_role = 'student'
  ) THEN
    RAISE EXCEPTION 'A student account is required to invite a guardian' USING ERRCODE = '42501';
  END IF;
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid invitation code' USING ERRCODE = '22023';
  END IF;
  IF p_consent_given IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Student consent is required to invite a guardian' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(107878, hashtext(v_student_id::text));
  IF (
    SELECT count(*)
    FROM public.guardian_invitations
    WHERE student_id = v_student_id
      AND created_at > now() - interval '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'Invitation limit reached; try again tomorrow' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  INSERT INTO public.guardian_invitations (student_id, token_hash, expires_at, consented_at)
  VALUES (v_student_id, p_token_hash, now() + interval '24 hours', now())
  RETURNING id, guardian_invitations.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_claim_invitation(p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_guardian_id uuid := auth.uid();
  v_invitation public.guardian_invitations%ROWTYPE;
  v_link_id uuid;
BEGIN
  IF v_guardian_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_guardian_id AND account_role = 'parent'
  ) THEN
    RAISE EXCEPTION 'A guardian account is required to accept an invitation' USING ERRCODE = '42501';
  END IF;
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid or expired invitation code' USING ERRCODE = '22023';
  END IF;

  SELECT invitation.*
  INTO v_invitation
  FROM public.guardian_invitations invitation
  WHERE invitation.token_hash = p_token_hash
    AND invitation.claimed_by IS NULL
    AND invitation.revoked_at IS NULL
    AND invitation.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND OR v_invitation.student_id = v_guardian_id THEN
    RAISE EXCEPTION 'Invalid or expired invitation code' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.guardian_student_links (student_id, guardian_id, consented_at)
  VALUES (v_invitation.student_id, v_guardian_id, now())
  ON CONFLICT (student_id, guardian_id) WHERE revoked_at IS NULL
  DO UPDATE SET consented_at = EXCLUDED.consented_at
  RETURNING id INTO v_link_id;

  UPDATE public.guardian_invitations
  SET claimed_by = v_guardian_id, claimed_at = now()
  WHERE id = v_invitation.id;

  RETURN v_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_list_students()
RETURNS TABLE (
  link_id uuid,
  student_id uuid,
  full_name text,
  class_level text,
  stream text,
  curriculum_board text,
  linked_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_role = 'parent'
  ) THEN
    RAISE EXCEPTION 'A guardian account is required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT link.id, profile.id, profile.full_name, profile.class_level,
         profile.stream, profile.curriculum_board, link.created_at
  FROM public.guardian_student_links link
  JOIN public.profiles profile ON profile.id = link.student_id
  WHERE link.guardian_id = auth.uid() AND link.revoked_at IS NULL
  ORDER BY link.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_list_guardians()
RETURNS TABLE (
  link_id uuid,
  guardian_id uuid,
  full_name text,
  linked_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_role = 'student'
  ) THEN
    RAISE EXCEPTION 'A student account is required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT link.id, profile.id, profile.full_name, link.created_at
  FROM public.guardian_student_links link
  JOIN public.profiles profile ON profile.id = link.guardian_id
  WHERE link.student_id = auth.uid() AND link.revoked_at IS NULL
  ORDER BY link.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_get_student_summary(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_role = 'parent'
  ) THEN
    RAISE EXCEPTION 'A guardian account is required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guardian_student_links
    WHERE guardian_id = auth.uid()
      AND student_id = p_student_id
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This student has not approved guardian access' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'student', jsonb_build_object(
      'name', profile.full_name,
      'classLevel', profile.class_level,
      'stream', profile.stream,
      'board', profile.curriculum_board,
      'dailyGoalMinutes', profile.daily_study_minutes
    ),
    'progress', (
      SELECT jsonb_build_object(
        'trackedTopics', count(*),
        'completedTopics', count(*) FILTER (WHERE completion_percentage >= 100),
        'averageMastery', coalesce(round(avg(mastery_level))::integer, 0),
        'trackedMinutes', coalesce(sum(time_spent_minutes), 0)
      )
      FROM public.student_progress WHERE user_id = p_student_id
    ),
    'studyPlan', (
      SELECT jsonb_build_object(
        'totalSessions', count(*),
        'completedSessions', count(*) FILTER (WHERE status = 'completed'),
        'completedMinutes', coalesce(sum(duration_minutes) FILTER (WHERE status = 'completed'), 0)
      )
      FROM public.study_plans WHERE user_id = p_student_id
    ),
    'quizzes', (
      SELECT jsonb_build_object(
        'attempts', count(*),
        'averageScore', coalesce(round(avg(score_percentage))::integer, 0)
      )
      FROM public.quiz_attempts WHERE user_id = p_student_id
    ),
    'tests', (
      SELECT jsonb_build_object(
        'attempts', count(*),
        'averageScore', coalesce(round(avg(
          CASE WHEN total_marks > 0 THEN (obtained_marks::numeric / total_marks) * 100 ELSE 0 END
        ))::integer, 0)
      )
      FROM public.test_attempts WHERE user_id = p_student_id
    ),
    'focus', (
      SELECT jsonb_build_object(
        'completedSessions', count(*) FILTER (WHERE status = 'completed'),
        'completedMinutes', coalesce(sum(duration_seconds) FILTER (WHERE status = 'completed'), 0) / 60,
        'interruptedSessions', count(*) FILTER (WHERE status = 'interrupted')
      )
      FROM public.focus_sessions WHERE user_id = p_student_id
    ),
    'recentAssessments', (
      SELECT coalesce(
        jsonb_agg(to_jsonb(recent) ORDER BY recent.completed_at DESC),
        '[]'::jsonb
      )
      FROM (
        SELECT combined.subject, combined.score, combined.completed_at, combined.kind
        FROM (
          SELECT subject, score_percentage AS score, completed_at, 'quiz'::text AS kind
          FROM public.quiz_attempts WHERE user_id = p_student_id
          UNION ALL
          SELECT subject,
                 CASE WHEN total_marks > 0 THEN round((obtained_marks::numeric / total_marks) * 100)::integer ELSE 0 END,
                 completed_at, 'test'::text
          FROM public.test_attempts WHERE user_id = p_student_id
        ) combined
        ORDER BY combined.completed_at DESC
        LIMIT 10
      ) recent
    ),
    'achievements', (
      SELECT coalesce(
        jsonb_agg(jsonb_build_object('title', recent.title, 'unlockedAt', recent.unlocked_at)),
        '[]'::jsonb
      )
      FROM (
        SELECT title, unlocked_at
        FROM public.achievements
        WHERE user_id = p_student_id
        ORDER BY unlocked_at DESC
        LIMIT 20
      ) recent
    )
  )
  INTO v_summary
  FROM public.profiles profile
  WHERE profile.id = p_student_id;

  IF v_summary IS NULL THEN
    RAISE EXCEPTION 'Student profile not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_revoke_link(p_link_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.guardian_student_links
  SET revoked_at = now()
  WHERE id = p_link_id
    AND revoked_at IS NULL
    AND (student_id = auth.uid() OR guardian_id = auth.uid());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active guardian link not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_signup_account_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_account_role_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guardian_create_invitation(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guardian_claim_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guardian_list_students() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_list_guardians() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guardian_get_student_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guardian_revoke_link(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.guardian_create_invitation(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_claim_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_list_students() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_guardians() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_get_student_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_revoke_link(uuid) TO authenticated;
