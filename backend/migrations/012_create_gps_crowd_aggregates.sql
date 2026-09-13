-- Migration 012: Aggregated GPS-based Crowd Snapshots
-- Stores purely aggregated, anonymized site-level GPS device counts and derived people estimates.
-- STRICT PRIVACY: NEVER stores individual coordinates, device IDs, or user trajectories.

CREATE TABLE IF NOT EXISTS public.gps_crowd_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id VARCHAR(32) NOT NULL,
    active_device_count INTEGER NOT NULL DEFAULT 0,
    gps_estimated_people INTEGER NOT NULL DEFAULT 0,
    geofence_radius_meters INTEGER NOT NULL DEFAULT 1000,
    source VARCHAR(32) NOT NULL DEFAULT 'gps_crowd',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_aggregates_site_time 
    ON public.gps_crowd_aggregates (site_id, timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gps_crowd_aggregates ENABLE ROW LEVEL SECURITY;

-- Read policy: Authenticated users can view aggregated crowd snapshots
DROP POLICY IF EXISTS "Allow authenticated read of gps crowd aggregates" ON public.gps_crowd_aggregates;
CREATE POLICY "Allow authenticated read of gps crowd aggregates"
    ON public.gps_crowd_aggregates
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert policy: Service role or government/command center can write aggregated snapshots
DROP POLICY IF EXISTS "Allow service role insert of gps crowd aggregates" ON public.gps_crowd_aggregates;
CREATE POLICY "Allow service role insert of gps crowd aggregates"
    ON public.gps_crowd_aggregates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('government', 'tourist')
        )
    );
