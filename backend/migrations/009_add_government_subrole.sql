-- ============================================================================
-- YatraSetu Migration 009: Add Government Subrole Classification to Profiles
-- Additive migration for Unified Government Dashboard architecture
-- Preserves all existing tables, profiles, sites, bookings, and simulation records
-- ============================================================================

-- 1. Add government_subrole column to public.profiles table if not already present
-- Default is 'government_official' to ensure 100% backward compatibility for existing government users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS government_subrole TEXT DEFAULT 'government_official';

-- 2. Validate government_subrole allowed values via a CHECK constraint (if not already existing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_government_subrole_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_government_subrole_check
    CHECK (government_subrole IS NULL OR government_subrole IN (
      'government_official',
      'police_official',
      'other_government_official'
    ));
  END IF;
END $$;

-- 3. Set default classification for any existing government profiles that have NULL subrole
UPDATE public.profiles
SET government_subrole = 'government_official'
WHERE role = 'government' AND (government_subrole IS NULL OR government_subrole = '');

-- 4. Non-destructive RLS policies on public.crowd_simulations
-- Allow users with role = 'government' AND government_subrole = 'police_official'
-- (or legacy role = 'police') full management permissions
DROP POLICY IF EXISTS "Police official manage crowd simulations" ON public.crowd_simulations;

CREATE POLICY "Police official manage crowd simulations"
  ON public.crowd_simulations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          (profiles.role = 'government' AND profiles.government_subrole = 'police_official')
          OR profiles.role = 'police'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          (profiles.role = 'government' AND profiles.government_subrole = 'police_official')
          OR profiles.role = 'police'
        )
    )
  );

-- 5. Non-destructive RLS policies on public.emergency_reroutes
-- Allow users with role = 'government' (any subrole) or role = 'police' management permissions
DROP POLICY IF EXISTS "Government and police manage emergency reroutes" ON public.emergency_reroutes;

CREATE POLICY "Government and police manage emergency reroutes"
  ON public.emergency_reroutes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'government' OR profiles.role = 'police')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'government' OR profiles.role = 'police')
    )
  );
