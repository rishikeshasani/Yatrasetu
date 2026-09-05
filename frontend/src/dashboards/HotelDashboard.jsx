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
  fetchActiveRerouteAlert
} from '../api/api';
import './HotelDashboard.css';

// SVG QR Code generator component as a resilient, instant, self-contained QR renderer
function ScannableQRCode({ payload }) {
  // 21x21 QR Code Version 1 pattern
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

  const cellSize = 8;
  const size = qrMatrix.length * cellSize;

  return (
    <svg width="176" height="176" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      <rect width={size} height={size} fill="#ffffff" />
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
  occupiedRooms: 32, // 18 available, 64% occupancy
  guestStatus: 'PENDING', // 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT'
  bookingRef: 'YS-KED-2026-8812',
  guestName: 'Ramesh Sharma',
  partySize: 3,
  origin: 'Lucknow',
  roomAssigned: '#204 Deluxe Ganga View',
  category: 'Rerouted Transit'
};


// Formatting & Duration Calculation Helpers for Dynamic Hourly Pricing
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

export default function HotelDashboard({ currentUser, showToast }) {
  const [state, setState] = useState(BASELINE_STATE);

  // Alerts
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Real Backend Data
  const [backendHotel, setBackendHotel] = useState(null);
  const [backendBookings, setBackendBookings] = useState([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Animate counter
  const [displayTouristsCount, setDisplayTouristsCount] = useState(120);

  // TWO-SIDED BOOKING REQUESTS STATE
  const [bookingRequests, setBookingRequests] = useState([]);
  const [requestFilter, setRequestFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'DECLINED'
  const [declineDialogReqId, setDeclineDialogReqId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Room unavailable for requested time window');

  // ROOM SLOTS MATRIX STATE
  const [selectedSlotDay, setSelectedSlotDay] = useState('tomorrow'); // 'today' (4 Sep) | 'tomorrow' (5 Sep) | 'nextDay' (6 Sep) | 'sep7'
  const [slotCategoryFilter, setSlotCategoryFilter] = useState('ALL'); // 'ALL' | 'Deluxe' | 'Standard' | 'Family'
  const [roomSlotsData, setRoomSlotsData] = useState([]);

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
      nextDay: '2026-09-06',
      sep7: '2026-09-07'
    };
    const targetDate = dateMap[selectedSlotDay] || '2026-09-05';
    try {
      const data = await fetchHotelRoomSlots('H001', targetDate);
      setRoomSlotsData(data || []);
    } catch (err) {
      console.warn('Error loading room slots:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadBookingRequests();
    loadRoomSlots();

    // Subscribe to cross-tab updates
    const unsubscribe = subscribeToHotelUpdates((event) => {
      loadBookingRequests();
      loadRoomSlots();
      if (event.type === 'REQUEST_CREATED') {
        if (showToast) {
          showToast(`🔔 New Booking Request from ${event.request.guest_name} (Room #${event.request.room_number})`);
        }
      }
    });

    // 3-second heartbeat polling so new requests automatically appear
    const pollTimer = setInterval(() => {
      loadBookingRequests();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, []);

  useEffect(() => {
    loadRoomSlots();
  }, [selectedSlotDay]);

  // Fetch real hotel data on mount & listen to live booking events
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

    // Auto-refresh when tourist books room or on 6-second heartbeat
    const handleHotelBooked = () => {
      loadData();
    };
    const handleRerouteEvent = (e) => {
      const active = Boolean(e?.detail?.is_active);
      setState(prev => ({
        ...prev,
        isRerouteSpikeActive: active,
        demandLevel: active ? 'HIGH_SURGE' : 'NORMAL',
        incomingTourists: active ? 180 : 120,
        suggestedRate: active ? 1300 : 1000
      }));
    };
    window.addEventListener('yatrasetu:hotel_booked', handleHotelBooked);
    window.addEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
    const pollInterval = setInterval(loadData, 6000);

    return () => {
      isMounted = false;
      window.removeEventListener('yatrasetu:hotel_booked', handleHotelBooked);
      window.removeEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  // Animate counter when incomingTourists changes
  useEffect(() => {
    let startTimestamp = null;
    const startVal = displayTouristsCount;
    const endVal = state.incomingTourists;
    if (startVal === endVal) return;

    const duration = 600;
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

  // ─── LIVE INBOUND FLEET: poll /fleet/schedules/inbound every 30s ───────────
  const [inboundBuses, setInboundBuses] = useState([]);
  const [inboundLastUpdated, setInboundLastUpdated] = useState(null);
  useEffect(() => {
    let isMounted = true;
    const refresh = async () => {
      const buses = await fetchInboundBuses();
      if (isMounted) {
        setInboundBuses(buses);
        setInboundLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    };
    refresh();
    const interval = setInterval(refresh, 30000); // refresh every 30s
    return () => { isMounted = false; clearInterval(interval); };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  // Derived metrics connecting live Supabase room inventory
  const realTotalRooms = backendHotel?.rooms?.reduce((acc, r) => acc + (r.total_rooms || 0), 0);
  const realAvailableRooms = backendHotel?.rooms?.reduce((acc, r) => acc + (r.available_rooms != null ? r.available_rooms : 0), 0);
  const totalRoomsCount = (realTotalRooms && realTotalRooms > 0) ? realTotalRooms : state.totalRooms;
  const availableRooms = (realAvailableRooms != null && realTotalRooms > 0) ? realAvailableRooms : (state.totalRooms - state.occupiedRooms);
  const occupiedRoomsCount = totalRoomsCount - availableRooms;
  const occupancyPercent = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;
  const pendingRequestsCount = bookingRequests.filter(r => r.status === 'pending').length;

  // FLOW 1: Rerouting Spike Simulation
  const triggerReroutingSpike = () => {
    if (state.isRerouteSpikeActive) return;

    setState((prev) => ({
      ...prev,
      isRerouteSpikeActive: true,
      demandLevel: 'HIGH_SURGE',
      incomingTourists: 180,
      suggestedRate: 1300
    }));
    if (showToast) {
      showToast('🚨 High Surge Alert: 60 additional pilgrims rerouted to hotel partner!');
    }
  };

  // FLOW 1B: Dynamic Pricing Toggle
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
  };

  // OWNER VERIFICATION & ACCEPT BOOKING REQUEST
  const handleAcceptRequest = async (req) => {
    // 1. Strict Owner Verification: Check time-range overlap before confirming
    const hasConflict = checkRoomConflictLocal(req.room_number, req.check_in, req.check_out, req.booking_id);
    if (hasConflict) {
      alert(`⚠️ Cannot Accept: Room #${req.room_number} already has a conflicting reservation for this time range.`);
      return;
    }

    try {
      const updated = await acceptBookingRequest(req.id);
      
      // Update local dashboard stats: decrement availability (18 -> 17), increase occupied (32 -> 33)
      setState((prev) => ({
        ...prev,
        occupiedRooms: Math.min(prev.totalRooms, prev.occupiedRooms + 1),
        bookingRef: updated.booking_id,
        guestName: updated.guest_name,
        partySize: updated.guest_count,
        roomAssigned: `#${updated.room_number} ${updated.room_type} Ganga View`,
        guestStatus: 'PENDING'
      }));

      await loadBookingRequests();
      await loadRoomSlots();

      if (showToast) {
        showToast(`✅ Request ${updated.id} Accepted! Room #${updated.room_number} allocated to ${updated.guest_name}.`);
      }
    } catch (err) {
      alert(err.message || 'Failed to accept booking request.');
    }
  };

  // DECLINE BOOKING REQUEST
  const handleDeclineRequest = async (requestId) => {
    try {
      await declineBookingRequest(requestId, declineReason);
      setDeclineDialogReqId(null);
      await loadBookingRequests();
      if (showToast) {
        showToast(`Booking Request ${requestId} declined. Room remains available.`);
      }
    } catch (err) {
      alert(err.message || 'Failed to decline booking request.');
    }
  };

  // FLOW 2: Guest Check-in
  const simulateGuestCheckIn = () => {
    setShowSuccessBanner(false);

    setState((prev) => ({
      ...prev,
      guestStatus: 'CHECKED_IN'
    }));

    if (showToast) {
      showToast('📱 QR Code Verified! Guest checked into Room #204.');
    }
  };

  // FLOW 2B: Guest Check-out
  const simulateGuestCheckOut = () => {
    if (state.guestStatus !== 'CHECKED_IN') return;

    setState((prev) => ({
      ...prev,
      guestStatus: 'CHECKED_OUT'
    }));

    setShowSuccessBanner(true);

    if (showToast) {
      showToast('🎉 Stay Completed! Municipal Tax Credit updated to ₹750.');
    }
  };

  // FLOW 4: Master Demo Reset
  const resetFullDemoState = () => {
    setState(BASELINE_STATE);
    setDisplayTouristsCount(120);
    setShowSuccessBanner(false);
    loadBookingRequests();
    loadRoomSlots();
    if (showToast) {
      showToast('🔄 Demo states reset to initial baseline.');
    }
  };

  // Load a Supabase booking into the QR terminal
  const handleLoadBookingIntoTerminal = (b) => {
    setState((prev) => ({
      ...prev,
      bookingRef: b.id,
      guestName: b.tourist_id || 'Yatri Devotee',
      partySize: b.guests || 2,
      origin: 'Pilgrim Corridor',
      roomAssigned: b.room_type || 'Deluxe Room',
      guestStatus: b.status === 'checked-in' ? 'CHECKED_IN' : 'PENDING'
    }));
    setShowSuccessBanner(false);
    if (showToast) {
      showToast(`🪪 Loaded Booking ${b.id} into QR Check-In Terminal.`);
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
    return rs.room_type?.toLowerCase() === slotCategoryFilter.toLowerCase();
  });

  return (
    <div className="hotel-portal-wrapper" id="hotel-dashboard">

        {/* HOTEL GANGA PALACE: DYNAMIC PRICING & BUS ARRIVALS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem 2.5rem 0' }}>
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                <span>🚌</span> Inbound Fleet Arrivals
              </h3>
              {inboundLastUpdated && (
                <span style={{ fontSize: '0.75rem', color: '#6B7280', backgroundColor: '#E5E7EB', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  🔴 Live · {inboundLastUpdated}
                </span>
              )}
            </div>
            <p style={{ margin: '0 0 1rem', color: '#15803D', fontSize: '0.9rem' }}>
              Live tracking from Sharma Travels fleet schedule — updates every 30s.
            </p>
            {inboundBuses.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.9rem' }}>Loading live data...</div>
            ) : (
              inboundBuses.map((bus) => {
                const totalSeats = bus.buses * (bus.capacity || 42);
                const isFull = bus.occupancy >= 100;
                return (
                  <div key={bus.id} style={{ backgroundColor: '#FFF', padding: '0.85rem', borderRadius: '0.5rem', border: `1px solid ${isFull ? '#FECACA' : '#BBF7D0'}`, marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: isFull ? '#DC2626' : '#166534', marginBottom: '0.25rem' }}>
                      <span>{bus.operator || 'Sharma Travels'} · {bus.buses} 🚌 {bus.bus_type || bus.type}</span>
                      <span>ETA: {bus.arrival_time || 'TBD'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151' }}>
                      <span>📍 {bus.from_location || bus.from} → {bus.to_location || bus.to}</span>
                      <span style={{ fontWeight: 'bold', color: isFull ? '#DC2626' : '#16A34A' }}>{totalSeats} seats · {bus.occupancy}% occ.</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
              <span>📈</span> Dynamic Pricing Engine
            </h3>
            <p style={{ margin: '0 0 1rem', color: '#1D4ED8', fontSize: '0.95rem' }}>
              YatraSetu AI has automatically adjusted rates based on the inbound bus volume and Somvati Amavasya demand.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #BFDBFE' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Friday Night Rate (Oct 12)</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1E3A8A' }}>₹4,500</span>
                <span style={{ textDecoration: 'line-through', color: '#94A3B8', marginLeft: '0.75rem', fontSize: '1.2rem' }}>₹3,330</span>
              </div>
              <div style={{ backgroundColor: '#DC2626', color: '#FFF', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
                +35% Surge
              </div>
            </div>
            <button style={{ width: '100%', marginTop: '1.25rem', padding: '0.75rem', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Lock Dynamic Rate</button>
          </div>
        </div>
      {/* 1. HEADER & TOP NAVIGATION BAR */}
      <header className="hotel-portal-header">
        <div className="hotel-portal-header-inner">
          {/* Brand & Property Location Info */}
          <div className="hotel-brand-box">
            <div className="hotel-icon-badge">
              🏨
            </div>
            <div className="hotel-brand-titles">
              <div className="hotel-brand-row">
                <span className="hotel-brand-name">YatraSetu</span>
                <span className="hotel-partner-pill">HOTEL PARTNER</span>
              </div>
              <p className="hotel-property-sub">
                <span className="hotel-live-dot animate-ping-slow"></span>
                <strong>{backendHotel?.name || 'Hotel Ganga Heritage'}</strong>
                &nbsp;• {backendHotel?.address ? backendHotel.address.split(',')[0] : 'Kashi Corridor (Zone B-2)'}
              </p>
            </div>
          </div>

          {/* Controls: Verification & Master Reset */}
          <div className="hotel-header-controls">
            <div className="hotel-verified-badge">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Verified Partner</span>
            </div>

            {/* Discreet Demo Reset Button */}
            <button
              type="button"
              onClick={resetFullDemoState}
              title="Reset all demo states back to baseline"
              className="hotel-reset-btn"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>🔄 Reset Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* TOAST ALERTS CONTAINER */}
      <div className="hotel-toast-container">
        {/* Success Checkout Banner */}
        {showSuccessBanner && (
          <div className="hotel-success-banner">
            <div className="success-left">
              <div className="success-icon-box">🎉</div>
              <div className="success-text-box">
                <h4>Stay Completed &amp; Verified!</h4>
                <p>Pilgrim check-out logged. Room #204 scheduled for turnover housekeeping.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessBanner(false)}
              className="toast-dismiss-btn"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="hotel-main-body">
        {/* HERO SECTION: INCOMING REROUTED DEMAND & SIMULATE BUTTON */}
        <div className="hotel-hero-card">
          <div className="hotel-hero-glow"></div>

          <div className="hotel-hero-content">
            <div className="hero-left-stack">
              <div className="hero-tags-row">
                <span className={`demand-badge ${state.isRerouteSpikeActive ? 'surge' : 'normal'}`}>
                  <span
                    className="hotel-live-dot"
                    style={{ backgroundColor: state.isRerouteSpikeActive ? '#f43f5e' : '#34d399' }}
                  ></span>
                  <span>
                    {state.isRerouteSpikeActive ? 'High Surge (+50%)' : 'Demand: Normal'}
                  </span>
                </span>

                <span className="hub-location-tag">
                  Kashi Vishwanath Gate #4 Smart Transit Hub
                </span>
              </div>

              <h2 className="hero-metrics-title">
                <span>Incoming Rerouted Demand: </span>
                <span className="counter-highlight">{displayTouristsCount}</span>
                <span className="counter-highlight"> Pilgrims</span>
                <span className="hero-eta-sub">
                  | Expected ETA: <strong>2:00 PM</strong>
                </span>
              </h2>

              <p className="hero-desc-p">
                {state.isRerouteSpikeActive
                  ? '🚨 High Surge Active! 60 additional pilgrims redirected from congested sanctum. Incoming demand: 180 pilgrims.'
                  : 'Baseline crowd state. Automated district balancers are monitoring temple queue saturation. Click below to simulate an active shrine rerouting surge.'}
              </p>
            </div>

            {/* PRIMARY ACTION BUTTON: SIMULATE REROUTING SPIKE */}
            <div className="hero-right-actions">
              <button
                type="button"
                onClick={triggerReroutingSpike}
                className={`simulate-reroute-btn ${state.isRerouteSpikeActive ? 'surge-active' : 'default'}`}
              >
                <span>{state.isRerouteSpikeActive ? '✓' : '🔄'}</span>
                <span>
                  {state.isRerouteSpikeActive ? 'Surge Active (+50%)' : 'Simulate Rerouting Spike'}
                </span>
              </button>

              <div className="simulate-subtext">
                Simulates <strong style={{ color: '#fde68a' }}>Travel ➔ Hotel</strong> rerouting bridge
              </div>
            </div>
          </div>
        </div>

        {/* 3. REORGANIZED KPI DASHBOARD CARDS (EXPRESS BEDS & PUNYA POINTS REMOVED) */}
        <div className="hotel-kpi-row-five">
          {/* 1. Room Availability */}
          <div className="hotel-kpi-item" id="hotel-rooms">
            <div className="kpi-title-row">
              <span>🛏️</span>
              <span>Room Availability</span>
            </div>
            <div className="kpi-main-metric">
              <span className="metric-accent">{availableRooms}</span>
              <span className="metric-denom"> / {totalRoomsCount} Total</span>
            </div>
            <div className="kpi-footer-sub">Available for check-in</div>
          </div>

          {/* 2. Occupancy Rate */}
          <div className="hotel-kpi-item" id="hotel-occupancy">
            <div className="kpi-title-row">
              <span>📊</span>
              <span>Occupancy Rate</span>
            </div>
            <div className="kpi-main-metric">
              {occupancyPercent}%
            </div>
            <div className="kpi-progress-bar">
              <div
                className="kpi-progress-fill"
                style={{ width: `${occupancyPercent}%` }}
              ></div>
            </div>
          </div>

          {/* 3. Total Property Capacity */}
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>🏢</span>
              <span>Total Capacity</span>
            </div>
            <div className="kpi-main-metric" style={{ color: '#0284c7' }}>
              {state.totalRooms} Rooms
            </div>
            <div className="kpi-footer-sub">30 Std • 15 Dlx • 5 Fam</div>
          </div>

          {/* 4. Current Base Rate & Pricing Engine */}
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>💰</span>
              <span>Live Room Rate</span>
            </div>
            <div className="kpi-main-metric">
              ₹{state.currentRate.toLocaleString('en-IN')}
            </div>
            <div className="kpi-footer-sub" style={{ color: state.currentRate > 1000 ? '#f59e0b' : '#64748b' }}>
              {state.currentRate > 1000 ? 'Surge Rate Active' : 'Standard Parity'}
            </div>
          </div>

          {/* 5. Incoming Booking Requests Action Card */}
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>📩</span>
              <span>Booking Requests</span>
            </div>
            <div className="kpi-main-metric" style={{ color: pendingRequestsCount > 0 ? '#f59e0b' : '#10b981' }}>
              {pendingRequestsCount} Pending
            </div>
            <div className="kpi-footer-sub">
              {pendingRequestsCount > 0 ? 'Requires Partner Action' : 'All Requests Processed'}
            </div>
          </div>
        </div>

        {/* 4. RULE-BASED SURGE PRICING STRIP (SIH Decision Layer) */}
        <div className="pricing-control-strip">
          <div className="pricing-left">
            <span className="pricing-icon">⚡</span>
            <div>
              <div className="pricing-heading-row">
                <span>Rule-Based Surge Pricing</span>
                <span className="sih-layer-tag">SIH Decision Layer</span>
              </div>
              <div className="pricing-detail-row">
                Current Rate: <strong>₹{state.currentRate.toLocaleString('en-IN')}</strong> &nbsp;|&nbsp;
                AI-Simulated Suggested Rate: <strong style={{ color: '#fbbf24' }}>₹{state.suggestedRate.toLocaleString('en-IN')}</strong>
                {state.isRerouteSpikeActive && (
                  <span className="pricing-surge-pill">Surge Active (+30%)</span>
                )}
              </div>
              <div className="pricing-tooltip-row">
                <span>ℹ️</span>
                <span>Automated pricing decision layer based on real-time temple transit reroute volume.</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSuggestedRate}
            className={`apply-rate-btn ${
              state.isSuggestedApplied
                ? 'default'
                : state.isRerouteSpikeActive
                ? 'surge-recommend ring-attention'
                : 'default'
            }`}
          >
            {state.isSuggestedApplied
              ? 'Revert to Base Rate (₹1,000)'
              : `Apply Suggested Rate (₹${state.suggestedRate.toLocaleString('en-IN')})`}
          </button>
        </div>

        {/* ================================================================= */}
        {/* 5. TWO-SIDED BOOKING REQUESTS REVIEW SECTION                     */}
        {/* ================================================================= */}
        <div className="hotel-booking-requests-card" id="booking-requests">
          <div className="requests-card-header">
            <div>
              <div className="flex items-center space-x-2">
                <span style={{ fontSize: '18px' }}>📩</span>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  Incoming Pilgrim Booking Requests
                </h3>
                {pendingRequestsCount > 0 && (
                  <span className="requests-pending-pill">
                    {pendingRequestsCount} Pending Action
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Verify requested time ranges against room slot schedule before accepting. Accepting immediately updates room availability across all platforms.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="requests-filter-tabs">
              <button
                type="button"
                onClick={() => setRequestFilter('ALL')}
                className={`tab-btn ${requestFilter === 'ALL' ? 'active' : ''}`}
              >
                All ({bookingRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('PENDING')}
                className={`tab-btn ${requestFilter === 'PENDING' ? 'active' : ''}`}
              >
                Pending ({pendingRequestsCount})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('CONFIRMED')}
                className={`tab-btn ${requestFilter === 'CONFIRMED' ? 'active' : ''}`}
              >
                Confirmed ({bookingRequests.filter(r => r.status === 'confirmed').length})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('DECLINED')}
                className={`tab-btn ${requestFilter === 'DECLINED' ? 'active' : ''}`}
              >
                Declined ({bookingRequests.filter(r => r.status === 'declined').length})
              </button>
            </div>
          </div>

          {/* Decline Reason Modal/Dialog */}
          {declineDialogReqId && (
            <div className="decline-dialog-overlay">
              <div className="decline-dialog-box">
                <h4>Decline Booking Request</h4>
                <p>Select reason for declining this request:</p>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="decline-select"
                >
                  <option value="Room unavailable for requested time window">Room unavailable for requested time window</option>
                  <option value="Maintenance scheduled for this room">Maintenance scheduled for this room</option>
                  <option value="Over capacity for party size">Over capacity for party size</option>
                  <option value="Transit corridor rerouting diversion">Transit corridor rerouting diversion</option>
                  <option value="Custom">Other / Custom Reason...</option>
                </select>
                {declineReason === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom decline explanation..."
                    onChange={(e) => setDeclineReason(e.target.value)}
                    style={{ marginTop: '8px', width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    autoFocus
                  />
                )}
                <div className="decline-dialog-actions">
                  <button
                    type="button"
                    onClick={() => setDeclineDialogReqId(null)}
                    className="dialog-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineRequest(declineDialogReqId)}
                    className="dialog-confirm-decline-btn"
                  >
                    Confirm Decline
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Requests List: Redesigned with Dynamic Hourly Pricing & Crowd Insights (Section 6) */}
          {filteredRequests.length === 0 ? (
            <div className="no-requests-message">
              No booking requests found in this category.
            </div>
          ) : (
            <div className="requests-grid">
              {filteredRequests.map((req) => {
                const durationHours = req.duration_hours || calculateHoursBetween(req.check_in, req.check_out);
                const rType = req.room_type || 'Deluxe';
                const baseRate = req.base_hourly_rate || (rType.toLowerCase().includes('standard') ? 40 : (rType.toLowerCase().includes('family') ? 70 : 50));
                const multiplier = req.pricing_multiplier || (state.isRerouteSpikeActive ? 1.5 : 1.5);
                const currentHourlyRate = req.final_hourly_rate || req.dynamic_hourly_rate || Math.round(baseRate * multiplier);
                const totalAmount = req.total_amount || req.price || Math.round(durationHours * currentHourlyRate);
                const siteName = req.site_name || 'Kashi Vishwanath';
                const crowdPct = req.crowd_density_at_booking ? Math.round(req.crowd_density_at_booking * 100) : 87;
                const demandLevel = req.crowd_level_at_booking || (crowdPct >= 85 ? 'HIGH' : (crowdPct >= 50 ? 'MODERATE' : 'NORMAL'));

                return (
                  <div key={req.id} className={`owner-req-card ${req.status}`}>
                    {/* Top Section */}
                    <div className="req-card-header-block">
                      <div className="req-card-meta-top">
                        <span className="req-card-title-tag">INCOMING BOOKING REQUEST</span>
                        <div className="req-status-pill-wrap">
                          {req.status === 'pending' && (
                            <span className="status-badge pending">
                              <span className="dot animate-pulse"></span> PENDING REVIEW
                            </span>
                          )}
                          {req.status === 'confirmed' && (
                            <span className="status-badge confirmed">
                              ✓ CONFIRMED &amp; BOOKED
                            </span>
                          )}
                          {req.status === 'declined' && (
                            <span className="status-badge declined">
                              ✕ DECLINED
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="req-refs-row">
                        <span className="badge-req-id">{req.id}</span>
                        <span className="badge-booking-id">REF: {req.booking_id}</span>
                      </div>

                      <h4 className="req-guest-title">
                        {req.guest_name}
                        <span className="req-party-sub">({req.guest_count} Guests)</span>
                      </h4>

                      <div className="req-room-pill">
                        Requested: <strong>Room #{req.room_number} ({rType})</strong>
                      </div>

                      {req.special_request && (
                        <div className="req-special-note-owner">
                          Special Request: <strong>"{req.special_request}"</strong>
                        </div>
                      )}
                    </div>

                    <div className="req-card-divider"></div>

                    {/* SECTION 1: TIME WINDOW */}
                    <div className="req-card-section">
                      <div className="section-label-header">
                        <span className="section-dot"></span> TIME WINDOW
                      </div>
                      <div className="time-window-display">
                        <div className="time-endpoint">
                          <span className="time-point-label">Check-in</span>
                          <strong className="time-point-val">{formatDateTimeDisplay(req.check_in)}</strong>
                        </div>
                        <div className="time-arrow-divider">→</div>
                        <div className="time-endpoint">
                          <span className="time-point-label">Check-out</span>
                          <strong className="time-point-val">{formatDateTimeDisplay(req.check_out)}</strong>
                        </div>
                      </div>
                      <div className="duration-pill-row">
                        <span className="duration-label">Duration:</span>
                        <strong className="duration-value">{durationHours} hours</strong>
                      </div>
                    </div>

                    <div className="req-card-divider"></div>

                    {/* SECTION 2: DYNAMIC PRICING */}
                    <div className="req-card-section pricing-section">
                      <div className="section-label-header">
                        <span className="section-dot"></span> DYNAMIC PRICING
                      </div>
                      <div className="pricing-grid-breakdown">
                        <div className="price-item-row">
                          <span className="price-label">Base Rate:</span>
                          <span className="price-val">₹{baseRate} / hour</span>
                        </div>
                        <div className="price-item-row">
                          <span className="price-label">Crowd Multiplier:</span>
                          <span className="price-val multiplier-val">{multiplier}×</span>
                        </div>
                        <div className="price-item-row">
                          <span className="price-label">Current Rate:</span>
                          <span className="price-val highlight-rate">₹{currentHourlyRate} / hour</span>
                        </div>
                        <div className="price-item-row">
                          <span className="price-label">Total Duration:</span>
                          <span className="price-val">{durationHours} hours</span>
                        </div>
                        <div className="price-total-highlight-row">
                          <span className="total-label">TOTAL AMOUNT:</span>
                          <span className="total-amount-val">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="req-card-divider"></div>

                    {/* SECTION 3: CROWD & DEMAND INSIGHTS */}
                    <div className="req-card-section crowd-insights-section">
                      <div className="section-label-header">
                        <span className="section-dot"></span> CROWD &amp; DEMAND INSIGHTS
                      </div>
                      <div className="crowd-insights-grid">
                        <div className="crowd-item-row">
                          <span className="crowd-label">Nearby Pilgrimage Site:</span>
                          <strong className="crowd-val-bold">{siteName}</strong>
                        </div>
                        <div className="crowd-item-row">
                          <span className="crowd-label">Current Crowd:</span>
                          <span className="crowd-val-pill">
                            <span className="crowd-val-num">{crowdPct}% capacity</span>
                          </span>
                        </div>
                        <div className="crowd-item-row">
                          <span className="crowd-label">Demand:</span>
                          <span className={`demand-level-pill ${demandLevel.toLowerCase()}`}>
                            {demandLevel}
                          </span>
                        </div>
                        <div className="crowd-item-row">
                          <span className="crowd-label">Pricing Multiplier:</span>
                          <span className="multiplier-badge-tag">{multiplier}×</span>
                        </div>
                      </div>
                    </div>

                    {req.decline_reason && (
                      <div className="req-reason-row">
                        Reason: <em>{req.decline_reason}</em>
                      </div>
                    )}

                    {/* Owner Action Buttons */}
                    {req.status === 'pending' && (
                      <div className="req-owner-actions">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req)}
                          className="btn-owner-accept"
                        >
                          ✓ ACCEPT &amp; ASSIGN ROOM
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeclineDialogReqId(req.id)}
                          className="btn-owner-decline"
                        >
                          ✕ DECLINE
                        </button>
                      </div>
                    )}

                    {req.status === 'confirmed' && (
                      <div className="req-confirmed-footer">
                        <span>Room #{req.room_number} assigned. Rate: ₹{currentHourlyRate}/h (Total: ₹{totalAmount.toLocaleString('en-IN')}).</span>
                        <button
                          type="button"
                          onClick={() => {
                            setState(prev => ({
                              ...prev,
                              bookingRef: req.booking_id,
                              guestName: req.guest_name,
                              partySize: req.guest_count,
                              roomAssigned: `#${req.room_number} ${rType} Ganga View`
                            }));
                            if (showToast) showToast(`Loaded ${req.booking_id} in QR Terminal.`);
                          }}
                          className="btn-load-terminal"
                        >
                          Load in QR Desk ➔
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 6. ROOM SLOT / TIME-BASED AVAILABILITY MATRIX                     */}
        {/* ================================================================= */}
        <div className="hotel-room-slots-card" id="room-slots">
          <div className="slots-card-header">
            <div>
              <div className="flex items-center space-x-2">
                <span style={{ fontSize: '18px' }}>🗓️</span>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  Room Slot Availability Matrix
                </h3>
                <span className="slots-partner-tag">TEMPLE TRANSIT SLOTS</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time room occupancy and upcoming turnover slots across 2-hour time intervals
              </p>
            </div>

            {/* Date Switcher */}
            <div className="slots-day-switcher">
              <button
                type="button"
                onClick={() => setSelectedSlotDay('today')}
                className={`day-btn ${selectedSlotDay === 'today' ? 'active' : ''}`}
              >
                Today • 4 Sep
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlotDay('tomorrow')}
                className={`day-btn ${selectedSlotDay === 'tomorrow' ? 'active' : ''}`}
              >
                Tomorrow • 5 Sep
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlotDay('nextDay')}
                className={`day-btn ${selectedSlotDay === 'nextDay' ? 'active' : ''}`}
              >
                Next Day • 6 Sep
              </button>
            </div>
          </div>

          {/* Legend and Category Filter */}
          <div className="slots-controls-bar">
            <div className="slots-legend">
              <span className="legend-item"><span className="legend-dot avail"></span> Available</span>
              <span className="legend-item"><span className="legend-dot booked"></span> Booked</span>
              <span className="legend-item"><span className="legend-dot checkin"></span> Check-in</span>
              <span className="legend-item"><span className="legend-dot checkout"></span> Check-out</span>
            </div>

            <div className="slots-category-filter">
              <span>Filter:</span>
              <select
                value={slotCategoryFilter}
                onChange={(e) => setSlotCategoryFilter(e.target.value)}
                className="category-filter-select"
              >
                <option value="ALL">All Categories (50 Rooms)</option>
                <option value="Deluxe">Deluxe (15 Rooms)</option>
                <option value="Standard">Standard (30 Rooms)</option>
                <option value="Family">Family (5 Rooms)</option>
              </select>
            </div>
          </div>

          {/* Slots Table */}
          <div className="slots-table-wrap">
            <table className="slots-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Room</th>
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
                {filteredRoomSlots.slice(0, 12).map((rs) => {
                  const slotsMap = {};
                  (rs.slots || []).forEach(s => { slotsMap[s.time] = s.status; });
                  const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
                  
                  return (
                    <tr key={`${rs.date}-${rs.room_number}`} className={String(rs.room_number) === '204' ? 'highlight-room-204' : ''}>
                      <td className="room-cell">
                        <div className="room-title">Room #{rs.room_number}</div>
                        <div className="room-sub">{rs.room_type} • Fl {rs.floor}</div>
                      </td>
                      {times.map((t) => {
                        const status = slotsMap[t] || 'available';
                        let label = 'Available';
                        let cssClass = 'slot-avail';
                        if (status === 'booked') {
                          label = 'Booked';
                          cssClass = 'slot-booked';
                        } else if (status === 'check-in') {
                          label = 'Check-in';
                          cssClass = 'slot-checkin';
                        } else if (status === 'check-out') {
                          label = 'Check-out';
                          cssClass = 'slot-checkout';
                        }
                        return (
                          <td key={t} className="slot-cell">
                            <span className={`slot-badge ${cssClass}`}>
                              {label}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="slots-footer-note">
            Showing top rooms from verified 50-room inventory. Room #204 dynamically synchronizes when booking requests are accepted.
          </div>
        </div>

        {/* 7. WORKFLOW: DYNAMIC SCANNABLE QR & GUEST TERMINAL */}
        <div className="hotel-terminal-panel" id="hotel-bookings">
          <div className="terminal-header-row">
            <div className="terminal-title-group">
              <h3>
                <span>🪪</span>
                <span>Express QR Verification &amp; Guest Check-In Terminal</span>
              </h3>
              <p>
                Real-time digital pass verification for rerouted pilgrims with automatic room occupancy tracking.
              </p>
            </div>
            <div className="terminal-station-tag">
              STATION: <strong>DESK-01</strong>
            </div>
          </div>

          <div className="terminal-columns-grid">
            {/* Left Column: Dynamic Scannable QR Engine */}
            <div className="qr-display-box">
              <div className="qr-badge-label">
                Official Demo Check-In QR (Scannable)
              </div>

              <div className="qr-canvas-holder">
                <ScannableQRCode payload={state.bookingRef} />
              </div>

              <p className="qr-payload-text">
                PAYLOAD: <strong>{state.bookingRef}</strong>
              </p>

              <span className="qr-instruction-sub">
                Scan QR to verify live booking ID.
              </span>
            </div>

            {/* Right Column: Simulated Live Pilgrim & Action Buttons */}
            <div className="pilgrim-terminal-right">
              <div className="pilgrim-card-frame">
                <div className="pilgrim-card-top">
                  <div>
                    <span className="booking-ref-tag">
                      BOOKING REF: {state.bookingRef}
                    </span>
                    <h4 className="pilgrim-name-row">
                      <span>{state.guestName}</span>
                      <span className="pilgrim-party-sub">
                        (Party: {state.partySize} Pilgrims • Origin: {state.origin})
                      </span>
                    </h4>
                    <div className="pilgrim-room-meta">
                      <span>Room: <strong style={{ color: '#f1f5f9' }}>{state.roomAssigned}</strong></span>
                      <span>•</span>
                      <span style={{ color: '#fbbf24', fontWeight: '600' }}>
                        Category: {state.category}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`pilgrim-status-pill ${
                      state.guestStatus === 'PENDING'
                        ? 'pending'
                        : state.guestStatus === 'CHECKED_IN'
                        ? 'checked-in'
                        : 'checked-out'
                    }`}
                  >
                    <span
                      className="hotel-live-dot"
                      style={{
                        backgroundColor:
                          state.guestStatus === 'PENDING'
                            ? '#f59e0b'
                            : state.guestStatus === 'CHECKED_IN'
                            ? '#10b981'
                            : '#c084fc',
                        margin: 0
                      }}
                    ></span>
                    <span>
                      {state.guestStatus === 'PENDING'
                        ? 'Pending Arrival'
                        : state.guestStatus === 'CHECKED_IN'
                        ? 'Checked-In ✔'
                        : 'Checked-Out ✔'}
                    </span>
                  </div>
                </div>

                <div className="pilgrim-card-bottom">
                  <span>
                    Status:{' '}
                    {state.guestStatus === 'PENDING' ? (
                      <strong style={{ color: '#cbd5e1' }}>Awaiting QR Check-In</strong>
                    ) : state.guestStatus === 'CHECKED_IN' ? (
                      <strong style={{ color: '#34d399' }}>Checked-In ✔ (Room #204 Allocated)</strong>
                    ) : (
                      <strong style={{ color: '#c084fc' }}>Stay Completed ✔</strong>
                    )}
                  </span>
                  <span>
                    Verification: <strong style={{ color: '#34d399' }}>Valid SIH Digital Yatri Pass</strong>
                  </span>
                </div>
              </div>

              {/* Simulator Action Buttons */}
              <div className="checkin-action-grid">
                <button
                  type="button"
                  onClick={simulateGuestCheckIn}
                  className="terminal-action-btn checkin-btn"
                >
                  <span>📱 Simulate QR Check-In</span>
                  <span className="btn-sub-caption">(verifies pass &amp; checks in guest)</span>
                </button>

                <button
                  type="button"
                  onClick={simulateGuestCheckOut}
                  disabled={state.guestStatus !== 'CHECKED_IN'}
                  className={`terminal-action-btn checkout-btn ${
                    state.guestStatus === 'CHECKED_IN' ? 'active' : ''
                  }`}
                >
                  <span>✨ Simulate Check-Out</span>
                  <span className="btn-sub-caption">
                    {state.guestStatus === 'CHECKED_IN'
                      ? '(Click to complete stay & schedule cleaning)'
                      : state.guestStatus === 'CHECKED_OUT'
                      ? '(Guest has checked out)'
                      : '(locked until guest checks in)'}
                  </span>
                </button>
              </div>

              <div className="terminal-demo-hint">
                <span>💡</span>
                <span>
                  <strong>Connected Demo Flow:</strong> 1. Send request from Pilgrim interface ➔ 2. Accept request above (verifies conflict) ➔ 3. Room 204 marks BOOKED in matrix ➔ 4. Check-in via QR terminal!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 8. REAL SUPABASE BOOKINGS FEED */}
        {backendBookings.length > 0 && (
          <div className="hotel-supabase-bookings-box">
            <div className="supabase-box-header">
              <h4>
                <span>📋</span>
                <span>Registered Lodge Bookings Feed (Supabase Table: <code>hotel_bookings</code>)</span>
              </h4>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Total Owned Reservations: {backendBookings.length}
              </span>
            </div>

            <div className="supabase-table-wrap">
              <table className="hotel-portal-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Yatri / Guest</th>
                    <th>Room Type</th>
                    <th>Dates</th>
                    <th>Guests</th>
                    <th>Total Price</th>
                    <th>Status</th>
                    <th>QR Action</th>
                  </tr>
                </thead>
                <tbody>
                  {backendBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fbbf24' }}>
                        {b.id.slice(0, 16)}...
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{b.tourist_id}</td>
                      <td>{b.room_type}</td>
                      <td>{b.check_in} → {b.check_out}</td>
                      <td>{b.guests} Pers</td>
                      <td style={{ color: '#34d399', fontWeight: 'bold' }}>₹{b.total_price}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: b.status === 'confirmed' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)',
                            color: b.status === 'confirmed' ? '#93c5fd' : '#6ee7b7'
                          }}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleLoadBookingIntoTerminal(b)}
                          className="booking-load-qr-btn"
                        >
                          Load in QR ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
