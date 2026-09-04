-- ============================================================
-- YatraSetu: fleet_schedules table
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/<your-project>/sql
-- ============================================================

CREATE TABLE IF NOT EXISTS fleet_schedules (
    id              TEXT PRIMARY KEY,                    -- e.g. "HR-01"
    from_location   TEXT NOT NULL,
    to_location     TEXT NOT NULL,
    departure_time  TEXT,                               -- e.g. "06:00 AM"
    arrival_time    TEXT,                               -- e.g. "11:00 AM"
    journey_date    TEXT,                               -- e.g. "Oct 12 (Fri)"
    direction       TEXT DEFAULT 'forward',             -- "forward" | "return"
    buses           INTEGER DEFAULT 1,
    capacity        INTEGER DEFAULT 42,
    occupancy       INTEGER DEFAULT 80,
    bus_type        TEXT DEFAULT 'Volvo A/C',
    status          TEXT DEFAULT 'NORMAL',
    operator        TEXT DEFAULT 'Sharma Travels',
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with the Haridwar Somvati Amavasya schedule
INSERT INTO fleet_schedules (id, from_location, to_location, departure_time, arrival_time, journey_date, direction, buses, capacity, occupancy, bus_type, status, operator)
VALUES
    ('HR-01', 'Delhi (ISBT Kashmiri Gate)', 'Haridwar (Har Ki Pauri)', '06:00 AM', '11:00 AM', 'Oct 12 (Fri)', 'forward',  3, 42, 94,  'Volvo A/C', 'HIGH DEMAND', 'Sharma Travels'),
    ('HR-02', 'Dehradun (Bus Stand)',        'Haridwar (Har Ki Pauri)', '08:30 AM', '10:30 AM', 'Oct 12 (Fri)', 'forward',  2, 38, 100, 'Sleeper',   'FULL',        'Sharma Travels'),
    ('HR-03', 'Haridwar (Har Ki Pauri)',     'Delhi (ISBT Kashmiri Gate)', '04:00 PM', '09:30 PM', 'Oct 13 (Sun)', 'return', 3, 42, 88,  'Volvo A/C', 'RETURN',      'Sharma Travels'),
    ('HR-04', 'Rishikesh (Triveni Ghat)',    'Haridwar (Har Ki Pauri)', '10:00 AM', '11:00 AM', 'Oct 12 (Fri)', 'forward',  1, 30, 67,  'Mini Bus',  'NORMAL',      'Sharma Travels')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (allow public reads, authenticated writes)
ALTER TABLE fleet_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read fleet schedules"
    ON fleet_schedules FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update fleet schedules"
    ON fleet_schedules FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can insert fleet schedules"
    ON fleet_schedules FOR INSERT WITH CHECK (true);
