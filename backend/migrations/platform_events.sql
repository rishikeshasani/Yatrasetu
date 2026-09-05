CREATE TABLE IF NOT EXISTS platform_events (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type  TEXT NOT NULL,
    payload     JSONB DEFAULT '{}',
    created_by  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform events" ON platform_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert platform events" ON platform_events FOR INSERT WITH CHECK (true);

ALTER TABLE platform_events REPLICA IDENTITY FULL;
