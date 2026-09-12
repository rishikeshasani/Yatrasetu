-- ============================================================================
-- YatraSetu Migration 008: Support Police Role Authorization
-- Additive RLS policies for Police Command operations
-- Preserves Migration 007 and all existing database tables
-- ============================================================================

-- 1. Grant Police Command full management permissions on crowd_simulations
DROP POLICY IF EXISTS "Police manage crowd simulations" ON public.crowd_simulations;

CREATE POLICY "Police manage crowd simulations"
  ON public.crowd_simulations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'police'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'police'
    )
  );

-- 2. Grant Police Command management permissions on emergency_reroutes
DROP POLICY IF EXISTS "Police manage emergency reroutes" ON public.emergency_reroutes;

CREATE POLICY "Police manage emergency reroutes"
  ON public.emergency_reroutes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'police'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'police'
    )
  );
