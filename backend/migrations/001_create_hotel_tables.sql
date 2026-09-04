-- ============================================================================
-- YatraSetu Hotel Module Migration
-- Tables: hotels, hotel_rooms, hotel_bookings
-- RLS Policies for Tourist, Hotel Owner, and Government Roles
-- ============================================================================

-- 1. Hotels Table
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  contact TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Hotel Rooms Table
CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  total_rooms INTEGER NOT NULL CHECK (total_rooms >= 0),
  available_rooms INTEGER NOT NULL CHECK (available_rooms >= 0 AND available_rooms <= total_rooms),
  price_per_night DOUBLE PRECISION NOT NULL CHECK (price_per_night >= 0.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Hotel Bookings Table
CREATE TABLE IF NOT EXISTS public.hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  tourist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL CHECK (guests >= 1),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_dates_valid CHECK (check_out > check_in)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_hotels_owner ON public.hotels(owner_id);
CREATE INDEX IF NOT EXISTS idx_hotels_lat_lon ON public.hotels(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON public.hotel_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel ON public.hotel_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tourist ON public.hotel_bookings(tourist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.hotel_bookings(check_in, check_out);

-- ============================================================================
-- Row Level Security (RLS) Configuration
-- ============================================================================
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-applying
DROP POLICY IF EXISTS "Public read hotels" ON public.hotels;
DROP POLICY IF EXISTS "Hotel owner insert hotel" ON public.hotels;
DROP POLICY IF EXISTS "Hotel owner update hotel" ON public.hotels;
DROP POLICY IF EXISTS "Public read hotel rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Hotel owner manage rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Tourists view own bookings" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Hotel owners view hotel bookings" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Government view all bookings" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Tourists insert bookings" ON public.hotel_bookings;

-- Hotels Policies
CREATE POLICY "Public read hotels"
  ON public.hotels FOR SELECT
  USING (true);

CREATE POLICY "Hotel owner insert hotel"
  ON public.hotels FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Hotel owner update hotel"
  ON public.hotels FOR UPDATE
  USING (auth.uid() = owner_id);

-- Hotel Rooms Policies
CREATE POLICY "Public read hotel rooms"
  ON public.hotel_rooms FOR SELECT
  USING (true);

CREATE POLICY "Hotel owner manage rooms"
  ON public.hotel_rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.hotels
      WHERE hotels.id = hotel_rooms.hotel_id AND hotels.owner_id = auth.uid()
    )
  );

-- Hotel Bookings Policies
CREATE POLICY "Tourists view own bookings"
  ON public.hotel_bookings FOR SELECT
  USING (auth.uid() = tourist_id);

CREATE POLICY "Hotel owners view hotel bookings"
  ON public.hotel_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hotels
      WHERE hotels.id = hotel_bookings.hotel_id AND hotels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Government view all bookings"
  ON public.hotel_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'government'
    )
  );

CREATE POLICY "Tourists insert bookings"
  ON public.hotel_bookings FOR INSERT
  WITH CHECK (auth.uid() = tourist_id);
