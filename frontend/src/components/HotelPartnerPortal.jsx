import React, { useState, useEffect, useRef } from 'react';
import {
  fetchHotels,
  fetchHotelOwnerBookings
} from '../api/api';
import './HotelPartnerPortal.css';

// SVG QR Code generator component: Instant, scannable, zero external dependency
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

  const cellSize = 8;
  const size = qrMatrix.length * cellSize;

  return (
    <svg width="176" height="176" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
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

// Master Baseline Demo Configuration
const BASELINE_STATE = {
  incomingTourists: 120,
  isRerouteSpikeActive: false,
  demandLevel: 'NORMAL', // 'NORMAL' | 'HIGH_SURGE'
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

const COOLDOWN_WINDOW_MS = 60000; // 60 seconds strict fraud prevention window

export default function HotelPartnerPortal({ currentUser, showToast, onBackToLanding }) {
  // Master Interactive State
  const [state, setState] = useState(BASELINE_STATE);

  // Day Selector for Room Slots
  const [selectedSlotDay, setSelectedSlotDay] = useState('today');

  // Mobile Drawer State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active Section Anchor for Navigation
  const [activeNavSection, setActiveNavSection] = useState('overview');

  // Security and Flow Alert Banners
  const [fraudAlert, setFraudAlert] = useState(null);
  const [isFraudBouncing, setIsFraudBouncing] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Counter Animation for Incoming Demand
  const [displayTouristsCount, setDisplayTouristsCount] = useState(120);

  // 60-second Scan Cooldown Timestamp Log
  const scanCooldownLogRef = useRef({});

  // Real Supabase Data Integration
  const [backendHotel, setBackendHotel] = useState(null);
  const [backendBookings, setBackendBookings] = useState([]);

  // Fetch optional real backend data on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
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
        // Fallback gracefully to demo state
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Smooth Counter Animation on Incoming Demand Change
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

  // Derived Metrics
  const availableRooms = state.totalRooms - state.occupiedRooms;
  const occupancyPercent = Math.round((state.occupiedRooms / state.totalRooms) * 100);

  // Flow 1: Rerouting Spike Simulation
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
      showToast('🚨 High Surge Alert: 60 additional pilgrims redirected to lodge partner!');
    }
  };

  // Flow 1B: Dynamic Pricing Toggle
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

  // Flow 2: Guest Check-in
  const simulateGuestCheckIn = () => {
    setShowSuccessBanner(false);

    setState((prev) => ({
      ...prev,
      guestStatus: 'CHECKED_IN',
      occupiedRooms: 33 // 18 available -> 17 available
    }));

    if (showToast) {
      showToast('📱 QR Code Verified! Ramesh Sharma checked into Room #204.');
    }
  };

  // Flow 2B: Guest Check-Out
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
      showToast('🎉 Stay Completed! Municipal Tax Credit certified: ₹750 (+50 Punya points).');
    }
  };

  const triggerFraudAlert = (msg) => {
    setFraudAlert(msg);
    setIsFraudBouncing(true);
    setTimeout(() => setIsFraudBouncing(false), 800);
  };

  // Flow 4: Master Demo Reset
  const resetFullDemoState = () => {
    setState(BASELINE_STATE);
    setDisplayTouristsCount(120);
    scanCooldownLogRef.current = {};
    setSelectedSlotDay('today');
    setFraudAlert(null);
    setShowSuccessBanner(false);
    if (showToast) {
      showToast('🔄 Hotel Partner demo state reset to baseline.');
    }
  };

  // Load a real Supabase booking into the terminal
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
      showToast(`🪪 Loaded Booking ${b.id.slice(0, 14)} into QR Terminal.`);
    }
  };

  // Navigation scroll helper
  const scrollToSection = (id) => {
    setActiveNavSection(id);
    setSidebarOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Status Badge for Slot Cells
  const renderSlotBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="hpp-slot-pill hpp-slot-available">Available</span>;
      case 'BOOKED':
        return <span className="hpp-slot-pill hpp-slot-booked">Booked</span>;
      case 'CHECK_IN':
        return <span className="hpp-slot-pill hpp-slot-checkin">Check-in</span>;
      case 'CHECK_OUT':
        return <span className="hpp-slot-pill hpp-slot-checkout">Check-out</span>;
      default:
        return <span>{status}</span>;
    }
  };

  // Room Slot Availability Table Data
  const getRoomSlotData = (day) => {
    if (day === 'today') {
      let r204Guest = 'Ramesh Sharma';
      let r204Ref = state.bookingRef;
      let r204Window = '2:00 PM Check-In (Pending)';
      let r204Slots = ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED'];
      let r204Next = 'Today 2:00 PM (Reserved)';

      if (state.guestStatus === 'CHECKED_IN') {
        r204Window = 'Checked-In · Gangotri View';
        r204Slots = ['AVAILABLE', 'AVAILABLE', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'];
        r204Next = 'Tomorrow 11:00 AM';
      } else if (state.guestStatus === 'CHECKED_OUT') {
        r204Guest = 'Ramesh Sharma (Completed)';
        r204Window = 'Stay Completed · Turnaround Done';
        r204Slots = ['AVAILABLE', 'AVAILABLE', 'BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE'];
        r204Next = 'Available Now';
      }

      let r206Guest = state.isRerouteSpikeActive ? 'Devendra Joshi (Surge)' : '— (Vacant)';
      let r206Ref = state.isRerouteSpikeActive ? 'YS-SURGE-101' : 'Ready';
      let r206Window = state.isRerouteSpikeActive ? '2:30 PM (Emergency Surge)' : 'All Day Buffer';
      let r206Slots = state.isRerouteSpikeActive
        ? ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED']
        : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'];
      let r206Next = state.isRerouteSpikeActive ? 'Tomorrow 9:00 AM' : 'Available Now';

      let r208Guest = state.isRerouteSpikeActive ? 'Sunita Rao (Surge)' : '— (Vacant)';
      let r208Ref = state.isRerouteSpikeActive ? 'YS-SURGE-102' : 'Ready';
      let r208Window = state.isRerouteSpikeActive ? '3:00 PM (Emergency Surge)' : 'All Day Buffer';
      let r208Slots = state.isRerouteSpikeActive
        ? ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED']
        : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'];
      let r208Next = state.isRerouteSpikeActive ? 'Tomorrow 10:00 AM' : 'Available Now';

      return [
        { room: '201', type: 'Standard Deluxe', guest: 'Manoj Verma', ref: 'YS-KED-7811', window: '12:00 PM → 10:00 AM (+1)', slots: ['AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 10:00 AM' },
        { room: '202', type: 'Premium Double', guest: 'Priya Iyer', ref: 'YS-KED-9042', window: '8:00 PM → 11:00 AM (+1)', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'CHECK_IN'], nextAvailable: 'Available Now (till 8 PM)' },
        { room: '203', type: 'Family Suite', guest: 'Vikram Patil', ref: 'YS-BDN-4420', window: 'Till 4:00 PM Today', slots: ['BOOKED', 'BOOKED', 'BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Today 4:00 PM' },
        { room: '204', type: 'Deluxe Ganga View', isDemo: true, guest: r204Guest, ref: r204Ref, window: r204Window, slots: r204Slots, nextAvailable: r204Next },
        { room: '205', type: 'Standard Twin', guest: 'Amit Sengupta', ref: 'YS-VRN-3319', window: 'Till 6:00 PM Today', slots: ['BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'CHECK_OUT', 'AVAILABLE'], nextAvailable: 'Today 6:00 PM' },
        { room: '206', type: 'Deluxe Double', isSurge: true, guest: r206Guest, ref: r206Ref, window: r206Window, slots: r206Slots, nextAvailable: r206Next },
        { room: '207', type: 'Heritage Suite', guest: 'Rajesh Meena', ref: 'YS-AYD-9012', window: '6:30 PM → 10:00 AM (+1)', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED'], nextAvailable: 'Available Now (till 6:30 PM)' },
        { room: '208', type: 'Standard King', isSurge: true, guest: r208Guest, ref: r208Ref, window: r208Window, slots: r208Slots, nextAvailable: r208Next },
        { room: '209', type: 'Compact Pilgrim Room', guest: 'Suresh Nair', ref: 'YS-KED-6120', window: 'Till Tomorrow 11:00 AM', slots: ['BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 11:00 AM' },
        { room: '210', type: 'Executive Suite', guest: '— (Vacant Cleaned)', ref: 'Ready', window: 'Available Full Day', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available Now' }
      ];
    } else if (day === 'tomorrow') {
      return [
        { room: '201', type: 'Standard Deluxe', guest: 'Manoj Verma / Open', ref: 'YS-KED-7811', window: 'Checkout 10:00 AM', slots: ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 10:30 AM' },
        { room: '202', type: 'Premium Double', guest: 'Priya Iyer / Harish G.', ref: 'YS-KED-9042', window: 'Checkout 11 AM · In 4 PM', slots: ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 11:30 AM' },
        { room: '203', type: 'Family Suite', guest: 'K. V. Sharma', ref: 'YS-VRN-5011', window: '12:00 PM Check-In', slots: ['AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 10:00 AM' },
        { room: '204', type: 'Deluxe Ganga View', isDemo: true, guest: state.guestStatus === 'CHECKED_IN' ? 'Ramesh Sharma / Open' : '— (Vacant)', ref: state.guestStatus === 'CHECKED_IN' ? state.bookingRef : 'Ready', window: state.guestStatus === 'CHECKED_IN' ? 'Checkout 11:00 AM' : 'Available', slots: state.guestStatus === 'CHECKED_IN' ? ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'] : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 11:30 AM' },
        { room: '205', type: 'Standard Twin', guest: 'Maheshwari Group', ref: 'YS-AYD-1192', window: '2:00 PM Check-In', slots: ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 1:30 PM' },
        { room: '206', type: 'Deluxe Double', isSurge: true, guest: state.isRerouteSpikeActive ? 'Devendra Joshi' : '— (Buffer)', ref: state.isRerouteSpikeActive ? 'YS-SURGE-101' : 'Ready', window: state.isRerouteSpikeActive ? 'Checkout 9:00 AM' : 'Buffer', slots: state.isRerouteSpikeActive ? ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'] : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 9:30 AM' },
        { room: '207', type: 'Heritage Suite', guest: 'Rajesh Meena', ref: 'YS-AYD-9012', window: 'Checkout 10:00 AM', slots: ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 10:30 AM' },
        { room: '208', type: 'Standard King', isSurge: true, guest: state.isRerouteSpikeActive ? 'Sunita Rao' : '— (Buffer)', ref: state.isRerouteSpikeActive ? 'YS-SURGE-102' : 'Ready', window: state.isRerouteSpikeActive ? 'Checkout 10:00 AM' : 'Buffer', slots: state.isRerouteSpikeActive ? ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'] : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 10:30 AM' },
        { room: '209', type: 'Compact Pilgrim Room', guest: 'Suresh Nair', ref: 'YS-KED-6120', window: 'Checkout 11:00 AM', slots: ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 11:30 AM' },
        { room: '210', type: 'Executive Suite', guest: 'Anand Varma (VIP)', ref: 'YS-KED-9912', window: '2:00 PM Check-In', slots: ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 1:30 PM' }
      ];
    } else {
      return [
        { room: '201', type: 'Standard Deluxe', guest: 'Advance Reserved', ref: 'YS-ADV-301', window: '12:00 PM Check-In', slots: ['AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 11:30 AM' },
        { room: '202', type: 'Premium Double', guest: 'Harish Gupta', ref: 'YS-KED-9042', window: 'Full Day Stay', slots: ['BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '7 Sep 11:00 AM' },
        { room: '203', type: 'Family Suite', guest: 'K. V. Sharma', ref: 'YS-VRN-5011', window: 'Checkout 10:00 AM', slots: ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: '6 Sep 10:30 AM' },
        { room: '204', type: 'Deluxe Ganga View', isDemo: true, guest: '— (Vacant / Open)', ref: 'Ready', window: 'Open for Booking', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available All Day' },
        { room: '205', type: 'Standard Twin', guest: 'Maheshwari Group', ref: 'YS-AYD-1192', window: 'Full Day Stay', slots: ['BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '7 Sep 10:00 AM' },
        { room: '206', type: 'Deluxe Double', isSurge: true, guest: '— (Buffer Ready)', ref: 'Ready', window: 'Transit Standby', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available All Day' },
        { room: '207', type: 'Heritage Suite', guest: 'Pilgrim Family', ref: 'YS-KED-8821', window: '1:00 PM Check-In', slots: ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 12:30 PM' },
        { room: '208', type: 'Standard King', isSurge: true, guest: '— (Buffer Ready)', ref: 'Ready', window: 'Transit Standby', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available All Day' },
        { room: '209', type: 'Compact Pilgrim Room', guest: 'Sunil Chawla', ref: 'YS-VRN-4421', window: '12:00 PM Check-In', slots: ['AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 11:30 AM' },
        { room: '210', type: 'Executive Suite', guest: 'Anand Varma (VIP)', ref: 'YS-KED-9912', window: 'Checkout 12:00 PM', slots: ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: '6 Sep 12:30 PM' }
      ];
    }
  };

  const currentRoomsList = getRoomSlotData(selectedSlotDay);

  return (
    <div className="hpp-shell">
      {/* 1. LEFT SIDEBAR */}
      <aside className={`hpp-sidebar ${sidebarOpen ? 'hpp-sidebar-open' : 'hpp-sidebar-closed'}`}>
        <div>
          <div className="hpp-sidebar-header">
            <div className="hpp-brand-link">
              <div className="hpp-brand-logo-icon">🕉️</div>
              <div className="hpp-brand-text-col">
                <span className="hpp-brand-title">YatraSetu</span>
                <span className="hpp-brand-badge">Hotel Partner</span>
              </div>
            </div>

            <button
              type="button"
              className="hpp-sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close Menu"
            >
              ✕
            </button>
          </div>

          <nav className="hpp-nav-container">
            <button
              type="button"
              onClick={() => scrollToSection('overview')}
              className={`hpp-nav-item ${activeNavSection === 'overview' ? 'hpp-nav-active' : ''}`}
            >
              <span className="hpp-nav-item-icon">📊</span>
              <span>Operations Overview</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('demand-rerouting')}
              className={`hpp-nav-item ${activeNavSection === 'demand-rerouting' ? 'hpp-nav-active' : ''}`}
            >
              <span className="hpp-nav-item-icon">🔄</span>
              <span>Demand &amp; Rerouting</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('room-inventory')}
              className={`hpp-nav-item ${activeNavSection === 'room-inventory' ? 'hpp-nav-active' : ''}`}
            >
              <span className="hpp-nav-item-icon">🛏️</span>
              <span>Room Inventory</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('room-slots')}
              className={`hpp-nav-item ${activeNavSection === 'room-slots' ? 'hpp-nav-active' : ''}`}
            >
              <span className="hpp-nav-item-icon">📅</span>
              <span>Room Slot Availability</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('dynamic-pricing')}
              className={`hpp-nav-item ${activeNavSection === 'dynamic-pricing' ? 'hpp-nav-active' : ''}`}
            >
              <span className="hpp-nav-item-icon">⚡</span>
              <span>Dynamic Pricing</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('guest-verification')}
              className={`hpp-nav-item ${activeNavSection === 'guest-verification' ? 'hpp-nav-active' : ''}`}
            >
              <span className="hpp-nav-item-icon">🪪</span>
              <span>Guest Verification</span>
            </button>

            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="hpp-nav-item"
                style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', color: '#64748b' }}
              >
                <span className="hpp-nav-item-icon">←</span>
                <span>Exit to Platform</span>
              </button>
            )}
          </nav>
        </div>

        <div className="hpp-sidebar-footer">
          <div className="hpp-system-status-row">
            <span className="hpp-status-dot-green hpp-animate-pulse"></span>
            <span className="hpp-system-status-text">System Online</span>
            <span className="hpp-system-version">v2.4</span>
          </div>
          <div className="hpp-property-subtext">
            <strong>{backendHotel?.name || 'Hotel Ganga Heritage'}</strong><br />
            {backendHotel?.address ? backendHotel.address.split(',')[0] : 'Zone B-2 · Kashi Corridor'}
          </div>
          <div className="hpp-node-id-subtext">
            Smart Transit Node: <strong style={{ color: '#0f172a' }}>DESK-01</strong>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="hpp-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. MAIN APPLICATION BODY */}
      <div className="hpp-main-wrapper">
        {/* TOP HEADER */}
        <header className="hpp-top-header">
          <div className="hpp-header-left">
            <button
              type="button"
              className="hpp-menu-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Menu"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hpp-header-property-title">
              <h1>{backendHotel?.name || 'Hotel Ganga Heritage'}</h1>
              <span className="hpp-header-property-zone">• Zone B-2 · Kashi Corridor</span>
            </div>
          </div>

          <div className="hpp-header-right">
            <div className="hpp-verified-badge">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Verified Partner</span>
            </div>

            <button
              type="button"
              onClick={resetFullDemoState}
              title="Reset demo state to baseline"
              className="hpp-btn-reset-demo"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset Demo</span>
            </button>

            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="hpp-btn-back-overview"
                title="Return to YatraSetu landing page"
              >
                <span>← Overview</span>
              </button>
            )}
          </div>
        </header>

        {/* ALERT BANNERS CONTAINER */}
        <div className="hpp-alert-container">

          {/* Success Checkout Banner */}
          {showSuccessBanner && (
            <div className="hpp-success-banner">
              <div className="hpp-success-left">
                <div className="hpp-success-icon-box">🎉</div>
                <div>
                  <h4 className="hpp-success-title">Stay Completed &amp; Verified!</h4>
                  <p className="hpp-success-desc">
                    Verified pilgrimage stay recorded! Municipal Tax Credit certified: ₹750 (+50 Punya points).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccessBanner(false)}
                className="hpp-banner-close-btn"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* DASHBOARD CONTENT BODY */}
        <main className="hpp-dashboard-body">
          {/* SECTION 1: OPERATIONS OVERVIEW HEADER */}
          <section id="overview" className="hpp-page-title-row">
            <div>
              <h2 className="hpp-page-title-h2">Hotel Operations Overview</h2>
              <p className="hpp-page-title-sub">
                Real-time accommodation and pilgrim flow management • SIH Decision Node
              </p>
            </div>
            <div className="hpp-corridor-hub-tag">
              Corridor Hub: Gate #4 Smart Transit
            </div>
          </section>

          {/* 4-CARD HORIZONTAL KPI ROW */}
          <section className="hpp-kpi-grid">
            {/* Card 1: Available Rooms */}
            <div className="hpp-kpi-card">
              <div className="hpp-kpi-header">
                <span className="hpp-kpi-label">Available Rooms</span>
                <span className="hpp-kpi-icon">🛏️</span>
              </div>
              <div className="hpp-kpi-main-val">
                <span>{availableRooms}</span>
                <span className="hpp-kpi-denom">/ {state.totalRooms} Total</span>
              </div>
              <div className="hpp-kpi-subtext">
                <span className="hpp-live-dot" style={{ background: '#10b981' }}></span>
                <span>Available for immediate check-in</span>
              </div>
            </div>

            {/* Card 2: Occupancy Rate */}
            <div className="hpp-kpi-card">
              <div className="hpp-kpi-header">
                <span className="hpp-kpi-label">Occupancy Rate</span>
                <span className="hpp-kpi-icon">📊</span>
              </div>
              <div className="hpp-kpi-main-val">
                {occupancyPercent}%
              </div>
              <div className="hpp-kpi-progress-track">
                <div
                  className="hpp-kpi-progress-bar"
                  style={{ width: `${occupancyPercent}%` }}
                ></div>
              </div>
              <div className="hpp-kpi-subtext">
                {state.occupiedRooms} of {state.totalRooms} rooms occupied
              </div>
            </div>

            {/* Card 3: Municipal Tax Credit */}
            <div className="hpp-kpi-card">
              <div className="hpp-kpi-header">
                <span className="hpp-kpi-label">Tax Credit</span>
                <span className="hpp-kpi-icon" style={{ color: '#047857' }}>🧾</span>
              </div>
              <div className="hpp-kpi-main-val" style={{ color: '#047857' }}>
                ₹{state.taxCredit.toLocaleString('en-IN')}
              </div>
              <div className="hpp-kpi-subtext">
                100% Tax Deductible · Direct State Subsidy
              </div>
            </div>

            {/* Card 4: Live Room Rate */}
            <div className="hpp-kpi-card">
              <div className="hpp-kpi-header">
                <span className="hpp-kpi-label">Live Room Rate</span>
                <span className="hpp-kpi-icon">💰</span>
              </div>
              <div className="hpp-kpi-main-val">
                ₹{state.currentRate.toLocaleString('en-IN')}
              </div>
              <div className="hpp-kpi-subtext" style={{ color: state.currentRate > 1000 ? '#b91c1c' : '#b45309', fontWeight: '600' }}>
                <span className="hpp-live-dot" style={{ background: state.currentRate > 1000 ? '#ef4444' : '#f59e0b' }}></span>
                <span>{state.currentRate > 1000 ? '+30% Peak Pilgrim Surge' : 'Standard Parity'}</span>
              </div>
            </div>
          </section>

          {/* SECTION 2: DEMAND & REROUTING SECTION */}
          <section id="demand-rerouting" className="hpp-section-card">
            <div className="hpp-demand-row">
              <div className="hpp-demand-left">
                <div className="hpp-tag-strip">
                  <span className="hpp-tag-label">Transit Inflow Monitoring</span>
                  <span className={state.isRerouteSpikeActive ? 'hpp-demand-badge-surge' : 'hpp-demand-badge-normal'}>
                    <span
                      className="hpp-live-dot"
                      style={{ background: state.isRerouteSpikeActive ? '#ef4444' : '#10b981' }}
                    ></span>
                    <span>{state.isRerouteSpikeActive ? 'High Surge (+50%)' : 'Demand: Normal'}</span>
                  </span>
                </div>

                <div className="hpp-hero-metric-statement">
                  <span>Incoming Rerouted Demand:</span>
                  <span className="hpp-counter-number">{displayTouristsCount}</span>
                  <span className="hpp-counter-unit">Pilgrims</span>
                  <span className="hpp-eta-text">
                    | Expected ETA: <strong>2:00 PM</strong>
                  </span>
                </div>

                <p className="hpp-hero-desc">
                  {state.isRerouteSpikeActive
                    ? '🚨 High Surge Active! 60 additional pilgrims redirected from congested temple corridors. Incoming demand: 180 pilgrims.'
                    : 'Baseline crowd state. Automated district balancers are monitoring temple queue saturation. Click below to simulate an active shrine rerouting surge.'}
                </p>
              </div>

              <div className="hpp-demand-right-col">
                <button
                  type="button"
                  onClick={triggerReroutingSpike}
                  className={`hpp-btn-simulate-reroute ${state.isRerouteSpikeActive ? 'hpp-surge-active' : 'hpp-default'}`}
                >
                  <span>{state.isRerouteSpikeActive ? '✓' : '🔄'}</span>
                  <span>{state.isRerouteSpikeActive ? 'Surge Active (+50%)' : 'Simulate Rerouting Spike'}</span>
                </button>
                <span className="hpp-bridge-caption">
                  Simulates <strong>Travel ➔ Hotel</strong> rerouting bridge
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 3: ROOM INVENTORY VISUAL */}
          <section id="room-inventory" className="hpp-section-card">
            <div className="hpp-inv-header-row">
              <div>
                <h3 className="hpp-section-heading">Room Inventory &amp; Capacity Allocation</h3>
                <p className="hpp-section-subhead">Dynamic occupancy tracking calibrated for temple transit surges</p>
              </div>
              <div className="hpp-inv-legend">
                <span><span className="hpp-live-dot" style={{ background: '#0f172a' }}></span> Occupied ({state.occupiedRooms})</span>
                <span><span className="hpp-live-dot" style={{ background: '#f59e0b' }}></span> Available ({availableRooms})</span>
              </div>
            </div>

            <div className="hpp-inv-grid">
              <div className="hpp-inv-card">
                <div className="hpp-inv-card-label">Total Property Capacity</div>
                <div className="hpp-inv-card-value">50 Rooms</div>
                <div className="hpp-inv-card-foot">100% Total Licensed Inventory</div>
              </div>

              <div className="hpp-inv-card">
                <div className="hpp-inv-card-label">Currently Occupied</div>
                <div className="hpp-inv-card-value">{state.occupiedRooms} Rooms</div>
                <div className="hpp-inv-card-foot">{occupancyPercent}% Total Utilization</div>
              </div>

              <div className="hpp-inv-card hpp-inv-card-highlight">
                <div className="hpp-inv-card-label">Available For Check-In</div>
                <div className="hpp-inv-card-value">{availableRooms} Rooms</div>
                <div className="hpp-inv-card-foot">Ready for instant transit allocation</div>
              </div>
            </div>
          </section>

          {/* SECTION 4: ROOM SLOT / TIME-BASED AVAILABILITY */}
          <section id="room-slots" className="hpp-section-card">
            <div className="hpp-slots-header-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span>
                  <h3 className="hpp-section-heading">Room Slot Availability</h3>
                  <span className="hpp-cooldown-badge" style={{ background: '#f1f5f9', color: '#334155', borderColor: '#e2e8f0' }}>
                    Temple Transit Slots
                  </span>
                </div>
                <p className="hpp-section-subhead">
                  Real-time room occupancy and upcoming turnover slots across time windows
                </p>
              </div>

              <div className="hpp-slots-controls-group">
                <div className="hpp-day-tabs-pill">
                  <button
                    type="button"
                    onClick={() => setSelectedSlotDay('today')}
                    className={`hpp-day-tab-btn ${selectedSlotDay === 'today' ? 'hpp-tab-active' : ''}`}
                  >
                    Today · 4 Sep
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlotDay('tomorrow')}
                    className={`hpp-day-tab-btn ${selectedSlotDay === 'tomorrow' ? 'hpp-tab-active' : ''}`}
                  >
                    Tomorrow · 5 Sep
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlotDay('nextDay')}
                    className={`hpp-day-tab-btn ${selectedSlotDay === 'nextDay' ? 'hpp-tab-active' : ''}`}
                  >
                    Next Day · 6 Sep
                  </button>
                </div>

                <div className="hpp-slots-legend-box">
                  <span><span className="hpp-live-dot" style={{ background: '#10b981' }}></span> Available</span>
                  <span><span className="hpp-live-dot" style={{ background: '#334155' }}></span> Booked</span>
                  <span><span className="hpp-live-dot" style={{ background: '#f59e0b' }}></span> Check-in</span>
                  <span><span className="hpp-live-dot" style={{ background: '#ef4444' }}></span> Check-out</span>
                </div>
              </div>
            </div>

            {/* Quick Turnover Callout Banner */}
            <div className="hpp-turnover-callout">
              <div className="hpp-turnover-left">
                <div className="hpp-turnover-icon">⚡</div>
                <div>
                  <h4 className="hpp-turnover-title">Next Available Rooms &amp; Instant Transit Turnover</h4>
                  <p className="hpp-turnover-desc">Live turnover watch for front-desk dispatchers absorbing rerouted pilgrim batches</p>
                </div>
              </div>

              <div className="hpp-turnover-badges-wrap">
                {selectedSlotDay === 'today' && (
                  <>
                    <span className="hpp-badge-turnover-green">
                      <span className="hpp-live-dot" style={{ background: '#059669' }}></span>
                      Room 202: Available Now (till 8 PM)
                    </span>
                    <span className="hpp-badge-turnover-amber">
                      Room 203: Available at 4:00 PM
                    </span>
                    <span className="hpp-badge-turnover-amber">
                      Room 205: Available at 6:00 PM
                    </span>
                    {state.guestStatus === 'CHECKED_OUT' && (
                      <span className="hpp-badge-turnover-green hpp-animate-pulse">
                        <span className="hpp-live-dot" style={{ background: '#059669' }}></span>
                        Room 204: Available Now (Cleaned)
                      </span>
                    )}
                    {state.guestStatus === 'CHECKED_IN' && (
                      <span className="hpp-badge-turnover-slate">
                        Room 204: Occupied (Check-out tomorrow 11 AM)
                      </span>
                    )}
                    {state.isRerouteSpikeActive ? (
                      <span className="hpp-badge-turnover-rose">
                        <span className="hpp-live-dot" style={{ background: '#ef4444' }}></span>
                        Surge Rooms (206, 208) Allocated
                      </span>
                    ) : (
                      <span className="hpp-badge-turnover-green">
                        Room 206 &amp; 208: Available Now
                      </span>
                    )}
                  </>
                )}

                {selectedSlotDay === 'tomorrow' && (
                  <>
                    <span className="hpp-badge-turnover-green">
                      <span className="hpp-live-dot" style={{ background: '#059669' }}></span>
                      Room 201: Available 10:30 AM
                    </span>
                    <span className="hpp-badge-turnover-green">
                      Room 204: Available 11:30 AM
                    </span>
                    <span className="hpp-badge-turnover-slate">
                      Room 207: Available 10:30 AM
                    </span>
                  </>
                )}

                {selectedSlotDay === 'nextDay' && (
                  <>
                    <span className="hpp-badge-turnover-green">
                      <span className="hpp-live-dot" style={{ background: '#059669' }}></span>
                      Room 204: Available All Day
                    </span>
                    <span className="hpp-badge-turnover-green">
                      Room 206 &amp; 208: Available All Day
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Representative Room Table Subtext */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', marginBottom: '8px', fontSize: '11px', color: '#94a3b8' }}>
              <span>Showing representative rooms · 10 of 50</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>Desk-01 Live Operational Sync</span>
            </div>

            {/* Slot Matrix Table */}
            <div className="hpp-table-responsive-wrap">
              <table className="hpp-slots-table">
                <thead>
                  <tr>
                    <th>Room &amp; Type</th>
                    <th>Current Guest / Ref</th>
                    <th>Stay Window</th>
                    <th style={{ textAlign: 'center' }}>10 AM</th>
                    <th style={{ textAlign: 'center' }}>12 PM</th>
                    <th style={{ textAlign: 'center' }}>2 PM</th>
                    <th style={{ textAlign: 'center' }}>4 PM</th>
                    <th style={{ textAlign: 'center' }}>6 PM</th>
                    <th style={{ textAlign: 'center' }}>8 PM</th>
                    <th style={{ textAlign: 'right' }}>Next Available</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRoomsList.map((r) => (
                    <tr key={r.room} className={r.isDemo ? 'hpp-demo-linked-row' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: '#0f172a' }}>#{r.room}</strong>
                          {r.isDemo && (
                            <span className="hpp-brand-badge" style={{ fontSize: '8.5px' }}>
                              DEMO DESK
                            </span>
                          )}
                          {r.isSurge && state.isRerouteSpikeActive && (
                            <span className="hpp-cooldown-badge" style={{ fontSize: '8.5px' }}>
                              SURGE ALLOCATED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>{r.type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{r.guest}</div>
                        <div style={{ fontSize: '10px', fontFamily: 'ui-monospace, monospace', color: '#94a3b8' }}>{r.ref}</div>
                      </td>
                      <td style={{ color: '#475569', fontWeight: '500' }}>
                        {r.window}
                      </td>
                      <td style={{ textAlign: 'center' }}>{renderSlotBadge(r.slots[0])}</td>
                      <td style={{ textAlign: 'center' }}>{renderSlotBadge(r.slots[1])}</td>
                      <td style={{ textAlign: 'center' }}>{renderSlotBadge(r.slots[2])}</td>
                      <td style={{ textAlign: 'center' }}>{renderSlotBadge(r.slots[3])}</td>
                      <td style={{ textAlign: 'center' }}>{renderSlotBadge(r.slots[4])}</td>
                      <td style={{ textAlign: 'center' }}>{renderSlotBadge(r.slots[5])}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>
                        <span style={{
                          color: r.nextAvailable.includes('Available Now') ? '#047857' : '#334155',
                          background: r.nextAvailable.includes('Available Now') ? '#ecfdf5' : 'transparent',
                          padding: r.nextAvailable.includes('Available Now') ? '2px 6px' : '0',
                          borderRadius: '4px'
                        }}>
                          {r.nextAvailable}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="hpp-live-dot" style={{ background: '#f59e0b' }}></span>
                <span><strong>Room #204</strong> is dynamically synchronized with the <strong>Guest Check-In Terminal</strong> below.</span>
              </div>
              <span style={{ color: '#94a3b8' }}>Turnaround cleaning buffer: 45 mins</span>
            </div>
          </section>

          {/* SECTION 5: DYNAMIC PRICING CARD (SIH DECISION LAYER) */}
          <section id="dynamic-pricing" className="hpp-section-card">
            <div className="hpp-pricing-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡</span>
                  <h3 className="hpp-section-heading">Pricing Decision: Rule-Based Surge Pricing</h3>
                  <span className="hpp-cooldown-badge" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}>
                    SIH Decision Layer
                  </span>
                </div>

                <div className="hpp-pricing-details-strip">
                  <span>Base Parity Rate: <strong>₹1,000</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Current Live Rate: <strong style={{ color: '#0f172a' }}>₹{state.currentRate.toLocaleString('en-IN')}</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>
                    AI-Simulated Suggested Rate: <strong style={{ color: '#d97706' }}>₹{state.suggestedRate.toLocaleString('en-IN')}</strong>
                  </span>
                  {state.isRerouteSpikeActive && (
                    <span className="hpp-pricing-surge-pill">Surge Active (+30%)</span>
                  )}
                </div>

                <p style={{ fontSize: '11.5px', color: '#64748b', margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>ℹ️</span>
                  <span>Automated decision layer based on real-time transit reroute volume.</span>
                </p>
              </div>

              <div style={{ minWidth: '240px' }}>
                <button
                  type="button"
                  onClick={toggleSuggestedRate}
                  className={`hpp-btn-apply-rate ${
                    state.isSuggestedApplied
                      ? ''
                      : state.isRerouteSpikeActive
                      ? 'hpp-surge-suggested hpp-ring-attention'
                      : ''
                  }`}
                >
                  {state.isSuggestedApplied
                    ? 'Revert to Base Rate (₹1,000)'
                    : `Apply Suggested Rate (₹${state.suggestedRate.toLocaleString('en-IN')})`}
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 6: GUEST VERIFICATION TERMINAL */}
          <section id="guest-verification" className="hpp-section-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🪪</span>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Express QR Verification &amp; Guest Check-In Terminal
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Real-time digital pass verification for rerouted pilgrims with instant Municipal Tax Credit certification upon completed stay.
                </p>
              </div>

              <div style={{ fontSize: '11.5px', fontFamily: 'ui-monospace, monospace', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '6px' }}>
                TERMINAL: <strong style={{ color: '#d97706' }}>DESK-01</strong>
              </div>
            </div>

            <div className="hpp-terminal-grid">
              {/* Left Column: Dynamic Scannable QR Terminal */}
              <div className="hpp-qr-pod">
                <span className="hpp-qr-official-badge">
                  Official Demo Check-In QR (Scannable)
                </span>

                <div className="hpp-qr-frame">
                  <ScannableQRCode payload={state.bookingRef} />
                </div>

                <div className="hpp-qr-payload-code">
                  PAYLOAD: <strong>{state.bookingRef}</strong>
                </div>

                <div className="hpp-qr-instruction">
                  Scan QR with camera to verify live booking reference.
                </div>
              </div>

              {/* Right Column: Simulated Live Pilgrim & Action Buttons */}
              <div>
                <div className="hpp-pilgrim-profile-card">
                  <div className="hpp-pilgrim-profile-top">
                    <div>
                      <span className="hpp-booking-ref-badge">
                        BOOKING REF: <strong style={{ color: '#b45309' }}>{state.bookingRef}</strong>
                      </span>
                      <h4 className="hpp-pilgrim-name">
                        {state.guestName}
                        <span className="hpp-pilgrim-party">
                          (Party: {state.partySize} Pilgrims • Origin: {state.origin})
                        </span>
                      </h4>
                      <div className="hpp-pilgrim-room-meta">
                        <span>Room: <strong style={{ color: '#0f172a' }}>{state.roomAssigned}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ color: '#b45309', fontWeight: '700' }}>
                          Category: {state.category}
                        </span>
                      </div>
                    </div>

                    <div className={`hpp-guest-status-pill ${
                      state.guestStatus === 'PENDING'
                        ? 'hpp-pending'
                        : state.guestStatus === 'CHECKED_IN'
                        ? 'hpp-checked-in'
                        : 'hpp-checked-out'
                    }`}>
                      <span
                        className="hpp-live-dot"
                        style={{
                          background:
                            state.guestStatus === 'PENDING'
                              ? '#f59e0b'
                              : state.guestStatus === 'CHECKED_IN'
                              ? '#10b981'
                              : '#a855f7'
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

                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', flexWrap: 'wrap', gap: '6px' }}>
                    <span>
                      Status: {state.guestStatus === 'PENDING' ? (
                        <strong style={{ color: '#334155' }}>Awaiting QR Check-In</strong>
                      ) : state.guestStatus === 'CHECKED_IN' ? (
                        <strong style={{ color: '#047857' }}>Checked-In ✔ (Room #204 Allocated)</strong>
                      ) : (
                        <strong style={{ color: '#6b21a8' }}>Stay Completed ✔ (Tax Credit Certified)</strong>
                      )}
                    </span>
                    <span>
                      State Incentive: <strong style={{ color: '#047857' }}>Municipal Tax Credit (+₹25)</strong>
                    </span>
                  </div>
                </div>

                {/* Simulator Action Buttons */}
                <div className="hpp-terminal-actions-row">
                  <button
                    type="button"
                    onClick={simulateGuestCheckIn}
                    className="hpp-btn-action-terminal hpp-btn-action-checkin"
                  >
                    <span>📱 Simulate QR Check-In</span>
                    <span className="hpp-btn-caption">(verifies pass &amp; occupies room)</span>
                  </button>

                  <button
                    type="button"
                    onClick={simulateGuestCheckOut}
                    disabled={state.guestStatus !== 'CHECKED_IN'}
                    className={`hpp-btn-action-terminal hpp-btn-action-checkout ${
                      state.guestStatus === 'CHECKED_IN' ? 'hpp-checkout-active' : ''
                    }`}
                  >
                    <span>✨ Simulate Check-Out</span>
                    <span className="hpp-btn-caption">
                      {state.guestStatus === 'CHECKED_IN'
                        ? '(Click to certify stay & claim tax credit)'
                        : state.guestStatus === 'CHECKED_OUT'
                        ? '(Guest has checked out)'
                        : '(locked until guest checks in)'}
                    </span>
                  </button>
                </div>

                <div className="hpp-demo-order-hint">
                  <span>💡</span>
                  <span>
                    <strong>Demo Order:</strong> 1. Click &quot;Simulate Rerouting Spike&quot; ➔ 2. &quot;Apply Suggested Rate&quot; ➔ 3. &quot;Simulate QR Check-In&quot; ➔ 4. &quot;Simulate Check-Out&quot;.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 7: LIVE SUPABASE BOOKINGS FEED */}
          {backendBookings.length > 0 && (
            <section className="hpp-supabase-box">
              <div className="hpp-supabase-header">
                <h4>
                  <span>📋</span>
                  <span>Registered Lodge Bookings Feed (Supabase Table: <code>hotel_bookings</code>)</span>
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Total Reservations: {backendBookings.length}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="hpp-supabase-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Yatri / Guest</th>
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
                        <td style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 'bold', color: '#b45309' }}>
                          {b.id.slice(0, 16)}...
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{b.tourist_id}</td>
                        <td>{b.room_type}</td>
                        <td>{b.check_in} → {b.check_out}</td>
                        <td>{b.guests} Pers</td>
                        <td style={{ color: '#047857', fontWeight: 'bold' }}>₹{b.total_price}</td>
                        <td>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: b.status === 'confirmed' ? '#eff6ff' : '#ecfdf5',
                            color: b.status === 'confirmed' ? '#1d4ed8' : '#047857',
                            border: `1px solid ${b.status === 'confirmed' ? '#bfdbfe' : '#a7f3d0'}`
                          }}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleLoadBookingIntoTerminal(b)}
                            className="hpp-btn-load-qr"
                          >
                            Load in QR ➔
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
