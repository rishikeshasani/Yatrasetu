-- ============================================================================
-- YatraSetu Emergency SOS Module Migration
-- Table: public.sos_alerts
-- Row Level Security (RLS) Policies for Authenticated Users
-- ============================================================================

-- 1. Create public.sos_alerts Table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  nearest_site_id TEXT REFERENCES public.sites(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON public.sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_nearest_site ON public.sos_alerts(nearest_site_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-applying
DROP POLICY IF EXISTS "Authenticated users insert own SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Users view own SOS alerts" ON public.sos_alerts;

-- Policy 1: Authenticated users can insert an alert ONLY under their verified auth.uid()
CREATE POLICY "Authenticated users insert own SOS alerts"
  ON public.sos_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Authenticated users can query only their own SOS alerts
CREATE POLICY "Users view own SOS alerts"
  ON public.sos_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
