-- Authenticated clients must not delete profiles and recreate them with a different role.
-- Deleting auth.users still removes its profile through the existing foreign-key cascade.
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
REVOKE DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
