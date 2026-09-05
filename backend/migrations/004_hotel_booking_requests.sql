-- ============================================================================
-- YatraSetu Hotel Module: Exact Room & Datetime Booking Requests Migration
-- Tables: booking_requests, hotel_bookings, hotel_rooms
-- ============================================================================

-- 1. Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Booking Requests Table (Two-Sided Pilgrim-Owner bridge)
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id TEXT PRIMARY KEY DEFAULT ('REQ-' || floor(random() * 90000 + 10000)::text),
  booking_id TEXT UNIQUE NOT NULL DEFAULT ('YC-' || floor(random() * 90000 + 10000)::text),
  tourist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hotel_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'Deluxe',
  guest_name TEXT NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 2 CHECK (guest_count >= 1),
  check_in_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  price DOUBLE PRECISION NOT NULL DEFAULT 1300.0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  special_request TEXT DEFAULT '',
  decline_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_request_datetimes_valid CHECK (check_out_datetime > check_in_datetime)
);

-- 3. Enhance / Create hotel_bookings Table with exact room & datetime tracking
CREATE TABLE IF NOT EXISTS public.hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT UNIQUE DEFAULT ('YC-' || floor(random() * 90000 + 10000)::text),
  hotel_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  tourist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count >= 1),
  check_in_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  total_price DOUBLE PRECISION NOT NULL DEFAULT 1300.0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  booking_source TEXT NOT NULL DEFAULT 'YatraSetu',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_booking_datetimes_valid CHECK (check_out_datetime > check_in_datetime)
);

-- 4. B-Tree Performance Indexes for Availability & Conflict Searches
CREATE INDEX IF NOT EXISTS idx_booking_requests_hotel ON public.booking_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_room ON public.booking_requests(room_id, room_number);
CREATE INDEX IF NOT EXISTS idx_booking_requests_dates ON public.booking_requests(check_in_datetime, check_out_datetime);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_tourist ON public.booking_requests(tourist_id);

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_room_dates ON public.hotel_bookings(room_number, check_in_datetime, check_out_datetime);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel_status ON public.hotel_bookings(hotel_id, status);

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Tourists insert booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Hotel owners update booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Public read hotel bookings" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Hotel owners manage hotel bookings" ON public.hotel_bookings;

-- Booking Requests Policies
CREATE POLICY "Public read booking requests"
  ON public.booking_requests FOR SELECT
  USING (true);

CREATE POLICY "Tourists insert booking requests"
  ON public.booking_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Hotel owners update booking requests"
  ON public.booking_requests FOR UPDATE
  USING (true);

-- Hotel Bookings Policies
CREATE POLICY "Public read hotel bookings"
  ON public.hotel_bookings FOR SELECT
  USING (true);

CREATE POLICY "Hotel owners manage hotel bookings"
  ON public.hotel_bookings FOR ALL
  USING (true);
