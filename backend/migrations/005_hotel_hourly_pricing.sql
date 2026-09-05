-- ============================================================================
-- YatraSetu Hotel Module: Dynamic Hourly Pricing & Crowd Snapshot Migration
-- Adds base hourly rate, crowd multiplier, dynamic rate, duration hours, 
-- total amount, and crowd snapshot columns for atomic pricing immutability.
-- ============================================================================

-- 1. Extend booking_requests table
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS base_hourly_rate DOUBLE PRECISION DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS pricing_multiplier DOUBLE PRECISION DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS final_hourly_rate DOUBLE PRECISION DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS duration_hours DOUBLE PRECISION DEFAULT 21.0,
  ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION DEFAULT 1050.0,
  ADD COLUMN IF NOT EXISTS crowd_level_at_booking TEXT DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS crowd_density_at_booking DOUBLE PRECISION DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS site_id TEXT DEFAULT 'TS003',
  ADD COLUMN IF NOT EXISTS site_name TEXT DEFAULT 'Kashi Vishwanath';

-- 2. Extend hotel_bookings table (confirmed reservations snapshot)
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS base_hourly_rate DOUBLE PRECISION DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS pricing_multiplier DOUBLE PRECISION DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS final_hourly_rate DOUBLE PRECISION DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS duration_hours DOUBLE PRECISION DEFAULT 21.0,
  ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION DEFAULT 1050.0,
  ADD COLUMN IF NOT EXISTS crowd_level_at_booking TEXT DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS crowd_density_at_booking DOUBLE PRECISION DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS site_id TEXT DEFAULT 'TS003',
  ADD COLUMN IF NOT EXISTS site_name TEXT DEFAULT 'Kashi Vishwanath';

-- 3. Extend hotel_rooms table with hourly base rate
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS base_hourly_rate DOUBLE PRECISION DEFAULT 50.0;

-- 4. B-Tree Indexes for Pricing Queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_pricing ON public.booking_requests(pricing_multiplier, total_amount);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_pricing ON public.hotel_bookings(pricing_multiplier, total_amount);
