import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../components/tourist/TouristDashboard.css';
import LanguageSelector from '../components/tourist/LanguageSelector';
import DestinationGrid from '../components/tourist/DestinationGrid';
import DestinationDetailsModal from '../components/tourist/DestinationDetailsModal';
import HotelBookingModal from '../components/tourist/HotelBookingModal';

// Person 2 & 3 Real Subsystems
import LiveCrowdCard from '../components/LiveCrowdCard';
import PilgrimAdvisory from '../components/PilgrimAdvisory';
import SafetyAlerts from '../components/SafetyAlerts';
import LocalVendors from '../components/LocalVendors';
import TeamTracker from '../components/TeamTracker';
import {
  fetchHotels,
  createBookingRequest,
  fetchMyHotelBookings,
  fetchUserBookingRequests,
  fetchHotelRooms,
  toCanonicalSiteId
} from '../api/api';
import { getShrineAccommodations } from '../utils/shrineImages';

export default function TouristDashboard({
  sites = [],
  activeSite = null,
  onSelectSite = () => {},
  density = null,
  forecast = null,
  current24hForecast = null,
  currentQueueForecast = null,
  alternatives = [],
  alerts = [],
  rerouteEvent = null,
  vendors = [],
  currentUser = null,
  onTriggerSOS = () => {},
  onShowToast = () => {},
  onLogout = () => {}
}) {
  const { t } = useTranslation();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Focus shrine state
  const [focusShrine, setFocusShrine] = useState(null);

  // Hotels State & Room Booking (Teammate feature + Phase 3 integration)
  const [hotels, setHotels] = useState([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [bookingHotelId, setBookingHotelId] = useState(null);
  const [selectedHotelForBooking, setSelectedHotelForBooking] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // User Bookings & Requests Tracker (Phase 3 feature)
  const [myBookingsList, setMyBookingsList] = useState([]);
  const [isRefreshingBookings, setIsRefreshingBookings] = useState(false);

  // Load Hotels from Backend
  const loadHotels = useCallback(async () => {
    setIsLoadingHotels(true);
    try {
      const list = await fetchHotels();
      if (Array.isArray(list)) {
        setHotels(list);
      }
    } catch (err) {
      console.warn('Error loading hotels:', err.message);
    } finally {
      setIsLoadingHotels(false);
    }
  }, []);

  // Load Tourist Bookings & Requests (Dual Feed)
  const loadTouristBookings = useCallback(async () => {
    setIsRefreshingBookings(true);
    try {
      const touristId = currentUser?.id || currentUser?.user_id;
      const guestName = currentUser?.full_name || currentUser?.name;

      const [confirmedBookings, bookingRequests] = await Promise.all([
        fetchMyHotelBookings().catch(() => []),
        fetchUserBookingRequests(guestName, touristId).catch(() => [])
      ]);

      const merged = [];
      const seenIds = new Set();

      // 1. Pending/Declined/Confirmed requests from /booking-requests/user
      if (Array.isArray(bookingRequests)) {
        for (const req of bookingRequests) {
          const key = req.booking_id || req.id;
          if (key && !seenIds.has(key)) {
            seenIds.add(key);
            merged.push({
              id: req.id,
              booking_id: req.booking_id || req.id,
              hotel_id: req.hotel_id,
              hotel_name: req.hotel_name || 'Shrine Pilgrimage Lodge',
              room_number: req.room_number,
              room_type: req.room_type,
              status: (req.status || 'pending').toUpperCase(),
              check_in: req.check_in_datetime || req.check_in,
              check_out: req.check_out_datetime || req.check_out,
              total_price: req.price || req.total_amount || 1200,
              created_at: req.created_at
            });
          }
        }
      }

      // 2. Confirmed hotel bookings from /hotels/tourist/bookings
      if (Array.isArray(confirmedBookings)) {
        for (const b of confirmedBookings) {
          const key = b.id;
          if (key && !seenIds.has(key)) {
            seenIds.add(key);
            merged.push({
              id: b.id,
              booking_id: b.id,
              hotel_id: b.hotel_id,
              hotel_name: b.hotel_name || 'Shrine Pilgrimage Lodge',
              room_number: b.room_number || 'Standard',
              room_type: b.room_type || 'Deluxe',
              status: (b.status || 'confirmed').toUpperCase(),
              check_in: b.check_in,
              check_out: b.check_out,
              total_price: b.total_price || 1200,
              created_at: b.created_at
            });
          }
        }
      }

      setMyBookingsList(merged);
    } catch (err) {
      console.warn('Error loading tourist bookings:', err.message);
    } finally {
      setIsRefreshingBookings(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadHotels();
    loadTouristBookings();

    // 5-second automatic polling for live booking status changes
    const pollTimer = setInterval(() => {
      loadTouristBookings();
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [loadHotels, loadTouristBookings]);

  // Synchronize focus shrine with activeSite
  useEffect(() => {
    if (activeSite) {
      setFocusShrine(activeSite);
    } else if (sites && sites.length > 0) {
      setFocusShrine(sites[0]);
    }
  }, [activeSite, sites]);

  // Filter canonical shrines (TS001 through TS025)
  const canonicalSites = useMemo(() => {
    return (sites || []).filter((s) => s && s.id && /^TS\d{3}$/i.test(s.id));
  }, [sites]);

  const filteredSites = useMemo(() => {
    return canonicalSites.filter((site) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (site.name && site.name.toLowerCase().includes(q)) ||
        (site.city && site.city.toLowerCase().includes(q)) ||
        (site.state && site.state.toLowerCase().includes(q)) ||
        (site.deity && site.deity.toLowerCase().includes(q));

      const matchTag =
        selectedTag === 'ALL' ||
        (site.category && site.category.toUpperCase() === selectedTag) ||
        (site.tags && site.tags.some((t) => t.toUpperCase() === selectedTag));

      return matchSearch && matchTag;
    });
  }, [canonicalSites, searchTerm, selectedTag]);

  // Filter accommodations for the selected shrine using teammate's multi-factor matching
  const displayedHotels = useMemo(() => {
    if (!hotels || hotels.length === 0) return [];
    if (!activeSite) return hotels.slice(0, 6);

    const sId = activeSite.id ? String(activeSite.id).toUpperCase() : '';
    const sName = activeSite.name ? activeSite.name.toLowerCase() : '';
    const sLat = activeSite.latitude;
    const sLon = activeSite.longitude;

    const canonicalLodges = getShrineAccommodations(activeSite.id, activeSite.name);

    const getDistKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const clean = (str) =>
      str ? str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() : '';

    const stopWords = new Set(['temple', 'mandir', 'shri', 'shree', 'the', 'dham']);
    const siteTokens = clean(sName)
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    // 1. Exact site_id match
    const idMatched = hotels.filter(
      (h) => h.site_id && String(h.site_id).toUpperCase() === sId
    );

    // 2. Geographic proximity within 35 km
    const geoMatched =
      sLat != null && sLon != null
        ? hotels.filter((h) => {
            if (h.latitude != null && h.longitude != null) {
              return getDistKm(sLat, sLon, h.latitude, h.longitude) <= 35.0;
            }
            return false;
          })
        : [];

    // 3. Name token match
    const tokenMatched =
      siteTokens.length > 0
        ? hotels.filter((h) => {
            const hText = `${clean(h.name)} ${clean(h.address)}`;
            return siteTokens.some((tok) => hText.includes(tok));
          })
        : [];

    const combined = [
      ...idMatched,
      ...geoMatched,
      ...tokenMatched,
      ...canonicalLodges
    ];

    const seenNames = new Set();
    const deduplicated = [];
    combined.forEach((h) => {
      const norm = clean(h.name);
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        deduplicated.push(h);
      }
    });

    return deduplicated.slice(0, 6);
  }, [hotels, activeSite]);

  // Teammate HotelBookingModal Handlers
  const handleOpenBookingModal = (hotel) => {
    setSelectedHotelForBooking(hotel);
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async (bookingPayload) => {
    // Ensure authenticated tourist ID and hotel ID are strictly populated
    const touristId = currentUser?.id || currentUser?.user_id || bookingPayload.tourist_id;
    const hotelId = selectedHotelForBooking?.id || bookingPayload.hotel_id;

    const refinedPayload = {
      ...bookingPayload,
      hotel_id: hotelId,
      tourist_id: touristId
    };

    setBookingHotelId(refinedPayload.hotel_id);
    try {
      const result = await createBookingRequest(refinedPayload);
      setBookingSuccess({
        bookingId: result.booking_id || result.id,
        hotelName: selectedHotelForBooking?.name || 'Shrine Pilgrimage Lodge',
        roomType: result.room_type || refinedPayload.room_type,
        price: result.total_amount || result.price || refinedPayload.price,
        checkIn: refinedPayload.check_in_datetime || refinedPayload.check_in,
        checkOut: refinedPayload.check_out_datetime || refinedPayload.check_out,
        guestCount: refinedPayload.guest_count,
        status: result.status || 'pending'
      });

      if (onShowToast) {
        onShowToast(`📩 Reservation Request Sent to ${selectedHotelForBooking?.name || 'Hotel'} (PENDING)!`);
      }

      // Reload both hotels and user bookings immediately
      await Promise.all([loadHotels(), loadTouristBookings()]);
      return result;
    } catch (err) {
      alert('Booking error: ' + (err.message || 'Please try again.'));
      throw err;
    } finally {
      setBookingHotelId(null);
    }
  };

  const currentDisplayShrine = focusShrine || activeSite || canonicalSites[0];

  return (
    <div className="tourist-dashboard-root" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* 1. HEADER & LIVE NAVIGATION */}
      <header className="tourist-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF6B00 0%, #D97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '900',
            fontSize: '1.2rem'
          }}>
            🕉️
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.02em' }}>
              YatraSetu <span style={{ color: '#FF6B00', fontSize: '0.85rem', fontWeight: '700' }}>Pilgrim Portal</span>
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
              Smart India Hackathon 2026 • Real-Time Connected Architecture
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Active Role Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#F1F5F9',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            border: '1px solid #CBD5E1'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 6px #10B981'
            }} />
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
              {currentUser?.email ? currentUser.email.split('@')[0] : 'Tourist Devotee'}
            </span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: '800',
              color: '#FF6B00',
              background: '#FFF7ED',
              padding: '0.15rem 0.45rem',
              borderRadius: '999px',
              border: '1px solid #FFEDD5',
              textTransform: 'uppercase'
            }}>
              {currentUser?.role || 'TOURIST'}
            </span>
          </div>

          <LanguageSelector />

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#DC2626',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* 2. GOVERNMENT TRAVEL REROUTING BANNER */}
      {rerouteEvent && rerouteEvent.active && (
        <div style={{
          background: 'linear-gradient(90deg, #B45309 0%, #D97706 100%)',
          color: '#FFFFFF',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
              ACTIVE DIVERSION ORDER: {rerouteEvent.target_site_name || 'Pilgrimage Corridor'}
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.95 }}>
              {rerouteEvent.reason || 'High crowd congestion. Authorities recommend visiting alternative designated shrines below.'}
            </p>
          </div>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            GOVERNMENT COMMAND ACTIVE
          </span>
        </div>
      )}

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem' }}>
        {/* 3. SEARCH & CANONICAL SHRINES (TS001 - TS025) */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#0F172A' }}>
                Sacred Temples &amp; Shrines
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                Displaying 25 official pilgrimage destinations across Bharat with live crowd intelligence.
              </p>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', gap: '0.5rem', minWidth: '320px' }}>
              <input
                type="text"
                placeholder="Search shrine, deity, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  fontSize: '0.85rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '0.65rem',
                  outline: 'none',
                  background: '#FFFFFF'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    padding: '0.6rem 0.85rem',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '0.65rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '700'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter Categories */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            {['ALL', 'JYOTIRLINGA', 'CHAR DHAM', 'SHAKTIPEETH', 'HILL SHRINE', 'COASTAL', 'HERITAGE'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  borderRadius: '999px',
                  border: selectedTag === tag ? '1px solid #FF6B00' : '1px solid #E2E8F0',
                  background: selectedTag === tag ? '#FF6B00' : '#FFFFFF',
                  color: selectedTag === tag ? '#FFFFFF' : '#64748B',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Canonical Destination Grid */}
          <DestinationGrid
            sites={filteredSites}
            selectedSite={activeSite || currentDisplayShrine}
            onSelectSite={(site) => {
              onSelectSite(site);
              setFocusShrine(site);
            }}
            onViewDetails={(site) => {
              setFocusShrine(site);
              setIsDetailsModalOpen(true);
            }}
          />
        </section>

        {/* 4. SELECTED SHRINE FOCUS & LIVE CROWD INTELLIGENCE */}
        {currentDisplayShrine && (
          <section style={{
            background: '#FFFFFF',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #F1F5F9',
              paddingBottom: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: '#FF6B00',
                    background: '#FFF7ED',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    border: '1px solid #FFEDD5'
                  }}>
                    {currentDisplayShrine.id}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#0F172A' }}>
                    {currentDisplayShrine.name}
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                  📍 {currentDisplayShrine.city}, {currentDisplayShrine.state} • Deity: <strong>{currentDisplayShrine.deity || 'Sacred Pilgrimage'}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#334155',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '0.55rem',
                    cursor: 'pointer'
                  }}
                >
                  📖 Full Shrine Guide
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerSOS(currentDisplayShrine)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    color: '#FFFFFF',
                    background: '#DC2626',
                    border: 'none',
                    borderRadius: '0.55rem',
                    cursor: 'pointer'
                  }}
                >
                  🚨 Emergency SOS
                </button>
              </div>
            </div>

            {/* LIVE CROWD CARD & ML PREDICTIONS */}
            <LiveCrowdCard
              site={currentDisplayShrine}
              density={density}
              forecast={forecast}
              current24hForecast={current24hForecast}
              queueForecast={currentQueueForecast}
            />
          </section>
        )}

        {/* 5. ALTERNATIVE DESTINATIONS & SISTER SHRINES */}
        {currentDisplayShrine && (
          <section style={{ marginBottom: '2rem' }}>
            <PilgrimAdvisory
              alternatives={alternatives}
              activeSite={currentDisplayShrine}
              onSelectAlternative={(alt) => {
                const matched = canonicalSites.find(
                  (s) => s.id === alt.alternative_site_id || s.name === alt.alternative_site_name
                );
                if (matched) {
                  onSelectSite(matched);
                  setFocusShrine(matched);
                }
              }}
            />
          </section>
        )}

        {/* 6. VERIFIED ACCOMMODATIONS & ROOM BOOKING */}
        <section style={{
          background: '#FFFFFF',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0F172A' }}>
                Verified Yatri Accommodations &amp; Ashrams
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                Directly synchronized with real hotel inventory near {currentDisplayShrine?.name || 'shrine'}.
              </p>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#059669',
              background: '#ECFDF5',
              padding: '0.35rem 0.8rem',
              borderRadius: '999px',
              border: '1px solid #A7F3D0'
            }}>
              ✓ Verified Lodges &amp; Real-time Rooms
            </span>
          </div>

          {/* Booking Notice Banner */}
          {bookingSuccess && (
            <div style={{
              background: bookingSuccess.status === 'confirmed' ? '#ECFDF5' : bookingSuccess.status === 'declined' ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${bookingSuccess.status === 'confirmed' ? '#10B981' : bookingSuccess.status === 'declined' ? '#EF4444' : '#F59E0B'}`,
              borderRadius: '0.75rem',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  color: bookingSuccess.status === 'confirmed' ? '#065F46' : bookingSuccess.status === 'declined' ? '#991B1B' : '#92400E'
                }}>
                  {bookingSuccess.status === 'confirmed' && `✅ Booking Confirmed: ${bookingSuccess.hotelName}`}
                  {bookingSuccess.status === 'pending' && `⏳ Reservation Requested — Awaiting Lodge Confirmation at ${bookingSuccess.hotelName}`}
                  {bookingSuccess.status === 'declined' && `⚠️ Reservation Request Declined: ${bookingSuccess.hotelName}`}
                </h4>
                <p style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.8rem',
                  color: bookingSuccess.status === 'confirmed' ? '#047857' : bookingSuccess.status === 'declined' ? '#B91C1C' : '#B45309'
                }}>
                  Booking Ref: <strong>{bookingSuccess.bookingId}</strong> • {bookingSuccess.roomType} • ₹{bookingSuccess.price} (Real-time Synced)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingSuccess(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Hotels Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            {displayedHotels.map((h) => {
              const firstRoom = h.rooms?.[0];
              const price = firstRoom?.price_per_night || h.price_per_night || 1200;
              const availCount = h.rooms?.reduce((acc, r) => acc + (r.available_rooms || 0), 0);

              return (
                <div
                  key={h.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '0.75rem',
                    padding: '1.1rem',
                    background: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0F172A' }}>
                        {h.name}
                      </h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#D97706', background: '#FEF3C7', padding: '0.12rem 0.45rem', borderRadius: '5px' }}>
                        ★ {h.rating || '4.8'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: '#64748B' }}>
                      📍 {h.address || 'Near Sacred Pilgrimage Corridor'}
                    </p>
                    {availCount != null && (
                      <span style={{ fontSize: '0.75rem', color: availCount > 0 ? '#059669' : '#DC2626', fontWeight: '700' }}>
                        {availCount > 0 ? `✓ ${availCount} vacant rooms` : '⚠️ Limited vacancy'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                    <div>
                      <span style={{ fontSize: '1rem', fontWeight: '900', color: '#0F172A' }}>
                        ₹{price}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}> / night</span>
                    </div>

                    <button
                      type="button"
                      disabled={bookingHotelId === h.id}
                      onClick={() => handleOpenBookingModal(h)}
                      style={{
                        background: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '0.55rem',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {bookingHotelId === h.id ? 'Connecting...' : 'Book Room'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. MY YATRA BOOKING STATUS (LIVE LIFECYCLE TRACKER) */}
        <section style={{
          background: '#FFFFFF',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0F172A' }}>
                My Yatra Booking Status
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                Real-time booking lifecycle status synced from FastAPI and Hotel Owner portal.
              </p>
            </div>

            <button
              type="button"
              onClick={loadTouristBookings}
              disabled={isRefreshingBookings}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#334155',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '0.55rem',
                cursor: 'pointer'
              }}
            >
              🔄 {isRefreshingBookings ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>

          {myBookingsList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#94A3B8',
              border: '2px dashed #E2E8F0',
              borderRadius: '0.75rem'
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                No active bookings or requests found.
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
                Select an accommodation above to transmit your first yatra reservation request.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#475569' }}>Booking Ref</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#475569' }}>Accommodation</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#475569' }}>Room / Type</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#475569' }}>Dates</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#475569' }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#475569' }}>Lifecycle Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myBookingsList.map((b) => {
                    const statusColor =
                      b.status === 'CONFIRMED'
                        ? { text: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' }
                        : b.status === 'DECLINED'
                        ? { text: '#991B1B', bg: '#FEF2F2', border: '#FECACA' }
                        : { text: '#92400E', bg: '#FFFBEB', border: '#FDE68A' };

                    return (
                      <tr key={b.booking_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#0F172A' }}>
                          {b.booking_id}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                          {b.hotel_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                          #{b.room_number || '101'} • {b.room_type || 'Standard'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                          {b.check_in ? new Date(b.check_in).toLocaleDateString() : 'N/A'} →{' '}
                          {b.check_out ? new Date(b.check_out).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#0F172A' }}>
                          ₹{b.total_price}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            color: statusColor.text,
                            background: statusColor.bg,
                            border: `1px solid ${statusColor.border}`
                          }}>
                            {b.status === 'CONFIRMED' && '✓ CONFIRMED'}
                            {b.status === 'PENDING' && '⏳ PENDING REVIEW'}
                            {b.status === 'DECLINED' && '✕ DECLINED'}
                            {!['CONFIRMED', 'PENDING', 'DECLINED'].includes(b.status) && b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 8. MY YATRA TEAM TRACKER (HONEST NOTICE) */}
        <section style={{ marginBottom: '2rem' }}>
          <TeamTracker />
        </section>

        {/* 9. SAFETY ALERTS & EMERGENCY SERVICES */}
        <section style={{ marginBottom: '2rem' }}>
          <SafetyAlerts alerts={alerts} activeSite={currentDisplayShrine} />
        </section>

        {/* 10. LOCAL VENDORS & PILGRIM BAZAAR */}
        {currentDisplayShrine && (
          <section style={{ marginBottom: '2rem' }}>
            <LocalVendors vendors={vendors} siteName={currentDisplayShrine.name} />
          </section>
        )}
      </main>

      {/* 11. SHRINE DETAILS MODAL */}
      {isDetailsModalOpen && currentDisplayShrine && (
        <DestinationDetailsModal
          site={currentDisplayShrine}
          density={density}
          forecast={forecast}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      )}

      {/* 12. TEAMMATE'S INTERACTIVE HOTEL BOOKING MODAL */}
      <HotelBookingModal
        isOpen={isBookingModalOpen}
        hotel={selectedHotelForBooking}
        onClose={() => setIsBookingModalOpen(false)}
        onConfirmBooking={handleConfirmBooking}
        currentUser={currentUser}
      />
    </div>
  );
}
