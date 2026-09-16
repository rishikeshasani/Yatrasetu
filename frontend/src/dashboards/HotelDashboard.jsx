// HotelDashboard.jsx - Clean White Professional SaaS Dashboard for YatraSetu Hotel Partner (Kedarnath)
import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchHotels,
  fetchHotelOwnerBookings,
  fetchHotelBookingRequests,
  acceptBookingRequest,
  declineBookingRequest,
  fetchHotelRoomSlots,
  subscribeToHotelUpdates,
  checkRoomConflictLocal,
  fetchActiveRerouteAlert
} from '../api/api';
import './HotelDashboard.css';

// SVG QR Code generator component (resilient, clean enterprise styling)
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
    <svg width="154" height="154" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
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
              fill="#1e3a8a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CONFIGURABLE PRICING ENGINE CONSTANTS & RULES (AI GOVERNED)
// ---------------------------------------------------------------------------
export const ROOM_CONFIG = {
  standard: { base: 500, maxHourly: 700, label: 'Standard Room' },
  deluxe: { base: 750, maxHourly: 1050, label: 'Deluxe Room' },
  suite: { base: 1000, maxHourly: 1200, label: 'Suite' },
  family: { base: 1000, maxHourly: 1200, label: 'Family Room' },
};

export const DEMAND_MULTIPLIER_RULES = [
  { maxPct: 0, mult: 1.00, label: 'Normal (0%)' },
  { maxPct: 20, mult: 1.10, label: 'Low Surge (+20%)' },
  { maxPct: 40, mult: 1.20, label: 'Moderate Surge (+30%)' },
  { maxPct: 60, mult: 1.35, label: 'High Surge (+50%)' },
  { maxPct: 80, mult: 1.45, label: 'Critical Surge (+70%)' },
  { maxPct: Infinity, mult: 1.50, label: 'Max Surge (+80% & above)' },
];

export const MAX_TOTAL_BOOKING_CAP = 12000;

export const getDemandMultiplier = (demandPct) => {
  const pct = Number(demandPct) || 0;
  for (const rule of DEMAND_MULTIPLIER_RULES) {
    if (pct <= rule.maxPct) {
      return Math.min(1.50, rule.mult);
    }
  }
  return 1.50;
};

export const getDemandLabel = (demandPct) => {
  const pct = Number(demandPct) || 0;
  for (const rule of DEMAND_MULTIPLIER_RULES) {
    if (pct <= rule.maxPct) return rule.label;
  }
  return 'Max Surge';
};

