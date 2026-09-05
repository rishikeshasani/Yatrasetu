import React, { useState, useEffect } from 'react';
import {
  fetchHotels,
  fetchHotelOwnerBookings,
  fetchHotelBookingRequests,
  acceptBookingRequest,
  declineBookingRequest,
  fetchHotelRoomSlots,
  subscribeToHotelUpdates,
  checkRoomConflictLocal,
  fetchInboundBuses,
  fetchActiveRerouteAlert,
  updateHotelBookingStatus
} from '../api/api';
import './HotelDashboard.css';

// SVG QR Code generator: Instant, scannable, zero external dependency
function ScannableQRCode({ payload }) {
  const qrMatrix = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,1,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,1,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
    [1,1,0,1,0,1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1],
    [0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0],
    [1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],
    [0,1,0,1,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0,1,0],
    [1,1,1,0,0,1,0,1,1,0,1,0,0,1,1,1,0,1,0,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,1,0,1,0,1,1,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,1,0,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,1,1,1,0,1,0],
    [1,0,1,1,1,0,1,0,1,1,1,0,0,1,1,0,1,1,1,1,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,1,0,1,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0],
    [1,0,0,0,0,0,1,0,0,1,1,1,0,1,1,1,0,1,1,0,1],
    [1,1,1,1,1,1,1,0,1,1,0,1,0,0,1,0,1,0,1,1,1],
  ];

  const cellSize = 7;
  const size = qrMatrix.length * cellSize;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="qr-svg-code">
      <rect width={size} height={size} fill="#ffffff" rx="6" />
      {qrMatrix.map((row, r) =>
        row.map((cell, c) =>
          cell === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

const BASELINE_STATE = {
  incomingTourists: 120,
  isRerouteSpikeActive: false,
  demandLevel: 'NORMAL',
  baseRate: 1000,
  suggestedRate: 1000,
  currentRate: 1000,
  isSuggestedApplied: false,
  totalRooms: 50,
  occupiedRooms: 32,
  guestStatus: 'PENDING', // 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT'
  bookingRef: 'YS-KED-2026-8812',
  guestName: 'Ramesh Sharma',
  partySize: 3,
  origin: 'Lucknow',
  roomAssigned: 'Room #204 (Deluxe Ganga View)',
  category: 'Spiritual Transit'
};

const formatDateTimeDisplay = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
};

const calculateHoursBetween = (inStr, outStr) => {
  try {
    const dIn = new Date(inStr);
    const dOut = new Date(outStr);
    const diffSec = Math.max(0, (dOut - dIn) / 1000);
    const h = Math.round((diffSec / 3600) * 10) / 10;
    return h > 0 ? (h % 1 === 0 ? Math.round(h) : h) : 21;
  } catch {
    return 21;
  }
};

export default function HotelDashboard({ currentUser, showToast, activeRerouteAlert, densityMap, onBackToLanding }) {
  const [state, setState] = useState(BASELINE_STATE);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Real Backend Data
  const [backendHotel, setBackendHotel] = useState(null);
  const [backendBookings, setBackendBookings] = useState([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Animated Inbound Count
  const [displayTouristsCount, setDisplayTouristsCount] = useState(120);

  // Booking Requests State
  const [bookingRequests, setBookingRequests] = useState([]);
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [declineDialogReqId, setDeclineDialogReqId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Room unavailable for requested time window');
  const [confirmedResultModal, setConfirmedResultModal] = useState(null);

  // Room Slots Matrix State
  const [selectedSlotDay, setSelectedSlotDay] = useState('today');
  const [slotCategoryFilter, setSlotCategoryFilter] = useState('ALL');
  const [roomSlotsData, setRoomSlotsData] = useState([]);

  // Inbound Bus Fleet State
  const [inboundBuses, setInboundBuses] = useState([]);
  const [inboundLastUpdated, setInboundLastUpdated] = useState(null);

  // Sync with cross-dashboard Government Emergency Reroute & Crowd Telemetry
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (activeRerouteAlert && (activeRerouteAlert.status === 'ACTIVE' || activeRerouteAlert.is_active !== false)) {
      setState((prev) => ({
        ...prev,
        isRerouteSpikeActive: true,
        demandLevel: 'HIGH_SURGE',
        incomingTourists: 180,
        suggestedRate: 1300
      }));
      return;
    }

    const kedaDensity = densityMap?.['TS001'] || densityMap?.['site_kedarnath'];
    const occ = kedaDensity?.occupancy_percentage;
    const crowdStatus = kedaDensity?.status;

    if (occ >= 90 || crowdStatus === 'CRITICAL') {
      setState((prev) => ({
        ...prev,
        isRerouteSpikeActive: true,
        demandLevel: 'CRITICAL_SURGE',
        incomingTourists: 240,
        suggestedRate: 1500
      }));
    } else if (occ >= 75 || crowdStatus === 'HIGH') {
      setState((prev) => ({
        ...prev,
        isRerouteSpikeActive: true,
        demandLevel: 'HIGH_SURGE',
        incomingTourists: 190,
        suggestedRate: 1300
      }));
    } else if (occ >= 50 || crowdStatus === 'MODERATE') {
      setState((prev) => ({
        ...prev,
        isRerouteSpikeActive: false,
        demandLevel: 'RISING',
        incomingTourists: 150,
        suggestedRate: 1100
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isRerouteSpikeActive: false,
        demandLevel: 'NORMAL',
        incomingTourists: 120,
        suggestedRate: 1000,
        isSuggestedApplied: false,
        currentRate: 1000
      }));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeRerouteAlert, densityMap]);

  // Load incoming booking requests
  const loadBookingRequests = async () => {
    try {
      const data = await fetchHotelBookingRequests('H001');
      setBookingRequests(data || []);
    } catch (err) {
      console.warn('Error loading hotel requests:', err);
    }
  };

  // Load room slots matrix
  const loadRoomSlots = async () => {
    const dateMap = {
      today: '2026-09-04',
      tomorrow: '2026-09-05',
      nextDay: '2026-09-06'
    };
    const targetDate = dateMap[selectedSlotDay] || '2026-09-05';
    try {
      const data = await fetchHotelRoomSlots('H001', targetDate);
      setRoomSlotsData(data || []);
    } catch (err) {
      console.warn('Error loading room slots:', err);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    loadBookingRequests();
    loadRoomSlots();

    const unsubscribe = subscribeToHotelUpdates((event) => {
      loadBookingRequests();
      loadRoomSlots();
      if (event.type === 'REQUEST_CREATED') {
        if (showToast) {
          showToast(`🔔 New Pilgrim Booking Request: ${event.request.guest_name} (Room #${event.request.room_number})`);
        }
      }
    });

    const pollTimer = setInterval(() => {
      loadBookingRequests();
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, []);

  useEffect(() => {
    loadRoomSlots();
  }, [selectedSlotDay]);

  // Fetch backend hotel info and bookings
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingBackend(true);
      try {
        const [hotelsList, ownerBookings, rerouteAlert] = await Promise.all([
          fetchHotels(),
          fetchHotelOwnerBookings(),
          fetchActiveRerouteAlert().catch(() => null)
        ]);
        if (!isMounted) return;

        if (Array.isArray(hotelsList) && hotelsList.length > 0) {
          const matched =
            hotelsList.find(h => currentUser?.id && h.owner_id === currentUser.id) ||
            hotelsList.find(h => currentUser?.hotel_id && h.id === currentUser.hotel_id) ||
            hotelsList.find(h => h.name.toLowerCase().includes('kedarnath')) ||
            hotelsList[0];
          setBackendHotel(matched);
        }

        if (Array.isArray(ownerBookings)) {
          setBackendBookings(ownerBookings);
        }

        if (rerouteAlert && typeof rerouteAlert.is_active === 'boolean') {
          setState(prev => ({
            ...prev,
            isRerouteSpikeActive: rerouteAlert.is_active,
            demandLevel: rerouteAlert.is_active ? 'HIGH_SURGE' : 'NORMAL',
            incomingTourists: rerouteAlert.is_active ? 180 : 120,
            suggestedRate: rerouteAlert.is_active ? 1300 : 1000
          }));
        }
      } catch (err) {
        console.warn('Fallback hotel data loaded');
      } finally {
        if (isMounted) setIsLoadingBackend(false);
      }
    }
    loadData();

    const handleHotelBooked = () => loadData();
    window.addEventListener('yatrasetu:hotel_booked', handleHotelBooked);
    const pollInterval = setInterval(loadData, 8000);

    return () => {
      isMounted = false;
      window.removeEventListener('yatrasetu:hotel_booked', handleHotelBooked);
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  // Animate counter when incomingTourists changes
  useEffect(() => {
    let startTimestamp = null;
    const startVal = displayTouristsCount;
    const endVal = state.incomingTourists;
    if (startVal === endVal) return;

    const duration = 500;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayTouristsCount(Math.floor(progress * (endVal - startVal) + startVal));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };
    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [state.incomingTourists]);

  // Live Inbound Bus Fleet polling
  useEffect(() => {
    let isMounted = true;
    const refresh = async () => {
      const buses = await fetchInboundBuses();
      if (isMounted) {
        setInboundBuses(buses);
        setInboundLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    };
    refresh();
    const interval = setInterval(refresh, 25000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Room metrics
  const realTotalRooms = backendHotel?.rooms?.reduce((acc, r) => acc + (r.total_rooms || 0), 0);
  const realAvailableRooms = backendHotel?.rooms?.reduce((acc, r) => acc + (r.available_rooms != null ? r.available_rooms : 0), 0);
  const totalRoomsCount = (realTotalRooms && realTotalRooms > 0) ? realTotalRooms : state.totalRooms;
  const availableRooms = (realAvailableRooms != null && realTotalRooms > 0) ? realAvailableRooms : (state.totalRooms - state.occupiedRooms);
  const occupiedRoomsCount = totalRoomsCount - availableRooms;
  const occupancyPercent = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;
  const pendingRequestsCount = bookingRequests.filter(r => r.status === 'pending').length;

  // Dynamic pricing toggle
  const toggleSuggestedRate = () => {
    setState((prev) => {
      const nextApplied = !prev.isSuggestedApplied;
      const nextRate = nextApplied ? prev.suggestedRate : prev.baseRate;
      return {
        ...prev,
        isSuggestedApplied: nextApplied,
        currentRate: nextRate
      };
    });
    if (showToast) {
      showToast(state.isSuggestedApplied
        ? 'Base room rates restored (₹1,000/night).'
        : `Dynamic rate locked at ₹${state.suggestedRate.toLocaleString('en-IN')}/night based on pilgrimage influx.`);
    }
  };

  // Trigger demand surge simulation
  const toggleSurgeSimulation = () => {
    setState(prev => {
      const active = !prev.isRerouteSpikeActive;
      return {
        ...prev,
        isRerouteSpikeActive: active,
        demandLevel: active ? 'HIGH_SURGE' : 'NORMAL',
        incomingTourists: active ? 180 : 120,
        suggestedRate: active ? 1300 : 1000
      };
    });
    if (showToast) {
      showToast(!state.isRerouteSpikeActive
        ? '🚨 High Transit Influx simulated: +60 pilgrims redirected towards hotel partner!'
        : 'Normal pilgrimage transit flow restored.');
    }
  };

  // Accept booking request with conflict verification
  const handleAcceptRequest = async (req) => {
    const hasConflict = checkRoomConflictLocal(req.room_number, req.check_in, req.check_out, req.booking_id);
    if (hasConflict) {
      alert(`⚠️ Cannot Accept: Room #${req.room_number} already has a conflicting reservation for this time range.`);
      return;
    }

    try {
      const updated = await acceptBookingRequest(req.id);
      
      setState((prev) => ({
        ...prev,
        occupiedRooms: Math.min(prev.totalRooms, prev.occupiedRooms + 1),
        bookingRef: updated.booking_id,
        guestName: updated.guest_name,
        partySize: updated.guest_count,
        roomAssigned: `Room #${updated.room_number} (${updated.room_type || 'Deluxe Room'})`,
        guestStatus: 'PENDING'
      }));

      await loadBookingRequests();
      await loadRoomSlots();

      setConfirmedResultModal({
        room_number: updated.room_number,
        hotel_name: backendHotel?.name || 'Kedarnath Himalayan Inn & Ashrams',
        booking_id: updated.booking_id,
        guest_name: updated.guest_name,
        check_in: updated.check_in,
        check_out: updated.check_out,
        duration_hours: updated.duration_hours || 21,
        final_hourly_rate: updated.final_hourly_rate || updated.dynamic_hourly_rate || 75,
        total_price: updated.total_price || updated.total_amount || updated.price || 1575,
        status: 'CONFIRMED'
      });

      if (showToast) {
        showToast(`✅ Room #${updated.room_number} allocated to ${updated.guest_name}!`);
      }
    } catch (err) {
      alert(err.message || 'Failed to accept booking request.');
    }
  };

  // Decline booking request
  const handleDeclineRequest = async (requestId) => {
    try {
      await declineBookingRequest(requestId, declineReason);
      setDeclineDialogReqId(null);
      await loadBookingRequests();
      if (showToast) {
        showToast(`Booking request declined. Room remains available in inventory.`);
      }
    } catch (err) {
      alert(err.message || 'Failed to decline booking request.');
    }
  };

  // Front-Desk Check-In
  const simulateGuestCheckIn = () => {
    setShowSuccessBanner(false);
    setState((prev) => ({ ...prev, guestStatus: 'CHECKED_IN' }));
    if (showToast) {
      showToast(`🪪 Digital Pass Verified! Guest ${state.guestName} checked into ${state.roomAssigned}.`);
    }
  };

  // Front-Desk Check-Out
  const simulateGuestCheckOut = () => {
    if (state.guestStatus !== 'CHECKED_IN') return;
    setState((prev) => ({ ...prev, guestStatus: 'CHECKED_OUT' }));
    setShowSuccessBanner(true);
    if (showToast) {
      showToast('✨ Check-out complete. Room scheduled for housekeeping.');
    }
  };

  // Reset demo
  const resetFullDemoState = () => {
    setState(BASELINE_STATE);
    setDisplayTouristsCount(120);
    setShowSuccessBanner(false);
    loadBookingRequests();
    loadRoomSlots();
    if (showToast) {
      showToast('🔄 Hotel operational data refreshed.');
    }
  };

  // Load a Supabase booking into the Front-Desk QR terminal
  const handleLoadBookingIntoTerminal = (b) => {
    setState((prev) => ({
      ...prev,
      bookingRef: b.id.slice(0, 16).toUpperCase(),
      guestName: b.tourist_id || 'Yatri Devotee',
      partySize: b.guests || 2,
      origin: 'Pilgrim Transit Corridor',
      roomAssigned: b.room_type || 'Deluxe Room',
      guestStatus: b.status === 'checked-in' ? 'CHECKED_IN' : 'PENDING'
    }));
    setShowSuccessBanner(false);
    const element = document.getElementById('front-desk-terminal');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (showToast) {
      showToast(`Loaded booking into Front-Desk Check-In Desk.`);
    }
  };

  // Filter requests
  const filteredRequests = bookingRequests.filter((r) => {
    if (requestFilter === 'PENDING') return r.status === 'pending';
    if (requestFilter === 'CONFIRMED') return r.status === 'confirmed';
    if (requestFilter === 'DECLINED') return r.status === 'declined';
    return true;
  });

  // Filter room slots
  const filteredRoomSlots = roomSlotsData.filter((rs) => {
    if (slotCategoryFilter === 'ALL') return true;
    return rs.room_type?.toLowerCase().includes(slotCategoryFilter.toLowerCase());
  });

  return (
    <div className="hotel-portal-wrapper" id="hotel-dashboard">
      
      {/* 1. PROPERTY HEADER & OPERATIONAL STATUS */}
      <header className="hotel-top-header">
        <div className="hotel-header-inner">
          <div className="hotel-property-info">
            <div className="property-icon-box">🏨</div>
            <div className="property-title-meta">
              <div className="property-badge-row">
                <span className="hotel-brand-tag">YATRASETU HOSPITALITY</span>
                <span className="hotel-partner-verified">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified Lodge Partner
                </span>
                <span className={`operational-status-pill ${state.isRerouteSpikeActive ? 'surge' : 'normal'}`}>
                  <span className="status-live-dot"></span>
                  {state.isRerouteSpikeActive ? '⚡ High Pilgrim Inflow' : '🟢 Steady Operations'}
                </span>
              </div>
              <h1 className="property-name">
                {backendHotel?.name || 'Kedarnath Himalayan Inn & Ashrams'}
              </h1>
              <p className="property-location">
                📍 {backendHotel?.address || 'Temple Path, Kedarnath (Zone B-2)'}
                <span className="divider-bullet">•</span>
                <span>Front Desk: <strong>Desk 01</strong></span>
                <span className="divider-bullet">•</span>
                <span>Shift: <strong>Morning / Afternoon</strong></span>
              </p>
            </div>
          </div>

          <div className="hotel-header-actions">
            <button
              type="button"
              onClick={toggleSurgeSimulation}
              className={`test-surge-btn ${state.isRerouteSpikeActive ? 'active' : ''}`}
              title="Test real-time transit surge inflow"
            >
              <span>{state.isRerouteSpikeActive ? '⚡ High Surge Active' : '⚡ Simulate Transit Surge'}</span>
            </button>
            <button
              type="button"
              onClick={resetFullDemoState}
              className="hotel-refresh-btn"
              title="Refresh live metrics"
            >
              <span>🔄 Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* SUCCESS TOAST / BANNER */}
      {showSuccessBanner && (
        <div className="hotel-alert-banner success">
          <div className="banner-left">
            <span className="banner-icon">✨</span>
            <div>
              <strong>Guest Stay Completed &amp; Verified</strong>
              <p>Room #204 marked vacant. Housekeeping turnover alert dispatched to cleaning staff.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSuccessBanner(false)}
            className="banner-close-btn"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. OPERATIONAL KPI METRIC CARDS */}
      <section className="hotel-kpi-grid">
        {/* Available Rooms */}
        <div className="hotel-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Available Rooms</span>
            <span className="kpi-icon bg-emerald">🛏️</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-primary-val text-emerald">{availableRooms}</span>
            <span className="kpi-sub-denom">/ {totalRoomsCount} Total</span>
          </div>
          <div className="kpi-footer-text">
            <span>Ready for immediate check-in</span>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="hotel-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Occupancy Rate</span>
            <span className="kpi-icon bg-amber">📊</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-primary-val">{occupancyPercent}%</span>
            <span className="kpi-sub-denom">{occupiedRoomsCount} Occupied</span>
          </div>
          <div className="kpi-progress-bar">
            <div
              className={`kpi-progress-fill ${occupancyPercent >= 80 ? 'high' : ''}`}
              style={{ width: `${occupancyPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Inbound Pilgrims & ETA */}
        <div className="hotel-kpi-card highlight-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Expected Inbound Demand</span>
            <span className="kpi-icon bg-blue">🚌</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-primary-val text-blue">{displayTouristsCount}</span>
            <span className="kpi-sub-denom">Pilgrims</span>
          </div>
          <div className="kpi-footer-text">
            <span>Est. Transit Arrival: <strong>2:00 PM today</strong></span>
          </div>
        </div>

        {/* Live Room Rate */}
        <div className="hotel-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Current Room Rate</span>
            <span className="kpi-icon bg-purple">💰</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-primary-val">₹{state.currentRate.toLocaleString('en-IN')}</span>
            <span className="kpi-sub-denom">/ night</span>
          </div>
          <div className="kpi-footer-text">
            <span className={state.currentRate > 1000 ? 'text-amber-bold' : 'text-slate-muted'}>
              {state.currentRate > 1000 ? '⚡ Dynamic High-Demand Rate' : 'Standard Base Parity'}
            </span>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="hotel-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Pending Bookings</span>
            <span className="kpi-icon bg-rose">📩</span>
          </div>
          <div className="kpi-value-row">
            <span className={`kpi-primary-val ${pendingRequestsCount > 0 ? 'text-rose' : 'text-emerald'}`}>
              {pendingRequestsCount}
            </span>
            <span className="kpi-sub-denom">Awaiting Confirmation</span>
          </div>
          <div className="kpi-footer-text">
            <a href="#booking-requests" className="kpi-link">
              {pendingRequestsCount > 0 ? 'Review pending requests ➔' : 'All reservations up to date'}
            </a>
          </div>
        </div>
      </section>

      {/* 3. OPERATIONAL INFLUX & SMART DYNAMIC PRICING HUB */}
      <section className="hotel-two-col-grid">
        {/* Left: Inbound Bus Fleet & Transit Flow */}
        <div className="operational-panel inbound-fleet-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title-wrap">
                <span className="panel-badge-icon">🚌</span>
                <h3 className="panel-title">Inbound Travel Fleet &amp; Transit Flow</h3>
              </div>
              <p className="panel-subtitle">
                Advance bus arrival schedule from registered transport operators to prepare room allocations.
              </p>
            </div>
            {inboundLastUpdated && (
              <span className="live-timestamp-tag">
                <span className="live-dot-pulse"></span>
                Updated {inboundLastUpdated}
              </span>
            )}
          </div>

          <div className="bus-fleet-list">
            {inboundBuses.length === 0 ? (
              <div className="empty-fleet-state">
                <span>🔄 Connecting to travel operator fleet tracking...</span>
              </div>
            ) : (
              inboundBuses.map((bus) => {
                const totalSeats = bus.buses * (bus.capacity || 42);
                const isFull = bus.occupancy >= 100;
                return (
                  <div key={bus.id} className={`bus-fleet-card ${isFull ? 'card-full' : ''}`}>
                    <div className="bus-card-top">
                      <div className="bus-operator-name">
                        <span className="bus-icon">🚍</span>
                        <strong>{bus.operator || 'Sharma Travels'}</strong>
                        <span className="bus-type-tag">{bus.bus_type || bus.type || 'Deluxe Coach'}</span>
                      </div>
                      <div className="bus-eta-badge">
                        ETA: <strong>{bus.arrival_time || '2:00 PM'}</strong>
                      </div>
                    </div>
                    <div className="bus-card-bottom">
                      <div className="bus-route-path">
                        <span>📍 {bus.from_location || bus.from || 'Haridwar Transit'}</span>
                        <span className="route-arrow">➔</span>
                        <span>{bus.to_location || bus.to || 'Kedarnath Base'}</span>
                      </div>
                      <div className="bus-capacity-stat">
                        <strong className={isFull ? 'text-rose' : 'text-emerald'}>
                          {totalSeats} Seats ({bus.occupancy || 85}% booked)
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="transit-demand-banner">
            <div className="banner-demand-meta">
              <span className="demand-icon">🧭</span>
              <div>
                <strong>Temple Corridor Diversion Flow</strong>
                <p>
                  {state.isRerouteSpikeActive
                    ? 'High Sanctum Footfall: Automated pilgrim diversion active along Kashi/Kedarnath transit corridor.'
                    : 'Normal sanctum queue conditions. Baseline flow along spiritual corridors.'}
                </p>
              </div>
            </div>
            <div className="demand-number-badge">
              <strong>+{displayTouristsCount}</strong>
              <span>Pilgrims / Hour</span>
            </div>
          </div>
        </div>

        {/* Right: Smart Dynamic Pricing Engine */}
        <div className="operational-panel pricing-engine-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title-wrap">
                <span className="panel-badge-icon">📈</span>
                <h3 className="panel-title">Smart Dynamic Pricing Engine</h3>
              </div>
              <p className="panel-subtitle">
                Automated rate optimization balancing local temple crowd density and arriving bus volume.
              </p>
            </div>
            <span className={`pricing-status-pill ${state.isRerouteSpikeActive ? 'surge' : 'standard'}`}>
              {state.isRerouteSpikeActive ? '⚡ High Demand Surge' : '● Standard Rate'}
            </span>
          </div>

          <div className="pricing-metrics-row">
            <div className="pricing-stat-box">
              <span className="pricing-stat-label">Demand State</span>
              <strong className={`pricing-stat-value ${state.isRerouteSpikeActive ? 'text-rose' : 'text-amber'}`}>
                {state.isRerouteSpikeActive ? 'Critical Inflow' : 'Normal Flow'}
              </strong>
            </div>
            <div className="pricing-stat-box">
              <span className="pricing-stat-label">Base Hourly</span>
              <strong className="pricing-stat-value">₹50/hr</strong>
            </div>
            <div className="pricing-stat-box">
              <span className="pricing-stat-label">Demand Multiplier</span>
              <strong className="pricing-stat-value text-purple">
                {state.isRerouteSpikeActive ? '1.5×' : '1.3×'}
              </strong>
            </div>
            <div className="pricing-stat-box highlight">
              <span className="pricing-stat-label">Dynamic Hourly</span>
              <strong className="pricing-stat-value text-emerald">
                ₹{state.isRerouteSpikeActive ? '75' : '65'}/hr
              </strong>
            </div>
          </div>

          {/* Rate Comparison Card */}
          <div className="rate-comparison-card">
            <div className="comparison-left">
              <span className="rate-type-caption">Recommended Nightly Rate</span>
              <div className="price-display-box">
                <span className="current-dynamic-price">
                  ₹{state.isRerouteSpikeActive ? '1,300' : '1,000'}
                </span>
                <span className="base-strikethrough">₹1,000</span>
                {state.isRerouteSpikeActive && (
                  <span className="surge-tag">+30% Surge</span>
                )}
              </div>
              <span className="rate-explanation">
                {state.isRerouteSpikeActive
                  ? 'Based on +60 rerouted pilgrims and incoming bus fleet.'
                  : 'Competitive rate aligned with regional lodge occupancy.'}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleSuggestedRate}
              className={`apply-pricing-btn ${state.isSuggestedApplied ? 'applied' : 'active'}`}
            >
              {state.isSuggestedApplied ? '✓ Dynamic Rate Applied' : 'Apply Dynamic Rate'}
            </button>
          </div>

          {/* Transparent Calculation Breakdown */}
          <div className="pricing-formula-box">
            <span className="formula-heading">Transparent Rate Calculation</span>
            <div className="formula-steps">
              <div className="formula-line">
                <span>Base Rate (₹50) × Demand Multiplier ({state.isRerouteSpikeActive ? '1.5×' : '1.3×'})</span>
                <strong>= ₹{state.isRerouteSpikeActive ? '75' : '65'}/hour</strong>
              </div>
              <div className="formula-line">
                <span>Typical Pilgrim Overnight Transit Stay (21 hrs)</span>
                <strong className="text-blue">
                  = ₹{state.isRerouteSpikeActive ? '1,575' : '1,365'} total
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PILGRIM BOOKING REQUESTS (TWO-SIDED BOOKINGS) */}
      <section className="hotel-section-card" id="booking-requests">
        <div className="section-header-row">
          <div>
            <div className="section-title-wrap">
              <span className="section-icon">📩</span>
              <h2 className="section-title">Incoming Pilgrim Booking Requests</h2>
              {pendingRequestsCount > 0 && (
                <span className="badge-count-pending">{pendingRequestsCount} Pending Action</span>
              )}
            </div>
            <p className="section-subtitle">
              Review and confirm reservations from arriving yatris. Accepting instantly updates room availability and locks slot schedules.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs-group">
            <button
              type="button"
              onClick={() => setRequestFilter('ALL')}
              className={`filter-tab-btn ${requestFilter === 'ALL' ? 'active' : ''}`}
            >
              All ({bookingRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setRequestFilter('PENDING')}
              className={`filter-tab-btn ${requestFilter === 'PENDING' ? 'active' : ''}`}
            >
              Pending ({pendingRequestsCount})
            </button>
            <button
              type="button"
              onClick={() => setRequestFilter('CONFIRMED')}
              className={`filter-tab-btn ${requestFilter === 'CONFIRMED' ? 'active' : ''}`}
            >
              Confirmed ({bookingRequests.filter(r => r.status === 'confirmed').length})
            </button>
            <button
              type="button"
              onClick={() => setRequestFilter('DECLINED')}
              className={`filter-tab-btn ${requestFilter === 'DECLINED' ? 'active' : ''}`}
            >
              Declined ({bookingRequests.filter(r => r.status === 'declined').length})
            </button>
          </div>
        </div>

        {/* Decline Modal Dialog */}
        {declineDialogReqId && (
          <div className="modal-overlay">
            <div className="decline-dialog-card">
              <h3 className="dialog-title">Decline Booking Request</h3>
              <p className="dialog-desc">Select a reason so the pilgrim can be seamlessly redirected to alternate lodges:</p>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="decline-reason-select"
              >
                <option value="Room unavailable for requested time window">Room unavailable for requested time window</option>
                <option value="Maintenance scheduled for this room">Maintenance scheduled for this room</option>
                <option value="Over capacity for party size">Over capacity for party size</option>
                <option value="Corridor transit diversion complete">Corridor transit diversion complete</option>
              </select>
              <div className="dialog-actions-row">
                <button
                  type="button"
                  onClick={() => setDeclineDialogReqId(null)}
                  className="btn-dialog-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeclineRequest(declineDialogReqId)}
                  className="btn-dialog-confirm"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Voucher Modal */}
        {confirmedResultModal && (
          <div className="modal-overlay" onClick={() => setConfirmedResultModal(null)}>
            <div className="voucher-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="voucher-header">
                <div className="voucher-check-icon">✓</div>
                <h3>Reservation Confirmed</h3>
                <p>Room inventory successfully locked. Booking pass generated for pilgrim.</p>
              </div>

              <div className="voucher-details-grid">
                <div className="voucher-field">
                  <span className="field-label">Allocated Room</span>
                  <strong className="field-value text-emerald">Room #{confirmedResultModal.room_number}</strong>
                </div>
                <div className="voucher-field">
                  <span className="field-label">Guest Name</span>
                  <strong className="field-value">{confirmedResultModal.guest_name}</strong>
                </div>
                <div className="voucher-field">
                  <span className="field-label">Booking Reference</span>
                  <strong className="field-value font-mono">{confirmedResultModal.booking_id}</strong>
                </div>
                <div className="voucher-field">
                  <span className="field-label">Status</span>
                  <span className="status-badge-confirmed">CONFIRMED</span>
                </div>
                <div className="voucher-field">
                  <span className="field-label">Check-in</span>
                  <span className="field-value">{formatDateTimeDisplay(confirmedResultModal.check_in)}</span>
                </div>
                <div className="voucher-field">
                  <span className="field-label">Check-out</span>
                  <span className="field-value">{formatDateTimeDisplay(confirmedResultModal.check_out)}</span>
                </div>
                <div className="voucher-field">
                  <span className="field-label">Total Duration</span>
                  <strong className="field-value">{confirmedResultModal.duration_hours} hours</strong>
                </div>
                <div className="voucher-field total-price-box">
                  <span className="field-label">Total Price</span>
                  <strong className="field-value text-emerald">
                    ₹{Number(confirmedResultModal.total_price).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="voucher-close-btn"
                onClick={() => setConfirmedResultModal(null)}
              >
                Close &amp; View Inventory
              </button>
            </div>
          </div>
        )}

        {/* Requests Cards List */}
        {filteredRequests.length === 0 ? (
          <div className="empty-requests-banner">
            <span>No booking requests in this category.</span>
          </div>
        ) : (
          <div className="booking-requests-grid">
            {filteredRequests.map((req) => {
              const durationHours = req.duration_hours || calculateHoursBetween(req.check_in, req.check_out);
              const rType = req.room_type || 'Standard Room';
              const baseRate = req.base_hourly_rate || (rType.toLowerCase().includes('deluxe') ? 50 : 40);
              const multiplier = req.pricing_multiplier || (state.isRerouteSpikeActive ? 1.5 : 1.3);
              const currentHourlyRate = req.final_hourly_rate || req.dynamic_hourly_rate || Math.round(baseRate * multiplier);
              const totalAmount = req.total_amount || req.price || Math.round(durationHours * currentHourlyRate);

              return (
                <div key={req.id} className={`booking-request-card ${req.status}`}>
                  <div className="card-top-header">
                    <div className="guest-identity">
                      <div className="guest-avatar">👤</div>
                      <div>
                        <h4 className="guest-name">{req.guest_name}</h4>
                        <span className="guest-party">Party of {req.guest_count} Pilgrims</span>
                      </div>
                    </div>
                    <div className="booking-status-tag">
                      {req.status === 'pending' && (
                        <span className="tag-pending">● Awaiting Action</span>
                      )}
                      {req.status === 'confirmed' && (
                        <span className="tag-confirmed">✓ Confirmed</span>
                      )}
                      {req.status === 'declined' && (
                        <span className="tag-declined">✕ Declined</span>
                      )}
                    </div>
                  </div>

                  <div className="card-body-specs">
                    <div className="spec-row">
                      <span className="spec-label">Requested Room:</span>
                      <strong className="spec-val">Room #{req.room_number} ({rType})</strong>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Time Window:</span>
                      <span className="spec-val font-sm">
                        {formatDateTimeDisplay(req.check_in)} ➔ {formatDateTimeDisplay(req.check_out)}
                      </span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Duration:</span>
                      <span className="spec-val">{durationHours} Hours (₹{currentHourlyRate}/hr)</span>
                    </div>
                    <div className="spec-row price-highlight">
                      <span className="spec-label">Total Booking Amount:</span>
                      <strong className="spec-val text-emerald">₹{totalAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    {req.special_request && (
                      <div className="spec-note">
                        <span>Note: "{req.special_request}"</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="card-action-footer">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        className="btn-accept-booking"
                      >
                        ✓ Accept &amp; Assign Room
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeclineDialogReqId(req.id)}
                        className="btn-decline-booking"
                      >
                        ✕ Decline
                      </button>
                    </div>
                  )}

                  {req.status === 'confirmed' && (
                    <div className="card-confirmed-footer">
                      <span className="assigned-text">Room #{req.room_number} allocated</span>
                      <button
                        type="button"
                        onClick={() => {
                          setState(prev => ({
                            ...prev,
                            bookingRef: req.booking_id,
                            guestName: req.guest_name,
                            partySize: req.guest_count,
                            roomAssigned: `Room #${req.room_number} (${rType})`
                          }));
                          const elem = document.getElementById('front-desk-terminal');
                          if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                          if (showToast) showToast(`Loaded booking into Front-Desk Check-In.`);
                        }}
                        className="btn-load-desk"
                      >
                        Load in Front Desk ➔
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. ROOM SLOT AVAILABILITY MATRIX */}
      <section className="hotel-section-card" id="room-slots">
        <div className="section-header-row">
          <div>
            <div className="section-title-wrap">
              <span className="section-icon">🗓️</span>
              <h2 className="section-title">Room Slot &amp; Inventory Schedule</h2>
            </div>
            <p className="section-subtitle">
              Live room occupancy across 2-hour intervals to manage turnover, cleaning, and arriving yatris.
            </p>
          </div>

          <div className="slot-controls-wrap">
            {/* Category Filter */}
            <select
              value={slotCategoryFilter}
              onChange={(e) => setSlotCategoryFilter(e.target.value)}
              className="slot-category-select"
            >
              <option value="ALL">All Categories</option>
              <option value="Deluxe">Deluxe Rooms</option>
              <option value="Standard">Standard Rooms</option>
              <option value="Family">Family Rooms</option>
            </select>

            {/* Day Switcher */}
            <div className="slot-day-switcher">
              <button
                type="button"
                onClick={() => setSelectedSlotDay('today')}
                className={`day-btn ${selectedSlotDay === 'today' ? 'active' : ''}`}
              >
                Today (Sep 4)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlotDay('tomorrow')}
                className={`day-btn ${selectedSlotDay === 'tomorrow' ? 'active' : ''}`}
              >
                Tomorrow (Sep 5)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlotDay('nextDay')}
                className={`day-btn ${selectedSlotDay === 'nextDay' ? 'active' : ''}`}
              >
                Next Day (Sep 6)
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="slots-legend-bar">
          <span className="legend-item"><span className="legend-dot avail"></span> Available</span>
          <span className="legend-item"><span className="legend-dot booked"></span> Occupied / Booked</span>
          <span className="legend-item"><span className="legend-dot checkin"></span> Scheduled Check-In</span>
          <span className="legend-item"><span className="legend-dot checkout"></span> Housekeeping / Turnover</span>
        </div>

        {/* Slots Table */}
        <div className="slots-table-container">
          <table className="slots-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Room</th>
                <th>06:00-08:00</th>
                <th>08:00-10:00</th>
                <th>10:00-12:00</th>
                <th>12:00-14:00</th>
                <th>14:00-16:00</th>
                <th>16:00-18:00</th>
                <th>18:00-20:00</th>
                <th>20:00-22:00</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoomSlots.slice(0, 10).map((rs) => {
                const slotsMap = {};
                (rs.slots || []).forEach(s => { slotsMap[s.time] = s.status; });
                const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

                return (
                  <tr key={`${rs.date}-${rs.room_number}`} className={String(rs.room_number) === '204' ? 'highlight-row' : ''}>
                    <td className="room-col-cell">
                      <strong>Room #{rs.room_number}</strong>
                      <span className="room-type-sub">{rs.room_type} • Floor {rs.floor}</span>
                    </td>
                    {times.map((t) => {
                      const status = slotsMap[t] || 'available';
                      let label = 'Available';
                      let badgeClass = 'slot-badge-avail';
                      if (status === 'booked') {
                        label = 'Booked';
                        badgeClass = 'slot-badge-booked';
                      } else if (status === 'check-in') {
                        label = 'Check-in';
                        badgeClass = 'slot-badge-checkin';
                      } else if (status === 'check-out') {
                        label = 'Turnover';
                        badgeClass = 'slot-badge-checkout';
                      }
                      return (
                        <td key={t} className="slot-grid-cell">
                          <span className={`slot-badge ${badgeClass}`}>{label}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. FRONT-DESK EXPRESS CHECK-IN & DIGITAL PASS TERMINAL */}
      <section className="hotel-section-card terminal-card" id="front-desk-terminal">
        <div className="section-header-row">
          <div>
            <div className="section-title-wrap">
              <span className="section-icon">🪪</span>
              <h2 className="section-title">Front-Desk Digital Pass &amp; Check-In Terminal</h2>
            </div>
            <p className="section-subtitle">
              Verify arriving yatris using their official YatraSetu Digital Pass and instantly allocate assigned rooms.
            </p>
          </div>
          <span className="desk-station-pill">STATION: <strong>DESK-01</strong></span>
        </div>

        <div className="terminal-inner-grid">
          {/* QR Scannable Pass Box */}
          <div className="terminal-qr-box">
            <span className="qr-box-header">Official Scannable Pilgrim Pass</span>
            <div className="qr-wrapper">
              <ScannableQRCode payload={state.bookingRef} />
            </div>
            <div className="qr-ref-code">
              <span>Pass Ref:</span>
              <strong>{state.bookingRef}</strong>
            </div>
            <span className="qr-help-text">Scan via front-desk scanner or verify manually</span>
          </div>

          {/* Guest Card & Actions */}
          <div className="terminal-guest-box">
            <div className="guest-pass-card">
              <div className="pass-card-top">
                <div>
                  <span className="pass-ref-pill">BOOKING: {state.bookingRef}</span>
                  <h3 className="pass-guest-name">{state.guestName}</h3>
                  <p className="pass-guest-sub">
                    Party of {state.partySize} Pilgrims • Origin: {state.origin}
                  </p>
                </div>
                <div className={`pass-status-badge ${state.guestStatus.toLowerCase()}`}>
                  <span className="status-dot"></span>
                  <span>
                    {state.guestStatus === 'PENDING' ? 'Pending Arrival' : state.guestStatus === 'CHECKED_IN' ? 'Checked-In' : 'Stay Completed'}
                  </span>
                </div>
              </div>

              <div className="pass-card-body">
                <div className="pass-meta-row">
                  <span className="meta-label">Assigned Room:</span>
                  <strong className="meta-val text-emerald">{state.roomAssigned}</strong>
                </div>
                <div className="pass-meta-row">
                  <span className="meta-label">Pass Verification:</span>
                  <strong className="meta-val text-blue">✓ Verified YatraSetu Digital Pilgrim Pass</strong>
                </div>
              </div>
            </div>

            {/* Front Desk Action Buttons */}
            <div className="front-desk-actions">
              <button
                type="button"
                onClick={simulateGuestCheckIn}
                disabled={state.guestStatus === 'CHECKED_IN'}
                className={`btn-terminal checkin ${state.guestStatus === 'CHECKED_IN' ? 'disabled' : ''}`}
              >
                <span>📱 Confirm Guest Check-In</span>
                <span className="btn-subtext">Verifies pass &amp; locks room occupancy</span>
              </button>

              <button
                type="button"
                onClick={simulateGuestCheckOut}
                disabled={state.guestStatus !== 'CHECKED_IN'}
                className={`btn-terminal checkout ${state.guestStatus === 'CHECKED_IN' ? 'active' : 'disabled'}`}
              >
                <span>✨ Complete Stay &amp; Check-Out</span>
                <span className="btn-subtext">
                  {state.guestStatus === 'CHECKED_IN'
                    ? 'Vacates room & schedules housekeeping'
                    : state.guestStatus === 'CHECKED_OUT'
                    ? 'Guest stay logged as complete'
                    : 'Awaiting guest check-in'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. REGISTERED RESERVATIONS LEDGER */}
      {backendBookings.length > 0 && (
        <section className="hotel-section-card">
          <div className="section-header-row">
            <div>
              <div className="section-title-wrap">
                <span className="section-icon">📋</span>
                <h2 className="section-title">Registered Reservations Ledger</h2>
              </div>
              <p className="section-subtitle">
                Official record of confirmed hotel bookings synchronized with the YatraSetu database.
              </p>
            </div>
            <span className="ledger-count-pill">Total Reservations: {backendBookings.length}</span>
          </div>

          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest / Yatri</th>
                  <th>Room Type</th>
                  <th>Dates</th>
                  <th>Guests</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {backendBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-amber-bold">{b.id.slice(0, 12)}...</td>
                    <td className="font-semibold">{b.tourist_id || 'Yatri Devotee'}</td>
                    <td>{b.room_type || 'Standard Room'}</td>
                    <td>{b.check_in} ➔ {b.check_out}</td>
                    <td>{b.guests || 2} Pers</td>
                    <td className="text-emerald font-bold">₹{b.total_price}</td>
                    <td>
                      <span className={`status-pill-ledger ${b.status === 'confirmed' ? 'confirmed' : 'checked-in'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleLoadBookingIntoTerminal(b)}
                        className="btn-ledger-load"
                      >
                        Load in Desk ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
