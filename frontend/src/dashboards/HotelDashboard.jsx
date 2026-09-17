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
  updateRoomStatus,
  checkoutHotelBooking
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
// CONFIGURABLE PRICING ENGINE CONSTANTS & RULES (AI GOVERNED - STRICTLY VIEW ONLY)
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

export default function HotelDashboard({ showToast }) {
  // ---------------------------------------------------------------------------
  // 1. DEMAND & TELEMETRY STATE (STRICTLY VIEW ONLY FOR HOTEL OWNER)
  // ---------------------------------------------------------------------------
  // The Government & AI Crowd system controls this value. Hotel owner CANNOT modify it.
  const [demandPct, setDemandPct] = useState(50);

  // Passive listener for Government Authority updates
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

  const demandMultiplier = useMemo(() => getDemandMultiplier(demandPct), [demandPct]);

  // ---------------------------------------------------------------------------
  // 2. ROOMS INVENTORY & AVAILABLE ROOM MANAGEMENT
  // ---------------------------------------------------------------------------
  const [roomsInventory, setRoomsInventory] = useState(INITIAL_ROOMS);
  const [roomFilterType, setRoomFilterType] = useState('ALL');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  // Filtered rooms for Available Room Management table
  const displayedRooms = useMemo(() => {
    return roomsInventory.filter((r) => {
      const matchesType =
        roomFilterType === 'ALL' ||
        r.room_type.toLowerCase() === roomFilterType.toLowerCase() ||
        (roomFilterType === 'SUITE' && (r.room_type.toLowerCase() === 'suite' || r.room_type.toLowerCase() === 'family'));
      const q = roomSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || r.room_number.toLowerCase().includes(q) || r.room_type.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [roomsInventory, roomFilterType, roomSearchQuery]);

  // Toggle Room Maintenance / Available handler
  const handleToggleRoomStatus = async (room) => {
    const isCurrentlyMaint = room.status === 'maintenance' || room.status === 'unavailable';
    const isCurrentlyOccupied = room.status === 'booked' || room.status === 'occupied';

    // Disallow toggling occupied rooms with active bookings
    if (isCurrentlyOccupied) {
      alert(`⚠️ Room #${room.room_number} is currently occupied by an active booking. It cannot be set to Available or Maintenance until the guest completes checkout.`);
      return;
    }

    const newStatus = isCurrentlyMaint ? 'available' : 'maintenance';

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
  // 3. MOVIE-SHOW-STYLE HOURLY ROOM SLOT TIMELINE
  // ---------------------------------------------------------------------------
  const [selectedSlotDate, setSelectedSlotDate] = useState('2026-09-15');
  const [selectedRoomForSlots, setSelectedRoomForSlots] = useState('204');
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);

  // Generate 24 hourly chips for the selected room and date
  const hourlySlotsForSelectedRoom = useMemo(() => {
    const targetRoom =
      roomsInventory.find((r) => String(r.room_number) === String(selectedRoomForSlots)) ||
      roomsInventory[0];
    if (!targetRoom) return [];

    const isRoomMaintenance = targetRoom.status === 'maintenance' || targetRoom.status === 'unavailable';

    const slots = [];
    for (let h = 0; h < 24; h++) {
      const startH = String(h).padStart(2, '0');
      const endH = String(h + 1).padStart(2, '0');
      const slotStartISO = `${selectedSlotDate}T${startH}:00:00`;
      const slotEndISO = `${selectedSlotDate}T${endH}:00:00`;
      const timeLabel = `${startH}:00 - ${endH}:00`;

      if (isRoomMaintenance) {
        slots.push({
          hour: h,
          timeLabel,
          status: 'maintenance',
          roomNumber: targetRoom.room_number,
          roomType: targetRoom.room_type,
          label: 'MAINTENANCE',
        });
        continue;
      }

      // Check if any confirmed/pending booking overlaps this hour
      // Overlap: slotStart < bookingEnd && slotEnd > bookingStart
      const sStart = new Date(slotStartISO).getTime();
      const sEnd = new Date(slotEndISO).getTime();

      const booking = bookingRequests.find((b) => {
        if (String(b.room_number) !== String(targetRoom.room_number)) return false;
        if (b.status === 'declined' || b.status === 'cancelled') return false;
        const bIn = new Date(b.check_in).getTime();
        const bOut = new Date(b.check_out).getTime();
        return sStart < bOut && sEnd > bIn;
      });

      if (booking) {
        slots.push({
          hour: h,
          timeLabel,
          status: 'booked',
          roomNumber: targetRoom.room_number,
          roomType: targetRoom.room_type,
          label: 'BOOKED',
          booking,
          guestName: booking.guest_name,
          bookingId: booking.booking_id,
        });
      } else {
        const rKey = (targetRoom.room_type || 'Deluxe').toLowerCase();
        const cfg = ROOM_CONFIG[rKey] || ROOM_CONFIG.deluxe;
        const slotHourlyRate = Math.min(cfg.base * demandMultiplier, cfg.maxHourly);
        slots.push({
          hour: h,
          timeLabel,
          status: 'available',
          roomNumber: targetRoom.room_number,
          roomType: targetRoom.room_type,
          label: 'AVAILABLE',
          hourlyRate: slotHourlyRate,
        });
      }
    }
    return slots;
  }, [roomsInventory, selectedRoomForSlots, selectedSlotDate, bookingRequests, demandMultiplier]);

  // ---------------------------------------------------------------------------
  // 4. BOOKING REQUESTS STATE & CONFIRMATION
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

  // Accept Booking Request
  const handleAcceptRequest = async (req) => {
    // Check if room is in maintenance
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
  // 5. QR CHECK-IN TERMINAL & STRICT CHECKOUT TIME LOCK
  // ---------------------------------------------------------------------------
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

  // Time Lock Calculation: Checkout is disabled if current time < booked check_out
  const isTimeElapsed = useMemo(() => {
    if (!terminalState.check_out) return true;
    return new Date() >= new Date(terminalState.check_out);
  }, [terminalState.check_out]);

  const isCheckoutLocked = !emergencyOverride && !isTimeElapsed;

  const simulateGuestCheckIn = () => {
    setTerminalState((prev) => ({ ...prev, guestStatus: 'CHECKED_IN' }));
    if (showToast) showToast(`🪪 QR Verified! Welcome ${terminalState.guestName}. Key card issued.`);
  };

  const handleGuestCheckOut = async () => {
    if (isCheckoutLocked) {
      alert(`🔒 Checkout locked until ${formatDateTimeDisplay(terminalState.check_out)}. Guest cannot check out before the booked slot completion.`);
      return;
    }

    try {
      await checkoutHotelBooking(terminalState.bookingRef, emergencyOverride);
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
    setShowSuccessBanner(true);
    if (showToast) showToast(`✨ Checkout complete! Room #${terminalState.roomNumber} released for housekeeping.`);
  };

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
    if (showToast) showToast('🔄 Demo states reset to baseline.');
  };

  // ---------------------------------------------------------------------------
  // 6. BACKEND DATA LOAD & LIVE CROWD TELEMETRY SYNC
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
          <a href="#room-management" className="hd-nav-item">
            <span className="hd-nav-icon">🛏️</span>
            <span>Room Management</span>
          </a>
          <a href="#room-slots" className="hd-nav-item">
            <span className="hd-nav-icon">🎬</span>
            <span>Hourly Slot Timeline</span>
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
            <span>AI Dynamic Pricing</span>
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
        {/* TOP HEADER BAR (STRICTLY NO SIMULATOR BUTTONS) */}
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
                Pilgrim density telemetry is automatically broadcast by the Uttarakhand District Administration Command Center and AI Prediction Engine. Hotel partners have strictly read-only access.
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
                <span className="hd-metric-main text-green">{availableRoomsCount}</span>
                <span className="hd-metric-denom"> / {totalRoomsCount} Total</span>
              </div>
              <div className="hd-metric-footer">
                {maintenanceRoomsCount > 0 && <span className="text-amber">({maintenanceRoomsCount} in Maintenance)</span>}
              </div>
            </div>

            {/* METRIC 4: LIVE AI DELUXE RATE */}
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">⚡</span>
                <span className="hd-metric-title">Live AI Deluxe Rate</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main highlight-blue">
                  ₹{Math.min(ROOM_CONFIG.deluxe.base * demandMultiplier, ROOM_CONFIG.deluxe.maxHourly).toFixed(2)}
                </span>
                <span className="hd-metric-denom">/hour</span>
              </div>
              <div className="hd-metric-footer">
                <span className="hd-badge-ai-inline">AI Controlled</span> Auto-updating
              </div>
            </div>
          </section>

          {/* 5. TWO-COLUMN OPERATIONAL GRID: AVAILABLE ROOM MANAGEMENT + VIEW-ONLY DYNAMIC PRICING */}
          <div className="hd-two-column-grid">
            {/* LEFT COLUMN: AVAILABLE ROOM MANAGEMENT (REPLACES MANUAL BOOKING FORM) */}
            <section className="hd-card hd-room-mgmt-card" id="room-management">
              <div className="hd-card-head">
                <div>
                  <h2 className="hd-card-title">🛏️ Available Room Management</h2>
                  <p className="hd-card-sub">
                    Manage operational status across all 50 rooms. Mark rooms as Available or Maintenance. Occupied rooms with active bookings are locked until checkout.
                  </p>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="hd-mgmt-controls-row">
                <div className="hd-mgmt-search-box">
                  <span className="hd-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search Room # (e.g. 101, 204)..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    className="hd-mgmt-search-input"
                  />
                </div>

                <div className="hd-table-filters">
                  {['ALL', 'STANDARD', 'DELUXE', 'FAMILY'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRoomFilterType(cat)}
                      className={`hd-filter-pill ${roomFilterType === cat ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Inventory Table */}
              <div className="hd-table-responsive hd-mgmt-table-wrap">
                <table className="hd-saas-table hd-mgmt-table">
                  <thead>
                    <tr>
                      <th>Room No.</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRooms.slice(0, 10).map((room) => {
                      const isOccupied = room.status === 'booked' || room.status === 'occupied';
                      const isMaintenance = room.status === 'maintenance' || room.status === 'unavailable';
                      const isAvailable = room.status === 'available';

                      return (
                        <tr key={room.room_id} className={`row-${room.status}`}>
                          <td className="cell-room-no">
                            <span className="hd-room-chip">#{room.room_number}</span>
                          </td>
                          <td className="cell-type">{room.room_type}</td>
                          <td className="cell-cap">Floor {room.floor} • {room.capacity} Guests</td>
                          <td className="cell-status">
                            {isAvailable && <span className="hd-status-badge available">Available</span>}
                            {isOccupied && <span className="hd-status-badge booked">Occupied</span>}
                            {isMaintenance && <span className="hd-status-badge maintenance">Maintenance</span>}
                          </td>
                          <td className="cell-action">
                            {isOccupied ? (
                              <button
                                type="button"
                                disabled
                                className="hd-btn-toggle-status locked"
                                title="Room is currently occupied with an active booking. Checkout required to release."
                              >
                                🔒 Occupied (Active)
                              </button>
                            ) : isMaintenance ? (
                              <button
                                type="button"
                                onClick={() => handleToggleRoomStatus(room)}
                                className="hd-btn-toggle-status set-avail"
                                title="Mark this room as Available for tourist bookings"
                              >
                                ✅ Set Available
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleRoomStatus(room)}
                                className="hd-btn-toggle-status set-maint"
                                title="Take this room out of inventory for maintenance"
                              >
                                🔧 Set Maintenance
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="hd-table-footer">
                Showing {Math.min(10, displayedRooms.length)} of {displayedRooms.length} rooms ({totalRoomsCount} Total inventory)
              </div>
            </section>

            {/* RIGHT COLUMN: DYNAMIC PRICING (LIVE) VIEW-ONLY CARD */}
            <section className="hd-card hd-dynamic-pricing-card" id="dynamic-pricing">
              <div className="hd-card-head">
                <div className="hd-head-title-row">
                  <h2 className="hd-card-title">⚡ Dynamic Pricing (Live)</h2>
                  <div className="hd-badge-group">
                    <span className="hd-badge-ai">AI Controlled</span>
                    <span className="hd-view-only-pill">STRICTLY VIEW ONLY</span>
                  </div>
                </div>
                <p className="hd-card-sub">
                  Authoritative live hourly tariff computed deterministically from Government/AI demand telemetry. Hotel owner has zero controls over tariffs.
                </p>
              </div>

              {/* Dynamic Rates Table across Room Categories */}
              <div className="hd-pricing-category-grid">
                {[
                  { key: 'standard', name: 'Standard Room', cfg: ROOM_CONFIG.standard },
                  { key: 'deluxe', name: 'Deluxe Room', cfg: ROOM_CONFIG.deluxe },
                  { key: 'suite', name: 'Suite / Family', cfg: ROOM_CONFIG.suite },
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
                        <span>Mult: <strong>{demandMultiplier.toFixed(2)}x</strong></span>
                        <span>Ceiling: <strong>₹{item.cfg.maxHourly}/hr</strong></span>
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
                    State Government consumer protection rule: no single pilgrim reservation may exceed ₹12,000 regardless of hours or surge level. When reached, <strong>AI Surge Cap Applied</strong> is displayed.
                  </div>
                </div>
              </div>

              <div className="hd-pricing-footer-note">
                ℹ️ <em>Tariff auto-updates with live incoming crowd telemetry from the Kedarnath District Command Center.</em>
              </div>
            </section>
          </div>

          {/* 6. MOVIE-SHOW-STYLE HOURLY ROOM SLOT TIMELINE SECTION */}
          <section className="hd-card hd-movie-slots-section" id="room-slots">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">🎬 Hourly Room Slot Timeline (Show-Style Schedule)</h2>
                <p className="hd-card-sub">
                  Intuitive show-style timing chips displaying 24-hour occupancy at a glance. Select any room to inspect free hours and booking details.
                </p>
              </div>

              {/* Slot Schedule Controls */}
              <div className="hd-movie-controls-bar">
                <div className="hd-movie-control-group">
                  <label className="hd-movie-lbl">Date:</label>
                  <input
                    type="date"
                    value={selectedSlotDate}
                    onChange={(e) => setSelectedSlotDate(e.target.value)}
                    className="hd-movie-date-input"
                  />
                </div>

                <div className="hd-movie-control-group">
                  <label className="hd-movie-lbl">Select Room:</label>
                  <select
                    value={selectedRoomForSlots}
                    onChange={(e) => setSelectedRoomForSlots(e.target.value)}
                    className="hd-movie-room-select"
                  >
                    {roomsInventory.map((r) => (
                      <option key={r.room_id} value={r.room_number}>
                        Room #{r.room_number} ({r.room_type}) {r.status === 'maintenance' ? '• [Maintenance]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Legend Bar */}
            <div className="hd-movie-legend-bar">
              <div className="hd-legend-item">
                <span className="hd-legend-dot available"></span>
                <span>Available (Ready for Booking)</span>
              </div>
              <div className="hd-legend-item">
                <span className="hd-legend-dot booked"></span>
                <span>Booked / Occupied (Click for Details)</span>
              </div>
              <div className="hd-legend-item">
                <span className="hd-legend-dot maintenance"></span>
                <span>Maintenance / Blocked</span>
              </div>
            </div>

            {/* Movie-Style Hourly Chips Grid */}
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
                    title={isBooked ? `Booked by ${slot.guestName}. Click to inspect reservation.` : (isMaint ? 'Room under maintenance' : `Available at ₹${slot.hourlyRate?.toFixed(2)}/hr`)}
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
                    {isAvail && slot.hourlyRate && (
                      <div className="hd-chip-rate">₹{slot.hourlyRate.toFixed(0)}/hr</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Detail Banner if Selected */}
            {selectedSlotDetail && (
              <div className="hd-slot-detail-popover">
                <div className="hd-slot-detail-head">
                  <strong>📋 Reservation Details: {selectedSlotDetail.booking_id}</strong>
                  <button type="button" onClick={() => setSelectedSlotDetail(null)} className="hd-btn-close-mini">✕</button>
                </div>
                <div className="hd-slot-detail-grid">
                  <div>Guest: <strong>{selectedSlotDetail.guest_name}</strong> ({selectedSlotDetail.guest_count} Guests)</div>
                  <div>Room: <strong>Room #{selectedSlotDetail.room_number} ({selectedSlotDetail.room_type})</strong></div>
                  <div>Interval: <strong>{formatDateTimeDisplay(selectedSlotDetail.check_in)} → {formatDateTimeDisplay(selectedSlotDetail.check_out)}</strong></div>
                  <div>Rate: <strong>₹{selectedSlotDetail.final_hourly_rate || selectedSlotDetail.dynamic_hourly_rate}/hr</strong></div>
                  <div>Total Amount: <strong className="text-total">₹{Number(selectedSlotDetail.total_amount || selectedSlotDetail.price).toLocaleString('en-IN')}</strong></div>
                  <div>Status: <span className={`hd-req-status-pill ${selectedSlotDetail.status}`}>{selectedSlotDetail.status.toUpperCase()}</span></div>
                </div>
              </div>
            )}
          </section>

          {/* 7. RECENT BOOKING REQUESTS (WITH DURATION, HOURLY & CAPPED TOTAL) */}
          <section className="hd-card hd-requests-section" id="booking-requests">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">📩 Recent Booking Requests</h2>
                <p className="hd-card-sub">
                  Incoming pilgrim reservation requests submitted from the Tourist Portal, priced authoritatively by YatraSetu AI engine.
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

          {/* 8. EXPRESS QR VERIFICATION & GUEST TERMINAL WITH CHECKOUT TIME LOCK */}
          <section className="hd-card hd-terminal-section" id="terminal">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">🪪 Express QR Verification &amp; Guest Terminal</h2>
                <p className="hd-card-sub">
                  Digital guest pass verification with enforced time-lock protection until booked slot completion.
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
                      <div className="hd-guest-slot-time">
                        Booked Slot: <strong>{formatDateTimeDisplay(terminalState.check_in)} → {formatDateTimeDisplay(terminalState.check_out)}</strong>
                      </div>
                    </div>
                    <span className={`hd-status-chip ${terminalState.guestStatus.toLowerCase()}`}>
                      {terminalState.guestStatus === 'PENDING' ? 'Awaiting Check-in' : (terminalState.guestStatus === 'CHECKED_IN' ? 'Checked-In ✔' : 'Checked-Out ✔')}
                    </span>
                  </div>

                  {/* Checkout Lock Callout Banner */}
                  {terminalState.guestStatus === 'CHECKED_IN' && isCheckoutLocked && (
                    <div className="hd-lock-notice-box">
                      <span className="hd-lock-icon">🔒</span>
                      <div className="hd-lock-text">
                        <strong>Checkout Locked:</strong> Slot in progress until {formatDateTimeDisplay(terminalState.check_out)}. Guest cannot check out before the booked duration ends.
                      </div>
                    </div>
                  )}

                  {/* Staff Emergency Override Toggle */}
                  {terminalState.guestStatus === 'CHECKED_IN' && isCheckoutLocked && (
                    <div className="hd-override-box">
                      <label className="hd-override-checkbox-label">
                        <input
                          type="checkbox"
                          checked={emergencyOverride}
                          onChange={(e) => setEmergencyOverride(e.target.checked)}
                        />
                        <span>Staff Emergency Override (Authorizes early checkout)</span>
                      </label>
                    </div>
                  )}

                  <div className="hd-guest-actions-grid">
                    <button
                      type="button"
                      onClick={simulateGuestCheckIn}
                      disabled={terminalState.guestStatus === 'CHECKED_IN' || terminalState.guestStatus === 'CHECKED_OUT'}
                      className="hd-btn-terminal-checkin"
                    >
                      📱 Simulate QR Check-In
                    </button>

                    {isCheckoutLocked ? (
                      <button
                        type="button"
                        disabled
                        className="hd-btn-terminal-checkout locked"
                        title={`Checkout locked until ${formatDateTimeDisplay(terminalState.check_out)}`}
                      >
                        🔒 Checkout locked until {formatDateTimeDisplay(terminalState.check_out)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGuestCheckOut}
                        disabled={terminalState.guestStatus !== 'CHECKED_IN'}
                        className={`hd-btn-terminal-checkout ${terminalState.guestStatus === 'CHECKED_IN' ? 'active' : ''}`}
                      >
                        ✨ Complete Check-Out &amp; Release Room
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

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