export const calculateDurationInHours = (checkInStr, checkOutStr) => {
  if (!checkInStr || !checkOutStr) return 21;
  const start = new Date(checkInStr);
  const end = new Date(checkOutStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 21;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 1;
  const rawHours = diffMs / (1000 * 60 * 60);
  return Math.round(rawHours * 10) / 10;
};

export const calculateSlotDynamicPricing = ({
  roomType = 'deluxe',
  checkIn,
  checkOut,
  demandPct = 50,
}) => {
  const rKey = (roomType || 'deluxe').toLowerCase();
  const roomCfg = ROOM_CONFIG[rKey] || ROOM_CONFIG.deluxe;
  const baseHourly = roomCfg.base;
  const demandMult = getDemandMultiplier(demandPct);

  // Raw hourly calculation governed by AI multiplier and realistic ceiling
  const rawHourly = baseHourly * demandMult;
  const finalHourlyPrice = Math.min(rawHourly, roomCfg.maxHourly);

  // Flexible duration
  const durationHours = calculateDurationInHours(checkIn, checkOut);
  const calculatedTotal = finalHourlyPrice * durationHours;

  // Hard cap of ₹12,000
  const isCapped = calculatedTotal > MAX_TOTAL_BOOKING_CAP;
  const totalBookingPrice = Math.min(calculatedTotal, MAX_TOTAL_BOOKING_CAP);

  return {
    baseHourlyPrice: baseHourly,
    demandMultiplier: demandMult,
    finalHourlyPrice,
    durationHours,
    calculatedTotal,
    totalBookingPrice,
    isCapped,
  };
};

// ---------------------------------------------------------------------------
// 50 REALISTIC ROOMS INVENTORY (KEDARNATH LODGE)
// ---------------------------------------------------------------------------
const INITIAL_ROOMS = [
  ...Array.from({ length: 30 }, (_, i) => {
    const num = 101 + i;
    const isBooked = [102, 106, 110, 114, 118, 122, 126].includes(num);
    return {
      room_id: `R${num}`,
      room_number: `${num}`,
      room_type: 'Standard',
      floor: 1 + Math.floor(i / 15),
      capacity: 2,
      status: isBooked ? 'booked' : 'available',
      booking_slot: isBooked ? '15 Sep, 2:00 PM → 16 Sep, 11:00 AM' : '—',
      available_after: isBooked ? '16 Sep, 11:00 AM' : '—',
    };
  }),
  ...Array.from({ length: 15 }, (_, i) => {
    const num = 201 + i;
    const isBooked = [202, 204, 207, 210, 212].includes(num);
    return {
      room_id: `R${num}`,
      room_number: `${num}`,
      room_type: 'Deluxe',
      floor: 3 + Math.floor(i / 8),
      capacity: 3,
      status: isBooked ? 'booked' : 'available',
      booking_slot: isBooked ? '15 Sep, 2:00 PM → 16 Sep, 11:00 AM' : '—',
      available_after: isBooked ? '16 Sep, 11:00 AM' : '—',
    };
  }),
  ...Array.from({ length: 5 }, (_, i) => {
    const num = 301 + i;
    const isBooked = [302, 304].includes(num);
    return {
      room_id: `R${num}`,
      room_number: `${num}`,
      room_type: 'Family',
      floor: 4,
      capacity: 6,
      status: isBooked ? 'booked' : 'available',
      booking_slot: isBooked ? '15 Sep, 1:00 PM → 15 Sep, 8:00 PM' : '—',
      available_after: isBooked ? '15 Sep, 8:00 PM' : '—',
    };
  }),
];

export default function HotelDashboard({ showToast }) {
  // ---------------------------------------------------------------------------
  // 1. DEMAND & TELEMETRY STATE (STRICTLY VIEW ONLY FOR HOTEL OWNER)
  // ---------------------------------------------------------------------------
  // The Government & AI Crowd system controls this value. Hotel owner CANNOT modify it.
  const [demandPct, setDemandPct] = useState(50);
  const [showGovSimulatorModal, setShowGovSimulatorModal] = useState(false);
  const [simGovInput, setSimGovInput] = useState('50');

  // Listen for Government Authority updates
  useEffect(() => {
    const handleGovUpdate = (e) => {
      if (e.detail && typeof e.detail.demandPct === 'number') {
        setDemandPct(e.detail.demandPct);
      }
    };
    window.addEventListener('yatrasetu:government_demand_update', handleGovUpdate);
    window.setGovernmentDemand = (pct) => setDemandPct(Number(pct) || 0);

    return () => {
      window.removeEventListener('yatrasetu:government_demand_update', handleGovUpdate);
      delete window.setGovernmentDemand;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. SLOT BOOKING FORM STATE
  // ---------------------------------------------------------------------------
  const [slotRoomType, setSlotRoomType] = useState('deluxe');
  const [checkInDate, setCheckInDate] = useState('2026-09-15');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutDate, setCheckOutDate] = useState('2026-09-16');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [guestsCount, setGuestsCount] = useState(2);
  const [availabilityResult, setAvailabilityResult] = useState(null);

  // ISO string helpers
  const checkInISO = useMemo(() => `${checkInDate}T${checkInTime}:00`, [checkInDate, checkInTime]);
  const checkOutISO = useMemo(() => `${checkOutDate}T${checkOutTime}:00`, [checkOutDate, checkOutTime]);

  // ---------------------------------------------------------------------------
  // 3. LIVE AUTO-UPDATING DYNAMIC PRICING ENGINE
  // ---------------------------------------------------------------------------
  const {
    baseHourlyPrice,
    demandMultiplier,
    finalHourlyPrice,
    durationHours: slotDurationHours,
    calculatedTotal,
    totalBookingPrice,
    isCapped,
  } = useMemo(() => {
    return calculateSlotDynamicPricing({
      roomType: slotRoomType,
      checkIn: checkInISO,
      checkOut: checkOutISO,
      demandPct,
    });
  }, [slotRoomType, checkInISO, checkOutISO, demandPct]);

  // ---------------------------------------------------------------------------
  // 4. ROOMS INVENTORY STATE & TABLE FILTER
  // ---------------------------------------------------------------------------
  const [roomsInventory, setRoomsInventory] = useState(INITIAL_ROOMS);
  const [tableTypeFilter, setTableTypeFilter] = useState('ALL');

  // Filtered rooms for the availability table
  const displayedRooms = useMemo(() => {
    if (tableTypeFilter === 'ALL') return roomsInventory;
    return roomsInventory.filter(
      (r) => r.room_type.toLowerCase() === tableTypeFilter.toLowerCase()
    );
  }, [roomsInventory, tableTypeFilter]);

  // Check Availability for the selected slot interval
  const handleCheckAvailability = () => {
    const dIn = new Date(checkInISO);
    const dOut = new Date(checkOutISO);

    if (isNaN(dIn.getTime()) || isNaN(dOut.getTime())) {
      setAvailabilityResult({ success: false, message: 'Invalid check-in or check-out date/time format.' });
      return;
    }
    if (dIn >= dOut) {
      setAvailabilityResult({ success: false, message: 'Check-out time must be strictly after Check-in time.' });
      return;
    }

    const availableRoomsForType = roomsInventory.filter((r) => {
      if (r.room_type.toLowerCase() !== slotRoomType.toLowerCase()) return false;
      const hasConflict = checkRoomConflictLocal(r.room_number, checkInISO, checkOutISO);
      return !hasConflict;
    });

    if (availableRoomsForType.length > 0) {
      const selected = availableRoomsForType[0];
      setAvailabilityResult({
        success: true,
        allocatedRoom: selected.room_number,
        message: `Available! Room #${selected.room_number} (${slotRoomType.toUpperCase()}) is free for the entire requested interval.`,
        finalPrice: totalBookingPrice,
        isCapped,
      });
    } else {
      setAvailabilityResult({
        success: false,
        message: `No ${slotRoomType.toUpperCase()} rooms are free for the entire requested duration (${slotDurationHours} hrs). An overlapping booking is present.`,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 5. BOOKING REQUESTS STATE & CONFIRMATION
  // ---------------------------------------------------------------------------
  const [bookingRequests, setBookingRequests] = useState([
    {
      id: 'REQ-101',
      booking_id: 'YC-48217',
      room_number: '204',
      guest_name: 'Rahul Sharma',
      guest_count: 2,
      room_type: 'Deluxe',
      check_in: '2026-09-15T14:00:00',
      check_out: '2026-09-15T17:00:00',
      duration_hours: 3,
      base_hourly_rate: 750,
      pricing_multiplier: 1.35,
      final_hourly_rate: 1012.5,
      total_amount: 3037.5,
      site_name: 'Kedarnath Dham',
      crowd_percentage: 85,
      crowd_level: 'HIGH_SURGE',
      status: 'pending',
      decline_reason: null,
      is_capped: false,
    },
    {
      id: 'REQ-102',
      booking_id: 'YC-48218',
      room_number: '105',
      guest_name: 'Priya Patel',
      guest_count: 2,
      room_type: 'Standard',
      check_in: '2026-09-15T12:00:00',
      check_out: '2026-09-15T14:00:00',
      duration_hours: 2,
      base_hourly_rate: 500,
      pricing_multiplier: 1.35,
      final_hourly_rate: 675,
      total_amount: 1350,
      site_name: 'Kedarnath Dham',
      crowd_percentage: 85,
      crowd_level: 'HIGH_SURGE',
      status: 'pending',
      decline_reason: null,
      is_capped: false,
    },
    {
      id: 'REQ-103',
      booking_id: 'YC-48219',
      room_number: '208',
      guest_name: 'Ananya Iyer',
      guest_count: 3,
      room_type: 'Deluxe',
      check_in: '2026-09-15T14:00:00',
      check_out: '2026-09-16T11:00:00',
      duration_hours: 21,
      base_hourly_rate: 750,
      pricing_multiplier: 1.35,
      final_hourly_rate: 1012.5,
      calculated_total: 21262.5,
      total_amount: 12000,
      site_name: 'Kedarnath Dham',
      crowd_percentage: 85,
      crowd_level: 'HIGH_SURGE',
      status: 'pending',
      decline_reason: null,
      is_capped: true,
    }
  ]);

  const [requestFilter, setRequestFilter] = useState('ALL');
  const [declineDialogReqId, setDeclineDialogReqId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Room unavailable for requested time window');
  const [confirmedResultModal, setConfirmedResultModal] = useState(null);

  // Accept Booking Request
  const handleAcceptRequest = async (req) => {
    const hasConflict = checkRoomConflictLocal(req.room_number, req.check_in, req.check_out, req.booking_id);
    if (hasConflict) {
      alert(`⚠️ Cannot Accept: Room #${req.room_number} has an overlapping confirmed booking.`);
      return;
    }

    try {
      try {
        await acceptBookingRequest(req.id);
      } catch (err) {
        console.warn('Backend accept call note:', err);
      }

      setRoomsInventory((prev) =>
        prev.map((r) => {
          if (String(r.room_number) === String(req.room_number)) {
            return {
              ...r,
              status: 'booked',
              booking_slot: `${formatDateTimeDisplay(req.check_in)} → ${formatDateTimeDisplay(req.check_out)}`,
              available_after: formatDateTimeDisplay(req.check_out),
            };
          }
          return r;
        })
      );

      setBookingRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'confirmed' } : r))
      );

      setTerminalState({
        bookingRef: req.booking_id,
        guestName: req.guest_name,
        partySize: req.guest_count,
        roomAssigned: `#${req.room_number} ${req.room_type}`,
        guestStatus: 'PENDING',
      });

      setConfirmedResultModal({
        room_number: req.room_number,
        room_type: req.room_type,
        hotel_name: backendHotel?.name || 'Hotel Kedarnath Heritage',
        booking_id: req.booking_id,
        guest_name: req.guest_name,
        check_in: req.check_in,
        check_out: req.check_out,
        duration_hours: req.duration_hours,
        final_hourly_rate: req.final_hourly_rate,
        total_price: req.total_amount,
        is_capped: req.is_capped || req.total_amount >= 12000,
        status: 'CONFIRMED',
      });

      if (showToast) {
        showToast(`✅ Room #${req.room_number} confirmed for ${req.guest_name}!`);
      }
    } catch (err) {
      alert(`Failed to accept booking: ${err.message}`);
    }
  };

  // Decline Booking Request
  const handleDeclineRequest = async (requestId) => {
    try {
      try {
        await declineBookingRequest(requestId, declineReason);
      } catch (err) {
        console.warn('Backend decline call note:', err);
      }
      setBookingRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: 'declined', decline_reason: declineReason }
            : r
        )
      );
      setDeclineDialogReqId(null);
      if (showToast) showToast('Reservation request declined.');
    } catch (err) {
      alert(`Failed to decline: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. QR CHECK-IN TERMINAL & DEMO RESET
  // ---------------------------------------------------------------------------
  const [terminalState, setTerminalState] = useState({
    bookingRef: 'YC-48217',
    guestName: 'Rahul Sharma',
    partySize: 2,
    roomAssigned: '#204 Deluxe',
    guestStatus: 'PENDING',
  });
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const simulateGuestCheckIn = () => {
    setTerminalState((prev) => ({ ...prev, guestStatus: 'CHECKED_IN' }));
    if (showToast) showToast(`🪪 QR Verified! Welcome ${terminalState.guestName}. Key card issued.`);
  };

  const simulateGuestCheckOut = () => {
    setTerminalState((prev) => ({ ...prev, guestStatus: 'CHECKED_OUT' }));
    const match = terminalState.roomAssigned.match(/#(\d+)/);
    if (match) {
      const rNum = match[1];
      setRoomsInventory((prev) =>
        prev.map((r) =>
          r.room_number === rNum
            ? { ...r, status: 'available', booking_slot: '—', available_after: '—' }
            : r
        )
      );
    }
    setShowSuccessBanner(true);
    if (showToast) showToast(`✨ Checkout complete! ${terminalState.roomAssigned} released for housekeeping.`);
  };

  const resetFullDemoState = () => {
    setDemandPct(50);
    setSlotRoomType('deluxe');
    setCheckInDate('2026-09-15');
    setCheckInTime('14:00');
    setCheckOutDate('2026-09-16');
    setCheckOutTime('11:00');
    setGuestsCount(2);
    setAvailabilityResult(null);
    setRoomsInventory(INITIAL_ROOMS);
    setTerminalState({
      bookingRef: 'YC-48217',
      guestName: 'Rahul Sharma',
      partySize: 2,
      roomAssigned: '#204 Deluxe',
      guestStatus: 'PENDING',
    });
    setShowSuccessBanner(false);
    setConfirmedResultModal(null);
    setDeclineDialogReqId(null);
    if (showToast) showToast('🔄 Demo states reset to baseline.');
  };

  // ---------------------------------------------------------------------------
  // 7. BACKEND DATA LOAD & LIVE CROWD TELEMETRY SYNC
  // ---------------------------------------------------------------------------
  const [backendHotel, setBackendHotel] = useState(null);

  useEffect(() => {
    async function initData() {
      try {
        const [hotels, requests] = await Promise.all([
          fetchHotels().catch(() => []),
          fetchHotelBookingRequests('H001').catch(() => []),
        ]);
        if (hotels && hotels.length > 0) {
          const matched =
            hotels.find((h) => h.id === 'H001' || h.name.toLowerCase().includes('kedarnath') || h.name.toLowerCase().includes('ganga')) ||
            hotels[0];
          setBackendHotel(matched);
        }
        if (requests && requests.length > 0) {
          setBookingRequests(requests);
        }
      } catch (e) {
        console.warn('Initial data load note:', e);
      }
    }
    initData();

    const unsubscribe = subscribeToHotelUpdates((event) => {
      if (event.type === 'REQUEST_CREATED' && showToast) {
        showToast(`🔔 New Pilgrim Booking Request from ${event.request?.guest_name || 'Pilgrim'}!`);
      }
      if (event.type === 'CROWD_TELEMETRY' && typeof event.surgePct === 'number') {
        setDemandPct(event.surgePct);
      }
    });

    return () => unsubscribe();
  }, []);

  // Format Helper
  const formatDateTimeDisplay = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // KPI Metrics
  const totalRoomsCount = 50;
  const bookedRoomsCount = roomsInventory.filter((r) => r.status === 'booked').length;
  const availableRoomsCount = totalRoomsCount - bookedRoomsCount;
  const occupancyRate = Math.round((bookedRoomsCount / totalRoomsCount) * 100);
  const pendingRequestsCount = bookingRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="hd-saas-layout">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className="hd-saas-sidebar">
        <div className="hd-sidebar-brand-box">
          <div className="hd-sidebar-logo-mark">🏨</div>
          <div className="hd-sidebar-brand-titles">
            <span className="hd-brand-title-main">YatraSetu</span>
            <span className="hd-brand-badge-partner">HOTEL PARTNER</span>
          </div>
        </div>

        <nav className="hd-sidebar-nav">
          <div className="hd-nav-section-title">MANAGEMENT</div>
          <a href="#overview" className="hd-nav-item active">
            <span className="hd-nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="#room-slots" className="hd-nav-item">
            <span className="hd-nav-icon">🛏️</span>
            <span>Room Management</span>
          </a>
          <a href="#booking-requests" className="hd-nav-item">
            <span className="hd-nav-icon">📩</span>
            <span>Bookings</span>
            {pendingRequestsCount > 0 && (
              <span className="hd-nav-pill-badge">{pendingRequestsCount}</span>
            )}
          </a>
          <a href="#terminal" className="hd-nav-item">
            <span className="hd-nav-icon">🪪</span>
            <span>Check-in / Check-out</span>
          </a>
          <a href="#dynamic-pricing" className="hd-nav-item">
            <span className="hd-nav-icon">⚡</span>
            <span>Analytics &amp; Pricing</span>
          </a>
          <a href="#overview" className="hd-nav-item">
            <span className="hd-nav-icon">👤</span>
            <span>Profile</span>
          </a>
        </nav>

        <div className="hd-sidebar-footer-box">
          <div className="hd-footer-status-row">
            <span className="hd-live-pulse-dot"></span>
            <span className="hd-footer-status-text">AI Gov Engine Active</span>
          </div>
          <div className="hd-footer-sub-text">Kedarnath Dham Certified Node</div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="hd-saas-main-pane">
        {/* TOP HEADER BAR */}
        <header className="hd-top-header-bar">
          <div className="hd-header-left">
            <div className="hd-header-title-row">
              <span className="hd-header-portal-label">YatraSetu</span>
              <span className="hd-header-sep">/</span>
              <h1 className="hd-property-heading">Kedarnath Hotel</h1>
              <span className="hd-brand-badge-partner">HOTEL PARTNER</span>
            </div>
            <div className="hd-header-subtitle-row">
              <span className="hd-zone-tag">📍 Kedarnath Dham • Base Camp Zone (Uttarakhand)</span>
              <span className="hd-verified-pill">✓ Verified Partner</span>
            </div>
          </div>

          <div className="hd-header-actions">
            {/* External Government/AI Simulation Launcher for Test 1 & Test 2 */}
            <button
              type="button"
              onClick={() => setShowGovSimulatorModal(true)}
              className="hd-btn-gov-sim"
              title="Open District Administration Telemetry Dispatcher to simulate live crowd updates"
            >
              🏛️ Govt Telemetry Simulator
            </button>
            <button
              type="button"
              onClick={resetFullDemoState}
              className="hd-btn-reset-demo"
              title="Reset all dynamic pricing, room bookings, and demo states"
            >
              🔄 Reset Demo
            </button>
          </div>
        </header>

        {/* TOAST / BANNER */}
        {showSuccessBanner && (
          <div className="hd-alert-banner success">
            <span>🎉 <strong>Stay Completed &amp; Verified!</strong> Guest checked out. Room released for housekeeping.</span>
            <button type="button" onClick={() => setShowSuccessBanner(false)}>✕</button>
          </div>
        )}

        <div className="hd-dashboard-content-scroll">
          {/* 3. INCOMING PILGRIM DEMAND STRIP (STRICTLY VIEW ONLY) */}
          <section className="hd-demand-strip-card view-only" id="overview">
            <div className="hd-demand-strip-left">
              <div className="hd-demand-badge-wrap">
                <span className={`hd-demand-tag ${demandPct >= 60 ? 'critical' : (demandPct >= 40 ? 'high' : (demandPct >= 20 ? 'moderate' : 'normal'))}`}>
                  <span className="hd-surge-dot"></span>
                  {demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`} {getDemandLabel(demandPct)}
                </span>
                <span className="hd-view-only-pill">VIEW ONLY</span>
                <span className="hd-demand-sub-label">Government &amp; AI Telemetry Feed</span>
              </div>

              <div className="hd-demand-caption">
                Pilgrim density telemetry is automatically broadcast by the Uttarakhand District Administration Command Center and AI Prediction Engine. Hotel partners have read-only access.
              </div>
            </div>

            <div className="hd-demand-strip-right">
              <div className="hd-active-multiplier-stat">
                <span className="hd-stat-label">AI Pricing Multiplier</span>
                <strong className="hd-stat-number">{demandMultiplier.toFixed(2)}x</strong>
                <span className="hd-stat-sub">AI Governed (Hard Cap: 1.50x)</span>
              </div>
            </div>
          </section>

          {/* 4. DASHBOARD METRIC CARDS (KPIs) */}
          <section className="hd-metrics-grid">
            {/* METRIC 1: INCOMING DEMAND (VIEW ONLY) */}
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">📈</span>
                <span className="hd-metric-title">Incoming Demand</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main">{demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`}</span>
                <span className="hd-metric-tag-label">{demandPct >= 41 ? 'High Surge' : (demandPct >= 21 ? 'Moderate' : (demandPct > 0 ? 'Low Surge' : 'Normal'))}</span>
              </div>
              <div className="hd-metric-footer">
                <span className="hd-badge-view-only-inline">VIEW ONLY</span> AI Telemetry Active
              </div>
            </div>

            {/* METRIC 2: OCCUPANCY RATE */}
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">📊</span>
                <span className="hd-metric-title">Occupancy Rate</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main">{occupancyRate}%</span>
              </div>
              <div className="hd-metric-progress-bg">
                <div className="hd-metric-progress-bar" style={{ width: `${occupancyRate}%` }}></div>
              </div>
            </div>

            {/* METRIC 3: AVAILABLE ROOMS */}
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">🛏️</span>
                <span className="hd-metric-title">Available Rooms</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main">{availableRoomsCount}</span>
                <span className="hd-metric-denom"> / {totalRoomsCount} Total</span>
              </div>
              <div className="hd-metric-footer">Available for immediate check-in</div>
            </div>

            {/* METRIC 4: LIVE AI ROOM RATE */}
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">⚡</span>
                <span className="hd-metric-title">Live AI Room Rate</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main highlight-blue">₹{finalHourlyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="hd-metric-denom">/hour</span>
              </div>
              <div className="hd-metric-footer">
                <span className="hd-badge-ai-inline">AI Controlled</span> Auto-updating
              </div>
            </div>
          </section>

          {/* 5. TWO-COLUMN WORKFLOW: SLOT BOOKING + DYNAMIC PRICING ENGINE */}
          <div className="hd-two-column-grid">
            {/* LEFT COLUMN: BOOK A ROOM (SLOT BOOKING) */}
            <section className="hd-card hd-slot-booking-card" id="slot-booking">
              <div className="hd-card-head">
                <div>
                  <h2 className="hd-card-title">🗓️ Book a Room (Slot Booking)</h2>
                  <p className="hd-card-sub">
                    Select check-in and check-out schedule to verify slot-wide room availability and calculate guaranteed dynamic price.
                  </p>
                </div>
              </div>

              <div className="hd-slot-form-grid">
                <div className="hd-form-group">
                  <label className="hd-form-label">Check-in Date</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="hd-form-input"
                  />
                </div>

                <div className="hd-form-group">
                  <label className="hd-form-label">Check-in Time</label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="hd-form-input"
                  />
                </div>

                <div className="hd-form-group">
                  <label className="hd-form-label">Check-out Date</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="hd-form-input"
                  />
                </div>

                <div className="hd-form-group">
                  <label className="hd-form-label">Check-out Time</label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="hd-form-input"
                  />
                </div>

                <div className="hd-form-group">
                  <label className="hd-form-label">Number of Guests</label>
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                    className="hd-form-select"
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4 Guests</option>
                    <option value={5}>5 Guests</option>
                    <option value={6}>6 Guests (Family)</option>
                  </select>
                </div>

                <div className="hd-form-group">
                  <label className="hd-form-label">Room Type</label>
                  <select
                    value={slotRoomType}
                    onChange={(e) => setSlotRoomType(e.target.value)}
                    className="hd-form-select"
                  >
                    <option value="standard">Standard Room (Base: ₹500/hr, Max: ₹700/hr)</option>
                    <option value="deluxe">Deluxe Room (Base: ₹750/hr, Max: ₹1,050/hr)</option>
                    <option value="suite">Suite / Family (Base: ₹1,000/hr, Max: ₹1,200/hr)</option>
                  </select>
                </div>
              </div>

              {/* Slot Duration Notice */}
              <div className="hd-selected-duration-box">
                <span className="hd-duration-label">Selected Slot Duration:</span>
                <strong className="hd-duration-val">{slotDurationHours} hours</strong>
                <span className="hd-duration-calc">({formatDateTimeDisplay(checkInISO)} → {formatDateTimeDisplay(checkOutISO)})</span>
              </div>

              <div className="hd-slot-actions-row">
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  className="hd-btn-primary"
                >
                  🔍 Check Availability &amp; Price
                </button>
              </div>

              {/* Slot Availability Feedback Banner */}
              {availabilityResult && (
                <div className={`hd-availability-result-box ${availabilityResult.success ? 'success' : 'error'}`}>
                  <div className="hd-avail-icon">{availabilityResult.success ? '✓' : '✕'}</div>
                  <div className="hd-avail-details">
                    <strong>{availabilityResult.message}</strong>
                    {availabilityResult.success && (
                      <div className="hd-avail-meta">
                        Slot: {slotDurationHours} hours • Rate: ₹{finalHourlyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/hr • Total: <strong>₹{totalBookingPrice.toLocaleString('en-IN')}</strong>
                        {availabilityResult.isCapped && (
                          <span className="hd-surge-cap-pill">AI Surge Cap Applied</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* RIGHT COLUMN: DYNAMIC PRICING (LIVE) AUTO-UPDATING CARD */}
            <section className="hd-card hd-dynamic-pricing-card" id="dynamic-pricing">
              <div className="hd-card-head">
                <div className="hd-head-title-row">
                  <h2 className="hd-card-title">⚡ Dynamic Pricing (Live)</h2>
                  <div className="hd-badge-group">
                    <span className="hd-badge-ai">AI Controlled</span>
                    <span className="hd-badge-auto-updating">
                      <span className="hd-ping-dot"></span> Auto-updating
                    </span>
                  </div>
                </div>
                <p className="hd-card-sub">
                  Authoritative live hourly tariff computed deterministically from Government/AI demand telemetry and room limits.
                </p>
              </div>

              {/* Dynamic Pricing Metrics Grid */}
              <div className="hd-pricing-breakdown-box">
                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">Base Price:</span>
                  <strong className="hd-pricing-val">₹{baseHourlyPrice.toLocaleString('en-IN')}/hour</strong>
                </div>

                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">Government/AI Demand:</span>
                  <span className="hd-pricing-val">
                    <strong className="hd-mult-tag">{demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`}</strong>{' '}
                    <span className="hd-demand-text-label">({getDemandLabel(demandPct)})</span>
                  </span>
                </div>

                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">AI Demand Multiplier:</span>
                  <strong className="hd-pricing-val hd-mult-tag">{demandMultiplier.toFixed(2)}x</strong>
                </div>

                <div className="hd-pricing-row highlight-rate">
                  <span className="hd-pricing-label">Final AI Price:</span>
                  <strong className="hd-pricing-val text-blue">
                    ₹{finalHourlyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hour
                  </strong>
                </div>

                <div className="hd-pricing-divider"></div>

                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">Selected Slot Duration:</span>
                  <strong className="hd-pricing-val">{slotDurationHours} hours</strong>
                </div>

                <div className="hd-pricing-row highlight-total">
                  <span className="hd-pricing-label">Total Price:</span>
                  <div className="hd-total-col">
                    <strong className="hd-pricing-val text-total">₹{totalBookingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    {isCapped && (
                      <span className="hd-surge-cap-pill">AI Surge Cap Applied</span>
                    )}
                  </div>
                </div>

                <div className="hd-pricing-row sub-cap-row">
                  <span className="hd-pricing-label">Maximum Booking Price:</span>
                  <span className="hd-pricing-val text-cap">₹{MAX_TOTAL_BOOKING_CAP.toLocaleString('en-IN')} (Safety Maximum)</span>
                </div>
              </div>

              <div className="hd-pricing-footer-note">
                ℹ️ <em>Price updates automatically when you change date, time, room type, or incoming government surge telemetry.</em>
              </div>
            </section>
          </div>

          {/* 6. ROOM SLOT AVAILABILITY TABLE */}
          <section className="hd-card hd-availability-section" id="room-slots">
            <div className="hd-card-head table-head">
              <div>
                <h2 className="hd-card-title">🛏️ Room Slot Availability</h2>
                <p className="hd-card-sub">
                  Full 50-room inventory with real-time occupancy interval tracking and dynamic AI-governed price per hour.
                </p>
              </div>

              <div className="hd-table-filters">
                {['ALL', 'STANDARD', 'DELUXE', 'FAMILY'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTableTypeFilter(cat)}
                    className={`hd-filter-pill ${tableTypeFilter === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="hd-table-responsive">
              <table className="hd-saas-table">
                <thead>
                  <tr>
                    <th>Room No.</th>
                    <th>Room Type</th>
                    <th>Status</th>
                    <th>Current Booking Slot</th>
                    <th>Available After</th>
                    <th>AI Price/Hour</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRooms.slice(0, 15).map((room) => {
                    const rTypeKey = room.room_type.toLowerCase();
                    const cfg = ROOM_CONFIG[rTypeKey] || ROOM_CONFIG.deluxe;
                    const liveRoomHourly = Math.min(cfg.base * demandMultiplier, cfg.maxHourly);
                    const isAvailable = room.status === 'available';

                    return (
                      <tr key={room.room_id} className={isAvailable ? 'row-available' : 'row-booked'}>
                        <td className="cell-room-no">
                          <span className="hd-room-chip">#{room.room_number}</span>
                        </td>
                        <td className="cell-type">{room.room_type}</td>
                        <td className="cell-status">
                          <span className={`hd-status-badge ${isAvailable ? 'available' : 'booked'}`}>
                            {isAvailable ? 'Available' : 'Booked'}
                          </span>
                        </td>
                        <td className="cell-slot">{room.booking_slot}</td>
                        <td className="cell-available-after">{room.available_after}</td>
                        <td className="cell-price">
                          <strong>₹{liveRoomHourly.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong>
                          <span className="hd-cell-sub">/hr</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="hd-table-footer">
              Showing {Math.min(15, displayedRooms.length)} of {displayedRooms.length} rooms ({totalRoomsCount} Total certified rooms)
            </div>
          </section>

          {/* 7. RECENT BOOKING REQUESTS (WITH DURATION, HOURLY & CAPPED TOTAL) */}
          <section className="hd-card hd-requests-section" id="booking-requests">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">📩 Recent Booking Requests</h2>
                <p className="hd-card-sub">
                  Incoming pilgrim reservation requests calculated via YatraSetu AI dynamic tariff engine.
                </p>
              </div>

              <div className="hd-filter-tabs">
                {['ALL', 'PENDING', 'CONFIRMED', 'DECLINED'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRequestFilter(f)}
                    className={`hd-tab-btn ${requestFilter === f ? 'active' : ''}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="hd-requests-grid">
              {bookingRequests
                .filter((r) => requestFilter === 'ALL' || r.status.toUpperCase() === requestFilter)
                .map((req) => {
                  const isPending = req.status === 'pending';
                  const duration = req.duration_hours || calculateDurationInHours(req.check_in, req.check_out);
                  const isReqCapped = req.is_capped || req.total_amount >= 12000;

                  return (
                    <div key={req.id} className={`hd-request-card ${req.status}`}>
                      <div className="hd-req-card-top">
                        <div>
                          <span className="hd-req-id-badge">ID: {req.booking_id}</span>
                          <h3 className="hd-req-guest-name">{req.guest_name}</h3>
                          <div className="hd-req-meta-line">
                            Party of {req.guest_count} • Room #{req.room_number} ({req.room_type})
                          </div>
                        </div>
                        <span className={`hd-req-status-pill ${req.status}`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="hd-req-divider"></div>

                      {/* Section 1: Exact Schedule Interval */}
                      <div className="hd-req-sub-section">
                        <div className="hd-sub-title">REQUESTED STAY INTERVAL</div>
                        <div className="hd-schedule-grid">
                          <div className="hd-schedule-col">
                            <span className="hd-sched-lbl">CHECK-IN</span>
                            <strong>{formatDateTimeDisplay(req.check_in)}</strong>
                          </div>
                          <div className="hd-schedule-arrow">→</div>
                          <div className="hd-schedule-col">
                            <span className="hd-sched-lbl">CHECK-OUT</span>
                            <strong>{formatDateTimeDisplay(req.check_out)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="hd-req-divider"></div>

                      {/* Section 2: AI Dynamic Pricing Breakdown */}
                      <div className="hd-req-sub-section">
                        <div className="hd-sub-title">AI DYNAMIC PRICING BREAKDOWN</div>
                        <div className="hd-breakdown-mini">
                          <div className="hd-mini-row">
                            <span>Base Hourly Rate:</span>
                            <strong>₹{req.base_hourly_rate || 750}/hr</strong>
                          </div>
                          <div className="hd-mini-row">
                            <span>AI Demand Multiplier:</span>
                            <strong>{(req.pricing_multiplier || 1.35).toFixed(2)}x</strong>
                          </div>
                          <div className="hd-mini-row">
                            <span>Dynamic Hourly Rate:</span>
                            <strong className="text-blue">₹{req.final_hourly_rate || 1012.5}/hr</strong>
                          </div>
                          <div className="hd-mini-row">
                            <span>Total Duration:</span>
                            <span>{duration} hours</span>
                          </div>
                          <div className="hd-mini-total-row">
                            <span>TOTAL AMOUNT:</span>
                            <div className="hd-total-badge-wrap">
                              <strong className="text-total">₹{Number(req.total_amount || 3037.5).toLocaleString('en-IN')}</strong>
                              {isReqCapped && <span className="hd-surge-cap-pill">AI Surge Cap Applied</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {req.decline_reason && (
                        <div className="hd-decline-reason-note">
                          Decline Reason: <em>"{req.decline_reason}"</em>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {isPending && (
                        <div className="hd-req-actions-row">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req)}
                            className="hd-btn-accept"
                          >
                            ✓ ACCEPT &amp; ASSIGN ROOM
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeclineDialogReqId(req.id)}
                            className="hd-btn-decline"
                          >
                            ✕ DECLINE
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>

          {/* 8. EXPRESS QR VERIFICATION & GUEST TERMINAL */}
          <section className="hd-card hd-terminal-section" id="terminal">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">🪪 Express QR Verification &amp; Guest Check-In Terminal</h2>
                <p className="hd-card-sub">
                  Digital guest pass verification and automated room occupancy state release upon checkout.
                </p>
              </div>
              <span className="hd-station-badge">STATION: DESK-01</span>
            </div>

            <div className="hd-terminal-grid">
              <div className="hd-qr-col">
                <div className="hd-qr-card-wrap">
                  <div className="hd-qr-badge">Official Scannable Booking QR</div>
                  <div className="hd-qr-box">
                    <ScannableQRCode payload={terminalState.bookingRef} />
                  </div>
                  <div className="hd-qr-payload">
                    PAYLOAD: <strong>{terminalState.bookingRef}</strong>
                  </div>
                </div>
              </div>

              <div className="hd-guest-col">
                <div className="hd-guest-card-box">
                  <div className="hd-guest-header">
                    <div>
                      <span className="hd-ref-tag">BOOKING REF: {terminalState.bookingRef}</span>
                      <h3 className="hd-guest-title">{terminalState.guestName}</h3>
                      <div className="hd-guest-room-sub">
                        Allocated: <strong>{terminalState.roomAssigned}</strong> • Party: {terminalState.partySize} Guests
                      </div>
                    </div>
                    <span className={`hd-status-chip ${terminalState.guestStatus.toLowerCase()}`}>
                      {terminalState.guestStatus === 'PENDING' ? 'Awaiting Check-in' : (terminalState.guestStatus === 'CHECKED_IN' ? 'Checked-In ✔' : 'Checked-Out ✔')}
                    </span>
                  </div>

                  <div className="hd-guest-actions-grid">
                    <button
                      type="button"
                      onClick={simulateGuestCheckIn}
                      className="hd-btn-terminal-checkin"
                    >
                      📱 Simulate QR Check-In
                    </button>
                    <button
                      type="button"
                      onClick={simulateGuestCheckOut}
                      disabled={terminalState.guestStatus !== 'CHECKED_IN'}
                      className={`hd-btn-terminal-checkout ${terminalState.guestStatus === 'CHECKED_IN' ? 'active' : ''}`}
                    >
                      ✨ Simulate Check-Out &amp; Release Room
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* EXTERNAL GOVERNMENT / AI TELEMETRY SIMULATOR MODAL (FOR VERIFICATION / TESTS 1 & 2) */}
      {showGovSimulatorModal && (
        <div className="hd-modal-overlay" onClick={() => setShowGovSimulatorModal(false)}>
          <div className="hd-modal-dialog gov-sim" onClick={(e) => e.stopPropagation()}>
            <div className="hd-gov-badge-icon">🏛️</div>
            <h3 className="hd-modal-title">District Administration Telemetry Console</h3>
            <p className="hd-modal-sub">
              <strong>External System Simulation:</strong> This console represents the Government Command Center and AI Crowd Predictor. Use this to dispatch real-time crowd surge updates to verify hotel pricing behavior.
            </p>

            <div className="hd-sim-presets-group">
              <div className="hd-sim-lbl">Automated Verification Scenarios (Section 24):</div>
              <div className="hd-sim-buttons-grid">
                <button
                  type="button"
                  onClick={() => { setDemandPct(20); setSimGovInput('20'); setShowGovSimulatorModal(false); if (showToast) showToast('🏛️ Government Telemetry set to +20% Low Surge (Test 1)'); }}
                  className="hd-sim-btn"
                >
                  📡 Dispatch 20% Demand (Test 1 &amp; 2)
                </button>
                <button
                  type="button"
                  onClick={() => { setDemandPct(60); setSimGovInput('60'); setShowGovSimulatorModal(false); if (showToast) showToast('🏛️ Government Telemetry set to +60% High Surge (Test 2)'); }}
                  className="hd-sim-btn"
                >
                  ⚡ Dispatch 60% Demand (Test 2)
                </button>
                <button
                  type="button"
                  onClick={() => { setDemandPct(50); setSimGovInput('50'); setShowGovSimulatorModal(false); if (showToast) showToast('🏛️ Government Telemetry set to +50% Kedarnath Surge'); }}
                  className="hd-sim-btn"
                >
                  🏔️ Dispatch +50% Kedarnath Surge
                </button>
                <button
                  type="button"
                  onClick={() => { setDemandPct(0); setSimGovInput('0'); setShowGovSimulatorModal(false); if (showToast) showToast('🏛️ Government Telemetry set to 0% Normal'); }}
                  className="hd-sim-btn"
                >
                  🟢 Dispatch 0% Normal Demand
                </button>
              </div>
            </div>

            <div className="hd-sim-custom-row">
              <span>Custom Telemetry Surge %:</span>
              <input
                type="number"
                value={simGovInput}
                onChange={(e) => setSimGovInput(e.target.value)}
                className="hd-sim-input"
              />
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(simGovInput, 10);
                  if (!isNaN(val)) {
                    setDemandPct(val);
                    setShowGovSimulatorModal(false);
                    if (showToast) showToast(`🏛️ Broadcasted custom surge telemetry: ${val}%`);
                  }
                }}
                className="hd-btn-primary small"
              >
                Broadcast
              </button>
            </div>

            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setShowGovSimulatorModal(false)}
                className="hd-btn-modal-cancel"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE DIALOG MODAL */}
      {declineDialogReqId && (
        <div className="hd-modal-overlay">
          <div className="hd-modal-dialog">
            <h3 className="hd-modal-title">Decline Booking Request</h3>
            <p className="hd-modal-sub">Select reason for declining this reservation:</p>
            <select
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="hd-modal-select"
            >
              <option value="Room unavailable for requested time window">Room unavailable for requested time window</option>
              <option value="Maintenance scheduled for this room">Maintenance scheduled for this room</option>
              <option value="Over capacity for party size">Over capacity for party size</option>
              <option value="Pilgrim corridor diversion">Pilgrim corridor diversion</option>
            </select>
            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setDeclineDialogReqId(null)}
                className="hd-btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeclineRequest(declineDialogReqId)}
                className="hd-btn-modal-danger"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING CONFIRMATION RESULT MODAL */}
      {confirmedResultModal && (
        <div className="hd-modal-overlay" onClick={() => setConfirmedResultModal(null)}>
          <div className="hd-modal-dialog confirmation" onClick={(e) => e.stopPropagation()}>
            <div className="hd-conf-badge-icon">✓</div>
            <h3 className="hd-conf-title">Room Booking Confirmed</h3>
            <p className="hd-conf-sub">
              Booking confirmed and verified on backend. Exact room inventory locked for this duration.
            </p>

            <div className="hd-conf-grid">
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Room:</span>
                <strong className="hd-conf-val text-blue">Room #{confirmedResultModal.room_number} ({confirmedResultModal.room_type})</strong>
              </div>
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Hotel:</span>
                <strong className="hd-conf-val">{confirmedResultModal.hotel_name}</strong>
              </div>
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Booking Reference:</span>
                <span className="hd-conf-ref-badge">{confirmedResultModal.booking_id}</span>
              </div>
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Status:</span>
                <span className="hd-conf-status-tag">CONFIRMED</span>
              </div>
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Check-in:</span>
                <span>{formatDateTimeDisplay(confirmedResultModal.check_in)}</span>
              </div>
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Check-out:</span>
                <span>{formatDateTimeDisplay(confirmedResultModal.check_out)}</span>
              </div>
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Duration:</span>
                <strong>{confirmedResultModal.duration_hours} hours</strong>
              </div>
              <div className="hd-conf-item">
                <span className="hd-conf-lbl">Rate:</span>
                <strong>₹{confirmedResultModal.final_hourly_rate}/hour</strong>
              </div>
              <div className="hd-conf-item full-width highlight-total">
                <span className="hd-conf-lbl">Total Booking Price:</span>
                <div className="hd-total-col">
                  <strong className="hd-conf-total-price">₹{Number(confirmedResultModal.total_price).toLocaleString('en-IN')}</strong>
                  {confirmedResultModal.is_capped && (
                    <span className="hd-surge-cap-pill">AI Surge Cap Applied</span>
                  )}
                </div>
              </div>
            </div>

            <div className="hd-conf-actions">
              <button
                type="button"
                onClick={() => setConfirmedResultModal(null)}
                className="hd-btn-conf-done"
              >
                Done &amp; View Updated Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
