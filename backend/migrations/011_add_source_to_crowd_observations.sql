-- ============================================================================
-- YatraSetu Migration 011: Add Observation Source Metadata to crowd_observations
-- Non-destructive, additive migration to record the authoritative observation source:
--   1. 'yolo_video' (Priority 1: Real-time computer vision detection)
--   2. 'live_telemetry' (Priority 2: Live IoT / Government field telemetry)
--   3. 'historical' / 'historical_baseline' (Priority 3: Historical ground truth)
--   4. 'demo_simulation' (Priority 4: Deterministic diurnal harmonic fallback)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'crowd_observations'
          AND column_name = 'source'
    ) THEN
        ALTER TABLE public.crowd_observations
        ADD COLUMN source VARCHAR(32) DEFAULT 'live_telemetry';
        
        COMMENT ON COLUMN public.crowd_observations.source IS 
        'Observation provenance: yolo_video, live_telemetry, historical, or demo_simulation';
    END IF;
END $$;
