-- ============================================================================
-- YatraSetu Police & Government Crowd Surge Simulation Module Migration
-- Table: public.crowd_simulations
-- Dedicated persistent table for internal-only crowd surge scenario simulations
-- ============================================================================

-- 1. Create public.crowd_simulations Table
CREATE TABLE IF NOT EXISTS public.crowd_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_id TEXT NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT 'Planned Rally / Event',
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  expected_crowd_increase INTEGER NOT NULL CHECK (expected_crowd_increase > 0),
  baseline_people_count INTEGER NOT NULL,
  simulated_people_count INTEGER NOT NULL,
  simulated_occupancy_percentage DOUBLE PRECISION NOT NULL,
  simulated_crowd_status TEXT NOT NULL CHECK (simulated_crowd_status IN ('NORMAL', 'MODERATE', 'HIGH', 'CRITICAL')),
  traffic_impact TEXT NOT NULL CHECK (traffic_impact IN ('LOW', 'MODERATE', 'HIGH', 'SEVERE')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  risk_explanation TEXT NOT NULL,
  estimated_delay_minutes INTEGER NOT NULL,
  delay_display TEXT NOT NULL,
  event_duration_hours DOUBLE PRECISION DEFAULT 4.0,
  high_risk_zones JSONB DEFAULT '[]'::jsonb,
  low_density_alternatives JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  data_sources JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_crowd_simulations_site ON public.crowd_simulations(site_id);
CREATE INDEX IF NOT EXISTS idx_crowd_simulations_created_by ON public.crowd_simulations(created_by);
CREATE INDEX IF NOT EXISTS idx_crowd_simulations_event_date ON public.crowd_simulations(event_date);
CREATE INDEX IF NOT EXISTS idx_crowd_simulations_created_at ON public.crowd_simulations(created_at DESC);

-- 3. Strict Row Level Security (RLS) Configuration
-- IMPORTANT: Public, tourists, hotels, and travel operators have NO READ OR WRITE ACCESS.
-- DO NOT USE USING (true) or WITH CHECK (true).
ALTER TABLE public.crowd_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Government read crowd simulations" ON public.crowd_simulations;
DROP POLICY IF EXISTS "Government insert crowd simulations" ON public.crowd_simulations;
DROP POLICY IF EXISTS "Government update crowd simulations" ON public.crowd_simulations;
DROP POLICY IF EXISTS "Government delete crowd simulations" ON public.crowd_simulations;
DROP POLICY IF EXISTS "Government manage crowd simulations" ON public.crowd_simulations;

-- Policy: Only verified Government officers can view, insert, or manage crowd simulations
CREATE POLICY "Government manage crowd simulations"
  ON public.crowd_simulations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'government'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'government'
    )
  );
