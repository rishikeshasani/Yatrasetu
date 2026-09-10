-- ============================================================================
-- YatraSetu Migration 006: My Yatra Team Module
-- Tables: public.yatra_groups, public.yatra_group_members,
--         public.yatra_group_locations, public.yatra_group_alerts
-- Row Level Security (RLS) with strict server-side policy enforcement
-- ============================================================================

-- 1. Table: public.yatra_groups
CREATE TABLE IF NOT EXISTS public.yatra_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  site_id TEXT REFERENCES public.sites(id) ON DELETE SET NULL,
  site_name TEXT NOT NULL,
  yatra_date DATE NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: public.yatra_group_members
CREATE TABLE IF NOT EXISTS public.yatra_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.yatra_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

-- 3. Table: public.yatra_group_locations
CREATE TABLE IF NOT EXISTS public.yatra_group_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.yatra_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  accuracy DOUBLE PRECISION,
  is_sharing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_group_location UNIQUE (group_id, user_id)
);

-- 4. Table: public.yatra_group_alerts
CREATE TABLE IF NOT EXISTS public.yatra_group_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.yatra_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'EMERGENCY' CHECK (alert_type IN ('EMERGENCY', 'MEDICAL', 'SEPARATION', 'ASSISTANCE')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- 5. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_yatra_groups_join_code ON public.yatra_groups(join_code);
CREATE INDEX IF NOT EXISTS idx_yatra_groups_created_by ON public.yatra_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_yatra_groups_site ON public.yatra_groups(site_id);
CREATE INDEX IF NOT EXISTS idx_yatra_group_members_user ON public.yatra_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_yatra_group_members_group ON public.yatra_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_yatra_group_locations_group ON public.yatra_group_locations(group_id);
CREATE INDEX IF NOT EXISTS idx_yatra_group_locations_user ON public.yatra_group_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_yatra_group_alerts_group ON public.yatra_group_alerts(group_id);
CREATE INDEX IF NOT EXISTS idx_yatra_group_alerts_status ON public.yatra_group_alerts(status);

-- 6. Row Level Security (RLS) Configuration (NO PERMISSIVE TRUE/TRUE POLICIES)
ALTER TABLE public.yatra_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yatra_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yatra_group_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yatra_group_alerts ENABLE ROW LEVEL SECURITY;

-- Group RLS Policies
DROP POLICY IF EXISTS "Members can view their yatra groups" ON public.yatra_groups;
CREATE POLICY "Members can view their yatra groups"
  ON public.yatra_groups FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.yatra_group_members m
      WHERE m.group_id = yatra_groups.id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users create yatra groups" ON public.yatra_groups;
CREATE POLICY "Authenticated users create yatra groups"
  ON public.yatra_groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Group admins can update their yatra groups" ON public.yatra_groups;
CREATE POLICY "Group admins can update their yatra groups"
  ON public.yatra_groups FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.yatra_group_members m
      WHERE m.group_id = yatra_groups.id AND m.user_id = auth.uid() AND m.role = 'ADMIN'
    )
  );

-- Member RLS Policies
DROP POLICY IF EXISTS "Group members view fellow group members" ON public.yatra_group_members;
CREATE POLICY "Group members view fellow group members"
  ON public.yatra_group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.yatra_group_members m
      WHERE m.group_id = yatra_group_members.group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own membership" ON public.yatra_group_members;
CREATE POLICY "Users can insert their own membership"
  ON public.yatra_group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins or self can remove membership" ON public.yatra_group_members;
CREATE POLICY "Admins or self can remove membership"
  ON public.yatra_group_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.yatra_group_members m
      WHERE m.group_id = yatra_group_members.group_id AND m.user_id = auth.uid() AND m.role = 'ADMIN'
    )
  );

-- Location RLS Policies (Strict privacy: viewable only if is_sharing is true and viewer is in same group)
DROP POLICY IF EXISTS "Members view consenting fellow member locations" ON public.yatra_group_locations;
CREATE POLICY "Members view consenting fellow member locations"
  ON public.yatra_group_locations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR (
      is_sharing = true AND
      EXISTS (
        SELECT 1 FROM public.yatra_group_members m
        WHERE m.group_id = yatra_group_locations.group_id AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can upsert own location" ON public.yatra_group_locations;
CREATE POLICY "Users can upsert own location"
  ON public.yatra_group_locations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Alert RLS Policies
DROP POLICY IF EXISTS "Members view group alerts" ON public.yatra_group_alerts;
CREATE POLICY "Members view group alerts"
  ON public.yatra_group_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.yatra_group_members m
      WHERE m.group_id = yatra_group_alerts.group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members trigger distress alerts" ON public.yatra_group_alerts;
CREATE POLICY "Members trigger distress alerts"
  ON public.yatra_group_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.yatra_group_members m
      WHERE m.group_id = yatra_group_alerts.group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins or creator resolve alerts" ON public.yatra_group_alerts;
CREATE POLICY "Admins or creator resolve alerts"
  ON public.yatra_group_alerts FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.yatra_group_members m
      WHERE m.group_id = yatra_group_alerts.group_id AND m.user_id = auth.uid() AND m.role = 'ADMIN'
    )
  );
