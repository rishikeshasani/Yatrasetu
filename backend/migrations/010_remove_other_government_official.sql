-- ============================================================================
-- YatraSetu Migration 010: Remove Other Government Official (Municipal) Subrole
-- Non-destructive, additive migration to constrain government classifications to:
--   1. government_official (Civil / Government Administration)
--   2. police_official (Police / Law Enforcement Operations)
-- Preserves all existing tables, profiles, users, foreign keys, and site/amenity data.
-- ============================================================================

-- 1. Safely migrate any existing profiles with 'other_government_official' to 'government_official'
UPDATE public.profiles
SET government_subrole = 'government_official'
WHERE government_subrole = 'other_government_official';

-- 2. Also ensure any null/empty government subroles on government accounts are normalized
UPDATE public.profiles
SET government_subrole = 'government_official'
WHERE role = 'government' AND (government_subrole IS NULL OR government_subrole = '' OR government_subrole NOT IN ('government_official', 'police_official'));

-- 3. Safely replace the CHECK constraint on public.profiles to permit only 'government_official' and 'police_official'
DO $$
BEGIN
  -- Drop constraint if it exists under the standard name from Migration 009
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_government_subrole_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_government_subrole_check;
  END IF;

  -- Add updated constraint allowing only the two approved subroles
  ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_government_subrole_check
  CHECK (government_subrole IS NULL OR government_subrole IN (
    'government_official',
    'police_official'
  ));
END $$;
