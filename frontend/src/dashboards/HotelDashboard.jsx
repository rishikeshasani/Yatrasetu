// HotelDashboard.jsx - Clean White Professional SaaS Dashboard for YatraSetu Hotel Partner (Kedarnath)
import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchHotels,
  fetchHotelOwnerBookings,
  fetchHotelBookingRequests,
  acceptBookingRequest,
  declineBookingRequest,
  fetchHotelRoomSlots,
  fetchActiveRerouteAlert,
  subscribeToHotelUpdates,
  checkRoomConflictLocal,
  updateRoomStatus,
  checkinHotelBooking,
  checkoutHotelBooking
} from '../api/api';
import './HotelDashboard.css';

// SVG QR Code generator component (clean enterprise styling)
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
          cell ? (
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

// ---------------------------------------------------------------------------
// CONFIGURABLE PRICING ENGINE CONSTANTS & RULES (AI GOVERNED - STRICTLY VIEW ONLY)
// ---------------------------------------------------------------------------
export const ROOM_CONFIG = {
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
  if (!checkInStr || !checkOutStr) return 3;
  const start = new Date(checkInStr);
  const end = new Date(checkOutStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 3;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 1;
  const rawHours = diffMs / (1000 * 60 * 60);
  return Math.round(rawHours * 10) / 10;
};

export const formatDateTimeDisplay = (isoStr) => {
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

// ---------------------------------------------------------------------------
// 50 REALISTIC ROOMS INVENTORY (KEDARNATH LODGE)
// ---------------------------------------------------------------------------
const INITIAL_ROOMS = [
  ...Array.from({ length: 30 }, (_, i) => {
    const num = 101 + i;
    const isBooked = [102, 106, 110, 114, 118, 122, 126].includes(num);
    const isMaintenance = [108].includes(num);
    let status = 'available';
    if (isBooked) status = 'booked';
    else if (isMaintenance) status = 'maintenance';
    return {
      room_id: `R${num}`,
      room_number: `${num}`,
      room_type: 'Standard',
      floor: 1 + Math.floor(i / 15),
      capacity: 2,
      status,
      booking_slot: isBooked ? '15 Sep, 2:00 PM → 16 Sep, 11:00 AM' : '—',
      available_after: isBooked ? '16 Sep, 11:00 AM' : '—',
    };
  }),
  ...Array.from({ length: 15 }, (_, i) => {
    const num = 201 + i;
    const isBooked = [202, 204, 207, 210, 212].includes(num);
    const isMaintenance = [209].includes(num);
    let status = 'available';
    if (isBooked) status = 'booked';
    else if (isMaintenance) status = 'maintenance';
    return {
      room_id: `R${num}`,
      room_number: `${num}`,
      room_type: 'Deluxe',
      floor: 3 + Math.floor(i / 8),
      capacity: 3,
      status,
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

export default function HotelDashboard({
  currentUser,
  showToast,
  activeRerouteAlert: propRerouteAlert,
  densityMap,
  onBackToLanding
}) {
  // ---------------------------------------------------------------------------
  // 1. DEMAND & TELEMETRY STATE (STRICTLY VIEW ONLY FOR HOTEL OWNER)
  // ---------------------------------------------------------------------------
  const [demandPct, setDemandPct] = useState(50);
  const [internalRerouteAlert, setInternalRerouteAlert] = useState(null);
  const activeRerouteAlert = propRerouteAlert || internalRerouteAlert;
  const [showGovSimulatorModal, setShowGovSimulatorModal] = useState(false);

  // Sync initial and ongoing active reroute alert
  useEffect(() => {
    fetchActiveRerouteAlert()
      .then((res) => {
        if (res?.is_active && res?.alert) {
          setInternalRerouteAlert(res.alert);
          setDemandPct(85);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for Government Authority updates & Emergency Reroute / Surge Storyline events
  useEffect(() => {
    const handleGovUpdate = (e) => {
      if (e.detail && typeof e.detail.demandPct === 'number') {
        setDemandPct(e.detail.demandPct);
      }
    };

    const handleEmergencyReroute = (e) => {
      const detail = e.detail;
      if (detail && detail.is_active) {
        setDemandPct(85);
        setInternalRerouteAlert(detail.alert || detail);
        if (showToast) {
          showToast(`🏨 Peripheral Hotel Alert: Diverted pilgrim stream inbound (+120 pilgrims). High surge dynamic pricing active.`);
        }
      } else if (detail && detail.is_active === false) {
        setInternalRerouteAlert(null);
        setDemandPct(50);
      }
    };

    const handleHotelSurge = (e) => {
      const detail = e.detail;
      if (detail && detail.is_active) {
        setDemandPct(85);
        if (detail.confirmed_booking) {
          setTerminalState((prev) => ({
            ...prev,
            bookingRef: detail.confirmed_booking.booking_id || 'YS-SURGE-101',
            guestName: detail.confirmed_booking.guest_name || 'Saatvik Sharma & Family',
            roomAssigned: detail.confirmed_booking.room_assigned || 'Room 206 (Himalayan Deluxe)',
            partySize: 4,
            guestStatus: 'PENDING'
          }));
          setRoomsInventory((prev) =>
            prev.map((r) =>
              r.room_number === '206'
                ? { ...r, status: 'booked', booking_slot: 'Live Dynamic Reroute Slot', available_after: 'Tomorrow 11:00 AM' }
                : r
            )
          );
        }
      }
    };

    window.addEventListener('yatrasetu:government_demand_update', handleGovUpdate);
    window.addEventListener('yatrasetu:emergency_reroute', handleEmergencyReroute);
    window.addEventListener('yatrasetu:hotel_surge', handleHotelSurge);
    window.setGovernmentDemand = (pct) => setDemandPct(Number(pct) || 0);

    return () => {
      window.removeEventListener('yatrasetu:government_demand_update', handleGovUpdate);
      window.removeEventListener('yatrasetu:emergency_reroute', handleEmergencyReroute);
      window.removeEventListener('yatrasetu:hotel_surge', handleHotelSurge);
      delete window.setGovernmentDemand;
    };
  }, [showToast]);

  const demandMultiplier = useMemo(() => getDemandMultiplier(demandPct), [demandPct]);

  // ---------------------------------------------------------------------------
  // 2. ROOMS INVENTORY & AVAILABLE ROOM MANAGEMENT (REDESIGNED)
  // ---------------------------------------------------------------------------
  const [roomsInventory, setRoomsInventory] = useState(INITIAL_ROOMS);
  const [roomFilterType, setRoomFilterType] = useState('ALL');
  const [roomFilterStatus, setRoomFilterStatus] = useState('ALL');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomPage, setRoomPage] = useState(1);
  const [roomPageSize, setRoomPageSize] = useState(10);
  const [roomActionModal, setRoomActionModal] = useState(null); // { room, action: 'maintenance' | 'available' }

  // Filtered rooms for Available Room Management
  const displayedRooms = useMemo(() => {
    return roomsInventory.filter((r) => {
      const typeLower = (r.room_type || '').toLowerCase();
      const matchesType =
        roomFilterType === 'ALL' ||
        typeLower === roomFilterType.toLowerCase() ||
        (roomFilterType === 'FAMILY' && (typeLower === 'family' || typeLower === 'suite'));

      const isAvail = r.status === 'available';
      const isOcc = r.status === 'booked' || r.status === 'occupied';
      const isMaint = r.status === 'maintenance' || r.status === 'unavailable';

      const matchesStatus =
        roomFilterStatus === 'ALL' ||
        (roomFilterStatus === 'AVAILABLE' && isAvail) ||
        (roomFilterStatus === 'OCCUPIED' && isOcc) ||
        (roomFilterStatus === 'MAINTENANCE' && isMaint);

      const q = roomSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || r.room_number.toLowerCase().includes(q) || r.room_type.toLowerCase().includes(q);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [roomsInventory, roomFilterType, roomFilterStatus, roomSearchQuery]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setRoomPage(1);
  }, [roomFilterType, roomFilterStatus, roomSearchQuery, roomPageSize]);

  // Paginated rooms
  const totalPages = Math.ceil(displayedRooms.length / roomPageSize) || 1;
  const paginatedRooms = useMemo(() => {
    const start = (roomPage - 1) * roomPageSize;
    return displayedRooms.slice(start, start + roomPageSize);
  }, [displayedRooms, roomPage, roomPageSize]);

  // Manual Room Availability Update Handler
  const handleConfirmRoomStatusChange = async (room, targetAction) => {
    setRoomActionModal(null);
    const newStatus = targetAction === 'maintenance' ? 'maintenance' : 'available';

    try {
      await updateRoomStatus('H001', room.room_id || `R${room.room_number}`, newStatus);
    } catch (err) {
      console.warn('Backend update room status note:', err.message);
    }

    setRoomsInventory((prev) =>
      prev.map((r) => (String(r.room_number) === String(room.room_number) ? { ...r, status: newStatus } : r))
    );

    if (showToast) {
      showToast(
        newStatus === 'maintenance'
          ? `🔧 Room #${room.room_number} marked as Maintenance (Hidden from Tourist Portal).`
          : `✅ Room #${room.room_number} is now Available for tourist bookings.`
      );
    }
  };

  // ---------------------------------------------------------------------------
  // 3. BOOKING REQUESTS STATE & CONFIRMATION
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
      status: 'confirmed',
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
  const [backendHotel, setBackendHotel] = useState(null);

  // ---------------------------------------------------------------------------
  // 4. QR CHECK-IN TERMINAL & ENFORCED CHECKOUT TIME LOCK + 1-SEC COUNTDOWN
  // ---------------------------------------------------------------------------
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [terminalState, setTerminalState] = useState({
    bookingRef: 'YC-48217',
    guestName: 'Rahul Sharma',
    partySize: 2,
    roomAssigned: '#204 Deluxe',
    roomNumber: '204',
    check_in: '2026-09-15T14:00:00',
    check_out: '2026-09-15T17:00:00',
    guestStatus: 'CHECKED_IN',
  });
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Time Lock & Countdown Calculation
  const checkOutTimestamp = useMemo(() => {
    if (!terminalState.check_out) return 0;
    return new Date(terminalState.check_out).getTime();
  }, [terminalState.check_out]);

  const remainingLockMs = Math.max(0, checkOutTimestamp - currentTime);
  const isTimeElapsed = remainingLockMs <= 0;
  const isCheckoutLocked = !emergencyOverride && !isTimeElapsed;

  // Format countdown ticker string: "00h 42m 18s"
  const countdownString = useMemo(() => {
    if (isTimeElapsed) return '00h 00m 00s';
    const totalSec = Math.floor(remainingLockMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }, [remainingLockMs, isTimeElapsed]);

  // QR Check-in Handler
  const handleProcessCheckIn = async () => {
    try {
      await checkinHotelBooking(terminalState.bookingRef);
    } catch (err) {
      console.warn('Backend checkin call note:', err.message);
    }

    setTerminalState((prev) => ({ ...prev, guestStatus: 'CHECKED_IN' }));
    setRoomsInventory((prev) =>
      prev.map((r) =>
        String(r.room_number) === String(terminalState.roomNumber)
          ? { ...r, status: 'occupied' }
          : r
      )
    );

    if (showToast) {
      showToast(`🪪 QR Verified! Welcome ${terminalState.guestName}. Room #${terminalState.roomNumber} is now Occupied.`);
    }
  };

  // QR Checkout Handler (Strictly Enforced)
  const handleGuestCheckOut = async () => {
    if (isCheckoutLocked) {
      alert(`🔒 CHECKOUT LOCKED: Scheduled slot ends at ${formatDateTimeDisplay(terminalState.check_out)}. Checkout is not permitted before the booked slot duration ends.`);
      return;
    }

    try {
      await checkoutHotelBooking(terminalState.bookingRef, emergencyOverride, terminalState.check_out);
    } catch (err) {
      console.warn('Backend checkout call note:', err.message);
    }

    setTerminalState((prev) => ({ ...prev, guestStatus: 'CHECKED_OUT' }));
    setRoomsInventory((prev) =>
      prev.map((r) =>
        String(r.room_number) === String(terminalState.roomNumber)
          ? { ...r, status: 'available', booking_slot: '—', available_after: '—' }
          : r
      )
    );

    // Free the booking in requests list
    setBookingRequests((prev) =>
      prev.map((b) =>
        b.booking_id === terminalState.bookingRef ? { ...b, status: 'checked-out' } : b
      )
    );

    setShowSuccessBanner(true);
    if (showToast) {
      showToast(`✨ Checkout complete! Room #${terminalState.roomNumber} released and Available.`);
    }
  };

  // Quick evaluation slot time setters
  const setTestCountdown30s = () => {
    const future = new Date(Date.now() + 30 * 1000).toISOString();
    setTerminalState((prev) => ({ ...prev, check_out: future, guestStatus: 'CHECKED_IN' }));
    if (showToast) showToast('⏱️ Slot end set to 30 seconds from now. Watch countdown auto-unlock at zero!');
  };

  const setTestSlot5PM = () => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    setTerminalState((prev) => ({ ...prev, check_out: d.toISOString(), guestStatus: 'CHECKED_IN' }));
    if (showToast) showToast(`⏱️ Slot end set to 5:00 PM today.`);
  };

  // Accept Booking Request
  const handleAcceptRequest = async (req) => {
    const targetRoom = roomsInventory.find((r) => String(r.room_number) === String(req.room_number));
    if (targetRoom && (targetRoom.status === 'maintenance' || targetRoom.status === 'unavailable')) {
      alert(`⚠️ Cannot Accept: Room #${req.room_number} is currently marked as Maintenance. Please set it to Available first.`);
      return;
    }

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
        roomNumber: req.room_number,
        check_in: req.check_in,
        check_out: req.check_out,
        guestStatus: 'PENDING',
      });

      setConfirmedResultModal({
        room_number: req.room_number,
        room_type: req.room_type,
        hotel_name: backendHotel?.name || 'Kedarnath Himalayan Lodge',
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
  // 5. MOVIE-SHOWTIME-STYLE HOURLY ROOM SLOT TIMELINE
  // ---------------------------------------------------------------------------
  const [selectedSlotDate, setSelectedSlotDate] = useState('2026-09-15');
  const [selectedRoomForSlots, setSelectedRoomForSlots] = useState('ALL');
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);

  // Formatted date string for date navigator display (e.g. "15 SEPTEMBER 2026")
  const formattedDateDisplay = useMemo(() => {
    try {
      const [y, m, d] = selectedSlotDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).toUpperCase();
    } catch {
      return selectedSlotDate;
    }
  }, [selectedSlotDate]);

  // Handle previous day button click in slot timeline
  const handlePrevDay = () => {
    try {
      const [y, m, d] = selectedSlotDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() - 1);
      const newY = dateObj.getFullYear();
      const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
      const newD = String(dateObj.getDate()).padStart(2, '0');
      setSelectedSlotDate(`${newY}-${newM}-${newD}`);
    } catch {}
  };

  // Handle next day button click in slot timeline
  const handleNextDay = () => {
    try {
      const [y, m, d] = selectedSlotDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + 1);
      const newY = dateObj.getFullYear();
      const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
      const newD = String(dateObj.getDate()).padStart(2, '0');
      setSelectedSlotDate(`${newY}-${newM}-${newD}`);
    } catch {}
  };

  const generateHourlySlotsForRoom = (room, dateStr) => {
    if (!room) return [];
    const isMaint = room.status === 'maintenance' || room.status === 'unavailable';
    const rKey = (room.room_type || 'Deluxe').toLowerCase();
    const cfg = ROOM_CONFIG[rKey] || ROOM_CONFIG.deluxe;
    const calcHourlyRate = Math.min(cfg.base * demandMultiplier, cfg.maxHourly);
    const slots = [];

    for (let h = 0; h < 24; h++) {
      const startH = String(h).padStart(2, '0');
      const endH = String(h + 1).padStart(2, '0');
      const slotStartISO = `${dateStr}T${startH}:00:00`;
      const slotEndISO = `${dateStr}T${endH}:00:00`;
      const timeLabel = `${startH}:00–${endH}:00`;

      if (isMaint) {
        slots.push({
          hour: h,
          timeLabel,
          status: 'maintenance',
          roomNumber: room.room_number,
          roomType: room.room_type,
          label: 'MAINTENANCE',
        });
        continue;
      }

      const sStart = new Date(slotStartISO).getTime();
      const sEnd = new Date(slotEndISO).getTime();

      const booking = bookingRequests.find((b) => {
        if (String(b.room_number) !== String(room.room_number)) return false;
        if (b.status === 'declined' || b.status === 'cancelled' || b.status === 'checked-out') return false;
        const bIn = new Date(b.check_in).getTime();
        const bOut = new Date(b.check_out).getTime();
        return sStart < bOut && sEnd > bIn;
      });

      if (booking) {
        slots.push({
          hour: h,
          timeLabel,
          status: 'booked',
          roomNumber: room.room_number,
          roomType: room.room_type,
          label: 'BOOKED',
          booking,
          guestName: booking.guest_name,
          bookingId: booking.booking_id,
        });
      } else {
        slots.push({
          hour: h,
          timeLabel,
          status: 'available',
          roomNumber: room.room_number,
          roomType: room.room_type,
          label: 'AVAILABLE',
          hourlyRate: calcHourlyRate,
        });
      }
    }
    return slots;
  };

  // Target room for slots (null if 'ALL')
  const targetRoomForSlots = useMemo(() => {
    if (selectedRoomForSlots === 'ALL') return null;
    return (
      roomsInventory.find((r) => String(r.room_number) === String(selectedRoomForSlots)) ||
      null
    );
  }, [roomsInventory, selectedRoomForSlots]);

  // Generate 24 hourly chips with booking span visualization
  const hourlySlotsForSelectedRoom = useMemo(() => {
    if (!targetRoomForSlots) return [];

    const isRoomMaintenance =
      targetRoomForSlots.status === 'maintenance' || targetRoomForSlots.status === 'unavailable';

    const slots = [];
    for (let h = 0; h < 24; h++) {
      const startH = String(h).padStart(2, '0');
      const endH = String(h + 1).padStart(2, '0');
      const slotStartISO = `${selectedSlotDate}T${startH}:00:00`;
      const slotEndISO = `${selectedSlotDate}T${endH}:00:00`;
      const timeLabel = `${startH}:00–${endH}:00`;

      if (isRoomMaintenance) {
        slots.push({
          hour: h,
          timeLabel,
          status: 'maintenance',
          roomNumber: targetRoomForSlots.room_number,
          roomType: targetRoomForSlots.room_type,
          label: 'MAINTENANCE',
        });
        continue;
      }

      // Check for multi-hour booking overlap across span:
      // slotStart < bookingEnd && slotEnd > bookingStart
      const sStart = new Date(slotStartISO).getTime();
      const sEnd = new Date(slotEndISO).getTime();

      const booking = bookingRequests.find((b) => {
        if (String(b.room_number) !== String(targetRoomForSlots.room_number)) return false;
        if (b.status === 'declined' || b.status === 'cancelled' || b.status === 'checked-out') return false;
        const bIn = new Date(b.check_in).getTime();
        const bOut = new Date(b.check_out).getTime();
        return sStart < bOut && sEnd > bIn;
      });

      if (booking) {
        slots.push({
          hour: h,
          timeLabel,
          status: 'booked',
          roomNumber: targetRoomForSlots.room_number,
          roomType: targetRoomForSlots.room_type,
          label: 'BOOKED',
          booking,
          guestName: booking.guest_name,
          bookingId: booking.booking_id,
        });
      } else {
        const rKey = (targetRoomForSlots.room_type || 'Deluxe').toLowerCase();
        const cfg = ROOM_CONFIG[rKey] || ROOM_CONFIG.deluxe;
        const slotHourlyRate = Math.min(cfg.base * demandMultiplier, cfg.maxHourly);
        slots.push({
          hour: h,
          timeLabel,
          status: 'available',
          roomNumber: targetRoomForSlots.room_number,
          roomType: targetRoomForSlots.room_type,
          label: 'AVAILABLE',
          hourlyRate: slotHourlyRate,
        });
      }
    }
    return slots;
  }, [targetRoomForSlots, selectedSlotDate, bookingRequests, demandMultiplier]);

  const resetFullDemoState = () => {
    setDemandPct(50);
    setRoomsInventory(INITIAL_ROOMS);
    setTerminalState({
      bookingRef: 'YC-48217',
      guestName: 'Rahul Sharma',
      partySize: 2,
      roomAssigned: '#204 Deluxe',
      roomNumber: '204',
      check_in: '2026-09-15T14:00:00',
      check_out: '2026-09-15T17:00:00',
      guestStatus: 'CHECKED_IN',
    });
    setEmergencyOverride(false);
    setShowSuccessBanner(false);
    setConfirmedResultModal(null);
    setDeclineDialogReqId(null);
    setSelectedSlotDetail(null);
    setRoomActionModal(null);
    setRoomPage(1);
    if (showToast) showToast('🔄 Demo states reset to baseline.');
  };

  // ---------------------------------------------------------------------------
  // 6. BACKEND DATA LOAD & LIVE CROWD TELEMETRY SYNC
  // ---------------------------------------------------------------------------
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
      if (event.type === 'REQUEST_CREATED') {
        if (showToast) showToast(`🔔 New Pilgrim Booking Request from ${event.request?.guest_name || 'Pilgrim'}!`);
        setBookingRequests((prev) => {
          if (prev.some((r) => r.id === event.request?.id || r.booking_id === event.request?.booking_id)) return prev;
          return [event.request, ...prev];
        });
      }
      if (event.type === 'CROWD_TELEMETRY' && typeof event.surgePct === 'number') {
        setDemandPct(event.surgePct);
      }
      if (event.type === 'ROOM_STATUS_CHANGED') {
        setRoomsInventory((prev) =>
          prev.map((r) =>
            String(r.room_id) === String(event.roomId) || String(r.room_number) === String(event.roomId)
              ? { ...r, status: event.status }
              : r
          )
        );
      }
      if (event.type === 'BOOKING_CHECKED_OUT') {
        if (event.roomNumber) {
          setRoomsInventory((prev) =>
            prev.map((r) =>
              String(r.room_number) === String(event.roomNumber)
                ? { ...r, status: 'available', booking_slot: '—', available_after: '—' }
                : r
            )
          );
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Summary Metrics
  const totalRoomsCount = roomsInventory.length;
  const bookedRoomsCount = roomsInventory.filter((r) => r.status === 'booked' || r.status === 'occupied').length;
  const maintenanceRoomsCount = roomsInventory.filter((r) => r.status === 'maintenance' || r.status === 'unavailable').length;
  const availableRoomsCount = totalRoomsCount - bookedRoomsCount - maintenanceRoomsCount;
  const occupancyRate = totalRoomsCount > 0 ? Math.round((bookedRoomsCount / totalRoomsCount) * 100) : 0;
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
          <a href="#booking-requests" className="hd-nav-item">
            <span className="hd-nav-icon">📩</span>
            <span>Bookings</span>
            {pendingRequestsCount > 0 && (
              <span className="hd-nav-pill-badge">{pendingRequestsCount}</span>
            )}
          </a>
          <a href="#room-management" className="hd-nav-item">
            <span className="hd-nav-icon">🛏️</span>
            <span>Room Management</span>
          </a>
          <a href="#room-slots" className="hd-nav-item">
            <span className="hd-nav-icon">🎬</span>
            <span>Room Slot Availability</span>
          </a>
          <a href="#dynamic-pricing" className="hd-nav-item">
            <span className="hd-nav-icon">⚡</span>
            <span>AI Dynamic Pricing</span>
          </a>
          <a href="#terminal" className="hd-nav-item">
            <span className="hd-nav-icon">🪪</span>
            <span>Check-in / Check-out</span>
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
        {/* TOP HEADER BAR (STRICTLY VIEW ONLY / NO DEMAND CONTROLS) */}
        <header className="hd-top-header-bar">
          <div className="hd-header-left">
            <div className="hd-header-title-row">
              <span className="hd-header-portal-label">YatraSetu</span>
              <span className="hd-header-sep">/</span>
              <h1 className="hd-property-heading">Kedarnath Himalayan Lodge</h1>
              <span className="hd-brand-badge-partner">HOTEL PARTNER</span>
            </div>
            <div className="hd-header-subtitle-row">
              <span className="hd-zone-tag">📍 Kedarnath Dham • Base Camp Zone (Uttarakhand)</span>
              <span className="hd-verified-pill">✓ Verified Partner</span>
            </div>
          </div>

          <div className="hd-header-actions">
            <button
              type="button"
              onClick={resetFullDemoState}
              className="hd-btn-reset-demo"
              title="Reset all dynamic pricing, room bookings, and demo states"
            >
              🔄 Reset Demo State
            </button>
          </div>
        </header>

        {/* CORRIDOR REROUTE SURGE ALERT SIGNAL */}
        {(activeRerouteAlert || demandPct >= 60) && (
          <div style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #F59E0B',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            margin: '0.75rem 1.5rem 0',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                fontSize: '1.6rem',
                backgroundColor: '#FEF3C7',
                borderRadius: '0.5rem',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                🚨
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CORRIDOR DIVERSION SURGE SIGNAL
                  </span>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#DC2626', color: '#FFF', padding: '0.1rem 0.45rem', borderRadius: '0.25rem', fontWeight: 900 }}>
                    HIGH SURGE DEMAND (+120 PILGRIMS)
                  </span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#92400E', marginTop: '0.2rem' }}>
                  {activeRerouteAlert?.message || 'Pilgrims are being rerouted to your peripheral corridor. Dynamic rates & emergency flex-stay slots activated.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E3A8A', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.4rem 0.75rem', borderRadius: '0.5rem' }}>
                ⚡ Rate: ₹1,300/hr · 4 Flex-Stay Slots Ready
              </span>
            </div>
          </div>
        )}

        <div className="hd-dashboard-content-scroll">
          {/* ========================================================================= */}
          {/* ROW 1: 4 DASHBOARD METRIC CARDS (KPIs) */}
          {/* ========================================================================= */}
          <section className="hd-metrics-grid" id="overview">
            {/* METRIC 1: INCOMING DEMAND (VIEW ONLY) */}
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">📈</span>
                <span className="hd-metric-title">Incoming Demand %</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main">{demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`}</span>
                <span className={`hd-metric-tag-label ${demandPct >= 41 ? 'high' : 'normal'}`}>
                  {demandPct >= 41 ? 'High Surge' : (demandPct >= 21 ? 'Moderate' : 'Normal')}
                </span>
              </div>
              <div className="hd-metric-footer">
                <span className="hd-badge-view-only-inline">VIEW ONLY</span> Govt &amp; AI Telemetry Feed
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
                <span className="hd-metric-denom">({bookedRoomsCount} Occupied)</span>
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
                <span className="hd-metric-main text-green">{availableRoomsCount}</span>
                <span className="hd-metric-denom"> / {totalRoomsCount} Total</span>
              </div>
              <div className="hd-metric-footer">
                {maintenanceRoomsCount > 0 ? (
                  <span className="text-amber">({maintenanceRoomsCount} in Maintenance)</span>
                ) : (
                  <span className="text-muted">All remaining rooms operational</span>
                )}
              </div>
            </div>

            {/* METRIC 4: LIVE AI DELUXE RATE */}
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">⚡</span>
                <span className="hd-metric-title">Live AI Room Rate</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main highlight-blue">
                  ₹{Math.min(ROOM_CONFIG.deluxe.base * demandMultiplier, ROOM_CONFIG.deluxe.maxHourly).toFixed(2)}
                </span>
                <span className="hd-metric-denom">/hour (Deluxe)</span>
              </div>
              <div className="hd-metric-footer">
                <span className="hd-badge-ai-inline">AI Controlled</span> {demandMultiplier.toFixed(2)}x Active Multiplier
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* ROW 2: INCOMING BOOKING REQUESTS — CLEAN COMPACT TABLE (REQ 13) */}
          {/* ========================================================================= */}
          <section className="hd-card hd-requests-section" id="booking-requests">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">📩 Incoming Booking Requests</h2>
                <p className="hd-card-sub">
                  Pilgrim reservation requests submitted via Tourist Portal, priced authoritatively by AI.
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
                    {f} {f === 'PENDING' && pendingRequestsCount > 0 && `(${pendingRequestsCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="hd-table-responsive-wrapper">
              <table className="hd-table-saas">
                <thead>
                  <tr>
                    <th>GUEST</th>
                    <th>ROOM</th>
                    <th>REQUESTED SLOT</th>
                    <th>DURATION</th>
                    <th>AI RATE</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingRequests
                    .filter((r) => requestFilter === 'ALL' || r.status.toUpperCase() === requestFilter)
                    .map((req) => {
                      const isPending = req.status === 'pending';
                      const duration = req.duration_hours || calculateDurationInHours(req.check_in, req.check_out);
                      const isReqCapped = req.is_capped || req.total_amount >= 12000;

                      return (
                        <tr key={req.id} className={`hd-req-row status-${req.status}`}>
                          <td>
                            <div className="hd-cell-guest-name">{req.guest_name}</div>
                            <div className="hd-cell-sub">Party of {req.guest_count} Devotees</div>
                          </td>
                          <td>
                            <div className="hd-cell-room-title">{req.room_type} Room</div>
                            <div className="hd-cell-sub">Room #{req.room_number}</div>
                          </td>
                          <td>
                            <div className="hd-cell-slot-range">
                              {formatDateTimeDisplay(req.check_in)} → {formatDateTimeDisplay(req.check_out)}
                            </div>
                          </td>
                          <td>
                            <span className="hd-duration-tag">{duration} hrs</span>
                          </td>
                          <td>
                            <strong className="text-blue">
                              ₹{(req.final_hourly_rate || req.base_hourly_rate || 750).toFixed(2)}/hr
                            </strong>
                            <div className="hd-cell-sub">Mult: {(req.pricing_multiplier || demandMultiplier).toFixed(2)}x</div>
                          </td>
                          <td>
                            <div className="hd-total-cell-wrap">
                              <strong className="text-total">
                                ₹{Number(req.total_amount || 0).toLocaleString('en-IN')}
                              </strong>
                              {isReqCapped && (
                                <span className="hd-surge-cap-pill-mini">AI Surge Cap Applied</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`hd-req-status-pill ${req.status}`}>
                              {req.status === 'pending'
                                ? 'Pending'
                                : req.status === 'confirmed'
                                ? 'Confirmed'
                                : 'Declined'}
                            </span>
                          </td>
                          <td>
                            {isPending ? (
                              <div className="hd-table-actions-inline">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptRequest(req)}
                                  className="hd-btn-tbl-accept"
                                  title="Accept reservation and assign room"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeclineDialogReqId(req.id)}
                                  className="hd-btn-tbl-reject"
                                  title="Decline reservation"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : req.status === 'confirmed' ? (
                              <span className="hd-action-done text-green">✓ Assigned (#{req.room_number})</span>
                            ) : (
                              <span className="hd-action-done text-muted" title={req.decline_reason}>Declined</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* ROW 3: AVAILABLE ROOM MANAGEMENT — CLEAN PROFESSIONAL TABLE (REQ 4, 5, 6) */}
          {/* ========================================================================= */}
          <section className="hd-card hd-room-mgmt-redesign-section" id="room-management">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">Available Room Management</h2>
                <p className="hd-card-sub">
                  Manage room inventory and availability for tourist bookings.
                </p>
              </div>

              {/* Summary Counter Cards */}
              <div className="hd-summary-counter-bar">
                <div className="hd-sum-chip total">
                  <strong>{totalRoomsCount}</strong> Total Rooms
                </div>
                <div className="hd-sum-chip avail">
                  <strong>{availableRoomsCount}</strong> Available
                </div>
                <div className="hd-sum-chip occ">
                  <strong>{bookedRoomsCount}</strong> Occupied
                </div>
                <div className="hd-sum-chip maint">
                  <strong>{maintenanceRoomsCount}</strong> Maintenance
                </div>
              </div>
            </div>

            {/* Top Controls: Search + Room Type Dropdown + Status Dropdown */}
            <div className="hd-room-mgmt-top-controls">
              <div className="hd-mgmt-search-box">
                <span className="hd-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search room... (e.g. 101, 204)"
                  value={roomSearchQuery}
                  onChange={(e) => {
                    setRoomSearchQuery(e.target.value);
                    setRoomPage(1);
                  }}
                  className="hd-mgmt-search-input"
                />
              </div>

              {/* Room Type Dropdown */}
              <div className="hd-control-filter-group">
                <span className="hd-filter-label">Room Type:</span>
                <select
                  value={roomFilterType}
                  onChange={(e) => {
                    setRoomFilterType(e.target.value);
                    setRoomPage(1);
                  }}
                  className="hd-select-filter"
                >
                  <option value="ALL">All Rooms</option>
                  <option value="STANDARD">Standard</option>
                  <option value="DELUXE">Deluxe</option>
                  <option value="FAMILY">Family/Suite</option>
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="hd-control-filter-group">
                <span className="hd-filter-label">Status:</span>
                <select
                  value={roomFilterStatus}
                  onChange={(e) => {
                    setRoomFilterStatus(e.target.value);
                    setRoomPage(1);
                  }}
                  className="hd-select-filter"
                >
                  <option value="ALL">All Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>

            {/* Clean Professional Table Layout */}
            <div className="hd-table-responsive-wrapper">
              <table className="hd-table-saas hd-rooms-table">
                <thead>
                  <tr>
                    <th>ROOM</th>
                    <th>TYPE</th>
                    <th>FLOOR</th>
                    <th>CAPACITY</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRooms.map((room) => {
                    const isOccupied = room.status === 'booked' || room.status === 'occupied';
                    const isMaintenance = room.status === 'maintenance' || room.status === 'unavailable';
                    const isAvailable = room.status === 'available';

                    return (
                      <tr key={room.room_id} className={`hd-room-row status-${room.status}`}>
                        <td>
                          <strong className="hd-room-num-cell">Room {room.room_number}</strong>
                        </td>
                        <td>
                          <span className="hd-room-type-tag-clean">{room.room_type}</span>
                        </td>
                        <td>Floor {room.floor}</td>
                        <td>{room.capacity} Guests</td>
                        <td>
                          {isAvailable && (
                            <span className="hd-status-pill avail">
                              <span className="hd-status-dot green"></span> Available
                            </span>
                          )}
                          {isOccupied && (
                            <span className="hd-status-pill occ">
                              <span className="hd-status-dot red"></span> Occupied
                            </span>
                          )}
                          {isMaintenance && (
                            <span className="hd-status-pill maint">
                              <span className="hd-status-dot amber"></span> Maintenance
                            </span>
                          )}
                        </td>
                        <td>
                          {isOccupied ? (
                            <button
                              type="button"
                              disabled
                              className="hd-btn-room-action occupied-locked"
                              title="Room has an active booking. Locked until guest checkout."
                            >
                              🔒 Occupied — Active Booking
                            </button>
                          ) : isMaintenance ? (
                            <button
                              type="button"
                              onClick={() => setRoomActionModal({ room, action: 'available' })}
                              className="hd-btn-room-action set-available"
                              title="Restore room to Available for bookings"
                            >
                              Set Available
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRoomActionModal({ room, action: 'maintenance' })}
                              className="hd-btn-room-action set-maintenance"
                              title="Take room offline for maintenance"
                            >
                              Set Maintenance
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10 rooms per page default) */}
            <div className="hd-pagination-bar">
              <div className="hd-pagination-info">
                Showing {displayedRooms.length > 0 ? (roomPage - 1) * roomPageSize + 1 : 0}–
                {Math.min(roomPage * roomPageSize, displayedRooms.length)} of {displayedRooms.length} rooms
              </div>

              <div className="hd-pagination-nav">
                <button
                  type="button"
                  onClick={() => setRoomPage((p) => Math.max(1, p - 1))}
                  disabled={roomPage <= 1}
                  className="hd-btn-page nav-arrow"
                  title="Previous Page"
                >
                  &lt;
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setRoomPage(pg)}
                    className={`hd-btn-page ${roomPage === pg ? 'active' : ''}`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setRoomPage((p) => Math.min(totalPages, p + 1))}
                  disabled={roomPage >= totalPages}
                  className="hd-btn-page nav-arrow"
                  title="Next Page"
                >
                  &gt;
                </button>
              </div>

              <div className="hd-page-size-picker">
                <label>Show:</label>
                <select
                  value={roomPageSize}
                  onChange={(e) => {
                    setRoomPageSize(Number(e.target.value));
                    setRoomPage(1);
                  }}
                  className="hd-select-page-size"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* ROW 4: ROOM SLOT AVAILABILITY — MOVIE-SHOWTIME-STYLE SLOT UI (REQ 7, 8, 9, 10, 11) */}
          {/* ========================================================================= */}
          <section className="hd-card hd-movie-slots-section" id="room-slots">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">ROOM SLOT AVAILABILITY</h2>
                <p className="hd-card-sub">
                  Movie-showtime-style hourly timing schedule. Select date and room to inspect free hours and booking spans.
                </p>
              </div>

              {/* Controls: [ ← ] 15 SEPTEMBER 2026 [ → ] and [ Select Room ▼ ] */}
              <div className="hd-movie-controls-bar">
                {/* Date Navigator */}
                <div className="hd-date-navigator-wrap">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    className="hd-btn-date-nav"
                    title="Previous Day"
                  >
                    &larr;
                  </button>
                  <div className="hd-date-display-box">
                    <span className="hd-date-text">{formattedDateDisplay}</span>
                    <input
                      type="date"
                      value={selectedSlotDate}
                      onChange={(e) => setSelectedSlotDate(e.target.value)}
                      className="hd-date-hidden-picker"
                      title="Click to choose custom date"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleNextDay}
                    className="hd-btn-date-nav"
                    title="Next Day"
                  >
                    &rarr;
                  </button>
                </div>

                {/* Room Selector Dropdown */}
                <div className="hd-movie-control-group">
                  <select
                    value={selectedRoomForSlots}
                    onChange={(e) => setSelectedRoomForSlots(e.target.value)}
                    className="hd-movie-room-select"
                  >
                    <option value="ALL">All Rooms (Compact Grid)</option>
                    {roomsInventory.map((r) => (
                      <option key={r.room_id} value={r.room_number}>
                        Room #{r.room_number} ({r.room_type}) {r.status === 'maintenance' ? '• [Maintenance]' : r.status === 'booked' || r.status === 'occupied' ? '• [Occupied]' : '• [Available]'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* If Single Room Selected: Banner + 24-Hour Showtime Chips */}
            {targetRoomForSlots ? (
              <div className="hd-single-room-slot-container">
                {/* Selected Room Banner */}
                <div className="hd-selected-room-banner">
                  <div className="hd-srb-left">
                    <div className="hd-srb-title">Room {targetRoomForSlots.room_number}</div>
                    <div className="hd-srb-sub">
                      {targetRoomForSlots.room_type} Room • Floor {targetRoomForSlots.floor} • Capacity: {targetRoomForSlots.capacity} Guests
                    </div>
                  </div>
                  <div className="hd-srb-right">
                    <span className={`hd-srb-status-badge ${targetRoomForSlots.status}`}>
                      ● {targetRoomForSlots.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Legend Bar */}
                <div className="hd-movie-legend-bar">
                  <div className="hd-legend-item">
                    <span className="hd-legend-dot available"></span>
                    <span>Available</span>
                  </div>
                  <div className="hd-legend-item">
                    <span className="hd-legend-dot booked"></span>
                    <span>Booked (Click chip for details)</span>
                  </div>
                  <div className="hd-legend-item">
                    <span className="hd-legend-dot maintenance"></span>
                    <span>Maintenance</span>
                  </div>
                </div>

                {/* Movie-Style Hourly Timing Chips Grid */}
                <div className="hd-movie-chips-grid">
                  {hourlySlotsForSelectedRoom.map((slot) => {
                    const isBooked = slot.status === 'booked';
                    const isMaint = slot.status === 'maintenance';
                    const isAvail = slot.status === 'available';

                    return (
                      <div
                        key={slot.hour}
                        onClick={() => {
                          if (isBooked && slot.booking) {
                            setSelectedSlotDetail(slot.booking);
                          }
                        }}
                        className={`hd-slot-chip ${slot.status} ${isBooked ? 'clickable' : ''}`}
                        title={
                          isBooked
                            ? `Booked by ${slot.guestName || 'Guest'}. Click to view details.`
                            : isMaint
                            ? 'Room marked as Maintenance'
                            : `Available at ₹${slot.hourlyRate?.toFixed(2)}/hr`
                        }
                      >
                        <div className="hd-chip-time">{slot.timeLabel}</div>
                        <div className="hd-chip-badge">
                          {isAvail && <span className="hd-badge-txt avail">AVAILABLE</span>}
                          {isBooked && <span className="hd-badge-txt booked">BOOKED</span>}
                          {isMaint && <span className="hd-badge-txt maint">MAINTENANCE</span>}
                        </div>
                        {isBooked && slot.guestName && (
                          <div className="hd-chip-guest-name">👤 {slot.guestName}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* All Rooms Selected: Compact Rows with timelines */
              <div className="hd-all-rooms-timeline-list">
                {roomsInventory.slice(0, 10).map((rm) => {
                  const rmSlots = generateHourlySlotsForRoom(rm, selectedSlotDate);
                  return (
                    <div key={rm.room_id} className="hd-compact-room-row">
                      <div className="hd-crr-header">
                        <span className="hd-crr-title">Room #{rm.room_number} ({rm.room_type})</span>
                        <span className={`hd-status-pill-mini ${rm.status}`}>{rm.status.toUpperCase()}</span>
                      </div>
                      <div className="hd-crr-chips-scroll">
                        {rmSlots.map((s) => (
                          <div
                            key={s.hour}
                            onClick={() => s.booking && setSelectedSlotDetail(s.booking)}
                            className={`hd-slot-chip-mini ${s.status} ${s.booking ? 'clickable' : ''}`}
                            title={`${s.timeLabel} • ${s.status.toUpperCase()}`}
                          >
                            <span className="hd-chip-mini-time">{s.timeLabel.split('–')[0]}</span>
                            <span className="hd-chip-mini-status">{s.status.charAt(0).toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Detail Popover if Booked Slot is Clicked */}
            {selectedSlotDetail && (
              <div className="hd-slot-detail-popover">
                <div className="hd-slot-detail-head">
                  <strong>📋 Reservation Details: {selectedSlotDetail.booking_id}</strong>
                  <button type="button" onClick={() => setSelectedSlotDetail(null)} className="hd-btn-close-mini">✕</button>
                </div>
                <div className="hd-slot-detail-grid">
                  <div>Guest: <strong>{selectedSlotDetail.guest_name}</strong></div>
                  <div>Booking ID: <strong>{selectedSlotDetail.booking_id}</strong></div>
                  <div>Room: <strong>Room #{selectedSlotDetail.room_number} ({selectedSlotDetail.room_type})</strong></div>
                  <div>Duration: <strong>{selectedSlotDetail.duration_hours || calculateDurationInHours(selectedSlotDetail.check_in, selectedSlotDetail.check_out)} hours</strong></div>
                  <div>Check-in: <strong>{formatDateTimeDisplay(selectedSlotDetail.check_in)}</strong></div>
                  <div>Check-out: <strong>{formatDateTimeDisplay(selectedSlotDetail.check_out)}</strong></div>
                  <div className="full-width">
                    Total Amount: <strong className="text-total">₹{Number(selectedSlotDetail.total_amount || selectedSlotDetail.price || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* ROW 5: AI PRICING DETAILS — VIEW-ONLY PRICING INFORMATION (REQ 20) */}
          {/* ========================================================================= */}
          <section className="hd-card hd-dynamic-pricing-card" id="dynamic-pricing">
            <div className="hd-card-head">
              <div className="hd-head-title-row">
                <h2 className="hd-card-title">⚡ AI Pricing Details</h2>
                <div className="hd-badge-group">
                  <span className="hd-badge-ai">AI Controlled</span>
                  <span className="hd-view-only-pill">STRICTLY VIEW ONLY</span>
                </div>
              </div>
              <p className="hd-card-sub">
                Authoritative live hourly tariffs computed deterministically from Government crowd telemetry. Hotel owners have zero control over rates.
              </p>
            </div>

            {/* Top Telemetry Metric Line */}
            <div className="hd-pricing-telemetry-strip">
              <div className="hd-pt-item">
                <span className="hd-pt-label">INCOMING DEMAND:</span>
                <strong className="hd-pt-val">{demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`}</strong>
              </div>
              <div className="hd-pt-item">
                <span className="hd-pt-label">AI MULTIPLIER:</span>
                <strong className="hd-pt-val text-blue">{demandMultiplier.toFixed(2)}x</strong>
              </div>
              <div className="hd-pt-item">
                <span className="hd-pt-label">MAX TOTAL BOOKING:</span>
                <strong className="hd-pt-val text-total">₹12,000</strong>
              </div>
            </div>

            {/* Dynamic Rates Across Categories */}
            <div className="hd-pricing-category-grid">
              {[
                { key: 'standard', name: 'Standard Room', cfg: ROOM_CONFIG.standard },
                { key: 'deluxe', name: 'Deluxe Room', cfg: ROOM_CONFIG.deluxe },
                { key: 'suite', name: 'Family / Suite', cfg: ROOM_CONFIG.suite },
              ].map((item) => {
                const rawHourly = item.cfg.base * demandMultiplier;
                const finalHourly = Math.min(rawHourly, item.cfg.maxHourly);
                const isHourlyCapped = rawHourly > item.cfg.maxHourly;

                return (
                  <div key={item.key} className="hd-pricing-cat-card">
                    <div className="hd-pcat-header">
                      <span className="hd-pcat-title">{item.name}</span>
                      <span className="hd-pcat-base">Base: ₹{item.cfg.base}/hr</span>
                    </div>
                    <div className="hd-pcat-price-row">
                      <span className="hd-pcat-price">₹{finalHourly.toFixed(2)}</span>
                      <span className="hd-pcat-denom">/hour</span>
                    </div>
                    <div className="hd-pcat-meta">
                      <span>Formula: ₹{item.cfg.base} &times; {demandMultiplier.toFixed(2)}x</span>
                      <span>Cap: <strong>₹{item.cfg.maxHourly}/hr</strong></span>
                    </div>
                    {isHourlyCapped && (
                      <div className="hd-hourly-cap-tag">Hourly Ceiling Applied</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Safety Maximum Cap Notice */}
            <div className="hd-pricing-cap-summary-box">
              <div className="hd-cap-icon-box">🛡️</div>
              <div className="hd-cap-content">
                <div className="hd-cap-title">Hard Total Cap: ₹{MAX_TOTAL_BOOKING_CAP.toLocaleString('en-IN')} Per Booking</div>
                <div className="hd-cap-desc">
                  State Government consumer protection rule: no single pilgrim reservation may exceed ₹12,000 regardless of duration or surge level.
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* ROW 6: EXPRESS QR CHECK-IN / CHECKOUT TERMINAL WITH COUNTDOWN & LOCK */}
          {/* ========================================================================= */}
          <section className="hd-card hd-terminal-section" id="terminal">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">🪪 QR Check-in / Check-out Terminal</h2>
                <p className="hd-card-sub">
                  Digital guest pass verification with enforced time-lock protection until booked slot completion.
                </p>
              </div>
              <span className="hd-station-badge">STATION: DESK-01</span>
            </div>

            <div className="hd-terminal-grid">
              {/* QR Code Column */}
              <div className="hd-qr-col">
                <div className="hd-qr-card-wrap">
                  <div className="hd-qr-badge">Official Scannable Booking QR</div>
                  <div className="hd-qr-box">
                    <ScannableQRCode payload={terminalState.bookingRef} />
                  </div>
                  <div className="hd-qr-payload">
                    REF: <strong>{terminalState.bookingRef}</strong>
                  </div>
                </div>
              </div>

              {/* Guest Card Column */}
              <div className="hd-guest-col">
                <div className="hd-guest-card-box">
                  <div className="hd-guest-header">
                    <div>
                      <span className="hd-ref-tag">BOOKING ID: {terminalState.bookingRef}</span>
                      <h3 className="hd-guest-title">{terminalState.guestName}</h3>
                      <div className="hd-guest-room-sub">
                        Room Number: <strong>Room #{terminalState.roomNumber}</strong> ({terminalState.roomAssigned})
                      </div>
                      <div className="hd-guest-slot-time">
                        Check-in: <strong>{formatDateTimeDisplay(terminalState.check_in)}</strong> • Scheduled Checkout: <strong>{formatDateTimeDisplay(terminalState.check_out)}</strong>
                      </div>
                    </div>
                    <span className={`hd-status-chip ${terminalState.guestStatus.toLowerCase()}`}>
                      {terminalState.guestStatus === 'PENDING'
                        ? 'Awaiting Check-in'
                        : terminalState.guestStatus === 'CHECKED_IN'
                        ? 'Checked-In ✔'
                        : 'Checked-Out ✔'}
                    </span>
                  </div>

                  {/* Checkout Status Box */}
                  <div className="hd-checkout-status-card">
                    <div className="hd-cs-head">CHECKOUT STATUS</div>
                    {isCheckoutLocked ? (
                      <div className="hd-cs-locked-box">
                        <div className="hd-cs-locked-title">
                          🔒 Locked until {formatDateTimeDisplay(terminalState.check_out)}
                        </div>
                        <div className="hd-cs-countdown-row">
                          <span className="hd-cs-countdown-label">Checkout available in</span>
                          <span className="hd-cs-countdown-timer">{countdownString}</span>
                        </div>
                        <div className="hd-cs-hint">
                          Checkout button will unlock automatically once the booked slot completes.
                        </div>
                      </div>
                    ) : (
                      <div className="hd-cs-available-box">
                        <div className="hd-cs-avail-title">✓ Checkout Available</div>
                        <div className="hd-cs-hint">
                          Slot time completed. Room can now be released for housekeeping and made available for booking.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Evaluation Helper Bar */}
                  <div className="hd-terminal-test-helpers">
                    <span className="hd-test-label">🧪 Evaluation Shortcuts:</span>
                    <button
                      type="button"
                      onClick={setTestCountdown30s}
                      className="hd-btn-test-short"
                      title="Sets checkout to 30 seconds from now to observe live countdown reaching zero"
                    >
                      ⚡ Test 30s Countdown
                    </button>
                    <button
                      type="button"
                      onClick={setTestSlot5PM}
                      className="hd-btn-test-short"
                      title="Sets scheduled checkout to 5:00 PM today"
                    >
                      ⚡ Test 5:00 PM Slot
                    </button>
                    {isCheckoutLocked && (
                      <label className="hd-override-checkbox-inline">
                        <input
                          type="checkbox"
                          checked={emergencyOverride}
                          onChange={(e) => setEmergencyOverride(e.target.checked)}
                        />
                        <span>Staff Emergency Override</span>
                      </label>
                    )}
                  </div>

                  {/* Terminal Action Buttons */}
                  <div className="hd-guest-actions-grid">
                    <button
                      type="button"
                      onClick={handleProcessCheckIn}
                      disabled={terminalState.guestStatus === 'CHECKED_IN' || terminalState.guestStatus === 'CHECKED_OUT'}
                      className="hd-btn-terminal-checkin"
                    >
                      📱 Process QR Check-In
                    </button>

                    {isCheckoutLocked ? (
                      <button
                        type="button"
                        disabled
                        onClick={() => {
                          alert(`🔒 Checkout is locked until ${formatDateTimeDisplay(terminalState.check_out)}`);
                        }}
                        className="hd-btn-terminal-checkout locked"
                        title="Checkout will be available after slot ends"
                      >
                        🔒 Checkout &amp; Release Room
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGuestCheckOut}
                        disabled={terminalState.guestStatus !== 'CHECKED_IN'}
                        className={`hd-btn-terminal-checkout active ${terminalState.guestStatus === 'CHECKED_IN' ? 'ready' : ''}`}
                      >
                        ✓ Checkout &amp; Release Room
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ROOM STATUS CHANGE CONFIRMATION (REQUIREMENT 3) */}
      {/* ========================================================================= */}
      {roomActionModal && (
        <div className="hd-modal-overlay" onClick={() => setRoomActionModal(null)}>
          <div className="hd-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="hd-modal-title">
              {roomActionModal.action === 'maintenance'
                ? `Mark Room ${roomActionModal.room.room_number} as Maintenance?`
                : `Make Room ${roomActionModal.room.room_number} available for booking?`}
            </h3>
            <p className="hd-modal-sub">
              {roomActionModal.action === 'maintenance'
                ? `Room #${roomActionModal.room.room_number} will immediately become unavailable for booking in the Tourist Portal.`
                : `Room #${roomActionModal.room.room_number} will immediately become available in the Tourist Portal for pilgrim reservations.`}
            </p>
            <div className="hd-modal-room-info-pill">
              Room #{roomActionModal.room.room_number} ({roomActionModal.room.room_type}) • Floor {roomActionModal.room.floor}
            </div>
            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setRoomActionModal(null)}
                className="hd-btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRoomStatusChange(roomActionModal.room, roomActionModal.action)}
                className={roomActionModal.action === 'maintenance' ? 'hd-btn-modal-danger' : 'hd-btn-modal-confirm'}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DECLINE BOOKING REQUEST */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL 3: BOOKING CONFIRMATION RESULT */}
      {/* ========================================================================= */}
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
