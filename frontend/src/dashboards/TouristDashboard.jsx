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
import BookingCard from '../components/BookingCard';
import {
  fetchHotels,
  createBookingRequest,
  fetchMyHotelBookings,
  fetchUserBookingRequests,
  fetchActiveRerouteAlert,
  toCanonicalSiteId,
  MOCK_DENSITY
} from '../api/api';
import { getShrineAccommodations } from '../utils/shrineImages';

export default function TouristDashboard({
  sites = [],
  activeSite = null,
  selectedSiteId = null,
  selectedSite = null,
  onSelectSite = () => {},
  density = null,
  currentDensity = null,
  densityMap = {},
  forecast = null,
  currentForecast = null,
  current24hForecast = null,
  currentQueueForecast = null,
  currentPrediction = null,
  alternatives = [],
  currentAlternatives = [],
  safetyInfo = null,
  alerts = [],
  rerouteEvent = null,
  activeRerouteAlert = null,
  vendors = [],
  currentUser = null,
  activeAlternateRoute = null,
  pendingPunyaReward = 0,
  routeStatus = 'IDLE',
  completedRouteIds = [],
  onSelectRoute = () => {},
  onCompleteArrival = () => {},
  onSwitchBack = () => {},
  onOpenWallet = () => {},
  onOpenSOS = () => {},
  onTriggerSOS = () => {},
  walletPoints = 260,
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

  // User Bookings & Requests Tracker
  const [myBookingsList, setMyBookingsList] = useState([]);
  const [isRefreshingBookings, setIsRefreshingBookings] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);

  // Active Government Reroute state
  const [activeReroute, setActiveReroute] = useState(null);

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

  // Load Tourist Bookings & Requests (Dual Feed: Requests + Confirmed Bookings)
  const loadTouristBookings = useCallback(async () => {
    // If unauthenticated, do not display arbitrary or demo bookings
    if (!currentUser) {
      setMyBookingsList([]);
      setBookingsLoading(false);
      setBookingsError(null);
      return;
    }

    setIsRefreshingBookings(true);
    try {
      const touristId = currentUser?.id || currentUser?.user_id;
      const guestName = currentUser?.full_name || currentUser?.name;

      const [confirmedBookingsRes, bookingRequestsRes] = await Promise.allSettled([
        fetchMyHotelBookings(),
        fetchUserBookingRequests(guestName, touristId)
      ]);

      if (confirmedBookingsRes.status === 'rejected' && bookingRequestsRes.status === 'rejected') {
        const errorDetail = confirmedBookingsRes.reason?.message || bookingRequestsRes.reason?.message;
        console.warn('Both booking endpoints failed:', errorDetail);
        setBookingsError("My bookings couldn't be loaded.");
        return;
      }

      const confirmedBookings = confirmedBookingsRes.status === 'fulfilled' && Array.isArray(confirmedBookingsRes.value)
        ? confirmedBookingsRes.value
        : [];
      const bookingRequests = bookingRequestsRes.status === 'fulfilled' && Array.isArray(bookingRequestsRes.value)
        ? bookingRequestsRes.value
        : [];

      const merged = [];
      const seenIds = new Set();

      // 1. Pending/Declined/Confirmed requests from /booking-requests/user
      for (const req of bookingRequests) {
        // Strictly verify request belongs to this authenticated tourist
        const matchesTouristId = touristId && req.tourist_id && req.tourist_id === touristId;
        const matchesGuestName = guestName && req.guest_name && req.guest_name.toLowerCase() === guestName.toLowerCase();
        if (touristId && !matchesTouristId && !matchesGuestName) {
          continue;
        }

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
            check_in_datetime: req.check_in_datetime || req.check_in,
            check_out_datetime: req.check_out_datetime || req.check_out,
            total_price: req.price !== undefined ? req.price : (req.total_amount || 1200),
            created_at: req.created_at,
            updated_at: req.updated_at,
            decline_reason: req.decline_reason
          });
        }
      }

      // 2. Confirmed hotel bookings from /hotels/tourist/bookings
      for (const b of confirmedBookings) {
        // Strictly verify it belongs to this tourist
        if (touristId && b.tourist_id && b.tourist_id !== touristId && !touristId.startsWith('00000000-')) {
          continue;
        }

        const key = b.booking_id || b.id;
        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          merged.push({
            id: b.id,
            booking_id: b.booking_id || b.id,
            hotel_id: b.hotel_id,
            hotel_name: b.hotel_name || 'Shrine Pilgrimage Lodge',
            room_number: b.room_number || 'Standard',
            room_type: b.room_type || 'Deluxe',
            status: (b.status || 'confirmed').toUpperCase(),
            check_in: b.check_in,
            check_out: b.check_out,
            check_in_datetime: b.check_in,
            check_out_datetime: b.check_out,
            total_price: b.total_price || 1200,
            created_at: b.created_at
          });
        }
      }

      // Sort by creation timestamp (newest first). Safely handle missing timestamps.
      merged.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.check_in ? new Date(a.check_in).getTime() : 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.check_in ? new Date(b.check_in).getTime() : 0);
        return timeB - timeA;
      });

      setMyBookingsList(merged);
      setBookingsError(null);
    } catch (err) {
      console.warn('Error loading tourist bookings:', err.message);
      setBookingsError("My bookings couldn't be loaded.");
    } finally {
      setIsRefreshingBookings(false);
      setBookingsLoading(false);
    }
  }, [currentUser]);

  // Prevent background scroll and handle Escape key when View All modal is open
  useEffect(() => {
    if (!isBookingsModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsBookingsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isBookingsModalOpen]);

  useEffect(() => {
    loadHotels();
    loadTouristBookings();

    // 5-second automatic polling for live booking status changes
    const pollTimer = setInterval(() => {
      loadTouristBookings();
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [loadHotels, loadTouristBookings]);

  // Authoritative Government Reroute synchronization
  useEffect(() => {
    let isMounted = true;
    const checkReroute = async () => {
      try {
        const res = await fetchActiveRerouteAlert();
        if (isMounted) {
          if (res && res.is_active && res.alert) {
            setActiveReroute(res.alert);
          } else {
            setActiveReroute(null);
          }
        }
      } catch (err) {
        console.warn('Error checking active reroute:', err);
      }
    };
    checkReroute();
    const timer = setInterval(checkReroute, 4000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

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
    const targetSite = focusShrine || activeSite || canonicalSites[0];
    const canonicalLodges = targetSite ? getShrineAccommodations(targetSite.id, targetSite.name) : [];
    if (!hotels || hotels.length === 0) return canonicalLodges;
    if (!targetSite) return hotels.slice(0, 6);

    const sId = targetSite.id ? String(targetSite.id).toUpperCase() : '';
    const sName = targetSite.name ? targetSite.name.toLowerCase() : '';
    const sLat = targetSite.latitude;
    const sLon = targetSite.longitude;

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

    return deduplicated.slice(0, 2);
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

  const handleFindAccommodation = () => {
    const el = document.getElementById('verified-accommodations-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentDisplayShrine = useMemo(() => {
    let shrine = focusShrine || activeSite || canonicalSites[0];
    if (typeof shrine === 'string') {
      shrine = canonicalSites.find(s => s && s.id === shrine) || (sites && sites.find(s => s && s.id === shrine)) || canonicalSites[0];
    }
    return shrine;
  }, [focusShrine, activeSite, canonicalSites, sites]);

  const effectiveDensity = useMemo(() => {
    const shrineId = currentDisplayShrine?.id;
    if (!shrineId) return density || currentDensity || null;

    if (density && (density.site_id === shrineId || density.id === shrineId)) {
      return density;
    }
    if (currentDensity && (currentDensity.site_id === shrineId || currentDensity.id === shrineId)) {
      return currentDensity;
    }
    if (densityMap) {
      if (densityMap[shrineId]) return densityMap[shrineId];
      const canonical = toCanonicalSiteId ? toCanonicalSiteId(shrineId) : shrineId;
      if (densityMap[canonical]) return densityMap[canonical];
    }
    const canonicalId = toCanonicalSiteId ? toCanonicalSiteId(shrineId) : shrineId;
    if (MOCK_DENSITY) {
      if (MOCK_DENSITY[canonicalId]) return MOCK_DENSITY[canonicalId];
      if (MOCK_DENSITY[shrineId]) return MOCK_DENSITY[shrineId];
    }
    return density || currentDensity || null;
  }, [density, currentDensity, densityMap, currentDisplayShrine]);

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
            {t('nav.logout', 'Logout')}
          </button>
        </div>
      </header>

      {/* 2. GOVERNMENT TRAVEL REROUTING BANNER */}
      {(activeReroute || (rerouteEvent && rerouteEvent.active)) && (
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
              ACTIVE DIVERSION ORDER: {(activeReroute?.site_name || activeReroute?.target_site_name || rerouteEvent?.target_site_name || 'Pilgrimage Corridor')}
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.95 }}>
              {(activeReroute?.notes || activeReroute?.reason || rerouteEvent?.reason || 'High crowd congestion. Authorities recommend visiting alternative designated shrines below.')}
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
          {/* Canonical Destination Grid */}
          <DestinationGrid
            sites={canonicalSites}
            densityMap={densityMap}
            selectedSiteId={currentDisplayShrine?.id || activeSite?.id}
            onSelectSite={(siteOrId) => {
              const sId = typeof siteOrId === 'object' && siteOrId ? siteOrId.id : siteOrId;
              const siteObj = typeof siteOrId === 'object' && siteOrId ? siteOrId : (canonicalSites.find(s => s && s.id === siteOrId) || sites.find(s => s && s.id === siteOrId));
              onSelectSite(sId);
              setFocusShrine(siteObj || sId);
            }}
            onViewDetails={(siteOrId) => {
              const siteObj = typeof siteOrId === 'object' && siteOrId ? siteOrId : (canonicalSites.find(s => s && s.id === siteOrId) || sites.find(s => s && s.id === siteOrId));
              setFocusShrine(siteObj || siteOrId);
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
                  📖 {t('details.fullShrineGuide', 'Full Shrine Guide')}
                </button>
                <button
                  type="button"
                  onClick={() => (onOpenSOS ? onOpenSOS() : onTriggerSOS(currentDisplayShrine))}
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
                  🚨 {t('details.emergencySOS', 'Emergency SOS')}
                </button>
              </div>
            </div>

            {/* LIVE CROWD CARD & ML PREDICTIONS */}
            <LiveCrowdCard
              site={currentDisplayShrine}
              density={effectiveDensity || currentDensity || density || densityMap[currentDisplayShrine?.id]}
              forecast={forecast || currentForecast}
              current24hForecast={current24hForecast}
              queueForecast={currentQueueForecast || currentForecast || forecast}
              prediction={currentPrediction}
            />
          </section>
        )}

        {/* 5. ALTERNATIVE DESTINATIONS & SISTER SHRINES */}
        {currentDisplayShrine && (
          <section style={{ marginBottom: '2rem' }}>
            <PilgrimAdvisory
              currentSite={currentDisplayShrine}
              density={currentDensity || density || densityMap[currentDisplayShrine?.id]}
              forecast={forecast}
              prediction={currentPrediction}
              alternativesData={currentAlternatives || (alternatives?.recommendations ? alternatives : { recommendations: alternatives })}
              activeAlternateRoute={activeAlternateRoute}
              pendingPunyaReward={pendingPunyaReward}
              routeStatus={routeStatus}
              completedRouteIds={completedRouteIds}
              onSelectRoute={onSelectRoute}
              onCompleteArrival={onCompleteArrival}
              onSwitchBack={onSwitchBack}
            />
          </section>
        )}

        {/* 6. SAFETY ALERTS & EMERGENCY SERVICES */}
        <section style={{ marginBottom: '2rem' }}>
          <SafetyAlerts alerts={alerts} activeSite={currentDisplayShrine} onOpenSOS={onOpenSOS || onTriggerSOS} />
        </section>

        {/* 7. MY YATRA TEAM TRACKER */}
        <section style={{ marginBottom: '2rem' }}>
          <TeamTracker
            currentUser={currentUser}
            currentSite={currentDisplayShrine}
            onShowToast={onShowToast}
          />
        </section>

        {/* 8. VERIFIED ACCOMMODATIONS & ROOM BOOKING */}
        <section
          id="verified-accommodations-section"
          style={{
            background: '#FFFFFF',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            marginBottom: '2rem'
          }}
        >
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
                {t('hotels.title', 'Verified Yatri Accommodations & Ashrams')}
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                {t('hotels.subtitle', 'Official temple ashrams, GMVN rest houses, and verified hospitality partners near')} {currentDisplayShrine?.name || 'shrine'}.
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
              {t('hotels.verifiedBadge', '✓ Official YatraSetu Verified')}
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
            {displayedHotels.slice(0, 2).map((h) => {
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
                      {bookingHotelId === h.id ? t('common.loading', 'Connecting...') : t('hotels.bookRoom', 'Book Room')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. MY YATRA BOOKINGS (CLEAN COMPACT CARDS & LIFECYCLE TRACKER) */}
        <section style={{
          background: '#FFFFFF',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          marginBottom: '2rem'
        }}>
          {/* Section Header */}
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
                {t('bookings.title', 'My Yatra Bookings')}
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                {t('bookings.subtitle', 'Track your accommodation requests and confirmed stays.')}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* View All Bookings button when > 3 bookings */}
              {myBookingsList.length > 3 && (
                <button
                  type="button"
                  onClick={() => setIsBookingsModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    color: '#FF6B00',
                    background: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    borderRadius: '0.55rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📋 {t('bookings.viewAll', 'View All Bookings')} ({myBookingsList.length})
                </button>
              )}

              {/* Real API Refresh Status Button */}
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
                  cursor: isRefreshingBookings ? 'not-allowed' : 'pointer',
                  opacity: isRefreshingBookings ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  display: 'inline-block',
                  animation: isRefreshingBookings ? 'spin 1s linear infinite' : 'none'
                }}>🔄</span>
                {isRefreshingBookings ? t('bookings.refreshing', 'Refreshing...') : t('bookings.refresh', 'Refresh Status')}
              </button>
            </div>
          </div>

          {/* Body States: Loading, Error, Empty, or Cards Grid */}
          {bookingsLoading && myBookingsList.length === 0 && !bookingsError ? (
            <div style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#64748B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#FF6B00',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                {t('common.loading', 'Loading your bookings...')}
              </div>
            </div>
          ) : bookingsError ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1.5rem',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '1.4rem' }}>⚠️</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#991B1B' }}>
                {t('bookings.loadError', "My bookings couldn't be loaded.")}
              </div>
              <button
                type="button"
                onClick={loadTouristBookings}
                disabled={isRefreshingBookings}
                style={{
                  padding: '0.45rem 1.1rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  background: '#DC2626',
                  border: 'none',
                  borderRadius: '0.55rem',
                  cursor: 'pointer'
                }}
              >
                {t('bookings.retry', 'Retry')}
              </button>
            </div>
          ) : myBookingsList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              color: '#64748B',
              border: '2px dashed #E2E8F0',
              borderRadius: '0.75rem',
              background: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🏨</div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0F172A' }}>
                {t('bookings.title', 'My Yatra Bookings')}
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                {t('bookings.noBookings', "You don't have any accommodation bookings yet.")}
              </p>
              <button
                type="button"
                onClick={handleFindAccommodation}
                style={{
                  marginTop: '0.6rem',
                  padding: '0.5rem 1.2rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  background: '#FF6B00',
                  border: 'none',
                  borderRadius: '0.55rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(255, 107, 0, 0.2)'
                }}
              >
                {t('bookings.findAccommodation', 'Find Accommodation')}
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem'
            }}>
              {myBookingsList.slice(0, 3).map((b) => (
                <BookingCard key={b.booking_id || b.id} booking={b} />
              ))}
            </div>
          )}
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

      {/* 13. VIEW ALL BOOKINGS MODAL */}
      {isBookingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-bookings-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBookingsModalOpen(false);
            }
          }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '1rem',
            maxWidth: '920px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div>
                <h3 id="all-bookings-modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0F172A' }}>
                  {t('bookings.allBookingsTitle', 'My Yatra Bookings History')}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  {t('bookings.allBookingsSubtitle', 'Complete record of your accommodation requests and stays')} ({myBookingsList.length} total)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingsModalOpen(false)}
                aria-label="Close modal"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '0.5rem',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#64748B',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem'
              }}>
                {myBookingsList.map((b) => (
                  <BookingCard key={b.booking_id || b.id} booking={b} />
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setIsBookingsModalOpen(false)}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#334155',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '0.55rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
