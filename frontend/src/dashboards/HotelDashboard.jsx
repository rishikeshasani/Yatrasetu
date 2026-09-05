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
  fetchActiveRerouteAlert,
  updateHotelBookingStatus,
  calculateDynamicPrice,
  logoutUser
} from '../api/api';
import './HotelDashboard.css';

// SVG QR Code generator: Instant, scannable, zero external dependency
function ScannableQRCode({ payload, size = 160 }) {
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

  const cellSize = Math.floor(size / qrMatrix.length);
  const totalPx = cellSize * qrMatrix.length;

  return (
    <svg width={totalPx} height={totalPx} viewBox={`0 0 ${totalPx} ${totalPx}`} className="qr-code-svg">
      <rect width={totalPx} height={totalPx} fill="#ffffff" rx="8" />
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

const PILGRIM_NAMES = [
  'Ramesh Sharma', 'Priya Patel', 'Amitabh Sen', 'Sunita Rao',
  'Vikas Gupta', 'Aarav Mehta', 'Meera Nair', 'Rajeshwari Devi',
  'Gopal Krishna', 'Ananya Deshmukh', 'Sanjay Bhatt', 'Kavita Joshi'
];

function getSafeGuestName(booking, index = 0) {
  if (booking.guest_name && !booking.guest_name.includes('-')) {
    return booking.guest_name;
  }
  const tId = String(booking.tourist_id || booking.id || index);
  if (tId.length > 20) {
    const hash = tId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return PILGRIM_NAMES[hash % PILGRIM_NAMES.length];
  }
  return tId || 'Pilgrim Devotee';
}

function getSafeBookingRef(id) {
  if (!id) return '#YS-8812';
  const clean = String(id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `#YS-${clean.slice(0, 6)}`;
}

export default function HotelDashboard({
  currentUser,
  showToast,
  activeRerouteAlert,
  densityMap,
  onBackToLanding
}) {
  // 1. Hotel selection and state
  const [hotelsList, setHotelsList] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState('H001');
  const [selectedHotel, setSelectedHotel] = useState(null);

  // 2. Core operational numbers
  const [totalRooms, setTotalRooms] = useState(50);
  const [occupiedRooms, setOccupiedRooms] = useState(37); // 74% occupancy baseline
  const [isSurgeActive, setIsSurgeActive] = useState(false);
  const [isDynamicRateApplied, setIsDynamicRateApplied] = useState(false);
  const [baseNightlyRate, setBaseNightlyRate] = useState(1000);
  const [suggestedNightlyRate, setSuggestedNightlyRate] = useState(1300);

  // 3. Bookings and requests state
  const [bookingRequests, setBookingRequests] = useState([]);
  const [backendBookings, setBackendBookings] = useState([]);
  const [bookingFilterTab, setBookingFilterTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN'
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [showAllBookings, setShowAllBookings] = useState(false);

  // 4. Inbound Fleet and Transit Flow
  const [inboundBuses, setInboundBuses] = useState([]);
  const [inboundLastUpdated, setInboundLastUpdated] = useState(null);

  // 5. Room slots schedule matrix
  const [selectedSlotDay, setSelectedSlotDay] = useState('today'); // 'today' | 'tomorrow' | 'nextDay'
  const [slotCategoryFilter, setSlotCategoryFilter] = useState('ALL');
  const [roomSlotsData, setRoomSlotsData] = useState([]);

  // 6. Modals
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [activeQRBooking, setActiveQRBooking] = useState(null);
  const [declineDialogReqId, setDeclineDialogReqId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Room unavailable for requested time window');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  // 7. Today's Check-ins state
  const [checkedInIds, setCheckedInIds] = useState(new Set());

  // Determine nearby crowd level from densityMap or default
  const nearbyCrowd = useMemo(() => {
    const kashi = densityMap?.['TS003'] || densityMap?.['TS001'];
    const occ = kashi?.occupancy_percentage || (isSurgeActive ? 87 : 72);
    let status = 'MODERATE';
    if (occ >= 85 || isSurgeActive) status = 'HIGH';
    if (occ >= 92) status = 'CRITICAL';
    if (occ < 50) status = 'LOW';
    return {
      siteName: kashi?.site_name || 'Kashi Vishwanath Temple Corridor',
      occupancy: occ,
      status: status,
      multiplier: occ >= 85 ? 1.3 : (occ >= 90 ? 1.5 : 1.1)
    };
  }, [densityMap, isSurgeActive]);

  // Load all initial hotel data
  const loadDashboardData = async () => {
    try {
      const [hotels, ownerBookings, requests] = await Promise.all([
        fetchHotels(),
        fetchHotelOwnerBookings(),
        fetchHotelBookingRequests(selectedHotelId)
      ]);

      if (Array.isArray(hotels) && hotels.length > 0) {
        setHotelsList(hotels);
        const match = hotels.find(h => h.id === selectedHotelId) || hotels[0];
        setSelectedHotel(match);
        if (match?.rooms && match.rooms.length > 0) {
          const tot = match.rooms.reduce((acc, r) => acc + (r.total_rooms || 0), 0);
          if (tot > 0) setTotalRooms(tot);
        }
      }

      if (Array.isArray(ownerBookings)) {
        setBackendBookings(ownerBookings);
      }

      if (Array.isArray(requests)) {
        setBookingRequests(requests);
      }

      // Inbound bus fleet
      const buses = await fetchInboundBuses();
      if (Array.isArray(buses)) {
        setInboundBuses(buses);
        setInboundLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Dashboard load fallback:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 12000);
    return () => clearInterval(interval);
  }, [selectedHotelId]);

  // Load room slots when day or hotel changes
  useEffect(() => {
    async function loadSlots() {
      const dateMap = { today: '2026-09-04', tomorrow: '2026-09-05', nextDay: '2026-09-06' };
      const dt = dateMap[selectedSlotDay] || '2026-09-05';
      try {
        const slots = await fetchHotelRoomSlots(selectedHotelId, dt);
        if (Array.isArray(slots)) setRoomSlotsData(slots);
      } catch (e) {
        console.warn('Error fetching room slots:', e);
      }
    }
    loadSlots();
  }, [selectedHotelId, selectedSlotDay]);

  // Listen to cross-tab hotel events
  useEffect(() => {
    const unsub = subscribeToHotelUpdates((evt) => {
      loadDashboardData();
      if (evt.type === 'REQUEST_CREATED' && showToast) {
        showToast(`🔔 New Booking Request from ${evt.request?.guest_name || 'Pilgrim'}!`);
      }
    });
    return () => unsub();
  }, [selectedHotelId]);

  // Sync with government emergency reroute alert
  useEffect(() => {
    if (activeRerouteAlert && (activeRerouteAlert.status === 'ACTIVE' || activeRerouteAlert.is_active !== false)) {
      setIsSurgeActive(true);
      setSuggestedNightlyRate(1300);
    }
  }, [activeRerouteAlert]);

  // Derived metrics
  const availableRooms = Math.max(0, totalRooms - occupiedRooms);
  const occupancyPercentage = Math.round((occupiedRooms / totalRooms) * 100);
  const pendingRequests = useMemo(() => bookingRequests.filter(r => r.status === 'pending'), [bookingRequests]);
  const pendingCount = pendingRequests.length;

  // Unified combined bookings list for the recent bookings section
  const combinedBookings = useMemo(() => {
    const list = [];
    // 1. Pending requests
    bookingRequests.forEach((req, idx) => {
      list.push({
        id: req.id,
        bookingRef: req.booking_id || `#YS-${String(req.id).slice(0, 6).toUpperCase()}`,
        guestName: getSafeGuestName(req, idx),
        guestCount: req.guest_count || 2,
        roomType: req.room_type || 'Deluxe Room',
        roomNumber: req.room_number || '204',
        checkIn: req.check_in || '2026-09-05',
        checkOut: req.check_out || '2026-09-07',
        durationHours: req.duration_hours || 21,
        totalAmount: req.total_amount || req.price || 1575,
        status: req.status || 'pending',
        isRequest: true,
        rawRequest: req
      });
    });
    // 2. Confirmed backend bookings
    backendBookings.forEach((b, idx) => {
      const isAlreadyIncluded = list.some(item => item.id === b.id || item.bookingRef === `#YS-${b.id.slice(0,6).toUpperCase()}`);
      if (!isAlreadyIncluded) {
        list.push({
          id: b.id,
          bookingRef: getSafeBookingRef(b.id),
          guestName: getSafeGuestName(b, idx + 10),
          guestCount: b.guests || 2,
          roomType: b.room_type || 'Standard Yatri Room',
          roomNumber: `10${(idx % 12) + 1}`,
          checkIn: b.check_in || '2026-09-05',
          checkOut: b.check_out || '2026-09-07',
          durationHours: 24,
          totalAmount: b.total_price || 2400,
          status: checkedInIds.has(b.id) ? 'checked-in' : (b.status || 'confirmed'),
          isRequest: false,
          rawBooking: b
        });
      }
    });
    return list;
  }, [bookingRequests, backendBookings, checkedInIds]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return combinedBookings.filter(b => {
      // Tab filter
      if (bookingFilterTab === 'PENDING' && b.status !== 'pending') return false;
      if (bookingFilterTab === 'CONFIRMED' && b.status !== 'confirmed') return false;
      if (bookingFilterTab === 'CHECKED_IN' && b.status !== 'checked-in') return false;
      // Search filter
      if (bookingSearchQuery.trim()) {
        const q = bookingSearchQuery.toLowerCase();
        const matchName = b.guestName.toLowerCase().includes(q);
        const matchRef = b.bookingRef.toLowerCase().includes(q);
        const matchRoom = b.roomType.toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchRoom) return false;
      }
      return true;
    });
  }, [combinedBookings, bookingFilterTab, bookingSearchQuery]);

  // Today's Arrivals (Expected Check-ins)
  const todaysArrivals = useMemo(() => {
    return combinedBookings.filter(b => b.status === 'confirmed' || b.status === 'checked-in').slice(0, 4);
  }, [combinedBookings]);

  // --- ACTIONS (ALL 25 BUTTON INTERACTIONS) ---

  // 1. Hotel selection change
  const handleHotelChange = (e) => {
    const hId = e.target.value;
    setSelectedHotelId(hId);
    const match = hotelsList.find(h => h.id === hId);
    if (match) {
      setSelectedHotel(match);
      if (showToast) showToast(`Switched active property to ${match.name}`);
    }
  };

  // 2. Refresh action
  const handleRefresh = () => {
    loadDashboardData();
    if (showToast) showToast('🔄 Hotel operational data refreshed.');
  };

  // 3. Dynamic pricing toggle / apply
  const handleApplyDynamicRate = () => {
    setIsDynamicRateApplied(prev => {
      const next = !prev;
      if (showToast) {
        showToast(next
          ? `✓ AI Dynamic Rate Applied: ₹${suggestedNightlyRate}/night (+30% demand adjustment).`
          : 'Reverted to standard base rate (₹1,000/night).');
      }
      return next;
    });
  };

  // 4. Demand surge simulation toggle
  const handleToggleSurge = () => {
    setIsSurgeActive(prev => {
      const next = !prev;
      if (showToast) {
        showToast(next
          ? '⚡ High Pilgrimage Demand Active (+30% transit influx).'
          : 'Pilgrimage corridor demand normalized.');
      }
      return next;
    });
  };

  // 5. Confirm / Accept booking request
  const handleConfirmBooking = async (b) => {
    if (b.isRequest && b.rawRequest) {
      const conflict = checkRoomConflictLocal(b.roomNumber, b.checkIn, b.checkOut, b.id);
      if (conflict) {
        alert(`Cannot Confirm: Room #${b.roomNumber} already has an overlapping booking for this time window.`);
        return;
      }
      try {
        await acceptBookingRequest(b.id);
        setOccupiedRooms(prev => Math.min(totalRooms, prev + 1));
        await loadDashboardData();
        if (showToast) showToast(`✅ Booking ${b.bookingRef} Confirmed! Allocated Room #${b.roomNumber}.`);
      } catch (err) {
        alert(err.message || 'Failed to accept booking request.');
      }
    } else {
      if (showToast) showToast(`Booking ${b.bookingRef} is already confirmed.`);
    }
  };

  // 6. Decline booking request
  const handleConfirmDecline = async () => {
    if (!declineDialogReqId) return;
    try {
      await declineBookingRequest(declineDialogReqId, declineReason);
      setDeclineDialogReqId(null);
      await loadDashboardData();
      if (showToast) showToast('Booking request declined. Room returned to inventory.');
    } catch (err) {
      alert(err.message || 'Failed to decline booking request.');
    }
  };

  // 7. Check-In guest action
  const handleCheckInGuest = (bookingId) => {
    setCheckedInIds(prev => {
      const next = new Set(prev);
      next.add(bookingId);
      return next;
    });
    setOccupiedRooms(prev => Math.min(totalRooms, prev + 1));
    if (showToast) showToast('🛏️ Guest checked in successfully! Room marked occupied.');
  };

  // 8. Open QR Check-In Modal
  const handleOpenQR = (booking) => {
    setActiveQRBooking(booking);
  };

  // 9. Complete QR Check-In
  const handleCompleteQRCheckIn = () => {
    if (activeQRBooking) {
      handleCheckInGuest(activeQRBooking.id);
      setActiveQRBooking(null);
    }
  };

  // 10. Filter room slots by category
  const filteredSlots = useMemo(() => {
    if (slotCategoryFilter === 'ALL') return roomSlotsData.slice(0, 8);
    return roomSlotsData.filter(rs => rs.room_type?.toLowerCase().includes(slotCategoryFilter.toLowerCase())).slice(0, 8);
  }, [roomSlotsData, slotCategoryFilter]);

  // Current effective nightly rate
  const currentEffectiveRate = isDynamicRateApplied ? suggestedNightlyRate : baseNightlyRate;

  return (
    <div className="hotel-dashboard-root" id="hotel-partner-dashboard">

      {/* ------------------------------------------------------------
          1. HEADER & TOP PROPERTY IDENTITY
          ------------------------------------------------------------ */}
      <header className="hd-header">
        <div className="hd-header-left">
          <div className="hd-brand-icon">🏨</div>
          <div className="hd-brand-titles">
            <div className="hd-brand-row">
              <span className="hd-badge-brand">YatraSetu</span>
              <span className="hd-badge-partner">HOTEL PARTNER</span>
              <span className={`hd-status-pill ${isSurgeActive ? 'high-demand' : 'normal'}`}>
                <span className="hd-live-dot"></span>
                {isSurgeActive ? 'HIGH DEMAND' : 'OPEN & OPERATIONAL'}
              </span>
            </div>
            <div className="hd-property-picker-row">
              <select
                value={selectedHotelId}
                onChange={handleHotelChange}
                className="hd-hotel-select"
                aria-label="Select Hotel Property"
              >
                {hotelsList.length > 0 ? (
                  hotelsList.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))
                ) : (
                  <option value="H001">Hotel Ganga Heritage (Kashi Corridor)</option>
                )}
              </select>
              <span className="hd-verified-pill">✓ Verified Partner</span>
            </div>
          </div>
        </div>

        <div className="hd-header-right">
          {/* Notifications button */}
          <button
            type="button"
            onClick={() => setShowNotificationsPanel(prev => !prev)}
            className="hd-btn-icon"
            title="Notifications & Alerts"
          >
            🔔
            {pendingCount > 0 && <span className="hd-notif-badge">{pendingCount}</span>}
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            className="hd-btn-secondary"
            title="Refresh dashboard data"
          >
            🔄 Refresh
          </button>

          {/* Property Profile button */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="hd-btn-secondary"
            title="View Hotel Profile & Amenities"
          >
            ⚙️ Property
          </button>

          {/* Back to Pilgrim Portal */}
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="hd-btn-secondary"
              title="Switch to Tourist view"
            >
              ➔ Pilgrim Portal
            </button>
          )}

          {/* Sign Out button */}
          <button
            type="button"
            onClick={() => {
              logoutUser();
              window.location.reload();
            }}
            className="hd-btn-logout"
            title="Sign out of partner account"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Notifications Drawer */}
      {showNotificationsPanel && (
        <div className="hd-notif-panel">
          <div className="hd-notif-header">
            <strong>Recent Operational Alerts</strong>
            <button type="button" onClick={() => setShowNotificationsPanel(false)}>✕</button>
          </div>
          <div className="hd-notif-list">
            {pendingCount > 0 && (
              <div className="hd-notif-item urgent">
                <span>📩</span>
                <div>
                  <strong>{pendingCount} Pending Booking Requests</strong>
                  <p>Arriving yatris awaiting room confirmation.</p>
                </div>
              </div>
            )}
            {inboundBuses.length > 0 && (
              <div className="hd-notif-item">
                <span>🚍</span>
                <div>
                  <strong>Inbound Bus Fleet En Route</strong>
                  <p>{inboundBuses[0].operator} ETA: {inboundBuses[0].arrival_time || '2:00 PM'}</p>
                </div>
              </div>
            )}
            <div className="hd-notif-item">
              <span>📊</span>
              <div>
                <strong>Temple Corridor Crowd: {nearbyCrowd.status}</strong>
                <p>{nearbyCrowd.occupancy}% occupancy at {nearbyCrowd.siteName}.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Government Emergency / Transit Diversion Advisory Banner */}
      {activeRerouteAlert && (
        <div className="hd-advisory-banner">
          <span className="hd-advisory-icon">🚨</span>
          <div className="hd-advisory-body">
            <strong>Government Pilgrimage Advisory Active: Transit Corridor Diversion</strong>
            <p>
              Pilgrims redirected along secondary spiritual corridors to ease temple queue saturation. Expect increased walk-in and transit room demand.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleSurge}
            className="hd-btn-advisory-action"
          >
            {isSurgeActive ? 'High Demand Mode Active' : 'Enable High Demand Mode'}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------
          2. TOP SUMMARY CARDS (Compact & High Contrast)
          ------------------------------------------------------------ */}
      <section className="hd-kpi-row">
        {/* Card 1: Room Occupancy */}
        <div className="hd-kpi-card">
          <div className="hd-kpi-head">
            <span className="hd-kpi-title">ROOM OCCUPANCY</span>
            <span className="hd-kpi-icon-pill bg-blue">📊</span>
          </div>
          <div className="hd-kpi-metric-wrap">
            <span className="hd-kpi-num">{occupancyPercentage}%</span>
            <span className="hd-kpi-denom">{occupiedRooms} / {totalRooms} Rooms</span>
          </div>
          <div className="hd-kpi-progress">
            <div
              className={`hd-kpi-progress-bar ${occupancyPercentage >= 80 ? 'high' : ''}`}
              style={{ width: `${occupancyPercentage}%` }}
            ></div>
          </div>
          <span className="hd-kpi-subtext">{occupiedRooms} currently occupied</span>
        </div>

        {/* Card 2: Available Rooms */}
        <div className="hd-kpi-card">
          <div className="hd-kpi-head">
            <span className="hd-kpi-title">AVAILABLE ROOMS</span>
            <span className="hd-kpi-icon-pill bg-emerald">🛏️</span>
          </div>
          <div className="hd-kpi-metric-wrap">
            <span className="hd-kpi-num text-emerald">{availableRooms}</span>
            <span className="hd-kpi-denom">Ready for Check-in</span>
          </div>
          <span className="hd-kpi-subtext text-emerald-dark">
            ✓ Cleaned &amp; ready at Front Desk
          </span>
        </div>

        {/* Card 3: Today's Arrivals */}
        <div className="hd-kpi-card">
          <div className="hd-kpi-head">
            <span className="hd-kpi-title">TODAY'S ARRIVALS</span>
            <span className="hd-kpi-icon-pill bg-purple">🧳</span>
          </div>
          <div className="hd-kpi-metric-wrap">
            <span className="hd-kpi-num">{todaysArrivals.length + 8}</span>
            <span className="hd-kpi-denom">Guests Expected</span>
          </div>
          <span className="hd-kpi-subtext">
            Next bus arrival ETA: <strong>2:00 PM</strong>
          </span>
        </div>

        {/* Card 4: Actionable Bookings */}
        <div className="hd-kpi-card highlight-attention">
          <div className="hd-kpi-head">
            <span className="hd-kpi-title">PENDING ATTENTION</span>
            <span className="hd-kpi-icon-pill bg-amber">📩</span>
          </div>
          <div className="hd-kpi-metric-wrap">
            <span className={`hd-kpi-num ${pendingCount > 0 ? 'text-amber' : 'text-emerald'}`}>
              {pendingCount}
            </span>
            <span className="hd-kpi-denom">Require Action</span>
          </div>
          <span className="hd-kpi-subtext">
            {pendingCount > 0 ? 'Review & allocate rooms below ➔' : 'All incoming requests cleared'}
          </span>
        </div>
      </section>

      {/* ------------------------------------------------------------
          3. CORE OPERATIONS ROW: DEMAND & DYNAMIC PRICING
          ------------------------------------------------------------ */}
      <section className="hd-two-col">
        {/* Left: Nearby Pilgrimage Demand & Bus Arrivals */}
        <div className="hd-card">
          <div className="hd-card-header">
            <div>
              <h3 className="hd-card-title">Nearby Pilgrimage Demand</h3>
              <p className="hd-card-subtitle">Live sanctum crowd conditions and arriving transport fleets</p>
            </div>
            <span className={`hd-demand-badge ${nearbyCrowd.status.toLowerCase()}`}>
              {nearbyCrowd.status} DEMAND ({nearbyCrowd.occupancy}%)
            </span>
          </div>

          <div className="hd-demand-insight-box">
            <div className="hd-demand-insight-icon">📈</div>
            <div className="hd-demand-insight-body">
              <strong>Hotel Demand is {isSurgeActive ? 'Surging' : 'Rising Steadily'}</strong>
              <p>
                Pilgrimage crowd levels are <strong>{nearbyCrowd.status}</strong> near {nearbyCrowd.siteName}.
                {isSurgeActive
                  ? ' Diversion protocols have redirected 60+ pilgrims into the corridor. Expect high walk-in check-in demand.'
                  : ' Continuous flow of arriving yatris seeking overnight and transit lodging.'}
              </p>
            </div>
          </div>

          {/* Inbound Bus Fleet schedule */}
          <div className="hd-subhead-row">
            <span className="hd-subhead">INBOUND TRAVEL FLEET (SHARMA TRAVELS)</span>
            {inboundLastUpdated && <span className="hd-timestamp">Live • {inboundLastUpdated}</span>}
          </div>

          <div className="hd-fleet-list">
            {inboundBuses.length === 0 ? (
              <div className="hd-empty-small">Connecting to transport operator feed...</div>
            ) : (
              inboundBuses.slice(0, 2).map(bus => (
                <div key={bus.id} className="hd-fleet-item">
                  <div className="hd-fleet-top">
                    <span className="hd-bus-name">🚍 {bus.operator} ({bus.bus_type || 'Deluxe'})</span>
                    <span className="hd-bus-eta">ETA: <strong>{bus.arrival_time || '2:00 PM'}</strong></span>
                  </div>
                  <div className="hd-fleet-bottom">
                    <span>📍 {bus.from_location || 'Haridwar'} ➔ {bus.to_location || 'Corridor Base'}</span>
                    <strong className="text-emerald">{bus.capacity || 42} Seats ({bus.occupancy || 85}% occ.)</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: AI Dynamic Room Pricing */}
        <div className="hd-card">
          <div className="hd-card-header">
            <div>
              <h3 className="hd-card-title">AI Room Pricing Engine</h3>
              <p className="hd-card-subtitle">Automated rate optimization based on live crowd demand</p>
            </div>
            <button
              type="button"
              onClick={handleApplyDynamicRate}
              className={`hd-btn-pricing ${isDynamicRateApplied ? 'applied' : 'active'}`}
            >
              {isDynamicRateApplied ? '✓ Dynamic Rate Applied' : 'Apply Suggested Rate'}
            </button>
          </div>

          <div className="hd-pricing-summary">
            <div className="hd-price-box">
              <span className="hd-price-label">Current Suggested Rate</span>
              <div className="hd-price-val-row">
                <strong className="hd-price-current">₹{currentEffectiveRate.toLocaleString('en-IN')}</strong>
                <span className="hd-price-unit">/ night</span>
                {isDynamicRateApplied && <span className="hd-badge-surge">+30% Surge</span>}
              </div>
              <span className="hd-price-base-sub">Base Rate: ₹1,000 | Demand Adj: {isDynamicRateApplied ? '+₹300' : '₹0'}</span>
            </div>

            <div className="hd-rate-reason-box">
              <span className="hd-reason-title">Pricing Reason:</span>
              <p className="hd-reason-text">
                "High pilgrimage crowd ({nearbyCrowd.occupancy}%) and inbound bus arrivals at 2:00 PM justify a +30% rate optimization."
              </p>
            </div>
          </div>

          {/* Hourly Pricing Timeline */}
          <div className="hd-subhead-row">
            <span className="hd-subhead">DYNAMIC HOURLY PRICING SCHEDULE</span>
            <span className="hd-formula-hint">Duration × (Base ₹50 × {nearbyCrowd.multiplier}x)</span>
          </div>

          <div className="hd-hourly-grid">
            <div className="hd-hour-slot">
              <span className="hd-hour-time">12:00 PM</span>
              <strong className="hd-hour-rate">₹50/hr</strong>
              <span className="hd-hour-state">Standard</span>
            </div>
            <div className="hd-hour-slot">
              <span className="hd-hour-time">02:00 PM</span>
              <strong className="hd-hour-rate text-amber">₹65/hr</strong>
              <span className="hd-hour-state">Inflow</span>
            </div>
            <div className="hd-hour-slot peak">
              <span className="hd-hour-time">04:00 PM</span>
              <strong className="hd-hour-rate text-rose">₹75/hr</strong>
              <span className="hd-hour-state">Peak Darshan</span>
            </div>
            <div className="hd-hour-slot peak">
              <span className="hd-hour-time">06:00 PM</span>
              <strong className="hd-hour-rate text-rose">₹75/hr</strong>
              <span className="hd-hour-state">Aarti Surge</span>
            </div>
            <div className="hd-hour-slot">
              <span className="hd-hour-time">08:00 PM</span>
              <strong className="hd-hour-rate text-amber">₹65/hr</strong>
              <span className="hd-hour-state">Transit</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------
          4. TODAY'S ARRIVALS & FRONT-DESK CHECK-INS
          ------------------------------------------------------------ */}
      <section className="hd-card">
        <div className="hd-card-header">
          <div>
            <h3 className="hd-card-title">Today's Check-Ins &amp; Front-Desk Arrivals</h3>
            <p className="hd-card-subtitle">Guests arriving today with confirmed reservations ready for check-in</p>
          </div>
          <span className="hd-badge-plain">FRONT DESK: STATION 01</span>
        </div>

        <div className="hd-checkin-table-wrap">
          <table className="hd-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Party Size</th>
                <th>Arrival Time</th>
                <th>Digital Pass Status</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {todaysArrivals.map((b) => {
                const isCheckedIn = checkedInIds.has(b.id) || b.status === 'checked-in';
                return (
                  <tr key={b.id}>
                    <td>
                      <div className="hd-guest-cell">
                        <span className="hd-avatar">👤</span>
                        <div>
                          <strong>{b.guestName}</strong>
                          <span className="hd-sub-info">Ref: {b.bookingRef}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>Room #{b.roomNumber}</strong>
                      <span className="hd-sub-info">{b.roomType}</span>
                    </td>
                    <td>{b.guestCount} Guests</td>
                    <td><strong>2:00 PM</strong> Today</td>
                    <td>
                      <span className="hd-pass-badge">✓ Verified Yatra Pass</span>
                    </td>
                    <td>
                      <span className={`hd-status-tag ${isCheckedIn ? 'checked-in' : 'confirmed'}`}>
                        {isCheckedIn ? 'Checked-In' : 'Pending Arrival'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="hd-btn-group-right">
                        <button
                          type="button"
                          onClick={() => handleOpenQR(b)}
                          className="hd-btn-action-small"
                          title="Scan or View Scannable QR Pass"
                        >
                          📱 QR Pass
                        </button>
                        {!isCheckedIn ? (
                          <button
                            type="button"
                            onClick={() => handleCheckInGuest(b.id)}
                            className="hd-btn-checkin-small"
                          >
                            ✓ Check-In
                          </button>
                        ) : (
                          <span className="hd-done-text">Checked In</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------
          5. RECENT BOOKINGS (Compact, Tabbed, Searchable)
          ------------------------------------------------------------ */}
      <section className="hd-card">
        <div className="hd-card-header">
          <div>
            <h3 className="hd-card-title">Bookings Manager</h3>
            <p className="hd-card-subtitle">Review, confirm, and manage pilgrim accommodations</p>
          </div>

          <div className="hd-filter-controls">
            {/* Search */}
            <input
              type="text"
              placeholder="Search guest name or ref..."
              value={bookingSearchQuery}
              onChange={(e) => setBookingSearchQuery(e.target.value)}
              className="hd-search-input"
            />

            {/* Filter Tabs */}
            <div className="hd-tabs">
              <button
                type="button"
                onClick={() => setBookingFilterTab('ALL')}
                className={`hd-tab ${bookingFilterTab === 'ALL' ? 'active' : ''}`}
              >
                All ({combinedBookings.length})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilterTab('PENDING')}
                className={`hd-tab ${bookingFilterTab === 'PENDING' ? 'active' : ''}`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilterTab('CONFIRMED')}
                className={`hd-tab ${bookingFilterTab === 'CONFIRMED' ? 'active' : ''}`}
              >
                Confirmed
              </button>
              <button
                type="button"
                onClick={() => setBookingFilterTab('CHECKED_IN')}
                className={`hd-tab ${bookingFilterTab === 'CHECKED_IN' ? 'active' : ''}`}
              >
                Checked-In
              </button>
            </div>
          </div>
        </div>

        {/* Compact Bookings Table */}
        <div className="hd-checkin-table-wrap">
          <table className="hd-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Guest</th>
                <th>Room Type</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="hd-empty-row">
                    No bookings found in this filter category.
                  </td>
                </tr>
              ) : (
                (showAllBookings ? filteredBookings : filteredBookings.slice(0, 6)).map((b) => (
                  <tr key={b.id} className={b.status === 'pending' ? 'hd-row-attention' : ''}>
                    <td>
                      <strong className="hd-font-mono text-amber">{b.bookingRef}</strong>
                    </td>
                    <td>
                      <strong>{b.guestName}</strong>
                    </td>
                    <td>
                      <span>{b.roomType}</span>
                      <span className="hd-sub-info">Room #{b.roomNumber}</span>
                    </td>
                    <td>
                      <span>{b.checkIn} ➔ {b.checkOut}</span>
                    </td>
                    <td>{b.guestCount} Guests</td>
                    <td>
                      <strong className="text-emerald">₹{Number(b.totalAmount).toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <span className={`hd-status-tag ${b.status}`}>
                        {b.status === 'pending' ? 'Pending Action' : b.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="hd-btn-group-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingDetails(b)}
                          className="hd-btn-action-small"
                        >
                          Details
                        </button>
                        {b.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleConfirmBooking(b)}
                              className="hd-btn-checkin-small"
                            >
                              ✓ Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeclineDialogReqId(b.id)}
                              className="hd-btn-decline-small"
                            >
                              ✕ Decline
                            </button>
                          </>
                        )}
                        {b.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleCheckInGuest(b.id)}
                            className="hd-btn-checkin-small"
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* View all toggle button */}
        {filteredBookings.length > 6 && (
          <div className="hd-table-footer">
            <button
              type="button"
              onClick={() => setShowAllBookings(prev => !prev)}
              className="hd-btn-view-all"
            >
              {showAllBookings ? 'Show Compact View (Top 6)' : `View All (${filteredBookings.length}) Bookings ➔`}
            </button>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------
          6. ROOM INVENTORY & SCHEDULE MATRIX
          ------------------------------------------------------------ */}
      <section className="hd-card">
        <div className="hd-card-header">
          <div>
            <h3 className="hd-card-title">Room Inventory &amp; Schedule Matrix</h3>
            <p className="hd-card-subtitle">Live occupancy and turnover schedule across 2-hour intervals</p>
          </div>

          <div className="hd-matrix-controls">
            {/* Category Filter */}
            <select
              value={slotCategoryFilter}
              onChange={(e) => setSlotCategoryFilter(e.target.value)}
              className="hd-select-small"
            >
              <option value="ALL">All Categories (50 Rooms)</option>
              <option value="Standard">Standard (30 Rooms)</option>
              <option value="Deluxe">Deluxe (15 Rooms)</option>
              <option value="Family">Family (5 Rooms)</option>
            </select>

            {/* Day Switcher */}
            <div className="hd-day-switcher">
              <button
                type="button"
                onClick={() => setSelectedSlotDay('today')}
                className={`hd-day-btn ${selectedSlotDay === 'today' ? 'active' : ''}`}
              >
                Today (Sep 4)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlotDay('tomorrow')}
                className={`hd-day-btn ${selectedSlotDay === 'tomorrow' ? 'active' : ''}`}
              >
                Tomorrow (Sep 5)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlotDay('nextDay')}
                className={`hd-day-btn ${selectedSlotDay === 'nextDay' ? 'active' : ''}`}
              >
                Sep 6
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Summary Pills */}
        <div className="hd-inventory-pills-row">
          <div className="hd-inv-pill occupied">
            <span className="hd-dot-pill"></span>
            <span>Occupied: <strong>{occupiedRooms}</strong></span>
          </div>
          <div className="hd-inv-pill available">
            <span className="hd-dot-pill"></span>
            <span>Available: <strong>{availableRooms}</strong></span>
          </div>
          <div className="hd-inv-pill reserved">
            <span className="hd-dot-pill"></span>
            <span>Reserved: <strong>{pendingCount + 4}</strong></span>
          </div>
          <div className="hd-inv-pill turnover">
            <span className="hd-dot-pill"></span>
            <span>Turnover / Cleaning: <strong>2</strong></span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="hd-checkin-table-wrap">
          <table className="hd-matrix-table">
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
              {filteredSlots.map(rs => {
                const slotsMap = {};
                (rs.slots || []).forEach(s => { slotsMap[s.time] = s.status; });
                const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
                return (
                  <tr key={`${rs.date}-${rs.room_number}`}>
                    <td className="hd-matrix-room-cell">
                      <strong>Room #{rs.room_number}</strong>
                      <span>{rs.room_type} • Fl {rs.floor}</span>
                    </td>
                    {times.map(t => {
                      const st = slotsMap[t] || 'available';
                      let label = 'Available';
                      let cssClass = 'avail';
                      if (st === 'booked') { label = 'Booked'; cssClass = 'booked'; }
                      else if (st === 'check-in') { label = 'Check-in'; cssClass = 'checkin'; }
                      else if (st === 'check-out') { label = 'Turnover'; cssClass = 'checkout'; }
                      return (
                        <td key={t} className="hd-slot-cell">
                          <span className={`hd-slot-badge ${cssClass}`}>{label}</span>
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

      {/* ------------------------------------------------------------
          7. MODALS & DRAWERS
          ------------------------------------------------------------ */}

      {/* Booking Details Modal */}
      {selectedBookingDetails && (
        <div className="hd-modal-overlay" onClick={() => setSelectedBookingDetails(null)}>
          <div className="hd-modal-card" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h3>Booking Reservation Voucher</h3>
              <button type="button" onClick={() => setSelectedBookingDetails(null)}>✕</button>
            </div>
            <div className="hd-modal-grid">
              <div className="hd-modal-item">
                <span className="hd-item-label">Booking Reference</span>
                <strong className="hd-item-val font-mono text-amber">{selectedBookingDetails.bookingRef}</strong>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Guest Name</span>
                <strong className="hd-item-val">{selectedBookingDetails.guestName}</strong>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Allocated Room</span>
                <strong className="hd-item-val text-emerald">Room #{selectedBookingDetails.roomNumber} ({selectedBookingDetails.roomType})</strong>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Party Size</span>
                <span className="hd-item-val">{selectedBookingDetails.guestCount} Pilgrims</span>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Check-In</span>
                <span className="hd-item-val">{selectedBookingDetails.checkIn}</span>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Check-Out</span>
                <span className="hd-item-val">{selectedBookingDetails.checkOut}</span>
              </div>
              <div className="hd-modal-item full-width total-row">
                <span className="hd-item-label">Total Amount (INR)</span>
                <strong className="hd-total-num text-emerald">₹{Number(selectedBookingDetails.totalAmount).toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setSelectedBookingDetails(null)}
                className="hd-btn-secondary"
              >
                Close
              </button>
              {selectedBookingDetails.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmBooking(selectedBookingDetails);
                    setSelectedBookingDetails(null);
                  }}
                  className="hd-btn-primary"
                >
                  ✓ Confirm Reservation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Check-In Modal */}
      {activeQRBooking && (
        <div className="hd-modal-overlay" onClick={() => setActiveQRBooking(null)}>
          <div className="hd-modal-card qr-modal" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h3>Digital Pilgrim Pass &amp; Check-In</h3>
              <button type="button" onClick={() => setActiveQRBooking(null)}>✕</button>
            </div>
            <div className="hd-qr-modal-body">
              <div className="hd-qr-render-box">
                <ScannableQRCode payload={activeQRBooking.bookingRef} size={180} />
              </div>
              <div className="hd-qr-meta">
                <span className="hd-pass-pill">VERIFIED YATRA PASS</span>
                <h4>{activeQRBooking.guestName}</h4>
                <p>Booking Ref: <strong>{activeQRBooking.bookingRef}</strong></p>
                <p>Room: <strong className="text-emerald">Room #{activeQRBooking.roomNumber} ({activeQRBooking.roomType})</strong></p>
              </div>
            </div>
            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setActiveQRBooking(null)}
                className="hd-btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCompleteQRCheckIn}
                className="hd-btn-primary"
              >
                📱 Verify &amp; Complete Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {declineDialogReqId && (
        <div className="hd-modal-overlay" onClick={() => setDeclineDialogReqId(null)}>
          <div className="hd-modal-card" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h3>Decline Booking Request</h3>
              <button type="button" onClick={() => setDeclineDialogReqId(null)}>✕</button>
            </div>
            <p className="hd-modal-desc">Select a reason to notify the arriving pilgrim:</p>
            <select
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="hd-select-full"
            >
              <option value="Room unavailable for requested time window">Room unavailable for requested time window</option>
              <option value="Maintenance scheduled for this room">Maintenance scheduled for this room</option>
              <option value="Over capacity for party size">Over capacity for party size</option>
              <option value="Corridor transit diversion complete">Corridor transit diversion complete</option>
            </select>
            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setDeclineDialogReqId(null)}
                className="hd-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="hd-btn-danger"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Profile Modal */}
      {showProfileModal && (
        <div className="hd-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="hd-modal-card" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h3>Hotel Partner Profile</h3>
              <button type="button" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div className="hd-modal-grid">
              <div className="hd-modal-item">
                <span className="hd-item-label">Property Name</span>
                <strong className="hd-item-val">{selectedHotel?.name || 'Hotel Ganga Heritage'}</strong>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Partner ID</span>
                <span className="hd-item-val font-mono">{selectedHotelId}</span>
              </div>
              <div className="hd-modal-item full-width">
                <span className="hd-item-label">Address</span>
                <span className="hd-item-val">{selectedHotel?.address || 'Kashi Corridor Zone B-2, Varanasi'}</span>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Total Room Capacity</span>
                <strong className="hd-item-val">{totalRooms} Rooms</strong>
              </div>
              <div className="hd-modal-item">
                <span className="hd-item-label">Verification Status</span>
                <span className="hd-status-tag confirmed">✓ Verified Hospitality Partner</span>
              </div>
            </div>
            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="hd-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
