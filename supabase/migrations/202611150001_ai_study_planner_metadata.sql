-- Store AI plan grouping and session learning details on existing study plan rows.
-- Existing manual study_plans rows retain an empty metadata object and existing RLS.
ALTER TABLE public.study_plans
  ADD COLUMN IF NOT EXISTS planner_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_study_plans_user_ai_plan_group
  ON public.study_plans (user_id, (planner_metadata ->> 'planGroupId'))
  WHERE planner_metadata ? 'planGroupId';
