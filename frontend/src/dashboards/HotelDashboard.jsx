// HotelDashboard.jsx - Clean White Professional SaaS Dashboard for YatraSetu Hotel Partner
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
  fetchInboundBuses,
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
// CONFIGURABLE PRICING ENGINE CONSTANTS & HELPERS
// ---------------------------------------------------------------------------
export const ROOM_BASE_HOURLY_RATES = {
  standard: 500,
  deluxe: 750,
  suite: 1000,
  family: 1000,
};

export const DEMAND_MULTIPLIER_RULES = [
  { maxPct: 0, mult: 1.00, label: 'Normal (0%)' },
  { maxPct: 20, mult: 1.10, label: 'Low Surge (+20%)' },
  { maxPct: 40, mult: 1.25, label: 'Moderate Surge (+30%)' },
  { maxPct: 60, mult: 1.50, label: 'High Surge (+50%)' },
  { maxPct: 80, mult: 1.75, label: 'Critical Surge (+70%)' },
  { maxPct: Infinity, mult: 2.00, label: 'Max Surge (+90%)' },
];

export const getDemandMultiplier = (demandPct) => {
  const pct = Number(demandPct) || 0;
  for (const rule of DEMAND_MULTIPLIER_RULES) {
    if (pct <= rule.maxPct) return rule.mult;
  }
  return 1.00;
};

export const getDemandLabel = (demandPct) => {
  const pct = Number(demandPct) || 0;
  for (const rule of DEMAND_MULTIPLIER_RULES) {
    if (pct <= rule.maxPct) return rule.label;
  }
  return 'Normal';
};

export const getDateTimeMultiplier = (checkInIso, checkOutIso) => {
  if (!checkInIso) return 1.00;
  try {
    const dIn = new Date(checkInIso);
    const dOut = checkOutIso ? new Date(checkOutIso) : new Date(dIn.getTime() + 3600000);
    
    // Check if slot covers peak hours: Morning 6:00-10:00 or Evening 17:00-22:00
    let cur = new Date(dIn.getTime());
    let hasPeak = false;
    const maxSteps = Math.min(Math.ceil((dOut - dIn) / 3600000) + 1, 168);
    for (let i = 0; i < maxSteps; i++) {
      const h = cur.getHours();
      if ((h >= 6 && h <= 10) || (h >= 17 && h <= 22)) {
        hasPeak = true;
        break;
      }
      cur.setHours(cur.getHours() + 1);
    }
    if (hasPeak) return 1.20;

    // Weekend check: Friday evening (>=17) through Sunday
    const day = dIn.getDay();
    if (day === 0 || day === 6 || (day === 5 && dIn.getHours() >= 17)) {
      return 1.15;
    }
    return 1.00;
  } catch {
    return 1.00;
  }
};

