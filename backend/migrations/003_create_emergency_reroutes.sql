-- ============================================================================
-- YatraSetu Emergency Reroute Module Migration
-- Table: public.emergency_reroutes
-- Dedicated persistent table for cross-dashboard emergency reroute events
-- ============================================================================

-- 1. Create public.emergency_reroutes Table
CREATE TABLE IF NOT EXISTS public.emergency_reroutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  crowd_status TEXT NOT NULL CHECK (crowd_status IN ('NORMAL', 'MODERATE', 'HIGH', 'CRITICAL')),
  occupancy_percentage DOUBLE PRECISION NOT NULL,
  people_count INTEGER NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'EMERGENCY_REROUTE',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
  diverted_tourists INTEGER NOT NULL DEFAULT 350,
  partner_buses INTEGER NOT NULL DEFAULT 14,
  partner_hotels INTEGER NOT NULL DEFAULT 22,
  alternative_routes JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_reroutes_site ON public.emergency_reroutes(site_id);
CREATE INDEX IF NOT EXISTS idx_emergency_reroutes_status ON public.emergency_reroutes(status);
CREATE INDEX IF NOT EXISTS idx_emergency_reroutes_activated_at ON public.emergency_reroutes(activated_at DESC);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.emergency_reroutes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-applying
DROP POLICY IF EXISTS "Public read emergency reroutes" ON public.emergency_reroutes;
DROP POLICY IF EXISTS "Government insert emergency reroutes" ON public.emergency_reroutes;
DROP POLICY IF EXISTS "Government update emergency reroutes" ON public.emergency_reroutes;
DROP POLICY IF EXISTS "Government manage emergency reroutes" ON public.emergency_reroutes;

-- Policy 1: Anyone (Devotees, Travel operators, Hotels, Public) can read emergency reroute events
CREATE POLICY "Public read emergency reroutes"
  ON public.emergency_reroutes FOR SELECT
  USING (true);

-- Policy 2: Only verified Government officers can manage (insert/update/delete) emergency reroute events
CREATE POLICY "Government manage emergency reroutes"
  ON public.emergency_reroutes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'government'
    )
  );
