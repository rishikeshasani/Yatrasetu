import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import '../components/tourist/TouristDashboard.css';

// Modular Tourist Components
import LanguageSelector from '../components/tourist/LanguageSelector';
import DestinationGrid from '../components/tourist/DestinationGrid';
import DestinationDetailsModal from '../components/tourist/DestinationDetailsModal';

// Restored Core Person 2 Subsystems
import LiveCrowdCard from '../components/LiveCrowdCard';
import PilgrimAdvisory from '../components/PilgrimAdvisory';
import SafetyAlerts from '../components/SafetyAlerts';
import LocalVendors from '../components/LocalVendors';
import TeamTracker from '../components/TeamTracker';
import { fetchHotels, bookHotelRoom, fetchMyHotelBookings } from '../api/api';

export default function TouristDashboard({
  sites = [],
  selectedSiteId,
  selectedSite,
  onSelectSite,
  densityMap = {},
  currentDensity,
  currentForecast,
  currentPrediction,
  currentAlternatives,
  safetyInfo,
  alerts = [],
  vendors = [],
  activeAlternateRoute,
  pendingPunyaReward = 0,
  routeStatus = 'IDLE',
  completedRouteIds = [],
  onSelectRoute,
  onCompleteArrival,
  onSwitchBack,
  onOpenSOS,
  onOpenWallet,
  walletPoints = 260,
  activeRerouteAlert = null,
  currentUser,
  onShowToast
}) {
  const { t } = useTranslation();

  // Active Shrine Resolution
  const activeSite = useMemo(() => {
    return selectedSite || sites.find((s) => s.id === selectedSiteId) || sites[0] || null;
  }, [selectedSite, sites, selectedSiteId]);

  const activeDensity = currentDensity || (activeSite ? densityMap[activeSite.id] : null);

  // Destination Details Modal State
  const [detailSite, setDetailSite] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Hotels State & Room Booking
  const [hotels, setHotels] = useState([]);
  const [bookingHotelId, setBookingHotelId] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadHotelsAndBookings() {
      try {
        const [hotelList, myBookings] = await Promise.all([
          fetchHotels(),
          fetchMyHotelBookings()
        ]);
        if (!isMounted) return;
        if (Array.isArray(hotelList)) {
          setHotels(hotelList);
        }
        if (Array.isArray(myBookings) && myBookings.length > 0) {
          const latest = myBookings[0];
          setBookingSuccess((prev) => ({
            bookingId: latest.id,
            hotelName: latest.hotel_name || 'Shrine Pilgrimage Lodge',
            roomType: latest.room_type || 'Standard Deluxe',
            price: latest.total_price || 1200,
            status: latest.status || 'confirmed'
          }));
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadHotelsAndBookings();

    const handleStatusChanged = (e) => {
      const { bookingId, status } = e.detail || {};
      setBookingSuccess((prev) => {
        if (!prev) return prev;
        if (!bookingId || prev.bookingId === bookingId) {
          return { ...prev, status: status || 'confirmed' };
        }
        return prev;
      });
    };

    window.addEventListener('yatrasetu:hotel_status_changed', handleStatusChanged);
    const pollInterval = setInterval(loadHotelsAndBookings, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener('yatrasetu:hotel_status_changed', handleStatusChanged);
      clearInterval(pollInterval);
    };
  }, []);

  // Match real hotel records to the selected pilgrimage site
  const displayedHotels = useMemo(() => {
    if (!hotels || hotels.length === 0) return [];
    if (!activeSite) return hotels.slice(0, 6);

    const sId = activeSite.id || activeSite.site_id;
    const sLat = activeSite.latitude;
    const sLon = activeSite.longitude;

    const STOP_WORDS = new Set(['temple', 'mandir', 'shrine', 'the', 'and', 'ghat', 'sansthan', 'parisar', 'corridor', 'path', 'main', 'zone']);
    const clean = (str) => (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
    const siteTokens = clean(activeSite.name)
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOP_WORDS.has(t));

    const getDistKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371.0;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // 1. Direct site_id relationship
    const idMatched = hotels.filter((h) => h.site_id && (h.site_id === sId || h.site_id === activeSite.id));
    if (idMatched.length > 0) return idMatched;

    // 2. Geographic proximity within 25 km
    if (sLat != null && sLon != null) {
      const geoMatched = hotels.filter((h) => {
        if (h.latitude != null && h.longitude != null) {
          return getDistKm(sLat, sLon, h.latitude, h.longitude) <= 25.0;
        }
        return false;
      });
      if (geoMatched.length > 0) return geoMatched;
    }

    // 3. Normalized distinctive token matching against hotel name or address
    if (siteTokens.length > 0) {
      const tokenMatched = hotels.filter((h) => {
        const hText = `${clean(h.name)} ${clean(h.address)}`;
        const hWords = new Set(hText.split(/\s+/));
        return siteTokens.some((tok) => hWords.has(tok) || hText.includes(tok));
      });
      if (tokenMatched.length > 0) return tokenMatched;
    }

    // 4. Fallback with real verified hotel data
    const verifiedHotels = hotels.filter((h) => h.verified);
    return verifiedHotels.length > 0 ? verifiedHotels.slice(0, 6) : hotels.slice(0, 6);
  }, [hotels, activeSite]);

  const handleBookRoom = async (hotel) => {
    const availableRoom = (hotel.rooms || []).find((r) => r.available_rooms > 0) || hotel.rooms?.[0];
    if (!availableRoom) {
      alert("No vacant rooms currently available for this hotel.");
      return;
    }

    setBookingHotelId(hotel.id);

    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date(today);
    checkOut.setDate(checkOut.getDate() + 3);

    const bookingPayload = {
      room_id: availableRoom.id,
      check_in: checkIn.toISOString().split('T')[0],
      check_out: checkOut.toISOString().split('T')[0],
      guests: 2
    };

    try {
      const res = await bookHotelRoom(hotel.id, bookingPayload);
      if (res.status === 'success') {
        setBookingSuccess({
          bookingId: res.data?.id,
          hotelName: hotel.name,
          roomType: availableRoom.room_type,
          price: res.data?.total_price || availableRoom.price_per_night * 2,
          status: 'pending'
        });
        const freshHotels = await fetchHotels();
        if (Array.isArray(freshHotels)) setHotels(freshHotels);
      } else {
        alert(res.detail || "Booking failed. Please ensure you are logged in as a Tourist.");
      }
    } catch (err) {
      alert("Booking error: " + err.message);
    } finally {
      setBookingHotelId(null);
    }
  };

  const handleOpenDetails = (site) => {
    setDetailSite(site);
    setIsDetailModalOpen(true);
  };

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="tourist-dashboard-flow" id="tourist-home">
      {/* 1. RESTORED SUB-HEADER / WELCOME STRIP */}
      <div className="tourist-header-actions-strip">
        <div className="header-strip-left">
          <span className="tourist-mode-pill">
            <span className="live-radar-dot"></span>
            <span>PILGRIM PORTAL • SIH 2026</span>
          </span>
          <div className="quick-nav-pills desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
            <button type="button" className="btn-quick-nav" onClick={() => scrollToSection('tourist-crowd-status')}>
              👥 Crowd &amp; Wait Time
            </button>
            <button type="button" className="btn-quick-nav" onClick={() => scrollToSection('tourist-destinations')}>
              🏛️ Explore 25
            </button>
            <button type="button" className="btn-quick-nav" onClick={() => scrollToSection('tourist-alternatives')}>
              ✨ AI Advisory
            </button>
            <button type="button" className="btn-quick-nav" onClick={() => scrollToSection('tourist-safety')}>
              🛡️ Safety &amp; SOS
            </button>
            <button type="button" className="btn-quick-nav" onClick={() => scrollToSection('tourist-hotels')}>
              🏨 Lodging
            </button>
          </div>
        </div>

        <div className="header-strip-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LanguageSelector compact={false} />
          <button
            type="button"
            className="wallet-strip-btn"
            onClick={onOpenWallet}
            title="Open Green Pilgrim Wallet"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#ECFDF5',
              border: '1px solid #10B981',
              color: '#065F46',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            <span>🌿</span>
            <span>{walletPoints} Pts</span>
            {pendingPunyaReward > 0 && (
              <span style={{ background: '#FEF3C7', color: '#B45309', padding: '0.1rem 0.4rem', borderRadius: '999px', fontSize: '0.72rem', border: '1px solid #FDE68A' }}>
                +{pendingPunyaReward} pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* REAL-TIME GOVERNMENT EMERGENCY REROUTE ALERT BANNER */}
      {activeRerouteAlert && (
        <div style={{
          background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #B91C1C 100%)',
          border: '2px solid #F87171',
          borderRadius: '16px',
          padding: '16px 20px',
          color: '#FFFFFF',
          marginBottom: '1.25rem',
          boxShadow: '0 8px 24px rgba(185, 28, 28, 0.35)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
              <span style={{ fontSize: '30px', lineHeight: 1 }}>🚨</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase'
                  }}>
                    GOVERNMENT EMERGENCY DIVERSION ORDER
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.2)',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontWeight: '600'
                  }}>
                    CORRIDOR: {activeRerouteAlert.site_name || activeRerouteAlert.site_id}
                  </span>
                  <span style={{
                    background: '#FEF08A',
                    color: '#854D0E',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontWeight: '700'
                  }}>
                    {activeRerouteAlert.crowd_status || 'CRITICAL'} CONGESTION
                  </span>
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#FFF' }}>
                  Mandatory Crowd Diversion Advisory for {activeRerouteAlert.site_name || 'Shrine Corridor'}
                </h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: '1.5', color: '#FEE2E2' }}>
                  {activeRerouteAlert.notes || 'Emergency crowd diversion order active. Direct darshan queues are temporarily restricted. Please follow AI-suggested alternate sister shrine corridors.'}
                </p>

                {/* Sister Shrine Alternatives */}
                {Array.isArray(activeRerouteAlert.alternative_routes) && activeRerouteAlert.alternative_routes.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {activeRerouteAlert.alternative_routes.map((alt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onSelectRoute && onSelectRoute({
                          alternative_id: alt.alternative_id || alt.name,
                          name: alt.name,
                          darshan_wait_time_mins: alt.darshan_wait_time_mins || 15,
                          distance_km: alt.distance_km || 20,
                          saved_wait_minutes: 180,
                          punya_points: 25
                        })}
                        style={{
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ➔ Divert to {alt.name} (~{alt.darshan_wait_time_mins || 15}m wait)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CURRENT SELECTED DESTINATION & LIVE CROWD CARD (FRONT AND CENTER) */}
      <div id="tourist-crowd-status">
        <div id="crowd-intelligence">
          {activeSite && (
            <LiveCrowdCard
              site={activeSite}
              density={activeDensity}
              forecast={currentForecast}
              prediction={currentPrediction}
            />
          )}
        </div>
      </div>

      {/* 3. DESTINATION EXPLORER (25 SHRINE CARDS WITH LOCAL IMAGES) */}
      <div id="tourist-destinations">
        <div id="smart-destinations">
          <DestinationGrid
            sites={sites}
            densityMap={densityMap}
            selectedSiteId={selectedSiteId}
            onSelectSite={(id) => {
              onSelectSite(id);
              scrollToSection('tourist-crowd-status');
            }}
            onViewDetails={handleOpenDetails}
          />
        </div>
      </div>

      {/* 4. DESTINATION DETAILS MODAL (WITH LARGER IMAGE) */}
      <DestinationDetailsModal
        site={detailSite}
        density={detailSite ? densityMap[detailSite.id] : null}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSelectForMonitoring={(siteId) => {
          onSelectSite(siteId);
          scrollToSection('tourist-crowd-status');
        }}
      />

      {/* 5. AI PILGRIM ADVISORY & DYNAMIC ALTERNATIVE ROUTE RECOMMENDATION */}
      <div id="tourist-alternatives">
        <div id="how-it-works">
          {activeSite && (
            <PilgrimAdvisory
              currentSite={activeSite}
              density={activeDensity}
              forecast={currentForecast}
              prediction={currentPrediction}
              alternativesData={currentAlternatives}
              activeAlternateRoute={activeAlternateRoute}
              pendingPunyaReward={pendingPunyaReward}
              routeStatus={routeStatus}
              completedRouteIds={completedRouteIds}
              onSelectRoute={onSelectRoute}
              onCompleteArrival={onCompleteArrival}
              onSwitchBack={onSwitchBack}
            />
          )}
        </div>
      </div>

      {/* 6. YATRA DAL GROUP TRACKER */}
      {activeSite && (
        <TeamTracker
          currentSite={activeSite}
          siteId={selectedSiteId}
        />
      )}

      {/* 7. SAFETY ADVISORIES, EMERGENCY SOS & SDRF CONTACTS */}
      <div id="tourist-safety">
        <div id="safety">
          {activeSite && (
            <SafetyAlerts
              alerts={alerts}
              safetyInfo={safetyInfo}
              currentSite={activeSite}
              onOpenSOS={onOpenSOS}
            />
          )}
        </div>
      </div>

      {/* 8. GREEN PILGRIM WALLET SUMMARY BANNER */}
      <div
        className="tourist-wallet-summary-box"
        onClick={onOpenWallet}
        style={{
          background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
          border: '1px solid #6EE7B7',
          borderRadius: '1.15rem',
          padding: '1.25rem 1.6rem',
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>🌿</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#065F46' }}>
              Green Pilgrim Punya Wallet: {walletPoints} Points Active
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#047857' }}>
              {pendingPunyaReward > 0
                ? `🎁 +${pendingPunyaReward} Punya Points pending verified GPS arrival at ${activeAlternateRoute?.name || 'alternate destination'}.`
                : 'Help balance holy sanctum footfall! Earn +25 Punya Points on every verified alternative route arrival.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWallet}
          style={{
            background: '#059669',
            color: '#FFFFFF',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.65rem',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
          }}
        >
          Open Wallet &amp; Rewards →
        </button>
      </div>

      {/* 9. VERIFIED SHRINES LODGES & ACCOMMODATIONS */}
      <div id="tourist-hotels" className="tourist-hotels-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '1.15rem',
          border: '1px solid #E2E8F0',
          padding: '1.6rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🏨</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800', color: '#0F172A' }}>
                  {t('hotels.title')}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  {t('hotels.subtitle')} {activeSite?.name || 'shrine'}
                </p>
              </div>
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
              {t('hotels.verifiedBadge')}
            </span>
          </div>

          {bookingSuccess && (
            <div style={{
              background: bookingSuccess.status === 'confirmed' ? '#ECFDF5' : bookingSuccess.status === 'declined' ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${bookingSuccess.status === 'confirmed' ? '#10B981' : bookingSuccess.status === 'declined' ? '#EF4444' : '#F59E0B'}`,
              borderRadius: '0.85rem',
              padding: '0.95rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{
                  margin: 0,
                  color: bookingSuccess.status === 'confirmed' ? '#065F46' : bookingSuccess.status === 'declined' ? '#991B1B' : '#92400E',
                  fontSize: '0.92rem'
                }}>
                  {bookingSuccess.status === 'confirmed' && `✅ ${t('hotels.bookingSuccess') || 'Booking Confirmed!'} ${bookingSuccess.hotelName}`}
                  {bookingSuccess.status === 'pending' && `⏳ Room Requested — Awaiting Lodge Verification at ${bookingSuccess.hotelName}`}
                  {bookingSuccess.status === 'declined' && `⚠️ Reservation Request Declined — ${bookingSuccess.hotelName}`}
                </h4>
                <p style={{
                  margin: '0.25rem 0 0',
                  color: bookingSuccess.status === 'confirmed' ? '#047857' : bookingSuccess.status === 'declined' ? '#B91C1C' : '#B45309',
                  fontSize: '0.8rem'
                }}>
                  Booking ID: <code style={{ fontWeight: 'bold' }}>{bookingSuccess.bookingId}</code> • {bookingSuccess.roomType} • ₹{bookingSuccess.price} 
                  {bookingSuccess.status === 'pending' ? ' (Transmitted to Hotel Partner Portal)' : ' (Saved in Supabase)'}
                </p>
              </div>
              <button
                onClick={() => setBookingSuccess(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: bookingSuccess.status === 'confirmed' ? '#065F46' : bookingSuccess.status === 'declined' ? '#991B1B' : '#92400E',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.15rem'
          }}>
            {(displayedHotels.length > 0 ? displayedHotels : (hotels.length > 0 ? hotels.slice(0, 6) : [
              { id: 'h1', name: 'Kedarnath Himalayan Inn & Ashrams', address: 'Temple Path, Zone B', price_per_night: 1200, rating: 4.8 },
              { id: 'h2', name: 'GMVN Kedarnath Tourist Rest House', address: 'Helipad Approach Road', price_per_night: 850, rating: 4.6 },
              { id: 'h3', name: 'Badrinath Yatri Niwas & Bhavan', address: 'Main Temple Gate #2', price_per_night: 950, rating: 4.7 }
            ])).map((h) => {
              const firstRoom = h.rooms?.[0];
              const availCount = h.rooms?.reduce((acc, r) => acc + (r.available_rooms || 0), 0);
              const price = firstRoom?.price_per_night || h.price_per_night || 1200;

              return (
                <div key={h.id} style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.85rem',
                  padding: '1.1rem',
                  background: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#0F172A' }}>{h.name}</h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#D97706', background: '#FEF3C7', padding: '0.12rem 0.45rem', borderRadius: '5px' }}>
                        ★ {h.rating || '4.8'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: '#64748B' }}>
                      📍 {h.address || 'Near Sacred Pilgrimage Sector'}
                    </p>
                    {availCount != null && (
                      <span style={{ fontSize: '0.75rem', color: availCount > 0 ? '#059669' : '#DC2626', fontWeight: '700' }}>
                        {availCount > 0 ? `✓ ${availCount} vacant rooms` : '⚠️ Limited vacancy'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                    <div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#0F172A' }}>
                        ₹{price}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}> {t('hotels.perNight')}</span>
                    </div>

                    <button
                      type="button"
                      disabled={bookingHotelId === h.id}
                      onClick={() => handleBookRoom(h)}
                      style={{
                        background: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '0.55rem',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {bookingHotelId === h.id ? 'Booking...' : t('hotels.bookRoom')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 10. VOCAL FOR LOCAL TEMPLE BAZAAR */}
      {activeSite && (
        <LocalVendors
          vendors={vendors}
          siteName={activeSite.name}
        />
      )}
    </div>
  );
}
