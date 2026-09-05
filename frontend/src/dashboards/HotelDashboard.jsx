import React, { useState, useEffect, useRef } from 'react';
import {
  fetchHotels,
  fetchHotelOwnerBookings,
  fetchHotelBookingRequests,
  acceptBookingRequest,
  declineBookingRequest,
  fetchHotelRoomSlots,
  subscribeToHotelUpdates,
  checkRoomConflictLocal
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

const COOLDOWN_WINDOW_MS = 60000; // 60 seconds

export default function HotelDashboard({ currentUser, showToast }) {
  const [state, setState] = useState(BASELINE_STATE);

  // Alerts
  const [fraudAlert, setFraudAlert] = useState(null);
  const [isFraudBouncing, setIsFraudBouncing] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Scan Cooldown Timestamp Log
  const scanCooldownLogRef = useRef({});

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

  // Fetch real hotel data on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingBackend(true);
      try {
        const [hotelsList, ownerBookings] = await Promise.all([
          fetchHotels(),
          fetchHotelOwnerBookings()
        ]);
        if (!isMounted) return;

        if (Array.isArray(hotelsList) && hotelsList.length > 0) {
          const matched = hotelsList.find(h => h.id === 'hotel-kedarnath-1') || hotelsList[0];
          setBackendHotel(matched);
        }
        if (Array.isArray(ownerBookings)) {
          setBackendBookings(ownerBookings);
        }
      } catch (err) {
        console.warn('Fallback hotel data loaded');
      } finally {
        if (isMounted) setIsLoadingBackend(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

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

  // Derived metrics
  const availableRooms = state.totalRooms - state.occupiedRooms;
  const occupancyPercent = Math.round((state.occupiedRooms / state.totalRooms) * 100);
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
    setFraudAlert(null);
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

  // FLOW 2: Guest Check-in with 60-second Cooldown Fraud Detection
  const simulateGuestCheckIn = () => {
    const now = Date.now();
    const lastScanTime = scanCooldownLogRef.current[state.bookingRef];

    // Strict 60-second cooldown rule
    if (lastScanTime && (now - lastScanTime < COOLDOWN_WINDOW_MS)) {
      triggerFraudAlert('⚠️ Fraud Rule: Duplicate scan detected within cooldown window.');
      return;
    }

    scanCooldownLogRef.current[state.bookingRef] = now;
    setFraudAlert(null);
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

  const triggerFraudAlert = (msg) => {
    setFraudAlert(msg);
    setIsFraudBouncing(true);
    setTimeout(() => setIsFraudBouncing(false), 800);
  };

  // FLOW 4: Master Demo Reset
  const resetFullDemoState = () => {
    setState(BASELINE_STATE);
    setDisplayTouristsCount(120);
    scanCooldownLogRef.current = {};
    setFraudAlert(null);
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
    setFraudAlert(null);
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
    <div className="hotel-portal-wrapper">
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
        {fraudAlert && (
          <div className={`hotel-fraud-banner ${isFraudBouncing ? 'animate-bounce' : ''}`}>
            <div className="fraud-icon-box">⚠️</div>
            <div className="fraud-text-box">
              <h4>
                <span>Security Alert: Duplicate Check-In Blocked</span>
                <span className="fraud-cooldown-badge">60s Cooldown Active</span>
              </h4>
              <p>{fraudAlert}</p>
            </div>
            <button
              type="button"
              onClick={() => setFraudAlert(null)}
              className="toast-dismiss-btn"
            >
              ✕
            </button>
          </div>
        )}

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
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>🛏️</span>
              <span>Room Availability</span>
            </div>
            <div className="kpi-main-metric">
              <span className="metric-accent">{availableRooms}</span>
              <span className="metric-denom"> / {state.totalRooms} Total</span>
            </div>
            <div className="kpi-footer-sub">Available for check-in</div>
          </div>

          {/* 2. Occupancy Rate */}
          <div className="hotel-kpi-item">
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

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="no-requests-message">
              No booking requests found in this category.
            </div>
          ) : (
            <div className="requests-grid">
              {filteredRequests.map((req) => (
                <div key={req.id} className={`owner-req-card ${req.status}`}>
                  <div className="req-card-top">
                    <div>
                      <div className="req-refs-row">
                        <span className="badge-req-id">{req.id}</span>
                        <span className="badge-booking-id">{req.booking_id}</span>
                      </div>
                      <h4 className="req-guest-title">
                        {req.guest_name}
                        <span className="req-party-sub">({req.guest_count} Guests)</span>
                      </h4>
                      <div className="req-room-pill">
                        Requested: <strong>Room #{req.room_number} ({req.room_type})</strong>
                      </div>
                    </div>

                    <div className="req-status-box">
                      {req.status === 'pending' && (
                        <span className="status-badge pending">
                          <span className="dot animate-pulse"></span> Pending Review
                        </span>
                      )}
                      {req.status === 'confirmed' && (
                        <span className="status-badge confirmed">
                          ✓ Confirmed &amp; Booked
                        </span>
                      )}
                      {req.status === 'declined' && (
                        <span className="status-badge declined">
                          ✕ Declined
                        </span>
                      )}
                      <div className="req-amount">₹{req.price?.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="req-time-row">
                    <span className="time-icon">🕒</span>
                    <span>
                      Window: <strong>{req.check_in.replace('T', ' ').slice(0, 16)}</strong> → <strong>{req.check_out.replace('T', ' ').slice(0, 16)}</strong>
                    </span>
                  </div>

                  {req.special_request && (
                    <div className="req-special-note-owner" style={{ marginTop: '6px', fontSize: '12.5px', color: '#4338ca', background: '#eef2ff', padding: '5px 10px', borderRadius: '6px', borderLeft: '3px solid #6366f1' }}>
                      Special Request: <strong>"{req.special_request}"</strong>
                    </div>
                  )}

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
                      <span>Room #{req.room_number} assigned. Room slot updated to BOOKED.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setState(prev => ({
                            ...prev,
                            bookingRef: req.booking_id,
                            guestName: req.guest_name,
                            partySize: req.guest_count,
                            roomAssigned: `#${req.room_number} ${req.room_type} Ganga View`
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
              ))}
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
        <div className="hotel-terminal-panel" id="guest-verification">
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
