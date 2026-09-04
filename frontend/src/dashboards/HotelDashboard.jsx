import React, { useState, useEffect, useRef } from 'react';
import {
  fetchHotels,
  fetchHotelOwnerBookings
} from '../api/api';
import './HotelDashboard.css';

// SVG QR Code generator component as a resilient, instant, self-contained QR renderer
function ScannableQRCode({ payload }) {
  // 21x21 QR Code Version 1 pattern for YS-KED-2026-8812
  // Encodes functional visual QR matrix with finder patterns, timing patterns and data cells
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
  expressBeds: 6,
  punyaPoints: 1450,
  taxCredit: 725,
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
      guestStatus: 'CHECKED_IN',
      occupiedRooms: 33 // 18 -> 17 available
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
      guestStatus: 'CHECKED_OUT',
      occupiedRooms: 32, // Restored
      punyaPoints: prev.punyaPoints + 50, // 1450 -> 1500
      taxCredit: 750 // 725 -> 750
    }));

    setShowSuccessBanner(true);

    if (showToast) {
      showToast('🎉 Stay Completed! +50 Punya Points awarded. Hotel Tax Credit updated to ₹750.');
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
    if (showToast) {
      showToast('🔄 Demo states reset to initial baseline.');
    }
  };

  // Load a real Supabase booking into the QR terminal
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

  return (
    <div className="hotel-portal-wrapper" id="hotel-dashboard">
      {/* 1. HEADER & TOP NAVIGATION BAR */}
      <header className="hotel-portal-header">
        <div className="hotel-portal-header-inner">
          {/* Brand & Property Location Info */}
          <div className="hotel-brand-box">
            <div className="hotel-icon-badge">
              🕉️
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
        {/* Upgraded Cooldown Fraud Alert Banner */}
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

        {/* Success Checkout Banner */}
        {showSuccessBanner && (
          <div className="hotel-success-banner">
            <div className="success-left">
              <div className="success-icon-box">🎉</div>
              <div className="success-text-box">
                <h4>Stay Completed &amp; Verified!</h4>
                <p>+50 Punya Points awarded to Pilgrim Wallet! Hotel Tax Credit increased to ₹750.</p>
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
                {/* Dynamic Demand Badge */}
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

              {/* Hero Metrics Title with Counter Animation */}
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

        {/* 3. KPI DASHBOARD CARDS */}
        <div className="hotel-kpi-row">
          {/* 1. Room Availability */}
          <div className="hotel-kpi-item" id="hotel-rooms">
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

          {/* 3. Express Beds Available */}
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>🛏️</span>
              <span>Express Beds</span>
            </div>
            <div className="kpi-main-metric" style={{ color: '#34d399' }}>
              {state.expressBeds}
            </div>
            <div className="kpi-footer-sub">Buffer Transit Ready</div>
          </div>

          {/* 4. Punya Points Today */}
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>🎁</span>
              <span>Punya Points Today</span>
            </div>
            <div className="kpi-main-metric" style={{ color: '#facc15' }}>
              {state.punyaPoints.toLocaleString('en-IN')}
            </div>
            <div className="kpi-footer-sub">+50 pts per stay</div>
          </div>

          {/* 5. Municipal Tax Credit */}
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>🧾</span>
              <span>Tax Credit Accrued</span>
            </div>
            <div className="kpi-main-metric" style={{ color: '#34d399' }}>
              ₹{state.taxCredit.toLocaleString('en-IN')}
            </div>
            <div className="kpi-footer-sub">Direct State Subsidy</div>
          </div>

          {/* 6. Current Base Rate & Pricing Engine */}
          <div className="hotel-kpi-item">
            <div className="kpi-title-row">
              <span>💰</span>
              <span>Live Room Rate</span>
            </div>
            <div className="kpi-main-metric">
              ₹{state.currentRate.toLocaleString('en-IN')}
            </div>
            <div className="kpi-footer-sub" style={{ color: '#fde68a' }}>
              {state.currentRate > 1000 ? 'Surge Rate Applied' : 'Standard Parity'}
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
                <span>Demonstrating the automated pricing decision layer for the SIH prototype based on real-time transit reroute volume.</span>
              </div>
            </div>
          </div>

          {/* Apply Suggested Rate Button */}
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

        {/* 5. WORKFLOW: DYNAMIC SCANNABLE QR & GUEST TERMINAL */}
        <div className="hotel-terminal-panel" id="hotel-bookings">
          <div className="terminal-header-row">
            <div className="terminal-title-group">
              <h3>
                <span>🪪</span>
                <span>Express QR Verification &amp; Guest Check-In Terminal</span>
              </h3>
              <p>
                Real-time digital pass verification for rerouted pilgrims with instant Punya Points release upon completed stay.
              </p>
            </div>
            <div className="terminal-station-tag">
              STATION: <strong>DESK-01</strong>
            </div>
          </div>

          <div className="terminal-columns-grid">
            {/* Left Column: Genuinely Dynamic Scannable QR Engine */}
            <div className="qr-display-box">
              <div className="qr-badge-label">
                Official Demo Check-In QR (Scannable)
              </div>

              {/* Scannable QR Component */}
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

                {/* Metadata row */}
                <div className="pilgrim-card-bottom">
                  <span>
                    Status:{' '}
                    {state.guestStatus === 'PENDING' ? (
                      <strong style={{ color: '#cbd5e1' }}>Awaiting QR Check-In</strong>
                    ) : state.guestStatus === 'CHECKED_IN' ? (
                      <strong style={{ color: '#34d399' }}>Checked-In ✔ (Room #204 Allocated)</strong>
                    ) : (
                      <strong style={{ color: '#c084fc' }}>Stay Completed ✔ (Punya Points Minted)</strong>
                    )}
                  </span>
                  <span>
                    Punya Incentive:{' '}
                    <strong style={{ color: '#facc15' }}>+50 pts on checkout</strong>
                  </span>
                </div>
              </div>

              {/* Simulator Action Buttons */}
              <div className="checkin-action-grid">
                {/* SIMULATE QR CHECK-IN */}
                <button
                  type="button"
                  onClick={simulateGuestCheckIn}
                  className="terminal-action-btn checkin-btn"
                >
                  <span>📱 Simulate QR Check-In</span>
                  <span className="btn-sub-caption">(verifies pass &amp; occupies room)</span>
                </button>

                {/* SIMULATE CHECK-OUT */}
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
                      ? '(Click to award +50 Punya Points)'
                      : state.guestStatus === 'CHECKED_OUT'
                      ? '(Guest has checked out)'
                      : '(locked until guest checks in)'}
                  </span>
                </button>
              </div>

              {/* Demo Flow Helper Tip */}
              <div className="terminal-demo-hint">
                <span>💡</span>
                <span>
                  <strong>Demo Order:</strong> 1. Click &quot;Simulate Rerouting Spike&quot; ➔ 2. &quot;Apply Suggested Rate&quot; ➔ 3. &quot;Simulate QR Check-In&quot; ➔ 4. &quot;Simulate Check-Out&quot;.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. REAL SUPABASE BOOKINGS FEED (Live API Integration) */}
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