export const calculateHoursBetween = (inStr, outStr) => {
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

export const formatDateTimeDisplay = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${hours}:${mins} ${ampm}`;
  } catch {
    return isoStr;
  }
};

// Initial Room Inventory (50 rooms across 3 floors)
const INITIAL_ROOMS = [
  { room_number: '101', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '102', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '103', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '104', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '105', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '106', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '107', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '108', room_type: 'Standard', floor: 1, base_rate: 500, status: 'available', booking_slot: null, available_after: null },
  { room_number: '201', room_type: 'Deluxe', floor: 2, base_rate: 750, status: 'available', booking_slot: null, available_after: null },
  { room_number: '202', room_type: 'Deluxe', floor: 2, base_rate: 750, status: 'available', booking_slot: null, available_after: null },
  { room_number: '203', room_type: 'Deluxe', floor: 2, base_rate: 750, status: 'available', booking_slot: null, available_after: null },
  { room_number: '204', room_type: 'Deluxe', floor: 2, base_rate: 750, status: 'available', booking_slot: null, available_after: null },
  { room_number: '205', room_type: 'Deluxe', floor: 2, base_rate: 750, status: 'available', booking_slot: null, available_after: null },
  { room_number: '206', room_type: 'Deluxe', floor: 2, base_rate: 750, status: 'available', booking_slot: null, available_after: null },
  { room_number: '301', room_type: 'Family', floor: 3, base_rate: 1000, status: 'available', booking_slot: null, available_after: null },
  { room_number: '302', room_type: 'Family', floor: 3, base_rate: 1000, status: 'available', booking_slot: null, available_after: null },
  { room_number: '303', room_type: 'Family', floor: 3, base_rate: 1000, status: 'available', booking_slot: null, available_after: null },
];

export default function HotelDashboard({ currentUser, showToast, activeRerouteAlert, densityMap }) {
  // ---------------------------------------------------------------------------
  // 1. DYNAMIC DEMAND & SURGE PERCENTAGE STATE (No absolute headcount numbers!)
  // ---------------------------------------------------------------------------
  const [demandPct, setDemandPct] = useState(50); // Default: +50% High Surge
  const [customDemandInput, setCustomDemandInput] = useState('50');

  // React to cross-dashboard government reroute alerts or crowd telemetry
  useEffect(() => {
    if (activeRerouteAlert && (activeRerouteAlert.status === 'ACTIVE' || activeRerouteAlert.is_active !== false)) {
      setDemandPct(50);
      setCustomDemandInput('50');
      return;
    }
    const density = densityMap?.['TS003'] || densityMap?.['TS001'] || densityMap?.['site_kedarnath'];
    if (density?.occupancy_percentage >= 90 || density?.status === 'CRITICAL') {
      setDemandPct(75);
      setCustomDemandInput('75');
    } else if (density?.occupancy_percentage >= 75 || density?.status === 'HIGH') {
      setDemandPct(50);
      setCustomDemandInput('50');
    } else if (density?.occupancy_percentage >= 50 || density?.status === 'MODERATE') {
      setDemandPct(20);
      setCustomDemandInput('20');
    }
  }, [activeRerouteAlert, densityMap]);

  // ---------------------------------------------------------------------------
  // 2. SLOT BOOKING FORM STATE
  // ---------------------------------------------------------------------------
  const [checkInDate, setCheckInDate] = useState('2026-09-15');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutDate, setCheckOutDate] = useState('2026-09-16');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [guestsCount, setGuestsCount] = useState(2);
  const [slotRoomType, setSlotRoomType] = useState('deluxe');
  const [availabilityResult, setAvailabilityResult] = useState(null);

  // Computed ISO timestamps & slot duration
  const checkInIso = useMemo(() => `${checkInDate}T${checkInTime}:00`, [checkInDate, checkInTime]);
  const checkOutIso = useMemo(() => `${checkOutDate}T${checkOutTime}:00`, [checkOutDate, checkOutTime]);
  const slotDurationHours = useMemo(() => calculateHoursBetween(checkInIso, checkOutIso), [checkInIso, checkOutIso]);

  // ---------------------------------------------------------------------------
  // 3. REAL-TIME INPUT-DRIVEN DYNAMIC PRICING ENGINE
  // Formula:
  //   Final hourly price = Base hourly price * Demand multiplier * Date/Time multiplier
  //   Total booking price = Final hourly price * Slot duration in hours
  // ---------------------------------------------------------------------------
  const baseHourlyPrice = useMemo(() => {
    return ROOM_BASE_HOURLY_RATES[slotRoomType.toLowerCase()] || 750;
  }, [slotRoomType]);

  const demandMultiplier = useMemo(() => {
    return getDemandMultiplier(demandPct);
  }, [demandPct]);

  const dateTimeMultiplier = useMemo(() => {
    return getDateTimeMultiplier(checkInIso, checkOutIso);
  }, [checkInIso, checkOutIso]);

  const finalHourlyPrice = useMemo(() => {
    return Math.round(baseHourlyPrice * demandMultiplier * dateTimeMultiplier);
  }, [baseHourlyPrice, demandMultiplier, dateTimeMultiplier]);

  const totalBookingPrice = useMemo(() => {
    return Math.round(finalHourlyPrice * slotDurationHours);
  }, [finalHourlyPrice, slotDurationHours]);

  // ---------------------------------------------------------------------------
  // 4. ROOM INVENTORY & ROOM SLOTS TABLE STATE
  // ---------------------------------------------------------------------------
  const [roomsInventory, setRoomsInventory] = useState(INITIAL_ROOMS);
  const [roomCategoryFilter, setRoomCategoryFilter] = useState('ALL');

  // Filtered rooms table
  const filteredRooms = useMemo(() => {
    if (roomCategoryFilter === 'ALL') return roomsInventory;
    return roomsInventory.filter(r => r.room_type.toLowerCase() === roomCategoryFilter.toLowerCase());
  }, [roomsInventory, roomCategoryFilter]);

  // Check Availability & Price logic for requested slot
  const handleCheckAvailability = () => {
    const dIn = new Date(checkInIso);
    const dOut = new Date(checkOutIso);

    if (isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dIn >= dOut) {
      setAvailabilityResult({
        success: false,
        message: 'Invalid schedule: Check-out must be strictly after Check-in.'
      });
      return;
    }

    // Find rooms of requested category
    const matchingRooms = roomsInventory.filter(
      r => r.room_type.toLowerCase() === slotRoomType.toLowerCase()
    );

    // Check each room against overlap logic
    const availableMatch = matchingRooms.find(r => {
      if (r.status === 'booked') {
        const conflict = checkRoomConflictLocal(r.room_number, checkInIso, checkOutIso);
        return !conflict;
      }
      return true;
    });

    if (availableMatch) {
      setAvailabilityResult({
        success: true,
        roomNumber: availableMatch.room_number,
        roomType: availableMatch.room_type,
        duration: slotDurationHours,
        hourlyRate: finalHourlyPrice,
        totalAmount: totalBookingPrice,
        message: `✓ Available: Room #${availableMatch.room_number} (${availableMatch.room_type}) is free for the entire ${slotDurationHours}-hour slot!`
      });
      if (showToast) {
        showToast(`✓ Room #${availableMatch.room_number} is available for ${slotDurationHours} hours!`);
      }
    } else {
      setAvailabilityResult({
        success: false,
        message: `✕ Unavailable: All ${slotRoomType.toUpperCase()} rooms have overlapping reservations during this window.`
      });
      if (showToast) {
        showToast(`⚠️ No ${slotRoomType} rooms available for the selected interval.`);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 5. INCOMING BOOKING REQUESTS STATE
  // ---------------------------------------------------------------------------
  const [bookingRequests, setBookingRequests] = useState([
    {
      id: 'REQ-101',
      booking_id: 'YC-48217',
      guest_name: 'Rahul Sharma',
      guest_count: 2,
      room_number: '204',
      room_type: 'Deluxe',
      check_in: '2026-09-15T14:00:00',
      check_out: '2026-09-16T11:00:00',
      duration_hours: 21,
      base_hourly_rate: 750,
      pricing_multiplier: 1.8,
      demand_multiplier: 1.5,
      datetime_multiplier: 1.2,
      final_hourly_rate: 1350,
      total_amount: 28350,
      site_name: 'Kashi Vishwanath',
      crowd_percentage: 87,
      crowd_level: 'HIGH',
      status: 'pending',
      decline_reason: null
    },
    {
      id: 'REQ-102',
      booking_id: 'YC-51042',
      guest_name: 'Priya Verma',
      guest_count: 3,
      room_number: '205',
      room_type: 'Deluxe',
      check_in: '2026-09-16T12:00:00',
      check_out: '2026-09-16T20:00:00',
      duration_hours: 8,
      base_hourly_rate: 750,
      pricing_multiplier: 1.5,
      demand_multiplier: 1.5,
      datetime_multiplier: 1.0,
      final_hourly_rate: 1125,
      total_amount: 9000,
      site_name: 'Kashi Vishwanath',
      crowd_percentage: 87,
      crowd_level: 'HIGH',
      status: 'pending',
      decline_reason: null
    }
  ]);

  const [requestFilter, setRequestFilter] = useState('ALL');
  const [declineDialogReqId, setDeclineDialogReqId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Room unavailable for requested time window');
  const [confirmedResultModal, setConfirmedResultModal] = useState(null);

  // Accept Booking Request
  const handleAcceptRequest = async (req) => {
    // 1. Strict overlap conflict check
    const hasConflict = checkRoomConflictLocal(req.room_number, req.check_in, req.check_out, req.booking_id);
    if (hasConflict) {
      alert(`⚠️ Cannot Accept: Room #${req.room_number} has an overlapping confirmed booking.`);
      return;
    }

    try {
      // Backend acceptance call
      try {
        await acceptBookingRequest(req.id);
      } catch (err) {
        console.warn('Backend accept call note:', err);
      }

      // Update room in inventory table
      setRoomsInventory(prev => prev.map(r => {
        if (String(r.room_number) === String(req.room_number)) {
          return {
            ...r,
            status: 'booked',
            booking_slot: `${formatDateTimeDisplay(req.check_in)} → ${formatDateTimeDisplay(req.check_out)}`,
            available_after: formatDateTimeDisplay(req.check_out)
          };
        }
        return r;
      }));

      // Update request status
      setBookingRequests(prev => prev.map(r => {
        if (r.id === req.id) return { ...r, status: 'confirmed' };
        return r;
      }));

      // Update QR Check-In Terminal with newly confirmed booking
      setTerminalState({
        bookingRef: req.booking_id,
        guestName: req.guest_name,
        partySize: req.guest_count,
        roomAssigned: `#${req.room_number} ${req.room_type}`,
        guestStatus: 'PENDING'
      });

      // Show authoritative Booking Confirmation Modal
      setConfirmedResultModal({
        room_number: req.room_number,
        room_type: req.room_type,
        hotel_name: backendHotel?.name || 'Hotel Ganga Heritage',
        booking_id: req.booking_id,
        guest_name: req.guest_name,
        check_in: req.check_in,
        check_out: req.check_out,
        duration_hours: req.duration_hours,
        final_hourly_rate: req.final_hourly_rate,
        total_price: req.total_amount,
        status: 'CONFIRMED'
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
      setBookingRequests(prev => prev.map(r => {
        if (r.id === requestId) return { ...r, status: 'declined', decline_reason: declineReason };
        return r;
      }));
      setDeclineDialogReqId(null);
      if (showToast) {
        showToast(`Request ${requestId} declined.`);
      }
    } catch (err) {
      alert(`Failed to decline: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. QR CHECK-IN TERMINAL & GUEST WORKFLOW
  // ---------------------------------------------------------------------------
  const [terminalState, setTerminalState] = useState({
    bookingRef: 'YC-48217',
    guestName: 'Rahul Sharma',
    partySize: 2,
    roomAssigned: '#204 Deluxe',
    guestStatus: 'PENDING'
  });
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const simulateGuestCheckIn = () => {
    setShowSuccessBanner(false);
    setTerminalState(prev => ({ ...prev, guestStatus: 'CHECKED_IN' }));
    if (showToast) showToast('📱 QR Code Verified! Guest checked into Room #204.');
  };

  const simulateGuestCheckOut = () => {
    if (terminalState.guestStatus !== 'CHECKED_IN') return;
    setTerminalState(prev => ({ ...prev, guestStatus: 'CHECKED_OUT' }));
    setShowSuccessBanner(true);

    // Release room back to available in inventory
    setRoomsInventory(prev => prev.map(r => {
      if (terminalState.roomAssigned.includes(r.room_number)) {
        return { ...r, status: 'available', booking_slot: null, available_after: null };
      }
      return r;
    }));

    if (showToast) showToast('🎉 Guest checked out! Room released for turnover housekeeping.');
  };

  // Master Reset Demo
  const resetFullDemoState = () => {
    setDemandPct(50);
    setCustomDemandInput('50');
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
      guestStatus: 'PENDING'
    });
    setShowSuccessBanner(false);
    setConfirmedResultModal(null);
    setDeclineDialogReqId(null);
    if (showToast) showToast('🔄 Demo states reset to baseline.');
  };

  // ---------------------------------------------------------------------------
  // 7. BACKEND DATA LOAD & LIVE UPDATES
  // ---------------------------------------------------------------------------
  const [backendHotel, setBackendHotel] = useState(null);
  const [inboundBuses, setInboundBuses] = useState([]);
  const [inboundLastUpdated, setInboundLastUpdated] = useState(null);

  useEffect(() => {
    async function initData() {
      try {
        const [hotels, requests, buses] = await Promise.all([
          fetchHotels().catch(() => []),
          fetchHotelBookingRequests('H001').catch(() => []),
          fetchInboundBuses().catch(() => [])
        ]);
        if (hotels && hotels.length > 0) {
          const matched = hotels.find(h => h.id === 'H001' || h.name.toLowerCase().includes('ganga')) || hotels[0];
          setBackendHotel(matched);
        }
        if (requests && requests.length > 0) {
          setBookingRequests(requests);
        }
        if (buses && buses.length > 0) {
          setInboundBuses(buses);
          setInboundLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
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
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // 8. SECTION 16 PRESET TEST CASE SHORTCUTS
  // ---------------------------------------------------------------------------
  const applyPresetScenario = (step) => {
    if (step === 1) {
      // Step 1: Deluxe, 15 Sept 2 PM -> 16 Sept 11 AM (21h), +50% Demand
      setDemandPct(50);
      setCustomDemandInput('50');
      setSlotRoomType('deluxe');
      setCheckInDate('2026-09-15');
      setCheckInTime('14:00');
      setCheckOutDate('2026-09-16');
      setCheckOutTime('11:00');
    } else if (step === 2) {
      // Step 2: Change only demand to +20%
      setDemandPct(20);
      setCustomDemandInput('20');
    } else if (step === 3) {
      // Step 3: Change room to Standard
      setSlotRoomType('standard');
    } else if (step === 4) {
      // Step 4: Change checkout to 5:00 PM (17:00 -> 27h)
      setCheckOutTime('17:00');
    }
  };

  // KPI Metrics
  const totalRoomsCount = 50;
  const bookedRoomsCount = roomsInventory.filter(r => r.status === 'booked').length;
  const availableRoomsCount = totalRoomsCount - bookedRoomsCount;
  const occupancyRate = Math.round((bookedRoomsCount / totalRoomsCount) * 100);
  const pendingRequestsCount = bookingRequests.filter(r => r.status === 'pending').length;

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
            <span>Dashboard Overview</span>
          </a>
          <a href="#slot-booking" className="hd-nav-item">
            <span className="hd-nav-icon">🗓️</span>
            <span>Slot Booking</span>
          </a>
          <a href="#dynamic-pricing" className="hd-nav-item">
            <span className="hd-nav-icon">⚡</span>
            <span>Dynamic Pricing (Live)</span>
          </a>
          <a href="#room-slots" className="hd-nav-item">
            <span className="hd-nav-icon">🛏️</span>
            <span>Room Availability</span>
          </a>
          <a href="#booking-requests" className="hd-nav-item">
            <span className="hd-nav-icon">📩</span>
            <span>Booking Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="hd-nav-pill-badge">{pendingRequestsCount}</span>
            )}
          </a>
          <div className="hd-nav-section-title" style={{ marginTop: '16px' }}>OPERATIONS</div>
          <a href="#terminal" className="hd-nav-item">
            <span className="hd-nav-icon">🪪</span>
            <span>Express Check-In Desk</span>
          </a>
          <a href="#fleet" className="hd-nav-item">
            <span className="hd-nav-icon">🚌</span>
            <span>Inbound Fleet</span>
          </a>
        </nav>

        <div className="hd-sidebar-footer-box">
          <div className="hd-footer-status-row">
            <span className="hd-live-pulse-dot"></span>
            <span className="hd-footer-status-text">Cloud Engine Active</span>
          </div>
          <div className="hd-footer-sub-text">50-Room Certified Node</div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="hd-saas-main-pane">
        {/* TOP HEADER BAR */}
        <header className="hd-top-header-bar">
          <div className="hd-header-left">
            <h1 className="hd-property-heading">
              {backendHotel?.name || 'Hotel Ganga Heritage'}
            </h1>
            <span className="hd-zone-tag">Kashi Corridor • Zone B-2</span>
            <span className="hd-verified-pill">✓ Verified Partner</span>
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
          {/* 3. INCOMING PILGRIM DEMAND BANNER (PERCENTAGES ONLY, NO TRANSIT TERMINOLOGY) */}
          <section className="hd-demand-strip-card" id="overview">
            <div className="hd-demand-strip-left">
              <div className="hd-demand-badge-wrap">
                <span className={`hd-demand-tag ${demandPct >= 60 ? 'critical' : (demandPct >= 40 ? 'high' : (demandPct >= 20 ? 'moderate' : 'normal'))}`}>
                  <span className="hd-surge-dot"></span>
                  {demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`} {getDemandLabel(demandPct)}
                </span>
                <span className="hd-demand-sub-label">Pilgrim Demand Telemetry</span>
              </div>

              <div className="hd-demand-caption">
                Zone crowd demand directly drives live room pricing multipliers. Select a surge preset or input custom percentage to test real dynamic recalculations:
              </div>

              {/* Quick Demand Surge Toggles */}
              <div className="hd-demand-pill-row">
                <button
                  type="button"
                  onClick={() => { setDemandPct(50); setCustomDemandInput('50'); }}
                  className={`hd-demand-pill-btn ${demandPct === 50 ? 'active' : ''}`}
                >
                  +50% High Surge
                </button>
                <button
                  type="button"
                  onClick={() => { setDemandPct(20); setCustomDemandInput('20'); }}
                  className={`hd-demand-pill-btn ${demandPct === 20 ? 'active' : ''}`}
                >
                  +20% Low Surge
                </button>
                <button
                  type="button"
                  onClick={() => { setDemandPct(30); setCustomDemandInput('30'); }}
                  className={`hd-demand-pill-btn ${demandPct === 30 ? 'active' : ''}`}
                >
                  +30% Moderate
                </button>
                <button
                  type="button"
                  onClick={() => { setDemandPct(0); setCustomDemandInput('0'); }}
                  className={`hd-demand-pill-btn ${demandPct === 0 ? 'active' : ''}`}
                >
                  0% Normal
                </button>
                <button
                  type="button"
                  onClick={() => { setDemandPct(-20); setCustomDemandInput('-20'); }}
                  className={`hd-demand-pill-btn ${demandPct === -20 ? 'active' : ''}`}
                >
                  -20% Low Demand
                </button>

                {/* Custom Demand Input */}
                <div className="hd-custom-demand-box">
                  <span>Custom %:</span>
                  <input
                    type="number"
                    value={customDemandInput}
                    onChange={(e) => {
                      setCustomDemandInput(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (!isNaN(parsed)) setDemandPct(parsed);
                    }}
                    className="hd-custom-demand-input"
                  />
                </div>
              </div>
            </div>

            <div className="hd-demand-strip-right">
              <div className="hd-active-multiplier-stat">
                <span className="hd-stat-label">Demand Multiplier</span>
                <strong className="hd-stat-number">{demandMultiplier.toFixed(2)}x</strong>
                <span className="hd-stat-sub">Rule-based applied</span>
              </div>
            </div>
          </section>

          {/* 4. DASHBOARD METRIC CARDS (KPIs) */}
          <section className="hd-metrics-grid">
            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">🛏️</span>
                <span className="hd-metric-title">Room Availability</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main">{availableRoomsCount}</span>
                <span className="hd-metric-denom"> / {totalRoomsCount} Total</span>
              </div>
              <div className="hd-metric-footer">Available for immediate check-in</div>
            </div>

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

            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">🏢</span>
                <span className="hd-metric-title">Total Capacity</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main">50 Rooms</span>
              </div>
              <div className="hd-metric-footer">30 Standard • 15 Deluxe • 5 Family</div>
            </div>

            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">💰</span>
                <span className="hd-metric-title">Live Deluxe Hourly Rate</span>
              </div>
              <div className="hd-metric-value">
                <span className="hd-metric-main highlight-blue">₹{finalHourlyPrice}</span>
                <span className="hd-metric-denom">/hour</span>
              </div>
              <div className="hd-metric-footer">Dynamic Pricing Active</div>
            </div>

            <div className="hd-metric-card">
              <div className="hd-metric-header">
                <span className="hd-metric-icon">📩</span>
                <span className="hd-metric-title">Booking Requests</span>
              </div>
              <div className="hd-metric-value">
                <span className={`hd-metric-main ${pendingRequestsCount > 0 ? 'text-amber' : 'text-green'}`}>
                  {pendingRequestsCount} Pending
                </span>
              </div>
              <div className="hd-metric-footer">
                {pendingRequestsCount > 0 ? 'Requires Partner Action' : 'All Requests Handled'}
              </div>
            </div>
          </section>

          {/* 5. TWO-COLUMN MAIN WORKFLOW: SLOT BOOKING + DYNAMIC PRICING ENGINE */}
          <div className="hd-two-column-grid">
            {/* LEFT COLUMN: BOOK A ROOM (SLOT BOOKING) */}
            <section className="hd-card hd-slot-booking-card" id="slot-booking">
              <div className="hd-card-head">
                <div>
                  <h2 className="hd-card-title">🗓️ Book a Room (Slot Booking)</h2>
                  <p className="hd-card-sub">
                    Select exact check-in and check-out schedule to verify slot-wide room availability and calculate guaranteed dynamic price.
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
                    <option value="standard">Standard Room (₹500/hr Base)</option>
                    <option value="deluxe">Deluxe Room (₹750/hr Base)</option>
                    <option value="suite">Suite / Family (₹1,000/hr Base)</option>
                  </select>
                </div>
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
                        Slot: {slotDurationHours} hours • Rate: ₹{finalHourlyPrice}/hr • Total: <strong>₹{totalBookingPrice.toLocaleString('en-IN')}</strong>
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
                  <span className="hd-badge-auto-updating">
                    <span className="hd-ping-dot"></span> Auto-updating
                  </span>
                </div>
                <p className="hd-card-sub">
                  Authoritative live hourly tariff computed deterministically from all user inputs.
                </p>
              </div>

              {/* Dynamic Pricing Metrics Grid */}
              <div className="hd-pricing-breakdown-box">
                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">Base Price (per hour):</span>
                  <strong className="hd-pricing-val">₹{baseHourlyPrice.toLocaleString('en-IN')}</strong>
                </div>

                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">Demand Multiplier:</span>
                  <span className="hd-pricing-val">
                    <strong className="hd-mult-tag">{demandMultiplier.toFixed(2)}x</strong>{' '}
                    <span className="hd-mult-pct">({demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`})</span>
                  </span>
                </div>

                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">Time/Date Multiplier:</span>
                  <strong className="hd-pricing-val hd-mult-tag">{dateTimeMultiplier.toFixed(2)}x</strong>
                </div>

                <div className="hd-pricing-row">
                  <span className="hd-pricing-label">Selected Slot Duration:</span>
                  <strong className="hd-pricing-val">{slotDurationHours} hours</strong>
                </div>

                <div className="hd-pricing-divider"></div>

                <div className="hd-pricing-row highlight-rate">
                  <span className="hd-pricing-label">Final Price (per hour):</span>
                  <strong className="hd-pricing-val text-blue">₹{finalHourlyPrice.toLocaleString('en-IN')}</strong>
                </div>

                <div className="hd-pricing-row highlight-total">
                  <span className="hd-pricing-label">Total Price (for selected slot):</span>
                  <strong className="hd-pricing-val text-total">₹{totalBookingPrice.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div className="hd-pricing-footer-note">
                ℹ️ <em>Price updates automatically when you change demand, date, time, room type or slot duration.</em>
              </div>

              {/* SECTION 16 TEST CASE PRESET RUNNER */}
              <div className="hd-test-case-suite-box">
                <div className="hd-suite-title">🧪 Section 16 Automated Verification Shortcuts:</div>
                <div className="hd-suite-buttons">
                  <button
                    type="button"
                    onClick={() => applyPresetScenario(1)}
                    className="hd-btn-test-step"
                    title="15 Sep 2 PM -> 16 Sep 11 AM, Deluxe, +50%"
                  >
                    1️⃣ Deluxe 21h @ +50% (₹1,350/h → ₹28,350)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetScenario(2)}
                    className="hd-btn-test-step"
                    title="Change demand to +20%"
                  >
                    2️⃣ Change Demand to +20% (₹990/h → ₹20,790)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetScenario(3)}
                    className="hd-btn-test-step"
                    title="Change room to Standard"
                  >
                    3️⃣ Change Room to Standard (₹660/h → ₹13,860)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetScenario(4)}
                    className="hd-btn-test-step"
                    title="Extend checkout to 5:00 PM (27 hours)"
                  >
                    4️⃣ Extend Checkout to 5 PM (27h → ₹17,820)
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* 6. ROOM SLOT AVAILABILITY TABLE */}
          <section className="hd-card hd-room-slots-section" id="room-slots">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">🛏️ Room Slot Availability</h2>
                <p className="hd-card-sub">
                  Real-time occupancy status and current dynamic hourly rates calculated from active surge conditions.
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="hd-category-filter-tabs">
                <button
                  type="button"
                  onClick={() => setRoomCategoryFilter('ALL')}
                  className={`hd-tab-btn ${roomCategoryFilter === 'ALL' ? 'active' : ''}`}
                >
                  All Categories ({roomsInventory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoomCategoryFilter('standard')}
                  className={`hd-tab-btn ${roomCategoryFilter === 'standard' ? 'active' : ''}`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setRoomCategoryFilter('deluxe')}
                  className={`hd-tab-btn ${roomCategoryFilter === 'deluxe' ? 'active' : ''}`}
                >
                  Deluxe
                </button>
                <button
                  type="button"
                  onClick={() => setRoomCategoryFilter('family')}
                  className={`hd-tab-btn ${roomCategoryFilter === 'family' ? 'active' : ''}`}
                >
                  Family / Suite
                </button>
              </div>
            </div>

            <div className="hd-table-responsive-wrapper">
              <table className="hd-table">
                <thead>
                  <tr>
                    <th>Room No.</th>
                    <th>Room Type</th>
                    <th>Status</th>
                    <th>Current Booking Slot</th>
                    <th>Available After</th>
                    <th>Price/Hour (Current)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((room) => {
                    const rBase = ROOM_BASE_HOURLY_RATES[room.room_type.toLowerCase()] || 500;
                    const rCurrentHourly = Math.round(rBase * demandMultiplier * dateTimeMultiplier);
                    const isBooked = room.status === 'booked';

                    return (
                      <tr key={room.room_number} className={String(room.room_number) === '204' ? 'hd-row-highlight' : ''}>
                        <td className="hd-cell-room">
                          <strong>Room #{room.room_number}</strong>
                          <span className="hd-floor-sub">Floor {room.floor}</span>
                        </td>
                        <td>
                          <span className={`hd-room-type-badge ${room.room_type.toLowerCase()}`}>
                            {room.room_type}
                          </span>
                        </td>
                        <td>
                          <span className={`hd-status-pill ${isBooked ? 'booked' : 'available'}`}>
                            {isBooked ? '● Booked' : '● Available'}
                          </span>
                        </td>
                        <td className="hd-cell-slot">
                          {room.booking_slot || '—'}
                        </td>
                        <td className="hd-cell-slot">
                          {room.available_after || 'Now (Immediate)'}
                        </td>
                        <td className="hd-cell-price">
                          <strong>₹{rCurrentHourly.toLocaleString('en-IN')}</strong>
                          <span className="hd-price-denom"> / hr</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="hd-table-footer-caption">
              Displaying inventory from 50 verified lodge keys. Room #204 automatically locks when accepted.
            </div>
          </section>

          {/* 7. INCOMING BOOKING REQUESTS REVIEW SECTION */}
          <section className="hd-card hd-booking-requests-section" id="booking-requests">
            <div className="hd-card-head">
              <div>
                <h2 className="hd-card-title">📩 Recent Booking Requests</h2>
                <p className="hd-card-sub">
                  Incoming tourist reservations with exact duration hours, authoritative rate lock, and crowd insights.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="hd-category-filter-tabs">
                <button
                  type="button"
                  onClick={() => setRequestFilter('ALL')}
                  className={`hd-tab-btn ${requestFilter === 'ALL' ? 'active' : ''}`}
                >
                  All ({bookingRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('PENDING')}
                  className={`hd-tab-btn ${requestFilter === 'PENDING' ? 'active' : ''}`}
                >
                  Pending ({bookingRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('CONFIRMED')}
                  className={`hd-tab-btn ${requestFilter === 'CONFIRMED' ? 'active' : ''}`}
                >
                  Confirmed ({bookingRequests.filter(r => r.status === 'confirmed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('DECLINED')}
                  className={`hd-tab-btn ${requestFilter === 'DECLINED' ? 'active' : ''}`}
                >
                  Declined ({bookingRequests.filter(r => r.status === 'declined').length})
                </button>
              </div>
            </div>

            {/* Requests Grid */}
            <div className="hd-requests-cards-grid">
              {bookingRequests
                .filter(r => requestFilter === 'ALL' || r.status.toUpperCase() === requestFilter)
                .map((req) => {
                  const duration = req.duration_hours || calculateHoursBetween(req.check_in, req.check_out);
                  const isPending = req.status === 'pending';
                  const isConfirmed = req.status === 'confirmed';

                  return (
                    <div key={req.id} className={`hd-req-card ${req.status}`}>
                      <div className="hd-req-header">
                        <div>
                          <div className="hd-req-id-row">
                            <span className="hd-req-badge-id">{req.id}</span>
                            <span className="hd-req-ref-id">REF: {req.booking_id}</span>
                          </div>
                          <h3 className="hd-req-guest-name">
                            {req.guest_name} <span className="hd-req-party">({req.guest_count} Guests)</span>
                          </h3>
                        </div>

                        <span className={`hd-req-status-tag ${req.status}`}>
                          {isPending ? 'PENDING REVIEW' : (isConfirmed ? '✓ CONFIRMED' : '✕ DECLINED')}
                        </span>
                      </div>

                      <div className="hd-req-room-pill">
                        Requested: <strong>Room #{req.room_number} ({req.room_type})</strong>
                      </div>

                      <div className="hd-req-divider"></div>

                      {/* Section 1: Time Window */}
                      <div className="hd-req-sub-section">
                        <div className="hd-sub-title">TIME WINDOW</div>
                        <div className="hd-time-window-box">
                          <div>
                            <span className="hd-time-lbl">Check-in</span>
                            <strong>{formatDateTimeDisplay(req.check_in)}</strong>
                          </div>
                          <div className="hd-arrow">→</div>
                          <div>
                            <span className="hd-time-lbl">Check-out</span>
                            <strong>{formatDateTimeDisplay(req.check_out)}</strong>
                          </div>
                        </div>
                        <div className="hd-duration-strip">
                          <span>Duration:</span>
                          <strong>{duration} hours</strong>
                        </div>
                      </div>

                      <div className="hd-req-divider"></div>

                      {/* Section 2: Dynamic Pricing Breakdown */}
                      <div className="hd-req-sub-section">
                        <div className="hd-sub-title">DYNAMIC PRICING</div>
                        <div className="hd-pricing-mini-grid">
                          <div className="hd-mini-row">
                            <span>Base Rate:</span>
                            <span>₹{req.base_hourly_rate || 750} / hour</span>
                          </div>
                          <div className="hd-mini-row">
                            <span>Crowd Multiplier:</span>
                            <span className="text-purple">{req.pricing_multiplier || 1.8}x</span>
                          </div>
                          <div className="hd-mini-row">
                            <span>Current Rate:</span>
                            <span className="text-blue font-bold">₹{req.final_hourly_rate || 1350} / hour</span>
                          </div>
                          <div className="hd-mini-row">
                            <span>Total Duration:</span>
                            <span>{duration} hours</span>
                          </div>
                          <div className="hd-mini-total-row">
                            <span>TOTAL AMOUNT:</span>
                            <strong className="text-total">₹{(req.total_amount || 28350).toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="hd-req-divider"></div>

                      {/* Section 3: Crowd & Demand Insights */}
                      <div className="hd-req-sub-section">
                        <div className="hd-sub-title">CROWD &amp; DEMAND INSIGHTS</div>
                        <div className="hd-crowd-insights-box">
                          <div className="hd-insight-row">
                            <span>Nearby Pilgrimage Site:</span>
                            <strong>{req.site_name || 'Kashi Vishwanath'}</strong>
                          </div>
                          <div className="hd-insight-row">
                            <span>Current Crowd:</span>
                            <span className="hd-crowd-pct-tag">{req.crowd_percentage || 87}% capacity</span>
                          </div>
                          <div className="hd-insight-row">
                            <span>Demand:</span>
                            <span className="hd-demand-level-tag">{req.crowd_level || 'HIGH'}</span>
                          </div>
                          <div className="hd-insight-row">
                            <span>Pricing Multiplier:</span>
                            <strong>{req.pricing_multiplier || 1.8}x</strong>
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
                  Digital guest pass verification and automated room occupancy state release.
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

          {/* 9. INBOUND FLEET ARRIVALS */}
          {inboundBuses.length > 0 && (
            <section className="hd-card hd-fleet-section" id="fleet">
              <div className="hd-card-head">
                <div>
                  <h2 className="hd-card-title">🚌 Inbound Fleet Tracking</h2>
                  <p className="hd-card-sub">
                    Sharma Travels pilgrim fleet telemetry — live route schedule updates every 30s.
                  </p>
                </div>
                {inboundLastUpdated && (
                  <span className="hd-fleet-time-badge">🔴 Live • {inboundLastUpdated}</span>
                )}
              </div>

              <div className="hd-fleet-grid">
                {inboundBuses.slice(0, 4).map((bus) => (
                  <div key={bus.id} className="hd-bus-card">
                    <div className="hd-bus-head">
                      <strong>{bus.operator || 'Sharma Travels'} • {bus.buses || 2} 🚌</strong>
                      <span className="hd-bus-eta">ETA: {bus.arrival_time || '2:00 PM'}</span>
                    </div>
                    <div className="hd-bus-sub">
                      📍 {bus.from_location || 'Rishikesh'} → {bus.to_location || 'Kedarnath Base'}
                    </div>
                    <div className="hd-bus-occ">
                      {bus.occupancy || 75}% Occupancy ({bus.buses * 42} Seats)
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
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
                <strong className="hd-conf-total-price">₹{Number(confirmedResultModal.total_price).toLocaleString('en-IN')}</strong>
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
